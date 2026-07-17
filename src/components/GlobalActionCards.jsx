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
    supabase
      .from('fpb_approvals')
      .select('approval_id', { count: 'exact', head: true })
      .eq('approver_user_id', userId)
      .eq('status', 'pending')
      .then(({ count, error }) => {
        if (!error) setFpbCount(count ?? 0)
      })
      .finally(() => setFpbLoading(false))
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
