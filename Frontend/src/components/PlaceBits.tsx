import { Info, Phone } from 'lucide-react'
import { useQuest } from '../store/QuestContext'
import type { Place } from '../types'

/** "0868334331" → "0868 334 331", "+84969755323" → "+84 969 755 323". */
function prettyPhone(p: string): string {
  const m = /^(\+84|0)(\d{3})(\d{3})(\d+)$/.exec(p)
  return m ? `${m[1]}${m[1] === '+84' ? ' ' : ''}${m[2]} ${m[3]} ${m[4]}` : p
}

/** A place's notice (e.g. workshops: "contact them before you go"), with a call button. */
export function PlaceNotice({ place, className = '' }: { place: Place; className?: string }) {
  const { t, lang } = useQuest()
  if (!place.notice && !place.phone) return null
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-sun-dark/40 bg-sun/15 px-3 py-2.5 text-[12px] leading-snug text-bark ${className}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sun-dark" />
      <div className="min-w-0 flex-1">
        {place.notice && <p className="font-semibold">{place.notice[lang]}</p>}
        {place.phone && (
          <a href={`tel:${place.phone}`} className="mt-1 inline-flex items-center gap-1 font-bold text-teal underline-offset-2 hover:underline">
            <Phone className="h-3.5 w-3.5" /> {t.callPlace(prettyPhone(place.phone))}
          </a>
        )}
      </div>
    </div>
  )
}

const label = (s: string) => {
  if (s === 'openstreetmap') return 'OpenStreetMap'
  try {
    return new URL(s).hostname.replace(/^www\./, '')
  } catch {
    return s
  }
}
const href = (s: string) => (s === 'openstreetmap' ? 'https://www.openstreetmap.org' : /^https?:\/\//.test(s) ? s : null)

/** "Source: vinwonders.com · vietnam.travel" — every source a place's information comes from. */
export function SourceLinks({ sources, className = '' }: { sources?: string[]; className?: string }) {
  const { t } = useQuest()
  if (!sources?.length) return null
  const seen = new Set<string>()
  const items = sources.filter((s) => {
    const k = label(s)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return (
    <p className={`text-[10px] leading-relaxed text-bark/60 ${className}`}>
      {t.sourcesLabel}:{' '}
      {items.map((s, i) => {
        const url = href(s)
        return (
          <span key={s}>
            {i > 0 && ' · '}
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-teal">
                {label(s)}
              </a>
            ) : (
              label(s)
            )}
          </span>
        )
      })}
    </p>
  )
}
