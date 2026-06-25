import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DEFAULT_CHECK_IN  = '07:30'
const DEFAULT_CHECK_OUT = '16:30'

function timeToMinutes(t) {
  if (!t) return null
  const [h, m] = String(t).split(':')
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}

function getDayNumber(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const js = d.getUTCDay()
  return js === 0 ? 7 : js // 1=Mon…7=Sun
}

function dateRange(start, end) {
  const dates = []
  const cur = new Date(start + 'T00:00:00Z')
  const last = new Date(end + 'T00:00:00Z')
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

/**
 * Sama seperti attendance-machine: tentukan check-in vs check-out
 * berdasarkan waktu scan vs midpoint antara expected_check_in dan expected_check_out.
 * status_scan dari mesin tidak reliable.
 */
function resolveIsCheckIn(scanTimeISO, expectedCheckIn, expectedCheckOut) {
  const ciMin  = timeToMinutes(expectedCheckIn  || DEFAULT_CHECK_IN)
  const coMin  = timeToMinutes(expectedCheckOut || DEFAULT_CHECK_OUT)
  const midMin = Math.floor((ciMin + coMin) / 2)

  const dt = new Date(scanTimeISO)
  // getHours() returns local, use UTC + WIB offset
  const wibDt = new Date(dt.getTime() + 7 * 60 * 60 * 1000)
  const scanMin = wibDt.getUTCHours() * 60 + wibDt.getUTCMinutes()

  return scanMin <= midMin // true = check-in, false = check-out
}

function wibTimeStr(isoStr) {
  if (!isoStr) return null
  const dt = new Date(isoStr)
  const wib = new Date(dt.getTime() + 7 * 60 * 60 * 1000)
  return `${String(wib.getUTCHours()).padStart(2,'0')}:${String(wib.getUTCMinutes()).padStart(2,'0')}`
}

function wibDateStr(isoStr) {
  if (!isoStr) return null
  const dt = new Date(isoStr)
  const wib = new Date(dt.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

/**
 * GET /api/attendance/report
 * Query params: start, end, unit_id, role_id, grace
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const now    = new Date()
    const defEnd = now.toISOString().slice(0, 10)
    const defStart = `${defEnd.slice(0, 7)}-01`

    const start  = searchParams.get('start')   || defStart
    const end    = searchParams.get('end')     || defEnd
    const unitId = searchParams.get('unit_id') || null
    const roleId = searchParams.get('role_id') || null
    const grace  = parseInt(searchParams.get('grace') || '0', 10)

    if (start > end) {
      return NextResponse.json({ success: false, message: 'start harus <= end' }, { status: 400 })
    }

    const allDates = dateRange(start, end)

    // ── 1. Holidays ──────────────────────────────────────────────────────────
    // Try new schema (date_start/date_end) first, fall back to old `date` column
    let holidays = []
    try {
      const { data, error } = await supabaseAdmin
        .from('school_holidays')
        .select('date_start, date_end, role_id')
        .lte('date_start', end)
        .gte('date_end', start)
      if (!error) holidays = data || []
      else {
        // Fallback: old schema with single `date` column
        const { data: old } = await supabaseAdmin
          .from('school_holidays')
          .select('date, role_id')
          .gte('date', start)
          .lte('date', end)
        holidays = (old || []).map(h => ({ date_start: h.date, date_end: h.date, role_id: h.role_id }))
      }
    } catch (_) {
      holidays = []
    }

    const isHoliday = (dateStr, userRoleId) => {
      return holidays.some(h => {
        if (dateStr < h.date_start || dateStr > h.date_end) return false
        if (h.role_id === null || h.role_id === undefined) return true   // global
        return String(h.role_id) === String(userRoleId)                  // role-specific
      })
    }

    // ── 2. Units ─────────────────────────────────────────────────────────────
    const { data: unitList } = await supabaseAdmin
      .from('unit').select('unit_id, unit_name')
    const unitMap = Object.fromEntries((unitList || []).map(u => [String(u.unit_id), u.unit_name]))

    // ── 3. Users — include those with PIN (user_pin NOT NULL)
    //   Remove expected_check_in filter: use DEFAULT if null
    let userQuery = supabaseAdmin
      .from('users')
      .select(`
        user_id, user_nama_depan, user_nama_belakang,
        user_unit_id, user_role_id, user_pin,
        expected_check_in, expected_check_out,
        role:user_role_id (role_name, work_days)
      `)
      .eq('is_active', true)
      .not('user_pin', 'is', null)

    if (unitId) userQuery = userQuery.eq('user_unit_id', parseInt(unitId, 10))
    if (roleId) userQuery = userQuery.eq('user_role_id', parseInt(roleId, 10))

    const { data: users, error: usersErr } = await userQuery
    if (usersErr) throw usersErr

    if (!users?.length) {
      return NextResponse.json({
        success: true, data: [], dates: allDates,
        debug: 'No active users with PIN found'
      })
    }

    const userIds = users.map(u => u.user_id)

    // ── 4. All attendances for the range ─────────────────────────────────────
    const tsStart = `${start}T00:00:00+07:00`
    const tsEnd   = `${end}T23:59:59+07:00`

    const { data: attendances, error: attErr } = await supabaseAdmin
      .from('attendances')
      .select('user_id, scan_time, status_scan')
      .in('user_id', userIds)
      .gte('scan_time', tsStart)
      .lte('scan_time', tsEnd)
      .order('scan_time', { ascending: true })

    if (attErr) throw attErr

    // Index: attMap[user_id][date] = [{ scan_time, isCheckIn }]
    const attMap = {}
    for (const att of (attendances || [])) {
      const dateStr = wibDateStr(att.scan_time)
      if (!dateStr) continue
      if (!attMap[att.user_id]) attMap[att.user_id] = {}
      if (!attMap[att.user_id][dateStr]) attMap[att.user_id][dateStr] = []
      attMap[att.user_id][dateStr].push(att)
    }

    // ── 5. Compute per-user stats ─────────────────────────────────────────────
    const results = []

    for (const user of users) {
      const workDays = (user.role?.work_days || '1,2,3,4,5').split(',').map(Number)
      const expectedIn  = user.expected_check_in  || DEFAULT_CHECK_IN
      const expectedOut = user.expected_check_out || DEFAULT_CHECK_OUT
      const expectedInMins  = timeToMinutes(expectedIn)
      const expectedOutMins = timeToMinutes(expectedOut)

      const summary = {
        user_id:    user.user_id,
        name:       `${user.user_nama_depan || ''} ${user.user_nama_belakang || ''}`.trim(),
        unit_id:    user.user_unit_id,
        unit_name:  unitMap[String(user.user_unit_id)] || '—',
        role_name:  user.role?.role_name || '—',
        expected_check_in:  expectedIn.slice(0, 5),
        expected_check_out: expectedOut.slice(0, 5),
        late_count:                0,
        late_minutes_total:        0,
        leave_early_count:         0,
        leave_early_minutes_total: 0,
        absent_count:              0,
        no_checkout_count:         0,
        work_days_in_range:        0,
        daily: []
      }

      for (const dateStr of allDates) {
        const dayNum = getDayNumber(dateStr)
        if (!workDays.includes(dayNum)) continue
        if (isHoliday(dateStr, user.user_role_id)) continue

        summary.work_days_in_range++

        const dayAtts = attMap[user.user_id]?.[dateStr] || []

        // Classify each scan as check-in or check-out using midpoint logic
        const checkins  = dayAtts
          .filter(a => resolveIsCheckIn(a.scan_time, expectedIn, expectedOut))
          .sort((a, b) => new Date(a.scan_time) - new Date(b.scan_time))

        const checkouts = dayAtts
          .filter(a => !resolveIsCheckIn(a.scan_time, expectedIn, expectedOut))
          .sort((a, b) => new Date(a.scan_time) - new Date(b.scan_time))

        const dayRecord = {
          date:               dateStr,
          checkin_time:       null,
          checkout_time:      null,
          late_minutes:       0,
          leave_early_minutes:0,
          status:             'ok',
          issues:             []
        }

        const noCheckIn  = checkins.length === 0
        const noCheckOut = checkouts.length === 0

        if (noCheckIn && noCheckOut) {
          // ── Tidak masuk sama sekali ───────────────────────────────────
          summary.absent_count++
          dayRecord.status = 'absent'
          dayRecord.issues.push('absent')

        } else {
          // ── Analisis Check-In ────────────────────────────────────────
          if (!noCheckIn) {
            const timeStr = wibTimeStr(checkins[0].scan_time)
            dayRecord.checkin_time = timeStr
            const actualInMins = timeToMinutes(timeStr)
            const lateMins = actualInMins - expectedInMins - grace
            if (lateMins > 0) {
              summary.late_count++
              summary.late_minutes_total += lateMins
              dayRecord.late_minutes = lateMins
              dayRecord.issues.push('late')
            }
          } else {
            dayRecord.issues.push('no_checkin')
          }

          // ── Analisis Check-Out ───────────────────────────────────────
          if (!noCheckOut) {
            const timeStr = wibTimeStr(checkouts[checkouts.length - 1].scan_time)
            dayRecord.checkout_time = timeStr
            const actualOutMins = timeToMinutes(timeStr)
            const earlyMins = expectedOutMins - actualOutMins - grace
            if (earlyMins > 0) {
              summary.leave_early_count++
              summary.leave_early_minutes_total += earlyMins
              dayRecord.leave_early_minutes = earlyMins
              dayRecord.issues.push('leave_early')
            }
          } else if (!noCheckIn) {
            // Check-in ada tapi tidak check-out
            summary.no_checkout_count++
            dayRecord.issues.push('no_checkout')
          }

          dayRecord.status = dayRecord.issues.length === 0
            ? 'ok'
            : dayRecord.issues.length === 1
              ? dayRecord.issues[0]
              : 'multiple'
        }

        summary.daily.push(dayRecord)
      }

      results.push(summary)
    }

    results.sort((a, b) => {
      if (a.unit_name !== b.unit_name) return a.unit_name.localeCompare(b.unit_name)
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      success: true,
      data:   results,
      dates:  allDates,
      range:  { start, end },
      grace,
      meta: {
        total_users:       results.length,
        total_attendances: attendances?.length || 0,
      }
    })

  } catch (err) {
    console.error('[AttendanceReport]', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
