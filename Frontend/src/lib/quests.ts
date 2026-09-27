import type { Mode, Theme, Transport } from '../types'
import type { QuestSummary } from './quest'
import { supabase } from './supabase'

export type Visibility = 'private' | 'unlisted' | 'public'
export type ReviewStatus = 'none' | 'pending' | 'approved' | 'rejected'
export type TipKind = 'try' | 'photo' | 'see' | 'tip'
export type Audience = 'family' | 'couple' | 'friends' | 'solo'
export type BestTime = 'any' | 'morning' | 'afternoon' | 'evening'

export interface QuestStop {
  position: number
  place_id: string
  tip_kind: TipKind | null
  note: string | null
  custom_task: string | null
}

export interface SavedQuest {
  id: string
  author_id: string
  title: string
  description: string | null
  mode: Mode
  modes: Mode[]
  role_id: string | null
  transport: Transport
  visibility: Visibility
  review_status: ReviewStatus
  review_note: string | null
  people: number
  stop_count: number
  total_min: number | null
  distance_m: number | null
  cost_min_k: number | null
  cost_max_k: number | null
  travel_cost_k: number | null
  themes: Theme[]
  suitable_for: Audience[]
  best_time: BestTime
  cover_place_id: string | null
  like_count: number
  created_at: string
  author?: { display_name: string | null; username: string | null; avatar_url: string | null } | null
  stops?: QuestStop[]
}

const COLS =
  'id, author_id, title, description, mode, modes, role_id, transport, visibility, review_status, review_note, people, stop_count, total_min, distance_m, cost_min_k, cost_max_k, travel_cost_k, themes, suitable_for, best_time, cover_place_id, like_count, created_at'
const WITH_AUTHOR_STOPS = `${COLS}, author:profiles!quests_author_id_fkey(display_name, username, avatar_url), stops:quest_stops(position, place_id, tip_kind, note, custom_task)`

export const questUrl = (id: string) => `${location.origin}/q/${id}`

const sortStops = (q: SavedQuest) => {
  q.stops = [...(q.stops ?? [])].sort((a, b) => a.position - b.position)
  return q
}

// ------------------------------------------------------------ write
export interface QuestDraft {
  title: string
  description: string
  visibility: Visibility
  modes: Mode[]
  roleId: string | null
  transport: Transport
  people: number
  themes: Theme[]
  suitableFor: Audience[]
  bestTime: BestTime
  stops: { placeId: string; tipKind: TipKind | null; tip: string }[]
  summary: QuestSummary
}

/** Create (no id) or update (id) a quest and replace its stops. Returns the quest id. */
export async function upsertQuest(authorId: string, d: QuestDraft, id?: string): Promise<string> {
  if (!supabase) throw new Error('unavailable')
  const s = d.summary
  const row = {
    author_id: authorId,
    title: d.title.trim(),
    description: d.description.trim() || null,
    mode: d.modes[0],
    modes: d.modes,
    role_id: d.modes.includes('explore') ? d.roleId : null,
    transport: d.transport,
    visibility: d.visibility,
    status: 'published',
    people: d.people,
    themes: d.themes,
    suitable_for: d.suitableFor,
    best_time: d.bestTime,
    cover_place_id: d.stops[0]?.placeId ?? null,
    stop_count: d.stops.length,
    total_min: s.totalMin,
    distance_m: Math.round(s.distanceM),
    cost_min_k: s.costMin,
    cost_max_k: s.costMax,
    travel_cost_k: s.travelCostK,
  }
  let questId = id
  if (questId) {
    const { error } = await supabase.from('quests').update(row).eq('id', questId)
    if (error) throw error
    const { error: del } = await supabase.from('quest_stops').delete().eq('quest_id', questId)
    if (del) throw del
  } else {
    const { data, error } = await supabase.from('quests').insert(row).select('id').single()
    if (error) throw error
    questId = data.id as string
  }
  const { error: e2 } = await supabase.from('quest_stops').insert(
    d.stops.map((st, i) => ({
      quest_id: questId,
      position: i + 1,
      place_id: st.placeId,
      tip_kind: st.tip.trim() ? st.tipKind : null,
      note: st.tip.trim() || null,
    })),
  )
  if (e2) {
    if (!id) await supabase.from('quests').delete().eq('id', questId) // don't leave an empty quest
    throw e2
  }
  return questId!
}

export async function deleteQuest(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('quests').delete().eq('id', id)
  if (error) throw error
}

// ------------------------------------------------------------ read
/** Approved public quests for the Quest tab. */
export async function listPublicQuests(): Promise<SavedQuest[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('quests')
    .select(WITH_AUTHOR_STOPS)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return ((data ?? []) as unknown as SavedQuest[]).map(sortStops)
}

export async function listMyQuests(authorId: string): Promise<SavedQuest[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('quests')
    .select(COLS)
    .eq('author_id', authorId)
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SavedQuest[]
}

export async function listLikedQuests(userId: string): Promise<SavedQuest[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('quest_likes')
    .select(`created_at, quest:quests(${COLS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as { quest: SavedQuest | null }[]).map((r) => r.quest).filter((q): q is SavedQuest => !!q)
}

/** A quest by id with stops and author — null if we can't see it (private, not approved, missing). */
export async function getQuest(id: string): Promise<SavedQuest | null> {
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await supabase.from('quests').select(WITH_AUTHOR_STOPS).eq('id', id).maybeSingle()
  if (error || !data) return null
  return sortStops(data as unknown as SavedQuest)
}

// ------------------------------------------------------------ likes
export async function isLiked(questId: string, userId: string): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase.from('quest_likes').select('quest_id').eq('quest_id', questId).eq('user_id', userId).maybeSingle()
  return !!data
}

export async function setLiked(questId: string, userId: string, liked: boolean): Promise<void> {
  if (!supabase) return
  const { error } = liked
    ? await supabase.from('quest_likes').insert({ quest_id: questId, user_id: userId })
    : await supabase.from('quest_likes').delete().eq('quest_id', questId).eq('user_id', userId)
  if (error) throw error
}
