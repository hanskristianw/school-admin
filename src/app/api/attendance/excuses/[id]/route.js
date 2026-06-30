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

// GET /api/attendance/excuses/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('attendance_excuses')
      .select(EXCUSE_SELECT)
      .eq('id', id)
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 404 })
  }
}

// PATCH /api/attendance/excuses/[id]
// Body: { action: 'approved' | 'rejected', note?: string, approver_user_id: number }
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, note, approver_user_id } = body

    if (!action || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ success: false, message: 'action harus approved atau rejected' }, { status: 400 })
    }
    if (!approver_user_id) {
      return NextResponse.json({ success: false, message: 'approver_user_id wajib diisi' }, { status: 400 })
    }

    // Fetch current excuse
    const { data: excuse, error: fetchErr } = await supabaseAdmin
      .from('attendance_excuses')
      .select('id, status, approver1_id, approver2_id')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    const aid = parseInt(approver_user_id, 10)
    let updates = {}

    if (excuse.status === 'pending' && excuse.approver1_id === aid) {
      // Approver 1's turn
      updates = {
        approver1_action: action,
        approver1_note:   note?.trim() || null,
        approver1_at:     new Date().toISOString(),
        status:           action === 'approved' ? 'approved_1' : 'rejected',
      }
    } else if (excuse.status === 'approved_1' && excuse.approver2_id === aid) {
      // Approver 2's turn
      updates = {
        approver2_action: action,
        approver2_note:   note?.trim() || null,
        approver2_at:     new Date().toISOString(),
        status:           action === 'approved' ? 'approved' : 'rejected',
      }
    } else {
      return NextResponse.json({
        success: false,
        message: 'Anda tidak berwenang atau bukan giliran Anda untuk mengambil tindakan.'
      }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('attendance_excuses')
      .update(updates)
      .eq('id', id)
      .select(EXCUSE_SELECT)
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// DELETE /api/attendance/excuses/[id]
// Hanya boleh jika status masih 'pending' (belum ada tindakan dari approver manapun)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    // Cek status dulu
    const { data: excuse, error: fetchErr } = await supabaseAdmin
      .from('attendance_excuses')
      .select('id, status')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    if (excuse.status !== 'pending') {
      return NextResponse.json({
        success: false,
        message: 'Pengajuan tidak dapat dihapus karena sudah diproses oleh approver.'
      }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('attendance_excuses')
      .delete()
      .eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true, message: 'Pengajuan berhasil dihapus' })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
