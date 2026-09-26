import { LocateFixed, MapPin } from 'lucide-react'
import { useQuest } from '../store/QuestContext'

/** "Start: Hoan Kiem Lake · Use my location" — and what happened when we tried. */
export default function LocationRow() {
  const { t, geo, geoWanted, setGeoWanted } = useQuest()

  const here = geo.status === 'on'
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
      <span className="min-w-0 truncate">{here ? t.startHere : problem ?? t.startLake}</span>
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
