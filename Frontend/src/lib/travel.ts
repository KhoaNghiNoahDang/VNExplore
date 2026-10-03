import { RUSH_HOURS, TRANSPORT, WALKING_STREET_BOXES, type Fare } from '../data/transport'
import type { LatLng, Leg, Transport } from '../types'
import { hanoiClock } from './hanoiTime'

/** Straight line × 1.3 to approximate street distance, in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.3
}

/** Hoan Kiem Lake. Legs with an end further than 12 km away (Ba Vì, the road out) use open-road speeds. */
const CITY = { lat: 21.0296, lng: 105.8526 }
const OPEN_ROAD_KMH: Partial<Record<Transport, number>> = { motorbike: 35, grabbike: 35, car: 40 }
const outOfTown = (p: LatLng) => distanceM(p, CITY) / 1.3 > 12_000

export function isRushHour(at: Date): boolean {
  const { day, hour, minute } = hanoiClock(at)
  if (day === 0 || day === 6) return false
  const m = hour * 60 + minute
  return RUSH_HOURS.some(([a, b]) => m >= a && m < b)
}

/** Friday 19:00 → Sunday 24:00, Hanoi time. */
export function isWalkingStreetTime(at: Date): boolean {
  const { day, hour } = hanoiClock(at)
  return (day === 5 && hour >= 19) || day === 6 || day === 0
}

export function inWalkingStreet(p: LatLng): boolean {
  return WALKING_STREET_BOXES.some(([s, w, n, e]) => p.lat >= s && p.lat <= n && p.lng >= w && p.lng <= e)
}

/** Cheapest mix of vehicle sizes to carry `people`. */
function cheapestFare(fares: Fare[], people: number, km: number): { costK: number; vehicles: number } {
  const price = (f: Fare) => f.baseK + Math.max(0, km - f.baseKm) * f.perKmK
  let best = { costK: Infinity, vehicles: 0 }
  // Try every count of the largest vehicle, fill the rest with the smallest.
  const small = fares.reduce((a, b) => (a.seats <= b.seats ? a : b))
  const large = fares.reduce((a, b) => (a.seats >= b.seats ? a : b))
  for (let nLarge = 0; nLarge <= Math.ceil(people / large.seats); nLarge++) {
    const rest = Math.max(0, people - nLarge * large.seats)
    const nSmall = Math.ceil(rest / small.seats)
    const cost = nLarge * price(large) + nSmall * price(small)
    if (cost < best.costK) best = { costK: cost, vehicles: nLarge + nSmall }
  }
  return best
}

function walkLeg(requested: Transport, m: number, peak: boolean, note?: Leg['note']): Leg {
  const spec = TRANSPORT.walk
  return {
    requested,
    transport: 'walk',
    distanceM: m,
    minutes: Math.max(1, Math.round(m / ((spec.speedKmh.normal * 1000) / 60))),
    costK: 0,
    vehicles: 0,
    peak,
    note,
  }
}

/**
 * Time and cost of one leg for the whole group.
 * Heuristic stand-in for a live routing API (e.g. TomTom via the Render backend):
 * keep this signature and swap the body when the backend is ready.
 */
export function estimateLeg(from: LatLng, to: LatLng, requested: Transport, at: Date, people: number): Leg {
  const m = distanceM(from, to)
  const peak = isRushHour(at)
  if (requested === 'walk') return walkLeg(requested, m, peak)

  const spec = TRANSPORT[requested]
  if (m < spec.minLegM) return walkLeg(requested, m, peak, 'short')

  let extraWalkMin = 0
  let note: Leg['note']
  if (!spec.walkingStreetOk && isWalkingStreetTime(at)) {
    const a = inWalkingStreet(from)
    const b = inWalkingStreet(to)
    if (a && b) return walkLeg(requested, m, peak, 'walkingStreet')
    if (a || b) {
      // Ride to the edge of the zone, walk the last few hundred metres.
      extraWalkMin = 5
      note = 'parkOutside'
    }
  }

  // Country roads: faster, straighter, no Old Quarter jams.
  const open = (outOfTown(from) || outOfTown(to)) && OPEN_ROAD_KMH[requested]
  const roadM = m * (open ? 1 : spec.detour)
  const km = roadM / 1000
  const speed = open || (peak ? spec.speedKmh.peak : spec.speedKmh.normal)
  const minutes = Math.round((km / speed) * 60 + spec.overheadMin + extraWalkMin)

  let costK = 0
  let vehicles = 1
  if (spec.fares) {
    const f = cheapestFare(spec.fares, people, km)
    costK = f.costK * (peak && spec.peakFare ? spec.peakFare : 1)
    vehicles = f.vehicles
  } else if (spec.own) {
    vehicles = Math.ceil(people / spec.own.seats)
    costK = vehicles * (km * spec.own.fuelPerKmK + spec.own.parkingK)
  }

  return {
    requested,
    transport: requested,
    distanceM: roadM,
    minutes: Math.max(1, minutes),
    costK: Math.round(costK),
    vehicles,
    peak,
    note,
  }
}
