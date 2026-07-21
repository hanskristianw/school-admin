import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'
import { sendGoogleChatMessage } from '@/lib/googleChat'

function buildGoogleChatMessage(type, params) {
  const { fpbNumber, fpbType, appUrl } = params;
  const fmtCurrency = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const link = appUrl || 'https://manageccs.online/data/fpb';
  
  if (type === 'fpbPendingApproval') {
    return `Hi *${params.approverName}*,\n\nA new Purchase Request Form (FPB) requires your action at the *${params.stepName}* stage.\n\n*FPB Number:* ${fpbNumber}\n*Type:* ${fpbType || '-'}\n*Requested By:* ${params.submitterName}\n*Division:* ${params.division || '-'}\n*Total Amount:* ${fmtCurrency(params.grandTotal)}\n\nPlease review it here: ${link}`;
  }
  if (type === 'fpbApproved') {
    return `Hi *${params.submitterName}*,\n\nCongratulations! Your FPB *${fpbNumber}* (${fpbType || '-'}) with a total amount of ${fmtCurrency(params.grandTotal)} has been fully *APPROVED*.\n\nView details here: ${link}`;
  }
  if (type === 'fpbRevision') {
    return `Hi *${params.submitterName}*,\n\nYour FPB *${fpbNumber}* (${fpbType || '-'}) has been returned for *REVISION* by ${params.approverName}.\n\n*Approver's Note:*\n${params.comment || '-'}\n\nPlease update and resubmit here: ${link}`;
  }
  if (type === 'fpbRejected') {
    return `Hi *${params.submitterName}*,\n\nYour FPB *${fpbNumber}* (${fpbType || '-'}) has been *REJECTED* by ${params.approverName} and cannot be processed.\n\n*Reason for Rejection:*\n${params.comment || '-'}\n\nView details here: ${link}`;
  }
  return null;
}

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

    // -- Send Google Chat Notification --
    try {
      const chatText = buildGoogleChatMessage(type, params)
      if (chatText) {
        await sendGoogleChatMessage(to, chatText)
        console.log(`[FPB Chat] Sent to ${to}`)
      }
    } catch (chatErr) {
      console.error(`[FPB Chat] Failed to send chat to ${to}:`, chatErr.message)
      // Do not throw; we still want to report the email as successful
    }

    return NextResponse.json({
      success: true,
      message: 'Email & Chat FPB terkirim',
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
