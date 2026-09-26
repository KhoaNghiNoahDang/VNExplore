import { Check, CircleCheck, Plus } from 'lucide-react'
import { TRANSPORT_INFO } from '../i18n/strings'
import { distance, minutes, moneyRange } from '../lib/format'
import { useQuest } from '../store/QuestContext'
import type { Leg, Place } from '../types'
import PlaceThumb from './PlaceThumb'
import TransportIcon from './TransportIcon'
import { LegLine } from './TravelBits'

/** Compact place card for the fullscreen map (Places page). */
export function MapPlaceCard({
  place,
  leg,
  people,
  added,
  onToggle,
}: {
  place: Place
  leg: Leg
  people: number
  added: boolean
  onToggle: () => void
}) {
  const { lang, t } = useQuest()
  return (
    <div className="flex gap-3">
      <PlaceThumb place={place} className="h-14 w-14 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[13px] font-bold leading-tight">{place.name[lang]}</div>
        <div className="mt-1 flex items-center gap-1 text-[10px] font-medium opacity-80">
          <TransportIcon transport={leg.transport} className="h-3 w-3 shrink-0 text-teal" strokeWidth={2.25} />
          {t.legLine(distance(leg.distanceM), leg.minutes, TRANSPORT_INFO[lang][leg.transport].short)}
        </div>
        <div className="mt-0.5 text-[10px] font-bold text-teal">
          {moneyRange(place.priceMin * people, place.priceMax * people, lang)} {place.priceMax > 0 && t.forN(people)}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        aria-pressed={added}
        aria-label={added ? t.added : t.add}
        title={added ? t.added : t.add}
        className={`flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full transition active:scale-95 ${
          added ? 'bg-teal text-white shadow-sm' : 'border-2 border-ink bg-white hover:bg-butter'
        }`}
      >
        {added ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <Plus className="h-5 w-5" strokeWidth={2.5} />}
      </button>
    </div>
  )
}

/** Numbered stop card for the fullscreen map (route and journey pages). */
export function MapStopCard({
  place,
  index,
  leg,
  people,
  done = false,
  current = false,
}: {
  place: Place
  index: number
  leg?: Leg
  people: number
  done?: boolean
  current?: boolean
}) {
  const { lang } = useQuest()
  return (
    <div className="flex gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          current ? 'bg-sun text-ink' : 'bg-teal text-white'
        }`}
      >
        {done ? <CircleCheck className="h-4 w-4" /> : index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold">
          {place.name[lang]} <span className="font-normal opacity-50">· {minutes(place.visitMin, lang)}</span>
        </div>
        <div className="text-[10px] font-bold text-teal">
          {moneyRange(place.priceMin * people, place.priceMax * people, lang)}
        </div>
        {leg && (
          <div className="mt-1">
            <LegLine leg={leg} people={people} />
          </div>
        )}
      </div>
    </div>
  )
}
