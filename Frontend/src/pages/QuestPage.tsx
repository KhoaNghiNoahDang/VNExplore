import { useMemo } from 'react'
import { Camera, Gift, Headphones, Play, Target, X } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROLE_ICON, TONE_BG } from '../components/icons'
import { MapStopCard } from '../components/MapCards'
import MapView, { type MapPanel } from '../components/MapView'
import PrimaryButton from '../components/PrimaryButton'
import { CostLines, LegLine, TravelBanner } from '../components/TravelBits'
import TopBar from '../components/TopBar'
import TripChips from '../components/TripChips'
import { missionFor } from '../data/roles'
import { distance, duration, minutes, moneyRange } from '../lib/format'
import { storyMinutes, suggestPhotoSpot, summarize } from '../lib/quest'
import { useQuest } from '../store/QuestContext'

export default function QuestPage() {
  const { t, lang, intent, places, start, selected, toggle, dismissed, dismiss, mode, role, journey, startJourney, travel, geo } =
    useQuest()
  const navigate = useNavigate()

  const chosen = useMemo(() => places.filter((p) => selected.includes(p.id)), [places, selected])
  const sum = useMemo(() => summarize(start, chosen, intent?.people ?? 1, travel), [start, chosen, intent, travel])
  const suggestion = useMemo(
    () => suggestPhotoSpot(places.filter((p) => !dismissed.includes(p.id)), sum.stops),
    [places, dismissed, sum.stops],
  )

  if (!intent || !mode) return <Navigate to="/" replace />
  if (mode === 'explore' && !role) return <Navigate to="/role?next=/quest&back=/" replace />

  const explore = mode === 'explore' && role
  const RoleIcon = role ? ROLE_ICON[role.id] : null
  const title = t.questTitle[mode](role?.name[lang] ?? '')
  const pills = [duration(sum.totalMin, lang), distance(sum.distanceM), t.people(intent.people)]

  const stopIds = sum.stops.map((s) => s.id)
  const sameJourney = !!journey && journey.stopIds.join() === stopIds.join()
  const go = () => {
    if (sameJourney) {
      const next = journey!.stopIds.findIndex((id) => !journey!.arrived[id])
      navigate(`/go/${next === -1 ? 0 : next}`)
    } else {
      startJourney(stopIds, start)
      navigate('/go/0')
    }
  }

  const startButton = (
    <PrimaryButton disabled={!sum.stops.length} onClick={go} className="py-4 font-extrabold shadow-xl">
      {sameJourney ? t.continueQuest : t.startQuest} <Play className="h-4 w-4 fill-current" />
    </PrimaryButton>
  )
  const mapPanel: MapPanel = {
    title: t.mapTitleRoute(sum.stops.length),
    summary: (
      <>
        <div className="text-xs font-bold">{pills.join(' · ')}</div>
        <CostLines costMin={sum.costMin} costMax={sum.costMax} travelCostK={sum.travelCostK} />
      </>
    ),
    items: sum.stops.map((s, i) => ({
      id: s.id,
      render: () => <MapStopCard place={s} index={i} leg={sum.legs[i]} people={intent.people} />,
    })),
    action: startButton,
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/places" showMode />
      <div className="px-6 pb-4">
        <div className="flex items-center gap-3">
          {explore && RoleIcon && (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_BG[role!.tone]}`}>
              <RoleIcon className="h-5 w-5" />
            </div>
          )}
          <h1 className="text-xl font-bold leading-tight">{title}</h1>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {pills.map((p) => (
            <span key={p} className="rounded-full border border-sand bg-white px-3 py-1 text-[10px] font-bold">
              {p}
            </span>
          ))}
        </div>
        <div className="mt-2">
          <CostLines costMin={sum.costMin} costMax={sum.costMax} travelCostK={sum.travelCostK} />
        </div>
        <div className="mt-3">
          <TripChips transport={travel.transport} />
        </div>
        {explore && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-brick">
            <Target className="h-3.5 w-3.5" /> {role!.goal[lang].replace('{n}', String(sum.stops.length))}
          </p>
        )}
        <p className="mt-2 text-xs opacity-70">{t.questIntro[mode]}</p>
      </div>

      <div className="thin-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-4">
        {sum.stops.length === 0 ? (
          <p className="py-10 text-center text-sm opacity-60">{t.emptyQuest}</p>
        ) : (
          <>
            <TravelBanner legs={sum.legs} />
            <MapView
              start={start}
              places={sum.stops}
              route={sum.stops}
              startLabel={t.youAreHere}
              height={220}
              userPos={geo.status === 'on' ? geo.position : null}
              legModes={sum.legs.map((l) => l.transport)}
              panel={mapPanel}
            />

            <ol className="space-y-1">
              {sum.stops.map((s, i) => {
                return (
                  <li key={s.id}>
                    <div className="ml-4 border-l-2 border-dashed border-sand py-1.5 pl-7">
                      <LegLine leg={sum.legs[i]} people={intent.people} />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">
                          {s.name[lang]} · <span className="font-normal opacity-60">{minutes(s.visitMin, lang)}</span>
                        </div>
                        {explore && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-bark">
                            <Gift className="h-3 w-3" /> {missionFor(role!, s.id).item[lang]}
                          </div>
                        )}
                        {mode === 'listen' && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-teal">
                            <Headphones className="h-3 w-3" /> ~{minutes(storyMinutes(s.story[lang]), lang)}
                          </div>
                        )}
                        {mode === 'easy' && (
                          <div className="text-[10px] font-bold text-bark">
                            {moneyRange(s.priceMin * intent.people, s.priceMax * intent.people, lang)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggle(s.id)}
                        aria-label={`${t.remove} ${s.name[lang]}`}
                        className="rounded-full p-1.5 opacity-40 transition hover:bg-black/5 hover:opacity-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ol>

            {suggestion && (
              <div className="rounded-2xl border-2 border-leaf/20 bg-leaf/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-white p-2">
                    <Camera className="h-4 w-4 text-leaf" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold">{t.photoOnWay}</div>
                    <div className="text-[11px] font-medium">{suggestion.name[lang]}</div>
                    <div className="text-[10px] opacity-60">
                      +{minutes(suggestion.visitMin, lang)} · {suggestion.priceMax === 0 ? t.free : moneyRange(suggestion.priceMin, suggestion.priceMax, lang)}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => toggle(suggestion.id)}
                        className="rounded-lg bg-leaf px-3 py-1.5 text-[10px] font-bold text-white"
                      >
                        {t.add}
                      </button>
                      <button onClick={() => dismiss(suggestion.id)} className="px-3 py-1.5 text-[10px] font-bold">
                        {t.noThanks}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        {startButton}
      </div>
    </div>
  )
}
