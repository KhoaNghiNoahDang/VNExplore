import { PLACES } from '../data/places'
import type { Place } from '../types'

/** Backend base URL (the Render service). Empty → use local mock data. */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export async function fetchPlaces(): Promise<Place[]> {
  if (!API_URL) return PLACES
  try {
    const res = await fetch(`${API_URL}/places`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as Place[]
  } catch (err) {
    console.warn('Falling back to mock places:', err)
    return PLACES
  }
}
