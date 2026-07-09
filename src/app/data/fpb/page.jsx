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
} from '@fortawesome/free-solid-svg-icons'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:    { label: 'Draft',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  pending:  { label: 'Menunggu', color: '#d97706', bg: 'rgba(217,119,6,0.12)'   },
  revision: { label: 'Revisi',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  approved: { label: 'Disetujui',color: '#059669', bg: 'rgba(5,150,105,0.12)'   },
  rejected: { label: 'Ditolak',  color: '#dc2626', bg: 'rgba(220,38,38,0.12)'   },
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

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) { setUserId(uid); fetchData(uid) }
  }, [fpbId])

  const fetchData = async (uid) => {
    setLoading(true)
    try {
      const { data: f } = await supabase.from('fpb')
        .select('*, fpb_types(type_name, type_code, max_amount), users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang)')
        .eq('fpb_id', fpbId).single()
      setFpb(f)
      if (f) {
        setBudgetVal(f.budget != null ? String(f.budget) : '')
        setRemainingVal(f.remaining_budget != null ? String(f.remaining_budget) : '')
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
        const { data: br } = await supabase.from('fpb_budget_roles').select('role_id').eq('role_id', userRow.user_role_id).maybeSingle()
        setCanEditBudget(!!br)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const myPendingApproval = approvals.find(
    a => a.approver_user_id === userId && a.status === 'pending' && a.step_order === fpb?.current_step
  )

  const handleAction = async () => {
    if (!myPendingApproval) return
    if ((action === 'revision' || action === 'reject') && !comment.trim()) {
      setError('Komentar wajib diisi untuk revisi / penolakan'); return
    }
    setSaving(true); setError('')
    try {
      await supabase.from('fpb_approvals').update({
        status: action, comment: comment.trim() || null, action_at: new Date().toISOString()
      }).eq('approval_id', myPendingApproval.approval_id)

      if (action === 'approved') {
        const { data: freshStep } = await supabase.from('fpb_approvals')
          .select('status').eq('fpb_id', fpbId).eq('step_order', fpb.current_step)
        const allDone = freshStep?.every(a => a.status === 'approved')
        if (allDone) {
          const nextStepRow = approvals.find(a => a.step_order === fpb.current_step + 1)
          if (nextStepRow) {
            await supabase.from('fpb').update({ current_step: fpb.current_step + 1 }).eq('fpb_id', fpbId)
          } else {
            await supabase.from('fpb').update({ status: 'approved' }).eq('fpb_id', fpbId)
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
      } else if (action === 'reject') {
        await supabase.from('fpb').update({ status: 'rejected' }).eq('fpb_id', fpbId)
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

  const statusIcon = (s) => {
    if (s === 'approved') return <span style={{ color: '#059669', fontWeight: 700 }}>✓</span>
    if (s === 'revision') return <span style={{ color: '#f59e0b', fontWeight: 700 }}>↩</span>
    if (s === 'rejected') return <span style={{ color: '#dc2626', fontWeight: 700 }}>✕</span>
    return <span style={{ color: '#6366f1' }}>…</span>
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: theme.cardBg, borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
            {loading ? <span style={{ color: theme.textSecondary, fontSize: 14 }}>Memuat...</span> : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: theme.textPrimary }}>{fpb?.fpb_number || '—'}</span>
                <span style={{ fontSize: 11, color: theme.textSecondary }}>{fpb?.fpb_types?.type_name}</span>
                {fpb && <StatusBadge status={fpb.status} />}
                {fpb?.revision_count > 0 && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Revisi ke-{fpb.revision_count}</span>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              {fpb && !loading && (
                <button onClick={() => setPrintFpbId(fpbId)}
                  style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.textSecondary, cursor: 'pointer', padding: '4px 10px', fontSize: 13, borderRadius: 7, display: 'flex', alignItems: 'center', gap: 5 }}
                  title="Cetak FPB">
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
              <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>FPB tidak ditemukan.</div>
            ) : (
              <>
                {/* Info bar — compact single row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', padding: '10px 14px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.subtleBg, fontSize: 12 }}>
                  {[
                    ['Pengaju', `${fpb.users?.user_nama_depan || ''} ${fpb.users?.user_nama_belakang || ''}`.trim()],
                    ['Divisi', fpb.division || '—'],
                    ['Tgl Dibuat', fmtDate(fpb.created_at)],
                    ['Tgl Kebutuhan', fmtDate(fpb.usage_date)],
                  ].map(([l, v]) => (
                    <span key={l}><span style={{ color: theme.textSecondary }}>{l}: </span><strong style={{ color: theme.textPrimary }}>{v}</strong></span>
                  ))}
                  {fpb.note && <span style={{ width: '100%', marginTop: 2 }}><span style={{ color: theme.textSecondary }}>Catatan: </span><span style={{ color: theme.textPrimary }}>{fpb.note}</span></span>}
                </div>

                {/* Items table */}
                <div style={{ borderRadius: 10, border: `1px solid ${theme.border}`, display: 'block', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 580, width: '100%' }}>
                      <thead>
                        <tr style={{ background: theme.subtleBg }}>
                          {['#', 'Nama Barang', 'Qty', 'Sat', 'Harga', 'Subtotal', 'Link'].map(h => (
                            <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Nama Barang' || h === 'Link' ? 'left' : h === '#' ? 'center' : 'right', color: theme.textSecondary, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr><td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: theme.textSecondary, fontStyle: 'italic', fontSize: 12 }}>Tidak ada barang</td></tr>
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
                </div>

                {/* Budget — compact inline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.cardBg, fontSize: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: theme.textPrimary, fontSize: 12 }}>💰 Budget</span>
                  <span style={{ color: fpb.budget != null ? '#6366f1' : theme.textSecondary, fontWeight: 700 }}>
                    {fpb.budget != null ? fpb.budget : <i>—</i>}
                  </span>
                  <span style={{ color: theme.textSecondary }}>·</span>
                  <span style={{ fontSize: 11, color: theme.textSecondary }}>Sisa:</span>
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
                        <div style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 3 }}>Sisa Budget (Rp)</div>
                        <input type="number" min="0" value={remainingVal} onChange={e => setRemainingVal(e.target.value)}
                          style={{ padding: '5px 8px', borderRadius: 7, fontSize: 12, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, width: 140 }} />
                      </div>
                      <button onClick={() => setEditBudget(false)} style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontSize: 12, cursor: 'pointer' }}>Batal</button>
                      <button onClick={handleSaveBudget} disabled={savingBudget} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        {savingBudget ? '…' : 'Simpan'}
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
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#b45309', marginBottom: 6 }}>⚠ Permintaan Revisi dari Approver</div>
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
                      <span style={{ fontWeight: 700, color: '#b45309' }}>📝 Revisi ke-{revisions[0].revision_number}</span>
                      <span style={{ color: '#92400e', fontSize: 11, marginLeft: 'auto' }}>
                        {`${revisions[0].users?.user_nama_depan || ''} ${revisions[0].users?.user_nama_belakang || ''}`.trim()}
                        {revisions[0].revised_at && ` · ${fmtDt(revisions[0].revised_at)}`}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#78350f', lineHeight: 1.5 }}>{revisions[0].revision_note}</p>
                  </div>
                )}

                {/* Approval — compact single-line per approver */}
                <div style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.cardBg }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: theme.textPrimary, marginBottom: 8 }}>Progress Approval</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(() => {
                      const steps = []
                      const seen = new Set()
                      approvals.forEach(ap => { if (!seen.has(ap.step_order)) { seen.add(ap.step_order); steps.push(ap.step_order) } })
                      return steps.map((stepOrder) => {
                        const stepRows = approvals.filter(a => a.step_order === stepOrder)
                        const stepName = stepRows[0]?.step_name || `Step ${stepOrder}`
                        const isActive = stepOrder === fpb.current_step && fpb.status === 'pending'
                        const allDone  = stepRows.every(a => a.status === 'approved')
                        return (
                          <div key={stepOrder}>
                            {/* Step header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', marginBottom: 2 }}>
                              <div style={{ width: 18, height: 18, borderRadius: 99, background: allDone ? '#059669' : isActive ? '#6366f1' : theme.subtleBg, border: `2px solid ${allDone ? '#059669' : isActive ? '#6366f1' : theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                {allDone ? '✓' : stepOrder}
                              </div>
                              <span style={{ fontWeight: 600, fontSize: 12, color: theme.textPrimary }}>{stepName}</span>
                              {stepRows[0]?.role?.role_name && <span style={{ fontSize: 10, color: theme.textSecondary }}>({stepRows[0].role.role_name})</span>}
                              {isActive && <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, marginLeft: 'auto' }}>Aktif</span>}
                              {allDone  && <span style={{ fontSize: 10, color: '#059669', fontWeight: 600, marginLeft: 'auto' }}>Selesai</span>}
                            </div>
                            {/* Approver rows */}
                            <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {stepRows.map(ap => {
                                const name = `${ap.users?.user_nama_depan || ''} ${ap.users?.user_nama_belakang || ''}`.trim() || 'User'
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
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>

                {/* Approver action buttons */}
                {myPendingApproval && fpb.status === 'pending' && (
                  <div style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #6366f1', background: 'rgba(99,102,241,0.04)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#6366f1', flex: 1 }}>⚡ Step {fpb.current_step}: {myPendingApproval.step_name}</span>
                    <button onClick={() => { setAction('approved'); setComment(''); setError(''); setShowActionModal(true) }} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FontAwesomeIcon icon={faCheck} />Setujui
                    </button>
                    <button onClick={() => { setAction('revision'); setComment(''); setError(''); setShowActionModal(true) }} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FontAwesomeIcon icon={faRotateLeft} />Revisi
                    </button>
                    <button onClick={() => { setAction('reject'); setComment(''); setError(''); setShowActionModal(true) }} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FontAwesomeIcon icon={faTimes} />Tolak
                    </button>
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
              {action === 'approved' ? '✅ Konfirmasi Persetujuan' : action === 'revision' ? '🔄 Konfirmasi Revisi' : '❌ Konfirmasi Penolakan'}
            </div>
            <div style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 12, background: action === 'approved' ? 'rgba(5,150,105,0.08)' : action === 'revision' ? 'rgba(245,158,11,0.08)' : 'rgba(220,38,38,0.08)', color: action === 'approved' ? '#065f46' : action === 'revision' ? '#92400e' : '#991b1b', border: `1px solid ${action === 'approved' ? 'rgba(5,150,105,0.25)' : action === 'revision' ? 'rgba(245,158,11,0.25)' : 'rgba(220,38,38,0.25)'}` }}>
              {action === 'approved' ? `Setujui FPB ${fpb?.fpb_number} — Step ${fpb?.current_step}`
                : action === 'revision' ? `Minta revisi FPB ${fpb?.fpb_number}. Pengaju akan diminta memperbaiki.`
                : `Tolak FPB ${fpb?.fpb_number}. Tindakan tidak dapat dibatalkan.`}
            </div>
            {action !== 'approved' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>
                  {action === 'revision' ? 'Yang perlu direvisi *' : 'Alasan penolakan *'}
                </label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} autoFocus
                  placeholder={action === 'revision' ? 'Jelaskan apa yang perlu direvisi...' : 'Jelaskan alasan penolakan...'}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            )}
            {error && <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 10px' }}>⚠ {error}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { if (!saving) { setShowActionModal(false); setAction(null); setComment(''); setError('') } }} disabled={saving}
                style={{ padding: '8px 18px', borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={handleAction} disabled={saving}
                style={{ padding: '8px 22px', borderRadius: 7, border: 'none', fontWeight: 700, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#e5e7eb' : action === 'approved' ? '#059669' : action === 'revision' ? '#f59e0b' : '#dc2626', color: saving ? '#9ca3af' : '#fff' }}>
                {saving ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 5 }} />Memproses...</> : action === 'approved' ? 'Setujui' : action === 'revision' ? 'Minta Revisi' : 'Tolak'}
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

  const printStyle = `
    @media print {
      body > * { display: none !important; }
      #fpb-print-root { display: block !important; position: fixed; inset: 0; background: #fff; z-index: 99999; padding: 0; margin: 0; overflow: visible; }
      #fpb-print-root .no-print { display: none !important; }
      #fpb-print-paper { box-shadow: none !important; max-height: none !important; overflow: visible !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
      @page { size: A4 portrait; margin: 14mm; }
    }
  `

  return (
    <>
      <style>{printStyle}</style>
      <div id="fpb-print-root"
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px 0', overflowY: 'auto' }}>

        <div className="no-print" style={{ position: 'fixed', top: 16, right: 24, display: 'flex', gap: 8, zIndex: 2001 }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FontAwesomeIcon icon={faPrint} /> Cetak
          </button>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Tutup
          </button>
        </div>

        <div id="fpb-print-paper" onClick={e => e.stopPropagation()}
          style={{ background: '#fff', width: '210mm', borderRadius: 4, boxShadow: '0 8px 40px rgba(0,0,0,0.35)', position: 'relative', padding: '16mm', marginTop: 60, marginBottom: 24, fontFamily: 'Arial, sans-serif' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}><FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 28 }} /></div>
          ) : !fpb ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#dc2626' }}>FPB tidak ditemukan.</div>
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
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginTop: 3 }}>FPB (Form Permohonan Barang)</div>
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
                    {['No','Item','Qty','Sat','Harga','Subtotal'].map((h, i) => (
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
                      const name = ((ap.users?.user_nama_depan || '') + ' ' + (ap.users?.user_nama_belakang || '')).trim() || '-'
                      return (
                        <td key={ap.approval_id} style={{ border: '1px solid #9ca3af', padding: '8px', textAlign: 'center', minWidth: 100 }}>
                          <div style={{ fontWeight: 600, color: ap.status === 'approved' ? '#111827' : '#9ca3af' }}>{name}</div>
                          <div style={{ fontSize: 11, marginTop: 4, color: ap.status === 'approved' ? '#374151' : '#d1d5db' }}>
                            {ap.status === 'approved' ? fmtDatePrint(ap.action_at) : ap.status === 'rejected' ? '(Ditolak)' : ap.status === 'revision' ? '(Revisi)' : '(Menunggu)'}
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
          <div className="no-print" style={{ position: 'fixed', bottom: 24, right: 24, background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 12, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxWidth: 300, zIndex: 2001 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#b45309', marginBottom: 6 }}>Belum selesai disetujui</div>
            {pendingApprovers.map(ap => (
              <div key={ap.approval_id} style={{ fontSize: 11, color: '#374151', marginBottom: 2 }}>
                - {((ap.users?.user_nama_depan || '') + ' ' + (ap.users?.user_nama_belakang || '')).trim()} ({ap.status === 'revision' ? 'Diminta Revisi' : 'Menunggu Approval'})
              </div>
            ))}
          </div>
        )}
      </div>
    </>
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
    if (!usageDate) { setError('Tanggal kebutuhan wajib diisi'); return }
    if (editItems.length === 0) { setError('Minimal 1 barang harus ada'); return }
    for (const it of editItems) {
      if (!it.item_name.trim()) { setError('Nama barang tidak boleh kosong'); return }
      if (!Number(it.quantity) || Number(it.quantity) <= 0) { setError('Qty harus > 0'); return }
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
              {fpb?.status === 'revision' ? '🔄 FPB perlu direvisi — ubah data lalu submit ulang' : 'Edit data FPB'}
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
              <p style={{ marginTop: 12, color: theme.textSecondary }}>Memuat data...</p>
            </div>
          ) : (
            <>
              {/* Revision comment banner (if revision status) */}
              {fpb?.status === 'revision' && revisions.length > 0 && revisions[0].revision_note === null && revisions.find(r => r.revision_note) && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.4)' }}>
                  <div style={{ fontWeight: 700, color: '#b45309', fontSize: 13, marginBottom: 4 }}>📝 Komentar Approver</div>
                  <p style={{ margin: 0, fontSize: 13, color: '#78350f' }}>{revisions.find(r => r.revision_note)?.revision_note}</p>
                </div>
              )}

              {/* Informasi Umum */}
              <div style={{ padding: '16px 18px', borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.cardBg }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: theme.textPrimary, marginBottom: 14 }}>Informasi Umum</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>Tanggal Kebutuhan *</label>
                    <input type="date" value={usageDate} onChange={e => setUsageDate(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>Catatan (opsional)</label>
                    <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan tambahan..." style={inp} />
                  </div>
                </div>
              </div>

              {/* Daftar Barang — editable */}
              <div style={{ borderRadius: 12, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `1px solid ${theme.border}`, background: theme.cardBg }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: theme.textPrimary }}>Daftar Barang</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>Total: {fmt(grandTotal)}</span>
                    <button onClick={() => setEditItems(prev => [...prev, { _id: crypto.randomUUID(), item_name: '', quantity: '1', unit: 'pcs', unit_price: '', seller_url: '' }])}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      <FontAwesomeIcon icon={faPlus} /> Tambah Barang
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
                        {['Nama Barang *', 'Qty *', 'Satuan', 'Harga Satuan (Rp)', 'Subtotal', 'Link Referensi', ''].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.map((item, i) => (
                        <tr key={item._id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '6px 8px' }}>
                            <input value={item.item_name} onChange={e => setEditItems(prev => prev.map((x, j) => j === i ? { ...x, item_name: e.target.value } : x))}
                              placeholder="Nama barang..."
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
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b', marginBottom: 8 }}>🔄 Catatan Revisi (opsional)</div>
                  <p style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>Jelaskan apa yang Anda ubah pada revisi ini.</p>
                  <textarea value={revNote} onChange={e => setRevNote(e.target.value)} rows={2}
                    placeholder="Apa yang Anda ubah..."
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
              Batal
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#e5e7eb' : fpb?.status === 'revision' ? '#f59e0b' : 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: saving ? '#9ca3af' : '#fff' }}>
              {saving ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />Menyimpan...</> : fpb?.status === 'revision' ? '📤 Simpan & Submit Ulang' : '💾 Simpan Perubahan'}
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
        <div style={{ fontWeight: 800, fontSize: 17, color: theme.textPrimary, textAlign: 'center', marginBottom: 8 }}>Hapus FPB?</div>
        <p style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 18, lineHeight: 1.6 }}>
          Anda akan menghapus <strong style={{ color: theme.textPrimary }}>{fpb.fpb_number}</strong>.<br />
          Tindakan ini <strong style={{ color: '#dc2626' }}>tidak dapat dibatalkan</strong>.
        </p>
        {error && <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>⚠ {error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose} disabled={deleting}
            style={{ padding: '10px 24px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Batal
          </button>
          <button onClick={handleDelete} disabled={deleting}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: deleting ? '#e5e7eb' : '#dc2626', color: deleting ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer' }}>
            {deleting ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />Menghapus...</> : '🗑 Ya, Hapus'}
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
    if (!usageDate) e.usageDate = 'Tanggal kebutuhan wajib diisi'
    if (items.some(i => !i.item_name.trim())) e.items = 'Semua nama barang wajib diisi'
    if (items.some(i => !i.unit_price || Number(i.unit_price) <= 0)) e.items = 'Semua harga satuan wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const uid = parseInt(localStorage.getItem('kr_id'))
      if (!uid) throw new Error('Tidak terautentikasi')
      const now   = new Date()
      const year  = now.getFullYear()
      const month = now.getMonth() + 1
      const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']
      const roman = ROMAN[month - 1]
      const { count } = await supabase.from('fpb')
        .select('*', { count: 'exact', head: true })
        .like('fpb_number', `%/YPMS/FPB/${roman}/${year}`)
      const fpbNumber = `${String((count || 0) + 1).padStart(2, '0')}/YPMS/FPB/${roman}/${year}`

      // Get submitter's role
      const { data: submitter } = await supabase.from('users')
        .select('user_role_id').eq('user_id', uid).single()
      if (!submitter?.user_role_id) throw new Error('Jabatan (role) Anda belum dikonfigurasi. Hubungi administrator.')

      // Get approvers for submitter's role
      const { data: ra } = await supabase.from('fpb_role_approvers')
        .select('*').eq('role_id', submitter.user_role_id).single()
      if (!ra?.approver1_id) throw new Error('Approver untuk jabatan Anda belum dikonfigurasi. Hubungi administrator untuk mengatur di Pengaturan FPB.')

      // Build approval rows — 1 per approver, sequential order
      const approverIds = [ra.approver1_id, ra.approver2_id, ra.approver3_id].filter(Boolean)
      const approvalRows = approverIds.map((approverId, idx) => ({
        fpb_id:           null, // set after fpb insert
        step_order:       1,
        step_name:        'Persetujuan',
        approver_user_id: approverId,
        approver_role_id: submitter.user_role_id,
        approver_order:   idx + 1, // 1 = first, 2 = second, 3 = third
        status:           'pending',
      }))

      const { data: fpb, error: fpbErr } = await supabase.from('fpb').insert({
        fpb_number: fpbNumber, fpb_type_id: selType.fpb_type_id, division, submitted_by: uid,
        grand_total: grandTotal, note, usage_date: usageDate, status: 'pending', current_step: 1,
      }).select().single()
      if (fpbErr) throw fpbErr

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
      setErrors({ submit: e.message || 'Gagal menyimpan FPB' })
    } finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', border: `1px solid ${theme.border}`, background: theme.inputBg || theme.cardBg, color: theme.textPrimary, outline: 'none' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.cardBg, borderRadius: 18, width: '100%', maxWidth: 800, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: theme.textPrimary }}>
              {done ? 'FPB Berhasil Diajukan' : step === 1 ? 'Buat FPB Baru' : `Buat FPB — ${selType?.type_name}`}
            </div>
            {!done && <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 3 }}>{step === 1 ? 'Pilih jenis formulir pembelian' : selType?.description}</div>}
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
                  Pengajuan FPB belum dapat diproses
                </div>
                <p style={{ fontSize: 13, color: '#78350f', margin: '0 0 10px', lineHeight: 1.6 }}>
                  {approverStatus === 'no_role'
                    ? 'Jabatan (role) Anda belum dikonfigurasi di sistem. Hubungi administrator untuk mengatur jabatan akun Anda.'
                    : `Approver untuk jabatan ${userRoleName ? `"${userRoleName}"` : 'Anda'} belum diatur oleh administrator. Pengajuan FPB tidak dapat diproses sampai administrator mengkonfigurasi approver di menu Pengaturan FPB.`
                  }
                </p>
                <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, padding: '6px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.15)', display: 'inline-block' }}>
                  ⚙️ Admin: buka <strong>Pengaturan → Approval FPB</strong> untuk mengkonfigurasi approver
                </div>
              </div>
            </div>
          )}

          {done && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: theme.textPrimary, marginBottom: 8 }}>{done.fpb_number}</div>
              <div style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 28 }}>FPB berhasil diajukan dan menunggu proses approval.</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Tutup</button>
                <a href={`/data/fpb/${done.fpb_id}`} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}>Lihat Detail FPB →</a>
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
                  {t.max_amount && <div style={{ marginTop: 10, padding: '3px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: 11, fontWeight: 700, width: 'fit-content' }}>Maks {fmt(t.max_amount)}</div>}
                </button>
              ))}
            </div>
          )}
          {!done && step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ padding: '16px 18px', borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.cardBg }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary, marginBottom: 14 }}>Informasi Umum</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>Divisi / Unit</label>
                    <div style={{ ...inputStyle, background: theme.subtleBg, color: theme.textSecondary }}>{division || <span style={{ fontStyle: 'italic' }}>Unit tidak ditemukan</span>}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>Tanggal Kebutuhan <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="date" value={usageDate} onChange={e => setUsageDate(e.target.value)} style={inputStyle} min={new Date().toISOString().slice(0, 10)} />
                    {errors.usageDate && <p style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{errors.usageDate}</p>}
                  </div>
                </div>
              </div>
              <div style={{ borderRadius: 12, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `1px solid ${theme.border}`, background: theme.cardBg }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary }}>Daftar Barang</div>
                  <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faPlus} /> Tambah Barang
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
                        {['Nama Barang', 'Qty', 'Satuan', 'Harga Satuan', 'Subtotal', 'Link Referensi', ''].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item._id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '7px 8px' }}>
                            <input value={item.item_name} onChange={e => updateItem(item._id, 'item_name', e.target.value)} placeholder="Nama barang..." style={{ ...inputStyle, padding: '5px 8px', width: '100%' }} />
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
              {exceeds && <div style={{ padding: '11px 15px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>⚠ Grand total melebihi batas maksimum {fmt(selType?.max_amount)} untuk tipe FPB ini.</div>}
              <div style={{ padding: '16px 18px', borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.cardBg }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary, marginBottom: 10 }}>Catatan (Opsional)</div>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Tambahkan catatan atau keterangan tambahan..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              {errors.submit && <div style={{ padding: '11px 15px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>⚠ {errors.submit}</div>}
            </div>
          )}
        </div>
        {!done && step === 2 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: `1px solid ${theme.border}`, flexShrink: 0, background: theme.cardBg }}>
            <button onClick={() => setStep(1)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />Kembali
            </button>
            <button onClick={handleSubmit} disabled={saving || exceeds} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, background: saving || exceeds ? theme.subtleBg : 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: saving || exceeds ? theme.textSecondary : '#fff', cursor: saving || exceeds ? 'not-allowed' : 'pointer', boxShadow: saving || exceeds ? 'none' : '0 2px 12px rgba(99,102,241,0.35)' }}>
              {saving ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />Menyimpan...</> : '📤 Submit FPB'}
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
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewFpbId, setViewFpbId]   = useState(null)
  const [editFpbId, setEditFpbId]   = useState(null)
  const [deleteFpb, setDeleteFpb]   = useState(null)

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) fetchAll(uid)
  }, [])

  const fetchAll = async (uid) => {
    setLoading(true)
    try {
      const { data: mine } = await supabase
        .from('fpb').select('fpb_id, fpb_number, status, grand_total, usage_date, division, revision_count, created_at, fpb_types(type_name, type_code)')
        .eq('submitted_by', uid).order('created_at', { ascending: false })
      setMyFpbs(mine || [])

      // Step 1: Get MY pending approval rows, include approval_id for position detection
      const { data: myApprovals } = await supabase
        .from('fpb_approvals')
        .select('approval_id, fpb_id, step_order, step_name, approver_order, fpb(fpb_id, fpb_number, status, grand_total, usage_date, division, current_step, fpb_types(type_name), submitted_by, users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang))')
        .eq('approver_user_id', uid).eq('status', 'pending')

      // Filter: only FPBs at the correct current step with status pending
      const candidates = (myApprovals || []).filter(
        a => a.fpb?.current_step === a.step_order && a.fpb?.status === 'pending'
      )

      if (!candidates.length) {
        setPending([])
      } else {
        // Step 2: Fetch ALL approvals for those FPBs (need approval_id + status of each row in the step)
        const fpbIds = [...new Set(candidates.map(c => c.fpb_id))]
        const { data: allStepApprovals } = await supabase
          .from('fpb_approvals')
          .select('approval_id, fpb_id, step_order, approver_order, status')
          .in('fpb_id', fpbIds)

        // Step 3: Sequential check
        const pending = candidates
          .filter(a => {
            const allInStep = (allStepApprovals || []).filter(
              ap => ap.fpb_id === a.fpb_id && ap.step_order === a.step_order
            )
            const hasOrder = allInStep.every(ap => ap.approver_order != null)
            let myPos, blockers
            if (hasOrder) {
              myPos = a.approver_order ?? 1
              blockers = allInStep.filter(ap => (ap.approver_order ?? 1) < myPos && ap.status !== 'approved')
            } else {
              const sorted = [...allInStep].sort((x, y) => x.approval_id - y.approval_id)
              myPos = sorted.findIndex(ap => ap.approval_id === a.approval_id)
              if (myPos <= 0) return true
              blockers = sorted.slice(0, myPos).filter(ap => ap.status !== 'approved')
            }
            return blockers.length === 0
          })
          .map(a => ({ ...a.fpb, my_step: a.step_order, my_step_name: a.step_name }))

        const seen = new Set()
        const uniquePending = pending.filter(f => {
          if (seen.has(f.fpb_id)) return false
          seen.add(f.fpb_id)
          return true
        })
        setPending(uniquePending)
      }

      // Tab 3: History — FPBs fully approved where I was an approver
      const { data: myApprovedRows } = await supabase
        .from('fpb_approvals')
        .select('fpb_id, step_name, action_at, fpb(fpb_id, fpb_number, status, grand_total, usage_date, division, revision_count, created_at, fpb_types(type_name), users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang))')
        .eq('approver_user_id', uid)
        .eq('status', 'approved')
      const approvedFpbs = (myApprovedRows || [])
        .filter(r => r.fpb?.status === 'approved')
        .map(r => ({ ...r.fpb, my_step_name: r.step_name, my_action_at: r.action_at }))
      // Deduplicate by fpb_id (keep latest action_at)
      const histMap = new Map()
      approvedFpbs.forEach(f => {
        const existing = histMap.get(f.fpb_id)
        if (!existing || new Date(f.my_action_at) > new Date(existing.my_action_at)) histMap.set(f.fpb_id, f)
      })
      setHistory([...histMap.values()].sort((a, b) => new Date(b.my_action_at) - new Date(a.my_action_at)))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const reloadAll = () => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) fetchAll(uid)
  }

  const tabs = [
    { key: 'mine',    label: 'Pengajuan Saya',         icon: faClipboardList, count: myFpbs.length },
    { key: 'pending', label: 'Menunggu Approval Saya', icon: faClock,         count: pendingFpbs.length },
    { key: 'history', label: 'History Approval',       icon: faCheckDouble,   count: historyFpbs.length },
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
            <span style={{ color: '#6366f1', fontWeight: 600 }}>Step {f.my_step}</span>
            <div style={{ fontSize: 11, color: theme.textSecondary }}>{f.my_step_name}</div>
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
        <td style={{ padding: '12px 14px' }}><StatusBadge status={f.status} /></td>
        {!isPending && !isHistory && (
          <td style={{ padding: '12px 14px', fontSize: 11, color: theme.textSecondary }}>{f.revision_count > 0 ? `Revisi ke-${f.revision_count}` : ''}</td>
        )}
        {isHistory && (
          <td style={{ padding: '12px 14px', fontSize: 11, color: '#059669', fontWeight: 600 }}>
            {f.my_action_at ? fmtDt(f.my_action_at) : '—'}
          </td>
        )}
        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
            {/* Lihat */}
            <button onClick={e => { e.stopPropagation(); setViewFpbId(f.fpb_id) }}
              style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <FontAwesomeIcon icon={faEye} />Lihat
            </button>
            {/* Edit — only in 'mine' tab */}
            {!isPending && !isHistory && (
              <button onClick={e => { e.stopPropagation(); if (canEdit) setEditFpbId(f.fpb_id) }}
                title={!canEdit ? 'Hanya bisa diedit saat berstatus Revisi' : 'Edit FPB ini'}
                style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${canEdit ? '#f59e0b' : theme.border}`, background: canEdit ? 'rgba(245,158,11,0.08)' : theme.subtleBg, color: canEdit ? '#b45309' : theme.textSecondary, fontSize: 12, cursor: canEdit ? 'pointer' : 'not-allowed', opacity: canEdit ? 1 : 0.45, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                <FontAwesomeIcon icon={faPen} />Edit
              </button>
            )}
            {/* Hapus — only in 'mine' tab */}
            {!isPending && !isHistory && (
              <button onClick={e => { e.stopPropagation(); if (canDelete) setDeleteFpb(f) }}
                title={!canDelete ? 'FPB yang sudah diproses approver tidak dapat dihapus' : 'Hapus FPB ini'}
                style={{ padding: '5px 11px', borderRadius: 7, border: `1px solid ${canDelete ? '#dc2626' : theme.border}`, background: canDelete ? 'rgba(220,38,38,0.07)' : theme.subtleBg, color: canDelete ? '#dc2626' : theme.textSecondary, fontSize: 12, cursor: canDelete ? 'pointer' : 'not-allowed', opacity: canDelete ? 1 : 0.45, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                <FontAwesomeIcon icon={faTrash} />Hapus
              </button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  const currentList = tab === 'mine' ? myFpbs : tab === 'pending' ? pendingFpbs : historyFpbs

  return (
    <div style={{ padding: '28px 32px', background: theme.pageBg, minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, margin: 0 }}>📋 Formulir Pembelian Barang</h1>
          <p style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>Kelola pengajuan pembelian barang dan approval workflow</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 12px rgba(99,102,241,0.35)' }}>
          <FontAwesomeIcon icon={faPlus} />Buat FPB Baru
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Pengajuan',   value: myFpbs.length,                                      color: '#6366f1' },
          { label: 'Menunggu Approval', value: myFpbs.filter(f => f.status === 'pending').length,  color: '#d97706' },
          { label: 'Perlu Direvisi',    value: myFpbs.filter(f => f.status === 'revision').length, color: '#f59e0b' },
          { label: 'Disetujui',         value: myFpbs.filter(f => f.status === 'approved').length, color: '#059669' },
          { label: 'Menunggu Saya',     value: pendingFpbs.length,                                 color: '#8b5cf6' },
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
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 24 }} />
              <p style={{ marginTop: 10 }}>Memuat data...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <p style={{ fontWeight: 700, color: theme.textPrimary, fontSize: 15, marginBottom: 6 }}>
                {tab === 'mine' ? 'Belum ada FPB yang diajukan' : tab === 'pending' ? 'Tidak ada FPB yang menunggu approval Anda' : 'Belum ada FPB yang Anda setujui'}
              </p>
              <p style={{ color: theme.textSecondary, fontSize: 13 }}>
                {tab === 'mine' ? 'Klik "Buat FPB Baru" untuk membuat pengajuan pertama Anda' : tab === 'pending' ? 'Semua sudah diproses!' : 'FPB yang telah Anda approve secara penuh akan muncul di sini'}
              </p>
              {tab === 'mine' && (
                <button onClick={() => setShowCreate(true)}
                  style={{ marginTop: 16, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Buat FPB Baru
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: theme.subtleBg, borderBottom: `2px solid ${theme.border}` }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Nomor FPB</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Divisi</th>
                    {tab === 'pending' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Step Saya</th>}
                    {tab === 'pending' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Pengaju</th>}
                    {tab === 'history' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Pengaju</th>}
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Grand Total</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Tgl Kebutuhan</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Status</th>
                    {tab === 'mine' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}></th>}
                    {tab === 'history' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Tgl Disetujui</th>}
                    <th style={{ padding: '10px 14px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map(f => <FpbRow key={f.fpb_id} f={f} isPending={tab === 'pending'} isHistory={tab === 'history'} />)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreate && <CreateFpbModal theme={theme} onClose={() => setShowCreate(false)} onSuccess={reloadAll} />}
      {viewFpbId && <ViewFpbModal fpbId={viewFpbId} theme={theme} onClose={() => setViewFpbId(null)} onActionDone={reloadAll} />}
      {editFpbId && <EditFpbModal fpbId={editFpbId} theme={theme} onClose={() => setEditFpbId(null)} onSuccess={reloadAll} />}
      {deleteFpb && <DeleteConfirmModal fpb={deleteFpb} theme={theme} onClose={() => setDeleteFpb(null)} onSuccess={reloadAll} />}
    </div>
  )
}
