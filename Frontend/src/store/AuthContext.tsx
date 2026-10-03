import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthCtx } from './authCtx'

export interface Profile {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
}

export type AuthError =
  | 'invalid_credentials'
  | 'username_taken'
  | 'account_exists'
  | 'weak_password'
  | 'email_not_confirmed'
  | 'confirm_email_sent'
  | 'unavailable'
  | 'guest_disabled'
  | 'captcha'
  | 'unknown'

export interface SignUpInput {
  displayName: string
  username: string
  /** Exactly one of email / phone. */
  email?: string
  phone?: string
  password: string
  captchaToken?: string
}

export interface AuthState {
  enabled: boolean
  loading: boolean
  session: Session | null
  profile: Profile | null
  /** captchaToken: required by Supabase once CAPTCHA protection is on (see components/Captcha). */
  signIn: (identifier: string, password: string, captchaToken?: string) => Promise<AuthError | null>
  signUp: (input: SignUpInput) => Promise<AuthError | null>
  signInWithGoogle: (next: string) => Promise<AuthError | null>
  sendPasswordReset: (email: string, captchaToken?: string) => Promise<AuthError | null>
  /** Signed in with a permanent account (not a guest): may publish and like quests. */
  isMember: boolean
  signOut: () => Promise<void>
  isUsernameFree: (username: string) => Promise<boolean>
  /** Signed in only with a name (group play): no email or password yet. */
  isGuest: boolean
  /** Group play: sign in with just a name (Supabase anonymous sign-in). */
  signInAsGuest: (displayName: string, captchaToken?: string) => Promise<AuthError | null>
  /**
   * Turn a guest into a real account, keeping the same user (so stamps, items and the party
   * stay theirs). Email + password; a username for @login.
   */
  upgradeGuest: (input: { email: string; password: string; username: string }) => Promise<AuthError | null>
  /** Turn a guest into a Google account (needs manual identity linking enabled in Supabase). */
  linkGoogle: (next: string) => Promise<AuthError | null>
}

// ------------------------------------------------------------ identifiers
export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/
/** Vietnamese mobile numbers: 0xxxxxxxxx or +84xxxxxxxxx (03/05/07/08/09). */
const PHONE_RE = /^(?:\+?84|0)([35789]\d{8})$/

export function normalizePhone(raw: string): string | null {
  const m = raw.replace(/[\s.-]/g, '').match(PHONE_RE)
  return m ? `84${m[1]}` : null
}

/**
 * ⚠ DEMO: phone numbers are not verified (no SMS provider yet). A phone account is stored as an
 * internal email that nobody receives; the number itself goes in user metadata with
 * phone_verified=false. Switch to real SMS OTP before a public launch.
 */
export const PHONE_VERIFY: 'fake' | 'sms' = 'fake'
const phoneEmail = (normalized: string) => `${normalized}@phone.vnexplore.invalid`

function mapError(message: string | undefined): AuthError {
  const m = (message ?? '').toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid_credentials')) return 'invalid_credentials'
  if (m.includes('already registered') || m.includes('already exists')) return 'account_exists'
  if (m.includes('password')) return 'weak_password'
  if (m.includes('not confirmed')) return 'email_not_confirmed'
  if (m.includes('database error')) return 'username_taken' // unique username clash in the trigger
  if (m.includes('captcha')) return 'captcha'
  return 'unknown'
}

// ------------------------------------------------------------ guest → existing account
const CLAIM_KEY = 'vnexplore:guestClaim'
function readClaim(): string | null {
  try {
    return localStorage.getItem(CLAIM_KEY)
  } catch {
    return null
  }
}
function clearClaim() {
  try {
    localStorage.removeItem(CLAIM_KEY)
  } catch {
    /* ignore */
  }
}
/**
 * Signed in as a guest and about to sign in to another account: take a one-time claim token
 * (as the guest) so the new session can pull the guest's journeys and party seats across.
 */
async function prepareGuestMerge() {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user.is_anonymous) return
  const { data: token } = await supabase.rpc('create_guest_claim')
  if (token) {
    try {
      localStorage.setItem(CLAIM_KEY, String(token))
    } catch {
      /* ignore */
    }
  }
}

// ------------------------------------------------------------ provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // A guest who signed in to an existing account: move what they did as a guest (journeys,
  // party seats) into it — see 0011_guest_safety.sql. The token was taken just before signing in.
  useEffect(() => {
    if (!supabase || !session || session.user.is_anonymous) return
    const token = readClaim()
    if (!token) return
    clearClaim()
    void supabase.rpc('redeem_guest_claim', { p_token: token })
  }, [session])

  // Load the public profile of whoever is signed in.
  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null)
      return
    }
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile((data as Profile) ?? null))
  }, [session])

  const isUsernameFree = useCallback(async (username: string) => {
    if (!supabase) return false
    const { data } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).maybeSingle()
    return !data
  }, [])

  const signIn = useCallback(async (identifier: string, password: string, captchaToken?: string): Promise<AuthError | null> => {
    if (!supabase) return 'unavailable'
    const id = identifier.trim()
    const phone = normalizePhone(id)
    await prepareGuestMerge()

    if (id.includes('@') && !id.startsWith('@')) {
      const { error } = await supabase.auth.signInWithPassword({ email: id, password, options: { captchaToken } })
      return error ? mapError(error.message) : null
    }
    if (phone) {
      const { error } = await supabase.auth.signInWithPassword({ email: phoneEmail(phone), password, options: { captchaToken } })
      return error ? mapError(error.message) : null
    }
    // @username → server-side lookup (the email never reaches the browser).
    const { data, error } = await supabase.functions.invoke('login-username', { body: { username: id, password, captchaToken } })
    if (error || !data?.access_token) return 'invalid_credentials'
    const { error: e2 } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
    return e2 ? 'unknown' : null
  }, [])

  const signUp = useCallback(async (input: SignUpInput): Promise<AuthError | null> => {
    if (!supabase) return 'unavailable'
    const username = input.username.trim().toLowerCase().replace(/^@/, '')
    if (!(await isUsernameFree(username))) return 'username_taken'

    const phone = input.phone ? normalizePhone(input.phone) : null
    const email = phone ? phoneEmail(phone) : input.email!.trim()
    await prepareGuestMerge()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        captchaToken: input.captchaToken,
        data: {
          display_name: input.displayName.trim(),
          username,
          ...(phone ? { phone, phone_verified: PHONE_VERIFY === 'sms' } : {}),
        },
      },
    })
    if (error) return mapError(error.message)
    // "Confirm email" still on in Supabase → no session until the link is clicked.
    if (!data.session) return phone ? 'unknown' : 'confirm_email_sent'
    return null
  }, [isUsernameFree])

  const signInWithGoogle = useCallback(async (next: string): Promise<AuthError | null> => {
    if (!supabase) return 'unavailable'
    await prepareGuestMerge()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}${next}` },
    })
    return error ? mapError(error.message) : null
  }, [])

  const sendPasswordReset = useCallback(async (email: string, captchaToken?: string): Promise<AuthError | null> => {
    if (!supabase) return 'unavailable'
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/reset`, captchaToken })
    return error ? mapError(error.message) : null
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  const signInAsGuest = useCallback(async (displayName: string, captchaToken?: string): Promise<AuthError | null> => {
    if (!supabase) return 'unavailable'
    const { error } = await supabase.auth.signInAnonymously({ options: { data: { display_name: displayName.trim() }, captchaToken } })
    if (!error) return null
    console.warn('Guest sign-in failed:', error.message)
    // Supabase: "Anonymous sign-ins are disabled" (Authentication → Sign In / Providers).
    return error.message.toLowerCase().includes('anonymous') ? 'guest_disabled' : mapError(error.message)
  }, [])

  const upgradeGuest = useCallback(
    async ({ email, password, username }: { email: string; password: string; username: string }): Promise<AuthError | null> => {
      if (!supabase || !session) return 'unavailable'
      const uname = username.trim().toLowerCase().replace(/^@/, '')
      if (!(await isUsernameFree(uname))) return 'username_taken'
      const { error } = await supabase.auth.updateUser({ email: email.trim(), password })
      if (error) return mapError(error.message)
      await supabase.from('profiles').update({ username: uname }).eq('id', session.user.id)
      setProfile((p) => (p ? { ...p, username: uname } : p))
      // With "Confirm email" on, the address becomes the login once the link in the email is clicked.
      return null
    },
    [session, isUsernameFree],
  )

  const linkGoogle = useCallback(async (next: string): Promise<AuthError | null> => {
    if (!supabase) return 'unavailable'
    await prepareGuestMerge()
    const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: `${location.origin}${next}` } })
    return error ? mapError(error.message) : null
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      enabled: !!supabase,
      loading,
      session,
      profile,
      signIn,
      signUp,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
      isUsernameFree,
      isGuest: !!session?.user.is_anonymous,
      isMember: !!session && !session.user.is_anonymous,
      signInAsGuest,
      upgradeGuest,
      linkGoogle,
    }),
    [loading, session, profile, signIn, signUp, signInWithGoogle, sendPasswordReset, signOut, isUsernameFree, signInAsGuest, upgradeGuest, linkGoogle],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(AuthCtx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}
