import { Check } from 'lucide-react'
import { MODE_INFO } from '../i18n/strings'
import { useQuest } from '../store/QuestContext'
import type { Mode } from '../types'
import { MODE_ICON } from './icons'

const MODES: Mode[] = ['explore', 'listen', 'easy']

const ACCENT: Record<Mode, string> = {
  explore: 'bg-brick text-white',
  listen: 'bg-teal text-white',
  easy: 'bg-sun text-ink',
}

/** The three ways to go, shown under the request box on the first screen. */
export default function ModePicker() {
  const { lang, mode, setMode, t } = useQuest()

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-[10px] font-bold uppercase tracking-widest opacity-50">{t.howToGo}</legend>
      <div className="space-y-2" role="radiogroup">
        {MODES.map((m) => {
          const info = MODE_INFO[lang][m]
          const Icon = MODE_ICON[m]
          const on = mode === m
          return (
            <button
              key={m}
              role="radio"
              aria-checked={on}
              onClick={() => setMode(m)}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                on ? 'border-ink bg-white shadow-sm' : 'border-sand bg-white/60 hover:bg-white'
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? ACCENT[m] : 'bg-butter text-bark'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-tight">{info.name}</div>
                <div className="text-[11px] italic leading-snug opacity-70">{info.quote}</div>
                <div className="mt-0.5 text-[10px] leading-snug opacity-50">{info.forWhom}</div>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  on ? 'border-ink bg-ink text-white' : 'border-sand'
                }`}
              >
                {on && <Check className="h-3 w-3" strokeWidth={3} />}
              </div>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
