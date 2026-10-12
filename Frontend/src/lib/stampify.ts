import type { Place } from '../types'

/**
 * Turn a traveller's photo (people and scenery alike) into a postage stamp, all on the phone:
 * perforated paper edge, the photo re-printed like an old engraved stamp (fewer tones, warm ink,
 * fine print lines, paper grain), "VIỆT NAM", a value and the place's name underneath, and the
 * place's postmark cancelled across a corner — the same seal as the round stamp, now "on" the photo.
 */

const W = 720
const H = 900
const EDGE = 44 // paper margin, perforations included
const PHOTO = { x: EDGE, y: EDGE, w: W - EDGE * 2, h: 640 }
const PAPER = '#fbf4e2'
const INK: Record<Place['tone'], string> = { brick: '#b8432c', butter: '#6e5539', teal: '#2f8a84', leaf: '#3e8e5a' }
const VALUES = ['2.000đ', '3.000đ', '5.000đ', '10.000đ', '15.000đ']
const FONT = '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif'

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

async function loadImage(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Older Safari: decode through an <img> (which also applies the photo's rotation).
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

/** The photo, cover-cropped into the stamp's window and re-printed in the old stamp style. */
function printPhoto(src: CanvasImageSource & { width: number; height: number }, seed: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = PHOTO.w
  c.height = PHOTO.h
  const g = c.getContext('2d', { willReadFrequently: true })!
  const scale = Math.max(PHOTO.w / src.width, PHOTO.h / src.height)
  const sw = PHOTO.w / scale
  const sh = PHOTO.h / scale
  g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, PHOTO.w, PHOTO.h)

  const img = g.getImageData(0, 0, PHOTO.w, PHOTO.h)
  const d = img.data
  let rnd = seed || 1
  const noise = () => ((rnd = (rnd * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5)
  const levels = 5
  const post = (v: number) => (Math.round((Math.min(255, Math.max(0, v)) / 255) * levels) / levels) * 255
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % PHOTO.w
    const py = Math.floor(i / 4 / PHOTO.w)
    let r = d[i]
    let gg = d[i + 1]
    let b = d[i + 2]
    const lum = 0.299 * r + 0.587 * gg + 0.114 * b
    // A bit more contrast, a bit less colour: printing inks, not a phone screen.
    r = (r * 0.65 + lum * 0.35 - 128) * 1.18 + 128
    gg = (gg * 0.65 + lum * 0.35 - 128) * 1.18 + 128
    b = (b * 0.65 + lum * 0.35 - 128) * 1.18 + 128
    // Few tones, then a warm ink tint.
    r = post(r) * 1.03 + 8
    gg = post(gg) * 0.99 + 3
    b = post(b) * 0.86
    // Fine horizontal print lines, stronger in the shadows (like an engraving).
    if (py % 3 === 0) {
      const k = 0.8 + 0.2 * (lum / 255)
      r *= k
      gg *= k
      b *= k
    }
    // Paper grain.
    const n = noise() * 18 + (px % 2 === py % 2 ? 2 : -2)
    d[i] = r + n
    d[i + 1] = gg + n
    d[i + 2] = b + n
  }
  g.putImageData(img, 0, 0)

  // Soft vignette, so the edges sink into the paper.
  const v = g.createRadialGradient(PHOTO.w / 2, PHOTO.h / 2, PHOTO.h * 0.35, PHOTO.w / 2, PHOTO.h / 2, PHOTO.h * 0.8)
  v.addColorStop(0, 'rgba(60,40,20,0)')
  v.addColorStop(1, 'rgba(60,40,20,0.35)')
  g.fillStyle = v
  g.fillRect(0, 0, PHOTO.w, PHOTO.h)
  return c
}

/** Text running round a circle (centred on `mid` radians), for the postmark's rim. */
function arcText(g: CanvasRenderingContext2D, text: string, r: number, mid: number, inside: boolean) {
  const widths = [...text].map((ch) => g.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0)
  let a = mid - (inside ? -1 : 1) * (total / r) / 2
  ;[...text].forEach((ch, k) => {
    const half = widths[k] / 2 / r
    a += inside ? -half : half
    g.save()
    g.rotate(a)
    g.translate(0, -r)
    if (inside) g.rotate(Math.PI)
    g.fillText(ch, 0, 0)
    g.restore()
    a += inside ? -half : half
  })
}

/** The place's postmark with wavy cancellation lines, slightly uneven like real ink. */
function postmark(place: Place, when: Date, seed: number): HTMLCanvasElement {
  const S = 420
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const g = c.getContext('2d')!
  const ink = INK[place.tone]
  const R = 92
  const cx = S - R - 20
  const cy = S / 2
  g.strokeStyle = ink
  g.fillStyle = ink
  g.lineCap = 'round'

  // Wavy cancellation lines to the left of the seal.
  g.lineWidth = 5
  for (let k = 0; k < 4; k++) {
    const y = cy - 45 + k * 30
    g.beginPath()
    for (let x = 6; x <= cx - R - 10; x += 4) {
      const yy = y + Math.sin(x / 17 + k * 0.9) * 7
      if (x === 6) g.moveTo(x, yy)
      else g.lineTo(x, yy)
    }
    g.stroke()
  }

  g.save()
  g.translate(cx, cy)
  g.lineWidth = 6
  g.beginPath()
  g.arc(0, 0, R, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = 2.5
  g.beginPath()
  g.arc(0, 0, R - 34, 0, Math.PI * 2)
  g.stroke()
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `800 17px ${FONT}`
  arcText(g, 'VNEXPLORE · HÀ NỘI', R - 18, 0, false)
  arcText(g, 'ĐÃ ĐẾN', R - 18, Math.PI, true)
  // Inside: date and time, between two rules.
  const pad = (n: number) => String(n).padStart(2, '0')
  g.font = `800 21px ${FONT}`
  g.fillText(`${pad(when.getDate())}·${pad(when.getMonth() + 1)}·${when.getFullYear()}`, 0, -6)
  g.font = `700 15px ${FONT}`
  g.fillText(`${pad(when.getHours())}:${pad(when.getMinutes())}`, 0, 18)
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(-38, -24)
  g.lineTo(38, -24)
  g.moveTo(-30, 33)
  g.lineTo(30, 33)
  g.stroke()
  g.restore()

  // Knock out specks so the ink looks hand-stamped.
  g.globalCompositeOperation = 'destination-out'
  let rnd = seed || 3
  const next = () => (rnd = (rnd * 1103515245 + 12345) >>> 0) / 4294967296
  for (let k = 0; k < 900; k++) {
    g.globalAlpha = 0.3 + next() * 0.7
    g.beginPath()
    g.arc(next() * S, next() * S, 0.6 + next() * 2.2, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  return c
}

/** Shrink a font until the text fits the width. */
function fit(g: CanvasRenderingContext2D, text: string, weight: number, max: number, width: number) {
  let size = max
  do {
    g.font = `${weight} ${size}px ${FONT}`
    size -= 2
  } while (g.measureText(text).width > width && size > 14)
}

/** Photo file → a PNG/WebP postage stamp (transparent around the perforations). */
export async function stampify(file: Blob, place: Place, when = new Date()): Promise<Blob> {
  await Promise.all([document.fonts?.load(`800 20px "Be Vietnam Pro"`), document.fonts?.load(`700 20px "Be Vietnam Pro"`)]).catch(() => undefined)
  const src = await loadImage(file)
  const seed = hash(place.id) ^ when.getTime()
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const ink = INK[place.tone]

  // Paper, with a faint shadow line inside the edge.
  g.fillStyle = PAPER
  g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(110,85,57,0.18)'
  g.lineWidth = 2
  g.strokeRect(16, 16, W - 32, H - 32)

  // The photo, framed by a thin ink line.
  g.drawImage(printPhoto(src, seed), PHOTO.x, PHOTO.y)
  if ('close' in src && typeof src.close === 'function') src.close()
  g.strokeStyle = ink
  g.lineWidth = 4
  g.strokeRect(PHOTO.x - 6, PHOTO.y - 6, PHOTO.w + 12, PHOTO.h + 12)

  // Text under the photo: country and value, the place, the app and year.
  const top = PHOTO.y + PHOTO.h + 52
  g.fillStyle = ink
  g.textBaseline = 'alphabetic'
  g.textAlign = 'left'
  g.font = `800 30px ${FONT}`
  g.fillText('VIỆT NAM', PHOTO.x, top)
  g.textAlign = 'right'
  g.font = `800 40px ${FONT}`
  g.fillText(VALUES[hash(place.id) % VALUES.length], PHOTO.x + PHOTO.w, top + 4)
  g.textAlign = 'left'
  g.fillStyle = '#3a2a1a'
  fit(g, place.nameVi.toUpperCase(), 800, 44, PHOTO.w)
  g.fillText(place.nameVi.toUpperCase(), PHOTO.x, top + 58)
  g.fillStyle = 'rgba(58,42,26,0.7)'
  g.font = `700 20px ${FONT}`
  g.fillText(`VNEXPLORE · HÀ NỘI · ${when.getFullYear()}`, PHOTO.x, top + 94)

  // The postmark, cancelled across the photo's lower right corner.
  const pm = postmark(place, when, seed)
  g.save()
  g.globalAlpha = 0.82
  g.translate(W - 225, PHOTO.y + PHOTO.h - 125)
  g.rotate(-0.21)
  g.drawImage(pm, -pm.width / 2 - 40, -pm.height / 2)
  g.restore()

  // Perforations: punch half-circles out of every edge.
  g.globalCompositeOperation = 'destination-out'
  const holeR = 13
  const step = 36
  const punch = (x: number, y: number) => {
    g.beginPath()
    g.arc(x, y, holeR, 0, Math.PI * 2)
    g.fill()
  }
  for (let x = step / 2; x < W; x += step) punch(x, 0), punch(x, H)
  for (let y = step / 2; y < H; y += step) punch(0, y), punch(W, y)
  g.globalCompositeOperation = 'source-over'

  const out = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/webp', 0.88))
  if (!out) throw new Error('encode')
  return out
}
