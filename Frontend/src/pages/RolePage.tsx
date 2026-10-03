import { useMemo, useState } from 'react'
import { ChevronDown, Gift, Target } from 'lucide-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useStart } from '../components/NeedStart'
import { ROLE_ICON, TONE_BG } from '../components/icons'
import PrimaryButton from '../components/PrimaryButton'
import TopBar from '../components/TopBar'
import { missionFor, ROLES } from '../data/roles'
import { rankRoles, type RoleFit } from '../lib/roles'
import { summarize } from '../lib/quest'
import { useQuest } from '../store/QuestContext'
import type { Place } from '../types'

/**
 * Choose a role AFTER the route: roles are ranked by how well they fit the chosen stops
 * (or the stops still ahead, when switching to Explore mid-journey).
 */
export default function RolePage() {
  const { t, lang, roleId, setRole, intent, places, selected, journey, travel, routeOrder, loading } = useQuest()
  const start = useStart()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/quest'
  // Where ← goes. Explicit, so Quest ⇄ Role can't bounce back and forth forever.
  const back = params.get('back') ?? next
  const [picked, setPicked] = useState<string | null>(roleId)
  const [showAll, setShowAll] = useState(false)

  // The stops the role will play: what's left of the journey, else the planned route in order.
  const stops = useMemo<Place[]>(() => {
    if (journey) {
      return journey.stopIds
        .filter((id) => !journey.arrived[id])
        .map((id) => places.find((p) => p.id === id))
        .filter((p): p is Place => !!p)
    }
    const chosen = places.filter((p) => selected.includes(p.id))
    return summarize(start, chosen, intent?.people ?? 1, travel, routeOrder).stops
  }, [journey, places, selected, start, intent, travel, routeOrder])
  const ranked = useMemo(() => rankRoles(ROLES, stops), [stops])

  if (!intent) return <Navigate to="/" replace />
  if (loading) return null // places still loading (e.g. after a reload)
  if (!stops.length) return <Navigate to="/places" replace />

  const n = journey?.stopIds.length ?? stops.length
  const top = ranked.slice(0, 3)
  const rest = ranked.slice(3)
  const chosen = ROLES.find((r) => r.id === picked)

  const confirm = () => {
    if (!chosen) return
    setRole(chosen.id)
    navigate(next)
  }

  const card = ({ role: r, fits }: RoleFit) => {
    const Icon = ROLE_ICON[r.id]
    const on = picked === r.id
    const paused = roleId === r.id && !!journey
    return (
      <button
        key={r.id}
        role="radio"
        aria-checked={on}
        onClick={() => setPicked(r.id)}
        className={`w-full rounded-[24px] border-2 bg-white p-4 text-left transition ${
          on ? 'border-ink shadow-md' : 'border-sand hover:border-bark/40'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONE_BG[r.tone]}`}>
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
              {r.name[lang]}
              {r.draft && <span className="rounded bg-sun/40 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-bark">{t.roleDraft}</span>}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-brick">
              <Target className="h-3 w-3 shrink-0" />
              {r.goal[lang].replace('{n}', String(n))}
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-teal">{t.roleFits(fits, stops.length)}</div>
            {paused && <div className="mt-0.5 text-[10px] font-medium text-teal">{t.pausedRole}</div>}
          </div>
        </div>
        {on && (
          <>
            <p className="mt-3 text-[12px] leading-relaxed opacity-80">{r.intro[lang]}</p>
            <div className="mt-3 rounded-2xl bg-cream/70 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-bark/60">{t.roleMissionPreview}</div>
              <ol className="mt-1.5 space-y-1.5">
                {stops.slice(0, 4).map((s, i) => {
                  const m = missionFor(r, s)
                  return (
                    <li key={s.id} className="text-[11px] leading-snug">
                      <span className="font-bold">{i + 1}. {s.name[lang]}</span> — {m.task[lang]}
                      <span className="ml-1 inline-flex items-center gap-0.5 font-bold text-bark">
                        <Gift className="h-3 w-3" /> {m.item[lang]}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </>
        )}
      </button>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo={back} />
      <div className="px-6 pb-3">
        <h1 className="text-xl font-bold">{t.roleTitle}</h1>
        <p className="mt-1 text-xs opacity-60">{t.roleSub}</p>
      </div>

      <div className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-4" role="radiogroup">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-bark/60">{t.roleSuggested}</h2>
        {top.map(card)}
        {rest.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-sand bg-white text-xs font-bold text-teal hover:border-teal"
            >
              {t.roleOthers(rest.length)}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </button>
            {(showAll || rest.some((f) => f.role.id === picked)) && rest.map(card)}
          </>
        )}
      </div>

      <div className="border-t border-sand/60 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <PrimaryButton disabled={!chosen} onClick={confirm}>
          {chosen ? (roleId === chosen.id && journey ? t.resumeRole : t.playRole(chosen.name[lang])) : t.roleTitle}
        </PrimaryButton>
      </div>
    </div>
  )
}
