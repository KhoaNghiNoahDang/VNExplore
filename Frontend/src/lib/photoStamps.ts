import { useEffect, useState } from 'react'

/**
 * Photo stamps (see stampify.ts) live only on this device, in IndexedDB: photos of people never
 * leave the phone. Several per place. Gone if the browser's data is cleared or on another device.
 */
export interface PhotoStamp {
  id: string
  placeId: string
  createdAt: number
  /** Object URL for showing it (revoked by the hook that made it). */
  url: string
  blob: Blob
}

interface Row {
  id: string
  placeId: string
  createdAt: number
  data: ArrayBuffer
  type: string
}

const DB = 'vnexplore-photos'
const STORE = 'stamps'
const CHANGED = 'vx:photo-stamps-changed'

function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    if (typeof indexedDB === 'undefined') return fail(new Error('unavailable'))
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' }).createIndex('placeId', 'placeId')
    req.onsuccess = () => ok(req.result)
    req.onerror = () => fail(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((ok, fail) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => ok(req.result)
      tx.onerror = () => fail(tx.error)
      tx.onabort = () => fail(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function savePhotoStamp(placeId: string, blob: Blob): Promise<void> {
  // Stored as bytes, not a Blob: some Safari versions lose Blobs kept in IndexedDB.
  const row: Row = { id: crypto.randomUUID(), placeId, createdAt: Date.now(), data: await blob.arrayBuffer(), type: blob.type }
  await run('readwrite', (s) => s.put(row))
  // Ask the browser not to clear these when space runs low.
  void navigator.storage?.persist?.().catch(() => undefined)
  window.dispatchEvent(new Event(CHANGED))
}

export async function deletePhotoStamp(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id))
  window.dispatchEvent(new Event(CHANGED))
}

async function loadRows(placeId?: string): Promise<Row[]> {
  const rows = await run<Row[]>('readonly', (s) => (placeId ? s.index('placeId').getAll(placeId) : s.getAll()))
  return rows.sort((a, b) => b.createdAt - a.createdAt)
}

/** Photo stamps, newest first: of one place, or all of them. Updates when one is added or removed. */
export function usePhotoStamps(placeId?: string): PhotoStamp[] {
  const [list, setList] = useState<PhotoStamp[]>([])
  useEffect(() => {
    let alive = true
    let urls: string[] = []
    const load = () =>
      loadRows(placeId)
        .then((rows) => {
          if (!alive) return
          urls.forEach(URL.revokeObjectURL)
          const next = rows.map((r) => {
            const blob = new Blob([r.data], { type: r.type })
            return { id: r.id, placeId: r.placeId, createdAt: r.createdAt, blob, url: URL.createObjectURL(blob) }
          })
          urls = next.map((p) => p.url)
          setList(next)
        })
        .catch(() => undefined)
    void load()
    window.addEventListener(CHANGED, load)
    return () => {
      alive = false
      window.removeEventListener(CHANGED, load)
      urls.forEach(URL.revokeObjectURL)
    }
  }, [placeId])
  return list
}

/** Share the stamp as an image (phone share sheet), else download it. */
export async function shareOrSave(p: PhotoStamp, name: string): Promise<void> {
  const ext = p.blob.type.includes('webp') ? 'webp' : 'png'
  const fileName = `vnexplore-${name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${ext}`
  const file = new File([p.blob], fileName, { type: p.blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  downloadStamp(p, fileName)
}

export function downloadStamp(p: PhotoStamp, fileName: string) {
  const a = document.createElement('a')
  a.href = p.url
  a.download = fileName
  a.click()
}
