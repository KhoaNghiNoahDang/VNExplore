import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Clock3, Heart, Loader2, Minus, PencilLine, Play, Plus, Share2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { MODE_ICON, TONE_BG } from '../components/icons'
import { MapStopCard } from '../components/MapCards'
import MapView from '../components/MapView'
import PrimaryButton from '../components/PrimaryButton'
import { Avatar, TipBox } from '../components/QuestBits'
import Sheet from '../components/Sheet'
import TopBar from '../components/TopBar'
import TransportIcon from '../components/TransportIcon'
import { DongSonBand, DongSonDrum, Lotus } from '../components/VnArt'
import { getRole } from '../data/roles'
import { TRANSPORTS } from '../data/transport'
import { MODE_INFO, THEME_LABEL, TRANSPORT_INFO } from '../i18n/strings'
import { distance, duration, moneyRange } from '../lib/format'
import { summarize } from '../lib/quest'
import { getQuest, isLiked, questUrl, setLiked, type SavedQuest } from '../lib/quests'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'
import type { Mode, Place, Theme, Transport } from '../types'

const MODE_ORDER: Mode[] = ['explore', 'listen', 'easy']

/** A quest opened from the Quest tab or a shared link. Pick a way to play → quick "before you go" sheet → go. */
export default function QuestSharePage() {
  const { id = '' } = useParams()
  const { t, lang, places, planFor, setIntent, setFromQuest, setMode, setRole, setTransport, setDepartAt } = useQuest()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [quest, setQuest] = useState<SavedQuest | null | undefined>(undefined)
  const [mode, setPickedMode] = useState<Mode | null>(null)
  const [liked, setLikedState] = useState(false)
  const [likes, setLikes] = useState(0)
  const [sheet, setSheet] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    getQuest(id).then((q) => {
      setQuest(q)
      if (!q) return
      setLikes(q.like_count)
      setPickedMode(MODE_ORDER.find((m) => q.modes.includes(m)) ?? 'easy')
    })
  }, [id])

  useEffect(() => {
    if (session && quest) isLiked(quest.id, session.user.id).then(setLikedState)
  }, [session, quest])

  const stops = useMemo(
    () => (quest?.stops ?? []).map((s) => places.find((p) => p.id === s.place_id)).filter((p): p is Place => !!p),
    [quest, places],
  )
  // Start inside the quest's area: from the traveller if they're there, else the area's default start.
  const questArea = stops[0]?.area ?? 'hoan-kiem'
  const start = planFor(questArea).start
  const sum = useMemo(
    () => summarize(start, stops, quest?.people ?? 1, { transport: quest?.transport ?? 'walk', departAt: null }, stops.map((p) => p.id)),
    [start, stops, quest],
  )

  if (quest === undefined || (quest && !places.length)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-bark/70">
        <Loader2 className="h-6 w-6 animate-spin" /> {t.loadingQuest}
      </div>
    )
  }

  if (!quest) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar backTo="/quests" />
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-8 text-center">
          <DongSonDrum className="absolute h-72 w-72 text-sand/50" />
          <Lotus className="relative h-14 w-14" />
          <p className="relative mt-3 font-bold">{t.questNotFound}</p>
          <PrimaryButton className="relative mt-5 py-3" onClick={() => navigate('/quests')}>
            {t.tabQuests}
          </PrimaryButton>
        </div>
      </div>
    )
  }

  const mine = session?.user.id === quest.author_id
  const author = quest.author?.username ? `@${quest.author.username}` : quest.author?.display_name ?? ''
  const tipsById = new Map((quest.stops ?? []).map((s) => [s.place_id, s]))
  const modes = MODE_ORDER.filter((m) => quest.modes.includes(m))
  const cover = stops[0]

  const toggleLike = async () => {
    if (!session) return navigate(`/login?next=${encodeURIComponent(`/q/${quest.id}`)}`)
    const next = !liked
    setLikedState(next)
    setLikes((n) => n + (next ? 1 : -1))
    try {
      await setLiked(quest.id, session.user.id, next)
    } catch {
      setLikedState(!next)
      setLikes((n) => n + (next ? -1 : 1))
    }
  }

  const share = async () => {
    const url = questUrl(quest.id)
    if (navigator.share) return navigator.share({ title: quest.title, url }).catch(() => undefined)
    await navigator.clipboard.writeText(url).catch(() => undefined)
    setShared(true)
    setTimeout(() => setShared(false), 1800)
  }

  const play = (people: number, transport: Transport, departAt: number | null) => {
    const ids = stops.map((p) => p.id)
    const themes = (quest.themes.length ? quest.themes : [...new Set(stops.flatMap((p) => p.themes))].slice(0, 2)) as Theme[]
    setIntent(
      {
        text: quest.title,
        area: questArea,
        themes: themes.length ? themes : ['culture'],
        people,
        budget: 'any',
        hours: Math.max(1, Math.ceil((quest.total_min ?? 120) / 60)),
        hoursIsDefault: false,
        transport,
        transportIsDefault: false,
      },
      ids,
      ids, // keep the author's order instead of re-sorting by distance
    )
    setFromQuest({ id: quest.id, title: quest.title })
    setTransport(transport)
    setDepartAt(departAt)
    const m = mode ?? 'easy'
    if (m === 'explore') {
      if (quest.role_id && getRole(quest.role_id)) {
        setRole(quest.role_id)
        navigate('/quest')
      } else navigate(`/role?next=/quest&back=/q/${quest.id}`)
    } else {
      setMode(m)
      navigate('/quest')
    }
  }

  const iconBtn = 'flex h-10 items-center gap-1.5 rounded-full border-2 border-sand bg-white px-3 text-[12px] font-bold transition hover:border-bark/30 active:scale-95'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/quests" />
      <div className="thin-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4">
        {/* Hero */}
        <div className="px-6">
          <div className={`relative overflow-hidden rounded-[28px] px-5 pb-5 pt-4 ${cover ? TONE_BG[cover.tone] : 'bg-butter'}`}>
            <DongSonDrum className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 opacity-25" />
            <div className="relative">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{t.stopsN(stops.length)}</div>
              <h1 className="mt-1 text-[24px] font-bold leading-tight">{quest.title}</h1>
              {author && (
                <div className="mt-2 flex items-center gap-2 text-[13px] font-medium">
                  <Avatar name={quest.author?.display_name} url={quest.author?.avatar_url} />
                  {t.by(author)}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={toggleLike} aria-pressed={liked} aria-label={liked ? t.unlike : t.like} className={`${iconBtn} ${liked ? 'border-brick/40 text-brick' : ''}`}>
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> {likes}
            </button>
            {quest.visibility !== 'private' && (
              <button onClick={share} className={iconBtn}>
                {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {shared ? t.linkCopied : t.shareQuest}
              </button>
            )}
            {mine && (
              <button onClick={() => navigate(`/create?edit=${quest.id}`)} className={`${iconBtn} ml-auto`}>
                <PencilLine className="h-4 w-4" /> {t.editQuest}
              </button>
            )}
          </div>

          {/* Review state, only the author sees these */}
          {mine && quest.visibility === 'public' && quest.review_status === 'pending' && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-sun/20 px-3 py-2.5 text-[12px] font-medium text-bark">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" /> {t.pendingNote}
            </p>
          )}
          {mine && quest.review_status === 'rejected' && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-brick/10 px-3 py-2.5 text-[12px] font-medium text-brick">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {t.rejectedNote(quest.review_note ?? '')}
            </p>
          )}

          {/* Facts */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              duration(sum.totalMin, lang),
              distance(sum.distanceM),
              `${moneyRange(sum.costMin, sum.costMax, lang)} ${t.forN(quest.people)}`,
              ...quest.themes.map((th) => THEME_LABEL[lang][th]),
              ...quest.suitable_for.map((a) => `${t.goodFor}: ${t.audience[a]}`),
              quest.best_time !== 'any' ? `${t.bestTimeLabel}: ${t.bestTime[quest.best_time]}` : null,
            ]
              .filter((x): x is string => !!x)
              .map((p) => (
                <span key={p} className="rounded-full border border-sand bg-white px-3 py-1 text-[11px] font-bold">
                  {p}
                </span>
              ))}
          </div>
          {quest.description && <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed">{quest.description}</p>}

          <DongSonBand className="my-5 h-2 w-full text-sand" />

          <MapView start={start} places={stops} route={stops} height={200} legModes={sum.legs.map((l) => l.transport)} startLabel={t.youAreHere} />

          {/* Stops with the author's tips */}
          <ol className="mt-4 space-y-3">
            {sum.stops.map((s, i) => {
              const tip = tipsById.get(s.id)
              return (
                <li key={s.id} className="rounded-[22px] border-2 border-sand bg-white p-3">
                  <MapStopCard place={s} index={i} leg={sum.legs[i]} people={quest.people} />
                  {tip?.tip_kind && tip.note && (
                    <div className="mt-2.5">
                      <TipBox kind={tip.tip_kind} text={tip.note} />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      {/* Bottom: choose how to play (only the modes this quest supports) + play */}
      <div className="border-t border-sand/60 bg-paper px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {modes.length > 1 && (
          <div className="mb-2.5">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-bark/60">{t.playAs}</div>
            <div className="grid gap-1 rounded-2xl bg-sand/50 p-1" style={{ gridTemplateColumns: `repeat(${modes.length}, 1fr)` }} role="radiogroup">
              {modes.map((m) => {
                const Icon = MODE_ICON[m]
                const on = m === mode
                return (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPickedMode(m)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-bold transition ${
                      on ? 'bg-white text-ink shadow-sm' : 'text-bark/70 hover:text-ink'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {MODE_INFO[lang][m].name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <PrimaryButton onClick={() => setSheet(true)} disabled={!stops.length}>
          <Play className="h-4 w-4 fill-current" /> {t.playQuest}
          {modes.length === 1 && <span className="font-medium opacity-70">· {MODE_INFO[lang][modes[0]].name}</span>}
        </PrimaryButton>
      </div>

      {sheet && (
        <QuickStartSheet
          initialPeople={quest.people}
          initialTransport={quest.transport}
          needsRole={mode === 'explore' && !(quest.role_id && getRole(quest.role_id))}
          onClose={() => setSheet(false)}
          onGo={play}
        />
      )}
    </div>
  )
}

/** "Before you go": group size, transport and departure — enough to estimate time and cost. */
function QuickStartSheet({
  initialPeople,
  initialTransport,
  needsRole,
  onClose,
  onGo,
}: {
  initialPeople: number
  initialTransport: Transport
  needsRole: boolean
  onClose: () => void
  onGo: (people: number, transport: Transport, departAt: number | null) => void
}) {
  const { t, lang } = useQuest()
  const [people, setPeople] = useState(Math.max(1, initialPeople))
  const [transport, setTr] = useState<Transport>(initialTransport)
  const [depart, setDepart] = useState<0 | 1 | 2>(0)

  const label = 'mb-2 text-[12px] font-bold text-ink/80'
  const stepBtn =
    'flex h-11 w-11 items-center justify-center rounded-full border-2 border-sand bg-white transition hover:border-bark/40 active:scale-95 disabled:opacity-30'

  return (
    <Sheet title={t.beforeYouGo} onClose={onClose}>
      <p className="-mt-1 mb-4 text-[13px] text-bark/80">{t.beforeYouGoSub}</p>
      <div className="space-y-5">
        <div>
          <div className={label}>{t.peopleLabel}</div>
          <div className="flex items-center gap-4">
            <button className={stepBtn} onClick={() => setPeople((n) => Math.max(1, n - 1))} disabled={people <= 1} aria-label="−">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-[22px] font-bold tabular-nums" aria-live="polite">
              {people}
            </span>
            <button className={stepBtn} onClick={() => setPeople((n) => Math.min(20, n + 1))} disabled={people >= 20} aria-label="+">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div>
          <div className={label}>{t.transportLabel}</div>
          <div className="grid grid-cols-4 gap-2" role="radiogroup">
            {TRANSPORTS.map((tr) => {
              const on = tr === transport
              return (
                <button
                  key={tr}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTr(tr)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2.5 text-[11px] font-bold leading-tight transition ${
                    on ? 'border-teal bg-teal/5 text-ink' : 'border-sand bg-white text-bark'
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${on ? 'bg-teal text-white' : 'bg-butter'}`}>
                    <TransportIcon transport={tr} className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <span className="text-center">{TRANSPORT_INFO[lang][tr].name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className={label}>{t.departLabel}</div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {([0, 1, 2] as const).map((h) => (
              <button
                key={h}
                role="radio"
                aria-checked={depart === h}
                onClick={() => setDepart(h)}
                className={`rounded-xl border-2 py-2.5 text-[13px] font-bold transition ${
                  depart === h ? 'border-teal bg-teal/5' : 'border-sand bg-white'
                }`}
              >
                {h === 0 ? t.departNow : t.departIn(h)}
              </button>
            ))}
          </div>
        </div>

        <PrimaryButton onClick={() => onGo(people, transport, depart ? Date.now() + depart * 60 * 60_000 : null)}>
          <Play className="h-4 w-4 fill-current" /> {needsRole ? t.chooseRoleNext : t.startNow}
        </PrimaryButton>
      </div>
    </Sheet>
  )
}
