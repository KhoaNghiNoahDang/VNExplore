import { hanoiClock } from './hanoiTime'

/**
 * Just enough of OpenStreetMap's `opening_hours` syntax for the values in our data:
 *   "Mo-Su 06:00-22:00", "Mo-Sa 07:00-19:00, Su 07:00-17:00", "Mo-Fr 06:00-14:00; Sa 08:00-12:00",
 *   "06:00-13:30, 15:00-23:00", "24/7", "18:00-02:00" (past midnight).
 * Anything we can't read returns null = "unknown" (treated as open — never hide a place by mistake).
 */
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface Rule {
  days: Set<number>
  ranges: [number, number][] // minutes from midnight; end may be > 1440 (past midnight)
}

function parseDays(spec: string): Set<number> | null {
  const out = new Set<number>()
  for (const part of spec.split(',')) {
    const [a, b] = part.trim().split('-')
    const i = DAYS.indexOf(a)
    const j = b ? DAYS.indexOf(b) : i
    if (i < 0 || j < 0) return null
    for (let k = i; ; k = (k + 1) % 7) {
      out.add(k)
      if (k === j) break
    }
  }
  return out
}

const toMin = (h: string, m: string) => Number(h) * 60 + Number(m)

function parse(value: string): Rule[] | null {
  const v = value.trim()
  if (v === '24/7') return [{ days: new Set([0, 1, 2, 3, 4, 5, 6]), ranges: [[0, 1440]] }]
  const rules: Rule[] = []
  let days = new Set([0, 1, 2, 3, 4, 5, 6])
  for (const raw of v.split(/[;,]/)) {
    let token = raw.trim()
    if (!token) continue
    const dayMatch = token.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*[-,]\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))*)\s+/)
    if (dayMatch) {
      const d = parseDays(dayMatch[1].replace(/\s/g, ''))
      if (!d) return null
      days = d
      token = token.slice(dayMatch[0].length)
    }
    const t = token.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
    if (!t) return null
    let start = toMin(t[1], t[2])
    let end = toMin(t[3], t[4])
    if (end <= start) end += 1440 // e.g. 18:00-02:00
    if (start >= 1440) start -= 1440
    rules.push({ days: new Set(days), ranges: [[start, end]] })
  }
  return rules.length ? rules : null
}

const cache = new Map<string, Rule[] | null>()

/** true / false, or null when unknown. */
export function isOpenAt(value: string | null | undefined, at: Date): boolean | null {
  if (!value) return null
  if (!cache.has(value)) cache.set(value, parse(value))
  const rules = cache.get(value)
  if (!rules) return null
  const { day, hour, minute } = hanoiClock(at)
  const min = hour * 60 + minute
  const yesterday = (day + 6) % 7
  return rules.some(
    (r) =>
      (r.days.has(day) && r.ranges.some(([a, b]) => min >= a && min < b)) ||
      // a range that started yesterday and runs past midnight
      (r.days.has(yesterday) && r.ranges.some(([a, b]) => b > 1440 && min + 1440 >= a && min + 1440 < b)),
  )
}

/** Compact, human-readable form of the common OSM day tokens used by our data. */
export function formatOpeningHours(value: string | null | undefined, lang: 'vi' | 'en'): string {
  if (!value) return ''
  if (value.trim() === '24/7') return lang === 'vi' ? 'Mở cửa 24 giờ' : 'Open 24 hours'
  const names =
    lang === 'vi'
      ? { Mo: 'T2', Tu: 'T3', We: 'T4', Th: 'T5', Fr: 'T6', Sa: 'T7', Su: 'CN' }
      : { Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri', Sa: 'Sat', Su: 'Sun' }
  return value
    .replace(/Mo|Tu|We|Th|Fr|Sa|Su/g, (day) => names[day as keyof typeof names])
    .replace(/\s*;\s*/g, ' · ')
}
