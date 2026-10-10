import { lazy, Suspense, useState } from 'react'
import { CircleCheck, Coffee, Landmark, Loader2, MapPinPlus, PartyPopper, Send } from 'lucide-react'
import { submitPlaceSuggestion, type SuggestedKind } from '../lib/placeSuggestions'
import { useQuest } from '../store/QuestContext'
import type { LatLng } from '../types'
import Sheet from './Sheet'

const PickMap = lazy(() => import('./PickMap'))

const fieldClass =
  'mt-1 min-h-11 w-full rounded-xl border-2 border-sand bg-white px-3 text-[14px] text-ink outline-none transition placeholder:text-ink/35 focus:border-teal'

/** "Know a place that's missing?" card with a button that opens the form. */
export default function AddPlaceCard({ around }: { around: LatLng }) {
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
      {open && <AddPlaceSheet around={around} onClose={() => setOpen(false)} />}
    </>
  )
}

export function AddPlaceSheet({ around, onClose }: { around: LatLng; onClose: () => void }) {
  const { t, lang, geo } = useQuest()
  // Open the map where the traveller is (they are often standing at the place), else on the plan.
  const first = geo.status === 'on' && geo.position ? geo.position : around
  const [view] = useState({ lat: first.lat, lng: first.lng, zoom: 16 })
  const [point, setPoint] = useState<LatLng>({ lat: first.lat, lng: first.lng })
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
  const [clientSuggestionId, setClientSuggestionId] = useState(() => crypto.randomUUID())

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
    setClientSuggestionId(crypto.randomUUID())
    setSent(false)
  }

  const submit = async () => {
    setError('')
    if (name.trim().length < 2) return setError(t.addPlaceNameError)
    if (!kind) return setError(t.addPlaceKindError)
    const min = priceMin ? Math.round(Number(priceMin) / 1000) : null
    const max = priceMax ? Math.round(Number(priceMax) / 1000) : null
    if (min != null && max != null && max < min) return setError(t.addPlaceRangeError)
    setSubmitting(true)
    try {
      await submitPlaceSuggestion({
        clientSuggestionId,
        name: name.trim(),
        kind,
        lat: Number(point.lat.toFixed(6)),
        lng: Number(point.lng.toFixed(6)),
        address: address.trim() || null,
        description: description.trim() || null,
        openingHours: hours.trim() || null,
        priceMinK: min,
        priceMaxK: max,
        contact: contact.trim() || null,
        language: lang,
      })
      setSent(true)
    } catch {
      setError(t.addPlaceSubmitError)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <Sheet title={t.addPlaceTitle} closeLabel={t.close} onClose={onClose}>
        <div className="flex items-start gap-2 rounded-2xl bg-leaf/10 px-3 py-3 text-[13px] font-medium text-leaf" role="status">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t.addPlaceThanks}</span>
        </div>
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
              onPick={setPoint}
              onFail={() => setMapFailed(true)}
            />
          </Suspense>
        )}
      </div>
      <p className="mt-1 text-center text-[11px] text-bark/60">{t.addPlaceMapHint}</p>

      <label className="mt-3 block text-[12px] font-bold text-ink/80">
        {t.addPlaceAddress}
        <input className={fieldClass} maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.addPlaceAddressPh} />
      </label>

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

      <p className="mt-4 text-[11px] leading-relaxed text-bark/70">{t.addPlaceReviewNote}</p>
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
        <Send className="h-4 w-4" /> {submitting ? t.addPlaceSubmitting : t.addPlaceSubmit}
      </button>
    </Sheet>
  )
}
