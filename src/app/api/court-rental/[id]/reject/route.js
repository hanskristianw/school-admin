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
    const { reason = '', notifyEmail = true } = body

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

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('court_rentals')
      .update({
        status: 'rejected',
        admin_notes: reason,
        updated_at: new Date().toISOString()
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

    let emailSent = false
    if (notifyEmail && booking.renter_email) {
      try {
        const { subject, html } = emailTemplates.courtRentalRejected({
          renterName: booking.renter_name,
          bookingCode: booking.booking_code,
          packageName: booking.package_name,
          bookingDate: booking.booking_date,
          timeSlot: booking.time_slot,
          reason
        })

        await sendEmail({
          to: booking.renter_email,
          subject,
          html
        })
        emailSent = true
      } catch (e) {
        console.error('[CourtRental Reject] Email dispatch failed:', e.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reservasi berhasil ditolak.',
      booking: updated,
      emailSent
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
