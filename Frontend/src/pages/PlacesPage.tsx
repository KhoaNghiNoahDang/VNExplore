import { useMemo, useState } from 'react'
import { useStart } from '../components/NeedStart'
import { ArrowRight, ChevronDown, MapPin, Sparkles, X } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROLE_ICON, TONE_BG } from '../components/icons'
import IntentChips from '../components/IntentChips'
import { MapPlaceCard } from '../components/MapCards'
import MapView, { type MapPanel } from '../components/MapView'
import PlaceCard from '../components/PlaceCard'
import PrimaryButton from '../components/PrimaryButton'
import Sheet from '../components/Sheet'
import { CostLines, TravelBanner } from '../components/TravelBits'
import { EventsSection } from '../components/EventBits'
import { TransportHintCard } from '../components/ContextBits'
import TopBar from '../components/TopBar'
import TripSummary from '../components/TripSummary'
import TripChips from '../components/TripChips'
import { duration, minutes, moneyRange } from '../lib/format'
import { rankPlaces, suggestTransport, summarize } from '../lib/quest'
import { eventWhen } from '../lib/events'
import { buildPlannerReply, buildRouteDetails } from '../lib/plannerReply'
import { estimateLeg } from '../lib/travel'
import { useQuest } from '../store/QuestContext'

export default function PlacesPage() {
  const { t, lang, intent, places, areaPlaces, area, contextFor, loading, selected, toggle, mode, role, travel, geo, eventOptions } = useQuest()
  const start = useStart()
  const navigate = useNavigate()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [tripInfoOpen, setTripInfoOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)

  const favIds = mode === 'explore' && role ? role.favPlaces : undefined
  const ranked = useMemo(
    () => (intent ? rankPlaces(areaPlaces, intent, start, favIds, contextFor(area)) : []),
    [areaPlaces, intent, start, favIds, contextFor, area],
  )
  const chosen = useMemo(() => places.filter((p) => selected.includes(p.id)), [places, selected])
  // One pin per event on the map: the sitting in the plan, else the earliest.
  const eventPlaces = useMemo(
    () => eventOptions.map((o) => o.sittings.find((s) => selected.includes(s.id)) ?? o.sittings[0]),
    [eventOptions, selected],
  )
  const sum = useMemo(() => summarize(start, chosen, intent?.people ?? 1, travel), [start, chosen, intent, travel])

  if (!intent || !mode) return <Navigate to="/" replace />

  const focused = [...eventPlaces, ...ranked].find((p) => p.id === focusedId) ?? null
  const at = new Date(travel.departAt ?? Date.now())
  // A model reply describes the transport chosen when the request was submitted.
  // Once the traveller accepts a route-aware switch, use the local live reply so the advice never
  // keeps talking about the old transport.
  const liveIntent = travel.transport === intent.transport ? intent : { ...intent, transport: travel.transport }
  // With places picked, the details come from the route itself (and follow every change of stops,
  // transport or departure); before that, the model's reply or a local one.
  const plannerReply = chosen.length
    ? buildRouteDetails(liveIntent, lang, contextFor(area).weather ?? null, sum,
        suggestTransport(start, chosen, intent.people, travel))
    : (travel.transport === intent.transport ? intent.reply?.[lang] : '') ||
      buildPlannerReply(liveIntent, area, lang, contextFor(area).weather ?? null)

  const summaryBlock = (
    <>
      <div className="text-xs font-bold">
        {chosen.length ? t.summaryLine(chosen.length, duration(sum.totalMin, lang)) : t.pickOne}
      </div>
      {chosen.length > 0 && (
        <div className="mt-0.5">
          <CostLines costMin={sum.costMin} costMax={sum.costMax} travelCostK={sum.travelCostK} />
        </div>
      )}
      {chosen.length > 0 && (
        <div className="mt-2">
          <TransportHintCard start={start} stops={chosen} people={intent!.people} />
        </div>
      )}
    </>
  )
  const buildButton = (
    <PrimaryButton disabled={!chosen.length} onClick={() => navigate('/quest')}>
      {t.buildQuest}
      {chosen.length > 0 && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
    </PrimaryButton>
  )
  const mapPanel: MapPanel = {
    title: t.mapTitlePlaces(ranked.length, t.areaShort[area]),
    summary: chosen.length ? (
      <TripSummary count={chosen.length} sum={sum} hours={intent.hours} people={intent.people} />
    ) : (
      summaryBlock
    ),
    items: ranked.map((p) => ({
      id: p.id,
      render: () => (
        <MapPlaceCard
          place={p}
          leg={estimateLeg(start, p, travel.transport, at, intent.people)}
          people={intent.people}
          added={selected.includes(p.id)}
          onToggle={() => toggle(p.id)}
        />
      ),
    })),
    action: buildButton,
  }
  const RoleIcon = role ? ROLE_ICON[role.id] : null

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/" showMode />

      <div className={`thin-scroll min-h-0 flex-1 overflow-y-auto ${chosen.length ? 'pb-28' : 'pb-6'}`}>
        <section className="px-5 pb-3">
          <h1 className="text-[22px] font-extrabold tracking-tight">{t.placesTitle}</h1>
          <p className="mt-0.5 text-xs font-medium text-bark/65">{t.placesCount(ranked.length, t.areaShort[area])}</p>

          <div className="mt-3 overflow-hidden rounded-2xl border border-teal/20 bg-teal/[0.06]">
            <button
              type="button"
              onClick={() => setTripInfoOpen((value) => !value)}
              aria-expanded={tripInfoOpen}
              className="flex min-h-14 w-full items-start gap-2.5 px-3 py-3 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal text-white shadow-[0_5px_14px_-8px_rgba(47,138,132,0.9)]">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-teal">
                  {tripInfoOpen ? t.hideTripDetails : t.tripDetails}
                </span>
                <span className={`vx-planner-reply mt-0.5 block text-[12px] font-medium leading-relaxed text-bark ${tripInfoOpen ? 'is-expanded' : ''}`}>
                  {plannerReply}
                </span>
              </span>
              <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-teal transition-transform duration-200 ${tripInfoOpen ? 'rotate-180' : ''}`} />
            </button>

            {tripInfoOpen && (
              <div className="border-t border-teal/15 px-3 pb-3 pt-2">
                {mode === 'explore' && role && RoleIcon && (
                  <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/75 px-2.5 py-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_BG[role.tone]}`}>
                      <RoleIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 text-[11px] leading-tight">
                      <div className="font-bold">{role.name[lang]}</div>
                      <div className="truncate text-bark/65">{role.goal[lang].replace('{n}', String(Math.max(chosen.length, 1)))}</div>
                    </div>
                    <button
                      onClick={() => navigate('/role?next=/places&back=/places')}
                      className="min-h-10 px-1 text-[11px] font-bold text-teal underline underline-offset-2"
                    >
                      {t.changeRole}
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  <IntentChips intent={intent} onEdit={() => navigate('/')} />
                  <TripChips transport={travel.transport} />
                </div>
              </div>
            )}
          </div>

          {chosen.length > 0 && (
            <div className="mt-3">
              <TransportHintCard start={start} stops={chosen} people={intent.people} />
            </div>
          )}
        </section>

        <div className="sticky top-0 z-20 border-y border-sand/70 bg-paper/95 px-5 py-2 backdrop-blur-sm">
          <div className="flex rounded-xl bg-ink/[0.06] p-1" role="tablist">
            {(['list', 'map'] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`min-h-10 flex-1 rounded-lg px-2 text-xs font-bold transition-[background-color,color,box-shadow] duration-200 ${
                  view === v ? 'bg-white text-ink shadow-[0_4px_14px_-10px_rgba(58,42,26,0.65)]' : 'text-bark/60 hover:text-ink'
                }`}
              >
                {v === 'list' ? t.listTab : t.mapTab}
                {v === 'list' && selected.length > 0 && (
                  <span className="ml-1 font-semibold text-teal">· {selected.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 px-5 pt-4">
          {!chosen.length && !loading && view === 'list' && (
            <p className="flex items-center gap-2 rounded-xl bg-butter/40 px-3 py-2.5 text-[12px] font-medium text-bark">
              <MapPin className="h-4 w-4 shrink-0 text-brick" /> {t.pickOneHint}
            </p>
          )}
          {loading ? (
            <p className="py-10 text-center text-sm opacity-60">{t.loading}</p>
          ) : view === 'list' ? (
            <>
              <EventsSection people={intent.people} />
              <h2 className="pt-2 text-[15px] font-extrabold">{t.placesTitle}</h2>
              {ranked.map((p) => <PlaceCard key={p.id} place={p} people={intent.people} />)}
            </>
          ) : (
            <>
              <MapView
                start={start}
                places={[...eventPlaces, ...ranked]}
                selectedIds={selected}
                focusedId={focusedId}
                onPinClick={(p) => setFocusedId(p.id)}
                height={360}
                userPos={geo.status === 'on' ? geo.position : null}
                startLabel={t.youAreHere}
                panel={mapPanel}
              />
              <p className="text-center text-[11px] opacity-60">{t.mapTapHint}</p>
              {focused && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-white p-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{focused.name[lang]}</div>
                    <div className="mt-0.5 text-[11px] text-bark/65">
                      {focused.event
                        ? eventWhen(focused, lang)
                        : <>{moneyRange(focused.priceMin * intent.people, focused.priceMax * intent.people, lang)} · {minutes(focused.visitMin, lang)}</>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(focused.id)}
                    className={`min-h-11 shrink-0 rounded-xl px-4 text-xs font-bold ${
                      selected.includes(focused.id) ? 'bg-teal text-white' : 'border-2 border-ink'
                    }`}
                  >
                    {selected.includes(focused.id) ? t.added : t.add}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {chosen.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-sand/80 bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-12px_32px_-24px_rgba(58,42,26,0.65)] backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setPlanOpen(true)}
              className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left hover:bg-black/[0.035]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/12 font-extrabold text-teal">
                {chosen.length}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-bark/55">{t.yourPlan}</span>
                <span className="block truncate text-[12px] font-bold">{duration(sum.totalMin, lang)} · {moneyRange(sum.costMin + sum.travelCostK, sum.costMax + sum.travelCostK, lang)}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 rotate-180 text-bark/50" />
            </button>
            <PrimaryButton className="!w-auto shrink-0 !rounded-xl !border-b-[3px] px-4 !py-3 text-[12px]" onClick={() => navigate('/quest')}>
              {t.buildQuest}
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </PrimaryButton>
          </div>
        </div>
      )}

      {planOpen && (
        <Sheet title={t.routeDetails} onClose={() => setPlanOpen(false)} closeLabel={t.close}>
          <TripSummary count={chosen.length} sum={sum} hours={intent.hours} people={intent.people} />
          <div className="mt-4">
            <TravelBanner legs={sum.legs} />
          </div>
          <div className="mt-3">
            <TransportHintCard start={start} stops={chosen} people={intent.people} />
          </div>
          <div className="mt-4 space-y-2">
            {chosen.map((place, index) => (
              <div key={place.id} className="flex min-h-12 items-center gap-3 rounded-xl border border-sand bg-white px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-butter/70 text-[11px] font-extrabold">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{place.name[lang]}</span>
                <button
                  type="button"
                  onClick={() => toggle(place.id)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-bark/55 hover:bg-brick/10 hover:text-brick"
                  aria-label={`${t.remove}: ${place.name[lang]}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <PrimaryButton onClick={() => navigate('/quest')}>
              {t.buildQuest}
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </PrimaryButton>
          </div>
        </Sheet>
      )}
    </div>
  )
}
