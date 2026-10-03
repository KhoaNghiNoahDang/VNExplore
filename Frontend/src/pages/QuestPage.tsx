import { useMemo, useState } from 'react'
import { useStart } from '../components/NeedStart'
import { Camera, Gift, Headphones, Play, Target, Users, X } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROLE_ICON, TONE_BG } from '../components/icons'
import { MapStopCard } from '../components/MapCards'
import MapView, { type MapPanel } from '../components/MapView'
import PrimaryButton from '../components/PrimaryButton'
import { CostLines, LegLine, TravelBanner } from '../components/TravelBits'
import { EventLink, EventStopMeta, eventPrice } from '../components/EventBits'
import { TransportHintCard, WeatherPill } from '../components/ContextBits'
import TopBar from '../components/TopBar'
import TripChips from '../components/TripChips'
import SaveQuestButton from '../components/SaveQuest'
import { PartyCreateSheet } from '../components/PartyBits'
import { useAuth } from '../store/AuthContext'
import { missionFor } from '../data/roles'
import { distance, duration, minutes, moneyRange } from '../lib/format'
import { storyMinutes, storyOf, suggestPhotoSpot, summarize } from '../lib/quest'
import { hanoiClock } from '../lib/events'
import { useQuest } from '../store/QuestContext'

export default function QuestPage() {
  const { t, lang, intent, places, areaPlaces, selected, toggle, dismissed, dismiss, mode, role, journey, startJourney, travel, geo, routeOrder, weather } =
    useQuest()
  const start = useStart()
  const navigate = useNavigate()
  const auth = useAuth()
  const [partyOpen, setPartyOpen] = useState(false)

  const chosen = useMemo(() => places.filter((p) => selected.includes(p.id)), [places, selected])
  const sum = useMemo(() => summarize(start, chosen, intent?.people ?? 1, travel, routeOrder),
    [start, chosen, intent, travel, routeOrder])
  // Shared quests are reusable, so they leave out dated event stops.
  const hasEvents = sum.stops.some((s) => s.event)
  const shareSum = useMemo(
    () => (hasEvents ? summarize(start, chosen.filter((p) => !p.event), intent?.people ?? 1, travel, routeOrder) : sum),
    [hasEvents, start, chosen, intent, travel, routeOrder, sum],
  )
  const lateStop = sum.stops.findIndex((_, i) => sum.lateMin[i] > 0)
  const suggestion = useMemo(
    () => suggestPhotoSpot(areaPlaces.filter((p) => !dismissed.includes(p.id)), sum.stops),
    [areaPlaces, dismissed, sum.stops],
  )

  if (!intent || !mode) return <Navigate to="/" replace />

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

  // Explore: the role is chosen here, once the route is known.
  const needsRole = mode === 'explore' && !role
  const startButton = needsRole ? (
    <PrimaryButton disabled={!sum.stops.length} onClick={() => navigate('/role?next=/quest&back=/quest')} className="py-4 font-extrabold shadow-xl">
      <Target className="h-4 w-4" /> {t.pickRoleForRoute}
    </PrimaryButton>
  ) : (
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
          {sum.stops.some((s) => s.event && !s.event.priceKnown) && (
            <p className="mt-0.5 text-[10px] font-bold text-bark/60">+ {t.eventTicketsExtra}</p>
          )}
        </div>
        <div className="mt-3">
          <TripChips transport={travel.transport} />
        </div>
        {explore && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-brick">
            <Target className="h-3.5 w-3.5" /> {role!.goal[lang].replace('{n}', String(sum.stops.length))}
            <button onClick={() => navigate('/role?next=/quest&back=/quest')} className="ml-auto text-[11px] font-bold text-teal underline underline-offset-2">
              {t.changeRole}
            </button>
          </p>
        )}
        {needsRole && sum.stops.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-brick/5 px-3 py-2 text-[12px] font-medium text-brick">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t.pickRoleHint}
          </p>
        )}
        <p className="mt-2 text-xs opacity-70">{t.questIntro[mode]}</p>
      </div>

      <div className="thin-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-4">
        {sum.stops.length === 0 ? (
          <p className="py-10 text-center text-sm opacity-60">{t.emptyQuest}</p>
        ) : (
          <>
            <WeatherPill weather={weather} />
            <TransportHintCard start={start} stops={sum.stops} people={intent.people} order={routeOrder} />
            <TravelBanner legs={sum.legs} />
            {lateStop !== -1 && (
              <p role="alert" className="rounded-2xl border-2 border-brick/30 bg-brick/5 p-3 text-[12px] font-medium text-brick">
                <b>{sum.stops[lateStop].name[lang]}</b> · {t.eventLate(sum.lateMin[lateStop])}. {t.eventLateHint}
              </p>
            )}
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
                            <Gift className="h-3 w-3" /> {missionFor(role!, s).item[lang]}
                          </div>
                        )}
                        {mode === 'listen' && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-teal">
                            <Headphones className="h-3 w-3" /> ~{minutes(storyMinutes(storyOf(s, lang)), lang)}
                          </div>
                        )}
                        {s.event ? (
                          <EventStopMeta place={s} wait={sum.waitMin[i]} late={sum.lateMin[i]} />
                        ) : (
                          hasEvents && (
                            <div className="text-[10px] font-semibold text-bark/60">{t.eventArrive(hanoiClock(sum.arriveAt[i]))}</div>
                          )
                        )}
                        {mode === 'easy' && (
                          <div className="text-[10px] font-bold text-bark">
                            {s.event
                              ? eventPrice(s, intent.people, lang, t)
                              : moneyRange(s.priceMin * intent.people, s.priceMax * intent.people, lang)}
                          </div>
                        )}
                        {s.event?.url && <EventLink url={s.event.url} className="mt-1.5 !min-h-9 w-fit !rounded-lg !border !px-2.5 !text-[11px]" />}
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

            {mode === 'explore' && auth.enabled && (
              <button
                onClick={() => setPartyOpen(true)}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-teal/30 bg-teal/5 p-3 text-left transition hover:border-teal"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal text-white">
                  <Users className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{t.partyPlayTogether}</span>
                  <span className="block text-[11px] leading-snug text-bark/70">{t.partyPlayTogetherSub}</span>
                </span>
              </button>
            )}
            <SaveQuestButton summary={shareSum} className="w-full" />
            {hasEvents && <p className="-mt-4 text-center text-[10px] text-bark/55">{t.eventNotShared}</p>}

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
      {partyOpen && <PartyCreateSheet stops={sum.stops} routeMin={sum.totalMin} onClose={() => setPartyOpen(false)} />}
    </div>
  )
}
