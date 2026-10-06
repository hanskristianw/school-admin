'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileInvoiceDollar, faSave, faSpinner, faCheck,
  faUsers, faUserTie, faShield, faWallet, faSearch,
  faPen, faWrench, faTimes, faTrash, faExclamationTriangle,
  faCheckCircle, faInfoCircle, faChevronRight, faChevronLeft,
  faInbox, faArrowRight, faSliders, faFilter
} from '@fortawesome/free-solid-svg-icons'

const userName = (u) => u ? `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim() : '—'

export default function FpbSettingsPage() {
  const { theme, isDark } = useTheme()

  // ─── Minimalist UI Design Tokens (aligned with /data/pyp) ───────
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const cardBgAlt = isDark ? '#27272A' : '#F4F4F5'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  // Muted pastels
  const pastelGreen = {
    bg: isDark ? 'rgba(52, 211, 153, 0.12)' : '#EDF3EC',
    text: isDark ? '#34d399' : '#346538',
    border: isDark ? 'rgba(52, 211, 153, 0.25)' : '#C3E6CB'
  }
  const pastelBlue = {
    bg: isDark ? 'rgba(96, 165, 250, 0.12)' : '#E1F3FE',
    text: isDark ? '#60a5fa' : '#1F6C9F',
    border: isDark ? 'rgba(96, 165, 250, 0.25)' : '#BAE6FD'
  }
  const pastelYellow = {
    bg: isDark ? 'rgba(251, 191, 36, 0.12)' : '#FBF3DB',
    text: isDark ? '#fbbf24' : '#956400',
    border: isDark ? 'rgba(251, 191, 36, 0.25)' : '#FCE9A6'
  }
  const pastelRed = {
    bg: isDark ? 'rgba(248, 113, 113, 0.12)' : '#FDEBEC',
    text: isDark ? '#f87171' : '#9F2F2D',
    border: isDark ? 'rgba(248, 113, 113, 0.25)' : '#F8B4B4'
  }
  const pastelPurple = {
    bg: isDark ? 'rgba(167, 139, 250, 0.12)' : '#F3E8FF',
    text: isDark ? '#c084fc' : '#6B21A8',
    border: isDark ? 'rgba(167, 139, 250, 0.25)' : '#E9D5FF'
  }

  const inputStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px',
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  }

  const selectStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px',
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer'
  }

  // ─── Active Tab ──────────────────────────────────────────────────
  // 'approvers' | 'policies' | 'repair'
  const [activeTab, setActiveTab] = useState('approvers')

  // ─── Toast Notification ──────────────────────────────────────────
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── Core Data States ────────────────────────────────────────────
  const [roles, setRoles]                 = useState([])
  const [users, setUsers]                 = useState([])
  const [selRole, setSelRole]             = useState(null)
  const [roleSearch, setRoleSearch]       = useState('')
  const [roleApprovers, setRoleApprovers] = useState({})
  const [budgetRoleIds, setBudgetRoleIds] = useState(new Set())
  const [savingBudget, setSavingBudget]   = useState(false)
  const [savedBudget, setSavedBudget]     = useState(false)
  const [budgetSearch, setBudgetSearch]   = useState('')

  const [highLimitRoleIds, setHighLimitRoleIds] = useState(new Set())
  const [savingHighLimit, setSavingHighLimit]   = useState(false)
  const [savedHighLimit, setSavedHighLimit]     = useState(false)
  const [limitSearch, setLimitSearch]           = useState('')

  const [screenerId, setScreenerId]         = useState('')
  const [screenerRowId, setScreenerRowId]   = useState(null)
  const [savingScreener, setSavingScreener] = useState(false)
  const [savedScreener, setSavedScreener]   = useState(false)

  const [loading, setLoading]                 = useState(true)
  const [saving, setSaving]                   = useState(false)
  const [saved, setSaved]                     = useState(false)
  const [error, setError]                     = useState('')
  const [pendingFpbCount, setPendingFpbCount] = useState(null)
  const [applyingPending, setApplyingPending] = useState(false)
  const [appliedPending, setAppliedPending]   = useState(false)

  // ─── FPB Repair Tool States ──────────────────────────────────────
  const [repairSearch, setRepairSearch]             = useState('')
  const [repairStatusFilter, setRepairStatusFilter] = useState('all')
  const [repairList, setRepairList]                 = useState([])
  const [repairFpb, setRepairFpb]                   = useState(null)
  const [repairApprovals, setRepairApprovals]       = useState([])
  const [repairLoading, setRepairLoading]           = useState(false)
  const [repairSaving, setRepairSaving]             = useState(false)
  const [repairSaved, setRepairSaved]               = useState(false)
  const [repairError, setRepairError]               = useState('')
  const [repairFpbStatus, setRepairFpbStatus]       = useState('')
  const [repairCurrentStep, setRepairCurrentStep]   = useState(1)
  const [repairApproverEdits, setRepairApproverEdits] = useState({})

  // ─── Load Repair FPB List ────────────────────────────────────────
  const loadRepairList = useCallback(async () => {
    setRepairLoading(true)
    const { data } = await supabase
      .from('fpb')
      .select('fpb_id, fpb_number, status, current_step, submitted_by, users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang)')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
    setRepairList(data || [])
    setRepairLoading(false)
  }, [])

  useEffect(() => { loadRepairList() }, [loadRepairList])

  // ─── Load Selected FPB in Repair Tool ────────────────────────────
  const loadRepairFpb = async (fpbId) => {
    setRepairLoading(true)
    setRepairError('')
    setRepairSaved(false)
    try {
      const { data: f } = await supabase
        .from('fpb')
        .select('fpb_id, fpb_number, status, current_step, submitted_by, users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang)')
        .eq('fpb_id', fpbId)
        .single()
      setRepairFpb(f)
      setRepairFpbStatus(f.status)
      setRepairCurrentStep(f.current_step ?? 1)

      const { data: aps } = await supabase
        .from('fpb_approvals')
        .select('*, users!fpb_approvals_approver_user_id_fkey(user_nama_depan, user_nama_belakang), role!fpb_approvals_approver_role_id_fkey(role_name)')
        .eq('fpb_id', fpbId)
        .order('step_order')
        .order('approver_order')
      setRepairApprovals(aps || [])

      const edits = {}
      for (const ap of aps || []) {
        edits[ap.approval_id] = {
          approver_user_id: ap.approver_user_id ? String(ap.approver_user_id) : '',
          status: ap.status,
          step_order: ap.step_order,
        }
      }
      setRepairApproverEdits(edits)
    } catch (e) {
      setRepairError(e.message)
    } finally {
      setRepairLoading(false)
    }
  }

  // ─── Save Repair FPB ─────────────────────────────────────────────
  const handleRepairSave = async () => {
    if (!repairFpb) return
    setRepairSaving(true)
    setRepairError('')
    try {
      for (const ap of repairApprovals) {
        const edit = repairApproverEdits[ap.approval_id]
        if (!edit) continue
        const update = {
          approver_user_id: edit.approver_user_id ? parseInt(edit.approver_user_id) : null,
          status: edit.status,
          step_order: edit.step_order,
          ...(edit.status === 'pending' && ap.status !== 'pending' ? { action_at: null, comment: null } : {}),
        }
        await supabase.from('fpb_approvals').update(update).eq('approval_id', ap.approval_id)
      }

      const fpbUpdate = {}
      if (repairFpbStatus !== repairFpb.status) fpbUpdate.status = repairFpbStatus
      if (repairCurrentStep !== repairFpb.current_step) fpbUpdate.current_step = repairCurrentStep
      if (Object.keys(fpbUpdate).length > 0) {
        await supabase.from('fpb').update(fpbUpdate).eq('fpb_id', repairFpb.fpb_id)
      }

      setRepairSaved(true)
      showToast('Perubahan FPB berhasil disimpan!', 'success')
      setTimeout(() => setRepairSaved(false), 3000)
      await loadRepairFpb(repairFpb.fpb_id)
      await loadRepairList()
    } catch (e) {
      setRepairError(e.message)
      showToast(`Gagal menyimpan: ${e.message}`, 'error')
    } finally {
      setRepairSaving(false)
    }
  }

  // ─── Delete Approval Step from Repair Tool ───────────────────────
  const handleDeleteRepairStep = async (approvalId) => {
    if (!repairFpb) return
    const apToDelete = repairApprovals.find(a => a.approval_id === approvalId)
    if (!apToDelete) return
    const label = apToDelete.approver_order === 0 ? 'Screener' : `Approver ${apToDelete.approver_order}`
    if (!window.confirm(`Yakin ingin menghapus baris ${label} (Step ${apToDelete.step_order}) dari FPB ini? Tindakan ini tidak dapat dibatalkan.`)) return

    setRepairSaving(true)
    setRepairError('')
    try {
      const { error: delErr } = await supabase
        .from('fpb_approvals')
        .delete()
        .eq('approval_id', approvalId)
      if (delErr) throw delErr

      const remainingAps = repairApprovals.filter(a => a.approval_id !== approvalId)
      const remainingRegular = remainingAps.filter(a => a.approver_order !== 0)
      const allApproved = remainingRegular.length > 0 && remainingRegular.every(a => a.status === 'approved')
      const maxRemainingStep = remainingAps.reduce((max, a) => Math.max(max, a.step_order), 0)

      const fpbUpdate = {}
      if (allApproved && repairFpb.status === 'pending') {
        fpbUpdate.status = 'approved'
        fpbUpdate.current_step = maxRemainingStep
      } else if (repairCurrentStep > maxRemainingStep) {
        fpbUpdate.current_step = maxRemainingStep
      }

      if (Object.keys(fpbUpdate).length > 0) {
        await supabase.from('fpb').update(fpbUpdate).eq('fpb_id', repairFpb.fpb_id)
      }

      setRepairSaved(true)
      showToast('Baris step approval berhasil dihapus!', 'success')
      setTimeout(() => setRepairSaved(false), 3000)
      await loadRepairFpb(repairFpb.fpb_id)
      await loadRepairList()
    } catch (e) {
      setRepairError(e.message)
      showToast(`Gagal menghapus step: ${e.message}`, 'error')
    } finally {
      setRepairSaving(false)
    }
  }

  // ─── Filtered Repair FPB List ────────────────────────────────────
  const filteredRepairList = useMemo(() => {
    return repairList.filter(f => {
      if (repairStatusFilter !== 'all' && f.status !== repairStatusFilter) return false
      const q = repairSearch.toLowerCase().trim()
      if (!q) return true
      const num = (f.fpb_number || '').toLowerCase()
      const name = `${f.users?.user_nama_depan || ''} ${f.users?.user_nama_belakang || ''}`.toLowerCase()
      return num.includes(q) || name.includes(q)
    })
  }, [repairList, repairSearch, repairStatusFilter])

  // ─── Initial Data Fetch ──────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      supabase.from('role').select('role_id, role_name').order('role_name'),
      supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').eq('is_active', true).order('user_nama_depan'),
      supabase.from('fpb_role_approvers').select('*'),
      supabase.from('fpb_budget_roles').select('role_id'),
      supabase.from('fpb_screener').select('*').limit(1).maybeSingle(),
      supabase.from('settings').select('value').eq('key', 'fpb_high_limit_role_ids').maybeSingle(),
    ]).then(([{ data: r }, { data: u }, { data: ra }, { data: br }, { data: sc }, { data: hl }]) => {
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
      if (hl?.value) {
        try {
          const parsed = JSON.parse(hl.value)
          setHighLimitRoleIds(new Set(parsed))
        } catch (e) { console.error(e) }
      }
      if (r?.length) setSelRole(r[0])
      setLoading(false)
    })
  }, [])

  // ─── Approver Config Handlers ────────────────────────────────────
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
    if (!ra.approver1_id) { setError('Minimal 1 approver wajib diisi.'); return }
    const ids = [ra.approver1_id, ra.approver2_id, ra.approver3_id].filter(Boolean)
    if (new Set(ids).size !== ids.length) { setError('Approver tidak boleh orang yang sama.'); return }
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
      setSaved(true)
      showToast(`Konfigurasi approver untuk ${selRole.role_name} tersimpan.`, 'success')
      setTimeout(() => setSaved(false), 3000)

      const { count } = await supabase
        .from('fpb_approvals')
        .select('approval_id', { count: 'exact', head: true })
        .eq('approver_role_id', selRole.role_id)
        .eq('status', 'pending')
        .eq('approver_order', 1)
      setPendingFpbCount(count || 0)
    } catch (e) {
      setError(e.message)
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Apply Pending Handler ───────────────────────────────────────
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

      const maxOrder = slots.reduce((max, s) => Math.max(max, s.order), 0)
      if (maxOrder > 0) {
        const { data: orphanedRows } = await supabase
          .from('fpb_approvals')
          .select('approval_id, fpb_id')
          .eq('approver_role_id', selRole.role_id)
          .gt('approver_order', maxOrder)
          .eq('status', 'pending')

        if (orphanedRows && orphanedRows.length > 0) {
          const orphanedIds = orphanedRows.map(r => r.approval_id)
          const affectedFpbIds = [...new Set(orphanedRows.map(r => r.fpb_id))]

          await supabase
            .from('fpb_approvals')
            .delete()
            .in('approval_id', orphanedIds)

          for (const fpbId of affectedFpbIds) {
            const { data: remainingAps } = await supabase
              .from('fpb_approvals')
              .select('step_order, approver_order, status')
              .eq('fpb_id', fpbId)

            const regular = (remainingAps || []).filter(a => a.approver_order !== 0)
            const allDone = regular.length > 0 && regular.every(a => a.status === 'approved')
            const maxStep = (remainingAps || []).reduce((max, a) => Math.max(max, a.step_order), 0)

            if (allDone) {
              await supabase
                .from('fpb')
                .update({ status: 'approved', current_step: maxStep })
                .eq('fpb_id', fpbId)
            }
          }
        }
      }

      setAppliedPending(true)
      setPendingFpbCount(0)
      showToast('Konfigurasi berhasil diterapkan ke seluruh FPB pending.', 'success')
      setTimeout(() => setAppliedPending(false), 4000)
    } catch (e) {
      setError(e.message)
      showToast(`Gagal: ${e.message}`, 'error')
    } finally {
      setApplyingPending(false)
    }
  }

  // ─── Screener Save Handler ───────────────────────────────────────
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
      setSavedScreener(true)
      showToast('Role Screener berhasil diperbarui.', 'success')
      setTimeout(() => setSavedScreener(false), 3000)
    } catch (e) {
      setError(e.message)
      showToast(`Gagal menyimpan screener: ${e.message}`, 'error')
    } finally {
      setSavingScreener(false)
    }
  }

  // ─── Budget Roles Handlers ───────────────────────────────────────
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
      await supabase.from('fpb_budget_roles').delete().neq('role_id', 0)
      if (budgetRoleIds.size > 0) {
        const { error: insErr } = await supabase.from('fpb_budget_roles').insert([...budgetRoleIds].map(rid => ({ role_id: rid })))
        if (insErr) throw insErr
      }
      setSavedBudget(true)
      showToast('Hak akses edit budget berhasil disimpan.', 'success')
      setTimeout(() => setSavedBudget(false), 3000)
    } catch (e) {
      setError(e.message)
      showToast(`Gagal: ${e.message}`, 'error')
    } finally {
      setSavingBudget(false)
    }
  }

  // ─── High Limit Roles Handlers ───────────────────────────────────
  const toggleHighLimitRole = (roleId) => {
    setHighLimitRoleIds(prev => {
      const next = new Set(prev)
      next.has(roleId) ? next.delete(roleId) : next.add(roleId)
      return next
    })
  }

  const saveHighLimitRoles = async () => {
    setSavingHighLimit(true)
    try {
      const payload = {
        key: 'fpb_high_limit_role_ids',
        value: JSON.stringify([...highLimitRoleIds]),
        description: 'Role IDs allowed to create FPBs up to Rp 2,000,000',
        updated_at: new Date().toISOString(),
      }
      const { error: err } = await supabase.from('settings').upsert(payload, { onConflict: 'key' })
      if (err) throw err
      setSavedHighLimit(true)
      showToast('Pengaturan limit nominal berhasil disimpan.', 'success')
      setTimeout(() => setSavedHighLimit(false), 3000)
    } catch (e) {
      setError(e.message)
      showToast(`Gagal: ${e.message}`, 'error')
    } finally {
      setSavingHighLimit(false)
    }
  }

  // ─── Filtered Role Lists ─────────────────────────────────────────
  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles
    const q = roleSearch.toLowerCase()
    return roles.filter(r => r.role_name.toLowerCase().includes(q))
  }, [roles, roleSearch])

  const filteredBudgetRoles = useMemo(() => {
    if (!budgetSearch.trim()) return roles
    const q = budgetSearch.toLowerCase()
    return roles.filter(r => r.role_name.toLowerCase().includes(q))
  }, [roles, budgetSearch])

  const filteredLimitRoles = useMemo(() => {
    if (!limitSearch.trim()) return roles
    const q = limitSearch.toLowerCase()
    return roles.filter(r => r.role_name.toLowerCase().includes(q))
  }, [roles, limitSearch])

  // ─── Computed Variables ──────────────────────────────────────────
  const curRa = selRole ? (roleApprovers[selRole.role_id] || {}) : {}
  const isConfigured = !!curRa.approver1_id
  const screenerRole = roles.find(r => String(r.role_id) === screenerId)
  const approverIds  = selRole ? [curRa.approver1_id, curRa.approver2_id, curRa.approver3_id].filter(Boolean) : []
  const configuredRolesCount = roles.filter(r => roleApprovers[r.role_id]?.approver1_id).length

  // ─── Loading View ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: pageBg, minHeight: '100vh', padding: '48px 32px', color: textPrimary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '24px', color: textSecondary }} />
        <p style={{ margin: 0, fontSize: '13px', color: textSecondary }}>Memuat konfigurasi FPB...</p>
      </div>
    )
  }

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      
      {/* ── TOAST NOTIFICATION ──────────────────────────────────────── */}
      {toast && (
        <div 
          className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded text-xs font-mono flex items-center gap-2 border animate-in fade-in slide-in-from-top-2"
          style={{
            background: toast.type === 'error' ? pastelRed.bg : pastelGreen.bg,
            borderColor: toast.type === 'error' ? pastelRed.border : pastelGreen.border,
            color: toast.type === 'error' ? pastelRed.text : pastelGreen.text,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
          }}
        >
          <FontAwesomeIcon icon={toast.type === 'error' ? faExclamationTriangle : faCheckCircle} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER & BREADCRUMBS (MATCHING /DATA/PYP LAYOUT) ─────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[SETTINGS]</span>
            <span>/</span>
            <span>[OPERATIONAL &amp; FINANCE]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[FPB APPROVALS]</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center border" style={{ background: pastelBlue.bg, borderColor: pastelBlue.border, color: pastelBlue.text }}>
              <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Pengaturan Approval &amp; Kebijakan FPB
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION (MATCHING /DATA/PYP STYLE) ────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* TAB 1: Alur Approver & Screener */}
        <button
          onClick={() => setActiveTab('approvers')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'approvers' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'approvers' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'approvers' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faShield} style={{ fontSize: '13px' }} />
          <span>Alur Approver &amp; Screener</span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary }}>
            {configuredRolesCount}/{roles.length}
          </span>
        </button>

        {/* TAB 2: Kebijakan & Hak Akses */}
        <button
          onClick={() => setActiveTab('policies')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'policies' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'policies' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'policies' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faWallet} style={{ fontSize: '13px' }} />
          <span>Kebijakan &amp; Hak Akses</span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary }}>
            {budgetRoleIds.size} budget · {highLimitRoleIds.size} limit
          </span>
        </button>

        {/* TAB 3: Perbaikan FPB (Repair Tool) */}
        <button
          onClick={() => setActiveTab('repair')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'repair' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'repair' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'repair' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faWrench} style={{ fontSize: '13px' }} />
          <span>Perbaikan FPB (Repair Tool)</span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary }}>
            {repairList.length}
          </span>
        </button>

      </div>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* TAB 1: ALUR APPROVER & SCREENER                                 */}
      {/* ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'approvers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SCREENER GLOBAL BENTO CARD */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '20px' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: pastelBlue.bg, color: pastelBlue.text, fontFamily: 'monospace' }}>
                    TAHAP 0 · GLOBAL
                  </span>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: textPrimary }}>
                    Screener FPB (Verifikasi Awal)
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: textSecondary, margin: 0 }}>
                  Screener melakukan verifikasi kelayakan sebelum FPB diteruskan ke Approver 1. Berlaku untuk seluruh pengaju.
                </p>
              </div>

              <button
                onClick={handleSaveScreener}
                disabled={savingScreener}
                style={{
                  background: savedScreener ? pastelGreen.text : textPrimary,
                  color: isDark ? '#09090B' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  cursor: savingScreener ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  alignSelf: 'flex-start'
                }}
              >
                {savingScreener ? (
                  <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</>
                ) : savedScreener ? (
                  <><FontAwesomeIcon icon={faCheck} /> Tersimpan!</>
                ) : (
                  <><FontAwesomeIcon icon={faSave} /> Simpan Screener</>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-3 border-t" style={{ borderColor }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: '6px' }}>
                  Role Screener <span style={{ fontWeight: 400 }}>(kosongkan jika verifikasi awal di-skip)</span>
                </label>
                <select
                  value={screenerId}
                  onChange={e => setScreenerId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">— Tidak ada (Langsung ke Approver 1) —</option>
                  {roles.map(r => (
                    <option key={r.role_id} value={String(r.role_id)}>{r.role_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, marginBottom: '6px' }}>
                  Status Alur Screening
                </div>
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: isDark ? '#27272A' : '#F9F9F8', border: `1px solid ${borderColor}`, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {screenerRole ? (
                    <>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pastelBlue.text }}></span>
                      <span style={{ color: textPrimary, fontWeight: 500 }}>
                        Aktif: <strong>{screenerRole.role_name}</strong>
                      </span>
                      <span style={{ fontSize: '10px', color: pastelBlue.text, background: pastelBlue.bg, padding: '1px 6px', borderRadius: '4px', marginLeft: 'auto', fontWeight: 600 }}>
                        Wajib Verifikasi
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: textSecondary }}></span>
                      <span style={{ color: textSecondary }}>
                        Screening non-aktif (FPB langsung ke Approver 1)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* APPROVER PER JABATAN (2-COLUMN BENTO LAYOUT) */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
            
            {/* LEFT COLUMN: ROLE SELECTOR & SEARCH */}
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, margin: 0 }}>
                    Daftar Jabatan
                  </h4>
                  <span style={{ fontSize: '11px', color: textSecondary, fontFamily: 'monospace' }}>
                    {roles.length} total
                  </span>
                </div>
                
                <div style={{ position: 'relative' }}>
                  <FontAwesomeIcon
                    icon={faSearch}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: textSecondary, fontSize: '11px', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    value={roleSearch}
                    onChange={e => setRoleSearch(e.target.value)}
                    placeholder="Cari jabatan..."
                    style={{ ...inputStyle, paddingLeft: '28px', paddingRight: roleSearch ? '28px' : '10px', fontSize: '12px', height: '32px' }}
                  />
                  {roleSearch && (
                    <button
                      onClick={() => setRoleSearch('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', fontSize: '11px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Roles List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '520px', overflowY: 'auto' }}>
                {filteredRoles.map(r => {
                  const ra = roleApprovers[r.role_id]
                  const configured = !!ra?.approver1_id
                  const isSelected = selRole?.role_id === r.role_id
                  const approverCount = [ra?.approver1_id, ra?.approver2_id, ra?.approver3_id].filter(Boolean).length

                  return (
                    <button
                      key={r.role_id}
                      onClick={() => { setSelRole(r); setError(''); setSaved(false) }}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: `1px solid ${isSelected ? textPrimary : borderColor}`,
                        background: isSelected ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: isSelected ? 600 : 500, fontSize: '12px', color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.role_name}
                        </div>
                      </div>

                      {configured ? (
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelGreen.bg, color: pastelGreen.text, whiteSpace: 'nowrap' }}>
                          {approverCount} Approver
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 6px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, whiteSpace: 'nowrap' }}>
                          Kosong
                        </span>
                      )}
                    </button>
                  )
                })}

                {filteredRoles.length === 0 && (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: textSecondary, fontSize: '12px' }}>
                    Jabatan &ldquo;{roleSearch}&rdquo; tidak ditemukan.
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: APPROVER CONFIGURATION FORM */}
            {selRole ? (
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '24px' }}>
                
                {/* Form Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b mb-6" style={{ borderColor }}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, fontFamily: 'monospace' }}>
                        ID #{selRole.role_id}
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: textPrimary }}>
                        {selRole.role_name}
                      </h3>
                    </div>
                    <p style={{ fontSize: '12px', color: textSecondary, margin: 0 }}>
                      Konfigurasi persetujuan berjenjang untuk pemohon dengan jabatan ini. Semua approver harus menyetujui (AND logic).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        background: saved ? pastelGreen.text : textPrimary,
                        color: isDark ? '#09090B' : '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '8px 18px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {saving ? (
                        <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</>
                      ) : saved ? (
                        <><FontAwesomeIcon icon={faCheck} /> Tersimpan!</>
                      ) : (
                        <><FontAwesomeIcon icon={faSave} /> Simpan Konfigurasi</>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3 Approver Slots */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                  {[
                    { key: 'approver1_id', label: 'Approver 1', required: true, desc: 'Wajib diisi (Tier Pertama)' },
                    { key: 'approver2_id', label: 'Approver 2', required: false, desc: 'Opsional (Tier Kedua)' },
                    { key: 'approver3_id', label: 'Approver 3', required: false, desc: 'Opsional (Tier Ketiga)' },
                  ].map(({ key, label, required, desc }, idx) => {
                    const selectedUserId = curRa[key] || ''
                    const selectedUser   = users.find(u => String(u.user_id) === selectedUserId)

                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '14px 16px',
                          borderRadius: '8px',
                          border: `1px solid ${selectedUserId ? borderColor : borderColor}`,
                          background: isDark ? '#202023' : '#FBFBFA',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Step Number Badge */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: selectedUserId ? textPrimary : (isDark ? '#27272A' : '#E5E5E5'),
                            color: selectedUserId ? (isDark ? '#09090B' : '#FFFFFF') : textSecondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            flexShrink: 0
                          }}
                        >
                          {idx + 1}
                        </div>

                        {/* Input Area */}
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <label style={{ fontSize: '11px', fontWeight: 600, color: textPrimary }}>
                              {label} {required ? <span style={{ color: pastelRed.text }}>*</span> : <span style={{ color: textSecondary, fontWeight: 400 }}>(opsional)</span>}
                            </label>
                            <span style={{ fontSize: '10px', color: textSecondary }}>
                              {desc}
                            </span>
                          </div>

                          <select
                            value={selectedUserId}
                            onChange={e => updateApprover(key, e.target.value)}
                            style={{ ...selectStyle, fontSize: '12px' }}
                          >
                            <option value="">— Tidak ada —</option>
                            {users.map(u => (
                              <option key={u.user_id} value={String(u.user_id)}>{userName(u)}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selected Indicator */}
                        {selectedUser && (
                          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: pastelGreen.bg, color: pastelGreen.text }}>
                              ✓ Terpilih
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Pipeline Flow Visualizer */}
                <div style={{ padding: '14px 18px', borderRadius: '8px', background: isDark ? '#202023' : '#F9F9F8', border: `1px solid ${borderColor}`, marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    PREVIEW ALUR PENGAJUAN FPB
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span style={{ padding: '4px 10px', borderRadius: '9999px', background: pastelGreen.bg, border: `1px solid ${pastelGreen.border}`, color: pastelGreen.text, fontWeight: 600 }}>
                      Pengaju: {selRole.role_name}
                    </span>
                    <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', color: textSecondary }} />
                    {screenerRole && (
                      <>
                        <span style={{ padding: '4px 10px', borderRadius: '9999px', background: pastelBlue.bg, border: `1px solid ${pastelBlue.border}`, color: pastelBlue.text, fontWeight: 600 }}>
                          🔍 Screener: {screenerRole.role_name}
                        </span>
                        <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', color: textSecondary }} />
                      </>
                    )}
                    {approverIds.length > 0 ? (
                      approverIds.map((uid, i) => {
                        const u = users.find(u => String(u.user_id) === uid)
                        return (
                          <React.Fragment key={uid}>
                            {i > 0 && <span style={{ fontSize: '11px', color: textSecondary, fontWeight: 700 }}>+</span>}
                            <span style={{ padding: '4px 10px', borderRadius: '9999px', background: pastelPurple.bg, border: `1px solid ${pastelPurple.border}`, color: pastelPurple.text, fontWeight: 600 }}>
                              Step {i + 1}: {u ? userName(u).split(' ')[0] : uid}
                            </span>
                          </React.Fragment>
                        )
                      })
                    ) : (
                      <span style={{ padding: '4px 10px', borderRadius: '9999px', background: pastelYellow.bg, border: `1px solid ${pastelYellow.border}`, color: pastelYellow.text, fontWeight: 600 }}>
                        Belum ada approver
                      </span>
                    )}
                    <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', color: textSecondary }} />
                    <span style={{ padding: '4px 10px', borderRadius: '9999px', background: pastelGreen.bg, border: `1px solid ${pastelGreen.border}`, color: pastelGreen.text, fontWeight: 600 }}>
                      ✓ Approved
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '6px', background: pastelRed.bg, border: `1px solid ${pastelRed.border}`, color: pastelRed.text, fontSize: '12px' }}>
                    ⚠ {error}
                  </div>
                )}

                {/* Sync to Pending FPBs Banner */}
                {pendingFpbCount !== null && pendingFpbCount > 0 && (
                  <div style={{ padding: '14px 16px', borderRadius: '8px', background: pastelYellow.bg, border: `1px solid ${pastelYellow.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: pastelYellow.text }}>
                        ⚠ Ada {pendingFpbCount} FPB pending dengan konfigurasi approver lama
                      </div>
                      <div style={{ fontSize: '12px', color: textSecondary, marginTop: '2px' }}>
                        Terapkan konfigurasi baru untuk memperbarui approver pada FPB yang belum selesai.
                      </div>
                    </div>
                    <button
                      onClick={handleApplyPending}
                      disabled={applyingPending}
                      style={{
                        background: textPrimary,
                        color: isDark ? '#09090B' : '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '8px 16px',
                        cursor: applyingPending ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {applyingPending ? <><FontAwesomeIcon icon={faSpinner} spin /> Menerapkan...</> : appliedPending ? <><FontAwesomeIcon icon={faCheck} /> Diterapkan!</> : 'Terapkan ke Semua FPB Pending'}
                    </button>
                  </div>
                )}

                {pendingFpbCount === 0 && appliedPending && (
                  <div style={{ padding: '10px 14px', borderRadius: '6px', background: pastelGreen.bg, border: `1px solid ${pastelGreen.border}`, fontSize: '12px', color: pastelGreen.text, fontWeight: 600 }}>
                    ✓ Seluruh FPB pending kini telah menggunakan konfigurasi approver terbaru.
                  </div>
                )}

              </div>
            ) : (
              <div style={{ background: cardBg, border: `1px dashed ${borderColor}`, borderRadius: '10px', padding: '60px 20px', textAlign: 'center', color: textSecondary }}>
                <FontAwesomeIcon icon={faUserTie} style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Pilih jabatan di sebelah kiri untuk mengkonfigurasi approver.</p>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* TAB 2: KEBIJAKAN & HAK AKSES                                    */}
      {/* ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* CARD 1: HAK AKSES EDIT BUDGET */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '24px' }}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b mb-5" style={{ borderColor }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded flex items-center justify-center border" style={{ background: pastelBlue.bg, borderColor: pastelBlue.border, color: pastelBlue.text }}>
                    <FontAwesomeIcon icon={faWallet} style={{ fontSize: '12px' }} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: textPrimary }}>
                    Hak Akses Edit Budget FPB
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: textSecondary, margin: '4px 0 0 0' }}>
                  Pilih jabatan yang berhak mengisi dan memperbarui kolom <strong>Budget</strong> dan <strong>Remaining Budget</strong> pada FPB.
                </p>
              </div>

              <button
                onClick={saveBudgetRoles}
                disabled={savingBudget}
                style={{
                  background: savedBudget ? pastelGreen.text : textPrimary,
                  color: isDark ? '#09090B' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  cursor: savingBudget ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                {savingBudget ? (
                  <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</>
                ) : savedBudget ? (
                  <><FontAwesomeIcon icon={faCheck} /> Tersimpan!</>
                ) : (
                  <><FontAwesomeIcon icon={faSave} /> Simpan Hak Akses</>
                )}
              </button>
            </div>

            {/* Quick search input */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: textSecondary, fontSize: '11px', pointerEvents: 'none' }} />
              <input
                type="text"
                value={budgetSearch}
                onChange={e => setBudgetSearch(e.target.value)}
                placeholder="Cari jabatan..."
                style={{ ...inputStyle, paddingLeft: '28px', fontSize: '12px', height: '32px' }}
              />
            </div>

            {/* Grid of Role Checkbox Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', maxHeight: '380px', overflowY: 'auto', marginBottom: '16px' }}>
              {filteredBudgetRoles.map(r => {
                const checked = budgetRoleIds.has(r.role_id)
                return (
                  <label
                    key={r.role_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: `1px solid ${checked ? textPrimary : borderColor}`,
                      background: checked ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                      transition: 'all 0.15s ease',
                      userSelect: 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBudgetRole(r.role_id)}
                      style={{ width: '15px', height: '15px', accentColor: textPrimary, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: checked ? 600 : 500, fontSize: '12px', color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.role_name}
                      </div>
                      {checked && (
                        <div style={{ fontSize: '10px', color: pastelBlue.text, fontWeight: 600, marginTop: '2px' }}>
                          ✓ Bisa edit budget
                        </div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Summary Tag */}
            <div style={{ padding: '10px 14px', borderRadius: '6px', background: isDark ? '#202023' : '#F9F9F8', border: `1px solid ${borderColor}`, fontSize: '12px', color: textSecondary }}>
              {budgetRoleIds.size > 0 ? (
                <>
                  <strong style={{ color: textPrimary }}>{budgetRoleIds.size} jabatan</strong> saat ini memiliki hak akses untuk mengedit data Budget FPB.
                </>
              ) : (
                <span style={{ color: pastelRed.text }}>
                  ⚠ Belum ada jabatan yang dipilih untuk mengedit budget.
                </span>
              )}
            </div>
          </div>

          {/* CARD 2: EXTENDED NOMINAL LIMIT (> 600K - 2 JUTA) */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '24px' }}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b mb-5" style={{ borderColor }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded flex items-center justify-center border" style={{ background: pastelGreen.bg, borderColor: pastelGreen.border, color: pastelGreen.text }}>
                    <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ fontSize: '12px' }} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: textPrimary }}>
                    Limit Nominal Extended (s.d. Rp 2.000.000)
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: textSecondary, margin: '4px 0 0 0' }}>
                  Pilih jabatan yang diizinkan mengajukan FPB dengan total nominal <strong>Rp 600.000 – Rp 2.000.000</strong>. Role lainnya dibatasi maksimal <strong>Rp 600.000</strong>.
                </p>
              </div>

              <button
                onClick={saveHighLimitRoles}
                disabled={savingHighLimit}
                style={{
                  background: savedHighLimit ? pastelGreen.text : textPrimary,
                  color: isDark ? '#09090B' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  cursor: savingHighLimit ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                {savingHighLimit ? (
                  <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</>
                ) : savedHighLimit ? (
                  <><FontAwesomeIcon icon={faCheck} /> Tersimpan!</>
                ) : (
                  <><FontAwesomeIcon icon={faSave} /> Simpan Limit</>
                )}
              </button>
            </div>

            {/* Quick search input */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: textSecondary, fontSize: '11px', pointerEvents: 'none' }} />
              <input
                type="text"
                value={limitSearch}
                onChange={e => setLimitSearch(e.target.value)}
                placeholder="Cari jabatan..."
                style={{ ...inputStyle, paddingLeft: '28px', fontSize: '12px', height: '32px' }}
              />
            </div>

            {/* Grid of Role Checkbox Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', maxHeight: '380px', overflowY: 'auto', marginBottom: '16px' }}>
              {filteredLimitRoles.map(r => {
                const checked = highLimitRoleIds.has(r.role_id)
                return (
                  <label
                    key={r.role_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: `1px solid ${checked ? textPrimary : borderColor}`,
                      background: checked ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                      transition: 'all 0.15s ease',
                      userSelect: 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHighLimitRole(r.role_id)}
                      style={{ width: '15px', height: '15px', accentColor: textPrimary, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: checked ? 600 : 500, fontSize: '12px', color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.role_name}
                      </div>
                      {checked ? (
                        <div style={{ fontSize: '10px', color: pastelGreen.text, fontWeight: 600, marginTop: '2px' }}>
                          ✓ Limit s.d. Rp 2.000.000
                        </div>
                      ) : (
                        <div style={{ fontSize: '10px', color: textSecondary, marginTop: '2px' }}>
                          Maksimal Rp 600.000
                        </div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Summary Tag */}
            <div style={{ padding: '10px 14px', borderRadius: '6px', background: isDark ? '#202023' : '#F9F9F8', border: `1px solid ${borderColor}`, fontSize: '12px', color: textSecondary }}>
              {highLimitRoleIds.size > 0 ? (
                <>
                  <strong style={{ color: textPrimary }}>{highLimitRoleIds.size} jabatan</strong> memiliki batas limit s.d. Rp 2.000.000. Jabatan lainnya dibatasi Rp 600.000.
                </>
              ) : (
                <span>
                  Seluruh jabatan saat ini dibatasi maksimal <strong>Rp 600.000</strong>.
                </span>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* TAB 3: PERBAIKAN FPB (REPAIR TOOL)                              */}
      {/* ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'repair' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Informational Guidance Banner */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="w-8 h-8 rounded flex items-center justify-center border flex-shrink-0" style={{ background: pastelYellow.bg, borderColor: pastelYellow.border, color: pastelYellow.text }}>
              <FontAwesomeIcon icon={faWrench} style={{ fontSize: '13px' }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: textPrimary }}>
                Alat Audit &amp; Perbaikan Alur Persetujuan FPB
              </div>
              <div style={{ fontSize: '12px', color: textSecondary, marginTop: '2px' }}>
                Perbaiki approver yang kosong, urutan step yang keliru, reset status step ke pending, atau hapus step berlebih/orphan pada dokumen FPB tertentu.
              </div>
            </div>
          </div>

          {/* 2-Column Repair Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
            
            {/* LEFT COLUMN: FPB SEARCH & LIST */}
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, margin: 0 }}>
                    Pilih Dokumen FPB
                  </h4>
                  <span style={{ fontSize: '11px', color: textSecondary, fontFamily: 'monospace' }}>
                    {filteredRepairList.length} dari {repairList.length}
                  </span>
                </div>

                {/* Search Input */}
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: textSecondary, fontSize: '11px', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={repairSearch}
                    onChange={e => setRepairSearch(e.target.value)}
                    placeholder="Nomor FPB atau nama pengaju..."
                    style={{ ...inputStyle, paddingLeft: '28px', paddingRight: repairSearch ? '28px' : '10px', fontSize: '12px', height: '32px' }}
                  />
                  {repairSearch && (
                    <button
                      onClick={() => setRepairSearch('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', fontSize: '11px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter Pills */}
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'approved', label: 'Approved' },
                    { id: 'revision', label: 'Revision' },
                    { id: 'rejected', label: 'Rejected' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setRepairStatusFilter(tab.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: repairStatusFilter === tab.id ? 600 : 400,
                        border: 'none',
                        borderRadius: '4px',
                        background: repairStatusFilter === tab.id ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                        color: repairStatusFilter === tab.id ? textPrimary : textSecondary,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FPB Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '560px', overflowY: 'auto' }}>
                {repairLoading && !repairFpb && (
                  <div style={{ padding: '24px', textAlign: 'center', color: textSecondary, fontSize: '12px' }}>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '6px' }} />
                    Memuat daftar FPB...
                  </div>
                )}

                {filteredRepairList.map(f => {
                  const isSelected = repairFpb?.fpb_id === f.fpb_id
                  const statusPastel = 
                    f.status === 'approved' ? pastelGreen :
                    f.status === 'rejected' ? pastelRed :
                    f.status === 'pending' ? pastelYellow :
                    pastelPurple

                  return (
                    <button
                      key={f.fpb_id}
                      onClick={() => loadRepairFpb(f.fpb_id)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: `1px solid ${isSelected ? textPrimary : borderColor}`,
                        background: isSelected ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span style={{ fontWeight: 600, fontSize: '12px', color: textPrimary, fontFamily: 'monospace' }}>
                          {f.fpb_number || `FPB #${f.fpb_id}`}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: statusPastel.bg, color: statusPastel.text, textTransform: 'capitalize' }}>
                          {f.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]" style={{ color: textSecondary }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {`${f.users?.user_nama_depan || ''} ${f.users?.user_nama_belakang || ''}`.trim() || '—'}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                          Step {f.current_step ?? 1}
                        </span>
                      </div>
                    </button>
                  )
                })}

                {filteredRepairList.length === 0 && !repairLoading && (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: textSecondary, fontSize: '12px' }}>
                    Tidak ada FPB yang sesuai kriteria pencarian.
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: FPB INSPECTION & STEP EDITOR */}
            {repairFpb ? (
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '24px' }}>
                
                {/* Header of selected FPB */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b mb-6" style={{ borderColor }}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary, fontFamily: 'monospace' }}>
                        ID #{repairFpb.fpb_id}
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: textPrimary, fontFamily: 'monospace' }}>
                        {repairFpb.fpb_number}
                      </h3>
                    </div>
                    <p style={{ fontSize: '12px', color: textSecondary, margin: 0 }}>
                      Pengaju: <strong>{`${repairFpb.users?.user_nama_depan || ''} ${repairFpb.users?.user_nama_belakang || ''}`.trim()}</strong>
                    </p>
                  </div>

                  {/* FPB Status & Current Step controls */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                        STATUS FPB
                      </label>
                      <select
                        value={repairFpbStatus}
                        onChange={e => setRepairFpbStatus(e.target.value)}
                        style={{ ...selectStyle, fontSize: '12px', padding: '6px 10px', width: 'auto' }}
                      >
                        {['pending', 'approved', 'rejected', 'revision'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                        CURRENT STEP
                      </label>
                      <select
                        value={repairCurrentStep}
                        onChange={e => setRepairCurrentStep(parseInt(e.target.value))}
                        style={{ ...selectStyle, fontSize: '12px', padding: '6px 10px', width: 'auto' }}
                      >
                        {[...new Set(repairApprovals.map(ap => ap.step_order))].sort((a,b) => a-b).map(step => (
                          <option key={step} value={step}>Step {step}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Approval Chain List */}
                <div style={{ marginBottom: '24px' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, margin: 0 }}>
                      Rantai Step Persetujuan ({repairApprovals.length} Step)
                    </h4>
                    <span style={{ fontSize: '11px', color: textSecondary }}>
                      Edit approver, status, atau urutan step di bawah
                    </span>
                  </div>

                  {repairApprovals.length === 0 ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: textSecondary, border: `1px dashed ${borderColor}`, borderRadius: '8px', fontSize: '13px' }}>
                      Tidak ada baris approval untuk FPB ini.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {repairApprovals.map(ap => {
                        const edit = repairApproverEdits[ap.approval_id] || {}
                        const orderLabel = ap.approver_order === 0 ? 'Screener' : `Approver ${ap.approver_order}`
                        const statusPastel = 
                          edit.status === 'approved' ? pastelGreen :
                          edit.status === 'rejected' ? pastelRed :
                          edit.status === 'pending' ? pastelYellow :
                          pastelPurple

                        return (
                          <div
                            key={ap.approval_id}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '8px',
                              border: `1px solid ${borderColor}`,
                              background: isDark ? '#202023' : '#FBFBFA'
                            }}
                          >
                            {/* Step meta row */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span style={{ fontSize: '11px', fontWeight: 600, color: textSecondary }}>Step</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={99}
                                  value={edit.step_order ?? ap.step_order}
                                  onChange={e => setRepairApproverEdits(prev => ({
                                    ...prev,
                                    [ap.approval_id]: { ...prev[ap.approval_id], step_order: parseInt(e.target.value) || 0 }
                                  }))}
                                  style={{
                                    width: '48px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: `1px solid ${(edit.step_order ?? ap.step_order) !== ap.step_order ? pastelYellow.border : borderColor}`,
                                    background: isDark ? '#27272A' : '#FFFFFF',
                                    color: textPrimary,
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    outline: 'none'
                                  }}
                                />
                              </div>

                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textPrimary }}>
                                {ap.step_name}
                              </span>

                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: ap.approver_order === 0 ? pastelBlue.bg : pastelYellow.bg, color: ap.approver_order === 0 ? pastelBlue.text : pastelYellow.text }}>
                                {orderLabel}
                              </span>

                              {ap.role?.role_name && (
                                <span style={{ fontSize: '11px', color: textSecondary, fontStyle: 'italic' }}>
                                  role: {ap.role.role_name}
                                </span>
                              )}

                              {(edit.step_order ?? ap.step_order) !== ap.step_order && (
                                <span style={{ fontSize: '10px', color: pastelYellow.text, fontWeight: 600, background: pastelYellow.bg, padding: '1px 6px', borderRadius: '4px' }}>
                                  diubah
                                </span>
                              )}

                              {/* Hapus Step Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteRepairStep(ap.approval_id)}
                                disabled={repairSaving}
                                style={{
                                  marginLeft: 'auto',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: pastelRed.bg,
                                  border: `1px solid ${pastelRed.border}`,
                                  color: pastelRed.text,
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: repairSaving ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                title="Hapus baris step approval ini"
                              >
                                <FontAwesomeIcon icon={faTrash} style={{ fontSize: '10px' }} />
                                Hapus Step
                              </button>
                            </div>

                            {/* Dropdown controls */}
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                              <div>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                                  APPROVER USER
                                </label>
                                <select
                                  value={edit.approver_user_id || ''}
                                  onChange={e => setRepairApproverEdits(prev => ({
                                    ...prev,
                                    [ap.approval_id]: { ...prev[ap.approval_id], approver_user_id: e.target.value }
                                  }))}
                                  style={{ ...selectStyle, fontSize: '12px' }}
                                >
                                  <option value="">— (null / role-based) —</option>
                                  {users.map(u => (
                                    <option key={u.user_id} value={String(u.user_id)}>{userName(u)}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                                  STATUS STEP
                                </label>
                                <select
                                  value={edit.status || 'pending'}
                                  onChange={e => setRepairApproverEdits(prev => ({
                                    ...prev,
                                    [ap.approval_id]: { ...prev[ap.approval_id], status: e.target.value }
                                  }))}
                                  style={{ ...selectStyle, fontSize: '12px', width: 'auto', minWidth: '110px' }}
                                >
                                  {['pending', 'approved', 'revision', 'rejected'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Comment and timestamp metadata */}
                            {ap.comment && (
                              <div style={{ marginTop: '8px', fontSize: '11px', color: textSecondary, fontStyle: 'italic' }}>
                                Komentar: &ldquo;{ap.comment}&rdquo;
                              </div>
                            )}
                            {ap.action_at && (
                              <div style={{ marginTop: '4px', fontSize: '10px', color: textSecondary, fontFamily: 'monospace' }}>
                                Diproses: {new Date(ap.action_at).toLocaleString('id-ID')}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {repairError && (
                  <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '6px', background: pastelRed.bg, border: `1px solid ${pastelRed.border}`, color: pastelRed.text, fontSize: '12px' }}>
                    ⚠ {repairError}
                  </div>
                )}

                {/* Bottom Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor }}>
                  <button
                    onClick={() => { setRepairFpb(null); setRepairApprovals([]); setRepairApproverEdits({}) }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: `1px solid ${borderColor}`,
                      background: 'transparent',
                      color: textSecondary,
                      fontWeight: 500,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <FontAwesomeIcon icon={faTimes} style={{ marginRight: '6px' }} />
                    Tutup
                  </button>

                  <button
                    onClick={handleRepairSave}
                    disabled={repairSaving}
                    style={{
                      background: repairSaved ? pastelGreen.text : textPrimary,
                      color: isDark ? '#09090B' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '8px 20px',
                      cursor: repairSaving ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {repairSaving ? (
                      <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</>
                    ) : repairSaved ? (
                      <><FontAwesomeIcon icon={faCheck} /> Tersimpan!</>
                    ) : (
                      <><FontAwesomeIcon icon={faSave} /> Simpan Perubahan</>
                    )}
                  </button>
                </div>

              </div>
            ) : (
              <div style={{ background: cardBg, border: `1px dashed ${borderColor}`, borderRadius: '10px', padding: '60px 20px', textAlign: 'center', color: textSecondary }}>
                <FontAwesomeIcon icon={faPen} style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Pilih salah satu FPB di panel kiri untuk memeriksa dan memperbaiki alur persetujuannya.
                </p>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  )
}