import type { Place } from '../types'

/**
 * Turn a traveller's photo (people and scenery alike) into an old Vietnamese postage stamp, all
 * on the phone. Modelled on the 1950s Bưu-Chính issues:
 *  - one ink only: the photo is re-drawn as an engraving (fine wavy lines, thicker in the shadows);
 *  - aged cream paper with perforated edges and a thin double frame;
 *  - condensed serif capitals: "VIỆT-NAM" on top, the place's name reversed out of a solid band at
 *    the bottom, the value ("5đ", "30 xu") in a circle;
 *  - the place's postmark cancelled across a corner in black ink — the same seal as the round stamp.
 */

const W = 720
const H = 900
const PHOTO = { x: 60, y: 168, w: 600, h: 520 }
const BAND = { y: PHOTO.y + PHOTO.h + 14, h: 112 }
const PAPER: [number, number, number] = [243, 231, 201]
const PAPER_CSS = 'rgb(243,231,201)'
/** One ink per place tone, darkened to old printing-ink shades. */
const INK: Record<Place['tone'], [number, number, number]> = {
  brick: [140, 58, 36],
  butter: [107, 74, 43],
  teal: [38, 88, 84],
  leaf: [56, 86, 48],
}
const POSTMARK_INK = 'rgba(32,24,20,0.82)'
const VALUES = ['30 xu', '50 xu', '1đ', '2đ', '5đ']
const SERIF = '"Noto Serif", Georgia, "Times New Roman", serif'

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const css = (c: [number, number, number], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

/** The serif face, fetched once (and cached offline by the service worker). */
let fontReady: Promise<unknown> | null = null
function loadSerif(): Promise<unknown> {
  if (!fontReady) {
    if (!document.querySelector('link[data-stamp-font]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif:wght@600;800&display=swap'
      link.dataset.stampFont = '1'
      document.head.appendChild(link)
    }
    const wait = Promise.all([
      document.fonts?.load(`800 40px "Noto Serif"`, 'VIỆT-NAM'),
      document.fonts?.load(`600 40px "Noto Serif"`, 'HÀ-NỘI'),
    ])
    // Never hold the stamp up for long: fall back to the phone's own serif.
    fontReady = Promise.race([wait, new Promise((ok) => setTimeout(ok, 3000))]).catch(() => undefined)
  }
  return fontReady
}

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

/** The photo, cover-cropped and re-drawn as a one-ink line engraving on the paper. */
function engrave(src: CanvasImageSource & { width: number; height: number }, ink: [number, number, number]): HTMLCanvasElement {
  const { w, h } = PHOTO
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  const scale = Math.max(w / src.width, h / src.height)
  const sw = w / scale
  const sh = h / scale
  // A touch of blur first so the lines follow shapes, not sensor noise.
  g.filter = 'blur(0.6px)'
  g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h)
  g.filter = 'none'

  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  // Stretch the tones so every photo uses the whole range (dark to paper-white).
  let lo = 255
  let hi = 0
  for (let i = 0; i < d.length; i += 16) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    if (l < lo) lo = l
    if (l > hi) hi = l
  }
  const span = Math.max(40, hi - lo)
  const P = 4.6 // line spacing in px
  for (let i = 0; i < d.length; i += 4) {
    const x = (i / 4) % w
    const y = Math.floor(i / 4 / w)
    const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] - lo) / span
    // Darkness with a little extra contrast in the mid-tones.
    // (gamma > 1 keeps faces and mid-tones open, as engravers did)
    const dark = Math.min(1, Math.max(0, (1 - l - 0.5) * 1.2 + 0.5)) ** 1.35
    // Gently waving horizontal lines, like a burin following the paper.
    const phase = ((y + 1.4 * Math.sin(x / 26 + y / 90)) % P + P) % P / P
    const dist = Math.abs(phase - 0.5) * 2 // 0 on the line's centre, 1 between lines
    let a = Math.min(1, Math.max(0, (dark * 1.05 - dist) * 2.8 + 0.12 * dark))
    // Deep shadows fill in, as the ink does.
    a = Math.max(a, dark > 0.9 ? (dark - 0.9) * 8 : 0)
    d[i] = PAPER[0] + (ink[0] - PAPER[0]) * a
    d[i + 1] = PAPER[1] + (ink[1] - PAPER[1]) * a
    d[i + 2] = PAPER[2] + (ink[2] - PAPER[2]) * a
  }
  g.putImageData(img, 0, 0)
  return c
}

/** Draw text letter by letter: condensed (sx < 1) and spaced like hand-set type. */
function setType(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  o: { size: number; weight: number; sx?: number; spacing?: number; align?: 'left' | 'center' | 'right'; maxW?: number },
) {
  let size = o.size
  let sx = o.sx ?? 0.8
  const spacing = o.spacing ?? 0
  const width = () => {
    g.font = `${o.weight} ${size}px ${SERIF}`
    return [...text].reduce((a, ch) => a + g.measureText(ch).width * sx + spacing, -spacing)
  }
  let total = width()
  // Too long: squeeze a little more, then make it smaller.
  while (o.maxW && total > o.maxW && sx > 0.62) (sx -= 0.04), (total = width())
  while (o.maxW && total > o.maxW && size > 16) (size -= 2), (total = width())
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x
  for (const ch of text) {
    const cw = g.measureText(ch).width * sx
    g.save()
    g.translate(cx, y)
    g.scale(sx, 1)
    g.fillText(ch, 0, 0)
    g.restore()
    cx += cw + spacing
  }
}

/** Text running round a circle (centred on `mid` radians), for the postmark's rim. */
function arcText(g: CanvasRenderingContext2D, text: string, r: number, mid: number, inside: boolean) {
  const widths = [...text].map((ch) => g.measureText(ch).width + 1.5)
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

/** Speckle the ink away here and there, so it looks pressed by hand (and worn by time). */
function wear(g: CanvasRenderingContext2D, w: number, h: number, seed: number, count: number) {
  let rnd = seed || 3
  const next = () => (rnd = (rnd * 1103515245 + 12345) >>> 0) / 4294967296
  g.save()
  g.globalCompositeOperation = 'destination-out'
  for (let k = 0; k < count; k++) {
    g.globalAlpha = 0.25 + next() * 0.75
    g.beginPath()
    g.arc(next() * w, next() * h, 0.4 + next() * 1.3, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

/** The place's postmark with wavy cancellation lines, in black ink. */
function postmark(when: Date, seed: number): HTMLCanvasElement {
  const S = 440
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const g = c.getContext('2d')!
  const R = 88
  const cx = R + 16
  const cy = S / 2
  g.strokeStyle = POSTMARK_INK
  g.fillStyle = POSTMARK_INK
  g.lineCap = 'round'

  // Wavy cancellation lines to the right of the seal.
  g.lineWidth = 4.5
  for (let k = 0; k < 5; k++) {
    const y = cy - 52 + k * 26
    g.beginPath()
    for (let x = cx + R + 8; x <= S - 6; x += 4) {
      const yy = y + Math.sin(x / 15 + k * 0.7) * 6
      if (x === cx + R + 8) g.moveTo(x, yy)
      else g.lineTo(x, yy)
    }
    g.stroke()
  }

  g.save()
  g.translate(cx, cy)
  g.lineWidth = 4
  g.beginPath()
  g.arc(0, 0, R, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = 2
  g.beginPath()
  g.arc(0, 0, R - 32, 0, Math.PI * 2)
  g.stroke()
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `800 17px ${SERIF}`
  arcText(g, 'VNEXPLORE · HÀ-NỘI', R - 17, 0, false)
  arcText(g, 'ĐÃ ĐẾN', R - 17, Math.PI, true)
  // Inside: the date (old style, with dots) and the hour.
  const pad = (n: number) => String(n).padStart(2, '0')
  g.font = `800 19px ${SERIF}`
  g.fillText(`${pad(when.getDate())}.${pad(when.getMonth() + 1)}.${String(when.getFullYear()).slice(2)}`, 0, -5)
  g.font = `600 14px ${SERIF}`
  g.fillText(`${pad(when.getHours())}g${pad(when.getMinutes())}`, 0, 18)
  g.restore()
  wear(g, S, S, seed, 1100)
  return c
}

/** Photo file → an old-style postage stamp, PNG/WebP (transparent around the perforations). */
export async function stampify(file: Blob, place: Place, when = new Date()): Promise<Blob> {
  const [src] = await Promise.all([loadImage(file), loadSerif()])
  const seed = hash(place.id) ^ when.getTime()
  const ink = INK[place.tone]
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!

  // Aged paper: cream, a little darker towards the edges, with faint foxing.
  g.fillStyle = PAPER_CSS
  g.fillRect(0, 0, W, H)
  const age = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75)
  age.addColorStop(0, 'rgba(150,110,50,0)')
  age.addColorStop(1, 'rgba(150,110,50,0.16)')
  g.fillStyle = age
  g.fillRect(0, 0, W, H)
  let rnd = seed || 5
  const next = () => (rnd = (rnd * 1664525 + 1013904223) >>> 0) / 4294967296
  for (let k = 0; k < 6; k++) {
    const x = next() * W
    const y = next() * H
    const r = 20 + next() * 60
    const spot = g.createRadialGradient(x, y, 0, x, y, r)
    spot.addColorStop(0, 'rgba(160,110,40,0.07)')
    spot.addColorStop(1, 'rgba(160,110,40,0)')
    g.fillStyle = spot
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // Everything printed in the one ink goes on its own layer, worn a little afterwards.
  const layer = document.createElement('canvas')
  layer.width = W
  layer.height = H
  const p = layer.getContext('2d')!
  p.fillStyle = css(ink)
  p.strokeStyle = css(ink)

  // Thin double frame round the design.
  p.lineWidth = 3
  p.strokeRect(44, 44, W - 88, H - 88)
  p.lineWidth = 1.2
  p.strokeRect(52, 52, W - 104, H - 104)

  // Top: a small line of text, then the country in big condensed capitals.
  p.textBaseline = 'alphabetic'
  setType(p, `VNEXPLORE · HÀ-NỘI · ${when.getFullYear()}`, W / 2, 92, { size: 22, weight: 600, sx: 0.86, spacing: 2, align: 'center' })
  setType(p, 'VIỆT-NAM', W / 2, 152, { size: 64, weight: 800, sx: 0.78, spacing: 4, align: 'center' })

  // The photo, engraved, with a fine frame line.
  p.drawImage(engrave(src, ink), PHOTO.x, PHOTO.y)
  if ('close' in src && typeof src.close === 'function') src.close()
  p.lineWidth = 2
  p.strokeRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h)

  // Bottom: solid band with the place's name reversed out in paper colour.
  p.fillRect(PHOTO.x, BAND.y, PHOTO.w, BAND.h)
  p.fillStyle = PAPER_CSS
  p.textBaseline = 'middle'
  setType(p, place.nameVi.toUpperCase(), PHOTO.x + 30, BAND.y + BAND.h / 2 + 4, { size: 56, weight: 800, sx: 0.78, spacing: 3, maxW: PHOTO.w - 190 })

  // The value in a circle, sitting on the band's right end.
  const vx = PHOTO.x + PHOTO.w - 74
  const vy = BAND.y + BAND.h / 2 - 6
  p.beginPath()
  p.arc(vx, vy, 62, 0, Math.PI * 2)
  p.fillStyle = PAPER_CSS
  p.fill()
  p.lineWidth = 5
  p.stroke()
  p.lineWidth = 1.5
  p.beginPath()
  p.arc(vx, vy, 53, 0, Math.PI * 2)
  p.stroke()
  p.fillStyle = css(ink)
  const value = VALUES[hash(place.id) % VALUES.length]
  setType(p, value, vx, vy + 4, { size: value.length > 3 ? 34 : 50, weight: 800, sx: 0.82, align: 'center', maxW: 92 })

  wear(p, W, H, seed, 1400)
  g.drawImage(layer, 0, 0)

  // Postmark in black on the photo's right edge, its wavy lines running off the stamp (and off
  // the people in the middle of the picture).
  const pm = postmark(when, seed)
  g.save()
  g.translate(PHOTO.x + PHOTO.w - 105, PHOTO.y + PHOTO.h - 120)
  g.rotate(-0.16)
  g.drawImage(pm, -104, -pm.height / 2)
  g.restore()

  // Perforations: punch half-circles out of every edge.
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = '#000'
  const holeR = 12
  const step = 34
  const punch = (x: number, y: number) => {
    g.beginPath()
    g.arc(x, y, holeR, 0, Math.PI * 2)
    g.fill()
  }
  for (let x = (W % step) / 2 + step / 2; x < W; x += step) punch(x, 0), punch(x, H)
  for (let y = (H % step) / 2 + step / 2; y < H; y += step) punch(0, y), punch(W, y)
  g.globalCompositeOperation = 'source-over'

  const out = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/webp', 0.9))
  if (!out) throw new Error('encode')
  return out
}
