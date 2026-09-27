/**
 * Build the editable data sheets (CSV, UTF-8 with BOM for Excel/Google Sheets):
 *
 *   Data/sheets/places.csv       13 current places + new drafts (all status=draft)
 *   Data/sheets/candidates.csv   other OSM places not drafted yet (to pick from)
 *   Data/sheets/roles.csv        the 4 Explore roles
 *   Data/sheets/missions.csv     role × place missions (current + new drafts)
 *   Data/sheets/transport.csv    fares, speeds, parking (one row per vehicle size)
 *
 * Reads the app's current data straight from Frontend/src/data/*.ts
 * (Node 22.6+ strips the TypeScript types) plus Data/drafts/*.json and Data/out/skeleton.csv.
 *
 * Run: node Data/scripts/build_csv.mjs [--force]
 *
 * ⚠ One-time bootstrap. Once people edit/approve rows in sheets/, THE SHEETS ARE THE SOURCE
 *   OF TRUTH — this script refuses to overwrite them unless you pass --force.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..')
if (existsSync(join(DATA, 'sheets', 'places.csv')) && !process.argv.includes('--force')) {
  console.error('sheets/ already exist and may contain approved edits — not overwriting. Use --force to rebuild.')
  process.exit(1)
}
const FRONT = join(DATA, '..', 'Frontend', 'src', 'data')
const load = (f) => import(pathToFileURL(join(FRONT, f)).href)

const { PLACES } = await load('places.ts')
const { ROLES } = await load('roles.ts')
const { TRANSPORT, TRANSPORTS } = await load('transport.ts')
const newPlaces = JSON.parse(readFileSync(join(DATA, 'drafts', 'new_places.json'), 'utf8'))
const newMissions = JSON.parse(readFileSync(join(DATA, 'drafts', 'new_missions.json'), 'utf8'))

// ---------------------------------------------------------------- CSV helpers
const cell = (v) => {
  const s = v === undefined || v === null ? '' : Array.isArray(v) ? v.join('; ') : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function writeCsv(name, cols, rows) {
  const out = join(DATA, 'sheets')
  mkdirSync(out, { recursive: true })
  const text = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n')
  writeFileSync(join(out, name), '﻿' + text, 'utf8')
  console.log(`  sheets/${name}: ${rows.length} rows`)
}
function readCsv(file) {
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '')
  const rows = []
  let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [head, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

// ---------------------------------------------------------------- places
const PLACE_COLS = [
  'id', 'status', 'name_vi', 'name_en', 'name_vi_short', 'lat', 'lng', 'address', 'opening_hours',
  'themes', 'tags', 'visit_min', 'price_min_k', 'price_max_k', 'price_checked_on', 'tone',
  'blurb_vi', 'blurb_en', 'story_vi', 'story_en', 'why_vi', 'why_en',
  'photo_tip_vi', 'photo_tip_en', 'etiquette_vi', 'etiquette_en',
  'challenge_vi', 'challenge_en', 'option1_vi', 'option1_en', 'option2_vi', 'option2_en',
  'option3_vi', 'option3_en', 'answer', 'hint_vi', 'hint_en',
  'wikidata', 'sources', 'review_notes',
]

const placeRow = (p, meta) => ({
  id: p.id,
  status: 'draft',
  name_vi: p.name.vi,
  name_en: p.name.en,
  name_vi_short: p.nameVi,
  lat: p.lat,
  lng: p.lng,
  address: meta.address ?? '',
  opening_hours: meta.openingHours ?? '',
  themes: p.themes,
  tags: p.tags,
  visit_min: p.visitMin,
  price_min_k: p.priceMin,
  price_max_k: p.priceMax,
  price_checked_on: '',
  tone: p.tone,
  blurb_vi: p.blurb.vi, blurb_en: p.blurb.en,
  story_vi: p.story.vi, story_en: p.story.en,
  why_vi: p.why.vi, why_en: p.why.en,
  photo_tip_vi: p.photoTip.vi, photo_tip_en: p.photoTip.en,
  etiquette_vi: p.etiquette.vi, etiquette_en: p.etiquette.en,
  challenge_vi: p.challenge.prompt.vi, challenge_en: p.challenge.prompt.en,
  ...Object.fromEntries(p.challenge.options.flatMap((o, i) => [[`option${i + 1}_vi`, o.vi], [`option${i + 1}_en`, o.en]])),
  answer: p.challenge.answer + 1, // 1-based for people editing the sheet
  hint_vi: p.challenge.hint.vi, hint_en: p.challenge.hint.en,
  wikidata: meta.wikidata ?? '',
  sources: meta.sources ?? [],
  review_notes: meta.reviewNotes ?? '',
})

const existing = PLACES.map((p) =>
  placeRow(p, {
    reviewNotes: 'Nội dung mẫu viết khi dựng giao diện — chưa có nguồn. Cần đối chiếu tư liệu, kiểm giá và kiểm thử thách tại chỗ.',
  }),
)
const drafted = newPlaces.map((p) => placeRow(p, p))
writeCsv('places.csv', PLACE_COLS, [...existing, ...drafted])

// ---------------------------------------------------------------- candidates (skeleton not yet drafted)
const usedQ = new Set(newPlaces.map((p) => p.wikidata))
// Exact (case-insensitive) name match against the places already in the app.
const usedNames = new Set(PLACES.flatMap((p) => [p.nameVi, p.name.vi]).map((n) => n.toLowerCase()))
const skeleton = readCsv(join(DATA, 'out', 'skeleton.csv'))
const candidates = skeleton.filter((r) => !usedQ.has(r.wikidata) && !usedNames.has(r.name_vi.toLowerCase()))
writeCsv(
  'candidates.csv',
  ['id', 'status', 'name_vi', 'name_en', 'lat', 'lng', 'osm_kind', 'address', 'opening_hours', 'website', 'wikidata', 'wikipedia_vi', 'wikipedia_en', 'inception', 'commons_image', 'osm_url', 'score', 'decision'],
  candidates.map((r) => ({ ...r, status: 'candidate', decision: '' })),
)

// ---------------------------------------------------------------- roles + missions
writeCsv(
  'roles.csv',
  ['id', 'name_vi', 'name_en', 'intro_vi', 'intro_en', 'goal_vi', 'goal_en', 'item_noun_vi', 'item_noun_en', 'fav_places', 'fallback_task_vi', 'fallback_task_en', 'fallback_item_vi', 'fallback_item_en', 'ending_vi', 'ending_en', 'tone'],
  ROLES.map((r) => ({
    id: r.id,
    name_vi: r.name.vi, name_en: r.name.en,
    intro_vi: r.intro.vi, intro_en: r.intro.en,
    goal_vi: r.goal.vi, goal_en: r.goal.en,
    item_noun_vi: r.itemNoun.vi, item_noun_en: r.itemNoun.en,
    fav_places: [...r.favPlaces, ...newMissions.filter((m) => m.roleId === r.id).map((m) => m.placeId)],
    fallback_task_vi: r.fallback.task.vi, fallback_task_en: r.fallback.task.en,
    fallback_item_vi: r.fallback.item.vi, fallback_item_en: r.fallback.item.en,
    ending_vi: r.ending.vi, ending_en: r.ending.en,
    tone: r.tone,
  })),
)
const missions = [
  ...ROLES.flatMap((r) => Object.entries(r.missions).map(([placeId, m]) => ({ role_id: r.id, place_id: placeId, m, status: 'draft' }))),
  ...newMissions.map((m) => ({ role_id: m.roleId, place_id: m.placeId, m, status: 'draft' })),
]
writeCsv(
  'missions.csv',
  ['role_id', 'place_id', 'status', 'task_vi', 'task_en', 'item_vi', 'item_en'],
  missions.map(({ role_id, place_id, status, m }) => ({
    role_id, place_id, status, task_vi: m.task.vi, task_en: m.task.en, item_vi: m.item.vi, item_en: m.item.en,
  })),
)

// ---------------------------------------------------------------- transport
const tRows = TRANSPORTS.flatMap((id) => {
  const s = TRANSPORT[id]
  const base = {
    transport: id,
    speed_normal_kmh: s.speedKmh.normal, speed_peak_kmh: s.speedKmh.peak,
    overhead_min: s.overheadMin, min_leg_m: s.minLegM, detour: s.detour,
    walking_street_ok: s.walkingStreetOk, peak_fare: s.peakFare ?? '',
    fuel_per_km_k: s.own?.fuelPerKmK ?? '', parking_k: s.own?.parkingK ?? '',
    maps_mode: s.mapsMode, checked_on: '',
  }
  if (s.fares) return s.fares.map((f) => ({ ...base, seats: f.seats, base_k: f.baseK, base_km: f.baseKm, per_km_k: f.perKmK }))
  return [{ ...base, seats: s.own?.seats ?? '', base_k: '', base_km: '', per_km_k: '' }]
})
writeCsv(
  'transport.csv',
  ['transport', 'seats', 'base_k', 'base_km', 'per_km_k', 'peak_fare', 'fuel_per_km_k', 'parking_k', 'speed_normal_kmh', 'speed_peak_kmh', 'overhead_min', 'min_leg_m', 'detour', 'walking_street_ok', 'maps_mode', 'checked_on'],
  tRows,
)
console.log('Done.')
