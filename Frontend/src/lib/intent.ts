import type { Intent, Theme, Transport } from '../types'

const THEME_WORDS: Record<Theme, string[]> = {
  culture: ['culture', 'cultural', 'temple', 'heritage', 'tradition', 'văn hóa', 'văn hoá', 'đền', 'chùa', 'di sản'],
  food: ['food', 'eat', 'coffee', 'street food', 'alley', 'ăn', 'món', 'cà phê', 'ẩm thực', 'hẻm', 'ngõ'],
  rainy: ['rain', 'rainy', 'indoor', 'mưa', 'trong nhà'],
  history: ['history', 'historic', 'museum', 'story', 'stories', 'lịch sử', 'bảo tàng', 'câu chuyện'],
  photo: ['photo', 'picture', 'instagram', 'sunset', 'chụp', 'ảnh', 'check-in', 'hoàng hôn'],
}

/** Checked in this order: the more specific words first. */
const TRANSPORT_WORDS: [Transport, string[]][] = [
  ['grabbike', ['grabbike', 'grab bike', 'xe ôm', 'bike taxi', 'motorbike taxi', 'be bike', 'xanh sm bike']],
  ['car', ['taxi', 'grabcar', 'grab car', 'car', 'ô tô', 'oto', 'xe hơi', 'xe 4 chỗ', 'xe 7 chỗ', 'xanh sm']],
  ['motorbike', ['motorbike', 'motorcycle', 'scooter', 'moped', 'xe máy', 'xe tay ga', 'tự lái']],
  ['walk', ['walk', 'walking', 'on foot', 'đi bộ', 'đi dạo', 'cuốc bộ']],
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
  const hoursMatch = t.match(/(\d+(?:[.,]\d+)?|[a-zà-ỹ]+)\s*(hours?|hrs?|h\b|tiếng|giờ)/u)
  if (hoursMatch) {
    const h = toNumber(hoursMatch[1])
    if (h) {
      hours = Math.min(Math.max(h, 0.5), 10)
      hoursIsDefault = false
    }
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

  return {
    text,
    themes: themes.length ? themes : ['culture'],
    people,
    budget,
    hours,
    hoursIsDefault,
    transport,
    transportIsDefault,
  }
}
