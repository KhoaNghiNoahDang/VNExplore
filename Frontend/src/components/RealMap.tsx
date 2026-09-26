import { useEffect, useRef, useState } from 'react'
import {
  AttributionControl,
  LngLatBounds,
  Map as MLMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { fetchLegShape, type LineCoords } from '../lib/routing'
import { useQuest } from '../store/QuestContext'
import type { Lang, LatLng, Place, Transport } from '../types'
import type { MapProps } from './MapView'

// Served by the `maplibre-worker` plugin in vite.config.ts.
setWorkerUrl(new URL('/maplibre/maplibre-gl-worker.mjs', location.origin).href)

/** Free vector tiles from OpenStreetMap data — no API key, no sign-up. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

/** Re-colour the neutral Positron style with the app palette (cream land, teal water). */
function applyPalette(map: MLMap) {
  const paint: [RegExp, string, string][] = [
    [/^background$/, 'background-color', '#FFF6DC'],
    [/water/, 'fill-color', '#BFE0DA'],
    [/park|wood|grass|landcover/, 'fill-color', '#DCEBCB'],
    [/building/, 'fill-color', '#F3E4BC'],
    [/landuse|residential/, 'fill-color', '#FBEFD0'],
  ]
  for (const layer of map.getStyle().layers ?? []) {
    for (const [re, prop, color] of paint) {
      if (!re.test(layer.id)) continue
      if (prop.startsWith('fill') && layer.type !== 'fill') continue
      if (prop.startsWith('background') && layer.type !== 'background') continue
      try {
        map.setPaintProperty(layer.id, prop as 'fill-color', color)
      } catch {
        /* layer without that property */
      }
    }
    if (layer.type === 'line' && /road|street|highway|bridge|tunnel/.test(layer.id)) {
      try {
        map.setPaintProperty(layer.id, 'line-color', '#FFFFFF')
      } catch {
        /* ignore */
      }
    }
    // The big "Hanoi" city label sits right on the lake, on top of our pins.
    if (layer.type === 'symbol' && /place.*(city|capital)|city/.test(layer.id)) {
      map.setLayoutProperty(layer.id, 'visibility', 'none')
      continue
    }
    if (layer.type === 'symbol') {
      try {
        map.setPaintProperty(layer.id, 'text-color', '#6E5539')
        map.setPaintProperty(layer.id, 'text-halo-color', '#FFF6DC')
      } catch {
        /* ignore */
      }
    }
  }
}

const MAP_TEXT: Record<Lang, Record<string, string>> = {
  en: {},
  vi: {
    'CooperativeGesturesHandler.WindowsHelpText': 'Giữ Ctrl và cuộn để phóng to/thu nhỏ bản đồ',
    'CooperativeGesturesHandler.MacHelpText': 'Giữ ⌘ và cuộn để phóng to/thu nhỏ bản đồ',
    'CooperativeGesturesHandler.MobileHelpText': 'Dùng hai ngón tay để di chuyển bản đồ',
    'NavigationControl.ZoomIn': 'Phóng to',
    'NavigationControl.ZoomOut': 'Thu nhỏ',
    'AttributionControl.ToggleAttribution': 'Nguồn bản đồ',
  },
}

const toLngLat = (p: LatLng): [number, number] => [p.lng, p.lat]

/**
 * MapLibre positions a marker by setting `transform` on its element,
 * so the visible dot lives in a child (free to scale on focus).
 */
function pinEl(className: string, text = '', title = ''): { wrap: HTMLElement; dot: HTMLElement } {
  const wrap = document.createElement('div')
  const dot = document.createElement('div')
  dot.className = className
  dot.textContent = text
  if (title) wrap.title = title
  wrap.appendChild(dot)
  return { wrap, dot }
}

/** Real, zoomable map (MapLibre + OpenFreeMap). Loaded lazily — see MapView. */
export default function RealMap({
  start,
  places,
  route = [],
  selectedIds = [],
  focusedId,
  onPinClick,
  height = 192,
  startLabel,
  userPos,
  fitPoints,
  legModes,
  onFail,
}: MapProps & { onFail: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const markers = useRef<Marker[]>([])
  const [ready, setReady] = useState(false)
  const { lang } = useQuest()

  // Create the map once.
  useEffect(() => {
    if (!box.current) return
    let map: MLMap
    try {
      map = new MLMap({
        container: box.current,
        style: STYLE_URL,
        center: toLngLat(start),
        zoom: 15,
        attributionControl: false,
        cooperativeGestures: true,
        locale: MAP_TEXT[lang],
        dragRotate: false,
        pitchWithRotate: false,
      })
    } catch {
      onFail() // no WebGL etc. → illustrated map
      return
    }
    map.touchZoomRotate.disableRotation()
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => {
      applyPalette(map)
      // Compact attribution opens itself after the first render; fold it to the small ⓘ button.
      map.once('idle', () =>
        box.current?.querySelector('.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show'),
      )
      map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      const layout = { 'line-cap': 'round', 'line-join': 'round' } as const
      // White casing keeps the route readable over streets and labels.
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout,
        paint: { 'line-color': '#FFFFFF', 'line-width': 7, 'line-opacity': 0.85 },
      })
      // Riding legs: solid. Walking legs: dotted.
      map.addLayer({
        id: 'route-ride',
        type: 'line',
        source: 'route',
        filter: ['==', ['get', 'mode'], 'ride'],
        layout,
        paint: { 'line-color': '#B8432C', 'line-width': 4 },
      })
      map.addLayer({
        id: 'route-walk',
        type: 'line',
        source: 'route',
        filter: ['==', ['get', 'mode'], 'walk'],
        layout,
        paint: { 'line-color': '#B8432C', 'line-width': 3.5, 'line-dasharray': [0.1, 1.8] },
      })
      setReady(true)
    })
    map.on('error', (e) => {
      // Style or tiles unreachable before anything was drawn → fall back.
      if (!map.isStyleLoaded()) {
        console.warn('Map failed to load, using illustrated map:', e.error)
        onFail()
      }
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Keep the latest click handler without re-creating pins for a new arrow function.
  const onPinRef = useRef(onPinClick)
  onPinRef.current = onPinClick

  // Pins and route line follow the props.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    markers.current.forEach((m) => m.remove())
    markers.current = []
    const routeIndex = new Map(route.map((p, i) => [p.id, i + 1]))

    const add = ({ wrap }: { wrap: HTMLElement }, p: LatLng, place?: Place) => {
      if (place && onPinRef.current) {
        wrap.style.cursor = 'pointer'
        wrap.addEventListener('click', (e) => {
          e.stopPropagation()
          onPinRef.current?.(place)
        })
      }
      markers.current.push(new Marker({ element: wrap }).setLngLat(toLngLat(p)).addTo(map))
    }

    for (const p of places) {
      if (routeIndex.has(p.id)) continue
      const on = selectedIds.includes(p.id)
      add(pinEl(`vx-pin ${on ? 'vx-pin-on' : ''} ${focusedId === p.id ? 'vx-pin-focus' : ''}`, '', p.name.en), p, p)
    }
    for (const p of route) {
      add(pinEl(`vx-stop ${focusedId === p.id ? 'vx-pin-focus' : ''}`, String(routeIndex.get(p.id)), p.name.en), p, p)
    }
    const startPin = pinEl('vx-start')
    if (startLabel) startPin.dot.appendChild(pinEl('vx-start-label', startLabel).dot)
    add(startPin, start)
    if (userPos) add(pinEl('vx-user'), userPos)
  }, [ready, start, places, route, selectedIds, focusedId, startLabel, userPos])

  // Route line: straight segments at once, then swap in street-following shapes as they arrive.
  const routeKey = [start, ...route].map((p) => `${p.lat},${p.lng}`).join('|') + '#' + (legModes ?? []).join(',')
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const src = map.getSource('route') as GeoJSONSource | undefined
    if (!src) return
    const points = [start, ...route]
    const modes: Transport[] = route.map((_, i) => legModes?.[i] ?? 'walk')
    const shapes: LineCoords[] = route.map((p, i) => [toLngLat(points[i]), toLngLat(p)])
    const draw = () =>
      src.setData({
        type: 'FeatureCollection',
        features: shapes.map((coordinates, i) => ({
          type: 'Feature',
          properties: { mode: modes[i] === 'walk' ? 'walk' : 'ride' },
          geometry: { type: 'LineString', coordinates },
        })),
      })
    draw()

    let alive = true
    route.forEach((p, i) =>
      fetchLegShape(points[i], p, modes[i]).then((shape) => {
        if (!alive || !shape) return
        // Join the street line to the pins (the router snaps to the nearest road).
        shapes[i] = [toLngLat(points[i]), ...shape, toLngLat(p)]
        draw()
      }),
    )
    return () => {
      alive = false
    }
  }, [ready, routeKey])

  // Re-frame only when the set of points changes, so the traveller's own pan/zoom sticks.
  const pts = fitPoints?.length ? fitPoints : [start, ...places, ...route]
  const fitKey = pts.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|')
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !pts.length) return
    const bounds = new LngLatBounds()
    pts.forEach((p) => bounds.extend(toLngLat(p)))
    map.fitBounds(bounds, { padding: 40, maxZoom: 16.5, duration: 400 })
  }, [ready, fitKey])

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-sand bg-cream" style={{ height }}>
      <div ref={box} className="h-full w-full" />
    </div>
  )
}
