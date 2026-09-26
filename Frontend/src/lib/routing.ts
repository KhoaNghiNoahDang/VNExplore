import type { LatLng, Transport } from '../types'

/**
 * Street-following route shapes from the public OSRM servers run by FOSSGIS
 * (the ones openstreetmap.org uses). Free, no key, CORS-enabled.
 * ⚠ Fair-use service: fine for a prototype. For real traffic, move this behind the
 *   Render backend with a cache, or self-host OSRM/Valhalla.
 */
const BASE = 'https://routing.openstreetmap.de'

/** Motorbikes follow the same one-way rules as cars in the Old Quarter. */
const PROFILE: Record<Transport, string> = {
  walk: 'routed-foot',
  motorbike: 'routed-car',
  grabbike: 'routed-car',
  car: 'routed-car',
}

export type LineCoords = [number, number][]

const cache = new Map<string, Promise<LineCoords | null>>()

/** Street geometry for one leg as [lng, lat] pairs, or null if the service can't be reached. */
export function fetchLegShape(from: LatLng, to: LatLng, transport: Transport): Promise<LineCoords | null> {
  const coords = `${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(6)},${to.lat.toFixed(6)}`
  const key = `${PROFILE[transport]}|${coords}`
  const hit = cache.get(key)
  if (hit) return hit

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  const req = fetch(`${BASE}/${PROFILE[transport]}/route/v1/driving/${coords}?overview=full&geometries=geojson`, {
    signal: ctrl.signal,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (d?.code === 'Ok' ? (d.routes[0].geometry.coordinates as LineCoords) : null))
    .catch(() => null)
    .finally(() => clearTimeout(timer))

  cache.set(key, req)
  // Don't keep failures around — try again next time.
  req.then((r) => r === null && cache.delete(key))
  return req
}
