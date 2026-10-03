import {
  Camera,
  Clapperboard,
  Drama,
  FerrisWheel,
  Frame,
  Landmark,
  Mic,
  Music,
  Palette,
  PartyPopper,
  ScrollText,
  Store,
  Ticket,
  Umbrella,
  UtensilsCrossed,
} from 'lucide-react'
import type { EventCategory, Place, Theme } from '../types'

const ICON: Record<Theme, typeof Landmark> = {
  culture: Landmark,
  food: UtensilsCrossed,
  rainy: Umbrella,
  history: ScrollText,
  photo: Camera,
  fun: FerrisWheel,
}

export const EVENT_ICON: Record<EventCategory, typeof Landmark> = {
  music: Music,
  theatre: Drama,
  film: Clapperboard,
  exhibition: Frame,
  workshop: Palette,
  talk: Mic,
  market: Store,
  festival: PartyPopper,
  other: Ticket,
}

const TONE: Record<Place['tone'], string> = {
  brick: 'bg-brick/15 text-brick',
  butter: 'bg-butter text-bark',
  teal: 'bg-teal/15 text-teal',
  leaf: 'bg-leaf/15 text-leaf',
}

/** Illustrated placeholder until real photos come from the backend. */
export default function PlaceThumb({ place, className = '' }: { place: Place; className?: string }) {
  const Icon = place.event ? EVENT_ICON[place.event.category] : ICON[place.themes[0]]
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${TONE[place.tone]} ${className}`}>
      <div className="absolute inset-3 rounded-full border-2 border-white/70" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-current opacity-20" />
      <Icon className="relative h-8 w-8" strokeWidth={1.5} />
      {place.event && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-brick shadow-sm">
          <Ticket className="h-3 w-3" strokeWidth={2.25} />
        </span>
      )}
    </div>
  )
}
