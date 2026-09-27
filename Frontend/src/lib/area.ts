import { START } from '../data/places'
import type { Area, LatLng, Place } from '../types'
import { distanceM } from './travel'

/**
 * Two areas ~50 km apart. A route always stays inside one of them:
 * the one named in the request ("Ba Vì"), else the one the traveller is in, else Hoan Kiem.
 */
export const AREAS: Area[] = ['hoan-kiem', 'ba-vi']

/** Where a plan starts when the traveller isn't in that area. */
export const AREA_START: Record<Area, LatLng> = {
  'hoan-kiem': START, // north shore of Hoan Kiem Lake
  'ba-vi': { lat: 21.1391, lng: 105.5045 }, // Sơn Tây citadel: the usual way into Ba Vì from Hanoi
}

const AREA_CENTER: Record<Area, { at: LatLng; radiusM: number }> = {
  'hoan-kiem': { at: START, radiusM: 12_000 },
  'ba-vi': { at: { lat: 21.1, lng: 105.42 }, radiusM: 25_000 },
}

/** The area this point is in, if any. distanceM() pads for streets, hence the generous radii. */
export function areaAt(p: LatLng | null | undefined): Area | null {
  if (!p) return null
  return AREAS.find((a) => distanceM(p, AREA_CENTER[a].at) <= AREA_CENTER[a].radiusM) ?? null
}

/** Area, start point and places for a plan. */
export function planArea(asked: Area | null | undefined, here: LatLng | null, places: Place[]) {
  const area: Area = asked ?? areaAt(here) ?? 'hoan-kiem'
  // Start from the traveller only when they are actually in that area.
  const start = here && areaAt(here) === area ? here : AREA_START[area]
  return { area, start, places: places.filter((p) => p.area === area) }
}
