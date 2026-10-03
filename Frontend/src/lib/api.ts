import { EVENTS } from '../data/events'
import { PLACES } from '../data/places'
import type { Place, PlaceTag, QuestEvent, Theme } from '../types'
import { supabase } from './supabase'

/** A row of public.places (flat, one column per language). */
type PlaceRow = Record<string, string | number | string[] | null>

const L = (r: PlaceRow, base: string) => ({ vi: String(r[`${base}_vi`] ?? ''), en: String(r[`${base}_en`] ?? '') })

function toPlace(r: PlaceRow): Place {
  return {
    id: String(r.id),
    area: (r.area as Place['area']) ?? 'hoan-kiem',
    kind: (r.kind as Place['kind']) ?? 'sight',
    depth: (r.depth as Place['depth']) ?? 'full',
    openingHours: (r.opening_hours as string | null) ?? null,
    priceCheckedOn: (r.price_checked_on as string | null) ?? null,
    name: L(r, 'name'),
    nameVi: String(r.name_vi_short ?? r.name_vi),
    lat: Number(r.lat),
    lng: Number(r.lng),
    priceMin: Number(r.price_min_k),
    priceMax: Number(r.price_max_k),
    visitMin: Number(r.visit_min),
    themes: (r.themes as Theme[]) ?? [],
    tags: (r.tags as PlaceTag[]) ?? [],
    blurb: L(r, 'blurb'),
    tone: (r.tone as Place['tone']) ?? 'teal',
    story: L(r, 'story'),
    why: L(r, 'why'),
    photoTip: L(r, 'photo_tip'),
    etiquette: L(r, 'etiquette'),
    sources: Array.isArray(r.sources) ? (r.sources as string[]) : [],
    notice: r.notice_vi ? L(r, 'notice') : null,
    phone: (r.phone as string | null) ?? null,
    challenge: !r.challenge_vi ? null : {
      prompt: L(r, 'challenge'),
      options: [L(r, 'option1'), L(r, 'option2'), L(r, 'option3')],
      answer: Math.max(0, Number(r.answer ?? 1) - 1),
      hint: L(r, 'hint'),
    },
  }
}

/**
 * Approved places from Supabase; the bundled copy (exported from the same sheets)
 * is used when Supabase isn't configured or can't be reached.
 */
export async function fetchPlaces(): Promise<Place[]> {
  if (!supabase) return PLACES
  try {
    const { data, error } = await supabase.from('places').select('*').eq('status', 'approved')
    if (error) throw error
    if (!data?.length) return PLACES

    // Deployments can temporarily have an older Supabase seed than the bundled
    // catalogue. Preserve the bundled editorial copy while still accepting
    // remote operational fields such as coordinates, prices and opening hours.
    const merged = new Map(PLACES.map((place) => [place.id, place]))
    for (const row of data as PlaceRow[]) {
      const remote = toPlace(row)
      const bundled = merged.get(remote.id)
      merged.set(
        remote.id,
        bundled
          ? {
              ...bundled,
              ...remote,
              name: bundled.name,
              nameVi: bundled.nameVi,
              blurb: bundled.blurb,
              story: bundled.story,
              why: bundled.why,
              photoTip: bundled.photoTip,
              etiquette: bundled.etiquette,
              challenge: bundled.challenge ?? remote.challenge,
              // An older Supabase seed may not have these yet: keep the bundled ones.
              sources: remote.sources?.length ? remote.sources : bundled.sources,
              notice: remote.notice ?? bundled.notice,
              phone: remote.phone ?? bundled.phone,
            }
          : remote,
      )
    }
    return [...merged.values()]
  } catch (err) {
    console.warn('Supabase unavailable, using bundled places:', err)
    return PLACES
  }
}

const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function toEvent(r: PlaceRow): QuestEvent {
  const price = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  return {
    id: String(r.id),
    area: r.area as QuestEvent['area'],
    kind: r.kind as QuestEvent['kind'],
    category: (r.category as QuestEvent['category']) ?? 'other',
    adult: r.sensitivity === 'adult',
    name: { vi: String(r.name_vi), en: String(r.name_en || r.name_vi) },
    blurb: L(r, 'blurb'),
    placeId: (r.place_id as string | null) ?? null,
    venue: String(r.venue ?? ''),
    address: String(r.address ?? ''),
    lat: Number(r.lat),
    lng: Number(r.lng),
    fromDate: String(r.from_date),
    toDate: String(r.to_date),
    weekdays: list(r.weekdays).map((d) => WEEKDAYS.indexOf(d)).filter((d) => d >= 0),
    times: list(r.start_times),
    endTime: (r.end_time as string | null) ?? null,
    visitMin: Number(r.visit_min),
    priceMin: price(r.price_min_k),
    priceMax: price(r.price_max_k),
    ticket: (r.needs_ticket as unknown) === true,
    url: (r.event_url as string | null) ?? null,
    host: String(r.host_name ?? ''),
    source: String(r.source ?? ''),
    timeConfirmed: r.time_confirmed === undefined || r.time_confirmed === null || (r.time_confirmed as unknown) === true,
  }
}

/**
 * Approved events that haven't ended. Supabase rows win over the bundled copy by id;
 * the bundled copy is used alone while the events table doesn't exist yet (0009_events.sql).
 */
export async function fetchEvents(): Promise<QuestEvent[]> {
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
  if (!supabase) return EVENTS
  try {
    const { data, error } = await supabase.from('events').select('*').eq('status', 'approved').gte('to_date', since)
    if (error) throw error
    const merged = new Map(EVENTS.map((e) => [e.id, e]))
    for (const row of (data ?? []) as PlaceRow[]) merged.set(String(row.id), toEvent(row))
    return [...merged.values()]
  } catch (err) {
    console.info('Events table unavailable, using bundled events:', (err as { message?: string }).message ?? err)
    return EVENTS
  }
}
