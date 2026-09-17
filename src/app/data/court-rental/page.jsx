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
  faCheck
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
CREATE INDEX IF NOT EXISTS idx_court_rentals_status ON public.court_rentals(status);
CREATE INDEX IF NOT EXISTS idx_court_rentals_code ON public.court_rentals(booking_code);

CREATE TABLE IF NOT EXISTS public.court_blackout_dates (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time_slot VARCHAR(50),
    reason TEXT NOT NULL DEFAULT 'Kegiatan Sekolah',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_court_blackout_date ON public.court_blackout_dates(date);`

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

  // Blackout dates state
  const [blackoutDates, setBlackoutDates] = useState([])
  const [blackoutLoading, setBlackoutLoading] = useState(false)
  const [newBlackout, setNewBlackout] = useState({ date: '', time_slot: '', reason: 'Kegiatan Resmi Sekolah' })

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
  }, [fetchBookings])

  useEffect(() => {
    if (activeTab === 'blackout') {
      fetchBlackoutDates()
    }
  }, [activeTab, fetchBlackoutDates])

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

  const copyMigrationSql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2500)
  }

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0)
  }

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
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Manage master reservations, verify payment proof streams, issue official booking approvals, and set operational blackout dates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                  Time Slot (Leave blank for whole day)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 16:00 - 18:00"
                  value={newBlackout.time_slot}
                  onChange={(e) => setNewBlackout({ ...newBlackout, time_slot: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
                />
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

            {/* Protected stream image */}
            <div className="p-2 rounded border flex items-center justify-center min-h-[320px] overflow-hidden" style={{ background: isDark ? '#09090B' : '#FFFFFF', borderColor }}>
              <img
                src={`/api/court-rental/${selectedBooking.id}/proof?t=${Date.now()}`}
                alt="Payment Proof"
                className="max-h-[460px] w-auto max-w-full rounded object-contain"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.style.display = 'none'
                  const parent = e.target.parentElement
                  if (parent) {
                    parent.innerHTML = '<div class="text-xs text-neutral-400 py-10 text-center font-mono"><p class="font-bold text-rose-500">Failed to stream image from hosting.</p><p class="text-[11px] mt-1">Ensure file exists in uploads/ on cPanel hosting.</p></div>'
                  }
                }}
              />
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
              {selectedBooking.status !== 'approved' && (
                <button
                  onClick={() => {
                    setProofModalOpen(false)
                    setApproveModalOpen(true)
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
                  Approve This Payment
                </button>
              )}
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
    </div>
  )
}
