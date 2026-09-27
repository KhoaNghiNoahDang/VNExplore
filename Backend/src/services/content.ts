import { createHash } from 'node:crypto'
import { db } from '../lib/supabase.js'
import { CircuitBreaker, singleFlight, withTimeout } from '../lib/resilience.js'

/**
 * App content (approved places, roles + missions, transport fares) read from Supabase.
 * Kept in memory for FRESH_MS; if Supabase is down we keep serving the last good copy.
 */
export interface Content {
  version: string
  loadedAt: string
  places: Record<string, unknown>[]
  roles: Record<string, unknown>[]
  fares: Record<string, unknown>[]
}

const FRESH_MS = 5 * 60_000
const breaker = new CircuitBreaker('supabase-content', 3, 20_000)
const once = singleFlight<Content>()

let current: Content | null = null
let fetchedAt = 0

type Row = Record<string, unknown>
const L = (r: Row, base: string) => ({ vi: String(r[`${base}_vi`] ?? ''), en: String(r[`${base}_en`] ?? '') })

/** Same shape as the frontend's Place type. */
function toPlace(r: Row) {
  return {
    id: String(r.id),
    area: r.area ?? 'hoan-kiem',
    kind: r.kind ?? 'sight',
    depth: r.depth ?? 'full',
    openingHours: r.opening_hours ?? null,
    priceCheckedOn: r.price_checked_on ?? null,
    name: L(r, 'name'),
    nameVi: String(r.name_vi_short ?? r.name_vi),
    lat: Number(r.lat),
    lng: Number(r.lng),
    priceMin: Number(r.price_min_k),
    priceMax: Number(r.price_max_k),
    visitMin: Number(r.visit_min),
    themes: r.themes ?? [],
    tags: r.tags ?? [],
    blurb: L(r, 'blurb'),
    tone: r.tone ?? 'teal',
    story: L(r, 'story'),
    why: L(r, 'why'),
    photoTip: L(r, 'photo_tip'),
    etiquette: L(r, 'etiquette'),
    challenge: !r.challenge_vi ? null : {
      prompt: L(r, 'challenge'),
      options: [L(r, 'option1'), L(r, 'option2'), L(r, 'option3')],
      answer: Math.max(0, Number(r.answer ?? 1) - 1),
      hint: L(r, 'hint'),
    },
  }
}

/** Same shape as the frontend's Role type. */
function toRole(r: Row, missions: Row[]) {
  return {
    id: String(r.id),
    name: L(r, 'name'),
    intro: L(r, 'intro'),
    goal: L(r, 'goal'),
    itemNoun: L(r, 'item_noun'),
    favPlaces: r.fav_places ?? [],
    missions: Object.fromEntries(
      missions.filter((m) => m.role_id === r.id).map((m) => [m.place_id, { task: L(m, 'task'), item: L(m, 'item') }]),
    ),
    fallback: { task: L(r, 'fallback_task'), item: L(r, 'fallback_item') },
    ending: L(r, 'ending'),
    tone: r.tone ?? 'teal',
  }
}

async function load(): Promise<Content> {
  const q = async () => {
    const [places, roles, missions, fares] = await Promise.all([
      db.from('places').select('*').eq('status', 'approved').order('id'),
      db.from('roles').select('*').order('id'),
      db.from('missions').select('*').eq('status', 'approved'),
      db.from('transport_fares').select('*').order('transport'),
    ])
    for (const r of [places, roles, missions, fares]) if (r.error) throw new Error(r.error.message)
    return {
      places: (places.data ?? []).map(toPlace),
      roles: (roles.data ?? []).map((r) => toRole(r, missions.data ?? [])),
      fares: fares.data ?? [],
    }
  }
  const body = await breaker.run(() => withTimeout(q(), 6000, 'content query'))
  const version = createHash('sha1').update(JSON.stringify(body)).digest('hex').slice(0, 12)
  return { version, loadedAt: new Date().toISOString(), ...body }
}

/**
 * Fresh copy if we have one; otherwise reload (one request at a time).
 * On failure: last good copy (stale) if any, else the error propagates (→ 503, app uses its bundled data).
 */
export async function getContent(): Promise<{ content: Content; stale: boolean }> {
  if (current && Date.now() - fetchedAt < FRESH_MS) return { content: current, stale: false }
  try {
    const next = await once('content', load)
    current = next
    fetchedAt = Date.now()
    return { content: next, stale: false }
  } catch (err) {
    if (current) return { content: current, stale: true }
    throw err
  }
}

export const contentBreaker = breaker
