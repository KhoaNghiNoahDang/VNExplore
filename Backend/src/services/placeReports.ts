import { adminDb } from '../lib/supabase.js'
import { hasPlace } from './content.js'

export type PlaceReportType = 'price' | 'opening_hours' | 'visit_time' | 'closed' | 'other'
export type ClosedState = 'today' | 'temporary' | 'permanent' | 'unknown'

export interface PlaceReportInput {
  clientReportId: string
  placeId: string
  reportType: PlaceReportType
  priceMinK?: number | null
  priceMaxK?: number | null
  openTime?: string | null
  closeTime?: string | null
  visitMin?: number | null
  closedState?: ClosedState | null
  note?: string | null
  observedAt: string
  language: 'vi' | 'en'
}

export class PlaceReportsUnavailableError extends Error {
  constructor() {
    super('Place reports are temporarily unavailable')
  }
}

/** Store an idempotent, moderation-only traveller report. */
export async function submitPlaceReport(input: PlaceReportInput): Promise<void> {
  if (!adminDb) throw new PlaceReportsUnavailableError()

  // Places live in the content file (not the database): check the id there.
  if (!hasPlace(input.placeId)) throw new Error('Unknown place')

  const { error } = await adminDb.from('place_reports').upsert(
    {
      client_report_id: input.clientReportId,
      place_id: input.placeId,
      report_type: input.reportType,
      price_min_k: input.priceMinK ?? null,
      price_max_k: input.priceMaxK ?? null,
      open_time: input.openTime ?? null,
      close_time: input.closeTime ?? null,
      visit_min: input.visitMin ?? null,
      closed_state: input.closedState ?? null,
      note: input.note?.trim() || null,
      observed_at: input.observedAt,
      language: input.language,
    },
    { onConflict: 'client_report_id', ignoreDuplicates: true },
  )
  if (error) throw new Error(error.message)
}
