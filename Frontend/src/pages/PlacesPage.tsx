import { useMemo, useState } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROLE_ICON, TONE_BG } from '../components/icons'
import IntentChips from '../components/IntentChips'
import { MapPlaceCard } from '../components/MapCards'
import MapView, { type MapPanel } from '../components/MapView'
import PlaceCard from '../components/PlaceCard'
import PrimaryButton from '../components/PrimaryButton'
import { CostLines, TravelBanner } from '../components/TravelBits'
import { TransportHintCard } from '../components/ContextBits'
import TopBar from '../components/TopBar'
import TripSummary from '../components/TripSummary'
import TripChips from '../components/TripChips'
import { duration, minutes, moneyRange } from '../lib/format'
import { rankPlaces, summarize } from '../lib/quest'
import { estimateLeg } from '../lib/travel'
import { useQuest } from '../store/QuestContext'

export default function PlacesPage() {
  const { t, lang, intent, places, areaPlaces, area, contextFor, loading, start, selected, toggle, mode, role, travel, geo } = useQuest()
  const navigate = useNavigate()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const favIds = mode === 'explore' && role ? role.favPlaces : undefined
  const ranked = useMemo(
    () => (intent ? rankPlaces(areaPlaces, intent, start, favIds, contextFor(area)) : []),
    [areaPlaces, intent, start, favIds, contextFor, area],
  )
  const chosen = useMemo(() => places.filter((p) => selected.includes(p.id)), [places, selected])
  const sum = useMemo(() => summarize(start, chosen, intent?.people ?? 1, travel), [start, chosen, intent, travel])

  if (!intent || !mode) return <Navigate to="/" replace />
  if (mode === 'explore' && !role) return <Navigate to="/role?next=/places&back=/" replace />

  const focused = ranked.find((p) => p.id === focusedId) ?? null
  const at = new Date(travel.departAt ?? Date.now())

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
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo={mode === 'explore' ? '/role?next=/places&back=/' : '/'} showMode />
      <div className="px-6 pb-2">
        <h1 className="text-xl font-bold">{t.placesTitle}</h1>
        <p className="text-xs opacity-60">{t.placesCount(ranked.length, t.areaShort[area])}</p>
        {intent.summary?.[lang] && (
          <p className="mt-2 rounded-xl bg-butter/60 px-3 py-2 text-[12px] leading-snug text-bark">
            <b>{t.understood}:</b> {intent.summary[lang]}
          </p>
        )}
        {mode === 'explore' && role && RoleIcon && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-sand bg-white px-3 py-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONE_BG[role.tone]}`}>
              <RoleIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 text-[11px] leading-tight">
              <div className="font-bold">{role.name[lang]}</div>
              <div className="truncate opacity-60">{role.goal[lang].replace('{n}', String(Math.max(chosen.length, 1)))}</div>
            </div>
            <button
              onClick={() => navigate('/role?next=/places&back=/places')}
              className="text-[11px] font-bold text-teal underline underline-offset-2"
            >
              {t.changeRole}
            </button>
          </div>
        )}
        <div className="mt-3 space-y-2">
          <IntentChips intent={intent} onEdit={() => navigate('/')} />
          <TripChips transport={travel.transport} />
        </div>
        <div className="mt-5 flex rounded-xl bg-black/5 p-1" role="tablist">
          {(['list', 'map'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                view === v ? 'bg-white shadow-sm' : 'opacity-50 hover:opacity-80'
              }`}
            >
              {v === 'list' ? t.listTab : `${t.mapTab}`}
              {v === 'list' && selected.length > 0 && (
                <span className="ml-1 font-medium opacity-60">
                  · {selected.length} {t.selectedSuffix}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="thin-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {loading ? (
          <p className="py-10 text-center text-sm opacity-60">{t.loading}</p>
        ) : view === 'list' ? (
          ranked.map((p) => <PlaceCard key={p.id} place={p} people={intent.people} />)
        ) : (
          <>
            <MapView
              start={start}
              places={ranked}
              selectedIds={selected}
              focusedId={focusedId}
              onPinClick={(p) => setFocusedId(p.id)}
              height={320}
              userPos={geo.status === 'on' ? geo.position : null}
              startLabel={t.youAreHere}
              panel={mapPanel}
            />
            <p className="text-center text-[11px] opacity-60">{t.mapTapHint}</p>
            {focused && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-sand bg-white p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{focused.name[lang]}</div>
                  <div className="text-[10px] opacity-60">
                    {moneyRange(focused.priceMin * intent.people, focused.priceMax * intent.people, lang)} ·{' '}
                    {minutes(focused.visitMin, lang)}
                  </div>
                </div>
                <button
                  onClick={() => toggle(focused.id)}
                  className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${
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

      <div className="relative z-10 rounded-t-[28px] border-t border-sand/70 bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-18px_rgba(58,42,26,0.45)]">
        {chosen.length > 0 ? (
          <>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-bark/60">{t.yourPlan}</span>
              <TravelBanner legs={sum.legs} compact />
            </div>
            <TripSummary count={chosen.length} sum={sum} hours={intent.hours} people={intent.people} />
          </>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl border border-dashed border-sand px-3 py-3 text-[12px] text-bark/80">
            <Plus className="h-4 w-4 shrink-0" /> {t.pickOneHint}
          </p>
        )}
        <div className="mt-3">{buildButton}</div>
      </div>
    </div>
  )
}
