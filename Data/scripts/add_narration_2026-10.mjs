/**
 * One-off (2026-10-11): narration ("Nghe kể") for 11 cultural sights that only had a short intro —
 * Văn Miếu, Cổ Loa, Chùa Trấn Quốc, Cửa Bắc, five museums, Hội quán Quảng Đông and the French
 * ruins on Ba Vì. Texts are in Data/imports/narration_2026-10.json, written only from the sources
 * listed with each place. Fills story_vi/story_en, and why / photo tip / etiquette where empty
 * (never overwrites); adds the sources and a review note. Safe to run again.
 * (Khu trưng bày máy bay Sơn Tây is left out: no source beyond OpenStreetMap.)
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv, writeCsv } from './lib/csv.mjs'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = join(DATA, 'sheets', 'places.csv')
const texts = JSON.parse(readFileSync(join(DATA, 'imports', 'narration_2026-10.json'), 'utf8'))
const NOTE = 'Thuyết minh (story) viết 2026-10-11 từ các nguồn trong cột sources — cần người duyệt đọc lại trước khi coi là chính thức.'

const rows = readCsv(FILE)
const cols = Object.keys(rows[0]).filter((k) => k !== '__line')
let changed = 0
for (const [id, t] of Object.entries(texts)) {
  const r = rows.find((x) => x.id === id)
  if (!r) throw new Error(`no place ${id}`)
  let touched = false
  for (const k of ['story_vi', 'story_en', 'why_vi', 'why_en', 'photo_tip_vi', 'photo_tip_en', 'etiquette_vi', 'etiquette_en']) {
    if (t[k] && !r[k].trim()) {
      r[k] = t[k]
      touched = true
    }
  }
  const have = r.sources.split('; ').map((s) => s.trim()).filter(Boolean)
  const add = t.sources.filter((s) => !have.includes(s))
  if (add.length) {
    r.sources = [...have, ...add].join('; ')
    touched = true
  }
  if (!r.review_notes.includes(NOTE)) {
    r.review_notes = [r.review_notes, NOTE].filter(Boolean).join(' ')
    touched = true
  }
  if (touched) changed++
}
writeCsv(FILE, cols, rows)
console.log(`places.csv: narration added to ${changed} places`)
