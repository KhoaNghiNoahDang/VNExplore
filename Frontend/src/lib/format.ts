import type { Lang } from '../types'

/** 30 → "30k", 1500 → "1.5M" (values are thousand VND). */
export function money(k: number): string {
  if (k >= 1000) return `${(k / 1000).toFixed(k % 1000 === 0 ? 0 : 1)}M`
  return `${Math.round(k)}k`
}

export function moneyRange(min: number, max: number, lang: Lang): string {
  if (max === 0) return lang === 'vi' ? 'Miễn phí' : 'Free'
  if (min === max) return `≈ ${money(min)}`
  return `≈ ${money(min)}–${money(max)}`
}

/** 45 → "45 min" / "45 phút" */
export function minutes(min: number, lang: Lang = 'en'): string {
  return `${Math.round(min)} ${lang === 'vi' ? 'phút' : 'min'}`
}

/** 115 → "1h55", 45 → "45 min" */
export function duration(min: number, lang: Lang = 'en'): string {
  if (min < 60) return minutes(min, lang)
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export function distance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`
}
