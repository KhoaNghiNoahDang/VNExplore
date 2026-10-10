import { useEffect, useRef } from 'react'
import { AttributionControl, Map as MLMap, Marker, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LatLng } from '../types'
import { applyPalette, STYLE_URL } from './RealMap'

const PIN_SVG =
  '<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">' +
  '<path d="M17 43C17 43 32 27 32 16A15 15 0 1 0 2 16c0 11 15 27 15 27z" fill="#B8432C" stroke="#fff" stroke-width="2.5"/>' +
  '<circle cx="17" cy="16" r="5.5" fill="#fff"/></svg>'

/**
 * Map for choosing a point. The pin is pinned to the ground: moving or zooming the map never
 * changes it — tap the map or drag the pin to move it. `point` is the chosen point; `view` moves
 * the map (search result, "my location"); `userPos` shows where the traveller really is.
 */
export default function PickMap({
  point,
  view,
  userPos,
  onPick,
  onFail,
}: {
  point: LatLng
  view: LatLng & { zoom?: number; nonce?: number }
  userPos?: LatLng | null
  onPick: (p: LatLng) => void
  onFail: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const pin = useRef<Marker | null>(null)
  const user = useRef<Marker | null>(null)
  const pick = useRef(onPick)
  pick.current = onPick

  useEffect(() => {
    if (!box.current) return
    let m: MLMap
    try {
      m = new MLMap({
        container: box.current,
        style: STYLE_URL,
        center: [view.lng, view.lat],
        zoom: view.zoom ?? 16,
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

    const el = document.createElement('div')
    el.innerHTML = PIN_SVG
    el.style.cursor = 'grab'
    const marker = new Marker({ element: el, anchor: 'bottom', draggable: true }).setLngLat([point.lng, point.lat]).addTo(m)
    marker.on('dragend', () => {
      const p = marker.getLngLat()
      pick.current({ lat: p.lat, lng: p.lng })
    })
    // Tap the map: the pin jumps there.
    m.on('click', (e) => {
      marker.setLngLat(e.lngLat)
      pick.current({ lat: e.lngLat.lat, lng: e.lngLat.lng })
    })
    pin.current = marker
    map.current = m
    return () => {
      m.remove()
      map.current = pin.current = user.current = null
    }
    // created once; later changes go through the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The chosen point changed from outside (search result, reopening the sheet).
  useEffect(() => {
    pin.current?.setLngLat([point.lng, point.lat])
  }, [point.lat, point.lng])

  // Move the view when asked (search result, my location).
  useEffect(() => {
    map.current?.flyTo({ center: [view.lng, view.lat], zoom: view.zoom ?? 16, duration: 600 })
  }, [view.lat, view.lng, view.zoom, view.nonce])

  // Where the traveller really is: a fixed blue dot.
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (!userPos) {
      user.current?.remove()
      user.current = null
      return
    }
    if (!user.current) {
      const wrap = document.createElement('div')
      const dot = document.createElement('div')
      dot.className = 'vx-user'
      wrap.appendChild(dot)
      user.current = new Marker({ element: wrap }).setLngLat([userPos.lng, userPos.lat]).addTo(m)
      // Keep the pin above the dot when they overlap.
      pin.current?.remove().addTo(m)
    } else user.current.setLngLat([userPos.lng, userPos.lat])
  }, [userPos?.lat, userPos?.lng])

  return <div ref={box} className="h-full w-full" />
}
