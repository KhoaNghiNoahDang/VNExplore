import { config } from '../config.js'

/**
 * Gemini through its OpenAI-compatible /chat/completions endpoint, with several API keys and a
 * fallback model so one exhausted or failing key never stops the feature:
 *   - requests rotate across keys (spreads the free-tier per-minute quota);
 *   - a key that answers 429 (quota) rests for a minute, repeated 429s rest it for an hour;
 *   - a key that is rejected (401/403) is parked for a day (probably revoked or mistyped);
 *   - if every key fails on the main model, the fallback model is tried (its own quota bucket).
 */
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'

/** Quota is counted per key AND per model, so resting is tracked per model too. */
interface ModelState {
  restUntil: number
  quotaHits: number
  failures: number
}
interface KeyState {
  key: string
  /** A rejected key (401/403) rests for every model. */
  deadUntil: number
  models: Map<string, ModelState>
}

const keys: KeyState[] = config.GEMINI_KEYS.map((key) => ({ key, deadUntil: 0, models: new Map() }))
const stateOf = (k: KeyState, model: string) => {
  let m = k.models.get(model)
  if (!m) k.models.set(model, (m = { restUntil: 0, quotaHits: 0, failures: 0 }))
  return m
}
const isReady = (k: KeyState, model: string, now = Date.now()) => k.deadUntil <= now && stateOf(k, model).restUntil <= now
let cursor = 0

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export const llmEnabled = () => config.LLM_PROVIDER !== 'none' && keys.length > 0

/** For /health: how many keys are usable right now (never the keys themselves). */
export const llmHealth = () => ({
  keys: keys.length,
  ready: keys.filter((k) => isReady(k, config.GEMINI_MODEL)).length,
  readyFallback: config.GEMINI_FALLBACK_MODEL ? keys.filter((k) => isReady(k, config.GEMINI_FALLBACK_MODEL)).length : 0,
  model: config.GEMINI_MODEL,
  fallbackModel: config.GEMINI_FALLBACK_MODEL || null,
})

/** Keys not resting for this model, starting from the next one in rotation. */
function readyKeys(model: string, start: number): KeyState[] {
  const now = Date.now()
  return [...keys.slice(start), ...keys.slice(0, start)].filter((k) => isReady(k, model, now))
}

function rest(k: KeyState, model: string, status: number) {
  const now = Date.now()
  const m = stateOf(k, model)
  if (status === 429) {
    m.quotaHits += 1
    m.restUntil = now + (m.quotaHits >= 3 ? 3600_000 : 60_000)
  } else if (status === 401 || status === 403) {
    k.deadUntil = now + 24 * 3600_000
  } else {
    // 5xx / timeout / network: short rest after a few in a row
    m.failures += 1
    if (m.failures >= 3) m.restUntil = now + 30_000
  }
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[]
}

async function call(k: KeyState, model: string, system: string, user: string): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k.key}` },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
  } catch (err) {
    throw new HttpError(0, err instanceof Error ? err.message : 'network error')
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    // Google answers an invalid key with 400 "API key not valid": treat it like 401 (park the key).
    const status = res.status === 400 && /api[ _]?key/i.test(detail) ? 401 : res.status
    throw new HttpError(status, `Gemini ${res.status}`)
  }
  const body = (await res.json()) as ChatResponse
  const text = body.choices?.[0]?.message?.content ?? ''
  // Some models wrap JSON in ```json fences — strip them.
  return JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''))
}

/** Ask for a JSON object. Tries every ready key on the main model, then on the fallback model. */
export async function chatJson(system: string, user: string): Promise<{ provider: string; json: unknown }> {
  if (!llmEnabled()) throw new Error('No language model configured')
  const models = [config.GEMINI_MODEL, config.GEMINI_FALLBACK_MODEL].filter((m, i, a) => m && a.indexOf(m) === i)
  let last: unknown = new Error('All Gemini keys are resting')
  const start = cursor++ % Math.max(keys.length, 1)
  for (const model of models) {
    for (const k of readyKeys(model, start)) {
      try {
        const json = await call(k, model, system, user)
        const m = stateOf(k, model)
        m.failures = 0
        m.quotaHits = 0
        return { provider: `gemini:${model}#${keys.indexOf(k) + 1}`, json }
      } catch (err) {
        last = err
        if (err instanceof HttpError) rest(k, model, err.status)
        // A bad JSON answer isn't the key's fault: try the next key/model anyway.
      }
    }
  }
  throw last instanceof Error ? last : new Error('Language model unavailable')
}
