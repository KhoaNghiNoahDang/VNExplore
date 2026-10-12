import { CircuitBreaker, fetchJson, Limiter, singleFlight, TtlCache } from '../lib/resilience.js'

/**
 * Address / place search in greater Hanoi (start point, "Add a place").
 *
 * OpenStreetMap knows few Hanoi house numbers, so "12 Tạ Hiện" alone often finds nothing:
 *   1. Nominatim with the text as typed;
 *   2. nothing → Photon (same OSM data, but tolerant of typos and partial words);
 *   3. still nothing and the text starts with a house number / alley → the street alone,
 *      marked `approx` (the app asks to drag the pin onto the right house).
 * Nominatim's policy (identify the app, ≤ 1 request/s, cache) is kept; Photon is called politely too.
 */
export interface GeoResult {
  name: string
  label: string
  lat: number
  lng: number
  /** Only the street was found, not the house number. */
  approx?: boolean
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const PHOTON = 'https://photon.komoot.io/api/'
const UA = 'VNExplore/0.2 (Hanoi travel app; address search)'
// west, north, east, south — covers central Hanoi out to Ba Vì / Sơn Tây
const VIEWBOX = '105.25,21.30,106.05,20.85'
const BOX = { w: 105.25, n: 21.3, e: 106.05, s: 20.85 }
const inBox = (lat: number, lng: number) => lat >= BOX.s && lat <= BOX.n && lng >= BOX.w && lng <= BOX.e

const cache = new TtlCache<GeoResult[]>(3000, 7 * 24 * 3600_000)
const nominatimBreaker = new CircuitBreaker('nominatim', 4, 60_000)
const nominatimLimit = new Limiter('nominatim', 1, 20)
const photonBreaker = new CircuitBreaker('photon', 4, 60_000)
const photonLimit = new Limiter('photon', 2, 20)
const once = singleFlight<GeoResult[]>()
let lastNominatim = 0

interface NominatimItem {
  lat: string
  lon: string
  name?: string
  display_name: string
}
interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: { name?: string; housenumber?: string; street?: string; district?: string; locality?: string; city?: string; county?: string; state?: string }
}

/** Wait so Nominatim calls are at least 1.1 s apart (runs inside the 1-at-a-time limiter). */
async function politeGap() {
  const wait = lastNominatim + 1100 - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastNominatim = Date.now()
}

async function nominatim(q: string, lang: 'vi' | 'en'): Promise<GeoResult[]> {
  const url =
    `${NOMINATIM}?format=jsonv2&limit=6&countrycodes=vn&bounded=1&viewbox=${VIEWBOX}` +
    `&accept-language=${lang}&q=${encodeURIComponent(q)}`
  const items = await nominatimBreaker.run(() =>
    nominatimLimit.run(async () => {
      await politeGap()
      return fetchJson<NominatimItem[]>(url, { timeoutMs: 6000, headers: { 'User-Agent': UA } })
    }),
  )
  return items.map((it) => {
    const parts = it.display_name.split(',').map((s) => s.trim())
    // Short address: drop the country and postcode tail.
    return { name: it.name || parts[0], label: parts.slice(1, 4).join(', '), lat: Number(it.lat), lng: Number(it.lon) }
  })
}

async function photon(q: string): Promise<GeoResult[]> {
  const url = `${PHOTON}?limit=6&bbox=${BOX.w},${BOX.s},${BOX.e},${BOX.n}&q=${encodeURIComponent(q)}`
  const body = await photonBreaker.run(() =>
    photonLimit.run(() => fetchJson<{ features?: PhotonFeature[] }>(url, { timeoutMs: 6000, headers: { 'User-Agent': UA } })),
  )
  return (body.features ?? [])
    .map((f) => {
      const p = f.properties
      const [lng, lat] = f.geometry.coordinates
      const street = [p.housenumber, p.street].filter(Boolean).join(' ')
      const name = p.name || street || p.district || p.locality || ''
      const label = [p.name ? street : '', p.district || p.locality, p.city || p.county || p.state].filter(Boolean).join(', ')
      return { name, label, lat, lng }
    })
    .filter((r) => r.name && inBox(r.lat, r.lng))
}

/**
 * "12 Tạ Hiện", "số 5 ngõ 10 Láng Hạ", "12/3 Hàng Bạc" → the street part ("Tạ Hiện", "Láng Hạ",
 * "Hàng Bạc"); null when there is no house number to drop.
 */
export function streetOf(q: string): string | null {
  const s = q
    .trim()
    // house number with optional "số", sub-numbers and letters: 12, 12A, 12/3, số 5B
    .replace(/^(số\s*)?\d+[a-zA-Z]?(\s*[/-]\s*\d+[a-zA-Z]?)*\s*,?\s*/iu, '')
    // alleys: ngõ 10, ngách 4, hẻm 3, kiệt 2 (possibly several)
    .replace(/^((ngõ|ngách|hẻm|kiệt|ngo|ngach)\s*\d+[a-zA-Z]?\s*,?\s*)+/iu, '')
    .trim()
  return s && s !== q.trim() && /\p{L}/u.test(s) ? s : null
}

async function search(q: string, lang: 'vi' | 'en'): Promise<GeoResult[]> {
  const first = await nominatim(q, lang).catch(() => [] as GeoResult[])
  if (first.length) return first
  const fuzzy = await photon(q).catch(() => [] as GeoResult[])
  if (fuzzy.length) return fuzzy
  const street = streetOf(q)
  if (!street) return []
  const near = await nominatim(street, lang).catch(() => [] as GeoResult[])
  const streetHits = near.length ? near : await photon(street).catch(() => [] as GeoResult[])
  return streetHits.map((r) => ({ ...r, approx: true }))
}

export async function geocode(q: string, lang: 'vi' | 'en'): Promise<GeoResult[]> {
  const key = `${lang}|${q.trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ')}`
  const hit = cache.get(key)
  if (hit) return hit
  return once(key, async () => {
    const out = await search(q.trim(), lang)
    // Don't keep an empty answer for a week: it may just have been a bad minute for the services.
    if (out.length) cache.set(key, out)
    return out
  })
}

// ------------------------------------------------------------ Google Maps links

/** Hosts a shared Google Maps link may live on (short links redirect to google.com/maps). */
const MAPS_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+)$/i

/** Read a point (and the place name, when given) from a full Google Maps URL. */
export function pointFromMapsUrl(url: string): GeoResult | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const s = decodeURIComponent(u.pathname + u.search + u.hash)
  // The place's own pin (!3d lat !4d lng) beats the map's centre (@lat,lng).
  const m =
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(s) ??
    /[?&](?:q|ll|query|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(s) ??
    /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(s)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  if (!inBox(lat, lng)) return null
  const place = /\/place\/([^/@]+)/.exec(u.pathname)
  const name = place ? decodeURIComponent(place[1]).replace(/\+/g, ' ').trim() : ''
  return { name, label: '', lat, lng }
}

/**
 * A link shared from Google Maps ("Share → Copy link"): short maps.app.goo.gl links are followed
 * (only to Google hosts, at most 5 hops) to the full URL, which carries the coordinates.
 */
export async function resolveMapsLink(link: string): Promise<GeoResult | null> {
  let url: URL
  try {
    url = new URL(link.trim())
  } catch {
    return null
  }
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== 'https:' || !MAPS_HOSTS.test(url.hostname)) return null
    const direct = pointFromMapsUrl(url.href)
    if (direct) return direct
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(6000), headers: { 'User-Agent': UA } })
    const next = res.headers.get('location')
    await res.body?.cancel().catch(() => undefined)
    if (res.status < 300 || res.status >= 400 || !next) return null
    url = new URL(next, url)
  }
  return null
}
