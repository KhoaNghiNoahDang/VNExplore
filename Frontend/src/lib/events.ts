import { CATEGORY_LABEL } from '../i18n/strings'
import type { EventCategory, Lang, LatLng, Place, QuestEvent, Theme } from '../types'
import { areaAt } from './area'

/**
 * Dated events → stops with a fixed time.
 *
 * Event dates/times in the sheet are Hanoi wall-clock time. Everything here works in Hanoi time
 * whatever the phone's time zone is (visitors often keep their home zone), so a 20:00 concert is
 * 20:00 in Hanoi for everyone.
 */

const OFFSET = 7 * 3_600_000 // Vietnam has no daylight saving time
const DAY = 86_400_000

/** "YYYY-MM-DD" of an instant, in Hanoi. */
export const hanoiDay = (ms: number) => new Date(ms + OFFSET).toISOString().slice(0, 10)
/** "HH:MM" of an instant, in Hanoi. */
export const hanoiClock = (ms: number) => new Date(ms + OFFSET).toISOString().slice(11, 16)
/** Instant of a Hanoi date + "HH:MM". */
export function hanoiMs(day: string, hhmm: string): number {
  const [y, m, d] = day.split('-').map(Number)
  const [h, mi] = hhmm.split(':').map(Number)
  return Date.UTC(y, m - 1, d, h, mi) - OFFSET
}
const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay()
const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + DAY).toISOString().slice(0, 10)

/** Stop ids for event sittings: "ev:<eventId>@<YYYY-MM-DD>T<HHMM>". */
export const isEventId = (id: string) => id.startsWith('ev:')
const ID_RE = /^ev:([a-z0-9-]+)@(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})$/

const THEMES: Record<EventCategory, Theme[]> = {
  music: ['fun', 'culture'],
  theatre: ['culture', 'fun'],
  film: ['culture', 'rainy'],
  exhibition: ['culture', 'photo'],
  workshop: ['culture', 'rainy'],
  talk: ['culture'],
  market: ['food', 'fun'],
  festival: ['fun', 'photo'],
  other: ['fun'],
}
const TONE: Record<EventCategory, Place['tone']> = {
  music: 'butter',
  theatre: 'brick',
  film: 'teal',
  exhibition: 'leaf',
  workshop: 'leaf',
  talk: 'teal',
  market: 'brick',
  festival: 'butter',
  other: 'teal',
}

/** Imported events have no write-up: describe them from what we know. */
function blurbOf(ev: QuestEvent): Place['blurb'] {
  if (ev.blurb.vi) return ev.blurb
  const at = (lang: Lang) => ev.venue || ev.address || (lang === 'vi' ? 'Hà Nội' : 'Hanoi')
  return {
    vi: `${CATEGORY_LABEL.vi[ev.category]} tại ${at('vi')}.${ev.ticket ? ' Cần đăng ký hoặc mua vé trước.' : ''}`,
    en: `${CATEGORY_LABEL.en[ev.category]} at ${at('en')}.${ev.ticket ? ' Register or buy a ticket in advance.' : ''}`,
  }
}

/** One sitting of an event as a quest stop. `time` is the HH:MM it starts (open events: when doors open). */
function sitting(ev: QuestEvent, day: string, time: string): Place {
  const startMs = hanoiMs(day, time)
  const endMs = ev.kind === 'open' && ev.endTime ? hanoiMs(day, ev.endTime) : startMs + ev.visitMin * 60_000
  const empty = { vi: '', en: '' }
  return {
    id: `ev:${ev.id}@${day}T${time.replace(':', '')}`,
    // Elsewhere in the city counts as the nearest planning area (for distance weighting).
    area: ev.area === 'hanoi' ? (areaAt(ev) ?? 'hoan-kiem') : ev.area,
    kind: 'fun',
    depth: 'quick',
    openingHours: null,
    priceCheckedOn: null,
    name: ev.name,
    nameVi: ev.name.vi,
    lat: ev.lat,
    lng: ev.lng,
    priceMin: ev.priceMin ?? 0,
    priceMax: ev.priceMax ?? 0,
    visitMin: ev.visitMin,
    themes: THEMES[ev.category],
    tags: ev.priceMax === 0 ? ['free'] : [],
    blurb: blurbOf(ev),
    tone: TONE[ev.category],
    story: empty,
    why: empty,
    photoTip: empty,
    etiquette: empty,
    challenge: null,
    event: {
      eventId: ev.id,
      kind: ev.kind,
      category: ev.category,
      adult: ev.adult,
      startMs,
      endMs,
      url: ev.url,
      venue: ev.venue,
      address: ev.address,
      host: ev.host,
      ticket: ev.ticket,
      priceKnown: ev.priceMin !== null,
      placeId: ev.placeId,
      source: ev.source,
      timeConfirmed: ev.timeConfirmed !== false,
    },
  }
}

/** The stop for an "ev:…" id (a saved quest or journey), or null if the event is gone. */
export function eventStopById(id: string, events: QuestEvent[]): Place | null {
  const m = ID_RE.exec(id)
  if (!m) return null
  const ev = events.find((e) => e.id === m[1])
  return ev ? sitting(ev, m[2], `${m[3]}:${m[4]}`) : null
}

/** Every sitting of an event that starts on a Hanoi day touched by [fromMs, toMs]. */
function sittingsBetween(ev: QuestEvent, fromMs: number, toMs: number): Place[] {
  const out: Place[] = []
  const last = hanoiDay(toMs)
  for (let day = hanoiDay(fromMs); day <= last; day = nextDay(day)) {
    if (day < ev.fromDate || day > ev.toDate) continue
    if (ev.weekdays.length && !ev.weekdays.includes(weekdayOf(day))) continue
    const times = ev.kind === 'open' ? ev.times.slice(0, 1) : ev.times
    for (const time of times) out.push(sitting(ev, day, time))
  }
  return out
}

/**
 * Can a traveller out between `fromMs` and `toMs` catch this sitting?
 * Shows: there's time to get there from the start (at least 10 min) and it starts 30 min before the trip ends.
 * Open events: open for at least a full visit once you can be there.
 */
function fits(stop: Place, fromMs: number, toMs: number, reachMin: number): boolean {
  const e = stop.event!
  const earliest = fromMs + Math.max(10, reachMin) * 60_000
  if (e.kind === 'show') return e.startMs >= earliest && e.startMs <= toMs - 30 * 60_000
  const overlap = Math.min(toMs, e.endMs) - Math.max(earliest, e.startMs)
  return overlap >= stop.visitMin * 60_000
}

export interface EventOption {
  event: QuestEvent
  /** Sittings inside the trip, earliest first (several for shows with many performances). */
  sittings: Place[]
}

/**
 * Events anywhere in Hanoi that fit a trip from `fromMs` to `toMs`, soonest first.
 * `reachMin` = minutes to get from the trip's start to a point (far events drop out on their own).
 */
export function eventsInWindow(
  events: QuestEvent[],
  fromMs: number,
  toMs: number,
  reachMin: (p: LatLng) => number = () => 0,
): EventOption[] {
  return events
    .map((event) => {
      const reach = reachMin(event)
      return { event, sittings: sittingsBetween(event, fromMs, toMs).filter((s) => fits(s, fromMs, toMs, reach)) }
    })
    .filter((o) => o.sittings.length)
    .sort((a, b) => a.sittings[0].event!.startMs - b.sittings[0].event!.startMs)
}

const DAY_NAMES: Record<Lang, string[]> = {
  vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}

/** "T7 3/10 · 20:00–22:30" (always Hanoi time). */
export function eventWhen(stop: Place, lang: Lang): string {
  const e = stop.event!
  const day = hanoiDay(e.startMs)
  const [, m, d] = day.split('-').map(Number)
  const date = lang === 'vi' ? `${DAY_NAMES.vi[weekdayOf(day)]} ${d}/${m}` : `${DAY_NAMES.en[weekdayOf(day)]} ${d}/${m}`
  return `${date} · ${hanoiClock(e.startMs)}–${hanoiClock(e.endMs)}`
}

/** "hoguomopera.vn" — shown next to the link so travellers know where they're going. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
