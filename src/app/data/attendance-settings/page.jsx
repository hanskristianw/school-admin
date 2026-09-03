'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClock,
  faCalendarCheck,
  faCalendarAlt,
  faCalendarDay,
  faStar,
  faUserCheck,
  faCog,
  faEnvelope,
  faPlus,
  faEdit,
  faTrash,
  faCheck,
  faSave,
  faSpinner,
  faInfoCircle,
  faPaperPlane,
  faExclamationTriangle,
  faSearch,
  faSlidersH,
  faSyncAlt,
  faCheckCircle,
  faTimes,
  faShieldAlt,
  faFilter,
  faUserTie,
  faUsers,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons'

const DAY_LABELS = [
  { num: 1, short: 'Sen', full: 'Senin' },
  { num: 2, short: 'Sel', full: 'Selasa' },
  { num: 3, short: 'Rab', full: 'Rabu' },
  { num: 4, short: 'Kam', full: 'Kamis' },
  { num: 5, short: 'Jum', full: "Jum'at" },
  { num: 6, short: 'Sab', full: 'Sabtu' },
  { num: 7, short: 'Min', full: 'Minggu' },
]

const NOTIF_TYPES = {
  late:        { label: 'Terlambat',       bg: '#FBF3DB', color: '#956400', border: '#FDE68A' },
  leave_early: { label: 'Pulang Awal',     bg: '#FDEBEC', color: '#9F2F2D', border: '#FECACA' },
  no_checkin:  { label: 'Tidak Check-In',  bg: '#F3E8FF', color: '#6B21A8', border: '#E9D5FF' },
  no_checkout: { label: 'Tidak Check-Out', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
}

function formatDateRange(start, end) {
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
  const ds = new Date(start + 'T00:00:00Z')
  const de = new Date(end   + 'T00:00:00Z')
  if (start === end) {
    return `${ds.getUTCDate()} ${months[ds.getUTCMonth()]} ${ds.getUTCFullYear()}`
  }
  if (ds.getUTCMonth() === de.getUTCMonth() && ds.getUTCFullYear() === de.getUTCFullYear()) {
    return `${ds.getUTCDate()}–${de.getUTCDate()} ${months[ds.getUTCMonth()]} ${ds.getUTCFullYear()}`
  }
  return `${ds.getUTCDate()} ${months[ds.getUTCMonth()]} – ${de.getUTCDate()} ${months[de.getUTCMonth()]} ${de.getUTCFullYear()}`
}

function diffDays(start, end) {
  const a = new Date(start + 'T00:00:00Z')
  const b = new Date(end + 'T00:00:00Z')
  return Math.round((b - a) / 86400000) + 1
}

export default function AttendanceSettingsPage() {
  const { theme } = useTheme()
  const isDark = theme?.mode === 'dark'

  // Minimalist-UI Theme Tokens (Matching /data/pyp)
  const pageBg        = isDark ? '#09090B' : '#FAFAF9'
  const cardBg        = isDark ? '#18181B' : '#FFFFFF'
  const subtleBg      = isDark ? '#27272A' : '#F7F6F3'
  const borderColor   = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary   = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  const [tab, setTab] = useState('workdays')

  // ── Tab 1: Work Days ───────────────────────────────────────────────────────
  const [roles, setRoles] = useState([])
  const [savingRole, setSavingRole] = useState(null)
  const [rolesMsg, setRolesMsg] = useState('')

  // ── Tab 2: School Holidays ─────────────────────────────────────────────────
  const [holidays, setHolidays] = useState([])
  const [filterRoleId, setFilterRoleId] = useState('all') // 'all' | 'global' | role_id string
  const [newName, setNewName]           = useState('')
  const [newDateStart, setNewDateStart] = useState('')
  const [newDateEnd, setNewDateEnd]     = useState('')
  const [newRoleId, setNewRoleId]       = useState('') // '' = global
  const [addingHoliday, setAddingHoliday] = useState(false)
  const [holidayMsg, setHolidayMsg]     = useState('')
  // edit state
  const [editingId, setEditingId]         = useState(null)
  const [editName, setEditName]           = useState('')
  const [editDateStart, setEditDateStart] = useState('')
  const [editDateEnd, setEditDateEnd]     = useState('')
  const [editRoleId, setEditRoleId]       = useState('')
  const [savingEdit, setSavingEdit]       = useState(false)
  const [editMsg, setEditMsg]             = useState('')

  // ── Tab 5: Approver per Jabatan ───────────────────────────────────────────
  const [roleApprovers, setRoleApprovers]   = useState([]) // [{role_id, role_name, approver1_id, approver2_id}]
  const [uaEdits, setUaEdits]               = useState({}) // role_id → {approver1_id, approver2_id}
  const [uaMsg, setUaMsg]                   = useState('')
  const [savingUa, setSavingUa]             = useState(null) // role_id being saved

  // ── Tab 4: Hari Khusus (Special Day Rules) ─────────────────────────────────
  const [specialRules, setSpecialRules]     = useState([])
  const [allUsers, setAllUsers]             = useState([])
  const [srMsg, setSrMsg]                   = useState('')
  const [editingSrId, setEditingSrId]       = useState(null)
  // form fields
  const [srTanggal, setSrTanggal]           = useState('')
  const [srScope, setSrScope]               = useState('all')
  const [srRoleIds, setSrRoleIds]           = useState(new Set())
  const [srUserId, setSrUserId]             = useState('')
  const [srIsWorkDay, setSrIsWorkDay]       = useState(true)
  const [srIsFlexibleHours, setSrIsFlexibleHours] = useState(false)
  const [srCheckIn, setSrCheckIn]           = useState('')
  const [srCheckOut, setSrCheckOut]         = useState('')
  const [srKet, setSrKet]                   = useState('')
  const [savingSr, setSavingSr]             = useState(false)

  // Edit Modal states for Hari Khusus
  const [showEditSrModal, setShowEditSrModal] = useState(false)
  const [editSrRule, setEditSrRule] = useState(null)
  const [editSrTanggal, setEditSrTanggal] = useState('')
  const [editSrScope, setEditSrScope] = useState('all')
  const [editSrRoleId, setEditSrRoleId] = useState('')
  const [editSrUserId, setEditSrUserId] = useState('')
  const [editSrIsWorkDay, setEditSrIsWorkDay] = useState(true)
  const [editSrIsFlexibleHours, setEditSrIsFlexibleHours] = useState(false)
  const [editSrCheckIn, setEditSrCheckIn] = useState('')
  const [editSrCheckOut, setEditSrCheckOut] = useState('')
  const [editSrKet, setEditSrKet] = useState('')
  const [savingEditSr, setSavingEditSr] = useState(false)
  const [editSrMsg, setEditSrMsg] = useState('')

  // ── Tab 3: Settings & Log ──────────────────────────────────────────────────
  const [adminEmails, setAdminEmails]   = useState('')
  const [graceMinutes, setGraceMinutes] = useState('0')
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg]   = useState('')
  const [notifLogs, setNotifLogs]       = useState([])
  const [runLogs, setRunLogs]           = useState([])
  const [logsLoading, setLogsLoading]   = useState(false)
  const [testRunning, setTestRunning]   = useState(false)
  const [testResult, setTestResult]     = useState(null)
  const [testEmail, setTestEmail]       = useState('')

  useEffect(() => {
    fetchRoles()
    fetchHolidays()
    fetchSettings()
    fetchLogs()
    fetchRunLogs()
    fetchSpecialRules()
    fetchAllUsers()
    fetchRoleApprovers()
  }, [])

  useEffect(() => {
    if (newDateStart && !newDateEnd) setNewDateEnd(newDateStart)
  }, [newDateStart])

  const resetSrForm = () => {
    setSrTanggal('')
    setSrScope('all')
    setSrRoleIds(new Set())
    setSrUserId('')
    setSrIsWorkDay(true)
    setSrIsFlexibleHours(false)
    setSrCheckIn('')
    setSrCheckOut('')
    setSrKet('')
    setEditingSrId(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH & ACTIONS
  // ─────────────────────────────────────────────────────────────────────────
  const fetchRoles = async () => {
    const { data } = await supabase.from('role').select('role_id, role_name, work_days').order('role_id')
    setRoles(data || [])
  }

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('user_id, user_nama_depan, user_nama_belakang, user_pin')
      .eq('is_active', true)
      .order('user_nama_depan')
    setAllUsers(data || [])
  }

  const fetchRoleApprovers = async () => {
    try {
      const res = await fetch('/api/attendance/role-approvers')
      const json = await res.json()
      if (json.success) {
        setRoleApprovers(json.data || [])
        const edits = {}
        for (const r of (json.data || [])) {
          edits[r.role_id] = {
            approver1_id: r.approver1_id ? String(r.approver1_id) : '',
            approver2_id: r.approver2_id ? String(r.approver2_id) : '',
          }
        }
        setUaEdits(edits)
      }
    } catch (_) {}
  }

  const saveRoleApprover = async (role_id) => {
    const edit = uaEdits[role_id] || {}
    if (!edit.approver1_id) {
      setUaMsg('❌ Pilih Approver 1 terlebih dahulu')
      return
    }
    setSavingUa(role_id); setUaMsg('')
    try {
      const res = await fetch('/api/attendance/role-approvers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id,
          approver1_id: parseInt(edit.approver1_id, 10),
          approver2_id: edit.approver2_id ? parseInt(edit.approver2_id, 10) : null,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setUaMsg('✅ Approver berhasil disimpan')
      fetchRoleApprovers()
      setTimeout(() => setUaMsg(''), 3000)
    } catch (err) {
      setUaMsg('❌ ' + err.message)
    } finally {
      setSavingUa(null)
    }
  }

  const fetchSpecialRules = async () => {
    try {
      const res = await fetch('/api/attendance/special-day-rules')
      const json = await res.json()
      if (json.success) setSpecialRules(json.data || [])
    } catch (_) {}
  }

  const saveSr = async () => {
    if (!srTanggal) { setSrMsg('❌ Tanggal wajib diisi'); return }
    if (srScope === 'role' && srRoleIds.size === 0) { setSrMsg('❌ Pilih minimal satu jabatan'); return }
    if (srScope === 'user' && !srUserId) { setSrMsg('❌ Pilih karyawan terlebih dahulu'); return }
    setSavingSr(true); setSrMsg('')

    const basePayload = {
      tanggal:           srTanggal,
      is_work_day:       srIsWorkDay,
      is_flexible_hours: srIsFlexibleHours,
      custom_check_in:   srCheckIn  || null,
      custom_check_out:  srCheckOut || null,
      keterangan:        srKet.trim() || null,
    }

    try {
      if (srScope === 'role') {
        const inserts = [...srRoleIds].map(rid =>
          fetch('/api/attendance/special-day-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...basePayload, scope_type: 'role', role_id: rid, user_id: null }),
          }).then(r => r.json())
        )
        const results = await Promise.all(inserts)
        const failed = results.filter(r => !r.success)
        if (failed.length > 0) throw new Error(failed[0].message)
      } else {
        const payload = {
          ...basePayload,
          scope_type: srScope,
          role_id: null,
          user_id: srScope === 'user' ? parseInt(srUserId, 10) : null,
        }
        const res = await fetch('/api/attendance/special-day-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.message)
      }

      setSrMsg('✅ Aturan berhasil ditambahkan')
      resetSrForm()
      fetchSpecialRules()
      setTimeout(() => setSrMsg(''), 3000)
    } catch (err) {
      setSrMsg('❌ ' + err.message)
    } finally {
      setSavingSr(false)
    }
  }

  const startEditSr = (r) => {
    setEditSrRule(r)
    setEditSrTanggal(r.tanggal || '')
    setEditSrScope(r.scope_type || 'all')
    setEditSrRoleId(r.role_id ? String(r.role_id) : '')
    setEditSrUserId(r.user_id ? String(r.user_id) : '')
    setEditSrIsWorkDay(r.is_work_day ?? true)
    setEditSrIsFlexibleHours(!!r.is_flexible_hours || (r.keterangan || '').includes('[BEBAS_JAM]'))
    setEditSrCheckIn(r.custom_check_in ? String(r.custom_check_in).slice(0, 5) : '')
    setEditSrCheckOut(r.custom_check_out ? String(r.custom_check_out).slice(0, 5) : '')
    const cleanKetDisplay = (r.keterangan || '').replace('[BEBAS_JAM]', '').trim()
    setEditSrKet(cleanKetDisplay)
    setEditSrMsg('')
    setShowEditSrModal(true)
  }

  const saveEditSr = async () => {
    if (!editSrTanggal) { setEditSrMsg('❌ Tanggal wajib diisi'); return }
    if (editSrScope === 'role' && !editSrRoleId) { setEditSrMsg('❌ Pilih jabatan terlebih dahulu'); return }
    if (editSrScope === 'user' && !editSrUserId) { setEditSrMsg('❌ Pilih karyawan terlebih dahulu'); return }
    setSavingEditSr(true); setEditSrMsg('')

    try {
      const payload = {
        id: editSrRule.id,
        tanggal: editSrTanggal,
        scope_type: editSrScope,
        role_id: editSrScope === 'role' ? parseInt(editSrRoleId, 10) : null,
        user_id: editSrScope === 'user' ? parseInt(editSrUserId, 10) : null,
        is_work_day: editSrIsWorkDay,
        is_flexible_hours: editSrIsFlexibleHours,
        custom_check_in: editSrCheckIn || null,
        custom_check_out: editSrCheckOut || null,
        keterangan: editSrKet.trim() || null,
      }

      const res = await fetch('/api/attendance/special-day-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)

      setShowEditSrModal(false)
      fetchSpecialRules()
      setSrMsg('✅ Aturan hari khusus berhasil diperbarui')
      setTimeout(() => setSrMsg(''), 3000)
    } catch (err) {
      setEditSrMsg('❌ ' + err.message)
    } finally {
      setSavingEditSr(false)
    }
  }

  const deleteSr = async (id) => {
    if (!confirm('Hapus aturan hari khusus ini?')) return
    const res = await fetch(`/api/attendance/special-day-rules?id=${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.success) { setSrMsg('❌ ' + json.message); return }
    setSrMsg('✅ Aturan dihapus')
    fetchSpecialRules()
    setTimeout(() => setSrMsg(''), 2000)
  }

  const toggleDay = (roleId, dayNum) => {
    setRoles(prev => prev.map(r => {
      if (r.role_id !== roleId) return r
      const days = (r.work_days || '1,2,3,4,5').split(',').map(Number)
      const newDays = days.includes(dayNum)
        ? days.filter(d => d !== dayNum)
        : [...days, dayNum].sort((a, b) => a - b)
      return { ...r, work_days: newDays.join(',') }
    }))
  }

  const saveRoleWorkDays = async (role) => {
    setSavingRole(role.role_id)
    setRolesMsg('')
    const { error } = await supabase
      .from('role')
      .update({ work_days: role.work_days })
      .eq('role_id', role.role_id)
    setSavingRole(null)
    if (error) {
      setRolesMsg('❌ Gagal menyimpan: ' + error.message)
    } else {
      setRolesMsg(`✅ Hari kerja "${role.role_name}" berhasil disimpan`)
      setTimeout(() => setRolesMsg(''), 3000)
    }
  }

  const fetchHolidays = async () => {
    const { data } = await supabase
      .from('school_holidays')
      .select('id, date_start, date_end, name, role_id')
      .order('date_start', { ascending: true })
    setHolidays(data || [])
  }

  const checkHolidayOverlap = (start, end, roleId, excludeId = null) => {
    return holidays.filter(h => {
      if (excludeId && h.id === excludeId) return false
      const sameRole = (h.role_id === null && roleId === null) ||
                       (h.role_id !== null && roleId !== null && h.role_id === roleId)
      if (!sameRole) return false
      return !(end < h.date_start || start > h.date_end)
    })
  }

  const addHoliday = async () => {
    if (!newDateStart || !newName.trim()) {
      setHolidayMsg('❌ Tanggal mulai dan nama libur wajib diisi')
      return
    }
    const endDate = newDateEnd || newDateStart
    if (endDate < newDateStart) {
      setHolidayMsg('❌ Tanggal akhir tidak boleh sebelum tanggal mulai')
      return
    }

    const roleIdVal = newRoleId ? parseInt(newRoleId, 10) : null
    const overlaps = checkHolidayOverlap(newDateStart, endDate, roleIdVal)
    if (overlaps.length > 0) {
      const o = overlaps[0]
      setHolidayMsg(`❌ Bentrok dengan hari libur "${o.name}" (${formatDateRange(o.date_start, o.date_end)})`)
      return
    }

    setAddingHoliday(true)
    setHolidayMsg('')
    const payload = {
      name: newName.trim(),
      date: newDateStart,
      date_start: newDateStart,
      date_end: endDate,
      role_id: roleIdVal,
    }
    const { error } = await supabase.from('school_holidays').insert([payload])
    setAddingHoliday(false)
    if (error) {
      const isDup = error.code === '23505' || error.message.includes('uq_holidays')
      setHolidayMsg('❌ Gagal: ' + (isDup ? 'Periode libur ini sudah ada untuk role tersebut' : error.message))
    } else {
      setHolidayMsg('✅ Hari libur berhasil ditambahkan')
      setNewName(''); setNewDateStart(''); setNewDateEnd(''); setNewRoleId('')
      fetchHolidays()
      setTimeout(() => setHolidayMsg(''), 3000)
    }
  }

  const startEditHoliday = (h) => {
    setEditingId(h.id)
    setEditName(h.name)
    setEditDateStart(h.date_start)
    setEditDateEnd(h.date_end)
    setEditRoleId(h.role_id !== null ? String(h.role_id) : '')
    setEditMsg('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditMsg('')
  }

  const saveEditHoliday = async () => {
    if (!editDateStart || !editName.trim()) {
      setEditMsg('❌ Tanggal mulai dan nama libur wajib diisi')
      return
    }
    const endDate = editDateEnd || editDateStart
    if (endDate < editDateStart) {
      setEditMsg('❌ Tanggal akhir tidak boleh sebelum tanggal mulai')
      return
    }

    const roleIdVal = editRoleId ? parseInt(editRoleId, 10) : null
    const overlaps = checkHolidayOverlap(editDateStart, endDate, roleIdVal, editingId)
    if (overlaps.length > 0) {
      const o = overlaps[0]
      setEditMsg(`❌ Bentrok dengan "${o.name}" (${formatDateRange(o.date_start, o.date_end)})`)
      return
    }

    setSavingEdit(true)
    setEditMsg('')
    const payload = {
      name: editName.trim(),
      date: editDateStart,
      date_start: editDateStart,
      date_end: endDate,
      role_id: roleIdVal,
    }
    const { error } = await supabase.from('school_holidays').update(payload).eq('id', editingId)
    setSavingEdit(false)
    if (error) {
      setEditMsg('❌ Gagal: ' + error.message)
    } else {
      setEditingId(null)
      fetchHolidays()
    }
  }

  const deleteHoliday = async (id) => {
    if (!confirm('Hapus hari libur ini?')) return
    const { error } = await supabase.from('school_holidays').delete().eq('id', id)
    if (!error) fetchHolidays()
    else alert('Gagal menghapus: ' + error.message)
  }

  const displayedHolidays = holidays.filter(h => {
    if (filterRoleId === 'all') return true
    if (filterRoleId === 'global') return h.role_id === null
    return String(h.role_id) === filterRoleId
  })

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['attendance_notif_admin_emails', 'attendance_notif_grace_minutes', 'attendance_notif_enabled'])
    const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
    setAdminEmails(map.attendance_notif_admin_emails || '')
    setGraceMinutes(map.attendance_notif_grace_minutes || '0')
    setNotifEnabled(map.attendance_notif_enabled !== 'false')
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    setSettingsMsg('')
    const updates = [
      { key: 'attendance_notif_admin_emails',  value: adminEmails.trim() },
      { key: 'attendance_notif_grace_minutes', value: String(parseInt(graceMinutes, 10) || 0) },
      { key: 'attendance_notif_enabled',       value: notifEnabled ? 'true' : 'false' },
    ]
    let hasErr = false
    for (const row of updates) {
      const { error } = await supabase.from('settings').upsert(row, { onConflict: 'key' })
      if (error) { hasErr = true; break }
    }
    setSavingSettings(false)
    setSettingsMsg(hasErr ? '❌ Gagal menyimpan pengaturan' : '✅ Pengaturan berhasil disimpan')
    setTimeout(() => setSettingsMsg(''), 3000)
  }

  const sendTestEmail = async () => {
    if (!testEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim())) {
      setTestResult({ success: false, message: 'Masukkan alamat email yang valid' })
      return
    }
    setTestRunning(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/attendance/notify/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail.trim() })
      })
      const json = await res.json()
      setTestResult(json)
    } catch (e) {
      setTestResult({ success: false, message: e.message })
    }
    setTestRunning(false)
  }

  const fetchLogs = async () => {
    setLogsLoading(true)
    const { data } = await supabase
      .from('attendance_notification_log')
      .select('*, user:user_id (user_nama_depan, user_nama_belakang)')
      .or('scheduled_time.is.null,scheduled_time.not.ilike.duty:%')
      .order('sent_at', { ascending: false })
      .limit(50)
    const filtered = (data || []).filter(log => !log.scheduled_time?.startsWith('duty:'))
    setNotifLogs(filtered)
    setLogsLoading(false)
  }

  const fetchRunLogs = async () => {
    const { data } = await supabase
      .from('attendance_notify_run_log')
      .select('*')
      .order('ran_at', { ascending: false })
      .limit(30)
    setRunLogs(data || [])
  }

  const triggerTestRun = async () => {
    setTestRunning(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/attendance/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('attendance_cron_secret') || ''}`,
        },
        body: JSON.stringify({})
      })
      const json = await res.json()
      setTestResult(json)
      fetchLogs()
      fetchRunLogs()
    } catch (e) {
      setTestResult({ success: false, error: e.message })
    }
    setTestRunning(false)
  }

  // ── Input & Select Styles (Minimalist-UI Standard) ──────────────────────────
  const inputStyle = {
    background: isDark ? '#18181B' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  }

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
  }

  const getRoleName = (roleId) => {
    if (roleId === null || roleId === undefined) return null
    const r = roles.find(r => r.role_id === roleId)
    return r?.role_name || `Role #${roleId}`
  }

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="pb-4 border-b flex items-center justify-between gap-4 mb-6" style={{ borderColor }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center border" style={{ background: subtleBg, borderColor, color: textPrimary }}>
            <FontAwesomeIcon icon={faSlidersH} className="text-sm" />
          </div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.01em', margin: 0 }}>
            Pengaturan Absensi
          </h1>
        </div>
      </div>

      {/* ── TABS NAVIGATION (/data/pyp STYLE) ────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '28px', flexWrap: 'wrap' }}>
        {[
          { id: 'workdays',  label: 'Hari Kerja per Jabatan', icon: faCalendarAlt },
          { id: 'holidays',  label: 'Kalender Libur',         icon: faCalendarDay },
          { id: 'special',   label: 'Hari Khusus',            icon: faStar },
          { id: 'approvers', label: 'Approval Hierarki',      icon: faUserCheck },
          { id: 'settings',  label: 'Pengaturan & Log',       icon: faCog },
        ].map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '12px 0',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: active ? textPrimary : textSecondary,
                borderBottom: active ? `2px solid ${textPrimary}` : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <FontAwesomeIcon icon={t.icon} style={{ fontSize: '12px', color: active ? (isDark ? '#60A5FA' : '#0284C7') : textSecondary }} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ════════════════════ TAB 1: WORK DAYS ════════════════════ */}
      {tab === 'workdays' && (
        <div className="space-y-4">
          {rolesMsg && (
            <div className="px-3 py-1.5 rounded text-xs font-medium" style={{
              background: rolesMsg.startsWith('✅') ? '#EDF3EC' : '#FDEBEC',
              color: rolesMsg.startsWith('✅') ? '#346538' : '#9F2F2D',
              border: `1px solid ${rolesMsg.startsWith('✅') ? '#B2D8B4' : '#F8B4B4'}`
            }}>
              {rolesMsg}
            </div>
          )}

          {/* Bento Grid: Role Work Days Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {roles.map(role => {
              const activeDays = (role.work_days || '1,2,3,4,5').split(',').map(Number)
              const isSaving = savingRole === role.role_id

              return (
                <div
                  key={role.role_id}
                  className="p-4 rounded-lg border flex flex-col justify-between transition-all"
                  style={{ background: cardBg, borderColor }}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="font-semibold text-sm" style={{ color: textPrimary }}>
                      {role.role_name}
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: activeDays.length > 0 ? '#EDF3EC' : '#FDEBEC',
                        color: activeDays.length > 0 ? '#346538' : '#9F2F2D',
                        border: `1px solid ${activeDays.length > 0 ? '#B2D8B4' : '#F8B4B4'}`
                      }}
                    >
                      {activeDays.length} hari kerja
                    </span>
                  </div>

                  {/* Day Buttons */}
                  <div className="flex gap-1.5 justify-between my-2">
                    {DAY_LABELS.map(day => {
                      const active = activeDays.includes(day.num)
                      return (
                        <button
                          key={day.num}
                          type="button"
                          onClick={() => toggleDay(role.role_id, day.num)}
                          className="flex-1 h-8 rounded text-xs font-mono font-medium transition-all"
                          style={{
                            background: active
                              ? (isDark ? '#F4F4F5' : '#111111')
                              : subtleBg,
                            color: active
                              ? (isDark ? '#111111' : '#FFFFFF')
                              : textSecondary,
                            border: `1px solid ${active ? (isDark ? '#F4F4F5' : '#111111') : borderColor}`,
                          }}
                          title={day.full}
                        >
                          {day.short}
                        </button>
                      )
                    })}
                  </div>

                  {/* Card Footer: Save Button */}
                  <div className="pt-3 mt-1 border-t flex justify-end" style={{ borderColor }}>
                    <button
                      type="button"
                      onClick={() => saveRoleWorkDays(role)}
                      disabled={isSaving}
                      className="px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                      style={{
                        background: isDark ? '#F4F4F5' : '#111111',
                        color: isDark ? '#111111' : '#FFFFFF',
                        opacity: isSaving ? 0.6 : 1,
                        cursor: isSaving ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isSaving ? (
                        <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</>
                      ) : (
                        <><FontAwesomeIcon icon={faSave} /> Simpan</>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 2: SCHOOL HOLIDAYS ════════════════════ */}
      {tab === 'holidays' && (
        <div className="space-y-6">
          {/* Top Filter Bar (matching /data/pyp filter container) */}
          <div className="p-3.5 rounded-lg border flex items-center justify-between flex-wrap gap-4" style={{ background: cardBg, borderColor }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded flex items-center justify-center border text-xs" style={{ background: subtleBg, borderColor, color: textSecondary }}>
                <FontAwesomeIcon icon={faFilter} />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase block font-semibold tracking-wider" style={{ color: textSecondary }}>
                  Filter Berdasarkan Role
                </label>
                <select
                  value={filterRoleId}
                  onChange={e => setFilterRoleId(e.target.value)}
                  className="mt-0.5 text-xs font-medium outline-none cursor-pointer"
                  style={{ background: 'transparent', color: textPrimary, border: 'none' }}
                >
                  <option value="all">Semua Hari Libur ({holidays.length})</option>
                  <option value="global">🌐 Khusus Libur Global</option>
                  {roles.map(r => (
                    <option key={r.role_id} value={String(r.role_id)}>👤 {r.role_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs" style={{ color: textSecondary }}>
              Total: <strong style={{ color: textPrimary }}>{displayedHolidays.length}</strong> hari libur
            </div>
          </div>

          {/* Form Tambah Hari Libur */}
          <div className="p-4 rounded-lg border space-y-3" style={{ background: cardBg, borderColor }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2" style={{ color: textPrimary }}>
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                Tambah Hari Libur Baru
              </div>
              {holidayMsg && (
                <div className="px-2.5 py-1 rounded text-xs font-medium font-mono" style={{
                  background: holidayMsg.startsWith('✅') ? '#EDF3EC' : '#FDEBEC',
                  color: holidayMsg.startsWith('✅') ? '#346538' : '#9F2F2D',
                  border: `1px solid ${holidayMsg.startsWith('✅') ? '#B2D8B4' : '#F8B4B4'}`
                }}>
                  {holidayMsg}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Nama Libur *</label>
                <input
                  type="text"
                  placeholder="Contoh: Libur Semester, Idul Fitri"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Tanggal Mulai *</label>
                <input
                  type="date"
                  value={newDateStart}
                  onChange={e => {
                    setNewDateStart(e.target.value)
                    if (!newDateEnd || newDateEnd < e.target.value) setNewDateEnd(e.target.value)
                  }}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Tanggal Selesai *</label>
                <input
                  type="date"
                  value={newDateEnd}
                  min={newDateStart}
                  onChange={e => setNewDateEnd(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Berlaku Untuk Role</label>
                <select
                  value={newRoleId}
                  onChange={e => setNewRoleId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">🌐 Global (Semua Role)</option>
                  {roles.map(r => (
                    <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={addHoliday}
                disabled={addingHoliday}
                className="px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                style={{
                  background: isDark ? '#F4F4F5' : '#111111',
                  color: isDark ? '#111111' : '#FFFFFF',
                  opacity: addingHoliday ? 0.6 : 1
                }}
              >
                {addingHoliday ? <><FontAwesomeIcon icon={faSpinner} spin /> Menambahkan...</> : <><FontAwesomeIcon icon={faPlus} /> Tambah Hari Libur</>}
              </button>
            </div>
          </div>

          {/* Table of Holidays */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor }}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ background: subtleBg, borderColor }}>
                  <th className="px-4 py-2.5 font-mono uppercase text-[10px] tracking-wider" style={{ color: textSecondary }}>Periode Libur</th>
                  <th className="px-4 py-2.5 font-mono uppercase text-[10px] tracking-wider" style={{ color: textSecondary }}>Durasi</th>
                  <th className="px-4 py-2.5 font-mono uppercase text-[10px] tracking-wider" style={{ color: textSecondary }}>Nama Hari Libur</th>
                  <th className="px-4 py-2.5 font-mono uppercase text-[10px] tracking-wider" style={{ color: textSecondary }}>Lingkup</th>
                  <th className="px-4 py-2.5 font-mono uppercase text-[10px] tracking-wider text-right" style={{ color: textSecondary }}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor }}>
                {displayedHolidays.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: textSecondary }}>
                      Tidak ada data hari libur yang sesuai filter.
                    </td>
                  </tr>
                )}
                {displayedHolidays.map((h, i) => {
                  const days = diffDays(h.date_start, h.date_end)
                  const roleName = getRoleName(h.role_id)
                  const isEditing = editingId === h.id

                  if (isEditing) {
                    return (
                      <tr key={h.id} style={{ background: isDark ? 'rgba(59,130,246,0.08)' : '#F0F9FF' }}>
                        <td colSpan={5} className="p-4">
                          <div className="space-y-3">
                            <div className="font-semibold text-xs" style={{ color: textPrimary }}>
                              ✏️ Edit Hari Libur #{h.id}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: textSecondary }}>Nama Libur</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
                              </div>
                              <div>
                                <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: textSecondary }}>Mulai</label>
                                <input type="date" value={editDateStart} onChange={e => setEditDateStart(e.target.value)} style={inputStyle} />
                              </div>
                              <div>
                                <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: textSecondary }}>Selesai</label>
                                <input type="date" value={editDateEnd} min={editDateStart} onChange={e => setEditDateEnd(e.target.value)} style={inputStyle} />
                              </div>
                              <div>
                                <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: textSecondary }}>Role</label>
                                <select value={editRoleId} onChange={e => setEditRoleId(e.target.value)} style={selectStyle}>
                                  <option value="">🌐 Global (Semua Role)</option>
                                  {roles.map(r => (
                                    <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {editMsg && (
                              <div className="text-xs text-red-600">{editMsg}</div>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={saveEditHoliday}
                                disabled={savingEdit}
                                className="px-3 py-1.5 rounded text-xs font-semibold"
                                style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF' }}
                              >
                                {savingEdit ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-3 py-1.5 rounded text-xs"
                                style={{ background: subtleBg, color: textSecondary, border: `1px solid ${borderColor}` }}
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={h.id} style={{ background: cardBg }}>
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap font-mono" style={{ color: textPrimary }}>
                        {formatDateRange(h.date_start, h.date_end)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#E1F3FE', color: '#1F6C9F', border: '1px solid #BAE6FD' }}>
                          {days === 1 ? '1 hari' : `${days} hari`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: textPrimary }}>
                        {h.name}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {roleName ? (
                          <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#FBF3DB', color: '#956400', border: '1px solid #FDE68A' }}>
                            {roleName}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#EDF3EC', color: '#346538', border: '1px solid #B2D8B4' }}>
                            Global
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEditHoliday(h)}
                          className="px-2.5 py-1 rounded text-xs font-medium mr-1.5 transition-all"
                          style={{ background: subtleBg, color: textPrimary, border: `1px solid ${borderColor}` }}
                        >
                          <FontAwesomeIcon icon={faEdit} className="mr-1 text-[10px]" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteHoliday(h.id)}
                          className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                          style={{ background: '#FDEBEC', color: '#9F2F2D', border: '1px solid #FECACA' }}
                        >
                          <FontAwesomeIcon icon={faTrash} className="mr-1 text-[10px]" />
                          Hapus
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 3: SETTINGS & LOG ════════════════════ */}
      {tab === 'settings' && (
        <div className="space-y-6">
          {/* Top Bento Cards: Configuration & Test Trigger */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Bento Card 1: Notification Policy Parameters */}
            <div className="p-4 rounded-lg border space-y-4" style={{ background: cardBg, borderColor }}>
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
                <h3 className="font-semibold text-sm" style={{ color: textPrimary }}>Notifikasi Otomatis</h3>
                {settingsMsg && (
                  <div className="px-2.5 py-0.5 rounded text-xs font-mono font-medium" style={{
                    background: settingsMsg.startsWith('✅') ? '#EDF3EC' : '#FDEBEC',
                    color: settingsMsg.startsWith('✅') ? '#346538' : '#9F2F2D',
                  }}>
                    {settingsMsg}
                  </div>
                )}
              </div>

              {/* Toggle Notifikasi */}
              <div className="flex items-center justify-between p-3 rounded" style={{ background: subtleBg }}>
                <div className="text-xs font-medium" style={{ color: textPrimary }}>Kirim Notifikasi Email Otomatis</div>
                <button
                  type="button"
                  onClick={() => setNotifEnabled(!notifEnabled)}
                  className="relative inline-flex h-5 w-10 items-center rounded-full transition-colors"
                  style={{ background: notifEnabled ? (isDark ? '#3B82F6' : '#111111') : '#D1D5DB' }}
                >
                  <span
                    className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                    style={{ transform: notifEnabled ? 'translateX(22px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>

              {/* Grace Period */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: textPrimary }}>
                  Toleransi Keterlambatan (Menit)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="60"
                    value={graceMinutes}
                    onChange={e => setGraceMinutes(e.target.value)}
                    style={{ ...inputStyle, width: '100px' }}
                  />
                  <span className="text-xs" style={{ color: textSecondary }}>menit setelah jam jadwal</span>
                </div>
              </div>

              {/* Admin Emails */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: textPrimary }}>
                  Email Rekap Admin / HR
                </label>
                <input
                  type="text"
                  value={adminEmails}
                  onChange={e => setAdminEmails(e.target.value)}
                  placeholder="hr@ccs.sch.id, admin@ccs.sch.id"
                  style={inputStyle}
                />
                <p className="text-[11px] mt-1" style={{ color: textSecondary }}>Pisahkan dengan koma jika lebih dari satu.</p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                  style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF', opacity: savingSettings ? 0.6 : 1 }}
                >
                  {savingSettings ? <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</> : <><FontAwesomeIcon icon={faSave} /> Simpan Pengaturan</>}
                </button>
              </div>
            </div>

            {/* Bento Card 2: Manual Testing & Diagnostics */}
            <div className="p-4 rounded-lg border space-y-4" style={{ background: cardBg, borderColor }}>
              <div className="border-b pb-3" style={{ borderColor }}>
                <h3 className="font-semibold text-sm" style={{ color: textPrimary }}>Uji Coba Email</h3>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: textSecondary }}>
                  Kirim Sampel ke Email Tujuan:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendTestEmail()}
                    placeholder="nama@email.com"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={sendTestEmail}
                    disabled={testRunning}
                    className="px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all"
                    style={{ background: subtleBg, color: textPrimary, border: `1px solid ${borderColor}`, opacity: testRunning ? 0.6 : 1 }}
                  >
                    {testRunning ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} />}
                    Kirim Sampel
                  </button>
                </div>
              </div>

              {testResult && (
                <div className="p-3 rounded border text-xs font-mono" style={{
                  background: testResult.success ? '#EDF3EC' : '#FDEBEC',
                  borderColor: testResult.success ? '#B2D8B4' : '#F8B4B4',
                  color: testResult.success ? '#346538' : '#9F2F2D'
                }}>
                  <div className="font-bold mb-1">{testResult.success ? '✅ SUKSES' : '❌ GAGAL'}: {testResult.message || testResult.error}</div>
                  {testResult.sentTo && <div className="text-[11px]">Tujuan: {testResult.sentTo}</div>}
                </div>
              )}

              {/* Trigger Manual Cron */}
              <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor }}>
                <div className="text-xs font-medium" style={{ color: textPrimary }}>Jalankan Audit Absensi Manual</div>
                <button
                  type="button"
                  onClick={triggerTestRun}
                  disabled={testRunning}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                  style={{ background: '#E1F3FE', color: '#1F6C9F', border: '1px solid #BAE6FD', opacity: testRunning ? 0.6 : 1 }}
                >
                  <FontAwesomeIcon icon={faSyncAlt} spin={testRunning} />
                  Jalankan Audit
                </button>
              </div>
            </div>
          </div>

          {/* Table 1: Riwayat Eksekusi Cron */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: subtleBg, borderColor }}>
              <h3 className="font-semibold text-xs font-mono uppercase tracking-wider" style={{ color: textPrimary }}>
                Riwayat Eksekusi Cron
              </h3>
              <button
                type="button"
                onClick={fetchRunLogs}
                className="px-2.5 py-1 rounded text-xs font-mono"
                style={{ background: cardBg, color: textSecondary, border: `1px solid ${borderColor}` }}
              >
                <FontAwesomeIcon icon={faSyncAlt} className="mr-1" />
                REFRESH
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b font-mono text-[10px] uppercase tracking-wider" style={{ background: cardBg, borderColor, color: textSecondary }}>
                    <th className="px-4 py-2.5">Waktu (WIB)</th>
                    <th className="px-4 py-2.5">Tgl Target</th>
                    <th className="px-4 py-2.5 text-center">User</th>
                    <th className="px-4 py-2.5 text-center">Pelanggaran</th>
                    <th className="px-4 py-2.5 text-center">Email OK</th>
                    <th className="px-4 py-2.5 text-center">Email Gagal</th>
                    <th className="px-4 py-2.5">Status Admin</th>
                    <th className="px-4 py-2.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor }}>
                  {runLogs.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-6 text-center" style={{ color: textSecondary }}>Belum ada riwayat eksekusi cron.</td></tr>
                  ) : (
                    runLogs.map(r => {
                      const ranAtWIB = r.ran_at ? new Date(new Date(r.ran_at).getTime() + 7*60*60*1000) : null
                      const ranStr = ranAtWIB
                        ? `${String(ranAtWIB.getUTCDate()).padStart(2,'0')}/${String(ranAtWIB.getUTCMonth()+1).padStart(2,'0')} ${String(ranAtWIB.getUTCHours()).padStart(2,'0')}:${String(ranAtWIB.getUTCMinutes()).padStart(2,'0')}`
                        : '—'
                      const isSkip  = !!r.skipped_reason
                      const isError = !!r.error_message
                      return (
                        <tr key={r.id} style={{ background: cardBg }}>
                          <td className="px-4 py-2 font-mono whitespace-nowrap" style={{ color: textPrimary }}>{ranStr}</td>
                          <td className="px-4 py-2 font-mono whitespace-nowrap" style={{ color: textSecondary }}>{r.target_date || '—'}</td>
                          <td className="px-4 py-2 font-mono text-center" style={{ color: textPrimary }}>{isSkip || isError ? '—' : r.users_processed}</td>
                          <td className="px-4 py-2 font-mono text-center font-semibold" style={{ color: r.violations_found > 0 ? '#956400' : textSecondary }}>
                            {isSkip || isError ? '—' : r.violations_found}
                          </td>
                          <td className="px-4 py-2 font-mono text-center">
                            {isSkip || isError ? '—' : <span className="text-emerald-600 font-semibold">{r.emails_sent}</span>}
                          </td>
                          <td className="px-4 py-2 font-mono text-center">
                            {isSkip || isError ? '—' : r.emails_failed > 0 ? <span className="text-red-600 font-bold">{r.emails_failed}</span> : '0'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {r.admin_email_ok === true  && <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#EDF3EC', color: '#346538', border: '1px solid #B2D8B4' }}>Terkirim</span>}
                            {r.admin_email_ok === false && <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#FDEBEC', color: '#9F2F2D', border: '1px solid #FECACA' }}>Gagal</span>}
                            {r.admin_email_ok === null  && <span className="text-gray-400 font-mono text-xs">—</span>}
                          </td>
                          <td className="px-4 py-2 text-[11px]" style={{ color: isError ? '#9F2F2D' : isSkip ? '#956400' : textSecondary }}>
                            {isError ? `Error: ${r.error_message}` : isSkip ? r.skipped_reason : 'Normal'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Log Notifikasi per Karyawan */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: subtleBg, borderColor }}>
              <h3 className="font-semibold text-xs font-mono uppercase tracking-wider" style={{ color: textPrimary }}>
                Log Notifikasi Karyawan
              </h3>
              <button
                type="button"
                onClick={fetchLogs}
                className="px-2.5 py-1 rounded text-xs font-mono"
                style={{ background: cardBg, color: textSecondary, border: `1px solid ${borderColor}` }}
              >
                <FontAwesomeIcon icon={faSyncAlt} className="mr-1" />
                REFRESH
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b font-mono text-[10px] uppercase tracking-wider" style={{ background: cardBg, borderColor, color: textSecondary }}>
                    <th className="px-4 py-2.5">Waktu Kirim</th>
                    <th className="px-4 py-2.5">Nama Karyawan</th>
                    <th className="px-4 py-2.5">Tgl Kejadian</th>
                    <th className="px-4 py-2.5">Jenis Pelanggaran</th>
                    <th className="px-4 py-2.5">Jadwal</th>
                    <th className="px-4 py-2.5">Aktual</th>
                    <th className="px-4 py-2.5">Email Penerima</th>
                    <th className="px-4 py-2.5 text-right">Status Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor }}>
                  {notifLogs.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-6 text-center" style={{ color: textSecondary }}>Belum ada log pengiriman email absensi.</td></tr>
                  ) : (
                    notifLogs.map(log => {
                      const nm = log.user
                        ? `${log.user.user_nama_depan || ''} ${log.user.user_nama_belakang || ''}`.trim()
                        : `User #${log.user_id}`
                      const notifInfo = NOTIF_TYPES[log.notif_type] || { label: log.notif_type, bg: '#F4F4F5', color: '#111111', border: '#E4E4E7' }
                      const sentAtWIB = log.sent_at ? new Date(new Date(log.sent_at).getTime() + 7*60*60*1000) : null
                      const sentStr = sentAtWIB
                        ? `${String(sentAtWIB.getUTCDate()).padStart(2,'0')}/${String(sentAtWIB.getUTCMonth()+1).padStart(2,'0')} ${String(sentAtWIB.getUTCHours()).padStart(2,'0')}:${String(sentAtWIB.getUTCMinutes()).padStart(2,'0')}`
                        : '—'

                      return (
                        <tr key={log.id} style={{ background: cardBg }}>
                          <td className="px-4 py-2 font-mono whitespace-nowrap" style={{ color: textSecondary }}>{sentStr}</td>
                          <td className="px-4 py-2 font-medium" style={{ color: textPrimary }}>{nm}</td>
                          <td className="px-4 py-2 font-mono whitespace-nowrap" style={{ color: textSecondary }}>{log.notif_date}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-xs" style={{ background: notifInfo.bg, color: notifInfo.color, border: `1px solid ${notifInfo.border}` }}>
                              {notifInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono" style={{ color: textSecondary }}>{log.scheduled_time || '—'}</td>
                          <td className="px-4 py-2 font-mono" style={{ color: textPrimary }}>{log.actual_time || '—'}</td>
                          <td className="px-4 py-2 font-mono text-[11px]" style={{ color: textSecondary }}>{(log.email_to || []).join(', ') || '—'}</td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            {log.success === true ? (
                              <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#EDF3EC', color: '#346538', border: '1px solid #B2D8B4' }}>
                                Terkirim
                              </span>
                            ) : log.success === false ? (
                              <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#FDEBEC', color: '#9F2F2D', border: '1px solid #FECACA' }}>
                                Gagal
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs" style={{ background: subtleBg, color: textSecondary, border: `1px solid ${borderColor}` }}>
                                Tanpa Email
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 4: HARI KHUSUS ════════════════════ */}
      {tab === 'special' && (
        <div className="space-y-6">
          {/* Form Tambah Aturan Hari Khusus */}
          <div className="p-4 rounded-lg border space-y-4" style={{ background: cardBg, borderColor }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
              <div className="text-sm font-semibold flex items-center gap-2" style={{ color: textPrimary }}>
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                Tambah Aturan Hari Khusus
              </div>
              {srMsg && (
                <div className="px-2.5 py-1 rounded text-xs font-mono font-medium" style={{
                  background: srMsg.startsWith('✅') ? '#EDF3EC' : '#FDEBEC',
                  color: srMsg.startsWith('✅') ? '#346538' : '#9F2F2D',
                  border: `1px solid ${srMsg.startsWith('✅') ? '#B2D8B4' : '#F8B4B4'}`
                }}>
                  {srMsg}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Tanggal *</label>
                <input type="date" value={srTanggal} onChange={e => setSrTanggal(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Berlaku Untuk *</label>
                <select value={srScope} onChange={e => { setSrScope(e.target.value); setSrRoleIds(new Set()); setSrUserId('') }} style={selectStyle}>
                  <option value="all">👥 Semua Karyawan</option>
                  <option value="role">🏷️ Jabatan Tertentu</option>
                  <option value="user">👤 Karyawan Tertentu</option>
                </select>
              </div>

              {srScope === 'role' && (
                <div className="md:col-span-2">
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: textSecondary }}>
                    Pilih Jabatan {srRoleIds.size > 0 && <span className="font-mono text-emerald-600">({srRoleIds.size} dipilih)</span>}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {roles.map(r => {
                      const checked = srRoleIds.has(r.role_id)
                      return (
                        <button
                          key={r.role_id}
                          type="button"
                          onClick={() => {
                            setSrRoleIds(prev => {
                              const next = new Set(prev)
                              if (next.has(r.role_id)) next.delete(r.role_id)
                              else next.add(r.role_id)
                              return next
                            })
                          }}
                          className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                          style={{
                            background: checked ? (isDark ? '#F4F4F5' : '#111111') : subtleBg,
                            color: checked ? (isDark ? '#111111' : '#FFFFFF') : textSecondary,
                            border: `1px solid ${checked ? (isDark ? '#F4F4F5' : '#111111') : borderColor}`,
                          }}
                        >
                          {checked ? '✓ ' : ''}{r.role_name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {srScope === 'user' && (
                <div className="md:col-span-2">
                  <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Pilih Karyawan *</label>
                  <select value={srUserId} onChange={e => setSrUserId(e.target.value)} style={selectStyle}>
                    <option value="">-- Pilih Karyawan --</option>
                    {allUsers.map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.user_nama_depan} {u.user_nama_belakang}{u.user_pin ? ` (PIN: ${u.user_pin})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Jam Masuk Custom (Kosong = Normal)</label>
                <input type="time" value={srCheckIn} onChange={e => setSrCheckIn(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Jam Keluar Custom (Kosong = Normal)</label>
                <input type="time" value={srCheckOut} onChange={e => setSrCheckOut(e.target.value)} style={inputStyle} />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Keterangan *</label>
                <input
                  type="text"
                  value={srKet}
                  onChange={e => setSrKet(e.target.value)}
                  placeholder="Contoh: Sabtu Wajib Masuk, Upacara Hari Kemerdekaan"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Policy Toggles */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSrIsWorkDay(!srIsWorkDay)}
                className="px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                style={{
                  background: srIsWorkDay ? '#EDF3EC' : '#FDEBEC',
                  color: srIsWorkDay ? '#346538' : '#9F2F2D',
                  border: `1px solid ${srIsWorkDay ? '#B2D8B4' : '#F8B4B4'}`
                }}
              >
                {srIsWorkDay ? 'Hari Kerja' : 'Bukan Hari Kerja (Libur)'}
              </button>

              {srIsWorkDay && (
                <button
                  type="button"
                  onClick={() => setSrIsFlexibleHours(!srIsFlexibleHours)}
                  className="px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                  style={{
                    background: srIsFlexibleHours ? '#FBF3DB' : subtleBg,
                    color: srIsFlexibleHours ? '#956400' : textSecondary,
                    border: `1px solid ${srIsFlexibleHours ? '#FDE68A' : borderColor}`
                  }}
                >
                  {srIsFlexibleHours ? 'Bebas Jam (Tanpa Sanksi)' : 'Jam Kerja Standar'}
                </button>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={saveSr}
                disabled={savingSr}
                className="px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF', opacity: savingSr ? 0.6 : 1 }}
              >
                {savingSr ? <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</> : <><FontAwesomeIcon icon={faPlus} /> Tambah Aturan Hari Khusus</>}
              </button>
            </div>
          </div>

          {/* Table of Special Day Rules */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor }}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b font-mono text-[10px] uppercase tracking-wider" style={{ background: subtleBg, borderColor, color: textSecondary }}>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Berlaku Untuk</th>
                  <th className="px-4 py-2.5">Jam Masuk</th>
                  <th className="px-4 py-2.5">Jam Keluar</th>
                  <th className="px-4 py-2.5">Sifat Kehadiran</th>
                  <th className="px-4 py-2.5">Keterangan</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor }}>
                {specialRules.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: textSecondary }}>Belum ada aturan hari khusus.</td></tr>
                ) : (
                  specialRules.map(r => {
                    const scopeLabel = r.scope_type === 'all'
                      ? 'Semua Karyawan'
                      : r.scope_type === 'role'
                        ? (r.role?.role_name || 'Jabatan')
                        : `${r.user?.user_nama_depan || ''} ${r.user?.user_nama_belakang || ''}`
                    const isFlexRule = !!r.is_flexible_hours || (r.keterangan || '').includes('[BEBAS_JAM]')
                    const displayKet = (r.keterangan || '').replace('[BEBAS_JAM]', '').trim()

                    return (
                      <tr key={r.id} style={{ background: cardBg }}>
                        <td className="px-4 py-2.5 font-mono font-medium whitespace-nowrap" style={{ color: textPrimary }}>{r.tanggal}</td>
                        <td className="px-4 py-2.5 font-medium" style={{ color: textPrimary }}>{scopeLabel}</td>
                        <td className="px-4 py-2.5 font-mono" style={{ color: textSecondary }}>
                          {r.custom_check_in ? String(r.custom_check_in).slice(0,5) : '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono" style={{ color: textSecondary }}>
                          {r.custom_check_out ? String(r.custom_check_out).slice(0,5) : '—'}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-xs" style={{
                              background: r.is_work_day ? '#EDF3EC' : '#FDEBEC',
                              color: r.is_work_day ? '#346538' : '#9F2F2D',
                              border: `1px solid ${r.is_work_day ? '#B2D8B4' : '#F8B4B4'}`
                            }}>
                              {r.is_work_day ? 'Hari Kerja' : 'Libur'}
                            </span>
                            {r.is_work_day && isFlexRule && (
                              <span className="px-2 py-0.5 rounded text-xs" style={{
                                background: '#FBF3DB',
                                color: '#956400',
                                border: '1px solid #FDE68A'
                              }}>
                                Bebas Jam
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: textSecondary }}>{displayKet || '—'}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => startEditSr(r)}
                            className="px-2.5 py-1 rounded text-xs font-medium mr-1.5 transition-all"
                            style={{ background: subtleBg, color: textPrimary, border: `1px solid ${borderColor}` }}
                          >
                            <FontAwesomeIcon icon={faEdit} className="mr-1 text-[10px]" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSr(r.id)}
                            className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                            style={{ background: '#FDEBEC', color: '#9F2F2D', border: '1px solid #FECACA' }}
                          >
                            <FontAwesomeIcon icon={faTrash} className="mr-1 text-[10px]" />
                            Hapus
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Edit Aturan Hari Khusus (Minimalist UI Standard) */}
          {showEditSrModal && (
            <Modal
              isOpen={showEditSrModal}
              onClose={() => { if (!savingEditSr) setShowEditSrModal(false) }}
              title="✏️ Edit Aturan Hari Khusus"
              size="md"
            >
              <div className="space-y-4 text-xs">
                {editSrMsg && (
                  <div className="p-3 rounded text-xs font-medium font-mono" style={{
                    background: editSrMsg.startsWith('✅') ? '#EDF3EC' : '#FDEBEC',
                    color: editSrMsg.startsWith('✅') ? '#346538' : '#9F2F2D',
                    border: `1px solid ${editSrMsg.startsWith('✅') ? '#B2D8B4' : '#F8B4B4'}`
                  }}>
                    {editSrMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Tanggal *</label>
                    <input
                      type="date"
                      value={editSrTanggal}
                      onChange={e => setEditSrTanggal(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Berlaku Untuk *</label>
                    <select
                      value={editSrScope}
                      onChange={e => {
                        setEditSrScope(e.target.value)
                        if (e.target.value !== 'role') setEditSrRoleId('')
                        if (e.target.value !== 'user') setEditSrUserId('')
                      }}
                      style={selectStyle}
                    >
                      <option value="all">👥 Semua Karyawan</option>
                      <option value="role">🏷️ Jabatan Tertentu</option>
                      <option value="user">👤 Karyawan Tertentu</option>
                    </select>
                  </div>

                  {editSrScope === 'role' && (
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Pilih Jabatan *</label>
                      <select
                        value={editSrRoleId}
                        onChange={e => setEditSrRoleId(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">-- Pilih Jabatan --</option>
                        {roles.map(r => (
                          <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editSrScope === 'user' && (
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Pilih Karyawan *</label>
                      <select
                        value={editSrUserId}
                        onChange={e => setEditSrUserId(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">-- Pilih Karyawan --</option>
                        {allUsers.map(u => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.user_nama_depan} {u.user_nama_belakang}{u.user_pin ? ` (PIN: ${u.user_pin})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Jam Masuk Custom (Kosong = Normal)</label>
                    <input
                      type="time"
                      value={editSrCheckIn}
                      onChange={e => setEditSrCheckIn(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Jam Keluar Custom (Kosong = Normal)</label>
                    <input
                      type="time"
                      value={editSrCheckOut}
                      onChange={e => setEditSrCheckOut(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>Keterangan *</label>
                    <input
                      type="text"
                      value={editSrKet}
                      onChange={e => setEditSrKet(e.target.value)}
                      placeholder="Contoh: Shift 2 Expo, Upacara 17 Agustus"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditSrIsWorkDay(!editSrIsWorkDay)}
                    className="px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                    style={{
                      background: editSrIsWorkDay ? '#EDF3EC' : '#FDEBEC',
                      color: editSrIsWorkDay ? '#346538' : '#9F2F2D',
                      border: `1px solid ${editSrIsWorkDay ? '#B2D8B4' : '#F8B4B4'}`
                    }}
                  >
                    {editSrIsWorkDay ? 'Hari Kerja' : 'Bukan Hari Kerja (Libur)'}
                  </button>

                  {editSrIsWorkDay && (
                    <button
                      type="button"
                      onClick={() => setEditSrIsFlexibleHours(!editSrIsFlexibleHours)}
                      className="px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                      style={{
                        background: editSrIsFlexibleHours ? '#FBF3DB' : subtleBg,
                        color: editSrIsFlexibleHours ? '#956400' : textSecondary,
                        border: `1px solid ${editSrIsFlexibleHours ? '#FDE68A' : borderColor}`
                      }}
                    >
                      {editSrIsFlexibleHours ? 'Bebas Jam (Tanpa Sanksi)' : 'Jam Kerja Standar'}
                    </button>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor }}>
                  <button
                    type="button"
                    onClick={() => setShowEditSrModal(false)}
                    disabled={savingEditSr}
                    className="px-4 py-2 rounded text-xs font-medium"
                    style={{ background: subtleBg, color: textSecondary, border: `1px solid ${borderColor}` }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={saveEditSr}
                    disabled={savingEditSr}
                    className="px-5 py-2 rounded text-xs font-semibold flex items-center gap-1.5"
                    style={{ background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF', opacity: savingEditSr ? 0.6 : 1 }}
                  >
                    {savingEditSr ? <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</> : <><FontAwesomeIcon icon={faSave} /> Simpan Perubahan</>}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ════════════════════ TAB 5: APPROVER PER JABATAN ════════════════════ */}
      {tab === 'approvers' && (
        <div className="space-y-4">
          {uaMsg && (
            <div className="px-3 py-1.5 rounded text-xs font-medium" style={{
              background: uaMsg.startsWith('✅') ? '#EDF3EC' : '#FDEBEC',
              color: uaMsg.startsWith('✅') ? '#346538' : '#9F2F2D',
              border: `1px solid ${uaMsg.startsWith('✅') ? '#B2D8B4' : '#F8B4B4'}`
            }}>
              {uaMsg}
            </div>
          )}

          {/* Bento Grid: Role Approvers */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {roleApprovers.map(role => {
              const edit = uaEdits[role.role_id] || { approver1_id: '', approver2_id: '' }
              const isConfigured = !!edit.approver1_id
              const isSaving = savingUa === role.role_id

              return (
                <div
                  key={role.role_id}
                  className="p-4 rounded-lg border flex flex-col justify-between transition-all"
                  style={{ background: cardBg, borderColor }}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="font-semibold text-sm" style={{ color: textPrimary }}>
                        {role.role_name}
                      </div>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: isConfigured ? '#EDF3EC' : '#FBF3DB',
                          color: isConfigured ? '#346538' : '#956400',
                          border: `1px solid ${isConfigured ? '#B2D8B4' : '#FDE68A'}`
                        }}
                      >
                        {isConfigured ? 'Terkonfigurasi' : 'Belum Diatur'}
                      </span>
                    </div>

                    {/* Approver Selects */}
                    <div className="space-y-2.5 my-2">
                      <div>
                        <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>
                          Approver 1 (Atasan Langsung / Principal) *
                        </label>
                        <select
                          value={edit.approver1_id}
                          onChange={e => setUaEdits(prev => ({ ...prev, [role.role_id]: { ...prev[role.role_id], approver1_id: e.target.value } }))}
                          style={selectStyle}
                        >
                          <option value="">-- Pilih Approver 1 --</option>
                          {allUsers.map(u => (
                            <option key={u.user_id} value={u.user_id}>
                              {u.user_nama_depan} {u.user_nama_belakang}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium block mb-1" style={{ color: textSecondary }}>
                          Approver 2 (Opsional / Head of School)
                        </label>
                        <select
                          value={edit.approver2_id}
                          onChange={e => setUaEdits(prev => ({ ...prev, [role.role_id]: { ...prev[role.role_id], approver2_id: e.target.value } }))}
                          style={selectStyle}
                        >
                          <option value="">-- Tanpa Approver 2 --</option>
                          {allUsers.map(u => (
                            <option key={u.user_id} value={u.user_id}>
                              {u.user_nama_depan} {u.user_nama_belakang}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 mt-2 border-t flex justify-end" style={{ borderColor }}>
                    <button
                      type="button"
                      onClick={() => saveRoleApprover(role.role_id)}
                      disabled={isSaving}
                      className="px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
                      style={{
                        background: isDark ? '#F4F4F5' : '#111111',
                        color: isDark ? '#111111' : '#FFFFFF',
                        opacity: isSaving ? 0.6 : 1,
                        cursor: isSaving ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isSaving ? <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</> : <><FontAwesomeIcon icon={faSave} /> Simpan</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
