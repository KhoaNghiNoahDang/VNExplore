import type { Area, LatLng, Place } from '../types'
import { distanceM } from './travel'

/**
 * Two areas ~50 km apart. A route always stays inside one of them:
 * the one named in the request ("Ba Vì"), else the one the traveller is in, else Hoan Kiem.
 */
export const AREAS: Area[] = ['hoan-kiem', 'ba-vi']

/**
 * Middle of each area: where the start-point map opens and where the forecast is read.
 * Never used as the traveller's position — routes start from real location or a point they picked.
 */
export const AREA_POINT: Record<Area, LatLng> = {
  'hoan-kiem': { lat: 21.0287, lng: 105.8524 },
  'ba-vi': { lat: 21.1, lng: 105.42 },
}

const AREA_CENTER: Record<Area, { at: LatLng; radiusM: number }> = {
  'hoan-kiem': { at: AREA_POINT['hoan-kiem'], radiusM: 12_000 },
  'ba-vi': { at: AREA_POINT['ba-vi'], radiusM: 25_000 },
}

/** The area this point is in, if any. distanceM() pads for streets, hence the generous radii. */
export function areaAt(p: LatLng | null | undefined): Area | null {
  if (!p) return null
  return AREAS.find((a) => distanceM(p, AREA_CENTER[a].at) <= AREA_CENTER[a].radiusM) ?? null
}

/**
 * Area, start point and places for a plan. The start is the traveller's real position (or the point
 * they picked) wherever that is — null until we have one.
 */
export function planArea(asked: Area | null | undefined, origin: LatLng | null, places: Place[]) {
  const area: Area = asked ?? areaAt(origin) ?? 'hoan-kiem'
  return { area, start: origin, places: places.filter((p) => p.area === area) }
}
