import { Info, TrafficCone } from 'lucide-react'
import { TRANSPORT_INFO } from '../i18n/strings'
import { distance, minutes, money, moneyRange } from '../lib/format'
import { useQuest } from '../store/QuestContext'
import type { Leg } from '../types'
import TransportIcon from './TransportIcon'

/** "🛵 6 min · 2 bikes · fuel & parking ≈ 12k" + an optional note. */
export function LegLine({ leg, people }: { leg: Leg; people: number }) {
  const { lang, t } = useQuest()
  const info = TRANSPORT_INFO[lang][leg.transport]
  const bits = [minutes(leg.minutes, lang), distance(leg.distanceM)]
  if (leg.transport !== 'walk' && leg.vehicles > 1 && people > 1) bits.push(t.vehicles(leg.vehicles, info.vehicle))
  if (leg.costK > 0) bits.push(leg.transport === 'motorbike' ? t.fuel(money(leg.costK)) : t.fare(money(leg.costK)))

  return (
    <div className="text-[10px] leading-snug">
      <div className="flex items-center gap-1.5 font-bold text-bark">
        <TransportIcon transport={leg.transport} className="h-3.5 w-3.5 text-teal" strokeWidth={2.25} />
        <span>{bits.join(' · ')}</span>
      </div>
      {leg.note && (
        <div className={`mt-0.5 ${leg.note === 'short' ? 'text-bark/70' : 'text-brick'}`}>{t.legNote[leg.note]}</div>
      )}
    </div>
  )
}

/** Rush hour / walking street warnings for a set of legs. */
export function TravelBanner({ legs }: { legs: Leg[] }) {
  const { t } = useQuest()
  const moving = legs.filter((l) => l.requested !== 'walk')
  const peak = moving.some((l) => l.peak && l.transport !== 'walk')
  const walkingStreet = moving.some((l) => l.note === 'walkingStreet' || l.note === 'parkOutside')
  if (!peak && !walkingStreet) return null
  return (
    <div className="space-y-1.5">
      {peak && (
        <div className="flex items-start gap-2 rounded-xl bg-brick/10 px-3 py-2 text-[11px] font-medium text-brick">
          <TrafficCone className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t.peakBanner}
        </div>
      )}
      {walkingStreet && (
        <div className="flex items-start gap-2 rounded-xl bg-teal/10 px-3 py-2 text-[11px] font-medium text-teal">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t.walkingStreetBanner}
        </div>
      )}
    </div>
  )
}

/** Two cost lines: tickets & food, getting around. */
export function CostLines({ costMin, costMax, travelCostK }: { costMin: number; costMax: number; travelCostK: number }) {
  const { lang, t } = useQuest()
  return (
    <div className="text-[11px] font-bold">
      <span className="text-brick">
        {t.ticketsFood} {moneyRange(costMin, costMax, lang)}
      </span>
      <span className="opacity-40"> · </span>
      <span className="text-bark">
        {t.travelCost} {travelCostK > 0 ? `≈ ${money(travelCostK)}` : moneyRange(0, 0, lang)}
      </span>
    </div>
  )
}
