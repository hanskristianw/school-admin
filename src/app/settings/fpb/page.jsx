'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileInvoiceDollar, faSave, faSpinner, faCheck,
  faUsers, faUserTie, faShield, faWallet, faSearch,
  faPen, faWrench, faTimes, faRotateLeft,
} from '@fortawesome/free-solid-svg-icons'

const userName = (u) => u ? `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim() : '—'

export default function FpbSettingsPage() {
  const { theme } = useTheme()

  const [roles, setRoles]         = useState([])
  const [users, setUsers]         = useState([])
  const [selRole, setSelRole]     = useState(null)
  const [roleApprovers, setRoleApprovers] = useState({})
  const [budgetRoleIds, setBudgetRoleIds] = useState(new Set())
  const [savingBudget, setSavingBudget]   = useState(false)
  const [savedBudget, setSavedBudget]     = useState(false)

  const [screenerId, setScreenerId]         = useState('')
  const [screenerRowId, setScreenerRowId]   = useState(null)
  const [savingScreener, setSavingScreener] = useState(false)
  const [savedScreener, setSavedScreener]   = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')
  const [pendingFpbCount, setPendingFpbCount] = useState(null)
  const [applyingPending, setApplyingPending] = useState(false)
  const [appliedPending, setAppliedPending]   = useState(false)

  // ─── FPB Repair Tool ───────────────────────────────────────────
  const [repairSearch, setRepairSearch] = useState('')
  const [repairList, setRepairList]     = useState([])   // all non-draft FPBs for list
  const [repairFpb, setRepairFpb]       = useState(null) // selected FPB full data
  const [repairApprovals, setRepairApprovals] = useState([])
  const [repairLoading, setRepairLoading]     = useState(false)
  const [repairSaving, setRepairSaving]       = useState(false)
  const [repairSaved, setRepairSaved]         = useState(false)
  const [repairError, setRepairError]         = useState('')
  const [repairFpbStatus, setRepairFpbStatus] = useState('')
  const [repairCurrentStep, setRepairCurrentStep] = useState(1)
  const [repairApproverEdits, setRepairApproverEdits] = useState({}) // { approval_id: { approver_user_id, status } }

  const loadRepairList = useCallback(async () => {
    setRepairLoading(true)
    const { data } = await supabase
      .from('fpb')
      .select('fpb_id, fpb_number, status, submitted_by, users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang)')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
    setRepairList(data || [])
    setRepairLoading(false)
  }, [])

  useEffect(() => { loadRepairList() }, [loadRepairList])

  const loadRepairFpb = async (fpbId) => {
    setRepairLoading(true)
    setRepairError('')
    setRepairSaved(false)
    try {
      const { data: f } = await supabase
        .from('fpb')
        .select('fpb_id, fpb_number, status, current_step, submitted_by, users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang)')
        .eq('fpb_id', fpbId).single()
      setRepairFpb(f)
      setRepairFpbStatus(f.status)
      setRepairCurrentStep(f.current_step ?? 1)

      const { data: aps } = await supabase
        .from('fpb_approvals')
        .select('*, users!fpb_approvals_approver_user_id_fkey(user_nama_depan, user_nama_belakang), role!fpb_approvals_approver_role_id_fkey(role_name)')
        .eq('fpb_id', fpbId)
        .order('step_order').order('approver_order')
      setRepairApprovals(aps || [])

      // init edits from current values
      const edits = {}
      for (const ap of aps || []) {
        edits[ap.approval_id] = {
          approver_user_id: ap.approver_user_id ? String(ap.approver_user_id) : '',
          status: ap.status,
          step_order: ap.step_order,
        }
      }
      setRepairApproverEdits(edits)
    } catch (e) { setRepairError(e.message) }
    finally { setRepairLoading(false) }
  }

  const handleRepairSave = async () => {
    if (!repairFpb) return
    setRepairSaving(true)
    setRepairError('')
    try {
      // Save each approval row
      for (const ap of repairApprovals) {
        const edit = repairApproverEdits[ap.approval_id]
        if (!edit) continue
        const update = {
          approver_user_id: edit.approver_user_id ? parseInt(edit.approver_user_id) : null,
          status: edit.status,
          step_order: edit.step_order,
          // Clear action_at if resetting to pending
          ...(edit.status === 'pending' && ap.status !== 'pending' ? { action_at: null, comment: null } : {}),
        }
        await supabase.from('fpb_approvals').update(update).eq('approval_id', ap.approval_id)
      }
      // Save FPB status and/or current_step
      const fpbUpdate = {}
      if (repairFpbStatus !== repairFpb.status) fpbUpdate.status = repairFpbStatus
      if (repairCurrentStep !== repairFpb.current_step) fpbUpdate.current_step = repairCurrentStep
      if (Object.keys(fpbUpdate).length > 0) {
        await supabase.from('fpb').update(fpbUpdate).eq('fpb_id', repairFpb.fpb_id)
      }
      setRepairSaved(true)
      setTimeout(() => setRepairSaved(false), 4000)
      // Reload
      await loadRepairFpb(repairFpb.fpb_id)
      await loadRepairList()
    } catch (e) { setRepairError(e.message) }
    finally { setRepairSaving(false) }
  }

  const filteredRepairList = repairList.filter(f => {
    const q = repairSearch.toLowerCase()
    if (!q) return true
    return (f.fpb_number || '').toLowerCase().includes(q) ||
      (`${f.users?.user_nama_depan || ''} ${f.users?.user_nama_belakang || ''}`).toLowerCase().includes(q)
  })

  // ─── end FPB Repair Tool ────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      supabase.from('role').select('role_id, role_name').order('role_name'),
      supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').eq('is_active', true).order('user_nama_depan'),
      supabase.from('fpb_role_approvers').select('*'),
      supabase.from('fpb_budget_roles').select('role_id'),
      supabase.from('fpb_screener').select('*').limit(1).maybeSingle(),
    ]).then(([{ data: r }, { data: u }, { data: ra }, { data: br }, { data: sc }]) => {
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
      if (sc) { setScreenerId(String(sc.screener_role_id)); setScreenerRowId(sc.id) }
      if (r?.length) setSelRole(r[0])
      setLoading(false)
    })
  }, [])

  const updateApprover = (field, val) => {
    if (!selRole) return
    setRoleApprovers(prev => ({
      ...prev,
      [selRole.role_id]: { ...(prev[selRole.role_id] || {}), [field]: val },
    }))
  }

  const handleSave = async () => {
    if (!selRole) return
    setError('')
    const ra = roleApprovers[selRole.role_id] || {}
    if (!ra.approver1_id) { setError('Minimal 1 approver wajib diisi'); return }
    const ids = [ra.approver1_id, ra.approver2_id, ra.approver3_id].filter(Boolean)
    if (new Set(ids).size !== ids.length) { setError('Approver tidak boleh sama'); return }
    setSaving(true)
    try {
      const payload = {
        role_id:      selRole.role_id,
        approver1_id: ra.approver1_id ? parseInt(ra.approver1_id) : null,
        approver2_id: ra.approver2_id ? parseInt(ra.approver2_id) : null,
        approver3_id: ra.approver3_id ? parseInt(ra.approver3_id) : null,
      }
      const { error: err } = await supabase.from('fpb_role_approvers').upsert(payload, { onConflict: 'role_id' })
      if (err) throw err
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
      setSaved(true); setTimeout(() => setSaved(false), 3000)

      // Check how many pending FPBs have approver rows for this role that are still pending
      const newIds = [ra.approver1_id, ra.approver2_id, ra.approver3_id].filter(Boolean).map(Number)
      const { count } = await supabase
        .from('fpb_approvals')
        .select('approval_id', { count: 'exact', head: true })
        .eq('approver_role_id', selRole.role_id)
        .eq('status', 'pending')
        .eq('approver_order', 1) // only check first approver slot to count unique FPBs
      setPendingFpbCount(count || 0)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  // Re-sync approver_user_id on all pending fpb_approvals for this role
  const handleApplyPending = async () => {
    if (!selRole) return
    setApplyingPending(true)
    setError('')
    try {
      const ra = roleApprovers[selRole.role_id] || {}
      const slots = [
        { order: 1, uid: ra.approver1_id ? parseInt(ra.approver1_id) : null },
        { order: 2, uid: ra.approver2_id ? parseInt(ra.approver2_id) : null },
        { order: 3, uid: ra.approver3_id ? parseInt(ra.approver3_id) : null },
      ].filter(s => s.uid)

      for (const slot of slots) {
        await supabase
          .from('fpb_approvals')
          .update({ approver_user_id: slot.uid })
          .eq('approver_role_id', selRole.role_id)
          .eq('approver_order', slot.order)
          .eq('status', 'pending')
      }
      setAppliedPending(true)
      setPendingFpbCount(0)
      setTimeout(() => setAppliedPending(false), 4000)
    } catch (e) { setError(e.message) }
    finally { setApplyingPending(false) }
  }

  const handleSaveScreener = async () => {
    setError('')
    setSavingScreener(true)
    try {
      if (screenerId) {
        const payload = { screener_role_id: parseInt(screenerId) }
        if (screenerRowId) {
          const { error: e } = await supabase.from('fpb_screener').update(payload).eq('id', screenerRowId)
          if (e) throw e
        } else {
          const { data: ins, error: e } = await supabase.from('fpb_screener').insert(payload).select().single()
          if (e) throw e
          setScreenerRowId(ins.id)
        }
      } else {
        if (screenerRowId) await supabase.from('fpb_screener').delete().eq('id', screenerRowId)
        setScreenerRowId(null)
      }
      setSavedScreener(true); setTimeout(() => setSavedScreener(false), 3000)
    } catch (e) { setError(e.message) }
    finally { setSavingScreener(false) }
  }

  const toggleBudgetRole = (roleId) => {
    setBudgetRoleIds(prev => { const next = new Set(prev); next.has(roleId) ? next.delete(roleId) : next.add(roleId); return next })
  }

  const saveBudgetRoles = async () => {
    setSavingBudget(true)
    try {
      await supabase.from('fpb_budget_roles').delete().neq('role_id', 0)
      if (budgetRoleIds.size > 0) {
        const { error: insErr } = await supabase.from('fpb_budget_roles').insert([...budgetRoleIds].map(rid => ({ role_id: rid })))
        if (insErr) throw insErr
      }
      setSavedBudget(true); setTimeout(() => setSavedBudget(false), 3000)
    } catch (e) { setError(e.message) }
    finally { setSavingBudget(false) }
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
  const screenerRole = roles.find(r => String(r.role_id) === screenerId)
  const approverIds  = selRole ? [curRa.approver1_id, curRa.approver2_id, curRa.approver3_id].filter(Boolean) : []

  return (
    <div className="p-4">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ color: '#6366f1', fontSize: 22 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, margin: 0 }}>Pengaturan Approval FPB</h1>
        </div>
        <p style={{ fontSize: 13, color: theme.textSecondary }}>Konfigurasi screener dan approver untuk setiap jabatan pengaju</p>
      </div>

      {/* Screener Card */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border, marginBottom: 24 }}>
        <CardHeader className="pb-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 99, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <FontAwesomeIcon icon={faSearch} />
            </div>
            <div>
              <CardTitle style={{ color: theme.textPrimary, fontSize: 16 }}>Screener FPB (Global)</CardTitle>
              <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                Screener melakukan verifikasi awal sebelum FPB masuk ke approver.
                <strong style={{ color: '#d97706' }}> Berlaku untuk semua pengaju.</strong>
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: `1px solid ${screenerId ? 'rgba(245,158,11,0.4)' : theme.border}`, background: screenerId ? 'rgba(245,158,11,0.04)' : theme.subtleBg + '33', marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 99, background: screenerId ? '#d97706' : theme.subtleBg, border: `2px solid ${screenerId ? '#d97706' : theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: screenerId ? '#fff' : theme.textSecondary, fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
              🔍
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>
                Role Screener <span style={{ fontWeight: 400 }}>(opsional — jika kosong, FPB langsung ke Approver 1)</span>
              </label>
              <select value={screenerId} onChange={e => setScreenerId(e.target.value)} style={inputStyle}>
                <option value="">— Tidak ada (skip screening) —</option>
                {roles.map(r => (<option key={r.role_id} value={String(r.role_id)}>{r.role_name}</option>))}
              </select>
            </div>
            {screenerRole && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: theme.textPrimary }}>{screenerRole.role_name}</div>
                <div style={{ fontSize: 10, color: '#d97706', fontWeight: 600, marginTop: 2 }}>✓ Dipilih</div>
              </div>
            )}
          </div>
          {screenerRole && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 8, textTransform: 'uppercase' }}>Preview Alur dengan Screener</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
                <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669', fontWeight: 600 }}>Pengaju</span>
                <span style={{ color: theme.textSecondary }}>→</span>
                <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', color: '#d97706', fontWeight: 600 }}>🔍 {screenerRole.role_name}</span>
                <span style={{ color: theme.textSecondary }}>→</span>
                <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1', fontWeight: 600 }}>Approver 1, 2, ...</span>
                <span style={{ color: theme.textSecondary }}>→</span>
                <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669', fontWeight: 600 }}>Approved</span>
              </div>
            </div>
          )}
          {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleSaveScreener} disabled={savingScreener}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px', background: savedScreener ? '#059669' : savingScreener ? theme.subtleBg : 'linear-gradient(135deg,#d97706,#f59e0b)', color: savingScreener ? theme.textSecondary : '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: savingScreener ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {savingScreener ? <><FontAwesomeIcon icon={faSpinner} spin />Menyimpan...</> : savedScreener ? <><FontAwesomeIcon icon={faCheck} />Tersimpan!</> : <><FontAwesomeIcon icon={faSave} />Simpan Screener</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left: Role List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>Jabatan / Role</p>
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
                    <div style={{ fontSize: 11, marginTop: 2, color: configured ? '#059669' : '#d97706', fontWeight: 600 }}>{configured ? '✓ Terkonfigurasi' : '⚠ Belum diatur'}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right: Approver Config */}
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
                    Konfigurasi approver untuk pengaju dengan jabatan ini.
                    <strong style={{ color: '#6366f1' }}> Semua approver harus menyetujui (AND logic).</strong>
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'approver1_id', label: 'Approver 1', required: true,  desc: 'Wajib' },
                  { key: 'approver2_id', label: 'Approver 2', required: false, desc: 'Opsional' },
                  { key: 'approver3_id', label: 'Approver 3', required: false, desc: 'Opsional' },
                ].map(({ key, label, required, desc }) => {
                  const selectedUserId = curRa[key] || ''
                  const selectedUser   = users.find(u => String(u.user_id) === selectedUserId)
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: `1px solid ${selectedUserId ? 'rgba(99,102,241,0.3)' : theme.border}`, background: selectedUserId ? 'rgba(99,102,241,0.04)' : theme.subtleBg + '33', transition: 'all 0.15s' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 99, background: selectedUserId ? '#6366f1' : theme.subtleBg, border: `2px solid ${selectedUserId ? '#6366f1' : theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedUserId ? '#fff' : theme.textSecondary, fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                        {key === 'approver1_id' ? 1 : key === 'approver2_id' ? 2 : 3}
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, display: 'block', marginBottom: 5 }}>
                          {label} {required ? <span style={{ color: '#dc2626' }}>*</span> : <span style={{ fontWeight: 400 }}>(opsional)</span>}
                          <span style={{ marginLeft: 6, fontWeight: 400 }}>{desc}</span>
                        </label>
                        <select value={selectedUserId} onChange={e => updateApprover(key, e.target.value)} style={inputStyle}>
                          <option value="">— Tidak ada —</option>
                          {users.map(u => (<option key={u.user_id} value={String(u.user_id)}>{userName(u)}</option>))}
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

                {isConfigured && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 10, textTransform: 'uppercase' }}>
                      <FontAwesomeIcon icon={faUsers} style={{ marginRight: 6 }} />Preview Alur Approval
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
                      <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669', fontWeight: 600 }}>Pengaju ({selRole.role_name})</span>
                      <span style={{ color: theme.textSecondary }}>→</span>
                      {screenerRole && <>
                        <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', color: '#d97706', fontWeight: 600 }}>🔍 {screenerRole.role_name}</span>
                        <span style={{ color: theme.textSecondary }}>→</span>
                      </>}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {approverIds.map((uid, i) => {
                          const u = users.find(u => String(u.user_id) === uid)
                          return (
                            <React.Fragment key={uid}>
                              {i > 0 && <span style={{ fontSize: 11, color: theme.textSecondary, fontWeight: 700 }}>+</span>}
                              <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1', fontWeight: 600 }}>{u ? userName(u).split(' ')[0] : uid}</span>
                            </React.Fragment>
                          )
                        })}
                      </div>
                      <span style={{ color: theme.textSecondary }}>→</span>
                      <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669', fontWeight: 600 }}>Approved</span>
                    </div>
                  </div>
                )}

                {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>⚠ {error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                  <Button onClick={handleSave} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px', background: saved ? '#059669' : saving ? theme.subtleBg : 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: saving ? theme.textSecondary : '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saved || saving ? 'none' : '0 2px 12px rgba(99,102,241,0.3)', transition: 'all 0.2s' }}>
                    {saving ? <><FontAwesomeIcon icon={faSpinner} spin />Menyimpan...</> : saved ? <><FontAwesomeIcon icon={faCheck} />Tersimpan!</> : <><FontAwesomeIcon icon={faSave} />Simpan Konfigurasi</>}
                  </Button>
                </div>

                {/* Banner: apply new config to pending FPBs */}
                {pendingFpbCount !== null && pendingFpbCount > 0 && (
                  <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.35)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#b45309' }}>⚠ Ada {pendingFpbCount} FPB pending dengan approver lama</div>
                      <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 3 }}>
                        FPB yang sudah dibuat masih menggunakan konfigurasi approver sebelumnya. Klik tombol di samping untuk memperbarui.
                      </div>
                    </div>
                    <Button onClick={handleApplyPending} disabled={applyingPending}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: appliedPending ? '#059669' : applyingPending ? theme.subtleBg : 'linear-gradient(135deg,#d97706,#f59e0b)', color: applyingPending ? theme.textSecondary : '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: applyingPending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                      {applyingPending ? <><FontAwesomeIcon icon={faSpinner} spin />Menerapkan...</> : appliedPending ? <><FontAwesomeIcon icon={faCheck} />Diterapkan!</> : <>Apply ke FPB Pending</>}
                    </Button>
                  </div>
                )}
                {pendingFpbCount === 0 && appliedPending && (
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.3)', fontSize: 13, color: '#059669', fontWeight: 600 }}>
                    ✓ Semua FPB pending sudah menggunakan approver baru.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: theme.textSecondary }}>
            Pilih jabatan di sebelah kiri untuk mengkonfigurasi approver
          </div>
        )}
      </div>

      {/* FPB Repair Tool */}
      <Card style={{ background: theme.cardBg, marginTop: 24, borderColor: 'rgba(220,38,38,0.4)' }}>
        <CardHeader className="pb-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 99, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <FontAwesomeIcon icon={faWrench} />
            </div>
            <div>
              <CardTitle style={{ color: theme.textPrimary, fontSize: 16 }}>🔧 FPB Repair Tool</CardTitle>
              <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                Edit approver, status, atau reset approval untuk FPB yang sudah dibuat. Gunakan dengan hati-hati.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
            {/* Left: FPB list */}
            <div>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: theme.textSecondary, fontSize: 12, pointerEvents: 'none' }} />
                <input
                  value={repairSearch}
                  onChange={e => setRepairSearch(e.target.value)}
                  placeholder="Cari nomor FPB / pengaju..."
                  style={{ ...inputStyle, paddingLeft: 30, fontSize: 12 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                {repairLoading && !repairFpb && (
                  <div style={{ padding: 20, textAlign: 'center', color: theme.textSecondary }}>
                    <FontAwesomeIcon icon={faSpinner} spin />
                  </div>
                )}
                {filteredRepairList.map(f => {
                  const isSelected = repairFpb?.fpb_id === f.fpb_id
                  const statusColor = f.status === 'approved' ? '#059669' : f.status === 'rejected' ? '#dc2626' : f.status === 'pending' ? '#d97706' : f.status === 'revision' ? '#f59e0b' : '#6b7280'
                  return (
                    <button key={f.fpb_id} onClick={() => loadRepairFpb(f.fpb_id)}
                      style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 9, cursor: 'pointer', border: `2px solid ${isSelected ? '#dc2626' : theme.border}`, background: isSelected ? 'rgba(220,38,38,0.06)' : theme.cardBg, transition: 'all 0.15s' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: theme.textPrimary }}>{f.fpb_number || f.fpb_id}</div>
                      <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                        {`${f.users?.user_nama_depan || ''} ${f.users?.user_nama_belakang || ''}`.trim()}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: '1px 7px', borderRadius: 99 }}>{f.status}</span>
                      </div>
                    </button>
                  )
                })}
                {filteredRepairList.length === 0 && !repairLoading && (
                  <div style={{ padding: 20, textAlign: 'center', color: theme.textSecondary, fontSize: 12 }}>Tidak ada FPB ditemukan</div>
                )}
              </div>
            </div>

            {/* Right: Edit panel */}
            {repairFpb ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: theme.subtleBg, border: `1px solid ${theme.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: theme.textPrimary }}>{repairFpb.fpb_number}</div>
                    <div style={{ fontSize: 12, color: theme.textSecondary }}>
                      Pengaju: {`${repairFpb.users?.user_nama_depan || ''} ${repairFpb.users?.user_nama_belakang || ''}`.trim()}
                      {' · '}Current step: {repairFpb.current_step}
                    </div>
                  </div>
                  {/* FPB status editor */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexShrink: 0 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, display: 'block', marginBottom: 4 }}>STATUS FPB</label>
                      <select value={repairFpbStatus} onChange={e => setRepairFpbStatus(e.target.value)}
                        style={{ ...inputStyle, fontSize: 12, width: 'auto', padding: '6px 10px' }}>
                        {['pending', 'approved', 'rejected', 'revision'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, display: 'block', marginBottom: 4 }}>CURRENT STEP</label>
                      <select value={repairCurrentStep} onChange={e => setRepairCurrentStep(parseInt(e.target.value))}
                        style={{ ...inputStyle, fontSize: 12, width: 'auto', padding: '6px 10px', borderColor: '#6366f1' }}>
                        {[...new Set(repairApprovals.map(ap => ap.step_order))].sort((a,b) => a-b).map(step => (
                          <option key={step} value={step}>Step {step}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Approval rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {repairApprovals.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: theme.textSecondary, fontSize: 12 }}>Tidak ada baris approval</div>
                  )}
                  {repairApprovals.map(ap => {
                    const edit = repairApproverEdits[ap.approval_id] || {}
                    const orderLabel = ap.approver_order === 0 ? 'Screener' : `Approver ${ap.approver_order}`
                    const statusColor = edit.status === 'approved' ? '#059669' : edit.status === 'rejected' ? '#dc2626' : edit.status === 'revision' ? '#f59e0b' : '#6b7280'
                    return (
                      <div key={ap.approval_id} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.subtleBg + '44' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, whiteSpace: 'nowrap' }}>Step</span>
                            <input
                              type="number" min={0} max={99}
                              value={edit.step_order ?? ap.step_order}
                              onChange={e => setRepairApproverEdits(prev => ({ ...prev, [ap.approval_id]: { ...prev[ap.approval_id], step_order: parseInt(e.target.value) || 0 } }))}
                              style={{ width: 52, padding: '2px 6px', borderRadius: 6, border: `1px solid ${(edit.step_order ?? ap.step_order) !== ap.step_order ? '#f59e0b' : '#6366f1'}`, background: (edit.step_order ?? ap.step_order) !== ap.step_order ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.07)', color: '#6366f1', fontWeight: 800, fontSize: 12, outline: 'none', textAlign: 'center' }}
                            />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary }}>{ap.step_name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>{orderLabel}</span>
                          {ap.role?.role_name && (
                            <span style={{ fontSize: 10, color: theme.textSecondary, fontStyle: 'italic' }}>role: {ap.role.role_name}</span>
                          )}
                          {(edit.step_order ?? ap.step_order) !== ap.step_order && (
                            <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.12)', padding: '1px 7px', borderRadius: 99 }}>⚠ changed</span>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, display: 'block', marginBottom: 4 }}>APPROVER USER</label>
                            <select
                              value={edit.approver_user_id || ''}
                              onChange={e => setRepairApproverEdits(prev => ({ ...prev, [ap.approval_id]: { ...prev[ap.approval_id], approver_user_id: e.target.value } }))}
                              style={{ ...inputStyle, fontSize: 12 }}>
                              <option value="">— (null / role-based) —</option>
                              {users.map(u => (
                                <option key={u.user_id} value={String(u.user_id)}>{userName(u)}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, display: 'block', marginBottom: 4 }}>STATUS</label>
                            <select
                              value={edit.status || 'pending'}
                              onChange={e => setRepairApproverEdits(prev => ({ ...prev, [ap.approval_id]: { ...prev[ap.approval_id], status: e.target.value } }))}
                              style={{ ...inputStyle, fontSize: 12, width: 'auto', padding: '6px 10px', borderColor: statusColor }}>
                              {['pending', 'approved', 'revision', 'rejected'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {ap.comment && (
                          <div style={{ marginTop: 8, fontSize: 11, color: theme.textSecondary, fontStyle: 'italic' }}>Komentar: {ap.comment}</div>
                        )}
                        {ap.action_at && (
                          <div style={{ marginTop: 4, fontSize: 11, color: theme.textSecondary }}>Diproses: {new Date(ap.action_at).toLocaleString('id-ID')}</div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {repairError && (
                  <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>⚠ {repairError}</div>
                )}
                {repairSaved && (
                  <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669', fontSize: 13, fontWeight: 600 }}>✓ Perubahan berhasil disimpan.</div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => { setRepairFpb(null); setRepairApprovals([]); setRepairApproverEdits({}) }}
                    style={{ padding: '9px 18px', borderRadius: 9, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faTimes} style={{ marginRight: 6 }} />Tutup
                  </button>
                  <Button onClick={handleRepairSave} disabled={repairSaving}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px', background: repairSaved ? '#059669' : repairSaving ? theme.subtleBg : 'linear-gradient(135deg,#dc2626,#f87171)', color: repairSaving ? theme.textSecondary : '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: repairSaving ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                    {repairSaving ? <><FontAwesomeIcon icon={faSpinner} spin />Menyimpan...</> : repairSaved ? <><FontAwesomeIcon icon={faCheck} />Tersimpan!</> : <><FontAwesomeIcon icon={faSave} />Simpan Perubahan</>}
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: theme.textSecondary }}>
                <FontAwesomeIcon icon={faPen} style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>Pilih FPB di kiri untuk mengedit approval chain-nya</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Roles Card */}
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
              ⚠ Belum ada jabatan yang bisa mengisi budget.
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <Button onClick={saveBudgetRoles} disabled={savingBudget}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px', background: savedBudget ? '#059669' : savingBudget ? theme.subtleBg : 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: savingBudget ? theme.textSecondary : '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: savingBudget ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {savingBudget ? <><FontAwesomeIcon icon={faSpinner} spin />Menyimpan...</> : savedBudget ? <><FontAwesomeIcon icon={faCheck} />Tersimpan!</> : <><FontAwesomeIcon icon={faSave} />Simpan Hak Akses Budget</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}