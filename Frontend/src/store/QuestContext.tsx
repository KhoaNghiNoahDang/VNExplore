import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { START } from '../data/places'
import { getRole } from '../data/roles'
import { fetchPlaces } from '../lib/api'
import type { Travel } from '../lib/quest'
import { distanceM } from '../lib/travel'
import { useGeolocation, type Geo } from '../lib/useGeolocation'
import { STRINGS } from '../i18n/strings'
import type { Intent, Journey, Lang, LatLng, Mode, Place, Role, Transport } from '../types'
import { QuestCtx as Ctx } from './ctx'

interface Saved {
  lang: Lang
  draft: string
  mode: Mode | null
  /** Kept when leaving Explore mode — the role is only paused. */
  roleId: string | null
  intent: Intent | null
  selected: string[]
  dismissed: string[]
  journey: Journey | null
  /** Transport picked by hand; overrides what was read from the request. */
  transport: Transport | null
  /** Planned departure (ms); null = now. */
  departAt: number | null
  /** The traveller turned on location. */
  geoWanted: boolean
}

export interface QuestState extends Saved {
  places: Place[]
  loading: boolean
  /** Where the plan starts: the traveller's location if known, else Hoan Kiem Lake. */
  start: LatLng
  travel: Travel
  geo: Geo
  role: Role | null
  t: (typeof STRINGS)[Lang]
  setLang: (l: Lang) => void
  setDraft: (s: string) => void
  setMode: (m: Mode) => void
  setRole: (id: string) => void
  setIntent: (i: Intent, selected: string[]) => void
  toggle: (id: string) => void
  dismiss: (id: string) => void
  startJourney: (stopIds: string[], start: LatLng) => void
  arrive: (placeId: string) => void
  completeMission: (placeId: string) => void
  reset: () => void
  /** null = follow what the request says. */
  setTransport: (t: Transport | null) => void
  setDepartAt: (ms: number | null) => void
  setGeoWanted: (on: boolean) => void
}

const KEY = 'vnexplore:v3'

const EMPTY: Saved = {
  lang: 'en',
  draft: '',
  mode: null,
  roleId: null,
  intent: null,
  selected: [],
  dismissed: [],
  journey: null,
  transport: null,
  departAt: null,
  geoWanted: false,
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Saved>) } : EMPTY
  } catch {
    return EMPTY
  }
}


export function QuestProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>(load)
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlaces().then((p) => {
      setPlaces(p)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved))
    } catch {
      /* storage unavailable — state still works in memory */
    }
    document.documentElement.lang = saved.lang
  }, [saved])

  const patch = useCallback((fn: (s: Saved) => Partial<Saved>) => setSaved((s) => ({ ...s, ...fn(s) })), [])

  const actions = useMemo(
    () => ({
      setLang: (lang: Lang) => patch(() => ({ lang })),
      setDraft: (draft: string) => patch(() => ({ draft })),
      setMode: (mode: Mode) => patch(() => ({ mode })),
      setRole: (roleId: string) => patch(() => ({ roleId, mode: 'explore' as Mode })),
      setIntent: (intent: Intent, selected: string[]) => patch(() => ({ intent, selected, dismissed: [] })),
      setTransport: (transport: Transport | null) => patch(() => ({ transport })),
      setDepartAt: (departAt: number | null) => patch(() => ({ departAt })),
      setGeoWanted: (geoWanted: boolean) => patch(() => ({ geoWanted })),
      toggle: (id: string) =>
        patch((s) => ({
          selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
        })),
      dismiss: (id: string) => patch((s) => ({ dismissed: [...s.dismissed, id] })),
      startJourney: (stopIds: string[], start: LatLng) =>
        patch(() => ({ journey: { stopIds, arrived: {}, items: [], startedAt: Date.now(), start } })),
      arrive: (placeId: string) =>
        patch((s) =>
          s.journey && s.mode && !s.journey.arrived[placeId]
            ? { journey: { ...s.journey, arrived: { ...s.journey.arrived, [placeId]: s.mode } } }
            : {},
        ),
      completeMission: (placeId: string) =>
        patch((s) =>
          s.journey && !s.journey.items.includes(placeId)
            ? { journey: { ...s.journey, items: [...s.journey.items, placeId] } }
            : {},
        ),
      reset: () => patch((s) => ({ ...EMPTY, lang: s.lang, geoWanted: s.geoWanted })),
    }),
    [patch],
  )

  const geo = useGeolocation(saved.geoWanted, START)

  // Follow the traveller, but only re-plan after a real move (GPS jitter would reshuffle the route).
  const [start, setStart] = useState<LatLng>(START)
  const lastStart = useRef<LatLng>(START)
  useEffect(() => {
    const next = geo.status === 'on' && geo.position ? geo.position : START
    if (distanceM(lastStart.current, next) > 100) {
      lastStart.current = next
      setStart(next)
    }
  }, [geo])

  const travel = useMemo<Travel>(() => {
    // A planned time that has already passed means "now".
    const departAt = saved.departAt && saved.departAt > Date.now() - 30 * 60_000 ? saved.departAt : null
    return { transport: saved.transport ?? saved.intent?.transport ?? 'walk', departAt }
  }, [saved.transport, saved.intent, saved.departAt])

  const value = useMemo<QuestState>(
    () => ({
      ...saved,
      ...actions,
      places,
      loading,
      start,
      travel,
      geo,
      role: getRole(saved.roleId),
      t: STRINGS[saved.lang],
    }),
    [saved, actions, places, loading, start, travel, geo],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useQuest(): QuestState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useQuest must be used inside QuestProvider')
  return v
}
