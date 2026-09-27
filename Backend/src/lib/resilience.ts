/**
 * Small building blocks that keep the server up when something it depends on is slow or down.
 */

/** fetch + JSON with a hard timeout. Throws on network error, timeout or non-2xx. */
export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs: number }): Promise<T> {
  const { timeoutMs, ...rest } = init
  const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`)
  return (await res.json()) as T
}

/** Race a promise against a timeout (for clients that don't take an AbortSignal). */
export function withTimeout<T>(p: PromiseLike<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

export class BreakerOpenError extends Error {
  constructor(name: string) {
    super(`${name} is temporarily disabled after repeated failures`)
  }
}

/**
 * Circuit breaker: after `threshold` failures in a row, stop calling the service for `cooldownMs`
 * (fail fast instead of piling up slow requests). After the cooldown one call is let through;
 * success closes the circuit again, failure re-opens it.
 */
export class CircuitBreaker {
  private failures = 0
  private openUntil = 0

  constructor(
    readonly name: string,
    private readonly threshold = 5,
    private readonly cooldownMs = 30_000,
  ) {}

  get state(): 'closed' | 'open' | 'half-open' {
    if (Date.now() < this.openUntil) return 'open'
    return this.failures >= this.threshold ? 'half-open' : 'closed'
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (Date.now() < this.openUntil) throw new BreakerOpenError(this.name)
    try {
      const out = await fn()
      this.failures = 0
      return out
    } catch (err) {
      this.failures += 1
      if (this.failures >= this.threshold) this.openUntil = Date.now() + this.cooldownMs
      throw err
    }
  }
}

export class QueueFullError extends Error {
  constructor(name: string) {
    super(`${name} is busy, try again shortly`)
  }
}

/**
 * Concurrency limit with a bounded queue: at most `max` calls run at once, at most `queue` wait.
 * Beyond that we refuse immediately (load shedding) instead of running out of memory.
 */
export class Limiter {
  private running = 0
  private waiting: (() => void)[] = []

  constructor(
    readonly name: string,
    private readonly max: number,
    private readonly queue: number,
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.max) {
      if (this.waiting.length >= this.queue) throw new QueueFullError(this.name)
      await new Promise<void>((resolve) => this.waiting.push(resolve))
    }
    this.running += 1
    try {
      return await fn()
    } finally {
      this.running -= 1
      this.waiting.shift()?.()
    }
  }
}

/** Size-bounded LRU with expiry. `getStale` still returns expired entries (serve-stale-on-error). */
export class TtlCache<V> {
  private map = new Map<string, { value: V; expires: number }>()

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key)
    if (!hit || hit.expires < Date.now()) return undefined
    // refresh LRU position
    this.map.delete(key)
    this.map.set(key, hit)
    return hit.value
  }

  getStale(key: string): V | undefined {
    return this.map.get(key)?.value
  }

  set(key: string, value: V): void {
    this.map.delete(key)
    this.map.set(key, { value, expires: Date.now() + this.ttlMs })
    while (this.map.size > this.maxEntries) this.map.delete(this.map.keys().next().value!)
  }

  get size(): number {
    return this.map.size
  }
}

/** Collapse concurrent calls for the same key into one (no thundering herd on a cold cache). */
export function singleFlight<V>() {
  const inflight = new Map<string, Promise<V>>()
  return (key: string, fn: () => Promise<V>): Promise<V> => {
    const running = inflight.get(key)
    if (running) return running
    const p = fn().finally(() => inflight.delete(key))
    inflight.set(key, p)
    return p
  }
}
