import { useState, type ReactNode } from 'react'
import { Loader2, LocateFixed, MapPin } from 'lucide-react'
import { useQuest } from '../store/QuestContext'
import type { LatLng } from '../types'
import PrimaryButton from './PrimaryButton'
import TopBar from './TopBar'
import { LocationSheet, StartSheet } from './TripSettings'

/**
 * Routes are planned from where the traveller really is (or a point they picked) — never from a
 * made-up position. Until we have one, this screen asks for location or a start point.
 */
export function NeedStart() {
  const { t, area, geo, geoWanted } = useQuest()
  const [sheet, setSheet] = useState<'location' | 'start' | null>(null)
  const locating = geoWanted && geo.status === 'asking'
  const blocked = geoWanted && (geo.status === 'denied' || geo.status === 'unavailable')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/" />
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 text-teal">
          {locating ? <Loader2 className="h-7 w-7 animate-spin" /> : <LocateFixed className="h-7 w-7" />}
        </span>
        <h1 className="mt-4 text-xl font-bold">{locating ? t.locating : t.needStartTitle}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-bark/75">
          {blocked ? (geo.status === 'denied' ? t.geoDeniedHelp : t.locationUnavailable) : t.needStartBody}
        </p>
        <div className="mt-6 w-full max-w-xs space-y-2">
          {!locating && (
            <PrimaryButton onClick={() => setSheet('location')}>
              <LocateFixed className="h-4 w-4" /> {blocked ? t.geoRetry : t.geoAllow}
            </PrimaryButton>
          )}
          <button
            onClick={() => setSheet('start')}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-sand bg-white py-3 text-[14px] font-bold text-bark hover:border-bark/30"
          >
            <MapPin className="h-4 w-4" /> {t.geoSkip}
          </button>
        </div>
      </div>
      {sheet === 'location' && <LocationSheet onClose={() => setSheet(null)} onPickStart={() => setSheet('start')} />}
      {sheet === 'start' && (
        <StartSheet area={area} onClose={() => setSheet(null)} onUseLocation={() => setSheet('location')} />
      )}
    </div>
  )
}

/** Renders the page only once the plan has a real start point. */
export function RequireStart({ children }: { children: ReactNode }) {
  const { start } = useQuest()
  return start ? <>{children}</> : <NeedStart />
}

/** The plan's start, for pages wrapped in <RequireStart>. */
export function useStart(): LatLng {
  const { start } = useQuest()
  if (!start) throw new Error('useStart() outside <RequireStart>')
  return start
}
