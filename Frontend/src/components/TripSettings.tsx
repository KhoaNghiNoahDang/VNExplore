import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronRight, Clock3, LocateFixed, LocateOff, Loader2, MapPin, Navigation, Search, ShieldCheck, Stamp as StampIcon, X } from 'lucide-react'
import { TRANSPORTS } from '../data/transport'
import { TRANSPORT_INFO } from '../i18n/strings'
import { AREA_POINT } from '../lib/area'
import { geocodeSearch, type GeoResult } from '../lib/backend'
import { distanceM } from '../lib/travel'
import { useQuest } from '../store/QuestContext'
import type { Area, LatLng, Place, Transport } from '../types'
import PrimaryButton from './PrimaryButton'
import Sheet from './Sheet'
import TransportIcon from './TransportIcon'

function toLocalInput(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function useDepartLabel() {
  const { t, lang, travel } = useQuest()
  if (!travel.departAt) return t.departNow
  return new Date(travel.departAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ------------------------------------------------------------------ sheets

export function TransportSheet({ current, onClose }: { current: Transport; onClose: () => void }) {
  const { t, lang, setTransport } = useQuest()
  const info = TRANSPORT_INFO[lang]
  return (
    <Sheet title={t.transportTitle} onClose={onClose}>
      <div className="space-y-2" role="radiogroup">
        {TRANSPORTS.map((tr) => {
          const on = tr === current
          return (
            <button
              key={tr}
              role="radio"
              aria-checked={on}
              onClick={() => {
                setTransport(tr)
                onClose()
              }}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                on ? 'border-teal bg-teal/5' : 'border-sand bg-white hover:border-bark/30'
              }`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-teal text-white' : 'bg-butter text-bark'}`}>
                <TransportIcon transport={tr} className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{info[tr].name}</span>
                <span className="block text-[12px] leading-snug text-bark/70">{info[tr].desc}</span>
              </span>
              {on && <Check className="h-5 w-5 shrink-0 text-teal" strokeWidth={3} />}
            </button>
          )
        })}
      </div>
      <p className="mt-4 text-[12px] text-bark/60">{t.estimateNote}</p>
    </Sheet>
  )
}

export function DepartSheet({ onClose }: { onClose: () => void }) {
  const { t, travel, setDepartAt } = useQuest()
  const [custom, setCustom] = useState(() => toLocalInput(travel.departAt ?? Date.now() + 60 * 60_000))
  const choose = (ms: number | null) => {
    setDepartAt(ms)
    onClose()
  }
  const options: { label: string; ms: number | null; on: boolean }[] = [
    { label: t.departNow, ms: null, on: !travel.departAt },
    { label: t.departIn(1), ms: Date.now() + 60 * 60_000, on: false },
    { label: t.departIn(2), ms: Date.now() + 2 * 60 * 60_000, on: false },
  ]
  return (
    <Sheet title={t.departTitle} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => choose(o.ms)}
            className={`rounded-2xl border-2 py-3.5 text-[14px] font-bold transition ${o.on ? 'border-teal bg-teal/5' : 'border-sand bg-white hover:border-bark/30'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <label className="mt-5 block text-[12px] font-bold text-ink/80">{t.departPick}</label>
      <div className="mt-2 flex gap-2">
        <input
          type="datetime-local"
          value={custom}
          min={toLocalInput(Date.now())}
          onChange={(e) => setCustom(e.target.value)}
          className="min-w-0 flex-1 rounded-2xl border-2 border-sand bg-white px-3 py-2.5 text-[14px] focus:border-teal focus:outline-none"
        />
        <button
          onClick={() => {
            const ms = new Date(custom).getTime()
            if (!Number.isNaN(ms)) choose(ms)
          }}
          className="shrink-0 rounded-2xl bg-sun px-4 text-[13px] font-bold"
        >
          {t.departApply}
        </button>
      </div>
      <p className="mt-4 text-[12px] text-bark/60">{t.departNote}</p>
    </Sheet>
  )
}

/**
 * Ask before using location: what it's for, that it stays on the phone, then the browser's own prompt.
 * Also used to turn location off, and to explain how to re-enable it after a "Block".
 * There is no made-up fallback: without location the traveller picks a start point on the map.
 */
export function LocationSheet({
  onClose,
  onPickStart,
}: {
  onClose: () => void
  /** "Pick a start point on the map instead". */
  onPickStart: () => void
}) {
  const { t, geo, geoWanted, setGeoWanted } = useQuest()
  const allow = () => {
    setGeoWanted(true)
    markGeoAsked()
    onClose()
  }
  const pick = () => {
    markGeoAsked()
    onClose()
    onPickStart()
  }

  // Already on: show what we have and let them turn it off.
  if (geoWanted && (geo.status === 'on' || geo.status === 'asking')) {
    return (
      <Sheet title={t.geoOnTitle} onClose={onClose}>
        <div className="flex items-start gap-3 rounded-2xl bg-teal/10 p-3 text-[13px] text-teal">
          {geo.status === 'asking' ? <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" /> : <LocateFixed className="mt-0.5 h-5 w-5 shrink-0" />}
          <span className="font-medium">
            {geo.status === 'asking' ? t.locating : t.geoOnNote(geo.accuracyM ? Math.round(geo.accuracyM) : null)}
          </span>
        </div>
        <button
          onClick={() => {
            setGeoWanted(false)
            onClose()
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-sand bg-white py-3 text-[14px] font-bold text-bark hover:bg-cream"
        >
          <LocateOff className="h-4 w-4" /> {t.geoOff}
        </button>
      </Sheet>
    )
  }

  const blocked = geoWanted && (geo.status === 'denied' || geo.status === 'unavailable')
  const why: { icon: ReactNode; text: string }[] = [
    { icon: <Navigation className="h-4 w-4" />, text: t.geoWhy1 },
    { icon: <StampIcon className="h-4 w-4" />, text: t.geoWhy2 },
    { icon: <MapPin className="h-4 w-4" />, text: t.geoWhy3 },
  ]
  return (
    <Sheet title={t.geoAskTitle} onClose={onClose}>
      {blocked ? (
        <p className="rounded-2xl bg-brick/10 p-3 text-[13px] font-medium leading-relaxed text-brick">
          {geo.status === 'denied' ? t.geoDeniedHelp : t.locationUnavailable}
        </p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {why.map((w) => (
              <li key={w.text} className="flex items-start gap-3 text-[14px] leading-snug">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">{w.icon}</span>
                <span className="pt-1.5">{w.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-[12px] text-bark/70">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" /> {t.geoPrivacy}
          </p>
        </>
      )}
      <div className="mt-5 space-y-2">
        <PrimaryButton
          onClick={() => {
            if (blocked) setGeoWanted(false) // reset, so switching on again re-runs the browser request
            setTimeout(allow, blocked ? 50 : 0)
          }}
        >
          <LocateFixed className="h-4 w-4" /> {blocked ? t.geoRetry : t.geoAllow}
        </PrimaryButton>
        <button onClick={pick} className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[14px] font-bold text-bark/70 hover:bg-cream">
          <MapPin className="h-4 w-4" /> {t.geoSkip}
        </button>
      </div>
    </Sheet>
  )
}

const ASKED_KEY = 'vnexplore:geoAsked'
export function geoAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === '1'
  } catch {
    return false
  }
}
function markGeoAsked() {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------ start point picker

const PickMap = lazy(() => import('./PickMap'))

const foldText = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

interface Candidate {
  key: string
  name: string
  label: string
  at: LatLng
}

/** "Near Ngoc Son Temple" for a point dropped on the map (closest app place within ~250 m). */
function nearLabel(p: LatLng, places: Place[], lang: 'vi' | 'en'): string | null {
  let best: Place | null = null
  let bestM = 250
  for (const pl of places) {
    const m = distanceM(p, pl) / 1.3
    if (m < bestM) (best = pl), (bestM = m)
  }
  return best ? best.name[lang] : null
}

/**
 * Choose where the trip starts: search a place or address, or move the map under the pin.
 * Also: use my location (asks first).
 */
export function StartSheet({ area, onClose, onUseLocation }: { area: Area; onClose: () => void; onUseLocation: () => void }) {
  const { t, lang, places, customStart, setCustomStart, geo } = useQuest()
  // Open the map on the traveller (or their earlier pick); the area's middle is only a map view.
  const first = customStart ?? (geo.status === 'on' && geo.position ? geo.position : AREA_POINT[area])
  const [center, setCenter] = useState<LatLng & { zoom?: number; nonce?: number }>({ lat: first.lat, lng: first.lng, zoom: 16 })
  const [point, setPoint] = useState<LatLng>({ lat: first.lat, lng: first.lng })
  const pointRef = useRef(point)
  pointRef.current = point
  const [chosenName, setChosenName] = useState<string | null>(customStart?.label ?? null)
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)

  // Our own places first (instant, accent-insensitive), then addresses from OpenStreetMap.
  const local = useMemo<Candidate[]>(() => {
    const q = foldText(query.trim())
    if (q.length < 2) return []
    return places
      .filter((p) => foldText(`${p.name.vi} ${p.name.en}`).includes(q))
      .slice(0, 5)
      .map((p) => ({ key: p.id, name: p.name[lang], label: t.areaShort[p.area], at: { lat: p.lat, lng: p.lng } }))
  }, [query, places, lang, t])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setRemote([])
      setSearching(false)
      return
    }
    setSearching(true)
    let alive = true
    const timer = setTimeout(() => {
      geocodeSearch(q, lang).then((r) => {
        if (!alive) return
        setRemote(r)
        setSearching(false)
      })
    }, 450)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [query, lang])

  const results: Candidate[] = [
    ...local,
    ...remote
      .filter((r) => !local.some((l) => distanceM(l.at, r) < 80))
      .map((r, i) => ({ key: `g${i}`, name: r.name, label: r.label, at: { lat: r.lat, lng: r.lng } })),
  ]

  const choose = (c: Candidate) => {
    setPoint(c.at)
    setChosenName(c.name)
    setCenter({ ...c.at, zoom: 17, nonce: Date.now() })
    setQuery('')
  }
  const near = nearLabel(point, places, lang)
  const label = chosenName ?? (near ? t.nearPlace(near) : t.pickedOnMap)

  return (
    <Sheet title={t.startTitle} onClose={onClose}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark/50" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.startSearchPh}
          className="w-full rounded-2xl border-2 border-sand bg-white py-2.5 pl-9 pr-9 text-[14px] placeholder:text-ink/35 focus:border-teal focus:outline-none"
          aria-label={t.startSearchPh}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-bark/50 hover:bg-cream"
            aria-label={t.close}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query.trim().length >= 2 ? (
        <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
          {results.map((c) => (
            <li key={c.key}>
              <button onClick={() => choose(c)} className="flex w-full items-start gap-3 rounded-2xl p-2.5 text-left hover:bg-cream">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brick" />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-bold">{c.name}</span>
                  <span className="block truncate text-[12px] text-bark/70">{c.label}</span>
                </span>
              </button>
            </li>
          ))}
          {searching && (
            <li className="flex items-center gap-2 p-2.5 text-[12px] text-bark/60">
              <Loader2 className="h-4 w-4 animate-spin" /> {t.searching}
            </li>
          )}
          {!searching && !results.length && <li className="p-2.5 text-[13px] text-bark/70">{t.startNoResult}</li>}
        </ul>
      ) : (
        <>
          <div className="relative mt-3 h-60 overflow-hidden rounded-2xl border-2 border-sand bg-cream">
            {mapFailed ? (
              <p className="flex h-full items-center justify-center px-6 text-center text-[13px] text-bark/70">{t.mapUnavailable}</p>
            ) : (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-bark/50" />
                  </div>
                }
              >
                <PickMap
                  center={center}
                  onPick={(p) => {
                    // A real move (not just the fly-to we started) drops the searched name.
                    if (distanceM(p, pointRef.current) > 15) setChosenName(null)
                    setPoint(p)
                  }}
                  onFail={() => setMapFailed(true)}
                />
              </Suspense>
            )}
          </div>
          <p className="mt-2 text-center text-[12px] text-bark/60">{t.dragMapHint}</p>
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5">
            <MapPin className="h-4 w-4 shrink-0 text-brick" />
            <span className="min-w-0 truncate text-[14px] font-bold">{label}</span>
          </div>
          <PrimaryButton
            className="mt-3"
            onClick={() => {
              setCustomStart({ ...point, label })
              onClose()
            }}
          >
            <Check className="h-4 w-4" /> {t.startHereBtn}
          </PrimaryButton>
        </>
      )}

      <button
        onClick={() => {
          setCustomStart(null)
          onClose()
          onUseLocation()
        }}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-sand bg-white px-2 py-2.5 text-[13px] font-bold text-teal hover:border-teal/40"
      >
        <LocateFixed className="h-4 w-4 shrink-0" /> {t.useMyLocation}
      </button>
    </Sheet>
  )
}

// ------------------------------------------------------------------ card

function Row({ icon, label, value, note, onClick, tone = 'teal' }: {
  icon: ReactNode
  label: string
  value: string
  note?: string | null
  onClick: () => void
  tone?: 'teal' | 'sun' | 'brick'
}) {
  const bg = tone === 'teal' ? 'bg-teal/10 text-teal' : tone === 'sun' ? 'bg-sun/30 text-bark' : 'bg-brick/10 text-brick'
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-cream/60 active:bg-cream" aria-haspopup="dialog">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-bark/60">{label}</span>
        <span className="block truncate text-[15px] font-bold text-ink">{value}</span>
        {note && <span className="block truncate text-[12px] text-bark/70">{note}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-bark/40" />
    </button>
  )
}

/**
 * "Your trip" card on the first screen: start point, transport and departure — one big row each.
 * `transport` is what to show (it can come from the text being typed); `area` is the area being planned.
 */
export default function TripSettings({
  area,
  transport,
  isDefault = false,
  locationSheet,
  onLocationSheet,
}: {
  area: Area
  transport: Transport
  isDefault?: boolean
  locationSheet: boolean
  onLocationSheet: (open: boolean) => void
}) {
  const { t, lang, geo, geoWanted, customStart, planFor } = useQuest()
  const [sheet, setSheet] = useState<'transport' | 'depart' | 'start' | null>(null)
  const departLabel = useDepartLabel()

  const picked = customStart
  // Real position: live, or the last fix while a new one is on its way.
  const here = !picked && !!planFor(area).start
  const startValue = picked ? picked.label : here ? t.startHere : t.startUnknown
  const startNote = picked
    ? t.startPickedNote
    : geoWanted && geo.status === 'asking'
      ? t.locating
      : here
        ? null
        : geoWanted && geo.status === 'denied'
          ? t.geoBlockedShort
          : t.geoTapToUse

  return (
    <>
      <div className="overflow-hidden rounded-[22px] border-2 border-sand bg-white">
        <div className="px-3 pt-2.5 text-[12px] font-bold text-bark">{t.tripTitle}</div>
        <div className="divide-y divide-sand/70">
          <Row
            icon={here ? <LocateFixed className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
            tone={here || picked ? 'teal' : 'brick'}
            label={t.startFrom}
            value={startValue}
            note={startNote}
            onClick={() => setSheet('start')}
          />
          <Row
            icon={<TransportIcon transport={transport} className="h-5 w-5" strokeWidth={2} />}
            label={t.transportLabel}
            value={TRANSPORT_INFO[lang][transport].name}
            note={isDefault ? t.defaultTapToChange : null}
            onClick={() => setSheet('transport')}
          />
          <Row
            icon={<Clock3 className="h-5 w-5" />}
            tone="sun"
            label={t.departLabel}
            value={departLabel}
            onClick={() => setSheet('depart')}
          />
        </div>
      </div>

      {sheet === 'transport' && <TransportSheet current={transport} onClose={() => setSheet(null)} />}
      {sheet === 'depart' && <DepartSheet onClose={() => setSheet(null)} />}
      {sheet === 'start' && <StartSheet area={area} onClose={() => setSheet(null)} onUseLocation={() => onLocationSheet(true)} />}
      {locationSheet && <LocationSheet onClose={() => onLocationSheet(false)} onPickStart={() => setSheet('start')} />}
    </>
  )
}
