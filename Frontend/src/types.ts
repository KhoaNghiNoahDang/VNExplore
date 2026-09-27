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
}

export interface Mission {
  task: L
  item: L
}

export interface Role {
  id: string
  name: L
  intro: L
  /** Use {n} for the number of stops. */
  goal: L
  itemNoun: L
  /** Places that fit this role, best first. */
  favPlaces: string[]
  missions: Record<string, Mission>
  fallback: Mission
  ending: L
  tone: Place['tone']
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
  /** Where the journey began (the traveller's location, or Hoan Kiem Lake). */
  start: LatLng
}
