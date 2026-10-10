import type { L, LatLng, Place, Transport } from '../types'
import { distanceM, RIDE_THERE_M } from './travel'

/**
 * Plans are not tied to fixed areas: the app looks for places around where the trip happens —
 * the traveller's start point, or a region they name ("Ba Vì"). Regions below are only shortcuts
 * for names in a request, labels, and a few local habits; places anywhere can be added.
 */
export interface Region {
  id: string
  name: L
  center: LatLng
  /** How far the region reaches, in distanceM() metres (padded for streets). */
  radiusM: number
  /** Words in a request that mean this region. */
  words: string[]
  /** Countryside: sights kilometres apart — ride by default, plan a longer day, weigh distance less. */
  spreadOut?: boolean
}

export const REGIONS: Region[] = [
  {
    id: 'hoan-kiem',
    name: { vi: 'Hoàn Kiếm', en: 'Hoan Kiem' },
    center: { lat: 21.0287, lng: 105.8524 },
    // The district around the lake (~3.5 km as the crow flies) — not all of Hanoi.
    radiusM: 4_500,
    words: ['hoàn kiếm', 'hoan kiem', 'hồ gươm', 'ho guom', 'phố cổ', 'pho co', 'old quarter', 'sword lake'],
  },
  {
    id: 'ba-vi',
    name: { vi: 'Ba Vì', en: 'Ba Vi' },
    center: { lat: 21.1, lng: 105.42 },
    radiusM: 25_000,
    words: ['ba vì', 'ba vi', 'bavi', 'sơn tây', 'son tay', 'đường lâm', 'duong lam', 'suối hai', 'đồng mô', 'dong mo', 'núi tản'],
    spreadOut: true,
  },
]

/** Where a map opens when nothing better is known (never used as the traveller's position). */
export const DEFAULT_POINT: LatLng = REGIONS[0].center

export function regionById(id: string | null | undefined): Region | null {
  return REGIONS.find((r) => r.id === id) ?? null
}

/** The named region this point is in, if any (the nearest when two overlap). */
export function regionAt(p: LatLng | null | undefined): Region | null {
  if (!p) return null
  let best: Region | null = null
  let bestM = Infinity
  for (const r of REGIONS) {
    const m = distanceM(p, r.center)
    if (m <= r.radiusM && m < bestM) (best = r), (bestM = m)
  }
  return best
}

/** How far to look around the plan's centre, by how the traveller gets around (distanceM() metres). */
export const SEARCH_M: Record<Transport, number> = { walk: 4_000, motorbike: 15_000, grabbike: 15_000, car: 20_000 }
/** Widen the search until there is at least this much to choose from… */
const MIN_CHOICES = 12
/** …but never further than this. */
const MAX_SEARCH_M = 80_000

/** Places around `center`, nearest first, widening the radius when there are too few. */
export function placesAround(places: Place[], center: LatLng, transport: Transport): { places: Place[]; radiusM: number } {
  const withM = places.map((p) => [p, distanceM(center, p)] as const).sort((a, b) => a[1] - b[1])
  let radius = SEARCH_M[transport]
  while (radius < MAX_SEARCH_M && withM.filter(([, m]) => m <= radius).length < MIN_CHOICES) radius *= 2
  radius = Math.min(radius, MAX_SEARCH_M)
  return { places: withM.filter(([, m]) => m <= radius).map(([p]) => p), radiusM: radius }
}

export interface Plan {
  /** The named region the plan is in (for labels and local habits); null = no named region. */
  region: Region | null
  /** Where places are looked for: the point or region asked for, else the start, else a default view. */
  center: LatLng
  /** The traveller's real position or picked start point; null until we have one. */
  start: LatLng | null
  places: Place[]
  /** How far from the centre the plan looks (distanceM() metres) — events are offered within it too. */
  radiusM: number
}

/**
 * Centre, start and places for a plan. A point to plan near (a shared quest's first stop) wins, then
 * a region named in the request, then where the traveller is.
 */
export function planAround(
  asked: { area?: string | null; near?: LatLng | null } | null | undefined,
  origin: LatLng | null,
  places: Place[],
  transport: Transport,
): Plan {
  const named = regionById(asked?.area)
  const center = asked?.near ?? named?.center ?? origin ?? DEFAULT_POINT
  const region = asked?.near ? regionAt(asked.near) : (named ?? regionAt(origin))
  return { region, center, start: origin, ...placesAround(places, center, transport) }
}

/**
 * Where "nearby" is measured from when ranking places: the start point — unless the plan is in an
 * area the traveller first rides to (starting in Ha Dong, exploring Hoan Kiem): then its centre, so
 * the picks sit around the lake rather than on the edge closest to Ha Dong.
 */
export function rankFrom(plan: Pick<Plan, 'center' | 'start'>): LatLng {
  return plan.start && distanceM(plan.start, plan.center) <= RIDE_THERE_M ? plan.start : plan.center
}
