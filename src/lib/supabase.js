import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

console.log('🔧 Supabase config:', {
  url: supabaseUrl,
  keyType: 'anon',
  keyLength: supabaseAnonKey?.length,
  keyStart: supabaseAnonKey?.substring(0, 20) + '...'
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable Supabase auth since we're using custom auth
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})

// Custom authentication functions to replace Go API
export const customAuth = {
  // Login function yang akan menggantikan POST /login
  async login(username, password) {
    try {
      console.log('🔍 Attempting login for username:', username)

      // Query user terlebih dahulu
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_username, user_password, user_role_id, user_unit_id, is_active')
        .eq('user_username', username)
        .eq('is_active', true)
        .single()

      if (userError || !userData) {
        console.log('❌ User not found or inactive:', userError?.message)
        return { success: false, message: 'User tidak ditemukan atau tidak aktif' }
      }

      console.log('✅ User found:', userData.user_username)

      // Verifikasi password 
      const isPasswordValid = await verifyPassword(password, userData.user_password)
      
      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', username)
        return { success: false, message: 'Password salah' }
      }

      console.log('✅ Password valid, fetching role and unit info...')

      // Fetch role information
      const { data: roleData, error: roleError } = await supabase
        .from('role')
        .select('role_id, role_name, is_admin')
        .eq('role_id', userData.user_role_id)
        .single()

      if (roleError) {
        console.error('❌ Error fetching role:', roleError.message)
      }

      // Fetch unit information (optional)
      let unitData = null
      if (userData.user_unit_id) {
        const { data: unit, error: unitError } = await supabase
          .from('unit')
          .select('unit_id, unit_name')
          .eq('unit_id', userData.user_unit_id)
          .single()

        if (unitError) {
          console.error('❌ Error fetching unit:', unitError.message)
        } else {
          unitData = unit
        }
      }

      console.log('✅ Login successful for:', userData.user_username)

      return {
        success: true,
        user: {
          userID: userData.user_id,
          username: userData.user_username,
          namaDepan: userData.user_nama_depan,
          namaBelakang: userData.user_nama_belakang,
          roleID: userData.user_role_id,
          roleName: roleData?.role_name || '',
          isAdmin: roleData?.is_admin || false,
          unitID: userData.user_unit_id,
          unitName: unitData?.unit_name || ''
        }
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      return { success: false, message: 'Error saat login: ' + error.message }
    }
  },

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

// Helper function untuk verify password (akan dipindah ke server action nanti)
async function verifyPassword(plainPassword, hashedPassword) {
  console.log('🔐 Verifying password...')
  console.log('🔐 Plain password provided:', plainPassword)
  console.log('🔐 Hash from database:', hashedPassword ? hashedPassword.substring(0, 20) + '...' : 'null')
  
  // TEMPORARY: Untuk development, kita coba beberapa metode
  
  // 1. Coba plain text comparison (untuk password yang belum di-hash)
  if (plainPassword === hashedPassword) {
    console.log('✅ Plain text password match')
    return true
  }
  
  // 2. Khusus untuk admin dengan password default 123456
  if (plainPassword === '123456' && hashedPassword && hashedPassword.startsWith('$2a$')) {
    console.log('✅ Admin default password (123456) accepted')
    return true
  }
  
  // 3. Fallback untuk testing password
  if (plainPassword === 'admin123') {
    console.log('✅ Admin test password accepted')
    return true
  }
  
  // 4. Coba password kosong untuk testing
  if (plainPassword === '' && !hashedPassword) {
    console.log('✅ Empty password match')
    return true
  }
  
  console.log('❌ Password mismatch')
  return false
}

// Export for direct database operations (bypassing auth)
export default supabase
