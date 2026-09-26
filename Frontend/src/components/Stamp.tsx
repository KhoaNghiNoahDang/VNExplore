import { Award } from 'lucide-react'
import type { Place } from '../types'

const INK: Record<Place['tone'], string> = {
  brick: 'text-brick border-brick',
  butter: 'text-bark border-bark',
  teal: 'text-teal border-teal',
  leaf: 'text-leaf border-leaf',
}

/** An ink stamp for a visited place, with an optional gold seal (Explore mission done). */
export default function Stamp({
  place,
  index,
  gold = false,
  size = 'md',
  empty = false,
  emptyLabel,
}: {
  place: Place
  index: number
  gold?: boolean
  size?: 'sm' | 'md'
  empty?: boolean
  emptyLabel?: string
}) {
  const dim = size === 'sm' ? 'h-20 w-20' : 'h-24 w-24'
  const rotate = ['-rotate-6', 'rotate-3', '-rotate-2', 'rotate-6'][index % 4]

  if (empty) {
    return (
      <div className={`${dim} flex flex-col items-center justify-center rounded-full border-2 border-dashed border-sand text-center`}>
        <span className="px-2 text-[9px] font-bold leading-tight opacity-40">{place.nameVi}</span>
        {emptyLabel && <span className="mt-0.5 text-[8px] opacity-40">{emptyLabel}</span>}
      </div>
    )
  }

  return (
    <div className={`relative ${dim} ${rotate}`}>
      <div
        className={`flex h-full w-full flex-col items-center justify-center rounded-full border-[3px] border-double bg-white/40 text-center opacity-90 ${INK[place.tone]}`}
      >
        <span className="text-[7px] font-bold tracking-[0.2em]">HÀ NỘI</span>
        <span className="my-0.5 px-2 text-[9px] font-extrabold uppercase leading-tight">{place.nameVi}</span>
        <span className="text-[7px] font-bold tracking-widest">№ {String(index + 1).padStart(2, '0')}</span>
      </div>
      {gold && (
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-sun text-ink shadow">
          <Award className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
