import { TRANSPORT } from '../data/transport'
import type { Intent, LatLng, Leg, Place, Transport } from '../types'
import { distanceM, estimateLeg } from './travel'

export { distanceM }

/** Order stops with a nearest-neighbour walk from the start point. */
export function orderStops(start: LatLng, places: Place[]): Place[] {
  const left = [...places]
  const out: Place[] = []
  let cur: LatLng = start
  while (left.length) {
    let best = 0
    for (let i = 1; i < left.length; i++) {
      if (distanceM(cur, left[i]) < distanceM(cur, left[best])) best = i
    }
    const next = left.splice(best, 1)[0]
    out.push(next)
    cur = next
  }
  return out
}

export interface Travel {
  transport: Transport
  /** Departure time (ms); null = now. */
  departAt: number | null
}

export const DEFAULT_TRAVEL: Travel = { transport: 'walk', departAt: null }

export interface QuestSummary {
  stops: Place[]
  /** legs[i] leads to stops[i] (legs[0] starts at the start point). */
  legs: Leg[]
  distanceM: number
  visitMin: number
  travelMin: number
  totalMin: number
  /** Tickets & food for the group. */
  costMin: number
  costMax: number
  /** Fares, fuel and parking for the group. */
  travelCostK: number
}

/** Walks the route in time order so each leg sees its own traffic (rush hour, walking street). */
export function summarize(start: LatLng, places: Place[], people: number, travel: Travel = DEFAULT_TRAVEL): QuestSummary {
  const stops = orderStops(start, places)
  const legs: Leg[] = []
  let t = travel.departAt ?? Date.now()
  let cur: LatLng = start
  for (const s of stops) {
    const leg = estimateLeg(cur, s, travel.transport, new Date(t), people)
    legs.push(leg)
    t += (leg.minutes + s.visitMin) * 60_000
    cur = s
  }
  const visitMin = stops.reduce((sum, s) => sum + s.visitMin, 0)
  const travelMin = legs.reduce((sum, l) => sum + l.minutes, 0)
  return {
    stops,
    legs,
    distanceM: legs.reduce((sum, l) => sum + l.distanceM, 0),
    visitMin,
    travelMin,
    totalMin: visitMin + travelMin,
    costMin: stops.reduce((sum, s) => sum + s.priceMin, 0) * people,
    costMax: stops.reduce((sum, s) => sum + s.priceMax, 0) * people,
    travelCostK: legs.reduce((sum, l) => sum + l.costK, 0),
  }
}

function score(place: Place, intent: Intent, start: LatLng, favIds: string[]): number {
  const themeHits = place.themes.filter((t) => intent.themes.includes(t)).length
  const pricey = intent.budget === 'low' && place.priceMax > 60 ? 1 : 0
  const fav = favIds.indexOf(place.id)
  const roleBoost = fav === -1 ? 0 : 1500 - fav * 100
  return themeHits * 1000 + roleBoost - pricey * 800 - distanceM(start, place)
}

/**
 * All places, best matches for the request first.
 * `favIds` (the role's favourite places, in Explore mode) are pushed up.
 */
export function rankPlaces(places: Place[], intent: Intent, start: LatLng, favIds: string[] = []): Place[] {
  return [...places].sort((a, b) => score(b, intent, start, favIds) - score(a, intent, start, favIds))
}

/** Greedily pick top-ranked places that still fit in the requested time. */
export function preselect(
  ranked: Place[],
  intent: Intent,
  start: LatLng,
  favIds: string[] = [],
  travel: Travel = { transport: intent.transport, departAt: null },
): string[] {
  const budgetMin = intent.hours * 60
  const picked: Place[] = []
  for (const p of ranked) {
    if (!p.themes.some((t) => intent.themes.includes(t)) && !favIds.includes(p.id)) continue
    if (summarize(start, [...picked, p], intent.people, travel).totalMin <= budgetMin) picked.push(p)
    if (picked.length >= 5) break
  }
  return picked.map((p) => p.id)
}

/** A free photo spot close to the route that isn't already in it. */
export function suggestPhotoSpot(all: Place[], stops: Place[]): Place | null {
  if (!stops.length) return null
  const ids = new Set(stops.map((s) => s.id))
  const candidates = all.filter((p) => !ids.has(p.id) && p.tags.includes('photo'))
  if (!candidates.length) return null
  const nearest = (p: Place) => Math.min(...stops.map((s) => distanceM(s, p)))
  return candidates.sort((a, b) => nearest(a) - nearest(b))[0]
}

/** Deterministic shuffle so challenge answers aren't always the first option. */
export function shuffledOrder(n: number, seed: string): number[] {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0
    const j = h % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/** Rough narration length: ~150 spoken words per minute. */
export function storyMinutes(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length / 150))
}

/** Google Maps directions through every stop, in order, for the chosen transport. */
export function googleMapsUrl(start: LatLng, stops: Place[], transport: Transport = 'walk'): string {
  const fmt = (p: LatLng) => `${p.lat},${p.lng}`
  const dest = stops[stops.length - 1]
  const params = new URLSearchParams({
    api: '1',
    origin: fmt(start),
    destination: fmt(dest),
    travelmode: TRANSPORT[transport].mapsMode,
  })
  const waypoints = stops.slice(0, -1).map(fmt).join('|')
  if (waypoints) params.set('waypoints', waypoints)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
