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
}

/**
 * Ask the backend to read the request. Resolves to null on any problem (no backend, asleep,
 * slow, no model key, daily limit) — the caller then keeps its rule-based reading.
 */
export async function understandRequest(text: string, timeoutMs = 4000): Promise<Understood | null> {
  if (!API_URL) return null
  try {
    const res = await fetch(`${API_URL}/v1/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { result?: Understood }
    return body.result ?? null
  } catch {
    return null
  }
}
