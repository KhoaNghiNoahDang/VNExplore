import type { Understood } from './backend'
import type { Area, Intent, Theme, Transport } from '../types'

const THEME_WORDS: Record<Theme, string[]> = {
  culture: ['culture', 'cultural', 'temple', 'heritage', 'tradition', 'văn hóa', 'văn hoá', 'đền', 'chùa', 'di sản'],
  food: ['food', 'eat', 'coffee', 'street food', 'alley', 'ăn', 'món', 'cà phê', 'ẩm thực', 'hẻm', 'ngõ',
    'phở', 'pho', 'bún', 'bánh mì', 'banh mi', 'bánh cuốn', 'xôi', 'kem', 'ốc', 'chả cá', 'nem', 'miến', 'cháo', 'chè', 'trà chanh', 'sữa', 'noodle', 'noodles', 'snack', 'dessert', 'ice cream'],
  rainy: ['rain', 'rainy', 'indoor', 'mưa', 'trong nhà'],
  history: ['history', 'historic', 'museum', 'story', 'stories', 'lịch sử', 'bảo tàng', 'câu chuyện'],
  fun: ['fun', 'play', 'games', 'sport', 'sports', 'swim', 'swimming', 'pool', 'football', 'kids', 'vui chơi', 'giải trí', 'thể thao', 'bơi', 'bể bơi', 'sân bóng', 'đá bóng', 'trẻ con', 'trẻ em'],
  photo: ['photo', 'picture', 'instagram', 'sunset', 'chụp', 'ảnh', 'check-in', 'hoàng hôn'],
}

/** Checked in this order: the more specific words first. */
const TRANSPORT_WORDS: [Transport, string[]][] = [
  ['grabbike', ['grabbike', 'grab bike', 'xe ôm', 'bike taxi', 'motorbike taxi', 'be bike', 'xanh sm bike']],
  ['car', ['taxi', 'grabcar', 'grab car', 'car', 'ô tô', 'oto', 'xe hơi', 'xe 4 chỗ', 'xe 7 chỗ', 'xanh sm']],
  ['motorbike', ['motorbike', 'motorcycle', 'scooter', 'moped', 'xe máy', 'xe tay ga', 'tự lái']],
  ['walk', ['walk', 'walking', 'on foot', 'đi bộ', 'đi dạo', 'cuốc bộ']],
]

const AREA_WORDS: [Area, string[]][] = [
  ['ba-vi', ['ba vì', 'ba vi', 'bavi', 'sơn tây', 'son tay', 'đường lâm', 'duong lam', 'suối hai', 'đồng mô', 'dong mo', 'núi tản']],
  ['hoan-kiem', ['hoàn kiếm', 'hoan kiem', 'hồ gươm', 'ho guom', 'phố cổ', 'pho co', 'old quarter', 'sword lake']],
]

const BUDGET_WORDS = ['budget', 'cheap', 'reasonable', 'affordable', 'low cost', 'save', 'rẻ', 'tiết kiệm', 'hợp lý', 'bình dân']

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  một: 1, hai: 2, ba: 3, bốn: 4, năm: 5, sáu: 6, bảy: 7, tám: 8, chín: 9, mười: 10,
}

const DEFAULT_HOURS = 2

/** Whole-word match, so "ăn" (eat) doesn't match inside "văn hoá" (culture). */
function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{M}])${escaped}(?![\\p{L}\\p{M}])`, 'u').test(text)
}

function toNumber(raw: string): number | null {
  const n = Number(raw.replace(',', '.'))
  if (!Number.isNaN(n)) return n
  return NUMBER_WORDS[raw] ?? null
}

/**
 * Rule-based reading of the one-sentence request.
 * Placeholder until the backend does proper language understanding.
 */
export function parseIntent(text: string): Intent {
  const t = text.toLowerCase().normalize('NFC')

  const themes = (Object.keys(THEME_WORDS) as Theme[]).filter((theme) =>
    THEME_WORDS[theme].some((w) => hasWord(t, w)),
  )

  let people = 1
  const peopleMatch = t.match(/(\d+|[a-zà-ỹ]+)\s*(people|persons|person|pax|friends|of us|người|bạn)/u)
  if (peopleMatch) people = toNumber(peopleMatch[1]) ?? 1
  else if (/\b(we|us|couple)\b|chúng (tôi|mình)/.test(t)) people = 2
  people = Math.min(Math.max(Math.round(people), 1), 30)

  let hours = DEFAULT_HOURS
  let hoursIsDefault = true
  // First "<number> hours" that really is a number ("lịch", "ảnh" end in h but aren't hours).
  for (const m of t.matchAll(/(?<![\p{L}\p{M}])(\d+(?:[.,]\d+)?|[a-zà-ỹ]+)\s*(hours?|hrs?|h|tiếng|giờ)(?![\p{L}\p{M}])/gu)) {
    const h = toNumber(m[1])
    if (h) {
      hours = Math.min(Math.max(h, 0.5), 10)
      hoursIsDefault = false
      break
    }
  }

  // "all day" / "cả ngày" / "half a day"
  if (hoursIsDefault) {
    if (/cả ngày|nguyên ngày|all day|full day|whole day/u.test(t)) (hours = 8), (hoursIsDefault = false)
    else if (/nửa ngày|half a day|half day|buổi sáng|buổi chiều|sáng nay|chiều nay|morning|afternoon/u.test(t)) (hours = 4), (hoursIsDefault = false)
  }

  const budget = BUDGET_WORDS.some((w) => hasWord(t, w)) ? 'low' : 'any'

  let transport: Transport = 'walk'
  let transportIsDefault = true
  const found = TRANSPORT_WORDS.find(([, words]) => words.some((w) => hasWord(t, w)))
  if (found) {
    transport = found[0]
    transportIsDefault = false
  } else if (hasWord(t, 'grab')) {
    // Plain "Grab": a bike for one person, a car for a group.
    transport = people > 1 ? 'car' : 'grabbike'
    transportIsDefault = false
  }

  const area = AREA_WORDS.find(([, words]) => words.some((w) => hasWord(t, w)))?.[0] ?? null
  // Ba Vì spots are kilometres apart: default to a motorbike and a longer day.
  if (area === 'ba-vi') {
    if (transportIsDefault) transport = 'motorbike'
    if (hoursIsDefault) hours = 5
  }

  return {
    text,
    area,
    themes: themes.length ? themes : ['culture'],
    people,
    budget,
    hours,
    hoursIsDefault,
    transport,
    transportIsDefault,
  }
}

/**
 * Combine the rule-based reading with the language model's. The model wins where it found something;
 * the rules fill the gaps. Same Ba Vì defaults as parseIntent.
 */
export function mergeUnderstood(rule: Intent, u: Understood | null): Intent {
  if (!u) return rule
  const out: Intent = { ...rule }
  if (u.area) out.area = u.area
  if (u.themes.length) out.themes = u.themes as Theme[]
  if (u.people) out.people = u.people
  if (u.hours) (out.hours = u.hours), (out.hoursIsDefault = false)
  if (u.transport) (out.transport = u.transport), (out.transportIsDefault = false)
  if (u.budget === 'low') out.budget = 'low'
  if (u.kids && !out.themes.includes('fun')) out.themes = [...out.themes, 'fun']
  if (u.dishes.length) out.extra = u.dishes.join(', ')
  if (out.area === 'ba-vi') {
    if (out.transportIsDefault) out.transport = 'motorbike'
    if (out.hoursIsDefault) out.hours = 5
  }
  out.summary = u.summary_vi || u.summary_en ? { vi: u.summary_vi || u.summary_en, en: u.summary_en || u.summary_vi } : null
  out.reply = u.reply_vi || u.reply_en ? { vi: u.reply_vi || u.reply_en, en: u.reply_en || u.reply_vi } : null
  return out
}

/** Ba Vì spots are kilometres apart: unless the traveller said otherwise, ride and plan a longer day. */
export function withAreaDefaults(intent: Intent, area: Area): Intent {
  if (area !== 'ba-vi') return intent
  return {
    ...intent,
    transport: intent.transportIsDefault ? 'motorbike' : intent.transport,
    hours: intent.hoursIsDefault ? 5 : intent.hours,
  }
}
