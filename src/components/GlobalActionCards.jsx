'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function monthStart(ym) { return `${ym}-01` }
function monthEnd(ym) {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

export default function GlobalActionCards() {
  const router = useRouter()
  const { theme } = useTheme()

  const [userId, setUserId] = useState(null)

  // Card 1: FPB pending approvals
  const [fpbCount, setFpbCount]       = useState(null)
  const [fpbLoading, setFpbLoading]   = useState(false)

  // Card 2: Attendance excuses not yet filed
  const [attCount, setAttCount]       = useState(null)
  const [attLoading, setAttLoading]   = useState(false)

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

  // ── Card 2: Count attendance issues without excuse form this month ────────
  useEffect(() => {
    if (!userId) return
    setAttLoading(true)

    const today = new Date()
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    // Only up to yesterday
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yStr = yesterday.toISOString().slice(0, 10)
    const start = monthStart(ym)
    const end   = yStr < monthEnd(ym) ? yStr : monthEnd(ym)

    Promise.all([
      fetch(`/api/attendance/report?user_id=${userId}&start=${start}&end=${end}`),
      fetch(`/api/attendance/excuses?user_id=${userId}&start=${start}&end=${end}`),
    ])
      .then(async ([rRes, eRes]) => {
        const rJson = await rRes.json()
        const eJson = await eRes.json()

        // Dates that already have a submitted excuse
        const excusedDates = new Set(
          (eJson.success ? eJson.data || [] : []).map(e => e.attendance_date)
        )

        // Count issue rows without an excuse yet
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
      })
      .catch(() => setAttCount(null))
      .finally(() => setAttLoading(false))
  }, [userId])

  // ── Render nothing if both cards have zero / not loaded ───────────────────
  const showFpb = !fpbLoading && fpbCount !== null && fpbCount > 0
  const showAtt = !attLoading && attCount !== null && attCount > 0

  if (!showFpb && !showAtt) return null

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
            minWidth: '220px',
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
            minWidth: '220px',
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
    </div>
  )
}
