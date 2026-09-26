import { useCallback, useRef, useState } from 'react'
import type { Lang } from '../types'

// The Web Speech API is not in TypeScript's DOM lib yet.
type Recognition = {
  lang: string
  interimResults: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onend: () => void
  onerror: () => void
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => Recognition

const Ctor: RecognitionCtor | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as Record<string, RecognitionCtor | undefined>).SpeechRecognition ??
      (window as unknown as Record<string, RecognitionCtor | undefined>).webkitSpeechRecognition)

export function useSpeech(lang: Lang, onText: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const rec = useRef<Recognition | null>(null)

  const toggle = useCallback(() => {
    if (!Ctor) return
    if (listening) {
      rec.current?.stop()
      return
    }
    const r = new Ctor()
    r.lang = lang === 'vi' ? 'vi-VN' : 'en-US'
    r.interimResults = true
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join('')
      onText(text)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    rec.current = r
    r.start()
    setListening(true)
  }, [lang, listening, onText])

  return { supported: !!Ctor, listening, toggle }
}
