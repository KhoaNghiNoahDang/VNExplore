import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * "Keep me signed in on this device": on (the default), the session lives in localStorage and
 * survives closing the browser; off, it lives in sessionStorage and ends with the tab/browser.
 */
const REMEMBER_KEY = 'vx:remember-me'
const safe = <T,>(f: () => T, fallback: T): T => {
  try {
    return f()
  } catch {
    return fallback
  }
}
export const rememberMe = () => safe(() => localStorage.getItem(REMEMBER_KEY) !== '0', true)
export function setRememberMe(on: boolean) {
  safe(() => (on ? localStorage.removeItem(REMEMBER_KEY) : localStorage.setItem(REMEMBER_KEY, '0')), undefined)
}
const authStorage = {
  getItem: (k: string) => safe(() => sessionStorage.getItem(k) ?? localStorage.getItem(k), null),
  setItem: (k: string, v: string) =>
    safe(() => {
      const [keep, drop] = rememberMe() ? [localStorage, sessionStorage] : [sessionStorage, localStorage]
      keep.setItem(k, v)
      drop.removeItem(k)
    }, undefined),
  removeItem: (k: string) =>
    safe(() => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    }, undefined),
}

/**
 * Supabase client (null when env vars are missing — the app then runs on bundled data,
 * and account features are hidden). Both values are public; RLS protects the data.
 */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true, storage: authStorage } }) : null

/**
 * Offer to save the email + password in the browser's password manager (Chrome, Edge, Samsung
 * Internet, Android). Safari / iOS offer it by themselves from the form's autocomplete fields.
 */
export async function offerToSavePassword(id: string, password: string, name?: string) {
  const W = window as unknown as { PasswordCredential?: new (d: { id: string; password: string; name?: string }) => Credential }
  if (!W.PasswordCredential || !navigator.credentials?.store) return
  try {
    await navigator.credentials.store(new W.PasswordCredential({ id, password, name }))
  } catch {
    /* the user said no, or the browser doesn't allow it here */
  }
}

export const GOOGLE_AUTH = import.meta.env.VITE_GOOGLE_AUTH === 'true'
