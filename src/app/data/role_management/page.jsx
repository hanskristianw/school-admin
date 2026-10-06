'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShieldHalved, faPlus, faSearch, faEdit, faTrash,
  faSpinner, faCheck, faTimes, faCheckCircle,
  faExclamationTriangle, faSliders, faLayerGroup,
  faGraduationCap, faUserShield, faClock, faUsers,
  faKey, faBuilding, faBriefcase
} from '@fortawesome/free-solid-svg-icons'

export default function RoleManagementPage() {
  const { theme, isDark } = useTheme()

  // ─── Minimalist UI Design Tokens (matching /data/pyp) ───────────
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
  const pastelOrange = {
    bg: isDark ? 'rgba(251, 146, 60, 0.12)' : '#FFF7ED',
    text: isDark ? '#fb923c' : '#C2410C',
    border: isDark ? 'rgba(251, 146, 60, 0.25)' : '#FED7AA'
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

  // ─── States ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState([])
  const [dashboardTypes, setDashboardTypes] = useState([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [dashboardFilter, setDashboardFilter] = useState('all')
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const [form, setForm] = useState({
    role_id: null,
    role_name: '',
    dashboard_type_id: null,
    role_priority: 50,
    is_admin: false,
    is_teacher: false,
    is_principal: false,
    is_student: false,
    is_counselor: false,
    is_pastoral_care: false,
    is_curriculum: false,
    is_nurse: false,
    can_void_transactions: false,
    is_vendor: false,
    is_part_time_staff: false,
    is_flexible_hours: false,
    is_on_call_staff: false
  })

  // ─── Auth Verification ───────────────────────────────────────────
  const isAdmin = useMemo(() => {
    try {
      const raw = localStorage.getItem('user_data')
      const user = raw ? JSON.parse(raw) : null
      return !!user?.isAdmin
    } catch { return false }
  }, [])

  // ─── Data Loading ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [{ data: dtData, error: dtError }, { data: rData, error: rError }] = await Promise.all([
          supabase.from('dashboard_type').select('dashboard_type_id, type_code, type_name').eq('is_active', true).order('type_name'),
          supabase.from('role').select('role_id, role_name, dashboard_type_id, role_priority, is_admin, is_teacher, is_principal, is_student, is_counselor, is_pastoral_care, is_curriculum, is_nurse, can_void_transactions, is_vendor, is_part_time_staff, is_flexible_hours, is_on_call_staff').order('role_name', { ascending: true })
        ])

        if (dtError) throw dtError
        if (rError) throw rError

        setDashboardTypes(dtData || [])
        setRoles(rData || [])
      } catch (e) {
        showToast(e.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ─── Filtered Roles ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = roles || []

    if (activeCategory === 'academic') {
      list = list.filter(r => r.is_teacher || r.is_principal || r.is_counselor || r.is_curriculum || r.is_student)
    } else if (activeCategory === 'operations') {
      list = list.filter(r => r.is_admin || (!r.is_teacher && !r.is_student && !r.is_principal && !r.is_counselor))
    } else if (activeCategory === 'attendance') {
      list = list.filter(r => r.is_vendor || r.is_part_time_staff || r.is_flexible_hours || r.is_on_call_staff)
    }

    if (dashboardFilter !== 'all') {
      list = list.filter(r => String(r.dashboard_type_id) === String(dashboardFilter))
    }

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(r => (r.role_name || '').toLowerCase().includes(q))
    }

    return [...list].sort((a, b) => (a.role_name || '').localeCompare(b.role_name || ''))
  }, [roles, activeCategory, dashboardFilter, search])

  // ─── Modal Actions ───────────────────────────────────────────────
  const openNew = () => {
    setForm({
      role_id: null,
      role_name: '',
      dashboard_type_id: dashboardTypes[0]?.dashboard_type_id || null,
      role_priority: 50,
      is_admin: false,
      is_teacher: false,
      is_principal: false,
      is_student: false,
      is_counselor: false,
      is_pastoral_care: false,
      is_curriculum: false,
      is_nurse: false,
      can_void_transactions: false,
      is_vendor: false,
      is_part_time_staff: false,
      is_flexible_hours: false,
      is_on_call_staff: false
    })
    setShowEdit(true)
  }

  const openEdit = (r) => {
    setForm({
      role_id: r.role_id,
      role_name: r.role_name || '',
      dashboard_type_id: r.dashboard_type_id || null,
      role_priority: r.role_priority || 50,
      is_admin: !!r.is_admin,
      is_teacher: !!r.is_teacher,
      is_principal: !!r.is_principal,
      is_student: !!r.is_student,
      is_counselor: !!r.is_counselor,
      is_pastoral_care: !!r.is_pastoral_care,
      is_curriculum: !!r.is_curriculum,
      is_nurse: !!r.is_nurse,
      can_void_transactions: !!r.can_void_transactions,
      is_vendor: !!r.is_vendor,
      is_part_time_staff: !!r.is_part_time_staff,
      is_flexible_hours: !!r.is_flexible_hours,
      is_on_call_staff: !!r.is_on_call_staff
    })
    setShowEdit(true)
  }

  const saveRole = async () => {
    if (!isAdmin) return
    if (!form.role_name?.trim()) {
      showToast('Role name is required.', 'error')
      return
    }
    if (!form.dashboard_type_id) {
      showToast('Dashboard type is required.', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        role_name: form.role_name.trim(),
        role_priority: parseInt(form.role_priority) || 50,
        dashboard_type_id: parseInt(form.dashboard_type_id),
        is_admin: !!form.is_admin,
        is_teacher: !!form.is_teacher,
        is_principal: !!form.is_principal,
        is_student: !!form.is_student,
        is_counselor: !!form.is_counselor,
        is_pastoral_care: !!form.is_pastoral_care,
        is_curriculum: !!form.is_curriculum,
        is_nurse: !!form.is_nurse,
        can_void_transactions: !!form.can_void_transactions,
        is_vendor: !!form.is_vendor,
        is_part_time_staff: !!form.is_part_time_staff,
        is_flexible_hours: !!form.is_flexible_hours,
        is_on_call_staff: !!form.is_on_call_staff
      }

      if (form.role_id) {
        const { error } = await supabase.from('role').update(payload).eq('role_id', form.role_id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('role').insert([payload])
        if (error) throw error
      }

      const { data, error: rErr } = await supabase
        .from('role')
        .select('role_id, role_name, dashboard_type_id, role_priority, is_admin, is_teacher, is_principal, is_student, is_counselor, is_pastoral_care, is_curriculum, is_nurse, can_void_transactions, is_vendor, is_part_time_staff, is_flexible_hours, is_on_call_staff')
        .order('role_name', { ascending: true })

      if (rErr) throw rErr
      setRoles(data || [])
      setShowEdit(false)
      showToast('Role saved successfully.', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteRole = async (r) => {
    if (!isAdmin) return
    if (!window.confirm(`Delete role "${r.role_name}"?`)) return
    try {
      const { error } = await supabase.from('role').delete().eq('role_id', r.role_id)
      if (error) throw error

      const { data, error: rErr } = await supabase
        .from('role')
        .select('role_id, role_name, dashboard_type_id, role_priority, is_admin, is_teacher, is_principal, is_student, is_counselor, is_pastoral_care, is_curriculum, is_nurse, can_void_transactions, is_vendor, is_part_time_staff, is_flexible_hours, is_on_call_staff')
        .order('role_name', { ascending: true })

      if (rErr) throw rErr
      setRoles(data || [])
      showToast('Role removed.', 'success')
    } catch (e) {
      const msg = e?.message?.includes('violates foreign key')
        ? 'Role is currently in use by users and cannot be deleted.'
        : (e.message || 'Delete failed')
      showToast(msg, 'error')
    }
  }

  // ─── Forbidden Screen ────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={{ background: pageBg, minHeight: '100vh', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '36px', textAlign: 'center', maxWidth: '420px' }}>
          <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: '32px', color: pastelRed.text, marginBottom: '14px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: textPrimary, margin: '0 0 6px 0' }}>Access Restricted</h3>
          <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>This page is only accessible to system administrators.</p>
        </div>
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

      {/* ── HEADER & BREADCRUMBS (MATCHING /DATA/PYP STYLE) ─────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[SETTINGS]</span>
            <span>/</span>
            <span>[USER ACCESS]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[ROLE MANAGEMENT]</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center border" style={{ background: pastelPurple.bg, borderColor: pastelPurple.border, color: pastelPurple.text }}>
              <FontAwesomeIcon icon={faShieldHalved} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Role Management
              </h1>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            onClick={openNew}
            style={{
              background: textPrimary,
              color: isDark ? '#09090B' : '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: '11px' }} />
            <span>Add Role</span>
          </button>
        </div>
      </div>

      {/* ── CATEGORY TABS NAVIGATION (MATCHING /DATA/PYP STYLE) ──────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '24px', flexWrap: 'wrap' }}>
        
        <button
          onClick={() => setActiveCategory('all')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeCategory === 'all' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeCategory === 'all' ? textPrimary : textSecondary,
            borderBottom: activeCategory === 'all' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faLayerGroup} style={{ fontSize: '13px' }} />
          <span>All Roles</span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary }}>
            {roles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('academic')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeCategory === 'academic' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeCategory === 'academic' ? textPrimary : textSecondary,
            borderBottom: activeCategory === 'academic' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faGraduationCap} style={{ fontSize: '13px' }} />
          <span>Academic &amp; Faculty</span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary }}>
            {roles.filter(r => r.is_teacher || r.is_principal || r.is_counselor || r.is_curriculum || r.is_student).length}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('operations')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeCategory === 'operations' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeCategory === 'operations' ? textPrimary : textSecondary,
            borderBottom: activeCategory === 'operations' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faUserShield} style={{ fontSize: '13px' }} />
          <span>Admin &amp; Operations</span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary }}>
            {roles.filter(r => r.is_admin || (!r.is_teacher && !r.is_student && !r.is_principal && !r.is_counselor)).length}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('attendance')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeCategory === 'attendance' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeCategory === 'attendance' ? textPrimary : textSecondary,
            borderBottom: activeCategory === 'attendance' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faClock} style={{ fontSize: '13px' }} />
          <span>Special Attendance</span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary }}>
            {roles.filter(r => r.is_vendor || r.is_part_time_staff || r.is_flexible_hours || r.is_on_call_staff).length}
          </span>
        </button>

      </div>

      {/* ── SEARCH & FILTER CONTROLS BAR ─────────────────────────────── */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '16px 20px', marginBottom: '20px' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '340px' }}>
              <FontAwesomeIcon
                icon={faSearch}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: textSecondary, fontSize: '11px', pointerEvents: 'none' }}
              />
              <input
                type="text"
                placeholder="Search role name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '28px', paddingRight: search ? '28px' : '10px', fontSize: '12px', height: '34px' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', fontSize: '11px' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dashboard Type Filter Dropdown */}
            <div style={{ minWidth: '200px' }}>
              <select
                value={dashboardFilter}
                onChange={e => setDashboardFilter(e.target.value)}
                style={{ ...selectStyle, fontSize: '12px', height: '34px', padding: '6px 10px' }}
              >
                <option value="all">All Dashboard Types</option>
                {dashboardTypes.map(dt => (
                  <option key={dt.dashboard_type_id} value={String(dt.dashboard_type_id)}>
                    {dt.type_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: textSecondary, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
            Showing <strong>{filtered.length}</strong> of <strong>{roles.length}</strong> roles
          </div>

        </div>
      </div>

      {/* ── ROLES TABLE CARD ─────────────────────────────────────────── */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: textSecondary }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '20px', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px' }}>Loading roles...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${borderColor}`, background: isDark ? '#141416' : '#F9F9F8' }}>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Role Name
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Priority
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Dashboard
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Access Flags
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Attendance Policy
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const dt = dashboardTypes.find(d => d.dashboard_type_id === r.dashboard_type_id)

                  return (
                    <tr 
                      key={r.role_id}
                      style={{ 
                        borderBottom: idx !== filtered.length - 1 ? `1px solid ${borderColor}` : 'none',
                        transition: 'background 0.12s ease'
                      }}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                    >
                      {/* Name */}
                      <td style={{ padding: '12px 18px' }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 600, color: textPrimary }}>
                            {r.role_name}
                          </span>
                          <span style={{ fontSize: '10px', color: textSecondary, fontFamily: 'monospace', padding: '1px 5px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5' }}>
                            #{r.role_id}
                          </span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textPrimary, fontFamily: 'monospace' }}>
                          {r.role_priority || 50}
                        </span>
                      </td>

                      {/* Dashboard Type */}
                      <td style={{ padding: '12px 14px' }}>
                        {dt ? (
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: pastelBlue.bg, color: pastelBlue.text, whiteSpace: 'nowrap' }}>
                            {dt.type_name}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: textSecondary, fontStyle: 'italic' }}>
                            Not set
                          </span>
                        )}
                      </td>

                      {/* Access Flags */}
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex flex-wrap gap-1">
                          {r.is_admin && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelPurple.bg, color: pastelPurple.text }}>Admin</span>}
                          {r.is_curriculum && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelBlue.bg, color: pastelBlue.text }}>Curriculum</span>}
                          {r.is_teacher && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelBlue.bg, color: pastelBlue.text }}>Teacher</span>}
                          {r.is_principal && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelYellow.bg, color: pastelYellow.text }}>Principal</span>}
                          {r.is_student && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelGreen.bg, color: pastelGreen.text }}>Student</span>}
                          {r.is_counselor && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelPurple.bg, color: pastelPurple.text }}>Counselor</span>}
                          {r.is_pastoral_care && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelGreen.bg, color: pastelGreen.text }}>Pastoral Care</span>}
                          {r.is_nurse && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelRed.bg, color: pastelRed.text }}>Nurse</span>}
                          {r.can_void_transactions && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelOrange.bg, color: pastelOrange.text }}>Void Access</span>}
                          {!r.is_admin && !r.is_curriculum && !r.is_teacher && !r.is_principal && !r.is_student && !r.is_counselor && !r.is_pastoral_care && !r.is_nurse && (
                            <span style={{ fontSize: '10px', color: textSecondary }}>Staff</span>
                          )}
                        </div>
                      </td>

                      {/* Attendance Policy */}
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex flex-wrap gap-1">
                          {r.is_vendor && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelOrange.bg, color: pastelOrange.text }}>Vendor</span>}
                          {r.is_part_time_staff && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelBlue.bg, color: pastelBlue.text }}>Part-Time</span>}
                          {r.is_on_call_staff && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelPurple.bg, color: pastelPurple.text }}>On-Call</span>}
                          {r.is_flexible_hours && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: pastelGreen.bg, color: pastelGreen.text }}>Flexible</span>}
                          {!r.is_vendor && !r.is_part_time_staff && !r.is_on_call_staff && !r.is_flexible_hours && (
                            <span style={{ fontSize: '11px', color: textSecondary }}>Standard</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(r)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: `1px solid ${borderColor}`,
                              background: 'transparent',
                              color: textPrimary,
                              cursor: 'pointer',
                              fontSize: '11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Edit role"
                          >
                            <FontAwesomeIcon icon={faEdit} style={{ fontSize: '11px' }} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => deleteRole(r)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: `1px solid ${pastelRed.border}`,
                              background: pastelRed.bg,
                              color: pastelRed.text,
                              cursor: 'pointer',
                              fontSize: '11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Delete role"
                          >
                            <FontAwesomeIcon icon={faTrash} style={{ fontSize: '10px' }} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: textSecondary }}>
                      No roles match the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD / EDIT ROLE MODAL ────────────────────────────────────── */}
      <Modal 
        isOpen={showEdit} 
        onClose={() => setShowEdit(false)} 
        title={form.role_id ? `Edit Role #${form.role_id}` : 'Add New Role'}
        size="md"
        containerStyle={{ background: cardBg, borderColor: borderColor }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* General Fields */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: '6px' }}>
              Role Name <span style={{ color: pastelRed.text }}>*</span>
            </label>
            <input 
              type="text"
              value={form.role_name} 
              onChange={e => setForm(prev => ({ ...prev, role_name: e.target.value }))}
              placeholder="e.g. Science Teacher, Finance Staff"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: '6px' }}>
                Dashboard Type <span style={{ color: pastelRed.text }}>*</span>
              </label>
              <select
                value={form.dashboard_type_id || ''}
                onChange={e => setForm(prev => ({ ...prev, dashboard_type_id: e.target.value ? parseInt(e.target.value) : null }))}
                style={selectStyle}
              >
                <option value="">-- Select Dashboard --</option>
                {dashboardTypes.map(dt => (
                  <option key={dt.dashboard_type_id} value={dt.dashboard_type_id}>
                    {dt.type_name} ({dt.type_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: '6px' }}>
                Priority (1 - 100)
              </label>
              <input 
                type="number" 
                min="1" 
                max="100" 
                value={form.role_priority} 
                onChange={e => setForm(prev => ({ ...prev, role_priority: parseInt(e.target.value) || 50 }))} 
                style={inputStyle}
              />
            </div>
          </div>

          {/* Core Access Flags */}
          <div style={{ paddingTop: '12px', borderTop: `1px solid ${borderColor}` }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: textSecondary, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Core Access Flags
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { key: 'is_admin', label: 'Admin' },
                { key: 'is_teacher', label: 'Teacher' },
                { key: 'is_principal', label: 'Principal' },
                { key: 'is_student', label: 'Student' },
                { key: 'is_counselor', label: 'Counselor' },
                { key: 'is_pastoral_care', label: 'Pastoral Care' },
                { key: 'is_curriculum', label: 'Curriculum' },
                { key: 'is_nurse', label: 'Nurse' },
              ].map(({ key, label }) => {
                const checked = form[key]
                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: `1px solid ${checked ? textPrimary : borderColor}`,
                      background: checked ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                      fontWeight: checked ? 600 : 400,
                      color: textPrimary,
                      userSelect: 'none',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))}
                      style={{ accentColor: textPrimary, width: '14px', height: '14px', cursor: 'pointer' }}
                    />
                    <span>{label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Attendance Rules */}
          <div style={{ paddingTop: '12px', borderTop: `1px solid ${borderColor}` }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: textSecondary, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Attendance Policy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { key: 'is_vendor', label: 'Vendor (Laporan Terpisah)' },
                { key: 'is_part_time_staff', label: 'Part-time Staff (Bebas Absen)' },
                { key: 'is_on_call_staff', label: 'Staf Honor / On-Call (Bebas Alpa)' },
                { key: 'is_flexible_hours', label: 'Jam Kerja Fleksibel (Bebas Denda Jam)' },
              ].map(({ key, label }) => {
                const checked = form[key]
                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: `1px solid ${checked ? textPrimary : borderColor}`,
                      background: checked ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                      fontWeight: checked ? 600 : 400,
                      color: textPrimary,
                      userSelect: 'none',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))}
                      style={{ accentColor: textPrimary, width: '14px', height: '14px', cursor: 'pointer' }}
                    />
                    <span>{label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Permissions */}
          <div style={{ paddingTop: '12px', borderTop: `1px solid ${borderColor}` }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: textSecondary, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Permissions
            </label>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: `1px solid ${form.can_void_transactions ? textPrimary : borderColor}`,
                background: form.can_void_transactions ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                fontSize: '12px',
                fontWeight: form.can_void_transactions ? 600 : 400,
                color: textPrimary,
                userSelect: 'none',
                transition: 'all 0.12s ease'
              }}
            >
              <input
                type="checkbox"
                checked={form.can_void_transactions}
                onChange={e => setForm(p => ({ ...p, can_void_transactions: e.target.checked }))}
                style={{ accentColor: textPrimary, width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <span>Can Void Transactions</span>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                background: 'transparent',
                color: textSecondary,
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={saveRole}
              disabled={saving}
              style={{
                background: textPrimary,
                color: isDark ? '#09090B' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '8px 20px',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              {saving ? (
                <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</>
              ) : (
                <><FontAwesomeIcon icon={faCheck} /> Save Role</>
              )}
            </button>
          </div>

        </div>
      </Modal>

    </div>
  )
}
