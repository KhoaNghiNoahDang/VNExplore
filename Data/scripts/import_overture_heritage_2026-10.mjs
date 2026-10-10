/**
 * One-off import (2026-10-10) of Hanoi's pagodas, temples, communal houses, churches and other
 * heritage sites from Overture Maps Places (release 2026-09-23, CDLA-Permissive-2.0), prepared in
 * Data/imports/overture_heritage_2026-10.json:
 *
 *  - Kept: places Overture files as heritage / places of worship whose name starts with a heritage
 *    word (Chùa, Đền, Đình, Miếu, Phủ, Nhà thờ, Giáo xứ, Văn miếu, Lăng mộ…), inside Hanoi's
 *    boundary (Overture divisions). Dropped: apartment blocks and shops filed as "historic",
 *    family ancestral halls, names without diacritics, other provinces, confidence < 0.3.
 *  - Names cleaned (no "- Đống Đa - Hà Nội" tails, odd casing, Chinese characters); duplicates
 *    merged (same name nearby) and places already in places.csv left out.
 *  - Text is only what the type of site makes true (a pagoda is a Buddhist pagoda, a đình is where
 *    the village honours its guardian spirit…) plus etiquette — no invented history. Each row is
 *    tagged `openData`: the app labels it and ranks it after curated places.
 *  - Places about national leaders (Lăng Bác, Phủ Chủ tịch, K9…) are not written from templates:
 *    they go to to_add_manually.csv. War memorials and Overture confidence < 0.5 → draft.
 *  - Price 0: pagodas, temples, đình and churches don't sell tickets as a rule — flagged as an
 *    assumption in review_notes.
 *
 * Safe to run once; running again does nothing (ids already present are left alone).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv, writeCsv } from './lib/csv.mjs'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHEETS = join(DATA, 'sheets')
const sites = JSON.parse(readFileSync(join(DATA, 'imports', 'overture_heritage_2026-10.json'), 'utf8'))

const fold = (s) =>
  s.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim()
const slug = (s) => fold(s).replace(/ /g, '-')

const RELIGIOUS = {
  vi: 'Ăn mặc kín đáo, nói khẽ, không chụp ảnh người đang lễ.',
  en: 'Dress modestly, keep your voice down and don’t photograph people praying.',
}
const CHURCH = {
  vi: 'Ăn mặc lịch sự, giữ yên lặng; khi đang có thánh lễ thì đứng phía sau hoặc chờ lễ xong.',
  en: 'Dress respectfully and keep quiet; during Mass, stay at the back or wait until it ends.',
}

/** What each type of site is — true of every site of that type. `where` = "Đống Đa" / "Dong Da". */
const TYPE = {
  pagoda: {
    vi: (w) => `Chùa thờ Phật${w.vi ? ` ở ${w.vi}` : ''}, Hà Nội.`,
    en: (w) => `A Buddhist pagoda${w.en ? ` in ${w.en}` : ''}, Hanoi.`,
    themes: 'culture; history', visit: 30, etiquette: RELIGIOUS,
  },
  temple: {
    vi: (w) => `Đền, miếu – nơi thờ thần, thánh hoặc người có công với dân làng${w.vi ? `, ở ${w.vi}` : ''}, Hà Nội.`,
    en: (w) => `A temple or shrine honouring deities, saints or local heroes${w.en ? `, in ${w.en}` : ''}, Hanoi.`,
    themes: 'culture; history', visit: 30, etiquette: RELIGIOUS,
  },
  dinh: {
    vi: (w) => `Đình làng${w.vi ? ` ở ${w.vi}` : ''}, Hà Nội – nơi làng thờ Thành hoàng và họp việc chung.`,
    en: (w) => `A village communal house (đình)${w.en ? ` in ${w.en}` : ''}, Hanoi – where the village honours its guardian spirit and meets.`,
    themes: 'culture; history', visit: 30, etiquette: RELIGIOUS,
  },
  phu: {
    vi: (w) => `Phủ – nơi thờ tự theo tín ngưỡng dân gian${w.vi ? `, ở ${w.vi}` : ''}, Hà Nội.`,
    en: (w) => `A phủ, a shrine of Vietnamese folk worship${w.en ? `, in ${w.en}` : ''}, Hanoi.`,
    themes: 'culture; history', visit: 30, etiquette: RELIGIOUS,
  },
  vanchi: {
    vi: (w) => `Văn miếu, văn chỉ – nơi thờ Khổng Tử và tôn vinh người đỗ đạt của địa phương${w.vi ? `, ở ${w.vi}` : ''}, Hà Nội.`,
    en: (w) => `A temple of literature honouring Confucius and the area’s laureates${w.en ? `, in ${w.en}` : ''}, Hanoi.`,
    themes: 'culture; history', visit: 30, etiquette: RELIGIOUS,
  },
  church: {
    vi: (w, c) => `Nhà thờ ${c ? 'Công giáo' : 'Kitô giáo'}${w.vi ? ` ở ${w.vi}` : ''}, Hà Nội.`,
    en: (w, c) => `A ${c ? 'Catholic' : 'Christian'} church${w.en ? ` in ${w.en}` : ''}, Hanoi.`,
    themes: 'culture', visit: 20, etiquette: CHURCH,
  },
  tomb: {
    vi: (w) => `Lăng mộ${w.vi ? ` ở ${w.vi}` : ''}, Hà Nội.`,
    en: (w) => `A tomb${w.en ? ` in ${w.en}` : ''}, Hanoi.`,
    themes: 'history', visit: 20, etiquette: RELIGIOUS,
  },
  relic: {
    vi: (w) => `Khu di tích${w.vi ? ` ở ${w.vi}` : ''}, Hà Nội.`,
    en: (w) => `A heritage site${w.en ? ` in ${w.en}` : ''}, Hanoi.`,
    themes: 'history; culture', visit: 45, etiquette: null,
  },
  monument: {
    vi: (w) => `Tượng đài, đài tưởng niệm${w.vi ? ` ở ${w.vi}` : ''}, Hà Nội.`,
    en: (w) => `A monument or memorial${w.en ? ` in ${w.en}` : ''}, Hanoi.`,
    themes: 'history', visit: 15, etiquette: null,
  },
  tower: {
    vi: (w) => `Công trình cổ${w.vi ? ` ở ${w.vi}` : ''}, Hà Nội.`,
    en: (w) => `A historic structure${w.en ? ` in ${w.en}` : ''}, Hanoi.`,
    themes: 'history; photo', visit: 15, etiquette: null,
  },
}
/** A few sites get their own line (facts that are common knowledge and checked). */
const OWN = {
  'Chùa Một Cột': {
    vi: 'Ngôi chùa dựng trên một cột đá giữa hồ vuông, gắn với vua Lý Thái Tông (thế kỷ XI); biểu tượng của Hà Nội.',
    en: 'A pagoda set on a single stone pillar in a square pond, linked to King Lý Thái Tông (11th century) – a symbol of Hanoi.',
  },
  'Tháp nước Hàng Đậu': {
    vi: 'Tháp nước hình trụ thời Pháp ở đầu phố Hàng Đậu, từng cấp nước cho khu phố cổ; ngắm từ bên ngoài.',
    en: 'A round French-era water tower at the end of Hàng Đậu street that once supplied the Old Quarter; seen from outside.',
  },
}

const ascii = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
const SRC = 'Overture Maps Places (2026-09-23)'

/** Leaders' sites need their own careful text (Data/README: sensitive topics). */
const LEADERS = /bác hồ|chủ tịch|lăng bác|\bk9\b/i

const rows = readCsv(join(SHEETS, 'places.csv'))
const manual = readCsv(join(SHEETS, 'to_add_manually.csv'))
const haveManual = new Set(manual.map((r) => r.name_vi))
const cols = Object.keys(rows[0]).filter((k) => k !== '__line')
const ids = new Set(rows.map((r) => r.id))
// Already imported: the Overture map link (by coordinates) is in sources.
const seen = new Set(rows.flatMap((r) => (r.sources || '').split('; ').filter((x) => x.startsWith('https://explore.overturemaps.org/'))))
let added = 0, drafts = 0
for (const s of sites) {
  if (LEADERS.test(s.name)) {
    if (!haveManual.has(s.name))
      manual.push({ area: s.district ? slug(s.district) : 'hanoi', name_vi: s.name, note: `Overture Maps (2026-10-10), độ tin cậy ${s.confidence}: chủ đề lãnh tụ — cần viết tay và duyệt kỹ.`, lat: String(s.lat), lng: String(s.lng) })
    continue
  }
  const link = `https://explore.overturemaps.org/#17/${s.lat}/${s.lng}`
  if (seen.has(link)) continue
  let id = slug(s.name)
  if (ids.has(id) && s.district) id = `${id}-${slug(s.district)}`
  for (let n = 2; ids.has(id); n++) id = `${slug(s.name)}-${n}`
  const t = TYPE[s.kind]
  const where = { vi: s.district ?? '', en: s.district ? ascii(s.district) : '' }
  const catholic = /giáo (xứ|họ)|công giáo|catholic|chính toà/i.test(`${s.name} ${s.source_name}`)
  const own = OWN[s.name.replace('Tháp Nước', 'Tháp nước')]
  const draft = s.sensitive || s.confidence < 0.5
  const notes = [
    `Nhập 2026-10-10 từ ${SRC}, CDLA-Permissive-2.0; tên gốc: “${s.source_name}”, độ tin cậy ${s.confidence}.`,
    'Giới thiệu viết theo loại di tích, chưa có câu chuyện riêng.',
    s.kind === 'relic' || s.kind === 'monument' || s.kind === 'tower' || s.kind === 'tomb'
      ? 'Giá 0 là giả định — kiểm tra vé.'
      : 'Giá 0 là giả định: chùa, đền, đình, nhà thờ thường không bán vé.',
    'Chưa xác minh tại chỗ: toạ độ, giờ mở cửa.',
    s.sensitive && 'Chủ đề chiến tranh — duyệt kỹ trước khi đưa lên (xem README).',
    !s.sensitive && s.confidence < 0.5 && 'Độ tin cậy thấp (< 0,5) — kiểm tra địa điểm có thật và đúng vị trí.',
  ].filter(Boolean)
  rows.push({
    id, status: draft ? 'draft' : 'approved', area: s.district ? slug(s.district) : 'hanoi', kind: 'sight', depth: 'quick',
    name_vi: s.name, name_en: '', name_vi_short: '', lat: String(s.lat), lng: String(s.lng), address: s.address ?? '',
    opening_hours: '', themes: t.themes, tags: 'cultural; openData', visit_min: String(t.visit),
    price_min_k: '0', price_max_k: '0', price_checked_on: '', tone: 'teal',
    blurb_vi: own?.vi ?? t.vi(where, catholic), blurb_en: own?.en ?? t.en(where, catholic),
    etiquette_vi: t.etiquette?.vi ?? '', etiquette_en: t.etiquette?.en ?? '',
    sources: [link, SRC].join('; '),
    review_notes: notes.join(' '),
  })
  ids.add(id)
  added++
  if (draft) drafts++
}
writeCsv(join(SHEETS, 'places.csv'), cols, rows)
writeCsv(join(SHEETS, 'to_add_manually.csv'), ['area', 'name_vi', 'note', 'lat', 'lng'], manual)
console.log(`places.csv: +${added} heritage sites (${added - drafts} approved, ${drafts} draft)`)
