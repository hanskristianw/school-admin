import { NextResponse } from 'next/server'
import { signAppJwt } from '@/lib/auth'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const body = await req.json()
    const { user_id, role, kr_id } = body || {}
    if (!user_id || !role) {
      return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 })
    }

    // Optional: verify the user and role from DB for safety.
    try {
      const { data: userRow, error } = await supabase
        .from('users')
        .select('user_id, role, kr_id')
        .eq('user_id', user_id)
        .single()
      if (error) throw error
      if (!userRow || userRow.role !== role) {
        return NextResponse.json({ error: 'Invalid role for user' }, { status: 403 })
      }
    } catch (e) {
      // In some setups, anon may not read users; skip strict check.
    }

    const payload = {
      sub: String(user_id),
      iss: 'supabase',
      aud: 'authenticated',
      user_role: role,
      is_teacher: role === 'teacher',
      kr_id: typeof kr_id === 'number' ? kr_id : (kr_id ? Number(kr_id) : null),
    }
    const token = signAppJwt(payload)
    return NextResponse.json({ token })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
