import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Helper: convert time string "HH:MM" or "HH:MM:SS" to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return null
  const parts = String(timeStr).split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

// Helper: get WIB date string "YYYY-MM-DD" for yesterday
function getYesterdayWIB() {
  const now = new Date()
  // WIB = UTC+7. We run at 00:01 WIB = 17:01 UTC prev day, so "now" in WIB is yesterday
  const wibOffset = 7 * 60 * 60 * 1000
  const wibNow = new Date(now.getTime() + wibOffset)
  // Subtract 1 day
  wibNow.setUTCDate(wibNow.getUTCDate() - 1)
  return wibNow.toISOString().slice(0, 10) // YYYY-MM-DD
}

// Helper: format date to Indonesian locale
function formatDateID(dateStr) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const d = new Date(dateStr + 'T00:00:00Z')
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// Helper: get day number (1=Mon...7=Sun) from date string
function getDayNumber(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const jsDay = d.getUTCDay()
  return jsDay === 0 ? 7 : jsDay
}

const DEFAULT_CHECK_IN  = '07:30'
const DEFAULT_CHECK_OUT = '16:30'

/**
 * Determines if a scan is a check-in or check-out based on midpoint logic.
 * Same algorithm as /data/attendance-machine page — more reliable than status_scan.
 */
function resolveIsCheckIn(scanTimeISO, expectedCheckIn, expectedCheckOut) {
  const ciMin  = timeToMinutes(expectedCheckIn  || DEFAULT_CHECK_IN)
  const coMin  = timeToMinutes(expectedCheckOut || DEFAULT_CHECK_OUT)
  const midMin = Math.floor((ciMin + coMin) / 2)
  const dt = new Date(scanTimeISO)
  const wib = new Date(dt.getTime() + 7 * 60 * 60 * 1000)
  const scanMin = wib.getUTCHours() * 60 + wib.getUTCMinutes()
  return scanMin <= midMin
}

// Convert ISO timestamp to WIB "HH:MM" string
function wibTimeStr(isoStr) {
  if (!isoStr) return null
  const dt = new Date(isoStr)
  const wib = new Date(dt.getTime() + 7 * 60 * 60 * 1000)
  return `${String(wib.getUTCHours()).padStart(2,'0')}:${String(wib.getUTCMinutes()).padStart(2,'0')}`
}

// Helper: sleep for ms milliseconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Rate-limited email sender: respects Resend's 5 req/sec limit
// Waits 250ms after each send (= max 4/sec). Retries once on 429.
let _emailsSentThisSecond = 0
let _emailSecondStart = Date.now()

async function sendEmailRateLimited({ to, subject, html }) {
  // Simple token-bucket: reset counter every second
  const now = Date.now()
  if (now - _emailSecondStart >= 1000) {
    _emailsSentThisSecond = 0
    _emailSecondStart = now
  }

  // If already at 4 this second, wait for the next second
  if (_emailsSentThisSecond >= 4) {
    const waitMs = 1000 - (Date.now() - _emailSecondStart) + 50
    console.log(`[EmailRL] Rate limit: waiting ${waitMs}ms`)
    await sleep(waitMs)
    _emailsSentThisSecond = 0
    _emailSecondStart = Date.now()
  }

  // Try send with one 429 retry
  try {
    await sendEmail({ to, subject, html })
    _emailsSentThisSecond++
    await sleep(250) // safety gap between sends
  } catch (err) {
    if (err.message?.includes('429') || err.statusCode === 429) {
      // Hit rate limit — wait 1.5s and retry once
      console.warn('[EmailRL] 429 received, waiting 1500ms before retry...')
      await sleep(1500)
      await sendEmail({ to, subject, html })
      _emailsSentThisSecond = 1
      _emailSecondStart = Date.now()
      await sleep(250)
    } else {
      throw err
    }
  }
}

/**
 * POST /api/attendance/notify
 * 
 * Called by Vercel Cron at 17:01 UTC (00:01 WIB) every day.
 * Processes attendance violations for yesterday and sends email notifications.
 * 
 * Auth: Authorization: Bearer <ATTENDANCE_WEBHOOK_SECRET>
 */
export async function POST(request) {
  try {
    // ─── 1. Auth check ───────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization') || ''
    const cronSecret = process.env.ATTENDANCE_WEBHOOK_SECRET || ''
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'

    // Accept: Vercel Cron header OR Bearer token
    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── 2. Determine target date (yesterday WIB) ─────────────────────────────
    const targetDate = getYesterdayWIB()
    const targetDayNum = getDayNumber(targetDate)
    const targetDateLabel = formatDateID(targetDate)

    console.log(`[AttendanceNotif] Processing date: ${targetDate} (day ${targetDayNum})`)

    // ─── 3. Check global school holiday ──────────────────────────────────────
    // A global holiday (role_id IS NULL) applies to everyone.
    const { data: globalHoliday } = await supabaseAdmin
      .from('school_holidays')
      .select('id, name')
      .is('role_id', null)
      .lte('date_start', targetDate)
      .gte('date_end', targetDate)
      .maybeSingle()

    if (globalHoliday) {
      console.log(`[AttendanceNotif] ${targetDate} is a global holiday: ${globalHoliday.name}. Skipping.`)
      return NextResponse.json({
        success: true,
        message: `Skipped: ${targetDate} is global holiday (${globalHoliday.name})`,
        processed: 0
      })
    }

    // ─── 4. Load settings ─────────────────────────────────────────────────────
    const { data: settingsRows } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['attendance_notif_admin_emails', 'attendance_notif_grace_minutes', 'attendance_notif_enabled'])

    const settings = Object.fromEntries((settingsRows || []).map(r => [r.key, r.value]))

    if (settings.attendance_notif_enabled === 'false') {
      return NextResponse.json({ success: true, message: 'Notifications disabled in settings', processed: 0 })
    }

    const graceMinutes = parseInt(settings.attendance_notif_grace_minutes || '0', 10)
    const adminEmails = (settings.attendance_notif_admin_emails || '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)

    // ─── 5. Fetch active users with attendance config ─────────────────────────
    // Only users with user_pin are registered on the IoT machine → only they have
    // data in `attendances`. Users without a PIN are skipped entirely.
    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select(`
        user_id,
        user_nama_depan,
        user_nama_belakang,
        user_email,
        user_role_id,
        user_pin,
        expected_check_in,
        expected_check_out,
        role:user_role_id (role_name, work_days)
      `)
      .eq('is_active', true)
      .not('user_pin', 'is', null)
      // Note: users without expected_check_in use DEFAULT_CHECK_IN/OUT

    if (usersErr) throw usersErr

    // ─── 6. Fetch all attendances for target date ─────────────────────────────
    const userIds = (users || []).map(u => u.user_id)
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No users with attendance config', processed: 0 })
    }

    // Query attendances for yesterday (scan_time is TIMESTAMPTZ stored in WIB)
    const startUTC = new Date(targetDate + 'T17:00:00.000Z') // Yesterday 00:00 WIB = day-before 17:00 UTC
    const endUTC   = new Date(targetDate + 'T16:59:59.999Z') // Yesterday 23:59 WIB
    // Actually: targetDate 00:00 WIB = (targetDate-1)T17:00:00Z but let's do it properly:
    const dayStart = targetDate + 'T17:00:00.000Z' // This is wrong - let's fix
    // Since scan_time is stored as WIB TIMESTAMPTZ (the device sends WIB, stored as-is)
    // We filter by the date portion. Use between approach:
    const tsStart = `${targetDate}T00:00:00+07:00`
    const tsEnd   = `${targetDate}T23:59:59+07:00`

    const { data: attendances, error: attErr } = await supabaseAdmin
      .from('attendances')
      .select('id, user_id, scan_time, status_scan')
      .in('user_id', userIds)
      .gte('scan_time', tsStart)
      .lte('scan_time', tsEnd)
      .order('scan_time', { ascending: true })

    if (attErr) throw attErr

    // Group attendances by user_id
    const attByUser = {}
    for (const att of (attendances || [])) {
      if (!attByUser[att.user_id]) attByUser[att.user_id] = []
      attByUser[att.user_id].push(att)
    }

    // ─── 7. Pre-fetch role-specific holidays for target date ──────────────────
    // Fetch all role-specific holidays that cover targetDate (role_id NOT NULL)
    const roleIds = [...new Set((users || []).map(u => u.user_role_id).filter(Boolean))]
    let roleHolidaySet = new Set() // Set of role_id strings that are on holiday today

    if (roleIds.length > 0) {
      const { data: roleHolidays } = await supabaseAdmin
        .from('school_holidays')
        .select('role_id, name')
        .not('role_id', 'is', null)
        .in('role_id', roleIds)
        .lte('date_start', targetDate)
        .gte('date_end', targetDate)

      for (const rh of (roleHolidays || [])) {
        roleHolidaySet.add(String(rh.role_id))
        console.log(`[AttendanceNotif] Role ${rh.role_id} is on holiday: ${rh.name}`)
      }
    }

    // ─── 8. Process each user ─────────────────────────────────────────────────
    const allViolations = []
    let emailsSent = 0

    for (const user of (users || [])) {
      const userName = `${user.user_nama_depan || ''} ${user.user_nama_belakang || ''}`.trim()
      const workDays = (user.role?.work_days || '1,2,3,4,5').split(',').map(Number)

      // Skip if today is not a work day for this role
      if (!workDays.includes(targetDayNum)) {
        console.log(`[AttendanceNotif] ${userName}: day ${targetDayNum} not in work_days [${workDays}]. Skip.`)
        continue
      }

      // Skip if this role has a role-specific holiday today
      if (roleHolidaySet.has(String(user.user_role_id))) {
        console.log(`[AttendanceNotif] ${userName}: role ${user.user_role_id} is on holiday today. Skip.`)
        continue
      }

      const userAtts   = attByUser[user.user_id] || []
      const expectedIn  = user.expected_check_in  || DEFAULT_CHECK_IN
      const expectedOut = user.expected_check_out || DEFAULT_CHECK_OUT

      // Classify using midpoint logic (same as attendance-machine page)
      const checkins  = userAtts
        .filter(a => resolveIsCheckIn(a.scan_time, expectedIn, expectedOut))
        .sort((a, b) => new Date(a.scan_time) - new Date(b.scan_time))
      const checkouts = userAtts
        .filter(a => !resolveIsCheckIn(a.scan_time, expectedIn, expectedOut))
        .sort((a, b) => new Date(a.scan_time) - new Date(b.scan_time))

      const expectedInMins  = timeToMinutes(expectedIn)
      const expectedOutMins = timeToMinutes(expectedOut)

      const issues = []

      // ── A. No check-in at all ────────────────────────────────────────────
      if (checkins.length === 0) {
        issues.push({
          type: 'no_checkin',
          scheduledTime: expectedIn.slice(0, 5),
          actualTime: null,
          minutesDiff: null
        })
      } else {
        // ── B. Late check-in ──────────────────────────────────────────────
        const actualInStr  = wibTimeStr(checkins[0].scan_time)
        const actualInMins = timeToMinutes(actualInStr)
        const lateMins = actualInMins - expectedInMins - graceMinutes
        if (lateMins > 0) {
          issues.push({
            type: 'late',
            scheduledTime: expectedIn.slice(0, 5),
            actualTime: actualInStr,
            minutesDiff: lateMins
          })
        }
      }

      // ── C. No check-out or leave early ───────────────────────────────────
      if (checkouts.length === 0 && userAtts.length > 0) {
        issues.push({
          type: 'no_checkout',
          scheduledTime: expectedOut.slice(0, 5),
          actualTime: null,
          minutesDiff: null
        })
      } else if (checkouts.length > 0) {
        const actualOutStr  = wibTimeStr(checkouts[checkouts.length - 1].scan_time)
        const actualOutMins = timeToMinutes(actualOutStr)
        const earlyMins = expectedOutMins - actualOutMins - graceMinutes
        if (earlyMins > 0) {
          issues.push({
            type: 'leave_early',
            scheduledTime: expectedOut.slice(0, 5),
            actualTime: actualOutStr,
            minutesDiff: earlyMins
          })
        }
      }

      if (issues.length === 0) continue

      // ── Check notification log (dedup) ─────────────────────────────────
      const notifTypes = issues.map(i => i.type)
      const { data: existingLogs } = await supabaseAdmin
        .from('attendance_notification_log')
        .select('notif_type')
        .eq('user_id', user.user_id)
        .eq('notif_date', targetDate)
        .in('notif_type', notifTypes)

      const alreadySent = new Set((existingLogs || []).map(l => l.notif_type))
      const newIssues = issues.filter(i => !alreadySent.has(i.type))

      if (newIssues.length === 0) continue

      // ── Send email to user ─────────────────────────────────────────────
      let userEmailSuccess = false
      let emailSkipped = false

      if (!user.user_email) {
        // No email configured — skip email but still log the violation
        emailSkipped = true
        console.log(`[AttendanceNotif] ${userName}: no email configured, violation logged only`)
      } else {
        try {
          const { subject, html } = emailTemplates.attendanceLate({
            userName,
            date: targetDateLabel,
            issues: newIssues
          })
          await sendEmailRateLimited({ to: user.user_email, subject, html })
          userEmailSuccess = true
          emailsSent++
        } catch (emailErr) {
          console.error(`[AttendanceNotif] Failed to email ${user.user_email}:`, emailErr.message)
        }
      }

      // ── Log each issue (always recorded, even without email) ──────────────
      const logRows = newIssues.map(issue => ({
        user_id: user.user_id,
        notif_date: targetDate,
        notif_type: issue.type,
        minutes_diff: issue.minutesDiff,
        scheduled_time: issue.scheduledTime,
        actual_time: issue.actualTime,
        email_to: user.user_email ? [user.user_email] : [],
        // success: true = email sent ok, false = email failed, null = no email configured
        success: emailSkipped ? null : userEmailSuccess,
      }))

      await supabaseAdmin
        .from('attendance_notification_log')
        .upsert(logRows, { onConflict: 'user_id,notif_date,notif_type', ignoreDuplicates: true })

      // ── Add to admin violations list (always, regardless of email) ────────
      for (const issue of newIssues) {
        allViolations.push({
          userName,
          roleName: user.role?.role_name || '-',
          unitName: '-',
          noEmail: emailSkipped,
          ...issue
        })
      }
    }

    // ─── 8. Send admin summary email ─────────────────────────────────────────
    if (allViolations.length > 0 && adminEmails.length > 0) {
      try {
        const { subject, html } = emailTemplates.attendanceSummaryAdmin({
          date: targetDateLabel,
          violations: allViolations
        })
        // Admin summary = 1 email (even if multiple recipients, it's 1 API call)
        await sendEmailRateLimited({ to: adminEmails, subject, html })
        emailsSent++
        console.log(`[AttendanceNotif] Admin summary sent to ${adminEmails.join(', ')}`)
      } catch (adminEmailErr) {
        console.error('[AttendanceNotif] Failed to send admin summary:', adminEmailErr.message)
      }
    }

    console.log(`[AttendanceNotif] Done. Violations: ${allViolations.length}, Emails sent: ${emailsSent}`)

    return NextResponse.json({
      success: true,
      date: targetDate,
      violations: allViolations.length,
      emailsSent,
      message: `Processed ${users?.length || 0} users, found ${allViolations.length} violations`
    })

  } catch (err) {
    console.error('[AttendanceNotif] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/attendance/notify
 * Returns status and recent notification log (admin use)
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const cronSecret = process.env.ATTENDANCE_WEBHOOK_SECRET || ''
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: logs } = await supabaseAdmin
      .from('attendance_notification_log')
      .select('*, user:user_id (user_nama_depan, user_nama_belakang)')
      .order('sent_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ success: true, logs })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
