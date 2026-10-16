/** Render API base URL. Empty keeps the frontend fully standalone. */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '') ?? ''

/**
 * Wake the Render service as soon as the app opens. This is deliberately
 * fire-and-forget: a cold or unavailable backend must never delay the UI.
 */
export function wakeBackend(): void {
  if (!API_URL) return
  void fetch(`${API_URL}/health`, {
    method: 'GET',
    cache: 'no-store',
    mode: 'cors',
  }).catch(() => undefined)
}

export interface GeoResult {
  name: string
  label: string
  lat: number
  lng: number
  /** Only the street was found, not the house number: the pin needs a nudge. */
  approx?: boolean
}

/** A Google Maps link ("Share → Copy link")? Short maps.app.goo.gl links included. */
export const isMapsLink = (s: string) => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(s.trim())

/** "21.0352, 105.8521" typed or pasted → a point (only around Hanoi). */
export function coordsOf(s: string): { lat: number; lng: number } | null {
  const m = /^\s*(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{2,3}\.\d+)\s*$/.exec(s)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  return lat > 20.5 && lat < 21.6 && lng > 105 && lng < 106.3 ? { lat, lng } : null
}

/** The point (and place name) of a shared Google Maps link, read by the backend. null if it can't. */
export async function resolveMapsLink(url: string): Promise<GeoResult | null> {
  if (!API_URL) return null
  try {
    const res = await fetch(`${API_URL}/v1/maps-link?url=${encodeURIComponent(url.trim())}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return ((await res.json()) as { result?: GeoResult | null }).result ?? null
  } catch {
    return null
  }
}

/** Address / place search in greater Hanoi (for the start point). [] on any problem. */
export async function geocodeSearch(q: string, lang: 'vi' | 'en'): Promise<GeoResult[]> {
  if (!API_URL || q.trim().length < 2) return []
  try {
    const res = await fetch(`${API_URL}/v1/geocode?lang=${lang}&q=${encodeURIComponent(q.trim())}`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return []
    return ((await res.json()) as { results?: GeoResult[] }).results ?? []
  } catch {
    return []
  }
}

/** What the backend's language model read from a free-form request (see Backend/src/services/understand.ts). */
export interface Understood {
  /** A known region id (see lib/area.ts REGIONS) named in the request, or null. */
  area: string | null
  themes: string[]
  people: number | null
  hours: number | null
  transport: 'walk' | 'motorbike' | 'grabbike' | 'car' | null
  budget: 'low' | 'any'
  dishes: string[]
  kids: boolean
  summary_vi: string
  summary_en: string
  reply_vi: string
  reply_en: string
}

export interface AdviceContext {
  language: 'vi' | 'en'
  /** The plan's region id, or 'near-start' when the plan just follows the start point. */
  area: string
  transport: 'walk' | 'motorbike' | 'grabbike' | 'car'
  people: number
  hours: number
  departHour: number
  weather: { tempC: number; rainProb: number; rainy: boolean; hot: boolean } | null
}

/**
 * Ask the backend to read the request. Resolves to null on any problem (no backend, asleep,
 * slow, no model key, daily limit) — the caller then keeps its rule-based reading.
 */
// 6.5 s: the backend gives the model at most 5.5 s (see Backend/src/services/llm.ts), plus the trip.
/** Who read the request: the language model, or (when it couldn't) the app's own keyword rules. */
export type UnderstandOutcome =
  | { by: 'ai'; result: Understood; model: string }
  | { by: 'rules'; reason: 'off' | 'slow' | 'busy' | 'limit' | 'offline' | 'blocked' | 'error' }

export async function understandRequest(text: string, context?: AdviceContext, timeoutMs = 11000): Promise<UnderstandOutcome> {
  if (!API_URL) return { by: 'rules', reason: 'off' }
  try {
    const res = await fetch(`${API_URL}/v1/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (res.status === 429) return { by: 'rules', reason: 'limit' }
    if (res.status === 503) return { by: 'rules', reason: 'busy' }
    if (!res.ok) return { by: 'rules', reason: 'error' }
    const body = (await res.json()) as { result?: Understood; provider?: string }
    if (!body.result) return { by: 'rules', reason: 'error' }
    // "gemini:gemini-flash-lite-latest#1" → "gemini-flash-lite-latest"
    const model = (body.provider ?? '').replace(/^[^:]*:/, '').replace(/#\d+$/, '')
    return { by: 'ai', result: body.result, model }
  } catch (e) {
    if (!navigator.onLine) return { by: 'rules', reason: 'offline' }
    if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) return { by: 'rules', reason: 'slow' }
    // fetch() failing outright: the server refused this site (CORS) or couldn't be reached.
    if (e instanceof TypeError) return { by: 'rules', reason: 'blocked' }
    return { by: 'rules', reason: 'error' }
  }
}
