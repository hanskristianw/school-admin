'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileInvoiceDollar, faShoppingCart, faBoxOpen, faTools,
  faPlus, faTrash, faGripVertical, faSave, faSpinner, faCheck
} from '@fortawesome/free-solid-svg-icons'

const TYPE_ICONS = { small: faShoppingCart, large: faBoxOpen, repair: faTools }

const emptyStep = (order) => ({
  _id: crypto.randomUUID(),
  step_id: null,
  step_order: order,
  step_name: '',
  approver_user_id: '',
  is_required: true,
  isNew: true,
})

export default function FpbSettingsPage() {
  const { theme } = useTheme()

  const [types, setTypes]     = useState([])
  const [selType, setSelType] = useState(null)
  const [steps, setSteps]     = useState([])
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('fpb_types').select('*').eq('is_active', true).order('created_at'),
      supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').order('user_nama_depan'),
    ]).then(([{ data: t }, { data: u }]) => {
      setTypes(t || [])
      setUsers(u || [])
      if (t?.length) { setSelType(t[0]); loadSteps(t[0].fpb_type_id) }
      setLoading(false)
    })
  }, [])

  const loadSteps = async (typeId) => {
    const { data } = await supabase
      .from('fpb_approval_steps')
      .select('*')
      .eq('fpb_type_id', typeId)
      .order('step_order')
    setSteps(
      (data || []).map(s => ({
        ...s,
        _id: s.step_id,
        isNew: false,
        approver_user_id: String(s.approver_user_id),
      }))
    )
  }

  const handleSelectType = (t) => {
    setSelType(t)
    setError('')
    setSaved(false)
    loadSteps(t.fpb_type_id)
  }

  const addStep = () => setSteps(prev => [...prev, emptyStep(prev.length + 1)])

  const removeStep = (id) => {
    setSteps(prev => {
      const filtered = prev.filter(s => s._id !== id)
      return filtered.map((s, i) => ({ ...s, step_order: i + 1 }))
    })
  }

  const updateStep = (id, field, val) =>
    setSteps(prev => prev.map(s => s._id === id ? { ...s, [field]: val } : s))

  const handleSave = async () => {
    if (!selType) return
    setError('')

    // Validate
    for (const s of steps) {
      if (!s.step_name.trim()) { setError(`Step ${s.step_order}: nama step wajib diisi`); return }
      if (!s.approver_user_id) { setError(`Step ${s.step_order}: approver wajib dipilih`); return }
    }

    setSaving(true)
    try {
      // Delete all existing steps for this type
      await supabase.from('fpb_approval_steps').delete().eq('fpb_type_id', selType.fpb_type_id)

      if (steps.length > 0) {
        const rows = steps.map((s, i) => ({
          fpb_type_id:      selType.fpb_type_id,
          step_order:       i + 1,
          step_name:        s.step_name.trim(),
          approver_user_id: parseInt(s.approver_user_id),
          is_required:      s.is_required,
        }))
        const { error: insErr } = await supabase.from('fpb_approval_steps').insert(rows)
        if (insErr) throw insErr
      }

      // Reload
      await loadSteps(selType.fpb_type_id)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const userName = (u) => `${u.user_nama_depan} ${u.user_nama_belakang}`.trim()

  const inputStyle = {
    padding: '7px 10px', borderRadius: 7, fontSize: 13, border: `1px solid ${theme.border}`,
    background: theme.inputBg || theme.cardBg, color: theme.textPrimary, outline: 'none',
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: theme.textSecondary }}>
      <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 24 }} />
      <p style={{ marginTop: 10 }}>Memuat...</p>
    </div>
  )

  return (
    <div className="p-4">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ color: '#6366f1', fontSize: 22 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, margin: 0 }}>
            Pengaturan Approval FPB
          </h1>
        </div>
        <p style={{ fontSize: 13, color: theme.textSecondary }}>
          Konfigurasi siapa yang menyetujui setiap tipe Formulir Pembelian Barang
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left: Type Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
            Tipe FPB
          </p>
          {types.map(t => (
            <button key={t.fpb_type_id} onClick={() => handleSelectType(t)}
              style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${selType?.fpb_type_id === t.fpb_type_id ? '#6366f1' : theme.border}`,
                background: selType?.fpb_type_id === t.fpb_type_id ? 'rgba(99,102,241,0.07)' : theme.cardBg,
                transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FontAwesomeIcon icon={TYPE_ICONS[t.type_code] || faShoppingCart}
                  style={{ color: selType?.fpb_type_id === t.fpb_type_id ? '#6366f1' : theme.textSecondary, fontSize: 15 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: theme.textPrimary }}>{t.type_name}</div>
                  {t.max_amount && (
                    <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                      Maks Rp {Number(t.max_amount).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Right: Steps Config */}
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardHeader className="pb-3">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <CardTitle style={{ color: theme.textPrimary, fontSize: 16 }}>
                  <FontAwesomeIcon icon={TYPE_ICONS[selType?.type_code] || faShoppingCart} style={{ marginRight: 8, color: '#6366f1' }} />
                  {selType?.type_name}
                </CardTitle>
                <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                  Atur urutan approver. Approval berjalan sequential dari step 1.
                </p>
              </div>
              <button onClick={addStep}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                  border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faPlus} />Tambah Step
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {steps.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', borderRadius: 10,
                border: `2px dashed ${theme.border}`, color: theme.textSecondary }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
                <p style={{ fontWeight: 600, marginBottom: 6, color: theme.textPrimary }}>Belum ada step approval</p>
                <p style={{ fontSize: 12 }}>Klik "Tambah Step" untuk menambahkan approver pertama</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {steps.map((step, idx) => (
                  <div key={step._id}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                      borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.subtleBg + '44' }}>
                    {/* Step number */}
                    <div style={{ width: 32, height: 32, borderRadius: 99, background: '#6366f1', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                      fontSize: 14, flexShrink: 0, marginTop: 2 }}>
                      {idx + 1}
                    </div>

                    {/* Fields */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 4 }}>
                          Nama Step *
                        </label>
                        <input
                          value={step.step_name}
                          onChange={e => updateStep(step._id, 'step_name', e.target.value)}
                          placeholder="cth: Kepala Divisi, Finance..."
                          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 4 }}>
                          Approver *
                        </label>
                        <select
                          value={step.approver_user_id}
                          onChange={e => updateStep(step._id, 'approver_user_id', e.target.value)}
                          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}>
                          <option value="">— Pilih User —</option>
                          {users.map(u => (
                            <option key={u.user_id} value={String(u.user_id)}>{userName(u)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeStep(step._id)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer',
                        padding: '6px', borderRadius: 6, flexShrink: 0, marginTop: 4 }}
                      title="Hapus step ini">
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline preview */}
            {steps.length > 1 && (
              <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10,
                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 10, textTransform: 'uppercase' }}>
                  Preview Alur Approval
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', padding: '3px 10px',
                    borderRadius: 99, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)' }}>
                    Submit
                  </span>
                  {steps.map((s, i) => {
                    const user = users.find(u => String(u.user_id) === s.approver_user_id)
                    return (
                      <>
                        <span key={`arr-${i}`} style={{ color: theme.textSecondary, fontSize: 14 }}>→</span>
                        <span key={`step-${i}`} style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', padding: '3px 10px',
                          borderRadius: 99, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                          {s.step_name || `Step ${i+1}`}
                          {user && <span style={{ opacity: 0.7, fontWeight: 400 }}> ({userName(user).split(' ')[0]})</span>}
                        </span>
                      </>
                    )
                  })}
                  <span style={{ color: theme.textSecondary, fontSize: 14 }}>→</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', padding: '3px 10px',
                    borderRadius: 99, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)' }}>
                    ✅ Approved
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#fef2f2',
                border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20,
              paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
              <Button onClick={handleSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px',
                  background: saved ? '#059669' : saving ? theme.subtleBg : 'linear-gradient(135deg,#6366f1,#0ea5e9)',
                  color: saving ? theme.textSecondary : '#fff', border: 'none', borderRadius: 9,
                  fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saved || saving ? 'none' : '0 2px 12px rgba(99,102,241,0.3)', transition: 'all 0.2s' }}>
                {saving
                  ? <><FontAwesomeIcon icon={faSpinner} spin />Menyimpan...</>
                  : saved
                  ? <><FontAwesomeIcon icon={faCheck} />Tersimpan!</>
                  : <><FontAwesomeIcon icon={faSave} />Simpan Konfigurasi</>
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
