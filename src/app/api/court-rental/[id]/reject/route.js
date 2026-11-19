import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'
import {
  supabaseAdmin,
  APPROVAL_STATES_KEY,
  getCourtRentalSettings,
  saveCourtRentalSetting,
  resolveStaffUser,
  enrichBookingWithApproval
} from '@/lib/courtRentalApproval'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { caller_user_id, reason = '', notifyEmail = true } = body

    const caller = await resolveStaffUser(caller_user_id)
    if (!caller || !caller.is_active || caller.is_student || caller.is_vendor) {
      return NextResponse.json(
        { success: false, message: 'Sesi pengguna tidak valid atau tidak memiliki izin penolakan.' },
        { status: 401 }
      )
    }

    const [{ data: booking, error: fetchErr }, settings] = await Promise.all([
      supabaseAdmin.from('court_rentals').select('*').eq('id', id).single(),
      getCourtRentalSettings()
    ])

    if (fetchErr || !booking) {
      return NextResponse.json({ success: false, message: 'Data reservasi tidak ditemukan' }, { status: 404 })
    }

    const { approvalFlow, approvalStates } = settings
    const enriched = enrichBookingWithApproval(booking, approvalStates)
    const stageStep = enriched.approval_stage === 'awaiting_approver_2' ? 2 : 1

    const isStageApprover =
      (stageStep === 1 && Number(caller.user_id) === Number(approvalFlow?.approver1?.user_id)) ||
      (stageStep === 2 && Number(caller.user_id) === Number(approvalFlow?.approver2?.user_id))

    if (!isStageApprover) {
      const expectedName = stageStep === 1 ? approvalFlow?.approver1?.full_name : approvalFlow?.approver2?.full_name
      return NextResponse.json(
        { success: false, message: `Hanya Approver aktif pada Tahap ${stageStep} (${expectedName || '-'}) yang dapat menolak reservasi ini.` },
        { status: 403 }
      )
    }

    const cleanReason = reason ? String(reason).trim() : ''
    const noteWithAudit = cleanReason
      ? `[Ditolak Tahap ${stageStep} oleh ${caller.full_name}] ${cleanReason}`
      : `[Ditolak Tahap ${stageStep} oleh ${caller.full_name}]`
    const now = new Date().toISOString()

    // Update status to rejected so slot immediately reopens
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('court_rentals')
      .update({
        status: 'rejected',
        admin_notes: noteWithAudit,
        updated_at: now
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json(
        { success: false, message: `Gagal menolak reservasi: ${updateErr.message}` },
        { status: 500 }
      )
    }

    const stateKey = String(booking.id)
    const currentState = approvalStates[stateKey] || {}
    const nextStates = {
      ...approvalStates,
      [stateKey]: {
        ...currentState,
        stage: 'rejected',
        rejected: {
          step: stageStep,
          by_user_id: caller.user_id,
          by_name: caller.full_name,
          by_role: caller.role_name,
          at: now,
          reason: cleanReason
        }
      }
    }

    await saveCourtRentalSetting(
      APPROVAL_STATES_KEY,
      nextStates,
      'Riwayat status approval berjenjang Sewa Lapangan (Tahap 1 Finance -> Tahap 2 Markom)'
    )

    let emailSent = false
    if (notifyEmail && booking.renter_email) {
      try {
        const { subject, html } = emailTemplates.courtRentalRejected({
          renterName: booking.renter_name,
          bookingCode: booking.booking_code,
          packageName: booking.package_name,
          bookingDate: booking.booking_date,
          timeSlot: booking.time_slot,
          reason: cleanReason
        })
        await sendEmail({ to: booking.renter_email, subject, html })
        emailSent = true
      } catch (e) {
        console.error('[CourtRental Reject] Email dispatch failed:', e.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reservasi berhasil ditolak.',
      booking: enrichBookingWithApproval(updated, nextStates),
      emailSent
    })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
