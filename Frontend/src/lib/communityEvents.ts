import type { EventCategory, LatLng, QuestEvent } from '../types'
import { hanoiDay } from './events'
import { supabase } from './supabase'

/**
 * Events travellers add (table community_events, 0021). On the list at once, marked "not confirmed
 * yet" until EVENT_CONFIRM_AT other people confirmed them — by being there during the event, or by
 * vouching that it is real. A link to the event's own page is required. App ids: "ce-<uuid>".
 */
export const EVENT_CONFIRM_AT = 5
export type EventFlagReason = 'not_real' | 'wrong_place' | 'wrong_time' | 'cancelled' | 'spam'

interface Row {
  id: string
  author_id: string | null
  name: string
  category: EventCategory
  kind: 'show' | 'open'
  venue: string
  address: string | null
  lat: number
  lng: number
  from_date: string
  to_date: string
  start_time: string
  end_time: string | null
  price_min_k: number | null
  price_max_k: number | null
  ticket: boolean
  url: string
  description: string | null
  confirm_count: number
}

const COLS =
  'id, author_id, name, category, kind, venue, address, lat, lng, from_date, to_date, start_time, end_time, price_min_k, price_max_k, ticket, url, description, confirm_count'

export const isCommunityEventId = (eventId: string) => eventId.startsWith('ce-')
const hhmm = (t: string) => t.slice(0, 5)
const linkHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
}

function toEvent(r: Row): QuestEvent {
  const text = r.description?.trim() || ''
  return {
    id: `ce-${r.id}`,
    area: 'hanoi',
    kind: r.kind,
    category: r.category,
    adult: false,
    name: { vi: r.name, en: r.name },
    blurb: { vi: text, en: text },
    placeId: null,
    venue: r.venue,
    address: r.address ?? '',
    lat: r.lat,
    lng: r.lng,
    fromDate: r.from_date,
    toDate: r.to_date,
    weekdays: [],
    times: [hhmm(r.start_time)],
    endTime: r.end_time ? hhmm(r.end_time) : null,
    visitMin: r.kind === 'show' ? 120 : 60,
    priceMin: r.price_min_k,
    priceMax: r.price_max_k,
    ticket: r.ticket,
    url: r.url,
    host: linkHost(r.url),
    source: 'community',
    timeConfirmed: true,
    community: { confirms: r.confirm_count, confirmed: r.confirm_count >= EVENT_CONFIRM_AT, authorId: r.author_id },
  }
}

/** Live community events that haven't ended yet. [] when offline / no Supabase. */
export async function loadCommunityEvents(): Promise<QuestEvent[]> {
  if (!supabase) return []
  const yesterday = hanoiDay(Date.now() - 86_400_000)
  const { data, error } = await supabase.from('community_events').select(COLS).eq('status', 'live').gte('to_date', yesterday).limit(2000)
  if (error) throw error
  return ((data ?? []) as Row[]).map(toEvent)
}

export interface NewCommunityEvent {
  clientId: string
  name: string
  category: EventCategory
  kind: 'show' | 'open'
  venue: string
  address: string | null
  at: LatLng
  fromDate: string
  toDate: string
  startTime: string
  endTime: string | null
  priceMinK: number | null
  priceMaxK: number | null
  ticket: boolean
  url: string
  description: string | null
}

export async function addCommunityEvent(e: NewCommunityEvent): Promise<QuestEvent> {
  if (!supabase) throw new Error('unavailable')
  const { data, error } = await supabase.rpc('add_community_event', {
    p_client_id: e.clientId,
    p_name: e.name,
    p_category: e.category,
    p_kind: e.kind,
    p_venue: e.venue,
    p_address: e.address,
    p_lat: e.at.lat,
    p_lng: e.at.lng,
    p_from: e.fromDate,
    p_to: e.toDate,
    p_start: e.startTime,
    p_end: e.endTime,
    p_price_min_k: e.priceMinK,
    p_price_max_k: e.priceMaxK,
    p_ticket: e.ticket,
    p_url: e.url,
    p_description: e.description,
  })
  if (error) {
    const m = error.message
    throw new Error(m.includes('too_many_events') ? 'too_many' : m.includes('in_the_past') ? 'past' : 'failed')
  }
  return toEvent(data as Row)
}

/**
 * "It's real" / "I'm here": counts once per person (with a position near the event on one of its
 * days it counts as having been there). Returns the new number of confirmations, or null.
 */
export async function confirmCommunityEvent(eventId: string, here: LatLng | null, accuracyM: number | null): Promise<number | null> {
  if (!supabase || !isCommunityEventId(eventId)) return null
  const { data, error } = await supabase.rpc('confirm_community_event', {
    p_id: eventId.slice(3),
    p_lat: here?.lat ?? null,
    p_lng: here?.lng ?? null,
    p_accuracy: accuracyM,
  })
  return error ? null : (data as number)
}

export async function flagCommunityEvent(eventId: string, reason: EventFlagReason, note: string): Promise<string> {
  if (!supabase || !isCommunityEventId(eventId)) throw new Error('unavailable')
  const { data, error } = await supabase.rpc('flag_community_event', { p_id: eventId.slice(3), p_reason: reason, p_note: note || null })
  if (error) throw error
  return data as string
}

/** Events this device already confirmed (so the button says "Confirmed"). */
const CONFIRMED_KEY = 'vx:confirmed-events'
export function confirmedHere(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CONFIRMED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}
export function rememberConfirmed(eventId: string) {
  try {
    const s = confirmedHere()
    s.add(eventId)
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify([...s].slice(-500)))
  } catch {
    /* storage unavailable */
  }
}
