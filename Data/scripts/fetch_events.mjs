/**
 * Pull events from Hanoi Maps (https://hanoimaps.github.io/events/) into Data/sheets/events.csv.
 *
 *   node Data/scripts/fetch_events.mjs            # fetch + merge
 *   node Data/scripts/fetch_events.mjs file.json  # merge a saved copy of events.json
 *
 * Every event is kept. `area` is hoan-kiem (≤ 3 km from the lake), ba-vi, or hanoi (anywhere else). Rows are matched by id
 * (`hm-<id>`): facts from the source (dates, times, venue, links) are refreshed, everything you
 * edited by hand (status, names, blurbs, kind, prices, place_id, notes…) is kept. Rows you added
 * yourself (any other id) are never touched.
 *
 * New rows are `approved` when they have a start time and an https link, otherwise `draft`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv } from './lib/csv.mjs'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHEET = join(DATA, 'sheets', 'events.csv')
const SOURCE = 'https://hanoimaps.github.io/events/events.json'

export const COLUMNS = [
  'id', 'status', 'area', 'kind', 'category', 'sensitivity',
  'name_vi', 'name_en', 'blurb_vi', 'blurb_en',
  'place_id', 'venue', 'address', 'lat', 'lng',
  'from_date', 'to_date', 'weekdays', 'start_times', 'end_time', 'visit_min',
  'price_min_k', 'price_max_k', 'needs_ticket',
  'event_url', 'host_name', 'host_url', 'source', 'checked_on', 'review_notes',
  // "false" = the source gives no time: the app shows it as an estimate. Empty = confirmed.
  'time_confirmed',
]
/** Refreshed from the source on every run; every other column belongs to the editor. */
const SOURCE_COLUMNS = ['venue', 'address', 'lat', 'lng', 'from_date', 'to_date', 'event_url', 'host_name', 'host_url', 'needs_ticket', 'checked_on']

const LAKE = { lat: 21.0287, lng: 105.8524 }
const km = (a, b) => Math.hypot((a.lng - b.lng) * 104, (a.lat - b.lat) * 111)
function areaOf(p) {
  if (km(p, LAKE) <= 3) return 'hoan-kiem'
  if (p.lat > 20.95 && p.lat < 21.25 && p.lng > 105.25 && p.lng < 105.55) return 'ba-vi'
  return 'hanoi'
}

const CATEGORY = [
  ['music', /hoà nhạc|hòa nhạc|concert|jazz|acoustic|rock|live|liveshow|dj|giao hưởng|symphony|nhạc|music|trịnh ca|ca trù|band|ca đoàn|hoan ca|choir|open mic/i],
  ['theatre', /kịch|theatre|theater|múa|rối|opera|nhạc vũ kịch|ballet|xiếc|circus/i],
  ['film', /phim|điện ảnh|cinema|film|cinéhub|chiếu|screening|movie/i],
  ['exhibition', /triển lãm|exhibition|trưng bày|gallery|art space|artspace|museum|bảo tàng|video art|art /i],
  ['workshop', /workshop|lớp học|class|thực hành|làm |craft/i],
  ['market', /chợ|market|hội chợ|fair|bazaar/i],
  ['talk', /toạ đàm|tọa đàm|talk|hội thảo|giao lưu|ra mắt sách|sách|book|seminar|chia sẻ|nghề nghiệp|career/i],
]
const ADULT = /\bbar\b|club|nightclub|pub|boom box|otto|standing bar|le maquis|bụi rock|beer/i

const pad = (t) => (/^\d:\d\d$/.test(t) ? `0${t}` : t)
const isTime = (t) => /^\d\d:\d\d$/.test(t)
const addMin = (t, m) => {
  const [h, mi] = t.split(':').map(Number)
  const total = Math.min(h * 60 + mi + m, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
const today = new Date().toISOString().slice(0, 10)

/** One GeoJSON feature → a sheet row (null without coordinates). */
function toRow(f, places) {
  const p = f.properties
  const [lng, lat] = f.geometry?.coordinates ?? []
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  const area = areaOf({ lat, lng })
  const start = pad(String(p.start_time ?? '').trim())
  const duration = Number(String(p.time ?? '').replace(/\D/g, '')) || 0
  const from = String(p.from_date ?? '').slice(0, 10)
  const to = String(p.to_date ?? from).slice(0, 10)
  const hay = `${p.name_vn} ${p.host_name}`
  const category = CATEGORY.find(([, re]) => re.test(hay))?.[0] ?? 'other'
  // Several days with a daytime start = an exhibition you can drop in on; otherwise a show with a fixed start.
  const kind = isTime(start) && days(from, to) >= 2 && start < '17:00' ? 'open' : 'show'
  const visit = kind === 'open' ? 45 : duration || 120
  const end = kind === 'open' && isTime(start) ? (start < '12:00' ? '18:00' : addMin(start, 240)) : ''
  // A place we already have within ~80 m (a museum hosting an exhibition, a theatre…).
  const near = places
    .map((x) => [x, km(x, { lat, lng }) * 1000])
    .filter(([x, d]) => d <= 80 && x.kind !== 'food')
    .sort((a, b) => a[1] - b[1])[0]?.[0]
  // The source writes "N/A" for missing links: keep real web addresses only.
  const link = (v) => (/^https?:\/\//.test(String(v ?? '').trim()) ? String(v).trim() : '')
  const url = link(p.event_url)
  // A show listed over more than a week is usually weekly (e.g. every Friday): needs weekdays by hand.
  const longRun = kind === 'show' && days(from, to) > 7
  const ok = isTime(start) && /^https:\/\//.test(url) && !longRun
  return {
    id: `hm-${f.id}`,
    status: ok ? 'approved' : 'draft',
    area,
    kind,
    category,
    sensitivity: ADULT.test(String(p.host_name ?? '')) ? 'adult' : 'ok',
    name_vi: String(p.name_vn ?? '').trim(),
    name_en: '',
    blurb_vi: '',
    blurb_en: '',
    place_id: near?.id ?? '',
    venue: String(p.host_name ?? '').trim(),
    address: String(p.address ?? '').trim(),
    lat: lat.toFixed(6),
    lng: lng.toFixed(6),
    from_date: from,
    to_date: to,
    weekdays: '',
    start_times: isTime(start) ? start : '',
    end_time: end,
    visit_min: String(visit),
    price_min_k: '',
    price_max_k: '',
    needs_ticket: p.isRegister === 'Yes' ? 'true' : 'false',
    event_url: url,
    host_name: String(p.host_name ?? '').trim(),
    host_url: link(p.host_url),
    source: 'Hanoi Maps',
    checked_on: today,
    review_notes: ok
      ? 'Nhập tự động từ Hanoi Maps — kiểm tra giờ, giá vé và loại (show/open).'
      : longRun
        ? 'Nhập tự động từ Hanoi Maps — diễn ra nhiều tuần: điền cột weekdays (vd. fri) trước khi duyệt.'
        : 'Nhập tự động từ Hanoi Maps — thiếu giờ bắt đầu hoặc link https, cần bổ sung trước khi duyệt.',
  }
}

const cell = (v) => {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export function writeEvents(rows) {
  const lines = [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))]
  writeFileSync(SHEET, '\uFEFF' + lines.join('\n') + '\n')
}

async function main() {
  const arg = process.argv[2]
  const json = arg ? JSON.parse(readFileSync(arg, 'utf8')) : await (await fetch(SOURCE)).json()
  const features = json.features ?? []
  const places = readCsv(join(DATA, 'sheets', 'places.csv')).map((p) => ({ id: p.id, kind: p.kind, lat: +p.lat, lng: +p.lng }))
  const existing = existsSync(SHEET) ? readCsv(SHEET) : []
  const byId = new Map(existing.map((r) => [r.id, r]))

  let added = 0, updated = 0, skipped = 0
  for (const f of features) {
    const fresh = toRow(f, places)
    if (!fresh) { skipped++; continue }
    const old = byId.get(fresh.id)
    if (!old) { byId.set(fresh.id, fresh); added++; continue }
    const merged = { ...old }
    for (const c of COLUMNS) if (!merged[c]) merged[c] = fresh[c]
    for (const c of SOURCE_COLUMNS) merged[c] = fresh[c]
    byId.set(fresh.id, merged)
    updated++
  }
  // Hand-added rows first, then imported ones by date.
  const rows = [...byId.values()].sort((a, b) =>
    (a.id.startsWith('hm-') - b.id.startsWith('hm-')) || a.from_date.localeCompare(b.from_date) || a.id.localeCompare(b.id))
  writeEvents(rows)
  console.log(`✓ events.csv: ${rows.length} rows (+${added} new, ${updated} refreshed, ${skipped} without coordinates skipped)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
