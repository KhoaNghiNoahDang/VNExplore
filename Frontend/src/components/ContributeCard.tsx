import { useState } from 'react'
import { CalendarPlus, MapPinPlus, Megaphone } from 'lucide-react'
import { useQuest } from '../store/QuestContext'
import type { LatLng } from '../types'
import { AddPlaceSheet } from './AddPlace'
import { AddEventSheet } from './CommunityEvents'

/**
 * "Know a great spot or an event coming up? Share it" — adding a place or an event without
 * planning a trip first (someone promoting a café they love, a show next weekend…).
 */
export default function ContributeCard({ around, className = '' }: { around: LatLng; className?: string }) {
  const { t } = useQuest()
  const [open, setOpen] = useState<'place' | 'event' | null>(null)
  return (
    <section className={`rounded-[22px] border-2 border-dashed border-sand bg-white/70 p-4 ${className}`}>
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun/30 text-sun-dark">
          <Megaphone className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold leading-snug">{t.contributeTitle}</h2>
          <p className="mt-0.5 text-[12px] leading-snug text-bark/75">{t.contributeBody}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOpen('place')}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-teal bg-white px-2 text-[12px] font-bold text-teal transition hover:bg-teal/5 active:scale-[.98]"
        >
          <MapPinPlus className="h-4 w-4 shrink-0" /> {t.addPlaceButton}
        </button>
        <button
          type="button"
          onClick={() => setOpen('event')}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-brick/70 bg-white px-2 text-[12px] font-bold text-brick transition hover:bg-brick/5 active:scale-[.98]"
        >
          <CalendarPlus className="h-4 w-4 shrink-0" /> {t.addEventTitle}
        </button>
      </div>
      {open === 'place' && <AddPlaceSheet around={around} onClose={() => setOpen(null)} />}
      {open === 'event' && <AddEventSheet around={around} onClose={() => setOpen(null)} />}
    </section>
  )
}
