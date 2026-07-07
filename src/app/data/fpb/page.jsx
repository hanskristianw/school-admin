'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardContent } from '@/components/ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus, faClipboardList, faClock, faEye, faSpinner,
  faArrowLeft, faTrash, faTimes, faShoppingCart, faBoxOpen, faTools,
} from '@fortawesome/free-solid-svg-icons'

const STATUS_META = {
  draft:    { label: 'Draft',       color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  pending:  { label: 'Menunggu',    color: '#d97706', bg: 'rgba(217,119,6,0.12)'   },
  revision: { label: 'Revisi',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  approved: { label: 'Disetujui',   color: '#059669', bg: 'rgba(5,150,105,0.12)'   },
  rejected: { label: 'Ditolak',     color: '#dc2626', bg: 'rgba(220,38,38,0.12)'   },
}
const TYPE_ICONS = { small: faShoppingCart, large: faBoxOpen, repair: faTools }
const fmt     = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const emptyItem = () => ({ _id: crypto.randomUUID(), item_name: '', quantity: 1, unit: 'pcs', unit_price: '' })

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.draft
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: m.color, background: m.bg, whiteSpace: 'nowrap' }}>{m.label}</span>
  )
}

function CreateFpbModal({ onClose, onSuccess, theme }) {
  const [step, setStep]       = useState(1)
  const [types, setTypes]     = useState([])
  const [selType, setSelType] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(null)

  const [division, setDivision]   = useState('')
  const [note, setNote]           = useState('')
  const [usageDate, setUsageDate] = useState('')
  const [items, setItems]         = useState([emptyItem()])
  const [errors, setErrors]       = useState({})

  useEffect(() => {
    supabase.from('fpb_types').select('*').eq('is_active', true).order('created_at')
      .then(({ data }) => setTypes(data || []))
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) {
      supabase.from('users').select('user_unit_id').eq('user_id', uid).single()
        .then(async ({ data: u }) => {
          if (u?.user_unit_id) {
            const { data: unit } = await supabase.from('unit').select('unit_name').eq('unit_id', u.user_unit_id).single()
            if (unit) setDivision(unit.unit_name)
          }
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
      const year = new Date().getFullYear()
      const { count } = await supabase.from('fpb').select('*', { count: 'exact', head: true }).like('fpb_number', `FPB/${year}/%`)
      const fpbNumber = `FPB/${year}/${String((count || 0) + 1).padStart(3, '0')}`
      const { data: steps } = await supabase.from('fpb_approval_steps').select('*').eq('fpb_type_id', selType.fpb_type_id).order('step_order')
      if (!steps?.length) throw new Error('Belum ada konfigurasi approval untuk tipe ini. Hubungi administrator.')
      const { data: fpb, error: fpbErr } = await supabase.from('fpb').insert({
        fpb_number: fpbNumber, fpb_type_id: selType.fpb_type_id, division, submitted_by: uid,
        grand_total: grandTotal, note, usage_date: usageDate, status: 'pending', current_step: 1,
      }).select().single()
      if (fpbErr) throw fpbErr
      const { error: itemErr } = await supabase.from('fpb_items').insert(
        items.map(i => ({ fpb_id: fpb.fpb_id, item_name: i.item_name.trim(), quantity: Number(i.quantity), unit: i.unit, unit_price: Number(i.unit_price) }))
      )
      if (itemErr) throw itemErr
      const { error: apErr } = await supabase.from('fpb_approvals').insert(
        steps.map(s => ({ fpb_id: fpb.fpb_id, step_order: s.step_order, step_name: s.step_name, approver_user_id: s.approver_user_id, status: 'pending' }))
      )
      if (apErr) throw apErr
      setDone({ fpb_id: fpb.fpb_id, fpb_number: fpbNumber })
      onSuccess()
    } catch (e) {
      setErrors({ submit: e.message || 'Gagal menyimpan FPB' })
    } finally { setSaving(false) }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    border: `1px solid ${theme.border}`, background: theme.inputBg || theme.cardBg,
    color: theme.textPrimary, outline: 'none',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.cardBg, borderRadius: 18, width: '100%', maxWidth: 800, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>

        {/* Header */}
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

        {/* Body */}
        <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>

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
                  {t.max_amount && (
                    <div style={{ marginTop: 10, padding: '3px 9px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: 11, fontWeight: 700, width: 'fit-content' }}>Maks {fmt(t.max_amount)}</div>
                  )}
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: theme.subtleBg }}>
                        {['Nama Barang', 'Qty', 'Satuan', 'Harga Satuan', 'Subtotal', ''].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item._id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '7px 10px', minWidth: 180 }}>
                            <input value={item.item_name} onChange={e => updateItem(item._id, 'item_name', e.target.value)} placeholder="Nama barang..." style={{ ...inputStyle, padding: '5px 9px' }} />
                          </td>
                          <td style={{ padding: '7px 10px', width: 70 }}>
                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item._id, 'quantity', e.target.value)} style={{ ...inputStyle, padding: '5px 9px', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '7px 10px', width: 110 }}>
                            <select value={item.unit} onChange={e => updateItem(item._id, 'unit', e.target.value)} style={{ ...inputStyle, padding: '5px 9px' }}>
                              {['pcs','kg','liter','box','rim','lusin','unit','set','lump sum'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '7px 10px', width: 130 }}>
                            <input type="number" min="0" value={item.unit_price} onChange={e => updateItem(item._id, 'unit_price', e.target.value)} placeholder="0" style={{ ...inputStyle, padding: '5px 9px', textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: theme.textPrimary, whiteSpace: 'nowrap' }}>
                            {fmt((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                          </td>
                          <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                            {items.length > 1 && (
                              <button onClick={() => removeItem(item._id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}>
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
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: exceeds ? '#dc2626' : '#059669' }}>{fmt(grandTotal)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {errors.items && <p style={{ padding: '6px 14px', color: '#dc2626', fontSize: 12 }}>{errors.items}</p>}
              </div>

              {exceeds && (
                <div style={{ padding: '11px 15px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                  ⚠ Grand total melebihi batas maksimum {fmt(selType?.max_amount)} untuk tipe FPB ini.
                </div>
              )}

              <div style={{ padding: '16px 18px', borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.cardBg }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary, marginBottom: 10 }}>Catatan (Opsional)</div>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Tambahkan catatan atau keterangan tambahan..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {errors.submit && (
                <div style={{ padding: '11px 15px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>⚠ {errors.submit}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
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

export default function FpbListPage() {
  const { theme } = useTheme()
  const router    = useRouter()
  const [tab, setTab]             = useState('mine')
  const [myFpbs, setMyFpbs]       = useState([])
  const [pendingFpbs, setPending] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) fetchAll(uid)
  }, [])

  const fetchAll = async (uid) => {
    setLoading(true)
    try {
      const { data: mine } = await supabase
        .from('fpb').select(`fpb_id, fpb_number, status, grand_total, usage_date, division, revision_count, created_at, fpb_types(type_name, type_code)`)
        .eq('submitted_by', uid).order('created_at', { ascending: false })
      setMyFpbs(mine || [])

      const { data: approvals } = await supabase
        .from('fpb_approvals').select(`fpb_id, step_order, step_name, fpb(fpb_id, fpb_number, status, grand_total, usage_date, division, current_step, fpb_types(type_name), submitted_by, users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang))`)
        .eq('approver_user_id', uid).eq('status', 'pending')
      const pending = (approvals || [])
        .filter(a => a.fpb?.current_step === a.step_order && a.fpb?.status === 'pending')
        .map(a => ({ ...a.fpb, my_step: a.step_order, my_step_name: a.step_name }))
      setPending(pending)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const reloadAfterCreate = () => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) fetchAll(uid)
  }

  const tabs = [
    { key: 'mine',    label: 'Pengajuan Saya',         icon: faClipboardList, count: myFpbs.length },
    { key: 'pending', label: 'Menunggu Approval Saya', icon: faClock,         count: pendingFpbs.length },
  ]

  const FpbRow = ({ f, isPending }) => (
    <tr style={{ borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'background 0.12s' }}
      onClick={() => router.push(`/data/fpb/${f.fpb_id}`)}
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
      <td style={{ padding: '12px 14px', fontSize: 13, color: theme.textPrimary, fontWeight: 600 }}>{fmt(f.grand_total)}</td>
      <td style={{ padding: '12px 14px', fontSize: 12, color: theme.textSecondary }}>{fmtDate(f.usage_date)}</td>
      <td style={{ padding: '12px 14px' }}><StatusBadge status={f.status} /></td>
      {!isPending && (
        <td style={{ padding: '12px 14px', fontSize: 11, color: theme.textSecondary }}>{f.revision_count > 0 ? `Revisi ke-${f.revision_count}` : ''}</td>
      )}
      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
        <button onClick={e => { e.stopPropagation(); router.push(`/data/fpb/${f.fpb_id}`) }}
          style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textSecondary, fontSize: 12, cursor: 'pointer' }}>
          <FontAwesomeIcon icon={faEye} style={{ marginRight: 5 }} />Lihat
        </button>
      </td>
    </tr>
  )

  const currentList = tab === 'mine' ? myFpbs : pendingFpbs

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
          { label: 'Total Pengajuan',   value: myFpbs.length,                                       color: '#6366f1' },
          { label: 'Menunggu Approval', value: myFpbs.filter(f => f.status === 'pending').length,   color: '#d97706' },
          { label: 'Perlu Direvisi',    value: myFpbs.filter(f => f.status === 'revision').length,  color: '#f59e0b' },
          { label: 'Disetujui',         value: myFpbs.filter(f => f.status === 'approved').length,  color: '#059669' },
          { label: 'Menunggu Saya',     value: pendingFpbs.length,                                  color: '#8b5cf6' },
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
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', background: tab === t.key ? theme.cardBg : 'transparent', color: tab === t.key ? theme.textPrimary : theme.textSecondary, boxShadow: tab === t.key ? `0 1px 4px rgba(0,0,0,0.08)` : 'none' }}>
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
                {tab === 'mine' ? 'Belum ada FPB yang diajukan' : 'Tidak ada FPB yang menunggu approval Anda'}
              </p>
              <p style={{ color: theme.textSecondary, fontSize: 13 }}>
                {tab === 'mine' ? 'Klik "Buat FPB Baru" untuk membuat pengajuan pertama Anda' : 'Semua sudah diproses!'}
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
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Grand Total</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Tgl Kebutuhan</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Status</th>
                    {tab === 'mine' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}></th>}
                    <th style={{ padding: '10px 14px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map(f => <FpbRow key={f.fpb_id} f={f} isPending={tab === 'pending'} />)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <CreateFpbModal theme={theme} onClose={() => setShowCreate(false)} onSuccess={reloadAfterCreate} />
      )}
    </div>
  )
}
