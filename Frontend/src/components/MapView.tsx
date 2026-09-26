import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, LocateFixed, Maximize2, Minus, Plus, Scan, X } from 'lucide-react'
import type { Map as MLMap } from 'maplibre-gl'
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

/** What the fullscreen map shows under the map: cards to swipe and the page's main button. */
export interface MapPanel {
  title: string
  /** One-line summary above the cards (time, cost…). */
  summary?: ReactNode
  /** Cards, in route/list order. `focused` = the card whose pin is highlighted. */
  items: { id: string; render: (focused: boolean) => ReactNode }[]
  /** Main button(s) of the page, e.g. "Build my route". */
  action?: ReactNode
}

// MapLibre is ~1 MB: load it only when a map is on screen.
const RealMap = lazy(() => import('./RealMap'))

const ctrlBtn =
  'flex h-10 w-10 items-center justify-center rounded-full border border-sand bg-white/95 text-ink shadow-md backdrop-blur transition hover:bg-butter active:scale-95'

/**
 * Real map (OpenStreetMap tiles) with a fullscreen mode.
 * While it loads — or if the device can't show it (no WebGL, offline) — the illustrated map is shown.
 */
export default function MapView({ panel, ...props }: MapProps & { panel?: MapPanel }) {
  const { lang, t } = useQuest()
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)

  const embedded = failed ? (
    <MapPreview {...props} />
  ) : (
    <Suspense fallback={<MapPreview {...props} />}>
      {/* Map texts are set at creation: remount when the language changes. */}
      <RealMap key={lang} {...props} onFail={() => setFailed(true)} />
    </Suspense>
  )

  return (
    <>
      <div className="relative">
        {embedded}
        <button
          onClick={() => setOpen(true)}
          className="absolute left-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-xl border border-sand bg-white/95 text-ink shadow-md transition hover:bg-butter active:scale-95"
          aria-label={t.mapFull}
          title={t.mapFull}
        >
          <Maximize2 className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
      {open && <FullscreenMap {...props} panel={panel} failed={failed} onClose={() => setOpen(false)} />}
    </>
  )
}

function FullscreenMap({
  panel,
  failed,
  onClose,
  ...props
}: MapProps & { panel?: MapPanel; failed: boolean; onClose: () => void }) {
  const { lang, t } = useQuest()
  const [focused, setFocused] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [map, setMap] = useState<MLMap | null>(null)
  const [fitNonce, setFitNonce] = useState(0)
  const [panelH, setPanelH] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const settle = useRef<number | undefined>(undefined)

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Keep the map's framing clear of the bottom panel.
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setPanelH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Pin tapped → slide its card into view.
  const scrollToCard = useCallback((id: string) => {
    const card = track.current?.querySelector<HTMLElement>(`[data-card="${CSS.escape(id)}"]`)
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [])

  const pick = (id: string) => {
    setFocused(id)
    if (collapsed) setCollapsed(false)
    requestAnimationFrame(() => scrollToCard(id))
  }

  // Cards swiped → the one closest to the centre becomes the focused pin.
  const onScroll = () => {
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      const el = track.current
      if (!el) return
      const mid = el.scrollLeft + el.clientWidth / 2
      let best: string | null = null
      let bestD = Infinity
      el.querySelectorAll<HTMLElement>('[data-card]').forEach((c) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
        if (d < bestD) {
          bestD = d
          best = c.dataset.card ?? null
        }
      })
      if (best && best !== focused) setFocused(best)
    }, 120)
  }

  const padding = { top: 72, bottom: panelH + 16, left: 24, right: 64 }

  return createPortal(
    <div
      className="absolute inset-0 z-40 bg-cream"
      role="dialog"
      aria-modal="true"
      aria-label={panel?.title ?? t.mapFull}
    >
      <div className="absolute inset-0">
        {failed ? (
          <div className="p-4 pt-20">
            <MapPreview {...props} focusedId={focused} onPinClick={(p) => pick(p.id)} height={420} />
          </div>
        ) : (
          <Suspense fallback={<div className="h-full w-full bg-cream" />}>
            <RealMap
              key={lang}
              {...props}
              full
              focusedId={focused}
              onPinClick={(p) => pick(p.id)}
              padding={padding}
              fitNonce={fitNonce}
              onMapReady={setMap}
              onFail={() => undefined}
            />
          </Suspense>
        )}
      </div>

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button onClick={onClose} className={`pointer-events-auto ${ctrlBtn}`} aria-label={t.mapClose} title={t.mapClose}>
          <X className="h-5 w-5" />
        </button>
        {panel?.title && (
          <div className="pointer-events-auto truncate rounded-full border border-sand bg-white/95 px-4 py-2 text-sm font-bold shadow-md backdrop-blur">
            {panel.title}
          </div>
        )}
      </div>

      {/* Map controls */}
      {map && (
        <div className="absolute right-3 top-16 flex flex-col gap-2">
          <button onClick={() => map.zoomIn()} className={ctrlBtn} aria-label={t.zoomIn} title={t.zoomIn}>
            <Plus className="h-5 w-5" />
          </button>
          <button onClick={() => map.zoomOut()} className={ctrlBtn} aria-label={t.zoomOut} title={t.zoomOut}>
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setFocused(null)
              setFitNonce((n) => n + 1)
            }}
            className={ctrlBtn}
            aria-label={t.fitAll}
            title={t.fitAll}
          >
            <Scan className="h-5 w-5" />
          </button>
          {props.userPos && (
            <button
              onClick={() =>
                map.easeTo({ center: [props.userPos!.lng, props.userPos!.lat], zoom: 16.5, padding, duration: 500 })
              }
              className={`${ctrlBtn} text-teal`}
              aria-label={t.myLocation}
              title={t.myLocation}
            >
              <LocateFixed className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Bottom panel: summary, swipeable cards, main action */}
      {panel && (
        <div
          ref={panelRef}
          className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-paper pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-10px_rgba(58,42,26,0.35)]"
        >
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full flex-col items-center gap-1 pb-1 pt-2"
            aria-expanded={!collapsed}
            aria-label={collapsed ? t.panelShow : t.panelHide}
          >
            <span className="h-1.5 w-10 rounded-full bg-sand" />
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest opacity-50">
              {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {collapsed ? t.panelShow : t.panelHide}
            </span>
          </button>

          {panel.summary && <div className="px-5 pb-2">{panel.summary}</div>}

          {!collapsed && panel.items.length > 0 && (
            <div
              ref={track}
              onScroll={onScroll}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 pt-1 [scrollbar-width:none]"
            >
              {panel.items.map((it) => (
                <div
                  key={it.id}
                  data-card={it.id}
                  onClick={() => setFocused(it.id)}
                  className={`w-[82%] max-w-[300px] shrink-0 snap-center rounded-2xl border-2 bg-white p-3 transition ${
                    focused === it.id ? 'border-ink shadow-md' : 'border-sand'
                  }`}
                >
                  {it.render(focused === it.id)}
                </div>
              ))}
            </div>
          )}

          {panel.action && <div className="px-5 pt-1">{panel.action}</div>}
        </div>
      )}
    </div>,
    document.getElementById('app-frame') ?? document.body,
  )
}
