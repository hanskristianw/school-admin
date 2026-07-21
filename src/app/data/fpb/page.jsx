'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardContent } from '@/components/ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus, faClipboardList, faClock, faEye, faSpinner,
  faArrowLeft, faTrash, faTimes, faShoppingCart, faBoxOpen, faTools,
  faCheck, faRotateLeft, faPen, faExternalLinkAlt, faCheckDouble, faPrint,
  faFileExcel,
} from '@fortawesome/free-solid-svg-icons'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:    { label: 'Draft',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  pending:  { label: 'Pending',   color: '#d97706', bg: 'rgba(217,119,6,0.12)'   },
  revision: { label: 'Revision',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  approved: { label: 'Approved',  color: '#059669', bg: 'rgba(5,150,105,0.12)'   },
  rejected: { label: 'Rejected',  color: '#dc2626', bg: 'rgba(220,38,38,0.12)'   },
}
const TYPE_ICONS = { small: faShoppingCart, large: faBoxOpen, repair: faTools }
const fmt     = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtDt   = (d) => d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null
const emptyItem = () => ({ _id: crypto.randomUUID(), item_name: '', quantity: 1, unit: 'pcs', unit_price: '' })

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.draft
  return <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, whiteSpace: 'nowrap' }}>{m.label}</span>
}

const statusIcon = (s) => {
  if (s === 'approved') return <span style={{ color: '#059669', fontWeight: 700 }}>✓</span>
  if (s === 'revision') return <span style={{ color: '#f59e0b', fontWeight: 700 }}>↩</span>
  if (s === 'rejected') return <span style={{ color: '#dc2626', fontWeight: 700 }}>✕</span>
  return <span style={{ color: '#6366f1' }}>…</span>
}

// ─── Progress Section (collapseable) ─────────────────────────────────────────
function ProgressSection({ screeningRow, approvals, fpb, screeningDone, theme }) {
  const [open, setOpen] = useState(false)

  const totalSteps = (screeningRow ? 1 : 0) +
    [...new Set(approvals.filter(a => a.approver_order !== 0).map(a => a.step_order))].length

  const doneSteps = (screeningRow?.status === 'approved' ? 1 : 0) + (() => {
    const reg   = approvals.filter(a => a.approver_order !== 0)
    const steps = [...new Set(reg.map(a => a.step_order))]
    return steps.filter(s => reg.filter(a => a.step_order === s).every(a => a.status === 'approved')).length
  })()

  return (
    <div style={{ borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.cardBg, overflow: 'hidden' }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontWeight: 700, fontSize: 12, color: theme.textPrimary, flex: 1 }}>Progress</span>
        <span style={{ fontSize: 11, color: theme.textSecondary }}>{doneSteps}/{totalSteps} completed</span>
        <span style={{ fontSize: 12, color: theme.textSecondary, display: 'inline-block', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>

      {/* Collapseable body */}
      {open && (
        <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: `1px solid ${theme.border}` }}>

          {/* Screening row */}
          {screeningRow && (() => {
            const sc = screeningRow
            const scDone     = sc.status === 'approved'
            const scActive   = !scDone && fpb.status === 'pending' && sc.status === 'pending'
            const scRevised  = sc.status === 'revision'
            const scRejected = sc.status === 'rejected'
            const scName     = sc.role?.role_name || 'Screener'
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', marginBottom: 2 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 99, background: scDone ? '#059669' : scRejected ? '#dc2626' : scActive ? '#d97706' : theme.subtleBg, border: `2px solid ${scDone ? '#059669' : scRejected ? '#dc2626' : scActive ? '#d97706' : theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {scDone ? '✓' : scRejected ? '✕' : '🔍'}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 12, color: theme.textPrimary }}>Screening</span>
                  {scActive   && <span style={{ fontSize: 10, color: '#d97706', fontWeight: 600, marginLeft: 'auto' }}>Awaiting Screener</span>}
                  {scDone     && <span style={{ fontSize: 10, color: '#059669', fontWeight: 600, marginLeft: 'auto' }}>Passed</span>}
                  {scRejected && <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, marginLeft: 'auto' }}>Rejected</span>}
                  {scRevised  && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, marginLeft: 'auto' }}>Revision</span>}
                </div>
                <div style={{ marginLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '2px 0' }}>
                    <span style={{ fontSize: 13 }}>{statusIcon(sc.status)}</span>
                    <span style={{ color: theme.textPrimary }}>{scName}</span>
                    {sc.action_at && <span style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 'auto' }}>{fmtDt(sc.action_at)}</span>}
                  </div>
                  {sc.comment && (
                    <div style={{ marginLeft: 20, fontSize: 11, color: theme.textSecondary, padding: '2px 6px', borderLeft: `2px solid ${sc.status === 'revision' ? '#f59e0b' : sc.status === 'rejected' ? '#dc2626' : '#059669'}`, marginBottom: 2 }}>
                      {sc.comment}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Regular approval steps */}
          {(() => {
            const regularApprovals = approvals.filter(a => a.approver_order !== 0)
            const steps = []; const seen = new Set()
            regularApprovals.forEach(ap => { if (!seen.has(ap.step_order)) { seen.add(ap.step_order); steps.push(ap.step_order) } })
            steps.sort((a, b) => a - b)
            return steps.map(stepOrder => {
              const stepRows   = regularApprovals.filter(a => a.step_order === stepOrder).sort((a, b) => (a.approver_order ?? 0) - (b.approver_order ?? 0))
              const stepName   = stepRows[0]?.step_name || `Step ${stepOrder}`
              const isActive   = stepOrder === fpb.current_step && fpb.status === 'pending' && screeningDone
              const allDone    = stepRows.every(a => a.status === 'approved')
              const anyRejected = stepRows.some(a => a.status === 'rejected')
              const anyRevision = stepRows.some(a => a.status === 'revision')
              const dotBg    = allDone ? '#059669' : anyRejected ? '#dc2626' : anyRevision ? '#f59e0b' : isActive ? '#6366f1' : theme.subtleBg
              const dotBorder= allDone ? '#059669' : anyRejected ? '#dc2626' : anyRevision ? '#f59e0b' : isActive ? '#6366f1' : theme.border
              return (
                <div key={stepOrder}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', marginBottom: 2 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 99, background: dotBg, border: `2px solid ${dotBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                      {allDone ? '✓' : anyRejected ? '✕' : anyRevision ? '↩' : stepOrder}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 12, color: theme.textPrimary }}>{stepName}</span>
                    {!screeningDone && !anyRejected && !anyRevision && <span style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 'auto' }}>Awaiting screening</span>}
                    {isActive      && <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, marginLeft: 'auto' }}>Active</span>}
                    {allDone       && <span style={{ fontSize: 10, color: '#059669', fontWeight: 600, marginLeft: 'auto' }}>Done</span>}
                    {anyRejected   && <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, marginLeft: 'auto' }}>Rejected</span>}
                    {anyRevision && !allDone && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, marginLeft: 'auto' }}>Revision</span>}
                  </div>
                  <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(() => {
                      // Screener (approver_order=0) is role-based → group when pending
                      // Regular approvers (approver_order>0) are specific users → always show individually
                      const screenerRows = stepRows.filter(ap => ap.approver_order === 0)
                      const regularRows  = stepRows.filter(ap => ap.approver_order !== 0)

                      // Screener: group pending by role, show individual when acted
                      const screenerPendingGroups = {}
                      screenerRows.filter(ap => ap.status === 'pending').forEach(ap => {
                        const key = ap.approver_role_id ?? 'unknown'
                        if (!screenerPendingGroups[key]) screenerPendingGroups[key] = { role: ap.role, count: 0 }
                        screenerPendingGroups[key].count++
                      })
                      const screenerActed = screenerRows.filter(ap => ap.status !== 'pending')

                      return (
                        <>
                          {/* Screener pending: show role */}
                          {Object.entries(screenerPendingGroups).map(([key, group]) => (
                            <div key={`sc-pg-${key}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '2px 0' }}>
                              <span style={{ fontSize: 13, color: '#6366f1' }}>…</span>
                              <span style={{ color: theme.textSecondary }}>{group.role?.role_name || 'Awaiting'}</span>
                            </div>
                          ))}
                          {/* Screener acted: show actual person */}
                          {screenerActed.map(ap => {
                            const name = `${ap.users?.user_nama_depan || ''} ${ap.users?.user_nama_belakang || ''}`.trim() || ap.role?.role_name || 'Screener'
                            return (
                              <div key={ap.approval_id}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '2px 0' }}>
                                  <span style={{ fontSize: 13 }}>{statusIcon(ap.status)}</span>
                                  <span style={{ color: theme.textPrimary }}>{name}</span>
                                  {ap.action_at && <span style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 'auto' }}>{fmtDt(ap.action_at)}</span>}
                                </div>
                                {ap.comment && (
                                  <div style={{ marginLeft: 20, fontSize: 11, color: theme.textSecondary, padding: '2px 6px', borderLeft: `2px solid ${ap.status === 'revision' ? '#f59e0b' : ap.status === 'rejected' ? '#dc2626' : '#059669'}`, marginBottom: 2 }}>
                                    {ap.comment}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          {/* Regular approvers: always show individual (specific user assigned) */}
                          {regularRows.map(ap => {
                            const name = ap.status === 'pending'
                              ? `${ap.users?.user_nama_depan || ''} ${ap.users?.user_nama_belakang || ''}`.trim() || 'User'
                              : `${ap.users?.user_nama_depan || ''} ${ap.users?.user_nama_belakang || ''}`.trim() || 'User'
                            return (
                              <div key={ap.approval_id}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '2px 0' }}>
                                  <span style={{ fontSize: 13 }}>{statusIcon(ap.status)}</span>
                                  <span style={{ color: theme.textPrimary }}>{name}</span>
                                  {ap.action_at && <span style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 'auto' }}>{fmtDt(ap.action_at)}</span>}
                                </div>
                                {ap.comment && (
                                  <div style={{ marginLeft: 20, fontSize: 11, color: theme.textSecondary, padding: '2px 6px', borderLeft: `2px solid ${ap.status === 'revision' ? '#f59e0b' : ap.status === 'rejected' ? '#dc2626' : '#059669'}`, marginBottom: 2 }}>
                                    {ap.comment}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )
            })
          })()}
        </div>
      )}
    </div>
  )
}

// ─── View FPB Modal (pure read-only) ─────────────────────────────────────────
function ViewFpbModal({ fpbId, onClose, theme, onActionDone }) {
  const [fpb, setFpb]               = useState(null)
  const [items, setItems]           = useState([])
  const [approvals, setApprovals]   = useState([])
  const [revisions, setRevisions]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [userId, setUserId]         = useState(null)
  const [action, setAction]         = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [comment, setComment]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [canEditBudget, setCanEditBudget]   = useState(false)
  const [editBudget, setEditBudget]         = useState(false)
  const [budgetVal, setBudgetVal]           = useState('')
  const [remainingVal, setRemainingVal]     = useState('')
  const [savingBudget, setSavingBudget]     = useState(false)
  const [printFpbId, setPrintFpbId]         = useState(null)
  const [userRoleId, setUserRoleId]         = useState(null)
  // Screener edit items
  const [screenerEditMode, setScreenerEditMode] = useState(false)
  const [editItems, setEditItems]               = useState([])
  const [savingItems, setSavingItems]           = useState(false)
  const [savedItems, setSavedItems]             = useState(false)
  const [itemsEditedByName, setItemsEditedByName] = useState(null)
  const [itemsEditedAt, setItemsEditedAt]       = useState(null)
  // Procurement
  const [savingProcurement, setSavingProcurement] = useState(false)
  const [procurementNote, setProcurementNote]     = useState('')
  const [showProcurementNote, setShowProcurementNote] = useState(false)

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) { setUserId(uid); fetchData(uid) }
  }, [fpbId])

  const fetchData = async (uid) => {
    setLoading(true)
    try {
      const { data: f } = await supabase.from('fpb')
        .select('*, fpb_types(type_name, type_code, max_amount), users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang), editor:users!fpb_items_edited_by_fkey(user_nama_depan, user_nama_belakang), procurator:users!fpb_procurement_by_fkey(user_nama_depan, user_nama_belakang)')
        .eq('fpb_id', fpbId).single()
      setFpb(f)
      if (f) {
        setBudgetVal(f.budget != null ? String(f.budget) : '')
        setRemainingVal(f.remaining_budget != null ? String(f.remaining_budget) : '')
        if (f.items_edited_by) {
          const edName = `${f.editor?.user_nama_depan || ''} ${f.editor?.user_nama_belakang || ''}`.trim()
          setItemsEditedByName(edName || 'Screener')
          setItemsEditedAt(f.items_edited_at)
        } else {
          setItemsEditedByName(null)
          setItemsEditedAt(null)
        }
      }
      const { data: it } = await supabase.from('fpb_items').select('*').eq('fpb_id', fpbId).order('created_at')
      setItems(it || [])
      const { data: ap } = await supabase.from('fpb_approvals')
        .select('*, users!fpb_approvals_approver_user_id_fkey(user_nama_depan, user_nama_belakang), role!fpb_approvals_approver_role_id_fkey(role_name)')
        .eq('fpb_id', fpbId).order('step_order').order('approval_id')
      setApprovals(ap || [])
      const { data: rv } = await supabase.from('fpb_revisions')
        .select('*, users!fpb_revisions_revised_by_fkey(user_nama_depan, user_nama_belakang)')
        .eq('fpb_id', fpbId).order('revision_number', { ascending: false })
      setRevisions(rv || [])
      const { data: userRow } = await supabase.from('users').select('user_role_id').eq('user_id', uid).single()
      if (userRow?.user_role_id) {
        setUserRoleId(userRow.user_role_id)
        const { data: br } = await supabase.from('fpb_budget_roles').select('role_id').eq('role_id', userRow.user_role_id).maybeSingle()
        setCanEditBudget(!!br)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Screener = approver_order 0; regular approvers = order >= 1
  // Screener is role-based: check if user's role matches screener_role_id (approver_role_id)
  const screeningRow       = approvals.find(a => a.approver_order === 0)
  const screeningDone      = screeningRow ? screeningRow.status === 'approved' : true
  const iAmScreener        = screeningRow && userRoleId && screeningRow.approver_role_id === userRoleId
  const myScreeningPending = iAmScreener && screeningRow?.status === 'pending' && fpb?.status === 'pending'

  // Regular approver: only active after screening is done
  const myPendingApproval = myScreeningPending
    ? screeningRow
    : approvals.find(a => a.approver_user_id === userId && a.status === 'pending' && a.step_order === fpb?.current_step && a.approver_order !== 0)

  const handleAction = async () => {
    if (!myPendingApproval) return
    if ((action === 'revision' || action === 'reject') && !comment.trim()) {
      setError('Comment is required for revision / rejection'); return
    }
    setSaving(true); setError('')
    try {
      const updatePayload = { status: action, comment: comment.trim() || null, action_at: new Date().toISOString() }
      // For role-based screener: also save who actually performed the screening
      if (myScreeningPending && userId) updatePayload.approver_user_id = userId
      await supabase.from('fpb_approvals').update(updatePayload).eq('approval_id', myPendingApproval.approval_id)

      if (action === 'approved') {
        // If just finished screening, check if all screening rows done (always 1)
        const { data: freshStep } = await supabase.from('fpb_approvals')
          .select('status, approver_order').eq('fpb_id', fpbId).eq('step_order', fpb.current_step)
        // Filter: screening rows vs regular approver rows
        const isScreeningAction = myPendingApproval?.approver_order === 0
        const regularRows = (freshStep || []).filter(a => a.approver_order !== 0)
        const allRegularDone = regularRows.length > 0 && regularRows.every(a => a.status === 'approved')
        const screeningJustDone = isScreeningAction
        if (screeningJustDone) {
          // Screening passed → advance current_step from 0 → 1 so Approver 1 becomes active
          await supabase.from('fpb').update({ current_step: 1 }).eq('fpb_id', fpbId)
          // Notify the step-1 approvers
          ;(async () => {
            try {
              const { data: nextApprovals } = await supabase
                .from('fpb_approvals')
                .select('approver_user_id, step_name, users!fpb_approvals_approver_user_id_fkey(user_email, user_nama_depan, user_nama_belakang)')
                .eq('fpb_id', fpbId).eq('step_order', 1).neq('approver_order', 0)
              const { data: submitterRow } = await supabase
                .from('users').select('user_nama_depan, user_nama_belakang').eq('user_id', fpb.submitted_by).single()
              const submitterName = submitterRow
                ? `${submitterRow.user_nama_depan || ''} ${submitterRow.user_nama_belakang || ''}`.trim() : 'Karyawan'
              for (const ap of (nextApprovals || [])) {
                const u = ap.users
                if (!u?.user_email) continue
                const approverName = `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
                await fetch('/api/email/fpb', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'fpbPendingApproval', to: u.user_email, approverName,
                    fpbNumber: fpb.fpb_number, fpbType: fpb.fpb_types?.type_name,
                    submitterName, division: fpb.division, grandTotal: fpb.grand_total,
                    usageDate: fpb.usage_date, stepName: ap.step_name || 'Approval',
                  }),
                })
              }
            } catch (e) { console.warn('[FPB Email] screening→step1:', e) }
          })()
        } else if (allRegularDone) {
          const nextStepRow = approvals.find(a => a.step_order === fpb.current_step + 1 && a.approver_order !== 0)
          if (nextStepRow) {
            await supabase.from('fpb').update({ current_step: fpb.current_step + 1 }).eq('fpb_id', fpbId)
            // Notify next step approvers
            ;(async () => {
              try {
                const { data: nextApprovals } = await supabase
                  .from('fpb_approvals')
                  .select('approver_user_id, step_name, users!fpb_approvals_approver_user_id_fkey(user_email, user_nama_depan, user_nama_belakang)')
                  .eq('fpb_id', fpbId).eq('step_order', fpb.current_step + 1)
                const { data: submitterRow } = await supabase
                  .from('users').select('user_nama_depan, user_nama_belakang').eq('user_id', fpb.submitted_by).single()
                const submitterName = submitterRow
                  ? `${submitterRow.user_nama_depan || ''} ${submitterRow.user_nama_belakang || ''}`.trim() : 'Karyawan'
                for (const ap of (nextApprovals || [])) {
                  const u = ap.users
                  if (!u?.user_email) continue
                  const approverName = `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
                  await fetch('/api/email/fpb', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'fpbPendingApproval', to: u.user_email, approverName,
                      fpbNumber: fpb.fpb_number, fpbType: fpb.fpb_types?.type_name,
                      submitterName, division: fpb.division, grandTotal: fpb.grand_total,
                      usageDate: fpb.usage_date, stepName: ap.step_name || 'Approval',
                    }),
                  })
                }
              } catch (e) { console.warn('[FPB Email] next step:', e) }
            })()
          } else {
            await supabase.from('fpb').update({ status: 'approved' }).eq('fpb_id', fpbId)
            // Notify submitter — FPB fully approved
            ;(async () => {
              try {
                const { data: submitterUser } = await supabase
                  .from('users').select('user_email, user_nama_depan, user_nama_belakang')
                  .eq('user_id', fpb.submitted_by).single()
                if (!submitterUser?.user_email) return
                const submitterName = `${submitterUser.user_nama_depan || ''} ${submitterUser.user_nama_belakang || ''}`.trim()
                await fetch('/api/email/fpb', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'fpbApproved', to: submitterUser.user_email, submitterName,
                    fpbNumber: fpb.fpb_number, fpbType: fpb.fpb_types?.type_name,
                    grandTotal: fpb.grand_total,
                  }),
                })
              } catch (e) { console.warn('[FPB Email] approved:', e) }
            })()
          }
        }
      } else if (action === 'revision') {
        // Reset ALL other approvals (except this one — keep the revision comment so requester can see it)
        await supabase.from('fpb_approvals')
          .update({ status: 'pending', comment: null, action_at: null })
          .eq('fpb_id', fpbId)
          .neq('approval_id', myPendingApproval.approval_id)
        // Keep the revisor's comment but reset their status so they can re-approve after fix
        await supabase.from('fpb_approvals')
          .update({ status: 'revision' })
          .eq('approval_id', myPendingApproval.approval_id)
        await supabase.from('fpb').update({ status: 'revision', current_step: 1 }).eq('fpb_id', fpbId)
        // Notify submitter — revision requested
        ;(async () => {
          try {
            const { data: submitterUser } = await supabase
              .from('users').select('user_email, user_nama_depan, user_nama_belakang')
              .eq('user_id', fpb.submitted_by).single()
            if (!submitterUser?.user_email) return
            const submitterName = `${submitterUser.user_nama_depan || ''} ${submitterUser.user_nama_belakang || ''}`.trim()
            const { data: actorUser } = await supabase
              .from('users').select('user_nama_depan, user_nama_belakang').eq('user_id', userId).single()
            const approverName = actorUser
              ? `${actorUser.user_nama_depan || ''} ${actorUser.user_nama_belakang || ''}`.trim() : 'Approver'
            await fetch('/api/email/fpb', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'fpbRevision', to: submitterUser.user_email, submitterName,
                fpbNumber: fpb.fpb_number, fpbType: fpb.fpb_types?.type_name,
                approverName, comment: comment.trim() || null,
              }),
            })
          } catch (e) { console.warn('[FPB Email] revision:', e) }
        })()
      } else if (action === 'reject') {
        await supabase.from('fpb').update({ status: 'rejected' }).eq('fpb_id', fpbId)
        // Mark the rejector's own approval record so progress shows who rejected
        // Use approval_id (not approver_user_id) to handle screener whose user_id may have just been written
        await supabase.from('fpb_approvals')
          .update({ status: 'rejected', comment: comment.trim() || null, action_at: new Date().toISOString(), approver_user_id: userId })
          .eq('approval_id', myPendingApproval.approval_id)
        // Notify submitter — FPB rejected
        ;(async () => {
          try {
            const { data: submitterUser } = await supabase
              .from('users').select('user_email, user_nama_depan, user_nama_belakang')
              .eq('user_id', fpb.submitted_by).single()
            if (!submitterUser?.user_email) return
            const submitterName = `${submitterUser.user_nama_depan || ''} ${submitterUser.user_nama_belakang || ''}`.trim()
            const { data: actorUser } = await supabase
              .from('users').select('user_nama_depan, user_nama_belakang').eq('user_id', userId).single()
            const approverName = actorUser
              ? `${actorUser.user_nama_depan || ''} ${actorUser.user_nama_belakang || ''}`.trim() : 'Approver'
            await fetch('/api/email/fpb', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'fpbRejected', to: submitterUser.user_email, submitterName,
                fpbNumber: fpb.fpb_number, fpbType: fpb.fpb_types?.type_name,
                approverName, comment: comment.trim() || null,
              }),
            })
          } catch (e) { console.warn('[FPB Email] rejected:', e) }
        })()
      }
      setShowActionModal(false); setAction(null); setComment('')
      await fetchData(userId)
      if (onActionDone) onActionDone()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleSaveBudget = async () => {
    setSavingBudget(true)
    try {
      const { error: e } = await supabase.from('fpb').update({
        budget:           budgetVal !== '' ? budgetVal.trim() : null,
        remaining_budget: remainingVal !== '' ? parseFloat(remainingVal) : null,
      }).eq('fpb_id', fpbId)
      if (e) throw e
      setEditBudget(false)
      await fetchData(userId)
    } catch (e) { setError(e.message) }
    finally { setSavingBudget(false) }
  }

  const handleSaveScreenerItems = async () => {
    if (!editItems.length) return
    const invalid = editItems.some(i => !i.item_name?.trim() || !i.unit_price || Number(i.unit_price) <= 0)
    if (invalid) { setError('All item names and unit prices are required'); return }
    setSavingItems(true); setError('')
    try {
      const newTotal = editItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0)
      // Delete all existing items then re-insert
      const { error: delErr } = await supabase.from('fpb_items').delete().eq('fpb_id', fpbId)
      if (delErr) throw delErr
      const { error: insErr } = await supabase.from('fpb_items').insert(
        editItems.map(i => ({
          fpb_id:     fpbId,
          item_name:  i.item_name.trim(),
          quantity:   Number(i.quantity),
          unit:       i.unit || 'pcs',
          unit_price: Number(i.unit_price),
          seller_url: i.seller_url?.trim() || null,
        }))
      )
      if (insErr) throw insErr
      // Save audit trail: who edited + when
      const { error: fpbErr } = await supabase.from('fpb').update({
        grand_total:      newTotal,
        items_edited_by:  userId,
        items_edited_at:  new Date().toISOString(),
      }).eq('fpb_id', fpbId)
      if (fpbErr) throw fpbErr
      setSavedItems(true); setTimeout(() => setSavedItems(false), 3000)
      setScreenerEditMode(false)
      await fetchData(userId)
    } catch (e) { setError(e.message) }
    finally { setSavingItems(false) }
  }

  const handleToggleProcurement = async (markOrdered) => {
    setSavingProcurement(true); setError('')
    try {
      const payload = markOrdered
        ? { procurement_status: 'ordered', procurement_by: userId, procurement_at: new Date().toISOString(), procurement_note: procurementNote.trim() || null }
        : { procurement_status: null,      procurement_by: null,   procurement_at: null,                      procurement_note: null }
      const { error: e } = await supabase.from('fpb').update(payload).eq('fpb_id', fpbId)
      if (e) throw e
      setProcurementNote('')
      setShowProcurementNote(false)
      await fetchData(userId)
      if (onActionDone) onActionDone()   // sync parent list
    } catch (e) { setError(e.message) }
    finally { setSavingProcurement(false) }
  }


  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: theme.cardBg, borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
            {loading ? <span style={{ color: theme.textSecondary, fontSize: 14 }}>Loading...</span> : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: theme.textPrimary }}>{fpb?.fpb_number || '—'}</span>
                <span style={{ fontSize: 11, color: theme.textSecondary }}>{fpb?.fpb_types?.type_name}</span>
                {fpb && <StatusBadge status={fpb.status} />}
                {fpb?.revision_count > 0 && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Revision #{fpb.revision_count}</span>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              {fpb && !loading && (
                <button onClick={() => setPrintFpbId(fpbId)}
                  style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.textSecondary, cursor: 'pointer', padding: '4px 10px', fontSize: 13, borderRadius: 7, display: 'flex', alignItems: 'center', gap: 5 }}
                  title="Print FPB">
                  <FontAwesomeIcon icon={faPrint} />
                </button>
              )}
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', padding: '4px 8px', fontSize: 16 }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: theme.textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 24 }} />
              </div>
            ) : !fpb ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>FPB not found.</div>
            ) : (
              <>
                {/* Info bar — compact single row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', padding: '10px 14px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.subtleBg, fontSize: 12 }}>
                  {[
                    ['Requester', `${fpb.users?.user_nama_depan || ''} ${fpb.users?.user_nama_belakang || ''}`.trim()],
                    ['Division', fpb.division || '—'],
                    ['Created', fmtDate(fpb.created_at)],
                    ['Required Date', fmtDate(fpb.usage_date)],
                  ].map(([l, v]) => (
                    <span key={l}><span style={{ color: theme.textSecondary }}>{l}: </span><strong style={{ color: theme.textPrimary }}>{v}</strong></span>
                  ))}
                  {fpb.note && <span style={{ width: '100%', marginTop: 2 }}><span style={{ color: theme.textSecondary }}>Note: </span><span style={{ color: theme.textPrimary }}>{fpb.note}</span></span>}
                </div>

                {/* Items table — editable for screener during screening */}
                <div style={{ borderRadius: 10, border: `1px solid ${screenerEditMode ? '#d97706' : theme.border}`, display: 'block', overflow: 'auto', WebkitOverflowScrolling: 'touch', transition: 'border-color 0.2s' }}>
                  {/* Screener edit mode header */}
                  {myScreeningPending && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${screenerEditMode ? '#d97706' : theme.border}`, background: screenerEditMode ? 'rgba(245,158,11,0.05)' : theme.cardBg }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: screenerEditMode ? '#d97706' : theme.textSecondary }}>
                          🔍 Item List
                        </span>
                        {screenerEditMode && <span style={{ fontSize: 11, color: '#d97706' }}>— Screener Edit Mode</span>}
                      </div>
                      {!screenerEditMode ? (
                        <button onClick={() => { setEditItems(items.map(i => ({ ...i, _id: crypto.randomUUID() }))); setScreenerEditMode(true) }}
                          style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: '1px solid #d97706', background: 'rgba(245,158,11,0.08)', color: '#d97706', cursor: 'pointer', fontWeight: 700 }}>
                          ✏️ Edit Items
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setScreenerEditMode(false); setError('') }}
                            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, cursor: 'pointer' }}>
                            Cancel
                          </button>
                          <button onClick={handleSaveScreenerItems} disabled={savingItems}
                            style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: 'none', background: savedItems ? '#059669' : savingItems ? '#e5e7eb' : '#d97706', color: savingItems ? '#9ca3af' : '#fff', cursor: savingItems ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {savingItems ? '⏳ Saving...' : savedItems ? '✓ Saved!' : '💾 Save Changes'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {screenerEditMode ? (
                    /* ── Editable table ── */
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 620, width: '100%' }}>
                      <thead>
                        <tr style={{ background: 'rgba(245,158,11,0.06)' }}>
                          {['#', 'Item Name', 'Qty', 'Unit', 'Unit Price', 'Subtotal', 'Link', ''].map(h => (
                            <th key={h} style={{ padding: '7px 8px', textAlign: h === 'Nama Barang' || h === 'Link' ? 'left' : h === '#' || h === '' ? 'center' : 'right', color: '#b45309', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {editItems.map((it, i) => (
                          <tr key={it._id} style={{ borderTop: `1px solid ${theme.border}` }}>
                            <td style={{ padding: '5px 8px', textAlign: 'center', color: theme.textSecondary, fontSize: 11 }}>{i + 1}</td>
                            <td style={{ padding: '4px 6px' }}>
                              <input value={it.item_name} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, item_name: e.target.value } : x))}
                                style={{ width: '100%', minWidth: 160, padding: '4px 7px', borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12 }} />
                            </td>
                            <td style={{ padding: '4px 5px' }}>
                              <input type="number" min="1" value={it.quantity} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                                style={{ width: 55, padding: '4px 6px', borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12, textAlign: 'right' }} />
                            </td>
                            <td style={{ padding: '4px 5px' }}>
                              <input value={it.unit} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                                style={{ width: 60, padding: '4px 6px', borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12 }} />
                            </td>
                            <td style={{ padding: '4px 5px' }}>
                              <input type="number" min="0" value={it.unit_price} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, unit_price: e.target.value } : x))}
                                style={{ width: 100, padding: '4px 6px', borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12, textAlign: 'right' }} />
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#6366f1', whiteSpace: 'nowrap' }}>
                              {fmt(Number(it.quantity) * Number(it.unit_price))}
                            </td>
                            <td style={{ padding: '4px 5px' }}>
                              <input value={it.seller_url || ''} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, seller_url: e.target.value } : x))}
                                placeholder="https://..." style={{ width: 90, padding: '4px 6px', borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 11 }} />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              {editItems.length > 1 && (
                                <button onClick={() => setEditItems(prev => prev.filter((_, j) => j !== i))}
                                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, padding: 2 }}>✕</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: `1px solid ${theme.border}`, background: 'rgba(245,158,11,0.04)' }}>
                          <td colSpan={8} style={{ padding: '6px 8px' }}>
                            <button onClick={() => setEditItems(prev => [...prev, { _id: crypto.randomUUID(), item_name: '', quantity: 1, unit: 'pcs', unit_price: '', seller_url: '' }])}
                              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px dashed #d97706', background: 'rgba(245,158,11,0.06)', color: '#d97706', cursor: 'pointer', fontWeight: 600 }}>
                              + Add Item
                            </button>
                            <span style={{ float: 'right', fontWeight: 800, fontSize: 13, color: '#6366f1', padding: '3px 8px' }}>
                              Total: {fmt(editItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0))}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    /* ── Read-only table ── */
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 580, width: '100%' }}>
                      <thead>
                        <tr style={{ background: theme.subtleBg }}>
                          {['#', 'Item Name', 'Qty', 'Unit', 'Price', 'Subtotal', 'Link'].map(h => (
                            <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Nama Barang' || h === 'Link' ? 'left' : h === '#' ? 'center' : 'right', color: theme.textSecondary, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr><td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: theme.textSecondary, fontStyle: 'italic', fontSize: 12 }}>No items found</td></tr>
                        ) : items.map((it, i) => (
                          <tr key={it.item_id} style={{ borderTop: `1px solid ${theme.border}` }}>
                            <td style={{ padding: '7px 10px', textAlign: 'center', color: theme.textSecondary }}>{i + 1}</td>
                            <td style={{ padding: '7px 10px', color: theme.textPrimary, fontWeight: 500 }}>{it.item_name}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>{it.quantity}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: theme.textSecondary }}>{it.unit}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>{fmt(it.unit_price)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: theme.textPrimary }}>{fmt(it.quantity * it.unit_price)}</td>
                            <td style={{ padding: '7px 10px' }}>
                              {it.seller_url
                                ? <a href={it.seller_url} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontSize: 11 }}>🔗</a>
                                : <span style={{ color: theme.textSecondary }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: `2px solid ${theme.border}`, background: theme.subtleBg }}>
                          <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: theme.textPrimary }}>Grand Total</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#6366f1' }}>{fmt(fpb.grand_total)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>

                {/* Screener edit audit note */}
                {itemsEditedByName && (
                  <div style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 11, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ✏️ <strong>Item list updated by screener:</strong> {itemsEditedByName}
                    {itemsEditedAt && <span style={{ color: theme.textSecondary, marginLeft: 4 }}>— {fmtDt(itemsEditedAt)}</span>}
                  </div>
                )}


                {/* Budget — compact inline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.cardBg, fontSize: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: theme.textPrimary, fontSize: 12 }}>💰 Budget</span>
                  <span style={{ color: fpb.budget != null ? '#6366f1' : theme.textSecondary, fontWeight: 700 }}>
                    {fpb.budget != null ? fpb.budget : <i>—</i>}
                  </span>
                  <span style={{ color: theme.textSecondary }}>·</span>
                  <span style={{ fontSize: 11, color: theme.textSecondary }}>Remaining:</span>
                  <span style={{ color: fpb.remaining_budget != null ? '#059669' : theme.textSecondary, fontWeight: 700 }}>
                    {fpb.remaining_budget != null ? fmt(fpb.remaining_budget) : <i>—</i>}
                  </span>
                  {canEditBudget && !editBudget && (
                    <button onClick={() => setEditBudget(true)} style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 9px', borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.subtleBg, color: theme.textSecondary, cursor: 'pointer' }}>✏️ Edit</button>
                  )}
                  {editBudget && (
                    <div style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 6 }}>
                      <div>
                        <div style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 3 }}>Budget</div>
                        <input type="text" value={budgetVal} onChange={e => setBudgetVal(e.target.value)}
                          style={{ padding: '5px 8px', borderRadius: 7, fontSize: 12, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, width: 140 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 3 }}>Remaining Budget (Rp)</div>
                        <input type="number" min="0" value={remainingVal} onChange={e => setRemainingVal(e.target.value)}
                          style={{ padding: '5px 8px', borderRadius: 7, fontSize: 12, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, width: 140 }} />
                      </div>
                      <button onClick={() => setEditBudget(false)} style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleSaveBudget} disabled={savingBudget} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        {savingBudget ? '…' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Revision request notice — shown prominently to requester */}
                {(() => {
                  const revisionRequests = approvals.filter(a => a.status === 'revision' && a.comment)
                  if (revisionRequests.length === 0) return null
                  return (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.09)', border: '1.5px solid rgba(245,158,11,0.45)' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#b45309', marginBottom: 6 }}>⚠ Revision Request from Approver</div>
                      {revisionRequests.map(ap => (
                        <div key={ap.approval_id} style={{ fontSize: 12, marginBottom: revisionRequests.length > 1 ? 8 : 0 }}>
                          <span style={{ fontWeight: 600, color: '#92400e' }}>
                            {`${ap.users?.user_nama_depan || ''} ${ap.users?.user_nama_belakang || ''}`.trim()}
                          </span>
                          {ap.action_at && <span style={{ color: '#b45309', fontSize: 11, marginLeft: 6 }}>{fmtDt(ap.action_at)}</span>}
                          <p style={{ margin: '4px 0 0', color: '#78350f', lineHeight: 1.5, paddingLeft: 8, borderLeft: '3px solid #f59e0b' }}>{ap.comment}</p>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                {/* Revision note from requester (re-submit notes) */}
                {revisions.length > 0 && revisions[0].revision_note && (
                  <div style={{ padding: '9px 13px', borderRadius: 9, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.35)', fontSize: 12 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#b45309' }}>📝 Revision #{revisions[0].revision_number}</span>
                      <span style={{ color: '#92400e', fontSize: 11, marginLeft: 'auto' }}>
                        {`${revisions[0].users?.user_nama_depan || ''} ${revisions[0].users?.user_nama_belakang || ''}`.trim()}
                        {revisions[0].revised_at && ` · ${fmtDt(revisions[0].revised_at)}`}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#78350f', lineHeight: 1.5 }}>{revisions[0].revision_note}</p>
                  </div>
                )}

                {/* Progress: Screening + Approval — collapseable */}
                <ProgressSection
                  screeningRow={screeningRow}
                  approvals={approvals}
                  fpb={fpb}
                  screeningDone={screeningDone}
                  theme={theme}
                />

                {/* Action buttons — screener */}
                {myScreeningPending && (
                  <div style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d97706', background: 'rgba(245,158,11,0.04)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#d97706', flex: 1 }}>🔍 Screening: it's your turn to verify this FPB</span>
                    <button onClick={() => { setAction('approved'); setComment(''); setError(''); setShowActionModal(true) }} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FontAwesomeIcon icon={faCheck} />Pass
                    </button>
                    <button onClick={() => { setAction('revision'); setComment(''); setError(''); setShowActionModal(true) }} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FontAwesomeIcon icon={faRotateLeft} />Revision
                    </button>
                    <button onClick={() => { setAction('reject'); setComment(''); setError(''); setShowActionModal(true) }} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FontAwesomeIcon icon={faTimes} />Reject
                    </button>
                  </div>
                )}

                {/* Action buttons — regular approver */}
                {!myScreeningPending && myPendingApproval && fpb.status === 'pending' && screeningDone && (
                  <div style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #6366f1', background: 'rgba(99,102,241,0.04)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#6366f1', flex: 1 }}>⚡ Step {fpb.current_step}: {myPendingApproval.step_name}</span>
                    <button onClick={() => { setAction('approved'); setComment(''); setError(''); setShowActionModal(true) }} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FontAwesomeIcon icon={faCheck} />Approve
                    </button>
                    <button onClick={() => { setAction('revision'); setComment(''); setError(''); setShowActionModal(true) }} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FontAwesomeIcon icon={faRotateLeft} />Revision
                    </button>
                    <button onClick={() => { setAction('reject'); setComment(''); setError(''); setShowActionModal(true) }} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FontAwesomeIcon icon={faTimes} />Reject
                    </button>
                  </div>
                )}

                {/* ── Procurement Section ── */}
                {/* Visible to screener role or budget role, only when FPB is fully approved */}
                {fpb.status === 'approved' && (iAmScreener || canEditBudget) && (
                  <div style={{ padding: '12px 14px', borderRadius: 10, border: `2px solid ${fpb.procurement_status === 'ordered' ? '#059669' : theme.border}`, background: fpb.procurement_status === 'ordered' ? 'rgba(5,150,105,0.04)' : theme.cardBg, transition: 'all 0.25s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {/* Status indicator / toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${fpb.procurement_status === 'ordered' ? '#059669' : theme.border}`, background: fpb.procurement_status === 'ordered' ? '#059669' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: !savingProcurement ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 0.2s' }}
                          onClick={() => !savingProcurement && (fpb.procurement_status === 'ordered' ? handleToggleProcurement(false) : setShowProcurementNote(v => !v))}>
                          {fpb.procurement_status === 'ordered' && <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12, color: fpb.procurement_status === 'ordered' ? '#059669' : theme.textPrimary }}>
                            {fpb.procurement_status === 'ordered' ? '✅ Ordered / Funds Disbursed' : '📦 Mark as Ordered / Funds Disbursed'}
                          </div>
                          {fpb.procurement_status === 'ordered' && (
                            <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                              by <strong>{`${fpb.procurator?.user_nama_depan || ''} ${fpb.procurator?.user_nama_belakang || ''}`.trim() || 'Admin'}</strong>
                              {fpb.procurement_at && ` · ${fmtDt(fpb.procurement_at)}`}
                            </div>
                          )}
                          {fpb.procurement_note && (
                            <div style={{ fontSize: 11, color: '#065f46', marginTop: 3, padding: '2px 8px', borderLeft: '3px solid #059669', fontStyle: 'italic' }}>
                              {fpb.procurement_note}
                            </div>
                          )}
                        </div>
                      </div>
                      {fpb.procurement_status !== 'ordered' && (
                        <button onClick={() => setShowProcurementNote(v => !v)}
                          style={{ fontSize: 11, padding: '5px 14px', borderRadius: 7, border: '1px solid #059669', background: showProcurementNote ? '#059669' : 'rgba(5,150,105,0.08)', color: showProcurementNote ? '#fff' : '#059669', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }}>
                          {showProcurementNote ? 'Close' : '📦 Mark'}
                        </button>
                      )}
                      {fpb.procurement_status === 'ordered' && (
                        <button onClick={() => handleToggleProcurement(false)} disabled={savingProcurement}
                          style={{ fontSize: 11, padding: '5px 14px', borderRadius: 7, border: '1px solid #dc2626', background: 'rgba(220,38,38,0.06)', color: '#dc2626', cursor: savingProcurement ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                          {savingProcurement ? '⏳' : 'Cancel'}
                        </button>
                      )}
                    </div>
                    {/* Note input — shown when about to mark */}
                    {showProcurementNote && fpb.procurement_status !== 'ordered' && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, display: 'block', marginBottom: 4 }}>Note (optional)</label>
                          <input value={procurementNote} onChange={e => setProcurementNote(e.target.value)}
                            placeholder="e.g. transfer to vendor X, date..."
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 7, fontSize: 12, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, boxSizing: 'border-box' }} />
                        </div>
                        <button onClick={() => handleToggleProcurement(true)} disabled={savingProcurement}
                          style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: savingProcurement ? '#e5e7eb' : '#059669', color: savingProcurement ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 12, cursor: savingProcurement ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                          {savingProcurement ? '⏳ Saving...' : '✅ Confirm Order'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Confirmation Sub-Modal */}
      {showActionModal && (
        <div onClick={() => { if (!saving) { setShowActionModal(false); setAction(null); setComment(''); setError('') } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: theme.cardBg, borderRadius: 14, width: '100%', maxWidth: 420, padding: 22, boxShadow: '0 12px 48px rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: theme.textPrimary, marginBottom: 14 }}>
              {action === 'approved' ? '✅ Confirm Approval' : action === 'revision' ? '🔄 Confirm Revision' : '❌ Confirm Rejection'}
            </div>
            <div style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 12, background: action === 'approved' ? 'rgba(5,150,105,0.08)' : action === 'revision' ? 'rgba(245,158,11,0.08)' : 'rgba(220,38,38,0.08)', color: action === 'approved' ? '#065f46' : action === 'revision' ? '#92400e' : '#991b1b', border: `1px solid ${action === 'approved' ? 'rgba(5,150,105,0.25)' : action === 'revision' ? 'rgba(245,158,11,0.25)' : 'rgba(220,38,38,0.25)'}` }}>
              {action === 'approved'
                ? (myScreeningPending ? `Pass screening for FPB ${fpb?.fpb_number} — FPB will proceed to approvers` : `Approve FPB ${fpb?.fpb_number} — Step ${fpb?.current_step}`)
                : action === 'revision' ? `Request revision for FPB ${fpb?.fpb_number}. The requester will be asked to make corrections.`
                : `Reject FPB ${fpb?.fpb_number}. This action cannot be undone.`}
            </div>
            {action !== 'approved' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>
                  {action === 'revision' ? 'What needs to be revised *' : 'Reason for rejection *'}
                </label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} autoFocus
                  placeholder={action === 'revision' ? 'Explain what needs to be revised...' : 'Explain the reason for rejection...'}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            )}
            {error && <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 10px' }}>⚠ {error}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { if (!saving) { setShowActionModal(false); setAction(null); setComment(''); setError('') } }} disabled={saving}
                style={{ padding: '8px 18px', borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleAction} disabled={saving}
                style={{ padding: '8px 22px', borderRadius: 7, border: 'none', fontWeight: 700, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#e5e7eb' : action === 'approved' ? '#059669' : action === 'revision' ? '#f59e0b' : '#dc2626', color: saving ? '#9ca3af' : '#fff' }}>
                {saving ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 5 }} />Processing...</> : action === 'approved' ? 'Approve' : action === 'revision' ? 'Request Revision' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
      {printFpbId && <PrintFpbModal fpbId={printFpbId} onClose={() => setPrintFpbId(null)} theme={theme} />}
    </>
  )
}



// --- Print FPB Modal ---
const fmtDatePrint = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'

function buildPrintHtml(fpb, items, approvals) {
  const submitterName = ((fpb.users?.user_nama_depan || '') + ' ' + (fpb.users?.user_nama_belakang || '')).trim()
  const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
  const fmtD  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const itemRows = items.map((it, i) => `
    <tr>
      <td style="border:1px solid #9ca3af;padding:6px 8px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #9ca3af;padding:6px 8px">${it.item_name}</td>
      <td style="border:1px solid #9ca3af;padding:6px 8px;text-align:right">${it.quantity}</td>
      <td style="border:1px solid #9ca3af;padding:6px 8px;text-align:right">${it.unit}</td>
      <td style="border:1px solid #9ca3af;padding:6px 8px;text-align:right">${fmtRp(it.unit_price)}</td>
      <td style="border:1px solid #9ca3af;padding:6px 8px;text-align:right;font-weight:700">${fmtRp(it.quantity * it.unit_price)}</td>
    </tr>`).join('')

  // Separate screener row (order=0) from regular approvals
  const screeningApproval = approvals.find(a => a.approver_order === 0)
  const regularApprovals  = approvals.filter(a => a.approver_order !== 0)

  const approvalHeaders = [
    ...(screeningApproval ? [`<th style="border:1px solid #9ca3af;padding:7px 8px;text-align:center;background:#fff8ed;font-weight:700">Screening</th>`] : []),
    ...regularApprovals.map((ap, i) =>
      `<th style="border:1px solid #9ca3af;padding:7px 8px;text-align:center;background:#f9fafb;font-weight:700">Approved ${i + 1}</th>`)
  ].join('')

  const buildCell = (ap, label) => {
    // Pending → show role name. Acted → show actual person who acted.
    const isPending = ap.status === 'pending'
    const roleName  = ap.role?.role_name || (ap.approver_order === 0 ? 'Screener' : 'Approver')
    const userName  = ((ap.users?.user_nama_depan || '') + ' ' + (ap.users?.user_nama_belakang || '')).trim() || '-'
    const displayName = isPending ? roleName : userName
    const dateStr = ap.status === 'approved' ? fmtD(ap.action_at) : ap.status === 'rejected' ? '(Rejected)' : ap.status === 'revision' ? '(Revision)' : '(Pending)'
    return `<td style="border:1px solid #9ca3af;padding:8px;text-align:center;min-width:100px;${ap.approver_order === 0 ? 'background:#fffbeb;' : ''}">
      <div style="font-weight:600;color:${isPending ? '#9ca3af' : '#111827'}">${displayName}</div>
      ${!isPending && ap.approver_order === 0 ? `<div style="font-size:10px;color:#6b7280;margin-top:2px">(Screener)</div>` : ''}
      <div style="font-size:11px;margin-top:4px;color:${ap.status === 'approved' ? '#374151' : '#d1d5db'}">${dateStr}</div>
    </td>`
  }

  const approvalCells = [
    ...(screeningApproval ? [buildCell(screeningApproval, 'Screening')] : []),
    ...regularApprovals.map(ap => buildCell(ap, 'Approval'))
  ].join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>FPB - ${fpb.fpb_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111827; background: #fff; }
    @page { size: A4 portrait; margin: 14mm; }
    table { border-collapse: collapse; width: 100%; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.06; width: 260px; z-index: 0; pointer-events: none; }
    .content { position: relative; z-index: 1; }
    hr { border: none; border-top: 2px solid #111827; margin-bottom: 14px; }
  </style>
</head>
<body>
  <img class="watermark" src="${origin}/images/login-logo.png" alt="" />
  <div class="content">
    <table style="margin-bottom:16px">
      <tr>
        <td style="width:80px;vertical-align:middle">
          <img src="${origin}/images/login-logo.png" style="width:72px;height:72px;object-fit:contain" />
        </td>
        <td style="vertical-align:middle;padding-left:14px">
          <div style="font-weight:800;font-size:16px">Chung Chung Christian School</div>
          <div style="font-weight:700;font-size:14px;margin-top:3px">FPB (Purchase Request Form)</div>
        </td>
      </tr>
    </table>
    <hr />
    <table style="margin-bottom:12px">
      <tr>
        <td style="width:50%;padding-bottom:4px"><span style="font-weight:600">No FPB : </span><strong>${fpb.fpb_number}</strong></td>
        <td style="padding-bottom:4px"><span style="font-weight:600">Division : </span>${fpb.division || '-'}</td>
      </tr>
      <tr><td><span style="font-weight:600">Date FPB : </span>${fmtD(fpb.created_at)}</td></tr>
    </table>
    <table style="margin-bottom:16px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="border:1px solid #9ca3af;padding:6px 8px;text-align:center;font-weight:700">No</th>
          <th style="border:1px solid #9ca3af;padding:6px 8px;text-align:left;font-weight:700">Item</th>
          <th style="border:1px solid #9ca3af;padding:6px 8px;text-align:right;font-weight:700">Qty</th>
          <th style="border:1px solid #9ca3af;padding:6px 8px;text-align:right;font-weight:700">Unit</th>
          <th style="border:1px solid #9ca3af;padding:6px 8px;text-align:right;font-weight:700">Price</th>
          <th style="border:1px solid #9ca3af;padding:6px 8px;text-align:right;font-weight:700">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr style="background:#f9fafb">
          <td colspan="4" style="border:1px solid #9ca3af;padding:6px 8px;text-align:center;font-weight:700">GRAND TOTAL</td>
          <td colspan="2" style="border:1px solid #9ca3af;padding:6px 8px;text-align:right;font-weight:800;color:#1d4ed8">${fmtRp(fpb.grand_total)}</td>
        </tr>
      </tbody>
    </table>
    <table style="margin-bottom:18px">
      <tr>
        <td style="width:50%;padding-bottom:6px;padding-right:12px;vertical-align:top"><span style="font-weight:600">Note : </span>${fpb.note || '-'}</td>
        <td style="padding-bottom:6px;vertical-align:top"><span style="font-weight:600">Budget : </span>${fpb.budget || '-'}</td>
      </tr>
      <tr>
        <td style="padding-bottom:6px"><span style="font-weight:600">Usage Date : </span>${fmtD(fpb.usage_date)}</td>
        <td style="padding-bottom:6px"><span style="font-weight:600">Remaining Budget : </span>${fpb.remaining_budget != null ? fmtRp(fpb.remaining_budget) : '-'}</td>
      </tr>
    </table>
    <table style="margin-bottom:14px">
      <thead>
        <tr>
          <th style="border:1px solid #9ca3af;padding:7px 8px;text-align:center;background:#f9fafb;font-weight:700">Created</th>
          ${approvalHeaders}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border:1px solid #9ca3af;padding:8px;text-align:center;min-width:100px">
            <div style="font-weight:600">${submitterName}</div>
            <div style="font-size:11px;margin-top:4px;color:#6b7280">${fmtD(fpb.created_at)}</div>
          </td>
          ${approvalCells}
        </tr>
      </tbody>
    </table>
    <div style="font-size:11px;color:#374151;font-style:italic">** This document has been digitally signed.</div>
  </div>
  <script>window.onload = function() { setTimeout(function(){ window.print(); }, 300); }</script>
</body>
</html>`
}

function PrintFpbModal({ fpbId, onClose }) {
  const [fpb, setFpb]             = useState(null)
  const [items, setItems]         = useState([])
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: f }, { data: it }, { data: ap }] = await Promise.all([
        supabase.from('fpb').select('*, fpb_types(type_name), users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang)').eq('fpb_id', fpbId).single(),
        supabase.from('fpb_items').select('*').eq('fpb_id', fpbId).order('item_id'),
        supabase.from('fpb_approvals').select('*, users!fpb_approvals_approver_user_id_fkey(user_nama_depan, user_nama_belakang)').eq('fpb_id', fpbId).order('approver_order'),
      ])
      setFpb(f); setItems(it || []); setApprovals(ap || [])
      setLoading(false)
    }
    load()
  }, [fpbId])

  const pendingApprovers = approvals.filter(a => a.status !== 'approved' && a.status !== 'rejected')
  const submitterName    = fpb ? (fpb.users?.user_nama_depan || '') + ' ' + (fpb.users?.user_nama_belakang || '') : ''

  const handlePrint = () => {
    if (!fpb) return
    const html = buildPrintHtml(fpb, items, approvals)
    const w = window.open('', '_blank', 'width=900,height=700')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px 0', overflowY: 'auto' }}>

      <div style={{ position: 'fixed', top: 16, right: 24, display: 'flex', gap: 8, zIndex: 2001 }}>
        <button onClick={handlePrint} disabled={loading || !fpb}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: loading ? '#a5b4fc' : '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FontAwesomeIcon icon={faPrint} /> {loading ? 'Loading...' : 'Print'}
        </button>
        <button onClick={onClose}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Close
        </button>
      </div>

      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', width: '210mm', borderRadius: 4, boxShadow: '0 8px 40px rgba(0,0,0,0.35)', position: 'relative', padding: '16mm', marginTop: 60, marginBottom: 24, fontFamily: 'Arial, sans-serif' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}><FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 28 }} /></div>
        ) : !fpb ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#dc2626' }}>FPB not found.</div>
        ) : (
          <>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
              <img src="/images/login-logo.png" alt="" style={{ width: 260, opacity: 0.06, userSelect: 'none' }} />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}><tbody><tr>
                <td style={{ width: 80, verticalAlign: 'middle' }}>
                  <img src="/images/login-logo.png" alt="Logo" style={{ width: 72, height: 72, objectFit: 'contain' }} />
                </td>
                <td style={{ verticalAlign: 'middle', paddingLeft: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>Chung Chung Christian School</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginTop: 3 }}>FPB (Purchase Request Form)</div>
                </td>
              </tr></tbody></table>
              <hr style={{ border: 'none', borderTop: '2px solid #111827', marginBottom: 14 }} />
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 13 }}><tbody>
                <tr>
                  <td style={{ width: '50%', paddingBottom: 4 }}><span style={{ fontWeight: 600 }}>No FPB : </span><strong>{fpb.fpb_number}</strong></td>
                  <td style={{ paddingBottom: 4 }}><span style={{ fontWeight: 600 }}>Division : </span>{fpb.division || '-'}</td>
                </tr>
                <tr><td><span style={{ fontWeight: 600 }}>Date FPB : </span>{fmtDatePrint(fpb.created_at)}</td></tr>
              </tbody></table>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
                <thead><tr style={{ background: '#f3f4f6' }}>
                  {['No','Item','Qty','Unit','Price','Subtotal'].map((h, i) => (
                    <th key={h} style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: i === 0 ? 'center' : i === 1 ? 'left' : 'right', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.item_id}>
                      <td style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ border: '1px solid #9ca3af', padding: '6px 8px' }}>{it.item_name}</td>
                      <td style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'right' }}>{it.quantity}</td>
                      <td style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'right' }}>{it.unit}</td>
                      <td style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'right' }}>{fmt(it.unit_price)}</td>
                      <td style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{fmt(it.quantity * it.unit_price)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f9fafb' }}>
                    <td colSpan={4} style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>GRAND TOTAL</td>
                    <td colSpan={2} style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: '#1d4ed8' }}>{fmt(fpb.grand_total)}</td>
                  </tr>
                </tbody>
              </table>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 18 }}><tbody>
                <tr>
                  <td style={{ width: '50%', paddingBottom: 6, paddingRight: 12, verticalAlign: 'top' }}><span style={{ fontWeight: 600 }}>Note : </span>{fpb.note || '-'}</td>
                  <td style={{ paddingBottom: 6, verticalAlign: 'top' }}><span style={{ fontWeight: 600 }}>Budget : </span>{fpb.budget || '-'}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: 6 }}><span style={{ fontWeight: 600 }}>Usage Date : </span>{fmtDatePrint(fpb.usage_date)}</td>
                  <td style={{ paddingBottom: 6 }}><span style={{ fontWeight: 600 }}>Remaining Budget : </span>{fpb.remaining_budget != null ? fmt(fpb.remaining_budget) : '-'}</td>
                </tr>
              </tbody></table>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
                <thead><tr>
                  <th style={{ border: '1px solid #9ca3af', padding: '7px 8px', textAlign: 'center', background: '#f9fafb', fontWeight: 700 }}>Created</th>
                  {approvals.map((ap, i) => (
                    <th key={ap.approval_id} style={{ border: '1px solid #9ca3af', padding: '7px 8px', textAlign: 'center', background: '#f9fafb', fontWeight: 700 }}>Approved {i + 1}</th>
                  ))}
                </tr></thead>
                <tbody><tr>
                  <td style={{ border: '1px solid #9ca3af', padding: '8px', textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontWeight: 600 }}>{submitterName.trim()}</div>
                    <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>{fmtDatePrint(fpb.created_at)}</div>
                  </td>
                  {approvals.map(ap => {
                    // Pending → role name. Acted → actual person who acted.
                    const isPending   = ap.status === 'pending'
                    const roleName    = ap.role?.role_name || (ap.approver_order === 0 ? 'Screener' : 'Approver')
                    const userName    = ((ap.users?.user_nama_depan || '') + ' ' + (ap.users?.user_nama_belakang || '')).trim() || '-'
                    const displayName = isPending ? roleName : userName
                    return (
                      <td key={ap.approval_id} style={{ border: '1px solid #9ca3af', padding: '8px', textAlign: 'center', minWidth: 100 }}>
                        <div style={{ fontWeight: 600, color: isPending ? '#9ca3af' : '#111827' }}>{displayName}</div>
                        <div style={{ fontSize: 11, marginTop: 4, color: ap.status === 'approved' ? '#374151' : '#d1d5db' }}>
                          {ap.status === 'approved' ? fmtDatePrint(ap.action_at) : ap.status === 'rejected' ? '(Rejected)' : ap.status === 'revision' ? '(Revision)' : '(Pending)'}
                        </div>
                      </td>
                    )
                  })}
                </tr></tbody>
              </table>
              <div style={{ fontSize: 11, color: '#374151', fontStyle: 'italic' }}>** This document has been digitally signed.</div>
            </div>
          </>
        )}
      </div>

      {!loading && pendingApprovers.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 12, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxWidth: 300, zIndex: 2001 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#b45309', marginBottom: 6 }}>Approval Incomplete</div>
          {pendingApprovers.map(ap => (
            <div key={ap.approval_id} style={{ fontSize: 11, color: '#374151', marginBottom: 2 }}>
              - {((ap.users?.user_nama_depan || '') + ' ' + (ap.users?.user_nama_belakang || '')).trim()} ({ap.status === 'revision' ? 'Revision Requested' : 'Pending Approval'})
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ─── Edit FPB Modal ───────────────────────────────────────────────────────────
function EditFpbModal({ fpbId, onClose, theme, onSuccess }) {
  const [fpb, setFpb]             = useState(null)
  const [items, setItems]         = useState([])
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [userId, setUserId]       = useState(null)

  // Editable fields
  const [usageDate, setUsageDate] = useState('')
  const [note, setNote]           = useState('')
  const [revNote, setRevNote]     = useState('')
  const [editItems, setEditItems] = useState([])

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) { setUserId(uid); fetchData() }
  }, [fpbId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: f } = await supabase.from('fpb')
        .select('*, fpb_types(type_name)')
        .eq('fpb_id', fpbId).single()
      setFpb(f)
      if (f) {
        setUsageDate(f.usage_date ? f.usage_date.slice(0, 10) : '')
        setNote(f.note || '')
      }
      const { data: it } = await supabase.from('fpb_items').select('*').eq('fpb_id', fpbId).order('created_at')
      const mapped = (it || []).map(i => ({
        _id: String(i.item_id),
        item_name: i.item_name || '',
        quantity: String(i.quantity || 1),
        unit: i.unit || 'pcs',
        unit_price: String(i.unit_price || ''),
        seller_url: i.seller_url || '',
      }))
      setItems(it || [])
      setEditItems(mapped)
      const { data: rv } = await supabase.from('fpb_revisions')
        .select('*, users!fpb_revisions_revised_by_fkey(user_nama_depan, user_nama_belakang)')
        .eq('fpb_id', fpbId).order('revision_number', { ascending: false })
      setRevisions(rv || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const grandTotal = editItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)

  const handleSave = async () => {
    setError('')
    // Validate
    if (!usageDate) { setError('Required date is required'); return }
    if (editItems.length === 0) { setError('At least 1 item is required'); return }
    for (const it of editItems) {
      if (!it.item_name.trim()) { setError('Item name cannot be empty'); return }
      if (!Number(it.quantity) || Number(it.quantity) <= 0) { setError('Qty must be > 0'); return }
    }
    setSaving(true)
    try {
      const uid = parseInt(localStorage.getItem('kr_id'))
      // 1) Update FPB header
      await supabase.from('fpb').update({
        usage_date: usageDate,
        note: note.trim() || null,
        grand_total: grandTotal,
      }).eq('fpb_id', fpbId)

      // 2) Delete old items + re-insert
      await supabase.from('fpb_items').delete().eq('fpb_id', fpbId)
      await supabase.from('fpb_items').insert(editItems.map(i => ({
        fpb_id: fpbId,
        item_name: i.item_name.trim(),
        quantity: Number(i.quantity),
        unit: i.unit || 'pcs',
        unit_price: Number(i.unit_price || 0),
        seller_url: i.seller_url?.trim() || null,
      })))

      // 3) If in revision: insert revision snapshot + resubmit
      if (fpb?.status === 'revision') {
        const { data: rev } = await supabase.from('fpb_revisions').select('revision_number')
          .eq('fpb_id', fpbId).order('revision_number', { ascending: false }).limit(1)
        const revNum = (rev?.[0]?.revision_number || 0) + 1
        await supabase.from('fpb_revisions').insert({
          fpb_id: fpbId, revision_number: revNum, revised_by: uid,
          snapshot: { fpb, items }, revision_note: revNote.trim() || null
        })
        await supabase.from('fpb_approvals').update({ status: 'pending', comment: null, action_at: null }).eq('fpb_id', fpbId)
        await supabase.from('fpb').update({ status: 'pending', current_step: 1, revision_count: (fpb.revision_count || 0) + 1 }).eq('fpb_id', fpbId)
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '8px 11px', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, outline: 'none' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.cardBg, borderRadius: 18, width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: theme.textPrimary }}>
              ✏️ Edit FPB {fpb?.fpb_number}
            </div>
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
              {fpb?.status === 'revision' ? '🔄 FPB needs revision — update and resubmit' : 'Edit FPB data'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', padding: 6, fontSize: 18 }}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 28, color: theme.textSecondary }} />
              <p style={{ marginTop: 12, color: theme.textSecondary }}>Loading data...</p>
            </div>
          ) : (
            <>
              {/* Revision comment banner (if revision status) */}
              {fpb?.status === 'revision' && revisions.length > 0 && revisions[0].revision_note === null && revisions.find(r => r.revision_note) && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.4)' }}>
                  <div style={{ fontWeight: 700, color: '#b45309', fontSize: 13, marginBottom: 4 }}>📝 Approver Comment</div>
                  <p style={{ margin: 0, fontSize: 13, color: '#78350f' }}>{revisions.find(r => r.revision_note)?.revision_note}</p>
                </div>
              )}

              {/* Informasi Umum */}
              <div style={{ padding: '16px 18px', borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.cardBg }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: theme.textPrimary, marginBottom: 14 }}>General Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>Required Date *</label>
                    <input type="date" value={usageDate} onChange={e => setUsageDate(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>Note (optional)</label>
                    <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Additional notes..." style={inp} />
                  </div>
                </div>
              </div>

              {/* Daftar Barang — editable */}
              <div style={{ borderRadius: 12, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `1px solid ${theme.border}`, background: theme.cardBg }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: theme.textPrimary }}>Item List</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>Total: {fmt(grandTotal)}</span>
                    <button onClick={() => setEditItems(prev => [...prev, { _id: crypto.randomUUID(), item_name: '', quantity: '1', unit: 'pcs', unit_price: '', seller_url: '' }])}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      <FontAwesomeIcon icon={faPlus} /> Add Item
                    </button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '100px' }} />
                      <col />
                      <col style={{ width: '36px' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: theme.subtleBg }}>
                        {['Item Name *', 'Qty *', 'Unit', 'Unit Price (Rp)', 'Subtotal', 'Reference Link', ''].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.map((item, i) => (
                        <tr key={item._id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '6px 8px' }}>
                            <input value={item.item_name} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, item_name: e.target.value } : x))}
                              placeholder="Item name..."
                              style={{ ...inp, padding: '5px 8px', border: `1px solid ${!item.item_name ? '#fca5a5' : theme.border}` }} />
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <input type="number" min="1" value={item.quantity} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                              style={{ ...inp, padding: '5px 6px', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <select value={item.unit} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                              style={{ ...inp, padding: '5px 4px' }}>
                              {['pcs','kg','liter','box','rim','lusin','unit','set','lump sum'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <input type="number" min="0" value={item.unit_price} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, unit_price: e.target.value } : x))}
                              placeholder="0" style={{ ...inp, padding: '5px 8px', textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '6px 8px', fontWeight: 700, color: '#6366f1', textAlign: 'right' }}>
                            {fmt((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <input value={item.seller_url} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, seller_url: e.target.value } : x))}
                              placeholder="https://..."
                              style={{ ...inp, padding: '5px 8px', fontSize: 11 }} />
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            {editItems.length > 1 && (
                              <button onClick={() => setEditItems(prev => prev.filter((_, j) => j !== i))}
                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}>
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `2px solid ${theme.border}`, background: theme.subtleBg }}>
                        <td colSpan={4} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: theme.textPrimary, fontSize: 13 }}>Grand Total</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#6366f1' }}>{fmt(grandTotal)}</td>
                        <td /><td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Revision note (only if status = revision) */}
              {fpb?.status === 'revision' && (
                <div style={{ padding: '16px 18px', borderRadius: 12, border: '1.5px solid #f59e0b', background: 'rgba(245,158,11,0.04)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b', marginBottom: 8 }}>🔄 Revision Note (optional)</div>
                  <p style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>Describe what you changed in this revision.</p>
                  <textarea value={revNote} onChange={e => setRevNote(e.target.value)} rows={2}
                    placeholder="What did you change..."
                    style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              )}

              {error && <div style={{ padding: '11px 15px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>⚠ {error}</div>}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: `1px solid ${theme.border}`, flexShrink: 0, background: theme.cardBg }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#e5e7eb' : fpb?.status === 'revision' ? '#f59e0b' : 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: saving ? '#9ca3af' : '#fff' }}>
              {saving ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />Saving...</> : fpb?.status === 'revision' ? '📤 Save & Resubmit' : '💾 Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ fpb, onClose, theme, onSuccess }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')

  const handleDelete = async () => {
    setDeleting(true); setError('')
    try {
      await supabase.from('fpb_approvals').delete().eq('fpb_id', fpb.fpb_id)
      await supabase.from('fpb_items').delete().eq('fpb_id', fpb.fpb_id)
      const { error: e } = await supabase.from('fpb').delete().eq('fpb_id', fpb.fpb_id)
      if (e) throw e
      if (onSuccess) onSuccess()
      onClose()
    } catch (e) { setError(e.message) }
    finally { setDeleting(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.cardBg, borderRadius: 16, width: '100%', maxWidth: 440, padding: 28, boxShadow: '0 12px 48px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>🗑️</div>
        <div style={{ fontWeight: 800, fontSize: 17, color: theme.textPrimary, textAlign: 'center', marginBottom: 8 }}>Delete FPB?</div>
        <p style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 18, lineHeight: 1.6 }}>
          You are about to delete <strong style={{ color: theme.textPrimary }}>{fpb.fpb_number}</strong>.<br />
          This action <strong style={{ color: '#dc2626' }}>cannot be undone</strong>.
        </p>
        {error && <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>⚠ {error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose} disabled={deleting}
            style={{ padding: '10px 24px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: deleting ? '#e5e7eb' : '#dc2626', color: deleting ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer' }}>
            {deleting ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />Deleting...</> : '🗑 Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create FPB Modal ─────────────────────────────────────────────────────────
function CreateFpbModal({ onClose, onSuccess, theme }) {
  const [step, setStep]         = useState(1)
  const [types, setTypes]       = useState([])
  const [selType, setSelType]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(null)
  const [approverStatus, setApproverStatus] = useState('loading') // 'loading' | 'ok' | 'no_role' | 'no_approver'
  const [userRoleName, setUserRoleName] = useState('')

  const [division, setDivision]   = useState('')
  const [note, setNote]           = useState('')
  const [usageDate, setUsageDate] = useState('')
  const [items, setItems]         = useState([emptyItem()])
  const [errors, setErrors]       = useState({})

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('kr_id'))

    // Load FPB types
    supabase.from('fpb_types').select('*').eq('is_active', true).order('created_at')
      .then(({ data }) => setTypes(data || []))

    if (uid) {
      // Load user info: unit + role
      supabase.from('users').select('user_unit_id, user_role_id, role!users_user_role_id_fkey(role_name)').eq('user_id', uid).single()
        .then(async ({ data: u }) => {
          // Set division from unit
          if (u?.user_unit_id) {
            const { data: unit } = await supabase.from('unit').select('unit_name').eq('unit_id', u.user_unit_id).single()
            if (unit) setDivision(unit.unit_name)
          }
          // Check approver configuration
          if (!u?.user_role_id) {
            setUserRoleName('—')
            setApproverStatus('no_role')
            return
          }
          setUserRoleName(u.role?.role_name || '—')
          const { data: ra } = await supabase.from('fpb_role_approvers')
            .select('approver1_id').eq('role_id', u.user_role_id).maybeSingle()
          setApproverStatus(ra?.approver1_id ? 'ok' : 'no_approver')
        })
    }
  }, [])

  const grandTotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
  const exceeds    = selType?.max_amount && grandTotal > selType.max_amount

  const updateItem = (id, field, val) => setItems(prev => prev.map(i => i._id === id ? { ...i, [field]: val } : i))
  const addItem    = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (id) => setItems(prev => prev.filter(i => i._id !== id))

  const validate = () => {
    const e = {}
    if (!usageDate) e.usageDate = 'Required date is required'
    if (items.some(i => !i.item_name.trim())) e.items = 'All item names are required'
    if (items.some(i => !i.unit_price || Number(i.unit_price) <= 0)) e.items = 'All unit prices are required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const uid = parseInt(localStorage.getItem('kr_id'))
      if (!uid) throw new Error('Not authenticated')
      const now   = new Date()
      const year  = now.getFullYear()
      const month = now.getMonth() + 1
      const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']
      const roman = ROMAN[month - 1]
      const pattern = `/YPMS/FPB/${roman}/${year}`

      // Get submitter's role
      const { data: submitter } = await supabase.from('users')
        .select('user_role_id').eq('user_id', uid).single()
      if (!submitter?.user_role_id) throw new Error('Your role is not configured. Please contact the administrator.')

      // Get approvers for submitter's role
      const { data: ra } = await supabase.from('fpb_role_approvers')
        .select('*').eq('role_id', submitter.user_role_id).single()
      if (!ra?.approver1_id) throw new Error('Approver for your role is not configured. Please contact the administrator to set up approvers in FPB Settings.')

      // Build approval rows — 1 per approver, each gets their own sequential step_order
      const approverIds = [ra.approver1_id, ra.approver2_id, ra.approver3_id].filter(Boolean)
      const approvalRows = approverIds.map((approverId, idx) => ({
        fpb_id:           null,
        step_order:       idx + 1,   // Step 1, 2, 3 per approver
        step_name:        'Approval',
        approver_user_id: approverId,
        approver_role_id: submitter.user_role_id,
        approver_order:   idx + 1,
        status:           'pending',
      }))

      // Fetch global screener role (if any) — screener gets step_order=0
      const { data: sc } = await supabase.from('fpb_screener').select('screener_role_id').limit(1).maybeSingle()
      if (sc?.screener_role_id) {
        approvalRows.unshift({
          fpb_id:           null,
          step_order:       0,         // Screener is step 0 (before approvers)
          step_name:        'Screening',
          approver_user_id: null,
          approver_role_id: sc.screener_role_id,
          approver_order:   0,
          status:           'pending',
        })
      }

      // Generate FPB number: get max existing sequence for this month, then retry on duplicate
      let fpb = null
      let fpbNumber = ''
      let attempt = 0
      while (attempt < 5) {
        // Query all existing numbers for this month to find the current max sequence
        const { data: existingFpbs } = await supabase.from('fpb')
          .select('fpb_number')
          .like('fpb_number', `%${pattern}`)
        const maxSeq = (existingFpbs || []).reduce((max, f) => {
          const match = f.fpb_number?.match(/^(\d+)\//)
          return match ? Math.max(max, parseInt(match[1])) : max
        }, 0)
        fpbNumber = `${String(maxSeq + 1 + attempt).padStart(2, '0')}/YPMS/FPB/${roman}/${year}`

        const initialStep = approvalRows.some(r => r.approver_order === 0) ? 0 : 1
        const { data: inserted, error: fpbErr } = await supabase.from('fpb').insert({
          fpb_number: fpbNumber, fpb_type_id: selType.fpb_type_id, division, submitted_by: uid,
          grand_total: grandTotal, note, usage_date: usageDate, status: 'pending', current_step: initialStep,
        }).select().single()

        if (!fpbErr) { fpb = inserted; break }
        // 23505 = unique violation — another insert raced us, try next number
        if (fpbErr.code === '23505') { attempt++; continue }
        throw fpbErr
      }
      if (!fpb) throw new Error('Failed to generate a unique FPB number. Please try again.')

      const { error: itemErr } = await supabase.from('fpb_items').insert(
        items.map(i => ({ fpb_id: fpb.fpb_id, item_name: i.item_name.trim(), quantity: Number(i.quantity), unit: i.unit, unit_price: Number(i.unit_price), seller_url: i.seller_url?.trim() || null }))
      )
      if (itemErr) throw itemErr

      const { error: apErr } = await supabase.from('fpb_approvals').insert(
        approvalRows.map(r => ({ ...r, fpb_id: fpb.fpb_id }))
      )
      if (apErr) throw apErr

      setDone({ fpb_id: fpb.fpb_id, fpb_number: fpbNumber })
      onSuccess()
    } catch (e) {
      setErrors({ submit: e.message || 'Failed to save FPB' })
    } finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', border: `1px solid ${theme.border}`, background: theme.inputBg || theme.cardBg, color: theme.textPrimary, outline: 'none' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.cardBg, borderRadius: 18, width: '100%', maxWidth: 800, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: theme.textPrimary }}>
              {done ? 'FPB Submitted Successfully' : step === 1 ? 'Create New FPB' : `Create FPB — ${selType?.type_name}`}
            </div>
            {!done && <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 3 }}>{step === 1 ? 'Select the type of purchase form' : selType?.description}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!done && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {[1, 2].map(s => (
                  <div key={s} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: step >= s ? 'linear-gradient(135deg,#6366f1,#0ea5e9)' : theme.subtleBg, color: step >= s ? '#fff' : theme.textSecondary, transition: 'all 0.2s' }}>{s}</div>
                ))}
              </div>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', padding: 6, fontSize: 18 }}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
        <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
          {/* ── Approver not configured warning ── */}
          {(approverStatus === 'no_role' || approverStatus === 'no_approver') && (
            <div style={{ margin: '0 0 20px', padding: '20px 22px', borderRadius: 14, background: 'rgba(251,191,36,0.08)', border: '2px solid rgba(251,191,36,0.5)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 32, flexShrink: 0, lineHeight: 1 }}>🔒</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#92400e', marginBottom: 6 }}>
                  FPB request cannot be processed yet
                </div>
                <p style={{ fontSize: 13, color: '#78350f', margin: '0 0 10px', lineHeight: 1.6 }}>
                  {approverStatus === 'no_role'
                    ? 'Your role has not been configured in the system. Please contact the administrator to set up your account role.'
                    : `The approver for role ${userRoleName ? `"${userRoleName}"` : 'your position'} has not been set by the administrator. FPB requests cannot be processed until the administrator configures approvers in FPB Settings.`
                  }
                </p>
                <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, padding: '6px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.15)', display: 'inline-block' }}>
                  ⚙️ Admin: go to <strong>Settings → FPB Approval</strong> to configure approvers
                </div>
              </div>
            </div>
          )}

          {done && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: theme.textPrimary, marginBottom: 8 }}>{done.fpb_number}</div>
              <div style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 28 }}>FPB submitted successfully and is awaiting approval.</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Close</button>
                <a href={`/data/fpb/${done.fpb_id}`} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}>View FPB Details →</a>
              </div>
            </div>
          )}

          {!done && step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
              {types.filter(t => t.type_code !== 'large' && t.type_code !== 'repair').map(t => (
                <button key={t.fpb_type_id} onClick={() => { setSelType(t); setStep(2) }}
                  style={{ textAlign: 'left', padding: 20, borderRadius: 14, border: `2px solid ${theme.border}`, background: theme.cardBg, cursor: 'pointer', transition: 'all 0.18s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ fontSize: 26, marginBottom: 10, color: '#6366f1' }}><FontAwesomeIcon icon={TYPE_ICONS[t.type_code] || faShoppingCart} /></div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: theme.textPrimary, marginBottom: 5 }}>{t.type_name}</div>
                  <div style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 1.5 }}>{t.description}</div>
                  {t.max_amount && <div style={{ marginTop: 10, padding: '3px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: 11, fontWeight: 700, width: 'fit-content' }}>Max {fmt(t.max_amount)}</div>}
                </button>
              ))}
            </div>
          )}
          {!done && step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ padding: '16px 18px', borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.cardBg }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary, marginBottom: 14 }}>General Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>Division / Unit</label>
                    <div style={{ ...inputStyle, background: theme.subtleBg, color: theme.textSecondary }}>{division || <span style={{ fontStyle: 'italic' }}>Unit not found</span>}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>Required Date <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="date" value={usageDate} onChange={e => setUsageDate(e.target.value)} style={inputStyle} min={new Date().toISOString().slice(0, 10)} />
                    {errors.usageDate && <p style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{errors.usageDate}</p>}
                  </div>
                </div>
              </div>
              <div style={{ borderRadius: 12, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `1px solid ${theme.border}`, background: theme.cardBg }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary }}>Item List</div>
                  <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faPlus} /> Add Item
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '110px' }} />
                      <col />
                      <col style={{ width: '36px' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: theme.subtleBg }}>
                        {['Item Name', 'Qty', 'Unit', 'Unit Price', 'Subtotal', 'Reference Link', ''].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item._id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '7px 8px' }}>
                            <input value={item.item_name} onChange={e => updateItem(item._id, 'item_name', e.target.value)} placeholder="Item name..." style={{ ...inputStyle, padding: '5px 8px', width: '100%' }} />
                          </td>
                          <td style={{ padding: '7px 6px' }}>
                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item._id, 'quantity', e.target.value)} style={{ ...inputStyle, padding: '5px 6px', textAlign: 'center', width: '100%', minWidth: 44 }} />
                          </td>
                          <td style={{ padding: '7px 6px' }}>
                            <select value={item.unit} onChange={e => updateItem(item._id, 'unit', e.target.value)} style={{ ...inputStyle, padding: '5px 4px', width: '100%' }}>
                              {['pcs','kg','liter','box','rim','lusin','unit','set','lump sum'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '7px 6px' }}>
                            <input type="number" min="0" value={item.unit_price} onChange={e => updateItem(item._id, 'unit_price', e.target.value)} placeholder="0" style={{ ...inputStyle, padding: '5px 8px', textAlign: 'right', width: '100%' }} />
                          </td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {fmt((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                          </td>
                          <td style={{ padding: '7px 6px' }}>
                            <input
                              value={item.seller_url || ''}
                              onChange={e => updateItem(item._id, 'seller_url', e.target.value)}
                              placeholder="https://tokopedia.com/..."
                              style={{ ...inputStyle, padding: '5px 8px', fontSize: 11, width: '100%' }}
                            />
                          </td>
                          <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                            {items.length > 1 && <button onClick={() => removeItem(item._id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}><FontAwesomeIcon icon={faTrash} /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `2px solid ${theme.border}`, background: theme.subtleBg }}>
                        <td colSpan={4} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: theme.textPrimary, fontSize: 13 }}>Grand Total</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: exceeds ? '#dc2626' : '#059669' }}>{fmt(grandTotal)}</td>
                        <td /><td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {errors.items && <p style={{ padding: '6px 14px', color: '#dc2626', fontSize: 12 }}>{errors.items}</p>}
              </div>
              {exceeds && <div style={{ padding: '11px 15px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>⚠ Grand total exceeds the maximum limit of {fmt(selType?.max_amount)} for this FPB type.</div>}
              <div style={{ padding: '16px 18px', borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.cardBg }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary, marginBottom: 10 }}>Note (Optional)</div>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Add notes or additional information..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              {errors.submit && <div style={{ padding: '11px 15px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>⚠ {errors.submit}</div>}
            </div>
          )}
        </div>
        {!done && step === 2 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: `1px solid ${theme.border}`, flexShrink: 0, background: theme.cardBg }}>
            <button onClick={() => setStep(1)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />Back
            </button>
            <button onClick={handleSubmit} disabled={saving || exceeds} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, background: saving || exceeds ? theme.subtleBg : 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: saving || exceeds ? theme.textSecondary : '#fff', cursor: saving || exceeds ? 'not-allowed' : 'pointer', boxShadow: saving || exceeds ? 'none' : '0 2px 12px rgba(99,102,241,0.35)' }}>
              {saving ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />Saving...</> : '📤 Submit FPB'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


// ─── FPB List Page ────────────────────────────────────────────────────────────
export default function FpbListPage() {
  const { theme } = useTheme()
  const [tab, setTab]               = useState('mine')
  const [myFpbs, setMyFpbs]         = useState([])
  const [pendingFpbs, setPending]   = useState([])
  const [historyFpbs, setHistory]   = useState([])
  const [isScreenerOrBudget, setIsScreenerOrBudget] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewFpbId, setViewFpbId]   = useState(null)
  const [editFpbId, setEditFpbId]   = useState(null)
  const [deleteFpb, setDeleteFpb]   = useState(null)
  const [printListId, setPrintListId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  // Export
  const [canExport, setCanExport]       = useState(false)
  const now = new Date()
  const [exportMonth, setExportMonth]   = useState(now.getMonth() + 1)
  const [exportYear, setExportYear]     = useState(now.getFullYear())
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError]   = useState('')

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) fetchAll(uid)
  }, [])

  const fetchAll = async (uid) => {
    setLoading(true)
    try {
      const { data: mine } = await supabase
        .from('fpb').select('fpb_id, fpb_number, status, grand_total, usage_date, division, revision_count, created_at, procurement_status, fpb_types(type_name, type_code)')
        .eq('submitted_by', uid).order('created_at', { ascending: false })
      setMyFpbs(mine || [])

      // Get user's role_id for role-based screener detection
      const { data: myUserRow } = await supabase.from('users').select('user_role_id').eq('user_id', uid).single()
      const myRoleId = myUserRow?.user_role_id || null

      // Check if user can export (screener role or budget role)
      const [{ data: screenerRow }, { data: budgetRow }] = await Promise.all([
        myRoleId ? supabase.from('fpb_screener').select('screener_role_id').eq('screener_role_id', myRoleId).maybeSingle() : { data: null },
        myRoleId ? supabase.from('fpb_budget_roles').select('role_id').eq('role_id', myRoleId).maybeSingle()               : { data: null },
      ])
      const isSOB = !!(screenerRow || budgetRow)
      setCanExport(isSOB)
      setIsScreenerOrBudget(isSOB)

      // Step 1a: ALL my regular approval rows (any status, to get full picture)
      const { data: myApprovals } = await supabase
        .from('fpb_approvals')
        .select('approval_id, fpb_id, step_order, step_name, approver_order, status, fpb(fpb_id, fpb_number, status, grand_total, usage_date, division, current_step, fpb_types(type_name), submitted_by, users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang))')
        .eq('approver_user_id', uid)

      // Step 1b: Screening rows for my role (role-based screener, approver_order=0)
      const { data: myScreeningApprovals } = myRoleId ? await supabase
        .from('fpb_approvals')
        .select('approval_id, fpb_id, step_order, step_name, approver_order, status, fpb(fpb_id, fpb_number, status, grand_total, usage_date, division, current_step, fpb_types(type_name), submitted_by, users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang))')
        .eq('approver_role_id', myRoleId).eq('approver_order', 0)
        : { data: [] }

      // Combine all my approval rows
      const allMyApprovals = [...(myApprovals || []), ...(myScreeningApprovals || [])]

      // Only show FPBs that are still "pending" (active, not yet fully resolved)
      const activeCandidates = allMyApprovals.filter(
        a => a.fpb?.status === 'pending'
      )

      if (!activeCandidates.length) {
        setPending([])
      } else {
        // Fetch ALL approvals for those FPBs to determine ordering
        const fpbIds = [...new Set(activeCandidates.map(c => c.fpb_id))]
        const { data: allStepApprovals } = await supabase
          .from('fpb_approvals')
          .select('approval_id, fpb_id, step_order, approver_order, status')
          .in('fpb_id', fpbIds)

        // Determine for each candidate: is it truly their turn (can act) or just viewable?
        const pendingWithWaiting = activeCandidates.map(a => {
          // If my own approval row is already actioned (not pending), skip
          if (a.status !== 'pending') return null

          const allInStep = (allStepApprovals || []).filter(
            ap => ap.fpb_id === a.fpb_id && ap.step_order === a.step_order
          )

          let isMyTurn = false

          // Screener (order=0) is always first — no blockers
          if (a.approver_order === 0) {
            isMyTurn = a.fpb?.current_step === a.step_order
          } else {
            // Check if it's the current step
            if (a.fpb?.current_step !== a.step_order) {
              isMyTurn = false
            } else {
              // Regular approvers: check if screener (order=0) has approved first
              const screenerRow = allInStep.find(ap => ap.approver_order === 0)
              if (screenerRow && screenerRow.status !== 'approved') {
                isMyTurn = false
              } else {
                // Then check sequential order among regular approvers
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

          return {
            ...a.fpb,
            my_step: a.approver_order,  // 0=Screener, 1/2/3=Approver N
            my_step_name: a.step_name,
            is_waiting: !isMyTurn, // true = visible but not yet actionable
          }
        }).filter(Boolean)

        // Deduplicate by fpb_id — prefer actionable (is_waiting=false) entries
        const seen = new Map()
        for (const f of pendingWithWaiting) {
          const existing = seen.get(f.fpb_id)
          if (!existing || (existing.is_waiting && !f.is_waiting)) {
            seen.set(f.fpb_id, f)
          }
        }
        setPending([...seen.values()])
      }

      // Tab 3: History
      // For screener/budget roles: show ALL FPBs (pending + approved + rejected) regardless of their own action
      // For regular approvers: show ALL FPBs where they took any action (approve/reject/revision)
      //   so they can monitor the progress even if FPB is still waiting for other approvers
      if (isSOB) {
        const { data: allFpbs } = await supabase
          .from('fpb')
          .select('fpb_id, fpb_number, status, grand_total, usage_date, division, revision_count, created_at, procurement_status, fpb_types(type_name), users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang)')
          .in('status', ['pending', 'approved', 'rejected'])
          .order('created_at', { ascending: false })
        setHistory((allFpbs || []).map(f => ({ ...f, my_step_name: null, my_action_at: f.created_at })))
      } else {
        // Fetch all rows where this user took action (any non-pending status)
        const { data: myActionedRows } = await supabase
          .from('fpb_approvals')
          .select('fpb_id, step_name, action_at, fpb(fpb_id, fpb_number, status, grand_total, usage_date, division, revision_count, created_at, procurement_status, fpb_types(type_name), users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang))')
          .eq('approver_user_id', uid)
          .neq('status', 'pending')
        // Include all actioned FPBs regardless of the FPB's final status (pending/approved/rejected)
        // so approvers can monitor progress after their own action
        const actionedFpbs = (myActionedRows || [])
          .filter(r => r.fpb != null)
          .map(r => ({ ...r.fpb, my_step_name: r.step_name, my_action_at: r.action_at }))
        const histMap = new Map()
        actionedFpbs.forEach(f => {
          const existing = histMap.get(f.fpb_id)
          if (!existing || new Date(f.my_action_at) > new Date(existing.my_action_at)) histMap.set(f.fpb_id, f)
        })
        setHistory([...histMap.values()].sort((a, b) => new Date(b.my_action_at) - new Date(a.my_action_at)))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const reloadAll = () => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) fetchAll(uid)
  }

  const MONTHS_ID = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const STATUS_LABEL = { pending: 'Pending Approval', approved: 'Approved', rejected: 'Rejected', revision: 'Revision', draft: 'Draft' }

  const handleExport = async () => {
    setExportLoading(true); setExportError('')
    try {
      // Date range for selected month
      const startDate = `${exportYear}-${String(exportMonth).padStart(2,'0')}-01`
      const endDate   = new Date(exportYear, exportMonth, 1).toISOString().slice(0,10)

      // Fetch all FPBs in that month
      const { data: fpbs, error: fpbErr } = await supabase
        .from('fpb')
        .select('fpb_id, fpb_number, status, grand_total, usage_date, division, budget, remaining_budget, created_at, fpb_types(type_name, type_code), users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang), procurement_status')
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .order('fpb_number', { ascending: true })
      if (fpbErr) throw fpbErr
      if (!fpbs?.length) { setExportError('No FPB data for this month'); setExportLoading(false); return }

      // Fetch all items for those FPBs
      const fpbIds = fpbs.map(f => f.fpb_id)
      const { data: allItems, error: itErr } = await supabase
        .from('fpb_items')
        .select('fpb_id, item_name, quantity, unit, unit_price')
        .in('fpb_id', fpbIds)
        .order('fpb_id').order('item_id')
      if (itErr) throw itErr

      // Build flat rows — one row per item
      const dataRows = []
      let no = 1
      for (const fpb of fpbs) {
        const items = (allItems || []).filter(i => i.fpb_id === fpb.fpb_id)
        const submitter = `${fpb.users?.user_nama_depan || ''} ${fpb.users?.user_nama_belakang || ''}`.trim()
        const makeRow = (item) => [
          no++,
          fpb.fpb_number || '',
          submitter,
          fpb.division || '',
          item?.item_name || '',
          item ? item.quantity : '',
          item?.unit || '',
          item ? item.unit_price : '',
          item ? item.quantity * item.unit_price : '',
          STATUS_LABEL[fpb.status] || fpb.status,
          fpb.budget ?? '',
          fpb.remaining_budget ?? '',
        ]
        if (items.length) items.forEach(it => dataRows.push(makeRow(it)))
        else dataRows.push(makeRow(null))
      }

      const monthLabel = MONTHS_ID[exportMonth - 1]
      const HEADERS = ['No', 'No FPB', 'Created By', 'Division', 'Item Name', 'Qty', 'Unit', 'Price', 'Total', 'Status', 'Budget', 'Remaining Budget']
      const NCOLS = HEADERS.length

      // Use ExcelJS for full styling support
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet(`FPB ${monthLabel} ${exportYear}`)

      // Column widths
      ws.columns = [5, 22, 22, 15, 32, 6, 9, 15, 15, 18, 15, 18].map((w, i) => ({ key: String(i), width: w }))

      // Helper: apply border to a cell
      const applyBorder = (cell, color = 'FFB0B0B0') => {
        cell.border = {
          top:    { style: 'thin', color: { argb: color } },
          left:   { style: 'thin', color: { argb: color } },
          bottom: { style: 'thin', color: { argb: color } },
          right:  { style: 'thin', color: { argb: color } },
        }
      }

      // ── Row 1: Institution title ──
      ws.mergeCells(1, 1, 1, NCOLS)
      const r1 = ws.getRow(1)
      r1.height = 24
      const c1 = r1.getCell(1)
      c1.value = 'Chung Chung Christian School'
      c1.alignment = { horizontal: 'center', vertical: 'middle' }
      c1.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } }

      // ── Row 2: Month title ──
      ws.mergeCells(2, 1, 2, NCOLS)
      const r2 = ws.getRow(2)
      r2.height = 20
      const c2 = r2.getCell(1)
      c2.value = `FPB ${monthLabel} ${exportYear}`
      c2.alignment = { horizontal: 'center', vertical: 'middle' }
      c2.font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } }

      // ── Row 3: Empty spacer ──
      ws.addRow([])

      // ── Row 4: Column headers ──
      const headerRow = ws.addRow(HEADERS)
      headerRow.height = 20
      headerRow.eachCell((cell) => {
        cell.value = cell.value  // keep value
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
        applyBorder(cell, 'FF1E3A5F')
      })

      // ── Data rows ──
      dataRows.forEach((rowData, idx) => {
        const row = ws.addRow(rowData)
        row.height = 16
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          // Alternate row background
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }
          }
          applyBorder(cell)
          // Right-align numbers
          if (colNum === 1 || colNum === 6 || colNum === 8 || colNum === 9 || colNum === 11 || colNum === 12) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
          } else {
            cell.alignment = { vertical: 'middle' }
          }
        })
      })

      // ── Download ──
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `FPB_${monthLabel}_${exportYear}.xlsx`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (e) { setExportError(e.message || 'Export failed') }
    finally { setExportLoading(false) }
  }

  const tabs = [
    { key: 'mine',    label: 'My Requests',           icon: faClipboardList, count: myFpbs.length },
    { key: 'pending', label: 'Awaiting My Approval',  icon: faClock,         count: pendingFpbs.length },
    { key: 'history', label: 'Approval History',      icon: faCheckDouble,   count: historyFpbs.length },
    ...(canExport ? [{ key: 'export', label: 'Export Excel', icon: faFileExcel }] : []),
  ]

  const FpbRow = ({ f, isPending, isHistory }) => {
    const canEdit   = f.status === 'revision'
    const canDelete = f.status === 'pending' && (f.revision_count === 0 || f.revision_count == null)
    return (
      <tr style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <td style={{ padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, color: theme.textPrimary, fontSize: 13 }}>{f.fpb_number || '—'}</div>
          <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{f.fpb_types?.type_name}</div>
        </td>
        <td style={{ padding: '12px 14px', fontSize: 13, color: theme.textSecondary }}>{f.division || '—'}</td>
        {isPending && (
          <td style={{ padding: '12px 14px', fontSize: 13 }}>
            {f.is_waiting ? (
              <span style={{ color: '#6b7280', fontWeight: 600, background: 'rgba(107,114,128,0.10)', border: '1px solid rgba(107,114,128,0.25)', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
                ⏳ Waiting for Turn
              </span>
            ) : f.my_step_name === 'Screening'
              ? <span style={{ color: '#d97706', fontWeight: 700, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>🔍 Screening</span>
              : <><span style={{ color: '#6366f1', fontWeight: 600 }}>Step {f.my_step}</span>
                  <div style={{ fontSize: 11, color: theme.textSecondary }}>{f.my_step_name}</div></>
            }
          </td>
        )}
        {isPending && (
          <td style={{ padding: '12px 14px', fontSize: 13, color: theme.textPrimary }}>
            {`${f.users?.user_nama_depan || ''} ${f.users?.user_nama_belakang || ''}`.trim() || '—'}
          </td>
        )}
        {isHistory && (
          <td style={{ padding: '12px 14px', fontSize: 13, color: theme.textPrimary }}>
            {`${f.users?.user_nama_depan || ''} ${f.users?.user_nama_belakang || ''}`.trim() || '—'}
          </td>
        )}
        <td style={{ padding: '12px 14px', fontSize: 13, color: theme.textPrimary, fontWeight: 600 }}>{fmt(f.grand_total)}</td>
        <td style={{ padding: '12px 14px', fontSize: 12, color: theme.textSecondary }}>{fmtDate(f.usage_date)}</td>
        <td style={{ padding: '12px 14px' }}>
          <StatusBadge status={f.status} />
        </td>
        <td style={{ padding: '12px 14px' }}>
          {f.procurement_status === 'ordered'
            ? <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#065f46', background: 'rgba(5,150,105,0.12)', whiteSpace: 'nowrap' }}>📦 Ordered</span>
            : <span style={{ color: theme.textSecondary, fontSize: 12 }}>—</span>}
        </td>
        {!isPending && !isHistory && (
          <td style={{ padding: '12px 14px', fontSize: 11, color: theme.textSecondary }}>{f.revision_count > 0 ? `Revision #${f.revision_count}` : ''}</td>
        )}
        {isHistory && (
          <td style={{ padding: '12px 14px', fontSize: 11, color: '#059669', fontWeight: 600 }}>
            {f.my_action_at ? fmtDt(f.my_action_at) : '—'}
          </td>
        )}
        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
            <button onClick={e => { e.stopPropagation(); setPrintListId(f.fpb_id) }}
              style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
              title="Print FPB">
              <FontAwesomeIcon icon={faPrint} />
            </button>
            {/* View */}
            <button onClick={e => { e.stopPropagation(); setViewFpbId(f.fpb_id) }}
              style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <FontAwesomeIcon icon={faEye} />View
            </button>
            {/* Edit — only in 'mine' tab */}
            {!isPending && !isHistory && (
              <button onClick={e => { e.stopPropagation(); if (canEdit) setEditFpbId(f.fpb_id) }}
                title={!canEdit ? 'Can only be edited when status is Revision' : 'Edit this FPB'}
                style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${canEdit ? '#f59e0b' : theme.border}`, background: canEdit ? 'rgba(245,158,11,0.08)' : theme.subtleBg, color: canEdit ? '#b45309' : theme.textSecondary, fontSize: 12, cursor: canEdit ? 'pointer' : 'not-allowed', opacity: canEdit ? 1 : 0.45, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                <FontAwesomeIcon icon={faPen} />Edit
              </button>
            )}
            {/* Delete — only in 'mine' tab */}
            {!isPending && !isHistory && (
              <button onClick={e => { e.stopPropagation(); if (canDelete) setDeleteFpb(f) }}
                title={!canDelete ? 'FPBs already processed by approver cannot be deleted' : 'Delete this FPB'}
                style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${canDelete ? '#dc2626' : theme.border}`, background: canDelete ? 'rgba(220,38,38,0.07)' : theme.subtleBg, color: canDelete ? '#dc2626' : theme.textSecondary, fontSize: 12, cursor: canDelete ? 'pointer' : 'not-allowed', opacity: canDelete ? 1 : 0.45, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                <FontAwesomeIcon icon={faTrash} />Delete
              </button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  const currentList = tab === 'mine' ? myFpbs : tab === 'pending' ? pendingFpbs : historyFpbs

  // Filter by search query and status
  const filteredList = currentList.filter(f => {
    const q = searchQuery.toLowerCase()
    const matchText = !q ||
      (f.fpb_number || '').toLowerCase().includes(q) ||
      (f.division || '').toLowerCase().includes(q) ||
      (`${f.users?.user_nama_depan || ''} ${f.users?.user_nama_belakang || ''}`).toLowerCase().includes(q) ||
      (f.fpb_types?.type_name || '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || f.status === filterStatus ||
      (filterStatus === 'ordered' && f.procurement_status === 'ordered')
    return matchText && matchStatus
  })

  return (
    <div style={{ padding: '28px 32px', background: theme.pageBg, minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, margin: 0 }}>📋 Purchase Request Form</h1>
          <p style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>Manage purchase requests and approval workflow</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 12px rgba(99,102,241,0.35)' }}>
          <FontAwesomeIcon icon={faPlus} />Create New FPB
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Requests',   value: myFpbs.length,                                      color: '#6366f1' },
          { label: 'Awaiting Approval', value: myFpbs.filter(f => f.status === 'pending').length,  color: '#d97706' },
          { label: 'Needs Revision',    value: myFpbs.filter(f => f.status === 'revision').length, color: '#f59e0b' },
          { label: 'Approved',          value: myFpbs.filter(f => f.status === 'approved').length, color: '#059669' },
          { label: 'Waiting for Me',    value: pendingFpbs.length,                                 color: '#8b5cf6' },
        ].map(c => (
          <Card key={c.label} style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="pt-4 pb-3">
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: theme.subtleBg, border: `1px solid ${theme.border}`, width: 'fit-content', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', background: tab === t.key ? theme.cardBg : 'transparent', color: tab === t.key ? theme.textPrimary : theme.textSecondary, boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            <FontAwesomeIcon icon={t.icon} />
            {t.label}
            {t.count > 0 && <span style={{ padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 800, background: tab === t.key ? '#6366f1' : theme.subtleBg, color: tab === t.key ? '#fff' : theme.textSecondary }}>{t.count}</span>}
          </button>
        ))}
      </div>

      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardContent className="p-0">
          {/* Export tab panel */}
          {tab === 'export' ? (
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: theme.textPrimary, marginBottom: 6 }}>
                  📊 Export FPB Data to Excel
                </div>
                <div style={{ fontSize: 13, color: theme.textSecondary }}>
                  Export all FPBs with item details for the selected month. Each item appears as a separate row.
                </div>
              </div>

              {/* Month & Year picker */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, display: 'block', marginBottom: 6 }}>Month</label>
                  <select value={exportMonth} onChange={e => setExportMonth(Number(e.target.value))}
                    style={{ padding: '9px 14px', borderRadius: 9, fontSize: 13, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, outline: 'none', cursor: 'pointer', minWidth: 140 }}>
                    {MONTHS_ID.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, display: 'block', marginBottom: 6 }}>Year</label>
                  <select value={exportYear} onChange={e => setExportYear(Number(e.target.value))}
                    style={{ padding: '9px 14px', borderRadius: 9, fontSize: 13, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, outline: 'none', cursor: 'pointer', minWidth: 100 }}>
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleExport} disabled={exportLoading}
                  style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: exportLoading ? '#e5e7eb' : 'linear-gradient(135deg,#059669,#10b981)', color: exportLoading ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13, cursor: exportLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: exportLoading ? 'none' : '0 2px 10px rgba(5,150,105,0.3)', whiteSpace: 'nowrap' }}>
                  <FontAwesomeIcon icon={exportLoading ? faSpinner : faFileExcel} spin={exportLoading} />
                  {exportLoading ? 'Downloading...' : `Download Excel — ${MONTHS_ID[exportMonth - 1]} ${exportYear}`}
                </button>
              </div>

              {exportError && (
                <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: 13 }}>
                  ⚠ {exportError}
                </div>
              )}

              {/* Column preview */}
              <div style={{ padding: '12px 16px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.subtleBg }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>EXPORTED COLUMNS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                  {['No', 'No FPB', 'Created By', 'Divisi', 'Item Name', 'Qty', 'Unit', 'Price', 'Total', 'Status', 'Budget', 'Remaining Budget'].map(c => (
                    <span key={c} style={{ padding: '3px 9px', borderRadius: 6, background: theme.cardBg, border: `1px solid ${theme.border}`, fontSize: 11, color: theme.textPrimary }}>{c}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 10 }}>
                  * Each item in an FPB appears as a separate row
                </div>
              </div>
            </div>
          ) : (
          <>
          {/* Search & Filter bar */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: theme.textSecondary, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search FPB number, division, requester..."
                style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: 8, fontSize: 12, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, outline: 'none', cursor: 'pointer' }}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="revision">Revision</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="ordered">📦 Ordered</option>
            </select>
            {(searchQuery || filterStatus) && (
              <button onClick={() => { setSearchQuery(''); setFilterStatus('') }}
                style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, border: `1px solid ${theme.border}`, background: theme.subtleBg, color: theme.textSecondary, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ✕ Reset
              </button>
            )}
            <span style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{filteredList.length} FPB</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 24 }} />
              <p style={{ marginTop: 10 }}>Loading data...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{searchQuery || filterStatus ? '🔍' : '📋'}</div>
              <p style={{ fontWeight: 700, color: theme.textPrimary, fontSize: 15, marginBottom: 6 }}>
                {searchQuery || filterStatus ? 'No FPBs match the current filter'
                  : tab === 'mine' ? 'No requests submitted yet' : tab === 'pending' ? 'No FPBs awaiting your approval' : 'No FPBs in your approval history'}
              </p>
              {!(searchQuery || filterStatus) && tab === 'mine' && (
                <button onClick={() => setShowCreate(true)}
                  style={{ marginTop: 16, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Create New FPB
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: theme.subtleBg, borderBottom: `2px solid ${theme.border}` }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>FPB Number</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Division</th>
                    {tab === 'pending' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>My Step</th>}
                    {tab === 'pending' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Requester</th>}
                    {tab === 'history' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Requester</th>}
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Grand Total</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Required Date</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Order</th>
                    {tab === 'mine' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}></th>}
                    {tab === 'history' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Approved At</th>}
                    <th style={{ padding: '10px 14px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map(f => <FpbRow key={f.fpb_id} f={f} isPending={tab === 'pending'} isHistory={tab === 'history'} />)}
                </tbody>
              </table>
            </div>
          )}
          </>
          )}
        </CardContent>
      </Card>

      {showCreate && <CreateFpbModal theme={theme} onClose={() => setShowCreate(false)} onSuccess={reloadAll} />}
      {viewFpbId && <ViewFpbModal fpbId={viewFpbId} theme={theme} onClose={() => setViewFpbId(null)} onActionDone={reloadAll} />}
      {editFpbId && <EditFpbModal fpbId={editFpbId} theme={theme} onClose={() => setEditFpbId(null)} onSuccess={reloadAll} />}
      {deleteFpb && <DeleteConfirmModal fpb={deleteFpb} theme={theme} onClose={() => setDeleteFpb(null)} onSuccess={reloadAll} />}
      {printListId && <PrintFpbModal fpbId={printListId} theme={theme} onClose={() => setPrintListId(null)} />}
    </div>
  )
}
