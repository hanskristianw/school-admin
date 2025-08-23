import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-updated'

export async function POST(req) {
  try {
    const body = await req.json()
    const { sid, tok, user_id } = body || {}
    if (!sid || !tok) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
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

    const slots = [slot - 1, slot, slot + 1]
    const ok = slots.some(s => {
      const payload = `${sid}:${s}`
      const t = crypto.createHmac('sha256', session.secret).update(payload).digest('hex').slice(0, 12)
      return t === tok
    })

    const ip = req.headers.get('x-forwarded-for') || ''
    const ua = req.headers.get('user-agent') || ''

    if (!ok) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'invalid', ip, user_agent: ua }])
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }

    // Resolve student by user_id (client should send user_id from local storage), then check scope
    const uid = parseInt(user_id)
    if (!uid) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'not_allowed', ip, user_agent: ua }])
      return NextResponse.json({ error: 'unauth' }, { status: 401 })
    }

    // Find active detail_siswa for this date
    const { data: details, error: dErr } = await supabaseAdmin
      .from('detail_siswa')
      .select('detail_siswa_id, detail_siswa_kelas_id')
      .eq('detail_siswa_user_id', uid)
    if (dErr) throw dErr

    if (!details || details.length === 0) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'not_allowed', ip, user_agent: ua }])
      return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
    }

    // Check scope if class/year provided
    let allowedDetail = null
    if (session.scope_type === 'class' && session.scope_kelas_id) {
      allowedDetail = details.find(d => String(d.detail_siswa_kelas_id) === String(session.scope_kelas_id))
    } else {
      // For 'year' we need kelas_year_id -> join kelas
      if (session.scope_type === 'year' && session.scope_year_id) {
        // fetch kelas by id
        const { data: kelasRow } = await supabaseAdmin.from('kelas').select('kelas_id, kelas_year_id').in('kelas_id', details.map(d=>d.detail_siswa_kelas_id))
        const okKelas = (kelasRow||[]).some(k => String(k.kelas_year_id) === String(session.scope_year_id))
        if (okKelas) allowedDetail = details[0]
      } else {
        allowedDetail = details[0]
      }
    }

    if (!allowedDetail) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'not_allowed', ip, user_agent: ua }])
      return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
    }

    // Upsert attendance for today
    const today = new Date().toISOString().slice(0,10)
    const { data: existing } = await supabaseAdmin
      .from('absen')
      .select('absen_id')
      .eq('absen_detail_siswa_id', allowedDetail.detail_siswa_id)
      .eq('absen_date', today)
      .maybeSingle?.() // ignore if not supported

    if (existing) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'duplicate', detail_siswa_id: allowedDetail.detail_siswa_id, ip, user_agent: ua }])
      return NextResponse.json({ status: 'duplicate' })
    }

    const nowTime = new Date().toTimeString().slice(0,8)
    const { error: insErr } = await supabaseAdmin
      .from('absen')
      .insert([{ absen_detail_siswa_id: allowedDetail.detail_siswa_id, absen_date: today, absen_time: nowTime, absen_session_id: sid, absen_method: 'qr' }])
    if (insErr) throw insErr

    await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'ok', detail_siswa_id: allowedDetail.detail_siswa_id, ip, user_agent: ua }])

    return NextResponse.json({ status: 'ok' })
  } catch (e) {
    console.error('scan error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
