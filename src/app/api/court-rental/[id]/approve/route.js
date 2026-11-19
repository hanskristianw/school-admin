import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'
import {
  supabaseAdmin,
  APPROVAL_STATES_KEY,
  getCourtRentalSettings,
  saveCourtRentalSetting,
  resolveStaffUser,
  enrichBookingWithApproval,
  notifyApproversAndMarkom
} from '@/lib/courtRentalApproval'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { caller_user_id, notes = '' } = body

    const caller = await resolveStaffUser(caller_user_id)
    if (!caller || !caller.is_active || caller.is_student || caller.is_vendor) {
      return NextResponse.json(
        { success: false, message: 'Sesi pengguna tidak valid atau tidak memiliki izin approval.' },
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

    if (booking.status === 'approved') {
      return NextResponse.json({ success: false, message: 'Reservasi ini sudah berstatus Approved (Final).' }, { status: 400 })
    }
    if (booking.status === 'rejected') {
      return NextResponse.json({ success: false, message: 'Reservasi ini sudah ditolak.' }, { status: 400 })
    }

    const { approvalFlow, approvalStates, markomRecipients } = settings
    if (!approvalFlow?.approver1?.user_id || !approvalFlow?.approver2?.user_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Alur approval belum dikonfigurasi. Admin harus menetapkan User Approver 1 (Finance) dan Approver 2 (Markom) terlebih dahulu.'
        },
        { status: 400 }
      )
    }

    const enriched = enrichBookingWithApproval(booking, approvalStates)
    const now = new Date().toISOString()
    const cleanNotes = notes ? String(notes).trim() : ''
    const stateKey = String(booking.id)
    const currentState = approvalStates[stateKey] || {}

    // ─── STEP 1: FINANCE PAYMENT VERIFICATION ─────────────────────────────────
    if (enriched.approval_stage === 'awaiting_approver_1') {
      const isApp1 = Number(caller.user_id) === Number(approvalFlow.approver1.user_id)
      if (!isApp1) {
        return NextResponse.json(
          {
            success: false,
            message: `Saat ini giliran Approver 1 (${approvalFlow.approver1.full_name} — Finance) untuk mengonfirmasi dana masuk terlebih dahulu.`
          },
          { status: 403 }
        )
      }

      const step1Record = {
        status: 'approved',
        by_user_id: caller.user_id,
        by_name: caller.full_name,
        by_role: caller.role_name,
        at: now,
        notes: cleanNotes
      }

      const nextStates = {
        ...approvalStates,
        [stateKey]: {
          ...currentState,
          stage: 'awaiting_approver_2',
          step1: step1Record
        }
      }

      await saveCourtRentalSetting(
        APPROVAL_STATES_KEY,
        nextStates,
        'Riwayat status approval berjenjang Sewa Lapangan (Tahap 1 Finance -> Tahap 2 Markom)'
      )

      // Keep court_rentals.status as 'payment_uploaded' so slot remains locked & renter waits until Step 2
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('court_rentals')
        .update({ updated_at: now })
        .eq('id', id)
        .select()
        .single()

      if (updateErr) {
        return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 })
      }

      // Notify Approver 2 (Markom) + active Markom recipients that Step 1 is done
      let markomNotified = 0
      try {
        markomNotified = await notifyApproversAndMarkom({
          stage: 'step2_turn',
          booking: updated,
          primaryApprover: approvalFlow.approver2,
          step1Info: step1Record,
          extraRecipients: markomRecipients
        })
      } catch (notifyErr) {
        console.warn('[CourtRental Step 1] Failed notifying Approver 2:', notifyErr.message)
      }

      return NextResponse.json({
        success: true,
        step: 1,
        approval_stage: 'awaiting_approver_2',
        message: `Approval Tahap 1 berhasil oleh ${caller.full_name}. Menunggu Approval Tahap 2 dari ${approvalFlow.approver2.full_name} (Markom).`,
        booking: enrichBookingWithApproval(updated, nextStates),
        markomNotified
      })
    }

    // ─── STEP 2: MARKOM FINAL APPROVAL & RENTER CONFIRMATION EMAIL ────────────
    if (enriched.approval_stage === 'awaiting_approver_2') {
      const isApp2 = Number(caller.user_id) === Number(approvalFlow.approver2.user_id)
      if (!isApp2) {
        return NextResponse.json(
          {
            success: false,
            message: `Dana sudah dikonfirmasi di Tahap 1. Sekarang giliran Approver 2 (${approvalFlow.approver2.full_name} — Markom) untuk approval final.`
          },
          { status: 403 }
        )
      }

      const step1Record = currentState.step1 || {
        status: 'approved',
        by_name: approvalFlow.approver1.full_name,
        at: now
      }

      const step2Record = {
        status: 'approved',
        by_user_id: caller.user_id,
        by_name: caller.full_name,
        by_role: caller.role_name,
        at: now,
        notes: cleanNotes
      }

      const nextStates = {
        ...approvalStates,
        [stateKey]: {
          ...currentState,
          stage: 'completed',
          step1: step1Record,
          step2: step2Record
        }
      }

      const combinedApproverLabel = `1: ${step1Record.by_name} | 2: ${caller.full_name}`.slice(0, 100)

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('court_rentals')
        .update({
          status: 'approved',
          approved_by: combinedApproverLabel,
          approved_at: now,
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single()

      if (updateErr) {
        return NextResponse.json(
          { success: false, message: `Gagal menyetujui reservasi: ${updateErr.message}` },
          { status: 500 }
        )
      }

      await saveCourtRentalSetting(
        APPROVAL_STATES_KEY,
        nextStates,
        'Riwayat status approval berjenjang Sewa Lapangan (Tahap 1 Finance -> Tahap 2 Markom)'
      )

      // Send final confirmation email to renter ONLY after both Step 1 and Step 2 approve
      let emailSent = false
      let emailError = null
      if (booking.renter_email) {
        try {
          const { subject, html } = emailTemplates.courtRentalApproved({
            renterName: booking.renter_name,
            bookingCode: booking.booking_code,
            packageName: booking.package_name,
            price: Number(booking.price || 0),
            bookingDate: booking.booking_date,
            timeSlot: booking.time_slot
          })
          await sendEmail({ to: booking.renter_email, subject, html })
          emailSent = true
        } catch (e) {
          console.error('[CourtRental Approve Step 2] Email dispatch failed:', e.message)
          emailError = e.message
        }
      }

      return NextResponse.json({
        success: true,
        step: 2,
        approval_stage: 'completed',
        message: 'Approval Tahap 2 selesai. Reservasi disetujui final & email konfirmasi dikirim ke pendaftar.',
        booking: enrichBookingWithApproval(updated, nextStates),
        emailSent,
        emailError
      })
    }

    return NextResponse.json({ success: false, message: 'Status approval reservasi tidak dapat diproses.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
