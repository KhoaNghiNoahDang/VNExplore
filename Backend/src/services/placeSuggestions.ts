import { adminDb } from '../lib/supabase.js'

export interface PlaceSuggestionInput {
  clientSuggestionId: string
  name: string
  kind: 'food' | 'sight' | 'fun'
  lat: number
  lng: number
  address?: string | null
  description?: string | null
  openingHours?: string | null
  priceMinK?: number | null
  priceMaxK?: number | null
  contact?: string | null
  language: 'vi' | 'en'
}

export class PlaceSuggestionsUnavailableError extends Error {
  constructor() {
    super('Place suggestions are temporarily unavailable')
  }
}

/** Store an idempotent, moderation-only place suggestion. */
export async function submitPlaceSuggestion(input: PlaceSuggestionInput): Promise<void> {
  if (!adminDb) throw new PlaceSuggestionsUnavailableError()

  const { error } = await adminDb.from('place_suggestions').upsert(
    {
      client_suggestion_id: input.clientSuggestionId,
      name: input.name.trim(),
      kind: input.kind,
      lat: input.lat,
      lng: input.lng,
      address: input.address?.trim() || null,
      description: input.description?.trim() || null,
      opening_hours: input.openingHours?.trim() || null,
      price_min_k: input.priceMinK ?? null,
      price_max_k: input.priceMaxK ?? null,
      contact: input.contact?.trim() || null,
      language: input.language,
    },
    { onConflict: 'client_suggestion_id', ignoreDuplicates: true },
  )
  if (error) throw new Error(error.message)
}
