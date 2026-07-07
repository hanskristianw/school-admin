'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faCheck, faRotateLeft, faTimes, faSpinner, faPen } from '@fortawesome/free-solid-svg-icons'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
const fmtDt = (d) => d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

const STATUS_META = {
  draft:    { label: 'Draft',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  pending:  { label: 'Menunggu', color: '#d97706', bg: 'rgba(217,119,6,0.12)'   },
  revision: { label: 'Revisi',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  approved: { label: 'Disetujui',color: '#059669', bg: 'rgba(5,150,105,0.12)'   },
  rejected: { label: 'Ditolak',  color: '#dc2626', bg: 'rgba(220,38,38,0.12)'   },
}

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.draft
  return <span style={{ padding:'3px 12px', borderRadius:99, fontSize:12, fontWeight:700, color:m.color, background:m.bg }}>{m.label}</span>
}

export default function FpbDetailPage() {
  const { theme } = useTheme()
  const router    = useRouter()
  const { id }    = useParams()

  const [fpb, setFpb]           = useState(null)
  const [items, setItems]       = useState([])
  const [approvals, setApprovals] = useState([])
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [userId, setUserId]     = useState(null)
  // action modal: 'approved' | 'revision' | 'reject' | null
  const [action, setAction]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [comment, setComment]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) { setUserId(uid); fetchData(uid) }
  }, [id])

  const fetchData = async (uid) => {
    setLoading(true)
    try {
      const { data: f } = await supabase.from('fpb')
        .select(`*, fpb_types(type_name, type_code, max_amount),
                 users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang)`)
        .eq('fpb_id', id).single()
      setFpb(f)

      const { data: it } = await supabase.from('fpb_items').select('*').eq('fpb_id', id).order('created_at')
      setItems(it || [])

      const { data: ap } = await supabase.from('fpb_approvals')
        .select(`*, users!fpb_approvals_approver_user_id_fkey(user_nama_depan, user_nama_belakang), role!fpb_approvals_approver_role_id_fkey(role_name)`)
        .eq('fpb_id', id).order('step_order').order('approval_id')
      setApprovals(ap || [])

      // Fetch revision history (submitter notes)
      const { data: rv } = await supabase.from('fpb_revisions')
        .select(`*, users!fpb_revisions_revised_by_fkey(user_nama_depan, user_nama_belakang)`)
        .eq('fpb_id', id).order('revision_number', { ascending: false })
      setRevisions(rv || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // AND logic: find MY pending approval in current step
  const myPendingApproval = approvals.find(
    a => a.approver_user_id === userId && a.status === 'pending' && a.step_order === fpb?.current_step
  )
  const currentStepApprovals = approvals.filter(a => a.step_order === fpb?.current_step)
  const isSubmitter = fpb?.submitted_by === userId
  const canRevise   = isSubmitter && fpb?.status === 'revision'

  const handleAction = async () => {
    if (!myPendingApproval) return
    if ((action === 'revision' || action === 'reject') && !comment.trim()) {
      setError('Komentar wajib diisi untuk revisi / penolakan'); return
    }
    setSaving(true); setError('')
    try {
      await supabase.from('fpb_approvals').update({
        status: action,
        comment: comment.trim() || null,
        action_at: new Date().toISOString()
      }).eq('approval_id', myPendingApproval.approval_id)

      if (action === 'approved') {
        // AND logic: re-fetch current step rows to check all approved
        const { data: freshStep } = await supabase.from('fpb_approvals')
          .select('status').eq('fpb_id', id).eq('step_order', fpb.current_step)
        const allDone = freshStep?.every(a => a.status === 'approved')
        if (allDone) {
          const nextStepRow = approvals.find(a => a.step_order === fpb.current_step + 1)
          if (nextStepRow) {
            await supabase.from('fpb').update({ current_step: fpb.current_step + 1 }).eq('fpb_id', id)
          } else {
            await supabase.from('fpb').update({ status: 'approved' }).eq('fpb_id', id)
          }
        }
        // else: wait for other approvers in same step
      } else if (action === 'revision') {
        await supabase.from('fpb_approvals').update({ status: 'pending', comment: null, action_at: null }).eq('fpb_id', id)
        await supabase.from('fpb').update({ status: 'revision', current_step: 1 }).eq('fpb_id', id)
      } else if (action === 'reject') {
        await supabase.from('fpb').update({ status: 'rejected' }).eq('fpb_id', id)
      }

      setShowModal(false); setAction(null); setComment(''); fetchData(userId)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleResubmit = async () => {
    setSaving(true)
    try {
      // Save snapshot to revisions
      const { data: rev } = await supabase.from('fpb_revisions').select('revision_number')
        .eq('fpb_id', id).order('revision_number', { ascending: false }).limit(1)
      const revNum = (rev?.[0]?.revision_number || 0) + 1
      await supabase.from('fpb_revisions').insert({
        fpb_id: id, revision_number: revNum, revised_by: userId,
        snapshot: { fpb, items }, revision_note: comment || null
      })
      // Reset all approvals, set status pending step 1
      await supabase.from('fpb_approvals').update({ status: 'pending', comment: null, action_at: null }).eq('fpb_id', id)
      await supabase.from('fpb').update({ status: 'pending', current_step: 1, revision_count: (fpb.revision_count || 0) + 1 }).eq('fpb_id', id)
      setComment(''); fetchData(userId)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
      <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 28 }} />
      <p style={{ marginTop: 12 }}>Memuat data...</p>
    </div>
  )
  if (!fpb) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>FPB tidak ditemukan.</div>

  const submitterName = `${fpb.users?.user_nama_depan || ''} ${fpb.users?.user_nama_belakang || ''}`.trim()

  return (
    <div style={{ padding: '28px 32px', background: theme.pageBg, minHeight: '100vh', maxWidth: 960, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <button onClick={() => router.push('/data/fpb')}
        style={{ display:'flex', alignItems:'center', gap:6, marginBottom:20, background:'none',
          border:'none', color:theme.textSecondary, cursor:'pointer', fontSize:13 }}>
        <FontAwesomeIcon icon={faArrowLeft} />Kembali ke Daftar FPB
      </button>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:theme.textPrimary, margin:0 }}>{fpb.fpb_number || 'FPB'}</h1>
          <p style={{ fontSize:13, color:theme.textSecondary, marginTop:4 }}>{fpb.fpb_types?.type_name}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {fpb.revision_count > 0 && (
            <span style={{ fontSize:12, color:'#f59e0b', fontWeight:600 }}>Revisi ke-{fpb.revision_count}</span>
          )}
          <StatusBadge status={fpb.status} />
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {/* Info Grid */}
        <Card style={{ background:theme.cardBg, borderColor:theme.border }}>
          <CardHeader className="pb-3"><CardTitle style={{ color:theme.textPrimary, fontSize:15 }}>Informasi FPB</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
              {[
                ['Pengaju', submitterName],
                ['Divisi', fpb.division || '—'],
                ['Tanggal Kebutuhan', fmtDate(fpb.usage_date)],
                ['Tanggal Dibuat', fmtDate(fpb.created_at)],
                ['Grand Total', fmt(fpb.grand_total)],
                ['Catatan', fpb.note || '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize:11, color:theme.textSecondary, fontWeight:600, marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:14, color:theme.textPrimary, fontWeight: label === 'Grand Total' ? 800 : 500,
                    color: label === 'Grand Total' ? '#6366f1' : theme.textPrimary }}>{val}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card style={{ background:theme.cardBg, borderColor:theme.border }}>
          <CardHeader className="pb-3"><CardTitle style={{ color:theme.textPrimary, fontSize:15 }}>Daftar Barang</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:theme.subtleBg, borderBottom:`1px solid ${theme.border}` }}>
                  {['Nama Barang','Qty','Satuan','Harga Satuan','Subtotal'].map(h => (
                    <th key={h} style={{ padding:'9px 14px', textAlign: h==='Nama Barang'?'left':'center', color:theme.textSecondary, fontWeight:600, fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.item_id} style={{ borderBottom:`1px solid ${theme.border}`, background: i%2===0?'transparent':theme.subtleBg+'44' }}>
                    <td style={{ padding:'10px 14px', color:theme.textPrimary, fontWeight:500 }}>{it.item_name}</td>
                    <td style={{ padding:'10px 14px', textAlign:'center', color:theme.textPrimary }}>{it.quantity}</td>
                    <td style={{ padding:'10px 14px', textAlign:'center', color:theme.textSecondary }}>{it.unit}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', color:theme.textPrimary }}>{fmt(it.unit_price)}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:theme.textPrimary }}>{fmt(it.quantity * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`2px solid ${theme.border}`, background:theme.subtleBg }}>
                  <td colSpan={4} style={{ padding:'12px 14px', textAlign:'right', fontWeight:700, color:theme.textPrimary }}>Grand Total</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontWeight:800, fontSize:16, color:'#6366f1' }}>{fmt(fpb.grand_total)}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Revision Note from Submitter */}
        {revisions.length > 0 && revisions[0].revision_note && (
          <div style={{
            padding: '14px 18px',
            borderRadius: 12,
            background: 'rgba(245,158,11,0.08)',
            border: '1.5px solid rgba(245,158,11,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>📝</span>
              <span style={{ fontWeight: 700, color: '#b45309', fontSize: 13 }}>
                Catatan Revisi ke-{revisions[0].revision_number}
              </span>
              <span style={{ fontSize: 11, color: '#92400e', marginLeft: 'auto' }}>
                {`${revisions[0].users?.user_nama_depan || ''} ${revisions[0].users?.user_nama_belakang || ''}`.trim()}
                {revisions[0].revised_at && (
                  <> · {new Date(revisions[0].revised_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
                )}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {revisions[0].revision_note}
            </p>
          </div>
        )}

        {/* Approval Timeline — grouped by step, per-approver sub-rows */}
        <Card style={{ background:theme.cardBg, borderColor:theme.border }}>
          <CardHeader className="pb-3"><CardTitle style={{ color:theme.textPrimary, fontSize:15 }}>Progress Approval</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {(() => {
                const stepOrders = [...new Set(approvals.map(a => a.step_order))].sort((a,b)=>a-b)
                return stepOrders.map((stepOrder, stepIdx) => {
                  const stepRows    = approvals.filter(a => a.step_order === stepOrder)
                  const stepName    = stepRows[0]?.step_name || `Step ${stepOrder}`
                  const isActive    = stepOrder === fpb.current_step && fpb.status === 'pending'
                  const allDone     = stepRows.every(a => a.status === 'approved')
                  const anyRevision = stepRows.some(a => a.status === 'revision')
                  const anyRejected = stepRows.some(a => a.status === 'rejected')
                  const dotColor    = allDone ? '#059669' : anyRevision ? '#f59e0b' : anyRejected ? '#dc2626' : isActive ? '#6366f1' : theme.border
                  const dotBg       = allDone ? '#059669' : anyRevision ? '#f59e0b' : anyRejected ? '#dc2626' : isActive ? '#6366f1' : theme.subtleBg
                  return (
                    <div key={stepOrder} style={{ display:'flex', gap:16, paddingBottom: stepIdx < stepOrders.length-1 ? 24 : 0 }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                        <div style={{ width:32, height:32, borderRadius:99, background:dotBg, border:`2px solid ${dotColor}`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700 }}>
                          {allDone ? <FontAwesomeIcon icon={faCheck} /> : anyRejected ? <FontAwesomeIcon icon={faTimes} /> : anyRevision ? <FontAwesomeIcon icon={faRotateLeft} /> : stepOrder}
                        </div>
                        {stepIdx < stepOrders.length-1 && <div style={{ width:2, flex:1, background:allDone?'#059669':theme.border, marginTop:4, minHeight:20 }} />}
                      </div>
                      <div style={{ flex:1, paddingBottom:4 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                          <span style={{ fontWeight:700, color:theme.textPrimary, fontSize:14 }}>{stepName}</span>
                          {stepRows[0]?.role?.role_name && <span style={{ fontSize:11, padding:'1px 7px', borderRadius:99, background:theme.subtleBg, border:`1px solid ${theme.border}`, color:theme.textSecondary }}>{stepRows[0].role.role_name}</span>}
                          {isActive    && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'rgba(99,102,241,0.15)', color:'#6366f1', fontWeight:700 }}>Menunggu</span>}
                          {allDone     && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'rgba(5,150,105,0.12)', color:'#059669', fontWeight:700 }}>Disetujui</span>}
                          {anyRevision && !allDone && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'rgba(245,158,11,0.12)', color:'#f59e0b', fontWeight:700 }}>Minta Revisi</span>}
                          {anyRejected && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'rgba(220,38,38,0.12)', color:'#dc2626', fontWeight:700 }}>Ditolak</span>}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {stepRows.map(ap => {
                            const approverName = `${ap.users?.user_nama_depan||''} ${ap.users?.user_nama_belakang||''}`.trim()
                            const isPending  = ap.status === 'pending'
                            const isDone     = ap.status === 'approved'
                            const isRev      = ap.status === 'revision'
                            const isRej      = ap.status === 'rejected'
                            return (
                              <div key={ap.approval_id} style={{ padding:'8px 12px', borderRadius:8, background:theme.subtleBg+'55', border:`1px solid ${theme.border}`, fontSize:13 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                                  <strong style={{ color:theme.textPrimary }}>{approverName || 'User'}</strong>
                                  {isPending && <span style={{ fontSize:11, padding:'1px 7px', borderRadius:99, background:'rgba(99,102,241,0.1)', color:'#6366f1', fontWeight:700 }}>Menunggu</span>}
                                  {isDone    && <span style={{ fontSize:11, padding:'1px 7px', borderRadius:99, background:'rgba(5,150,105,0.12)', color:'#059669', fontWeight:700 }}>✓ Disetujui</span>}
                                  {isRev     && <span style={{ fontSize:11, padding:'1px 7px', borderRadius:99, background:'rgba(245,158,11,0.12)', color:'#f59e0b', fontWeight:700 }}>↩ Revisi</span>}
                                  {isRej     && <span style={{ fontSize:11, padding:'1px 7px', borderRadius:99, background:'rgba(220,38,38,0.12)', color:'#dc2626', fontWeight:700 }}>✕ Ditolak</span>}
                                  {ap.action_at && <span style={{ fontSize:11, color:theme.textSecondary, marginLeft:'auto' }}>{fmtDt(ap.action_at)}</span>}
                                </div>
                                {ap.comment && (
                                  <div style={{ marginTop:6, padding:'6px 10px', borderRadius:7, background:isRev?'rgba(245,158,11,0.08)':isRej?'rgba(220,38,38,0.08)':'rgba(5,150,105,0.08)', fontSize:12, color:theme.textPrimary, borderLeft:`3px solid ${isRev?'#f59e0b':isRej?'#dc2626':'#059669'}` }}>
                                    {ap.comment}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Action Panel — Approver: 3 buttons, open modal on click */}
        {myPendingApproval && fpb.status === 'pending' && (
          <Card style={{ background:theme.cardBg, borderColor:'#6366f1', boxShadow:'0 0 0 1px #6366f1' }}>
            <CardHeader className="pb-3">
              <CardTitle style={{ color:'#6366f1', fontSize:15 }}>⚡ Tindakan Anda — Step {fpb.current_step}: {myPendingApproval.step_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button onClick={() => { setAction('approved'); setComment(''); setError(''); setShowModal(true) }}
                  style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'#059669', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  <FontAwesomeIcon icon={faCheck} style={{ marginRight:6 }} />Setujui
                </button>
                <button onClick={() => { setAction('revision'); setComment(''); setError(''); setShowModal(true) }}
                  style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'#f59e0b', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  <FontAwesomeIcon icon={faRotateLeft} style={{ marginRight:6 }} />Minta Revisi
                </button>
                <button onClick={() => { setAction('reject'); setComment(''); setError(''); setShowModal(true) }}
                  style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  <FontAwesomeIcon icon={faTimes} style={{ marginRight:6 }} />Tolak
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Panel — Submitter revision */}
        {canRevise && (
          <Card style={{ background:theme.cardBg, borderColor:'#f59e0b', boxShadow:'0 0 0 1px #f59e0b' }}>
            <CardHeader className="pb-3">
              <CardTitle style={{ color:'#f59e0b', fontSize:15 }}>🔄 FPB Perlu Direvisi</CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize:13, color:theme.textSecondary, marginBottom:16 }}>
                Periksa komentar approver di atas, lakukan perubahan yang diperlukan, lalu submit ulang.
              </p>
              <p style={{ fontSize:12, color:theme.textSecondary, marginBottom:6, fontWeight:600 }}>Catatan Revisi (opsional)</p>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                placeholder="Apa yang Anda ubah pada revisi ini..."
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, fontSize:13, border:`1px solid ${theme.border}`,
                  background:theme.cardBg, color:theme.textPrimary, resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', marginBottom:14 }} />
              {error && <p style={{ color:'#dc2626', fontSize:12, marginBottom:10 }}>⚠ {error}</p>}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => router.push(`/data/fpb/${id}/edit`)}
                  style={{ padding:'9px 18px', borderRadius:8, border:`1px solid #f59e0b`, background:'transparent', color:'#f59e0b', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  <FontAwesomeIcon icon={faPen} style={{ marginRight:6 }} />Edit FPB
                </button>
                <button onClick={handleResubmit} disabled={saving}
                  style={{ padding:'9px 18px', borderRadius:8, border:'none', background:'#6366f1', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : '📤 Submit Ulang'}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Confirmation Modal ─────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => { if (!saving) { setShowModal(false); setAction(null); setComment(''); setError('') } }}
        title={
          action === 'approved' ? '✅ Konfirmasi Persetujuan' :
          action === 'revision' ? '🔄 Konfirmasi Permintaan Revisi' :
          '❌ Konfirmasi Penolakan'
        }
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary */}
          <div style={{
            padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: action === 'approved' ? 'rgba(5,150,105,0.08)' : action === 'revision' ? 'rgba(245,158,11,0.08)' : 'rgba(220,38,38,0.08)',
            color: action === 'approved' ? '#065f46' : action === 'revision' ? '#92400e' : '#991b1b',
            border: `1px solid ${action === 'approved' ? 'rgba(5,150,105,0.25)' : action === 'revision' ? 'rgba(245,158,11,0.25)' : 'rgba(220,38,38,0.25)'}`,
          }}>
            {action === 'approved'
              ? `Anda akan menyetujui FPB ${fpb?.fpb_number} — Step ${fpb?.current_step}: ${myPendingApproval?.step_name}`
              : action === 'revision'
              ? `Anda akan meminta revisi pada FPB ${fpb?.fpb_number}. Pengaju akan diminta memperbaiki FPB ini.`
              : `Anda akan menolak FPB ${fpb?.fpb_number}. Tindakan ini tidak dapat dibatalkan.`
            }
          </div>

          {/* Comment — required for revision & reject */}
          {action !== 'approved' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 6 }}>
                {action === 'revision' ? 'Apa yang perlu direvisi? *' : 'Alasan penolakan *'}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                autoFocus
                placeholder={action === 'revision' ? 'Jelaskan apa yang perlu direvisi oleh pengaju...' : 'Jelaskan alasan penolakan FPB ini...'}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  border: `1px solid ${theme.border}`, background: theme.cardBg,
                  color: theme.textPrimary, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {error && <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>⚠ {error}</p>}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { if (!saving) { setShowModal(false); setAction(null); setComment(''); setError('') } }}
              disabled={saving}
              style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${theme.border}`,
                background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              Batal
            </button>
            <button
              onClick={handleAction}
              disabled={saving}
              style={{
                padding: '9px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? '#e5e7eb' : action === 'approved' ? '#059669' : action === 'revision' ? '#f59e0b' : '#dc2626',
                color: saving ? '#9ca3af' : '#fff',
              }}
            >
              {saving ? <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} /> : null}
              {saving ? 'Memproses...' : action === 'approved' ? '✅ Setujui' : action === 'revision' ? '🔄 Minta Revisi' : '❌ Tolak'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
