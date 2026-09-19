'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLayerGroup,
  faPlus,
  faEdit,
  faTrash,
  faCheck,
  faTimes,
  faSearch,
  faSchool,
  faToggleOn,
  faToggleOff,
  faSpinner,
  faFilter,
  faGraduationCap,
  faInfoCircle,
  faListOl,
  faFileInvoiceDollar,
  faUsers,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons'

export default function AdmissionLevelManagement() {
  const { isDark } = useTheme()
  const { t } = useI18n()

  // Minimalist UI theme tokens (identik dengan /data/pyp dan /data/admission)
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  const inputStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px'
  }

  const selectStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px',
    padding: '6px 10px'
  }

  const [levels, setLevels] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingLevel, setEditingLevel] = useState(null)
  const [deletingLevel, setDeletingLevel] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [formData, setFormData] = useState({
    unit_id: '',
    level_name: '',
    level_order: '',
    is_active: true
  })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Filters & Tabs
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUnitTab, setSelectedUnitTab] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'active' | 'inactive'

  // Notification modal states
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const showNotification = (title, message, type = 'success') => {
    setNotification({ isOpen: true, title, message, type })
  }

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }))
  }

  const processErrorMessage = (errorMessage) => {
    if (!errorMessage) return 'Terjadi kesalahan yang tidak diketahui'
    const message = errorMessage.toLowerCase()

    if (message.includes('duplicate key value violates unique constraint') && message.includes('uq_admission_level')) {
      return 'Nama jenjang sudah ada untuk unit ini. Gunakan nama yang berbeda.'
    }
    if (message.includes('duplicate key value violates unique constraint')) {
      return 'Data yang dimasukkan sudah ada dalam sistem.'
    }
    if (message.includes('violates foreign key constraint')) {
      return 'Jenjang ini masih digunakan oleh data pendaftaran (PPDB) atau tarif biaya (UDP/SPP). Hapus data terkait terlebih dahulu.'
    }
    if (message.includes('connection') || message.includes('network')) {
      return 'Koneksi ke server bermasalah. Silakan coba lagi.'
    }
    return errorMessage
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      const [unitsRes, levelsRes] = await Promise.all([
        supabase
          .from('unit')
          .select('unit_id, unit_name')
          .eq('is_school', true)
          .order('unit_name'),
        supabase
          .from('admission_level')
          .select('level_id, unit_id, level_name, level_order, is_active, unit:unit_id(unit_name)')
          .order('level_order')
      ])

      if (unitsRes.error) throw new Error(unitsRes.error.message)
      if (levelsRes.error) throw new Error(levelsRes.error.message)

      setUnits(unitsRes.data || [])
      setLevels(levelsRes.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filtered & grouped levels
  const filteredLevels = useMemo(() => {
    return levels.filter(level => {
      // Filter by Tab (Unit)
      if (selectedUnitTab !== 'all' && String(level.unit_id) !== String(selectedUnitTab)) {
        return false
      }
      // Filter by Status
      if (filterStatus === 'active' && !level.is_active) return false
      if (filterStatus === 'inactive' && level.is_active) return false

      // Filter by Search Term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchName = level.level_name.toLowerCase().includes(query)
        const matchUnit = (level.unit?.unit_name || '').toLowerCase().includes(query)
        if (!matchName && !matchUnit) return false
      }

      return true
    })
  }, [levels, selectedUnitTab, filterStatus, searchTerm])

  const groupedLevels = useMemo(() => {
    const groups = {}
    for (const level of filteredLevels) {
      const unitName = level.unit?.unit_name || 'Unit Lainnya'
      if (!groups[unitName]) groups[unitName] = []
      groups[unitName].push(level)
    }
    for (const key in groups) {
      groups[key].sort((a, b) => a.level_order - b.level_order)
    }
    return groups
  }, [filteredLevels])

  // Summary Metrics
  const stats = useMemo(() => {
    const total = levels.length
    const active = levels.filter(l => l.is_active).length
    const inactive = total - active
    const unitCount = new Set(levels.map(l => l.unit_id)).size
    return { total, active, inactive, unitCount }
  }, [levels])

  const validateForm = () => {
    const errors = {}
    if (!formData.unit_id) {
      errors.unit_id = 'Unit akademik wajib dipilih'
    }
    if (!formData.level_name.trim()) {
      errors.level_name = 'Nama jenjang pendaftaran wajib diisi'
    } else if (formData.level_name.trim().length < 2) {
      errors.level_name = 'Nama jenjang minimal 2 karakter'
    }
    if (formData.level_order === '' || formData.level_order === null || formData.level_order === undefined) {
      errors.level_order = 'Nomor urutan tampil wajib diisi'
    } else if (isNaN(Number(formData.level_order)) || Number(formData.level_order) < 0) {
      errors.level_order = 'Urutan harus berupa angka positif'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const submitData = {
        unit_id: parseInt(formData.unit_id),
        level_name: formData.level_name.trim(),
        level_order: parseInt(formData.level_order),
        is_active: !!formData.is_active
      }

      let result
      if (editingLevel) {
        result = await supabase
          .from('admission_level')
          .update(submitData)
          .eq('level_id', editingLevel.level_id)
      } else {
        result = await supabase
          .from('admission_level')
          .insert([submitData])
      }

      if (result.error) throw new Error(result.error.message)

      await fetchData()
      resetForm()
      setError('')
      showNotification(
        'Berhasil Disimpan',
        editingLevel
          ? `Jenjang "${submitData.level_name}" berhasil diperbarui!`
          : `Jenjang baru "${submitData.level_name}" berhasil ditambahkan!`,
        'success'
      )
    } catch (err) {
      const friendlyMsg = processErrorMessage(err.message)
      setError('Error: ' + friendlyMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (level) => {
    setEditingLevel(level)
    setFormData({
      unit_id: String(level.unit_id),
      level_name: level.level_name,
      level_order: String(level.level_order),
      is_active: !!level.is_active
    })
    setShowForm(true)
    setFormErrors({})
    setError('')
  }

  const handleDeleteConfirm = async () => {
    if (!deletingLevel) return

    setDeleteLoading(true)
    try {
      const { error } = await supabase
        .from('admission_level')
        .delete()
        .eq('level_id', deletingLevel.level_id)

      if (error) throw new Error(error.message)

      await fetchData()
      showNotification('Berhasil Dihapus', `Jenjang "${deletingLevel.level_name}" berhasil dihapus.`, 'success')
      setDeletingLevel(null)
    } catch (err) {
      const friendlyMsg = processErrorMessage(err.message)
      showNotification('Gagal Menghapus', friendlyMsg, 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleToggleActive = async (level) => {
    try {
      const newStatus = !level.is_active
      const { error } = await supabase
        .from('admission_level')
        .update({ is_active: newStatus })
        .eq('level_id', level.level_id)

      if (error) throw new Error(error.message)

      setLevels(prev => prev.map(l => l.level_id === level.level_id ? { ...l, is_active: newStatus } : l))
      showNotification(
        'Status Diperbarui',
        `Jenjang "${level.level_name}" sekarang ${newStatus ? 'Aktif' : 'Nonaktif'}.`,
        'success'
      )
    } catch (err) {
      showNotification('Gagal Mengubah Status', processErrorMessage(err.message), 'error')
    }
  }

  const resetForm = () => {
    setFormData({ unit_id: '', level_name: '', level_order: '', is_active: true })
    setEditingLevel(null)
    setShowForm(false)
    setFormErrors({})
    setError('')
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Auto-suggest next order number when unit is selected
  const handleUnitChange = (e) => {
    const unitId = e.target.value
    setFormData(prev => ({ ...prev, unit_id: unitId }))
    if (formErrors.unit_id) setFormErrors(prev => ({ ...prev, unit_id: '' }))

    if (unitId && !editingLevel) {
      const unitLevels = levels.filter(l => l.unit_id === parseInt(unitId))
      const maxOrder = unitLevels.reduce((max, l) => Math.max(max, l.level_order), 0)
      setFormData(prev => ({ ...prev, unit_id: unitId, level_order: String(maxOrder + 1) }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center font-sans" style={{ background: pageBg }}>
        <div className="flex items-center gap-3 font-mono text-sm" style={{ color: textSecondary }}>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-base" />
          <span>Memuat katalog jenjang pendaftaran...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans" style={{ background: pageBg }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. Breadcrumbs & Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor }}>
          <div>
            {/* Breadcrumb Monospace Uppercase (Identik /data/pyp) */}
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
              <span>Penerimaan</span>
              <span>/</span>
              <span>PPDB & SPMB</span>
              <span>/</span>
              <span className="font-semibold" style={{ color: textPrimary }}>Jenjang Pendaftaran</span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded flex items-center justify-center border"
                style={{
                  background: isDark ? 'rgba(16, 185, 129, 0.12)' : '#EDF3EC',
                  borderColor: isDark ? '#059669' : '#A7F3D0',
                  color: isDark ? '#34D399' : '#346538',
                  borderRadius: '8px'
                }}
              >
                <FontAwesomeIcon icon={faGraduationCap} className="text-base" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: textPrimary }}>
                  Jenjang Pendaftaran
                </h1>
                <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
                  Katalog tingkatan kelas yang ditawarkan pada penerimaan peserta didik baru (PPDB / SPMB)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Navigation & Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <Link
              href="/data/admission"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                background: cardBg,
                borderColor,
                color: textSecondary,
                borderRadius: '6px'
              }}
            >
              <FontAwesomeIcon icon={faUsers} className="text-[11px]" />
              <span>Daftar Pendaftar</span>
            </Link>

            <Link
              href="/data/school-fee"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                background: cardBg,
                borderColor,
                color: textSecondary,
                borderRadius: '6px'
              }}
            >
              <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-[11px]" />
              <span>Tarif & Biaya</span>
            </Link>

            <button
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded transition-transform active:scale-[0.98]"
              style={{
                background: isDark ? '#F4F4F5' : '#111111',
                color: isDark ? '#111111' : '#FFFFFF',
                borderRadius: '6px'
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
              <span>Tambah Jenjang</span>
            </button>
          </div>
        </div>

        {/* 2. Bento Metric Cards (Ringkasan Cepat) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Card 1: Total Jenjang */}
          <div
            className="p-4 rounded-lg border transition-all"
            style={{ background: cardBg, borderColor, borderRadius: '8px' }}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: textSecondary }}>
              <span>Total Jenjang</span>
              <FontAwesomeIcon icon={faLayerGroup} className="text-xs opacity-70" />
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: textPrimary }}>
              {stats.total}
            </div>
            <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
              Katalog seluruh kelas
            </p>
          </div>

          {/* Card 2: Jenjang Aktif */}
          <div
            className="p-4 rounded-lg border transition-all"
            style={{ background: cardBg, borderColor, borderRadius: '8px' }}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: textSecondary }}>
              <span>Jenjang Aktif</span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border"
                style={{
                  background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC',
                  borderColor: isDark ? '#059669' : '#A7F3D0',
                  color: isDark ? '#34D399' : '#346538'
                }}
              >
                Aktif
              </span>
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: isDark ? '#34D399' : '#346538' }}>
              {stats.active}
            </div>
            <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
              Tampil di form pendaftaran
            </p>
          </div>

          {/* Card 3: Jenjang Nonaktif */}
          <div
            className="p-4 rounded-lg border transition-all"
            style={{ background: cardBg, borderColor, borderRadius: '8px' }}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: textSecondary }}>
              <span>Nonaktif</span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border"
                style={{
                  background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC',
                  borderColor: isDark ? '#DC2626' : '#FECACA',
                  color: isDark ? '#F87171' : '#9F2F2D'
                }}
              >
                Ditutup
              </span>
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: stats.inactive > 0 ? (isDark ? '#F87171' : '#9F2F2D') : textPrimary }}>
              {stats.inactive}
            </div>
            <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
              Disembunyikan sementara
            </p>
          </div>

          {/* Card 4: Unit Terhubung */}
          <div
            className="p-4 rounded-lg border transition-all"
            style={{ background: cardBg, borderColor, borderRadius: '8px' }}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: textSecondary }}>
              <span>Unit Akademik</span>
              <FontAwesomeIcon icon={faSchool} className="text-xs opacity-70" />
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: isDark ? '#60A5FA' : '#1F6C9F' }}>
              {units.length}
            </div>
            <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
              PYP, MYP, DP
            </p>
          </div>
        </div>

        {/* 3. Bento Filter & Search Bar */}
        <div
          className="p-3 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ background: cardBg, borderColor, borderRadius: '8px' }}
        >
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: textSecondary }}
              />
              <input
                type="text"
                placeholder="Cari nama jenjang atau unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="focus:outline-none"
              style={selectStyle}
            >
              <option value="all">Semua Status</option>
              <option value="active">Hanya Aktif</option>
              <option value="inactive">Hanya Nonaktif</option>
            </select>

            {(searchTerm || filterStatus !== 'all' || selectedUnitTab !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('all')
                  setSelectedUnitTab('all')
                }}
                className="px-2.5 py-1.5 text-xs font-mono rounded border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor, color: textSecondary }}
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* 4. Horizontal Unit Tab Bar (Identik /data/pyp) */}
        <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderColor }}>
          <button
            onClick={() => setSelectedUnitTab('all')}
            className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedUnitTab === 'all'
                ? 'border-b-2 font-semibold'
                : 'hover:text-black dark:hover:text-white'
            }`}
            style={{
              borderColor: selectedUnitTab === 'all' ? textPrimary : 'transparent',
              color: selectedUnitTab === 'all' ? textPrimary : textSecondary
            }}
          >
            <span>Semua Unit</span>
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px]"
              style={{
                background: selectedUnitTab === 'all' ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                color: textSecondary
              }}
            >
              {levels.length}
            </span>
          </button>

          {units.map(u => {
            const count = levels.filter(l => l.unit_id === u.unit_id).length
            const isActive = String(selectedUnitTab) === String(u.unit_id)
            return (
              <button
                key={u.unit_id}
                onClick={() => setSelectedUnitTab(String(u.unit_id))}
                className={`pb-2.5 px-3 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'border-b-2 font-semibold'
                    : 'hover:text-black dark:hover:text-white'
                }`}
                style={{
                  borderColor: isActive ? textPrimary : 'transparent',
                  color: isActive ? textPrimary : textSecondary
                }}
              >
                <span>{u.unit_name}</span>
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px]"
                  style={{
                    background: isActive ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                    color: textSecondary
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* 5. Editorial Tables Grouped by Unit */}
        {Object.keys(groupedLevels).length === 0 ? (
          <div
            className="p-12 text-center rounded-lg border space-y-3"
            style={{ background: cardBg, borderColor, borderRadius: '8px' }}
          >
            <div
              className="w-10 h-10 rounded-full mx-auto flex items-center justify-center border"
              style={{ background: isDark ? '#27272A' : '#F4F4F5', borderColor, color: textSecondary }}
            >
              <FontAwesomeIcon icon={faInfoCircle} className="text-base" />
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: textPrimary }}>
                Tidak ada data jenjang pendaftaran
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: textSecondary }}>
                {searchTerm || filterStatus !== 'all' || selectedUnitTab !== 'all'
                  ? 'Tidak ada jenjang yang cocok dengan kriteria filter saat ini.'
                  : 'Belum ada jenjang terdaftar. Silakan klik tombol "Tambah Jenjang".'}
              </p>
            </div>
          </div>
        ) : (
          Object.entries(groupedLevels).map(([unitName, unitLevels]) => (
            <div
              key={unitName}
              className="rounded-lg border overflow-hidden"
              style={{ background: cardBg, borderColor, borderRadius: '8px' }}
            >
              {/* Unit Header Banner */}
              <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{
                  background: isDark ? '#1C1C1F' : '#F9F9F8',
                  borderColor
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider border"
                    style={{
                      background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                      borderColor: isDark ? '#2563EB' : '#BAE6FD',
                      color: isDark ? '#60A5FA' : '#1F6C9F'
                    }}
                  >
                    <FontAwesomeIcon icon={faSchool} className="text-[10px]" />
                    {unitName}
                  </span>
                  <span className="text-xs font-mono" style={{ color: textSecondary }}>
                    &bull; {unitLevels.length} jenjang kelas
                  </span>
                </div>

                <div className="text-[11px] font-mono" style={{ color: textSecondary }}>
                  Tersedia untuk PPDB / SPMB
                </div>
              </div>

              {/* Table of Levels */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className="border-b text-[10px] font-mono uppercase tracking-wider"
                      style={{
                        background: isDark ? '#141416' : '#FCFCFB',
                        borderColor,
                        color: textSecondary
                      }}
                    >
                      <th className="px-4 py-2.5 w-16 text-center">Urutan</th>
                      <th className="px-4 py-2.5">Nama Jenjang</th>
                      <th className="px-4 py-2.5">Unit Program</th>
                      <th className="px-4 py-2.5 w-32 text-center">Status PPDB</th>
                      <th className="px-4 py-2.5 w-40 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs" style={{ borderColor }}>
                    {unitLevels.map(level => (
                      <tr
                        key={level.level_id}
                        className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{
                          opacity: level.is_active ? 1 : 0.65
                        }}
                      >
                        {/* Column 1: Urutan */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-block w-6 h-6 leading-6 rounded font-mono text-xs font-semibold"
                            style={{
                              background: isDark ? '#27272A' : '#F4F4F5',
                              color: textPrimary,
                              border: `1px solid ${borderColor}`
                            }}
                          >
                            {level.level_order}
                          </span>
                        </td>

                        {/* Column 2: Nama Jenjang */}
                        <td className="px-4 py-3">
                          <div className="font-semibold" style={{ color: textPrimary }}>
                            {level.level_name}
                          </div>
                          <div className="text-[11px] font-mono mt-0.5" style={{ color: textSecondary }}>
                            ID: #{level.level_id} &bull; Ditawarkan saat pendaftaran online
                          </div>
                        </td>

                        {/* Column 3: Unit Program */}
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border"
                            style={{
                              background: isDark ? '#27272A' : '#F4F4F5',
                              borderColor,
                              color: textSecondary
                            }}
                          >
                            {level.unit?.unit_name || unitName}
                          </span>
                        </td>

                        {/* Column 4: Status Toggle */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border"
                            style={{
                              background: level.is_active
                                ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#EDF3EC')
                                : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC'),
                              borderColor: level.is_active
                                ? (isDark ? '#059669' : '#A7F3D0')
                                : (isDark ? '#DC2626' : '#FECACA'),
                              color: level.is_active
                                ? (isDark ? '#34D399' : '#346538')
                                : (isDark ? '#F87171' : '#9F2F2D')
                            }}
                          >
                            <FontAwesomeIcon icon={level.is_active ? faCheck : faTimes} className="text-[9px]" />
                            {level.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>

                        {/* Column 5: Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Toggle Active Button */}
                            <button
                              onClick={() => handleToggleActive(level)}
                              className="p-1.5 rounded border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{
                                borderColor,
                                color: level.is_active ? (isDark ? '#34D399' : '#346538') : textSecondary
                              }}
                              title={level.is_active ? 'Nonaktifkan jenjang ini' : 'Aktifkan jenjang ini'}
                            >
                              <FontAwesomeIcon icon={level.is_active ? faToggleOn : faToggleOff} className="text-xs" />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleEdit(level)}
                              className="p-1.5 rounded border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ borderColor, color: textSecondary }}
                              title="Edit data jenjang"
                            >
                              <FontAwesomeIcon icon={faEdit} className="text-xs" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeletingLevel(level)}
                              className="p-1.5 rounded border transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              style={{ borderColor, color: isDark ? '#F87171' : '#DC2626' }}
                              title="Hapus jenjang"
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {/* 6. Modal Form (Tambah / Edit Jenjang) */}
        <Modal
          isOpen={showForm}
          onClose={resetForm}
          title={editingLevel ? 'Edit Jenjang Pendaftaran' : 'Tambah Jenjang Pendaftaran Baru'}
          size="sm"
        >
          {error && (
            <div
              className="p-3 rounded-md border text-xs flex items-start gap-2 mb-4"
              style={{
                background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC',
                borderColor: isDark ? '#DC2626' : '#FECACA',
                color: isDark ? '#F87171' : '#9F2F2D',
                borderRadius: '6px'
              }}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>
                Unit Akademik *
              </Label>
              <select
                id="unit_id"
                name="unit_id"
                value={formData.unit_id}
                onChange={handleUnitChange}
                disabled={submitting}
                className="mt-1 w-full focus:outline-none"
                style={selectStyle}
              >
                <option value="">Pilih Unit Akademik</option>
                {units.map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                ))}
              </select>
              {formErrors.unit_id && (
                <p className="text-[11px] font-mono mt-1" style={{ color: isDark ? '#F87171' : '#DC2626' }}>
                  {formErrors.unit_id}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>
                Nama Jenjang Pendaftaran *
              </Label>
              <Input
                id="level_name"
                name="level_name"
                value={formData.level_name}
                onChange={handleInputChange}
                disabled={submitting}
                placeholder="Contoh: Nursery 1, Kindergarten 2, JHS"
                className="mt-1 focus:outline-none"
                style={inputStyle}
              />
              {formErrors.level_name && (
                <p className="text-[11px] font-mono mt-1" style={{ color: isDark ? '#F87171' : '#DC2626' }}>
                  {formErrors.level_name}
                </p>
              )}
              <p className="text-[10px] font-mono mt-1" style={{ color: textSecondary }}>
                Nama ini akan muncul pada formulir pendaftaran orang tua siswa.
              </p>
            </div>

            <div>
              <Label className="text-xs font-mono uppercase tracking-wider" style={{ color: textSecondary }}>
                Urutan Tampil (Order) *
              </Label>
              <Input
                id="level_order"
                name="level_order"
                type="number"
                min="0"
                value={formData.level_order}
                onChange={handleInputChange}
                disabled={submitting}
                placeholder="1, 2, 3..."
                className="mt-1 focus:outline-none"
                style={inputStyle}
              />
              {formErrors.level_order && (
                <p className="text-[11px] font-mono mt-1" style={{ color: isDark ? '#F87171' : '#DC2626' }}>
                  {formErrors.level_order}
                </p>
              )}
              <p className="text-[10px] font-mono mt-1" style={{ color: textSecondary }}>
                Angka lebih kecil tampil lebih awal pada daftar pilihan jenjang.
              </p>
            </div>

            <div
              className="p-3 rounded border flex items-center justify-between"
              style={{ background: isDark ? '#1C1C1F' : '#F9F9F8', borderColor, borderRadius: '6px' }}
            >
              <div>
                <Label htmlFor="is_active" className="text-xs font-semibold cursor-pointer" style={{ color: textPrimary }}>
                  Status Pendaftaran Aktif
                </Label>
                <p className="text-[10px] font-mono" style={{ color: textSecondary }}>
                  Izinkan calon siswa baru memilih jenjang ini di portal PPDB
                </p>
              </div>
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={!!formData.is_active}
                onChange={handleInputChange}
                disabled={submitting}
                className="h-4 w-4 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor }}>
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="px-3.5 py-1.5 text-xs font-mono border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ background: 'none', borderColor, color: textSecondary, borderRadius: '6px' }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded transition-transform active:scale-[0.98]"
                style={{
                  background: isDark ? '#F4F4F5' : '#111111',
                  color: isDark ? '#111111' : '#FFFFFF',
                  borderRadius: '6px'
                }}
              >
                {submitting && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />}
                <span>{submitting ? 'Menyimpan...' : (editingLevel ? 'Update Jenjang' : 'Simpan Jenjang')}</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* 7. Modal Konfirmasi Hapus */}
        <Modal
          isOpen={!!deletingLevel}
          onClose={() => !deleteLoading && setDeletingLevel(null)}
          title="Konfirmasi Hapus Jenjang"
          size="sm"
        >
          {deletingLevel && (
            <div className="space-y-4">
              <div
                className="p-3.5 rounded border text-xs flex items-start gap-2.5"
                style={{
                  background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FDEBEC',
                  borderColor: isDark ? '#DC2626' : '#FECACA',
                  color: isDark ? '#F87171' : '#9F2F2D',
                  borderRadius: '6px'
                }}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-sm mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Perhatian Tindakan Hapus</p>
                  <p className="mt-1 leading-relaxed">
                    Apakah Anda yakin ingin menghapus jenjang <strong>&quot;{deletingLevel.level_name}&quot;</strong>?
                  </p>
                  <p className="mt-1 text-[11px] opacity-80">
                    Jika jenjang ini masih memiliki berkas pendaftaran siswa atau konfigurasi tarif UDP/SPP, sistem database akan menolak penghapusan demi keamanan data.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor }}>
                <button
                  type="button"
                  onClick={() => setDeletingLevel(null)}
                  disabled={deleteLoading}
                  className="px-3.5 py-1.5 text-xs font-mono border rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ background: 'none', borderColor, color: textSecondary, borderRadius: '6px' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded transition-transform active:scale-[0.98]"
                  style={{
                    background: isDark ? '#DC2626' : '#B91C1C',
                    color: '#FFFFFF',
                    borderRadius: '6px'
                  }}
                >
                  {deleteLoading && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />}
                  <span>{deleteLoading ? 'Menghapus...' : 'Ya, Hapus Jenjang'}</span>
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* 8. Notification Modal */}
        <NotificationModal
          isOpen={notification.isOpen}
          onClose={closeNotification}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />

      </div>
    </div>
  )
}
