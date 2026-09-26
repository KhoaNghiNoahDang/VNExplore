import { Car, Footprints, type LucideProps } from 'lucide-react'
import type { Transport } from '../types'

type IconProps = { className?: string; strokeWidth?: number }

/** Shared Lucide-style frame: 24×24, round caps/joins, currentColor stroke. */
function Frame({ className, strokeWidth = 2, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Step-through scooter (xe tay ga) — the everyday Hanoi motorbike. */
export function ScooterIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="5.5" cy="17" r="2.5" />
      <circle cx="18.5" cy="17" r="2.5" />
      <path d="M18.5 17 15.8 6.5" />
      <path d="M14 6.5h3.5" />
      <path d="M3 14.5A4 4 0 0 1 7 10.5h4.5" />
      <path d="M8 17h4.5l4.3-6" />
    </Frame>
  )
}

/** Scooter with a rider — ride-hailing bike (GrabBike / xe ôm). */
export function RideBikeIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="5.5" cy="17" r="2.5" />
      <circle cx="18.5" cy="17" r="2.5" />
      <path d="M18.5 17 15.8 6.5" />
      <path d="M3 14.5A4 4 0 0 1 7 10.5h4.5" />
      <path d="M8 17h4.5l4.3-6" />
      <circle cx="9.5" cy="4" r="1.75" />
      <path d="m9.5 6 1 4.5" />
      <path d="M10 7.5h5.5" />
    </Frame>
  )
}

const LUCIDE: Partial<Record<Transport, React.ComponentType<LucideProps>>> = {
  walk: Footprints,
  car: Car,
}

export default function TransportIcon({ transport, ...props }: IconProps & { transport: Transport }) {
  if (transport === 'motorbike') return <ScooterIcon {...props} />
  if (transport === 'grabbike') return <RideBikeIcon {...props} />
  const Icon = LUCIDE[transport]!
  return <Icon {...props} />
}
