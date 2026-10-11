import type { Lang, LatLng, Place } from '../types'
import { supabase } from './supabase'

/**
 * Places travellers add for everyone (table community_places, 0018). They are on the map at once,
 * marked "not confirmed yet" until CONFIRM_AT different people have reached them — the same GPS check
 * as stamping a stop, repeated on the server. Stop ids are "cp:<uuid>".
 */
export const CONFIRM_AT = 10

export type CommunityKind = Place['kind']
export type FlagReason = 'not_real' | 'wrong_place' | 'closed' | 'spam'

interface Row {
  id: string
  author_id: string | null
  name: string
  kind: CommunityKind
  lat: number
  lng: number
  address: string | null
  description: string | null
  opening_hours: string | null
  price_min_k: number | null
  price_max_k: number | null
  contact: string | null
  visit_min: number
  visit_count: number
  status: string
}

const COLS = 'id, author_id, name, kind, lat, lng, address, description, opening_hours, price_min_k, price_max_k, contact, visit_min, visit_count, status'
const THEMES: Record<CommunityKind, Place['themes']> = { food: ['food'], sight: ['culture', 'photo'], fun: ['fun'] }
const TONE: Record<CommunityKind, Place['tone']> = { food: 'butter', sight: 'teal', fun: 'leaf' }
const KIND_LABEL: Record<CommunityKind, { vi: string; en: string }> = {
  food: { vi: 'Ăn uống', en: 'Food & drink' },
  sight: { vi: 'Tham quan', en: 'Sightseeing' },
  fun: { vi: 'Vui chơi', en: 'Fun & activities' },
}
const empty = { vi: '', en: '' }

export const isCommunityId = (id: string) => id.startsWith('cp:')

function toPlace(r: Row): Place {
  const lo = r.price_min_k ?? r.price_max_k
  const hi = r.price_max_k ?? r.price_min_k
  const extra = [r.description, r.address, r.opening_hours].filter(Boolean).join(' · ')
  const phone = (r.contact ?? '').replace(/[\s.\-()]/g, '')
  return {
    id: `cp:${r.id}`,
    area: 'hanoi',
    kind: r.kind,
    depth: 'quick',
    openingHours: null,
    priceCheckedOn: null,
    name: { vi: r.name, en: r.name },
    nameVi: r.name,
    lat: r.lat,
    lng: r.lng,
    priceMin: lo ?? 0,
    priceMax: hi ?? 0,
    priceUnknown: lo == null,
    visitMin: r.visit_min,
    themes: THEMES[r.kind],
    tags: [],
    blurb: { vi: extra || KIND_LABEL[r.kind].vi, en: extra || KIND_LABEL[r.kind].en },
    tone: TONE[r.kind],
    story: empty,
    why: empty,
    photoTip: empty,
    etiquette: empty,
    challenge: null,
    sources: r.contact && !/^\+?\d{8,13}$/.test(phone) ? [r.contact] : undefined,
    phone: /^\+?\d{8,13}$/.test(phone) ? phone : null,
    community: { visits: r.visit_count, confirmed: r.visit_count >= CONFIRM_AT, authorId: r.author_id },
  }
}

/** Every live community place (a few thousand at most: one query). [] when offline / no Supabase. */
export async function loadCommunityPlaces(): Promise<Place[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('community_places').select(COLS).eq('status', 'live').limit(5000)
  if (error) throw error
  return ((data ?? []) as Row[]).map(toPlace)
}

export interface NewCommunityPlace {
  clientId: string
  name: string
  kind: CommunityKind
  at: LatLng
  address: string | null
  description: string | null
  openingHours: string | null
  priceMinK: number | null
  priceMaxK: number | null
  contact: string | null
  visitMin: number
  language: Lang
  /** Where the phone is: the author counts as the first visitor when standing there. */
  here: LatLng | null
}

/** Put a place on the map for everyone (needs a session — a guest one is fine). */
export async function addCommunityPlace(p: NewCommunityPlace): Promise<Place> {
  if (!supabase) throw new Error('unavailable')
  const { data, error } = await supabase.rpc('add_community_place', {
    p_client_id: p.clientId,
    p_name: p.name,
    p_kind: p.kind,
    p_lat: p.at.lat,
    p_lng: p.at.lng,
    p_address: p.address,
    p_description: p.description,
    p_opening_hours: p.openingHours,
    p_price_min_k: p.priceMinK,
    p_price_max_k: p.priceMaxK,
    p_contact: p.contact,
    p_language: p.language,
    p_visit_min: p.visitMin,
    p_here_lat: p.here?.lat ?? null,
    p_here_lng: p.here?.lng ?? null,
  })
  if (error) throw new Error(error.message.includes('too_many_places') ? 'too_many' : 'failed')
  return toPlace(data as Row)
}

/** "I got there" at a community place. Returns the new number of people, or null if it didn't count. */
export async function recordVisit(placeId: string, here: LatLng, accuracyM: number | null): Promise<number | null> {
  if (!supabase || !isCommunityId(placeId)) return null
  const { data, error } = await supabase.rpc('record_place_visit', {
    p_place_id: placeId,
    p_lat: here.lat,
    p_lng: here.lng,
    p_accuracy: accuracyM,
  })
  return error ? null : (data as number)
}

/** "This isn't right". Returns the place's status afterwards ('hidden' once enough people said so). */
export async function flagCommunityPlace(placeId: string, reason: FlagReason, note: string): Promise<string> {
  if (!supabase || !isCommunityId(placeId)) throw new Error('unavailable')
  const { data, error } = await supabase.rpc('flag_community_place', { p_id: placeId.slice(3), p_reason: reason, p_note: note || null })
  if (error) throw error
  return data as string
}
