import { createClient } from '@supabase/supabase-js'

let cachedAdmin = null

/**
 * Shared Supabase service-role client for server-side Agility Check API routes.
 */
export function getSupabaseAdmin() {
  if (cachedAdmin) return cachedAdmin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  cachedAdmin = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  return cachedAdmin
}

/**
 * Checks whether a Supabase/PostgREST error indicates the migration SQL has not yet been run.
 */
export function isMissingTableError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|schema cache/i.test(msg)
  )
}

const EXPECTED_SECRET =
  process.env.AGILITY_SECRET_KEY ||
  process.env.PSYCHOTEST_SECRET_KEY ||
  process.env.COURT_RENTAL_SECRET_KEY ||
  'ccs_court_auth_2026_x7k9p2m4'

/**
 * Verifies Bearer secret token sent from the external Hostinger/cPanel PHP client.
 */
export function verifyAgilityPublicAuth(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return Boolean(token && token === EXPECTED_SECRET)
}
