import { createClient } from '@supabase/supabase-js'
import { bearerHeaders } from '@/lib/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Debug log - only in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Supabase config:', {
    url: supabaseUrl,
    keyType: 'anon',
    keyLength: supabaseAnonKey?.length,
  })
}

export const setAuthToken = (token) => {
  const headers = bearerHeaders(token)
  try {
    // Supabase JS v2 exposes a headers bag used for PostgREST calls.
    // Mutating it makes new requests include the Authorization header.
    supabase.headers = { ...(supabase.headers || {}), ...headers }
  } catch {}
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable Supabase auth since we're using custom auth
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    storageKey: '__supabase_no_auth__', // Use a unique key so it never conflicts with real sessions
  }
})

// On client boot: remove any stale Supabase auth tokens from localStorage that
// may have been created by earlier app versions or by the Supabase SDK itself.
// These stale tokens (sb-*-auth-token) get sent as Bearer by Supabase JS v2
// even with persistSession:false if found in storage, causing JWSInvalidSignature.
if (typeof window !== 'undefined') {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      .forEach(k => {
        console.log('[supabase] Removing stale auth token from localStorage:', k)
        localStorage.removeItem(k)
      })
  } catch {}
}

// (Factory defined at bottom)

// Custom authentication functions to replace Go API
export const customAuth = {

  // Get menus berdasarkan role.
  // isAdmin: true → fetch ALL menus (checked via role.is_admin in DB, passed from login payload).
  // Non-admin → fetch only menus assigned to that role via menu_permissions.
  async getMenusByRole(roleName, isAdmin = false) {
    try {
      console.log('🔍 Getting menus for:', { roleName, isAdmin })
      
      if (isAdmin || roleName === 'admin' || roleName === 'Admin') {
        // Admin gets all menus
        console.log('👑 Admin access - fetching all menus')
        const { data, error } = await supabase
          .from('menus')
          .select('*')
          .order('menu_order')
        
        if (error) {
          console.error('❌ Error fetching all menus:', error)
          // JWSInvalidSignature means a stale token is attached — not an auth failure
          // from the app's perspective. Log and return empty rather than crash the UI.
          return { success: true, menus: [] }
        }
        
        console.log('✅ Admin menus loaded:', data?.length, 'menus')
        return { success: true, menus: data || [] }
      } else {
        // Non-admin: fetch menus based on role permissions
        console.log('👤 Non-admin access - checking permissions for role:', roleName)
        
        // 1. Fetch role ID by role name
        const { data: roleData, error: roleError } = await supabase
          .from('role')
          .select('role_id, is_admin')
          .eq('role_name', roleName)
          .single()
        
        if (roleError || !roleData) {
          console.error('❌ Role not found:', roleError?.message)
          return { success: false, message: 'Role tidak ditemukan' }
        }

        // Double-check: if DB says is_admin=true, fetch all menus
        if (roleData.is_admin) {
          console.log('👑 DB confirms admin flag — fetching all menus')
          const { data, error } = await supabase
            .from('menus')
            .select('*')
            .order('menu_order')
          if (error) return { success: true, menus: [] }
          return { success: true, menus: data || [] }
        }

        // 2. Fetch menu permissions for this role
        const { data: permissionsData, error: permError } = await supabase
          .from('menu_permissions')
          .select('menu_id')
          .eq('role_id', roleData.role_id)

        if (permError) {
          console.error('❌ Error fetching permissions:', permError.message)
          return { success: false, message: 'Error mengambil permission' }
        }

        // 3. Fetch menus by permitted IDs
        const menuIds = permissionsData.map(p => p.menu_id)
        
        if (menuIds.length === 0) {
          console.log('⚠️ No menu permissions found for role:', roleName)
          return { success: true, menus: [] }
        }

        const { data: menusData, error: menusError } = await supabase
          .from('menus')
          .select('*')
          .in('menu_id', menuIds)
          .order('menu_order')
        
        if (menusError) {
          console.error('❌ Error fetching role-based menus:', menusError.message)
          return { success: true, menus: [] }
        }
        
        console.log('✅ Role-based menus loaded:', menusData?.length, 'menus')
        return { success: true, menus: menusData || [] }
      }
    } catch (error) {
      console.error('❌ getMenusByRole error:', error)
      return { success: false, message: 'Error mengambil menu: ' + error.message }
    }
  }
}
// Export for direct database operations (bypassing auth)
export default supabase

// Factory to create a client that always sends an Authorization bearer
export function createSupabaseWithAuth(token) {
  const headers = bearerHeaders(token)
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: headers
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })
  // Force-propagate to the PostgREST sub-client (.from() reads from rest.headers)
  if (client.rest) {
    client.rest.headers = { ...client.rest.headers, ...headers }
  }
  return client
}
