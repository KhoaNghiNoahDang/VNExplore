import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '../types'

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined

/**
 * Narration via the browser's text-to-speech.
 * Placeholder until real recorded audio files come from the backend.
 */
export function useNarration() {
  const [speaking, setSpeaking] = useState(false)

  const stop = useCallback(() => {
    synth?.cancel()
    setSpeaking(false)
  }, [])

  const play = useCallback((text: string, lang: Lang) => {
    if (!synth) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'vi' ? 'vi-VN' : 'en-US'
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang))
    if (voice) u.voice = voice
    u.rate = 0.95
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    synth.speak(u)
    setSpeaking(true)
  }, [])

  // Stop talking when leaving the page.
  useEffect(() => () => synth?.cancel(), [])

  return { supported: !!synth, speaking, play, stop }
}
