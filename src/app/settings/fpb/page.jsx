'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileInvoiceDollar, faSave, faSpinner, faCheck,
  faUsers, faUserTie, faShield, faWallet,
} from '@fortawesome/free-solid-svg-icons'

const userName = (u) => u ? `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim() : '—'

export default function FpbSettingsPage() {
  const { theme } = useTheme()

  const [roles, setRoles]         = useState([])
  const [users, setUsers]         = useState([])
  const [selRole, setSelRole]     = useState(null)
  const [roleApprovers, setRoleApprovers] = useState({})
  const [budgetRoleIds, setBudgetRoleIds] = useState(new Set()) // role_ids that can edit budget
  const [savingBudget, setSavingBudget]   = useState(false)
  const [savedBudget, setSavedBudget]     = useState(false)

  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('role').select('role_id, role_name').order('role_name'),
      supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').eq('is_active', true).order('user_nama_depan'),
      supabase.from('fpb_role_approvers').select('*'),
      supabase.from('fpb_budget_roles').select('role_id'),
    ]).then(([{ data: r }, { data: u }, { data: ra }, { data: br }]) => {
      setRoles(r || [])
      setUsers(u || [])
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
      setBudgetRoleIds(new Set((br || []).map(b => b.role_id)))
      if (r?.length) setSelRole(r[0])
      setLoading(false)
    })
  }, [])

  const updateApprover = (field, val) => {
    if (!selRole) return
    setRoleApprovers(prev => ({
      ...prev,
      [selRole.role_id]: {
        ...(prev[selRole.role_id] || {}),
        [field]: val,
      }
    }))
  }

  const handleSave = async () => {
    if (!selRole) return
    setError('')

    const ra = roleApprovers[selRole.role_id] || {}
    if (!ra.approver1_id) {
      setError('Minimal 1 approver wajib diisi'); return
    }

    // Validate: no duplicate approvers
    const ids = [ra.approver1_id, ra.approver2_id, ra.approver3_id].filter(Boolean)
    if (new Set(ids).size !== ids.length) {
      setError('Approver tidak boleh sama'); return
    }

    setSaving(true)
    try {
      const payload = {
        role_id:      selRole.role_id,
        approver1_id: ra.approver1_id ? parseInt(ra.approver1_id) : null,
        approver2_id: ra.approver2_id ? parseInt(ra.approver2_id) : null,
        approver3_id: ra.approver3_id ? parseInt(ra.approver3_id) : null,
      }
      const { error: err } = await supabase.from('fpb_role_approvers')
        .upsert(payload, { onConflict: 'role_id' })
      if (err) throw err

      // Reload
      const { data: ra2 } = await supabase.from('fpb_role_approvers').select('*')
      const map = {}
      ;(ra2 || []).forEach(row => {
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

  const toggleBudgetRole = (roleId) => {
    setBudgetRoleIds(prev => {
      const next = new Set(prev)
      next.has(roleId) ? next.delete(roleId) : next.add(roleId)
      return next
    })
  }

  const saveBudgetRoles = async () => {
    setSavingBudget(true)
    try {
      // Delete all existing, then insert selected
      await supabase.from('fpb_budget_roles').delete().neq('role_id', 0)
      if (budgetRoleIds.size > 0) {
        const { error: insErr } = await supabase.from('fpb_budget_roles')
          .insert([...budgetRoleIds].map(rid => ({ role_id: rid })))
        if (insErr) throw insErr
      }
      setSavedBudget(true)
      setTimeout(() => setSavedBudget(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingBudget(false)
    }
  }

  const inputStyle = {
    padding: '8px 11px', borderRadius: 8, fontSize: 13, border: `1px solid ${theme.border}`,
    background: theme.inputBg || theme.cardBg, color: theme.textPrimary, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: theme.textSecondary }}>
      <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 24 }} />
      <p style={{ marginTop: 10 }}>Memuat...</p>
    </div>
  )

  const curRa = selRole ? (roleApprovers[selRole.role_id] || {}) : {}
  const isConfigured = !!curRa.approver1_id

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
          Konfigurasi siapa yang menyetujui FPB berdasarkan jabatan (role) pengaju
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Role List ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>
            Jabatan / Role
          </p>
          {roles.map(r => {
            const ra = roleApprovers[r.role_id]
            const configured = !!ra?.approver1_id
            const isSelected = selRole?.role_id === r.role_id
            return (
              <button key={r.role_id} onClick={() => { setSelRole(r); setError(''); setSaved(false) }}
                style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${isSelected ? '#6366f1' : theme.border}`, background: isSelected ? 'rgba(99,102,241,0.07)' : theme.cardBg, transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FontAwesomeIcon icon={faUserTie} style={{ color: isSelected ? '#6366f1' : theme.textSecondary, fontSize: 13, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.role_name}</div>
                    <div style={{ fontSize: 11, marginTop: 2, color: configured ? '#059669' : '#d97706', fontWeight: 600 }}>
                      {configured ? '✓ Terkonfigurasi' : '⚠ Belum diatur'}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Right: Approver Config ───────────────────────────────────────────── */}
        {selRole ? (
          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardHeader className="pb-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 99, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                  <FontAwesomeIcon icon={faShield} />
                </div>
                <div>
                  <CardTitle style={{ color: theme.textPrimary, fontSize: 16 }}>{selRole.role_name}</CardTitle>
                  <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    Setiap pengajuan FPB oleh pegawai dengan jabatan ini akan disetujui oleh approver berikut.
                    <strong style={{ color: '#6366f1' }}> Semua approver harus menyetujui (AND logic).</strong>
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Approver slots */}
                {[
                  { key: 'approver1_id', label: 'Approver 1', required: true,  desc: 'Wajib — approver utama' },
                  { key: 'approver2_id', label: 'Approver 2', required: false, desc: 'Opsional — approver kedua' },
                  { key: 'approver3_id', label: 'Approver 3', required: false, desc: 'Opsional — approver ketiga' },
                ].map(({ key, label, required, desc }) => {
                  const selectedUserId = curRa[key] || ''
                  const selectedUser   = users.find(u => String(u.user_id) === selectedUserId)
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: `1px solid ${selectedUserId ? 'rgba(99,102,241,0.3)' : theme.border}`, background: selectedUserId ? 'rgba(99,102,241,0.04)' : theme.subtleBg + '33', transition: 'all 0.15s' }}>
                      {/* Step circle */}
                      <div style={{ width: 36, height: 36, borderRadius: 99, background: selectedUserId ? '#6366f1' : theme.subtleBg, border: `2px solid ${selectedUserId ? '#6366f1' : theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedUserId ? '#fff' : theme.textSecondary, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                        {key === 'approver1_id' ? 1 : key === 'approver2_id' ? 2 : 3}
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>
                          {label} {required ? <span style={{ color: '#dc2626' }}>*</span> : <span style={{ fontWeight: 400 }}>(opsional)</span>}
                          <span style={{ marginLeft: 6, fontWeight: 400, color: theme.textSecondary }}>{desc}</span>
                        </label>
                        <select value={selectedUserId} onChange={e => updateApprover(key, e.target.value)} style={inputStyle}>
                          <option value="">— Tidak ada —</option>
                          {users.map(u => (
                            <option key={u.user_id} value={String(u.user_id)}>{userName(u)}</option>
                          ))}
                        </select>
                      </div>
                      {selectedUser && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: theme.textPrimary }}>{userName(selectedUser).split(' ')[0]}</div>
                          <div style={{ fontSize: 10, color: '#059669', fontWeight: 600, marginTop: 2 }}>✓ Dipilih</div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Preview */}
                {isConfigured && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 10, textTransform: 'uppercase' }}>
                      <FontAwesomeIcon icon={faUsers} style={{ marginRight: 6 }} />Preview Alur Approval
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', padding: '3px 10px', borderRadius: 99, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)' }}>
                        Pengaju ({selRole.role_name})
                      </span>
                      <span style={{ color: theme.textSecondary }}>→</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        {[curRa.approver1_id, curRa.approver2_id, curRa.approver3_id].filter(Boolean).map((uid, i) => {
                          const u = users.find(u => String(u.user_id) === uid)
                          return (
                            <React.Fragment key={uid}>
                              {i > 0 && <span style={{ fontSize: 11, color: theme.textSecondary, fontWeight: 700 }}>+</span>}
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', padding: '3px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                                {u ? userName(u).split(' ')[0] : uid}
                              </span>
                            </React.Fragment>
                          )
                        })}
                      </div>
                      <span style={{ color: theme.textSecondary }}>→</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', padding: '3px 10px', borderRadius: 99, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)' }}>
                        ✅ FPB Approved
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: theme.textSecondary, marginTop: 8 }}>
                      Semua {[curRa.approver1_id, curRa.approver2_id, curRa.approver3_id].filter(Boolean).length} approver harus menyetujui sebelum FPB dianggap disetujui.
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>
                    ⚠ {error}
                  </div>
                )}

                {/* Save */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                  <Button onClick={handleSave} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px', background: saved ? '#059669' : saving ? theme.subtleBg : 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: saving ? theme.textSecondary : '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saved || saving ? 'none' : '0 2px 12px rgba(99,102,241,0.3)', transition: 'all 0.2s' }}>
                    {saving ? <><FontAwesomeIcon icon={faSpinner} spin />Menyimpan...</>
                      : saved ? <><FontAwesomeIcon icon={faCheck} />Tersimpan!</>
                      : <><FontAwesomeIcon icon={faSave} />Simpan Konfigurasi</>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: theme.textSecondary }}>
            Pilih jabatan di sebelah kiri untuk mengkonfigurasi approver
          </div>
        )}
      </div>

      {/* ── Budget Roles Card ────────────────────────────────────────────── */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border, marginTop: 24 }}>
        <CardHeader className="pb-3">
          <CardTitle style={{ color: theme.textPrimary, fontSize: 16 }}>
            <FontAwesomeIcon icon={faWallet} style={{ marginRight: 8, color: '#6366f1' }} />
            Hak Akses Edit Budget FPB
          </CardTitle>
          <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
            Pilih jabatan yang berhak mengisi dan mengubah kolom <strong>Budget</strong> dan <strong>Remaining Budget</strong> pada setiap FPB.
          </p>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
            {roles.map(r => {
              const checked = budgetRoleIds.has(r.role_id)
              return (
                <label key={r.role_id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${checked ? '#6366f1' : theme.border}`, background: checked ? 'rgba(99,102,241,0.07)' : theme.cardBg, transition: 'all 0.15s', userSelect: 'none' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleBudgetRole(r.role_id)}
                    style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: theme.textPrimary }}>{r.role_name}</div>
                    {checked && <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, marginTop: 1 }}>✓ Bisa edit budget</div>}
                  </div>
                </label>
              )
            })}
          </div>
          {budgetRoleIds.size > 0 && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: theme.textSecondary }}>
              <strong style={{ color: '#6366f1' }}>{budgetRoleIds.size} jabatan</strong> dapat mengisi/mengubah Budget & Remaining Budget pada FPB.
            </div>
          )}
          {budgetRoleIds.size === 0 && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 12, color: '#dc2626' }}>
              ⚠ Belum ada jabatan yang bisa mengisi budget. Kolom budget tidak akan muncul di halaman FPB.
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <Button onClick={saveBudgetRoles} disabled={savingBudget}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px', background: savedBudget ? '#059669' : savingBudget ? theme.subtleBg : 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: savingBudget ? theme.textSecondary : '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: savingBudget ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {savingBudget ? <><FontAwesomeIcon icon={faSpinner} spin />Menyimpan...</>
                : savedBudget ? <><FontAwesomeIcon icon={faCheck} />Tersimpan!</>
                : <><FontAwesomeIcon icon={faSave} />Simpan Hak Akses Budget</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
