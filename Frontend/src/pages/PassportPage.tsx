import { useMemo, useState } from 'react'
import { Award, BookOpen, Gift, Loader2, Lock, RotateCcw, ScrollText, Trash2 } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { MODE_ICON, ROLE_ICON, TONE_BG } from '../components/icons'
import PrimaryButton from '../components/PrimaryButton'
import Sheet from '../components/Sheet'
import Stamp from '../components/Stamp'
import TopBar from '../components/TopBar'
import { DongSonBand, DongSonDrum, Lotus } from '../components/VnArt'
import { getRole, missionFor, ROLES } from '../data/roles'
import { MODE_INFO } from '../i18n/strings'
import { distance, duration, moneyRange } from '../lib/format'
import { collectItems, collectStamps, deleteJourney, type PassportJourney } from '../lib/passport'
import { usePassport } from '../store/usePassport'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'
import type { Place, Theme } from '../types'

type Tab = 'stamps' | 'trips' | 'items'

export default function PassportPage() {
  const { t, lang, places } = useQuest()
  const { enabled, profile } = useAuth()
  const navigate = useNavigate()
  const { journeys, setJourneys, userId } = usePassport()
  const [tab, setTab] = useState<Tab>('stamps')
  const [open, setOpen] = useState<PassportJourney | null>(null)

  const stamps = useMemo(() => collectStamps(journeys ?? []), [journeys])
  const items = useMemo(() => collectItems(journeys ?? []), [journeys])
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places])
  const gold = [...stamps.values()].filter((s) => s.gold).length
  const fmtDate = (ms: number, long = false) =>
    new Date(ms).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'numeric', year: '2-digit' })

  if (!enabled) return <Navigate to="/" replace />

  // Visited first (newest stamp first), then the ones still to collect.
  const visited = places.filter((p) => stamps.has(p.id)).sort((a, b) => stamps.get(b.id)!.firstAt - stamps.get(a.id)!.firstAt)
  // Collectible stamps = places with a story; food/fun stops still get a stamp when visited.
  const collectible = places.filter((p) => p.depth === 'full')
  const toGo = collectible.filter((p) => !stamps.has(p.id))
  const got = collectible.length - toGo.length
  const pct = collectible.length ? Math.round((got / collectible.length) * 100) : 0

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'stamps', label: t.tabStamps, count: stamps.size },
    { key: 'trips', label: t.tabTrips, count: journeys?.length ?? 0 },
    { key: 'items', label: t.tabItems, count: [...items.values()].reduce((n, s) => n + s.size, 0) },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/me" />
      <div className="thin-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-10">
        {/* Cover */}
        <div className="px-6">
          <div className="relative overflow-hidden rounded-[28px] bg-brick px-5 py-5 text-white shadow-[0_12px_30px_-14px_rgba(142,48,32,0.7)]">
            <DongSonDrum className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 text-sun/25" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-sun">
                <BookOpen className="h-3.5 w-3.5" /> VNExplore · Hà Nội
              </div>
              <h1 className="mt-2 text-[24px] font-bold leading-tight">{t.passportBook}</h1>
              {profile?.display_name && <p className="text-[13px] opacity-85">{profile.display_name}</p>}
              <p className="mt-3 text-[12px] font-bold">{t.passportStats(stamps.size, journeys?.length ?? 0, gold)}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-sun transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] opacity-80">{t.stampsProgress(got, collectible.length)}</p>
            </div>
          </div>
          {!userId && (
            <button onClick={() => navigate('/login?next=/passport')} className="mt-2 w-full rounded-2xl bg-sun/25 px-3 py-2 text-left text-[12px] font-medium text-bark">
              {t.passportGuestNote}
            </button>
          )}
        </div>

        {/* Section switch */}
        <div className="sticky top-0 z-10 mt-4 bg-paper/95 px-6 py-2 backdrop-blur">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-sand/50 p-1" role="tablist">
            {tabs.map(({ key, label, count }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-xl py-2 text-[13px] font-bold transition ${tab === key ? 'bg-white text-ink shadow-sm' : 'text-bark/70 hover:text-ink'}`}
              >
                {label} <span className="font-medium opacity-60">{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pt-3">
          {journeys === null ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-bark/50" />
            </div>
          ) : tab === 'stamps' ? (
            <>
              {!visited.length && <Empty title={t.noStampsYet} sub={t.noStampsSub} />}
              {visited.length > 0 && (
                <div className="grid grid-cols-3 gap-x-2 gap-y-4 rounded-[24px] border-2 border-sand bg-white px-2 py-5">
                  {visited.map((p, i) => {
                    const s = stamps.get(p.id)!
                    return (
                      <div key={p.id} className="flex flex-col items-center">
                        <Stamp place={p} index={i} size="sm" gold={s.gold} />
                        <div className="mt-2 max-w-full truncate px-1 text-center text-[11px] font-bold">{p.name[lang]}</div>
                        <div className="text-[10px] text-bark/70">
                          {fmtDate(s.firstAt)}
                          {s.times > 1 && ` · ${t.visitedTimes(s.times)}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {toGo.length > 0 && (
                <>
                  <DongSonBand className="my-5 h-2 w-full text-sand" />
                  <div className="grid grid-cols-3 gap-x-2 gap-y-3 px-2">
                    {toGo.map((p, i) => (
                      <div key={p.id} className="flex flex-col items-center">
                        <Stamp place={p} index={i} size="sm" empty emptyLabel={t.notVisited} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : tab === 'trips' ? (
            !journeys.length ? (
              <Empty title={t.noTrips} />
            ) : (
              <ul className="space-y-3">
                {journeys.map((j) => (
                  <li key={j.clientId}>
                    <TripCard j={j} byId={byId} date={fmtDate(j.finishedAt, true)} onOpen={() => setOpen(j)} />
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ItemsView items={items} byId={byId} />
          )}
        </div>
      </div>

      {open && (
        <TripSheet
          j={open}
          byId={byId}
          date={fmtDate(open.finishedAt, true)}
          onClose={() => setOpen(null)}
          onDelete={async () => {
            if (!confirm(t.confirmDeleteTrip)) return
            await deleteJourney(open.clientId, userId).catch(() => undefined)
            setJourneys((js) => js?.filter((x) => x.clientId !== open.clientId) ?? null)
            setOpen(null)
          }}
        />
      )}
    </div>
  )
}

function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-[24px] border-2 border-dashed border-sand bg-white/60 px-6 py-10 text-center">
      <Lotus className="h-12 w-12" />
      <p className="mt-2 font-bold">{title}</p>
      {sub && <p className="mt-1 text-[13px] leading-relaxed text-bark/75">{sub}</p>}
    </div>
  )
}

function TripCard({ j, byId, date, onOpen }: { j: PassportJourney; byId: Map<string, Place>; date: string; onOpen: () => void }) {
  const { t, lang } = useQuest()
  const Icon = MODE_ICON[j.mode]
  const got = j.stopIds.filter((id) => j.arrived[id])
  const role = getRole(j.roleId)
  return (
    <button onClick={onOpen} className="w-full rounded-[22px] border-2 border-sand bg-white p-4 text-left transition hover:border-bark/30">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-butter text-bark">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold">{j.questTitle ?? t.ownRoute}</div>
          <div className="text-[12px] text-bark/75">
            {date} · {MODE_INFO[lang][j.mode].name}
            {role ? ` · ${role.name[lang]}` : ''}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 overflow-hidden">
        {got.slice(0, 6).map((id) => {
          const p = byId.get(id)
          return (
            <span
              key={id}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-double text-[7px] font-extrabold uppercase leading-none ${
                p ? TONE_BG[p.tone] : 'bg-sand'
              } ${j.items.includes(id) ? 'ring-2 ring-sun' : ''}`}
              title={p?.name[lang]}
            >
              {(p?.nameVi ?? '').split(' ').map((w) => w[0]).join('').slice(0, 3)}
            </span>
          )
        })}
        {got.length > 6 && <span className="text-[11px] font-bold text-bark/70">+{got.length - 6}</span>}
        <span className="ml-auto shrink-0 text-[11px] font-bold text-bark/70">{t.tripStopsOf(got.length, j.stopIds.length)}</span>
      </div>
    </button>
  )
}

/** One journey from the passport: its stamps, numbers, and "go again". */
function TripSheet({ j, byId, date, onClose, onDelete }: { j: PassportJourney; byId: Map<string, Place>; date: string; onClose: () => void; onDelete: () => void }) {
  const { t, lang, setIntent, setFromQuest, setMode, setRole, setTransport, setDepartAt } = useQuest()
  const navigate = useNavigate()
  const stops = j.stopIds.map((id) => byId.get(id)).filter((p): p is Place => !!p)
  const role = getRole(j.roleId)

  const replay = () => {
    const ids = stops.map((p) => p.id)
    const themes = [...new Set(stops.flatMap((p) => p.themes))].slice(0, 2) as Theme[]
    setIntent(
      {
        text: j.questTitle ?? stops.map((p) => p.name[lang]).join(', '),
        themes: themes.length ? themes : ['culture'],
        people: j.people,
        budget: 'any',
        hours: Math.max(1, Math.ceil(j.totalMin / 60)),
        hoursIsDefault: false,
        transport: j.transport,
        transportIsDefault: false,
      },
      ids,
      ids,
    )
    if (j.questId && j.questTitle) setFromQuest({ id: j.questId, title: j.questTitle })
    setTransport(j.transport)
    setDepartAt(null)
    if (j.mode === 'explore' && role) setRole(role.id)
    else setMode(j.mode === 'explore' ? 'listen' : j.mode)
    navigate('/quest')
  }

  return (
    <Sheet title={j.questTitle ?? t.ownRoute} onClose={onClose}>
      <p className="-mt-1 text-[12px] text-bark/75">
        {date} · {MODE_INFO[lang][j.mode].name}
        {role ? ` · ${role.name[lang]}` : ''}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[t.tripStopsOf(Object.keys(j.arrived).length, j.stopIds.length), duration(j.totalMin, lang), distance(j.distanceM), `${moneyRange(j.costMinK, j.costMaxK, lang)} ${t.forN(j.people)}`].map((x) => (
          <span key={x} className="rounded-full border border-sand bg-white px-3 py-1 text-[11px] font-bold">
            {x}
          </span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 place-items-center gap-3 rounded-[22px] border-2 border-ink bg-white p-4">
        {stops.map((p, i) => (
          <Stamp key={p.id} place={p} index={i} size="sm" gold={j.items.includes(p.id)} empty={!j.arrived[p.id]} emptyLabel={t.notVisited} />
        ))}
      </div>
      {j.questId && (
        <button onClick={() => navigate(`/q/${j.questId}`)} className="mt-3 flex w-full items-center gap-2 rounded-2xl border-2 border-sand bg-white px-3 py-2.5 text-[13px] font-bold">
          <ScrollText className="h-4 w-4 text-teal" /> {t.fromQuestLabel}: <span className="truncate">{j.questTitle}</span>
        </button>
      )}
      <div className="mt-4 flex gap-2">
        <button onClick={onDelete} className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border-2 border-sand text-brick hover:bg-brick/5" aria-label={t.deleteTrip}>
          <Trash2 className="h-5 w-5" />
        </button>
        <PrimaryButton className="flex-1" onClick={replay} disabled={!stops.length}>
          <RotateCcw className="h-4 w-4" /> {t.replay}
        </PrimaryButton>
      </div>
    </Sheet>
  )
}

/** Items per role: collected ones in colour, the rest as locked silhouettes. */
function ItemsView({ items, byId }: { items: Map<string, Set<string>>; byId: Map<string, Place> }) {
  const { t, lang } = useQuest()
  return (
    <div className="space-y-4">
      {!items.size && <Empty title={t.tabItems} sub={t.noItemsSub} />}
      {ROLES.map((role) => {
        const got = items.get(role.id) ?? new Set<string>()
        // Every mission place of the role, plus any place where a fallback item was earned.
        const ids = [...new Set([...Object.keys(role.missions), ...got])].filter((id) => byId.has(id))
        const Icon = ROLE_ICON[role.id]
        const have = ids.filter((id) => got.has(id)).length
        return (
          <section key={role.id} className="rounded-[22px] border-2 border-sand bg-white p-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_BG[role.tone]}`}>{Icon && <Icon className="h-5 w-5" />}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold">{role.name[lang]}</div>
                <div className="text-[12px] text-bark/70">{t.itemsOf(have, ids.length)}</div>
              </div>
              {have > 0 && have === ids.length && <Award className="h-5 w-5 text-sun-dark" />}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {ids.map((id) => {
                const on = got.has(id)
                const place = byId.get(id)!
                return (
                  <li key={id} className={`rounded-2xl p-2.5 ${on ? 'bg-butter' : 'border-2 border-dashed border-sand'}`}>
                    <div className="flex items-center gap-1.5">
                      {on ? <Gift className="h-4 w-4 shrink-0 text-bark" /> : <Lock className="h-3.5 w-3.5 shrink-0 text-bark/40" />}
                      <span className={`text-[12px] font-bold leading-tight ${on ? '' : 'text-bark/45'}`}>{on ? missionFor(role, id).item[lang] : t.lockedItem}</span>
                    </div>
                    <div className={`mt-0.5 truncate text-[10px] ${on ? 'text-bark/75' : 'text-bark/40'}`}>{t.itemAt(place.name[lang])}</div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
