import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXCUSE_SELECT = `
  id, user_id, excuse_type, attendance_date, late_minutes, exit_time, return_time, unit_id,
  category, other_reason, attachment_url, status,
  approver1_id, approver2_id,
  approver1_action, approver1_note, approver1_at,
  approver2_action, approver2_note, approver2_at,
  created_at, updated_at,
  submitter:user_id (user_id, user_nama_depan, user_nama_belakang, user_unit_id),
  unit:unit_id (unit_id, unit_name),
  approver1:approver1_id (user_id, user_nama_depan, user_nama_belakang),
  approver2:approver2_id (user_id, user_nama_depan, user_nama_belakang)
`

// GET /api/attendance/excuses
// Query params:
//   user_id     — filter by submitter
//   approver_id — filter where this user is approver1 or approver2
//   unit_id     — filter by user unit_id
//   status      — filter by status (pending, approved_1, approved, rejected)
//   start / end — date range
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId     = searchParams.get('user_id')
    const approverId = searchParams.get('approver_id')
    const unitId     = searchParams.get('unit_id')
    const status     = searchParams.get('status')
    const start      = searchParams.get('start')
    const end        = searchParams.get('end')

    let q = supabaseAdmin
      .from('attendance_excuses')
      .select(EXCUSE_SELECT)
      .order('created_at', { ascending: false })

    if (userId)     q = q.eq('user_id', userId)
    if (unitId)     q = q.eq('unit_id', unitId)
    if (status)     q = q.eq('status', status)
    if (start)      q = q.gte('attendance_date', start)
    if (end)        q = q.lte('attendance_date', end)

    // For approver dashboard — show pending items where this user is the active approver
    if (approverId) {
      q = q.or(`approver1_id.eq.${approverId},approver2_id.eq.${approverId}`)
    }

    const { data, error } = await q
    if (error) throw error

    // If filtering by approver_id, further filter to only show their actionable items
    let result = data || []
    if (approverId) {
      const aid = parseInt(approverId, 10)
      result = result.filter(e => {
        if (e.approver1_id === aid && (e.status === 'pending' || e.approver1_action !== null)) return true
        if (e.approver2_id === aid && (e.status === 'approved_1' || e.approver2_action !== null)) return true
        return false
      })
    }

    // Attach face scan timestamps from attendances table for verification
    if (result.length > 0) {
      const pairs = [...new Set(result.map(e => `${e.user_id}_${e.attendance_date}`).filter(p => !p.startsWith('undefined_')))]
      const scanMap = {}

      const scanPromises = pairs.map(async (pair) => {
        const [uidStr, dateStr] = pair.split('_')
        const uid = parseInt(uidStr, 10)
        if (!uid || !dateStr) return

        const tsStart = `${dateStr}T00:00:00+07:00`
        const tsEnd   = `${dateStr}T23:59:59+07:00`

        const { data: logs } = await supabaseAdmin
          .from('attendances')
          .select('scan_time')
          .eq('user_id', uid)
          .gte('scan_time', tsStart)
          .lte('scan_time', tsEnd)
          .order('scan_time', { ascending: true })

        if (logs && logs.length > 0) {
          const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
          const times = []
          for (const s of logs) {
            if (!s.scan_time) continue
            const tStr = timeFmt.format(new Date(s.scan_time))
            if (!times.includes(tStr)) times.push(tStr)
          }
          scanMap[pair] = times
        }
      })

      await Promise.all(scanPromises)

      result = result.map(e => ({
        ...e,
        scans: scanMap[`${e.user_id}_${e.attendance_date}`] || []
      }))
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST /api/attendance/excuses
// Submit a new excuse form
export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, excuse_type, attendance_date, late_minutes, exit_time, return_time, category, other_reason, attachment_url } = body

    if (!user_id)         return NextResponse.json({ success: false, message: 'user_id wajib diisi' }, { status: 400 })
    if (!attendance_date) return NextResponse.json({ success: false, message: 'attendance_date wajib diisi' }, { status: 400 })
    if (!category)        return NextResponse.json({ success: false, message: 'category wajib diisi' }, { status: 400 })
    if (category === 'other' && !other_reason?.trim()) {
      return NextResponse.json({ success: false, message: 'Keterangan lain wajib diisi jika memilih Other' }, { status: 400 })
    }

    // Get user's unit & role to determine approvers
    const { data: userData, error: uErr } = await supabaseAdmin
      .from('users')
      .select('user_role_id, user_unit_id')
      .eq('user_id', user_id)
      .single()
    if (uErr) throw uErr

    // Priority 1: Check unit_approvers
    let approver1_id = null
    let approver2_id = null

    if (userData.user_unit_id) {
      const { data: unitApp } = await supabaseAdmin
        .from('unit_approvers')
        .select('approver1_id, approver2_id')
        .eq('unit_id', userData.user_unit_id)
        .maybeSingle()
      if (unitApp) {
        approver1_id = unitApp.approver1_id
        approver2_id = unitApp.approver2_id
      }
    }

    // Priority 2: Fallback to role_approvers if unit_approvers not configured
    if (!approver1_id && userData.user_role_id) {
      const { data: roleApp } = await supabaseAdmin
        .from('role_approvers')
        .select('approver1_id, approver2_id')
        .eq('role_id', userData.user_role_id)
        .maybeSingle()
      if (roleApp) {
        approver1_id = roleApp.approver1_id
        approver2_id = roleApp.approver2_id
      }
    }

    if (!approver1_id) {
      return NextResponse.json({
        success: false,
        message: 'Approver/Principal belum dikonfigurasi untuk unit/jabatan Anda. Hubungi admin.'
      }, { status: 422 })
    }

    const payload = {
      user_id,
      unit_id: userData.user_unit_id || null,
      excuse_type: excuse_type || 'late',
      attendance_date,
      late_minutes: late_minutes || null,
      exit_time: exit_time || null,
      return_time: return_time || null,
      category,
      other_reason: category === 'other' ? other_reason.trim() : null,
      attachment_url: attachment_url || null,
      approver1_id,
      approver2_id,
      status: 'pending',
    }

    const { data, error } = await supabaseAdmin
      .from('attendance_excuses')
      .insert([payload])
      .select(EXCUSE_SELECT)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({
          success: false,
          message: 'Anda sudah mengajukan surat keterangan untuk tanggal dan tipe yang sama.'
        }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
