import type { LatLng, Mode, Transport } from '../types'
import { supabase } from './supabase'

/**
 * Passport: every finished journey, with its stamps and items.
 * Signed in → saved to the account (table `journeys`, owner-only).
 * Guest → kept on this device, and moved to the account on the next sign-in.
 * A journey that failed to upload (offline) waits on the device and is retried.
 */
export interface PassportJourney {
  /** The journey's start time — unique per device, so saving twice is harmless. */
  clientId: string
  startedAt: number
  finishedAt: number
  mode: Mode
  roleId: string | null
  questId: string | null
  questTitle: string | null
  stopIds: string[]
  /** placeId → mode when the stamp was earned */
  arrived: Record<string, Mode>
  /** placeIds whose Explore mission was done (gold seal) */
  items: string[]
  people: number
  transport: Transport
  totalMin: number
  distanceM: number
  costMinK: number
  costMaxK: number
  start: LatLng | null
}

interface LocalEntry extends PassportJourney {
  /** null = guest; a user id = saved while signed in but not uploaded yet */
  owner: string | null
}

const KEY = 'vnexplore:passport'

function readLocal(): LocalEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LocalEntry[]) : []
  } catch {
    return []
  }
}
function writeLocal(list: LocalEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable */
  }
}

const toRow = (j: PassportJourney) => ({
  client_id: j.clientId,
  started_at: new Date(j.startedAt).toISOString(),
  finished_at: new Date(j.finishedAt).toISOString(),
  mode: j.mode,
  role_id: j.roleId,
  quest_id: j.questId,
  quest_title: j.questTitle?.slice(0, 120) ?? null,
  stop_ids: j.stopIds.slice(0, 20),
  arrived: j.arrived,
  items: j.items.slice(0, 20),
  people: j.people,
  transport: j.transport,
  total_min: Math.round(j.totalMin),
  distance_m: Math.round(j.distanceM),
  cost_min_k: Math.round(j.costMinK),
  cost_max_k: Math.round(j.costMaxK),
  start_lat: j.start?.lat ?? null,
  start_lng: j.start?.lng ?? null,
})

interface Row extends ReturnType<typeof toRow> {
  id: string
}

const fromRow = (r: Row): PassportJourney => ({
  clientId: r.client_id,
  startedAt: Date.parse(r.started_at),
  finishedAt: Date.parse(r.finished_at),
  mode: r.mode,
  roleId: r.role_id,
  questId: r.quest_id,
  questTitle: r.quest_title,
  stopIds: r.stop_ids,
  arrived: r.arrived,
  items: r.items,
  people: r.people,
  transport: r.transport,
  totalMin: r.total_min ?? 0,
  distanceM: r.distance_m ?? 0,
  costMinK: r.cost_min_k ?? 0,
  costMaxK: r.cost_max_k ?? 0,
  start: r.start_lat != null && r.start_lng != null ? { lat: r.start_lat, lng: r.start_lng } : null,
})

/** Upload; "already there" counts as success. */
async function upload(list: PassportJourney[]): Promise<boolean> {
  if (!supabase || !list.length) return !!supabase
  const { error } = await supabase
    .from('journeys')
    .upsert(list.map(toRow), { onConflict: 'user_id,client_id', ignoreDuplicates: true })
  if (error) console.error(error)
  return !error
}

/** Save a finished journey. Safe to call more than once for the same journey. */
export async function recordJourney(j: PassportJourney, userId: string | null): Promise<void> {
  if (userId && (await upload([j]))) return
  const list = readLocal().filter((x) => !(x.clientId === j.clientId && x.owner === userId))
  writeLocal([{ ...j, owner: userId }, ...list])
}

/** Move guest journeys (and failed uploads) on this device to the account. */
export async function syncPassport(userId: string): Promise<void> {
  const local = readLocal()
  const mine = local.filter((x) => x.owner === null || x.owner === userId)
  if (!mine.length) return
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  if (await upload(mine.map(({ owner, ...j }) => j))) writeLocal(local.filter((x) => !mine.includes(x)))
}

/** Newest first. Signed in: the account's journeys (+ any still waiting to upload). Guest: this device. */
export async function listPassport(userId: string | null): Promise<PassportJourney[]> {
  if (!userId || !supabase) return readLocal().filter((x) => x.owner === null)
  await syncPassport(userId)
  const { data, error } = await supabase
    .from('journeys')
    .select('*')
    .order('finished_at', { ascending: false })
    .limit(500)
  const remote = error ? [] : ((data ?? []) as Row[]).map(fromRow)
  const pending = readLocal().filter((x) => x.owner === userId && !remote.some((r) => r.clientId === x.clientId))
  return [...pending, ...remote].sort((a, b) => b.finishedAt - a.finishedAt)
}

export async function deleteJourney(clientId: string, userId: string | null): Promise<void> {
  writeLocal(readLocal().filter((x) => !(x.clientId === clientId && x.owner === userId)))
  if (userId && supabase) {
    const { error } = await supabase.from('journeys').delete().eq('client_id', clientId)
    if (error) throw error
  }
}

// ------------------------------------------------------------ derived views
export interface StampInfo {
  placeId: string
  /** first time the stamp was earned */
  firstAt: number
  times: number
  gold: boolean
}

/** One stamp per place: first visit date, how many times, and whether it ever got a gold seal. */
export function collectStamps(journeys: PassportJourney[]): Map<string, StampInfo> {
  const out = new Map<string, StampInfo>()
  for (const j of journeys) {
    for (const id of Object.keys(j.arrived)) {
      const s = out.get(id) ?? { placeId: id, firstAt: j.finishedAt, times: 0, gold: false }
      s.firstAt = Math.min(s.firstAt, j.finishedAt)
      s.times += 1
      s.gold ||= j.items.includes(id)
      out.set(id, s)
    }
  }
  return out
}

/** roleId → placeIds whose item was collected with that role. */
export function collectItems(journeys: PassportJourney[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const j of journeys) {
    if (!j.roleId || !j.items.length) continue
    const set = out.get(j.roleId) ?? new Set<string>()
    j.items.forEach((id) => set.add(id))
    out.set(j.roleId, set)
  }
  return out
}
