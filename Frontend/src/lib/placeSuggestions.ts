import type { Lang } from '../types'
import { API_URL } from './backend'

export type SuggestedKind = 'food' | 'sight' | 'fun'

export interface PlaceSuggestionInput {
  clientSuggestionId: string
  name: string
  kind: SuggestedKind
  lat: number
  lng: number
  address?: string | null
  description?: string | null
  openingHours?: string | null
  priceMinK?: number | null
  priceMaxK?: number | null
  contact?: string | null
  language: Lang
}

/** Send a place to add; it waits for the team's review and never shows up in the app directly. */
export async function submitPlaceSuggestion(input: PlaceSuggestionInput): Promise<void> {
  if (!API_URL) throw new Error('backend_unavailable')
  const res = await fetch(`${API_URL}/v1/place-suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(res.status === 429 ? 'rate_limited' : 'submit_failed')
}
