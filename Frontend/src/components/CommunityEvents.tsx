import { useState } from 'react'
import { CalendarPlus, CircleCheck, Flag, Loader2, ShieldCheck, UsersRound } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CATEGORY_LABEL } from '../i18n/strings'
import {
  addCommunityEvent,
  confirmCommunityEvent,
  confirmedHere,
  EVENT_CONFIRM_AT,
  flagCommunityEvent,
  rememberConfirmed,
  type EventFlagReason,
} from '../lib/communityEvents'
import { hanoiDay } from '../lib/events'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'
import type { EventCategory, LatLng, QuestEvent } from '../types'
import { RulesNote } from './CommunityBits'
import LocationPicker, { bestPinFor, type Pin } from './LocationPicker'
import Sheet from './Sheet'

const fieldClass =
  'mt-1 min-h-11 w-full rounded-xl border-2 border-sand bg-white px-3 text-[14px] text-ink outline-none transition placeholder:text-ink/35 focus:border-teal'
const CATEGORIES: EventCategory[] = ['music', 'theatre', 'film', 'exhibition', 'workshop', 'talk', 'market', 'festival', 'other']

/** "Know an event that's missing? Add it" — a quiet button under the events list. */
export function AddEventButton({ around, className = '' }: { around: LatLng; className?: string }) {
  const { t } = useQuest()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-sand bg-white px-3 text-[12px] font-bold text-teal hover:border-teal ${className}`}
      >
        <CalendarPlus className="h-4 w-4" /> {t.addEventButton}
      </button>
      {open && <AddEventSheet around={around} onClose={() => setOpen(false)} />}
    </>
  )
}

export function AddEventSheet({ around, onClose }: { around: LatLng; onClose: () => void }) {
  const { t, lang, putCommunityEvent } = useQuest()
  const { session } = useAuth()
  const navigate = useNavigate()
  const here = useLocation()
  const today = hanoiDay(Date.now())
  const [name, setName] = useState('')
  const [category, setCategory] = useState<EventCategory | null>(null)
  const [url, setUrl] = useState('')
  const [venue, setVenue] = useState('')
  const [address, setAddress] = useState('')
  const [pin, setPin] = useState<Pin | null>(null)
  const [kind, setKind] = useState<'show' | 'open'>('show')
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [startTime, setStartTime] = useState('19:00')
  const [endTime, setEndTime] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [ticket, setTicket] = useState(false)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [clientId] = useState(() => crypto.randomUUID())

  if (!session)
    return (
      <Sheet title={t.addEventTitle} closeLabel={t.close} onClose={onClose}>
        <p className="text-[13px] text-bark/80">{t.addEventSignIn}</p>
        <button
          onClick={() => navigate(`/login?next=${encodeURIComponent(here.pathname)}`)}
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-teal px-4 font-bold text-white"
        >
          {t.signIn}
        </button>
      </Sheet>
    )

  if (done)
    return (
      <Sheet title={t.addEventTitle} closeLabel={t.close} onClose={onClose}>
        <p className="flex items-start gap-2 rounded-2xl bg-leaf/10 px-3 py-3 text-[13px] font-medium text-leaf" role="status">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> {t.addEventDone(EVENT_CONFIRM_AT)}
        </p>
        <button onClick={onClose} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl bg-teal px-4 font-bold text-white">
          {t.addPlaceDone}
        </button>
      </Sheet>
    )

  const submit = async () => {
    setError('')
    if (name.trim().length < 3) return setError(t.addEventNameError)
    if (!category) return setError(t.addEventCategoryError)
    if (!/^https?:\/\/\S+\.\S+/i.test(url.trim())) return setError(t.addEventLinkError)
    if (venue.trim().length < 2) return setError(t.addEventVenueError)
    if (!fromDate || !toDate || toDate < fromDate) return setError(t.addEventDateError)
    if (toDate < today) return setError(t.addEventPastError)
    if (!startTime) return setError(t.addEventTimeError)
    if (kind === 'open' && !endTime) return setError(t.addEventEndError)
    const min = priceMin ? Math.round(Number(priceMin) / 1000) : null
    const max = priceMax ? Math.round(Number(priceMax) / 1000) : null
    if (min != null && max != null && max < min) return setError(t.addPlaceRangeError)
    setBusy(true)
    let where = pin
    if (!where && address.trim().length >= 3) {
      where = await bestPinFor(address, lang)
      if (where) setPin(where)
    }
    if (!where) {
      setBusy(false)
      return setError(t.addPlaceNoPin)
    }
    try {
      const ev = await addCommunityEvent({
        clientId,
        name: name.trim(),
        category,
        kind,
        venue: venue.trim(),
        address: address.trim() || null,
        at: { lat: Number(where.at.lat.toFixed(6)), lng: Number(where.at.lng.toFixed(6)) },
        fromDate,
        toDate,
        startTime,
        endTime: endTime || null,
        priceMinK: min,
        priceMaxK: max,
        ticket,
        url: url.trim(),
        description: description.trim() || null,
      })
      putCommunityEvent(ev)
      setDone(true)
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      setError(m === 'too_many' ? t.addEventTooMany : m === 'past' ? t.addEventPastError : t.addPlaceSubmitError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title={t.addEventTitle} closeLabel={t.close} onClose={onClose}>
      <p className="text-[12px] leading-snug text-bark/75">{t.addEventIntro(EVENT_CONFIRM_AT)}</p>

      <label className="mt-4 block text-[12px] font-bold text-ink/80">
        {t.addEventName}
        <input className={fieldClass} maxLength={160} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.addEventNamePh} />
      </label>

      <fieldset className="mt-4">
        <legend className="text-[12px] font-bold text-ink/80">{t.addEventCategory}</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`min-h-9 rounded-full border-2 px-3 text-[12px] font-bold transition ${
                category === c ? 'border-teal bg-teal/10 text-teal' : 'border-sand bg-white text-bark hover:border-teal/40'
              }`}
            >
              {CATEGORY_LABEL[lang][c]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-[12px] font-bold text-ink/80">
        {t.addEventLink}
        <input className={fieldClass} type="url" inputMode="url" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://facebook.com/events/…" />
        <span className="mt-1 block text-[11px] font-medium text-bark/60">{t.addEventLinkHint}</span>
      </label>

      <label className="mt-4 block text-[12px] font-bold text-ink/80">
        {t.addEventVenue}
        <input className={fieldClass} maxLength={120} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder={t.addEventVenuePh} />
      </label>

      <LocationPicker around={around} address={address} onAddress={setAddress} pin={pin} onPin={setPin} onLinkName={(n) => !venue.trim() && setVenue(n)} />

      <fieldset className="mt-4">
        <legend className="text-[12px] font-bold text-ink/80">{t.addEventKind}</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(['show', 'open'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-xl border-2 px-2.5 py-2 text-left text-[12px] font-bold transition ${
                kind === k ? 'border-teal bg-teal/10 text-teal' : 'border-sand bg-white text-bark'
              }`}
            >
              {t.addEventKinds[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-[12px] font-bold text-ink/80">
          {t.addEventFrom}
          <input className={fieldClass} type="date" min={today} value={fromDate} onChange={(e) => {
            setFromDate(e.target.value)
            if (toDate < e.target.value) setToDate(e.target.value)
          }} />
        </label>
        <label className="text-[12px] font-bold text-ink/80">
          {t.addEventTo}
          <input className={fieldClass} type="date" min={fromDate || today} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <label className="text-[12px] font-bold text-ink/80">
          {kind === 'show' ? t.addEventStart : t.addEventOpens}
          <input className={fieldClass} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label className="text-[12px] font-bold text-ink/80">
          {kind === 'show' ? t.addEventEndOptional : t.addEventCloses}
          <input className={fieldClass} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-[12px] font-bold text-ink/80">
          {t.addPlacePriceMin}
          <input className={fieldClass} type="number" min="0" step="1000" inputMode="numeric" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="0" />
        </label>
        <label className="text-[12px] font-bold text-ink/80">
          {t.addPlacePriceMax}
          <input className={fieldClass} type="number" min="0" step="1000" inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="200000" />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[12px] font-bold text-ink/80">
        <input type="checkbox" className="h-4 w-4 accent-teal" checked={ticket} onChange={(e) => setTicket(e.target.checked)} />
        {t.addEventTicket}
      </label>

      <label className="mt-3 block text-[12px] font-bold text-ink/80">
        {t.addEventDescription}
        <textarea className={`${fieldClass} min-h-20 py-3 leading-relaxed`} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <RulesNote className="mt-3" />
      {error && (
        <p className="mt-3 rounded-xl bg-brick/10 px-3 py-2 text-[12px] font-medium text-brick" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-teal/70 bg-teal px-4 font-bold text-white shadow-md disabled:border-sand disabled:bg-sand disabled:text-bark/50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} {t.addEventSubmit}
      </button>
    </Sheet>
  )
}

/**
 * On an event a traveller added: "Not confirmed yet · 2/5", "It's real" (counts as having been there
 * when the phone is at the event on one of its days), and "Something wrong?".
 */
export function CommunityEventBar({ event }: { event: QuestEvent }) {
  const { t, geo, putCommunityEvent } = useQuest()
  const { session } = useAuth()
  const navigate = useNavigate()
  const here = useLocation()
  const [busy, setBusy] = useState(false)
  const [mine, setMine] = useState(() => confirmedHere().has(event.id))
  const [flagging, setFlagging] = useState(false)
  const c = event.community
  if (!c || c.confirmed) return null
  const isAuthor = !!session && c.authorId === session.user.id

  const confirm = async () => {
    if (!session) return navigate(`/login?next=${encodeURIComponent(here.pathname)}`)
    setBusy(true)
    const n = await confirmCommunityEvent(event.id, geo.status === 'on' ? geo.position : null, geo.accuracyM)
    setBusy(false)
    if (n == null) return
    rememberConfirmed(event.id)
    setMine(true)
    putCommunityEvent({ ...event, community: { ...c, confirms: n, confirmed: n >= EVENT_CONFIRM_AT } })
  }

  return (
    <div className="mt-2.5 rounded-xl border border-dashed border-sun-dark/60 bg-sun/10 px-3 py-2 text-[11px] leading-snug text-bark">
      <div className="flex items-start gap-2">
        <UsersRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sun-dark" />
        <span>
          <span className="font-bold">{t.eventUnconfirmed(c.confirms, EVENT_CONFIRM_AT)}</span> {t.eventUnconfirmedHint}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {isAuthor ? (
          <span className="text-[11px] font-medium text-bark/60">{t.eventYours}</span>
        ) : mine ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-leaf">
            <CircleCheck className="h-3.5 w-3.5" /> {t.eventConfirmedByYou}
          </span>
        ) : (
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="flex min-h-9 items-center gap-1 rounded-lg border-2 border-leaf/60 bg-white px-2.5 text-[11px] font-bold text-leaf disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} {t.eventConfirm}
          </button>
        )}
        <button type="button" onClick={() => setFlagging(true)} className="flex min-h-9 items-center gap-1 text-[11px] font-bold text-bark/60 hover:text-brick">
          <Flag className="h-3.5 w-3.5" /> {t.flagButton}
        </button>
      </div>
      {flagging && <FlagEventSheet event={event} onClose={() => setFlagging(false)} />}
    </div>
  )
}

function FlagEventSheet({ event, onClose }: { event: QuestEvent; onClose: () => void }) {
  const { t, lang } = useQuest()
  const { session } = useAuth()
  const navigate = useNavigate()
  const here = useLocation()
  const [reason, setReason] = useState<EventFlagReason | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const reasons: EventFlagReason[] = ['not_real', 'wrong_time', 'wrong_place', 'cancelled', 'spam']
  return (
    <Sheet title={t.flagEventTitle} closeLabel={t.close} onClose={onClose}>
      {done ? (
        <p className="flex items-start gap-2 rounded-2xl bg-leaf/10 px-3 py-3 text-[13px] font-medium text-leaf" role="status">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> {t.flagThanks}
        </p>
      ) : !session ? (
        <>
          <p className="text-[13px] text-bark/80">{t.flagSignIn}</p>
          <button
            onClick={() => navigate(`/login?next=${encodeURIComponent(here.pathname)}`)}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-teal px-4 font-bold text-white"
          >
            {t.signIn}
          </button>
        </>
      ) : (
        <>
          <p className="text-[13px] font-bold">{event.name[lang]}</p>
          <div className="mt-3 space-y-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={`flex min-h-11 w-full items-center rounded-xl border-2 px-3 text-left text-[13px] font-bold transition ${
                  reason === r ? 'border-brick bg-brick/5 text-brick' : 'border-sand bg-white text-bark hover:border-brick/40'
                }`}
              >
                {t.flagEventReasons[r]}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder={t.flagNotePh}
            className="mt-3 min-h-16 w-full rounded-xl border-2 border-sand bg-white p-3 text-[13px] outline-none focus:border-teal"
          />
          {failed && (
            <p className="mt-2 text-[12px] font-medium text-brick" role="alert">
              {t.addPlaceSubmitError}
            </p>
          )}
          <button
            type="button"
            disabled={!reason || busy}
            onClick={async () => {
              setBusy(true)
              setFailed(false)
              try {
                await flagCommunityEvent(event.id, reason!, note.trim())
                setDone(true)
              } catch {
                setFailed(true)
              } finally {
                setBusy(false)
              }
            }}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brick px-4 font-bold text-white disabled:bg-sand disabled:text-bark/50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.flagSend}
          </button>
        </>
      )}
    </Sheet>
  )
}
