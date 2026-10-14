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
export const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

/** Re-colour the neutral Positron style with the app palette (cream land, teal water). */
export function applyPalette(map: MLMap, lang: Lang = 'vi') {
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
      // Local names with diacritics ("Phố Nhà Thờ") instead of the style's Latin/English ones.
      if (layer.layout && 'text-field' in layer.layout) {
        try {
          map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:latin']])
        } catch {
          /* ignore */
        }
      }
    }
  }
  showVietnamIslands(map, lang)
}

/**
 * Viet Nam's Hoàng Sa and Trường Sa archipelagos, always shown and named as Vietnamese.
 * The open map data names them (and the sea) in other languages, and at the zoom levels where the
 * whole country is in view the small islands are not drawn at all. So: the base map's own labels
 * in that part of Biển Đông are hidden, and ours are drawn with a dot for each main island.
 */
const SEA_AREA = {
  type: 'Polygon' as const,
  coordinates: [[[110.3, 6.5], [116.3, 6.5], [116.3, 9], [117, 11], [117, 18], [110.3, 18], [110.3, 6.5]]],
}
/**
 * Islands named on the map. "hs"/"ts": the two archipelagos (the base map's labels there are
 * hidden, so these are the only names). "coast": Viet Nam's other outlying islands, which the base
 * map drops when zoomed out — ours show until the base map's own labels take over.
 */
const ISLES: { name: string; at: [number, number]; group: 'hs' | 'ts' | 'coast' }[] = [
  { name: 'Đảo Phú Lâm', at: [112.339, 16.834], group: 'hs' },
  { name: 'Đảo Cây', at: [112.267, 16.983], group: 'hs' },
  { name: 'Đảo Linh Côn', at: [112.733, 16.667], group: 'hs' },
  { name: 'Đảo Hoàng Sa', at: [111.608, 16.533], group: 'hs' },
  { name: 'Đảo Hữu Nhật', at: [111.583, 16.5], group: 'hs' },
  { name: 'Đảo Quang Ảnh', at: [111.51, 16.45], group: 'hs' },
  { name: 'Đảo Duy Mộng', at: [111.733, 16.467], group: 'hs' },
  { name: 'Đảo Quang Hòa', at: [111.7, 16.433], group: 'hs' },
  { name: 'Đảo Bạch Quy', at: [111.77, 16.05], group: 'hs' },
  { name: 'Đảo Tri Tôn', at: [111.2, 15.783], group: 'hs' },
  { name: 'Đảo Song Tử Đông', at: [114.356, 11.454], group: 'ts' },
  { name: 'Đảo Song Tử Tây', at: [114.33, 11.43], group: 'ts' },
  { name: 'Đảo Thị Tứ', at: [114.284, 11.055], group: 'ts' },
  { name: 'Đảo Loại Ta', at: [114.42, 10.67], group: 'ts' },
  { name: 'Đảo Ba Bình', at: [114.365, 10.377], group: 'ts' },
  { name: 'Đảo Sơn Ca', at: [114.478, 10.376], group: 'ts' },
  { name: 'Đảo Nam Yết', at: [114.361, 10.181], group: 'ts' },
  { name: 'Đảo Sinh Tồn', at: [114.329, 9.886], group: 'ts' },
  { name: 'Đảo Sinh Tồn Đông', at: [114.56, 9.91], group: 'ts' },
  { name: 'Đảo Bình Nguyên', at: [115.82, 10.81], group: 'ts' },
  { name: 'Đảo Vĩnh Viễn', at: [115.8, 10.73], group: 'ts' },
  { name: 'Đảo Phan Vinh', at: [113.68, 8.97], group: 'ts' },
  { name: 'Đảo Trường Sa Đông', at: [112.35, 8.93], group: 'ts' },
  { name: 'Đảo Trường Sa', at: [111.918, 8.645], group: 'ts' },
  { name: 'Đảo Thuyền Chài', at: [113.3, 8.17], group: 'ts' },
  { name: 'Đảo An Bang', at: [112.917, 7.885], group: 'ts' },
  { name: 'Đảo Cô Tô', at: [107.77, 20.99], group: 'coast' },
  { name: 'Đảo Bạch Long Vĩ', at: [107.73, 20.13], group: 'coast' },
  { name: 'Đảo Cồn Cỏ', at: [107.34, 17.16], group: 'coast' },
  { name: 'Đảo Lý Sơn', at: [109.12, 15.38], group: 'coast' },
  { name: 'Đảo Phú Quý', at: [108.94, 10.52], group: 'coast' },
  { name: 'Côn Đảo', at: [106.61, 8.69], group: 'coast' },
  { name: 'Đảo Phú Quốc', at: [103.96, 10.23], group: 'coast' },
  { name: 'Đảo Thổ Chu', at: [103.48, 9.3], group: 'coast' },
]
const ISLAND_NAMES: Record<Lang, { hoangSa: string; truongSa: string; sea: string }> = {
  vi: { hoangSa: 'Quần đảo Hoàng Sa\n(Việt Nam)', truongSa: 'Quần đảo Trường Sa\n(Việt Nam)', sea: 'Biển Đông' },
  en: { hoangSa: 'Hoang Sa Archipelago\n(Viet Nam)', truongSa: 'Truong Sa Archipelago\n(Viet Nam)', sea: 'East Sea' },
}

function showVietnamIslands(map: MLMap, lang: Lang) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue
    const f = map.getFilter(layer.id)
    try {
      map.setFilter(layer.id, ['all', f ?? true, ['!', ['within', SEA_AREA]]] as never)
    } catch {
      /* filter in the old syntax: leave that layer alone */
    }
  }
  const names = ISLAND_NAMES[lang]
  const point = (lng: number, lat: number, props: Record<string, string>) => ({
    type: 'Feature' as const,
    properties: props,
    geometry: { type: 'Point' as const, coordinates: [lng, lat] },
  })
  map.addSource('vn-islands', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        ...ISLES.map((i) => point(i.at[0], i.at[1], { kind: 'island', group: i.group, name: i.name })),
        point(112.0, 16.15, { kind: 'name', name: names.hoangSa }),
        point(113.9, 9.55, { kind: 'name', name: names.truongSa }),
        point(112.6, 13.2, { kind: 'sea', name: names.sea }),
      ],
    },
  })
  map.addLayer({
    id: 'vn-islands-dot',
    type: 'circle',
    source: 'vn-islands',
    maxzoom: 10,
    filter: ['==', ['get', 'kind'], 'island'],
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.6, 8, 3.5], 'circle-color': '#6E5539', 'circle-opacity': 0.8 },
  })
  // Each island's name: in the archipelagos from zoom 6; the coastal ones until the base map's
  // own labels appear (around zoom 9).
  map.addLayer({
    id: 'vn-isles-name',
    type: 'symbol',
    source: 'vn-islands',
    minzoom: 4.5,
    filter: ['all', ['==', ['get', 'kind'], 'island'], ['case', ['==', ['get', 'group'], 'coast'], ['<', ['zoom'], 9], ['>=', ['zoom'], 6]]],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['literal', ['Noto Sans Regular']],
      'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 13],
      'text-anchor': 'top',
      'text-offset': [0, 0.5],
      'text-optional': true,
    },
    paint: { 'text-color': '#6E5539', 'text-halo-color': '#FFF6DC', 'text-halo-width': 1.2 },
  })
  map.addLayer({
    id: 'vn-islands-name',
    type: 'symbol',
    source: 'vn-islands',
    filter: ['!=', ['get', 'kind'], 'island'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['case', ['==', ['get', 'kind'], 'sea'], ['literal', ['Noto Sans Italic']], ['literal', ['Noto Sans Bold']]],
      'text-size': ['interpolate', ['linear'], ['zoom'], 3, ['case', ['==', ['get', 'kind'], 'sea'], 12, 10], 8, ['case', ['==', ['get', 'kind'], 'sea'], 18, 15]],
      'text-letter-spacing': ['case', ['==', ['get', 'kind'], 'sea'], 0.2, 0.02],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': ['case', ['==', ['get', 'kind'], 'sea'], '#2F8A84', '#6E5539'],
      'text-halo-color': '#FFF6DC',
      'text-halo-width': 1.4,
    },
  })
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
  full = false,
  padding,
  fitNonce = 0,
  onMapReady,
  onFail,
}: MapProps & {
  /** Fullscreen: free gestures, our own controls, focus follows the carousel. */
  full?: boolean
  /** Space covered by overlays (the bottom panel), kept clear when framing. */
  padding?: { top: number; bottom: number; left: number; right: number }
  /** Bump to re-frame everything (the "show all" button). */
  fitNonce?: number
  onMapReady?: (map: MLMap) => void
  onFail: () => void
}) {
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
        // Embedded in a scrolling page: one finger scrolls the page, two move the map.
        cooperativeGestures: !full,
        locale: MAP_TEXT[lang],
        dragRotate: false,
        pitchWithRotate: false,
      })
    } catch {
      onFail() // no WebGL etc. → illustrated map
      return
    }
    map.touchZoomRotate.disableRotation()
    map.addControl(new AttributionControl({ compact: true }), full ? 'top-right' : 'bottom-right')
    if (!full) map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => {
      applyPalette(map, lang)
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
      onMapReady?.(map)
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
  const pad = padding ?? { top: 40, bottom: 40, left: 40, right: 40 }
  const padKey = `${pad.top},${pad.bottom},${pad.left},${pad.right}`
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !pts.length) return
    const bounds = new LngLatBounds()
    pts.forEach((p) => bounds.extend(toLngLat(p)))
    map.fitBounds(bounds, { padding: pad, maxZoom: 16.5, duration: 400 })
  }, [ready, fitKey, padKey, fitNonce])

  // Fullscreen: glide to the place picked in the carousel or on the map.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !full || !focusedId) return
    const p = [...route, ...places].find((x) => x.id === focusedId)
    if (!p) return
    map.easeTo({ center: toLngLat(p), zoom: Math.max(map.getZoom(), 16), padding: pad, duration: 500 })
  }, [ready, full, focusedId])

  return (
    <div
      className={full ? 'relative h-full w-full bg-cream' : 'relative overflow-hidden rounded-3xl border-2 border-sand bg-cream'}
      style={full ? undefined : { height }}
    >
      <div ref={box} className="h-full w-full" />
    </div>
  )
}
