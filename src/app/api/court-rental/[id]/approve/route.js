import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { adminName = 'Admin Sarpras CCS' } = body

    // 1. Ambil data booking
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('court_rentals')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !booking) {
      return NextResponse.json(
        { success: false, message: 'Data reservasi tidak ditemukan' },
        { status: 404 }
      )
    }

    // 2. Update status ke approved
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('court_rentals')
      .update({
        status: 'approved',
        approved_by: adminName,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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

    // 3. Kirim Email Konfirmasi Resmi ke Penyewa via Resend
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

        await sendEmail({
          to: booking.renter_email,
          subject,
          html
        })
        emailSent = true
      } catch (e) {
        console.error('[CourtRental Approve] Email dispatch failed:', e.message)
        emailError = e.message
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reservasi berhasil disetujui.',
      booking: updated,
      emailSent,
      emailError
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
