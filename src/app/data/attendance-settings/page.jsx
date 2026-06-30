'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'

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
  late:        { label: '🕐 Terlambat',       bg: '#fef3c7', color: '#92400e' },
  leave_early: { label: '🚪 Pulang Awal',      bg: '#fee2e2', color: '#991b1b' },
  no_checkin:  { label: '❌ Tidak Check-In',   bg: '#ede9fe', color: '#5b21b6' },
  no_checkout: { label: '⚠️ Tidak Check-Out',  bg: '#ffedd5', color: '#9a3412' },
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

  // ── Tab 4: Hari Khusus (Special Day Rules) ─────────────────────────────────────
  const [specialRules, setSpecialRules]     = useState([])
  const [allUsers, setAllUsers]             = useState([])
  const [srMsg, setSrMsg]                   = useState('')
  const [editingSrId, setEditingSrId]       = useState(null)
  // form fields
  const [srTanggal, setSrTanggal]           = useState('')
  const [srScope, setSrScope]               = useState('all')
  const [srRoleIds, setSrRoleIds]           = useState(new Set()) // multi-checkbox untuk jabatan
  const [srUserId, setSrUserId]             = useState('')
  const [srIsWorkDay, setSrIsWorkDay]       = useState(true)
  const [srCheckIn, setSrCheckIn]           = useState('')
  const [srCheckOut, setSrCheckOut]         = useState('')
  const [srKet, setSrKet]                   = useState('')
  const [savingSr, setSavingSr]             = useState(false)

  // ── Tab 3: Settings & Log ──────────────────────────────────────────────────
  const [adminEmails, setAdminEmails]   = useState('')
  const [graceMinutes, setGraceMinutes] = useState('0')
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg]   = useState('')
  const [notifLogs, setNotifLogs]       = useState([])
  const [logsLoading, setLogsLoading]   = useState(false)
  const [testRunning, setTestRunning]   = useState(false)
  const [testResult, setTestResult]     = useState(null)
  const [testEmail, setTestEmail]       = useState('')

  useEffect(() => {
    fetchRoles()
    fetchHolidays()
    fetchSettings()
    fetchLogs()
    fetchSpecialRules()
    fetchAllUsers()
    fetchRoleApprovers()
  }, [])

  // auto-fill end date when start changes (default to same day)
  useEffect(() => {
    if (newDateStart && !newDateEnd) setNewDateEnd(newDateStart)
  }, [newDateStart])

  const resetSrForm = () => {
    setSrTanggal(''); setSrScope('all'); setSrRoleIds(new Set()); setSrUserId('')
    setSrIsWorkDay(true); setSrCheckIn(''); setSrCheckOut(''); setSrKet('')
    setEditingSrId(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ROLES
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
      .not('user_pin', 'is', null)
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
    } catch (_) {
      setSpecialRules([])
    }
  }


  const saveSr = async () => {
    if (!srTanggal) { setSrMsg('\u274c Tanggal wajib diisi'); return }
    if (srScope === 'role' && srRoleIds.size === 0) { setSrMsg('\u274c Pilih minimal satu jabatan'); return }
    if (srScope === 'user' && !srUserId) { setSrMsg('\u274c Pilih karyawan'); return }
    setSavingSr(true); setSrMsg('')

    const basePayload = {
      tanggal:          srTanggal,
      is_work_day:      srIsWorkDay,
      custom_check_in:  srCheckIn  || null,
      custom_check_out: srCheckOut || null,
      keterangan:       srKet.trim() || null,
    }

    try {
      if (editingSrId) {
        // Edit: selalu single row
        const payload = {
          ...basePayload,
          scope_type: srScope,
          role_id: srScope === 'role' ? [...srRoleIds][0] : null,
          user_id: srScope === 'user' ? parseInt(srUserId, 10) : null,
          id: editingSrId,
        }
        const res = await fetch('/api/attendance/special-day-rules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.message)
      } else if (srScope === 'role') {
        // Tambah: insert satu baris per jabatan yang dipilih
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
        // scope = all or user
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

      setSrMsg(editingSrId ? '\u2705 Aturan berhasil diperbarui' : '\u2705 Aturan berhasil ditambahkan')
      resetSrForm()
      fetchSpecialRules()
      setTimeout(() => setSrMsg(''), 3000)
    } catch (err) {
      setSrMsg('\u274c ' + err.message)
    } finally {
      setSavingSr(false)
    }
  }

  const startEditSr = (r) => {
    setEditingSrId(r.id)
    setSrTanggal(r.tanggal)
    setSrScope(r.scope_type)
    setSrRoleIds(r.role_id ? new Set([r.role_id]) : new Set())
    setSrUserId(r.user_id ? String(r.user_id) : '')
    setSrIsWorkDay(r.is_work_day)
    setSrCheckIn(r.custom_check_in  ? String(r.custom_check_in).slice(0,5)  : '')
    setSrCheckOut(r.custom_check_out ? String(r.custom_check_out).slice(0,5) : '')
    setSrKet(r.keterangan || '')
    setSrMsg('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteSr = async (id) => {
    if (!confirm('Hapus aturan ini?')) return
    const res = await fetch(`/api/attendance/special-day-rules?id=${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.success) { setSrMsg('\u274c ' + json.message); return }
    setSrMsg('\u2705 Aturan dihapus')
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

  // ─────────────────────────────────────────────────────────────────────────
  // HOLIDAYS
  // ─────────────────────────────────────────────────────────────────────────
  const fetchHolidays = async () => {
    const { data } = await supabase
      .from('school_holidays')
      .select('id, date_start, date_end, name, role_id')
      .order('date_start', { ascending: true })
    setHolidays(data || [])
  }

  /**
   * Cek apakah range [start, end] untuk role tertentu bentrok dengan
   * holiday lain yang sudah ada (exclude excludeId jika sedang edit).
   * Hari libur global bentrok dengan global. Role-specific hanya bentrok sesama role.
   */
  const checkHolidayOverlap = (start, end, roleId, excludeId = null) => {
    return holidays.filter(h => {
      if (excludeId && h.id === excludeId) return false
      // Cek apakah role sama (null === null, atau id sama)
      const sameRole = (h.role_id === null && roleId === null) ||
                       (h.role_id !== null && roleId !== null && h.role_id === roleId)
      if (!sameRole) return false
      // Cek date overlap: tidak overlap hanya jika end < h.date_start OR start > h.date_end
      return !(end < h.date_start || start > h.date_end)
    })
  }

  const addHoliday = async () => {
    if (!newDateStart || !newName.trim()) {
      setHolidayMsg('❌ Tanggal mulai dan nama wajib diisi')
      return
    }
    const endDate = newDateEnd || newDateStart
    if (endDate < newDateStart) {
      setHolidayMsg('❌ Tanggal akhir tidak boleh sebelum tanggal mulai')
      return
    }

    // Conflict check
    const roleIdVal = newRoleId ? parseInt(newRoleId, 10) : null
    const overlaps = checkHolidayOverlap(newDateStart, endDate, roleIdVal)
    if (overlaps.length > 0) {
      const o = overlaps[0]
      setHolidayMsg(`❌ Bentrok dengan hari libur "${o.name}" (${formatDateRange(o.date_start, o.date_end)}) untuk role yang sama`)
      return
    }

    setAddingHoliday(true)
    setHolidayMsg('')
    const payload = {
      name: newName.trim(),
      date: newDateStart,          // backward compat
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
      setEditMsg('❌ Tanggal mulai dan nama wajib diisi')
      return
    }
    const endDate = editDateEnd || editDateStart
    if (endDate < editDateStart) {
      setEditMsg('❌ Tanggal akhir tidak boleh sebelum tanggal mulai')
      return
    }

    // Conflict check — exclude current record
    const roleIdVal = editRoleId ? parseInt(editRoleId, 10) : null
    const overlaps = checkHolidayOverlap(editDateStart, endDate, roleIdVal, editingId)
    if (overlaps.length > 0) {
      const o = overlaps[0]
      setEditMsg(`❌ Bentrok dengan "${o.name}" (${formatDateRange(o.date_start, o.date_end)}) untuk role yang sama`)
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

  // Filter displayed holidays
  const displayedHolidays = holidays.filter(h => {
    if (filterRoleId === 'all') return true
    if (filterRoleId === 'global') return h.role_id === null
    return String(h.role_id) === filterRoleId
  })

  // ─────────────────────────────────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
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
      .order('sent_at', { ascending: false })
      .limit(30)
    setNotifLogs(data || [])
    setLogsLoading(false)
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
    } catch (e) {
      setTestResult({ success: false, error: e.message })
    }
    setTestRunning(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const tabStyle = (t) => ({
    padding: '10px 20px',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: tab === t ? `2px solid ${theme.blueText || '#2563eb'}` : '2px solid transparent',
    color: tab === t ? (theme.blueText || '#2563eb') : (theme.textSecondary || '#6b7280'),
    fontWeight: tab === t ? 600 : 400,
    cursor: 'pointer',
    fontSize: '14px',
    background: 'transparent',
    transition: 'all 0.15s',
    outline: 'none',
  })

  const getRoleName = (roleId) => {
    if (roleId === null || roleId === undefined) return null
    const r = roles.find(r => r.role_id === roleId)
    return r?.role_name || `Role #${roleId}`
  }

  const inputStyle = {
    background: theme.inputBg || theme.subtleBg,
    border: `1px solid ${theme.border}`,
    color: theme.textBody,
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    width: '100%',
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6" style={{ color: theme.textBody }}>
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold" style={{ color: theme.textPrimary }}>
          ⏰ Pengaturan Notifikasi Absensi
        </h1>
        <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
          Konfigurasi hari kerja per role, kalender libur, dan pengaturan email notifikasi keterlambatan
        </p>
      </div>

      {/* Info banner */}
      <div className="p-4 rounded-xl text-sm" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>
        <strong>ℹ️ Cara kerja:</strong> Setiap hari jam 00:01 WIB, sistem menganalisa absensi kemarin dan mengirim email notifikasi
        untuk keterlambatan, pulang awal, tidak check-in, dan tidak check-out — kecuali hari libur.
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${theme.border}` }}>
        <button style={tabStyle('workdays')} onClick={() => setTab('workdays')}>📅 Hari Kerja per Role</button>
        <button style={tabStyle('holidays')} onClick={() => setTab('holidays')}>🗓️ Kalender Libur</button>
        <button style={tabStyle('special')}  onClick={() => setTab('special')}>⭐ Hari Khusus</button>
        <button style={tabStyle('approvers')} onClick={() => setTab('approvers')}>👥 Approver per Unit</button>
        <button style={tabStyle('settings')} onClick={() => setTab('settings')}>⚙️ Pengaturan &amp; Log</button>
      </div>

      {/* ══════════════════ TAB 1: WORK DAYS ══════════════════ */}
      {tab === 'workdays' && (
        <div className="space-y-4">
          {rolesMsg && (
            <div className="p-3 rounded-lg text-sm" style={{
              background: rolesMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
              color: rolesMsg.startsWith('✅') ? '#166534' : '#991b1b'
            }}>
              {rolesMsg}
            </div>
          )}
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            Centang hari kerja untuk setiap role. Notifikasi absensi hanya dikirim pada hari yang dicentang.
          </p>
          <div className="space-y-3">
            {roles.map(role => {
              const activeDays = (role.work_days || '1,2,3,4,5').split(',').map(Number)
              return (
                <div key={role.role_id} className="p-4 rounded-xl" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: theme.textPrimary }}>{role.role_name}</div>
                      <div className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>
                        {activeDays.length === 0
                          ? 'Tidak ada hari kerja — tidak akan ada notifikasi'
                          : `${activeDays.length} hari kerja aktif`}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAY_LABELS.map(day => {
                        const active = activeDays.includes(day.num)
                        return (
                          <button
                            key={day.num}
                            onClick={() => toggleDay(role.role_id, day.num)}
                            className="w-10 h-10 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              background: active ? (theme.blueText || '#2563eb') : (theme.subtleBg || '#f3f4f6'),
                              color: active ? '#fff' : (theme.textSecondary || '#6b7280'),
                              border: `1px solid ${active ? (theme.blueText || '#2563eb') : (theme.border || '#e5e7eb')}`,
                            }}
                            title={day.full}
                          >
                            {day.short}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => saveRoleWorkDays(role)}
                      disabled={savingRole === role.role_id}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: theme.blueText || '#2563eb',
                        color: '#fff',
                        opacity: savingRole === role.role_id ? 0.6 : 1
                      }}
                    >
                      {savingRole === role.role_id ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 2: HOLIDAYS ══════════════════ */}
      {tab === 'holidays' && (
        <div className="space-y-5">

          {/* Add form */}
          <div className="p-5 rounded-xl space-y-4" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
            <h3 className="font-semibold text-sm" style={{ color: theme.textPrimary }}>➕ Tambah Hari Libur</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>Nama Hari Libur *</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Contoh: Libur Semester Ganjil"
                />
              </div>

              {/* Date Start */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>Tanggal Mulai *</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={newDateStart}
                  onChange={e => { setNewDateStart(e.target.value); if (!newDateEnd || newDateEnd < e.target.value) setNewDateEnd(e.target.value) }}
                />
              </div>

              {/* Date End */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>
                  Tanggal Akhir
                  <span className="ml-1 font-normal" style={{ color: theme.textSecondary }}>(kosongkan jika 1 hari)</span>
                </label>
                <input
                  style={inputStyle}
                  type="date"
                  value={newDateEnd}
                  min={newDateStart}
                  onChange={e => setNewDateEnd(e.target.value)}
                />
              </div>

              {/* Role */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>
                  Berlaku untuk Role
                  <span className="ml-1 font-normal">(kosongkan = berlaku untuk semua/global)</span>
                </label>
                <select
                  style={inputStyle}
                  value={newRoleId}
                  onChange={e => setNewRoleId(e.target.value)}
                >
                  <option value="">🌐 Global (semua role)</option>
                  {roles.map(r => (
                    <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            {newDateStart && (
              <div className="p-3 rounded-lg text-xs" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                <strong style={{ color: theme.textPrimary }}>Preview:</strong>{' '}
                <span style={{ color: '#16a34a', fontWeight: 600 }}>{newName || '(nama belum diisi)'}</span>
                {' '}—{' '}{formatDateRange(newDateStart, newDateEnd || newDateStart)}
                {newDateStart !== (newDateEnd || newDateStart) && (
                  <span> ({diffDays(newDateStart, newDateEnd || newDateStart)} hari)</span>
                )}
                {' '}—{' '}
                {newRoleId ? <span>{getRoleName(parseInt(newRoleId)) || '...'}</span> : <span>🌐 Global</span>}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={addHoliday}
                disabled={addingHoliday}
                className="px-5 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#16a34a', color: '#fff', opacity: addingHoliday ? 0.6 : 1 }}
              >
                {addingHoliday ? 'Menambah...' : '+ Tambah Libur'}
              </button>
              {holidayMsg && (
                <span className="text-sm" style={{ color: holidayMsg.startsWith('✅') ? '#166534' : '#991b1b' }}>
                  {holidayMsg}
                </span>
              )}
            </div>
          </div>

          {/* Filter + List */}
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
            {/* Filter bar */}
            <div className="px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
              <span className="text-xs font-semibold" style={{ color: theme.textSecondary }}>FILTER:</span>
              {[
                { val: 'all',    label: `Semua (${holidays.length})` },
                { val: 'global', label: `🌐 Global (${holidays.filter(h => h.role_id === null).length})` },
                ...roles.map(r => ({
                  val: String(r.role_id),
                  label: `${r.role_name} (${holidays.filter(h => h.role_id === r.role_id).length})`
                }))
              ].map(f => (
                <button
                  key={f.val}
                  onClick={() => setFilterRoleId(f.val)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: filterRoleId === f.val ? (theme.blueText || '#2563eb') : 'transparent',
                    color: filterRoleId === f.val ? '#fff' : (theme.textSecondary),
                    border: `1px solid ${filterRoleId === f.val ? (theme.blueText || '#2563eb') : (theme.border)}`,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {displayedHolidays.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: theme.textSecondary }}>
                Belum ada hari libur terdaftar
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: theme.subtleBg }}>
                    {['Periode', 'Durasi', 'Nama Hari Libur', 'Berlaku untuk', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: theme.textSecondary }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedHolidays.map((h, i) => {
                    const days = diffDays(h.date_start, h.date_end)
                    const roleName = getRoleName(h.role_id)
                    const isEditing = editingId === h.id

                    // ── Inline edit row ──────────────────────────────────────
                    if (isEditing) return (
                      <tr key={h.id} style={{ borderTop: i > 0 ? `1px solid ${theme.border}` : 'none', background: theme.subtleBg }}>
                        <td colSpan={5} className="px-4 py-3">
                          <div className="space-y-3">
                            <div className="text-xs font-semibold" style={{ color: theme.textSecondary }}>✏️ Edit Hari Libur</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Name */}
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>Nama *</label>
                                <input
                                  style={inputStyle}
                                  type="text"
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  placeholder="Nama hari libur"
                                />
                              </div>
                              {/* Date Start */}
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>Tanggal Mulai *</label>
                                <input
                                  style={inputStyle}
                                  type="date"
                                  value={editDateStart}
                                  onChange={e => { setEditDateStart(e.target.value); if (editDateEnd < e.target.value) setEditDateEnd(e.target.value) }}
                                />
                              </div>
                              {/* Date End */}
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>Tanggal Akhir</label>
                                <input
                                  style={inputStyle}
                                  type="date"
                                  value={editDateEnd}
                                  min={editDateStart}
                                  onChange={e => setEditDateEnd(e.target.value)}
                                />
                              </div>
                              {/* Role */}
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>Berlaku untuk Role</label>
                                <select style={inputStyle} value={editRoleId} onChange={e => setEditRoleId(e.target.value)}>
                                  <option value="">🌐 Global (semua role)</option>
                                  {roles.map(r => (
                                    <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {editMsg && (
                              <div className="text-xs px-3 py-2 rounded-lg" style={{
                                background: editMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                                color: editMsg.startsWith('✅') ? '#166534' : '#991b1b'
                              }}>{editMsg}</div>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={saveEditHoliday}
                                disabled={savingEdit}
                                className="px-4 py-1.5 rounded-lg text-xs font-medium"
                                style={{ background: '#2563eb', color: '#fff', opacity: savingEdit ? 0.6 : 1 }}
                              >
                                {savingEdit ? 'Menyimpan...' : '💾 Simpan'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-1.5 rounded-lg text-xs font-medium"
                                style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )

                    // ── Normal view row ───────────────────────────────────────
                    return (
                      <tr key={h.id} style={{ borderTop: i > 0 ? `1px solid ${theme.border}` : 'none', background: theme.cardBg }}>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: theme.textPrimary, whiteSpace: 'nowrap' }}>
                          {formatDateRange(h.date_start, h.date_end)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#f0f9ff', color: '#0369a1' }}>
                            {days === 1 ? '1 hari' : `${days} hari`}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ color: theme.textPrimary }}>{h.name}</td>
                        <td className="px-4 py-3">
                          {roleName ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#fef3c7', color: '#92400e' }}>
                              👤 {roleName}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#f0fdf4', color: '#166534' }}>
                              🌐 Global
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => startEditHoliday(h)}
                            className="text-xs px-3 py-1 rounded-lg font-medium mr-2"
                            style={{ color: '#2563eb', background: '#eff6ff' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => deleteHoliday(h.id)}
                            className="text-xs px-3 py-1 rounded-lg font-medium"
                            style={{ color: '#dc2626', background: '#fee2e2' }}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 3: SETTINGS & LOG ══════════════════ */}
      {tab === 'settings' && (
        <div className="space-y-6">
          {/* Settings form */}
          <div className="p-5 rounded-xl space-y-5" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
            <h3 className="font-semibold text-sm" style={{ color: theme.textPrimary }}>Pengaturan Notifikasi</h3>

            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: theme.textPrimary }}>Aktifkan Notifikasi</div>
                <div className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>Matikan untuk menonaktifkan semua notifikasi absensi</div>
              </div>
              <button
                onClick={() => setNotifEnabled(!notifEnabled)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ background: notifEnabled ? (theme.blueText || '#2563eb') : '#d1d5db' }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  style={{ transform: notifEnabled ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
            </div>

            {/* Grace period */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>
                Toleransi Keterlambatan (menit)
              </label>
              <input
                type="number" min="0" max="60"
                value={graceMinutes}
                onChange={e => setGraceMinutes(e.target.value)}
                className="w-24 px-3 py-2 rounded-lg border text-sm"
                style={{ background: theme.inputBg || theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
              />
              <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                Jika 5, maka hadir 5 menit setelah jadwal dianggap tepat waktu. Default: 0
              </p>
            </div>

            {/* Admin emails */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>
                Email Admin/HR (penerima rekap harian)
              </label>
              <input
                type="text"
                value={adminEmails}
                onChange={e => setAdminEmails(e.target.value)}
                placeholder="hr@ccs.sch.id, admin@ccs.sch.id"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: theme.inputBg || theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
              />
              <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                Pisahkan dengan koma untuk beberapa email.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="px-5 py-2 rounded-lg text-sm font-medium"
                style={{ background: theme.blueText || '#2563eb', color: '#fff', opacity: savingSettings ? 0.6 : 1 }}
              >
                {savingSettings ? 'Menyimpan...' : '💾 Simpan Pengaturan'}
              </button>
              {settingsMsg && (
                <span className="text-sm" style={{ color: settingsMsg.startsWith('✅') ? '#166534' : '#991b1b' }}>
                  {settingsMsg}
                </span>
              )}
            </div>
          </div>

          {/* ── Test Email ────────────────────────────────────────────────── */}
          <div className="p-5 rounded-xl space-y-4" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: theme.textPrimary }}>🧪 Test Kirim Email</h3>
              <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                Kirim 6 email contoh (semua jenis pelanggaran) ke alamat email yang Anda tentukan.
                Subject akan diawali <code style={{ background: theme.subtleBg, padding: '1px 4px', borderRadius: 3 }}>[TEST]</code> agar mudah diidentifikasi.
              </p>
            </div>

            {/* Email input + button */}
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>
                  Kirim test ke email:
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendTestEmail()}
                  placeholder="contoh@email.com"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: theme.inputBg || theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                />
              </div>
              <button
                onClick={sendTestEmail}
                disabled={testRunning}
                className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                style={{ background: '#d97706', color: '#fff', opacity: testRunning ? 0.6 : 1, whiteSpace: 'nowrap' }}
              >
                {testRunning
                  ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> Mengirim...</>
                  : '📨 Kirim Test Email'}
              </button>
            </div>

            {/* Results */}
            {testResult && (
              <div>
                {/* Summary banner */}
                <div className="p-3 rounded-lg text-sm mb-3 flex items-center gap-2" style={{
                  background: testResult.success ? '#f0fdf4' : (testResult.failed > 0 ? '#fff7ed' : '#fef2f2'),
                  color:      testResult.success ? '#166534' : (testResult.failed > 0 ? '#92400e' : '#991b1b'),
                  border: `1px solid ${testResult.success ? '#bbf7d0' : (testResult.failed > 0 ? '#fed7aa' : '#fecaca')}`
                }}>
                  <span style={{ fontSize: 18 }}>{testResult.success ? '✅' : testResult.failed > 0 ? '⚠️' : '❌'}</span>
                  <div>
                    <div className="font-semibold">{testResult.message}</div>
                    {testResult.from && (
                      <div className="text-xs mt-0.5" style={{ opacity: 0.8 }}>
                        Dikirim dari: <strong>{testResult.from}</strong> → ke: <strong>{testResult.sentTo}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Per-type results table */}
                {testResult.results && (
                  <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: theme.subtleBg }}>
                          <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: theme.textSecondary }}>JENIS EMAIL</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: theme.textSecondary }}>STATUS</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: theme.textSecondary }}>KETERANGAN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResult.results.map((r, i) => (
                          <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${theme.border}` : 'none', background: theme.cardBg }}>
                            <td className="px-4 py-2.5 text-sm" style={{ color: theme.textPrimary }}>{r.label}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                                background: r.status === 'ok' ? '#dcfce7' : '#fee2e2',
                                color:      r.status === 'ok' ? '#166534' : '#991b1b'
                              }}>
                                {r.status === 'ok' ? '✓ Terkirim' : '✗ Gagal'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: theme.textSecondary }}>
                              {r.status === 'ok' ? 'Cek inbox / spam folder' : (r.error || 'Error tidak diketahui')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Info: what emails are sent */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { icon: '🕐', label: 'Terlambat',         desc: 'Check-in melebihi jadwal' },
                { icon: '🚪', label: 'Pulang Awal',        desc: 'Check-out sebelum jadwal' },
                { icon: '❌', label: 'Tidak Check-In',     desc: 'Tidak ada data check-in' },
                { icon: '⚠️', label: 'Tidak Check-Out',    desc: 'Tidak ada data check-out' },
                { icon: '🔀', label: 'Gabungan',           desc: 'Terlambat + Pulang Awal' },
                { icon: '📋', label: 'Rekap Admin',        desc: 'Tabel semua pelanggaran' },
              ].map(item => (
                <div key={item.label} className="p-2.5 rounded-lg text-xs" style={{ background: theme.subtleBg }}>
                  <div className="font-semibold" style={{ color: theme.textPrimary }}>{item.icon} {item.label}</div>
                  <div style={{ color: theme.textSecondary }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notification log */}
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
              <h3 className="font-semibold text-sm" style={{ color: theme.textPrimary }}>📋 Log Notifikasi Terbaru</h3>
              {logsLoading && <span className="text-xs" style={{ color: theme.textSecondary }}>Memuat...</span>}
            </div>
            {notifLogs.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: theme.textSecondary }}>Belum ada log notifikasi</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: theme.subtleBg }}>
                      {['Dikirim', 'Nama', 'Tgl Kejadian', 'Jenis', 'Terjadwal', 'Aktual', 'Status'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold" style={{ color: theme.textSecondary }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notifLogs.map(log => {
                      const nm = log.user
                        ? `${log.user.user_nama_depan || ''} ${log.user.user_nama_belakang || ''}`.trim()
                        : `User #${log.user_id}`
                      const notifInfo = NOTIF_TYPES[log.notif_type] || { label: log.notif_type, bg: '#f3f4f6', color: '#374151' }
                      return (
                        <tr key={log.id} style={{ borderTop: `1px solid ${theme.border}`, background: theme.cardBg }}>
                          <td className="px-3 py-2 text-xs" style={{ color: theme.textSecondary }}>
                            {new Date(log.sent_at).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                          </td>
                          <td className="px-3 py-2 text-xs font-medium" style={{ color: theme.textPrimary }}>{nm}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: theme.textSecondary }}>{log.notif_date}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: notifInfo.bg, color: notifInfo.color }}>
                              {notifInfo.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs" style={{ color: theme.textSecondary }}>{log.scheduled_time || '—'}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: theme.textPrimary }}>{log.actual_time || '—'}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: log.success ? '#dcfce7' : '#fee2e2', color: log.success ? '#166534' : '#991b1b' }}>
                              {log.success ? '✓ Terkirim' : '✗ Gagal'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ════════════════════ TAB 4: HARI KHUSUS ════════════════════ */}
      {tab === 'special' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            Atur hari khusus: Sabtu wajib masuk, jam pulang lebih awal (misal 17 Agustus), dsb.
            Berlaku untuk semua karyawan, jabatan tertentu, atau karyawan tertentu.
          </p>

          {srMsg && (
            <div className="p-3 rounded-lg text-sm" style={{
              background: srMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
              color: srMsg.startsWith('✅') ? '#166534' : '#991b1b'
            }}>{srMsg}</div>
          )}

          {/* Form tambah/edit */}
          <div className="p-4 rounded-xl space-y-4" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
            <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
              {editingSrId ? '✏️ Edit Aturan Hari Khusus' : '➕ Tambah Aturan Hari Khusus'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tanggal */}
              <div>
                <label className="text-xs font-medium" style={{ color: theme.textSecondary }}>Tanggal</label>
                <input type="date" value={srTanggal} onChange={e => setSrTanggal(e.target.value)}
                  style={inputStyle} />
              </div>

              {/* Berlaku untuk */}
              <div>
                <label className="text-xs font-medium" style={{ color: theme.textSecondary }}>Berlaku untuk</label>
                <select value={srScope} onChange={e => { setSrScope(e.target.value); setSrRoleIds(new Set()); setSrUserId('') }}
                  style={inputStyle}>
                  <option value="all">Semua karyawan</option>
                  <option value="role">Jabatan tertentu</option>
                  <option value="user">Karyawan tertentu</option>
                </select>
              </div>

              {/* Jabatan (jika scope = role) — multi-checkbox */}
              {srScope === 'role' && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium block mb-2" style={{ color: theme.textSecondary }}>
                    Pilih Jabatan
                    {srRoleIds.size > 0 && <span className="ml-2 text-blue-600">({srRoleIds.size} dipilih)</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{
                            background: checked ? (theme.blueText || '#2563eb') : (theme.subtleBg || '#f3f4f6'),
                            color: checked ? '#fff' : (theme.textBody),
                            border: `1px solid ${checked ? (theme.blueText || '#2563eb') : (theme.border || '#e5e7eb')}`,
                          }}
                        >
                          {checked ? '✓' : ''} {r.role_name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Karyawan (jika scope = user) */}
              {srScope === 'user' && (
                <div>
                  <label className="text-xs font-medium" style={{ color: theme.textSecondary }}>Karyawan</label>
                  <select value={srUserId} onChange={e => setSrUserId(e.target.value)} style={inputStyle}>
                    <option value="">-- Pilih karyawan --</option>
                    {allUsers.map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.user_nama_depan} {u.user_nama_belakang} (PIN: {u.user_pin})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Jam masuk custom */}
              <div>
                <label className="text-xs font-medium" style={{ color: theme.textSecondary }}>Jam Masuk (kosong = pakai jam normal)</label>
                <input type="time" value={srCheckIn} onChange={e => setSrCheckIn(e.target.value)} style={inputStyle} />
              </div>

              {/* Jam keluar custom */}
              <div>
                <label className="text-xs font-medium" style={{ color: theme.textSecondary }}>Jam Keluar (kosong = pakai jam normal)</label>
                <input type="time" value={srCheckOut} onChange={e => setSrCheckOut(e.target.value)} style={inputStyle} />
              </div>

              {/* Keterangan */}
              <div className="md:col-span-2">
                <label className="text-xs font-medium" style={{ color: theme.textSecondary }}>Keterangan</label>
                <input type="text" value={srKet} onChange={e => setSrKet(e.target.value)}
                  placeholder="Contoh: Sabtu Wajib Masuk, Upacara 17 Agustus"
                  style={inputStyle} />
              </div>
            </div>

            {/* Is Work Day toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSrIsWorkDay(!srIsWorkDay)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: srIsWorkDay ? '#dcfce7' : '#fee2e2',
                  color: srIsWorkDay ? '#166534' : '#991b1b',
                  border: `1px solid ${srIsWorkDay ? '#bbf7d0' : '#fecaca'}`
                }}
              >
                {srIsWorkDay ? '✅ Dihitung hari kerja' : '❌ Bukan hari kerja (libur pengganti)'}
              </button>
              <span className="text-xs" style={{ color: theme.textSecondary }}>
                {srIsWorkDay
                  ? 'Karyawan yang tidak hadir akan dihitung tidak masuk'
                  : 'Karyawan tidak diwajibkan hadir (tidak masuk tidak dihitung absen)'}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveSr}
                disabled={savingSr}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: theme.blueText || '#2563eb', color: '#fff', opacity: savingSr ? 0.6 : 1 }}
              >
                {savingSr ? 'Menyimpan...' : editingSrId ? 'Perbarui Aturan' : 'Tambah Aturan'}
              </button>
              {editingSrId && (
                <button onClick={resetSrForm} className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                  Batal
                </button>
              )}
            </div>
          </div>

          {/* Daftar aturan */}
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${theme.border}` }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
                  {['Tanggal', 'Berlaku untuk', 'Jam Masuk', 'Jam Keluar', 'Hari Kerja', 'Keterangan', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                      style={{ color: theme.textSecondary }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specialRules.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-sm" style={{ color: theme.textSecondary }}>
                    Belum ada aturan hari khusus
                  </td></tr>
                )}
                {specialRules.map((r, ri) => {
                  const scopeLabel = r.scope_type === 'all'
                    ? '👥 Semua karyawan'
                    : r.scope_type === 'role'
                      ? `🏷️ ${r.role?.role_name || 'Jabatan'}`
                      : `👤 ${r.user?.user_nama_depan || ''} ${r.user?.user_nama_belakang || ''}`
                  return (
                    <tr key={r.id} style={{ borderTop: ri > 0 ? `1px solid ${theme.border}` : 'none' }}>
                      <td className="px-3 py-2 font-medium" style={{ color: theme.textPrimary, whiteSpace: 'nowrap' }}>
                        {r.tanggal}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: theme.textBody }}>{scopeLabel}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: theme.textBody }}>
                        {r.custom_check_in ? String(r.custom_check_in).slice(0,5) : <span style={{ color: theme.textSecondary }}>—</span>}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: theme.textBody }}>
                        {r.custom_check_out ? String(r.custom_check_out).slice(0,5) : <span style={{ color: theme.textSecondary }}>—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                          background: r.is_work_day ? '#dcfce7' : '#fee2e2',
                          color:      r.is_work_day ? '#166534' : '#991b1b'
                        }}>{r.is_work_day ? 'Hari Kerja' : 'Libur'}</span>
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: theme.textSecondary }}>
                        {r.keterangan || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => startEditSr(r)}
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ background: '#eff6ff', color: '#1d4ed8' }}>Edit</button>
                          <button onClick={() => deleteSr(r.id)}
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ background: '#fef2f2', color: '#991b1b' }}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ════════════════════ TAB 5: APPROVER PER JABATAN ════════════════════ */}
      {tab === 'approvers' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            Tentukan siapa <strong>Approver 1</strong> (wajib) dan <strong>Approver 2</strong> (opsional) untuk setiap jabatan.
            Jika hanya Approver 1 yang diset, pengajuan langsung disetujui setelah Approver 1 menyetujui.
            Konfigurasi ini digunakan saat karyawan mengajukan surat keterangan absensi — approver ditentukan
            berdasarkan jabatan karyawan yang bersangkutan.
          </p>

          {uaMsg && (
            <div className="p-3 rounded-lg text-sm" style={{
              background: uaMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
              color: uaMsg.startsWith('✅') ? '#166534' : '#991b1b',
            }}>{uaMsg}</div>
          )}

          <div className="space-y-3">
            {roleApprovers.map(role => {
              const edit = uaEdits[role.role_id] || { approver1_id: '', approver2_id: '' }
              const configured = role.approver1 || role.approver2

              return (
                <div key={role.role_id} className="p-4 rounded-xl"
                  style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {/* Role name */}
                    <div className="font-semibold text-sm min-w-[160px]" style={{ color: theme.textPrimary }}>
                      {role.role_name}
                    </div>

                    {/* Approver selects */}
                    <div className="flex gap-3 flex-1 flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <label className="text-xs font-medium block mb-1" style={{ color: theme.textSecondary }}>Approver 1</label>
                        <select
                          value={edit.approver1_id}
                          onChange={e => setUaEdits(prev => ({ ...prev, [role.role_id]: { ...prev[role.role_id], approver1_id: e.target.value } }))}
                          style={inputStyle}
                        >
                          <option value="">-- Pilih Approver 1 --</option>
                          {allUsers.map(u => (
                            <option key={u.user_id} value={u.user_id}>
                              {u.user_nama_depan} {u.user_nama_belakang}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1 min-w-[180px]">
                        <label className="text-xs font-medium block mb-1" style={{ color: theme.textSecondary }}>Approver 2 <span style={{ fontWeight: 400, color: theme.textSecondary }}>(opsional)</span></label>
                        <select
                          value={edit.approver2_id}
                          onChange={e => setUaEdits(prev => ({ ...prev, [role.role_id]: { ...prev[role.role_id], approver2_id: e.target.value } }))}
                          style={inputStyle}
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

                    {/* Save button */}
                    <button
                      onClick={() => saveRoleApprover(role.role_id)}
                      disabled={savingUa === role.role_id}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{
                        background: theme.blueText || '#2563eb',
                        color: '#fff',
                        opacity: savingUa === role.role_id ? 0.6 : 1,
                        alignSelf: 'flex-end',
                        marginBottom: '2px',
                      }}
                    >
                      {savingUa === role.role_id ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>

                  {/* Current saved config */}
                  {configured ? (
                    <div className="mt-2 text-xs flex items-center gap-1" style={{ color: theme.textSecondary }}>
                      <span>Tersimpan:</span>
                      <span className="font-medium" style={{ color: theme.textBody }}>
                        {role.approver1 ? `${role.approver1.user_nama_depan} ${role.approver1.user_nama_belakang}` : '—'}
                      </span>
                      {role.approver2 ? (
                        <>
                          <span>→</span>
                          <span className="font-medium" style={{ color: theme.textBody }}>
                            {role.approver2.user_nama_depan} {role.approver2.user_nama_belakang}
                          </span>
                        </>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#f3f4f6', color: '#6b7280' }}>1 Approver</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs" style={{ color: theme.textSecondary }}>
                      Belum dikonfigurasi
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
