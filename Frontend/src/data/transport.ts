import type { Transport } from '../types'

/**
 * Rough numbers for Hoan Kiem / the Old Quarter. All prices in thousand VND.
 * ⚠ Estimates — review them regularly (fuel, parking and ride-hailing fares change).
 */
export interface Fare {
  seats: number
  /** Flat price covering the first `baseKm`. */
  baseK: number
  baseKm: number
  perKmK: number
}

export interface TransportSpec {
  /** Door-to-door average speed in km/h, off-peak and in rush hour. */
  speedKmh: { normal: number; peak: number }
  /** Fixed minutes per leg: parking / waiting for the driver / finding a drop-off spot. */
  overheadMin: number
  /** Legs shorter than this are walked instead (faster than parking or waiting). */
  minLegM: number
  /** Streets are one-way and winding: multiply street distance by this. */
  detour: number
  /** Allowed inside the weekend walking street. */
  walkingStreetOk: boolean
  /** Ride-hailing fares by vehicle size; the cheapest mix for the group is used. */
  fares?: Fare[]
  /** Surcharge multiplier during rush hour (ride-hailing only). */
  peakFare?: number
  /** Own vehicle: people per vehicle, fuel per km and parking per stop, per vehicle. */
  own?: { seats: number; fuelPerKmK: number; parkingK: number }
  /** Google Maps URL travel mode for the Directions button. */
  mapsMode: 'walking' | 'two-wheeler' | 'driving'
}

export const TRANSPORT: Record<Transport, TransportSpec> = {
  walk: {
    speedKmh: { normal: 4.2, peak: 4.2 },
    overheadMin: 0,
    minLegM: 0,
    detour: 1,
    walkingStreetOk: true,
    mapsMode: 'walking',
  },
  motorbike: {
    speedKmh: { normal: 18, peak: 11 },
    overheadMin: 4,
    minLegM: 450,
    detour: 1.1,
    walkingStreetOk: false,
    own: { seats: 2, fuelPerKmK: 0.6, parkingK: 5 },
    mapsMode: 'two-wheeler',
  },
  grabbike: {
    speedKmh: { normal: 18, peak: 11 },
    overheadMin: 5,
    minLegM: 600,
    detour: 1.1,
    walkingStreetOk: false,
    fares: [{ seats: 1, baseK: 14, baseKm: 2, perKmK: 4.5 }],
    peakFare: 1.2,
    mapsMode: 'two-wheeler',
  },
  car: {
    speedKmh: { normal: 14, peak: 8 },
    overheadMin: 6,
    minLegM: 700,
    detour: 1.25,
    walkingStreetOk: false,
    fares: [
      { seats: 4, baseK: 29, baseKm: 2, perKmK: 10 },
      { seats: 6, baseK: 35, baseKm: 2, perKmK: 13 },
    ],
    peakFare: 1.2,
    mapsMode: 'driving',
  },
}

export const TRANSPORTS: Transport[] = ['walk', 'motorbike', 'grabbike', 'car']

/** Weekday rush hours, as [start, end) in minutes after midnight. */
export const RUSH_HOURS: [number, number][] = [
  [7 * 60, 9 * 60],
  [16 * 60 + 30, 19 * 60],
]

/**
 * Hoan Kiem walking-street zone (lake ring + the Hang Dao → Dong Xuan axis),
 * closed to vehicles from Friday 19:00 to Sunday 24:00.
 * Rough bounding boxes: [south, west, north, east].
 */
export const WALKING_STREET_BOXES: [number, number, number, number][] = [
  [21.0255, 105.8495, 21.0335, 105.8548],
  [21.0335, 105.8495, 21.0385, 105.8525],
]
