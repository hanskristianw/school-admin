import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
const admin = serviceKey ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }) : null

export async function POST(req) {
  try {
    if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    const { userId, newPassword } = await req.json()
    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const { error } = await admin.rpc('secure_update_password', { p_user_id: userId, p_new_password: newPassword })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('admin/users/set-password error', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}
