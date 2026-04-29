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
    detectSessionInUrl: false
  }
})

// (Factory defined at bottom)

// Custom authentication functions to replace Go API
export const customAuth = {

  // Get menus berdasarkan role
  async getMenusByRole(roleName, isAdmin = false) {
    try {
      console.log('🔍 Getting menus for:', { roleName, isAdmin })
      
      if (isAdmin || roleName === 'admin' || roleName === 'Admin') {
        // Admin dapat akses semua menu
        console.log('👑 Admin access - fetching all menus')
  const { data, error } = await supabase
          .from('menus')
          .select('*')
          .order('menu_order')
        
        if (error) {
          console.error('❌ Error fetching all menus:', error)
          throw new Error(error.message)
        }
        
        console.log('✅ Admin menus loaded:', data?.length, 'menus')
        return { success: true, menus: data || [] }
      } else {
        // Non-admin: fetch menus berdasarkan permissions
        console.log('👤 Non-admin access - checking permissions for role:', roleName)
        
        // 1. Fetch role ID berdasarkan role name
  const { data: roleData, error: roleError } = await supabase
          .from('role')
          .select('role_id')
          .eq('role_name', roleName)
          .single()
        
        if (roleError || !roleData) {
          console.error('❌ Role not found:', roleError?.message)
          return { success: false, message: 'Role tidak ditemukan' }
        }

        // 2. Fetch menu permissions untuk role tersebut
  const { data: permissionsData, error: permError } = await supabase
          .from('menu_permissions')
          .select('menu_id')
          .eq('role_id', roleData.role_id)

        if (permError) {
          console.error('❌ Error fetching permissions:', permError.message)
          return { success: false, message: 'Error mengambil permission' }
        }

        // 3. Fetch menus berdasarkan permission yang ada
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
          throw new Error(menusError.message)
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
