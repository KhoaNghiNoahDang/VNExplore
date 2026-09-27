/**
 * Clean up speech-recognition text. Browsers (Chrome on Android, Safari on iOS) often send each new
 * result with everything said before it, sometimes with earlier words re-spelled ("bà vì" → "Ba Vì").
 * Joining them naively gives "đi bà vì đi Ba Vì chụp ảnh". These helpers join pieces without repeats.
 */

/** Compare words loosely: no case, punctuation or Vietnamese tone marks ("Bà," ~ "ba"). */
const fold = (w: string) =>
  w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[.,!?;:…"“”'’()\-]/g, '')

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean)

/**
 * Two word runs are "the same" when they fold to the same words, allowing one different word per
 * four (the recogniser re-guessing a word). Runs of one or two words must match exactly (folded).
 */
function similar(a: string[], b: string[]): boolean {
  if (a.length !== b.length || !a.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) if (fold(a[i]) !== fold(b[i])) diff++
  return a.length <= 2 ? diff === 0 : diff <= Math.floor(a.length / 4) && diff < a.length / 2
}

/**
 * Join `next` onto `prev` (both from the same recording):
 *  - next restates all of prev (cumulative result, maybe re-spelled) → next (newer, corrected)
 *  - next is a shorter restatement of prev's start → prev
 *  - the end of prev overlaps the start of next → join once, keeping next's spelling of the overlap
 *  - otherwise → prev + next
 */
export function mergeTranscript(prev: string, next: string): string {
  const a = words(prev)
  const b = words(next)
  if (!a.length) return b.join(' ')
  if (!b.length) return a.join(' ')
  if (b.length >= a.length && similar(b.slice(0, a.length), a)) return b.join(' ')
  if (b.length < a.length && similar(a.slice(0, b.length), b)) return a.join(' ')
  for (let k = Math.min(a.length, b.length); k > 0; k--) {
    if (similar(a.slice(a.length - k), b.slice(0, k))) return [...a.slice(0, a.length - k), ...b].join(' ')
  }
  return [...a, ...b].join(' ')
}

/**
 * Remove a phrase (2+ words) repeated straight after itself: "ăn phở ăn phở rồi" → "ăn phở rồi".
 * Single repeated words are kept on purpose ("rất rất ngon" is how people talk).
 */
export function collapseRepeats(text: string): string {
  let w = words(text)
  let changed = true
  while (changed) {
    changed = false
    for (let n = Math.floor(w.length / 2); n >= 2 && !changed; n--) {
      for (let i = 0; i + 2 * n <= w.length; i++) {
        if (similar(w.slice(i, i + n), w.slice(i + n, i + 2 * n))) {
          // keep the second copy: it is the recogniser's later (corrected) guess
          w = [...w.slice(0, i), ...w.slice(i + n)]
          changed = true
          break
        }
      }
    }
  }
  return w.join(' ')
}
