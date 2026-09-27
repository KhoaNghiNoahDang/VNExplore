import { useState } from 'react'
import { ChevronDown, Clock3 } from 'lucide-react'
import { TRANSPORT_INFO } from '../i18n/strings'
import { useQuest } from '../store/QuestContext'
import type { Transport } from '../types'
import TransportIcon from './TransportIcon'
import { DepartSheet, TransportSheet, useDepartLabel } from './TripSettings'

/**
 * Compact transport + departure buttons for the Places and Quest pages (the first screen uses the
 * bigger TripSettings card). Same sheets as the card, so changing either works the same everywhere.
 */
export default function TripChips({ transport, isDefault = false }: { transport: Transport; isDefault?: boolean }) {
  const { lang, t } = useQuest()
  const [open, setOpen] = useState<'transport' | 'depart' | null>(null)
  const departLabel = useDepartLabel()

  const chip =
    'inline-flex h-9 items-center gap-2 rounded-full border-2 border-sand bg-white pl-1 pr-3 text-[13px] font-bold transition hover:border-bark/30 active:scale-[.98]'

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button className={chip} onClick={() => setOpen('transport')} aria-haspopup="dialog">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10 text-teal">
            <TransportIcon transport={transport} className="h-4 w-4" strokeWidth={2.25} />
          </span>
          {TRANSPORT_INFO[lang][transport].name}
          {isDefault && <span className="font-medium text-bark/50">· {t.defaultSuffix}</span>}
          <ChevronDown className="h-3.5 w-3.5 text-bark/50" />
        </button>
        <button className={chip} onClick={() => setOpen('depart')} aria-haspopup="dialog">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sun/30 text-bark">
            <Clock3 className="h-4 w-4" strokeWidth={2.25} />
          </span>
          {departLabel}
          <ChevronDown className="h-3.5 w-3.5 text-bark/50" />
        </button>
      </div>

      {open === 'transport' && <TransportSheet current={transport} onClose={() => setOpen(null)} />}
      {open === 'depart' && <DepartSheet onClose={() => setOpen(null)} />}
    </>
  )
}
