import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'

/**
 * POST /api/email/admission
 * 
 * Send admission email notification via Resend
 * Body: { type, parentName, studentName, applicationNumber, schoolName, email }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { type, parentName, studentName, applicationNumber, schoolName, email } = body

    if (!email || !type) {
      return NextResponse.json(
        { success: false, message: 'email dan type wajib diisi' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Format email tidak valid' },
        { status: 400 }
      )
    }

    // Check env vars
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      console.warn('⚠️ RESEND_API_KEY or RESEND_FROM_EMAIL not set')
      return NextResponse.json(
        { success: false, message: 'Email notification not configured' },
        { status: 503 }
      )
    }

    // Build email from template
    const templateFn = emailTemplates[type]
    if (!templateFn) {
      return NextResponse.json(
        { success: false, message: `Template "${type}" tidak ditemukan` },
        { status: 400 }
      )
    }

    const { subject, html } = templateFn({ parentName, studentName, applicationNumber, schoolName })

    const result = await sendEmail({
      to: email,
      subject,
      html
    })

    return NextResponse.json({
      success: true,
      message: 'Email notifikasi terkirim',
      detail: result
    })

  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
