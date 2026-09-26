import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MODE_INFO } from '../i18n/strings'
import { useQuest } from '../store/QuestContext'
import type { Mode } from '../types'
import { MODE_ICON } from './icons'

const MODES: Mode[] = ['explore', 'listen', 'easy']

/**
 * Switch mode mid-way.
 * Explore → other: the role pauses, items are kept.
 * Other → Explore: go pick a role, then come back here; remaining stops get missions.
 */
export default function ModeSwitcher() {
  const { lang, mode, setMode, t } = useQuest()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (!mode) return null
  const Icon = MODE_ICON[mode]

  const choose = (m: Mode) => {
    setOpen(false)
    if (m === mode) return
    if (m === 'explore') navigate(`/role?next=${encodeURIComponent(pathname)}`)
    else setMode(m)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-sand bg-white px-3 py-1 text-[11px] font-bold hover:bg-butter"
        aria-haspopup="dialog"
        title={t.switchMode}
      >
        <Icon className="h-3.5 w-3.5" />
        {MODE_INFO[lang][mode].name}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-ink/40" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label={t.switchMode}
            className="rounded-t-[28px] bg-paper p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t.switchMode}</h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-black/5" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {MODES.map((m) => {
                const MIcon = MODE_ICON[m]
                const info = MODE_INFO[lang][m]
                const note =
                  m === mode ? null : m === 'explore' ? t.switchNote.toExplore : mode === 'explore' ? t.switchNote.fromExplore : null
                return (
                  <button
                    key={m}
                    onClick={() => choose(m)}
                    className={`flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left ${
                      m === mode ? 'border-ink bg-white' : 'border-sand bg-white/60 hover:bg-white'
                    }`}
                  >
                    <MIcon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        {info.name}
                        {m === mode && (
                          <span className="rounded bg-teal/10 px-1.5 py-0.5 text-[9px] text-teal">{t.current}</span>
                        )}
                      </div>
                      <div className="text-[11px] italic opacity-70">{info.quote}</div>
                      {note && <div className="mt-1 text-[10px] font-medium text-brick">{note}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
