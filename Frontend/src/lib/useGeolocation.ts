import { useCallback, useEffect, useRef, useState } from 'react'
import type { LatLng } from '../types'

export type GeoStatus = 'off' | 'asking' | 'on' | 'denied' | 'unavailable'

export interface Geo {
  status: GeoStatus
  /** Latest real fix from the device. */
  position: LatLng | null
  accuracyM: number | null
}


/**
 * Browser geolocation (free, needs HTTPS and the user's permission).
 * `enabled` is remembered, so after a reload tracking resumes without a new prompt.
 */
export function useGeolocation(enabled: boolean) {
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
        setGeo({ status: 'on', position: p, accuracyM: pos.coords.accuracy })
      },
      (err) =>
        setGeo({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable', position: null, accuracyM: null }),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    )
    return stop
  }, [enabled, stop])

  return geo
}
