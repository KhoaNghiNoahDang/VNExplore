import { useEffect, useMemo, useState } from 'react'
import { AtSign, Check, CircleCheck, Clock3, KeyRound, Lightbulb, Loader2, Mail, Minus, Plus, Stamp as StampIcon, Timer, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRole } from '../data/roles'
import { duration } from '../lib/format'
import {
  createParty,
  defaultLimitMin,
  solvePuzzle,
  type Party,
  type PartyState,
  type TimerMode,
} from '../lib/party'
import { shuffledOrder } from '../lib/quest'
import { USERNAME_RE, useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'
import type { Place } from '../types'
import { useCaptcha } from './Captcha'
import { Field, GoogleG, PasswordField } from './Form'
import { ROLE_ICON, TONE_BG } from './icons'
import PrimaryButton from './PrimaryButton'
import Sheet from './Sheet'

const MODES: TimerMode[] = ['off', 'stopwatch', 'countdown']

/** Timer mode + countdown length. The default length comes from the trip request (hours asked for). */
export function TimerPicker({
  mode,
  limit,
  hours,
  routeMin,
  disabled = false,
  onChange,
}: {
  mode: TimerMode
  limit: number | null
  hours: number
  routeMin: number
  disabled?: boolean
  onChange: (mode: TimerMode, limit: number | null) => void
}) {
  const { t, lang } = useQuest()
  const fallback = defaultLimitMin(hours, routeMin)
  const cur = limit ?? fallback
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink/80">
        <Timer className="h-3.5 w-3.5" /> {t.partyTimer}
      </div>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup">
        {MODES.map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            disabled={disabled}
            onClick={() => onChange(m, m === 'countdown' ? cur : null)}
            className={`min-h-10 rounded-xl border-2 text-[12px] font-bold transition disabled:opacity-60 ${
              mode === m ? 'border-teal bg-teal/5 text-teal' : 'border-sand bg-white text-bark'
            }`}
          >
            {t.partyTimerMode[m]}
          </button>
        ))}
      </div>
      {mode === 'countdown' && (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-white px-2 py-1.5">
          <button
            disabled={disabled || cur <= 30}
            onClick={() => onChange('countdown', cur - 15)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-sand disabled:opacity-40"
            aria-label="−15"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-[15px] font-extrabold">{duration(cur, lang)}</span>
          <button
            disabled={disabled || cur >= 1440}
            onClick={() => onChange('countdown', cur + 15)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-sand disabled:opacity-40"
            aria-label="+15"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-bark/65">{t.partyTimerNote(t.hours(hours), duration(routeMin, lang))}</p>
    </div>
  )
}

/** "Play with friends" from the route: name (if needed), timer, create → lobby. */
export function PartyCreateSheet({ stops, routeMin, onClose }: { stops: Place[]; routeMin: number; onClose: () => void }) {
  const { t, lang, intent, area, travel, role } = useQuest()
  const auth = useAuth()
  const navigate = useNavigate()
  const hours = intent?.hours ?? 3
  const [name, setName] = useState(auth.profile?.display_name ?? '')
  const [mode, setMode] = useState<TimerMode>('countdown')
  const [limit, setLimit] = useState<number | null>(defaultLimitMin(hours, routeMin))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const captcha = useCaptcha(lang)
  const needGuest = !auth.session

  const create = async () => {
    if (!name.trim()) return setError(t.partyYourName)
    setBusy(true)
    setError(null)
    if (needGuest) {
      const e = await auth.signInAsGuest(name, captcha.token)
      captcha.reset()
      if (e) {
        setBusy(false)
        return setError(e === 'captcha' ? t.authErr.captcha : e === 'guest_disabled' ? t.partyErrors.guest_disabled : t.partyErrors.unavailable)
      }
    }
    const res = await createParty({
      title: role ? t.questTitle.explore(role.name[lang]) : stops.map((s) => s.name[lang]).slice(0, 3).join(' · '),
      area,
      stopIds: stops.map((s) => s.id),
      transport: travel.transport,
      hours,
      timerMode: mode,
      timeLimitMin: mode === 'countdown' ? limit : null,
      hostName: name.trim(),
    })
    setBusy(false)
    if (typeof res === 'string') return setError(t.partyErrors[res] ?? t.partyErrors.unknown)
    navigate(`/party/${res.code}`)
  }

  return (
    <Sheet title={t.partyPlayTogether} onClose={onClose} closeLabel={t.close}>
      <p className="text-[13px] text-bark/80">{t.partyPlayTogetherSub}</p>
      <div className="mt-4 space-y-4">
        <Field
          label={t.partyYourName}
          placeholder={t.partyNamePh}
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          icon={<Users className="h-4 w-4" />}
        />
        <TimerPicker
          mode={mode}
          limit={limit}
          hours={hours}
          routeMin={routeMin}
          onChange={(m, l) => {
            setMode(m)
            setLimit(l)
          }}
        />
        {error && <p className="rounded-xl bg-brick/10 p-2.5 text-[12px] font-medium text-brick">{error}</p>}
        {needGuest && captcha.widget}
        <PrimaryButton onClick={create} disabled={busy || (needGuest && !captcha.ready)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} {t.partyCreate}
        </PrimaryButton>
      </div>
    </Sheet>
  )
}

/** Stopwatch or countdown from the party's start (ticks every second). */
export function PartyTimer({ party, className = '' }: { party: Party; className?: string }) {
  const { t } = useQuest()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (party.timerMode === 'off' || !party.startedAt) return null
  const elapsed = Math.max(0, now - party.startedAt)
  const clock = (msLeft: number) => {
    const s = Math.floor(Math.abs(msLeft) / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`
  }
  if (party.timerMode === 'stopwatch')
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-extrabold tabular-nums text-white ${className}`}>
        <Clock3 className="h-3.5 w-3.5" /> {clock(elapsed)}
      </span>
    )
  const left = (party.timeLimitMin ?? 0) * 60_000 - elapsed
  const low = left < 10 * 60_000
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold tabular-nums ${
        left <= 0 ? 'bg-brick text-white' : low ? 'bg-sun text-ink' : 'bg-ink text-white'
      } ${className}`}
      role="timer"
    >
      <Timer className="h-3.5 w-3.5" /> {left <= 0 ? t.partyTimeUp : t.partyTimeLeft(clock(left))}
    </span>
  )
}

/** Who's who: role, and at one stop (or the whole route) their stamps and missions. */
export function PartyBoard({ state, placeId, meId }: { state: PartyState; placeId?: string; meId: string | null }) {
  const { t, lang } = useQuest()
  const total = state.party.stopIds.length
  return (
    <div className="rounded-2xl border-2 border-sand bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-bark/60">
        <Users className="h-3.5 w-3.5" /> {t.partyBoard}
      </div>
      <ul className="space-y-1.5">
        {state.members.map((m) => {
          const role = getRole(m.roleId)
          const Icon = role ? ROLE_ICON[role.id] : Users
          const mine = state.progress.filter((p) => p.userId === m.userId)
          const here = placeId ? mine.find((p) => p.placeId === placeId) : null
          const stamps = mine.filter((p) => p.arrivedAt).length
          return (
            <li key={m.userId} className="flex items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${role ? TONE_BG[role.tone] : 'bg-sand/60'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-bold">
                  {m.name}
                  {m.userId === meId && <span className="font-medium text-bark/60"> ({t.partyYou})</span>}
                  {m.userId === state.party.hostId && <span className="ml-1 rounded bg-sun/40 px-1 text-[9px] uppercase">{t.partyHost}</span>}
                </div>
                <div className="truncate text-[10px] text-bark/65">{role ? role.name[lang] : t.partyChoosing}</div>
              </div>
              {placeId ? (
                <div className="flex shrink-0 gap-1">
                  <span title={t.partyStamped} className={`rounded-full p-1 ${here?.arrivedAt ? 'bg-teal text-white' : 'bg-sand/50 text-bark/40'}`}>
                    <StampIcon className="h-3 w-3" />
                  </span>
                  <span title={t.partyMissionOk} className={`rounded-full p-1 ${here?.missionDone ? 'bg-sun-dark text-white' : 'bg-sand/50 text-bark/40'}`}>
                    <Check className="h-3 w-3" />
                  </span>
                </div>
              ) : (
                <span className="shrink-0 text-[11px] font-bold text-teal">
                  {stamps}/{total} {m.finishedAt && <CircleCheck className="inline h-3.5 w-3.5" />}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Escape-room puzzle: one member holds the question, another the hint (rotating from stop to stop);
 * everyone sees the answers. The first correct answer unlocks the story for the whole party.
 */
export function CoopChallenge({ place, state, meId }: { place: Place; state: PartyState; meId: string | null }) {
  const { t, lang } = useQuest()
  const c = place.challenge!
  const [wrong, setWrong] = useState<number[]>([])
  const order = useMemo(() => shuffledOrder(c.options.length, place.id), [c, place.id])
  const members = state.members
  const n = members.length
  let h = 0
  for (const ch of place.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const asker = members[h % n]
  const hinter = n > 1 ? members[(h + 1) % n] : asker
  const solvedBy = state.puzzles[place.id]
  const solver = members.find((m) => m.userId === solvedBy)

  if (solvedBy)
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-teal/10 p-3 text-[12px] font-bold text-teal">
        <CircleCheck className="h-4 w-4 shrink-0" /> {t.coopSolvedBy(solver?.name ?? '…')}
      </div>
    )

  const iAsk = asker?.userId === meId
  const iHint = hinter?.userId === meId
  return (
    <div className="rounded-2xl border-2 border-ink bg-white p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-brick">{t.coopTitle}</div>
      {iAsk ? (
        <>
          <p className="mt-1 text-[11px] font-bold text-teal">{t.coopYouQuestion}</p>
          <p className="mt-1 text-sm font-bold leading-snug">{c.prompt[lang]}</p>
        </>
      ) : (
        <p className="mt-1 text-[13px] font-bold leading-snug">{t.coopAsk(asker?.name ?? '…')}</p>
      )}
      {iHint ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-sun/20 p-2 text-[12px]">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <b>{t.coopYouHint}</b> {c.hint[lang]}
          </span>
        </p>
      ) : (
        n > 1 && <p className="mt-1 text-[11px] text-bark/70">{t.coopHintWith(hinter?.name ?? '…')}</p>
      )}
      <div className="mt-3 space-y-2">
        {order.map((k) => {
          const isWrong = wrong.includes(k)
          return (
            <button
              key={k}
              disabled={isWrong}
              onClick={() => (k === c.answer ? void solvePuzzle(state.party.id, place.id) : setWrong((w) => [...w, k]))}
              className={`w-full rounded-xl border-2 px-3 py-2.5 text-left text-[13px] font-medium transition ${
                isWrong ? 'border-brick/30 bg-brick/5 line-through opacity-50' : 'border-sand hover:border-ink'
              }`}
            >
              {c.options[k][lang]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** End of a guest's quest: keep the achievement by turning the guest into a real account. */
export function SaveAchievementCard({ next }: { next: string }) {
  const { t } = useQuest()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [exists, setExists] = useState(false)
  const navigate = useNavigate()
  if (!auth.isGuest && state !== 'done') return null

  const save = async () => {
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t.errEmail)
    if (password.length < 8) return setError(t.authErr.weak_password)
    if (!USERNAME_RE.test(username.trim().toLowerCase().replace(/^@/, ''))) return setError(t.errUsername)
    setState('busy')
    const e = await auth.upgradeGuest({ email, password, username })
    if (e) {
      setState('idle')
      setExists(e === 'account_exists')
      return setError(t.authErr[e] ?? t.authErr.unknown)
    }
    setState('done')
  }

  if (state === 'done')
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-teal/10 p-3 text-[13px] font-bold text-teal">
        <CircleCheck className="h-4 w-4 shrink-0" /> {t.saveAchDone}
      </div>
    )

  return (
    <div className="rounded-2xl border-2 border-sun bg-sun/10 p-4">
      <div className="text-[15px] font-bold">{t.saveAchTitle}</div>
      <p className="mt-1 text-[12px] text-bark/80">{t.saveAchBody}</p>
      <div className="mt-3 space-y-3">
        <Field label={t.email} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="h-4 w-4" />} />
        <Field label={t.username} value={username} onChange={(e) => setUsername(e.target.value)} icon={<AtSign className="h-4 w-4" />} />
        <PasswordField label={t.password} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} icon={<KeyRound className="h-4 w-4" />} showStrength />
        {error && <p className="text-[12px] font-medium text-brick">{error}</p>}
        {exists && (
          <button
            onClick={() => navigate(`/login?next=${encodeURIComponent(next)}`)}
            className="w-full rounded-2xl bg-ink py-2.5 text-[13px] font-bold text-white"
          >
            {t.saveAchSignIn}
          </button>
        )}
        <PrimaryButton onClick={save} disabled={state === 'busy'}>
          {state === 'busy' && <Loader2 className="h-4 w-4 animate-spin" />} {t.saveAchBtn}
        </PrimaryButton>
        <button
          onClick={() => void auth.linkGoogle(next)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-sand bg-white py-2.5 text-[13px] font-bold"
        >
          <GoogleG className="h-4 w-4" /> {t.saveAchGoogle}
        </button>
        <button onClick={() => navigate(`/login?next=${encodeURIComponent(next)}`)} className="w-full text-center text-[12px] font-bold text-teal">
          {t.saveAchHaveAccount}
        </button>
      </div>
    </div>
  )
}
