import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

const opts = { auth: { persistSession: false, autoRefreshToken: false } }

/**
 * Service client: bypasses RLS. Only used for backend-only tables (route_cache, place_reports,
 * place_suggestions). Never expose this key or return rows from it without filtering.
 */
export const adminDb = config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, opts)
  : null
