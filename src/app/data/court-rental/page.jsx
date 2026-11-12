'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFutbol,
  faCalendarAlt,
  faSearch,
  faEye,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faRotateRight,
  faBuilding,
  faPhone,
  faEnvelope,
  faUser,
  faBan,
  faTrash,
  faPlus,
  faExclamationTriangle,
  faCopy,
  faCheck,
  faToggleOn,
  faToggleOff,
  faBullhorn,
  faComments
} from '@fortawesome/free-solid-svg-icons'

const SQL_MIGRATION = `-- ============================================================
-- Migrasi: Sistem Persewaan Lapangan CCS (Court Rental)
-- Jalankan di Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.court_rentals (
    id BIGSERIAL PRIMARY KEY,
    booking_code VARCHAR(50) UNIQUE NOT NULL,
    package_type VARCHAR(50) NOT NULL,
    package_name VARCHAR(150) NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    booking_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    renter_name VARCHAR(150) NOT NULL,
    renter_phone VARCHAR(50) NOT NULL,
    renter_email VARCHAR(150) NOT NULL,
    renter_org VARCHAR(150),
    renter_purpose TEXT,
    payment_proof_file TEXT,
    hosting_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'payment_uploaded',
    admin_notes TEXT,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_court_rentals_date_slot ON public.court_rentals(booking_date, time_slot);
CREATE UNIQUE INDEX IF NOT EXISTS idx_court_rentals_unique_active_slot ON public.court_rentals(booking_date, time_slot) WHERE status IN ('pending_payment', 'payment_uploaded', 'approved');
CREATE INDEX IF NOT EXISTS idx_court_rentals_status ON public.court_rentals(status);
CREATE INDEX IF NOT EXISTS idx_court_rentals_code ON public.court_rentals(booking_code);

CREATE TABLE IF NOT EXISTS public.court_blackout_dates (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time_slot VARCHAR(50),
    reason TEXT NOT NULL DEFAULT 'Kegiatan Sekolah',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_court_blackout_date ON public.court_blackout_dates(date);

CREATE TABLE IF NOT EXISTS public.court_time_slots (
    id BIGSERIAL PRIMARY KEY,
    day_type VARCHAR(20) NOT NULL, -- 'weekday' | 'weekend'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    label VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_court_slots_day_active ON public.court_time_slots(day_type, is_active);

-- Seed default time slots jika belum ada
INSERT INTO public.court_time_slots (day_type, start_time, end_time, time_slot, label, sort_order)
VALUES 
    ('weekday', '16:00:00', '18:00:00', '16:00 - 18:00', 'Sesi Sore', 1),
    ('weekday', '18:00:00', '20:00:00', '18:00 - 20:00', 'Sesi Malam 1', 2),
    ('weekday', '20:00:00', '22:00:00', '20:00 - 22:00', 'Sesi Malam 2', 3),
    ('weekend', '06:00:00', '08:00:00', '06:00 - 08:00', 'Sesi Pagi 1', 1),
    ('weekend', '08:00:00', '10:00:00', '08:00 - 10:00', 'Sesi Pagi 2', 2),
    ('weekend', '10:00:00', '12:00:00', '10:00 - 12:00', 'Sesi Siang', 3),
    ('weekend', '14:00:00', '16:00:00', '14:00 - 16:00', 'Sesi Siang Menjelang Sore', 4),
    ('weekend', '16:00:00', '18:00:00', '16:00 - 18:00', 'Sesi Sore', 5),
    ('weekend', '18:00:00', '20:00:00', '18:00 - 20:00', 'Sesi Malam 1', 6),
    ('weekend', '20:00:00', '22:00:00', '20:00 - 22:00', 'Sesi Malam 2', 7)
ON CONFLICT DO NOTHING;`

export default function CourtRentalPage() {
  const { theme, isDark } = useTheme()

  // Minimalist UI styling tokens matching /data/pyp
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  const [activeTab, setActiveTab] = useState('bookings') // 'bookings' | 'blackout'
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState({ total: 0, uploaded: 0, approved: 0, rejected: 0, pending: 0, totalIncome: 0 })
  const [tableExists, setTableExists] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [proofModalOpen, setProofModalOpen] = useState(false)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [copiedSql, setCopiedSql] = useState(false)
  const [proofError, setProofError] = useState(false)
  const [proofRetryKey, setProofRetryKey] = useState(0)

  // Blackout dates state
  const [blackoutDates, setBlackoutDates] = useState([])
  const [blackoutLoading, setBlackoutLoading] = useState(false)
  const [newBlackout, setNewBlackout] = useState({ date: '', time_slot: '', reason: 'Kegiatan Resmi Sekolah' })

  // Slots state (Master Sesi Jam Sewa)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsTableExists, setSlotsTableExists] = useState(true)
  const [dayTypeFilter, setDayTypeFilter] = useState('all') // 'all' | 'weekday' | 'weekend'
  const [newSlotModalOpen, setNewSlotModalOpen] = useState(false)
  const [newSlot, setNewSlot] = useState({
    day_type: 'weekday',
    start_time: '14:00',
    end_time: '16:00',
    label: '',
    sort_order: 1,
    is_active: true
  })

  // Markom & Notification Recipients State
  const [markomModalOpen, setMarkomModalOpen] = useState(false)
  const [markomLoading, setMarkomLoading] = useState(false)
  const [markomSaving, setMarkomSaving] = useState(false)
  const [markomRecipients, setMarkomRecipients] = useState([])
  const [availableStaff, setAvailableStaff] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [staffSearchQuery, setStaffSearchQuery] = useState('')
  const [markomSuccessMsg, setMarkomSuccessMsg] = useState('')

  const fetchMarkomSettings = useCallback(async () => {
    try {
      setMarkomLoading(true)
      const res = await fetch('/api/court-rental/markom')
      const data = await res.json()
      if (data.success) {
        setMarkomRecipients(data.recipients || [])
        setAvailableStaff(data.users || [])
      }
    } catch (err) {
      console.error('Failed to load markom settings:', err)
    } finally {
      setMarkomLoading(false)
    }
  }, [])

  const openMarkomModal = () => {
    setMarkomModalOpen(true)
    setMarkomSuccessMsg('')
    setStaffSearchQuery('')
    setSelectedStaffId('')
    fetchMarkomSettings()
  }

  const handleAddRecipientStaff = (staff) => {
    if (!staff) return
    if (markomRecipients.some(r => String(r.user_id) === String(staff.user_id))) {
      return
    }

    const newRecipient = {
      user_id: staff.user_id,
      user_nama_depan: staff.user_nama_depan || '',
      user_nama_belakang: staff.user_nama_belakang || '',
      user_email: staff.user_email || '',
      role_name: staff.role?.role_name || 'Staff',
      notify_email: true,
      notify_google_chat: true,
      is_active: true
    }

    setMarkomRecipients(prev => [...prev, newRecipient])
    setSelectedStaffId('')
    setStaffSearchQuery('')
  }

  const handleAddRecipient = () => {
    if (!selectedStaffId) return
    const staff = availableStaff.find(u => String(u.user_id) === String(selectedStaffId))
    if (!staff) return

    if (markomRecipients.some(r => String(r.user_id) === String(staff.user_id))) {
      alert('Staf ini sudah terdaftar sebagai penerima notifikasi.')
      return
    }

    handleAddRecipientStaff(staff)
  }

  const handleToggleRecipient = (userId, field) => {
    setMarkomRecipients(prev => prev.map(r => {
      if (String(r.user_id) === String(userId)) {
        return { ...r, [field]: !r[field] }
      }
      return r
    }))
  }

  const handleRemoveRecipient = (userId) => {
    setMarkomRecipients(prev => prev.filter(r => String(r.user_id) !== String(userId)))
  }

  const handleSaveMarkom = async () => {
    try {
      setMarkomSaving(true)
      const res = await fetch('/api/court-rental/markom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: markomRecipients })
      })
      const data = await res.json()
      if (data.success) {
        setMarkomSuccessMsg('Pengaturan penerima notifikasi Markom berhasil disimpan!')
        setTimeout(() => {
          setMarkomModalOpen(false)
          setMarkomSuccessMsg('')
        }, 1200)
      } else {
        alert(data.message || 'Gagal menyimpan pengaturan.')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setMarkomSaving(false)
    }
  }

  // Fetch slots data
  const fetchSlots = useCallback(async () => {
    try {
      setSlotsLoading(true)
      const res = await fetch('/api/court-rental/slots')
      const data = await res.json()
      if (data.success) {
        setSlots(data.slots || [])
        setSlotsTableExists(data.tableExists !== false)
      }
    } catch (err) {
      console.error('Failed to load slots:', err)
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  // Fetch bookings data
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (dateFilter) params.set('date', dateFilter)

      const res = await fetch(`/api/court-rental?${params.toString()}`)
      const data = await res.json()

      if (data.tableExists === false) {
        setTableExists(false)
      } else {
        setTableExists(true)
      }

      setBookings(data.bookings || [])
      if (data.stats) setStats(data.stats)
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery, dateFilter])

  // Fetch blackout dates
  const fetchBlackoutDates = useCallback(async () => {
    try {
      setBlackoutLoading(true)
      const res = await fetch('/api/court-rental/blackout')
      const data = await res.json()
      if (data.success) {
        setBlackoutDates(data.blackoutDates || [])
      }
    } catch (err) {
      console.error('Failed to load blackout dates:', err)
    } finally {
      setBlackoutLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
    fetchSlots()
  }, [fetchBookings, fetchSlots])

  useEffect(() => {
    if (activeTab === 'blackout') {
      fetchBlackoutDates()
    } else if (activeTab === 'slots') {
      fetchSlots()
    }
  }, [activeTab, fetchBlackoutDates, fetchSlots])

  // Handle Approve
  const handleApprove = async () => {
    if (!selectedBooking) return
    try {
      setActionLoading(true)
      const res = await fetch(`/api/court-rental/${selectedBooking.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName: 'Admin CCS' })
      })
      const data = await res.json()
      if (data.success) {
        setApproveModalOpen(false)
        setSelectedBooking(null)
        fetchBookings()
      } else {
        alert(data.message || 'Gagal menyetujui reservasi')
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyetujui reservasi: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Reject
  const handleReject = async () => {
    if (!selectedBooking) return
    try {
      setActionLoading(true)
      const res = await fetch(`/api/court-rental/${selectedBooking.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      })
      const data = await res.json()
      if (data.success) {
        setRejectModalOpen(false)
        setSelectedBooking(null)
        setRejectReason('')
        fetchBookings()
      } else {
        alert(data.message || 'Gagal menolak reservasi')
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menolak reservasi: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Add Blackout
  const handleAddBlackout = async (e) => {
    e.preventDefault()
    if (!newBlackout.date) {
      alert('Silakan pilih tanggal kegiatan sekolah')
      return
    }
    try {
      setActionLoading(true)
      const res = await fetch('/api/court-rental/blackout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlackout)
      })
      const data = await res.json()
      if (data.success) {
        setNewBlackout({ date: '', time_slot: '', reason: 'Kegiatan Resmi Sekolah' })
        fetchBlackoutDates()
      } else {
        alert(data.message || 'Gagal menambahkan blackout date')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Delete Blackout
  const handleDeleteBlackout = async (id) => {
    if (!confirm('Hapus jadwal kegiatan sekolah ini dan buka kembali slot untuk publik?')) return
    try {
      const res = await fetch(`/api/court-rental/blackout?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchBlackoutDates()
      } else {
        alert(data.message || 'Gagal menghapus')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  // Handle Toggle Slot Active / Inactive
  const handleToggleSlot = async (slot) => {
    try {
      const res = await fetch('/api/court-rental/slots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slot.id, is_active: !slot.is_active })
      })
      const data = await res.json()
      if (data.success) {
        fetchSlots()
      } else {
        alert(data.message || 'Gagal mengubah status sesi')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  // Handle Create Slot
  const handleCreateSlot = async (e) => {
    e.preventDefault()
    if (!newSlot.start_time || !newSlot.end_time) {
      alert('Jam mulai dan jam selesai wajib diisi')
      return
    }
    try {
      setActionLoading(true)
      const res = await fetch('/api/court-rental/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSlot)
      })
      const data = await res.json()
      if (data.success) {
        setNewSlotModalOpen(false)
        setNewSlot({ day_type: 'weekday', start_time: '14:00', end_time: '16:00', label: '', sort_order: 1, is_active: true })
        fetchSlots()
      } else {
        alert(data.message || 'Gagal menambahkan sesi')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Delete Slot
  const handleDeleteSlot = async (slot) => {
    if (!confirm(`Hapus sesi jam ${slot.time_slot} (${slot.day_type})?`)) return
    try {
      const res = await fetch(`/api/court-rental/slots?id=${slot.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchSlots()
      } else {
        alert(data.message || 'Gagal menghapus sesi')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const copyMigrationSql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2500)
  }

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0)
  }

  // Filtered slots for Tab 3
  const filteredSlots = slots.filter(s => dayTypeFilter === 'all' || s.day_type === dayTypeFilter)

  // Status Badges using Minimalist UI Muted Pastel tokens
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'payment_uploaded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#E1F3FE] text-[#1F6C9F] border border-[#BAE6FD] dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1F6C9F] dark:bg-blue-400" />
            UNDER REVIEW
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#EDF3EC] text-[#346538] border border-[#C6E1C4] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
            <FontAwesomeIcon icon={faCheckCircle} className="w-2.5 h-2.5 text-[#346538] dark:text-emerald-400" />
            APPROVED
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#FDEBEC] text-[#9F2F2D] border border-[#F8C9CB] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
            <FontAwesomeIcon icon={faTimesCircle} className="w-2.5 h-2.5 text-[#9F2F2D] dark:text-rose-400" />
            REJECTED
          </span>
        )
      case 'pending_payment':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#FBF3DB] text-[#956400] border border-[#F3E2B6] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
            <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5 text-[#956400] dark:text-amber-400" />
            PENDING PAYMENT
          </span>
        )
    }
  }

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      
      {/* ── HEADER & BREADCRUMBS (EXACT MATCHING /data/pyp LAYOUT) ─────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[OPERATIONAL]</span>
            <span>/</span>
            <span>[FACILITY MANAGEMENT]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[SPORT HALL RENTAL]</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center border shrink-0" style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', borderColor: isDark ? '#2563EB' : '#BAE6FD', color: isDark ? '#60A5FA' : '#0284C7' }}>
              <FontAwesomeIcon icon={faFutbol} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Sport Hall CCS Rental Management
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openMarkomModal}
            style={{
              background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
              color: isDark ? '#93C5FD' : '#1D4ED8',
              border: `1px solid ${isDark ? '#1E40AF' : '#BFDBFE'}`,
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              padding: '7px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faBullhorn} className="text-xs" />
            Set Markom & Notifikasi
          </button>

          <button
            onClick={() => fetchBookings()}
            style={{
              background: 'transparent',
              color: textPrimary,
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              padding: '7px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faRotateRight} className={`text-xs ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ── BANNER JIKA TABEL SUPABASE BELUM DIBUAT ───────────────────────── */}
      {!tableExists && (
        <div style={{ background: cardBg, border: `1px solid #F59E0B`, borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 text-lg mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-sm" style={{ color: textPrimary }}>Supabase Tables Required</div>
                <div className="text-xs mt-0.5" style={{ color: textSecondary }}>
                  Tabel <code className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">court_rentals</code> belum aktif di Supabase. Salin dan jalankan skrip migrasi di SQL Editor Supabase untuk mengaktifkannya.
                </div>
              </div>
            </div>
            <button
              onClick={copyMigrationSql}
              style={{
                background: textPrimary,
                color: isDark ? '#111111' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <FontAwesomeIcon icon={copiedSql ? faCheck : faCopy} className="text-xs" />
              {copiedSql ? 'SQL Tersalin!' : 'Salin Skrip SQL Migrasi'}
            </button>
          </div>
        </div>
      )}

      {/* ── BENTO METRIC CARDS (STRIP MINIMALIS) ───────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px 20px' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold" style={{ color: textSecondary }}>
            TOTAL RESERVATIONS
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5" style={{ color: textPrimary }}>
            {stats.total}
          </div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px 20px' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold flex items-center justify-between">
            <span style={{ color: '#1F6C9F' }}>UNDER REVIEW</span>
            <span className="w-2 h-2 rounded-full bg-[#1F6C9F]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5" style={{ color: isDark ? '#60A5FA' : '#1F6C9F' }}>
            {stats.uploaded}
          </div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px 20px' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold flex items-center justify-between">
            <span style={{ color: '#346538' }}>APPROVED</span>
            <span className="w-2 h-2 rounded-full bg-[#346538]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5" style={{ color: isDark ? '#4ADE80' : '#346538' }}>
            {stats.approved}
          </div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px 20px' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold" style={{ color: textSecondary }}>
            TOTAL REVENUE
          </div>
          <div className="text-xl font-bold font-mono tracking-tight mt-2" style={{ color: textPrimary }}>
            {formatRupiah(stats.totalIncome)}
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION (MATCHING /data/pyp FLAT STYLE) ────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '20px', gap: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('bookings')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'bookings' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'bookings' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'bookings' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: '13px' }} />
          Reservations List ({stats.total})
        </button>

        <button
          onClick={() => setActiveTab('blackout')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'blackout' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'blackout' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'blackout' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faBan} style={{ fontSize: '13px' }} />
          School Events &amp; Blackout Dates ({blackoutDates.length})
        </button>

        <button
          onClick={() => setActiveTab('slots')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'slots' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'slots' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'slots' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faClock} style={{ fontSize: '13px' }} />
          Sesi Jam Sewa ({slots.length})
        </button>
      </div>

      {/* ── TAB 1: RESERVATIONS LIST ───────────────────────────────────────── */}
      {activeTab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* SEARCH & FILTER CONTROLS BAR */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '12px 16px' }}>
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Status Dropdown */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
                    style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
                  >
                    <option value="all">ALL STATUSES</option>
                    <option value="payment_uploaded">UNDER REVIEW</option>
                    <option value="approved">APPROVED</option>
                    <option value="rejected">REJECTED</option>
                    <option value="pending_payment">PENDING PAYMENT</option>
                  </select>
                </div>

                {/* Date Input */}
                <div>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                    style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
                  />
                </div>

                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    className="text-xs font-mono text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    [RESET DATE]
                  </button>
                )}
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-72">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-xs" style={{ color: textSecondary }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code, name, phone..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded border outline-none font-medium"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
                />
              </div>
            </div>
          </div>

          {/* RESERVATIONS TABLE */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b" style={{ background: isDark ? '#141417' : '#F9F9F8', borderColor }}>
                    <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider" style={{ color: textSecondary }}>Booking Code</th>
                    <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider" style={{ color: textSecondary }}>Rental Schedule</th>
                    <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider" style={{ color: textSecondary }}>Package &amp; Fee</th>
                    <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider" style={{ color: textSecondary }}>Renter Details</th>
                    <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider" style={{ color: textSecondary }}>Proof of Payment</th>
                    <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider" style={{ color: textSecondary }}>Status</th>
                    <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider text-right" style={{ color: textSecondary }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor }}>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12" style={{ color: textSecondary }}>
                        <FontAwesomeIcon icon={faRotateRight} className="text-base animate-spin mx-auto mb-2" />
                        <div>Loading reservations...</div>
                      </td>
                    </tr>
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-14" style={{ color: textSecondary }}>
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-2xl mx-auto mb-2 opacity-30" />
                        <div>No reservations matching current filter.</div>
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition">
                        {/* Booking Code */}
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-bold" style={{ color: textPrimary }}>{b.booking_code}</div>
                          <div className="text-[10px] font-mono mt-0.5" style={{ color: textSecondary }}>
                            {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Schedule */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold" style={{ color: textPrimary }}>{b.booking_date}</div>
                          <div className="font-mono text-[11px] mt-0.5 font-medium" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                            {b.time_slot}
                          </div>
                        </td>

                        {/* Package */}
                        <td className="px-4 py-3.5">
                          <div className="font-medium" style={{ color: textPrimary }}>{b.package_name}</div>
                          <div className="font-mono text-[11px] mt-0.5" style={{ color: textSecondary }}>{formatRupiah(b.price)}</div>
                        </td>

                        {/* Renter */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold flex items-center gap-1.5" style={{ color: textPrimary }}>
                            <FontAwesomeIcon icon={faUser} className="text-[11px]" style={{ color: textSecondary }} />
                            {b.renter_name}
                          </div>
                          {b.renter_purpose && (
                            <div className="mt-1">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded"
                                style={{
                                  background: isDark ? 'rgba(241,97,1,0.15)' : '#FFF7ED',
                                  color: '#C2410C',
                                  border: '1px solid rgba(241,97,1,0.25)'
                                }}
                              >
                                {b.renter_purpose === 'Basket' && '🏀 Basket'}
                                {b.renter_purpose === 'Futsal' && '⚽ Futsal'}
                                {b.renter_purpose === 'Badminton' && '🏸 Badminton'}
                                {b.renter_purpose === 'Voli' && '🏐 Voli'}
                                {!['Basket', 'Futsal', 'Badminton', 'Voli'].includes(b.renter_purpose) && b.renter_purpose}
                              </span>
                            </div>
                          )}
                          {b.renter_org && (
                            <div className="text-[11px] flex items-center gap-1 mt-1" style={{ color: textSecondary }}>
                              <FontAwesomeIcon icon={faBuilding} className="text-[10px]" />
                              {b.renter_org}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-[11px]">
                            <a
                              href={`https://wa.me/${String(b.renter_phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${b.renter_name}, kami dari pengelola Sport Hall CCS mengenai permohonan sewa lapangan Anda dengan kode ${b.booking_code}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline flex items-center gap-1 text-[#346538] dark:text-[#4ADE80] font-mono"
                            >
                              <FontAwesomeIcon icon={faPhone} className="text-[10px]" />
                              {b.renter_phone}
                            </a>
                            <span className="flex items-center gap-1 font-mono text-neutral-400">
                              <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" />
                              {b.renter_email}
                            </span>
                          </div>
                        </td>

                        {/* Proof of Payment */}
                        <td className="px-4 py-3.5">
                          {b.payment_proof_file ? (
                            <button
                              onClick={() => {
                                setSelectedBooking(b)
                                setProofError(false)
                                setProofRetryKey(Date.now())
                                setProofModalOpen(true)
                              }}
                              style={{
                                background: 'transparent',
                                border: `1px solid ${borderColor}`,
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: textPrimary
                              }}
                            >
                              <FontAwesomeIcon icon={faEye} className="text-[11px]" style={{ color: textSecondary }} />
                              View Proof
                            </button>
                          ) : (
                            <span className="font-mono text-[10px]" style={{ color: textSecondary }}>—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {renderStatusBadge(b.status)}
                          {b.admin_notes && (
                            <div className="text-[10px] mt-1 line-clamp-1 text-rose-600 font-mono" title={b.admin_notes}>
                              Note: {b.admin_notes}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {b.status !== 'approved' && (
                            <button
                              onClick={() => {
                                setSelectedBooking(b)
                                setApproveModalOpen(true)
                              }}
                              style={{
                                background: textPrimary,
                                color: isDark ? '#111111' : '#FFFFFF',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '5px 10px',
                                cursor: 'pointer'
                              }}
                            >
                              Approve
                            </button>
                          )}
                          {b.status !== 'rejected' && (
                            <button
                              onClick={() => {
                                setSelectedBooking(b)
                                setRejectModalOpen(true)
                              }}
                              style={{
                                background: 'transparent',
                                border: `1px solid ${borderColor}`,
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 500,
                                padding: '4px 9px',
                                cursor: 'pointer',
                                color: textSecondary
                              }}
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: BLACKOUT DATES (AGENDA SEKOLAH) ─────────────────────────── */}
      {activeTab === 'blackout' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* RECURRING CLUB CONTRACT (MAHAMERU BASKETBALL) */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '18px 20px' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: textPrimary }}>
                    Jadwal Kontrak Rutin: Mahameru Basketball Club
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    MOU: 013/MARCOMCCS/XII/2025
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: textSecondary, margin: '4px 0 0 0' }}>
                  Kontrak tahunan berlaku <strong>01 Januari 2026 s/d 31 Desember 2026</strong>. Sistem secara otomatis memblokir jadwal ini dari portal publik agar tidak dapat dipesan oleh pihak lain.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                AUTO-BLOCKED (3 SESI/MINGGU)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t text-xs font-mono" style={{ borderColor }}>
              <div className="p-3 rounded border" style={{ background: isDark ? '#141417' : '#F9F9F8', borderColor }}>
                <strong className="block text-[11px] text-indigo-600 dark:text-indigo-400">SETIAP SENIN</strong>
                <span className="text-sm font-bold block my-0.5" style={{ color: textPrimary }}>19:00 - 21:00 WIB</span>
                <span className="text-[10px] text-neutral-400 block">Memblokir slot malam (18:00 - 20:00 &amp; 20:00 - 22:00)</span>
              </div>
              <div className="p-3 rounded border" style={{ background: isDark ? '#141417' : '#F9F9F8', borderColor }}>
                <strong className="block text-[11px] text-emerald-600 dark:text-emerald-400">SETIAP SABTU</strong>
                <span className="text-sm font-bold block my-0.5" style={{ color: textPrimary }}>14:00 - 16:00 WIB</span>
                <span className="text-[10px] text-neutral-400 block">Memblokir slot siang-sore (14:00 - 16:00)</span>
              </div>
              <div className="p-3 rounded border" style={{ background: isDark ? '#141417' : '#F9F9F8', borderColor }}>
                <strong className="block text-[11px] text-amber-600 dark:text-amber-400">SETIAP MINGGU</strong>
                <span className="text-sm font-bold block my-0.5" style={{ color: textPrimary }}>14:00 - 16:00 WIB</span>
                <span className="text-[10px] text-neutral-400 block">Memblokir slot siang-sore (14:00 - 16:00)</span>
              </div>
            </div>
          </div>

          {/* ADD BLACKOUT FORM */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0', color: textPrimary }}>
              Add School Event / Blackout Schedule
            </h3>
            <p style={{ fontSize: '12px', color: textSecondary, margin: '0 0 16px 0' }}>
              Dates or sessions registered here will automatically be blocked from public reservation on the booking website.
            </p>

            <form onSubmit={handleAddBlackout} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-mono uppercase font-semibold mb-1" style={{ color: textSecondary }}>
                  Event Date *
                </label>
                <input
                  type="date"
                  required
                  value={newBlackout.date}
                  onChange={(e) => setNewBlackout({ ...newBlackout, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-semibold mb-1" style={{ color: textSecondary }}>
                  Time Slot
                </label>
                <select
                  value={newBlackout.time_slot}
                  onChange={(e) => setNewBlackout({ ...newBlackout, time_slot: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
                >
                  <option value="">Whole Day (All Sessions)</option>
                  {slots && slots.length > 0 ? (
                    slots.map(s => (
                      <option key={s.id} value={s.time_slot}>
                        {s.time_slot} ({s.day_type.toUpperCase()}{s.label ? ` - ${s.label}` : ''})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="16:00 - 18:00">16:00 - 18:00 (Weekday / Weekend)</option>
                      <option value="18:00 - 20:00">18:00 - 20:00 (Weekday / Weekend)</option>
                      <option value="20:00 - 22:00">20:00 - 22:00 (Weekday / Weekend)</option>
                      <option value="06:00 - 08:00">06:00 - 08:00 (Weekend)</option>
                      <option value="08:00 - 10:00">08:00 - 10:00 (Weekend)</option>
                      <option value="10:00 - 12:00">10:00 - 12:00 (Weekend)</option>
                      <option value="14:00 - 16:00">14:00 - 16:00 (Weekend)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-semibold mb-1" style={{ color: textSecondary }}>
                  Reason / Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. School Performance / Exam Setup"
                  value={newBlackout.reason}
                  onChange={(e) => setNewBlackout({ ...newBlackout, reason: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded border outline-none font-medium"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: textPrimary,
                    color: isDark ? '#111111' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '8px 14px',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Register Blackout'}
                </button>
              </div>
            </form>
          </div>

          {/* ACTIVE BLACKOUT LIST */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div className="px-4 py-3 border-b font-mono font-semibold text-[10px] uppercase tracking-wider" style={{ borderColor, color: textSecondary }}>
              ACTIVE BLACKOUT SCHEDULES
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ background: isDark ? '#141417' : '#F9F9F8', borderColor }}>
                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase font-semibold" style={{ color: textSecondary }}>Date</th>
                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase font-semibold" style={{ color: textSecondary }}>Time Slot</th>
                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase font-semibold" style={{ color: textSecondary }}>Event / Reason</th>
                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase font-semibold text-right" style={{ color: textSecondary }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor }}>
                  {blackoutLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-neutral-400 font-mono">Loading schedules...</td>
                    </tr>
                  ) : blackoutDates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-neutral-400 font-mono">No active blackout dates.</td>
                    </tr>
                  ) : (
                    blackoutDates.map(b => (
                      <tr key={b.id} className="hover:bg-neutral-50/50 transition">
                        <td className="px-4 py-2.5 font-mono font-bold">{b.date}</td>
                        <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: textSecondary }}>{b.time_slot || 'WHOLE DAY'}</td>
                        <td className="px-4 py-2.5">{b.reason}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteBlackout(b.id)}
                            className="p-1 text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: MASTER SESI JAM SEWA (COURT TIME SLOTS) ────────────────── */}
      {activeTab === 'slots' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* HEADER & INFO CARD */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px' }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0', color: textPrimary }}>
                  Konfigurasi Master Sesi Jam Sewa (Court Time Slots)
                </h3>
                <p style={{ fontSize: '12px', color: textSecondary, margin: 0 }}>
                  Atur jam sesi sewa lapangan yang tersedia untuk publik pada hari biasa (Weekday: Senin–Jumat) dan akhir pekan (Weekend: Sabtu–Minggu). Sesi yang dinonaktifkan tidak akan muncul pada formulir pemesanan publik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewSlotModalOpen(true)}
                style={{
                  background: textPrimary,
                  color: isDark ? '#111111' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                Tambah Sesi Jam
              </button>
            </div>

            {!slotsTableExists && (
              <div className="mt-4 p-3 rounded text-xs border flex items-center justify-between" style={{ background: isDark ? '#2D1515' : '#FEF2F2', borderColor: '#FCA5A5' }}>
                <span className="text-rose-700 dark:text-rose-300 font-mono">
                  Tabel <code>court_time_slots</code> belum dibuat di Supabase. Sesi jam saat ini berjalan menggunakan konfigurasi default sistem. Silakan jalankan skrip migrasi SQL di Supabase SQL Editor.
                </span>
                <button
                  type="button"
                  onClick={copyMigrationSql}
                  style={{
                    background: '#9F2F2D',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Salin SQL
                </button>
              </div>
            )}
          </div>

          {/* TABLE WITH DAY FILTER */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div className="px-4 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderColor }}>
              <div className="font-mono font-semibold text-[10px] uppercase tracking-wider" style={{ color: textSecondary }}>
                DAFTAR SESI JAM OPERASIONAL ({filteredSlots.length})
              </div>
              {/* Day Type Filter Pills */}
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'all', label: 'Semua Hari' },
                  { id: 'weekday', label: 'Weekday (Sen - Jum)' },
                  { id: 'weekend', label: 'Weekend (Sab - Min)' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDayTypeFilter(tab.id)}
                    style={{
                      background: dayTypeFilter === tab.id ? (isDark ? '#27272A' : '#E4E4E7') : 'transparent',
                      color: dayTypeFilter === tab.id ? textPrimary : textSecondary,
                      border: `1px solid ${dayTypeFilter === tab.id ? borderColor : 'transparent'}`,
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: dayTypeFilter === tab.id ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ background: isDark ? '#141417' : '#F9F9F8', borderColor }}>
                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase font-semibold text-center w-14" style={{ color: textSecondary }}>Urutan</th>
                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase font-semibold" style={{ color: textSecondary }}>Kategori Hari</th>
                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase font-semibold" style={{ color: textSecondary }}>Rentang Jam</th>
                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase font-semibold" style={{ color: textSecondary }}>Label / Keterangan</th>
                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase font-semibold text-center" style={{ color: textSecondary }}>Status Operasional</th>
                    <th className="px-4 py-2.5 font-mono text-[10px] uppercase font-semibold text-right" style={{ color: textSecondary }}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor }}>
                  {slotsLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-neutral-400 font-mono">Memuat data sesi jam...</td>
                    </tr>
                  ) : filteredSlots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-neutral-400 font-mono">Belum ada sesi jam terdaftar untuk kategori ini.</td>
                    </tr>
                  ) : (
                    filteredSlots.map(s => (
                      <tr key={s.id} className="hover:bg-neutral-50/50 transition">
                        <td className="px-4 py-2.5 font-mono font-bold text-center" style={{ color: textSecondary }}>
                          {s.sort_order}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                            style={{
                              background: s.day_type === 'weekday' ? (isDark ? '#1E293B' : '#E0E7FF') : (isDark ? '#312E81' : '#EDE9FE'),
                              color: s.day_type === 'weekday' ? (isDark ? '#93C5FD' : '#3730A3') : (isDark ? '#C4B5FD' : '#5B21B6')
                            }}
                          >
                            {s.day_type === 'weekday' ? 'Weekday (Sen - Jum)' : 'Weekend (Sab - Min)'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold" style={{ color: textPrimary }}>
                          {s.time_slot}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: textSecondary }}>
                          {s.label || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSlot(s)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition cursor-pointer"
                            style={{
                              background: s.is_active ? (isDark ? '#14291E' : '#ECFDF5') : (isDark ? '#27272A' : '#F4F4F5'),
                              color: s.is_active ? '#059669' : textSecondary,
                              border: `1px solid ${s.is_active ? '#A7F3D0' : borderColor}`
                            }}
                            title={s.is_active ? 'Klik untuk nonaktifkan slot' : 'Klik untuk aktifkan slot'}
                          >
                            <FontAwesomeIcon icon={s.is_active ? faToggleOn : faToggleOff} className="text-sm" />
                            {s.is_active ? 'AKTIF' : 'NONAKTIF'}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteSlot(s)}
                            className="p-1 text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                            title="Hapus Sesi"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PREVIEW BUKTI TRANSFER (PROTECTED STREAMING) ─────────────── */}
      <Modal
        isOpen={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        title={`Payment Proof — ${selectedBooking?.booking_code || ''}`}
        size="md"
        containerStyle={{ background: cardBg, borderColor, borderRadius: '8px' }}
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded border text-xs font-mono" style={{ background: isDark ? '#141417' : '#F9F9F8', borderColor }}>
              <div>
                <span className="text-neutral-400 block text-[10px]">RENTER:</span>
                <strong style={{ color: textPrimary }}>{selectedBooking.renter_name}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">TOTAL:</span>
                <strong style={{ color: textPrimary }}>{formatRupiah(selectedBooking.price)}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">DATE &amp; SLOT:</span>
                <span style={{ color: textPrimary }}>{selectedBooking.booking_date} ({selectedBooking.time_slot})</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">STATUS:</span>
                {renderStatusBadge(selectedBooking.status)}
              </div>
            </div>

            {/* Protected stream image or PDF */}
            <div className="p-2 rounded border flex flex-col items-center justify-center min-h-[320px] overflow-hidden" style={{ background: isDark ? '#09090B' : '#FFFFFF', borderColor }}>
              {selectedBooking.payment_proof_file?.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full space-y-2">
                  <iframe
                    src={`/api/court-rental/${selectedBooking.id}/proof?t=${proofRetryKey}`}
                    title="Payment Proof PDF"
                    className="w-full h-[460px] rounded border-0"
                  />
                  <div className="text-right">
                    <a
                      href={`/api/court-rental/${selectedBooking.id}/proof?t=${proofRetryKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono underline"
                      style={{ color: textPrimary }}
                    >
                      Open PDF in New Tab ↗
                    </a>
                  </div>
                </div>
              ) : proofError ? (
                <div className="text-xs text-neutral-400 py-10 text-center font-mono space-y-3">
                  <p className="font-bold text-rose-500">Failed to stream image from hosting.</p>
                  <p className="text-[11px]">Ensure file exists in uploads/ on cPanel hosting or check connection.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setProofError(false)
                      setProofRetryKey(Date.now())
                    }}
                    style={{
                      background: textPrimary,
                      color: isDark ? '#111111' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '6px 14px',
                      cursor: 'pointer'
                    }}
                  >
                    Retry / Coba Lagi
                  </button>
                </div>
              ) : (
                <img
                  key={proofRetryKey}
                  src={`/api/court-rental/${selectedBooking.id}/proof?t=${proofRetryKey}`}
                  alt="Payment Proof"
                  className="max-h-[460px] w-auto max-w-full rounded object-contain"
                  onError={() => setProofError(true)}
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
              <button
                onClick={() => setProofModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: textSecondary
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: APPROVE CONFIRMATION ────────────────────────────────────── */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Approve Reservation"
        size="sm"
        containerStyle={{ background: cardBg, borderColor, borderRadius: '8px' }}
      >
        {selectedBooking && (
          <div className="space-y-4 text-xs">
            <p style={{ color: textPrimary, lineHeight: 1.6 }}>
              Approve court reservation <strong>{selectedBooking.booking_code}</strong> for <strong>{selectedBooking.renter_name}</strong>?
            </p>
            <div className="p-3 rounded border" style={{ background: '#EDF3EC', borderColor: '#C6E1C4', color: '#346538' }}>
              <div className="font-bold mb-1">Automated Confirmation Email</div>
              <div className="text-[11px] leading-relaxed">
                An official booking confirmation email with entrance terms will be automatically sent to: <strong>{selectedBooking.renter_email}</strong>.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
              <button
                onClick={() => setApproveModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: textSecondary
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                style={{
                  background: textPrimary,
                  color: isDark ? '#111111' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  opacity: actionLoading ? 0.5 : 1
                }}
              >
                {actionLoading ? 'Processing...' : 'Confirm Approval & Send Email'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: REJECT CONFIRMATION ─────────────────────────────────────── */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Reservation"
        size="sm"
        containerStyle={{ background: cardBg, borderColor, borderRadius: '8px' }}
      >
        {selectedBooking && (
          <div className="space-y-4 text-xs">
            <p style={{ color: textPrimary }}>
              Enter rejection reason for reservation <strong>{selectedBooking.booking_code}</strong>:
            </p>
            <div>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Payment proof unreadable or amount mismatch."
                className="w-full p-2.5 rounded border outline-none font-medium"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
              <button
                onClick={() => setRejectModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: textSecondary
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                style={{
                  background: '#9F2F2D',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  opacity: actionLoading ? 0.5 : 1
                }}
              >
                {actionLoading ? 'Saving...' : 'Reject Reservation'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: TAMBAH SESI JAM BARU ──────────────────────────────────── */}
      <Modal
        isOpen={newSlotModalOpen}
        onClose={() => setNewSlotModalOpen(false)}
        title="Tambah Sesi Jam Operasional"
        size="md"
        containerStyle={{ background: cardBg, borderColor, borderRadius: '8px' }}
      >
        <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-mono uppercase font-semibold mb-1" style={{ color: textSecondary }}>
              Kategori Hari *
            </label>
            <select
              value={newSlot.day_type}
              onChange={(e) => setNewSlot({ ...newSlot, day_type: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none font-medium"
              style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
            >
              <option value="weekday">Weekday (Senin – Jumat)</option>
              <option value="weekend">Weekend (Sabtu – Minggu)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase font-semibold mb-1" style={{ color: textSecondary }}>
                Jam Mulai *
              </label>
              <input
                type="time"
                required
                value={newSlot.start_time}
                onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase font-semibold mb-1" style={{ color: textSecondary }}>
                Jam Selesai *
              </label>
              <input
                type="time"
                required
                value={newSlot.end_time}
                onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase font-semibold mb-1" style={{ color: textSecondary }}>
                Label Keterangan (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Sesi Sore, Sesi Malam"
                value={newSlot.label}
                onChange={(e) => setNewSlot({ ...newSlot, label: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded border outline-none font-medium"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase font-semibold mb-1" style={{ color: textSecondary }}>
                Nomor Urutan Tampilan
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={newSlot.sort_order}
                onChange={(e) => setNewSlot({ ...newSlot, sort_order: parseInt(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="slot_is_active"
              checked={newSlot.is_active}
              onChange={(e) => setNewSlot({ ...newSlot, is_active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="slot_is_active" className="text-xs cursor-pointer font-medium" style={{ color: textPrimary }}>
              Langsung aktifkan sesi jam ini untuk pemesanan publik
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => setNewSlotModalOpen(false)}
              style={{
                background: 'transparent',
                border: `1px solid ${borderColor}`,
                borderRadius: '4px',
                fontSize: '11px',
                padding: '6px 12px',
                cursor: 'pointer',
                color: textSecondary
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              style={{
                background: textPrimary,
                color: isDark ? '#111111' : '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '6px 14px',
                cursor: 'pointer',
                opacity: actionLoading ? 0.5 : 1
              }}
            >
              {actionLoading ? 'Menyimpan...' : 'Simpan Sesi Jam'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL SET MARKOM & NOTIFIKASI ─────────────────────────────────── */}
      <Modal
        isOpen={markomModalOpen}
        onClose={() => setMarkomModalOpen(false)}
        size="lg"
        title={
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF',
                color: isDark ? '#93C5FD' : '#2563EB',
                border: `1px solid ${isDark ? '#1D4ED8' : '#DBEAFE'}`
              }}
            >
              <FontAwesomeIcon icon={faBullhorn} />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight" style={{ color: textPrimary }}>
                Pengaturan Notifikasi Markom
              </div>
              <div className="text-[11px] font-normal" style={{ color: textSecondary }}>
                Sport Hall CCS — Notifikasi Instan Reservasi Masuk
              </div>
            </div>
          </div>
        }
      >
        <div className="space-y-4 max-w-full overflow-hidden">
          <p className="text-xs leading-relaxed" style={{ color: textSecondary, margin: 0 }}>
            Tentukan staf atau tim Markom/Sarpras yang akan menerima pemberitahuan otomatis melalui <strong>Email (Resend)</strong> dan <strong>Bot Google Chat (DM Workspace)</strong> secara real-time setiap kali ada reservasi baru yang diajukan oleh penyewa di website.
          </p>

          {markomSuccessMsg && (
            <div
              className="p-3 rounded-xl text-xs font-medium flex items-center gap-2 border"
              style={{
                background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                color: isDark ? '#6EE7B7' : '#065F46',
                borderColor: isDark ? '#059669' : '#A7F3D0'
              }}
            >
              <FontAwesomeIcon icon={faCheck} className="text-xs shrink-0" />
              <span>{markomSuccessMsg}</span>
            </div>
          )}

          {/* Form Tambah Staf */}
          <div
            className="p-4 rounded-xl border space-y-3"
            style={{
              background: isDark ? '#18181B' : '#F9FAFB',
              borderColor
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: textPrimary }}>
                + Tambah Staf Penerima Notifikasi
              </span>
              <span className="text-[11px]" style={{ color: textSecondary }}>
                Total {availableStaff.length} staf aktif dengan email
              </span>
            </div>

            {/* Kolom Pencarian & Dropdown Responsif (Bebas Overflow) */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  disabled={markomLoading}
                  className="w-full min-w-0 px-3 py-2 text-xs rounded-lg border outline-none font-medium truncate"
                  style={{
                    background: isDark ? '#111111' : '#FFFFFF',
                    borderColor,
                    color: textPrimary
                  }}
                >
                  <option value="">-- Pilih Staf / Tim Markom --</option>
                  {availableStaff.map((u) => {
                    const isAlreadyAdded = markomRecipients.some(r => String(r.user_id) === String(u.user_id))
                    return (
                      <option key={u.user_id} value={u.user_id} disabled={isAlreadyAdded}>
                        {u.user_nama_depan} {u.user_nama_belakang} ({u.role?.role_name || 'Staff'}) {isAlreadyAdded ? '✓ [Sudah Terdaftar]' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddRecipient}
                disabled={!selectedStaffId || markomLoading}
                className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                style={{
                  background: selectedStaffId ? (isDark ? '#FFFFFF' : '#111827') : (isDark ? '#27272A' : '#E5E7EB'),
                  color: selectedStaffId ? (isDark ? '#111827' : '#FFFFFF') : (isDark ? '#71717A' : '#9CA3AF'),
                  cursor: selectedStaffId ? 'pointer' : 'not-allowed',
                  border: 'none'
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                <span>Tambahkan</span>
              </button>
            </div>

            {/* Quick Filter Search Box */}
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs" />
              <input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                placeholder="Atau ketik nama/email staf untuk pencarian cepat..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none"
                style={{
                  background: isDark ? '#111111' : '#FFFFFF',
                  borderColor,
                  color: textPrimary
                }}
              />
            </div>

            {/* Live Search Quick Results */}
            {staffSearchQuery.trim() && (
              <div
                className="max-h-40 overflow-y-auto rounded-lg border divide-y text-xs"
                style={{
                  background: isDark ? '#111111' : '#FFFFFF',
                  borderColor
                }}
              >
                {availableStaff
                  .filter(u => {
                    const q = staffSearchQuery.toLowerCase()
                    const name = `${u.user_nama_depan} ${u.user_nama_belakang}`.toLowerCase()
                    const email = (u.user_email || '').toLowerCase()
                    const role = (u.role?.role_name || '').toLowerCase()
                    return name.includes(q) || email.includes(q) || role.includes(q)
                  })
                  .slice(0, 5)
                  .map((u) => {
                    const isAlreadyAdded = markomRecipients.some(r => String(r.user_id) === String(u.user_id))
                    return (
                      <div
                        key={u.user_id}
                        className="p-2.5 flex items-center justify-between gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
                      >
                        <div className="min-w-0 truncate">
                          <div className="font-semibold" style={{ color: textPrimary }}>
                            {u.user_nama_depan} {u.user_nama_belakang}
                            <span className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                              {u.role?.role_name || 'Staff'}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-neutral-400 truncate">
                            {u.user_email}
                          </div>
                        </div>

                        {isAlreadyAdded ? (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                            ✓ Terdaftar
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddRecipientStaff(u)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 shrink-0 transition"
                          >
                            + Tambah
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Daftar Penerima Notifikasi Aktif */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold" style={{ color: textPrimary }}>
                Daftar Penerima Notifikasi ({markomRecipients.length})
              </span>
              <span className="text-[11px]" style={{ color: textSecondary }}>
                Status & Jalur Pengiriman
              </span>
            </div>

            {markomLoading ? (
              <div className="py-10 text-center text-xs" style={{ color: textSecondary }}>
                <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-base mb-2 text-blue-500" />
                <div>Memuat daftar penerima notifikasi...</div>
              </div>
            ) : markomRecipients.length === 0 ? (
              <div
                className="py-10 px-4 text-center rounded-xl border border-dashed flex flex-col items-center justify-center"
                style={{ borderColor }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-base mb-2.5"
                  style={{
                    background: isDark ? '#27272A' : '#F3F4F6',
                    color: textSecondary
                  }}
                >
                  <FontAwesomeIcon icon={faBullhorn} />
                </div>
                <div className="font-semibold text-xs" style={{ color: textPrimary }}>
                  Belum Ada Penerima Notifikasi
                </div>
                <div className="text-[11px] max-w-sm mt-1 leading-relaxed" style={{ color: textSecondary }}>
                  Pilih staf melalui kolom di atas untuk mulai menerima notifikasi email dan direct message (DM) bot Google Chat secara otomatis setiap kali ada reservasi baru.
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {markomRecipients.map((recipient) => (
                  <div
                    key={recipient.user_id}
                    className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
                    style={{
                      background: recipient.is_active
                        ? (isDark ? '#18181B' : '#FFFFFF')
                        : (isDark ? '#141416' : '#F9FAFB'),
                      borderColor: recipient.is_active
                        ? (isDark ? '#27272A' : '#E5E7EB')
                        : (isDark ? '#1F1F23' : '#F3F4F6'),
                      opacity: recipient.is_active ? 1 : 0.65
                    }}
                  >
                    {/* Info Staf */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                        style={{
                          background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                          color: isDark ? '#93C5FD' : '#2563EB',
                          border: `1px solid ${isDark ? '#1E40AF' : '#DBEAFE'}`
                        }}
                      >
                        {recipient.user_nama_depan?.[0]}{recipient.user_nama_belakang?.[0] || ''}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate" style={{ color: textPrimary }}>
                            {recipient.user_nama_depan} {recipient.user_nama_belakang}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {recipient.role_name}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400 mt-0.5 truncate">
                          {recipient.user_email}
                        </div>
                      </div>
                    </div>

                    {/* Kontrol & Toggle */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                      {/* Toggle Email Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleRecipient(recipient.user_id, 'notify_email')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                          recipient.notify_email
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-400 dark:bg-neutral-900 dark:border-neutral-800'
                        }`}
                        title="Kirim notifikasi email via Resend"
                      >
                        <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
                        <span>Email {recipient.notify_email ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Toggle Google Chat Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleRecipient(recipient.user_id, 'notify_google_chat')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                          recipient.notify_google_chat
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-400 dark:bg-neutral-900 dark:border-neutral-800'
                        }`}
                        title="Kirim direct message bot Google Chat (@ccs.sch.id)"
                      >
                        <FontAwesomeIcon icon={faComments} className="text-xs" />
                        <span>Chat {recipient.notify_google_chat ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Master Switch Status Aktif */}
                      <button
                        type="button"
                        onClick={() => handleToggleRecipient(recipient.user_id, 'is_active')}
                        className="px-1 text-base transition"
                        style={{ color: recipient.is_active ? '#10B981' : textSecondary }}
                        title={recipient.is_active ? 'Penerima Aktif' : 'Penerima Dinonaktifkan'}
                      >
                        <FontAwesomeIcon icon={recipient.is_active ? faToggleOn : faToggleOff} />
                      </button>

                      {/* Hapus Penerima */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(recipient.user_id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                        title="Hapus dari daftar penerima"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card Google Chat Workspace */}
          <div
            className="p-3.5 rounded-xl border flex items-start gap-3"
            style={{
              background: isDark ? 'rgba(59, 130, 246, 0.08)' : '#F0F9FF',
              borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#BAE6FD'
            }}
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <FontAwesomeIcon icon={faComments} className="text-xs" />
            </div>
            <div className="text-xs leading-relaxed" style={{ color: isDark ? '#93C5FD' : '#0369A1' }}>
              <strong className="font-semibold block mb-0.5">Integrasi Bot Resmi Google Chat Workspace:</strong>
              Pesan notifikasi pesanan sewa baru dikirimkan secara otomatis oleh Bot CCS langsung ke Direct Message (DM) Google Chat akun email resmi (@ccs.sch.id) staf yang dipilih.
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => setMarkomModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium border transition"
              style={{
                background: 'transparent',
                borderColor,
                color: textSecondary
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveMarkom}
              disabled={markomSaving}
              className="px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              style={{
                background: textPrimary,
                color: isDark ? '#111111' : '#FFFFFF',
                opacity: markomSaving ? 0.6 : 1,
                cursor: markomSaving ? 'not-allowed' : 'pointer'
              }}
            >
              <FontAwesomeIcon icon={faCheck} className="text-xs" />
              <span>{markomSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
