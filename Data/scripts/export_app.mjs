/**
 * Export APPROVED rows from Data/sheets/*.csv into the app:
 *
 *   Frontend/src/data/generated/places.json   (Place[])
 *   Frontend/src/data/generated/roles.json    (Role[] with their approved missions)
 *
 * Only rows with status=approved are exported. Rows are validated; any problem stops the export
 * with a clear message (so a typo in the sheet can't break the app).
 *
 * Run after editing the sheets:  node Data/scripts/export_app.mjs
 * (Later the app will read the same data from Supabase instead of these files.)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { readCsv as readCsvFile } from './lib/csv.mjs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(DATA, '..', 'Frontend', 'src', 'data', 'generated')

const THEMES = ['culture', 'food', 'rainy', 'history', 'photo', 'fun']
const AREAS = ['hoan-kiem', 'ba-vi']
const KINDS = ['sight', 'food', 'fun']
const DEPTHS = ['full', 'quick']
const TAGS = ['iconic', 'groups', 'quiet', 'cultural', 'indoor', 'localFood', 'free', 'history', 'photo', 'lively']
const TONES = ['brick', 'butter', 'teal', 'leaf']
const readCsv = (name) => readCsvFile(join(DATA, 'sheets', name))

const errors = []
const fail = (file, r, msg) => errors.push(`${file} line ${r.__line} (${r.id ?? r.role_id ?? '?'}): ${msg}`)
const list = (s) => s.split(';').map((x) => x.trim()).filter(Boolean)
const num = (file, r, key) => {
  const n = Number(r[key])
  if (r[key] === '' || Number.isNaN(n)) fail(file, r, `${key} must be a number (got "${r[key]}")`)
  return n
}
const text = (file, r, key) => {
  if (!r[key]) fail(file, r, `${key} is empty`)
  return r[key]
}
const L = (file, r, base) => ({ vi: text(file, r, `${base}_vi`), en: text(file, r, `${base}_en`) })
/** Optional bilingual text: both empty is fine, only one filled is a mistake. */
const optL = (file, r, base) => {
  const vi = r[`${base}_vi`] ?? ''
  const en = r[`${base}_en`] ?? ''
  if (!vi !== !en) fail(file, r, `${base}: fill both _vi and _en (or neither)`)
  return { vi, en }
}

// ---------------------------------------------------------------- places
const places = readCsv('places.csv')
  .filter((r) => r.status === 'approved')
  .map((r) => {
    const F = 'places.csv'
    const themes = list(r.themes)
    const tags = list(r.tags)
    themes.filter((t) => !THEMES.includes(t)).forEach((t) => fail(F, r, `unknown theme "${t}" (use ${THEMES.join(', ')})`))
    tags.filter((t) => !TAGS.includes(t)).forEach((t) => fail(F, r, `unknown tag "${t}" (use ${TAGS.join(', ')})`))
    if (!themes.length) fail(F, r, 'themes is empty')
    if (!TONES.includes(r.tone)) fail(F, r, `tone must be one of ${TONES.join(', ')}`)
    if (!AREAS.includes(r.area)) fail(F, r, `area must be one of ${AREAS.join(', ')}`)
    if (!KINDS.includes(r.kind)) fail(F, r, `kind must be one of ${KINDS.join(', ')}`)
    if (!DEPTHS.includes(r.depth)) fail(F, r, `depth must be one of ${DEPTHS.join(', ')}`)
    const full = r.depth === 'full'
    const priceMin = num(F, r, 'price_min_k')
    const priceMax = num(F, r, 'price_max_k')
    if (priceMax < priceMin) fail(F, r, 'price_max_k is lower than price_min_k')
    // Full places need their story and challenge (Listen + Explore); quick ones only an intro.
    const story = full ? L(F, r, 'story') : optL(F, r, 'story')
    let challenge = null
    if (full || r.challenge_vi) {
      const answer = num(F, r, 'answer')
      if (![1, 2, 3].includes(answer)) fail(F, r, 'answer must be 1, 2 or 3')
      challenge = {
        prompt: L(F, r, 'challenge'),
        options: [L(F, r, 'option1'), L(F, r, 'option2'), L(F, r, 'option3')],
        answer: answer - 1,
        hint: L(F, r, 'hint'),
      }
    }
    return {
      id: text(F, r, 'id'),
      area: r.area,
      kind: r.kind,
      depth: r.depth,
      // Names stay as they are; English falls back to the original name.
      name: { vi: text(F, r, 'name_vi'), en: r.name_en || r.name_vi },
      nameVi: r.name_vi_short || r.name_vi,
      lat: num(F, r, 'lat'),
      lng: num(F, r, 'lng'),
      openingHours: r.opening_hours || null,
      priceMin,
      priceMax,
      visitMin: num(F, r, 'visit_min'),
      themes,
      tags,
      blurb: L(F, r, 'blurb'),
      tone: r.tone,
      story,
      why: full ? L(F, r, 'why') : optL(F, r, 'why'),
      photoTip: full ? L(F, r, 'photo_tip') : optL(F, r, 'photo_tip'),
      etiquette: full ? L(F, r, 'etiquette') : optL(F, r, 'etiquette'),
      challenge,
    }
  })

const ids = new Set()
for (const p of places) {
  if (ids.has(p.id)) errors.push(`places.csv: duplicate id "${p.id}"`)
  ids.add(p.id)
}

// ---------------------------------------------------------------- roles + missions
const missions = readCsv('missions.csv').filter((m) => m.status === 'approved' && ids.has(m.place_id))
const roles = readCsv('roles.csv').map((r) => {
  const F = 'roles.csv'
  const own = missions.filter((m) => m.role_id === r.id)
  return {
    id: text(F, r, 'id'),
    name: L(F, r, 'name'),
    intro: L(F, r, 'intro'),
    goal: L(F, r, 'goal'),
    itemNoun: L(F, r, 'item_noun'),
    // Only places that exist in the app, in the sheet's order.
    favPlaces: list(r.fav_places).filter((id) => ids.has(id)),
    missions: Object.fromEntries(
      own.map((m) => [m.place_id, { task: L('missions.csv', m, 'task'), item: L('missions.csv', m, 'item') }]),
    ),
    fallback: { task: L(F, r, 'fallback_task'), item: L(F, r, 'fallback_item') },
    ending: L(F, r, 'ending'),
    tone: TONES.includes(r.tone) ? r.tone : (fail(F, r, 'bad tone'), 'teal'),
  }
})

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) — nothing exported:\n  ` + errors.join('\n  '))
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'places.json'), JSON.stringify(places, null, 1) + '\n')
writeFileSync(join(OUT, 'roles.json'), JSON.stringify(roles, null, 1) + '\n')
console.log(`✓ ${places.length} places, ${roles.length} roles, ${missions.length} missions → Frontend/src/data/generated/`)
