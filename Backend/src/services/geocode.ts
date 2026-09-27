import { CircuitBreaker, fetchJson, Limiter, singleFlight, TtlCache } from '../lib/resilience.js'

/**
 * Address / place search for picking a start point, via OpenStreetMap's Nominatim.
 * Their usage policy: identify the app, at most 1 request per second, cache results — done here.
 * Results are limited to greater Hanoi (Hoan Kiem … Ba Vi).
 */
export interface GeoResult {
  name: string
  label: string
  lat: number
  lng: number
}

const BASE = 'https://nominatim.openstreetmap.org/search'
// west, north, east, south — covers central Hanoi out to Ba Vì / Sơn Tây
const VIEWBOX = '105.25,21.30,106.05,20.85'

const cache = new TtlCache<GeoResult[]>(3000, 7 * 24 * 3600_000)
const breaker = new CircuitBreaker('nominatim', 4, 60_000)
const limit = new Limiter('nominatim', 1, 20)
const once = singleFlight<GeoResult[]>()
let lastCall = 0

interface NominatimItem {
  lat: string
  lon: string
  name?: string
  display_name: string
}

/** Wait so calls are at least 1.1 s apart (runs inside the 1-at-a-time limiter). */
async function politeGap() {
  const wait = lastCall + 1100 - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCall = Date.now()
}

export async function geocode(q: string, lang: 'vi' | 'en'): Promise<GeoResult[]> {
  const key = `${lang}|${q.trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ')}`
  const hit = cache.get(key)
  if (hit) return hit
  return once(key, async () => {
    const url =
      `${BASE}?format=jsonv2&limit=6&countrycodes=vn&bounded=1&viewbox=${VIEWBOX}` +
      `&accept-language=${lang}&q=${encodeURIComponent(q.trim())}`
    const items = await breaker.run(() =>
      limit.run(async () => {
        await politeGap()
        return fetchJson<NominatimItem[]>(url, {
          timeoutMs: 6000,
          headers: { 'User-Agent': 'VNExplore/0.1 (Hanoi travel app; start-point search)' },
        })
      }),
    )
    const out = items.map((it) => {
      const parts = it.display_name.split(',').map((s) => s.trim())
      return {
        name: it.name || parts[0],
        // Short address: drop the country and postcode tail.
        label: parts.slice(it.name ? 1 : 1, 4).join(', '),
        lat: Number(it.lat),
        lng: Number(it.lon),
      }
    })
    cache.set(key, out)
    return out
  })
}
