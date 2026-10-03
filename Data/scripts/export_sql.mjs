/**
 * Turn Data/sheets/*.csv into Data/supabase/seed_content.sql + seed_candidates/part_*.sql (upserts), to load into Supabase
 * after the migrations (events need 0009_events.sql). Safe to run again: rows are updated, not duplicated.
 *
 * Run: node Data/scripts/export_sql.mjs
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv } from './lib/csv.mjs'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..')
const sheet = (name) => readCsv(join(DATA, 'sheets', name))

const str = (v) => (v === '' || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const num = (v) => (v === '' || v === undefined || Number.isNaN(Number(v)) ? 'null' : String(Number(v)))
const bool = (v) => (v === 'true' ? 'true' : 'false')
const arr = (v) => {
  const items = (v ?? '').split(';').map((x) => x.trim()).filter(Boolean)
  return items.length ? `array[${items.map(str).join(',')}]::text[]` : `'{}'::text[]`
}

/** columns: [name, formatter]. Emits one multi-row upsert per table (chunked). */
function upsert(table, key, columns, rows) {
  if (!rows.length) return ''
  const names = columns.map(([c]) => (c === 'group' ? '"group"' : c))
  const updates = names.filter((c) => !key.includes(c.replace(/"/g, ''))).map((c) => `${c} = excluded.${c}`)
  let sql = ''
  for (let i = 0; i < rows.length; i += 200) {
    const values = rows
      .slice(i, i + 200)
      .map((r) => `  (${columns.map(([c, f]) => f(r[c])).join(', ')})`)
      .join(',\n')
    sql += `insert into public.${table} (${names.join(', ')}) values\n${values}\n`
    sql += `on conflict (${key.join(', ')}) do update set ${updates.join(', ')};\n\n`
  }
  return sql
}

const T = (c) => [c, str]
const N = (c) => [c, num]
const A = (c) => [c, arr]

const placeCols = [
  T('id'), T('status'), T('area'), T('kind'), T('depth'), T('name_vi'), T('name_en'), T('name_vi_short'), N('lat'), N('lng'), T('address'),
  T('opening_hours'), A('themes'), A('tags'), N('visit_min'), N('price_min_k'), N('price_max_k'),
  T('price_checked_on'), T('tone'),
  ...['blurb', 'story', 'why', 'photo_tip', 'etiquette', 'challenge', 'option1', 'option2', 'option3', 'hint']
    .flatMap((b) => [T(`${b}_vi`), T(`${b}_en`)]),
  N('answer'), T('wikidata'), A('sources'), T('review_notes'),
  // 0012_place_notice_event_time.sql
  T('notice_vi'), T('notice_en'), T('phone'),
]
const candidateCols = [
  T('id'), T('area'), T('group'), T('status'), T('sensitivity'), T('sensitivity_reason'), T('category'),
  T('cuisine'), T('brand'), T('name_vi'), T('name_en'), N('lat'), N('lng'), T('osm_kind'), T('address'),
  T('opening_hours'), T('website'), T('wikidata'), T('wikipedia_vi'), T('wikipedia_en'), T('inception'),
  T('commons_image'), T('osm_url'), N('score'), T('decision'),
]
const roleCols = [
  T('id'), T('name_vi'), T('name_en'), T('intro_vi'), T('intro_en'), T('goal_vi'), T('goal_en'),
  T('item_noun_vi'), T('item_noun_en'), A('fav_places'), T('fallback_task_vi'), T('fallback_task_en'),
  T('fallback_item_vi'), T('fallback_item_en'), T('ending_vi'), T('ending_en'), T('tone'),
]
const missionCols = [T('role_id'), T('place_id'), T('status'), T('task_vi'), T('task_en'), T('item_vi'), T('item_en')]
const eventCols = [
  T('id'), T('status'), T('area'), T('kind'), T('category'), T('sensitivity'), T('name_vi'), T('name_en'),
  T('blurb_vi'), T('blurb_en'), T('place_id'), T('venue'), T('address'), N('lat'), N('lng'), T('from_date'),
  T('to_date'), A('weekdays'), A('start_times'), T('end_time'), N('visit_min'), N('price_min_k'), N('price_max_k'),
  ['needs_ticket', bool], T('event_url'), T('host_name'), T('host_url'), T('source'), T('checked_on'), T('review_notes'),
  // 0012: empty = confirmed
  ['time_confirmed', (v) => (v === 'false' ? 'false' : 'true')],
]
const fareCols = [
  T('transport'), N('seats'), N('base_k'), N('base_km'), N('per_km_k'), N('peak_fare'), N('fuel_per_km_k'),
  N('parking_k'), N('speed_normal_kmh'), N('speed_peak_kmh'), N('overhead_min'), N('min_leg_m'), N('detour'),
  ['walking_street_ok', bool], T('maps_mode'), T('checked_on'),
]

// Names stay as they are: an empty English name falls back to the original.
const places = sheet('places.csv').map((p) => ({ ...p, name_en: p.name_en || p.name_vi, phone: (p.phone ?? '').replace(/[\s.]/g, '') }))
const placeIds = new Set(places.map((p) => p.id))
const fares = sheet('transport.csv').map((r) => ({ ...r, seats: r.seats || '1' }))
const missions = sheet('missions.csv').filter((m) => placeIds.has(m.place_id))
// Links must be https (table check); an event pointing at a place that isn't seeded would break the foreign key.
const events = sheet('events.csv').map((e) => ({
  ...e,
  place_id: placeIds.has(e.place_id) ? e.place_id : '',
  event_url: e.event_url.startsWith('https://') ? e.event_url : '',
}))
// Drop blank/unknown decisions so the check constraint holds.
const candidates = sheet('candidates.csv').map((c) => ({ ...c, decision: ['keep', 'drop'].includes(c.decision) ? c.decision : '' }))

// Primary keys must be present and unique, or a whole batch fails in the database.
for (const [name, rows] of [['places.csv', places], ['candidates.csv', candidates], ['events.csv', events]]) {
  const seen = new Set()
  for (const r of rows) {
    if (!r.id) throw new Error(`${name} line ${r.__line}: empty id (${r.name_vi})`)
    if (seen.has(r.id)) throw new Error(`${name} line ${r.__line}: duplicate id "${r.id}"`)
    seen.add(r.id)
  }
}

const header = '-- Generated by Data/scripts/export_sql.mjs from Data/sheets/*.csv — do not edit by hand.'
const content = [
  header,
  'begin;',
  upsert('places', ['id'], placeCols, places),
  // Draft roles stay out: the roles table is readable by everyone.
  upsert('roles', ['id'], roleCols, sheet('roles.csv').filter((r) => (r.status || 'approved') === 'approved')),
  upsert('missions', ['role_id', 'place_id'], missionCols, missions),
  upsert('transport_fares', ['transport', 'seats'], fareCols, fares),
  upsert('events', ['id'], eventCols, events),
  'commit;',
].join('\n')
// Candidates are big: split into parts small enough for the Supabase SQL Editor (~100 KB each).
const PART = 350
const parts = []
for (let i = 0; i < candidates.length; i += PART) {
  parts.push([header, 'begin;', upsert('candidates', ['id'], candidateCols, candidates.slice(i, i + PART)), 'commit;'].join('\n'))
}

writeFileSync(join(DATA, 'supabase', 'seed_content.sql'), content)
const partsDir = join(DATA, 'supabase', 'seed_candidates')
rmSync(partsDir, { recursive: true, force: true })
mkdirSync(partsDir, { recursive: true })
parts.forEach((sql, i) => writeFileSync(join(partsDir, `part_${String(i + 1).padStart(2, '0')}.sql`), sql))
console.log(`✓ seed_content.sql: ${places.length} places, ${missions.length} missions, ${fares.length} fares, ${events.length} events`)
console.log(`✓ seed_candidates/: ${candidates.length} candidates in ${parts.length} parts`)
