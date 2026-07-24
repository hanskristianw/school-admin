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
  const tm = timeMap || { devotion: '07:30–08:00', greeter: '07:30–08:00', break: '09:45–10:15', lunch: '12:30–13:00' }
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

  // Card 4: Duty & Devotion Schedule (duty_schedules)
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

  // ── Card 4: Fetch Duty & Devotion Schedule for this user ─────────────────
  useEffect(() => {
    if (!userId) return
    setDutyLoading(true)

    const fetchDutySchedules = async () => {
      try {
        const { data, error } = await supabase
          .from('duty_schedules')
          .select('*')
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

  // ── Active Duty Row & User Duties ─────────────────────────────────────────
  const currentDutyRow = dutySchedules[dutyIndex] || null
  const currentDuties  = useMemo(() => resolveUserDuties(currentDutyRow, userId, dutyTimeMap), [currentDutyRow, userId, dutyTimeMap])

  const showFpb         = !fpbLoading && fpbCount !== null && fpbCount > 0
  const showAttApproval = !attApprovalLoading && attApprovalCount !== null && attApprovalCount > 0
  const showAtt         = !attLoading && attCount !== null && attCount > 0
  const showDuty        = !dutyLoading && dutySchedules.length > 0

  if (!showFpb && !showAttApproval && !showAtt && !showDuty) return null

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
              Pending Attendance Approvals
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
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#10b981', marginTop: '2px' }}>
                  {formatDutyDateLabel(currentDutyRow.duty_date)}
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
    </div>
  )
}
