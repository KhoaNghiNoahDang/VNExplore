import { z } from 'zod'

// Local dev: read Backend/.env if it exists (Render sets real env vars instead).
try {
  process.loadEnvFile()
} catch {
  /* no .env file — fine */
}

/** An empty value ("KEY=") means "not set" instead of failing the whole config. */
const optionalSecret = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().min(10).optional())

const Env = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  SUPABASE_URL: z.url(),
  /** Public key: reads what the app can read anyway (approved places, roles…). */
  SUPABASE_ANON_KEY: z.string().min(20),
  /** Secret key: only for backend-only tables (route cache). Optional — without it the cache is memory-only. */
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,

  /** Comma-separated. `*` works inside a host, e.g. https://vnexplore-*.vercel.app */
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  OSRM_URL: z.url().default('https://routing.openstreetmap.de'),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),

  // ---- language model for /v1/understand (optional: without a key the app uses its rule-based parser)
  LLM_PROVIDER: z.enum(['gemini', 'none']).default('gemini'),
  /** Several keys (from different Google accounts/projects) = more free quota + a spare when one fails. */
  GEMINI_API_KEY: optionalSecret,
  GEMINI_API_KEY_2: optionalSecret,
  GEMINI_API_KEY_3: optionalSecret,
  /** Model names change over time — override without a code change. */
  GEMINI_MODEL: z.string().default('gemini-flash-lite-latest'),
  /** Tried when every key fails on the main model (it has its own quota). Empty = none. */
  GEMINI_FALLBACK_MODEL: z.string().default('gemini-flash-latest'),
  /** Model calls allowed per visitor (IP) per day. */
  LLM_DAILY_LIMIT: z.coerce.number().int().positive().default(60),
})

const parsed = Env.safeParse(process.env)
if (!parsed.success) {
  // Fail fast at boot with a readable message instead of crashing later on a request.
  console.error('Invalid environment:\n' + z.prettifyError(parsed.error))
  process.exit(1)
}

export const config = {
  ...parsed.data,
  /** All Gemini keys that are set, without duplicates. */
  GEMINI_KEYS: [...new Set([parsed.data.GEMINI_API_KEY, parsed.data.GEMINI_API_KEY_2, parsed.data.GEMINI_API_KEY_3].filter((k): k is string => !!k))],
}
export const isProd = config.NODE_ENV === 'production'
