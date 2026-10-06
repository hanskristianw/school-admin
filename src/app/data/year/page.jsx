'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faPlus,
  faSearch,
  faEdit,
  faTrash,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faBan,
  faShieldHalved,
  faClock,
  faLayerGroup,
  faCircleCheck,
  faCalendarCheck
} from '@fortawesome/free-solid-svg-icons'

// ─── Foreign Key Relations from DATABASE_SCHEMA.md ───────────────────────────
const YEAR_RELATION_TABLES = [
  { table: 'kelas', column: 'kelas_year_id', label: 'Kelas' },
  { table: 'student_applications', column: 'year_id', label: 'Pendaftaran Siswa' },
  { table: 'duty_schedules', column: 'year_id', label: 'Jadwal Piket Guru & Staff' },
  { table: 'report_settings', column: 'year_id', label: 'Pengaturan Rapor Unit' },
  { table: 'leave_quotas', column: 'year_id', label: 'Kuota Cuti Pegawai' },
  { table: 'udp_definition', column: 'year_id', label: 'Komponen Tarif UDP' },
  { table: 'school_fee_definition', column: 'year_id', label: 'Komponen Biaya SPP / Sekolah' },
  { table: 'fee_discount', column: 'year_id', label: 'Diskon & Potongan Biaya' },
  { table: 'admission_form_fee', column: 'year_id', label: 'Gelombang Biaya Formulir Masuk' },
  { table: 'athletic_events', column: 'year_id', label: 'Event Atletik' },
  { table: 'athletic_teams', column: 'year_id', label: 'Tim Atletik' },
  { table: 'pyp_subject', column: 'year_id', label: 'Mata Pelajaran PYP' },
  { table: 'pyp_unit', column: 'year_id', label: 'Unit of Inquiry PYP' },
  { table: 'pyp_strand_assessment', column: 'year_id', label: 'Penilaian Strand PYP' },
  { table: 'pyp_subject_comment', column: 'year_id', label: 'Komentar Rapor PYP' },
  { table: 'pyp_unit_assessment', column: 'year_id', label: 'Penilaian Unit PYP' },
  { table: 'pyp_atl_assessment', column: 'year_id', label: 'Penilaian ATL PYP' },
  { table: 'term', column: 'year_id', label: 'Term Akademik' },
  { table: 'semester', column: 'year_id', label: 'Semester' }
]

export default function YearManagementPage() {
  const { theme, isDark } = useTheme()

  // ─── Minimalist UI Design Tokens (matching /data/pyp) ─────────────
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const cardBgAlt = isDark ? '#27272A' : '#F4F4F5'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  // Muted Pastels
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

  const btnPrimary = {
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
  }

  const btnSecondary = {
    background: 'transparent',
    color: textPrimary,
    border: `1px solid ${borderColor}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    padding: '8px 14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease'
  }

  // ─── States ───────────────────────────────────────────────────────
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'active' | 'upcoming' | 'completed'
  const [searchTerm, setSearchTerm] = useState('')

  // Form Modal States
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingYear, setEditingYear] = useState(null)
  const [formData, setFormData] = useState({
    year_name: '',
    start_date: '',
    end_date: ''
  })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Delete & FK Protection States
  const [checkingYearId, setCheckingYearId] = useState(null)
  const [blockedYearData, setBlockedYearData] = useState(null) // { year, deps }
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [yearToDelete, setYearToDelete] = useState(null)
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Toast State
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── Fetch Years ──────────────────────────────────────────────────
  const fetchYears = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('year')
        .select('year_id, year_name, start_date, end_date')
        .order('year_name', { ascending: false })

      if (error) throw error
      setYears(data || [])
    } catch (err) {
      console.error('Error fetching years:', err)
      showToast('Gagal memuat data tahun ajaran: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchYears()
  }, [])

  // ─── Status & Date Calculations ──────────────────────────────────
  const getYearStatus = (year) => {
    if (!year.start_date || !year.end_date) return 'draft'
    const today = new Date().toISOString().split('T')[0]
    if (today < year.start_date) return 'upcoming'
    if (today > year.end_date) return 'completed'
    return 'active'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getDurationDays = (start, end) => {
    if (!start || !end) return '-'
    try {
      const d1 = new Date(start)
      const d2 = new Date(end)
      const diffTime = d2 - d1
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? `${diffDays} hari` : '-'
    } catch {
      return '-'
    }
  }

  // Extract year numbers (e.g. "2026/2027" or "2026-2027")
  const extractYearRange = (yearName) => {
    const match = (yearName || '').match(/(\d{4})[\-\/](\d{4})/)
    if (match) {
      return { startYear: parseInt(match[1]), endYear: parseInt(match[2]) }
    }
    return null
  }

  // ─── Filtered Data ────────────────────────────────────────────────
  const counts = useMemo(() => {
    let active = 0
    let upcoming = 0
    let completed = 0
    years.forEach(y => {
      const st = getYearStatus(y)
      if (st === 'active') active++
      else if (st === 'upcoming') upcoming++
      else if (st === 'completed') completed++
    })
    return { all: years.length, active, upcoming, completed }
  }, [years])

  const filteredYears = useMemo(() => {
    let result = years

    if (activeTab === 'active') {
      result = result.filter(y => getYearStatus(y) === 'active')
    } else if (activeTab === 'upcoming') {
      result = result.filter(y => getYearStatus(y) === 'upcoming')
    } else if (activeTab === 'completed') {
      result = result.filter(y => getYearStatus(y) === 'completed')
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      result = result.filter(y => (y.year_name || '').toLowerCase().includes(q))
    }

    return result
  }, [years, activeTab, searchTerm])

  // ─── Foreign Key Dependency Checker ──────────────────────────────
  const checkYearDependencies = async (yearId) => {
    const promises = YEAR_RELATION_TABLES.map(async (item) => {
      try {
        const { count, error } = await supabase
          .from(item.table)
          .select('*', { count: 'exact', head: true })
          .eq(item.column, yearId)
        if (!error && count && count > 0) {
          return { ...item, count }
        }
      } catch (e) {
        // Table or column might not exist in some environment
      }
      return null
    })

    const results = await Promise.all(promises)
    return results.filter(Boolean)
  }

  // ─── Delete Handler with Prevention ──────────────────────────────
  const handleDeleteClick = async (year) => {
    try {
      setCheckingYearId(year.year_id)
      const dependencies = await checkYearDependencies(year.year_id)

      if (dependencies.length > 0) {
        // PREVENT DELETION: Related records exist!
        setBlockedYearData({ year, deps: dependencies })
        setShowBlockedModal(true)
      } else {
        // Safe to proceed to confirmation
        setYearToDelete(year)
        setShowConfirmDeleteModal(true)
      }
    } catch (err) {
      console.error('Error checking dependencies:', err)
      showToast('Gagal memeriksa relasi data: ' + err.message, 'error')
    } finally {
      setCheckingYearId(null)
    }
  }

  const confirmDelete = async () => {
    if (!yearToDelete) return

    try {
      setDeleting(true)

      // Re-verify dependencies right before actual delete
      const dependencies = await checkYearDependencies(yearToDelete.year_id)
      if (dependencies.length > 0) {
        setShowConfirmDeleteModal(false)
        setBlockedYearData({ year: yearToDelete, deps: dependencies })
        setShowBlockedModal(true)
        return
      }

      const { error } = await supabase
        .from('year')
        .delete()
        .eq('year_id', yearToDelete.year_id)

      if (error) {
        if (error.code === '23503' || error.message?.includes('foreign key')) {
          throw new Error('Database mencegah penghapusan karena tahun ajaran ini masih dijadikan referensi oleh tabel lain.')
        }
        throw error
      }

      setYears(prev => prev.filter(y => y.year_id !== yearToDelete.year_id))
      showToast(`Tahun ajaran "${yearToDelete.year_name}" berhasil dihapus.`, 'success')
      setShowConfirmDeleteModal(false)
      setYearToDelete(null)
    } catch (err) {
      console.error('Error deleting year:', err)
      showToast('Gagal menghapus tahun ajaran: ' + err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Form Handlers ────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingYear(null)
    setFormData({ year_name: '', start_date: '', end_date: '' })
    setFormErrors({})
    setShowFormModal(true)
  }

  const openEditModal = (year) => {
    setEditingYear(year)
    setFormData({
      year_name: year.year_name || '',
      start_date: year.start_date || '',
      end_date: year.end_date || ''
    })
    setFormErrors({})
    setShowFormModal(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.year_name.trim()) {
      errors.year_name = 'Nama tahun ajaran wajib diisi.'
    } else if (formData.year_name.trim().length < 4) {
      errors.year_name = 'Minimal 4 karakter (contoh: 2026/2027).'
    }

    const duplicateYear = years.find(y =>
      y.year_name.toLowerCase() === formData.year_name.trim().toLowerCase() &&
      y.year_id !== editingYear?.year_id
    )
    if (duplicateYear) {
      errors.year_name = 'Nama tahun ajaran sudah ada.'
    }

    if (!formData.start_date) {
      errors.start_date = 'Tanggal mulai wajib diisi.'
    }
    if (!formData.end_date) {
      errors.end_date = 'Tanggal berakhir wajib diisi.'
    }

    if (formData.start_date && formData.end_date) {
      if (formData.start_date >= formData.end_date) {
        errors.end_date = 'Tanggal berakhir harus setelah tanggal mulai.'
      }
    }

    // Match year name range with dates if format is YYYY/YYYY or YYYY-YYYY
    if (formData.year_name.trim() && formData.start_date && formData.end_date && !errors.start_date && !errors.end_date) {
      const yearRange = extractYearRange(formData.year_name.trim())
      if (yearRange) {
        const startYearNum = new Date(formData.start_date).getFullYear()
        const endYearNum = new Date(formData.end_date).getFullYear()
        if (startYearNum !== yearRange.startYear) {
          errors.start_date = `Tahun pada tanggal mulai harus ${yearRange.startYear}.`
        }
        if (endYearNum !== yearRange.endYear) {
          errors.end_date = `Tahun pada tanggal berakhir harus ${yearRange.endYear}.`
        }
      }
    }

    // Check for overlapping date ranges with other years
    if (formData.start_date && formData.end_date && !errors.start_date && !errors.end_date) {
      const overlapping = years.find(y => {
        if (y.year_id === editingYear?.year_id) return false
        if (!y.start_date || !y.end_date) return false
        return formData.start_date < y.end_date && formData.end_date > y.start_date
      })
      if (overlapping) {
        errors.start_date = `Rentang tanggal tumpang tindih dengan "${overlapping.year_name}".`
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSubmitting(true)
      const payload = {
        year_name: formData.year_name.trim(),
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      }

      if (editingYear) {
        const { error } = await supabase
          .from('year')
          .update(payload)
          .eq('year_id', editingYear.year_id)

        if (error) throw error

        setYears(prev =>
          prev.map(y => (y.year_id === editingYear.year_id ? { ...y, ...payload } : y))
        )
        showToast('Tahun ajaran berhasil diperbarui.', 'success')
      } else {
        const { data, error } = await supabase
          .from('year')
          .insert([payload])
          .select('year_id, year_name, start_date, end_date')

        if (error) throw error
        if (data && data[0]) {
          setYears(prev => [data[0], ...prev].sort((a, b) => b.year_name.localeCompare(a.year_name)))
        }
        showToast('Tahun ajaran berhasil ditambahkan.', 'success')
      }

      setShowFormModal(false)
      setEditingYear(null)
      setFormData({ year_name: '', start_date: '', end_date: '' })
      setFormErrors({})
    } catch (err) {
      console.error('Error saving year:', err)
      showToast('Gagal menyimpan tahun ajaran: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────
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
      <div
        className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6"
        style={{ borderColor }}
      >
        <div>
          <div
            className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5"
            style={{ color: textSecondary }}
          >
            <span>[ACADEMIC]</span>
            <span>/</span>
            <span>[CALENDAR & SCHEDULES]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              [ACADEMIC YEARS]
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded flex items-center justify-center border"
              style={{
                background: pastelBlue.bg,
                borderColor: pastelBlue.border,
                color: pastelBlue.text
              }}
            >
              <FontAwesomeIcon icon={faCalendarDays} className="text-base" />
            </div>
            <div>
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}
              >
                Tahun Ajaran
              </h1>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          style={btnPrimary}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
          <span>Tambah Tahun Ajaran</span>
        </button>
      </div>

      {/* ── METRIC CARDS ROW (MINIMALIST BENTO) ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div
          className="p-3.5 rounded border"
          style={{ background: cardBg, borderColor, borderRadius: '8px' }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: textSecondary }}>
            Total Tahun
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: textPrimary }}>
            {counts.all}
          </div>
        </div>

        <div
          className="p-3.5 rounded border"
          style={{ background: cardBg, borderColor, borderRadius: '8px' }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: pastelGreen.text }}>
            Aktif / Berjalan
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: pastelGreen.text }}>
            {counts.active}
          </div>
        </div>

        <div
          className="p-3.5 rounded border"
          style={{ background: cardBg, borderColor, borderRadius: '8px' }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: pastelBlue.text }}>
            Mendatang
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: pastelBlue.text }}>
            {counts.upcoming}
          </div>
        </div>

        <div
          className="p-3.5 rounded border"
          style={{ background: cardBg, borderColor, borderRadius: '8px' }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: textSecondary }}>
            Selesai / Arsip
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: textSecondary }}>
            {counts.completed}
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION (MATCHING /DATA/PYP STYLE) ────────────────── */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${borderColor}`,
          marginBottom: '20px',
          gap: '24px',
          flexWrap: 'wrap'
        }}
      >
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '10px 0',
            fontSize: '13px',
            fontWeight: activeTab === 'all' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'all' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'all' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faLayerGroup} style={{ fontSize: '12px' }} />
          Semua Tahun ({counts.all})
        </button>

        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '10px 0',
            fontSize: '13px',
            fontWeight: activeTab === 'active' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'active' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'active' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: '12px' }} />
          Aktif / Berjalan ({counts.active})
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            padding: '10px 0',
            fontSize: '13px',
            fontWeight: activeTab === 'upcoming' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'upcoming' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'upcoming' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faClock} style={{ fontSize: '12px' }} />
          Mendatang ({counts.upcoming})
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          style={{
            padding: '10px 0',
            fontSize: '13px',
            fontWeight: activeTab === 'completed' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'completed' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'completed' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faCalendarCheck} style={{ fontSize: '12px' }} />
          Selesai ({counts.completed})
        </button>
      </div>

      {/* ── SEARCH & CONTROLS BAR ───────────────────────────────────── */}
      <div
        className="p-3.5 rounded border mb-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
        style={{ background: cardBg, borderColor, borderRadius: '8px' }}
      >
        <div className="relative flex-1 max-w-md">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: textSecondary }}
          />
          <input
            type="text"
            placeholder="Cari nama tahun ajaran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '32px' }}
          />
        </div>

        <div className="text-xs font-mono" style={{ color: textSecondary }}>
          Menampilkan {filteredYears.length} dari {years.length} tahun
        </div>
      </div>

      {/* ── TABLE VIEW ──────────────────────────────────────────────── */}
      <div
        className="rounded border overflow-hidden"
        style={{ background: cardBg, borderColor, borderRadius: '8px' }}
      >
        {loading ? (
          <div className="py-20 text-center">
            <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-3" style={{ color: textSecondary }} />
            <div className="text-xs font-mono" style={{ color: textSecondary }}>
              Memuat data tahun ajaran...
            </div>
          </div>
        ) : filteredYears.length === 0 ? (
          <div className="py-20 text-center">
            <FontAwesomeIcon icon={faCalendarDays} className="text-3xl mb-3" style={{ color: textSecondary }} />
            <div className="text-sm font-medium" style={{ color: textPrimary }}>
              Tidak ada data tahun ajaran
            </div>
            <div className="text-xs mt-1" style={{ color: textSecondary }}>
              {searchTerm ? `Tidak ada hasil pencarian untuk "${searchTerm}".` : 'Belum ada data pada tab ini.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
              <thead>
                <tr style={{ background: cardBgAlt, borderBottom: `1px solid ${borderColor}` }}>
                  <th
                    className="py-3 px-4 font-mono text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: textSecondary }}
                  >
                    Nama Tahun
                  </th>
                  <th
                    className="py-3 px-4 font-mono text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: textSecondary }}
                  >
                    Tanggal Mulai
                  </th>
                  <th
                    className="py-3 px-4 font-mono text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: textSecondary }}
                  >
                    Tanggal Berakhir
                  </th>
                  <th
                    className="py-3 px-4 font-mono text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: textSecondary }}
                  >
                    Durasi
                  </th>
                  <th
                    className="py-3 px-4 font-mono text-[11px] uppercase tracking-wider font-semibold"
                    style={{ color: textSecondary }}
                  >
                    Status
                  </th>
                  <th
                    className="py-3 px-4 font-mono text-[11px] uppercase tracking-wider font-semibold text-right"
                    style={{ color: textSecondary }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor }}>
                {filteredYears.map((year) => {
                  const status = getYearStatus(year)
                  const isCheckingThis = checkingYearId === year.year_id

                  return (
                    <tr
                      key={year.year_id}
                      className="transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50"
                      style={{ borderBottom: `1px solid ${borderColor}` }}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold font-mono" style={{ color: textPrimary }}>
                          {year.year_name}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs" style={{ color: textPrimary }}>
                        {formatDate(year.start_date)}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs" style={{ color: textPrimary }}>
                        {formatDate(year.end_date)}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs" style={{ color: textSecondary }}>
                        {getDurationDays(year.start_date, year.end_date)}
                      </td>

                      <td className="py-3 px-4">
                        {status === 'active' && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium border"
                            style={{
                              background: pastelGreen.bg,
                              borderColor: pastelGreen.border,
                              color: pastelGreen.text
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Berjalan
                          </span>
                        )}
                        {status === 'upcoming' && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium border"
                            style={{
                              background: pastelBlue.bg,
                              borderColor: pastelBlue.border,
                              color: pastelBlue.text
                            }}
                          >
                            <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                            Mendatang
                          </span>
                        )}
                        {status === 'completed' && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium border"
                            style={{
                              background: cardBgAlt,
                              borderColor,
                              color: textSecondary
                            }}
                          >
                            Selesai
                          </span>
                        )}
                        {status === 'draft' && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium border"
                            style={{
                              background: pastelYellow.bg,
                              borderColor: pastelYellow.border,
                              color: pastelYellow.text
                            }}
                          >
                            Belum Diatur
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(year)}
                            style={{
                              ...btnSecondary,
                              padding: '5px 10px',
                              fontSize: '11px'
                            }}
                            title="Edit Tahun Ajaran"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteClick(year)}
                            disabled={isCheckingThis}
                            style={{
                              background: 'transparent',
                              color: pastelRed.text,
                              border: `1px solid ${pastelRed.border}`,
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '5px 10px',
                              cursor: isCheckingThis ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              opacity: isCheckingThis ? 0.6 : 1
                            }}
                            title="Hapus Tahun Ajaran"
                          >
                            {isCheckingThis ? (
                              <>
                                <FontAwesomeIcon icon={faSpinner} spin />
                                <span>Cek Data...</span>
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon icon={faTrash} />
                                <span>Hapus</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ────────────────────────────────────────── */}
      <Modal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false)
          setEditingYear(null)
          setFormData({ year_name: '', start_date: '', end_date: '' })
          setFormErrors({})
        }}
        title={editingYear ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
        size="md"
        containerStyle={{ background: cardBg, borderColor }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase font-semibold block mb-1.5" style={{ color: textSecondary }}>
              Nama Tahun Ajaran *
            </label>
            <input
              type="text"
              name="year_name"
              placeholder="Contoh: 2026/2027 atau 2026-2027"
              value={formData.year_name}
              onChange={handleInputChange}
              style={{
                ...inputStyle,
                borderColor: formErrors.year_name ? pastelRed.text : borderColor
              }}
            />
            {formErrors.year_name && (
              <div className="text-xs mt-1" style={{ color: pastelRed.text }}>
                {formErrors.year_name}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase font-semibold block mb-1.5" style={{ color: textSecondary }}>
                Tanggal Mulai *
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                style={{
                  ...inputStyle,
                  borderColor: formErrors.start_date ? pastelRed.text : borderColor
                }}
              />
              {formErrors.start_date && (
                <div className="text-xs mt-1" style={{ color: pastelRed.text }}>
                  {formErrors.start_date}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-mono uppercase font-semibold block mb-1.5" style={{ color: textSecondary }}>
                Tanggal Berakhir *
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                style={{
                  ...inputStyle,
                  borderColor: formErrors.end_date ? pastelRed.text : borderColor
                }}
              />
              {formErrors.end_date && (
                <div className="text-xs mt-1" style={{ color: pastelRed.text }}>
                  {formErrors.end_date}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => {
                setShowFormModal(false)
                setEditingYear(null)
                setFormData({ year_name: '', start_date: '', end_date: '' })
                setFormErrors({})
              }}
              style={btnSecondary}
              disabled={submitting}
            >
              Batal
            </button>
            <button type="submit" style={btnPrimary} disabled={submitting}>
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{editingYear ? 'Perbarui Tahun' : 'Simpan Tahun'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 1: BLOCKED DELETION (FOREIGN KEY PROTECTION) ──────── */}
      <Modal
        isOpen={showBlockedModal}
        onClose={() => {
          setShowBlockedModal(false)
          setBlockedYearData(null)
        }}
        title="Penghapusan Dicegah (Data Integritas)"
        size="md"
        containerStyle={{ background: cardBg, borderColor }}
      >
        {blockedYearData && (
          <div className="space-y-4">
            <div
              className="p-3.5 rounded border flex items-start gap-3"
              style={{
                background: pastelRed.bg,
                borderColor: pastelRed.border,
                color: pastelRed.text
              }}
            >
              <FontAwesomeIcon icon={faBan} className="text-lg mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed">
                <div className="font-semibold mb-1">
                  Tahun Ajaran &ldquo;{blockedYearData.year.year_name}&rdquo; Tidak Dapat Dihapus
                </div>
                <div>
                  Sistem mencegah penghapusan karena tahun ajaran ini masih menjadi referensi foreign key aktif bagi data turunan di bawah ini. Penghapusan langsung akan merusak integritas data akademik dan operasional.
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-mono uppercase font-semibold mb-2" style={{ color: textSecondary }}>
                Daftar Data Terkait ({blockedYearData.deps.reduce((sum, d) => sum + d.count, 0)} item terhubung):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {blockedYearData.deps.map((dep, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded border flex items-center justify-between text-xs"
                    style={{ background: cardBgAlt, borderColor }}
                  >
                    <span className="font-medium" style={{ color: textPrimary }}>
                      {dep.label}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded font-mono font-bold text-[11px] border"
                      style={{
                        background: pastelYellow.bg,
                        borderColor: pastelYellow.border,
                        color: pastelYellow.text
                      }}
                    >
                      {dep.count} data
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="p-3 rounded border text-xs leading-relaxed"
              style={{ background: cardBgAlt, borderColor, color: textSecondary }}
            >
              <FontAwesomeIcon icon={faShieldHalved} className="mr-2" style={{ color: pastelBlue.text }} />
              Untuk menghapus tahun ajaran ini, Anda harus terlebih dahulu menghapus atau mengalihkan data kelas, jadwal piket, pendaftaran, dan entitas terkait di atas.
            </div>

            <div className="flex justify-end pt-2 border-t" style={{ borderColor }}>
              <button
                type="button"
                onClick={() => {
                  setShowBlockedModal(false)
                  setBlockedYearData(null)
                }}
                style={btnPrimary}
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 2: CONFIRM DELETION (NO FK RELATIONS) ─────────────── */}
      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={() => {
          setShowConfirmDeleteModal(false)
          setYearToDelete(null)
        }}
        title="Konfirmasi Hapus Tahun Ajaran"
        size="sm"
        containerStyle={{ background: cardBg, borderColor }}
      >
        {yearToDelete && (
          <div className="space-y-4">
            <div
              className="p-3.5 rounded border flex items-start gap-3"
              style={{
                background: pastelYellow.bg,
                borderColor: pastelYellow.border,
                color: pastelYellow.text
              }}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-lg mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed">
                <div className="font-semibold mb-1">Peringatan Penghapusan</div>
                <div>
                  Apakah Anda yakin ingin menghapus tahun ajaran &ldquo;<strong>{yearToDelete.year_name}</strong>&rdquo;?
                  Tahun ini tidak memiliki data terkait. Tindakan ini permanen dan tidak dapat dibatalkan.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor }}>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDeleteModal(false)
                  setYearToDelete(null)
                }}
                style={btnSecondary}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  background: pastelRed.text,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {deleting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faTrash} />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
