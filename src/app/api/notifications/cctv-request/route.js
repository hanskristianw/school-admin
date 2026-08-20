import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/mailer'
import { sendGoogleChatMessage } from '@/lib/googleChat'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      type = 'cctv_created',
      requestNumber,
      requesterUserId,
      requesterName,
      cctvDate,
      startTime,
      endTime,
      roomName,
      reason,
      unitId,
      unitName,
      incidentReportId,
      incidentNumber,
      status,
      reviewerNotes
    } = body

    if (!requestNumber || !roomName) {
      return NextResponse.json(
        { success: false, message: 'Missing required CCTV request parameters' },
        { status: 400 }
      )
    }

    // DEBUG MODE FLAG: Set to false for Production mode so notifications go to actual requesters & unit principals
    const IS_DEBUG_MODE = false
    const DEBUG_RECIPIENT_EMAIL = 'hans@ccs.sch.id'

    // ─────────────────────────────────────────────────────────────
    // 1. RESOLVE ACCURATE USER & UNIT FROM SUPABASE DB
    // ─────────────────────────────────────────────────────────────
    let resolvedRequesterName = requesterName
    let resolvedRequesterEmail = null
    let resolvedUnitName = unitName
    let resolvedUnitId = unitId
    let resolvedIncidentNumber = incidentNumber

    // Step A: Fetch Requester user details from DB
    if (requesterUserId) {
      try {
        const { data: userDb, error: uErr } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang, user_email, user_unit_id')
          .eq('user_id', requesterUserId)
          .single()

        if (uErr) {
          console.warn('[CCTV Notification] User fetch error:', uErr)
        } else if (userDb) {
          const dbFullName = `${userDb.user_nama_depan || ''} ${userDb.user_nama_belakang || ''}`.trim()
          if (dbFullName) resolvedRequesterName = dbFullName
          else if (userDb.user_email) resolvedRequesterName = userDb.user_email

          if (userDb.user_email) resolvedRequesterEmail = userDb.user_email
          if (!resolvedUnitId && userDb.user_unit_id) resolvedUnitId = userDb.user_unit_id
        }
      } catch (uErr) {
        console.warn('[CCTV Notification] Could not fetch requester user from DB:', uErr)
      }
    }

    // Step B: Fetch Linked Incident Report from DB
    if (incidentReportId) {
      try {
        const { data: incDb, error: iErr } = await supabase
          .from('incident_reports')
          .select('id, incident_number, unit_id')
          .eq('id', incidentReportId)
          .single()

        if (iErr) {
          console.warn('[CCTV Notification] Incident fetch error:', iErr)
        } else if (incDb) {
          if (incDb.incident_number) resolvedIncidentNumber = incDb.incident_number
          if (!resolvedUnitId && incDb.unit_id) resolvedUnitId = incDb.unit_id
        }
      } catch (iErr) {
        console.warn('[CCTV Notification] Could not fetch incident report from DB:', iErr)
      }
    }

    // Step C: Fetch Unit Name from DB using resolvedUnitId
    if (resolvedUnitId) {
      try {
        const { data: unitDb, error: unErr } = await supabase
          .from('unit')
          .select('unit_id, unit_name')
          .eq('unit_id', resolvedUnitId)
          .single()

        if (unErr) {
          console.warn('[CCTV Notification] Unit fetch error:', unErr)
        } else if (unitDb && unitDb.unit_name) {
          resolvedUnitName = unitDb.unit_name
        }
      } catch (unErr) {
        console.warn('[CCTV Notification] Could not fetch unit from DB:', unErr)
      }
    }

    // Fallbacks if still undefined
    if (!resolvedRequesterName || resolvedRequesterName === 'Staff') {
      resolvedRequesterName = 'School Staff'
    }
    if (!resolvedUnitName || resolvedUnitName === 'School Unit') {
      resolvedUnitName = 'General Unit'
    }

    let targetEmail = DEBUG_RECIPIENT_EMAIL
    let emailSubject = ''
    let emailHtml = ''
    let gchatMessage = ''

    // ─────────────────────────────────────────────────────────────
    // EVENT 2: STATUS UPDATED (Notify Requester)
    // ─────────────────────────────────────────────────────────────
    if (type === 'status_updated') {
      const realTargetEmail = resolvedRequesterEmail || DEBUG_RECIPIENT_EMAIL
      targetEmail = IS_DEBUG_MODE ? DEBUG_RECIPIENT_EMAIL : realTargetEmail
      const displayStatus = (status || 'updated').toUpperCase()

      emailSubject = `[CCTV Request Update] Request ${requestNumber} Status: ${displayStatus}`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; background-color: #ffffff;">
          <div style="background-color: #2563eb; color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px; font-weight: bold;">CCTV Request Status Update</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Request Code: <strong>${requestNumber}</strong></p>
          </div>

          <p style="font-size: 14px; color: #374151;">Dear <strong>${resolvedRequesterName}</strong>,</p>
          <p style="font-size: 14px; color: #374151;">The status of your CCTV footage request for <strong>${roomName}</strong> has been updated by Principal / School Administration.</p>

          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 40%;">Updated Status:</td>
                <td style="padding: 6px 0;"><span style="font-weight: bold; padding: 3px 8px; border-radius: 4px; background: #dbeafe; color: #1e40af;">${displayStatus}</span></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Footage Date:</td>
                <td style="padding: 6px 0;">${cctvDate || '-'} ${startTime && endTime ? `(${startTime} – ${endTime})` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Requested Location:</td>
                <td style="padding: 6px 0;"><strong>${roomName}</strong></td>
              </tr>
              ${reviewerNotes ? `
              <tr>
                <td style="padding: 6px 0; font-weight: bold; vertical-align: top;">Reviewer Notes / Link:</td>
                <td style="padding: 6px 0; color: #0f172a; white-space: pre-wrap;">${reviewerNotes}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${IS_DEBUG_MODE ? `
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 10px 14px; border-radius: 6px; font-size: 11px; color: #92400e; margin-bottom: 20px;">
            [DEBUG MODE ACTIVE] This notification was directed to <code>${DEBUG_RECIPIENT_EMAIL}</code> for testing. In production, it will be delivered to <strong>${resolvedRequesterName}</strong> (${realTargetEmail}).
          </div>
          ` : ''}

          <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
            This is an automated notification from Chung Chung School Admin System.
          </p>
        </div>
      `

      gchatMessage = `*CCTV REQUEST STATUS UPDATE*\n` +
        `*Code:* ${requestNumber}\n` +
        `*Status:* ${displayStatus}\n` +
        `*Location:* ${roomName}\n` +
        `*Date:* ${cctvDate || '-'} (${startTime || ''} - ${endTime || ''})\n` +
        (reviewerNotes ? `*Notes / Link:* ${reviewerNotes}\n` : '') +
        (IS_DEBUG_MODE ? `\n_[DEBUG MODE: Sent to ${DEBUG_RECIPIENT_EMAIL}]_` : '')

    } else {
      // ─────────────────────────────────────────────────────────────
      // EVENT 1: NEW CCTV REQUEST (Notify Principal of Unit)
      // ─────────────────────────────────────────────────────────────
      let principalName = 'Principal'

      if (!IS_DEBUG_MODE && resolvedUnitId) {
        try {
          const { data: pRoles } = await supabase
            .from('role')
            .select('role_id')
            .or('is_principal.eq.true,role_name.ilike.%principal%')

          const roleIds = pRoles?.map(r => r.role_id) || []

          if (roleIds.length > 0) {
            const { data: principalUser } = await supabase
              .from('users')
              .select('user_id, user_email, user_nama_depan, user_nama_belakang')
              .eq('user_unit_id', resolvedUnitId)
              .in('user_role_id', roleIds)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle()

            if (principalUser && principalUser.user_email) {
              targetEmail = principalUser.user_email
              principalName = `${principalUser.user_nama_depan || ''} ${principalUser.user_nama_belakang || ''}`.trim() || 'Principal'
            }
          }
        } catch (pErr) {
          console.warn('[CCTV Notification] Error resolving Principal email:', pErr)
        }
      }

      emailSubject = `[CCTV Request] New CCTV Footage Request: ${requestNumber} (${resolvedUnitName})`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; background-color: #ffffff;">
          <div style="background-color: #1e3a8a; color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px; font-weight: bold;">CCTV Footage Request</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Request Code: <strong>${requestNumber}</strong></p>
          </div>

          <p style="font-size: 14px; color: #374151;">Dear ${IS_DEBUG_MODE ? 'Hans (Debug Recipient)' : principalName},</p>
          <p style="font-size: 14px; color: #374151;">A new request to review CCTV security camera footage has been submitted by <strong>${resolvedRequesterName}</strong> for unit <strong>${resolvedUnitName}</strong>.</p>

          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 40%;">Footage Date:</td>
                <td style="padding: 6px 0;">${cctvDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Time Range:</td>
                <td style="padding: 6px 0;">${startTime} – ${endTime}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Requested Location:</td>
                <td style="padding: 6px 0;"><strong>${roomName}</strong></td>
              </tr>
              ${resolvedIncidentNumber ? `
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Linked Incident:</td>
                <td style="padding: 6px 0;">${resolvedIncidentNumber}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; font-weight: bold; vertical-align: top;">Reason / Purpose:</td>
                <td style="padding: 6px 0;">${reason}</td>
              </tr>
            </table>
          </div>

          ${IS_DEBUG_MODE ? `
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 10px 14px; border-radius: 6px; font-size: 11px; color: #92400e; margin-bottom: 20px;">
            [DEBUG MODE ACTIVE] This notification was directed to <code>${DEBUG_RECIPIENT_EMAIL}</code> for testing. In production, it will be delivered to the Principal of <strong>${resolvedUnitName}</strong>.
          </div>
          ` : ''}

          <p style="font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
            This is an automated notification from Chung Chung School Admin System.
          </p>
        </div>
      `

      gchatMessage = `*NEW CCTV FOOTAGE REQUEST*\n` +
        `*Code:* ${requestNumber}\n` +
        `*Unit:* ${resolvedUnitName}\n` +
        `*Requester:* ${resolvedRequesterName}\n` +
        `*Date:* ${cctvDate} (${startTime} - ${endTime})\n` +
        `*Location:* ${roomName}\n` +
        (resolvedIncidentNumber ? `*Linked Incident:* ${resolvedIncidentNumber}\n` : '') +
        `*Reason:* ${reason}\n` +
        (IS_DEBUG_MODE ? `\n_[DEBUG MODE: Sent to ${DEBUG_RECIPIENT_EMAIL}]_` : '')
    }

    // ─────────────────────────────────────────────────────────────
    // 3. SEND NOTIFICATIONS VIA RESEND & GOOGLE CHAT DM
    // ─────────────────────────────────────────────────────────────
    let emailStatus = { sent: false }
    let gchatStatus = { sent: false }

    // 1. Send Email
    try {
      await sendEmail({
        to: targetEmail,
        subject: emailSubject,
        html: emailHtml
      })
      emailStatus.sent = true
      console.log(`[CCTV Notification] Email sent successfully to ${targetEmail}`)
    } catch (eErr) {
      console.error('[CCTV Notification] Failed to send email:', eErr.message)
      emailStatus.error = eErr.message
    }

    // 2. Send Google Chat Direct Message
    try {
      await sendGoogleChatMessage(targetEmail, gchatMessage)
      gchatStatus.sent = true
      console.log(`[CCTV Notification] Google Chat DM sent successfully to ${targetEmail}`)
    } catch (gErr) {
      console.error('[CCTV Notification] Failed to send Google Chat message:', gErr.message)
      gchatStatus.error = gErr.message
    }

    return NextResponse.json({
      success: true,
      type,
      debugMode: IS_DEBUG_MODE,
      recipient: targetEmail,
      requester: resolvedRequesterName,
      unit: resolvedUnitName,
      email: emailStatus,
      googleChat: gchatStatus
    })

  } catch (err) {
    console.error('[CCTV Notification Route Error]:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
