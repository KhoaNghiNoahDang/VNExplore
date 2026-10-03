import { useStart } from './NeedStart'
import { useState } from 'react'
import { CalendarClock, Check, ChevronDown, ExternalLink, Hourglass, MapPin, Plus, Ticket, TriangleAlert, Users, Wallet } from 'lucide-react'
import { CATEGORY_LABEL, TRANSPORT_INFO } from '../i18n/strings'
import { distance, moneyRange } from '../lib/format'
import { eventWhen, hanoiClock, linkHost, type EventOption } from '../lib/events'
import { estimateLeg } from '../lib/travel'
import { useQuest } from '../store/QuestContext'
import type { Lang, Place } from '../types'
import PlaceThumb from './PlaceThumb'
import TransportIcon from './TransportIcon'

/** "Event details ↗" — opens the organiser's page in a new tab. */
export function EventLink({ url, className = '' }: { url: string; className?: string }) {
  const { t } = useQuest()
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={t.eventOpensSite(linkHost(url))}
      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-white px-3 text-xs font-bold text-ink hover:bg-ink/5 ${className}`}
    >
      {t.eventDetails} <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
    </a>
  )
}

/** Price line for an event stop: known price, free, or "see the event page". */
export function eventPrice(place: Place, people: number, lang: Lang, t: ReturnType<typeof useQuest>['t']): string {
  const e = place.event!
  if (!e.priceKnown) return t.eventPriceOnPage
  if (place.priceMax === 0) return moneyRange(0, 0, lang)
  return `${moneyRange(place.priceMin * people, place.priceMax * people, lang)} ${t.forN(people)}`
}

/** Small badges: fixed time / drop in, ticket, 18+. */
export function EventBadges({ place }: { place: Place }) {
  const { t, lang } = useQuest()
  const e = place.event!
  return (
    <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
      <span className="rounded-full bg-brick/10 px-2 py-0.5 text-brick">{CATEGORY_LABEL[lang][e.category]}</span>
      <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-bark">{e.kind === 'show' ? t.eventFixed : t.eventDropIn}</span>
      {!e.timeConfirmed && <span className="rounded-full bg-sun/50 px-2 py-0.5 text-bark">{t.eventTimeEstimate}</span>}
      {e.ticket && (
        <span className="flex items-center gap-1 rounded-full bg-butter/70 px-2 py-0.5 text-bark">
          <Ticket className="h-3 w-3" /> {t.eventTicket}
        </span>
      )}
      {e.adult && <span className="rounded-full bg-ink px-2 py-0.5 text-white">{t.eventAdult}</span>}
    </div>
  )
}

function EventCard({ option, people }: { option: EventOption; people: number }) {
  const { t, lang, travel, selected, toggle } = useQuest()
  const start = useStart()
  const [expanded, setExpanded] = useState(false)
  const picked = option.sittings.find((s) => selected.includes(s.id))
  const [chosenId, setChosenId] = useState(picked?.id ?? option.sittings[0].id)
  const place = picked ?? option.sittings.find((s) => s.id === chosenId) ?? option.sittings[0]
  const added = !!picked
  const leg = estimateLeg(start, place, travel.transport, new Date(travel.departAt ?? Date.now()), people)

  // Switching to another performance of an event that's already in the plan moves it.
  const choose = (s: Place) => {
    setChosenId(s.id)
    if (picked && picked.id !== s.id) {
      toggle(picked.id)
      toggle(s.id)
    }
  }

  return (
    <article
      className={`rounded-[22px] border bg-white p-3.5 transition-[border-color,box-shadow] duration-200 ${
        added ? 'border-teal/45 shadow-[0_10px_28px_-22px_rgba(47,138,132,0.9)]' : 'border-sand/90'
      }`}
    >
      <div className="flex items-start gap-3">
        <PlaceThumb place={place} className="h-16 w-16" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[14px] font-extrabold leading-snug">{place.name[lang]}</h3>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-brick">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" /> {eventWhen(place, lang)}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-bark/80">
            <TransportIcon transport={leg.transport} className="h-3 w-3 shrink-0 text-teal" strokeWidth={2.25} />
            <span className="truncate">
              {place.event!.venue ? `${place.event!.venue} · ` : ''}
              {t.legLine(distance(leg.distanceM), leg.minutes, TRANSPORT_INFO[lang][leg.transport].short)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-2.5">
        <EventBadges place={place} />
      </div>

      <p className={`mt-2 text-[12px] leading-relaxed text-bark ${expanded ? '' : 'line-clamp-2'}`}>{place.blurb[lang]}</p>
      {place.blurb[lang].length > 90 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-teal"
        >
          {expanded ? t.showLess : t.showMore}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
      <p className="mt-1.5 text-[11px] font-bold text-bark/75">{eventPrice(place, people, lang, t)}</p>

      {option.sittings.length > 1 && (
        <div className="mt-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-bark/55">{t.eventOtherTimes}</div>
          <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup">
            {option.sittings.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === place.id}
                onClick={() => choose(s)}
                className={`min-h-9 rounded-lg px-2.5 text-[11px] font-bold transition ${
                  s.id === place.id ? 'bg-ink text-white' : 'border border-sand bg-white text-bark hover:border-ink'
                }`}
              >
                {hanoiClock(s.event!.startMs)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {place.event!.url && <EventLink url={place.event!.url} className="shrink-0" />}
        <button
          onClick={() => toggle(place.id)}
          aria-pressed={added}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${
            added ? 'bg-teal text-white hover:bg-teal/90' : 'bg-ink text-white hover:bg-ink/90'
          }`}
        >
          {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {added ? t.added : t.add}
        </button>
      </div>
    </article>
  )
}

/** "Events during your trip" — the dated events a traveller can add as fixed-time stops. */
export function EventsSection({ people }: { people: number }) {
  const { t, eventOptions, tripWindow, selected } = useQuest()
  const [all, setAll] = useState(false)
  // Events already in the plan stay visible even when the list is folded.
  const shown = all
    ? eventOptions
    : eventOptions.filter((o, i) => i < 3 || o.sittings.some((s) => selected.includes(s.id)))
  const hidden = eventOptions.length - shown.length

  return (
    <section aria-labelledby="events-title" className="space-y-3">
      <div>
        <h2 id="events-title" className="flex items-center gap-2 text-[15px] font-extrabold">
          <Ticket className="h-4 w-4 text-brick" /> {t.eventsTitle}
          {eventOptions.length > 0 && (
            <span className="rounded-full bg-brick/10 px-2 py-0.5 text-[11px] text-brick">{eventOptions.length}</span>
          )}
        </h2>
        <p className="mt-0.5 text-[11px] font-medium text-bark/60">
          {t.eventsSub(hanoiClock(tripWindow.from), hanoiClock(tripWindow.to))}
        </p>
      </div>
      {eventOptions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand px-3 py-3 text-[12px] text-bark/70">{t.eventsNone}</p>
      ) : (
        <>
          {shown.map((o) => (
            <EventCard key={o.event.id} option={o} people={people} />
          ))}
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setAll(true)}
              className="flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-sand bg-white text-xs font-bold text-teal hover:border-teal"
            >
              {t.eventsMore(hidden)} <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
    </section>
  )
}

/** Under an event stop in the route: when it is, and any waiting or lateness. */
export function EventStopMeta({ place, wait, late }: { place: Place; wait: number; late: number }) {
  const { t, lang } = useQuest()
  return (
    <div className="mt-0.5 space-y-0.5 text-[10px] font-bold">
      <div className="flex items-center gap-1 text-brick">
        <CalendarClock className="h-3 w-3 shrink-0" /> {eventWhen(place, lang)}
      </div>
      {late > 0 ? (
        <div className="flex items-center gap-1 text-brick">
          <TriangleAlert className="h-3 w-3 shrink-0" /> {t.eventLate(late)}
        </div>
      ) : (
        wait >= 5 && (
          <div className="flex items-center gap-1 text-bark/70">
            <Hourglass className="h-3 w-3 shrink-0" /> {t.eventWait(wait)}
          </div>
        )
      )}
    </div>
  )
}

/** Event facts at a stop: when, where, who, price — and the organiser's page. */
export function EventPanel({ place, people }: { place: Place; people: number }) {
  const { t, lang, places } = useQuest()
  const e = place.event!
  const host = places.find((p) => p.id === e.placeId)
  const rows: { icon: typeof Ticket; title: string; body: string }[] = [
    {
      icon: CalendarClock,
      title: t.eventWhen,
      body: `${eventWhen(place, lang)} · ${e.timeConfirmed ? (e.kind === 'show' ? t.eventShow : t.eventOpenWindow) : t.eventTimeEstimateNote}`,
    },
    {
      icon: MapPin,
      title: t.eventVenue,
      body: [e.venue, host ? t.eventNearPlace(host.name[lang]) : '', e.address].filter(Boolean).join(' · '),
    },
    { icon: Users, title: t.eventHost, body: e.host === e.venue ? '' : e.host },
    { icon: Wallet, title: t.priceRef, body: [eventPrice(place, people, lang, t), e.ticket ? t.eventTicket : ''].filter(Boolean).join(' · ') },
  ]
  return (
    <div className="rounded-2xl border-2 border-brick/25 bg-white">
      <div className="border-b border-sand px-3 pb-2.5 pt-3">
        <EventBadges place={place} />
      </div>
      <div className="divide-y divide-sand">
        {rows
          .filter((r) => r.body)
          .map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3 p-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brick" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold">{title}</div>
                <p className="text-[12px] leading-snug opacity-80">{body}</p>
              </div>
            </div>
          ))}
      </div>
      {e.url && (
        <div className="px-3 pb-3">
          <EventLink url={e.url} className="w-full" />
          <p className="mt-1.5 text-center text-[10px] text-bark/55">{t.eventOpensSite(linkHost(e.url))}</p>
        </div>
      )}
      {e.source && <p className="px-3 pb-3 text-[10px] leading-relaxed text-bark/60">{t.eventSource(e.source)}</p>}
    </div>
  )
}
