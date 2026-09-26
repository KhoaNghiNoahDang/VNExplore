import { lazy, Suspense, useState } from 'react'
import { useQuest } from '../store/QuestContext'
import type { LatLng, Place, Transport } from '../types'
import MapPreview from './MapPreview'

export interface MapProps {
  start: LatLng
  /** Places shown as pins. */
  places: Place[]
  /** Ordered stops, drawn as a numbered route. */
  route?: Place[]
  selectedIds?: string[]
  focusedId?: string | null
  onPinClick?: (p: Place) => void
  height?: number
  startLabel?: string
  /** The traveller's live position. */
  userPos?: LatLng | null
  /** Frame these points instead of everything. */
  fitPoints?: LatLng[]
  /** Transport of each route leg (legModes[i] leads to route[i]); picks walking vs driving paths. */
  legModes?: Transport[]
}

// MapLibre is ~1 MB: load it only when a map is on screen.
const RealMap = lazy(() => import('./RealMap'))

/**
 * Real map (OpenStreetMap tiles). While it loads — or if the device can't show it
 * (no WebGL, offline) — the illustrated map is shown instead.
 */
export default function MapView(props: MapProps) {
  const { lang } = useQuest()
  const [failed, setFailed] = useState(false)
  const fallback = <MapPreview {...props} />
  if (failed) return fallback
  return (
    <Suspense fallback={fallback}>
      {/* Map texts are set at creation: remount when the language changes. */}
      <RealMap key={lang} {...props} onFail={() => setFailed(true)} />
    </Suspense>
  )
}
