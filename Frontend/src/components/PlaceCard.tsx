import { useStart } from './NeedStart'
import { useState } from 'react'
import { Check, ChevronDown, CircleCheck, Gift, Headphones, Plus, Target } from 'lucide-react'
import { missionFor } from '../data/roles'
import { TAG_LABEL, TRANSPORT_INFO } from '../i18n/strings'
import { distance, money, moneyRange } from '../lib/format'
import { isOpenAt } from '../lib/hours'
import { storyMinutes, storyOf } from '../lib/quest'
import { estimateLeg } from '../lib/travel'
import { useQuest } from '../store/QuestContext'
import type { Place } from '../types'
import { PlaceNotice, SourceLinks } from './PlaceBits'
import PlaceThumb from './PlaceThumb'
import TransportIcon from './TransportIcon'

export default function PlaceCard({ place, people }: { place: Place; people: number }) {
  const { lang, t, selected, toggle, mode, role, travel } = useQuest()
  const start = useStart()
  const [expanded, setExpanded] = useState(false)
  const isAdded = selected.includes(place.id)
  const mission = role ? missionFor(role, place) : null
  const isFav = !!role?.favPlaces.includes(place.id)
  const leg = estimateLeg(start, place, travel.transport, new Date(travel.departAt ?? Date.now()), people)
  const perPerson =
    place.priceMax === 0
      ? moneyRange(0, 0, lang)
      : place.priceMin === place.priceMax
        ? `${money(place.priceMin)}${t.perPerson}`
        : `${money(place.priceMin)}–${money(place.priceMax)}${t.perPerson}`

  return (
    <article className={`flex flex-col rounded-[24px] border bg-white p-4 transition-[border-color,box-shadow] duration-200 ${
      isAdded ? 'border-teal/45 shadow-[0_10px_28px_-22px_rgba(47,138,132,0.9)]' : 'border-sand/90'
    }`}>
      <div className="flex items-start">
        <PlaceThumb place={place} className="h-20 w-20 min-[360px]:h-24 min-[360px]:w-24" />
        <div className="ml-4 min-w-0 flex-1">
          <div className="flex justify-between gap-2">
            <h3 className="text-[15px] font-extrabold leading-snug">{place.name[lang]}</h3>
            {isAdded && <CircleCheck className="h-4 w-4 shrink-0 text-teal" />}
          </div>
          {lang === 'en' && <p className="mb-2 text-[10px] opacity-60">{place.nameVi}</p>}
          {isOpenAt(place.openingHours, new Date(travel.departAt ?? Date.now())) === false && (
            <p className="mt-1 text-[10px] font-bold text-brick">{t.closedWhenYouArrive}</p>
          )}
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-bark/80">
            <TransportIcon transport={leg.transport} className="h-3 w-3 shrink-0 text-teal" strokeWidth={2.25} />
            {t.legLine(distance(leg.distanceM), leg.minutes, TRANSPORT_INFO[lang][leg.transport].short)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold">
        <div className="rounded-lg bg-butter/55 px-2.5 py-1.5">{perPerson}</div>
        <div className="rounded-lg bg-teal/10 px-2.5 py-1.5 text-teal">
          {moneyRange(place.priceMin * people, place.priceMax * people, lang)} {place.priceMax > 0 && t.forN(people)}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-2 text-[10px] font-bold text-brick">
        {place.tags.map((tag, i) => (
          <span key={tag}>
            {i > 0 && <span className="mr-2">·</span>}
            {TAG_LABEL[lang][tag]}
          </span>
        ))}
      </div>

      <p className={`vx-place-blurb mt-2.5 text-[13px] leading-[1.65] text-bark ${expanded ? 'is-expanded' : ''}`}>
        {place.blurb[lang]}
      </p>
      {place.blurb[lang].length > 135 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-1.5 flex min-h-10 items-center gap-1 self-start rounded-lg pr-2 text-[11px] font-bold text-teal hover:text-ink"
        >
          {expanded ? t.showLess : t.showMore}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      <PlaceNotice place={place} className="mt-3" />

      {mode === 'explore' && role && (
        <div className="mt-3 rounded-xl border border-brick/20 bg-brick/5 p-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-brick">
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" /> {t.mission}
            </span>
            {isFav && <span className="rounded bg-brick/10 px-1.5 py-0.5">{t.fitsRole}</span>}
          </div>
          <p className="mt-1 text-[11px] leading-snug">{mission!.task[lang]}</p>
          <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-bark">
            <Gift className="h-3 w-3" /> {mission!.item[lang]}
          </p>
        </div>
      )}
      {mode === 'listen' && (
        <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-teal">
          <Headphones className="h-3.5 w-3.5" /> {t.narrated(storyMinutes(storyOf(place, lang)))}
        </p>
      )}

      <button
        onClick={() => toggle(place.id)}
        aria-pressed={isAdded}
        className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition ${
          isAdded ? 'bg-teal text-white hover:bg-teal/90' : 'border-2 border-ink text-ink hover:bg-ink/5'
        }`}
      >
        {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {isAdded ? t.added : t.add}
      </button>
      <SourceLinks sources={place.sources} className="mt-2" />
    </article>
  )
}
