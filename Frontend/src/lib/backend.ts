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
  area: 'hoan-kiem' | 'ba-vi' | null
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
  area: 'hoan-kiem' | 'ba-vi'
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
export async function understandRequest(text: string, context?: AdviceContext, timeoutMs = 4000): Promise<Understood | null> {
  if (!API_URL) return null
  try {
    const res = await fetch(`${API_URL}/v1/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { result?: Understood }
    return body.result ?? null
  } catch {
    return null
  }
}
