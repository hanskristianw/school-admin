import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin, supabase } from '@/lib/supabase-updated'

// Create new attendance session
export async function POST(req) {
  try {
    const body = await req.json()
    const { scope_type, scope_year_id = null, scope_kelas_id = null } = body || {}

    const krId = req.headers.get('x-user-id') || (typeof window === 'undefined' ? null : localStorage.getItem('kr_id'))
    // Fallback: try cookie/localStorage not available in server; require header
    const created_by_user_id = parseInt(krId || body?.created_by_user_id)
    if (!created_by_user_id) return NextResponse.json({ error: 'unauth' }, { status: 401 })

    if (!supabaseAdmin) return NextResponse.json({ error: 'no_admin_client' }, { status: 500 })

    if (!['year','class','all'].includes(scope_type)) {
      return NextResponse.json({ error: 'invalid_scope' }, { status: 400 })
    }

    const secret = crypto.randomBytes(32).toString('hex')

    const { data, error } = await supabaseAdmin
      .from('attendance_session')
      .insert([{
        created_by_user_id,
        scope_type,
        scope_year_id,
        scope_kelas_id,
        secret,
        status: 'open'
      }]).select().single()

    if (error) throw error

    return NextResponse.json({
      session_id: data.session_id,
      session_date: data.session_date,
      step: data.token_step_seconds || 20
    })
  } catch (e) {
    console.error('create session error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
