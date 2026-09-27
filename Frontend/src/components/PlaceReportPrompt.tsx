import { useState } from 'react'
import {
  BadgeDollarSign,
  CalendarClock,
  CircleCheck,
  Clock3,
  DoorClosed,
  MessageSquareText,
  Send,
  Sparkles,
} from 'lucide-react'
import { submitPlaceReport, type ClosedState, type PlaceReportType } from '../lib/placeReports'
import { useQuest } from '../store/QuestContext'
import type { Lang, Place } from '../types'
import Sheet from './Sheet'

type PromptState = 'visible' | 'dismissed' | 'submitted'

const fieldClass =
  'mt-1 min-h-11 w-full rounded-xl border-2 border-sand bg-white px-3 text-[14px] text-ink outline-none transition placeholder:text-ink/35 focus:border-teal'

function readState(key: string): PromptState {
  try {
    const value = localStorage.getItem(key)
    return value === 'dismissed' || value === 'submitted' ? value : 'visible'
  } catch {
    return 'visible'
  }
}

function newReportId(): string {
  return crypto.randomUUID()
}

export default function PlaceReportPrompt({ place, journeyStartedAt }: { place: Place; journeyStartedAt: number }) {
  const { t, lang } = useQuest()
  const storageKey = `vnexplore:place-report:v1:${journeyStartedAt}:${place.id}`
  const [state, setState] = useState<PromptState>(() => readState(storageKey))
  const [open, setOpen] = useState(false)

  const remember = (next: PromptState) => {
    setState(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      /* Private browsing/storage unavailable: keep the in-memory state. */
    }
  }

  if (state === 'dismissed') return null
  if (state === 'submitted') {
    return (
      <div className="flex items-start gap-2 rounded-2xl bg-leaf/10 px-3 py-2.5 text-[12px] font-medium text-leaf" role="status">
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t.placeReportThanks}</span>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-2xl border border-sand bg-butter/35 p-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold">{t.placeReportPromptTitle}</div>
            <p className="mt-0.5 text-[12px] leading-snug text-bark">{t.placeReportPromptBody}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setOpen(true)}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-teal bg-white px-3 text-[12px] font-bold text-teal transition hover:bg-teal/5 active:scale-[.98]"
          >
            <MessageSquareText className="h-4 w-4" /> {t.placeReportAction}
          </button>
          <button
            onClick={() => remember('dismissed')}
            className="min-h-11 rounded-xl px-3 text-[12px] font-bold text-bark/70 hover:bg-white/70"
          >
            {t.placeReportNotNow}
          </button>
        </div>
      </div>

      {open && (
        <Sheet title={t.placeReportSheetTitle} closeLabel={t.close} onClose={() => setOpen(false)}>
          <ReportForm
            place={place}
            lang={lang}
            onSubmitted={() => {
              remember('submitted')
              setOpen(false)
            }}
          />
        </Sheet>
      )}
    </>
  )
}

function ReportForm({ place, lang, onSubmitted }: { place: Place; lang: Lang; onSubmitted: () => void }) {
  const { t } = useQuest()
  const [type, setType] = useState<PlaceReportType | null>(null)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [openTime, setOpenTime] = useState('')
  const [closeTime, setCloseTime] = useState('')
  const [visitMin, setVisitMin] = useState('')
  const [closedState, setClosedState] = useState<ClosedState | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [clientReportId] = useState(newReportId)

  const options: { type: PlaceReportType; label: string; icon: typeof BadgeDollarSign }[] = [
    { type: 'price', label: t.placeReportTypes.price, icon: BadgeDollarSign },
    { type: 'opening_hours', label: t.placeReportTypes.openingHours, icon: CalendarClock },
    { type: 'visit_time', label: t.placeReportTypes.visitTime, icon: Clock3 },
    { type: 'closed', label: t.placeReportTypes.closed, icon: DoorClosed },
    { type: 'other', label: t.placeReportTypes.other, icon: MessageSquareText },
  ]

  const submit = async () => {
    setError('')
    if (!type) {
      setError(t.placeReportChooseType)
      return
    }
    const minVnd = priceMin ? Number(priceMin) : null
    const maxVnd = priceMax ? Number(priceMax) : null
    if (type === 'price' && minVnd == null && maxVnd == null) return setError(t.placeReportPriceError)
    if (minVnd != null && maxVnd != null && maxVnd < minVnd) return setError(t.placeReportRangeError)
    if (type === 'opening_hours' && (!openTime || !closeTime)) return setError(t.placeReportHoursError)
    if (type === 'visit_time' && (!visitMin || Number(visitMin) < 1)) return setError(t.placeReportVisitError)
    if (type === 'closed' && !closedState) return setError(t.placeReportClosedError)
    if (type === 'other' && !note.trim()) return setError(t.placeReportNoteError)

    setSubmitting(true)
    try {
      await submitPlaceReport({
        clientReportId,
        placeId: place.id,
        reportType: type,
        priceMinK: minVnd == null ? null : Math.round(minVnd / 1000),
        priceMaxK: maxVnd == null ? null : Math.round(maxVnd / 1000),
        openTime: openTime || null,
        closeTime: closeTime || null,
        visitMin: visitMin ? Number(visitMin) : null,
        closedState,
        note: note.trim() || null,
        observedAt: new Date().toISOString(),
        language: lang,
      })
      onSubmitted()
    } catch {
      setError(t.placeReportSubmitError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-bark">{t.placeReportQuestion}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {options.map(({ type: value, label, icon: Icon }, i) => (
          <button
            key={value}
            type="button"
            data-autofocus={i === 0 ? '' : undefined}
            aria-pressed={type === value}
            onClick={() => {
              setType(value)
              setError('')
            }}
            className={`flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 text-left text-[12px] font-bold transition ${
              type === value ? 'border-teal bg-teal/10 text-teal' : 'border-sand bg-white text-bark hover:border-teal/40'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" /> {label}
          </button>
        ))}
      </div>

      {type && (
        <div className="mt-5 border-t border-sand pt-4">
          {type === 'price' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[12px] font-bold text-ink/80">
                {t.placeReportPriceMin}
                <input className={fieldClass} type="number" min="0" step="1000" inputMode="numeric" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="30000" />
              </label>
              <label className="text-[12px] font-bold text-ink/80">
                {t.placeReportPriceMax}
                <input className={fieldClass} type="number" min="0" step="1000" inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="50000" />
              </label>
            </div>
          )}

          {type === 'opening_hours' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[12px] font-bold text-ink/80">
                {t.placeReportOpenTime}
                <input className={fieldClass} type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
              </label>
              <label className="text-[12px] font-bold text-ink/80">
                {t.placeReportCloseTime}
                <input className={fieldClass} type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
              </label>
            </div>
          )}

          {type === 'visit_time' && (
            <label className="block text-[12px] font-bold text-ink/80">
              {t.placeReportVisitMinutes}
              <input className={fieldClass} type="number" min="1" max="600" inputMode="numeric" value={visitMin} onChange={(e) => setVisitMin(e.target.value)} placeholder="30" />
            </label>
          )}

          {type === 'closed' && (
            <fieldset>
              <legend className="text-[12px] font-bold text-ink/80">{t.placeReportClosedLabel}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(t.placeReportClosedStates) as ClosedState[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={closedState === value}
                    onClick={() => setClosedState(value)}
                    className={`min-h-11 rounded-xl border-2 px-2 text-[12px] font-bold ${
                      closedState === value ? 'border-brick bg-brick/10 text-brick' : 'border-sand bg-white text-bark'
                    }`}
                  >
                    {t.placeReportClosedStates[value]}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <label className="mt-4 block text-[12px] font-bold text-ink/80">
            {type === 'other' ? t.placeReportNote : t.placeReportExtraNote}
            <textarea
              className={`${fieldClass} min-h-24 py-3 leading-relaxed`}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.placeReportNotePlaceholder}
            />
            <span className="mt-1 block text-right text-[10px] font-medium text-bark/60">{note.length}/300</span>
          </label>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-bark/70">{t.placeReportReviewNote}</p>
      {error && (
        <p className="mt-3 rounded-xl bg-brick/10 px-3 py-2 text-[12px] font-medium text-brick" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={!type || submitting}
        onClick={submit}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-teal/70 bg-teal px-4 font-bold text-white shadow-md transition active:translate-y-0.5 active:border-b-0 disabled:border-sand disabled:bg-sand disabled:text-bark/50 disabled:shadow-none"
      >
        <Send className="h-4 w-4" /> {submitting ? t.placeReportSubmitting : t.placeReportSubmit}
      </button>
    </div>
  )
}
