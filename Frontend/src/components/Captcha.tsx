import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Cloudflare Turnstile, for Supabase's CAPTCHA protection (Auth → Attack Protection).
 * Off unless VITE_TURNSTILE_SITE_KEY is set: then every sign-in, sign-up, password reset and guest
 * sign-in sends a token. Once CAPTCHA is on in Supabase, ALL of those need one — so set the site
 * key here first, then turn it on there.
 * Mostly invisible ("interaction-only"): a checkbox appears only when Cloudflare isn't sure.
 */
export const CAPTCHA_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || ''

interface Turnstile {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

let loading: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new Error('turnstile'))
    }
    document.head.appendChild(s)
  })
  return loading
}

/**
 * `{ token, widget, reset, ready }`. Put `widget` in the form; pass `token` to the auth call;
 * call `reset()` after each attempt (a token works once). Without a site key: token is undefined,
 * widget is null and `ready` is always true.
 */
export function useCaptcha(lang: 'vi' | 'en') {
  const [token, setToken] = useState<string | undefined>(undefined)
  const ref = useRef<HTMLDivElement>(null)
  const id = useRef<string | null>(null)

  useEffect(() => {
    if (!CAPTCHA_SITE_KEY || !ref.current) return
    let alive = true
    loadScript()
      .then(() => {
        if (!alive || !ref.current || !window.turnstile) return
        id.current = window.turnstile.render(ref.current, {
          sitekey: CAPTCHA_SITE_KEY,
          appearance: 'interaction-only',
          language: lang,
          callback: (t: string) => setToken(t),
          'expired-callback': () => setToken(undefined),
          'error-callback': () => setToken(undefined),
        })
      })
      .catch(() => {
        /* blocked or offline: the auth call will say why */
      })
    return () => {
      alive = false
      if (id.current && window.turnstile) window.turnstile.remove(id.current)
      id.current = null
    }
  }, [lang])

  const reset = useCallback(() => {
    setToken(undefined)
    if (id.current && window.turnstile) window.turnstile.reset(id.current)
  }, [])

  return {
    token,
    ready: !CAPTCHA_SITE_KEY || !!token,
    reset,
    widget: CAPTCHA_SITE_KEY ? <div ref={ref} className="flex justify-center empty:hidden" /> : null,
  }
}
