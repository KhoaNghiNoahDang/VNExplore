import type { LatLng, Place } from '../types'
import placesJson from './generated/places.json'

/** Default starting point: the northern shore of Hoan Kiem Lake. */
export const START: LatLng = { lat: 21.0296, lng: 105.8526 }

/**
 * Approved places, exported from Data/sheets/places.csv by Data/scripts/export_app.mjs.
 * Edit the sheet (not this file), then re-run the export.
 * Prices are per person, in thousand VND.
 */
// Shape is checked by export_app.mjs, so the cast is safe.
export const PLACES = placesJson as unknown as Place[]
