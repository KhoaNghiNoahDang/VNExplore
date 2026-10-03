import { useEffect, useMemo, useState } from 'react'
import { Award, BookOpen, ChevronRight, Gift, Loader2, Lock, Pause, RotateCcw, Share2, Sparkles } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROLE_ICON, TONE_BG } from '../components/icons'
import PrimaryButton from '../components/PrimaryButton'
import Stamp from '../components/Stamp'
import { CostLines } from '../components/TravelBits'
import SaveQuestButton from '../components/SaveQuest'
import TopBar from '../components/TopBar'
import { missionFor } from '../data/roles'
import { duration } from '../lib/format'
import { recordJourney } from '../lib/passport'
import { summarize } from '../lib/quest'
import { useAuth } from '../store/AuthContext'
import { PartyBoard, SaveAchievementCard } from '../components/PartyBits'
import { finishMine, finishParty, useParty, type PartyState } from '../lib/party'
import { useQuest } from '../store/QuestContext'
import type { Place } from '../types'

export default function FinishPage() {
  const { t, lang, journey, places, intent, mode, role, start, reset, travel, fromQuest, party } = useQuest()
  const auth = useAuth()
  const { state: ps } = useParty(party?.id ?? null)
  const meId = auth.session?.user.id ?? null

  // Group play: mark me as done; the host closes the party once everyone is.
  useEffect(() => {
    if (party) void finishMine(party.id)
  }, [party])
  const everyoneDone = !!ps && ps.members.length > 0 && ps.members.every((m) => m.finishedAt)
  useEffect(() => {
    if (ps && everyoneDone && ps.party.hostId === meId && ps.party.status !== 'finished') void finishParty(ps.party.id)
  }, [ps, everyoneDone, meId])
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [stored, setStored] = useState<'saving' | 'done' | null>(null)

  const stops = useMemo(
    () => (journey ? journey.stopIds.map((id) => places.find((p) => p.id === id)).filter((p): p is Place => !!p) : []),
    [journey, places],
  )

  // Put this journey in the passport (once — the start time makes it idempotent).
  const userId = auth.session?.user.id ?? null
  useEffect(() => {
    if (!journey || !intent || !mode || !places.length || auth.loading) return
    const visitedIds = journey.stopIds.filter((id) => journey.arrived[id])
    if (!visitedIds.length) return
    const visitedPlaces = visitedIds.map((id) => places.find((p) => p.id === id)).filter((p): p is Place => !!p)
    const s = summarize(journey.start ?? start, visitedPlaces, intent.people, { ...travel, departAt: journey.startedAt }, journey.stopIds)
    const playedRole = Object.values(journey.arrived).includes('explore')
    setStored('saving')
    recordJourney(
      {
        clientId: String(journey.startedAt),
        startedAt: journey.startedAt,
        finishedAt: Date.now(),
        mode,
        roleId: playedRole ? role?.id ?? null : null,
        questId: fromQuest?.id ?? null,
        questTitle: fromQuest?.title ?? null,
        stopIds: journey.stopIds,
        arrived: journey.arrived,
        items: journey.items,
        people: intent.people,
        transport: travel.transport,
        totalMin: s.totalMin,
        distanceM: s.distanceM,
        costMinK: s.costMin,
        costMaxK: s.costMax,
        start: journey.start ?? null,
      },
      userId,
    ).finally(() => setStored('done'))
    // Save when the page opens (and again if you sign in meanwhile — harmless, same id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey?.startedAt, places.length, userId, auth.loading])

  if (!journey || !intent || !mode) return <Navigate to="/" replace />
  if (!stops.length) return null

  const visited = stops.filter((s) => journey.arrived[s.id])
  const sum = summarize(journey.start ?? start, visited, intent.people, { ...travel, departAt: journey.startedAt }, journey.stopIds)

  // Items are needed for every stop that wasn't reached in Listen/Easy mode.
  const goalIds = journey.stopIds.filter((id) => journey.arrived[id] !== 'listen' && journey.arrived[id] !== 'easy')
  const have = goalIds.filter((id) => journey.items.includes(id)).length
  const playedRole = !!role && (mode === 'explore' || Object.values(journey.arrived).includes('explore'))
  const unlocked = goalIds.length > 0 && have === goalIds.length
  const showPassport = mode !== 'easy'
  const RoleIcon = role ? ROLE_ICON[role.id] : null
  const date = new Date(journey.startedAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const share = async () => {
    const text = `${t.postcardFrom} — ${visited.map((s) => s.name[lang]).join(' · ')}`
    try {
      if (navigator.share) await navigator.share({ title: 'VNExplore', text, url: location.origin })
      else {
        await navigator.clipboard.writeText(`${text}\n${location.origin}`)
        setCopied(true)
      }
    } catch {
      /* user cancelled */
    }
  }

  const restart = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo={`/go/${stops.length - 1}`} showMode />
      <div className="thin-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-6 pt-2">
        <div className="text-center">
          <Sparkles className="mx-auto h-8 w-8 text-sun-dark" />
          <h1 className="mt-2 text-2xl font-bold">{t.finishTitle}</h1>
          <p className="text-xs opacity-60">{t.finishSub(visited.length, duration(sum.totalMin, lang))}</p>
          <div className="mt-1">
            <CostLines costMin={sum.costMin} costMax={sum.costMax} travelCostK={sum.travelCostK} />
          </div>
        </div>

        {ps && <TeamResult ps={ps} everyoneDone={everyoneDone} meId={meId} />}

        <SaveAchievementCard next="/finish" />

        {stored && visited.length > 0 && (
          <button
            onClick={() => navigate(userId || !auth.enabled ? '/passport' : '/login?next=/passport')}
            className="flex w-full items-center gap-3 rounded-2xl bg-brick px-4 py-3 text-left text-white shadow-md transition active:scale-[.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              {stored === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4 text-sun" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold">{stored === 'saving' ? t.savingPassport : t.addedToPassport(visited.length)}</span>
              <span className="block text-[11px] opacity-80">{!userId && auth.enabled ? t.passportGuestNote : t.passportOpen}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-80" />
          </button>
        )}

        {playedRole && role && RoleIcon && (
          <section className={`rounded-[24px] border-2 p-5 ${unlocked && mode === 'explore' ? 'border-sun-dark bg-butter/60' : 'border-sand bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_BG[role.tone]}`}>
                <RoleIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-brick">{t.endingTitle}</div>
                <div className="text-sm font-bold">{role.name[lang]}</div>
              </div>
            </div>
            {mode !== 'explore' ? (
              <p className="mt-3 flex items-start gap-2 text-[12px] opacity-70">
                <Pause className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t.endingPaused}
              </p>
            ) : unlocked ? (
              <p className="mt-3 text-[13px] leading-relaxed">{role.ending[lang]}</p>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-[12px] opacity-70">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t.endingLocked(have, goalIds.length)}
              </p>
            )}

            <div className="mt-4 text-[10px] font-bold uppercase tracking-widest opacity-50">{t.itemsTitle}</div>
            <ul className="mt-2 space-y-1">
              {stops
                .filter((s) => goalIds.includes(s.id))
                .map((s) => {
                  const got = journey.items.includes(s.id)
                  return (
                    <li key={s.id} className={`flex items-start gap-2 ${got ? '' : 'opacity-40'}`}>
                      {got ? <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bark" /> : <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="text-[12px] font-bold">{missionFor(role, s).item[lang]}</div>
                        <div className="text-[10px] opacity-60">{s.name[lang]}</div>
                      </div>
                      {got && <Award className="h-4 w-4 shrink-0 text-sun-dark" />}
                    </li>
                  )
                })}
            </ul>
          </section>
        )}

        <section className={showPassport ? 'overflow-hidden rounded-[24px] border-2 border-ink bg-white' : ''}>
          {showPassport ? (
            <div className="flex items-center justify-between bg-ink px-5 py-3 text-white">
              <span className="flex items-center gap-2 text-sm font-bold">
                <BookOpen className="h-4 w-4 text-sun" /> {t.passport}
              </span>
              <span className="text-[10px] opacity-70">{date}</span>
            </div>
          ) : (
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest opacity-50">{t.stamps}</h2>
          )}
          <div className={`grid grid-cols-3 place-items-center gap-3 ${showPassport ? 'p-5' : ''}`}>
            {stops.map((s, k) => (
              <Stamp
                key={s.id}
                place={s}
                index={k}
                size="sm"
                gold={journey.items.includes(s.id)}
                empty={!journey.arrived[s.id]}
                emptyLabel={t.notVisited}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest opacity-50">{t.postcard}</h2>
          <Postcard stops={visited} date={date} title={t.postcardFrom} line={t.postcardLine(visited.length)} lang={lang} />
          <button
            onClick={share}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-ink py-3 text-xs font-bold hover:bg-ink/5"
          >
            <Share2 className="h-4 w-4" /> {copied ? t.copied : t.share}
          </button>
          <SaveQuestButton summary={sum} className="mt-2 w-full" />
        </section>
      </div>

      <div className="border-t border-sand/60 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <PrimaryButton onClick={restart}>
          <RotateCcw className="h-4 w-4" /> {t.newJourney}
        </PrimaryButton>
      </div>
    </div>
  )
}

function Postcard({
  stops,
  date,
  title,
  line,
  lang,
}: {
  stops: Place[]
  date: string
  title: string
  line: string
  lang: 'en' | 'vi'
}) {
  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border-2 border-sand bg-cream shadow-md">
      {/* Illustration: lake, Turtle Tower and the red bridge */}
      <svg viewBox="0 0 300 200" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width="300" height="200" fill="#FBE7A8" />
        <circle cx="240" cy="48" r="22" fill="#F6C744" />
        <ellipse cx="150" cy="160" rx="170" ry="52" fill="#2F8A84" fillOpacity="0.35" />
        <path d="M20 128 Q70 96 120 128" stroke="#B8432C" strokeWidth="5" fill="none" strokeLinecap="round" />
        {[40, 60, 80, 100].map((x) => (
          <line key={x} x1={x} y1={x === 40 || x === 100 ? 120 : 112} x2={x} y2="136" stroke="#B8432C" strokeWidth="2" />
        ))}
        <g transform="translate(190 108)">
          <rect x="0" y="22" width="36" height="16" fill="#6E5539" />
          <rect x="6" y="8" width="24" height="14" fill="#6E5539" />
          <rect x="11" y="-4" width="14" height="12" fill="#6E5539" />
          <ellipse cx="18" cy="42" rx="30" ry="5" fill="#3E8E5A" fillOpacity="0.5" />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div>
          <div className="text-[9px] font-bold tracking-[0.3em] text-brick">VNEXPLORE</div>
          <div className="text-xl font-extrabold leading-tight">{title}</div>
          <div className="text-[10px] font-medium opacity-70">{line}</div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="max-w-[65%] text-[9px] font-bold leading-snug opacity-80">
            {stops.map((s) => s.name[lang]).join(' · ')}
          </div>
          <div className="shrink-0 rounded border border-ink/30 bg-white/70 px-1.5 py-0.5 text-[8px] font-bold">{date}</div>
        </div>
      </div>
    </div>
  )
}

/** "Your team escaped!" — who finished, team time, and the clock (when the party used one). */
function TeamResult({ ps, everyoneDone, meId }: { ps: PartyState; everyoneDone: boolean; meId: string | null }) {
  const { t, lang } = useQuest()
  const p = ps.party
  const waiting = ps.members.filter((m) => !m.finishedAt).length
  const end = everyoneDone ? Math.max(...ps.members.map((m) => m.finishedAt ?? 0)) : Date.now()
  const teamMin = p.startedAt ? Math.max(1, Math.round((end - p.startedAt) / 60_000)) : null
  const limit = p.timerMode === 'countdown' ? p.timeLimitMin : null
  return (
    <section className={`space-y-3 rounded-[24px] border-2 p-4 ${everyoneDone ? 'border-sun-dark bg-butter/60' : 'border-sand bg-white'}`}>
      <div className="text-center">
        <div className="text-[17px] font-extrabold">{everyoneDone ? t.partyFinishTitle : t.partyFinishWaiting(waiting)}</div>
        {teamMin !== null && p.timerMode !== 'off' && (
          <div className="mt-1 text-[12px] font-bold text-bark/80">
            {t.partyFinishTime(duration(teamMin, lang))}
            {limit !== null && everyoneDone && (
              <div className={teamMin <= limit ? 'text-teal' : 'text-brick'}>
                {teamMin <= limit ? t.partyBeatClock(duration(limit - teamMin, lang)) : t.partyOverClock(duration(teamMin - limit, lang))}
              </div>
            )}
          </div>
        )}
      </div>
      <PartyBoard state={ps} meId={meId} />
    </section>
  )
}
