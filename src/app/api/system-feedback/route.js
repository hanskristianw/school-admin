import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendGoogleChatMessage } from '@/lib/googleChat'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/system-feedback
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const currentUserId = searchParams.get('user_id')

    let query = supabaseAdmin
      .from('system_feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`
      query = query.or(`title.ilike.${q},description.ilike.${q}`)
    }

    const { data: rawFeedbacks, error } = await query

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        return NextResponse.json({
          success: false,
          tableMissing: true,
          message: 'Tabel system_feedback belum ada di database. Silakan jalankan file migrasi di Supabase SQL Editor.'
        }, { status: 404 })
      }
      throw error
    }

    const feedbacks = rawFeedbacks || []

    // Enrich with users data
    const userIds = Array.from(new Set(feedbacks.map(f => f.user_id).filter(Boolean)))
    let userMap = {}

    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select(`
          user_id,
          user_nama_depan,
          user_nama_belakang,
          role:user_role_id (role_name)
        `)
        .in('user_id', userIds)

      if (users) {
        users.forEach(u => {
          userMap[u.user_id] = u
        })
      }
    }

    const enriched = feedbacks.map(item => {
      const u = userMap[item.user_id]
      const displayName = u?.full_name || 
        `${u?.user_nama_depan || ''} ${u?.user_nama_belakang || ''}`.trim() || 
        'Anonymous'
      const roleName = u?.role?.role_name || 'Staff'

      return {
        ...item,
        author_name: displayName,
        author_role: roleName
      }
    })

    return NextResponse.json({ success: true, data: enriched })
  } catch (err) {
    console.error('Error fetching system feedback:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST /api/system-feedback
export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, author_name, author_role, type, title, description, page_url, priority, attachment_url } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, message: 'Judul laporan wajib diisi.' }, { status: 400 })
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ success: false, message: 'Deskripsi kendala / ide wajib diisi.' }, { status: 400 })
    }

    const feedbackType = ['bug', 'feature_request'].includes(type) ? type : 'bug'
    const feedbackPriority = ['low', 'medium', 'high', 'critical'].includes(priority) ? priority : 'medium'

    const newRecord = {
      user_id: user_id ? parseInt(user_id, 10) : null,
      type: feedbackType,
      title: title.trim(),
      description: description.trim(),
      page_url: page_url ? page_url.trim() : null,
      priority: feedbackPriority,
      status: 'submitted',
      attachment_url: attachment_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('system_feedback')
      .insert(newRecord)
      .select()
      .single()

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          tableMissing: true,
          message: 'Tabel system_feedback belum ada di database. Silakan jalankan file migrasi di Supabase SQL Editor.'
        }, { status: 404 })
      }
      throw error
    }

    // ── NOTIFY CONFIGURED RECIPIENTS VIA GOOGLE CHAT BOT ────────────────────
    try {
      const { data: recipients } = await supabaseAdmin
        .from('system_feedback_recipients')
        .select(`
          user:user_id(user_id, user_nama_depan, user_nama_belakang, user_email)
        `)
        .eq('is_active', true)
        .eq('notify_on_new_ticket', true)

      if (recipients && recipients.length > 0) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://manageccs.online'
        const typeIcon = feedbackType === 'bug' ? '🐞' : '💡'
        const typeLabel = feedbackType === 'bug' ? 'Bug / Issue' : 'Feature Request'
        const reporterDisplay = author_name || 'Staff'
        const roleDisplay = author_role ? ` (${author_role})` : ''

        for (const r of recipients) {
          const email = r.user?.user_email
          if (email && email.includes('@')) {
            const recipientFirstName = r.user?.user_nama_depan || 'Admin'
            const chatText = `🚨 *New Ticket Submitted — Feedback & Support*\n\n` +
              `Hello *${recipientFirstName}*, a new ticket has been submitted by staff:\n\n` +
              `👤 *Reporter:* ${reporterDisplay}${roleDisplay}\n` +
              `📌 *Title:* *${title.trim()}*\n` +
              `🏷️ *Type:* ${typeIcon} ${typeLabel}\n` +
              `⚡ *Priority:* *${feedbackPriority.toUpperCase()}*\n` +
              (page_url ? `🔗 *Page / URL:* ${page_url.trim()}\n` : '') +
              (attachment_url ? `🖼️ *Screenshot:* ${attachment_url}\n` : '') +
              `📝 *Details:* \n${description.trim()}\n\n` +
              `🌐 View and manage this ticket:\n${baseUrl}/data/feedback`

            try {
              await sendGoogleChatMessage(email, chatText)
              console.log(`[FeedbackNotif] New ticket alert sent to ${email}`)
            } catch (chatErr) {
              console.warn(`[FeedbackNotif] Failed sending alert to ${email}:`, chatErr.message)
            }
          }
        }
      }
    } catch (notifErr) {
      console.warn('[FeedbackNotif] Could not process recipient alerts:', notifErr.message)
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Error creating system feedback:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
