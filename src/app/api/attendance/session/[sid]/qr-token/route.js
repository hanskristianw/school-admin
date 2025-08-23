import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-updated'

export async function GET(req, { params }) {
  try {
    const { sid } = params
    if (!sid) return NextResponse.json({ error: 'no_sid' }, { status: 400 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'no_admin_client' }, { status: 500 })

    const { data: session, error } = await supabaseAdmin
      .from('attendance_session')
      .select('*')
      .eq('session_id', sid)
      .single()
    if (error) throw error

    if (session.status !== 'open') return NextResponse.json({ error: 'closed' }, { status: 400 })

    const step = session.token_step_seconds || 20
    const now = Math.floor(Date.now() / 1000)
    const slot = Math.floor(now / step)
    const payload = `${sid}:${slot}`
    const token = crypto.createHmac('sha256', session.secret).update(payload).digest('hex').slice(0, 12)

    return NextResponse.json({ token, validForSec: step - (now % step), step })
  } catch (e) {
    console.error('qr-token error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
