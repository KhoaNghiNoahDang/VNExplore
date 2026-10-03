import { useState } from 'react'
import { ArrowRight, Clock3, Cloud, CloudRain, CloudSun, Sun, ThermometerSun, X } from 'lucide-react'
import { TRANSPORT_INFO } from '../i18n/strings'
import { distance, money } from '../lib/format'
import { suggestTransport } from '../lib/quest'
import type { Weather } from '../lib/weather'
import { useQuest } from '../store/QuestContext'
import type { LatLng, Place } from '../types'
import TransportIcon from './TransportIcon'

/** "☁ 28°C · 70% rain — indoor places first". Nothing while the forecast is loading or offline. */
export function WeatherPill({ weather }: { weather: Weather | null }) {
  const { t } = useQuest()
  if (!weather) return null
  const { tempC, rainProb, rainy, hot, hour } = weather
  const Icon = rainy ? CloudRain : hot ? Sun : rainProb >= 30 ? Cloud : CloudSun
  const midday = hour >= 11 && hour < 15
  const advice = rainy ? t.wxRain : hot && midday ? t.wxHot : null
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl px-3 py-2 text-[12px] font-medium ${
        rainy ? 'bg-teal/10 text-teal' : hot ? 'bg-sun/25 text-bark' : 'bg-white/70 text-bark'
      }`}
    >
      {hot && !rainy ? <ThermometerSun className="mt-0.5 h-4 w-4 shrink-0" /> : <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>
        <b>
          {tempC}°C{rainProb >= 20 ? ` · ${t.wxRainProb(rainProb)}` : ''}
        </b>
        {advice && <> — {advice}</>}
      </span>
    </div>
  )
}

/**
 * "Stops are far apart — a motorbike saves ~25 min" or "rush hour — leave at 19:00" with a one-tap fix
 * (switch transport or departure time).
 */
export function TransportHintCard({
  start,
  stops,
  people,
  order,
}: {
  start: LatLng
  stops: Place[]
  people: number
  order?: string[] | null
}) {
  const { t, lang, travel, setTransport, setDepartAt } = useQuest()
  const [dismissed, setDismissed] = useState<string | null>(null)
  const hint = suggestTransport(start, stops, people, travel, order)
  const key = hint ? `${travel.transport}>${hint.to}:${hint.reason}:${stops.length}` : null
  if (!hint || dismissed === key) return null

  const name = TRANSPORT_INFO[lang][hint.to].name
  const extra = hint.extraCostK > 0 ? money(hint.extraCostK) : null
  const leaveTime =
    hint.departAt != null
      ? new Date(hint.departAt).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
      : ''
  const rush = hint.reason === 'rushCar' || hint.reason === 'rushShift'
  const body =
    hint.reason === 'allClose'
      ? t.hintAllClose
      : hint.reason === 'rushCar'
        ? t.hintRushCar(hint.savedMin, extra)
        : hint.reason === 'rushShift'
          ? t.hintRushShift(leaveTime, hint.savedMin)
          : t.hintFar(distance(hint.longestM), hint.savedMin, extra)

  return (
    <div className="relative rounded-2xl border-2 border-teal/30 bg-teal/5 p-3 pr-9">
      <button
        onClick={() => setDismissed(key)}
        className="absolute right-2 top-2 rounded-full p-1 text-bark/50 hover:bg-white hover:text-ink"
        aria-label={t.close}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal text-white">
          {hint.reason === 'rushShift' ? (
            <Clock3 className="h-5 w-5" strokeWidth={1.9} />
          ) : (
            <TransportIcon transport={hint.to} className="h-5 w-5" strokeWidth={1.9} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-teal">{t.smartTransportTip}</p>
          <p className="text-[12px] font-medium leading-snug text-ink">{body}</p>
          {hint.grab && hint.grab.costK > 0 && (
            <p className="mt-1 text-[11px] leading-snug text-bark/80">{t.hintGrab(`≈${money(hint.grab.costK)}`, hint.grab.peak)}</p>
          )}
          {rush && <p className="mt-1 text-[11px] leading-snug text-bark/80">{t.hintRushDetour}</p>}
          <button
            onClick={() => (hint.departAt != null ? setDepartAt(hint.departAt) : setTransport(hint.to))}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[12px] font-bold text-white transition active:scale-95"
          >
            {hint.departAt != null ? t.leaveAt(leaveTime) : t.switchTo(name)} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
