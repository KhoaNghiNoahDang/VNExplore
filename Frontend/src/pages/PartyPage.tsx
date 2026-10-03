import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Copy, Loader2, LogOut, Play, Share2, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCaptcha } from '../components/Captcha'
import { Field } from '../components/Form'
import { ROLE_ICON, TONE_BG } from '../components/icons'
import { PartyBoard, TimerPicker } from '../components/PartyBits'
import PrimaryButton from '../components/PrimaryButton'
import TopBar from '../components/TopBar'
import { ROLES } from '../data/roles'
import { joinParty, leaveParty, setMyRole, setTimer, startParty, useParty, type PartyError } from '../lib/party'
import { summarize } from '../lib/quest'
import { rankRoles } from '../lib/roles'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'
import type { Intent, Place } from '../types'

/**
 * Party lobby at /party/:code — join with just a name, pick a role nobody else has, (host) set the
 * timer and start. When the host starts, everyone's app sets up the same journey and goes to stop 1.
 */
export default function PartyPage() {
  const { code = '' } = useParams()
  const auth = useAuth()
  const { t, lang } = useQuest()
  const captcha = useCaptcha(lang)
  const [partyId, setPartyId] = useState<string | null>(null)
  const [error, setError] = useState<PartyError | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const tried = useRef(false)

  // Signed in with a known name (the host, a returning member, an account) → join straight away.
  useEffect(() => {
    if (auth.loading || !auth.session || partyId || tried.current) return
    const known = auth.profile?.display_name
    if (!known && auth.profile === null) return // profile still loading
    tried.current = true
    setBusy(true)
    void joinParty(code, known ?? '').then((res) => {
      setBusy(false)
      if (res === 'unknown' && !known) return // no name yet → show the form
      if (res === 'unknown' || res === 'not_found' || res === 'full' || res === 'finished' || res === 'unavailable') setError(res)
      else setPartyId(res)
    })
  }, [auth.loading, auth.session, auth.profile, code, partyId])

  const join = async () => {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    if (!auth.session) {
      const e = await auth.signInAsGuest(name, captcha.token)
      captcha.reset()
      if (e) {
        setBusy(false)
        return setError(e === 'captcha' ? 'captcha' : e === 'guest_disabled' ? 'guest_disabled' : 'unavailable')
      }
    }
    const res = await joinParty(code, name)
    setBusy(false)
    if (res === 'not_found' || res === 'full' || res === 'finished' || res === 'unavailable' || res === 'unknown' || res === 'role_taken')
      setError(res)
    else setPartyId(res)
  }

  if (!auth.enabled) return <Centered>{t.partyErrors.unavailable}</Centered>
  if (partyId) return <Lobby partyId={partyId} />

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/" />
      <div className="flex flex-1 flex-col justify-center px-6 pb-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/10 text-teal">
          <Users className="h-7 w-7" />
        </div>
        <h1 className="mt-3 text-center text-xl font-bold">{t.partyJoinTitle}</h1>
        <p className="mt-1 text-center text-[13px] text-bark/70">
          {t.partyCode}: <b className="tracking-widest">{code.toUpperCase()}</b>
        </p>
        {busy && !name ? (
          <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-bark/50" />
        ) : (
          <div className="mt-6 space-y-3">
            <Field label={t.partyYourName} placeholder={t.partyNamePh} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} hint={t.partyJoinNote} />
            {error && <p className="rounded-xl bg-brick/10 p-2.5 text-[12px] font-medium text-brick">{t.partyErrors[error]}</p>}
            {!auth.session && captcha.widget}
            <PrimaryButton onClick={join} disabled={busy || !name.trim() || (!auth.session && !captcha.ready)}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.partyJoin}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/" />
      <p className="flex flex-1 items-center justify-center px-8 text-center text-[13px] text-bark/70">{children}</p>
    </div>
  )
}

function Lobby({ partyId }: { partyId: string }) {
  const { t, lang, stopById, start, setIntent, setRole, startJourney, setParty, party: current, journey } = useQuest()
  const auth = useAuth()
  const navigate = useNavigate()
  const { state, missing, refresh } = useParty(partyId)
  const [copied, setCopied] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)
  const meId = auth.session?.user.id ?? null

  const stops = useMemo(
    () => (state ? state.party.stopIds.map((id) => stopById(id)).filter((p): p is Place => !!p) : []),
    [state, stopById],
  )
  const ranked = useMemo(() => rankRoles(ROLES, stops), [stops])
  const routeMin = useMemo(
    () => (stops.length ? summarize(stops[0], stops, 1, { transport: state?.party.transport ?? 'walk', departAt: null }, state?.party.stopIds).totalMin : 0),
    [stops, state],
  )

  const me = state?.members.find((m) => m.userId === meId) ?? null
  const isHost = !!state && state.party.hostId === meId

  // Host started → set up the shared journey on this phone and go to the first stop (once).
  useEffect(() => {
    if (!state || state.party.status === 'lobby' || !me?.roleId) return
    const p = state.party
    const same = current?.id === p.id && journey && journey.stopIds.join() === p.stopIds.join()
    if (!same) {
      const intent: Intent = {
        text: p.title ?? '',
        themes: [],
        people: state.members.length,
        budget: 'any',
        hours: p.hours,
        hoursIsDefault: false,
        transport: p.transport,
        transportIsDefault: false,
        area: p.area,
      }
      setIntent(intent, p.stopIds, p.stopIds)
      setRole(me.roleId)
      startJourney(p.stopIds, start ?? stops[0] ?? { lat: 21.0287, lng: 105.8524 })
      setParty({ id: p.id, code: p.code })
    }
    navigate('/go/0', { replace: true })
  }, [state, me, current, journey, setIntent, setRole, startJourney, setParty, start, stops, navigate])

  if (missing) return <Centered>{t.partyErrors.not_found}</Centered>
  if (!state) return <Centered><Loader2 className="h-6 w-6 animate-spin" /></Centered>

  const p = state.party
  const link = `${location.origin}/party/${p.code}`
  const takenBy = (roleId: string) => state.members.find((m) => m.roleId === roleId && m.userId !== meId)
  const allReady = state.members.length > 0 && state.members.every((m) => m.roleId)

  const share = async () => {
    const text = t.partyShareText(p.code)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'VNExplore', text, url: link })
        return
      } catch {
        /* cancelled → fall back to copying */
      }
    }
    await navigator.clipboard?.writeText(`${text}\n${link}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const pick = async (roleId: string) => {
    setRoleError(null)
    const e = await setMyRole(p.id, me?.roleId === roleId ? null : roleId)
    if (e) setRoleError(t.partyErrors[e] ?? t.partyErrors.unknown)
    void refresh()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/" />
      <div className="thin-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
        <div className="rounded-[24px] bg-ink p-4 text-white">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">{t.partyCode}</div>
          <div className="mt-0.5 text-3xl font-extrabold tracking-[0.3em]">{p.code}</div>
          <div className="mt-1 truncate text-[12px] text-white/70">{p.title}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={share} className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-sun text-[12px] font-bold text-ink">
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {copied ? t.partyCopied : t.partyShare}
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard?.writeText(link)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/30 px-3 text-[12px] font-bold"
            >
              <Copy className="h-4 w-4" /> {t.partyCopy}
            </button>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-bark/60">{t.partyMembers(state.members.length, p.maxMembers)}</div>
          <PartyBoard state={state} meId={meId} />
        </div>

        <ol className="space-y-1 rounded-2xl border-2 border-sand bg-white p-3 text-[12px]">
          {stops.map((s, i) => (
            <li key={s.id} className="flex gap-2">
              <span className="font-bold text-teal">{i + 1}.</span> <span className="truncate">{s.name[lang]}</span>
            </li>
          ))}
        </ol>

        <section>
          <h2 className="mb-2 text-[15px] font-extrabold">{t.partyPickRole}</h2>
          {roleError && <p className="mb-2 rounded-xl bg-brick/10 p-2.5 text-[12px] font-medium text-brick">{roleError}</p>}
          <div className="space-y-2" role="radiogroup">
            {ranked.map(({ role: r, fits }) => {
              const other = takenBy(r.id)
              const mine = me?.roleId === r.id
              const Icon = ROLE_ICON[r.id]
              return (
                <button
                  key={r.id}
                  role="radio"
                  aria-checked={mine}
                  disabled={!!other}
                  onClick={() => void pick(r.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left transition disabled:opacity-50 ${
                    mine ? 'border-ink shadow-md' : 'border-sand hover:border-bark/40'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_BG[r.tone]}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-bold">
                      {r.name[lang]}
                      {r.draft && <span className="rounded bg-sun/40 px-1 text-[9px] uppercase">{t.roleDraft}</span>}
                    </span>
                    <span className="block text-[11px] text-bark/70">
                      {other ? t.partyRoleTakenBy(other.name) : t.roleFits(fits, stops.length)}
                    </span>
                  </span>
                  {mine && <Check className="h-5 w-5 shrink-0 text-teal" strokeWidth={3} />}
                </button>
              )
            })}
          </div>
        </section>

        <TimerPicker
          mode={p.timerMode}
          limit={p.timeLimitMin}
          hours={p.hours}
          routeMin={routeMin}
          disabled={!isHost}
          onChange={(m, l) => void setTimer(p.id, m, l).then(refresh)}
        />

        <button
          onClick={async () => {
            await leaveParty(p.id)
            if (current?.id === p.id) setParty(null)
            navigate('/', { replace: true })
          }}
          className="flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-bold text-bark/60 hover:text-brick"
        >
          <LogOut className="h-4 w-4" /> {t.partyLeave}
        </button>
      </div>

      <div className="border-t border-sand/60 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        {isHost ? (
          <PrimaryButton disabled={!allReady} onClick={() => void startParty(p.id).then(refresh)}>
            <Play className="h-4 w-4 fill-current" /> {allReady ? t.partyStart : t.partyWaitRoles}
          </PrimaryButton>
        ) : (
          <p className="flex items-center justify-center gap-2 py-3 text-[13px] font-bold text-bark/70">
            <Loader2 className="h-4 w-4 animate-spin" /> {me?.roleId ? t.partyWaitHost : t.partyPickRole}
          </p>
        )}
      </div>
    </div>
  )
}
