import { useCallback, useEffect, useRef, useState } from 'react'
import type { LatLng } from '../types'
import { distanceM } from './travel'

export type GeoStatus = 'off' | 'asking' | 'on' | 'far' | 'denied' | 'unavailable'

export interface Geo {
  status: GeoStatus
  /** Latest fix (also set when 'far', so the UI can say how far). */
  position: LatLng | null
  accuracyM: number | null
}

/** Beyond this from the lake we assume the traveller isn't in central Hanoi yet. */
const MAX_FROM_CENTER_M = 15000

/**
 * Browser geolocation (free, needs HTTPS and the user's permission).
 * `enabled` is remembered, so after a reload tracking resumes without a new prompt.
 */
export function useGeolocation(enabled: boolean, center: LatLng) {
  const [geo, setGeo] = useState<Geo>({ status: 'off', position: null, accuracyM: null })
  const watchId = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
  }, [])

  useEffect(() => {
    if (!enabled) {
      stop()
      setGeo({ status: 'off', position: null, accuracyM: null })
      return
    }
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'unavailable', position: null, accuracyM: null })
      return
    }
    setGeo((g) => (g.status === 'on' ? g : { ...g, status: 'asking' }))
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setGeo({
          status: distanceM(p, center) > MAX_FROM_CENTER_M ? 'far' : 'on',
          position: p,
          accuracyM: pos.coords.accuracy,
        })
      },
      (err) =>
        setGeo({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable', position: null, accuracyM: null }),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    )
    return stop
  }, [enabled, center, stop])

  return geo
}
