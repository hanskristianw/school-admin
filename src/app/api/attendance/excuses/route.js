import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXCUSE_SELECT = `
  id, user_id, excuse_type, attendance_date, late_minutes,
  category, other_reason, attachment_url, status,
  approver1_id, approver2_id,
  approver1_action, approver1_note, approver1_at,
  approver2_action, approver2_note, approver2_at,
  created_at, updated_at,
  submitter:user_id (user_id, user_nama_depan, user_nama_belakang, user_unit_id),
  approver1:approver1_id (user_id, user_nama_depan, user_nama_belakang),
  approver2:approver2_id (user_id, user_nama_depan, user_nama_belakang)
`

// GET /api/attendance/excuses
// Query params:
//   user_id   — filter by submitter
//   approver_id — filter where this user is approver1 or approver2 (for approver dashboard)
//   status    — filter by status (pending, approved_1, approved, rejected)
//   start / end — date range
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId     = searchParams.get('user_id')
    const approverId = searchParams.get('approver_id')
    const status     = searchParams.get('status')
    const start      = searchParams.get('start')
    const end        = searchParams.get('end')

    let q = supabaseAdmin
      .from('attendance_excuses')
      .select(EXCUSE_SELECT)
      .order('created_at', { ascending: false })

    if (userId)     q = q.eq('user_id', userId)
    if (status)     q = q.eq('status', status)
    if (start)      q = q.gte('attendance_date', start)
    if (end)        q = q.lte('attendance_date', end)

    // For approver dashboard — show pending items where this user is the active approver
    // pending → approver1_id must match
    // approved_1 → approver2_id must match
    if (approverId) {
      // Use OR: is approver1 (and pending) OR is approver2 (and approved_1 or any)
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
    const { user_id, excuse_type, attendance_date, late_minutes, category, other_reason, attachment_url } = body

    if (!user_id)        return NextResponse.json({ success: false, message: 'user_id wajib diisi' }, { status: 400 })
    if (!attendance_date) return NextResponse.json({ success: false, message: 'attendance_date wajib diisi' }, { status: 400 })
    if (!category)       return NextResponse.json({ success: false, message: 'category wajib diisi' }, { status: 400 })
    if (category === 'other' && !other_reason?.trim()) {
      return NextResponse.json({ success: false, message: 'Keterangan lain wajib diisi jika memilih Other' }, { status: 400 })
    }

    // Get user's role to determine approvers
    const { data: userData, error: uErr } = await supabaseAdmin
      .from('users')
      .select('user_role_id')
      .eq('user_id', user_id)
      .single()
    if (uErr) throw uErr

    const { data: roleApprover, error: aErr } = await supabaseAdmin
      .from('role_approvers')
      .select('approver1_id, approver2_id')
      .eq('role_id', userData.user_role_id)
      .single()

    if (aErr || !roleApprover) {
      return NextResponse.json({
        success: false,
        message: 'Approver belum dikonfigurasi untuk jabatan Anda. Hubungi admin.'
      }, { status: 422 })
    }


    const payload = {
      user_id,
      excuse_type: excuse_type || 'late',
      attendance_date,
      late_minutes: late_minutes || null,
      category,
      other_reason: category === 'other' ? other_reason.trim() : null,
      attachment_url: attachment_url || null,
      approver1_id: roleApprover.approver1_id,
      approver2_id: roleApprover.approver2_id,
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
