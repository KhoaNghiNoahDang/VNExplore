import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Globe, Link2, Loader2, Lock, Plus, Search, Send, X } from 'lucide-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Field } from '../components/Form'
import { MODE_ICON, ROLE_ICON } from '../components/icons'
import PlaceThumb from '../components/PlaceThumb'
import PrimaryButton from '../components/PrimaryButton'
import { TIP_STYLE } from '../components/QuestBits'
import Sheet from '../components/Sheet'
import TopBar from '../components/TopBar'
import TransportIcon from '../components/TransportIcon'
import { DongSonDrum } from '../components/VnArt'
import { ROLES } from '../data/roles'
import { TRANSPORTS } from '../data/transport'
import { MODE_INFO, THEME_LABEL, TRANSPORT_INFO } from '../i18n/strings'
import { distance, duration, moneyRange } from '../lib/format'
import { summarize } from '../lib/quest'
import { getQuest, upsertQuest, type Audience, type BestTime, type TipKind, type Visibility } from '../lib/quests'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'
import type { Mode, Place, Theme, Transport } from '../types'

const THEMES: Theme[] = ['food', 'photo', 'history', 'culture', 'rainy', 'fun']
const AUDIENCES: Audience[] = ['family', 'couple', 'friends', 'solo']
const BEST_TIMES: BestTime[] = ['any', 'morning', 'afternoon', 'evening']
const MODES: Mode[] = ['explore', 'listen', 'easy']
const TIP_KINDS: TipKind[] = ['try', 'photo', 'see', 'tip']
const MAX_STOPS = 10

interface StopDraft {
  placeId: string
  tipKind: TipKind | null
  tip: string
}

/**
 * Four short steps: Info → Stops (+ tips) → Ways to play → Publish.
 * /create?edit=<id> edits your quest; /create?from=route starts from the route you just planned.
 */
export default function CreateQuestPage() {
  const q = useQuest()
  const { t, lang, places, planFor } = q
  const { enabled, loading, session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')

  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(!editId)
  const [forbidden, setForbidden] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [themes, setThemes] = useState<Theme[]>([])
  const [suitableFor, setSuitableFor] = useState<Audience[]>([])
  const [bestTime, setBestTime] = useState<BestTime>('any')
  const [stops, setStops] = useState<StopDraft[]>([])
  const [modes, setModes] = useState<Mode[]>(['listen', 'easy'])
  const [roleId, setRoleId] = useState<string | null>(null)
  const [transport, setTransport] = useState<Transport>('walk')
  const [people, setPeople] = useState(2)
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [picker, setPicker] = useState(false)
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')
  const [tried, setTried] = useState(false)

  // Prefill: from an existing quest, or from the route in progress.
  useEffect(() => {
    if (editId) {
      if (!session) return
      getQuest(editId).then((quest) => {
        if (!quest || quest.author_id !== session.user.id) {
          setForbidden(true)
          setReady(true)
          return
        }
        setTitle(quest.title)
        setDescription(quest.description ?? '')
        setThemes(quest.themes)
        setSuitableFor(quest.suitable_for)
        setBestTime(quest.best_time)
        setStops((quest.stops ?? []).map((s) => ({ placeId: s.place_id, tipKind: s.tip_kind, tip: s.note ?? '' })))
        setModes(quest.modes)
        setRoleId(quest.role_id)
        setTransport(quest.transport)
        setPeople(quest.people)
        setVisibility(quest.visibility)
        setReady(true)
      })
    } else if (params.get('from') === 'route' && q.selected.length) {
      const chosen = places.filter((p) => q.selected.includes(p.id))
      const ordered = summarize(q.start, chosen, q.intent?.people ?? 1, q.travel, q.routeOrder).stops
      setStops(ordered.slice(0, MAX_STOPS).map((p) => ({ placeId: p.id, tipKind: null, tip: '' })))
      setThemes(q.intent?.themes ?? [])
      setPeople(q.intent?.people ?? 2)
      setTransport(q.travel.transport)
      setModes([...new Set<Mode>([q.mode ?? 'listen', 'easy'])])
      setRoleId(q.mode === 'explore' ? q.role?.id ?? null : null)
    }
    // Prefill once per page open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, session])

  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places])
  const stopPlaces = stops.map((s) => byId.get(s.placeId)).filter((p): p is Place => !!p)
  const summary = useMemo(
    // Numbers from the quest's own area (not wherever the author happens to be right now).
    () => summarize(planFor(stopPlaces[0]?.area ?? 'hoan-kiem').start, stopPlaces, people, { transport, departAt: null }, stopPlaces.map((p) => p.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planFor, stops, people, transport, byId],
  )

  if (!enabled) return <Navigate to="/" replace />
  if (!loading && !session) return <Navigate to={`/login?next=${encodeURIComponent(`/create${location.search}`)}`} replace />
  if (!ready || !session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-bark/50" />
      </div>
    )
  }
  if (forbidden) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar backTo="/me" />
        <p className="px-8 py-16 text-center text-sm font-medium text-bark/80">{t.notYours}</p>
      </div>
    )
  }

  const steps = [t.stepInfo, t.stepStops, t.stepModes, t.stepPublish]
  const titleOk = title.trim().length >= 3 && title.trim().length <= 120
  const errors = [titleOk ? null : t.errTitle, stops.length >= 2 ? null : t.errStops, modes.length ? null : t.errModes, null]
  const stepError = errors[step]

  const next = () => {
    if (stepError) return setTried(true)
    setTried(false)
    setStep((s) => Math.min(3, s + 1))
    document.querySelector('#create-scroll')?.scrollTo({ top: 0 })
  }
  const prev = () => {
    setTried(false)
    if (step === 0) navigate(-1)
    else setStep((s) => s - 1)
  }

  const submit = async () => {
    const firstBad = errors.findIndex(Boolean)
    if (firstBad >= 0) {
      setStep(firstBad)
      setTried(true)
      return
    }
    setState('busy')
    try {
      const id = await upsertQuest(
        session.user.id,
        {
          title: title.trim(),
          description: description.trim(),
          visibility,
          modes,
          roleId: modes.includes('explore') ? roleId : null,
          transport,
          people,
          themes,
          suitableFor,
          bestTime,
          stops: stops.map((s) => ({ ...s, tip: s.tipKind ? s.tip.trim() : '', tipKind: s.tipKind && s.tip.trim() ? s.tipKind : null })),
          summary,
        },
        editId ?? undefined,
      )
      navigate(`/q/${id}`, { replace: true })
    } catch (err) {
      console.error(err)
      setState('error')
    }
  }

  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const chip = (on: boolean) =>
    `inline-flex items-center gap-1 rounded-full border-2 px-3 py-1.5 text-[12px] font-bold transition ${
      on ? 'border-ink bg-ink text-paper' : 'border-sand bg-white text-bark hover:border-bark/30'
    }`
  const label = 'mb-2 block text-[12px] font-bold text-ink/80'
  const move = (i: number, d: -1 | 1) =>
    setStops((s) => {
      const j = i + d
      if (j < 0 || j >= s.length) return s
      const c = [...s]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })
  const patchStop = (i: number, p: Partial<StopDraft>) => setStops((s) => s.map((x, k) => (k === i ? { ...x, ...p } : x)))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo={editId ? `/q/${editId}` : '/quests'} />

      {/* Progress: 4 labelled segments, tappable to go back */}
      <div className="px-6 pb-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-bark/60">{t.stepOf(step + 1, 4)}</div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {steps.map((s, i) => (
            <button
              key={s}
              disabled={i > step}
              onClick={() => setStep(i)}
              className="group text-left disabled:cursor-default"
              aria-current={i === step ? 'step' : undefined}
            >
              <span className={`block h-1.5 rounded-full transition ${i <= step ? 'bg-sun-dark' : 'bg-sand'}`} />
              <span className={`mt-1 block truncate text-[11px] font-bold ${i === step ? 'text-ink' : 'text-bark/50'}`}>{s}</span>
            </button>
          ))}
        </div>
      </div>

      <div id="create-scroll" className="thin-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6">
        {/* ---------------- Step 1: info */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <Field label={t.titleLabel} value={title} maxLength={120} placeholder={t.titlePh} onChange={(e) => setTitle(e.target.value)} />
              {tried && !titleOk && <p className="mt-1 text-[12px] font-medium text-brick">{t.errTitle}</p>}
            </div>
            <div>
              <label className={label}>{t.descLabel}</label>
              <textarea
                value={description}
                maxLength={2000}
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descPh}
                className="w-full resize-none rounded-2xl border-2 border-sand bg-white p-3 text-[14px] leading-relaxed placeholder:text-ink/30 focus:border-teal focus:outline-none"
              />
            </div>
            <div>
              <span className={label}>{t.themesLabel}</span>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((th) => (
                  <button key={th} className={chip(themes.includes(th))} aria-pressed={themes.includes(th)} onClick={() => setThemes(toggleIn(themes, th))}>
                    {THEME_LABEL[lang][th]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={label}>{t.goodFor}</span>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <button key={a} className={chip(suitableFor.includes(a))} aria-pressed={suitableFor.includes(a)} onClick={() => setSuitableFor(toggleIn(suitableFor, a))}>
                    {t.audience[a]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={label}>{t.bestTimeLabel}</span>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {BEST_TIMES.map((b) => (
                  <button key={b} role="radio" aria-checked={bestTime === b} className={chip(bestTime === b)} onClick={() => setBestTime(b)}>
                    {t.bestTime[b]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Step 2: stops + tips */}
        {step === 1 && (
          <div>
            <p className="text-[13px] text-bark/80">{t.stopsHint}</p>
            {tried && stops.length < 2 && <p className="mt-1 text-[12px] font-medium text-brick">{t.errStops}</p>}
            <ol className="mt-3 space-y-3">
              {stops.map((s, i) => {
                const p = byId.get(s.placeId)
                if (!p) return null
                return (
                  <li key={s.placeId} className="rounded-[22px] border-2 border-sand bg-white p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-paper">{i + 1}</span>
                      <PlaceThumb place={p} className="h-11 w-11 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1 text-[14px] font-bold leading-snug">{p.name[lang]}</div>
                      <div className="flex shrink-0 flex-col">
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1 text-bark hover:bg-cream disabled:opacity-20" aria-label={t.moveUp}>
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button onClick={() => move(i, 1)} disabled={i === stops.length - 1} className="rounded-lg p-1 text-bark hover:bg-cream disabled:opacity-20" aria-label={t.moveDown}>
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                      <button onClick={() => setStops(stops.filter((_, k) => k !== i))} className="shrink-0 rounded-lg p-1.5 text-bark/60 hover:bg-brick/5 hover:text-brick" aria-label="Remove">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Tip: pick a kind, then write one line */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {TIP_KINDS.map((k) => {
                        const { icon: Icon, cls } = TIP_STYLE[k]
                        const on = s.tipKind === k
                        return (
                          <button
                            key={k}
                            onClick={() => patchStop(i, { tipKind: on ? null : k })}
                            aria-pressed={on}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                              on ? `${cls} ring-2 ring-current` : 'bg-cream text-bark/70 hover:text-ink'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" /> {t.tipKind[k]}
                          </button>
                        )
                      })}
                    </div>
                    {s.tipKind && (
                      <input
                        value={s.tip}
                        maxLength={300}
                        autoFocus
                        onChange={(e) => patchStop(i, { tip: e.target.value })}
                        placeholder={t.tipPh[s.tipKind]}
                        aria-label={t.tipFor}
                        className="mt-2 w-full rounded-xl border-2 border-sand bg-paper px-3 py-2 text-[13px] placeholder:text-ink/30 focus:border-teal focus:outline-none"
                      />
                    )}
                  </li>
                )
              })}
            </ol>
            {stops.length < MAX_STOPS && (
              <button
                onClick={() => setPicker(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-sand py-4 text-sm font-bold text-teal transition hover:bg-teal/5"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} /> {t.addStops}
              </button>
            )}
          </div>
        )}

        {/* ---------------- Step 3: ways to play */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-[13px] text-bark/80">{t.modesHint}</p>
              {tried && !modes.length && <p className="mb-2 text-[12px] font-medium text-brick">{t.errModes}</p>}
              <div className="space-y-2">
                {MODES.map((m) => {
                  const Icon = MODE_ICON[m]
                  const on = modes.includes(m)
                  return (
                    <button
                      key={m}
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setModes(toggleIn(modes, m))}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${on ? 'border-teal bg-teal/5' : 'border-sand bg-white'}`}
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-teal text-white' : 'bg-butter text-bark'}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{MODE_INFO[lang][m].name}</span>
                        <span className="block text-[12px] leading-snug text-bark/70">{MODE_INFO[lang][m].forWhom}</span>
                      </span>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-teal bg-teal text-white' : 'border-sand'}`}>
                        {on && <Check className="h-4 w-4" strokeWidth={3} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {modes.includes('explore') && (
              <div>
                <span className={label}>{t.roleForExplore}</span>
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  <button role="radio" aria-checked={!roleId} className={chip(!roleId)} onClick={() => setRoleId(null)}>
                    {t.roleAnyLabel}
                  </button>
                  {ROLES.map((r) => {
                    const Icon = ROLE_ICON[r.id]
                    return (
                      <button key={r.id} role="radio" aria-checked={roleId === r.id} className={chip(roleId === r.id)} onClick={() => setRoleId(r.id)}>
                        {Icon && <Icon className="h-3.5 w-3.5" />} {r.name[lang]}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <span className={label}>{t.transportLabel}</span>
              <div className="grid grid-cols-4 gap-2" role="radiogroup">
                {TRANSPORTS.map((tr) => {
                  const on = tr === transport
                  return (
                    <button
                      key={tr}
                      role="radio"
                      aria-checked={on}
                      onClick={() => setTransport(tr)}
                      className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2.5 text-[11px] font-bold leading-tight ${on ? 'border-teal bg-teal/5' : 'border-sand bg-white text-bark'}`}
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
              <span className={label}>{t.peopleLabel}</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setPeople(Math.max(1, people - 1))} disabled={people <= 1} className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-sand bg-white text-lg font-bold disabled:opacity-30" aria-label="−">
                  −
                </button>
                <span className="w-8 text-center text-[22px] font-bold tabular-nums">{people}</span>
                <button onClick={() => setPeople(Math.min(20, people + 1))} disabled={people >= 20} className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-sand bg-white text-lg font-bold disabled:opacity-30" aria-label="+">
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Step 4: preview + who can see it */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-[24px] border-2 border-sand bg-butter p-4">
              <DongSonDrum className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 opacity-20" />
              <div className="relative">
                <div className="text-[17px] font-bold leading-snug">{title}</div>
                <div className="mt-1 text-[12px] font-medium text-bark">
                  {[t.stopsN(stops.length), duration(summary.totalMin, lang), distance(summary.distanceM), `${moneyRange(summary.costMin, summary.costMax, lang)} ${t.forN(people)}`].join(' · ')}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {modes.map((m) => {
                    const Icon = MODE_ICON[m]
                    return (
                      <span key={m} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold">
                        <Icon className="h-3.5 w-3.5" /> {MODE_INFO[lang][m].name}
                      </span>
                    )
                  })}
                </div>
                <div className="mt-2 text-[12px] font-medium text-bark/80">
                  {stops.filter((s) => s.tipKind && s.tip.trim()).length}/{stops.length} · {t.tipFor.split('(')[0].trim()}
                </div>
              </div>
            </div>

            <div>
              <span className={label}>{t.publishHint}</span>
              <div className="space-y-2" role="radiogroup">
                {(
                  [
                    { key: 'public', icon: Globe, label: t.visPublic, sub: t.visPublicSub },
                    { key: 'unlisted', icon: Link2, label: t.visLink, sub: t.visLinkSub },
                    { key: 'private', icon: Lock, label: t.visPrivate, sub: t.visPrivateSub },
                  ] as const
                ).map(({ key, icon: Icon, label: l, sub }) => {
                  const on = visibility === key
                  return (
                    <button
                      key={key}
                      role="radio"
                      aria-checked={on}
                      onClick={() => setVisibility(key)}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${on ? 'border-teal bg-teal/5' : 'border-sand bg-white'}`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${on ? 'text-teal' : 'text-bark/60'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{l}</span>
                        <span className="block text-[12px] text-bark/70">{sub}</span>
                      </span>
                      {on && <Check className="h-4 w-4 shrink-0 text-teal" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>
              {visibility === 'public' && <p className="mt-2 text-[12px] leading-relaxed text-bark/70">{t.pendingNote}</p>}
            </div>
            {state === 'error' && <p className="text-[12px] font-medium text-brick">{t.authErr.unknown}</p>}
          </div>
        )}
      </div>

      {/* Footer: back + next / publish */}
      <div className="flex gap-2 border-t border-sand/60 bg-paper px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button
          onClick={prev}
          className="flex h-[52px] shrink-0 items-center justify-center gap-1 rounded-2xl border-2 border-sand bg-white px-4 text-sm font-bold hover:bg-cream"
        >
          <ArrowLeft className="h-4 w-4" /> {t.prev}
        </button>
        {step < 3 ? (
          <PrimaryButton className="flex-1" onClick={next}>
            {t.next} <ArrowRight className="h-4 w-4" />
          </PrimaryButton>
        ) : (
          <PrimaryButton className="flex-1" onClick={submit} disabled={state === 'busy'}>
            {state === 'busy' ? <Loader2 className="h-4 w-4 animate-spin" /> : visibility === 'public' ? <Send className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {visibility === 'public' ? t.sendForReview : t.saveDraft}
          </PrimaryButton>
        )}
      </div>

      {picker && (
        <PlacePicker
          chosen={stops.map((s) => s.placeId)}
          onClose={() => setPicker(false)}
          onToggle={(id) =>
            setStops((s) =>
              s.some((x) => x.placeId === id)
                ? s.filter((x) => x.placeId !== id)
                : s.length >= MAX_STOPS
                  ? s
                  : [...s, { placeId: id, tipKind: null, tip: '' }],
            )
          }
        />
      )}
    </div>
  )
}

/** Searchable list of places; tap to add/remove. Accent-insensitive so "ho guom" finds "Hồ Gươm". */
function PlacePicker({ chosen, onToggle, onClose }: { chosen: string[]; onToggle: (id: string) => void; onClose: () => void }) {
  const { t, lang, places } = useQuest()
  const [query, setQuery] = useState('')
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
  const shown = useMemo(() => {
    const f = fold(query.trim())
    return f ? places.filter((p) => fold(`${p.name.vi} ${p.name.en}`).includes(f)) : places
  }, [places, query])

  return (
    <Sheet title={t.addStops} onClose={onClose}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark/50" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaces}
          className="w-full rounded-2xl border-2 border-sand bg-white py-2.5 pl-9 pr-3 text-[14px] placeholder:text-ink/30 focus:border-teal focus:outline-none"
        />
      </div>
      <div className="mt-1 text-right text-[11px] font-bold text-bark/60">
        {chosen.length}/{MAX_STOPS}
      </div>
      <ul className="mt-1 max-h-[50vh] space-y-1.5 overflow-y-auto">
        {shown.map((p) => {
          const on = chosen.includes(p.id)
          const full = !on && chosen.length >= MAX_STOPS
          return (
            <li key={p.id}>
              <button
                onClick={() => onToggle(p.id)}
                disabled={full}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-2 text-left transition disabled:opacity-40 ${on ? 'border-teal bg-teal/5' : 'border-transparent hover:bg-cream'}`}
              >
                <PlaceThumb place={p} className="h-10 w-10 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">{p.name[lang]}</span>
                  <span className="block truncate text-[11px] text-bark/70">{p.themes.map((th) => THEME_LABEL[lang][th]).join(' · ')}</span>
                </span>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-teal bg-teal text-white' : 'border-sand'}`}>
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <PrimaryButton className="mt-3" onClick={onClose}>
        <Check className="h-4 w-4" /> OK
      </PrimaryButton>
    </Sheet>
  )
}
