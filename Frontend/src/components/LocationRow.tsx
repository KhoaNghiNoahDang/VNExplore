import { LocateFixed, MapPin } from 'lucide-react'
import { areaAt } from '../lib/area'
import { useQuest } from '../store/QuestContext'
import type { Area } from '../types'

/** "Start: Hoan Kiem Lake · Use my location" — and what happened when we tried. */
export default function LocationRow({ area: shownArea }: { area?: Area }) {
  const { t, geo, geoWanted, setGeoWanted, area: planArea } = useQuest()
  const area = shownArea ?? planArea

  // "Your location" only when the plan actually starts there (you're in the area being planned).
  const here = geo.status === 'on' && areaAt(geo.position) === area
  const problem =
    geo.status === 'denied'
      ? t.locationDenied
      : geo.status === 'unavailable'
        ? t.locationUnavailable
        : geo.status === 'far'
          ? t.locationFar
          : null

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <MapPin className={`h-3.5 w-3.5 shrink-0 ${here ? 'text-teal' : 'text-brick'}`} />
      <span className="shrink-0 whitespace-nowrap font-bold">{t.startFrom}:</span>
      <span className="min-w-0 truncate">{here ? t.startHere : `${t.startDefault[area]}${problem ? ` · ${problem}` : ''}`}</span>
      {!geoWanted && (
        <button
          onClick={() => setGeoWanted(true)}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-teal/10 px-2.5 py-1 font-bold text-teal hover:bg-teal/20"
        >
          <LocateFixed className="h-3.5 w-3.5" /> {t.useMyLocation}
        </button>
      )}
      {geoWanted && geo.status === 'asking' && <span className="ml-auto shrink-0 opacity-60">{t.locating}</span>}
    </div>
  )
}
