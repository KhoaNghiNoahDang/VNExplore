/**
 * Vietnamese motifs drawn for VNExplore (flat, palette colours, no external assets):
 * Đông Sơn drum face, Hồ Gươm scene, lotus, lantern and a Đông Sơn triangle band.
 */

type SvgProps = { className?: string }

/** Face of a Đông Sơn bronze drum: 12-point sun, rings of hatching, dots and Lạc birds. */
export function DongSonDrum({ className = '' }: SvgProps) {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30)
  const birds = Array.from({ length: 10 }, (_, i) => i * 36)
  const dots = Array.from({ length: 36 }, (_, i) => i * 10)
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5)
  return (
    <svg viewBox="-100 -100 200 200" className={className} fill="none" stroke="currentColor" aria-hidden>
      {/* sun */}
      <circle r="9" fill="currentColor" stroke="none" />
      {rays.map((a) => (
        <path key={a} d="M0 -11 L4 -30 L0 -26 L-4 -30 Z" transform={`rotate(${a})`} fill="currentColor" stroke="none" />
      ))}
      <circle r="36" strokeWidth="1.5" />
      {/* hatching ring */}
      {ticks.map((a) => (
        <line key={a} x1="0" y1="-38" x2="0" y2="-45" transform={`rotate(${a})`} strokeWidth="1.2" />
      ))}
      <circle r="47" strokeWidth="1.5" />
      {/* circle-dot ring */}
      {dots.map((a) => (
        <g key={a} transform={`rotate(${a}) translate(0 -53)`}>
          <circle r="3" strokeWidth="1" />
          <circle r="0.9" fill="currentColor" stroke="none" />
        </g>
      ))}
      <circle r="59" strokeWidth="1.5" />
      {/* Lạc birds flying around the drum */}
      {birds.map((a) => (
        <g key={a} transform={`rotate(${a}) translate(0 -72)`}>
          <path d="M-9 2 Q-4 -5 0 0 Q4 -5 9 2 M0 0 L0 -6 L3 -9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      <circle r="84" strokeWidth="1.5" />
      <circle r="90" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
  )
}

/** Hồ Gươm at dusk: Turtle Tower, the red Thê Húc bridge, Ngọc Sơn roof, lotus and lanterns. */
export function LakeScene({ className = '' }: SvgProps) {
  return (
    <svg viewBox="0 0 360 150" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="vx-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF6DC" />
          <stop offset="1" stopColor="#FBE7A8" />
        </linearGradient>
        <linearGradient id="vx-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8CC7BF" />
          <stop offset="1" stopColor="#2F8A84" />
        </linearGradient>
      </defs>
      <rect width="360" height="150" fill="url(#vx-sky)" />
      {/* sun + drum-star hint */}
      <circle cx="290" cy="46" r="22" fill="#F6C744" />
      <circle cx="290" cy="46" r="28" fill="none" stroke="#F6C744" strokeOpacity=".5" strokeDasharray="2 4" />
      {/* far trees */}
      <path d="M0 92 Q20 70 40 88 Q55 72 72 86 Q92 66 112 90 L112 100 L0 100 Z" fill="#3E8E5A" opacity=".35" />
      <path d="M240 90 Q262 70 280 86 Q300 68 322 88 Q340 74 360 86 L360 100 L240 100 Z" fill="#3E8E5A" opacity=".35" />
      {/* water */}
      <rect y="96" width="360" height="54" fill="url(#vx-water)" />
      <g stroke="#FFFBF0" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round">
        <path d="M24 112 h26 M84 124 h34 M150 136 h22 M226 118 h30 M300 132 h28 M190 112 h16" />
      </g>
      {/* Ngọc Sơn temple roof (left) */}
      <g transform="translate(22 66)">
        <path d="M0 18 Q14 12 22 4 Q30 12 44 18 L40 20 L4 20 Z" fill="#B8432C" />
        <path d="M-3 18 q-2 -4 -5 -5 M47 18 q2 -4 5 -5" stroke="#B8432C" strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="8" y="20" width="28" height="12" fill="#FFF6DC" />
        <rect x="18" y="23" width="8" height="9" fill="#6E5539" />
      </g>
      {/* Thê Húc bridge */}
      <path d="M62 98 Q108 70 156 98" fill="none" stroke="#B8432C" strokeWidth="4" strokeLinecap="round" />
      <path d="M66 90 Q108 63 152 90" fill="none" stroke="#B8432C" strokeWidth="2" strokeLinecap="round" />
      <g stroke="#B8432C" strokeWidth="1.6">
        {[74, 88, 102, 116, 130, 144].map((x) => {
          const t = (x - 62) / 94
          const y = 98 - 56 * t * (1 - t) // quadratic Bézier through the deck
          return <line key={x} x1={x} y1={y} x2={x} y2={y - 8} />
        })}
      </g>
      {/* Turtle Tower on its islet */}
      <g transform="translate(222 58)">
        <ellipse cx="18" cy="40" rx="30" ry="5" fill="#3E8E5A" opacity=".55" />
        <rect x="4" y="22" width="28" height="16" fill="#E9DCC0" stroke="#6E5539" strokeWidth="1" />
        <path d="M14 38 v-8 a4 4 0 0 1 8 0 v8" fill="#6E5539" />
        <rect x="8" y="10" width="20" height="12" fill="#E9DCC0" stroke="#6E5539" strokeWidth="1" />
        <rect x="16" y="13" width="4" height="6" fill="#6E5539" />
        <rect x="11" y="2" width="14" height="8" fill="#E9DCC0" stroke="#6E5539" strokeWidth="1" />
        <path d="M9 2 L18 -5 L27 2 Z" fill="#6E5539" />
        {/* reflection */}
        <rect x="8" y="46" width="20" height="10" fill="#FFFBF0" opacity=".18" />
      </g>
      {/* lotus leaves + flowers in front */}
      <g>
        <ellipse cx="316" cy="140" rx="26" ry="7" fill="#3E8E5A" />
        <ellipse cx="344" cy="132" rx="18" ry="5" fill="#3E8E5A" opacity=".85" />
        <ellipse cx="18" cy="140" rx="22" ry="6" fill="#3E8E5A" />
        <g transform="translate(318 124)">
          <path d="M0 10 Q-9 2 -3 -8 Q0 0 0 10 Z M0 10 Q9 2 3 -8 Q0 0 0 10 Z" fill="#E88FA0" />
          <path d="M0 10 Q-4 -2 0 -11 Q4 -2 0 10 Z" fill="#F4B6C1" />
        </g>
        <g transform="translate(24 126) scale(.8)">
          <path d="M0 10 Q-9 2 -3 -8 Q0 0 0 10 Z M0 10 Q9 2 3 -8 Q0 0 0 10 Z" fill="#E88FA0" />
          <path d="M0 10 Q-4 -2 0 -11 Q4 -2 0 10 Z" fill="#F4B6C1" />
        </g>
      </g>
      {/* hanging lanterns */}
      {[
        [150, 0, 26],
        [176, 0, 16],
        [124, 0, 12],
      ].map(([x, y, len]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <line x1="0" y1="0" x2="0" y2={len} stroke="#6E5539" strokeWidth="1" />
          <ellipse cx="0" cy={len + 8} rx="7" ry="9" fill="#B8432C" />
          <rect x="-4" y={len - 1} width="8" height="2.5" fill="#F6C744" />
          <rect x="-4" y={len + 15.5} width="8" height="2.5" fill="#F6C744" />
          <line x1="0" y1={len + 18} x2="0" y2={len + 25} stroke="#F6C744" strokeWidth="1.2" />
        </g>
      ))}
    </svg>
  )
}

/** Small lotus. */
export function Lotus({ className = '' }: SvgProps) {
  return (
    <svg viewBox="-12 -14 24 26" className={className} aria-hidden>
      <path d="M0 10 Q-11 3 -5 -8 Q0 0 0 10 Z M0 10 Q11 3 5 -8 Q0 0 0 10 Z" fill="#E88FA0" />
      <path d="M0 10 Q-12 8 -11 -1 Q-4 5 0 10 Z M0 10 Q12 8 11 -1 Q4 5 0 10 Z" fill="#F4B6C1" />
      <path d="M0 10 Q-5 -2 0 -12 Q5 -2 0 10 Z" fill="#FAD0D7" />
    </svg>
  )
}

/** Red silk lantern. */
export function Lantern({ className = '' }: SvgProps) {
  return (
    <svg viewBox="-10 0 20 34" className={className} aria-hidden>
      <line x1="0" y1="0" x2="0" y2="5" stroke="#6E5539" strokeWidth="1.2" />
      <rect x="-5" y="4" width="10" height="3" rx="1" fill="#F6C744" />
      <ellipse cx="0" cy="15" rx="9" ry="10" fill="#B8432C" />
      <path d="M-4 7 Q-7 15 -4 23 M4 7 Q7 15 4 23 M0 6 V24" stroke="#F6C744" strokeOpacity=".6" strokeWidth=".8" fill="none" />
      <rect x="-5" y="23" width="10" height="3" rx="1" fill="#F6C744" />
      <path d="M-2 26 V33 M0 26 V34 M2 26 V33" stroke="#F6C744" strokeWidth="1" />
    </svg>
  )
}

/** Đông Sơn triangle band, used as a divider. */
export function DongSonBand({ className = '' }: SvgProps) {
  return (
    <svg viewBox="0 0 120 8" preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <pattern id="vx-band" width="12" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 8 L6 1 L12 8" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="6" cy="6" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="120" height="8" fill="url(#vx-band)" />
    </svg>
  )
}
