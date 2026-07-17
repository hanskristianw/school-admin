'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPlus, faTrash, faSpinner, faShoppingCart, faTools, faBoxOpen } from '@fortawesome/free-solid-svg-icons'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)

const TYPE_ICONS = { small: faShoppingCart, large: faBoxOpen, repair: faTools }

const emptyItem = () => ({ _id: crypto.randomUUID(), item_name: '', quantity: 1, unit: 'pcs', unit_price: '' })

export default function CreateFpbPage() {
  const { theme } = useTheme()
  const router    = useRouter()

  const [step, setStep]       = useState(1) // 1 = choose type, 2 = fill form
  const [types, setTypes]     = useState([])
  const [selType, setSelType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [userUnit, setUserUnit] = useState(null) // { unit_id, unit_name }

  // Form state
  const [division, setDivision]   = useState('')
  const [note, setNote]           = useState('')
  const [usageDate, setUsageDate] = useState('')
  const [items, setItems]         = useState([emptyItem()])
  const [errors, setErrors]       = useState({})

  useEffect(() => {
    // Load FPB types
    supabase.from('fpb_types').select('*').eq('is_active', true).order('created_at')
      .then(({ data }) => setTypes(data || []))

    // Auto-load current user's unit (2-step to avoid FK name dependency)
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) {
      supabase
        .from('users')
        .select('user_unit_id')
        .eq('user_id', uid)
        .single()
        .then(async ({ data: userData }) => {
          if (userData?.user_unit_id) {
            const { data: unitData } = await supabase
              .from('unit')
              .select('unit_id, unit_name')
              .eq('unit_id', userData.user_unit_id)
              .single()
            if (unitData) {
              setUserUnit(unitData)
              setDivision(unitData.unit_name)
            }
          }
        })
    }
  }, [])

  const grandTotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
  const exceeds    = selType?.max_amount && grandTotal > selType.max_amount

  // ── Item helpers ──────────────────────────────────────────────────
  const updateItem = (id, field, val) =>
    setItems(prev => prev.map(i => i._id === id ? { ...i, [field]: val } : i))
  const addItem    = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (id) => setItems(prev => prev.filter(i => i._id !== id))

  // ── Validation ────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!usageDate) e.usageDate = 'Tanggal kebutuhan wajib diisi'
    if (items.some(i => !i.item_name.trim())) e.items = 'Semua nama barang wajib diisi'
    if (items.some(i => !i.unit_price || Number(i.unit_price) <= 0)) e.items = 'Semua harga satuan wajib diisi'
    if (exceeds) e.total = `Grand total melebihi batas Rp ${selType.max_amount.toLocaleString('id-ID')}`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const uid = parseInt(localStorage.getItem('kr_id'))
      if (!uid) throw new Error('Tidak terautentikasi')

      // Generate FPB number
      const year = new Date().getFullYear()
      const { count } = await supabase.from('fpb').select('*', { count: 'exact', head: true })
        .like('fpb_number', `FPB/${year}/%`)
      const fpbNumber = `FPB/${year}/${String((count || 0) + 1).padStart(3, '0')}`

      // Get approval steps for this type
      const { data: steps } = await supabase
        .from('fpb_approval_steps')
        .select('*')
        .eq('fpb_type_id', selType.fpb_type_id)
        .order('step_order')

      if (!steps?.length) throw new Error('Belum ada konfigurasi approval untuk tipe FPB ini. Hubungi administrator.')

      // Insert FPB header
      const { data: fpb, error: fpbErr } = await supabase.from('fpb').insert({
        fpb_number:   fpbNumber,
        fpb_type_id:  selType.fpb_type_id,
        division,
        submitted_by: uid,
        grand_total:  grandTotal,
        note,
        usage_date:   usageDate,
        status:       'pending',
        current_step: 1,
      }).select().single()
      if (fpbErr) throw fpbErr

      // Insert items
      const itemRows = items.map(i => ({
        fpb_id:     fpb.fpb_id,
        item_name:  i.item_name.trim(),
        quantity:   Number(i.quantity),
        unit:       i.unit,
        unit_price: Number(i.unit_price),
      }))
      const { error: itemErr } = await supabase.from('fpb_items').insert(itemRows)
      if (itemErr) throw itemErr

      // Create approval records (all steps, all pending)
      const approvalRows = steps.map(s => ({
        fpb_id:           fpb.fpb_id,
        step_order:       s.step_order,
        step_name:        s.step_name,
        approver_user_id: s.approver_user_id,
        status:           'pending',
      }))
      const { error: apErr } = await supabase.from('fpb_approvals').insert(approvalRows)
      if (apErr) throw apErr

      // ── Notify first approver / screener — fire-and-forget ─────────
      ;(async () => {
        try {
          const { data: submitterData } = await supabase
            .from('users').select('user_nama_depan, user_nama_belakang')
            .eq('user_id', uid).single()
          const submitterName = submitterData
            ? `${submitterData.user_nama_depan || ''} ${submitterData.user_nama_belakang || ''}`.trim()
            : 'Karyawan'

          // Find step with the lowest step_order (screener or first approver)
          const firstStep = steps.reduce((min, s) => s.step_order < min.step_order ? s : min, steps[0])
          if (!firstStep?.approver_user_id) return

          const { data: approverUser } = await supabase
            .from('users').select('user_email, user_nama_depan, user_nama_belakang')
            .eq('user_id', firstStep.approver_user_id).single()
          if (!approverUser?.user_email) return

          const approverName = `${approverUser.user_nama_depan || ''} ${approverUser.user_nama_belakang || ''}`.trim()
          await fetch('/api/email/fpb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'fpbPendingApproval',
              to: approverUser.user_email,
              approverName,
              fpbNumber,
              fpbType: selType.type_name,
              submitterName,
              division,
              grandTotal,
              usageDate,
              stepName: firstStep.step_name || 'Screening',
            }),
          })
        } catch (emailErr) {
          console.warn('[FPB Create] Gagal kirim email notifikasi:', emailErr)
        }
      })()

      router.push(`/data/fpb/${fpb.fpb_id}`)
    } catch (e) {
      console.error(e)
      setErrors({ submit: e.message || 'Gagal menyimpan FPB' })
    } finally {
      setSaving(false)
    }
  }

  // ── STEP 1: Choose type ───────────────────────────────────────────
  if (step === 1) return (
    <div style={{ padding: '28px 32px', background: theme.pageBg, minHeight: '100vh' }}>
      <button onClick={() => router.push('/data/fpb')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, background: 'none',
          border: 'none', color: theme.textSecondary, cursor: 'pointer', fontSize: 13 }}>
        <FontAwesomeIcon icon={faArrowLeft} />Kembali ke Daftar FPB
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, marginBottom: 6 }}>Buat FPB Baru</h1>
      <p style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 32 }}>Pilih jenis formulir pembelian yang sesuai dengan kebutuhan Anda</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
        {types.filter(t => t.type_code !== 'large' && t.type_code !== 'repair').map(t => (
          <button key={t.fpb_type_id} onClick={() => { setSelType(t); setStep(2) }}
            style={{ textAlign: 'left', padding: 24, borderRadius: 14, border: `2px solid ${theme.border}`,
              background: theme.cardBg, cursor: 'pointer', transition: 'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ fontSize: 28, marginBottom: 12, color: '#6366f1' }}>
              <FontAwesomeIcon icon={TYPE_ICONS[t.type_code] || faShoppingCart} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: theme.textPrimary, marginBottom: 6 }}>{t.type_name}</div>
            <div style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 1.5 }}>{t.description}</div>
            {t.max_amount && (
              <div style={{ marginTop: 12, padding: '4px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.1)',
                color: '#6366f1', fontSize: 11, fontWeight: 700, width: 'fit-content' }}>
                Maks {fmt(t.max_amount)}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  // ── STEP 2: Form ─────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    border: `1px solid ${theme.border}`, background: theme.inputBg || theme.cardBg,
    color: theme.textPrimary, outline: 'none',
  }

  return (
    <div style={{ padding: '28px 32px', background: theme.pageBg, minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 12, color: theme.textSecondary }}>
        <button onClick={() => router.push('/data/fpb')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12 }}>FPB</button>
        <span>/</span>
        <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12 }}>Pilih Tipe</button>
        <span>/</span>
        <span>{selType?.type_name}</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, marginBottom: 4 }}>Buat FPB — {selType?.type_name}</h1>
      <p style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 28 }}>{selType?.description}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Division & Usage Date */}
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardHeader className="pb-3"><CardTitle style={{ color: theme.textPrimary, fontSize: 15 }}>Informasi Umum</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 6 }}>Divisi / Unit</label>
                <div style={{ ...inputStyle, background: theme.subtleBg, display: 'flex', alignItems: 'center', gap: 8, color: division ? theme.textPrimary : theme.textSecondary }}>
                  {division
                    ? <><span style={{ fontSize: 14 }}>🏢</span> {division}</>
                    : <span style={{ fontStyle: 'italic' }}>Unit tidak ditemukan — hubungi admin</span>}
                </div>
                <p style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>Otomatis dari profil Anda</p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 6 }}>Tanggal Kebutuhan *</label>
                <input type="date" value={usageDate} onChange={e => setUsageDate(e.target.value)} style={inputStyle} />
                {errors.usageDate && <p style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{errors.usageDate}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardHeader className="pb-3">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ color: theme.textPrimary, fontSize: 15 }}>Daftar Barang</CardTitle>
              <button onClick={addItem}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
                  border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faPlus} />Tambah Item
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Nama Barang</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', color: theme.textSecondary, fontWeight: 600, fontSize: 11, width: 80 }}>Qty</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', color: theme.textSecondary, fontWeight: 600, fontSize: 11, width: 90 }}>Satuan</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', color: theme.textSecondary, fontWeight: 600, fontSize: 11, width: 140 }}>Harga Satuan</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', color: theme.textSecondary, fontWeight: 600, fontSize: 11, width: 140 }}>Subtotal</th>
                    <th style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item._id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '8px 12px' }}>
                        <input value={item.item_name} onChange={e => updateItem(item._id, 'item_name', e.target.value)}
                          placeholder="Nama barang..." style={{ ...inputStyle, padding: '6px 10px' }} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item._id, 'quantity', e.target.value)}
                          style={{ ...inputStyle, padding: '6px 10px', textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select value={item.unit} onChange={e => updateItem(item._id, 'unit', e.target.value)} style={{ ...inputStyle, padding: '6px 10px' }}>
                          {['pcs', 'kg', 'liter', 'box', 'rim', 'lusin', 'unit', 'set', 'lump sum'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="number" min="0" value={item.unit_price} onChange={e => updateItem(item._id, 'unit_price', e.target.value)}
                          placeholder="0" style={{ ...inputStyle, padding: '6px 10px', textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: theme.textPrimary, whiteSpace: 'nowrap' }}>
                        {fmt((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        {items.length > 1 && (
                          <button onClick={() => removeItem(item._id)}
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
                    <td colSpan={4} style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: theme.textPrimary, fontSize: 14 }}>Grand Total</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, fontSize: 16,
                      color: exceeds ? '#dc2626' : '#059669' }}>{fmt(grandTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {errors.items && <p style={{ padding: '8px 14px', color: '#dc2626', fontSize: 12 }}>{errors.items}</p>}
          </CardContent>
        </Card>

        {exceeds && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5',
            color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
            ⚠ Grand total melebihi batas maksimum {fmt(selType?.max_amount)} untuk tipe FPB ini.
          </div>
        )}

        {/* Note */}
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardHeader className="pb-3"><CardTitle style={{ color: theme.textPrimary, fontSize: 15 }}>Catatan (Opsional)</CardTitle></CardHeader>
          <CardContent>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Tambahkan catatan atau keterangan tambahan..."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </CardContent>
        </Card>

        {errors.submit && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>
            ⚠ {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 32 }}>
          <button onClick={() => setStep(1)}
            style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${theme.border}`,
              background: theme.cardBg, color: theme.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />Kembali
          </button>
          <button onClick={handleSubmit} disabled={saving || exceeds}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13,
              background: saving || exceeds ? theme.subtleBg : 'linear-gradient(135deg,#6366f1,#0ea5e9)',
              color: saving || exceeds ? theme.textSecondary : '#fff',
              cursor: saving || exceeds ? 'not-allowed' : 'pointer',
              boxShadow: saving || exceeds ? 'none' : '0 2px 12px rgba(99,102,241,0.35)' }}>
            {saving ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />Menyimpan...</> : '📤 Submit FPB'}
          </button>
        </div>
      </div>
    </div>
  )
}
