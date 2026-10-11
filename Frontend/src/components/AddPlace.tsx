import { lazy, Suspense, useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Coffee, Landmark, Loader2, MapPin, MapPinPlus, PartyPopper, Plus, Send } from 'lucide-react'
import { geocodeSearch, type GeoResult } from '../lib/backend'
import { addCommunityPlace, CONFIRM_AT } from '../lib/community'
import { submitPlaceSuggestion, type SuggestedKind } from '../lib/placeSuggestions'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'
import type { LatLng, Place } from '../types'
import Sheet from './Sheet'

const PickMap = lazy(() => import('./PickMap'))

const fieldClass =
  'mt-1 min-h-11 w-full rounded-xl border-2 border-sand bg-white px-3 text-[14px] text-ink outline-none transition placeholder:text-ink/35 focus:border-teal'

/** "Know a place that's missing?" card with a button that opens the form. */
/** Minutes at a place the traveller adds, until they say otherwise. */
const STAY: Record<SuggestedKind, number> = { food: 45, sight: 45, fun: 60 }
const THEMES: Record<SuggestedKind, Place['themes']> = { food: ['food'], sight: ['culture', 'photo'], fun: ['fun'] }
const TONE: Record<SuggestedKind, Place['tone']> = { food: 'butter', sight: 'teal', fun: 'leaf' }

/** "Know a place that's missing?" card with a button that opens the form. `forTrip`: offer to add it to the trip being planned. */
export default function AddPlaceCard({ around, forTrip = false }: { around: LatLng; forTrip?: boolean }) {
  const { t } = useQuest()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="rounded-2xl border-2 border-dashed border-sand p-4">
        <div className="text-[14px] font-bold">{t.addPlaceCardTitle}</div>
        <p className="mt-0.5 text-[12px] leading-snug text-bark/80">{t.addPlaceCardBody}</p>
        <button
          onClick={() => setOpen(true)}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-teal bg-white px-3 text-[13px] font-bold text-teal transition hover:bg-teal/5 active:scale-[.98]"
        >
          <MapPinPlus className="h-4 w-4" /> {t.addPlaceButton}
        </button>
      </div>
      {open && <AddPlaceSheet around={around} forTrip={forTrip} onClose={() => setOpen(false)} />}
    </>
  )
}

export function AddPlaceSheet({ around, forTrip = false, onClose }: { around: LatLng; forTrip?: boolean; onClose: () => void }) {
  const { t, lang, geo, addMyPlace, putCommunityPlace, selected, toggle } = useQuest()
  const { session } = useAuth()
  /** Signed in (a guest is fine): places go straight onto everyone's map. */
  const canPublish = !!supabase && !!session
  // Open the map where the traveller is (they are often standing at the place), else on the plan.
  const first = geo.status === 'on' && geo.position ? geo.position : around
  const [view, setView] = useState<LatLng & { zoom: number; nonce?: number }>({ lat: first.lat, lng: first.lng, zoom: 16 })
  const [point, setPoint] = useState<LatLng>({ lat: first.lat, lng: first.lng })
  /** How the pin got where it is: an address result (its label), the map ('map'), or not set yet (null). */
  const [pinned, setPinned] = useState<string | null>(null)
  // Typing the address looks it up; picking a result moves the pin there (it can still be dragged).
  const [found, setFound] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)
  const [lookup, setLookup] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SuggestedKind | null>(null)
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')
  const [mapFailed, setMapFailed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [toTrip, setToTrip] = useState(forTrip)  // only offered when opened while planning a trip
  const [share, setShare] = useState(true)
  const [stay, setStay] = useState('')
  /** After submitting: what happened (added to the trip, sent to the team, or added but not sent). */
  const [outcome, setOutcome] = useState<'sent' | 'added' | 'addedSent' | 'addedNotSent' | 'published' | 'publishedTrip' | null>(null)
  const [clientSuggestionId, setClientSuggestionId] = useState(() => crypto.randomUUID())

  useEffect(() => {
    const q = address.trim()
    if (!lookup || q.length < 3) {
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

  const pinAt = (r: GeoResult) => {
    const at = { lat: r.lat, lng: r.lng }
    setPoint(at)
    setView({ ...at, zoom: 17, nonce: Date.now() })
    setPinned(r.label || r.name)
    setLookup(false)
    setFound([])
  }

  const kinds: { kind: SuggestedKind; icon: typeof Coffee }[] = [
    { kind: 'food', icon: Coffee },
    { kind: 'sight', icon: Landmark },
    { kind: 'fun', icon: PartyPopper },
  ]

  const reset = () => {
    setName('')
    setKind(null)
    setAddress('')
    setDescription('')
    setHours('')
    setPriceMin('')
    setPriceMax('')
    setContact('')
    setStay('')
    setPinned(null)
    setFound([])
    setClientSuggestionId(crypto.randomUUID())
    setSent(false)
    setOutcome(null)
  }

  const submit = async () => {
    setError('')
    if (name.trim().length < 2) return setError(t.addPlaceNameError)
    if (!kind) return setError(t.addPlaceKindError)
    const min = priceMin ? Math.round(Number(priceMin) / 1000) : null
    const max = priceMax ? Math.round(Number(priceMax) / 1000) : null
    if (min != null && max != null && max < min) return setError(t.addPlaceRangeError)
    if (!toTrip && !share) return setError(t.addPlaceNeedOne)
    // An address typed but no result picked: use the best match for it.
    let at = point
    if (!pinned && address.trim().length >= 3) {
      setSubmitting(true)
      const best = (await geocodeSearch(address.trim(), lang))[0]
      setSubmitting(false)
      if (best) {
        at = { lat: best.lat, lng: best.lng }
        pinAt(best)
      }
    }
    // A stop, or a place on everyone's map, needs a real position: without an address or a tap on
    // the map we only know where the phone is.
    const publish = share && canPublish
    if ((toTrip || publish) && !pinned && at === point) return setError(t.addPlaceNoPin)
    const lo = min ?? max
    const hi = max ?? min
    const stayMin = Math.round(Number(stay)) > 0 ? Math.min(Math.round(Number(stay)), 600) : STAY[kind]
    const pos = { lat: Number(at.lat.toFixed(6)), lng: Number(at.lng.toFixed(6)) }
    const description_ = description.trim() || null

    // Signed in: straight onto everyone's map, marked "not confirmed yet" until 10 people have been.
    if (publish) {
      setSubmitting(true)
      try {
        const p = await addCommunityPlace({
          clientId: clientSuggestionId,
          name: name.trim(),
          kind,
          at: pos,
          address: address.trim() || null,
          description: description_,
          openingHours: hours.trim() || null,
          priceMinK: min,
          priceMaxK: max,
          contact: contact.trim() || null,
          visitMin: stayMin,
          language: lang,
          here: geo.status === 'on' ? geo.position : null,
        })
        putCommunityPlace(p)
        if (toTrip && !selected.includes(p.id)) toggle(p.id)
        setOutcome(toTrip ? 'publishedTrip' : 'published')
        setSent(true)
        return
      } catch (e) {
        if (e instanceof Error && e.message === 'too_many') return setError(t.addPlaceTooMany)
        // Offline or Supabase down: keep it in the trip at least.
        if (!toTrip) return setError(t.addPlaceSubmitError)
      } finally {
        setSubmitting(false)
      }
    }

    if (toTrip) {
      // Only on this phone: a stop of the trip right away (travel time from the distance, cost from the prices).
      addMyPlace(
        {
          id: `my:${clientSuggestionId}`,
          area: 'hanoi',
          kind,
          depth: 'quick',
          openingHours: null,
          priceCheckedOn: null,
          name: { vi: name.trim(), en: name.trim() },
          nameVi: name.trim(),
          ...pos,
          priceMin: lo ?? 0,
          priceMax: hi ?? 0,
          priceUnknown: lo == null,
          visitMin: stayMin,
          themes: THEMES[kind],
          tags: ['mine'],
          blurb: (() => {
            const extra = [description.trim(), address.trim(), hours.trim()].filter(Boolean).join(' · ')
            return { vi: extra || t.addPlaceKinds[kind], en: extra || t.addPlaceKinds[kind] }
          })(),
          tone: TONE[kind],
          story: { vi: '', en: '' },
          why: { vi: '', en: '' },
          photoTip: { vi: '', en: '' },
          etiquette: { vi: '', en: '' },
          challenge: null,
        },
        true,
      )
      if (publish) {
        setOutcome('addedNotSent')
        setSent(true)
        return
      }
      if (!share) {
        setOutcome('added')
        setSent(true)
        return
      }
    }
    // Not signed in: to the team for review, as before.
    setSubmitting(true)
    try {
      await submitPlaceSuggestion({
        clientSuggestionId,
        name: name.trim(),
        kind,
        ...pos,
        address: address.trim() || null,
        description: description_,
        openingHours: hours.trim() || null,
        priceMinK: min,
        priceMaxK: max,
        contact: contact.trim() || null,
        language: lang,
      })
      setOutcome(toTrip ? 'addedSent' : 'sent')
      setSent(true)
    } catch {
      if (toTrip) {
        setOutcome('addedNotSent')
        setSent(true)
      } else setError(t.addPlaceSubmitError)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <Sheet title={t.addPlaceTitle} closeLabel={t.close} onClose={onClose}>
        <div
          className={`flex items-start gap-2 rounded-2xl px-3 py-3 text-[13px] font-medium ${
            outcome === 'addedNotSent' ? 'bg-sun/20 text-bark' : 'bg-leaf/10 text-leaf'
          }`}
          role="status"
        >
          {outcome === 'addedNotSent' ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>
            {outcome === 'published'
              ? t.addPlacePublished
              : outcome === 'publishedTrip'
                ? t.addPlacePublishedTrip
                : outcome === 'added'
              ? t.addPlaceAdded
              : outcome === 'addedSent'
                ? t.addPlaceAddedAndSent
                : outcome === 'addedNotSent'
                  ? t.addPlaceAddedNotSent
                  : t.addPlaceThanks}
          </span>
        </div>
        {outcome && outcome !== 'sent' && (
          <button
            onClick={onClose}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl border-b-4 border-teal/70 bg-teal px-4 text-[14px] font-bold text-white"
          >
            {t.addPlaceDone}
          </button>
        )}
        <button
          onClick={reset}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-teal bg-white px-3 text-[13px] font-bold text-teal"
        >
          <MapPinPlus className="h-4 w-4" /> {t.addPlaceAnother}
        </button>
      </Sheet>
    )
  }

  return (
    <Sheet title={t.addPlaceTitle} closeLabel={t.close} onClose={onClose}>
      <label className="block text-[12px] font-bold text-ink/80">
        {t.addPlaceName}
        <input
          data-autofocus=""
          className={fieldClass}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.addPlaceNamePh}
        />
      </label>

      <fieldset className="mt-4">
        <legend className="text-[12px] font-bold text-ink/80">{t.addPlaceKind}</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {kinds.map(({ kind: value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-1.5 text-[12px] font-bold transition ${
                kind === value ? 'border-teal bg-teal/10 text-teal' : 'border-sand bg-white text-bark hover:border-teal/40'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.addPlaceKinds[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-[12px] font-bold text-ink/80">
        {t.addPlaceAddress}
        <input
          className={fieldClass}
          maxLength={200}
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
            setLookup(true)
            if (pinned && pinned !== 'map') setPinned(null)
          }}
          placeholder={t.addPlaceAddressPh}
          autoComplete="street-address"
        />
      </label>
      {lookup && address.trim().length >= 3 ? (
        <ul className="mt-1 space-y-1 rounded-2xl border-2 border-sand bg-white p-1">
          {found.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => pinAt(r)} className="flex w-full items-start gap-2.5 rounded-xl p-2 text-left hover:bg-cream">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brick" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold">{r.name}</span>
                  <span className="block truncate text-[11px] text-bark/70">{r.label}</span>
                </span>
              </button>
            </li>
          ))}
          {searching && (
            <li className="flex items-center gap-2 p-2 text-[12px] text-bark/60">
              <Loader2 className="h-4 w-4 animate-spin" /> {t.searching}
            </li>
          )}
          {!searching && !found.length && <li className="p-2 text-[12px] text-bark/70">{t.addPlaceNoAddress}</li>}
        </ul>
      ) : (
        <p className="mt-1 text-[11px] text-bark/60">{t.addPlaceAddressHint}</p>
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
              point={point}
              view={view}
              userPos={geo.status === 'on' ? geo.position : null}
              onPick={(p) => {
                setPoint(p)
                setPinned('map')
              }}
              onFail={() => setMapFailed(true)}
            />
          </Suspense>
        )}
      </div>
      <p className={`mt-1 text-center text-[11px] ${pinned && pinned !== 'map' ? 'font-bold text-teal' : 'text-bark/60'}`}>
        {pinned && pinned !== 'map' ? t.addPlacePinned(pinned) : t.addPlaceMapHint}
      </p>


      <label className="mt-3 block text-[12px] font-bold text-ink/80">
        {t.addPlaceDescription}
        <textarea
          className={`${fieldClass} min-h-20 py-3 leading-relaxed`}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.addPlaceDescriptionPh}
        />
        <span className="mt-1 block text-right text-[10px] font-medium text-bark/60">{description.length}/500</span>
      </label>

      <label className="mt-1 block text-[12px] font-bold text-ink/80">
        {t.addPlaceHours}
        <input className={fieldClass} maxLength={100} value={hours} onChange={(e) => setHours(e.target.value)} placeholder={t.addPlaceHoursPh} />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-[12px] font-bold text-ink/80">
          {t.addPlacePriceMin}
          <input className={fieldClass} type="number" min="0" step="1000" inputMode="numeric" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="30000" />
        </label>
        <label className="text-[12px] font-bold text-ink/80">
          {t.addPlacePriceMax}
          <input className={fieldClass} type="number" min="0" step="1000" inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="80000" />
        </label>
      </div>

      <label className="mt-3 block text-[12px] font-bold text-ink/80">
        {t.addPlaceContact}
        <input className={fieldClass} maxLength={200} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t.addPlaceContactPh} />
      </label>

      <label className="mt-3 block text-[12px] font-bold text-ink/80">
        {t.addPlaceStay}
        <input
          className={fieldClass}
          type="number"
          min="5"
          max="600"
          step="5"
          inputMode="numeric"
          value={stay}
          onChange={(e) => setStay(e.target.value)}
          placeholder={String(STAY[kind ?? 'sight'])}
        />
      </label>

      <div className="mt-4 space-y-2">
        {forTrip && (
          <label className={`flex items-start gap-3 rounded-2xl border-2 p-3 ${toTrip ? 'border-teal bg-teal/5' : 'border-sand bg-white'}`}>
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-teal" checked={toTrip} onChange={(e) => setToTrip(e.target.checked)} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold">{t.addPlaceToTrip}</span>
              <span className="block text-[11px] leading-snug text-bark/70">{t.addPlaceToTripHint}</span>
            </span>
          </label>
        )}
        <label className={`flex items-start gap-3 rounded-2xl border-2 p-3 ${share ? 'border-teal bg-teal/5' : 'border-sand bg-white'}`}>
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-teal" checked={share} onChange={(e) => setShare(e.target.checked)} />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold">{canPublish ? t.addPlacePublic : t.addPlaceShare}</span>
            <span className="block text-[11px] leading-snug text-bark/70">
              {canPublish ? t.addPlacePublicHint(CONFIRM_AT) : supabase ? t.addPlacePublicSignIn : t.addPlaceShareHint}
            </span>
          </span>
        </label>
      </div>
      {share && !canPublish && <p className="mt-3 text-[11px] leading-relaxed text-bark/70">{t.addPlaceReviewNote}</p>}
      {error && (
        <p className="mt-3 rounded-xl bg-brick/10 px-3 py-2 text-[12px] font-medium text-brick" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={submitting}
        onClick={submit}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-teal/70 bg-teal px-4 font-bold text-white shadow-md transition active:translate-y-0.5 active:border-b-0 disabled:border-sand disabled:bg-sand disabled:text-bark/50 disabled:shadow-none"
      >
        {toTrip ? <Plus className="h-4 w-4" /> : <Send className="h-4 w-4" />}{' '}
        {submitting ? t.addPlaceSubmitting : toTrip ? t.addPlaceToTrip : share && canPublish ? t.addPlacePublic : t.addPlaceSubmit}
      </button>
    </Sheet>
  )
}
