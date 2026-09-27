import type { Area, LatLng } from '../types'
import { AREA_START } from './area'

/**
 * Hourly forecast from Open-Meteo (free, no key, CORS-enabled), cached for 30 minutes per area.
 * Used to nudge plans: rain → indoor places, midday heat → shade and air-conditioning.
 */
export interface Weather {
  tempC: number
  /** Chance of rain in that hour, 0–100. */
  rainProb: number
  code: number
  rainy: boolean
  hot: boolean
  hour: number
}

interface Series {
  fetchedAt: number
  times: number[] // ms
  temp: number[]
  rain: number[]
  code: number[]
}

const TTL = 30 * 60_000
const KEY = 'vnexplore:weather:'
const mem = new Map<Area, Promise<Series | null>>()

// WMO weather codes: drizzle, rain, showers, thunderstorms.
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99])

function readCache(area: Area): Series | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY + area) ?? 'null') as Series | null
    return s && Date.now() - s.fetchedAt < TTL ? s : null
  } catch {
    return null
  }
}

async function load(p: LatLng): Promise<Series | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(3)}&longitude=${p.lng.toFixed(3)}` +
    '&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Asia%2FBangkok&forecast_days=3&timeformat=unixtime'
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return null
    const d = await r.json()
    const h = d.hourly
    if (!h?.time?.length) return null
    return {
      fetchedAt: Date.now(),
      times: h.time.map((s: number) => s * 1000),
      temp: h.temperature_2m,
      rain: h.precipitation_probability ?? h.time.map(() => 0),
      code: h.weather_code,
    }
  } catch {
    return null
  }
}

export function loadSeries(area: Area): Promise<Series | null> {
  const cached = readCache(area)
  if (cached) return Promise.resolve(cached)
  if (!mem.has(area)) {
    const p = load(AREA_START[area]).then((s) => {
      if (s) {
        try {
          localStorage.setItem(KEY + area, JSON.stringify(s))
        } catch {
          /* ignore */
        }
      } else mem.delete(area) // retry next time
      return s
    })
    mem.set(area, p)
  }
  return mem.get(area)!
}

/** The forecast hour closest to `at` (null if outside the forecast). */
export function weatherAt(s: Series | null, at: Date): Weather | null {
  if (!s) return null
  const t = at.getTime()
  let best = -1
  for (let i = 0; i < s.times.length; i++) if (Math.abs(s.times[i] - t) <= 45 * 60_000) best = i
  if (best < 0) return null
  const tempC = Math.round(s.temp[best])
  const rainProb = s.rain[best] ?? 0
  const code = s.code[best] ?? 0
  // Light drizzle (codes 51–57) only counts when rain is also likely; real rain and storms always do.
  const rainy = rainProb >= 60 || (RAIN_CODES.has(code) && (code >= 61 || rainProb >= 50))
  return { tempC, rainProb, code, rainy, hot: tempC >= 33, hour: at.getHours() }
}
