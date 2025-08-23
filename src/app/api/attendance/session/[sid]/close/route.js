import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-updated'

export async function POST(req, { params }) {
  try {
    const { sid } = params
    if (!sid) return NextResponse.json({ error: 'no_sid' }, { status: 400 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'no_admin_client' }, { status: 500 })

    const { error } = await supabaseAdmin
      .from('attendance_session')
      .update({ status: 'closed', end_time: new Date().toISOString() })
      .eq('session_id', sid)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('close session error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
