import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
  const last = new Date(end   + 'T00:00:00Z')
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

/**
 * GET /api/attendance/report?start=YYYY-MM-DD&end=YYYY-MM-DD&unit_id=&role_id=&grace=0
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const start     = searchParams.get('start')     || new Date().toISOString().slice(0, 7) + '-01'
    const end       = searchParams.get('end')       || new Date().toISOString().slice(0, 10)
    const unitId    = searchParams.get('unit_id')   || null
    const roleId    = searchParams.get('role_id')   || null
    const grace     = parseInt(searchParams.get('grace') || '0', 10)

    if (!start || !end || start > end) {
      return NextResponse.json({ success: false, message: 'Parameter start/end tidak valid' }, { status: 400 })
    }

    const allDates = dateRange(start, end)

    // ── 1. Load holidays for the range ──────────────────────────────────────
    const { data: holidays } = await supabaseAdmin
      .from('school_holidays')
      .select('date_start, date_end, role_id')
      .lte('date_start', end)
      .gte('date_end', start)

    // Precompute: for a given date + role_id, is it a holiday?
    const isHoliday = (dateStr, userRoleId) => {
      return (holidays || []).some(h => {
        if (dateStr < h.date_start || dateStr > h.date_end) return false
        if (h.role_id === null || h.role_id === undefined) return true // global
        return String(h.role_id) === String(userRoleId)
      })
    }

    // ── 2. Load users (with PIN, unit, role, schedule) ───────────────────────
    // Fetch units separately (no FK constraint between users.user_unit_id and unit)
    const { data: unitList } = await supabaseAdmin
      .from('unit')
      .select('unit_id, unit_name')
    const unitMap = Object.fromEntries((unitList || []).map(u => [String(u.unit_id), u.unit_name]))

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
      .not('expected_check_in', 'is', null)

    if (unitId) userQuery = userQuery.eq('user_unit_id', parseInt(unitId, 10))
    if (roleId) userQuery = userQuery.eq('user_role_id', parseInt(roleId, 10))

    const { data: users, error: usersErr } = await userQuery
    if (usersErr) throw usersErr
    if (!users?.length) {
      return NextResponse.json({ success: true, data: [], dates: allDates })
    }

    const userIds = users.map(u => u.user_id)

    // ── 3. Load all attendances in the date range ────────────────────────────
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

    // Index attendances by user_id → date → [records]
    const attMap = {}
    for (const att of (attendances || [])) {
      const dt = new Date(att.scan_time)
      // Convert to WIB date string
      const wibOffset = 7 * 60 * 60 * 1000
      const wibDate = new Date(dt.getTime() + wibOffset).toISOString().slice(0, 10)
      const key = `${att.user_id}__${wibDate}`
      if (!attMap[key]) attMap[key] = []
      attMap[key].push({ ...att, wibDate })
    }

    // ── 4. Compute per-user stats ────────────────────────────────────────────
    const results = []

    for (const user of users) {
      const workDays = (user.role?.work_days || '1,2,3,4,5').split(',').map(Number)
      const expectedInMins  = timeToMinutes(user.expected_check_in)
      const expectedOutMins = timeToMinutes(user.expected_check_out)

      const summary = {
        user_id:          user.user_id,
        name:             `${user.user_nama_depan || ''} ${user.user_nama_belakang || ''}`.trim(),
        unit_id:          user.user_unit_id,
        unit_name:        unitMap[String(user.user_unit_id)] || '—',
        role_name:        user.role?.role_name || '—',
        expected_check_in:  user.expected_check_in?.slice(0, 5) || '',
        expected_check_out: user.expected_check_out?.slice(0, 5) || '',
        // Totals
        late_count:             0,
        late_minutes_total:     0,
        leave_early_count:      0,
        leave_early_minutes_total: 0,
        absent_count:           0,   // no check-in AND no check-out
        no_checkout_count:      0,   // checked in but no checkout
        work_days_in_range:     0,   // actual working days in this range
        // Daily breakdown
        daily: []
      }

      for (const dateStr of allDates) {
        const dayNum = getDayNumber(dateStr)
        if (!workDays.includes(dayNum)) continue
        if (isHoliday(dateStr, user.user_role_id)) continue

        summary.work_days_in_range++

        const dayAtts = attMap[`${user.user_id}__${dateStr}`] || []
        const checkins  = dayAtts.filter(a => String(a.status_scan) === '0').sort((a, b) => new Date(a.scan_time) - new Date(b.scan_time))
        const checkouts = dayAtts.filter(a => String(a.status_scan) === '1').sort((a, b) => new Date(a.scan_time) - new Date(b.scan_time))

        const dayRecord = {
          date:           dateStr,
          checkin_time:   null,
          checkout_time:  null,
          late_minutes:   0,
          leave_early_minutes: 0,
          status:         'ok', // ok | late | leave_early | absent | no_checkout | multiple
          issues:         []
        }

        const noCheckIn  = checkins.length === 0
        const noCheckOut = checkouts.length === 0

        // ── Absent: no check-in AND no check-out ──────────────────────────
        if (noCheckIn && noCheckOut) {
          summary.absent_count++
          dayRecord.status = 'absent'
          dayRecord.issues.push('absent')
        } else {
          // ── Check-in analysis ──────────────────────────────────────────
          if (!noCheckIn) {
            const firstIn = new Date(checkins[0].scan_time)
            const inMins  = firstIn.getUTCHours() * 60 + firstIn.getUTCMinutes() // still UTC, adjust:
            // Actually scan_time is stored as WIB, so getHours() in UTC = WIB hours (no offset needed if stored correctly)
            // But to be safe, use WIB offset:
            const wibIn   = new Date(firstIn.getTime() + 7 * 60 * 60 * 1000)
            const actualInMins = wibIn.getUTCHours() * 60 + wibIn.getUTCMinutes()
            dayRecord.checkin_time = `${String(wibIn.getUTCHours()).padStart(2,'0')}:${String(wibIn.getUTCMinutes()).padStart(2,'0')}`

            if (expectedInMins !== null) {
              const lateMins = actualInMins - expectedInMins - grace
              if (lateMins > 0) {
                summary.late_count++
                summary.late_minutes_total += lateMins
                dayRecord.late_minutes = lateMins
                dayRecord.issues.push('late')
              }
            }
          } else {
            // no_checkin but has checkout (rare)
            dayRecord.issues.push('no_checkin')
          }

          // ── Check-out analysis ─────────────────────────────────────────
          if (!noCheckOut) {
            const lastOut = new Date(checkouts[checkouts.length - 1].scan_time)
            const wibOut  = new Date(lastOut.getTime() + 7 * 60 * 60 * 1000)
            const actualOutMins = wibOut.getUTCHours() * 60 + wibOut.getUTCMinutes()
            dayRecord.checkout_time = `${String(wibOut.getUTCHours()).padStart(2,'0')}:${String(wibOut.getUTCMinutes()).padStart(2,'0')}`

            if (expectedOutMins !== null) {
              const earlyMins = expectedOutMins - actualOutMins - grace
              if (earlyMins > 0) {
                summary.leave_early_count++
                summary.leave_early_minutes_total += earlyMins
                dayRecord.leave_early_minutes = earlyMins
                dayRecord.issues.push('leave_early')
              }
            }
          } else if (!noCheckIn) {
            // Has check-in but no check-out
            summary.no_checkout_count++
            dayRecord.issues.push('no_checkout')
          }

          // Set status string
          if (dayRecord.issues.length === 0) {
            dayRecord.status = 'ok'
          } else if (dayRecord.issues.length === 1) {
            dayRecord.status = dayRecord.issues[0]
          } else {
            dayRecord.status = 'multiple'
          }
        }

        summary.daily.push(dayRecord)
      }

      results.push(summary)
    }

    // Sort by unit_name, then name
    results.sort((a, b) => {
      if (a.unit_name !== b.unit_name) return a.unit_name.localeCompare(b.unit_name)
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      success: true,
      data: results,
      dates: allDates,
      range: { start, end },
      grace,
    })

  } catch (err) {
    console.error('[AttendanceReport] Error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
