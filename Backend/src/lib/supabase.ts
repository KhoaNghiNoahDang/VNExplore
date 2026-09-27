import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

const opts = { auth: { persistSession: false, autoRefreshToken: false } }

/** Public client: same rights as the browser (row-level security applies). */
export const db = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, opts)

/**
 * Service client: bypasses RLS. Only used for backend-only tables (route_cache).
 * Never expose this key or return rows from it without filtering.
 */
export const adminDb = config.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, opts)
  : null
