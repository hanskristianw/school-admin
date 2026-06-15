'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPlus, faTrash, faSpinner, faSave } from '@fortawesome/free-solid-svg-icons'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
const emptyItem = () => ({ _id: crypto.randomUUID(), item_id: null, item_name: '', quantity: 1, unit: 'pcs', unit_price: '' })

export default function EditFpbPage() {
  const { theme } = useTheme()
  const router    = useRouter()
  const { id }    = useParams()

  const [fpb, setFpb]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [userId, setUserId]   = useState(null)

  // Form state
  const [usageDate, setUsageDate] = useState('')
  const [note, setNote]           = useState('')
  const [items, setItems]         = useState([emptyItem()])
  const [errors, setErrors]       = useState({})

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) { setUserId(uid); fetchData(uid) }
  }, [id])

  const fetchData = async (uid) => {
    setLoading(true)
    try {
      const { data: f } = await supabase.from('fpb')
        .select(`*, fpb_types(type_name, max_amount),
                 users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang)`)
        .eq('fpb_id', id).single()

      // Security check: only submitter on revision status can edit
      if (!f || f.submitted_by !== uid || f.status !== 'revision') {
        router.push(`/data/fpb/${id}`)
        return
      }

      setFpb(f)
      setUsageDate(f.usage_date?.slice(0, 10) || '')
      setNote(f.note || '')

      const { data: it } = await supabase.from('fpb_items').select('*').eq('fpb_id', id).order('created_at')
      setItems((it || []).map(i => ({
        _id:       crypto.randomUUID(),
        item_id:   i.item_id,
        item_name: i.item_name,
        quantity:  i.quantity,
        unit:      i.unit,
        unit_price: String(i.unit_price),
      })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const grandTotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
  const exceeds    = fpb?.fpb_types?.max_amount && grandTotal > fpb.fpb_types.max_amount

  const updateItem = (id, field, val) => setItems(prev => prev.map(i => i._id === id ? { ...i, [field]: val } : i))
  const addItem    = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (id) => setItems(prev => prev.filter(i => i._id !== id))

  const validate = () => {
    const e = {}
    if (!usageDate) e.usageDate = 'Tanggal kebutuhan wajib diisi'
    if (items.length === 0) e.items = 'Minimal satu barang harus diisi'
    if (items.some(i => !i.item_name.trim())) e.items = 'Semua nama barang wajib diisi'
    if (items.some(i => !i.unit_price || Number(i.unit_price) <= 0)) e.items = 'Semua harga satuan wajib diisi'
    if (exceeds) e.total = `Grand total melebihi batas ${fmt(fpb.fpb_types.max_amount)}`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      // Update FPB header
      await supabase.from('fpb').update({
        usage_date:  usageDate,
        note:        note.trim() || null,
        grand_total: grandTotal,
      }).eq('fpb_id', id)

      // Replace all items: delete existing, re-insert
      await supabase.from('fpb_items').delete().eq('fpb_id', id)
      const itemRows = items.map(i => ({
        fpb_id:     id,           // keep as UUID string — do NOT parseInt()
        item_name:  i.item_name.trim(),
        quantity:   Number(i.quantity),
        unit:       i.unit,
        unit_price: Number(i.unit_price),
      }))
      const { error: itemErr } = await supabase.from('fpb_items').insert(itemRows)
      if (itemErr) throw itemErr

      router.push(`/data/fpb/${id}`)
    } catch (e) {
      console.error(e)
      setErrors({ submit: e.message || 'Gagal menyimpan perubahan' })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
    border: `1px solid ${theme?.border || '#e5e7eb'}`,
    background: theme?.inputBg || theme?.cardBg || '#fff',
    color: theme?.textPrimary || '#111', outline: 'none',
  }

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
      <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 28 }} />
      <p style={{ marginTop: 12 }}>Memuat data FPB...</p>
    </div>
  )

  if (!fpb) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>FPB tidak ditemukan atau tidak dapat diedit.</div>
  )

  return (
    <div style={{ padding: '28px 32px', background: theme?.pageBg || '#f9fafb', minHeight: '100vh', maxWidth: 900, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <button onClick={() => router.push(`/data/fpb/${id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          background: 'none', border: 'none', color: theme?.textSecondary || '#6b7280', cursor: 'pointer', fontSize: 13 }}>
        <FontAwesomeIcon icon={faArrowLeft} /> Kembali ke Detail FPB
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: theme?.textPrimary || '#111', margin: 0 }}>
          Edit FPB — {fpb.fpb_number}
        </h1>
        <p style={{ fontSize: 13, color: theme?.textSecondary || '#6b7280', marginTop: 4 }}>
          {fpb.fpb_types?.type_name} &nbsp;·&nbsp;
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Status: Perlu Direvisi</span>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* General info */}
        <Card style={{ background: theme?.cardBg, borderColor: theme?.border }}>
          <CardHeader className="pb-3">
            <CardTitle style={{ color: theme?.textPrimary, fontSize: 15 }}>Informasi Umum</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Division — read-only */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: theme?.textSecondary, display: 'block', marginBottom: 6 }}>
                  Divisi / Unit
                </label>
                <div style={{ ...inputStyle, background: theme?.subtleBg, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🏢</span> {fpb.division || '—'}
                </div>
                <p style={{ fontSize: 11, color: theme?.textSecondary, marginTop: 4 }}>Tidak dapat diubah</p>
              </div>
              {/* Usage Date */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: theme?.textSecondary, display: 'block', marginBottom: 6 }}>
                  Tanggal Kebutuhan *
                </label>
                <input type="date" value={usageDate} onChange={e => setUsageDate(e.target.value)} style={inputStyle} />
                {errors.usageDate && <p style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{errors.usageDate}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items table */}
        <Card style={{ background: theme?.cardBg, borderColor: theme?.border }}>
          <CardHeader className="pb-3">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ color: theme?.textPrimary, fontSize: 15 }}>Daftar Barang</CardTitle>
              <button onClick={addItem}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
                  border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faPlus} /> Tambah Item
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: theme?.subtleBg, borderBottom: `1px solid ${theme?.border}` }}>
                    {['Nama Barang', 'Qty', 'Satuan', 'Harga Satuan', 'Subtotal', ''].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Nama Barang' ? 'left' : 'center',
                        color: theme?.textSecondary, fontWeight: 600, fontSize: 11,
                        width: h === 'Qty' ? 80 : h === 'Satuan' ? 90 : h === 'Harga Satuan' || h === 'Subtotal' ? 140 : h === '' ? 44 : undefined }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item._id} style={{ borderBottom: `1px solid ${theme?.border}` }}>
                      <td style={{ padding: '8px 12px' }}>
                        <input value={item.item_name} onChange={e => updateItem(item._id, 'item_name', e.target.value)}
                          placeholder="Nama barang..." style={{ ...inputStyle, padding: '6px 10px' }} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item._id, 'quantity', e.target.value)}
                          style={{ ...inputStyle, padding: '6px 10px', textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select value={item.unit} onChange={e => updateItem(item._id, 'unit', e.target.value)}
                          style={{ ...inputStyle, padding: '6px 10px' }}>
                          {['pcs', 'kg', 'liter', 'box', 'rim', 'lusin', 'unit', 'set'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="number" min="0" value={item.unit_price} onChange={e => updateItem(item._id, 'unit_price', e.target.value)}
                          placeholder="0" style={{ ...inputStyle, padding: '6px 10px', textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: theme?.textPrimary, whiteSpace: 'nowrap' }}>
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
                  <tr style={{ borderTop: `2px solid ${theme?.border}`, background: theme?.subtleBg }}>
                    <td colSpan={4} style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: theme?.textPrimary, fontSize: 14 }}>
                      Grand Total
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, fontSize: 16,
                      color: exceeds ? '#dc2626' : '#059669' }}>
                      {fmt(grandTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {errors.items && <p style={{ padding: '8px 14px', color: '#dc2626', fontSize: 12 }}>{errors.items}</p>}
          </CardContent>
        </Card>

        {/* Exceed warning */}
        {exceeds && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
            ⚠ Grand total melebihi batas tipe FPB ini ({fmt(fpb.fpb_types?.max_amount)}).
          </div>
        )}

        {/* Note */}
        <Card style={{ background: theme?.cardBg, borderColor: theme?.border }}>
          <CardHeader className="pb-3">
            <CardTitle style={{ color: theme?.textPrimary, fontSize: 15 }}>Catatan (Opsional)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Tambahkan catatan atau keterangan tambahan..."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </CardContent>
        </Card>

        {/* Submit error */}
        {errors.submit && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>
            ⚠ {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 32 }}>
          <button onClick={() => router.push(`/data/fpb/${id}`)}
            style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${theme?.border}`,
              background: theme?.cardBg, color: theme?.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} /> Batal
          </button>
          <button onClick={handleSave} disabled={saving || exceeds}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13,
              background: saving || exceeds ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#0ea5e9)',
              color: saving || exceeds ? '#9ca3af' : '#fff',
              cursor: saving || exceeds ? 'not-allowed' : 'pointer',
              boxShadow: saving || exceeds ? 'none' : '0 2px 12px rgba(99,102,241,0.35)' }}>
            {saving
              ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />Menyimpan...</>
              : <><FontAwesomeIcon icon={faSave} style={{ marginRight: 6 }} />Simpan Perubahan</>}
          </button>
        </div>
      </div>
    </div>
  )
}
