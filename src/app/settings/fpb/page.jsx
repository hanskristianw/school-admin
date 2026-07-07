'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileInvoiceDollar, faShoppingCart, faBoxOpen, faTools,
  faPlus, faTrash, faSave, faSpinner, faCheck, faUsers, faUserTie,
} from '@fortawesome/free-solid-svg-icons'

const TYPE_ICONS = { small: faShoppingCart, large: faBoxOpen, repair: faTools }
const emptyStep  = (order) => ({ _id: crypto.randomUUID(), step_order: order, step_name: '', approver_role_id: '', isNew: true })

// ─── Helpers ──────────────────────────────────────────────────────────────────
const userName = (u) => u ? `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim() : '—'

export default function FpbSettingsPage() {
  const { theme } = useTheme()

  // Data
  const [types, setTypes]   = useState([])
  const [roles, setRoles]   = useState([])
  const [users, setUsers]   = useState([])
  const [selType, setSelType] = useState(null)

  // Steps config (per selected type)
  const [steps, setSteps]   = useState([])

  // Role approvers config: { [role_id]: { id, approver1_id, approver2_id, approver3_id } }
  const [roleApprovers, setRoleApprovers] = useState({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      supabase.from('fpb_types').select('*').eq('is_active', true).order('created_at'),
      supabase.from('role').select('role_id, role_name').order('role_name'),
      supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').order('user_nama_depan'),
      supabase.from('fpb_role_approvers').select('*'),
    ]).then(([{ data: t }, { data: r }, { data: u }, { data: ra }]) => {
      setTypes(t || [])
      setRoles(r || [])
      setUsers(u || [])

      // Build roleApprovers map from DB
      const map = {}
      ;(ra || []).forEach(row => {
        map[row.role_id] = {
          id:           row.id,
          approver1_id: row.approver1_id ? String(row.approver1_id) : '',
          approver2_id: row.approver2_id ? String(row.approver2_id) : '',
          approver3_id: row.approver3_id ? String(row.approver3_id) : '',
        }
      })
      setRoleApprovers(map)

      if (t?.length) { setSelType(t[0]); loadSteps(t[0].fpb_type_id) }
      setLoading(false)
    })
  }, [])

  // ── Load steps for selected type ───────────────────────────────────────────
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
        approver_role_id: s.approver_role_id ? String(s.approver_role_id) : '',
      }))
    )
  }

  const handleSelectType = (t) => {
    setSelType(t); setError(''); setSaved(false)
    loadSteps(t.fpb_type_id)
  }

  // ── Steps CRUD ────────────────────────────────────────────────────────────
  const addStep    = () => setSteps(prev => [...prev, emptyStep(prev.length + 1)])
  const removeStep = (id) => setSteps(prev => {
    const filtered = prev.filter(s => s._id !== id)
    return filtered.map((s, i) => ({ ...s, step_order: i + 1 }))
  })
  const updateStep = (id, field, val) =>
    setSteps(prev => prev.map(s => s._id === id ? { ...s, [field]: val } : s))

  // ── Role approvers update ─────────────────────────────────────────────────
  const updateRoleApprover = (roleId, field, val) =>
    setRoleApprovers(prev => ({
      ...prev,
      [roleId]: { ...(prev[roleId] || {}), [field]: val }
    }))

  // ── Roles used in current steps ───────────────────────────────────────────
  const usedRoleIds = useMemo(() => {
    const ids = new Set()
    steps.forEach(s => { if (s.approver_role_id) ids.add(String(s.approver_role_id)) })
    return ids
  }, [steps])

  const usedRoles = useMemo(() =>
    roles.filter(r => usedRoleIds.has(String(r.role_id))),
  [roles, usedRoleIds])

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selType) return
    setError('')

    // Validate steps
    for (const s of steps) {
      if (!s.step_name.trim()) { setError(`Step ${s.step_order}: nama step wajib diisi`); return }
      if (!s.approver_role_id) { setError(`Step ${s.step_order}: role approver wajib dipilih`); return }
    }

    // Validate: every used role must have at least approver1
    for (const r of usedRoles) {
      const ra = roleApprovers[r.role_id]
      if (!ra?.approver1_id) {
        setError(`Role "${r.role_name}" belum memiliki approver. Minimal 1 approver wajib diisi.`)
        return
      }
    }

    setSaving(true)
    try {
      // 1. Rebuild fpb_approval_steps for this type
      await supabase.from('fpb_approval_steps').delete().eq('fpb_type_id', selType.fpb_type_id)
      if (steps.length > 0) {
        const { error: stepsErr } = await supabase.from('fpb_approval_steps').insert(
          steps.map((s, i) => ({
            fpb_type_id:      selType.fpb_type_id,
            step_order:       i + 1,
            step_name:        s.step_name.trim(),
            approver_role_id: parseInt(s.approver_role_id),
            is_required:      true,
          }))
        )
        if (stepsErr) throw stepsErr
      }

      // 2. Upsert fpb_role_approvers for all roles that appear in steps
      for (const r of usedRoles) {
        const ra = roleApprovers[r.role_id] || {}
        const payload = {
          role_id:      r.role_id,
          approver1_id: ra.approver1_id ? parseInt(ra.approver1_id) : null,
          approver2_id: ra.approver2_id ? parseInt(ra.approver2_id) : null,
          approver3_id: ra.approver3_id ? parseInt(ra.approver3_id) : null,
        }
        const { error: raErr } = await supabase.from('fpb_role_approvers').upsert(payload, { onConflict: 'role_id' })
        if (raErr) throw raErr
      }

      // Reload
      await loadSteps(selType.fpb_type_id)
      // Reload role approvers
      const { data: ra } = await supabase.from('fpb_role_approvers').select('*')
      const map = {}
      ;(ra || []).forEach(row => {
        map[row.role_id] = {
          id: row.id,
          approver1_id: row.approver1_id ? String(row.approver1_id) : '',
          approver2_id: row.approver2_id ? String(row.approver2_id) : '',
          approver3_id: row.approver3_id ? String(row.approver3_id) : '',
        }
      })
      setRoleApprovers(map)

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    padding: '7px 10px', borderRadius: 7, fontSize: 13, border: `1px solid ${theme.border}`,
    background: theme.inputBg || theme.cardBg, color: theme.textPrimary, outline: 'none',
    width: '100%', boxSizing: 'border-box',
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
          Konfigurasi alur approval per tipe FPB berdasarkan role jabatan
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Type Selector ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
            Tipe FPB
          </p>
          {types.map(t => (
            <button key={t.fpb_type_id} onClick={() => handleSelectType(t)}
              style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${selType?.fpb_type_id === t.fpb_type_id ? '#6366f1' : theme.border}`, background: selType?.fpb_type_id === t.fpb_type_id ? 'rgba(99,102,241,0.07)' : theme.cardBg, transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FontAwesomeIcon icon={TYPE_ICONS[t.type_code] || faShoppingCart}
                  style={{ color: selType?.fpb_type_id === t.fpb_type_id ? '#6366f1' : theme.textSecondary, fontSize: 15 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: theme.textPrimary }}>{t.type_name}</div>
                  {t.max_amount && <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>Maks Rp {Number(t.max_amount).toLocaleString('id-ID')}</div>}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Right: Config ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Section 1: Steps */}
          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardHeader className="pb-3">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <CardTitle style={{ color: theme.textPrimary, fontSize: 16 }}>
                    <FontAwesomeIcon icon={TYPE_ICONS[selType?.type_code] || faShoppingCart} style={{ marginRight: 8, color: '#6366f1' }} />
                    {selType?.type_name} — Urutan Step Approval
                  </CardTitle>
                  <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                    Setiap step memilih role jabatan. Approval berjalan sequential.
                  </p>
                </div>
                <button onClick={addStep}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  <FontAwesomeIcon icon={faPlus} />Tambah Step
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 10, border: `2px dashed ${theme.border}`, color: theme.textSecondary }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
                  <p style={{ fontWeight: 600, marginBottom: 6, color: theme.textPrimary }}>Belum ada step approval</p>
                  <p style={{ fontSize: 12 }}>Klik "Tambah Step" untuk menambahkan step pertama</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {steps.map((step, idx) => (
                    <div key={step._id}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.subtleBg + '44' }}>
                      {/* Step number */}
                      <div style={{ width: 32, height: 32, borderRadius: 99, background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0, marginTop: 2 }}>
                        {idx + 1}
                      </div>
                      {/* Fields */}
                      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 4 }}>Nama Step *</label>
                          <input value={step.step_name} onChange={e => updateStep(step._id, 'step_name', e.target.value)}
                            placeholder="cth: Kepala Divisi, Finance..." style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 4 }}>Role Approver *</label>
                          <select value={step.approver_role_id} onChange={e => updateStep(step._id, 'approver_role_id', e.target.value)} style={inputStyle}>
                            <option value="">— Pilih Role —</option>
                            {roles.map(r => (
                              <option key={r.role_id} value={String(r.role_id)}>{r.role_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* Remove */}
                      <button onClick={() => removeStep(step._id)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 6, borderRadius: 6, flexShrink: 0, marginTop: 4 }}
                        title="Hapus step ini">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview */}
              {steps.length > 1 && (
                <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 10, textTransform: 'uppercase' }}>Preview Alur</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', padding: '3px 10px', borderRadius: 99, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)' }}>Submit</span>
                    {steps.map((s, i) => {
                      const role = roles.find(r => String(r.role_id) === s.approver_role_id)
                      return (
                        <React.Fragment key={`pv-${i}`}>
                          <span style={{ color: theme.textSecondary, fontSize: 14 }}>→</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', padding: '3px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                            {s.step_name || `Step ${i + 1}`}
                            {role && <span style={{ opacity: 0.7, fontWeight: 400 }}> ({role.role_name})</span>}
                          </span>
                        </React.Fragment>
                      )
                    })}
                    <span style={{ color: theme.textSecondary, fontSize: 14 }}>→</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', padding: '3px 10px', borderRadius: 99, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)' }}>✅ Approved</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Role Approvers Config */}
          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardHeader className="pb-3">
              <CardTitle style={{ color: theme.textPrimary, fontSize: 16 }}>
                <FontAwesomeIcon icon={faUsers} style={{ marginRight: 8, color: '#6366f1' }} />
                Konfigurasi Approver per Role
              </CardTitle>
              <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                Tentukan siapa saja (maks. 3 orang) yang bisa mewakili setiap role. <strong>Semua approver harus menyetujui</strong> sebelum step selesai.
              </p>
            </CardHeader>
            <CardContent>
              {usedRoles.length === 0 ? (
                <div style={{ padding: '28px 20px', textAlign: 'center', borderRadius: 10, border: `2px dashed ${theme.border}`, color: theme.textSecondary }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>👆</div>
                  <p style={{ fontSize: 13 }}>Pilih role di step-step di atas untuk mengkonfigurasi approvernya</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {usedRoles.map(role => {
                    const ra = roleApprovers[role.role_id] || {}
                    return (
                      <div key={role.role_id} style={{ padding: '16px 18px', borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.subtleBg + '33' }}>
                        {/* Role header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 99, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: 13 }}>
                            <FontAwesomeIcon icon={faUserTie} />
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary }}>{role.role_name}</div>
                          {!ra.approver1_id && (
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#dc2626', fontWeight: 600, background: '#fef2f2', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: 99 }}>
                              ⚠ Belum dikonfigurasi
                            </span>
                          )}
                          {ra.approver1_id && (
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#059669', fontWeight: 600, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.3)', padding: '2px 8px', borderRadius: 99 }}>
                              ✓ Terkonfigurasi
                            </span>
                          )}
                        </div>

                        {/* Approver slots */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                          {[
                            { key: 'approver1_id', label: 'Approver 1', required: true },
                            { key: 'approver2_id', label: 'Approver 2', required: false },
                            { key: 'approver3_id', label: 'Approver 3', required: false },
                          ].map(({ key, label, required }) => (
                            <div key={key}>
                              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary, display: 'block', marginBottom: 4 }}>
                                {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
                                {!required && <span style={{ fontWeight: 400 }}> (opsional)</span>}
                              </label>
                              <select
                                value={ra[key] || ''}
                                onChange={e => updateRoleApprover(role.role_id, key, e.target.value)}
                                style={inputStyle}>
                                <option value="">— Tidak ada —</option>
                                {users.map(u => (
                                  <option key={u.user_id} value={String(u.user_id)}>{userName(u)}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>

                        {/* Preview who needs to approve */}
                        {ra.approver1_id && (
                          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', fontSize: 12, color: theme.textSecondary }}>
                            Yang harus menyetujui:{' '}
                            <strong style={{ color: theme.textPrimary }}>
                              {[ra.approver1_id, ra.approver2_id, ra.approver3_id]
                                .filter(Boolean)
                                .map(id => {
                                  const u = users.find(u => String(u.user_id) === id)
                                  return u ? userName(u).split(' ')[0] : id
                                })
                                .join(', ')}
                            </strong>
                            {' '}(semua harus setuju)
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>
                  ⚠ {error}
                </div>
              )}

              {/* Save */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
                <Button onClick={handleSave} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px', background: saved ? '#059669' : saving ? theme.subtleBg : 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: saving ? theme.textSecondary : '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saved || saving ? 'none' : '0 2px 12px rgba(99,102,241,0.3)', transition: 'all 0.2s' }}>
                  {saving ? <><FontAwesomeIcon icon={faSpinner} spin />Menyimpan...</>
                    : saved ? <><FontAwesomeIcon icon={faCheck} />Tersimpan!</>
                    : <><FontAwesomeIcon icon={faSave} />Simpan Konfigurasi</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
