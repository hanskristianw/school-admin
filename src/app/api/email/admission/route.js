import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * POST /api/email/admission
 * 
 * Kirim email notifikasi admisi via Resend dan catat ke database / log
 * Body: {
 *   type, parentName, studentName, applicationNumber, applicationId, schoolName,
 *   email, levelName, feeAmount, hostingUrl, testDate, testSession,
 *   interviewDate, interviewSession, scheduleNotes, adminNotes, step
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      type,
      parentName,
      studentName,
      applicationNumber,
      applicationId,
      schoolName,
      email,
      levelName,
      feeAmount,
      hostingUrl,
      testDate,
      testSession,
      interviewDate,
      interviewSession,
      scheduleNotes,
      adminNotes,
      step
    } = body

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

    const { subject, html } = templateFn({
      parentName,
      parentEmail: email,
      parentPhone: body.parentPhone || body.phone || '',
      studentName,
      applicationNumber,
      schoolName,
      levelName,
      feeAmount,
      hostingUrl,
      testDate,
      testSession,
      interviewDate,
      interviewSession,
      scheduleNotes,
      adminNotes
    })

    const result = await sendEmail({
      to: email,
      subject,
      html
    })

    // Pencatatan ke audit trail / tabel student_applications (non-blocking)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const now = new Date().toISOString()
        
        // 1. Log ke tabel admission_email_logs
        await supabaseAdmin.from('admission_email_logs').insert({
          application_id: applicationId || null,
          application_number: applicationNumber || null,
          recipient_email: email,
          recipient_name: parentName || null,
          email_step: step || null,
          email_type: type,
          subject,
          status: result?.id ? 'sent' : 'delivered',
          resend_id: result?.id || null,
          metadata: {
            studentName,
            levelName,
            feeAmount,
            testDate,
            interviewDate
          }
        })

        // 2. Update status pengiriman email di tabel student_applications jika ada applicationId
        if (applicationId || applicationNumber) {
          const updatePayload = {
            last_email_sent_type: type
          }
          if (step === 1 || type === 'admissionRegistrationPayment') updatePayload.step1_email_sent_at = now
          if (step === 2 || type === 'formFeeVerified') updatePayload.step2_email_sent_at = now
          if (step === 3 || type === 'placementTestSchedule') updatePayload.step3_email_sent_at = now
          if (step === 4) updatePayload.step4_email_sent_at = now
          if (step === 5 || type === 'admissionApproved' || type === 'admissionRejected') {
            updatePayload.step5_email_sent_at = now
            if (type === 'admissionApproved') updatePayload.status = 'approved'
            if (type === 'admissionRejected') updatePayload.status = 'rejected'
            if (adminNotes) updatePayload.admin_notes = adminNotes
            if (body.reviewerId) updatePayload.reviewed_by = body.reviewerId
            updatePayload.reviewed_at = now
          }

          const query = applicationId
            ? supabaseAdmin.from('student_applications').update(updatePayload).eq('application_id', applicationId)
            : supabaseAdmin.from('student_applications').update(updatePayload).eq('application_number', applicationNumber)
          
          await query
        }
      } catch (logErr) {
        console.warn('Logging email to database skipped/failed (non-critical):', logErr.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email notifikasi berhasil dikirimkan',
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
