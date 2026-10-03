export type Lang = 'en' | 'vi'

/** Text in both languages. */
export type L = Record<Lang, string>

export type Mode = 'explore' | 'listen' | 'easy'

export type Theme = 'culture' | 'food' | 'rainy' | 'history' | 'photo' | 'fun'

/** Hoan Kiem (Old Quarter) or Ba Vi (mountains, ~50 km west). A route stays in one area. */
export type Area = 'hoan-kiem' | 'ba-vi'

export type PlaceTag =
  | 'iconic'
  | 'groups'
  | 'quiet'
  | 'cultural'
  | 'indoor'
  | 'localFood'
  | 'free'
  | 'history'
  | 'photo'
  | 'lively'

export type Budget = 'low' | 'any'

/** walk · own motorbike · ride-hailing bike (GrabBike, xe ôm) · taxi / GrabCar */
export type Transport = 'walk' | 'motorbike' | 'grabbike' | 'car'

/** How one leg between two points was estimated. */
export interface Leg {
  /** What the traveller asked for. */
  requested: Transport
  /** What the leg actually uses (e.g. forced to walk inside the weekend walking street). */
  transport: Transport
  distanceM: number
  minutes: number
  /** Thousand VND for the whole group (fare, fuel, parking). */
  costK: number
  vehicles: number
  peak: boolean
  note?: 'short' | 'walkingStreet' | 'parkOutside'
}

export interface LatLng {
  lat: number
  lng: number
}

/** "Find a real detail" challenge used by Explore mode. */
export interface Challenge {
  prompt: L
  options: L[]
  answer: number
  hint: L
}

export interface Place extends LatLng {
  id: string
  area: Area
  kind: 'sight' | 'food' | 'fun'
  /** full: story + challenge (all modes). quick: short intro only (food / fun stops). */
  depth: 'full' | 'quick'
  /** OpenStreetMap opening_hours syntax, when known. */
  openingHours?: string | null
  /** ISO date when the displayed price was last verified. */
  priceCheckedOn?: string | null
  name: L
  /** Original Vietnamese name, always shown under the main name. */
  nameVi: string
  /** Price per person in thousand VND. */
  priceMin: number
  priceMax: number
  /** Suggested time spent at the place, in minutes. */
  visitMin: number
  themes: Theme[]
  tags: PlaceTag[]
  blurb: L
  tone: 'brick' | 'butter' | 'teal' | 'leaf'
  /** The real story, narrated on arrival. Empty for quick places. */
  story: L
  why: L
  photoTip: L
  etiquette: L
  /** null for quick places. */
  challenge: Challenge | null
  /** Set when this stop is one sitting of a dated event (a synthetic place, id "ev:…"). */
  event?: EventStop
  /** Where the information comes from: URLs or names. */
  sources?: string[]
  /** Shown prominently, e.g. workshops: "contact them before you go". */
  notice?: L | null
  /** Phone number to call (digits, optional leading +). */
  phone?: string | null
}

export type EventCategory = 'music' | 'theatre' | 'film' | 'exhibition' | 'workshop' | 'talk' | 'market' | 'festival' | 'other'

/** A dated event from Data/sheets/events.csv. Dates and times are Hanoi local time. */
export interface QuestEvent extends LatLng {
  id: string
  /** 'hanoi' = elsewhere in the city (outside the two planning areas). */
  area: Area | 'hanoi'
  /** show: be there before a start time · open: drop in any time between start and end. */
  kind: 'show' | 'open'
  category: EventCategory
  /** Bar / club (alcohol, 18+). */
  adult: boolean
  name: L
  /** May be empty (imported events): the app describes it from venue + time. */
  blurb: L
  /** A place in the catalogue the event takes place at, if any. */
  placeId: string | null
  venue: string
  address: string
  /** YYYY-MM-DD, inclusive. */
  fromDate: string
  toDate: string
  /** 0 = Sunday … 6 = Saturday; empty = every day. */
  weekdays: number[]
  /** HH:MM start times (several for shows with more than one performance a day). */
  times: string[]
  /** HH:MM; open events only. */
  endTime: string | null
  /** Show length, or a suggested visit for open events. */
  visitMin: number
  /** Thousand VND per person; null = unknown (see the event page). */
  priceMin: number | null
  priceMax: number | null
  ticket: boolean
  url: string | null
  host: string
  source: string
  /** false = the source gives no time; the shown time is an estimate. */
  timeConfirmed: boolean
}

/** One sitting of an event, attached to the synthetic stop that represents it in a quest. */
export interface EventStop {
  eventId: string
  kind: QuestEvent['kind']
  category: EventCategory
  adult: boolean
  /** Instants (ms). For shows: the performance; for open events: when the doors are open. */
  startMs: number
  endMs: number
  url: string | null
  venue: string
  address: string
  host: string
  ticket: boolean
  priceKnown: boolean
  placeId: string | null
  source: string
  timeConfirmed: boolean
}

export interface Mission {
  task: L
  item: L
}

export interface RoleTemplate extends Mission {
  kind: 'sight' | 'food' | 'fun' | 'event'
  /** Preferred at places with this theme or tag (e.g. "cultural" for temples); null = any place. */
  tag: string | null
}

export interface Role {
  id: string
  /** 'any', or the one area this role is written for (Ba Vì roles). */
  area: 'any' | Area
  /** Themes, kinds of stop and event categories the role fits — used to suggest it for a route. */
  tags: string[]
  name: L
  intro: L
  /** Use {n} for the number of stops. */
  goal: L
  itemNoun: L
  /** Places that fit this role, best first. */
  favPlaces: string[]
  missions: Record<string, Mission>
  /** Missions by kind of stop, in the role's voice. "{place}" is replaced by the stop's name. */
  templates: RoleTemplate[]
  fallback: Mission
  ending: L
  tone: Place['tone']
  /** Not reviewed yet (only shown when running locally). */
  draft?: boolean
}

export interface Intent {
  text: string
  themes: Theme[]
  people: number
  budget: Budget
  hours: number
  hoursIsDefault: boolean
  transport: Transport
  transportIsDefault: boolean
  /** Asked for by name ("Ba Vì"); null = decide from where the traveller is. */
  area?: Area | null
  /** Extra words for matching places (dishes the language model picked out). */
  extra?: string
  /** One-line restatement from the language model, shown as "Here's what I understood". */
  summary?: L | null
  /** Short acknowledgement and one useful trip-specific suggestion. */
  reply?: L | null
}

export interface Journey {
  stopIds: string[]
  /** placeId → mode the traveller was in when they arrived (the stamp). */
  arrived: Record<string, Mode>
  /** placeIds whose mission was completed (item + gold seal). */
  items: string[]
  startedAt: number
  /** Where the journey began (the traveller's real location, or the start point they picked). */
  start: LatLng
}
