'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTrophy,
  faCrown,
  faMedal,
  faFire,
  faBolt,
  faDragon,
  faShieldAlt,
  faStar,
  faFlag,
  faPaw,
  faWater,
  faTv,
  faPlus,
  faTrash,
  faRotateRight,
  faEdit,
  faCheck,
  faHistory,
  faExclamationTriangle,
  faCalendarAlt,
  faCheckCircle,
  faArrowUpRightFromSquare
} from '@fortawesome/free-solid-svg-icons'

// Preset icon dictionary for athletic teams
const TEAM_ICONS = {
  dragon: faDragon,
  shield: faShieldAlt,
  bolt: faBolt,
  fire: faFire,
  feather: faFlag,
  star: faStar,
  paw: faPaw,
  fish: faWater,
  water: faWater,
  trophy: faTrophy,
  crown: faCrown
}

// Preset color options for teams
const PRESET_COLORS = [
  { name: 'Red', hex: '#EF4444', secondary: '#B91C1C' },
  { name: 'Blue', hex: '#3B82F6', secondary: '#1D4ED8' },
  { name: 'Green', hex: '#10B981', secondary: '#047857' },
  { name: 'Amber', hex: '#F59E0B', secondary: '#B45309' },
  { name: 'Purple', hex: '#8B5CF6', secondary: '#6D28D9' },
  { name: 'Orange', hex: '#F97316', secondary: '#C2410C' },
  { name: 'Teal', hex: '#14B8A6', secondary: '#0F766E' },
  { name: 'White', hex: '#71717A', secondary: '#A1A1AA' },
  { name: 'Black', hex: '#000000', secondary: '#1F2937' }
]

const normalizeTeamColor = (hex, teamName = '') => {
  const name = String(teamName || '').trim().toLowerCase()
  if (name === 'black' || name === 'hitam') {
    return '#000000'
  }
  if (name === 'white' || name === 'putih') {
    return '#71717A'
  }
  if (!hex) return '#3B82F6'
  const lower = String(hex).toLowerCase().trim()
  if (lower === '#ffffff' || lower === '#fff' || lower === 'white') {
    return '#71717A' // Use neutral grey so white team is clearly visible
  }
  if (lower === 'black' || lower === '#000' || lower === '#000000' || lower === '#111827') {
    return '#000000'
  }
  return hex
}

const isLightColor = (hex) => {
  if (!hex) return false
  const lower = hex.toLowerCase()
  if (lower === '#ffffff' || lower === '#fff' || lower === 'white') return true
  const h = hex.replace('#', '')
  if (h.length === 6) {
    const r = parseInt(h.substring(0, 2), 16)
    const g = parseInt(h.substring(2, 4), 16)
    const b = parseInt(h.substring(4, 6), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 180
  }
  return false
}

const ALLOWED_POINTS = [1, 2, 3, 4, 5]

export default function AthleticDayManagementPage() {
  const { theme, isDark } = useTheme()

  // Minimalist UI styling tokens matching /data/pyp
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const cardSubtleBg = isDark ? '#1F1F23' : '#F8FAFC'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'
  const accentColor = isDark ? '#60A5FA' : '#0284C7'
  const accentBg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#E0F2FE'

  // Server Data States
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [years, setYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [teams, setTeams] = useState([])
  const [scores, setScores] = useState([])
  const [leaderboard, setLeaderboard] = useState([])

  // Notification Toast
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Score Input Form State
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [activityName, setActivityName] = useState('')
  const [points, setPoints] = useState(5)
  const [notes, setNotes] = useState('')

  // Team Management Modal
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [teamForm, setTeamForm] = useState({
    name: '',
    color: '#3B82F6',
    secondary_color: '#1D4ED8',
    icon: 'shield',
    motto: ''
  })

  // Event Modal
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventForm, setEventForm] = useState({
    name: '',
    code: '',
    banner_color: '#0284C7',
    description: ''
  })

  // Delete Confirm Modal
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: null,
    id: null,
    name: ''
  })

  // Log filter
  const [scoreFilter, setScoreFilter] = useState('')

  // Shared Minimalist Input Style
  const inputStyle = {
    background: isDark ? '#18181B' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px',
    padding: '8px 12px',
    outline: 'none',
    transition: 'border-color 0.15s ease'
  }

  // Fetch data
  const fetchData = useCallback(async (yearId = null, eventId = null) => {
    try {
      setLoading(true)
      let url = '/api/athletic-day'
      const params = new URLSearchParams()
      if (yearId) params.set('year_id', yearId)
      if (eventId) params.set('event_id', eventId)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        setYears(data.years || [])
        setSelectedYearId(data.selected_year_id)
        setEvents(data.events || [])

        const currentEvId = data.selected_event?.id || (data.events && data.events[0]?.id) || null
        setSelectedEventId(currentEvId)
        setTeams(data.teams || [])
        setScores(data.scores || [])
        setLeaderboard(data.leaderboard || [])

        if (data.teams && data.teams.length > 0 && !selectedTeamId) {
          setSelectedTeamId(data.teams[0].id)
        }
      } else {
        showToast(data.message || 'Gagal memuat data', 'error')
      }
    } catch (err) {
      console.error('Fetch error:', err)
      showToast('Koneksi terganggu', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedTeamId])

  useEffect(() => {
    fetchData()
  }, [])

  const handleYearChange = (yearId) => {
    setSelectedYearId(yearId)
    fetchData(yearId, null)
  }

  const handleEventChange = (eventId) => {
    setSelectedEventId(eventId)
    fetchData(selectedYearId, eventId)
  }

  // Submit Score
  const handleAddScore = async (e) => {
    e?.preventDefault()
    if (!selectedTeamId) {
      showToast('Pilih tim terlebih dahulu', 'error')
      return
    }
    if (!activityName.trim()) {
      showToast('Masukkan nama cabang lomba', 'error')
      return
    }

    const numPoints = Number(points)
    if (![1, 2, 3, 4, 5].includes(numPoints)) {
      showToast('Nilai skor harus antara 1 sampai 5', 'error')
      return
    }

    try {
      setActionLoading(true)
      const res = await fetch('/api/athletic-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_score',
          event_id: selectedEventId,
          team_id: selectedTeamId,
          activity_name: activityName.trim(),
          points: numPoints,
          notes: notes.trim(),
          recorded_by: 'Admin'
        })
      })

      const data = await res.json()
      if (data.success) {
        showToast(`+${numPoints} poin berhasil dicatat`)
        setNotes('')
        fetchData(selectedYearId, selectedEventId)
      } else {
        showToast(data.message || 'Gagal menyimpan skor', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Terjadi kesalahan', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Save Team
  const handleSaveTeam = async (e) => {
    e.preventDefault()
    if (!teamForm.name.trim()) {
      showToast('Nama tim wajib diisi', 'error')
      return
    }

    try {
      setActionLoading(true)
      const isEdit = !!editingTeam
      const payload = isEdit
        ? {
            action: 'update_team',
            team_id: editingTeam.id,
            name: teamForm.name.trim(),
            color: teamForm.color,
            secondary_color: teamForm.secondary_color,
            icon: teamForm.icon,
            motto: teamForm.motto.trim()
          }
        : {
            action: 'create_team',
            event_id: selectedEventId,
            year_id: selectedYearId,
            name: teamForm.name.trim(),
            color: teamForm.color,
            secondary_color: teamForm.secondary_color,
            icon: teamForm.icon,
            motto: teamForm.motto.trim()
          }

      const res = await fetch('/api/athletic-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        showToast(isEdit ? 'Tim diperbarui' : 'Tim ditambahkan')
        setTeamModalOpen(false)
        setEditingTeam(null)
        setTeamForm({ name: '', color: '#3B82F6', secondary_color: '#1D4ED8', icon: 'shield', motto: '' })
        fetchData(selectedYearId, selectedEventId)
      } else {
        showToast(data.message || 'Gagal menyimpan tim', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Terjadi kesalahan', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditTeam = (team) => {
    setEditingTeam(team)
    setTeamForm({
      name: team.name,
      color: team.color || '#3B82F6',
      secondary_color: team.secondary_color || team.color || '#1D4ED8',
      icon: team.icon || 'shield',
      motto: team.motto || ''
    })
    setTeamModalOpen(true)
  }

  // Save Event
  const handleSaveEvent = async (e) => {
    e.preventDefault()
    if (!eventForm.name.trim()) {
      showToast('Nama acara wajib diisi', 'error')
      return
    }

    try {
      setActionLoading(true)
      const res = await fetch('/api/athletic-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_event',
          year_id: selectedYearId,
          name: eventForm.name.trim(),
          code: eventForm.code.trim() || eventForm.name.substring(0, 4).toUpperCase(),
          banner_color: eventForm.banner_color,
          description: eventForm.description.trim()
        })
      })

      const data = await res.json()
      if (data.success) {
        showToast('Acara dibuat')
        setEventModalOpen(false)
        setEventForm({ name: '', code: '', banner_color: '#0284C7', description: '' })
        fetchData(selectedYearId, data.data?.id)
      } else {
        showToast(data.message || 'Gagal membuat acara', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Terjadi kesalahan', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Action
  const executeDelete = async () => {
    try {
      setActionLoading(true)
      let payload = {}
      if (deleteModal.type === 'score') {
        payload = { action: 'delete_score', score_id: deleteModal.id }
      } else if (deleteModal.type === 'team') {
        payload = { action: 'delete_team', team_id: deleteModal.id }
      } else if (deleteModal.type === 'reset_scores') {
        payload = { action: 'reset_scores', event_id: selectedEventId }
      }

      const res = await fetch('/api/athletic-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        showToast('Berhasil dihapus')
        setDeleteModal({ open: false, type: null, id: null, name: '' })
        fetchData(selectedYearId, selectedEventId)
      } else {
        showToast(data.message || 'Gagal memproses', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Terjadi kesalahan', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Filtered scores
  const filteredScores = useMemo(() => {
    if (!scoreFilter.trim()) return scores
    const q = scoreFilter.toLowerCase()
    return scores.filter(
      s =>
        s.team_name?.toLowerCase().includes(q) ||
        s.activity_name?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q)
    )
  }, [scores, scoreFilter])

  const currentEvent = events.find(e => Number(e.id) === Number(selectedEventId))

  return (
    <div
      style={{
        background: pageBg,
        minHeight: '100vh',
        padding: '24px 32px',
        color: textPrimary,
        fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-3.5 py-2 rounded shadow-md flex items-center gap-2 text-xs font-semibold border transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/80 dark:border-rose-900 dark:text-rose-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/80 dark:border-emerald-900 dark:text-emerald-200'
          }`}
        >
          <FontAwesomeIcon icon={toast.type === 'error' ? faExclamationTriangle : faCheckCircle} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER & ACTIONS ────────────────────────────────────────────── */}
      <div className="pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6" style={{ borderColor }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center border"
            style={{
              background: accentBg,
              borderColor: isDark ? '#2563EB' : '#BAE6FD',
              color: accentColor
            }}
          >
            <FontAwesomeIcon icon={faTrophy} className="text-sm" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: textPrimary, margin: 0 }}>
              Athletic Day
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(selectedYearId, selectedEventId)}
            disabled={loading}
            className="px-2.5 py-1.5 rounded border text-xs font-medium hover:opacity-80 transition cursor-pointer flex items-center gap-1.5"
            style={{ background: cardBg, borderColor, color: textSecondary }}
            title="Refresh Data"
          >
            <FontAwesomeIcon icon={faRotateRight} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <Link
            href={`/data/athletic-day/live?event_id=${selectedEventId || ''}&year_id=${selectedYearId || ''}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white transition cursor-pointer"
            style={{ backgroundColor: '#0284C7' }}
          >
            <FontAwesomeIcon icon={faTv} />
            <span>Live Scoreboard</span>
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[10px] opacity-75" />
          </Link>
        </div>
      </div>

      {/* ── FILTER BAR: ACADEMIC YEAR & EVENT SELECTOR ───────────────────── */}
      <div className="p-3 rounded border mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3" style={{ background: cardBg, borderColor }}>
        <div className="flex flex-wrap items-center gap-3">
          <div style={{ minWidth: '180px' }}>
            <span className="text-[11px] block mb-1 font-medium" style={{ color: textSecondary }}>
              Tahun Ajaran
            </span>
            <select
              value={selectedYearId || ''}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border outline-none cursor-pointer font-medium"
              style={{ background: cardBg, borderColor, color: textPrimary }}
            >
              {years.map(y => (
                <option key={y.year_id} value={y.year_id} className="text-black dark:text-white">
                  {y.year_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[11px] block mb-1 font-medium" style={{ color: textSecondary }}>
              Acara
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {events.map((ev) => {
                const isActive = Number(ev.id) === Number(selectedEventId)
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => handleEventChange(ev.id)}
                    className="px-2.5 py-1 rounded text-xs transition cursor-pointer border"
                    style={{
                      borderColor: isActive ? (isDark ? '#3B82F6' : '#0284C7') : borderColor,
                      background: isActive ? accentBg : (isDark ? '#27272A' : '#FFFFFF'),
                      color: isActive ? accentColor : textSecondary,
                      fontWeight: isActive ? 600 : 400
                    }}
                  >
                    <span>{ev.name}</span>
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => setEventModalOpen(true)}
                className="px-2 py-1 rounded text-xs border border-dashed transition cursor-pointer hover:opacity-80"
                style={{ borderColor, color: textSecondary }}
                title="Tambah Acara Baru"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-1 text-[10px]" />
                <span>Acara Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* Minimalist Stats */}
        <div className="flex items-center gap-3 text-xs" style={{ color: textSecondary }}>
          <span>{teams.length} Tim</span>
          <span>•</span>
          <span>{scores.length} Laga</span>
        </div>
      </div>

      {/* ── TWO-COLUMN MAIN WORKSPACE ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================================================================ */}
        {/* LEFT COLUMN: INPUT SKOR & MASTER TIM (7 Cols)                    */}
        {/* ================================================================ */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: INPUT SKOR */}
          <div className="p-4 rounded border" style={{ background: cardBg, borderColor }}>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3.5 pb-2 border-b" style={{ borderColor, color: textPrimary }}>
              Input Skor
            </h2>

            <form onSubmit={handleAddScore} className="space-y-3.5">
              {/* Team Picker */}
              <div>
                <label className="text-xs block mb-1.5 font-medium" style={{ color: textSecondary }}>
                  Tim
                </label>
                {teams.length === 0 ? (
                  <div className="p-3 rounded border border-dashed text-center text-xs" style={{ borderColor, color: textSecondary }}>
                    Belum ada tim. Tambahkan tim di bawah.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {teams.map((team) => {
                      const isSelected = String(team.id) === String(selectedTeamId)
                      const teamIcon = TEAM_ICONS[team.icon] || faShieldAlt

                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => setSelectedTeamId(team.id)}
                          className="p-2 rounded border text-left transition cursor-pointer flex items-center gap-2"
                          style={{
                            background: isSelected ? accentBg : (isDark ? '#27272A' : '#FFFFFF'),
                            borderColor: isSelected ? (isDark ? '#3B82F6' : '#0284C7') : borderColor
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center shrink-0 text-[11px]"
                            style={{
                              backgroundColor: normalizeTeamColor(team.color, team.name),
                              color: isLightColor(team.color) ? '#0F172A' : '#FFFFFF',
                              border: isLightColor(team.color) ? (isDark ? '1px solid #52525B' : '1px solid #CBD5E1') : 'none'
                            }}
                          >
                            <FontAwesomeIcon icon={teamIcon} />
                          </div>
                          <span className="font-semibold text-xs truncate" style={{ color: isSelected ? accentColor : textPrimary }}>
                            {team.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Activity Name Input */}
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: textSecondary }}>
                  Cabang Lomba
                </label>
                <input
                  type="text"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="Ketik nama cabang lomba..."
                  style={{ ...inputStyle, width: '100%' }}
                  required
                />
              </div>

              {/* Points: 1 - 5 ONLY */}
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: textSecondary }}>
                  Poin
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ALLOWED_POINTS.map((pt) => {
                    const isSelected = points === pt
                    return (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setPoints(pt)}
                        className="py-2.5 rounded border text-center transition cursor-pointer font-bold font-mono text-base"
                        style={{
                          background: isSelected ? accentBg : (isDark ? '#27272A' : '#FFFFFF'),
                          borderColor: isSelected ? (isDark ? '#3B82F6' : '#0284C7') : borderColor,
                          color: isSelected ? accentColor : textPrimary
                        }}
                      >
                        {pt}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: textSecondary }}>
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Babak final, catatan..."
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={actionLoading || teams.length === 0}
                  className="w-full py-2 px-3 rounded text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: '#0284C7' }}
                >
                  Simpan Skor (+{points})
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: DAFTAR TIM */}
          <div className="p-4 rounded border" style={{ background: cardBg, borderColor }}>
            <div className="flex items-center justify-between pb-2 mb-3 border-b" style={{ borderColor }}>
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: textPrimary }}>
                Daftar Tim
              </h2>

              <button
                type="button"
                onClick={() => {
                  setEditingTeam(null)
                  setTeamForm({ name: '', color: '#3B82F6', secondary_color: '#1D4ED8', icon: 'shield', motto: '' })
                  setTeamModalOpen(true)
                }}
                className="px-2 py-1 rounded text-xs font-medium text-white transition cursor-pointer flex items-center gap-1"
                style={{ backgroundColor: '#0284C7' }}
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                <span>Tambah Tim</span>
              </button>
            </div>

            {teams.length === 0 ? (
              <div className="p-4 text-center rounded border border-dashed text-xs" style={{ borderColor, color: textSecondary }}>
                Belum ada tim.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {teams.map((team) => {
                  const teamIcon = TEAM_ICONS[team.icon] || faShieldAlt
                  const teamLb = leaderboard.find(l => l.id === team.id)

                  return (
                    <div
                      key={team.id}
                      className="p-2.5 rounded border flex items-center justify-between"
                      style={{ background: cardSubtleBg, borderColor }}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div
                          className="w-7 h-7 rounded flex items-center justify-center text-[11px] shrink-0"
                          style={{
                            backgroundColor: normalizeTeamColor(team.color, team.name),
                            color: isLightColor(team.color) ? '#0F172A' : '#FFFFFF',
                            border: isLightColor(team.color) ? (isDark ? '1px solid #52525B' : '1px solid #CBD5E1') : 'none'
                          }}
                        >
                          <FontAwesomeIcon icon={teamIcon} />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-semibold text-xs truncate" style={{ color: textPrimary }}>
                            {team.name}
                          </h4>
                          <span className="text-[11px] font-mono" style={{ color: textSecondary }}>
                            {teamLb?.total_points || 0} pts
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => openEditTeam(team)}
                          className="p-1.5 rounded hover:opacity-80 transition cursor-pointer text-xs"
                          style={{ color: textSecondary }}
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteModal({
                              open: true,
                              type: 'team',
                              id: team.id,
                              name: team.name
                            })
                          }
                          className="p-1.5 rounded hover:opacity-80 text-rose-500 transition cursor-pointer text-xs"
                          title="Hapus"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN: KLASEMEN & RIWAYAT SKOR (5 Cols)                   */}
        {/* ================================================================ */}
        <div className="lg:col-span-5 space-y-6">
          {/* SECTION 3: KLASEMEN */}
          <div className="p-4 rounded border" style={{ background: cardBg, borderColor }}>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3 pb-2 border-b" style={{ borderColor, color: textPrimary }}>
              Klasemen
            </h2>

            <div className="space-y-1.5">
              {leaderboard.length === 0 ? (
                <div className="p-4 text-center text-xs" style={{ color: textSecondary }}>
                  Belum ada data skor.
                </div>
              ) : (
                leaderboard.map((item, idx) => {
                  const maxPts = leaderboard[0]?.total_points || 1
                  const percentage = maxPts > 0 ? Math.round((item.total_points / maxPts) * 100) : 0

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded border transition"
                      style={{
                        background: idx === 0 ? (isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF') : cardSubtleBg,
                        borderColor: idx === 0 ? (isDark ? '#2563EB' : '#93C5FD') : borderColor
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded text-[10px] font-bold font-mono flex items-center justify-center"
                            style={{
                              background: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#D97706' : (isDark ? '#27272A' : '#E2E8F0'),
                              color: idx <= 2 ? '#FFFFFF' : textPrimary
                            }}
                          >
                            {item.rank}
                          </span>

                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: normalizeTeamColor(item.color, item.name) }}
                          />

                          <span className="text-xs font-semibold" style={{ color: textPrimary }}>
                            {item.name}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold font-mono" style={{ color: normalizeTeamColor(item.color, item.name) }}>
                            {item.total_points}
                          </span>
                          <span className="text-[10px] ml-1" style={{ color: textSecondary }}>pts</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(percentage, 4)}%`,
                            backgroundColor: normalizeTeamColor(item.color, item.name)
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* SECTION 4: RIWAYAT SKOR */}
          <div className="p-4 rounded border" style={{ background: cardBg, borderColor }}>
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b" style={{ borderColor }}>
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: textPrimary }}>
                Riwayat Skor
              </h2>

              {scores.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setDeleteModal({
                      open: true,
                      type: 'reset_scores',
                      id: null,
                      name: currentEvent?.name
                    })
                  }
                  className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {scores.length > 3 && (
              <div className="mb-2">
                <input
                  type="text"
                  value={scoreFilter}
                  onChange={(e) => setScoreFilter(e.target.value)}
                  placeholder="Cari riwayat..."
                  style={{ ...inputStyle, width: '100%', padding: '5px 8px', fontSize: '11px' }}
                />
              </div>
            )}

            <div className="space-y-1 max-h-[340px] overflow-y-auto pr-0.5">
              {filteredScores.length === 0 ? (
                <div className="p-4 text-center text-xs" style={{ color: textSecondary }}>
                  Belum ada log skor.
                </div>
              ) : (
                filteredScores.map((score) => (
                  <div
                    key={score.id}
                    className="p-2 rounded border flex items-center justify-between text-xs"
                    style={{ background: cardSubtleBg, borderColor }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: normalizeTeamColor(score.team_color, score.team_name) }}
                      />
                      <div className="overflow-hidden">
                        <p className="font-medium truncate text-xs" style={{ color: textPrimary }}>
                          {score.activity_name}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: textSecondary }}>
                          <span className="font-semibold" style={{ color: normalizeTeamColor(score.team_color, score.team_name) }}>
                            {score.team_name}
                          </span>
                          {score.notes ? ` • ${score.notes}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                        +{score.points}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteModal({
                            open: true,
                            type: 'score',
                            id: score.id,
                            name: `${score.team_name} (${score.activity_name})`
                          })
                        }
                        className="p-1 rounded text-rose-500 hover:opacity-80 transition cursor-pointer text-[10px]"
                        title="Hapus"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: TAMBAH / EDIT TIM ──────────────────────────────────────── */}
      <Modal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        title={editingTeam ? 'Edit Tim' : 'Tambah Tim'}
        size="md"
      >
        <form onSubmit={handleSaveTeam} className="space-y-3">
          <div>
            <label className="text-xs block mb-1 font-medium" style={{ color: textSecondary }}>
              Nama Tim
            </label>
            <input
              type="text"
              value={teamForm.name}
              onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              placeholder="Nama tim"
              style={{ ...inputStyle, width: '100%' }}
              required
            />
          </div>

          <div>
            <label className="text-xs block mb-1 font-medium" style={{ color: textSecondary }}>
              Warna
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((col) => {
                const isSelected = teamForm.color === col.hex
                const isLight = isLightColor(col.hex)
                return (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setTeamForm({ ...teamForm, color: col.hex, secondary_color: col.secondary })}
                    className="w-6 h-6 rounded-full border transition cursor-pointer flex items-center justify-center"
                    style={{
                      backgroundColor: col.hex,
                      borderColor: isSelected
                        ? (isDark ? '#FFFFFF' : '#0F172A')
                        : (isLight ? (isDark ? '#52525B' : '#CBD5E1') : 'transparent'),
                      boxShadow: isSelected ? '0 0 0 2px rgba(2, 132, 199, 0.5)' : 'none'
                    }}
                    title={col.name}
                  >
                    {isSelected && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: isLight ? '#0F172A' : '#FFFFFF' }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1 font-medium" style={{ color: textSecondary }}>
              Ikon
            </label>
            <div className="flex flex-wrap gap-1">
              {Object.keys(TEAM_ICONS).map((iconKey) => {
                const isPicked = teamForm.icon === iconKey
                const ic = TEAM_ICONS[iconKey]
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setTeamForm({ ...teamForm, icon: iconKey })}
                    className="w-7 h-7 rounded border flex items-center justify-center transition cursor-pointer text-xs"
                    style={{
                      background: isPicked ? accentBg : (isDark ? '#27272A' : '#FFFFFF'),
                      borderColor: isPicked ? (isDark ? '#3B82F6' : '#0284C7') : borderColor,
                      color: isPicked ? accentColor : textPrimary
                    }}
                  >
                    <FontAwesomeIcon icon={ic} />
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1 font-medium" style={{ color: textSecondary }}>
              Motto (Opsional)
            </label>
            <input
              type="text"
              value={teamForm.motto}
              onChange={(e) => setTeamForm({ ...teamForm, motto: e.target.value })}
              placeholder="Slogan atau motto"
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => setTeamModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium rounded border"
              style={{ borderColor, color: textSecondary }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-3.5 py-1.5 text-xs font-semibold text-white rounded transition"
              style={{ backgroundColor: '#0284C7' }}
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: TAMBAH ACARA ───────────────────────────────────────────── */}
      <Modal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title="Tambah Acara"
        size="md"
      >
        <form onSubmit={handleSaveEvent} className="space-y-3">
          <div>
            <label className="text-xs block mb-1 font-medium" style={{ color: textSecondary }}>
              Nama Acara
            </label>
            <input
              type="text"
              value={eventForm.name}
              onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
              placeholder="Nama acara"
              style={{ ...inputStyle, width: '100%' }}
              required
            />
          </div>

          <div>
            <label className="text-xs block mb-1 font-medium" style={{ color: textSecondary }}>
              Kode
            </label>
            <input
              type="text"
              value={eventForm.code}
              onChange={(e) => setEventForm({ ...eventForm, code: e.target.value.toUpperCase() })}
              placeholder="Kode singkatan"
              maxLength={6}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => setEventModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium rounded border"
              style={{ borderColor, color: textSecondary }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-3.5 py-1.5 text-xs font-semibold text-white rounded transition"
              style={{ backgroundColor: '#0284C7' }}
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: HAPUS ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, type: null, id: null, name: '' })}
        title="Hapus"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs" style={{ color: textPrimary }}>
            Hapus {deleteModal.type === 'score' ? 'skor' : deleteModal.type === 'team' ? 'tim' : 'semua skor'} <strong className="font-semibold">{deleteModal.name}</strong>?
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModal({ open: false, type: null, id: null, name: '' })}
              className="px-3 py-1 text-xs font-medium rounded border"
              style={{ borderColor, color: textSecondary }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={executeDelete}
              disabled={actionLoading}
              className="px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition"
            >
              Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
