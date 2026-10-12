/**
 * One-off import (2026-10-10) of Hanoi restaurants, eateries, tea / bubble-tea shops, and places to
 * play (cinemas, arcades, kids' play centres, bowling, escape rooms, aquariums, parks, photobooths)
 * from Overture Maps Places (release 2026-09-23, CDLA-Permissive-2.0), prepared in
 * Data/imports/overture_food_fun_2026-10.json.
 *
 * Is the place real? Food and drink (2,899): only places Overture is ≥ 90 % sure exist (≥ 85 % for
 * tea shops) AND that list a phone number or website, with a street address, inside Hanoi; names
 * that are an address, a company, a shop, a hotel/karaoke, another province, or a café (the app has
 * its own café list) are dropped; duplicates merged; places already in places.csv left out.
 * Places to play (84) were picked one by one: chain venues and those confirmed by a published
 * source are approved; the rest (mostly new photobooths, small escape rooms) are drafts.
 * Two wrong Overture positions were corrected (KidZania, Công viên Thống Nhất) — see the JSON.
 *
 * Text: the kind of place, read from the name or the Overture category ("Quán phở", "Nhà hàng
 * Nhật"…) and the district — nothing invented. Prices are estimates for that kind of place unless
 * a source is given; review_notes says which. Every row is tagged `openData`.
 *
 * Safe to run again: places already imported (same Overture map link) are skipped.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv, writeCsv } from './lib/csv.mjs'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHEETS = join(DATA, 'sheets')
const { food, fun } = JSON.parse(readFileSync(join(DATA, 'imports', 'overture_food_fun_2026-10.json'), 'utf8'))

const fold = (s) =>
  s.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim()
const slug = (s) => fold(s).replace(/ /g, '-').slice(0, 60).replace(/-+$/, '')
const ascii = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
const SRC = 'Overture Maps Places (2026-09-23)'
const EST = 'Giá là ước tính theo loại hình — kiểm tra trước khi đi.'

/** Places to play: [vi, en] intro, price estimate, visit, themes, tags, kind, tone. */
const FUN = {
  cinema: { vi: 'Rạp chiếu phim', en: 'A cinema', price: [60, 130], visit: 150, themes: 'fun; rainy', tags: 'indoor' },
  arcade: { vi: 'Khu trò chơi điện tử (game, gắp thú…)', en: 'An arcade (video games, claw machines…)', price: [50, 200], visit: 90, themes: 'fun; rainy', tags: 'indoor; groups' },
  kids: { vi: 'Khu vui chơi trẻ em', en: 'A children’s play centre', price: [100, 250], visit: 120, themes: 'fun; rainy', tags: 'indoor' },
  kidzania: { vi: 'Khu vui chơi trẻ em', en: 'A children’s play centre', price: [200, 450], visit: 180, themes: 'fun; rainy', tags: 'indoor' },
  bowling: { vi: 'Sân bowling', en: 'A bowling alley', price: [40, 100], visit: 90, themes: 'fun; rainy', tags: 'indoor; groups' },
  escape: { vi: 'Phòng thoát hiểm (escape room): cả nhóm giải đố để tìm đường ra', en: 'An escape room: solve puzzles as a team to get out', price: [120, 200], visit: 90, themes: 'fun; rainy', tags: 'indoor; groups' },
  aquarium: { vi: 'Thủy cung', en: 'An aquarium', price: [150, 300], visit: 90, themes: 'fun; rainy', tags: 'indoor' },
  waterpark: { vi: 'Công viên nước', en: 'A water park', price: [100, 200], visit: 180, themes: 'fun', tags: 'groups' },
  amusement: { vi: 'Công viên giải trí', en: 'An amusement park', price: [100, 300], visit: 180, themes: 'fun', tags: 'groups' },
  park: { vi: 'Công viên', en: 'A park', price: [0, 0], visit: 60, themes: 'fun; photo', tags: 'free', kind: 'sight', tone: 'teal' },
  zoo: { vi: 'Vườn thú', en: 'A zoo', price: [20, 60], visit: 120, themes: 'fun', tags: 'groups' },
  minigolf: { vi: 'Sân golf mini', en: 'A mini-golf course', price: [100, 300], visit: 60, themes: 'fun', tags: 'groups' },
  photobooth: { vi: 'Tiệm chụp ảnh tự phục vụ (photobooth)', en: 'A self-service photo booth studio', price: [50, 120], visit: 30, themes: 'fun; photo; rainy', tags: 'photo; indoor' },
  foto: { vi: 'Tiệm chụp ảnh tự phục vụ (photobooth)', en: 'A self-service photo booth studio', price: [50, 120], visit: 30, themes: 'fun; photo; rainy', tags: 'photo; indoor' },
}
/** Facts from a published source (the source link is added to the row). */
const OWN = {
  'KidZania Hà Nội': {
    vi: 'Thành phố hướng nghiệp thu nhỏ cho trẻ em: các bé đóng vai bác sĩ, lính cứu hoả, phi công… Ở tầng 5 Lotte Mall West Lake.',
    en: 'A child-sized city where kids role-play jobs – doctor, firefighter, pilot… On the 5th floor of Lotte Mall West Lake.',
  },
  'Foto.Flicker Photobooth': {
    vi: 'Tiệm photobooth nhỏ trên phố Âu Triệu, ảnh giả lập màu phim hoài cổ; do một nhóm bạn trẻ mở từ 12/2024.',
    en: 'A small photo booth studio on Âu Triệu street with retro film-look prints, opened by a group of young friends in Dec 2024.',
  },
  'Genesis Escape': { price: [100, 150], note: 'Giá, giờ (10:00–23:00) theo bài của Vietnam Airlines.', hours: '10:00-23:00' },
  'Seen Escape Rooms': { price: [159, 179], note: 'Giá, giờ (9:00–23:00) theo bài của Vietnam Airlines.', hours: '09:00-23:00' },
  'Dream Games Bowling (Aeon Mall Long Biên)': { price: [35, 60], note: 'Giá 35.000–60.000đ/người/10 lượt ném tuỳ khung giờ (nguồn vinpearl.com).' },
}

const rows = readCsv(join(SHEETS, 'places.csv'))
const cols = Object.keys(rows[0]).filter((k) => k !== '__line')
const ids = new Set(rows.map((r) => r.id))
const seen = new Set(rows.flatMap((r) => (r.sources || '').split('; ').filter((x) => x.startsWith('https://explore.overturemaps.org/'))))

const phoneOf = (p) => {
  const d = (p ?? '').replace(/[\s.\-()]/g, '')
  return /^\+?\d{8,13}$/.test(d) ? d : ''
}
const newId = (name, district, overtureId) => {
  // Names in Korean / Chinese script fold to nothing: fall back to the Overture id.
  const base = slug(name) || `place-${overtureId.slice(0, 8)}`
  let id = base
  if (ids.has(id) && district) id = `${id}-${slug(district)}`
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`
  ids.add(id)
  return id
}
const where = (d) => ({ vi: d ? ` ở ${d}, Hà Nội` : ' ở Hà Nội', en: d ? ` in ${ascii(d)}, Hanoi` : ' in Hanoi' })

let addedFood = 0, addedFun = 0, drafts = 0
for (const f of food) {
  const link = `https://explore.overturemaps.org/#17/${f.lat}/${f.lng}`
  if (seen.has(link)) continue
  const w = where(f.district)
  const tea = /trà|kem|bánh|nước ép/i.test(f.label_vi)
  rows.push({
    id: newId(f.name, f.district, f.overture_id), status: 'approved', area: f.district ? slug(f.district) : 'hanoi', kind: 'food', depth: 'quick',
    name_vi: f.name, name_en: '', name_vi_short: '', lat: String(f.lat), lng: String(f.lng), address: f.address,
    opening_hours: '', themes: 'food', tags: f.local ? 'localFood; openData' : 'openData',
    visit_min: tea ? '30' : '60', price_min_k: String(f.price_min_k), price_max_k: String(f.price_max_k), price_checked_on: '', tone: 'butter',
    blurb_vi: `${f.label_vi}${w.vi}.`, blurb_en: `${f.label_en}${w.en}.`,
    sources: [link, SRC].join('; '), phone: phoneOf(f.phone),
    review_notes: [`Nhập 2026-10-10 từ ${SRC}, CDLA-Permissive-2.0; tên gốc: “${f.source_name}”, độ tin cậy ${f.confidence}, có số điện thoại/website.`, EST, 'Chưa xác minh tại chỗ: giờ mở cửa, quán còn hoạt động.'].join(' '),
  })
  seen.add(link)
  addedFood++
}
for (const f of fun) {
  const link = `https://explore.overturemaps.org/#17/${f.lat}/${f.lng}`
  if (seen.has(link)) continue
  const t = FUN[f.type]
  const own = OWN[f.name] ?? {}
  const w = where(f.district)
  const price = own.price ?? t.price
  rows.push({
    id: newId(f.name, f.district, f.overture_id), status: f.approved ? 'approved' : 'draft', area: f.district ? slug(f.district) : 'hanoi',
    kind: t.kind ?? 'fun', depth: 'quick', name_vi: f.name, name_en: '', name_vi_short: '', lat: String(f.lat), lng: String(f.lng),
    address: f.address ?? '', opening_hours: own.hours ?? '', themes: t.themes, tags: `${t.tags}; openData`, visit_min: String(t.visit),
    price_min_k: String(price[0]), price_max_k: String(price[1]), price_checked_on: own.price ? '2026-10-10' : '', tone: t.tone ?? 'leaf',
    blurb_vi: own.vi ?? `${t.vi}${w.vi}.`, blurb_en: own.en ?? `${t.en}${w.en}.`,
    sources: [link, SRC, f.extra_source].filter(Boolean).join('; '), phone: phoneOf(f.phone),
    review_notes: [
      `Nhập 2026-10-10 từ ${SRC}, CDLA-Permissive-2.0; tên gốc: “${f.source_name}”, độ tin cậy ${f.confidence}.`,
      f.approved ? 'Chọn tay: chuỗi lớn hoặc có nguồn xác nhận.' : 'Chưa xác nhận được qua nguồn nào — kiểm tra quán có thật, còn mở, đúng vị trí trước khi duyệt.',
      f.coord_note,
      own.note ?? (price[1] ? EST : 'Giá 0 là giả định (công viên công cộng).'),
      'Chưa xác minh tại chỗ: giờ mở cửa.',
    ].filter(Boolean).join(' '),
  })
  seen.add(link)
  addedFun++
  if (!f.approved) drafts++
}
writeCsv(join(SHEETS, 'places.csv'), cols, rows)
console.log(`places.csv: +${addedFood} food & drink, +${addedFun} places to play (${drafts} draft)`)
