import { lazy, Suspense, useEffect, useState } from 'react'
import { Loader2, LocateFixed, MapPin } from 'lucide-react'
import { coordsOf, geocodeSearch, isMapsLink, resolveMapsLink, type GeoResult } from '../lib/backend'
import { useQuest } from '../store/QuestContext'
import type { LatLng } from '../types'

const PickMap = lazy(() => import('./PickMap'))

const fieldClass =
  'mt-1 min-h-11 w-full rounded-xl border-2 border-sand bg-white px-3 text-[14px] text-ink outline-none transition placeholder:text-ink/35 focus:border-teal'

/** Where a place or event is, and how that was decided. */
export interface Pin {
  at: LatLng
  /** What was found ("Tạ Hiện, Hàng Buồm…"), empty for a tap on the map. */
  label: string
  /** Only the street was found, not the house number. */
  approx: boolean
  how: 'search' | 'link' | 'coords' | 'map' | 'here'
}

const pinOf = (r: GeoResult, how: Pin['how']): Pin => ({
  at: { lat: r.lat, lng: r.lng },
  label: [r.name, r.label].filter(Boolean).join(', '),
  approx: !!r.approx,
  how,
})

/** An address typed but no result picked: its best match, or null. */
export async function bestPinFor(address: string, lang: 'vi' | 'en'): Promise<Pin | null> {
  const best = (await geocodeSearch(address.trim(), lang))[0]
  return best ? pinOf(best, 'search') : null
}

/**
 * Address field + map for saying where something is: type an address (OpenStreetMap search, with
 * a street-only fallback), paste a Google Maps link or "lat, lng", tap the map, or "I'm here".
 * The map shows no pin until one of those happened, so the phone's own position is never taken
 * by accident.
 */
export default function LocationPicker({
  around,
  address,
  onAddress,
  pin,
  onPin,
  onLinkName,
}: {
  around: LatLng
  address: string
  onAddress: (value: string) => void
  pin: Pin | null
  onPin: (p: Pin | null) => void
  /** A Google Maps link carried the place's name. */
  onLinkName?: (name: string) => void
}) {
  const { t, lang, geo } = useQuest()
  // Open the map where the traveller is (they are often standing at the place), else on the plan.
  const first = geo.status === 'on' && geo.position ? geo.position : around
  const [view, setView] = useState<LatLng & { zoom: number; nonce?: number }>({ lat: first.lat, lng: first.lng, zoom: 16 })
  const [found, setFound] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)
  const [lookup, setLookup] = useState(false)
  const [linkState, setLinkState] = useState<'busy' | 'failed' | null>(null)
  const [mapFailed, setMapFailed] = useState(false)

  useEffect(() => {
    const q = address.trim()
    // A pasted Google Maps link or coordinates: read the point instead of searching the text.
    if (!lookup || q.length < 3 || isMapsLink(q) || coordsOf(q)) {
      setFound([])
      setSearching(false)
      return
    }
    setSearching(true)
    let alive = true
    const timer = setTimeout(() => {
      geocodeSearch(q, lang).then((r) => {
        if (!alive) return
        setFound(r.slice(0, 5))
        setSearching(false)
      })
    }, 450)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [address, lookup, lang])

  const choose = (p: Pin) => {
    onPin(p)
    setView({ ...p.at, zoom: 17, nonce: Date.now() })
    setLookup(false)
    setFound([])
  }

  const type = async (value: string) => {
    onAddress(value)
    setLinkState(null)
    const v = value.trim()
    const c = coordsOf(v)
    if (c) {
      onAddress('')
      return choose({ at: c, label: `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`, approx: false, how: 'coords' })
    }
    if (isMapsLink(v)) {
      setLinkState('busy')
      const r = await resolveMapsLink(v)
      if (!r) return setLinkState('failed')
      setLinkState(null)
      // The link isn't an address: keep the field for a real one.
      onAddress('')
      if (r.name) onLinkName?.(r.name)
      return choose({ ...pinOf(r, 'link'), label: [r.name, t.addPlaceFromLink].filter(Boolean).join(', ') })
    }
    setLookup(true)
    if (pin && (pin.how === 'search' || pin.how === 'link' || pin.how === 'coords')) onPin(null)
  }

  return (
    <>
      <label className="mt-4 block text-[12px] font-bold text-ink/80">
        {t.addPlaceAddress}
        <input
          className={fieldClass}
          maxLength={2000}
          value={address}
          onChange={(e) => void type(e.target.value)}
          placeholder={t.addPlaceAddressPh}
          autoComplete="street-address"
        />
      </label>
      {lookup && address.trim().length >= 3 ? (
        <ul className="mt-1 space-y-1 rounded-2xl border-2 border-sand bg-white p-1">
          {found.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => choose(pinOf(r, 'search'))} className="flex w-full items-start gap-2.5 rounded-xl p-2 text-left hover:bg-cream">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brick" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold">{r.name}</span>
                  <span className="block truncate text-[11px] text-bark/70">{r.label}</span>
                  {r.approx && <span className="block text-[10px] font-bold text-sun-dark">{t.addPlaceApprox}</span>}
                </span>
              </button>
            </li>
          ))}
          {searching && (
            <li className="flex items-center gap-2 p-2 text-[12px] text-bark/60">
              <Loader2 className="h-4 w-4 animate-spin" /> {t.searching}
            </li>
          )}
          {!searching && !found.length && <li className="p-2 text-[12px] leading-snug text-bark/70">{t.addPlaceNoAddress}</li>}
        </ul>
      ) : linkState ? (
        <p className={`mt-1 flex items-center gap-1.5 text-[11px] ${linkState === 'failed' ? 'text-brick' : 'text-bark/70'}`} role="status">
          {linkState === 'busy' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {linkState === 'busy' ? t.addPlaceReadingLink : t.addPlaceLinkFailed}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-bark/60">{t.addPlaceAddressHint}</p>
      )}
      {geo.status === 'on' && geo.position && pin?.how !== 'here' && (
        <button
          type="button"
          onClick={() => choose({ at: geo.position!, label: '', approx: false, how: 'here' })}
          className="mt-1.5 flex min-h-9 items-center gap-1.5 text-[12px] font-bold text-teal"
        >
          <LocateFixed className="h-3.5 w-3.5" /> {t.addPlaceImHere}
        </button>
      )}

      <div className="mt-4 text-[12px] font-bold text-ink/80">{t.addPlaceWhere}</div>
      <div className="relative mt-1 h-52 overflow-hidden rounded-2xl border-2 border-sand bg-cream">
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
              point={pin?.at ?? first}
              showPin={!!pin}
              view={view}
              userPos={geo.status === 'on' ? geo.position : null}
              onPick={(at) => onPin({ at, label: '', approx: false, how: 'map' })}
              onFail={() => setMapFailed(true)}
            />
          </Suspense>
        )}
        {!pin && !mapFailed && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-white/90 px-3 py-2 text-center text-[11px] font-bold text-bark shadow">
            {t.addPlaceNoPinYet}
          </p>
        )}
      </div>
      <p
        className={`mt-1 text-center text-[11px] ${
          pin?.approx ? 'font-bold text-sun-dark' : pin && pin.how !== 'map' ? 'font-bold text-teal' : 'text-bark/60'
        }`}
      >
        {!pin || pin.how === 'map'
          ? t.addPlaceMapHint
          : pin.how === 'here'
            ? t.addPlacePinnedHere
            : pin.approx
              ? t.addPlacePinnedApprox(pin.label)
              : t.addPlacePinned(pin.label)}
      </p>
    </>
  )
}
