import { Camera, Landmark, ScrollText, Umbrella, UtensilsCrossed } from 'lucide-react'
import type { Place, Theme } from '../types'

const ICON: Record<Theme, typeof Landmark> = {
  culture: Landmark,
  food: UtensilsCrossed,
  rainy: Umbrella,
  history: ScrollText,
  photo: Camera,
}

const TONE: Record<Place['tone'], string> = {
  brick: 'bg-brick/15 text-brick',
  butter: 'bg-butter text-bark',
  teal: 'bg-teal/15 text-teal',
  leaf: 'bg-leaf/15 text-leaf',
}

/** Illustrated placeholder until real photos come from the backend. */
export default function PlaceThumb({ place, className = '' }: { place: Place; className?: string }) {
  const Icon = ICON[place.themes[0]]
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${TONE[place.tone]} ${className}`}>
      <div className="absolute inset-3 rounded-full border-2 border-white/70" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-current opacity-20" />
      <Icon className="relative h-8 w-8" strokeWidth={1.5} />
    </div>
  )
}
