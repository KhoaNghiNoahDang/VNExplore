import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuest } from '../store/QuestContext'
import type { Lang } from '../types'
import AccountButton from './AccountButton'
import ModeSwitcher from './ModeSwitcher'

interface Props {
  backTo?: string
  /** Show the mode switcher pill in the middle. */
  showMode?: boolean
  /** Replaces the back button label (e.g. "Stop 2/4"). */
  center?: ReactNode
}

export default function TopBar({ backTo, showMode, center }: Props) {
  const { lang, setLang, t } = useQuest()
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between gap-2 px-6 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {backTo ? (
        <button
          onClick={() => navigate(backTo)}
          className="-ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-sm font-bold hover:bg-black/5"
        >
          <ArrowLeft className="h-4 w-4" /> {!showMode && !center && t.back}
        </button>
      ) : (
        <div className="text-lg font-bold">VNExplore</div>
      )}
      {center}
      {showMode && <ModeSwitcher />}
      <div className="flex items-center gap-2.5">
        <div className="flex gap-2 text-xs font-bold" role="group" aria-label="Language">
          {(['en', 'vi'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={lang === l ? 'underline underline-offset-4' : 'opacity-30 hover:opacity-60'}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <AccountButton />
      </div>
    </div>
  )
}
