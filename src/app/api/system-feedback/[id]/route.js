import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendGoogleChatMessage } from '@/lib/googleChat'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// PATCH /api/system-feedback/[id]
// Allows changing status, admin_notes, priority, or user editing title/description
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, admin_notes, priority, title, description } = body

    const updates = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) {
      const validStatuses = ['submitted', 'under_review', 'in_progress', 'planned', 'resolved', 'declined']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ success: false, message: 'Status tidak valid.' }, { status: 400 })
      }
      updates.status = status
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString()
      } else {
        updates.resolved_at = null
      }
    }

    if (admin_notes !== undefined) {
      updates.admin_notes = admin_notes?.trim() || null
    }

    if (priority !== undefined) {
      updates.priority = priority
    }

    if (title !== undefined && title.trim()) {
      updates.title = title.trim()
    }

    if (description !== undefined && description.trim()) {
      updates.description = description.trim()
    }

    const { data, error } = await supabaseAdmin
      .from('system_feedback')
      .update(updates)
      .eq('id', parseInt(id, 10))
      .select()
      .single()

    if (error) throw error

    // ── NOTIFY REPORTER VIA GOOGLE CHAT BOT ──────────────────────────────
    if ((status !== undefined || admin_notes !== undefined) && data?.user_id) {
      try {
        const { data: reporterUser } = await supabaseAdmin
          .from('users')
          .select('user_id, user_email, user_nama_depan, user_nama_belakang')
          .eq('user_id', data.user_id)
          .single()

        if (reporterUser?.user_email && reporterUser.user_email.includes('@')) {
          const reporterName = reporterUser.user_nama_depan || 'Colleague'
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://manageccs.online'

          const statusMap = {
            submitted: '🟡 Submitted / Open',
            under_review: '🟠 Under Review by Support Team',
            in_progress: '🔵 In Progress (Ongoing)',
            planned: '🟣 Planned & Scheduled for Release',
            resolved: '🟢 Resolved / Live in System',
            declined: '⚪ Declined / Closed'
          }
          const currentStatusLabel = statusMap[data.status] || data.status
          const typeIcon = data.type === 'bug' ? '🐞' : '💡'
          const typeLabel = data.type === 'bug' ? 'Bug / Issue' : 'Feature Request'

          const chatText = `🔔 *Support Ticket Status Update*\n\n` +
            `Hello *${reporterName}*, the support ticket you submitted has been updated by Admin:\n\n` +
            `📌 *Title:* *${data.title}*\n` +
            `🏷️ *Type:* ${typeIcon} ${typeLabel}\n` +
            `⚡ *Current Status:* *${currentStatusLabel}*\n` +
            (data.admin_notes ? `\n💬 *Developer / Admin Notes:*\n"${data.admin_notes}"\n` : '') +
            `\n🌐 Track your ticket status in the system:\n${baseUrl}/data/feedback`

          await sendGoogleChatMessage(reporterUser.user_email, chatText)
          console.log(`[FeedbackNotif] Status update alert sent to reporter ${reporterUser.user_email}`)
        }
      } catch (reporterNotifErr) {
        console.warn('[FeedbackNotif] Failed sending status update to reporter:', reporterNotifErr.message)
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Error updating system feedback:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// DELETE /api/system-feedback/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const { error } = await supabaseAdmin
      .from('system_feedback')
      .delete()
      .eq('id', parseInt(id, 10))

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Laporan berhasil dihapus.' })
  } catch (err) {
    console.error('Error deleting system feedback:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
