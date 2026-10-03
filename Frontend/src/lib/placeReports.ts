import type { Lang } from '../types'
import { API_URL } from './backend'

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
  language: Lang
}

export async function submitPlaceReport(input: PlaceReportInput): Promise<void> {
  if (!API_URL) throw new Error('backend_unavailable')
  const res = await fetch(`${API_URL}/v1/place-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(res.status === 429 ? 'rate_limited' : 'submit_failed')
}
