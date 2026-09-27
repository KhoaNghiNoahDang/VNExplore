import { useState } from 'react'
import { Target } from 'lucide-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ROLE_ICON, TONE_BG } from '../components/icons'
import PrimaryButton from '../components/PrimaryButton'
import TopBar from '../components/TopBar'
import { ROLES } from '../data/roles'
import { preselect, rankPlaces } from '../lib/quest'
import { useQuest } from '../store/QuestContext'

export default function RolePage() {
  const { t, lang, roleId, setRole, intent, areaPlaces, area, contextFor, start, setIntent, journey } = useQuest()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/places'
  const fresh = params.get('fresh') === '1'
  // Where ← goes. Explicit, so Places ⇄ Role can't bounce back and forth forever.
  const back = params.get('back') ?? (fresh ? '/' : next)
  const [picked, setPicked] = useState<string | null>(roleId)

  if (!intent) return <Navigate to="/" replace />

  // Number of stops the goal counts: the journey's stops, or a typical 4 before places are picked.
  const n = journey?.stopIds.length ?? 4
  const chosen = ROLES.find((r) => r.id === picked)

  const confirm = () => {
    if (!chosen) return
    setRole(chosen.id)
    if (fresh) {
      // First time through: re-pick places so the role's favourite spots come first.
      const ranked = rankPlaces(areaPlaces, intent, start, chosen.favPlaces, contextFor(area))
      setIntent(intent, preselect(ranked, intent, start, chosen.favPlaces))
    }
    navigate(next)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo={back} />
      <div className="px-6 pb-3">
        <h1 className="text-xl font-bold">{t.roleTitle}</h1>
        <p className="mt-1 text-xs opacity-60">{t.roleSub}</p>
      </div>

      <div className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-4" role="radiogroup">
        {ROLES.map((r) => {
          const Icon = ROLE_ICON[r.id]
          const on = picked === r.id
          const paused = roleId === r.id && !fresh
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
                  <div className="text-sm font-bold">{r.name[lang]}</div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-brick">
                    <Target className="h-3 w-3" />
                    {r.goal[lang].replace('{n}', String(n))}
                  </div>
                  {paused && <div className="mt-0.5 text-[10px] font-medium text-teal">{t.pausedRole}</div>}
                </div>
              </div>
              {on && <p className="mt-3 text-[12px] leading-relaxed opacity-80">{r.intro[lang]}</p>}
            </button>
          )
        })}
      </div>

      <div className="border-t border-sand/60 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <PrimaryButton disabled={!chosen} onClick={confirm}>
          {chosen ? (roleId === chosen.id && !fresh ? t.resumeRole : t.playRole(chosen.name[lang])) : t.roleTitle}
        </PrimaryButton>
      </div>
    </div>
  )
}
