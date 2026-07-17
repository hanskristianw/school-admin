import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'

// Prevent Next.js from statically caching this route
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Safe helper: insert to run log without throwing (Supabase returns PostgrestFilterBuilder, not native Promise)
async function safeInsertRunLog(data) {
  try {
    await supabaseAdmin.from('attendance_notify_run_log').insert(data)
  } catch (e) {
    console.error('[AttendanceNotif] Failed to write run log:', e?.message || e)
  }
}


// Helper: convert time string "HH:MM" or "HH:MM:SS" to minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return null
  const parts = String(timeStr).split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

/**
 * Convert time string "HH:MM" or "HH:MM:SS" to total seconds from midnight.
 * Used for second-precision lateness calculation.
 */
function timeToSeconds(t) {
  if (!t) return null
  const parts = String(t).split(':')
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  const s = parseInt(parts[2], 10) || 0
  return h * 3600 + m * 60 + s
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

// Convert ISO timestamp to WIB "HH:MM:SS" string — includes seconds for accurate lateness detection.
function wibTimeStr(isoStr) {
  if (!isoStr) return null
  const dt = new Date(isoStr)
  const wib = new Date(dt.getTime() + 7 * 60 * 60 * 1000)
  return `${String(wib.getUTCHours()).padStart(2,'0')}:${String(wib.getUTCMinutes()).padStart(2,'0')}:${String(wib.getUTCSeconds()).padStart(2,'0')}`
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
  return handleNotify(request)
}

/**
 * GET /api/attendance/notify
 * Called by Vercel Cron (vercel.json schedule) — GET is Vercel Cron default method.
 * Also accepts manual trigger with Bearer token for testing.
 */
export async function GET(request) {
  return handleNotify(request)
}

/**
 * Core handler — shared between GET (cron) and POST (manual trigger)
 */
async function handleNotify(request) {
  try {
    // ─── 1. Auth check ───────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization') || ''
    const userAgent  = request.headers.get('user-agent') || ''
    const cronSecret = process.env.ATTENDANCE_WEBHOOK_SECRET || ''
    const vercelCronSecret = process.env.CRON_SECRET || ''

    // Vercel Cron uses User-Agent: vercel-cron/1.0
    const isVercelCron = userAgent.includes('vercel-cron')
      || request.headers.get('x-vercel-cron') === '1'

    const hasBearerToken = (cronSecret && authHeader === `Bearer ${cronSecret}`)
      || (vercelCronSecret && authHeader === `Bearer ${vercelCronSecret}`)

    console.log(`[AttendanceNotif] Auth: isVercelCron=${isVercelCron}, hasBearerToken=${hasBearerToken}, UA=${userAgent}`)

    if (!isVercelCron && !hasBearerToken) {
      console.warn('[AttendanceNotif] Unauthorized request rejected')
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
      await safeInsertRunLog({
        target_date: targetDate, users_processed: 0, violations_found: 0,
        emails_sent: 0, emails_failed: 0,
        skipped_reason: `Hari libur: ${globalHoliday.name}`,
      })
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
      await safeInsertRunLog({
        target_date: targetDate, users_processed: 0, violations_found: 0,
        emails_sent: 0, emails_failed: 0,
        skipped_reason: 'Notifikasi dinonaktifkan di pengaturan',
      })
      return NextResponse.json({ success: true, message: 'Notifications disabled in settings', processed: 0 })
    }

    const graceMinutes = parseInt(settings.attendance_notif_grace_minutes || '0', 10)
    const adminEmails = (settings.attendance_notif_admin_emails || '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)

    // ─── 5. Fetch active users with attendance config ───────────────────────────────
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
        role:user_role_id (role_name, work_days, is_part_time_staff)
      `)
      .eq('is_active', true)
      .not('user_pin', 'is', null)

    if (usersErr) throw usersErr

    // ─── 6. Fetch attendances for target date ───────────────────────────────────
    const userIds = (users || []).map(u => u.user_id)
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No users with attendance config', processed: 0 })
    }

    // scan_time stored as TIMESTAMPTZ — filter by WIB date range
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

    // ─── 6b. Fetch special day rules for targetDate ──────────────────────────────
    // Matches report API — user > role > global priority
    let specialRules = []
    try {
      const { data: srData } = await supabaseAdmin
        .from('special_day_rules')
        .select('id, tanggal, scope_type, role_id, user_id, is_work_day, custom_check_in, custom_check_out, keterangan')
        .eq('tanggal', targetDate)
      specialRules = srData || []
    } catch (_) {}

    const resolveSpecialRule = (userRoleId, userId) => {
      const userRule = specialRules.find(r => r.scope_type === 'user' && String(r.user_id) === String(userId))
      if (userRule) return userRule
      const roleRule = specialRules.find(r => r.scope_type === 'role' && String(r.role_id) === String(userRoleId))
      if (roleRule) return roleRule
      return specialRules.find(r => r.scope_type === 'all') || null
    }

    // ─── 7. Pre-fetch role-specific holidays for target date ────────────────────────
    const roleIds = [...new Set((users || []).map(u => u.user_role_id).filter(Boolean))]
    // All holidays on this date (global + role-specific)
    let allHolidays = []
    try {
      const { data: hData } = await supabaseAdmin
        .from('school_holidays')
        .select('role_id, name')
        .lte('date_start', targetDate)
        .gte('date_end', targetDate)
      allHolidays = hData || []
    } catch (_) {}

    const isHoliday = (userRoleId) =>
      allHolidays.some(h =>
        h.role_id === null || h.role_id === undefined ||
        String(h.role_id) === String(userRoleId)
      )

    // ─── 8. Process each user ─────────────────────────────────────────────────────
    const allViolations = []
    let emailsSent = 0

    for (const user of (users || [])) {
      const userName    = `${user.user_nama_depan || ''} ${user.user_nama_belakang || ''}`.trim()
      const workDays    = (user.role?.work_days || '1,2,3,4,5').split(',').map(Number)
      const isPartTime  = !!user.role?.is_part_time_staff

      // ── Resolve special rule for this user/date ──
      const specialRule = resolveSpecialRule(user.user_role_id, user.user_id)

      // ── Determine if today is a work day (same logic as report API) ──
      let isWorkDay
      if (specialRule) {
        isWorkDay = specialRule.is_work_day
      } else {
        isWorkDay = workDays.includes(targetDayNum) && !isHoliday(user.user_role_id)
      }

      if (!isWorkDay) {
        console.log(`[AttendanceNotif] ${userName}: not a work day. Skip.`)
        continue
      }

      const userAtts    = attByUser[user.user_id] || []
      const expectedIn  = user.expected_check_in  || DEFAULT_CHECK_IN
      const expectedOut = user.expected_check_out || DEFAULT_CHECK_OUT

      // Apply special rule custom hours if present
      const effIn  = (specialRule?.custom_check_in  ? String(specialRule.custom_check_in).slice(0,5)  : null) || expectedIn
      const effOut = (specialRule?.custom_check_out ? String(specialRule.custom_check_out).slice(0,5) : null) || expectedOut

      // Classify scans using midpoint logic (same as report API)
      const checkins  = userAtts
        .filter(a => resolveIsCheckIn(a.scan_time, expectedIn, expectedOut))
        .sort((a, b) => new Date(a.scan_time) - new Date(b.scan_time))
      const checkouts = userAtts
        .filter(a => !resolveIsCheckIn(a.scan_time, expectedIn, expectedOut))
        .sort((a, b) => new Date(a.scan_time) - new Date(b.scan_time))

      const noCheckIn  = checkins.length === 0
      const noCheckOut = checkouts.length === 0

      const issues = []

      if (noCheckIn && noCheckOut) {
        // ── A. Tidak masuk sama sekali (absent = Tidak Masuk) ─────────────────
        if (!isPartTime) {
          issues.push({ type: 'absent', scheduledTime: effIn.slice(0,5), actualTime: null, minutesDiff: null })
        }
      } else {
        // ── B. Analisis Check-In ──────────────────────────────────────────────
        if (!noCheckIn) {
          if (!isPartTime) {
            const actualInStr  = wibTimeStr(checkins[0].scan_time)
            const actualInSecs  = timeToSeconds(actualInStr)
            const effInSecs     = timeToSeconds(effIn)
            const graceSecs     = graceMinutes * 60
            const lateSecs = actualInSecs - effInSecs - graceSecs
            if (lateSecs > 0) {
              const lateMins = Math.ceil(lateSecs / 60)
              issues.push({ type: 'late', scheduledTime: effIn.slice(0,5), actualTime: actualInStr, minutesDiff: lateMins })
            }
          }
        } else if (!isPartTime) {
          // Ada scan (checkout) tapi tidak ada check-in
          issues.push({ type: 'no_checkin', scheduledTime: effIn.slice(0,5), actualTime: null, minutesDiff: null })
        }

        // ── C. Analisis Check-Out ─────────────────────────────────────────────
        if (!noCheckOut) {
          if (!isPartTime) {
            const actualOutStr  = wibTimeStr(checkouts[checkouts.length - 1].scan_time) // "HH:MM:SS"
            const actualOutSecs  = timeToSeconds(actualOutStr)
            const effOutSecs     = timeToSeconds(effOut)
            const graceSecs      = graceMinutes * 60
            const earlySecs = effOutSecs - actualOutSecs - graceSecs
            if (earlySecs > 0) {
              const earlyMins = Math.ceil(earlySecs / 60)
              issues.push({ type: 'leave_early', scheduledTime: effOut.slice(0,5), actualTime: actualOutStr, minutesDiff: earlyMins })
            }
          }
        } else if (!noCheckIn && !isPartTime) {
          // Ada check-in tapi tidak ada check-out
          issues.push({ type: 'no_checkout', scheduledTime: effOut.slice(0,5), actualTime: null, minutesDiff: null })
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
          const baseUrl = process.env.NEXTAUTH_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
            || 'https://manageccs.online'
          const { subject, html } = emailTemplates.attendanceLate({
            userName,
            date: targetDateLabel,
            issues: newIssues,
            baseUrl,
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

      // ── Add to admin violations list ───────────────────────────────────────────
      for (const issue of newIssues) {
        allViolations.push({
          userName,
          roleName: user.role?.role_name || '-',
          unitName: '-',
          noEmail:     emailSkipped,
          emailFailed: !emailSkipped && !userEmailSuccess,
          ...issue
        })
      }
    }


    // ─── 8. Send admin summary email ─────────────────────────────────────────
    let adminEmailOk = null
    if (allViolations.length > 0 && adminEmails.length > 0) {
      try {
        const { subject, html } = emailTemplates.attendanceSummaryAdmin({
          date: targetDateLabel,
          violations: allViolations
        })
        await sendEmailRateLimited({ to: adminEmails, subject, html })
        emailsSent++
        adminEmailOk = true
        console.log(`[AttendanceNotif] Admin summary sent to ${adminEmails.join(', ')}`)
      } catch (adminEmailErr) {
        adminEmailOk = false
        console.error('[AttendanceNotif] Failed to send admin summary:', adminEmailErr.message)
      }
    }

    // ─── 9. Write run log ─────────────────────────────────────────────────────
    const emailsFailed = allViolations.filter(v => v.emailFailed).length
    await safeInsertRunLog({
      target_date:      targetDate,
      users_processed:  users?.length || 0,
      violations_found: allViolations.length,
      emails_sent:      emailsSent,
      emails_failed:    emailsFailed,
      admin_emails:     adminEmails,
      admin_email_ok:   adminEmailOk,
    })


    console.log(`[AttendanceNotif] Done. Violations: ${allViolations.length}, Sent: ${emailsSent}, Failed: ${emailsFailed}`)

    return NextResponse.json({
      success: true,
      date: targetDate,
      violations: allViolations.length,
      emailsSent,
      emailsFailed,
      message: `Processed ${users?.length || 0} users, found ${allViolations.length} violations`
    })

  } catch (err) {
    console.error('[AttendanceNotif] Error:', err)
    await safeInsertRunLog({
      users_processed: 0, violations_found: 0,
      emails_sent: 0, emails_failed: 0,
      error_message: err.message,
    })
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}


