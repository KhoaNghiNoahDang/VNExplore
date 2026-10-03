import { TRANSPORT } from '../data/transport'
import type { Intent, LatLng, Leg, Place, Transport } from '../types'
import { hanoiClock } from './hanoiTime'
import { isOpenAt } from './hours'
import type { Weather } from './weather'
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
  /** When the visit at stops[i] begins (ms) — after waiting for an event to start. */
  arriveAt: number[]
  /** Minutes spent waiting at stops[i] for an event to start. */
  waitMin: number[]
  /** Minutes too late for stops[i] (a show that already began, an exhibition about to close). 0 = on time. */
  lateMin: number[]
  /** Total waiting, also counted in totalMin. */
  waitTotalMin: number
}

interface Timed {
  legs: Leg[]
  arriveAt: number[]
  waitMin: number[]
  lateMin: number[]
}

/**
 * Walk the stops in order. Event stops have a fixed time: arrive early and you wait for the start,
 * arrive after a show began (or too close to an exhibition's closing) and you are late.
 */
function walk(start: LatLng, stops: Place[], people: number, travel: Travel): Timed {
  const out: Timed = { legs: [], arriveAt: [], waitMin: [], lateMin: [] }
  let t = travel.departAt ?? Date.now()
  let cur: LatLng = start
  for (const s of stops) {
    const leg = estimateLeg(cur, s, travel.transport, new Date(t), people)
    t += leg.minutes * 60_000
    let wait = 0
    let late = 0
    const e = s.event
    if (e) {
      if (t < e.startMs) wait = (e.startMs - t) / 60_000
      else if (e.kind === 'show') late = (t - e.startMs) / 60_000
      else late = Math.max(0, (t + s.visitMin * 60_000 - e.endMs) / 60_000)
    }
    t += wait * 60_000
    out.legs.push(leg)
    out.arriveAt.push(t)
    out.waitMin.push(Math.round(wait))
    out.lateMin.push(Math.round(late))
    t += s.visitMin * 60_000
    cur = s
  }
  return out
}

/** Lateness is never worth it; after that, prefer less waiting and a shorter day. */
function cost(start: LatLng, stops: Place[], people: number, travel: Travel): number {
  const w = walk(start, stops, people, travel)
  const late = w.lateMin.reduce((a, b) => a + b, 0)
  const wait = w.waitMin.reduce((a, b) => a + b, 0)
  const end = stops.length ? w.arriveAt[stops.length - 1] + stops[stops.length - 1].visitMin * 60_000 : 0
  return late * 1000 + wait * 2 + end / 60_000
}

/**
 * Nearest-first for ordinary stops, then each event (earliest first) goes into the slot
 * where it fits best: before its start, with as little waiting as possible. Finally, stops are
 * moved one at a time while that helps (e.g. a museum fills the gap before a 15:30 talk).
 */
function orderWithEvents(start: LatLng, places: Place[], people: number, travel: Travel): Place[] {
  let seq = insertEvents(start, places, people, travel)
  let best = cost(start, seq, people, travel)
  for (let round = 0, improved = true; improved && round < 4; round++) {
    improved = false
    for (let from = 0; from < seq.length; from++) {
      for (let to = 0; to < seq.length; to++) {
        if (to === from) continue
        const trial = [...seq]
        trial.splice(to, 0, trial.splice(from, 1)[0])
        const c = cost(start, trial, people, travel)
        if (c < best - 0.5) {
          best = c
          seq = trial
          improved = true
        }
      }
    }
  }
  return seq
}

function insertEvents(start: LatLng, places: Place[], people: number, travel: Travel): Place[] {
  const events = places.filter((p) => p.event).sort((a, b) => a.event!.startMs - b.event!.startMs)
  let seq = orderStops(start, places.filter((p) => !p.event))
  for (const ev of events) {
    let best: Place[] = []
    let bestCost = Infinity
    for (let i = 0; i <= seq.length; i++) {
      const trial = [...seq.slice(0, i), ev, ...seq.slice(i)]
      const c = cost(start, trial, people, travel)
      if (c < bestCost) {
        bestCost = c
        best = trial
      }
    }
    seq = best
  }
  return seq
}

/** Walks the route in time order so each leg sees its own traffic (rush hour, walking street). */
export function summarize(
  start: LatLng,
  places: Place[],
  people: number,
  travel: Travel = DEFAULT_TRAVEL,
  /** Keep this stop order (a community quest's author order) instead of nearest-first. */
  order?: string[] | null,
): QuestSummary {
  const stops = order?.length
    ? [...places].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    : places.some((p) => p.event)
      ? orderWithEvents(start, places, people, travel)
      : orderStops(start, places)
  const { legs, arriveAt, waitMin, lateMin } = walk(start, stops, people, travel)
  const visitMin = stops.reduce((sum, s) => sum + s.visitMin, 0)
  const travelMin = legs.reduce((sum, l) => sum + l.minutes, 0)
  const waitTotalMin = waitMin.reduce((sum, w) => sum + w, 0)
  return {
    stops,
    legs,
    arriveAt,
    waitMin,
    lateMin,
    waitTotalMin,
    distanceM: legs.reduce((sum, l) => sum + l.distanceM, 0),
    visitMin,
    travelMin,
    totalMin: visitMin + travelMin + waitTotalMin,
    costMin: stops.reduce((sum, s) => sum + s.priceMin, 0) * people,
    costMax: stops.reduce((sum, s) => sum + s.priceMax, 0) * people,
    travelCostK: legs.reduce((sum, l) => sum + l.costK, 0),
  }
}

/** Dishes / drinks travellers name directly ("phở", "egg coffee"): matched against a place's name and intro. */
const DISHES = [
  'phở', 'pho', 'bún chả', 'bun cha', 'bún riêu', 'bún cá', 'bún đậu', 'bún mọc', 'bún ngan', 'bún thang', 'bánh cuốn',
  'bánh mì', 'banh mi', 'xôi', 'sticky rice', 'miến', 'chả cá', 'cha ca', 'cà phê trứng', 'egg coffee', 'cà phê', 'coffee',
  'kem', 'ice cream', 'ốc', 'snail', 'chay', 'vegan', 'vegetarian', 'nem', 'bánh xèo', 'trà chanh', 'cháo', 'nộm',
  'bánh gối', 'bánh bao', 'sữa', 'milk', 'trâu', 'buffalo', 'bơi', 'pool', 'swim', 'phim', 'cinema', 'movie',
  'bóng đá', 'football', 'pickleball', 'cắm trại', 'camp', 'thác', 'waterfall', 'hồ', 'lake', 'đỉnh', 'peak',
]

/** Whole words only: "ốc" (snails) must not match inside "Quốc". */
const wordRe = (w: string) => {
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{M}])${escaped}(?![\\p{L}\\p{M}])`, 'giu')
}
const DISH_RE = [...DISHES].sort((a, b) => b.length - a.length).map((d) => [d, wordRe(d)] as const)

/** How many dishes/activities named in the request this place offers (+3 if the place itself is named). */
/** Dishes/activities named in the request that this place offers ("*" = the place itself is named). */
function dishMatches(place: Place, text: string): string[] {
  const t = text.toLowerCase().normalize('NFC')
  const name = place.name.vi.toLowerCase()
  if (name.length >= 6 && t.includes(name)) return ['*', '*', '*']
  const hay = `${place.name.vi} ${place.name.en} ${place.blurb.vi} ${place.blurb.en}`.toLowerCase()
  // Longest first, so "cà phê trứng" isn't also counted as plain "cà phê".
  const out: string[] = []
  let rest = t
  for (const [dish, re] of DISH_RE) {
    re.lastIndex = 0
    if (!re.test(rest)) continue
    rest = rest.replace(re, ' ')
    re.lastIndex = 0
    if (re.test(hay)) out.push(dish)
  }
  return out
}
const dishHits = (place: Place, text: string) => dishMatches(place, text).length

/** What's going on today: weather at departure and the departure time. */
export interface PlanContext {
  weather?: Weather | null
  at?: Date
}

const BREAKFAST = /phở|bánh cuốn|xôi|bánh mì|bún riêu|miến|cháo|pho|breakfast/i

function contextBonus(place: Place, intent: Intent, ctx: PlanContext, named: boolean): number {
  const at = ctx.at ?? new Date()
  const { hour } = hanoiClock(at)
  const w = ctx.weather
  const indoor = place.tags.includes('indoor')
  let bonus = 0
  if (w?.rainy && !intent.themes.includes('rainy')) {
    // Rain: museums, cafés, shows first; open-air spots last (unless asked for by name).
    if (indoor) bonus += 700
    else if (!named && (place.kind !== 'food' || place.tags.includes('photo'))) bonus -= 500
  }
  if (w?.hot && hour >= 11 && hour < 15 && indoor) bonus += 400
  if (place.kind === 'food' && hour < 10 && BREAKFAST.test(`${place.name.vi} ${place.blurb.vi}`)) bonus += 300
  if (isOpenAt(place.openingHours, at) === false) bonus -= 5000
  return bonus
}

function score(place: Place, intent: Intent, start: LatLng, favIds: string[], ctx: PlanContext = {}): number {
  const themeHits = place.themes.filter((t) => intent.themes.includes(t)).length
  const pricey = intent.budget === 'low' && place.priceMax > 60 ? 1 : 0
  const fav = favIds.indexOf(place.id)
  const roleBoost = fav === -1 ? 0 : 1500 - fav * 100
  // Ba Vì spots are ~20× further apart than in the Old Quarter: weigh distance accordingly.
  const perM = place.area === 'ba-vi' ? 0.05 : 1
  // Full places (with a story) first when they fit the request just as well.
  const depth = place.depth === 'full' ? 150 : 0
  const hits = dishHits(place, `${intent.text} ${intent.extra ?? ''}`)
  const named = hits * 1500
  // Cinemas and other indoor fun are for rainy days, unless asked for by name.
  const indoorFun = place.kind === 'fun' && place.tags.includes('indoor') && !intent.themes.includes('rainy') ? 1200 : 0
  return themeHits * 1000 + named + roleBoost + depth - indoorFun - pricey * 800 - distanceM(start, place) * perM +
    contextBonus(place, intent, ctx, hits > 0)
}

/**
 * All places, best matches for the request first.
 * `favIds` (the role's favourite places, in Explore mode) are pushed up.
 */
export function rankPlaces(places: Place[], intent: Intent, start: LatLng, favIds: string[] = [], ctx: PlanContext = {}): Place[] {
  const scored = places.map((p) => [p, score(p, intent, start, favIds, ctx)] as const)
  return scored.sort((a, b) => b[1] - a[1]).map(([p]) => p)
}

/** False if any stop would be closed when the traveller gets there (unknown hours count as open). */
function allOpen(sum: QuestSummary, departAt: number): boolean {
  let t = departAt
  for (let i = 0; i < sum.stops.length; i++) {
    t += sum.legs[i].minutes * 60_000
    if (isOpenAt(sum.stops[i].openingHours, new Date(t)) === false) return false
    t += sum.stops[i].visitMin * 60_000
  }
  return true
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
  // Don't let a culture walk turn into a café crawl: at most 2 food / 2 fun stops,
  // unless that is all the traveller asked for.
  const only = (t: string) => intent.themes.length === 1 && intent.themes[0] === t
  const cap = { sight: 5, food: only('food') ? 4 : 2, fun: only('fun') ? 3 : 2 }
  const picked: Place[] = []
  const covered = new Set<string>()
  const text = `${intent.text} ${intent.extra ?? ''}`
  for (const p of ranked) {
    const dishes = dishMatches(p, text)
    if (!dishes.length && !p.themes.some((t) => intent.themes.includes(t)) && !favIds.includes(p.id)) continue
    // One place per dish: a second egg-coffee café makes way for the vegetarian lunch.
    if (dishes.length && dishes.every((d) => d !== '*' && covered.has(d))) continue
    if (picked.filter((x) => x.kind === p.kind).length >= cap[p.kind]) continue
    const trial = summarize(start, [...picked, p], intent.people, travel)
    if (trial.totalMin <= budgetMin && allOpen(trial, travel.departAt ?? Date.now())) {
      picked.push(p)
      dishes.forEach((d) => covered.add(d))
    }
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

/** What to read out at a stop: its story, or for quick places the intro + "why". */
export function storyOf(place: Place, lang: 'en' | 'vi'): string {
  return place.story[lang] || [place.blurb[lang], place.why[lang]].filter(Boolean).join(' ')
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

export interface TransportHint {
  to: Transport
  reason: 'longWalk' | 'farApart' | 'allClose'
  /** Longest leg, metres (for the message). */
  longestM: number
  /** Walking on the current route: metres and minutes. */
  walkedM: number
  walkMin: number
  savedMin: number
  extraCostK: number
}

/** "Too far to walk": one walk over 1.5 km (~20 min), 4 km in total, or an hour on foot. */
export const WALK_LIMIT = { legM: 1500, totalM: 4000, totalMin: 60 }

/** Walking on a route: total and longest walked leg (legs a vehicle can't do count too). */
export function walkingOf(sum: QuestSummary): { walkedM: number; walkMin: number; longestWalkM: number } {
  const walks = sum.legs.filter((l) => l.transport === 'walk')
  return {
    walkedM: walks.reduce((n, l) => n + l.distanceM, 0),
    walkMin: walks.reduce((n, l) => n + l.minutes, 0),
    longestWalkM: Math.max(0, ...walks.map((l) => l.distanceM)),
  }
}

/**
 * Suggest another way to get around when the chosen one fits the route badly:
 * too much walking (see WALK_LIMIT) → GrabBike (1–2 people) or a car (3+), when that saves at
 * least 8 minutes; a bike or car for stops a few hundred metres apart → walk (no parking, no fare).
 * Returns null when the choice is fine.
 */
export function suggestTransport(
  start: LatLng,
  stops: Place[],
  people: number,
  travel: Travel,
  order?: string[] | null,
): TransportHint | null {
  if (!stops.length) return null
  const cur = summarize(start, stops, people, travel, order)
  const longestM = Math.max(...cur.legs.map((l) => l.distanceM))
  const { walkedM, walkMin, longestWalkM } = walkingOf(cur)
  const alt = (to: Transport) => summarize(start, stops, people, { ...travel, transport: to }, order)

  const tooFar = longestWalkM > WALK_LIMIT.legM || walkedM > WALK_LIMIT.totalM || walkMin > WALK_LIMIT.totalMin
  if (travel.transport === 'walk' && tooFar) {
    const to: Transport = people >= 3 ? 'car' : 'grabbike'
    const s = alt(to)
    const savedMin = cur.travelMin - s.travelMin
    if (savedMin < 8) return null
    return {
      to,
      reason: longestM > 5000 ? 'farApart' : 'longWalk',
      longestM,
      walkedM,
      walkMin,
      savedMin,
      extraCostK: s.travelCostK - cur.travelCostK,
    }
  }
  if (travel.transport !== 'walk' && longestM < 900 && cur.distanceM < 2500) {
    const s = alt('walk')
    return {
      to: 'walk',
      reason: 'allClose',
      longestM,
      walkedM,
      walkMin,
      savedMin: cur.travelMin - s.travelMin,
      extraCostK: s.travelCostK - cur.travelCostK,
    }
  }
  return null
}
