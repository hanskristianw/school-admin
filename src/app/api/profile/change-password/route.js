import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!serviceKey) console.warn('Missing SUPABASE_SERVICE_ROLE_KEY; change password API will fail')

const admin = serviceKey ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }) : null

export async function POST(req) {
  try {
    if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  const body = await req.json()
  const { userId: bodyUserId, newPassword } = body || {}

  // Identify the caller from secure cookie set by middleware/login (async API)
  const cookieStore = await cookies()
  const cookieUserId = cookieStore.get('kr_id')?.value

    if (!cookieUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Do not trust body userId; require match when provided
    if ((bodyUserId && bodyUserId !== cookieUserId) || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    // Call SECURITY DEFINER function to hash and update
    const { error } = await admin.rpc('secure_update_password', { p_user_id: cookieUserId, p_new_password: newPassword })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('change-password error', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}
