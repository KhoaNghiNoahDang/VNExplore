import { useRef, useState } from 'react'
import { Camera, Download, Loader2, Share2, Trash2 } from 'lucide-react'
import { deletePhotoStamp, downloadStamp, savePhotoStamp, shareOrSave, usePhotoStamps, type PhotoStamp } from '../lib/photoStamps'
import { stampify } from '../lib/stampify'
import { useQuest } from '../store/QuestContext'
import type { Place } from '../types'
import Sheet from './Sheet'
import Stamp from './Stamp'

const TILT = [-3, 2, -1.5, 3, -2]

/** A photo stamp as a little tilted picture (its perforated edge is in the image itself). */
function PhotoStampThumb({ p, i, onOpen, className = 'w-20' }: { p: PhotoStamp; i: number; onOpen: () => void; className?: string }) {
  return (
    <button type="button" onClick={onOpen} className={`shrink-0 ${className}`} style={{ rotate: `${TILT[i % TILT.length]}deg` }}>
      <img src={p.url} alt="" className="w-full drop-shadow-md" />
    </button>
  )
}

/**
 * "Turn a photo into a stamp": camera or gallery → the stamp is made on the phone → preview →
 * stuck into the passport (kept on this device only).
 */
export function PhotoStampMaker({ place, compact = false }: { place: Place; compact?: boolean }) {
  const { t } = useQuest()
  const input = useRef<HTMLInputElement>(null)
  const [making, setMaking] = useState(false)
  const [error, setError] = useState('')
  const [made, setMade] = useState<{ blob: Blob; url: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setMaking(true)
    try {
      const blob = await stampify(file, place)
      setMade({ blob, url: URL.createObjectURL(blob) })
    } catch {
      setError(t.photoStampFailed)
    } finally {
      setMaking(false)
      if (input.current) input.current.value = ''
    }
  }
  const close = () => {
    if (made) URL.revokeObjectURL(made.url)
    setMade(null)
  }
  const save = async () => {
    if (!made) return
    setSaving(true)
    try {
      await savePhotoStamp(place.id, made.blob)
      close()
    } catch {
      setError(t.photoStampSaveFailed)
      close()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      <button
        type="button"
        disabled={making}
        onClick={() => input.current?.click()}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal/60 bg-teal/5 font-bold text-teal transition hover:bg-teal/10 disabled:opacity-60 ${
          compact ? 'min-h-10 text-[12px]' : 'min-h-12 text-[13px]'
        }`}
      >
        {making ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        {making ? t.photoStampMaking : t.photoStampTake}
      </button>
      {error && (
        <p className="mt-1 text-[11px] font-medium text-brick" role="alert">
          {error}
        </p>
      )}
      {made && (
        <Sheet title={t.photoStampPreviewTitle} closeLabel={t.close} onClose={close}>
          <img src={made.url} alt={place.nameVi} className="mx-auto w-full max-w-[300px] -rotate-1 drop-shadow-lg" />
          <p className="mt-3 text-center text-[11px] leading-snug text-bark/70">{t.photoStampLocalNote}</p>
          <button
            type="button"
            data-autofocus
            disabled={saving}
            onClick={save}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-teal/70 bg-teal px-4 font-bold text-white shadow-md disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {t.photoStampSave}
          </button>
          <button
            type="button"
            onClick={() => {
              close()
              input.current?.click()
            }}
            className="mt-2 min-h-11 w-full rounded-2xl border-2 border-sand font-bold text-bark"
          >
            {t.photoStampRetake}
          </button>
        </Sheet>
      )}
    </>
  )
}

/** One photo stamp, big, with share / download / delete. */
function PhotoStampViewer({ p, place, onClose }: { p: PhotoStamp; place: Place; onClose: () => void }) {
  const { t, lang } = useQuest()
  const date = new Date(p.createdAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <Sheet title={place.name[lang]} closeLabel={t.close} onClose={onClose}>
      <img src={p.url} alt={place.nameVi} className="mx-auto w-full max-w-[300px] drop-shadow-lg" />
      <p className="mt-2 text-center text-[11px] text-bark/70">{date}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => void shareOrSave(p, place.nameVi)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-teal text-[12px] font-bold text-white">
          <Share2 className="h-4 w-4" /> {t.photoStampShare}
        </button>
        <button
          type="button"
          onClick={() => downloadStamp(p, `vnexplore-${p.id.slice(0, 8)}.${p.blob.type.includes('webp') ? 'webp' : 'png'}`)}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-sand text-[12px] font-bold text-bark"
        >
          <Download className="h-4 w-4" /> {t.photoStampDownload}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!confirm(t.photoStampConfirmDelete)) return
            await deletePhotoStamp(p.id).catch(() => undefined)
            onClose()
          }}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-brick/30 text-[12px] font-bold text-brick"
        >
          <Trash2 className="h-4 w-4" /> {t.photoStampDelete}
        </button>
      </div>
    </Sheet>
  )
}

/** Under the stamp at a stop: this place's photo stamps and the button to make one. */
export function PhotoStampStrip({ place }: { place: Place }) {
  const { t } = useQuest()
  const stamps = usePhotoStamps(place.id)
  const [open, setOpen] = useState<PhotoStamp | null>(null)
  return (
    <div className="rounded-2xl border-2 border-sand bg-white p-3">
      {stamps.length > 0 ? (
        <div className="-mx-1 mb-3 flex gap-3 overflow-x-auto px-1 pb-1 pt-1">
          {stamps.map((p, i) => (
            <PhotoStampThumb key={p.id} p={p} i={i} onOpen={() => setOpen(p)} />
          ))}
        </div>
      ) : (
        <p className="mb-2 text-[12px] leading-snug text-bark/80">{t.photoStampHint}</p>
      )}
      <PhotoStampMaker place={place} compact={stamps.length > 0} />
      {open && <PhotoStampViewer p={open} place={place} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** Passport: a visited place's round stamp plus all its photo stamps. */
export function PlaceStampsSheet({ place, index, gold, onClose }: { place: Place; index: number; gold: boolean; onClose: () => void }) {
  const { t, lang } = useQuest()
  const stamps = usePhotoStamps(place.id)
  const [open, setOpen] = useState<PhotoStamp | null>(null)
  return (
    <Sheet title={place.name[lang]} closeLabel={t.close} onClose={onClose}>
      <div className="flex justify-center">
        <Stamp place={place} index={index} gold={gold} />
      </div>
      {stamps.length > 0 && (
        <>
          <div className="mt-4 text-[12px] font-bold text-ink/80">{t.photoStamps(stamps.length)}</div>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {stamps.map((p, i) => (
              <PhotoStampThumb key={p.id} p={p} i={i} onOpen={() => setOpen(p)} className="w-full" />
            ))}
          </div>
        </>
      )}
      <div className="mt-4">
        {!stamps.length && <p className="mb-2 text-[12px] leading-snug text-bark/80">{t.photoStampHint}</p>}
        <PhotoStampMaker place={place} />
      </div>
      {open && <PhotoStampViewer p={open} place={place} onClose={() => setOpen(null)} />}
    </Sheet>
  )
}

/** Passport grid cell picture: the newest photo stamp of a place, if any. */
export function latestByPlace(all: PhotoStamp[]): Map<string, { latest: PhotoStamp; count: number }> {
  const m = new Map<string, { latest: PhotoStamp; count: number }>()
  for (const p of all) {
    const cur = m.get(p.placeId)
    if (cur) cur.count++
    else m.set(p.placeId, { latest: p, count: 1 })
  }
  return m
}
