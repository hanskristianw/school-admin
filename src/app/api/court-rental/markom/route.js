import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  APPROVAL_FLOW_KEY,
  MARKOM_RECIPIENTS_KEY,
  getCourtRentalSettings,
  saveCourtRentalSetting,
  resolveStaffUser,
  ensureCourtRentalMenuPermissions,
  formatStaffName
} from '@/lib/courtRentalApproval'

export const dynamic = 'force-dynamic'

// GET: Ambil konfigurasi 2-step approval, penerima notifikasi Markom, dan daftar staf aktif
export async function GET() {
  try {
    const todayWib = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const [{ approvalFlow, markomRecipients }, { data: users, error: usersErr }] = await Promise.all([
      getCourtRentalSettings(),
      supabaseAdmin
        .from('users')
        .select(`
          user_id,
          user_nama_depan,
          user_nama_belakang,
          user_email,
          resign_date,
          role:user_role_id(role_id, role_name, is_student, is_vendor, is_admin)
        `)
        .eq('is_active', true)
        .not('user_email', 'is', null)
        .neq('user_email', '')
        .order('user_nama_depan', { ascending: true })
    ])

    if (usersErr) {
      console.warn('[CourtRental Settings API] Failed to fetch users:', usersErr.message)
    }

    const staffUsers = (users || []).filter(
      u =>
        !u.role?.is_student &&
        !u.role?.is_vendor &&
        (!u.resign_date || String(u.resign_date).slice(0, 10) >= todayWib)
    )

    return NextResponse.json({
      success: true,
      approvalFlow,
      recipients: markomRecipients,
      users: staffUsers
    })
  } catch (err) {
    console.error('[CourtRental Settings API] Unexpected error in GET:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST: Simpan konfigurasi Approver 1 (Finance), Approver 2 (Markom), dan penerima notifikasi Markom
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      caller_user_id,
      approver1_user_id,
      approver2_user_id,
      recipients
    } = body

    const caller = await resolveStaffUser(caller_user_id)
    const { approvalFlow: currentFlow, markomRecipients: currentRecipients } = await getCourtRentalSettings()

    const wantsUpdateFlow = approver1_user_id !== undefined || approver2_user_id !== undefined
    let nextFlow = currentFlow

    if (wantsUpdateFlow) {
      if (!caller || !caller.is_admin) {
        return NextResponse.json(
          { success: false, message: 'Hanya Administrator (is_admin) yang dapat mengubah pengaturan Approver 1 & Approver 2.' },
          { status: 403 }
        )
      }

      if (!approver1_user_id || !approver2_user_id) {
        return NextResponse.json(
          { success: false, message: 'Approver 1 (Finance) dan Approver 2 (Markom) wajib dipilih keduanya.' },
          { status: 400 }
        )
      }

      const [app1, app2] = await Promise.all([
        resolveStaffUser(approver1_user_id),
        resolveStaffUser(approver2_user_id)
      ])

      if (!app1 || !app1.is_active || app1.is_student || app1.is_vendor) {
        return NextResponse.json({ success: false, message: 'User Approver 1 tidak valid atau tidak aktif.' }, { status: 400 })
      }
      if (!app2 || !app2.is_active || app2.is_student || app2.is_vendor) {
        return NextResponse.json({ success: false, message: 'User Approver 2 tidak valid atau tidak aktif.' }, { status: 400 })
      }

      nextFlow = {
        approver1: {
          user_id: app1.user_id,
          user_nama_depan: app1.user_nama_depan,
          user_nama_belakang: app1.user_nama_belakang,
          full_name: formatStaffName(app1) || app1.full_name,
          user_email: app1.user_email,
          role_id: app1.role_id,
          role_name: app1.role_name
        },
        approver2: {
          user_id: app2.user_id,
          user_nama_depan: app2.user_nama_depan,
          user_nama_belakang: app2.user_nama_belakang,
          full_name: formatStaffName(app2) || app2.full_name,
          user_email: app2.user_email,
          role_id: app2.role_id,
          role_name: app2.role_name
        },
        updated_at: new Date().toISOString(),
        updated_by: caller.full_name
      }

      await saveCourtRentalSetting(
        APPROVAL_FLOW_KEY,
        nextFlow,
        'Konfigurasi approval berjenjang Sewa Lapangan (Approver 1 Finance -> Approver 2 Markom)'
      )

      await ensureCourtRentalMenuPermissions([app1.role_id, app2.role_id])
    }

    let nextRecipients = currentRecipients
    if (recipients !== undefined) {
      if (!Array.isArray(recipients)) {
        return NextResponse.json({ success: false, message: 'Format recipients harus berupa array.' }, { status: 400 })
      }

      nextRecipients = recipients.map(r => ({
        user_id: r.user_id,
        user_nama_depan: r.user_nama_depan || '',
        user_nama_belakang: r.user_nama_belakang || '',
        user_email: String(r.user_email || '').trim().toLowerCase(),
        role_name: r.role_name || 'Staff',
        notify_email: r.notify_email !== false,
        notify_google_chat: r.notify_google_chat !== false,
        is_active: r.is_active !== false
      }))

      await saveCourtRentalSetting(
        MARKOM_RECIPIENTS_KEY,
        nextRecipients,
        'Daftar staf/Markom penerima notifikasi email & Google Chat saat ada pesanan sewa lapangan baru'
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pengaturan Approval & Notifikasi Sewa Lapangan berhasil disimpan.',
      approvalFlow: nextFlow,
      recipients: nextRecipients
    })
  } catch (err) {
    console.error('[CourtRental Settings API] Unexpected error in POST:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
