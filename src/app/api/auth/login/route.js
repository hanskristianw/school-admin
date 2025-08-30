import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
const admin = serviceKey ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }) : null

export async function POST(req) {
  try {
    if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })

    // Fetch user by username (server-side bypasses RLS)
    const { data: user, error: userErr } = await admin
      .from('users')
  .select('user_id, user_username, user_nama_depan, user_nama_belakang, user_role_id, user_unit_id, is_active, user_password_hash')
      .eq('user_username', username)
      .single()
    if (userErr || !user) return NextResponse.json({ success: false, message: 'User tidak ditemukan atau tidak aktif' }, { status: 401 })
    if (!user.is_active) return NextResponse.json({ success: false, message: 'User tidak aktif' }, { status: 401 })

    // Verify against hash only
    let verified = false
    if (user.user_password_hash) {
      // Try DB verify function first
      const { data: ok, error: vErr } = await admin.rpc('verify_password', { p_hash: user.user_password_hash, p_password: password })
      if (!vErr) {
        verified = !!ok
      } else {
        // Fallback to bcryptjs in Node if DB function missing
        try {
          const mod = await import('bcryptjs')
          const compare = (mod && (mod.default?.compare || mod.compare))
          if (typeof compare !== 'function') throw new Error('bcryptjs compare not available')
          verified = await compare(password, user.user_password_hash)
        } catch (e) {
          console.warn('bcryptjs compare failed and DB verify unavailable:', e?.message || e)
          return NextResponse.json({ error: vErr?.message || 'Password verify unavailable' }, { status: 500 })
        }
      }
    }
    if (!verified) return NextResponse.json({ success: false, message: 'Password salah' }, { status: 401 })

    // Fetch role & unit
    const [{ data: role }, { data: unit }] = await Promise.all([
      admin.from('role').select('role_id, role_name, is_admin').eq('role_id', user.user_role_id).single(),
      user.user_unit_id ? admin.from('unit').select('unit_id, unit_name').eq('unit_id', user.user_unit_id).single() : Promise.resolve({ data: null })
    ])

    const payload = {
      success: true,
      user: {
        userID: user.user_id,
        username: user.user_username,
        namaDepan: user.user_nama_depan,
        namaBelakang: user.user_nama_belakang,
        roleID: user.user_role_id,
        roleName: role?.role_name || '',
        isAdmin: role?.is_admin || false,
        unitID: user.user_unit_id,
        unitName: unit?.unit_name || ''
      }
    }
    return NextResponse.json(payload)
  } catch (e) {
    console.error('auth/login error', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}
