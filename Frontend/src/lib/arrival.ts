import type { LatLng, Place } from '../types'
import { regionAt } from './area'
import { distanceM } from './travel'

/** Stamp only on site: about a hundred metres from the place's point, as the crow flies. */
export const ARRIVE_M = 100

/** Sites that cover an area (a lake, a park, a citadel, a village): their point is just the middle. */
const WIDE = /^(hồ|đầm|vườn|công viên|khu|làng|quần thể|thành cổ|hoàng thành|đỉnh|núi|đảo|bãi|chợ)\b/i

/** How close counts as "here" for this place, in metres. */
export function arrivalRadiusM(place: Place): number {
  if (regionAt(place)?.spreadOut) return 300 // countryside sites are big and GPS is coarse
  if (WIDE.test(place.name.vi.trim())) return 250
  return ARRIVE_M
}

/** Straight-line metres from here to the place (distanceM() pads for streets; undo that). */
export const crowMetres = (here: LatLng, place: LatLng) => distanceM(here, place) / 1.3

/**
 * Whether the phone puts the traveller at the place. A fuzzy fix gets a little slack (at most
 * 50 m) so a real visitor indoors isn't locked out, but a fix from across town never passes.
 */
export function isAtPlace(place: Place, here: LatLng | null, accuracyM: number | null): boolean {
  if (!here) return false
  return crowMetres(here, place) <= arrivalRadiusM(place) + Math.min(accuracyM ?? 0, 50)
}
