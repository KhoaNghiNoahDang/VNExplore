/**
 * Pull places travellers suggested in the app ("Thêm địa điểm", table place_suggestions) into
 * places.csv as drafts, then mark them `imported` (or `duplicate`) in Supabase.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node Data/scripts/pull_place_suggestions.mjs [--dry-run]
 *
 * (the same values as Backend/.env). A suggestion is only a starting point: every row lands as a
 * draft with the traveller's text in review_notes — check the place, write the intro in VI + EN,
 * fill price/hours, then set status=approved and export as usual.
 *
 * Duplicates: a suggestion within 60 m of a place with the same name (accents ignored) is marked
 * `duplicate` and not added.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv, writeCsv } from './lib/csv.mjs'

const SHEETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'sheets')
const DRY = process.argv.includes('--dry-run')
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env
if (!SUPABASE_URL || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see Backend/.env).')
  process.exit(1)
}

const api = async (path, init = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

const fold = (s) =>
  s.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim()
const slug = (s) => fold(s).replace(/ /g, '-').slice(0, 48).replace(/-+$/, '')
/** Straight-line metres. */
const metres = (a, b) => {
  const k = Math.PI / 180
  const x = (b.lng - a.lng) * k * Math.cos(((a.lat + b.lat) / 2) * k)
  const y = (b.lat - a.lat) * k
  return Math.hypot(x, y) * 6_371_000
}

const THEME = { food: 'food', sight: 'culture', fun: 'fun' }
const TONE = { food: 'butter', sight: 'teal', fun: 'leaf' }
const VISIT = { food: '60', sight: '60', fun: '90' }

const suggestions = await api('place_suggestions?status=eq.pending&order=created_at.asc&select=*')
if (!suggestions.length) {
  console.log('No pending suggestions.')
  process.exit(0)
}

const rows = readCsv(join(SHEETS, 'places.csv'))
const cols = Object.keys(rows[0]).filter((k) => k !== '__line')
const ids = new Set(rows.map((r) => r.id))
const pts = rows.map((r) => ({ id: r.id, area: r.area, name: fold(`${r.name_vi} ${r.name_en}`), lat: +r.lat, lng: +r.lng }))

const done = []
for (const s of suggestions) {
  const at = { lat: s.lat, lng: s.lng }
  const same = pts.find((p) => metres(p, at) < 60 && (p.name.includes(fold(s.name)) || fold(s.name).includes(p.name)))
  if (same) {
    done.push({ s, status: 'duplicate', place_id: same.id })
    continue
  }
  // Label the area like the nearest catalogued place (within 3 km), else just "hanoi".
  const near = pts.map((p) => [p, metres(p, at)]).sort((a, b) => a[1] - b[1])[0]
  const area = near && near[1] < 3000 ? near[0].area : 'hanoi'
  let id = slug(s.name) || 'goi-y'
  while (ids.has(id)) id += '-2'
  ids.add(id)
  const day = s.created_at.slice(0, 10)
  const contact = s.contact ?? ''
  const isUrl = /^https?:\/\//i.test(contact)
  const phone = /^\+?[\d\s.]{8,16}$/.test(contact) ? contact.replace(/[\s.]/g, '') : ''
  const notes = [
    `Gợi ý từ người dùng qua nút "Thêm địa điểm" (${day}, ${s.id}).`,
    s.description && `Mô tả của người gửi (${s.language}): "${s.description}"`,
    s.opening_hours && `Giờ mở cửa theo người gửi: "${s.opening_hours}"`,
    contact && !isUrl && !phone && `Liên hệ: ${contact}`,
    'Cần: kiểm tra tại chỗ hoặc qua nguồn, viết giới thiệu VI + EN, giá, giờ mở cửa.',
  ]
  rows.push({
    id, status: 'draft', area, kind: s.kind, depth: 'quick', name_vi: s.name, name_en: '', name_vi_short: '',
    lat: String(s.lat), lng: String(s.lng), address: s.address ?? '', opening_hours: '',
    themes: THEME[s.kind], tags: '', visit_min: VISIT[s.kind],
    price_min_k: s.price_min_k ?? '', price_max_k: s.price_max_k ?? '', price_checked_on: s.price_min_k != null || s.price_max_k != null ? day : '',
    tone: TONE[s.kind], blurb_vi: '', blurb_en: '',
    sources: [`Người dùng gợi ý qua app (${day})`, isUrl && contact].filter(Boolean).join('; '),
    review_notes: notes.filter(Boolean).join(' '), phone,
  })
  pts.push({ id, area, name: fold(s.name), ...at })
  done.push({ s, status: 'imported', place_id: id })
}

const added = done.filter((d) => d.status === 'imported')
for (const d of done) console.log(`${d.status === 'imported' ? '+' : '='} ${d.s.name} → ${d.place_id}${d.status === 'duplicate' ? ' (already there)' : ''}`)
if (DRY) {
  console.log(`--dry-run: ${added.length} would be added, nothing written.`)
  process.exit(0)
}
writeCsv(join(SHEETS, 'places.csv'), cols, rows)
const now = new Date().toISOString()
for (const d of done)
  await api(`place_suggestions?id=eq.${d.s.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: d.status, place_id: d.place_id, reviewed_at: now }),
  })
console.log(`places.csv: +${added.length} drafts; ${done.length - added.length} duplicates marked.`)
