import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendGoogleChatMessage } from '@/lib/googleChat'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Helper: Get current WIB (Asia/Jakarta, GMT+7) date string (YYYY-MM-DD) & time string (HH:MM)
function getWibDateTime() {
  const now = new Date()

  // Use Intl.DateTimeFormat with Asia/Jakarta (GMT+7) explicitly
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(now)
  const partMap = {}
  parts.forEach(p => { partMap[p.type] = p.value })

  const year  = partMap.year
  const month = partMap.month
  const day   = partMap.day
  const hours = parseInt(partMap.hour, 10)
  const mins  = parseInt(partMap.minute, 10)

  const dateStr = `${year}-${month}-${day}`
  const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  const totalMins = hours * 60 + mins

  return { dateStr, timeStr, hours, mins, totalMins }
}

export async function GET(req) {
  return handleDutyNotification(req)
}

export async function POST(req) {
  return handleDutyNotification(req)
}

async function handleDutyNotification(req) {
  try {
    const { searchParams } = new URL(req.url)
    const forceAll   = searchParams.get('force_all') === 'true'
    const targetDate = searchParams.get('date')

    const wib = getWibDateTime()
    const todayStr = targetDate || wib.dateStr

    console.log(`[DutyNotify] Checking duty notifications for ${todayStr} at ${wib.timeStr} WIB`)

    // 1. Query today's duty schedule
    const { data: schedule, error: schedErr } = await supabaseAdmin
      .from('duty_schedules')
      .select('*')
      .eq('duty_date', todayStr)
      .single()

    if (schedErr || !schedule) {
      return NextResponse.json({
        success: true,
        message: `No duty schedule found for date ${todayStr}`,
        notified: []
      })
    }

    // 2. Fetch dynamic duty_settings from database if available (with fallback defaults)
    let timeSettings = {
      devotion: { start: '07:30 AM', end: '', startMins: 450, reminderMins: 60 },
      greeter:  { start: '07:30 AM', end: '08:00 AM', startMins: 450, reminderMins: 60 },
      break:    { start: '09:45 AM', end: '10:15 AM', startMins: 585, reminderMins: 60 },
      lunch:    { start: '12:30 PM', end: '01:00 PM', startMins: 750, reminderMins: 60 },
    }

    try {
      const { data: dbSettings } = await supabaseAdmin.from('duty_settings').select('*')
      if (dbSettings && dbSettings.length > 0) {
        for (const s of dbSettings) {
          if (!s.slot_key || !s.start_time) continue
          const [h, m] = String(s.start_time).split(':').map(Number)
          const sMins = h * 60 + m
          const remMins = s.reminder_minutes_before ?? 60
          
          let formatTimeStr = `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
          let formatEndStr = ''
          if (s.end_time) {
            const [eh, em] = String(s.end_time).split(':').map(Number)
            formatEndStr = `${String(eh % 12 || 12).padStart(2, '0')}:${String(em).padStart(2, '0')} ${eh >= 12 ? 'PM' : 'AM'}`
          }

          timeSettings[s.slot_key] = {
            start: formatTimeStr,
            end: formatEndStr,
            startMins: sMins,
            reminderMins: remMins
          }
        }
      }
    } catch (_) {
      // Use fallback defaults if table doesn't exist
    }

    const dutyConfigs = [
      {
        key: 'devotion_leader_user_id',
        title: 'Morning Devotion Leader',
        timeLabel: timeSettings.devotion.start,
        targetMins: timeSettings.devotion.startMins - timeSettings.devotion.reminderMins,
        reminderMins: timeSettings.devotion.reminderMins,
        type: 'devotion'
      },
      {
        key: 'greeter_1st_floor_user_id',
        title: 'Morning Door Greeter (1st Floor)',
        timeLabel: `${timeSettings.greeter.start} – ${timeSettings.greeter.end}`,
        targetMins: timeSettings.greeter.startMins - timeSettings.greeter.reminderMins,
        reminderMins: timeSettings.greeter.reminderMins,
        type: 'greeter'
      },
      {
        key: 'greeter_2nd_floor_user_id',
        title: 'Morning Door Greeter (2nd Floor)',
        timeLabel: `${timeSettings.greeter.start} – ${timeSettings.greeter.end}`,
        targetMins: timeSettings.greeter.startMins - timeSettings.greeter.reminderMins,
        reminderMins: timeSettings.greeter.reminderMins,
        type: 'greeter'
      },
      {
        key: 'break_canteen_user_id',
        title: 'Break Duty (Canteen)',
        timeLabel: `${timeSettings.break.start} – ${timeSettings.break.end}`,
        targetMins: timeSettings.break.startMins - timeSettings.break.reminderMins,
        reminderMins: timeSettings.break.reminderMins,
        type: 'break'
      },
      {
        key: 'break_pe_field_user_id',
        title: 'Break Duty (PE Field)',
        timeLabel: `${timeSettings.break.start} – ${timeSettings.break.end}`,
        targetMins: timeSettings.break.startMins - timeSettings.break.reminderMins,
        reminderMins: timeSettings.break.reminderMins,
        type: 'break'
      },
      {
        key: 'break_2nd_floor_user_id',
        title: 'Break Duty (2nd Floor)',
        timeLabel: `${timeSettings.break.start} – ${timeSettings.break.end}`,
        targetMins: timeSettings.break.startMins - timeSettings.break.reminderMins,
        reminderMins: timeSettings.break.reminderMins,
        type: 'break'
      },
      {
        key: 'break_3rd_floor_user_id',
        title: 'Break Duty (3rd Floor)',
        timeLabel: `${timeSettings.break.start} – ${timeSettings.break.end}`,
        targetMins: timeSettings.break.startMins - timeSettings.break.reminderMins,
        reminderMins: timeSettings.break.reminderMins,
        type: 'break'
      },
      {
        key: 'lunch_canteen_user_id',
        title: 'Lunch Duty (Canteen)',
        timeLabel: `${timeSettings.lunch.start} – ${timeSettings.lunch.end}`,
        targetMins: timeSettings.lunch.startMins - timeSettings.lunch.reminderMins,
        reminderMins: timeSettings.lunch.reminderMins,
        type: 'lunch'
      },
      {
        key: 'lunch_pe_field_user_id',
        title: 'Lunch Duty (PE Field)',
        timeLabel: `${timeSettings.lunch.start} – ${timeSettings.lunch.end}`,
        targetMins: timeSettings.lunch.startMins - timeSettings.lunch.reminderMins,
        reminderMins: timeSettings.lunch.reminderMins,
        type: 'lunch'
      },
      {
        key: 'lunch_2nd_floor_user_id',
        title: 'Lunch Duty (2nd Floor)',
        timeLabel: `${timeSettings.lunch.start} – ${timeSettings.lunch.end}`,
        targetMins: timeSettings.lunch.startMins - timeSettings.lunch.reminderMins,
        reminderMins: timeSettings.lunch.reminderMins,
        type: 'lunch'
      },
      {
        key: 'lunch_3rd_floor_user_id',
        title: 'Lunch Duty (3rd Floor)',
        timeLabel: `${timeSettings.lunch.start} – ${timeSettings.lunch.end}`,
        targetMins: timeSettings.lunch.startMins - timeSettings.lunch.reminderMins,
        reminderMins: timeSettings.lunch.reminderMins,
        type: 'lunch'
      }
    ]

    // 3. Collect assigned user IDs to fetch emails
    const assignedUserIds = [...new Set(
      dutyConfigs
        .map(c => schedule[c.key])
        .filter(id => id && typeof id === 'number')
    )]

    if (assignedUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users assigned to duties today',
        notified: []
      })
    }

    const { data: users, error: userErr } = await supabaseAdmin
      .from('users')
      .select('user_id, user_email, user_nama_depan, user_nama_belakang')
      .in('user_id', assignedUserIds)

    if (userErr) throw userErr

    const userMap = new Map((users || []).map(u => [u.user_id, u]))

    const notifiedResults = []

    const testEmail  = searchParams.get('test_email') || (searchParams.get('test') === 'true' ? 'hans@ccs.sch.id' : null)

    // 4. Evaluate each duty slot and send Google Chat notification 1 hour before
    for (const cfg of dutyConfigs) {
      const userId = schedule[cfg.key]
      if (!userId) continue

      const user = userMap.get(userId)
      if (!user || !user.user_email) continue

      // Check if current time is within 1-hour reminder window (targetMins ± 5 mins) or force_all
      const diffMins = Math.abs(wib.totalMins - cfg.targetMins)
      const isInWindow = diffMins <= 5

      if (!isInWindow && !forceAll && !testEmail) {
        continue
      }

      // If testing mode is active, strictly send test notifications to hans@ccs.sch.id ONLY
      const recipientEmail = testEmail || user.user_email

      const name = `${user.user_nama_depan || ''} ${user.user_nama_belakang || ''}`.trim()

      const remMins = cfg.reminderMins || 60
      const remLabel = remMins === 60 ? 'in 1 hour' : (remMins >= 60 ? `in ${Math.floor(remMins / 60)} hour(s)` : `in ${remMins} mins`)

      let messageText = ''
      if (cfg.type === 'devotion') {
        const teacherPrayed = schedule.teacher_to_be_prayed || '—'
        const studentPrayed = schedule.student_to_be_prayed || '—'

        messageText = `🔔 *REMINDER: Morning Devotion Duty (${remLabel})*\n\n` +
          `Hello *${name}*,\n` +
          `You are scheduled as the *Devotion Leader* today at *${cfg.timeLabel}*.\n\n` +
          `🙏 *Prayer Subjects:*\n` +
          `• *Teacher to Pray For:* ${teacherPrayed}\n` +
          `• *Student to Pray For:* ${studentPrayed}\n\n` +
          `Please prepare and be ready at the devotion area. Thank you!`
      } else {
        messageText = `🔔 *REMINDER: ${cfg.title} (${remLabel})*\n\n` +
          `Hello *${name}*,\n` +
          `Your duty assignment for *${cfg.title}* starts ${remLabel} at *${cfg.timeLabel}*.\n\n` +
          `Please be ready at your assigned location. Thank you for your service!`
      }

      try {
        console.log(`[DutyNotify] Sending Google Chat message to ${recipientEmail} for ${cfg.title}`)
        await sendGoogleChatMessage(recipientEmail, messageText)
        notifiedResults.push({
          user_id: user.user_id,
          user_email: user.user_email,
          duty: cfg.title,
          status: 'sent'
        })
      } catch (err) {
        console.error(`[DutyNotify] Error sending Google Chat to ${user.user_email}:`, err.message)
        notifiedResults.push({
          user_id: user.user_id,
          user_email: user.user_email,
          duty: cfg.title,
          status: 'failed',
          error: err.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      today: todayStr,
      time: wib.timeStr,
      notified: notifiedResults
    })
  } catch (e) {
    console.error('[DutyNotify] Fatal error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
