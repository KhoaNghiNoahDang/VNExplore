import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import underPressure from '@fastify/under-pressure'
import Fastify, { type FastifyError } from 'fastify'
import { z, ZodError } from 'zod'
import { config, isProd } from './config.js'
import { BreakerOpenError, QueueFullError } from './lib/resilience.js'
import { contentBreaker, getContent } from './services/content.js'
import { geocode } from './services/geocode.js'
import { llmHealth } from './services/llm.js'
import { PlaceReportsUnavailableError, submitPlaceReport } from './services/placeReports.js'
import { getLeg, routingHealth } from './services/routing.js'
import { DailyLimitError, understand } from './services/understand.js'

/** Origins allowed to call the API from a browser. `*` matches one host label segment. */
function originMatcher(list: string): (origin: string) => boolean {
  const patterns = list
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+') + '$', 'i'))
  return (origin) => patterns.some((re) => re.test(origin))
}

// Only Vietnam: the API isn't a free routing proxy for the whole world.
const VN = z.object({ lat: z.number().min(8).max(24), lng: z.number().min(102).max(110) })
const RouteBody = z.object({
  transport: z.enum(['walk', 'motorbike', 'grabbike', 'car']),
  points: z.array(VN).min(2).max(12),
})

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Never log auth headers or cookies.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      ...(isProd ? {} : { transport: undefined }),
    },
    trustProxy: true, // Render sits behind a proxy: use X-Forwarded-For for rate limits
    bodyLimit: 16 * 1024, // requests are tiny; refuse anything big
    requestTimeout: 20_000,
    connectionTimeout: 30_000,
    return503OnClosing: true,
  })

  // ---------------------------------------------------------------- protection
  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } })

  const allowed = originMatcher(config.ALLOWED_ORIGINS)
  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || allowed(origin)), // no Origin = curl / server-to-server
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 600,
  })

  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_PER_MIN,
    timeWindow: '1 minute',
    cache: 10_000, // bounded memory for the per-IP counters
    allowList: (req) => req.url === '/health',
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      error: 'too_many_requests',
      message: `Too many requests, retry in ${Math.ceil(ctx.ttl / 1000)} s`,
    }),
  })

  // Shed load instead of falling over: 503 + Retry-After when the process is struggling.
  // Render free = 512 MB RAM, so stay well below it.
  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 350 * 1024 * 1024,
    maxRssBytes: 450 * 1024 * 1024,
    retryAfter: 10,
    message: 'Server is busy, please retry shortly',
  })

  // ---------------------------------------------------------------- errors
  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'bad_request', message: 'Invalid input', issues: err.issues.slice(0, 5) })
    }
    if (err instanceof BreakerOpenError || err instanceof QueueFullError) {
      return reply.code(503).header('Retry-After', '10').send({ error: 'unavailable', message: err.message })
    }
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500
    if (status >= 500) req.log.error({ err }, 'request failed')
    // Don't leak internals in production.
    return reply.code(status).send({
      error: status >= 500 ? 'internal' : (err.code ?? 'error'),
      message: status >= 500 && isProd ? 'Something went wrong' : err.message,
    })
  })
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: 'not_found' }))

  // ---------------------------------------------------------------- routes
  /** Liveness for Render + warm-up ping from the app. No I/O: always fast. */
  app.get('/health', async () => ({
    ok: true,
    uptimeS: Math.round(process.uptime()),
    content: contentBreaker.state,
    ...routingHealth(),
    llm: llmHealth(),
  }))

  /** Approved places, roles + missions, fares. ETag lets the app skip the download when unchanged. */
  app.get('/v1/content', async (req, reply) => {
    try {
      const { content, stale } = await getContent()
      const etag = `"${content.version}"`
      reply.header('ETag', etag).header('Cache-Control', 'public, max-age=60, stale-while-revalidate=600')
      if (stale) reply.header('X-Content-Stale', '1')
      if (req.headers['if-none-match'] === etag) return reply.code(304).send()
      return content
    } catch (err) {
      req.log.warn({ err }, 'content unavailable')
      return reply.code(503).header('Retry-After', '30').send({ error: 'unavailable', message: 'Content temporarily unavailable' })
    }
  })

  /** Street shapes for consecutive legs: points[0]→points[1]→… Each leg falls back to a straight line. */
  app.post('/v1/route', async (req) => {
    const body = RouteBody.parse(req.body)
    const legs = await Promise.all(body.points.slice(1).map((p, i) => getLeg(body.points[i], p, body.transport)))
    return { legs }
  })

  /**
   * Free-form request → structured fields (area, themes, people, hours, transport, dishes…).
   * 503 when no model answers: the app then uses its rule-based parser, so this is never blocking.
   */
  const UnderstandBody = z.object({
    text: z.string().trim().min(2).max(500),
    context: z
      .object({
        language: z.enum(['vi', 'en']),
        area: z.enum(['hoan-kiem', 'ba-vi']),
        transport: z.enum(['walk', 'motorbike', 'grabbike', 'car']),
        people: z.number().int().min(1).max(30),
        hours: z.number().min(0.5).max(10),
        departHour: z.number().int().min(0).max(23),
        weather: z
          .object({
            tempC: z.number().min(-10).max(60),
            rainProb: z.number().min(0).max(100),
            rainy: z.boolean(),
            hot: z.boolean(),
          })
          .nullable(),
      })
      .optional(),
  })
  app.post('/v1/understand', { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { text, context } = UnderstandBody.parse(req.body)
    try {
      return await understand(text, req.ip, context)
    } catch (err) {
      if (err instanceof DailyLimitError) return reply.code(429).send({ error: 'daily_limit', message: err.message })
      req.log.warn({ err: err instanceof Error ? err.message : err }, 'understand failed')
      return reply.code(503).send({ error: 'unavailable', message: 'Language model unavailable' })
    }
  })

  /** Search an address / place name in greater Hanoi (for choosing where to start). */
  const GeocodeQuery = z.object({ q: z.string().trim().min(2).max(120), lang: z.enum(['vi', 'en']).default('vi') })
  app.get('/v1/geocode', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { q, lang } = GeocodeQuery.parse(req.query)
    try {
      const results = await geocode(q, lang)
      reply.header('Cache-Control', 'public, max-age=3600')
      return { results }
    } catch (err) {
      req.log.warn({ err: err instanceof Error ? err.message : err }, 'geocode failed')
      return reply.code(503).send({ error: 'unavailable', results: [] })
    }
  })

  /** Traveller-observed facts. Always queued for review; never edits verified place content directly. */
  const PlaceReportBody = z
    .object({
      clientReportId: z.uuid(),
      placeId: z.string().trim().min(1).max(120),
      reportType: z.enum(['price', 'opening_hours', 'visit_time', 'closed', 'other']),
      priceMinK: z.number().int().min(0).max(100000).nullish(),
      priceMaxK: z.number().int().min(0).max(100000).nullish(),
      openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullish(),
      closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullish(),
      visitMin: z.number().int().min(1).max(600).nullish(),
      closedState: z.enum(['today', 'temporary', 'permanent', 'unknown']).nullish(),
      note: z.string().trim().max(300).nullish(),
      observedAt: z.iso.datetime(),
      language: z.enum(['vi', 'en']),
    })
    .superRefine((v, ctx) => {
      const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
      if (v.reportType === 'price' && v.priceMinK == null && v.priceMaxK == null) issue('priceMinK', 'Enter a price')
      if (v.priceMinK != null && v.priceMaxK != null && v.priceMaxK < v.priceMinK) issue('priceMaxK', 'Maximum must be at least minimum')
      if (v.reportType === 'opening_hours' && (!v.openTime || !v.closeTime)) issue('openTime', 'Enter opening and closing times')
      if (v.reportType === 'visit_time' && v.visitMin == null) issue('visitMin', 'Enter visit time')
      if (v.reportType === 'closed' && !v.closedState) issue('closedState', 'Choose a closure status')
      if (v.reportType === 'other' && !v.note) issue('note', 'Enter a note')
    })

  app.post('/v1/place-reports', { config: { rateLimit: { max: 8, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const body = PlaceReportBody.parse(req.body)
    try {
      await submitPlaceReport(body)
      return reply.code(202).send({ accepted: true })
    } catch (err) {
      if (err instanceof PlaceReportsUnavailableError) {
        return reply.code(503).header('Retry-After', '30').send({ error: 'unavailable', message: err.message })
      }
      req.log.warn({ err: err instanceof Error ? err.message : err }, 'place report failed')
      return reply.code(500).send({ error: 'internal', message: 'Could not save report' })
    }
  })

  return app
}
