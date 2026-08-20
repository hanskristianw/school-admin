import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/mailer'
import { sendGoogleChatMessage } from '@/lib/googleChat'

export async function POST(request) {
  try {
    const body = await request.json()
    const { type, incidentId, followupId } = body

    if (!type || !incidentId) {
      return NextResponse.json(
        { success: false, message: 'type and incidentId are required' },
        { status: 400 }
      )
    }

    // 1. Fetch incident report details
    const { data: incident, error: incErr } = await supabase
      .from('incident_reports')
      .select(`
        *,
        student:student_user_id(user_id, user_nama_depan, user_nama_belakang),
        reporter:reporter_user_id(user_id, user_nama_depan, user_nama_belakang, user_email),
        unit:unit_id(unit_id, unit_name)
      `)
      .eq('id', incidentId)
      .single()

    if (incErr || !incident) {
      console.error('[Incident Notification] Incident report not found:', incErr)
      return NextResponse.json(
        { success: false, message: 'Incident report not found' },
        { status: 404 }
      )
    }

    // 2. Collect unit IDs for all involved students (primary student + co-involved students)
    const unitIds = new Set()
    if (incident.unit_id) unitIds.add(incident.unit_id)

    // Option A: Check studentUserIds passed in request body
    if (body.studentUserIds && Array.isArray(body.studentUserIds) && body.studentUserIds.length > 0) {
      try {
        const { data: stdUsers } = await supabase
          .from('users')
          .select('user_unit_id')
          .in('user_id', body.studentUserIds)

        if (stdUsers && stdUsers.length > 0) {
          stdUsers.forEach(u => {
            if (u.user_unit_id) unitIds.add(u.user_unit_id)
          })
        }
      } catch (suErr) {
        console.warn('[Incident Notification] Error fetching studentUserIds from users table:', suErr)
      }
    }

    // Option B: Query junction table for all involved students' units (using correct column name user_unit_id)
    try {
      const { data: stRel } = await supabase
        .from('incident_report_students')
        .select('student_user_id, student:student_user_id(user_unit_id)')
        .eq('incident_id', incidentId)

      if (stRel && stRel.length > 0) {
        stRel.forEach(r => {
          if (r.student?.user_unit_id) unitIds.add(r.student.user_unit_id)
        })
      }
    } catch (e) {
      console.warn('[Incident Notification] Could not fetch multi-student units from junction table:', e)
    }

    const unitIdsArray = Array.from(unitIds)
    const { data: recipients } = await supabase
      .from('incident_unit_recipients')
      .select(`
        unit_id,
        user:user_id(user_id, user_email, user_nama_depan, user_nama_belakang)
      `)
      .in('unit_id', unitIdsArray.length > 0 ? unitIdsArray : [-1])

    // 3. Determine recipient email addresses based on notification type
    const recipientEmailsSet = new Set()

    if (type === 'new_followup' || type === 'followup_added') {
      // Follow-up / Solution added -> Notify Pelapor (Reporter) ONLY
      const reporterEmail = incident.reporter?.user_email
      if (reporterEmail && reporterEmail.includes('@')) {
        recipientEmailsSet.add(reporterEmail)
      }
    } else {
      // New report creation -> Notify Unit team recipients (approvers)
      if (recipients && recipients.length > 0) {
        recipients.forEach(r => {
          if (r.user?.user_email && r.user.user_email.includes('@')) {
            recipientEmailsSet.add(r.user.user_email)
          }
        })
      }
    }

    const recipientEmails = Array.from(recipientEmailsSet)

    if (recipientEmails.length === 0) {
      console.log(`[Incident Notification] No recipient emails found for type: ${type}`)
      return NextResponse.json({ success: true, message: 'No recipient email addresses found' })
    }

    // 3. Build email & chat message content (Format: Student A (Unit A), Student B (Unit B))
    const allStudentUserIdsSet = new Set()
    if (incident.student_user_id) allStudentUserIdsSet.add(incident.student_user_id)
    if (body.studentUserIds && Array.isArray(body.studentUserIds)) {
      body.studentUserIds.forEach(id => {
        if (id) allStudentUserIdsSet.add(id)
      })
    }

    try {
      const { data: stRel } = await supabase
        .from('incident_report_students')
        .select('student_user_id')
        .eq('incident_id', incidentId)

      if (stRel && stRel.length > 0) {
        stRel.forEach(r => {
          if (r.student_user_id) allStudentUserIdsSet.add(r.student_user_id)
        })
      }
    } catch (e) {
      console.warn('[Incident Notification] Error fetching student IDs from junction table:', e)
    }

    const allStudentUserIds = Array.from(allStudentUserIdsSet)
    let formattedStudentsList = []

    if (allStudentUserIds.length > 0) {
      try {
        const { data: stUsers } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang, user_unit_id')
          .in('user_id', allStudentUserIds)

        if (stUsers && stUsers.length > 0) {
          const unitIdsToFetch = Array.from(new Set(stUsers.map(u => u.user_unit_id).filter(Boolean)))
          const { data: unitsData } = await supabase
            .from('unit')
            .select('unit_id, unit_name')
            .in('unit_id', unitIdsToFetch.length > 0 ? unitIdsToFetch : [-1])

          const unitMap = new Map()
          if (unitsData) {
            unitsData.forEach(u => unitMap.set(u.unit_id, u.unit_name))
          }

          formattedStudentsList = stUsers.map(u => {
            const name = `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim() || 'Student'
            const uName = unitMap.get(u.user_unit_id)
            if (uName) {
              return `${name} (${uName})`
            }
            return name
          })
        }
      } catch (uErr) {
        console.warn('[Incident Notification] Error querying student user details:', uErr)
      }
    }

    // Fallback if list is empty or details missing
    if (formattedStudentsList.length === 0) {
      if (body.studentName && typeof body.studentName === 'string' && body.studentName.trim()) {
        formattedStudentsList = body.studentName.trim().split(',').map(s => s.trim()).filter(Boolean)
      } else if (incident.description && incident.description.includes('👥 All Involved Students:')) {
        const matchSt = incident.description.match(/👥 All Involved Students:\s*([^\n]+)/)
        if (matchSt && matchSt[1]) {
          formattedStudentsList = matchSt[1].trim().split(',').map(s => s.trim()).filter(Boolean)
        }
      }
    }

    if (formattedStudentsList.length === 0) {
      const pName = `${incident.student?.user_nama_depan || ''} ${incident.student?.user_nama_belakang || ''}`.trim() || 'Student'
      const pUnit = incident.unit?.unit_name
      formattedStudentsList = [pUnit ? `${pName} (${pUnit})` : pName]
    }

    const studentName = formattedStudentsList.join(', ')
    const reporterName = `${incident.reporter?.user_nama_depan || ''} ${incident.reporter?.user_nama_belakang || ''}`.trim() || 'Teacher'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://manageccs.online'

    let subject = ''
    let htmlContent = ''
    let chatText = ''

    if (type === 'new_report' || type === 'incident_created') {
      const detailLink = `${appUrl}/data/incident-report-approval`
      subject = `[NEW INCIDENT REPORT] ${incident.title} - ${studentName}`
      
      htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #ef4444; color: #ffffff; padding: 16px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">🚨 New Student Incident Report</h2>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <p>A new student incident report has been logged and requires your attention.</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Incident Code:</td><td>${incident.incident_number || `#${incident.id}`}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Title:</td><td>${incident.title}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Involved Student(s):</td><td><strong>${studentName}</strong></td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Location:</td><td>${incident.place_of_incident || '-'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Date & Time:</td><td>${incident.incident_date} at ${incident.incident_time}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Incident Level:</td><td>${incident.incident_record || 'Level 1'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Reported By:</td><td>${reporterName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Status:</td><td><span style="background-color: #fef08a; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">WAITING</span></td></tr>
            </table>

            <div style="background-color: #f8fafc; padding: 14px; border-left: 4px solid #ef4444; margin-bottom: 16px; border-radius: 4px;">
              <h4 style="margin: 0 0 8px 0; color: #1e293b;">Case Description:</h4>
              <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">${incident.description}</p>
            </div>

            <div style="background-color: #f8fafc; padding: 14px; border-left: 4px solid #3b82f6; margin-bottom: 20px; border-radius: 4px;">
              <h4 style="margin: 0 0 8px 0; color: #1e293b;">Things Done by Teacher:</h4>
              <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">${incident.action_taken || '-'}</p>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${detailLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">View Report & Follow-up</a>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
            School Admin System — Incident Report Module
          </div>
        </div>
      `

      chatText = `🚨 *NEW INCIDENT REPORT*\n\n*Title:* ${incident.title}\n*Involved Student(s):* ${studentName}\n*Location:* ${incident.place_of_incident || '-'}\n*Incident Level:* ${incident.incident_record || 'Level 1'}\n*Date/Time:* ${incident.incident_date} ${incident.incident_time}\n*Reported By:* ${reporterName}\n\n*Description:*\n${incident.description}\n\n*Teacher's Action:*\n${incident.action_taken || '-'}\n\n*View Report & Add Follow-up:* ${detailLink}`
    
    } else if (type === 'new_followup' || type === 'followup_added') {
      let followupInfo = null
      let fId = followupId || body.followupId

      if (fId) {
        try {
          const { data: fData } = await supabase
            .from('incident_followups')
            .select('*, user:user_id(user_nama_depan, user_nama_belakang)')
            .eq('id', fId)
            .single()
          followupInfo = fData
        } catch (fErr) {
          console.warn('[Incident Notification] Error fetching specified followup ID:', fErr)
        }
      }

      if (!followupInfo) {
        try {
          const { data: latestF } = await supabase
            .from('incident_followups')
            .select('*, user:user_id(user_nama_depan, user_nama_belakang)')
            .eq('incident_id', incidentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (latestF) followupInfo = latestF
        } catch (lErr) {
          console.warn('[Incident Notification] Error fetching latest followup:', lErr)
        }
      }

      const actionDetailsText = body.actionDetails || body.action_details || followupInfo?.action_details || '-'
      const locationText = body.location || followupInfo?.location || '-'
      const followupDateText = body.followupDate || followupInfo?.followup_date || incident.incident_date
      const followupTimeText = followupInfo?.followup_time || ''
      const attachmentUrlText = body.attachmentUrl || body.attachment_url || followupInfo?.attachment_url || null

      const handlerName = followupInfo?.user 
        ? `${followupInfo.user.user_nama_depan || ''} ${followupInfo.user.user_nama_belakang || ''}`.trim() 
        : (body.handlerName || 'Staff/Counselor')

      const rawStatus = body.resultingStatus || body.resulting_status || followupInfo?.resulting_status || incident.status || 'IN_PROGRESS'
      const statusUpper = rawStatus.replace(/_/g, ' ').toUpperCase().replace('ON PROGRESS', 'IN PROGRESS')

      const detailLink = `${appUrl}/data/incident-report`
      subject = `[INCIDENT FOLLOW-UP UPDATE] ${incident.title} - ${studentName}`
      
      htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #2563eb; color: #ffffff; padding: 16px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">📝 Incident Report Follow-up Update</h2>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <p>A new follow-up action has been recorded for incident report <strong>${incident.incident_number || `#${incident.id}`}</strong>.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Title:</td><td>${incident.title}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Involved Student(s):</td><td><strong>${studentName}</strong></td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Follow-up Date:</td><td>${followupDateText} ${followupTimeText}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Handled By:</td><td>${handlerName}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Location:</td><td>${locationText}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Updated Status:</td><td><span style="background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${statusUpper}</span></td></tr>
            </table>

            <div style="background-color: #eff6ff; padding: 14px; border-left: 4px solid #2563eb; margin-bottom: 20px; border-radius: 4px;">
              <h4 style="margin: 0 0 8px 0; color: #1e3a8a;">Action Taken / Feedback:</h4>
              <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">${actionDetailsText}</p>
              ${attachmentUrlText ? `
                <div style="margin-top: 14px; pt-3; border-top: 1px solid #cbd5e1;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; color: #1e3a8a;">📷 Image Attachment:</p>
                  <a href="${attachmentUrlText}" target="_blank">
                    <img src="${attachmentUrlText}" alt="Follow-up Attachment" style="max-width: 100%; max-height: 280px; border-radius: 6px; border: 1px solid #cbd5e1; object-fit: contain;" />
                  </a>
                </div>
              ` : ''}
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${detailLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">View Full Timeline & Details</a>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
            School Admin System — Incident Report Module
          </div>
        </div>
      `

      chatText = `📝 *INCIDENT FOLLOW-UP UPDATE*\n\n*Incident:* ${incident.title} (${incident.incident_number || `#${incident.id}`})\n*Student:* ${studentName}\n*Handled By:* ${handlerName}\n*Location:* ${locationText}\n*Status:* ${statusUpper}\n\n*Action / Feedback:*\n${actionDetailsText}${attachmentUrlText ? `\n\n*Attachment:* ${attachmentUrlText}` : ''}\n\n*View Details:* ${detailLink}`
    }

    // 4. Send Email notifications to all configured recipient emails
    let emailsSentCount = 0
    for (const toEmail of recipientEmails) {
      try {
        await sendEmail({
          to: toEmail,
          subject,
          html: htmlContent
        })
        emailsSentCount++
      } catch (eErr) {
        console.error(`[Incident Notification] Failed to send email to ${toEmail}:`, eErr)
      }
    }

    // 5. Send Google Chat Notification (Webhook or DM)
    const chatWebhookUrl = process.env.GOOGLE_CHAT_INCIDENT_WEBHOOK_URL || process.env.GOOGLE_CHAT_WEBHOOK_URL
    let chatSent = false

    if (chatWebhookUrl) {
      try {
        await sendGoogleChatMessage(chatWebhookUrl, chatText)
        chatSent = true
      } catch (cErr) {
        console.error('[Incident Notification] Google Chat webhook failed:', cErr)
      }
    } else {
      // Send DM via Google Chat API to recipient emails
      for (const toEmail of recipientEmails) {
        try {
          await sendGoogleChatMessage(toEmail, chatText)
          chatSent = true
        } catch (cErr) {
          console.error(`[Incident Notification] Google Chat DM to ${toEmail} failed:`, cErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      recipientsCount: recipientEmails.length,
      emailsSent: emailsSentCount,
      chatSent
    })

  } catch (err) {
    console.error('[Incident Notification API Error]:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
