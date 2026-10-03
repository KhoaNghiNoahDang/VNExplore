import { useEffect, useRef } from 'react'
import { AttributionControl, Map as MLMap, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LatLng } from '../types'
import { applyPalette, STYLE_URL } from './RealMap'

/**
 * Map for choosing a point: the pin stays in the middle and you move the map under it
 * (like picking a pickup point in ride-hailing apps). `center` moves the map (search result,
 * "my location"); `onPick` reports the point under the pin after every move.
 */
export default function PickMap({
  center,
  onPick,
  onFail,
}: {
  center: LatLng & { zoom?: number; nonce?: number }
  onPick: (p: LatLng) => void
  onFail: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const pick = useRef(onPick)
  pick.current = onPick

  useEffect(() => {
    if (!box.current) return
    let m: MLMap
    try {
      m = new MLMap({
        container: box.current,
        style: STYLE_URL,
        center: [center.lng, center.lat],
        zoom: center.zoom ?? 16,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      })
    } catch {
      onFail()
      return
    }
    m.touchZoomRotate.disableRotation()
    m.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    m.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => applyPalette(m))
    m.on('moveend', () => {
      const c = m.getCenter()
      pick.current({ lat: c.lat, lng: c.lng })
    })
    map.current = m
    return () => m.remove()
    // created once; later centre changes go through flyTo below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Move when asked (search result, my location).
  useEffect(() => {
    map.current?.flyTo({ center: [center.lng, center.lat], zoom: center.zoom ?? 16, duration: 600 })
  }, [center.lat, center.lng, center.zoom, center.nonce])

  return (
    <div className="relative h-full w-full">
      <div ref={box} className="h-full w-full" />
      {/* Fixed pin: its tip marks the chosen point (the map centre). */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden>
          <path d="M17 43C17 43 32 27 32 16A15 15 0 1 0 2 16c0 11 15 27 15 27z" fill="#B8432C" stroke="#fff" strokeWidth="2.5" />
          <circle cx="17" cy="16" r="5.5" fill="#fff" />
        </svg>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-3 -translate-x-1/2 rounded-full bg-ink/30 blur-[1px]" />
    </div>
  )
}
