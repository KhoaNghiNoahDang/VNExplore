import type { LatLng, Transport } from '../types'
import { API_URL } from './backend'

/**
 * Street-following route shapes. Prefer the cached Render backend; if it is
 * unavailable after four seconds, fall back to FOSSGIS' public OSRM service.
 */
const OSRM_BASE = 'https://routing.openstreetmap.de'

/** Motorbikes follow the same one-way rules as cars in the Old Quarter. */
const PROFILE: Record<Transport, string> = {
  walk: 'routed-foot',
  motorbike: 'routed-car',
  grabbike: 'routed-car',
  car: 'routed-car',
}

export type LineCoords = [number, number][]

interface BackendLeg {
  coords: LineCoords
  source: 'memory' | 'cache' | 'osrm' | 'straight'
}

interface BackendRouteResponse {
  legs: BackendLeg[]
}

const cache = new Map<string, Promise<LineCoords | null>>()

function validLine(value: unknown): value is LineCoords {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === 'number' &&
        Number.isFinite(point[0]) &&
        typeof point[1] === 'number' &&
        Number.isFinite(point[1]),
    )
  )
}

async function fetchFromBackend(from: LatLng, to: LatLng, transport: Transport): Promise<LineCoords> {
  if (!API_URL) throw new Error('Backend is not configured')

  const res = await fetch(`${API_URL}/v1/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transport, points: [from, to] }),
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) throw new Error(`Routing backend returned ${res.status}`)

  const body = (await res.json()) as BackendRouteResponse
  const leg = body.legs?.[0]
  // The backend uses a straight line as its final safety net. Try the public
  // router once from the browser before accepting that degraded geometry.
  if (!leg || leg.source === 'straight' || !validLine(leg.coords)) throw new Error('Backend route unavailable')
  return leg.coords
}

async function fetchFromOsrm(coords: string, profile: string): Promise<LineCoords | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(
      `${OSRM_BASE}/${profile}/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: ctrl.signal },
    )
    if (!res.ok) return null
    const body = (await res.json()) as { code?: string; routes?: { geometry?: { coordinates?: unknown } }[] }
    const line = body.code === 'Ok' ? body.routes?.[0]?.geometry?.coordinates : null
    return validLine(line) ? line : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Street geometry for one leg as [lng, lat] pairs, or null if the service can't be reached. */
export function fetchLegShape(from: LatLng, to: LatLng, transport: Transport): Promise<LineCoords | null> {
  const coords = `${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(6)},${to.lat.toFixed(6)}`
  const key = `${PROFILE[transport]}|${coords}`
  const hit = cache.get(key)
  if (hit) return hit

  const req = fetchFromBackend(from, to, transport).catch(() => fetchFromOsrm(coords, PROFILE[transport]))

  cache.set(key, req)
  // Don't keep failures around — try again next time.
  req.then((r) => r === null && cache.delete(key))
  return req
}
