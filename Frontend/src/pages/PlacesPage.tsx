import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROLE_ICON, TONE_BG } from '../components/icons'
import IntentChips from '../components/IntentChips'
import MapView from '../components/MapView'
import PlaceCard from '../components/PlaceCard'
import PrimaryButton from '../components/PrimaryButton'
import { CostLines, TravelBanner } from '../components/TravelBits'
import TopBar from '../components/TopBar'
import TripChips from '../components/TripChips'
import { duration, minutes, moneyRange } from '../lib/format'
import { rankPlaces, summarize } from '../lib/quest'
import { useQuest } from '../store/QuestContext'

export default function PlacesPage() {
  const { t, lang, intent, places, loading, start, selected, toggle, mode, role, travel, geo } = useQuest()
  const navigate = useNavigate()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const favIds = mode === 'explore' && role ? role.favPlaces : undefined
  const ranked = useMemo(
    () => (intent ? rankPlaces(places, intent, start, favIds) : []),
    [places, intent, start, favIds],
  )
  const chosen = useMemo(() => places.filter((p) => selected.includes(p.id)), [places, selected])
  const sum = useMemo(() => summarize(start, chosen, intent?.people ?? 1, travel), [start, chosen, intent, travel])

  if (!intent || !mode) return <Navigate to="/" replace />
  if (mode === 'explore' && !role) return <Navigate to="/role?next=/places" replace />

  const focused = ranked.find((p) => p.id === focusedId) ?? null
  const overTime = chosen.length > 0 && sum.totalMin > intent.hours * 60 + 10
  const RoleIcon = role ? ROLE_ICON[role.id] : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo={mode === 'explore' ? '/role?next=/places' : '/'} showMode />
      <div className="px-6 pb-2">
        <h1 className="text-xl font-bold">{t.placesTitle}</h1>
        <p className="text-xs opacity-60">{t.placesCount(ranked.length)}</p>
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
              onClick={() => navigate('/role?next=/places')}
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

      <div className="border-t-2 border-sand bg-butter px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        {chosen.length > 0 && (
          <div className="mb-3">
            <TravelBanner legs={sum.legs} />
          </div>
        )}
        <div className="mb-3">
          <div className="text-xs font-bold">
            {chosen.length ? t.summaryLine(chosen.length, duration(sum.totalMin, lang)) : t.pickOne}
          </div>
          {chosen.length > 0 && (
            <>
              <div className="text-[10px] opacity-60">
                {t.visitTime} {duration(sum.visitMin, lang)} · {t.travelTime} {duration(sum.travelMin, lang)}
              </div>
              <div className="mt-1">
                <CostLines costMin={sum.costMin} costMax={sum.costMax} travelCostK={sum.travelCostK} />
              </div>
            </>
          )}
          {overTime && <div className="mt-1 text-[10px] text-bark">{t.overTime(t.hours(intent.hours))}</div>}
        </div>
        <PrimaryButton disabled={!chosen.length} onClick={() => navigate('/quest')}>
          {t.buildQuest}
        </PrimaryButton>
      </div>
    </div>
  )
}
