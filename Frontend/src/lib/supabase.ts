import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Supabase client (null when env vars are missing — the app then runs on bundled data,
 * and account features are hidden). Both values are public; RLS protects the data.
 */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true } }) : null

export const GOOGLE_AUTH = import.meta.env.VITE_GOOGLE_AUTH === 'true'
