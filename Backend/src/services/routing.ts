import { config } from '../config.js'
import { adminDb } from '../lib/supabase.js'
import { CircuitBreaker, fetchJson, Limiter, singleFlight, TtlCache, withTimeout } from '../lib/resilience.js'

/**
 * Street geometry for one leg, with three layers so the routing service is hit as little as possible:
 *   memory (this instance) → Supabase route_cache (shared, survives restarts) → OSRM.
 * If everything fails we still answer with a straight line (source: "straight") — the app never breaks.
 */
export type Transport = 'walk' | 'motorbike' | 'grabbike' | 'car'
export interface LatLng {
  lat: number
  lng: number
}
export interface Leg {
  coords: [number, number][] // [lng, lat]
  distanceM: number
  durationS: number
  source: 'memory' | 'cache' | 'osrm' | 'straight'
}

/** Motorbikes follow the same one-way rules as cars in the Old Quarter. */
const PROFILE: Record<Transport, 'foot' | 'car'> = { walk: 'foot', motorbike: 'car', grabbike: 'car', car: 'car' }

const memory = new TtlCache<Omit<Leg, 'source'>>(5000, 7 * 24 * 3600_000) // ~5k legs, well under 50 MB
const osrmBreaker = new CircuitBreaker('osrm', 5, 60_000)
const dbBreaker = new CircuitBreaker('route-cache', 5, 30_000)
const osrmLimit = new Limiter('osrm', 4, 60) // be polite to the free public server
const once = singleFlight<Leg>()

const legKey = (profile: string, a: LatLng, b: LatLng) =>
  `${profile}|${a.lng.toFixed(6)},${a.lat.toFixed(6)};${b.lng.toFixed(6)},${b.lat.toFixed(6)}`

function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371e3
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function straight(a: LatLng, b: LatLng, profile: 'foot' | 'car'): Leg {
  const d = haversineM(a, b) * 1.3 // streets are never straight
  return {
    coords: [
      [a.lng, a.lat],
      [b.lng, b.lat],
    ],
    distanceM: Math.round(d),
    durationS: Math.round(d / (profile === 'foot' ? 1.2 : 5)),
    source: 'straight',
  }
}

async function fromDb(key: string): Promise<Omit<Leg, 'source'> | null> {
  if (!adminDb) return null
  const { data, error } = await dbBreaker.run(() =>
    withTimeout(adminDb!.from('route_cache').select('coords, distance_m, duration_s').eq('key', key).maybeSingle(), 1500, 'route cache read'),
  )
  if (error) throw new Error(error.message)
  return data ? { coords: data.coords, distanceM: data.distance_m, durationS: data.duration_s } : null
}

function toDb(key: string, profile: string, leg: Omit<Leg, 'source'>): void {
  if (!adminDb || dbBreaker.state === 'open') return
  // Fire and forget: a failed cache write must never fail the request.
  void dbBreaker
    .run(() =>
      withTimeout(
        adminDb!.from('route_cache').upsert({
          key,
          profile,
          coords: leg.coords,
          distance_m: Math.round(leg.distanceM),
          duration_s: Math.round(leg.durationS),
        }),
        3000,
        'route cache write',
      ).then((r) => {
        if (r.error) throw new Error(r.error.message)
      }),
    )
    .catch(() => undefined)
}

interface OsrmResponse {
  code: string
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[]
}

async function fromOsrm(profile: 'foot' | 'car', a: LatLng, b: LatLng): Promise<Omit<Leg, 'source'>> {
  const coords = `${a.lng.toFixed(6)},${a.lat.toFixed(6)};${b.lng.toFixed(6)},${b.lat.toFixed(6)}`
  const url = `${config.OSRM_URL}/routed-${profile}/route/v1/driving/${coords}?overview=full&geometries=geojson`
  const d = await osrmBreaker.run(() =>
    osrmLimit.run(() => fetchJson<OsrmResponse>(url, { timeoutMs: 6000, headers: { 'User-Agent': 'VNExplore/0.1 (travel app prototype)' } })),
  )
  const r = d.code === 'Ok' ? d.routes?.[0] : undefined
  if (!r) throw new Error(`OSRM: ${d.code}`)
  // Round to 6 decimals (~10 cm) — smaller payloads, same line.
  const line = r.geometry.coordinates.map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6] as [number, number])
  return { coords: line, distanceM: r.distance, durationS: r.duration }
}

export async function getLeg(a: LatLng, b: LatLng, transport: Transport): Promise<Leg> {
  const profile = PROFILE[transport]
  const key = legKey(profile, a, b)
  const hit = memory.get(key)
  if (hit) return { ...hit, source: 'memory' }

  return once(key, async () => {
    try {
      const cached = await fromDb(key)
      if (cached) {
        memory.set(key, cached)
        return { ...cached, source: 'cache' }
      }
    } catch {
      /* cache down — go to OSRM */
    }
    try {
      const fresh = await fromOsrm(profile, a, b)
      memory.set(key, fresh)
      toDb(key, profile, fresh)
      return { ...fresh, source: 'osrm' }
    } catch {
      return straight(a, b, profile) // not cached: try the real route again next time
    }
  })
}

export const routingHealth = () => ({
  osrm: osrmBreaker.state,
  routeCache: adminDb ? dbBreaker.state : 'disabled',
  memoryLegs: memory.size,
})
