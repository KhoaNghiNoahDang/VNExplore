import { useCallback, useEffect, useState } from 'react'
import type { Area, Transport } from '../types'
import { supabase } from './supabase'

/**
 * Group play: friends walk the same route, each with their own role (tables in
 * Data/supabase/migrations/0010_parties.sql). Everyone stamps their own stops and does their own
 * missions; shared puzzles are solved once for the whole party. Realtime keeps screens in sync.
 */

export type TimerMode = 'off' | 'stopwatch' | 'countdown'

export interface Party {
  id: string
  code: string
  hostId: string
  title: string | null
  area: Area
  stopIds: string[]
  transport: Transport
  hours: number
  timerMode: TimerMode
  timeLimitMin: number | null
  maxMembers: number
  status: 'lobby' | 'playing' | 'finished'
  startedAt: number | null
}

export interface PartyMember {
  userId: string
  name: string
  roleId: string | null
  joinedAt: number
  finishedAt: number | null
}

export interface PartyProgress {
  userId: string
  placeId: string
  arrivedAt: number | null
  missionDone: boolean
}

export interface PartyState {
  party: Party
  /** In joining order (the order that hands out shared-puzzle clues). */
  members: PartyMember[]
  progress: PartyProgress[]
  /** placeId → who solved the shared puzzle there. */
  puzzles: Record<string, string>
}

export type PartyError = 'unavailable' | 'guest_disabled' | 'not_found' | 'full' | 'finished' | 'role_taken' | 'too_many' | 'captcha' | 'unknown'

type Row = Record<string, unknown>
const ms = (v: unknown) => (v ? Date.parse(String(v)) : null)

const toParty = (r: Row): Party => ({
  id: String(r.id),
  code: String(r.code),
  hostId: String(r.host_id),
  title: (r.title as string | null) ?? null,
  area: r.area as Area,
  stopIds: (r.stop_ids as string[]) ?? [],
  transport: r.transport as Transport,
  hours: Number(r.hours),
  timerMode: r.timer_mode as TimerMode,
  timeLimitMin: (r.time_limit_min as number | null) ?? null,
  maxMembers: Number(r.max_members),
  status: r.status as Party['status'],
  startedAt: ms(r.started_at),
})

function errorOf(message: string | undefined, code?: string): PartyError {
  const m = (message ?? '').toLowerCase()
  if (code === '23505' || m.includes('party_members_role_uidx')) return 'role_taken'
  if (m.includes('party_not_found')) return 'not_found'
  if (m.includes('party_full')) return 'full'
  if (m.includes('party_finished')) return 'finished'
  if (m.includes('too_many_parties')) return 'too_many'
  return 'unknown'
}

/** 6 characters, no look-alikes (0/O, 1/I/L). */
function newCode(): string {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return [...bytes].map((b) => abc[b % abc.length]).join('')
}

export interface NewParty {
  title: string
  area: Area
  stopIds: string[]
  transport: Transport
  hours: number
  timerMode: TimerMode
  timeLimitMin: number | null
  hostName: string
}

/** Create a party and join it as host. Returns its code. */
export async function createParty(p: NewParty): Promise<{ id: string; code: string } | PartyError> {
  if (!supabase) return 'unavailable'
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return 'unavailable'
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = newCode()
    const { data, error } = await supabase
      .from('parties')
      .insert({
        code,
        title: p.title.slice(0, 120),
        area: p.area,
        stop_ids: p.stopIds.slice(0, 12),
        transport: p.transport,
        hours: p.hours,
        timer_mode: p.timerMode,
        time_limit_min: p.timeLimitMin,
      })
      .select('id, code')
      .single()
    if (error?.code === '23505') continue // code already used: try another
    if (error || !data) return errorOf(error?.message, error?.code)
    const { error: e2 } = await supabase
      .from('party_members')
      .insert({ party_id: data.id, user_id: auth.user.id, display_name: p.hostName.slice(0, 30) || 'Host' })
    if (e2) return errorOf(e2.message, e2.code)
    return { id: String(data.id), code: String(data.code) }
  }
  return 'unknown'
}

export async function joinParty(code: string, name: string): Promise<string | PartyError> {
  if (!supabase) return 'unavailable'
  const { data, error } = await supabase.rpc('join_party', { p_code: code, p_name: name })
  if (error) return errorOf(error.message, error.code)
  return String(data)
}

export async function loadParty(id: string): Promise<PartyState | null> {
  if (!supabase) return null
  const [p, m, g, z] = await Promise.all([
    supabase.from('parties').select('*').eq('id', id).maybeSingle(),
    supabase.from('party_members').select('*').eq('party_id', id).order('joined_at'),
    supabase.from('party_progress').select('*').eq('party_id', id),
    supabase.from('party_puzzles').select('place_id, solved_by').eq('party_id', id),
  ])
  if (!p.data) return null
  return {
    party: toParty(p.data as Row),
    members: ((m.data ?? []) as Row[]).map((r) => ({
      userId: String(r.user_id),
      name: String(r.display_name),
      roleId: (r.role_id as string | null) ?? null,
      joinedAt: ms(r.joined_at) ?? 0,
      finishedAt: ms(r.finished_at),
    })),
    progress: ((g.data ?? []) as Row[]).map((r) => ({
      userId: String(r.user_id),
      placeId: String(r.place_id),
      arrivedAt: ms(r.arrived_at),
      missionDone: !!r.mission_done,
    })),
    puzzles: Object.fromEntries(((z.data ?? []) as Row[]).map((r) => [String(r.place_id), String(r.solved_by)])),
  }
}

async function myId(): Promise<string | null> {
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } }
  return data.user?.id ?? null
}

export async function setMyRole(partyId: string, roleId: string | null): Promise<PartyError | null> {
  const uid = await myId()
  if (!supabase || !uid) return 'unavailable'
  const { error } = await supabase.from('party_members').update({ role_id: roleId }).eq('party_id', partyId).eq('user_id', uid)
  return error ? errorOf(error.message, error.code) : null
}

export async function setTimer(partyId: string, timerMode: TimerMode, timeLimitMin: number | null): Promise<void> {
  await supabase?.from('parties').update({ timer_mode: timerMode, time_limit_min: timeLimitMin }).eq('id', partyId)
}

export async function startParty(partyId: string): Promise<void> {
  await supabase?.from('parties').update({ status: 'playing', started_at: new Date().toISOString() }).eq('id', partyId)
}

export async function finishParty(partyId: string): Promise<void> {
  await supabase?.from('parties').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', partyId)
}

async function writeProgress(partyId: string, placeId: string, fields: Row): Promise<void> {
  const uid = await myId()
  if (!supabase || !uid) return
  await supabase
    .from('party_progress')
    .upsert({ party_id: partyId, user_id: uid, place_id: placeId, updated_at: new Date().toISOString(), ...fields }, {
      onConflict: 'party_id,user_id,place_id',
    })
}

export const markArrived = (partyId: string, placeId: string) =>
  writeProgress(partyId, placeId, { arrived_at: new Date().toISOString() })
export const markMission = (partyId: string, placeId: string) => writeProgress(partyId, placeId, { mission_done: true })

export async function solvePuzzle(partyId: string, placeId: string): Promise<void> {
  // Already solved by someone else → the unique key just says no; that's fine.
  await supabase?.from('party_puzzles').insert({ party_id: partyId, place_id: placeId })
}

export async function finishMine(partyId: string): Promise<void> {
  const uid = await myId()
  if (!supabase || !uid) return
  await supabase
    .from('party_members')
    .update({ finished_at: new Date().toISOString() })
    .eq('party_id', partyId)
    .eq('user_id', uid)
    .is('finished_at', null)
}

export async function leaveParty(partyId: string): Promise<void> {
  const uid = await myId()
  if (!supabase || !uid) return
  await supabase.from('party_members').delete().eq('party_id', partyId).eq('user_id', uid)
}

/** Party state, kept fresh by Realtime (any change in the party's rows reloads it). */
export function useParty(partyId: string | null) {
  const [state, setState] = useState<PartyState | null>(null)
  const [missing, setMissing] = useState(false)

  const refresh = useCallback(async () => {
    if (!partyId) return
    const s = await loadParty(partyId)
    setMissing(!s)
    if (s) setState(s)
  }, [partyId])

  useEffect(() => {
    if (!partyId || !supabase) return
    void refresh()
    let timer: ReturnType<typeof setTimeout> | null = null
    // Several rows often change together (e.g. start + first stamps): reload once.
    const soon = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void refresh(), 150)
    }
    const channel = supabase.channel(`party:${partyId}`)
    for (const table of ['party_members', 'party_progress', 'party_puzzles'])
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `party_id=eq.${partyId}` }, soon)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'parties', filter: `id=eq.${partyId}` }, soon)
    channel.subscribe()
    // Realtime can miss events while a phone sleeps: refresh when the app comes back.
    const onVisible = () => document.visibilityState === 'visible' && soon()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase?.removeChannel(channel)
    }
  }, [partyId, refresh])

  return { state, missing, refresh }
}

/** Countdown default: the hours asked for in the request, at least the route's own estimate. */
export function defaultLimitMin(hours: number, routeMin: number): number {
  return Math.min(1440, Math.max(30, Math.ceil(Math.max(hours * 60, routeMin) / 15) * 15))
}
