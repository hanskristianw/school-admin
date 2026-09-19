import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * POST /api/email/admission/resend
 * 
 * Mengirim ulang email notifikasi pendaftaran siswa baru ke email orang tua.
 * 
 * Body:
 * {
 *   application_id: number,
 *   type?: 'payment_instruction' | 'approved' | 'rejected'
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { application_id, type = 'payment_instruction' } = body

    if (!application_id) {
      return NextResponse.json(
        { success: false, message: 'application_id wajib disertakan' },
        { status: 400 }
      )
    }

    // Ambil data pendaftar dari Supabase
    const { data: app, error: fetchErr } = await supabaseAdmin
      .from('student_applications')
      .select(`
        *,
        admission_level(level_name)
      `)
      .eq('application_id', application_id)
      .single()

    if (fetchErr || !app) {
      return NextResponse.json(
        { success: false, message: 'Data pendaftar tidak ditemukan di sistem' },
        { status: 404 }
      )
    }

    const parentEmail = (app.parent_email || '').trim().toLowerCase()
    if (!parentEmail) {
      return NextResponse.json(
        { success: false, message: 'Pendaftar ini belum memiliki alamat email orang tua yang terdaftar' },
        { status: 400 }
      )
    }

    const cleanPhoneDigits = (app.parent_phone || '').replace(/[^0-9]/g, '')
    const levelName = app.admission_level?.level_name || app.preferred_grade || 'Umum'
    const hostingUrl = app.hosting_url || 'https://ccs.sch.id/registrasi'

    let subject = ''
    let html = ''

    if (type === 'payment_instruction') {
      const templateRes = emailTemplates.admissionRegistrationPayment({
        parentName: app.parent_name || app.student_name,
        parentEmail: parentEmail,
        parentPhone: cleanPhoneDigits,
        studentName: app.student_name,
        applicationNumber: app.application_number,
        levelName: levelName,
        feeAmount: app.form_fee_amount || 250000,
        hostingUrl: hostingUrl
      })
      subject = templateRes.subject
      html = templateRes.html
    } else if (type === 'approved') {
      const templateRes = emailTemplates.admissionApproved({
        parentName: app.parent_name || 'Orang Tua / Wali Calon Siswa',
        studentName: app.student_name,
        applicationNumber: app.application_number
      })
      subject = templateRes.subject
      html = templateRes.html
    } else if (type === 'rejected') {
      const templateRes = emailTemplates.admissionRejected({
        parentName: app.parent_name || 'Orang Tua / Wali Calon Siswa',
        studentName: app.student_name,
        applicationNumber: app.application_number
      })
      subject = templateRes.subject
      html = templateRes.html
    } else {
      return NextResponse.json(
        { success: false, message: `Tipe email "${type}" tidak didukung` },
        { status: 400 }
      )
    }

    const result = await sendEmail({
      to: parentEmail,
      subject,
      html
    })

    return NextResponse.json({
      success: true,
      message: `Email notifikasi berhasil dikirim ulang ke ${parentEmail}`,
      data: {
        to: parentEmail,
        subject,
        application_number: app.application_number,
        resend_id: result?.id
      }
    })

  } catch (error) {
    console.error('Error in /api/email/admission/resend:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengirim ulang email' },
      { status: 500 }
    )
  }
}
