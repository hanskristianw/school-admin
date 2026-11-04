import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const LEAVE_MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatLeaveDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const mIdx = parseInt(m, 10) - 1
  const mName = LEAVE_MONTHS_EN[mIdx] || m
  const day = parseInt(d, 10)
  const yr = String(y).slice(-2)
  return `${day}-${mName}-${yr}`
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || '2026-11'
    const today = new Date().toISOString().slice(0, 10)

    // 1. Resolve Academic Year
    const targetMidDate = `${month}-15`
    const { data: years, error: yErr } = await supabaseAdmin.from('year').select('*')
    if (yErr) throw yErr

    const activeYear = years?.find(y => y.start_date <= targetMidDate && y.end_date >= targetMidDate)
      || years?.find(y => y.year_id === 3)
      || { year_id: 3, year_name: '2026/2027', start_date: '2026-07-01', end_date: '2027-06-30' }

    // 2. Fetch Operational Users (user_unit_id = 6)
    const [
      { data: users, error: uErr },
      { data: roles, error: rErr },
      { data: positions, error: pErr },
      { data: quotas, error: qErr },
      { data: excuses, error: exErr }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*').eq('user_unit_id', 6).order('user_nama_depan', { ascending: true }),
      supabaseAdmin.from('role').select('*'),
      supabaseAdmin.from('user_position_history').select('*').order('start_date', { ascending: false }),
      supabaseAdmin.from('leave_quotas').select('*').eq('year_id', activeYear.year_id),
      supabaseAdmin.from('attendance_excuses')
        .select('id, user_id, attendance_date, category, status, excuse_type')
        .gte('attendance_date', activeYear.start_date || '2026-07-01')
        .lte('attendance_date', activeYear.end_date || '2027-06-30')
        .in('status', ['approved', 'approved_1', 'pending'])
        .order('attendance_date', { ascending: true })
    ])

    if (uErr) throw uErr
    if (rErr) throw rErr
    if (pErr) throw pErr
    if (qErr) throw qErr
    if (exErr) throw exErr

    const roleMap = {}
    ;(roles || []).forEach(r => { roleMap[r.role_id] = r })
    const posMap = {}
    ;(positions || []).forEach(p => {
      if (!posMap[p.user_id]) posMap[p.user_id] = p
    })

    // Categories considered cuti / leave in attendance excuses
    const cutiCategories = [
      'annual_leave',
      'incidental_leave',
      'marriage_employee',
      'marriage_child',
      'childbirth',
      'circumcision_child',
      'baptism_child',
      'bereavement_core',
      'bereavement_sibling',
      'unpaid_leave'
    ]

    const excuseMap = {}
    ;(excuses || [])
      .filter(e => cutiCategories.includes(e.category) || e.excuse_type === 'cuti')
      .forEach(e => {
        excuseMap[e.user_id] = excuseMap[e.user_id] || []
        const existing = excuseMap[e.user_id].find(x => x.rawDate === e.attendance_date)
        if (!existing) {
          excuseMap[e.user_id].push({
            date: formatLeaveDate(e.attendance_date),
            rawDate: e.attendance_date,
            status: e.status,
            is_approved: e.status === 'approved'
          })
        } else if (e.status === 'approved' && !existing.is_approved) {
          existing.status = 'approved'
          existing.is_approved = true
        }
      })

    // Filter strictly for active operational staff:
    // - Must be Operational (user_unit_id === 6)
    // - Must NOT be vendor (role.is_vendor !== true)
    // - Must NOT be inactive (is_active !== false)
    // - Must NOT have resigned (resign_date is null or > today)
    // - Must NOT be student, guest, or yayasan board
    const eligibleUsers = (users || []).filter(u => {
      const r = roleMap[u.user_role_id]
      if (!r) return false
      if (r.is_vendor) return false
      if (r.is_student) return false
      if (r.role_name === 'Guest') return false
      if (r.role_name === 'Anggota Pengurus Yayasan') return false
      if (u.is_active === false) return false
      if (u.resign_date && u.resign_date <= today) return false
      return true
    })

    // Sort order: known priority operational staff first, then alphabetical
    const priorityIds = [66, 389, 10, 87, 391, 76, 67]
    eligibleUsers.sort((a, b) => {
      const idxA = priorityIds.indexOf(a.user_id)
      const idxB = priorityIds.indexOf(b.user_id)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      const nameA = `${a.user_nama_depan || ''} ${a.user_nama_belakang || ''}`.trim().toLowerCase()
      const nameB = `${b.user_nama_depan || ''} ${b.user_nama_belakang || ''}`.trim().toLowerCase()
      return nameA.localeCompare(nameB)
    })

    const rows = eligibleUsers.map((u, idx) => {
      const r = roleMap[u.user_role_id]
      const p = posMap[u.user_id]
      const fullName = `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
      const posTitle = p?.position_title || r?.role_name || 'Operational Staff'
      const deptName = 'Operational'
      let isPermanent = 'Yes'
      if (u.is_permanent !== undefined && u.is_permanent !== null) {
        isPermanent = u.is_permanent ? 'Yes' : 'No'
      } else if (r?.is_part_time_staff) {
        isPermanent = 'No'
      }
      const sinceDate = u.join_date ? formatLeaveDate(u.join_date) : (p?.start_date ? formatLeaveDate(p.start_date) : '—')

      // Quota: check leave_quotas for annual_leave
      // Note: If userQ exists in DB with total_days: 0 (e.g. newly hired employees like Yenny),
      // we MUST respect 0 rather than falling back to 12 via truthy check.
      const userQ = (quotas || []).find(q => q.user_id === u.user_id && q.leave_type_code === 'annual_leave')
      const totalAllocation = userQ != null
        ? Number(userQ.total_days ?? 0)
        : (isPermanent === 'Yes' ? 12 : 0)

      const rawLeaves = excuseMap[u.user_id] || []
      const formattedDates = rawLeaves.map(l => l.date)
      const totalUsed = rawLeaves.length
      const remaining = Math.max(0, totalAllocation - totalUsed)

      return {
        no: idx + 1,
        user_id: u.user_id,
        name: fullName,
        position: posTitle,
        department: deptName,
        is_permanent: isPermanent,
        since: sinceDate,
        dates: formattedDates,
        leaves: rawLeaves,
        total_used: totalUsed,
        remaining: remaining,
        total_allocation: totalAllocation
      }
    })

    return NextResponse.json({
      success: true,
      year: activeYear,
      data: rows
    })
  } catch (err) {
    console.error('Error in GET /api/attendance/operational-leave:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
