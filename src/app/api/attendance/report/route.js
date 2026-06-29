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

    const start      = searchParams.get('start')   || defStart
    const end        = searchParams.get('end')     || defEnd
    const unitId     = searchParams.get('unit_id') || null
    const roleId     = searchParams.get('role_id') || null
    const singleUser = searchParams.get('user_id') || null  // filter satu karyawan
    const grace      = parseInt(searchParams.get('grace') || '0', 10)

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

    // ── 1b. Special Day Rules ─────────────────────────────────────────────────
    // Aturan hari khusus: Sabtu wajib masuk, jam pulang lebih awal, dsb.
    // Prioritas: user-specific > role > global
    let specialRules = []
    try {
      const { data: srData } = await supabaseAdmin
        .from('special_day_rules')
        .select('id, tanggal, scope_type, role_id, user_id, is_work_day, custom_check_in, custom_check_out')
        .gte('tanggal', start)
        .lte('tanggal', end)
      specialRules = srData || []
    } catch (_) {
      specialRules = []
    }

    /**
     * Cari aturan khusus yang berlaku untuk (tanggal, roleId, userId).
     * Prioritas: user > role > global. Kembalikan null jika tidak ada.
     */
    const resolveSpecialRule = (dateStr, userRoleId, userId) => {
      const matching = specialRules.filter(r => r.tanggal === dateStr)
      // user-specific (highest priority)
      const userRule = matching.find(r => r.scope_type === 'user' && String(r.user_id) === String(userId))
      if (userRule) return userRule
      // role-specific
      const roleRule = matching.find(r => r.scope_type === 'role' && String(r.role_id) === String(userRoleId))
      if (roleRule) return roleRule
      // global
      const globalRule = matching.find(r => r.scope_type === 'all')
      return globalRule || null
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

    if (unitId)     userQuery = userQuery.eq('user_unit_id', parseInt(unitId, 10))
    if (roleId)     userQuery = userQuery.eq('user_role_id', parseInt(roleId, 10))
    if (singleUser) userQuery = userQuery.eq('user_id',      parseInt(singleUser, 10))

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
    // Supabase default limit = 1000 rows. Monthly reports can have thousands of
    // scans (100 users × 2 scans × 25 days = ~5000). We paginate in batches of
    // 1000 to collect ALL records without hitting the row limit.
    const tsStart = `${start}T00:00:00+07:00`
    const tsEnd   = `${end}T23:59:59+07:00`

    const BATCH_SIZE = 1000
    let allAttendances = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const { data: batch, error: attErr } = await supabaseAdmin
        .from('attendances')
        .select('user_id, scan_time, status_scan')
        .in('user_id', userIds)
        .gte('scan_time', tsStart)
        .lte('scan_time', tsEnd)
        .order('scan_time', { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1)

      if (attErr) throw attErr
      if (!batch || batch.length === 0) break

      allAttendances = allAttendances.concat(batch)
      hasMore = batch.length === BATCH_SIZE
      offset += BATCH_SIZE
    }

    const attendances = allAttendances

    // Index: attMap[user_id][date] = [{ scan_time, isCheckIn }]
    const attMap = {}
    for (const att of (attendances || [])) {
      const dateStr = wibDateStr(att.scan_time)
      if (!dateStr) continue
      if (!attMap[att.user_id]) attMap[att.user_id] = {}
      if (!attMap[att.user_id][dateStr]) attMap[att.user_id][dateStr] = []
      attMap[att.user_id][dateStr].push(att)
    }

    // ── 4b. Excuse Map ────────────────────────────────────────────────────────
    // Fetch approved/rejected excuses for this date range to overlay on report
    let excuseMap = {} // excuseMap[user_id][dateStr] = excuse row
    try {
      const { data: excuses } = await supabaseAdmin
        .from('attendance_excuses')
        .select('user_id, excuse_type, attendance_date, status, approver1_id, approver2_id, approver1_action, approver1_note, approver2_action, approver2_note')
        .in('user_id', userIds)
        .gte('attendance_date', start)
        .lte('attendance_date', end)
      for (const ex of (excuses || [])) {
        if (!excuseMap[ex.user_id]) excuseMap[ex.user_id] = {}
        excuseMap[ex.user_id][ex.attendance_date] = ex
      }
    } catch (_) {}

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
        const specialRule = resolveSpecialRule(dateStr, user.user_role_id, user.user_id)

        // Tentukan apakah hari ini dihitung hari kerja:
        // - Jika ada special rule dengan is_work_day=true  → paksa jadi hari kerja (override weekend/libur)
        // - Jika ada special rule dengan is_work_day=false → skip (bukan hari kerja)
        // - Tanpa special rule → ikut jadwal normal (work_days + bukan libur)
        let isWorkDay
        if (specialRule) {
          isWorkDay = specialRule.is_work_day
        } else {
          isWorkDay = workDays.includes(dayNum) && !isHoliday(dateStr, user.user_role_id)
        }
        if (!isWorkDay) continue

        // Jam masuk/keluar: pakai custom dari special rule jika ada, atau default user/role
        const effIn  = (specialRule?.custom_check_in  ? String(specialRule.custom_check_in).slice(0,5)  : null) || expectedIn
        const effOut = (specialRule?.custom_check_out ? String(specialRule.custom_check_out).slice(0,5) : null) || expectedOut
        const effInMins  = timeToMinutes(effIn)
        const effOutMins = timeToMinutes(effOut)

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
          // Gunakan effInMins (bisa dioverride oleh special rule)
          if (!noCheckIn) {
            const timeStr = wibTimeStr(checkins[0].scan_time)
            dayRecord.checkin_time = timeStr
            const actualInMins = timeToMinutes(timeStr)
            const lateMins = actualInMins - effInMins - grace
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
          // Gunakan effOutMins (bisa dioverride oleh special rule)
          if (!noCheckOut) {
            const timeStr = wibTimeStr(checkouts[checkouts.length - 1].scan_time)
            dayRecord.checkout_time = timeStr
            const actualOutMins = timeToMinutes(timeStr)
            const earlyMins = effOutMins - actualOutMins - grace
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

        // Simpan info special rule di dayRecord agar frontend bisa tampilkan
        if (specialRule) {
          dayRecord.special_rule = {
            keterangan:       specialRule.keterangan || null,
            custom_check_in:  effIn !== expectedIn  ? effIn  : null,
            custom_check_out: effOut !== expectedOut ? effOut : null,
            is_work_day:      specialRule.is_work_day,
          }
        }

        // ── Overlay: Excuse (Surat Keterangan) ───────────────────────────────
        const excuse = excuseMap[user.user_id]?.[dateStr]
        if (excuse) {
          dayRecord.excuse = {
            status:       excuse.status,
            excuse_type:  excuse.excuse_type,
          }

          if (excuse.status === 'approved') {
            // Disetujui: tandai sebagai excused — tidak ubah catatan terlambat,
            // tapi flag agar laporan tampilkan "Dimaafkan"
            dayRecord.excused = true

          } else if (excuse.status === 'rejected') {
            // Ditolak: override jadi absent dengan catatan
            const rejectedBy = excuse.approver1_action === 'rejected'
              ? excuse.approver1_note || 'Approver 1'
              : excuse.approver2_note || 'Approver 2'

            // Batalkan counter sebelumnya jika sudah dihitung late/leave_early
            if (dayRecord.issues.includes('late')) {
              summary.late_count = Math.max(0, summary.late_count - 1)
              summary.late_minutes_total = Math.max(0, summary.late_minutes_total - (dayRecord.late_minutes || 0))
            }
            if (dayRecord.issues.includes('leave_early')) {
              summary.leave_early_count = Math.max(0, summary.leave_early_count - 1)
              summary.leave_early_minutes_total = Math.max(0, summary.leave_early_minutes_total - (dayRecord.leave_early_minutes || 0))
            }
            // Tambahkan ke absent counter jika belum absent
            if (!dayRecord.issues.includes('absent')) {
              summary.absent_count++
            }

            dayRecord.status  = 'absent'
            dayRecord.issues  = ['absent']
            dayRecord.excuse.rejected_note = rejectedBy

          } else if (excuse.status === 'pending' || excuse.status === 'approved_1') {
            // Dalam proses — tandai saja, jangan ubah status
            dayRecord.excuse_pending = true
          }
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
