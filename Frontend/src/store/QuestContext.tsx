import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getRole } from '../data/roles'
import { fetchEvents, fetchPlaces } from '../lib/api'
import { AREAS, planArea } from '../lib/area'
import { eventStopById, eventsInWindow, isEventId, type EventOption } from '../lib/events'
import type { PlanContext } from '../lib/quest'
import { loadSeries, weatherAt, type Weather } from '../lib/weather'
import type { Travel } from '../lib/quest'
import { distanceM, estimateLeg } from '../lib/travel'
import { useGeolocation, type Geo } from '../lib/useGeolocation'
import { STRINGS } from '../i18n/strings'
import type { Area, Intent, Journey, Lang, LatLng, Mode, Place, QuestEvent, Role, Transport } from '../types'
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
  /** Fixed stop order when playing a community quest (null = nearest-first). */
  routeOrder: string[] | null
  /** The community quest being played (for the passport), null for your own route. */
  fromQuest: { id: string; title: string } | null
  /** A start point picked on the map or by search; wins over location. null = not set. */
  customStart: (LatLng & { label: string }) | null
  /** Last real position from the device, so a reload can plan before the first new fix arrives. */
  lastFix: LatLng | null
  /** The group-play party this journey belongs to (null = playing alone). */
  party: { id: string; code: string } | null
}

export interface QuestState extends Saved {
  /** Every approved place (look-ups by id: journeys, quests, passport), plus the event sittings in play. */
  places: Place[]
  /** Events that fit the current trip (departure → departure + requested hours) in the plan's area. */
  eventOptions: EventOption[]
  /** Start and end of the current trip (ms). */
  tripWindow: { from: number; to: number }
  /** Places in the current plan's area — use these for ranking and suggestions. */
  areaPlaces: Place[]
  area: Area
  loading: boolean
  /** Where the plan starts: the point the traveller picked, else their real position. null = not known yet. */
  start: LatLng | null
  /** Weather in the plan's area at departure (null while loading / offline). */
  weather: Weather | null
  /** Weather + departure time for ranking places in an area. */
  contextFor: (area: Area) => PlanContext
  /** Area + start + places for a request that isn't saved yet (the Ask page preview). */
  planFor: (asked: Area | null | undefined) => ReturnType<typeof planArea>
  travel: Travel
  geo: Geo
  role: Role | null
  t: (typeof STRINGS)[Lang]
  setLang: (l: Lang) => void
  setDraft: (s: string) => void
  setMode: (m: Mode) => void
  setRole: (id: string) => void
  /** routeOrder: keep the stops in this order (community quests). */
  setIntent: (i: Intent, selected: string[], routeOrder?: string[] | null) => void
  /** Call after setIntent when the route comes from a community quest. */
  setFromQuest: (q: { id: string; title: string } | null) => void
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
  setCustomStart: (p: (LatLng & { label: string }) | null) => void
  setParty: (p: { id: string; code: string } | null) => void
  /** A stop by id — catalogue places and event sittings (even ones not in the current trip). */
  stopById: (id: string) => Place | null
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
  routeOrder: null,
  fromQuest: null,
  customStart: null,
  lastFix: null,
  party: null,
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
  const [catalog, setCatalog] = useState<Place[]>([])
  const [events, setEvents] = useState<QuestEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlaces().then((p) => {
      setCatalog(p)
      setLoading(false)
    })
    fetchEvents().then(setEvents)
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
      setIntent: (intent: Intent, selected: string[], routeOrder: string[] | null = null) =>
        patch(() => ({ intent, selected, dismissed: [], routeOrder, fromQuest: null })),
      setFromQuest: (fromQuest: { id: string; title: string } | null) => patch(() => ({ fromQuest })),
      setTransport: (transport: Transport | null) => patch(() => ({ transport })),
      setDepartAt: (departAt: number | null) => patch(() => ({ departAt })),
      setGeoWanted: (geoWanted: boolean) => patch(() => ({ geoWanted })),
      setCustomStart: (customStart: (LatLng & { label: string }) | null) => patch(() => ({ customStart })),
      setParty: (party: { id: string; code: string } | null) => patch(() => ({ party })),
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
      reset: () => patch((s) => ({ ...EMPTY, lang: s.lang, geoWanted: s.geoWanted, customStart: s.customStart, lastFix: s.lastFix })),
    }),
    [patch],
  )

  const geo = useGeolocation(saved.geoWanted)

  // Follow the traveller, but only re-plan after a real move (GPS jitter would reshuffle the route).
  const [here, setHere] = useState<LatLng | null>(null)
  const lastHere = useRef<LatLng | null>(null)
  useEffect(() => {
    const next = geo.status === 'on' && geo.position ? geo.position : null
    const prev = lastHere.current
    if (!next && !prev) return
    if (next && prev && distanceM(prev, next) <= 100) return
    lastHere.current = next
    setHere(next)
    if (next) patch(() => ({ lastFix: next }))
  }, [geo, patch])

  // Forecasts for both areas (cached 30 min); the hour is picked from the departure time.
  type Series = Awaited<ReturnType<typeof loadSeries>>
  const [series, setSeries] = useState<Partial<Record<Area, Series>>>({})
  useEffect(() => {
    AREAS.forEach((a) => loadSeries(a).then((s) => s && setSeries((cur) => ({ ...cur, [a]: s }))))
  }, [])

  // A picked start point counts like being there; otherwise the live location (the last fix while
  // the first new one is on its way). Never a made-up position.
  const origin = saved.customStart ?? here ?? (saved.geoWanted && geo.status !== 'denied' ? saved.lastFix : null)
  const planFor = useCallback((asked: Area | null | undefined) => planArea(asked, origin, catalog), [origin, catalog])
  const plan = useMemo(() => planFor(saved.intent?.area), [planFor, saved.intent?.area])

  const travel = useMemo<Travel>(() => {
    // A planned time that has already passed means "now".
    const departAt = saved.departAt && saved.departAt > Date.now() - 30 * 60_000 ? saved.departAt : null
    return { transport: saved.transport ?? saved.intent?.transport ?? 'walk', departAt }
  }, [saved.transport, saved.intent, saved.departAt])

  // Re-evaluated every minute so "now" trips don't keep offering a show that already started.
  const [tick, setTick] = useState(() => Math.floor(Date.now() / 60_000))
  useEffect(() => {
    const id = setInterval(() => setTick(Math.floor(Date.now() / 60_000)), 60_000)
    return () => clearInterval(id)
  }, [])
  const tripWindow = useMemo(() => {
    const from = travel.departAt ?? tick * 60_000
    return { from, to: from + (saved.intent?.hours ?? 3) * 3_600_000 }
  }, [travel.departAt, tick, saved.intent?.hours])
  const eventOptions = useMemo(
    () =>
      eventsInWindow(events, tripWindow.from, tripWindow.to, (p) =>
        plan.start ? estimateLeg(plan.start, p, travel.transport, new Date(tripWindow.from), 1).minutes : 0),
    [events, plan.start, travel.transport, tripWindow],
  )
  // Catalogue + every event sitting the traveller can see, picked, or is walking to.
  const places = useMemo(() => {
    const extra = new Map<string, Place>()
    for (const o of eventOptions) for (const s of o.sittings) extra.set(s.id, s)
    for (const id of [...saved.selected, ...(saved.journey?.stopIds ?? [])]) {
      if (!isEventId(id) || extra.has(id)) continue
      const stop = eventStopById(id, events)
      if (stop) extra.set(id, stop)
    }
    return extra.size ? [...catalog, ...extra.values()] : catalog
  }, [catalog, eventOptions, events, saved.selected, saved.journey])

  const value = useMemo<QuestState>(
    () => ({
      ...saved,
      ...actions,
      places,
      stopById: (id: string) => places.find((p) => p.id === id) ?? (isEventId(id) ? eventStopById(id, events) : null),
      eventOptions,
      tripWindow,
      weather: weatherAt(series[plan.area] ?? null, new Date(travel.departAt ?? Date.now())),
      contextFor: (a: Area) => {
        const at = new Date(travel.departAt ?? Date.now())
        return { at, weather: weatherAt(series[a] ?? null, at) }
      },
      areaPlaces: plan.places,
      area: plan.area,
      start: plan.start,
      planFor,
      loading,
      travel,
      geo,
      role: getRole(saved.roleId),
      t: STRINGS[saved.lang],
    }),
    [saved, actions, places, events, eventOptions, tripWindow, loading, plan, planFor, travel, geo, series],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useQuest(): QuestState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useQuest must be used inside QuestProvider')
  return v
}
