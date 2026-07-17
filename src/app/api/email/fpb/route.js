import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'

/**
 * POST /api/email/fpb
 *
 * Send FPB workflow email notifications.
 * Body:
 *   type         — 'fpbPendingApproval' | 'fpbApproved' | 'fpbRevision' | 'fpbRejected'
 *   to           — recipient email address
 *   [templateParams] — all other fields passed to the template function
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { type, to, ...params } = body

    if (!to || !type) {
      return NextResponse.json(
        { success: false, message: 'to dan type wajib diisi' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { success: false, message: 'Format email tidak valid' },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      console.warn('[FPB Email] RESEND_API_KEY or RESEND_FROM_EMAIL not set — skipping.')
      return NextResponse.json(
        { success: false, message: 'Email notification not configured' },
        { status: 503 }
      )
    }

    const templateFn = emailTemplates[type]
    if (!templateFn) {
      return NextResponse.json(
        { success: false, message: `Template "${type}" tidak ditemukan` },
        { status: 400 }
      )
    }

    const { subject, html } = templateFn(params)

    const result = await sendEmail({ to, subject, html })

    return NextResponse.json({
      success: true,
      message: 'Email FPB terkirim',
      detail: result
    })
  } catch (error) {
    console.error('[FPB Email] Error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
