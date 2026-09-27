import { Clock3, MapPin, Wallet, type LucideIcon } from 'lucide-react'
import { duration, money } from '../lib/format'
import type { QuestSummary } from '../lib/quest'
import { useQuest } from '../store/QuestContext'

function Stat({ icon: Icon, value, label, tone = 'text-ink' }: { icon: LucideIcon; value: string; label: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-sand bg-white px-2.5 py-2">
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-bark/70">
        <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-0.5 truncate text-[15px] font-extrabold leading-tight ${tone}`}>{value}</div>
    </div>
  )
}

/**
 * The picked-places summary: three big numbers, a time bar against the hours
 * the traveller asked for, and one quiet line with the breakdown.
 */
export default function TripSummary({
  count,
  sum,
  hours,
  people,
}: {
  count: number
  sum: QuestSummary
  hours: number
  people: number
}) {
  const { lang, t } = useQuest()
  const budgetMin = hours * 60
  const ratio = Math.min(sum.totalMin / budgetMin, 1)
  const over = sum.totalMin > budgetMin + 10
  const costLo = sum.costMin + sum.travelCostK
  const costHi = sum.costMax + sum.travelCostK
  const cost = costHi === 0 ? t.freeShort : costLo === costHi ? `≈${money(costLo)}` : `${money(costLo)}–${money(costHi)}`

  return (
    <div>
      <div className="grid grid-cols-[0.8fr_1fr_1.25fr] gap-2">
        <Stat icon={MapPin} value={String(count)} label={t.statPlaces} />
        <Stat icon={Clock3} value={duration(sum.totalMin, lang)} label={t.statTime} tone={over ? 'text-brick' : 'text-ink'} />
        <Stat icon={Wallet} value={cost} label={t.forN(people)} tone="text-teal" />
      </div>

      {/* Time used vs. time wanted */}
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand/70" aria-hidden>
          <div
            className={`h-full rounded-full transition-all ${over ? 'bg-brick' : 'bg-teal'}`}
            style={{ width: `${Math.max(ratio * 100, 4)}%` }}
          />
        </div>
        <span className={`shrink-0 text-[10px] font-bold ${over ? 'text-brick' : 'text-bark/70'}`}>
          {over ? t.overShort(t.hours(hours)) : t.ofHours(t.hours(hours))}
        </span>
      </div>

      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 text-[10px] leading-snug text-bark/80">
        <div className="flex justify-between gap-1">
          <dt>{t.visitTime}</dt>
          <dd className="font-bold">{duration(sum.visitMin, lang)}</dd>
        </div>
        <div className="flex justify-between gap-1">
          <dt>{t.ticketsFood}</dt>
          <dd className="font-bold">{sum.costMax === 0 ? t.freeShort : `${money(sum.costMin)}–${money(sum.costMax)}`}</dd>
        </div>
        <div className="flex justify-between gap-1">
          <dt>{t.travelTime}</dt>
          <dd className="font-bold">{duration(sum.travelMin, lang)}</dd>
        </div>
        <div className="flex justify-between gap-1">
          <dt>{t.fareLabel}</dt>
          <dd className="font-bold">{sum.travelCostK > 0 ? `≈${money(sum.travelCostK)}` : t.freeShort}</dd>
        </div>
      </dl>
      {sum.legs.some((l) => l.costK > 0 && (l.transport === 'grabbike' || l.transport === 'car')) && (
        <p className="mt-1 text-[10px] leading-snug text-bark/60">{t.rideFareNote}</p>
      )}
    </div>
  )
}
