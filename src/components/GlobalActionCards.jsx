'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faCalendarCheck, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function monthStart(ym) { return `${ym}-01` }
function monthEnd(ym) {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDutyDateLabel(dateStr) {
  if (!dateStr) return ''
  const dt = new Date(dateStr + 'T00:00:00Z')
  if (isNaN(dt.getTime())) return dateStr
  const todayStr = new Date().toISOString().slice(0, 10)
  const isToday = dateStr === todayStr
  
  const dayName = DAY_NAMES[dt.getUTCDay()]
  const dayNum = String(dt.getUTCDate()).padStart(2, '0')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = monthNames[dt.getUTCMonth()]
  
  const dateFormatted = `${dayName}, ${dayNum} ${monthName}`
  return isToday ? `Today (${dateFormatted})` : dateFormatted
}

function resolveUserDuties(row, uId, timeMap) {
  if (!row || !uId) return []
  const unitId = row.unit_id || row.unit?.unit_id
  const getTM = (type, defaultVal) => {
    if (unitId && timeMap && timeMap[`${type}_unit_${unitId}`]) return timeMap[`${type}_unit_${unitId}`]
    return timeMap?.[type] || defaultVal
  }

  const tm = {
    devotion: getTM('devotion', '07:30–08:00'),
    greeter:  getTM('greeter', '07:30–08:00'),
    break:    getTM('break', '09:45–10:15'),
    lunch:    getTM('lunch', '12:30–13:00'),
  }
  const duties = []
  if (row.devotion_leader_user_id === uId) duties.push({ type: 'devotion', label: `Devotion Leader (${tm.devotion})`, icon: '📖' })
  if (row.greeter_1st_floor_user_id === uId) duties.push({ type: 'greeter', label: `Morning Greeter 1st Fl (${tm.greeter})`, icon: '🚪' })
  if (row.greeter_2nd_floor_user_id === uId) duties.push({ type: 'greeter', label: `Morning Greeter 2nd Fl (${tm.greeter})`, icon: '🚪' })
  if (row.break_canteen_user_id === uId) duties.push({ type: 'break', label: `Break Duty (Canteen) (${tm.break})`, icon: '🍿' })
  if (row.break_pe_field_user_id === uId) duties.push({ type: 'break', label: `Break Duty (PE Field) (${tm.break})`, icon: '⚽' })
  if (row.break_2nd_floor_user_id === uId) duties.push({ type: 'break', label: `Break Duty (2nd Fl) (${tm.break})`, icon: '🏢' })
  if (row.break_3rd_floor_user_id === uId) duties.push({ type: 'break', label: `Break Duty (3rd Fl) (${tm.break})`, icon: '🏢' })
  if (row.lunch_canteen_user_id === uId) duties.push({ type: 'lunch', label: `Lunch Duty (Canteen) (${tm.lunch})`, icon: '🍱' })
  if (row.lunch_pe_field_user_id === uId) duties.push({ type: 'lunch', label: `Lunch Duty (PE Field) (${tm.lunch})`, icon: '⚽' })
  if (row.lunch_2nd_floor_user_id === uId) duties.push({ type: 'lunch', label: `Lunch Duty (2nd Fl) (${tm.lunch})`, icon: '🏢' })
  if (row.lunch_3rd_floor_user_id === uId) duties.push({ type: 'lunch', label: `Lunch Duty (3rd Fl) (${tm.lunch})`, icon: '🏢' })
  return duties
}

export default function GlobalActionCards() {
  const router = useRouter()
  const { theme } = useTheme()

  const [userId, setUserId] = useState(null)

  // Card 1: FPB pending approvals
  const [fpbCount, setFpbCount]       = useState(null)
  const [fpbLoading, setFpbLoading]   = useState(false)

  // Card 2: Attendance Excuse Approvals pending for THIS user (as L1 or L2 approver)
  const [attApprovalCount, setAttApprovalCount]     = useState(null)
  const [attApprovalLoading, setAttApprovalLoading] = useState(false)

  // Card 3: Attendance excuses not yet filed by THIS user
  const [attCount, setAttCount]       = useState(null)
  const [attLoading, setAttLoading]   = useState(false)

  // Card 4: Incident Reports needing follow-up / handling
  const [incidentCount, setIncidentCount]     = useState(null)
  const [incidentLoading, setIncidentLoading] = useState(false)

  // Card 5: Duty & Devotion Schedule (duty_schedules)
  const [dutySchedules, setDutySchedules] = useState([])
  const [dutyIndex, setDutyIndex]         = useState(0)
  const [dutyLoading, setDutyLoading]     = useState(false)
  const [dutyTimeMap, setDutyTimeMap]     = useState({
    devotion: '07:30–08:00',
    greeter:  '07:30–08:00',
    break:    '09:45–10:15',
    lunch:    '12:30–13:00'
  })

  // ── Fetch dynamic duty_settings from database ──────────────────────────────
  useEffect(() => {
    const fetchTimeSettings = async () => {
      try {
        const { data } = await supabase.from('duty_settings').select('*')
        if (data && data.length > 0) {
          const newMap = {
            devotion: '07:30–08:00',
            greeter:  '07:30–08:00',
            break:    '09:45–10:15',
            lunch:    '12:30–13:00'
          }
          data.forEach(item => {
            if (item.slot_key && item.start_time) {
              const st = String(item.start_time).slice(0, 5)
              const et = item.end_time ? String(item.end_time).slice(0, 5) : ''
              newMap[item.slot_key] = et ? `${st}–${et}` : st
            }
          })
          setDutyTimeMap(newMap)
        }
      } catch (_) {}
    }
    fetchTimeSettings()
  }, [])

  // ── Get current user id ───────────────────────────────────────────────────
  useEffect(() => {
    const id = localStorage.getItem('kr_id')
    if (id) setUserId(parseInt(id, 10))
  }, [])

  // ── Card 1: Count pending FPB approvals for this user ────────────────────
  useEffect(() => {
    if (!userId) return
    setFpbLoading(true)

    const fetchFpbCount = async () => {
      try {
        const { data: userRow } = await supabase.from('users').select('user_role_id').eq('user_id', userId).single()
        const myRoleId = userRow?.user_role_id

        const { data: myApprovals } = await supabase
          .from('fpb_approvals')
          .select('approval_id, fpb_id, step_order, approver_order, status, fpb(status, current_step)')
          .eq('approver_user_id', userId)

        let myScreeningApprovals = []
        if (myRoleId) {
          const { data: scrData } = await supabase
            .from('fpb_approvals')
            .select('approval_id, fpb_id, step_order, approver_order, status, fpb(status, current_step)')
            .eq('approver_role_id', myRoleId)
            .eq('approver_order', 0)
          myScreeningApprovals = scrData || []
        }

        const allMyApprovals = [...(myApprovals || []), ...myScreeningApprovals]
        const activeCandidates = allMyApprovals.filter(a => a.fpb?.status === 'pending' && a.status === 'pending')

        if (activeCandidates.length === 0) {
          setFpbCount(0)
          return
        }

        const fpbIds = activeCandidates.map(a => a.fpb_id)
        const { data: allStepApprovals } = await supabase
          .from('fpb_approvals')
          .select('fpb_id, step_order, approver_order, status, approval_id')
          .in('fpb_id', fpbIds)

        let actionableCount = 0
        const seen = new Set()

        for (const a of activeCandidates) {
          if (seen.has(a.fpb_id)) continue

          const allInStep = (allStepApprovals || []).filter(ap => ap.fpb_id === a.fpb_id && ap.step_order === a.step_order)
          let isMyTurn = false

          if (a.approver_order === 0) {
            isMyTurn = a.fpb?.current_step === a.step_order
          } else {
            if (a.fpb?.current_step === a.step_order) {
              const screenerRow = allInStep.find(ap => ap.approver_order === 0)
              if (!screenerRow || screenerRow.status === 'approved') {
                const regularInStep = allInStep.filter(ap => ap.approver_order !== 0)
                const hasOrder = regularInStep.every(ap => ap.approver_order != null)
                let blockers
                if (hasOrder) {
                  const myPos = a.approver_order ?? 1
                  blockers = regularInStep.filter(ap => (ap.approver_order ?? 1) < myPos && ap.status !== 'approved')
                } else {
                  const sorted = [...regularInStep].sort((x, y) => x.approval_id - y.approval_id)
                  const myPos = sorted.findIndex(ap => ap.approval_id === a.approval_id)
                  blockers = myPos > 0 ? sorted.slice(0, myPos).filter(ap => ap.status !== 'approved') : []
                }
                isMyTurn = blockers.length === 0
              }
            }
          }

          if (isMyTurn) {
            actionableCount++
            seen.add(a.fpb_id)
          }
        }
        setFpbCount(actionableCount)
      } catch (e) {
        console.error('Error counting FPB:', e)
        setFpbCount(0)
      } finally {
        setFpbLoading(false)
      }
    }

    fetchFpbCount()
  }, [userId])

  // ── Card 2: Count pending Attendance Excuse Approvals for THIS user (L1 or L2) ─
  useEffect(() => {
    if (!userId) return
    setAttApprovalLoading(true)

    fetch(`/api/attendance/excuses?approver_id=${userId}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          const pendingItems = json.data.filter(e => {
            if (e.approver1_id === userId && e.status === 'pending') return true
            if (e.approver2_id === userId && e.status === 'approved_1') return true
            return false
          })
          setAttApprovalCount(pendingItems.length)
        } else {
          setAttApprovalCount(0)
        }
      })
      .catch(() => setAttApprovalCount(0))
      .finally(() => setAttApprovalLoading(false))
  }, [userId])

  // ── Card 3: Count attendance issues without excuse form this month for THIS user ──
  useEffect(() => {
    if (!userId) return
    setAttLoading(true)

    const checkRoleAndFetch = async () => {
      try {
        // Check if user's role has is_flexible_hours, is_part_time_staff, or is_vendor flag
        const { data: userRow } = await supabase.from('users').select('user_role_id').eq('user_id', userId).single()
        if (userRow?.user_role_id) {
          const { data: roleRow } = await supabase
            .from('role')
            .select('is_flexible_hours, is_part_time_staff, is_vendor')
            .eq('role_id', userRow.user_role_id)
            .single()

          if (roleRow?.is_flexible_hours || roleRow?.is_part_time_staff || roleRow?.is_vendor) {
            setAttCount(0)
            setAttLoading(false)
            return
          }
        }

        const today = new Date()
        const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        const yStr = yesterday.toISOString().slice(0, 10)
        const start = monthStart(ym)
        const end   = yStr < monthEnd(ym) ? yStr : monthEnd(ym)

        const [rRes, eRes] = await Promise.all([
          fetch(`/api/attendance/report?user_id=${userId}&start=${start}&end=${end}`),
          fetch(`/api/attendance/excuses?user_id=${userId}&start=${start}&end=${end}`),
        ])

        const rJson = await rRes.json()
        const eJson = await eRes.json()

        const excusedDates = new Set(
          (eJson.success ? eJson.data || [] : []).map(e => e.attendance_date)
        )

        let count = 0
        if (rJson.success) {
          for (const user of rJson.data || []) {
            for (const day of user.daily || []) {
              if (['holiday', 'dayoff', 'off'].includes(day.status)) continue
              const hasIssue = day.issues?.some(i =>
                ['late', 'leave_early', 'absent', 'no_checkin', 'no_checkout'].includes(i)
              )
              if (hasIssue && !excusedDates.has(day.date)) count++
            }
          }
        }
        setAttCount(count)
      } catch (err) {
        console.error('Error fetching attendance issues for action card:', err)
        setAttCount(0)
      } finally {
        setAttLoading(false)
      }
    }

    checkRoleAndFetch()
  }, [userId])

  // ── Card 4: Count Incident Reports needing follow-up for configured recipient user ──
  useEffect(() => {
    if (!userId) return
    setIncidentLoading(true)

    const fetchIncidentCount = async () => {
      try {
        // 1. Check if this user is configured in /settings/incident-report (incident_unit_recipients)
        const { data: recipientRows, error: recErr } = await supabase
          .from('incident_unit_recipients')
          .select('unit_id')
          .eq('user_id', userId)

        if (recErr || !recipientRows || recipientRows.length === 0) {
          // User is not set in incident report settings recipient list -> do not show card
          setIncidentCount(0)
          return
        }

        const unitIds = recipientRows.map(r => r.unit_id).filter(Boolean)

        let query = supabase
          .from('incident_reports')
          .select('id', { count: 'exact', head: true })
          .in('status', ['waiting', 'on_progress'])

        if (unitIds.length > 0) {
          query = query.in('unit_id', unitIds)
        }

        const { count, error } = await query

        if (!error && count !== null) {
          setIncidentCount(count)
        } else {
          setIncidentCount(0)
        }
      } catch (err) {
        console.error('Error fetching incident count for action card:', err)
        setIncidentCount(0)
      } finally {
        setIncidentLoading(false)
      }
    }

    fetchIncidentCount()
  }, [userId])

  // ── Card 5: Fetch Duty & Devotion Schedule for this user ─────────────────
  useEffect(() => {
    if (!userId) return
    setDutyLoading(true)

    const fetchDutySchedules = async () => {
      try {
        const { data, error } = await supabase
          .from('duty_schedules')
          .select('*, unit(unit_id, unit_name)')
          .or(`devotion_leader_user_id.eq.${userId},greeter_1st_floor_user_id.eq.${userId},greeter_2nd_floor_user_id.eq.${userId},break_canteen_user_id.eq.${userId},break_pe_field_user_id.eq.${userId},break_2nd_floor_user_id.eq.${userId},break_3rd_floor_user_id.eq.${userId},lunch_canteen_user_id.eq.${userId},lunch_pe_field_user_id.eq.${userId},lunch_2nd_floor_user_id.eq.${userId},lunch_3rd_floor_user_id.eq.${userId}`)
          .order('duty_date', { ascending: true })

        if (error) throw error

        const list = data || []
        setDutySchedules(list)

        // Default to Today's date or nearest upcoming date (duty_date >= todayStr)
        const todayStr = new Date().toISOString().slice(0, 10)
        let defaultIdx = list.findIndex(r => r.duty_date === todayStr)
        if (defaultIdx === -1) {
          defaultIdx = list.findIndex(r => r.duty_date >= todayStr)
        }
        if (defaultIdx === -1 && list.length > 0) {
          defaultIdx = list.length - 1 // Fallback to last recorded
        }
        setDutyIndex(Math.max(0, defaultIdx))
      } catch (e) {
        // Table might not exist yet or error
        setDutySchedules([])
      } finally {
        setDutyLoading(false)
      }
    }

    fetchDutySchedules()
  }, [userId])

  // ── Card 6: Teaching Schedule for Teachers ───────────────────────────────
  const [teachingSchedule, setTeachingSchedule] = useState([])
  const [teachingDayIndex, setTeachingDayIndex] = useState(() => {
    const day = new Date().getDay()
    // Map Sunday=0..Saturday=6 to Monday=0..Friday=4. If weekend, default to Monday (0)
    if (day >= 1 && day <= 5) return day - 1
    return 0
  })
  const [activeYearInfo, setActiveYearInfo]     = useState(null)
  const [todayException, setTodayException]     = useState(null)
  const [teachingLoading, setTeachingLoading]   = useState(false)
  const [isTeacherUser, setIsTeacherUser]       = useState(false)

  useEffect(() => {
    if (!userId) return
    setTeachingLoading(true)

    const fetchTeachingSchedule = async () => {
      try {
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]

        // 1. Fetch active academic year
        const { data: yearsData, error: yErr } = await supabase
          .from('year')
          .select('year_id, year_name, start_date, end_date')
          .order('year_name', { ascending: false })
        if (yErr) throw yErr

        const activeYear = (yearsData || []).find(y => {
          if (!y.start_date || !y.end_date) return false
          return todayStr >= y.start_date && todayStr <= y.end_date
        }) || (yearsData && yearsData.length > 0 ? yearsData[0] : null)

        setActiveYearInfo(activeYear)
        if (!activeYear) return

        // 2. Fetch exceptions for today
        const { data: exData } = await supabase
          .from('timetable_exception')
          .select('*')
          .eq('exception_date', todayStr)
        if (exData && exData.length > 0) setTodayException(exData[0])

        // 3. Get classes in active academic year
        const { data: kelasData, error: kErr } = await supabase
          .from('kelas')
          .select('kelas_id, kelas_nama, kelas_unit_id, kelas_year_id')
          .eq('kelas_year_id', activeYear.year_id)
        if (kErr) throw kErr

        const activeKelasIds = (kelasData || []).map(k => k.kelas_id)
        const kelasMap = new Map((kelasData || []).map(k => [k.kelas_id, k]))
        if (activeKelasIds.length === 0) return

        // 4. Get all detail_kelas in active year
        const { data: dkData, error: dkErr } = await supabase
          .from('detail_kelas')
          .select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id, teacher_user_id')
          .in('detail_kelas_kelas_id', activeKelasIds)
        if (dkErr) throw dkErr

        if (!dkData || dkData.length === 0) return

        // 5. Get subjects (including subject_user_id)
        const subjectIds = Array.from(new Set(dkData.map(d => d.detail_kelas_subject_id)))
        let subjMap = new Map()
        if (subjectIds.length > 0) {
          const { data: subjs } = await supabase
            .from('subject')
            .select('subject_id, subject_name, subject_code, subject_user_id')
            .in('subject_id', subjectIds)
          subjMap = new Map((subjs || []).map(s => [s.subject_id, s]))
        }

        // Filter detail_kelas for this teacher (explicit override or fallback to subject default teacher)
        const myDkList = dkData.filter(d => {
          if (d.teacher_user_id) return d.teacher_user_id === userId
          const subj = subjMap.get(d.detail_kelas_subject_id)
          return subj?.subject_user_id === userId
        })

        if (myDkList.length > 0) {
          setIsTeacherUser(true)

          const dkMap = new Map(myDkList.map(d => [d.detail_kelas_id, {
            ...d,
            subject: subjMap.get(d.detail_kelas_subject_id) || null,
            kelas: kelasMap.get(d.detail_kelas_kelas_id) || null,
          }]))

          const myDkIds = myDkList.map(d => d.detail_kelas_id)

          // 6. Fetch all timetable slots for this teacher
          const { data: ttData, error: ttErr } = await supabase
            .from('timetable')
            .select('timetable_id, timetable_detail_kelas_id, timetable_day, timetable_time, custom_label, kelas_id, custom_color')
            .in('timetable_detail_kelas_id', myDkIds)
          if (ttErr) throw ttErr

          const parseRange = (pgRange) => {
            if (!pgRange) return { start: '', end: '' }
            const m = pgRange.match(/^[\[(](.*),(.*)[)\]]$/)
            if (!m) return { start: '', end: '' }
            const clean = (raw) => {
              let v = raw.trim()
              if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
              if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) v += ':00'
              return v
            }
            return { start: clean(m[1]), end: clean(m[2]) }
          }

          const extractHM = (ts) => {
            if (!ts) return ''
            const parts = ts.split(' ')
            if (parts.length < 2) return ''
            return parts[1].slice(0, 5)
          }

          const enriched = (ttData || []).map(r => {
            const { start, end } = parseRange(r.timetable_time)
            const startTime = extractHM(start)
            const endTime = extractHM(end)
            const durationMin = (() => {
              const s = new Date(start.replace(' ', 'T'))
              const e = new Date(end.replace(' ', 'T'))
              return (!isNaN(s) && !isNaN(e) && e > s) ? Math.round((e - s) / 60000) : null
            })()
            const dk = dkMap.get(r.timetable_detail_kelas_id)
            return {
              ...r,
              startTime,
              endTime,
              durationMin,
              subject_name: dk?.subject?.subject_name || 'Subject',
              subject_code: dk?.subject?.subject_code || '',
              kelas_nama: dk?.kelas?.kelas_nama || 'Class',
            }
          }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

          setTeachingSchedule(enriched)
        } else {
          // Check if user has role is_teacher
          const { data: userRole } = await supabase
            .from('users')
            .select('user_role_id, role(is_teacher)')
            .eq('user_id', userId)
            .single()
          if (userRole?.role?.is_teacher) {
            setIsTeacherUser(true)
          }
        }
      } catch (e) {
        console.error('Teaching schedule load failed:', e)
      } finally {
        setTeachingLoading(false)
      }
    }

    fetchTeachingSchedule()
  }, [userId])

  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const selectedWeekdayName = WEEKDAYS[teachingDayIndex] || 'Monday'
  const todayWeekdayName = DAY_NAMES[new Date().getDay()]
  const isTodaySelected = selectedWeekdayName === todayWeekdayName
  const currentDaySessions = useMemo(() => {
    return teachingSchedule.filter(s => s.timetable_day === selectedWeekdayName)
  }, [teachingSchedule, selectedWeekdayName])

  // ── Active Duty Row & User Duties ─────────────────────────────────────────
  const currentDutyRow = dutySchedules[dutyIndex] || null
  const currentDuties  = useMemo(() => resolveUserDuties(currentDutyRow, userId, dutyTimeMap), [currentDutyRow, userId, dutyTimeMap])

  const showFpb         = !fpbLoading && fpbCount !== null && fpbCount > 0
  const showAttApproval = !attApprovalLoading && attApprovalCount !== null && attApprovalCount > 0
  const showAtt         = !attLoading && attCount !== null && attCount > 0
  const showIncident    = !incidentLoading && incidentCount !== null && incidentCount > 0
  const showDuty        = !dutyLoading && dutySchedules.length > 0
  const showTeaching    = !teachingLoading && isTeacherUser

  if (!showFpb && !showAttApproval && !showAtt && !showIncident && !showDuty && !showTeaching) return null

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px 4px',
      }}
    >
      {/* ── FPB Pending Approval Card ──────────────────────────────────── */}
      {showFpb && (
        <button
          onClick={() => router.push('/data/fpb')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 20px',
            borderRadius: '14px',
            border: `1.5px solid ${theme.border}`,
            background: theme.cardBg,
            cursor: 'pointer',
            textAlign: 'left',
            minWidth: '240px',
            flex: '1',
            maxWidth: '400px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.18s, transform 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {/* Icon badge */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '20px',
          }}>
            📋
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', lineHeight: 1, color: '#d97706' }}>
              {fpbCount}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: theme.textPrimary, marginTop: '2px' }}>
              Pending FPB Approvals
            </div>
            <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '1px' }}>
              Click to view & process
            </div>
          </div>
        </button>
      )}

      {/* ── Pending Attendance Approvals Card (L1 / L2 Approvers) ───────── */}
      {showAttApproval && (
        <button
          onClick={() => router.push('/data/attendance-approvals')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 20px',
            borderRadius: '14px',
            border: `1.5px solid ${theme.border}`,
            background: theme.cardBg,
            cursor: 'pointer',
            textAlign: 'left',
            minWidth: '240px',
            flex: '1',
            maxWidth: '400px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.18s, transform 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {/* Icon badge */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '20px',
          }}>
            🛡️
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', lineHeight: 1, color: '#7c3aed' }}>
              {attApprovalCount}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: theme.textPrimary, marginTop: '2px' }}>
              Pending HCM Approvals
            </div>
            <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '1px' }}>
              Click to review & approve
            </div>
          </div>
        </button>
      )}

      {/* ── Attendance Excuse Required Card ──────────────────────────────── */}
      {showAtt && (
        <button
          onClick={() => router.push('/data/attendance-form')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 20px',
            borderRadius: '14px',
            border: `1.5px solid ${theme.border}`,
            background: theme.cardBg,
            cursor: 'pointer',
            textAlign: 'left',
            minWidth: '240px',
            flex: '1',
            maxWidth: '400px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.18s, transform 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {/* Icon badge */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '20px',
          }}>
            ⏰
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', lineHeight: 1, color: '#dc2626' }}>
              {attCount}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: theme.textPrimary, marginTop: '2px' }}>
              Pending HCM Form
            </div>
            <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '1px' }}>
              Click to fill out the form
            </div>
          </div>
        </button>
      )}

      {/* ── Incident Reports to Follow Up Card ───────────────────────────── */}
      {showIncident && (
        <button
          onClick={() => router.push('/data/incident-report-approval')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 20px',
            borderRadius: '14px',
            border: `1.5px solid ${theme.border}`,
            background: theme.cardBg,
            cursor: 'pointer',
            textAlign: 'left',
            minWidth: '240px',
            flex: '1',
            maxWidth: '400px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.18s, transform 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {/* Icon badge */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '20px',
          }}>
            🚨
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', lineHeight: 1, color: '#e11d48' }}>
              {incidentCount}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: theme.textPrimary, marginTop: '2px' }}>
              Incident Reports to Follow Up
            </div>
            <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '1px' }}>
              Click to review & process
            </div>
          </div>
        </button>
      )}

      {/* ── Card 4: Duty & Devotion Schedule (MD & Duty) ────────────────── */}
      {showDuty && currentDutyRow && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            padding: '14px 18px',
            borderRadius: '14px',
            border: `1.5px solid ${theme.border}`,
            background: theme.cardBg,
            minWidth: '280px',
            flex: '1',
            maxWidth: '420px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.18s, transform 0.18s',
          }}
        >
          {/* Top Header: Badge Icon & Prev/Next Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '18px', color: '#fff'
              }}>
                📖
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: theme.textPrimary, lineHeight: 1.2 }}>
                  Duty & Devotion
                </div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>{formatDutyDateLabel(currentDutyRow.duty_date)}</span>
                  <span style={{ padding: '1px 7px', borderRadius: '4px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#047857', fontWeight: 700, fontSize: '10px' }}>
                    🏫 {currentDutyRow.unit?.unit_name || 'MYP'}
                  </span>
                </div>
              </div>
            </div>

            {/* Prev / Next Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setDutyIndex(i => Math.max(0, i - 1)) }}
                disabled={dutyIndex === 0}
                style={{
                  padding: '4px 8px', borderRadius: '6px', fontSize: '11px',
                  border: `1px solid ${theme.border}`, background: theme.inputBg,
                  color: dutyIndex === 0 ? theme.textSecondary : theme.textPrimary,
                  opacity: dutyIndex === 0 ? 0.4 : 1, cursor: dutyIndex === 0 ? 'default' : 'pointer'
                }}
                title="Previous duty schedule date"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDutyIndex(i => Math.min(dutySchedules.length - 1, i + 1)) }}
                disabled={dutyIndex >= dutySchedules.length - 1}
                style={{
                  padding: '4px 8px', borderRadius: '6px', fontSize: '11px',
                  border: `1px solid ${theme.border}`, background: theme.inputBg,
                  color: dutyIndex >= dutySchedules.length - 1 ? theme.textSecondary : theme.textPrimary,
                  opacity: dutyIndex >= dutySchedules.length - 1 ? 0.4 : 1, cursor: dutyIndex >= dutySchedules.length - 1 ? 'default' : 'pointer'
                }}
                title="Next duty schedule date"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>

          {/* Body: Duties list chips */}
          <div style={{ margin: '4px 0 6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {currentDuties.length > 0 ? (
              currentDuties.map((d, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px',
                    background: d.type === 'devotion' ? '#dbeafe' : d.type === 'greeter' ? '#dcfce7' : d.type === 'break' ? '#fef3c7' : '#e0e7ff',
                    color: d.type === 'devotion' ? '#1e40af' : d.type === 'greeter' ? '#166534' : d.type === 'break' ? '#92400e' : '#3730a3',
                    border: `1px solid ${d.type === 'devotion' ? '#bfdbfe' : d.type === 'greeter' ? '#bbf7d0' : d.type === 'break' ? '#fde68a' : '#c7d2fe'}`
                  }}
                >
                  {d.icon} {d.label}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '11px', color: theme.textSecondary, fontStyle: 'italic' }}>
                No duty assignments on this date
              </span>
            )}
          </div>

          {/* Prayer Subjects Box (If Devotion Leader) */}
          {currentDutyRow.devotion_leader_user_id === userId && (
            <div style={{
              margin: '4px 0 8px', padding: '8px 10px', borderRadius: '8px',
              background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '11px'
            }}>
              <div style={{ fontWeight: '700', color: '#0369a1', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🙏</span> Prayer Subjects:
              </div>
              <div style={{ color: '#0f172a', marginBottom: '2px' }}>
                <span style={{ fontWeight: '600', color: '#475569' }}>Teacher: </span>
                {currentDutyRow.teacher_to_be_prayed || '—'}
              </div>
              <div style={{ color: '#0f172a' }}>
                <span style={{ fontWeight: '600', color: '#475569' }}>Student: </span>
                {currentDutyRow.student_to_be_prayed || '—'}
              </div>
            </div>
          )}

          {/* Footer schedule counter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: '500', color: theme.textSecondary }}>
              Schedule {dutyIndex + 1} of {dutySchedules.length}
            </span>
          </div>
        </div>
      )}

      {/* ── Card 6: Teaching Schedule (Jadwal Mengajar) ──────────────────── */}
      {showTeaching && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: '14px',
            border: `1.5px solid ${theme.border}`,
            background: theme.cardBg,
            minWidth: '280px',
            flex: '1',
            maxWidth: '420px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.18s, transform 0.18s',
          }}
        >
          {/* Top Header: Badge Icon & Prev/Next Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '18px', color: '#fff'
              }}>
                📚
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: theme.textPrimary, lineHeight: 1.2 }}>
                  Teaching Schedule
                </div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#2563eb', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>{isTodaySelected ? `Today (${selectedWeekdayName})` : selectedWeekdayName}</span>
                  {activeYearInfo && (
                    <span style={{ padding: '1px 7px', borderRadius: '4px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', color: '#1d4ed8', fontWeight: 700, fontSize: '10px' }}>
                      T.A. {activeYearInfo.year_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Prev / Next Buttons for Weekdays */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setTeachingDayIndex(i => Math.max(0, i - 1)) }}
                disabled={teachingDayIndex === 0}
                style={{
                  padding: '4px 8px', borderRadius: '6px', fontSize: '11px',
                  border: `1px solid ${theme.border}`, background: theme.inputBg,
                  color: teachingDayIndex === 0 ? theme.textSecondary : theme.textPrimary,
                  opacity: teachingDayIndex === 0 ? 0.4 : 1, cursor: teachingDayIndex === 0 ? 'default' : 'pointer'
                }}
                title="Previous day"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTeachingDayIndex(i => Math.min(WEEKDAYS.length - 1, i + 1)) }}
                disabled={teachingDayIndex >= WEEKDAYS.length - 1}
                style={{
                  padding: '4px 8px', borderRadius: '6px', fontSize: '11px',
                  border: `1px solid ${theme.border}`, background: theme.inputBg,
                  color: teachingDayIndex >= WEEKDAYS.length - 1 ? theme.textSecondary : theme.textPrimary,
                  opacity: teachingDayIndex >= WEEKDAYS.length - 1 ? 0.4 : 1, cursor: teachingDayIndex >= WEEKDAYS.length - 1 ? 'default' : 'pointer'
                }}
                title="Next day"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>

          {/* Exception Banner if Holiday today */}
          {isTodaySelected && todayException && (
            <div style={{
              margin: '2px 0 6px', padding: '5px 8px', borderRadius: '6px',
              background: todayException.exception_type === 'holiday' ? '#fef2f2' : '#fefce8',
              border: `1px solid ${todayException.exception_type === 'holiday' ? '#fecaca' : '#fef08a'}`,
              color: todayException.exception_type === 'holiday' ? '#b91c1c' : '#854d0e',
              fontSize: '10px', fontWeight: 600
            }}>
              {todayException.exception_type === 'holiday' ? '🚫 Libur Sekolah: ' : '📅 Acara: '}
              {todayException.exception_label}
            </div>
          )}

          {/* Body: Classes chips */}
          <div style={{ margin: '4px 0 6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {currentDaySessions.length > 0 ? (
              currentDaySessions.map((s, idx) => (
                <span
                  key={s.timetable_id || idx}
                  style={{
                    fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px',
                    background: '#eff6ff',
                    color: '#1e40af',
                    border: '1px solid #bfdbfe',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>
                    {s.subject_code ? `[${s.subject_code}]` : ''} {s.kelas_nama}
                  </span>
                  <span style={{ fontFamily: "'SF Mono', monospace", fontSize: '10px', color: '#64748b' }}>
                    ({s.startTime}–{s.endTime})
                  </span>
                </span>
              ))
            ) : (
              <span style={{ fontSize: '11px', color: theme.textSecondary, fontStyle: 'italic' }}>
                No teaching schedule on {selectedWeekdayName}
              </span>
            )}
          </div>

          {/* Footer schedule summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: '500', color: theme.textSecondary }}>
              {currentDaySessions.length} {currentDaySessions.length === 1 ? 'session' : 'sessions'}
            </span>
            {currentDaySessions.length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textSecondary }}>
                Total {(() => {
                  const totalMins = currentDaySessions.reduce((acc, curr) => acc + (curr.durationMin || 0), 0)
                  const h = Math.floor(totalMins / 60)
                  const m = totalMins % 60
                  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
                })()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
