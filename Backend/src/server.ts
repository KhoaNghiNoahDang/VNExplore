import { buildApp } from './app.js'
import { config } from './config.js'
import { getContent } from './services/content.js'

const app = await buildApp()

// ---------------------------------------------------------------- stay up
// A stray rejected promise is logged, not fatal.
process.on('unhandledRejection', (reason) => {
  app.log.error({ reason }, 'unhandled promise rejection')
})

// A thrown error outside a request leaves the process in an unknown state:
// log it, stop cleanly, and let Render start a fresh instance.
process.on('uncaughtException', (err) => {
  app.log.fatal({ err }, 'uncaught exception — shutting down')
  void shutdown('uncaughtException', 1)
})

let closing = false
async function shutdown(signal: string, code = 0) {
  if (closing) return
  closing = true
  app.log.info({ signal }, 'shutting down')
  // Finish in-flight requests, but never hang a deploy.
  const force = setTimeout(() => process.exit(code || 1), 10_000)
  force.unref()
  try {
    await app.close()
  } finally {
    process.exit(code)
  }
}
// Render sends SIGTERM on every deploy/restart.
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

// ---------------------------------------------------------------- start
try {
  await app.listen({ port: config.PORT, host: config.HOST })
} catch (err) {
  app.log.fatal({ err }, 'could not start')
  process.exit(1)
}

// Warm the content cache so the first visitor doesn't wait (failure here is fine).
getContent().catch((err) => app.log.warn({ err }, 'content warm-up failed'))
