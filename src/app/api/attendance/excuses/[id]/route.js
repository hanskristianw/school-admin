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

    // Fetch current excuse — including fields needed for quota deduction
    const { data: excuse, error: fetchErr } = await supabaseAdmin
      .from('attendance_excuses')
      .select('id, status, approver1_id, approver2_id, user_id, category, attendance_date')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    const aid = parseInt(approver_user_id, 10)
    let updates = {}

    if (excuse.status === 'pending' && excuse.approver1_id === aid) {
      // Approver 1's turn
      const hasApprover2 = !!excuse.approver2_id

      if (action === 'approved' && hasApprover2) {
        // Dua approver: lanjut ke step 2
        updates = {
          approver1_action: 'approved',
          approver1_note:   note?.trim() || null,
          approver1_at:     new Date().toISOString(),
          status:           'approved_1',
        }
      } else if (action === 'approved' && !hasApprover2) {
        // Satu approver saja: langsung approved
        updates = {
          approver1_action: 'approved',
          approver1_note:   note?.trim() || null,
          approver1_at:     new Date().toISOString(),
          status:           'approved',
        }
      } else {
        // Ditolak (oleh siapapun)
        updates = {
          approver1_action: 'rejected',
          approver1_note:   note?.trim() || null,
          approver1_at:     new Date().toISOString(),
          status:           'rejected',
        }
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

    // ── Deduct quota jika final approved ──────────────────────────────────
    // Logika baru: ada quota record = ada batas → deduct. Tidak ada = bebas (skip).
    if (updates.status === 'approved' && excuse.category) {
      try {
        // Cari tahun ajaran yang mencakup attendance_date
        const { data: yearRow } = await supabaseAdmin
          .from('year')
          .select('year_id')
          .lte('start_date', excuse.attendance_date)
          .gte('end_date',   excuse.attendance_date)
          .maybeSingle()

        if (yearRow?.year_id) {
          // 1. Cek record individual karyawan ini
          const { data: indivQuota } = await supabaseAdmin
            .from('leave_quotas')
            .select('id, used_days')
            .eq('user_id',         excuse.user_id)
            .eq('leave_type_code', excuse.category)
            .eq('year_id',         yearRow.year_id)
            .maybeSingle()

          if (indivQuota) {
            // Record individual ada → update
            await supabaseAdmin
              .from('leave_quotas')
              .update({ used_days: indivQuota.used_days + 1, updated_at: new Date().toISOString() })
              .eq('id', indivQuota.id)
          } else {
            // 2. Tidak ada individual → cek global template (user_id IS NULL)
            const { data: globalQuota } = await supabaseAdmin
              .from('leave_quotas')
              .select('id, total_days')
              .is('user_id', null)
              .eq('leave_type_code', excuse.category)
              .eq('year_id',         yearRow.year_id)
              .maybeSingle()

            if (globalQuota) {
              // Global template ada → auto-create individual record untuk karyawan ini
              await supabaseAdmin
                .from('leave_quotas')
                .insert({
                  user_id:         excuse.user_id,
                  leave_type_code: excuse.category,
                  year_id:         yearRow.year_id,
                  total_days:      globalQuota.total_days,
                  used_days:       1,
                })
            }
            // Tidak ada individual maupun global → jenis ini tidak terbatas, skip
          }
        }
      } catch (_) {
        // Quota deduction failure tidak membatalkan approval
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// PUT /api/attendance/excuses/[id]
// Edit a pending excuse (only if status = 'pending')
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { category, other_reason, attachment_url, user_id } = body

    // Verify ownership + pending status
    const { data: excuse, error: fetchErr } = await supabaseAdmin
      .from('attendance_excuses')
      .select('id, status, user_id')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    if (excuse.status !== 'pending') {
      return NextResponse.json({
        success: false,
        message: 'Pengajuan tidak dapat diubah karena sudah diproses oleh approver.',
      }, { status: 403 })
    }
    if (excuse.user_id !== parseInt(user_id, 10)) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan.' }, { status: 403 })
    }

    if (!category) {
      return NextResponse.json({ success: false, message: 'category wajib diisi' }, { status: 400 })
    }

    const updates = {
      category,
      other_reason: category === 'other' ? (other_reason?.trim() || null) : null,
      attachment_url: attachment_url || null,
      updated_at: new Date().toISOString(),
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
