/**
 * Export APPROVED rows from Data/sheets/*.csv into the app:
 *
 *   Frontend/src/data/generated/places.json   (Place[], each with its extra quiz questions from quizzes.csv)
 *   Frontend/src/data/generated/roles.json    (Role[] with their approved missions)
 *   Frontend/src/data/generated/events.json   (QuestEvent[]; events that ended >90 days ago are dropped)
 *   Frontend/src/data/generated/drafts.json   (roles with draft content — the app shows them in local dev only)
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
/** What a quiz question is about (shown as a small label). */
const QUIZ_KINDS = ['look', 'history', 'legend', 'culture', 'architecture', 'nature']
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

/** One multiple-choice question: three options, a hint after a wrong try, an explanation after the answer. */
function question(file, r, promptKey, kindKey) {
  const answer = num(file, r, 'answer')
  if (![1, 2, 3].includes(answer)) fail(file, r, 'answer must be 1, 2 or 3')
  if (!QUIZ_KINDS.includes(r[kindKey])) fail(file, r, `${kindKey} must be one of ${QUIZ_KINDS.join(', ')}`)
  return {
    kind: r[kindKey],
    prompt: L(file, r, promptKey),
    options: [L(file, r, 'option1'), L(file, r, 'option2'), L(file, r, 'option3')],
    answer: answer - 1,
    hint: L(file, r, 'hint'),
    explain: L(file, r, 'explain'),
  }
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
    const challenge = full || r.challenge_vi ? question(F, r, 'challenge', 'challenge_kind') : null
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
      // Where the information comes from (URLs or names), shown in the app.
      sources: list(r.sources ?? ''),
      // A prominent notice (e.g. workshops: "contact them before you go") and a phone number.
      notice: (() => {
        const n = optL(F, r, 'notice')
        return n.vi ? n : null
      })(),
      phone: (() => {
        const p = (r.phone ?? '').replace(/[\s.]/g, '')
        if (p && !/^\+?\d{8,13}$/.test(p)) fail(F, r, `phone "${r.phone}" doesn't look like a phone number`)
        return p || null
      })(),
    }
  })

const ids = new Set()
for (const p of places) {
  if (ids.has(p.id)) errors.push(`places.csv: duplicate id "${p.id}"`)
  ids.add(p.id)
}

// ---------------------------------------------------------------- extra quiz questions
// Every approved question must say where its facts come from (`sources`).
const quizIds = new Set()
for (const r of readCsv('quizzes.csv').filter((q) => q.status === 'approved')) {
  const F = 'quizzes.csv'
  if (quizIds.has(r.id)) fail(F, r, `duplicate id "${r.id}"`)
  quizIds.add(r.id)
  const place = places.find((p) => p.id === r.place_id)
  if (!place) {
    fail(F, r, `unknown or unapproved place_id "${r.place_id}"`)
    continue
  }
  if (!r.sources) fail(F, r, 'sources is empty — every question needs a source')
  ;(place.quiz ??= []).push(question(F, r, 'question', 'kind'))
}

// ---------------------------------------------------------------- roles + missions
// Roles are picked AFTER the route: each role has tags (themes, kinds of stop, event categories)
// used to suggest the roles that fit the chosen stops, its own missions for some places, and
// mission templates per kind of stop (sight / food / fun / event) so every stop gets a task in
// the role's voice. Approved rows → roles.json; drafts → drafts.json (shown only in local dev).
const ROLE_AREAS = ['any', ...AREAS]
const TEMPLATE_KINDS = ['sight', 'food', 'fun', 'event']
const ROLE_TAGS = new Set([...THEMES, ...KINDS, 'event', 'music', 'theatre', 'film', 'exhibition', 'workshop', 'talk', 'market', 'festival'])
const allMissions = readCsv('missions.csv').filter((m) => ids.has(m.place_id))
const allTemplates = readCsv('role_templates.csv')
const roleRows = readCsv('roles.csv')
const roleIds = new Set(roleRows.map((r) => r.id))
allTemplates.forEach((t) => {
  if (!roleIds.has(t.role_id)) fail('role_templates.csv', t, `unknown role "${t.role_id}"`)
  if (!TEMPLATE_KINDS.includes(t.kind)) fail('role_templates.csv', t, `kind must be one of ${TEMPLATE_KINDS.join(', ')}`)
  if (!['draft', 'approved'].includes(t.status)) fail('role_templates.csv', t, 'status must be draft or approved')
  if (t.tag && !THEMES.includes(t.tag) && !TAGS.includes(t.tag)) fail('role_templates.csv', t, `tag must be a place theme or tag (got "${t.tag}")`)
})

/** A role built from its row plus the missions / templates whose status is in `statuses`. */
function buildRole(r, statuses) {
  const F = 'roles.csv'
  if (!ROLE_AREAS.includes(r.area)) fail(F, r, `area must be one of ${ROLE_AREAS.join(', ')}`)
  const tags = list(r.tags)
  tags.filter((t) => !ROLE_TAGS.has(t)).forEach((t) => fail(F, r, `unknown tag "${t}"`))
  if (!tags.length) fail(F, r, 'tags is empty')
  const own = allMissions.filter((m) => m.role_id === r.id && statuses.includes(m.status))
  const templates = allTemplates.filter((t) => t.role_id === r.id && statuses.includes(t.status))
  return {
    id: text(F, r, 'id'),
    area: r.area,
    tags,
    name: L(F, r, 'name'),
    intro: L(F, r, 'intro'),
    goal: L(F, r, 'goal'),
    itemNoun: L(F, r, 'item_noun'),
    // Only places that exist in the app, in the sheet's order.
    favPlaces: list(r.fav_places).filter((id) => ids.has(id)),
    missions: Object.fromEntries(
      own.map((m) => [m.place_id, { task: L('missions.csv', m, 'task'), item: L('missions.csv', m, 'item') }]),
    ),
    // Several per kind; a tagged one is preferred at places with that theme / tag.
    templates: templates.map((t) => ({
      kind: t.kind,
      tag: t.tag || null,
      task: L('role_templates.csv', t, 'task'),
      item: L('role_templates.csv', t, 'item'),
    })),
    fallback: { task: L(F, r, 'fallback_task'), item: L(F, r, 'fallback_item') },
    ending: L(F, r, 'ending'),
    tone: TONES.includes(r.tone) ? r.tone : (fail(F, r, 'bad tone'), 'teal'),
  }
}
const missions = allMissions.filter((m) => m.status === 'approved')
const roles = roleRows.filter((r) => (r.status || 'approved') === 'approved').map((r) => buildRole(r, ['approved']))
// Local preview: every role with drafts included, flagged so the app can badge it.
const draftRoles = roleRows
  .filter((r) => r.status === 'draft' || allMissions.some((m) => m.role_id === r.id && m.status === 'draft') ||
    allTemplates.some((t) => t.role_id === r.id && t.status === 'draft'))
  .map((r) => ({ ...buildRole(r, ['approved', 'draft']), draft: true }))

// ---------------------------------------------------------------- events
const EVENT_KINDS = ['show', 'open']
const CATEGORIES = ['music', 'theatre', 'film', 'exhibition', 'workshop', 'talk', 'market', 'festival', 'other']
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s)
const isTime = (s) => /^\d{2}:\d{2}$/.test(s)
// Keep events that ended up to 90 days ago, so recent journeys in the passport still resolve.
const keepFrom = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
const eventIds = new Set()
const events = readCsv('events.csv')
  .filter((r) => r.status === 'approved')
  .map((r) => {
    const F = 'events.csv'
    if (eventIds.has(r.id)) fail(F, r, `duplicate id "${r.id}"`)
    eventIds.add(r.id)
    if (!/^[a-z0-9-]+$/.test(r.id)) fail(F, r, 'id: lowercase letters, digits and "-" only')
    if (![...AREAS, 'hanoi'].includes(r.area)) fail(F, r, `area must be one of ${AREAS.join(', ')}, hanoi`)
    if (!EVENT_KINDS.includes(r.kind)) fail(F, r, `kind must be one of ${EVENT_KINDS.join(', ')}`)
    if (!CATEGORIES.includes(r.category)) fail(F, r, `category must be one of ${CATEGORIES.join(', ')}`)
    if (!['ok', 'adult'].includes(r.sensitivity)) fail(F, r, 'sensitivity must be ok or adult')
    if (!isDate(r.from_date) || !isDate(r.to_date)) fail(F, r, 'from_date / to_date must be YYYY-MM-DD')
    else if (r.to_date < r.from_date) fail(F, r, 'to_date is before from_date')
    const weekdays = list(r.weekdays).map((d) => {
      const i = WEEKDAYS.indexOf(d)
      if (i === -1) fail(F, r, `unknown weekday "${d}" (use ${WEEKDAYS.join(', ')})`)
      return i
    })
    const times = list(r.start_times)
    if (!times.length) fail(F, r, 'start_times is empty')
    times.filter((t) => !isTime(t)).forEach((t) => fail(F, r, `start time "${t}" must be HH:MM`))
    if (r.kind === 'open' && (!isTime(r.end_time) || r.end_time <= times[0]))
      fail(F, r, 'open events need an end_time (HH:MM) after the start time')
    if (r.kind === 'show' && times.length > 1 && r.end_time) fail(F, r, 'leave end_time empty for shows with several start times')
    const priced = r.price_min_k !== '' || r.price_max_k !== ''
    const priceMin = priced ? num(F, r, 'price_min_k') : null
    const priceMax = priced ? num(F, r, 'price_max_k') : null
    if (priced && priceMax < priceMin) fail(F, r, 'price_max_k is lower than price_min_k')
    if (r.event_url && !/^https:\/\//.test(r.event_url)) fail(F, r, 'event_url must start with https://')
    if (r.place_id && !ids.has(r.place_id)) fail(F, r, `place_id "${r.place_id}" is not an approved place`)
    return {
      id: r.id,
      area: r.area,
      kind: r.kind,
      category: r.category,
      adult: r.sensitivity === 'adult',
      name: { vi: text(F, r, 'name_vi'), en: r.name_en || r.name_vi },
      blurb: optL(F, r, 'blurb'),
      placeId: r.place_id || null,
      venue: r.venue,
      address: r.address,
      lat: num(F, r, 'lat'),
      lng: num(F, r, 'lng'),
      fromDate: r.from_date,
      toDate: r.to_date,
      weekdays,
      times,
      endTime: r.end_time || null,
      visitMin: num(F, r, 'visit_min'),
      priceMin,
      priceMax,
      ticket: r.needs_ticket === 'true',
      url: r.event_url || null,
      host: r.host_name,
      source: r.source,
      // false = the source gives no time; the app labels it an estimate.
      timeConfirmed: r.time_confirmed !== 'false',
    }
  })
  .filter((e) => e.toDate >= keepFrom)

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) — nothing exported:\n  ` + errors.join('\n  '))
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'places.json'), JSON.stringify(places, null, 1) + '\n')
writeFileSync(join(OUT, 'roles.json'), JSON.stringify(roles, null, 1) + '\n')
writeFileSync(join(OUT, 'events.json'), JSON.stringify(events, null, 1) + '\n')
writeFileSync(join(OUT, 'drafts.json'), JSON.stringify({ roles: draftRoles }, null, 1) + '\n')
console.log(
  `✓ ${places.length} places, ${quizIds.size} extra quiz questions, ${roles.length} roles, ${missions.length} missions, ${events.length} events → Frontend/src/data/generated/`,
)
console.log(`  drafts.json: ${draftRoles.length} roles with drafts (local preview only)`)
