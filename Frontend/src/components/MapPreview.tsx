import type { LatLng, Place } from '../types'

interface Props {
  start: LatLng
  /** Places shown as pins. */
  places: Place[]
  /** Ordered stops: drawn as a numbered route. */
  route?: Place[]
  selectedIds?: string[]
  focusedId?: string | null
  onPinClick?: (p: Place) => void
  height?: number
  startLabel?: string
}

// Rough outline of Hoan Kiem Lake (north → south), for the illustrated map.
const LAKE: LatLng[] = [
  { lat: 21.0322, lng: 105.8522 },
  { lat: 21.0318, lng: 105.8532 },
  { lat: 21.0296, lng: 105.8534 },
  { lat: 21.0272, lng: 105.8531 },
  { lat: 21.0262, lng: 105.8523 },
  { lat: 21.0268, lng: 105.8512 },
  { lat: 21.0290, lng: 105.8513 },
  { lat: 21.0312, lng: 105.8515 },
]

const W = 320
const PAD = 22

/** Illustrated (not to-scale-perfect) map — swap for Leaflet/Mapbox later if needed. */
export default function MapPreview({
  start,
  places,
  route = [],
  selectedIds = [],
  focusedId,
  onPinClick,
  height = 192,
  startLabel,
}: Props) {
  const pts = [start, ...places, ...route, ...LAKE]
  const kx = Math.cos((21.03 * Math.PI) / 180)
  const minX = Math.min(...pts.map((p) => p.lng * kx))
  const maxX = Math.max(...pts.map((p) => p.lng * kx))
  const minY = Math.min(...pts.map((p) => p.lat))
  const maxY = Math.max(...pts.map((p) => p.lat))
  const scale = Math.min((W - PAD * 2) / (maxX - minX || 1), (height - PAD * 2) / (maxY - minY || 1))
  const offX = (W - (maxX - minX) * scale) / 2
  const offY = (height - (maxY - minY) * scale) / 2
  const proj = (p: LatLng) => ({
    x: offX + (p.lng * kx - minX) * scale,
    y: height - (offY + (p.lat - minY) * scale),
  })

  const lakePath = LAKE.map((p, i) => {
    const { x, y } = proj(p)
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ') + 'Z'

  const routePts = [start, ...route].map(proj)
  const routePath = routePts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const routeIndex = new Map(route.map((p, i) => [p.id, i + 1]))
  const s = proj(start)

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-sand bg-butter/30">
      <svg viewBox={`0 0 ${W} ${height}`} className="block w-full" role="img" aria-label="Map">
        {/* street grid */}
        <g stroke="#EBD9A8" strokeWidth={1}>
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={i * 40 + 10} y1={0} x2={i * 40 - 10} y2={height} />
          ))}
          {Array.from({ length: Math.ceil(height / 36) }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 36 + 8} x2={W} y2={i * 36 + 14} />
          ))}
        </g>
        <path d={lakePath} fill="#2F8A84" fillOpacity={0.18} stroke="#2F8A84" strokeOpacity={0.35} strokeLinejoin="round" />

        {route.length > 0 && (
          <path d={routePath} fill="none" stroke="#B8432C" strokeWidth={2.5} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {places.map((p) => {
          if (routeIndex.has(p.id)) return null
          const { x, y } = proj(p)
          const on = selectedIds.includes(p.id)
          const focused = focusedId === p.id
          return (
            <g
              key={p.id}
              onClick={onPinClick ? () => onPinClick(p) : undefined}
              className={onPinClick ? 'cursor-pointer' : undefined}
            >
              <title>{p.name.en}</title>
              <circle cx={x} cy={y} r={14} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={focused ? 8 : 6}
                fill={on ? '#2F8A84' : '#FFFBF0'}
                stroke={focused ? '#3A2A1A' : on ? '#fff' : '#6E5539'}
                strokeWidth={2}
              />
            </g>
          )
        })}

        {route.map((p) => {
          const { x, y } = proj(p)
          const n = routeIndex.get(p.id)!
          return (
            <g key={p.id} onClick={onPinClick ? () => onPinClick(p) : undefined} className={onPinClick ? 'cursor-pointer' : undefined}>
              <title>{p.name.en}</title>
              <circle cx={x} cy={y} r={10} fill="#2F8A84" stroke={focusedId === p.id ? '#3A2A1A' : '#fff'} strokeWidth={2} />
              <text x={x} y={y + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">
                {n}
              </text>
            </g>
          )
        })}

        <circle cx={s.x} cy={s.y} r={7} fill="#F6C744" stroke="#fff" strokeWidth={2.5} />
        {startLabel && (
          <text x={s.x + 11} y={s.y + 4} fontSize={10} fontWeight={700} fill="#3A2A1A">
            {startLabel}
          </text>
        )}
      </svg>
    </div>
  )
}
