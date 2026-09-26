import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '../types'

// The Web Speech API is not in TypeScript's DOM lib yet.
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
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

export type SpeechError = 'blocked' | 'no-speech' | 'failed'

/**
 * Voice input: keeps listening until `stop()` (or the browser gives up),
 * and appends what was said to the text typed before recording started.
 */
export function useSpeech(lang: Lang, text: string, onText: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<SpeechError | null>(null)
  const rec = useRef<Recognition | null>(null)

  const stop = useCallback(() => rec.current?.stop(), [])

  const start = useCallback(() => {
    if (!Ctor) return
    const base = text.trim()
    const r = new Ctor()
    r.lang = lang === 'vi' ? 'vi-VN' : 'en-US'
    r.interimResults = true
    r.continuous = true
    r.onresult = (e) => {
      const said = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join('')
        .trim()
      onText(base && said ? `${base} ${said}` : base || said)
    }
    r.onend = () => {
      setListening(false)
      rec.current = null
    }
    r.onerror = (e) => {
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'blocked' : e.error === 'no-speech' ? 'no-speech' : 'failed')
    }
    rec.current = r
    setError(null)
    try {
      r.start()
      setListening(true)
    } catch {
      setError('failed')
    }
  }, [lang, text, onText])

  const toggle = useCallback(() => (listening ? stop() : start()), [listening, start, stop])

  // Stop the microphone when leaving the page.
  useEffect(() => () => rec.current?.abort(), [])

  return { supported: !!Ctor, listening, error, start, stop, toggle }
}
