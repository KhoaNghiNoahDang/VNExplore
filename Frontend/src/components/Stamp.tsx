import { useId } from 'react'
import type { Place } from '../types'

/** Ink colour per place tone (butter places get the warm brown, so the stamp stays readable). */
const INK: Record<Place['tone'], string> = {
  brick: 'var(--color-brick)',
  butter: 'var(--color-bark)',
  teal: 'var(--color-teal)',
  leaf: 'var(--color-leaf)',
}
const TILT = [-8, 5, -3, 7, -5, 2]

/** Split a place name into at most two short lines for the middle of the stamp. */
function lines(name: string): string[] {
  const words = name.toUpperCase().split(/\s+/).filter(Boolean)
  if (name.length <= 12 || words.length === 1) return [name.toUpperCase()]
  let best: [string, string] = [words.join(' '), '']
  let worst = Infinity
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' ')
    const b = words.slice(k).join(' ')
    const w = Math.max(a.length, b.length)
    if (w < worst) (worst = w), (best = [a, b])
  }
  return best
}

/** Kind of place → a little drawing in the middle: pagoda roof, bowl of phở, lantern. */
function Emblem({ kind }: { kind: Place['kind'] }) {
  if (kind === 'food')
    return (
      <g fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M-12 -1 h24 a12 11 0 0 1 -24 0z" fill="currentColor" fillOpacity={0.12} />
        <path d="M-6 13 h12" />
        <path d="M2 -6 L14 -16 M6 -4 L17 -12" />
        <path d="M-7 -6 q-2 -4 0 -7 M-2 -6 q-2 -4 0 -7" strokeWidth={1.6} />
      </g>
    )
  if (kind === 'fun')
    return (
      <g fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 -17 v4" />
        <path d="M-6 -13 h12" />
        <path d="M-6 -13 q-9 13 0 24 h12 q9 -11 0 -24" fill="currentColor" fillOpacity={0.12} />
        <path d="M0 -13 v24 M-5 -7 q5 2 10 0 M-5 5 q5 2 10 0" strokeWidth={1.4} />
        <path d="M-5 11 v3 M0 11 v5 M5 11 v3" strokeWidth={1.6} />
      </g>
    )
  // sight: a temple roof with upturned eaves
  return (
    <g fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 -17 v4" />
      <path d="M-17 -5 q4 1 6 -3 l11 -5 l11 5 q2 4 6 3" />
      <path d="M-13 3 q3 1 5 -3 l8 -4 l8 4 q2 4 5 3" />
      <path d="M-9 3 v11 h18 v-11" fill="currentColor" fillOpacity={0.12} />
      <path d="M-3 14 v-6 h6 v6" strokeWidth={1.6} />
    </g>
  )
}

/** A wax seal with scalloped edge: the gold reward for a finished Explore mission. */
function GoldSeal({ id }: { id: string }) {
  const n = 14
  const pts = Array.from({ length: n * 2 }, (_, k) => {
    const r = k % 2 ? 15 : 18
    const a = (Math.PI * k) / n
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
  return (
    <svg viewBox="-20 -20 40 40" className="absolute -right-[13%] top-1/2 h-[34%] w-[34%] -translate-y-1/2 drop-shadow" aria-hidden>
      <defs>
        <radialGradient id={`${id}g`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffe9a3" />
          <stop offset="55%" stopColor="var(--color-sun)" />
          <stop offset="100%" stopColor="#b8861f" />
        </radialGradient>
      </defs>
      <polygon points={pts} fill={`url(#${id}g)`} stroke="#9a6f17" strokeWidth={0.8} />
      <circle r={10.5} fill="none" stroke="#9a6f17" strokeWidth={0.8} strokeDasharray="1.5 1.5" />
      <path d="M0 -6.5 L1.9 -2 L6.6 -2 L2.8 0.9 L4.2 5.6 L0 2.8 L-4.2 5.6 L-2.8 0.9 L-6.6 -2 L-1.9 -2 Z" fill="#7a5410" />
    </svg>
  )
}

/**
 * A visited place's stamp, drawn like a worn post-office cancellation: the place name in the
 * middle, "VNEXPLORE · HÀ NỘI" and the stop number running round the rim, a drawing for the kind
 * of place, and ink that is a little uneven. `fresh` plays the stamping-down animation.
 */
export default function Stamp({
  place,
  index,
  gold = false,
  size = 'md',
  empty = false,
  emptyLabel,
  fresh = false,
}: {
  place: Place
  index: number
  gold?: boolean
  size?: 'sm' | 'md'
  empty?: boolean
  emptyLabel?: string
  fresh?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const dim = size === 'sm' ? 'h-20 w-20' : 'h-28 w-28'
  const no = String(index + 1).padStart(2, '0')
  const name = lines(place.nameVi)
  const nameSize = Math.max(...name.map((l) => l.length)) > 11 ? 8.2 : 9.6

  if (empty) {
    return (
      <div className={`${dim} relative`}>
        <svg viewBox="0 0 120 120" className="h-full w-full text-bark/35" aria-label={`${place.nameVi} · ${emptyLabel ?? ''}`}>
          <circle cx={60} cy={60} r={55} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="5 5" />
          <g transform="translate(60 44) scale(0.8)" opacity={0.6}>
            <Emblem kind={place.kind} />
          </g>
          {name.map((l, k) => (
            <text key={k} x={60} y={70 + k * 11} textAnchor="middle" fontSize={nameSize} fontWeight={800} fill="currentColor">
              {l}
            </text>
          ))}
          {emptyLabel && (
            <text x={60} y={96} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="currentColor" letterSpacing={1}>
              {emptyLabel.toUpperCase()}
            </text>
          )}
        </svg>
      </div>
    )
  }

  // Rim text sits between the outer ring (r 51–56) and the inner ring (r 38); the name fills the middle.
  const arc = (r: number, from: number, to: number, sweep: 0 | 1) => {
    const p = (deg: number) => `${(60 + r * Math.cos((deg * Math.PI) / 180)).toFixed(2)} ${(60 + r * Math.sin((deg * Math.PI) / 180)).toFixed(2)}`
    return `M ${p(from)} A ${r} ${r} 0 0 ${sweep} ${p(to)}`
  }
  const nameY = name.length > 1 ? [63, 73.5] : [68]
  return (
    <div className={`relative ${dim} ${fresh ? 'vx-stamp-in' : ''}`} style={{ rotate: `${TILT[index % TILT.length]}deg` }}>
      <svg viewBox="0 0 120 120" className="h-full w-full" style={{ color: INK[place.tone] }} role="img" aria-label={`${place.nameVi} · № ${no}`}>
        <defs>
          {/* Slightly uneven ink: wobble the edges a little and knock out a few specks. */}
          <filter id={`${uid}ink`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={index + 3} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.3} result="d" />
            <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves={1} seed={index + 11} result="s" />
            <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.75" result="m" />
            <feComposite in="d" in2="m" operator="in" />
          </filter>
          <path id={`${uid}top`} d={arc(43.5, 198, 342, 1)} />
          <path id={`${uid}bot`} d={arc(47.5, 162, 18, 0)} />
        </defs>
        <g filter={`url(#${uid}ink)`} fill="currentColor" stroke="currentColor">
          <circle cx={60} cy={60} r={56} fill="none" strokeWidth={3.4} />
          <circle cx={60} cy={60} r={51.5} fill="none" strokeWidth={1} />
          <circle cx={60} cy={60} r={38} fill="none" strokeWidth={1.6} />
          <circle cx={60} cy={60} r={35} fill="none" strokeWidth={0.8} strokeDasharray="1 2.2" />
          <text fontSize={7.4} fontWeight={800} letterSpacing={1.1} stroke="none">
            <textPath href={`#${uid}top`} startOffset="50%" textAnchor="middle">
              VNEXPLORE · HÀ NỘI
            </textPath>
          </text>
          <text fontSize={7.4} fontWeight={800} letterSpacing={1.1} stroke="none">
            <textPath href={`#${uid}bot`} startOffset="50%" textAnchor="middle">
              {`ĐÃ ĐẾN · № ${no}`}
            </textPath>
          </text>
          {/* Little lozenges at 9 and 3 o'clock, between the two rim texts. */}
          <path d="M 12.5 60 l 3 -3 l 3 3 l -3 3 z M 101.5 60 l 3 -3 l 3 3 l -3 3 z" stroke="none" />
          <g transform={`translate(60 ${name.length > 1 ? 41 : 45}) scale(0.68)`}>
            <Emblem kind={place.kind} />
          </g>
          {name.map((l, k) => (
            <text
              key={k}
              x={60}
              y={nameY[k]}
              textAnchor="middle"
              fontSize={nameSize}
              fontWeight={900}
              stroke="none"
              // Bold capitals are ~0.72em wide: squeeze lines that would spill out of the inner ring.
              textLength={l.length * nameSize * 0.72 > 60 ? 60 : undefined}
              lengthAdjust="spacingAndGlyphs"
            >
              {l}
            </text>
          ))}
          <path d={`M 40 ${name.length > 1 ? 79 : 74} h 40`} fill="none" strokeWidth={1} />
        </g>
      </svg>
      {gold && <GoldSeal id={uid} />}
    </div>
  )
}
