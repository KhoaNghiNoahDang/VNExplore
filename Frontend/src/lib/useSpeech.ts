import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '../types'
import { collapseRepeats, mergeTranscript } from './transcript'

// The Web Speech API is not in TypeScript's DOM lib yet.
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: (e: { resultIndex?: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void
  onend: () => void
  onerror: (e: { error: string }) => void
  start: () => void
  stop: () => void
  abort: () => void
}
type RecognitionCtor = new () => Recognition

const Ctor: RecognitionCtor | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as Record<string, RecognitionCtor | undefined>).SpeechRecognition ??
      (window as unknown as Record<string, RecognitionCtor | undefined>).webkitSpeechRecognition)

/** iPhone / iPad (iPadOS reports itself as a Mac with touch). */
export const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1))

/**
 * blocked      – the person refused the microphone
 * unsupported  – the browser has the API but can't use it here (iOS with Dictation off, in-app browsers,
 *                Brave, some privacy browsers) → we hide the mic and point to the keyboard's own mic
 * network      – the recognition service needs internet
 * noMic        – no microphone found
 * no-speech    – nothing heard
 * failed       – anything else
 */
export type SpeechError = 'blocked' | 'unsupported' | 'network' | 'noMic' | 'no-speech' | 'failed'

function toError(code: string): SpeechError | null {
  switch (code) {
    case 'aborted':
      return null // we stopped it ourselves
    case 'not-allowed':
      return 'blocked'
    case 'service-not-allowed':
    case 'language-not-supported':
      return 'unsupported'
    case 'network':
      return 'network'
    case 'audio-capture':
      return 'noMic'
    case 'no-speech':
      return 'no-speech'
    default:
      return 'failed'
  }
}

/**
 * Voice input: keeps listening until `stop()` (or the browser gives up — iOS stops after a pause),
 * and appends what was said to the text typed before recording started. Tapping the mic again
 * continues from the current text.
 */
export function useSpeech(lang: Lang, text: string, onText: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<SpeechError | null>(null)
  // After an "unsupported" answer the mic button is hidden for this visit (it would only fail again).
  const [broken, setBroken] = useState(false)
  const rec = useRef<Recognition | null>(null)

  const stop = useCallback(() => rec.current?.stop(), [])

  const start = useCallback(() => {
    if (!Ctor || broken) return
    rec.current?.abort() // never two at once (InvalidStateError)
    const base = text.trim()
    const r = new Ctor()
    // Listen in Vietnamese unless the app is in English AND the phone isn't set up for Vietnamese
    // (a Vietnamese speaker with the app in English still gets Vietnamese recognition).
    const phoneVi = typeof navigator !== 'undefined' && (navigator.languages ?? [navigator.language]).some((l) => l?.toLowerCase().startsWith('vi'))
    r.lang = lang === 'vi' || phoneVi ? 'vi-VN' : 'en-US'
    r.interimResults = true
    r.continuous = true

    // Finished phrases are kept; the phrase still being spoken is shown but replaced on each update.
    // Pieces are merged without repeats (Chrome on Android and Safari resend earlier text with each result).
    let finalText = ''
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        const res = e.results[i]
        const piece = res[0]?.transcript?.trim() ?? ''
        if (!piece) continue
        if (res.isFinal) finalText = mergeTranscript(finalText, piece)
        else interim = mergeTranscript(interim, piece)
      }
      const said = collapseRepeats(mergeTranscript(finalText, interim))
      onText(base && said ? `${base} ${said}` : base || said)
    }
    r.onend = () => {
      setListening(false)
      if (rec.current === r) rec.current = null
    }
    r.onerror = (e) => {
      const err = toError(e.error)
      if (!err) return
      setError(err)
      if (err === 'unsupported') setBroken(true)
    }
    rec.current = r
    setError(null)
    try {
      r.start() // must run inside the tap (iOS refuses otherwise) — it does: called from onClick
      setListening(true)
    } catch {
      setError('failed')
    }
  }, [lang, text, onText, broken])

  const toggle = useCallback(() => (listening ? stop() : start()), [listening, start, stop])

  // Stop the microphone when leaving the page or switching to another app.
  useEffect(() => {
    const hide = () => document.visibilityState === 'hidden' && rec.current?.stop()
    document.addEventListener('visibilitychange', hide)
    return () => {
      document.removeEventListener('visibilitychange', hide)
      rec.current?.abort()
    }
  }, [])

  return { supported: !!Ctor && !broken, listening, error, start, stop, toggle, isIOS }
}
