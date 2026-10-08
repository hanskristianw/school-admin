'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBroom,
  faCalendarAlt,
  faSearch,
  faEye,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faRotateRight,
  faBuilding,
  faUser,
  faExclamationTriangle,
  faChevronLeft,
  faChevronRight,
  faSlidersH,
  faCheck,
  faCopy,
  faQrcode,
  faList,
  faThLarge,
  faCommentDots
} from '@fortawesome/free-solid-svg-icons'

const SQL_MIGRATION_TEXT = `-- 1. Tambah kolom qr_code_token dan is_active ke tabel room
ALTER TABLE public.room 
ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(64) UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE public.room
SET qr_code_token = 'rm_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 12)
WHERE qr_code_token IS NULL;

-- 2. Buat tabel vendor_room_checklists
CREATE TABLE IF NOT EXISTS public.vendor_room_checklists (
    id BIGSERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES public.room(room_id) ON DELETE CASCADE,
    check_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_worker_name VARCHAR(150) NOT NULL,
    image_before_file TEXT,
    image_after_file TEXT,
    image_revision_file TEXT,
    hosting_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    notes TEXT,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    reviewed_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_vendor_room_date UNIQUE(room_id, check_date)
);

CREATE INDEX IF NOT EXISTS idx_vendor_checklist_date ON public.vendor_room_checklists(check_date);
CREATE INDEX IF NOT EXISTS idx_vendor_checklist_room ON public.vendor_room_checklists(room_id);
CREATE INDEX IF NOT EXISTS idx_vendor_checklist_status ON public.vendor_room_checklists(status);
CREATE INDEX IF NOT EXISTS idx_room_qr_token ON public.room(qr_code_token);

-- 3. Setting default supervisor roles
INSERT INTO public.settings (key, value, description)
VALUES ('vendor_checklist_supervisor_role_ids', '[1, 11, 16]', 'Daftar role_id supervisor checklist vendor')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.vendor_room_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select vendor_room_checklists" ON public.vendor_room_checklists FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Allow all for service role on vendor_room_checklists" ON public.vendor_room_checklists FOR ALL TO service_role USING (true) WITH CHECK (true);`

function getWibDate(date = new Date()) {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

function formatWibTime(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
  } catch {
    return dateStr
  }
}

function calculateDuration(startStr, endStr) {
  if (!startStr || !endStr) return null
  try {
    const s = new Date(startStr).getTime()
    const e = new Date(endStr).getTime()
    const diffMin = Math.round((e - s) / (1000 * 60))
    if (diffMin < 1) return '< 1 mnt'
    if (diffMin >= 60) {
      const h = Math.floor(diffMin / 60)
      const m = diffMin % 60
      return `${h}j ${m}m`
    }
    return `${diffMin} menit`
  } catch {
    return null
  }
}

export default function VendorChecklistDashboardPage() {
  const router = useRouter()
  const { theme, isDark } = useTheme()

  // Clean design tokens matching /data/court-rental & /data/pyp
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  // State
  const [selectedDate, setSelectedDate] = useState(() => getWibDate())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tableExists, setTableExists] = useState(true)
  const [rooms, setRooms] = useState([])
  const [checklists, setChecklists] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'pending_review' | 'in_progress' | 'revision' | 'approved' | 'not_started'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'

  // User auth state
  const [currentUser, setCurrentUser] = useState(null)
  const [supervisorRoleIds, setSupervisorRoleIds] = useState([1, 11, 16])
  const [isSupervisor, setIsSupervisor] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Inspection modal
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false)
  const [activeItem, setActiveItem] = useState(null)
  const [reviewNoteInput, setReviewNoteInput] = useState('')
  const [reviewActionLoading, setReviewActionLoading] = useState(false)
  const [zoomImage, setZoomImage] = useState(null)

  // Roles modal
  const [rolesModalOpen, setRolesModalOpen] = useState(false)
  const [allRoles, setAllRoles] = useState([])
  const [selectedRoleIds, setSelectedRoleIds] = useState([])
  const [savingRoles, setSavingRoles] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  // 1. Auth & Supervisor permissions check
  useEffect(() => {
    const krId = typeof window !== 'undefined' ? localStorage.getItem('kr_id') : null
    if (!krId) {
      router.replace('/login')
      return
    }

    try {
      const userRaw = localStorage.getItem('user_data')
      if (userRaw) {
        const u = JSON.parse(userRaw)
        setCurrentUser(u)
        const userAdmin = Boolean(u.isAdmin || u.roleID === 1 || u.roleID === 16)
        setIsAdmin(userAdmin)
      }
    } catch (e) {
      console.warn('Failed parsing user_data', e)
    }

    fetchSupervisorRoles()
  }, [router])

  const fetchSupervisorRoles = async () => {
    try {
      const res = await fetch('/api/vendor-checklist/supervisor-roles')
      const json = await res.json()
      if (json.success) {
        setSupervisorRoleIds(json.supervisor_role_ids || [1, 11, 16])
        setAllRoles(json.all_roles || [])
        setSelectedRoleIds(json.supervisor_role_ids || [1, 11, 16])
      }
    } catch (e) {
      console.warn('Error fetching supervisor roles:', e)
    }
  }

  useEffect(() => {
    if (currentUser) {
      const userRoleId = currentUser.roleID
      const userAdmin = Boolean(currentUser.isAdmin || userRoleId === 1 || userRoleId === 16)
      const allowed = userAdmin || supervisorRoleIds.includes(userRoleId)
      setIsSupervisor(allowed)
    }
  }, [currentUser, supervisorRoleIds])

  // 2. Fetch data (rooms & checklists for selectedDate)
  const fetchData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    else setRefreshing(true)

    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      const { data: roomList, error: roomErr } = await supabase
        .from('room')
        .select('*')
        .order('room_name', { ascending: true })

      if (roomErr) throw roomErr
      setRooms(roomList || [])

      const { data: checklistList, error: checkErr } = await supabase
        .from('vendor_room_checklists')
        .select('*')
        .eq('check_date', selectedDate)

      if (checkErr) {
        if (checkErr.code === '42P01' || checkErr.message?.includes('does not exist')) {
          setTableExists(false)
          setChecklists([])
          return
        }
        throw checkErr
      }

      setTableExists(true)
      setChecklists(checklistList || [])
    } catch (err) {
      console.error('[Vendor Checklist Dashboard] Fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  // 3. Combine Rooms and Checklist data
  const mergedItems = useMemo(() => {
    const checklistMap = new Map()
    checklists.forEach(c => checklistMap.set(c.room_id, c))

    return rooms.map(room => {
      const check = checklistMap.get(room.room_id)
      return {
        room_id: room.room_id,
        room_name: room.room_name,
        qr_code_token: room.qr_code_token,
        is_active: room.is_active !== false,
        checklist: check || null,
        status: check ? check.status : 'not_started'
      }
    })
  }, [rooms, checklists])

  // 4. Statistics Calculation
  const stats = useMemo(() => {
    const total = mergedItems.length
    let notStarted = 0
    let inProgress = 0
    let pendingReview = 0
    let approved = 0
    let revision = 0
    let rejected = 0

    mergedItems.forEach(item => {
      if (item.status === 'not_started') notStarted++
      else if (item.status === 'in_progress') inProgress++
      else if (item.status === 'pending_review') pendingReview++
      else if (item.status === 'approved') approved++
      else if (item.status === 'revision') revision++
      else if (item.status === 'rejected') rejected++
    })

    return { total, notStarted, inProgress, pendingReview, approved, revision, rejected }
  }, [mergedItems])

  // 5. Filtered items
  const filteredItems = useMemo(() => {
    return mergedItems.filter(item => {
      if (activeTab !== 'all') {
        if (item.status !== activeTab) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const roomMatch = item.room_name.toLowerCase().includes(q)
        const workerMatch = item.checklist?.vendor_worker_name?.toLowerCase().includes(q)
        if (!roomMatch && !workerMatch) return false
      }

      return true
    })
  }, [mergedItems, activeTab, searchQuery])

  // 6. Review checklist action
  const handleReviewAction = async (newStatus) => {
    if (!activeItem?.checklist?.id) return

    if (newStatus === 'revision' && !reviewNoteInput.trim()) {
      alert('Mohon ketikkan catatan instruksi revisi sebelum meminta perbaikan!')
      return
    }

    setReviewActionLoading(true)
    try {
      const res = await fetch('/api/vendor-checklist/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeItem.checklist.id,
          status: newStatus,
          review_notes: reviewNoteInput.trim(),
          reviewed_by: currentUser?.userID || null
        })
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Gagal menyimpan tinjauan')

      setInspectionModalOpen(false)
      setReviewNoteInput('')
      fetchData(false)
    } catch (err) {
      alert('Terjadi kesalahan: ' + err.message)
    } finally {
      setReviewActionLoading(false)
    }
  }

  // 7. Save supervisor roles action
  const handleSaveRoles = async () => {
    setSavingRoles(true)
    try {
      const res = await fetch('/api/vendor-checklist/supervisor-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_ids: selectedRoleIds })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)

      setSupervisorRoleIds(selectedRoleIds)
      setRolesModalOpen(false)
      alert('Pengaturan role supervisor berhasil disimpan!')
    } catch (err) {
      alert('Gagal menyimpan role: ' + err.message)
    } finally {
      setSavingRoles(false)
    }
  }

  const openInspection = (item) => {
    setActiveItem(item)
    setReviewNoteInput(item.checklist?.review_notes || '')
    setInspectionModalOpen(true)
  }

  const changeDateBy = (days) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const isToday = selectedDate === getWibDate()

  // Status Badge Rendering (Identik /data/court-rental)
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pending_review':
        return (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
              color: isDark ? '#FBBF24' : '#92400E',
              border: `1px solid ${isDark ? '#B45309' : '#FDE68A'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            UNDER REVIEW
          </span>
        )
      case 'in_progress':
        return (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
              color: isDark ? '#60A5FA' : '#1E40AF',
              border: `1px solid ${isDark ? '#2563EB' : '#BFDBFE'}`
            }}
          >
            IN PROGRESS
          </span>
        )
      case 'approved':
        return (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
              color: isDark ? '#4ADE80' : '#166534',
              border: `1px solid ${isDark ? '#16A34A' : '#BBF7D0'}`
            }}
          >
            APPROVED
          </span>
        )
      case 'revision':
        return (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: isDark ? 'rgba(244, 63, 94, 0.15)' : '#FFE4E6',
              color: isDark ? '#FB7185' : '#9F1239',
              border: `1px solid ${isDark ? '#E11D48' : '#FECDD3'}`
            }}
          >
            REVISION NEEDED
          </span>
        )
      case 'rejected':
        return (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: isDark ? '#27272A' : '#F3F4F6',
              color: textSecondary,
              border: `1px solid ${borderColor}`
            }}
          >
            REJECTED
          </span>
        )
      default:
        return (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '4px',
              background: isDark ? '#1C1917' : '#F5F5F4',
              color: textSecondary,
              border: `1px solid ${borderColor}`
            }}
          >
            NOT STARTED
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: pageBg, color: textPrimary }}>

      {/* ── HEADER & BREADCRUMBS (EXACT MATCHING /data/court-rental & /data/pyp) ── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[OPERATIONAL]</span>
            <span>/</span>
            <span>[FACILITY MANAGEMENT]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[VENDOR ROOM CHECKLIST]</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded flex items-center justify-center border shrink-0"
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                borderColor: isDark ? '#2563EB' : '#BAE6FD',
                color: isDark ? '#60A5FA' : '#0284C7'
              }}
            >
              <FontAwesomeIcon icon={faBroom} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Vendor Room Cleaning Checklist Management
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Monitoring kebersihan ruangan harian, verifikasi foto before-after, tindak lanjut revisi, dan konfirmasi supervisor.
              </p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Picker Bar */}
          <div
            className="flex items-center px-2 py-1 rounded border shadow-2xs"
            style={{ background: cardBg, borderColor }}
          >
            <button
              onClick={() => changeDateBy(-1)}
              className="p-1 text-xs hover:opacity-70 transition cursor-pointer"
              title="Hari Sebelumnya"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-500 text-xs" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-mono font-semibold bg-transparent border-none focus:outline-none cursor-pointer"
                style={{ color: textPrimary }}
              />
            </div>
            <button
              onClick={() => changeDateBy(1)}
              className="p-1 text-xs hover:opacity-70 transition cursor-pointer"
              title="Hari Berikutnya"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(getWibDate())}
                className="ml-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 transition"
              >
                TODAY
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData(false)}
            disabled={refreshing}
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
            <FontAwesomeIcon icon={faRotateRight} className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Admin Supervisor Setting */}
          {isAdmin && (
            <button
              onClick={() => setRolesModalOpen(true)}
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
              <FontAwesomeIcon icon={faSlidersH} className="text-amber-500 text-xs" />
              Role Supervisor
            </button>
          )}

          {/* Room Master Shortcut */}
          <button
            onClick={() => router.push('/data/room')}
            style={{
              background: textPrimary,
              color: isDark ? '#111111' : '#FFFFFF',
              border: 'none',
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
            <FontAwesomeIcon icon={faQrcode} className="text-xs" />
            Master & Label QR
          </button>
        </div>
      </div>

      {/* ── BANNER JIKA TABEL BELUM DIBUAT (EXACT MATCHING /data/court-rental) ── */}
      {!tableExists && (
        <div style={{ background: cardBg, border: `1px solid #F59E0B`, borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 text-lg mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-sm" style={{ color: textPrimary }}>Supabase Tables Required</div>
                <div className="text-xs mt-0.5" style={{ color: textSecondary }}>
                  Tabel <code className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">vendor_room_checklists</code> belum aktif di Supabase. Salin dan jalankan skrip migrasi di SQL Editor Supabase untuk mengaktifkannya.
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SQL_MIGRATION_TEXT)
                setCopiedSql(true)
                setTimeout(() => setCopiedSql(false), 2500)
              }}
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

      {/* ── BENTO METRIC CARDS (STRIP MINIMALIS IDENTIK /data/court-rental) ── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div
          onClick={() => setActiveTab('all')}
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '14px 18px', cursor: 'pointer' }}
          className="hover:border-neutral-400 transition"
        >
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold" style={{ color: textSecondary }}>
            TOTAL ROOMS
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5" style={{ color: textPrimary }}>
            {stats.total}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('not_started')}
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '14px 18px', cursor: 'pointer' }}
          className="hover:border-neutral-400 transition"
        >
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold" style={{ color: textSecondary }}>
            NOT STARTED
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5 text-neutral-500">
            {stats.notStarted}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('in_progress')}
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '14px 18px', cursor: 'pointer' }}
          className="hover:border-neutral-400 transition"
        >
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold flex items-center justify-between">
            <span style={{ color: '#1F6C9F' }}>IN PROGRESS</span>
            <span className="w-2 h-2 rounded-full bg-[#1F6C9F]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5" style={{ color: isDark ? '#60A5FA' : '#1F6C9F' }}>
            {stats.inProgress}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('pending_review')}
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FEF8EE',
            border: '1px solid #F59E0B',
            borderRadius: '8px',
            padding: '14px 18px',
            cursor: 'pointer'
          }}
          className="shadow-2xs transition"
        >
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold flex items-center justify-between">
            <span className="text-amber-700 dark:text-amber-400">UNDER REVIEW</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5 text-amber-600 dark:text-amber-400">
            {stats.pendingReview}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('revision')}
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '14px 18px', cursor: 'pointer' }}
          className="hover:border-neutral-400 transition"
        >
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold flex items-center justify-between">
            <span className="text-rose-600 dark:text-rose-400">REVISION</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5 text-rose-600 dark:text-rose-400">
            {stats.revision}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('approved')}
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '14px 18px', cursor: 'pointer' }}
          className="hover:border-neutral-400 transition"
        >
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold flex items-center justify-between">
            <span style={{ color: '#346538' }}>APPROVED</span>
            <span className="w-2 h-2 rounded-full bg-[#346538]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5" style={{ color: isDark ? '#4ADE80' : '#346538' }}>
            {stats.approved}
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION (IDENTIK /data/court-rental FLAT UNDERLINE) ── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '20px', gap: '20px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Rooms', count: stats.total },
          { id: 'pending_review', label: 'Under Review', count: stats.pendingReview, highlight: true },
          { id: 'in_progress', label: 'In Progress', count: stats.inProgress },
          { id: 'revision', label: 'Revision', count: stats.revision },
          { id: 'approved', label: 'Approved', count: stats.approved },
          { id: 'not_started', label: 'Not Started', count: stats.notStarted }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 0',
              fontSize: '13px',
              fontFamily: 'monospace',
              fontWeight: activeTab === tab.id ? 700 : 400,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === tab.id ? (tab.highlight ? '#D97706' : textPrimary) : textSecondary,
              borderBottom: activeTab === tab.id ? (tab.highlight ? '2px solid #D97706' : `2px solid ${textPrimary}`) : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{tab.label}</span>
            <span className="text-[11px] opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* ── SEARCH & VIEW MODE TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs" />
          <input
            type="text"
            placeholder="Cari ruangan atau nama petugas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: cardBg,
              borderColor,
              color: textPrimary
            }}
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 font-mono">Tampilan:</span>
          <div className="flex items-center rounded border p-0.5" style={{ borderColor, background: cardBg }}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs transition cursor-pointer ${
                viewMode === 'table' ? 'bg-neutral-800 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-400'
              }`}
              title="Tampilan Tabel"
            >
              <FontAwesomeIcon icon={faList} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-neutral-800 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-400'
              }`}
              title="Tampilan Kartu"
            >
              <FontAwesomeIcon icon={faThLarge} />
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-mono" style={{ color: textSecondary }}>MEMUAT DATA CHECKLIST...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '48px 24px', textAlign: 'center' }}>
          <FontAwesomeIcon icon={faBroom} className="text-3xl text-neutral-400 mb-3" />
          <div className="font-semibold text-sm" style={{ color: textPrimary }}>Tidak Ada Ruangan Sesuai Filter</div>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
            {searchQuery || activeTab !== 'all'
              ? 'Silakan ubah filter status atau kata kunci pencarian Anda.'
              : 'Belum ada ruangan yang terdaftar di master ruangan.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* ── TABLE VIEW (IDENTIK /data/court-rental) ── */
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor, background: isDark ? '#141416' : '#F9F9F8', color: textSecondary }}>
                  <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Ruangan</th>
                  <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Petugas Vendor</th>
                  <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Mulai</th>
                  <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Selesai</th>
                  <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Durasi</th>
                  <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Bukti Foto</th>
                  <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor }}>
                {filteredItems.map(item => {
                  const duration = calculateDuration(item.checklist?.start_time, item.checklist?.end_time)

                  return (
                    <tr key={item.room_id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition">
                      <td className="py-3.5 px-4 font-medium" style={{ color: textPrimary }}>
                        <div className="font-semibold">{item.room_name}</div>
                        <div className="font-mono text-[10px] text-neutral-400">{item.qr_code_token || `#${item.room_id}`}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(item.status)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium" style={{ color: textPrimary }}>
                        {item.checklist?.vendor_worker_name ? (
                          <span className="flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faUser} className="text-[10px] text-neutral-400" />
                            {item.checklist.vendor_worker_name}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-500">
                        {item.checklist?.start_time ? formatWibTime(item.checklist.start_time) : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-500">
                        {item.checklist?.end_time ? formatWibTime(item.checklist.end_time) : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {duration || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.checklist ? (
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            {item.checklist.image_before_file && (
                              <button
                                onClick={() => openInspection(item)}
                                className="px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold hover:opacity-80"
                                title="Lihat Foto Before"
                              >
                                Before
                              </button>
                            )}
                            {item.checklist.image_after_file && (
                              <button
                                onClick={() => openInspection(item)}
                                className="px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold hover:opacity-80"
                                title="Lihat Foto After"
                              >
                                After
                              </button>
                            )}
                            {item.checklist.image_revision_file && (
                              <button
                                onClick={() => openInspection(item)}
                                className="px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold hover:opacity-80"
                                title="Lihat Foto Revisi"
                              >
                                Revisi
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item.checklist ? (
                          <button
                            onClick={() => openInspection(item)}
                            style={{
                              background: item.status === 'pending_review' ? textPrimary : 'transparent',
                              color: item.status === 'pending_review' ? (isDark ? '#111' : '#FFF') : textPrimary,
                              border: `1px solid ${borderColor}`,
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '5px 10px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                            <span>{item.status === 'pending_review' ? 'Tinjau' : 'Detail'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">Belum scan</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const duration = calculateDuration(item.checklist?.start_time, item.checklist?.end_time)

            return (
              <div
                key={item.room_id}
                style={{
                  background: cardBg,
                  border: `1px solid ${item.status === 'pending_review' ? '#F59E0B' : borderColor}`,
                  borderRadius: '8px',
                  padding: '16px'
                }}
                className="flex flex-col justify-between transition shadow-2xs hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-sm tracking-tight line-clamp-1" style={{ color: textPrimary }}>
                        {item.room_name}
                      </h3>
                      <p className="font-mono text-[10px] text-neutral-400">
                        {item.qr_code_token || `#${item.room_id}`}
                      </p>
                    </div>
                    {renderStatusBadge(item.status)}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-neutral-500">
                      <span>Petugas:</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                        {item.checklist?.vendor_worker_name || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-500">
                      <span>Waktu:</span>
                      <span>
                        {item.checklist?.start_time ? formatWibTime(item.checklist.start_time) : '—'}
                        {item.checklist?.end_time ? ` - ${formatWibTime(item.checklist.end_time)}` : ''}
                      </span>
                    </div>
                    {duration && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Durasi:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{duration}</span>
                      </div>
                    )}
                  </div>

                  {/* Photo Thumbnails */}
                  {item.checklist && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2" style={{ borderColor }}>
                      <div
                        onClick={() => openInspection(item)}
                        className="rounded overflow-hidden bg-neutral-900 aspect-4/3 cursor-pointer relative border border-neutral-700"
                      >
                        {item.checklist.image_before_file ? (
                          <img
                            src={`/api/vendor-checklist/${item.checklist.id}/photo?type=before`}
                            alt="Before"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10px] text-neutral-400">No Photo</div>
                        )}
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white font-mono text-[9px] px-1 rounded">
                          Before
                        </span>
                      </div>

                      <div
                        onClick={() => openInspection(item)}
                        className="rounded overflow-hidden bg-neutral-900 aspect-4/3 cursor-pointer relative border border-neutral-700"
                      >
                        {item.checklist.image_revision_file ? (
                          <>
                            <img
                              src={`/api/vendor-checklist/${item.checklist.id}/photo?type=revision`}
                              alt="Revision"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <span className="absolute bottom-1 left-1 bg-rose-600 text-white font-mono text-[9px] px-1 rounded">
                              Revisi
                            </span>
                          </>
                        ) : item.checklist.image_after_file ? (
                          <>
                            <img
                              src={`/api/vendor-checklist/${item.checklist.id}/photo?type=after`}
                              alt="After"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <span className="absolute bottom-1 left-1 bg-emerald-600 text-white font-mono text-[9px] px-1 rounded">
                              After
                            </span>
                          </>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10px] text-neutral-400">In Progress</div>
                        )}
                      </div>
                    </div>
                  )}

                  {item.checklist?.review_notes && (
                    <div className="mt-2.5 p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-800 dark:text-rose-300">
                      <span className="font-bold">Catatan:</span> "{item.checklist.review_notes}"
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t" style={{ borderColor }}>
                  {item.checklist ? (
                    <button
                      onClick={() => openInspection(item)}
                      style={{
                        background: item.status === 'pending_review' ? textPrimary : 'transparent',
                        color: item.status === 'pending_review' ? (isDark ? '#111' : '#FFF') : textPrimary,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        width: '100%',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FontAwesomeIcon icon={faEye} className="text-xs" />
                      <span>{item.status === 'pending_review' ? 'Tinjau & Verifikasi' : 'Lihat Detail'}</span>
                    </button>
                  ) : (
                    <div className="text-center py-1 text-[11px] text-neutral-400 italic">
                      Belum scan barcode pintu
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL: INSPEKSI CHECKLIST (MATCHING COURT-RENTAL MODAL) ── */}
      <Modal
        isOpen={inspectionModalOpen}
        onClose={() => setInspectionModalOpen(false)}
        title={`Inspeksi Kebersihan: ${activeItem?.room_name || ''}`}
        size="lg"
      >
        {activeItem?.checklist ? (
          <div className="space-y-4 text-xs">
            {/* Meta Strip */}
            <div
              style={{ background: isDark ? '#141416' : '#F9F9F8', border: `1px solid ${borderColor}`, borderRadius: '6px' }}
              className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]"
            >
              <div>
                <span className="text-neutral-400 block text-[10px]">PETUGAS VENDOR:</span>
                <span className="font-bold">{activeItem.checklist.vendor_worker_name}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">MULAI:</span>
                <span>{formatWibTime(activeItem.checklist.start_time)}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">SELESAI:</span>
                <span>{formatWibTime(activeItem.checklist.end_time)}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">DURASI:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {calculateDuration(activeItem.checklist.start_time, activeItem.checklist.end_time) || '—'}
                </span>
              </div>
            </div>

            {activeItem.checklist.notes && (
              <div style={{ background: isDark ? '#141416' : '#F4F7FB', border: `1px solid ${borderColor}`, borderRadius: '6px' }} className="p-3">
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-[10px]">CATATAN PETUGAS:</span>
                <p className="mt-0.5">{activeItem.checklist.notes}</p>
              </div>
            )}

            {/* SIDE-BY-SIDE PHOTO COMPARISON */}
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                HASIL PEMERIKSAAN FOTO KAMERA
              </div>

              <div className={`grid gap-3 ${activeItem.checklist.image_revision_file ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {/* 1. Before */}
                <div className="space-y-1">
                  <div className="font-mono text-[11px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
                    <span>1. SEBELUM (BEFORE)</span>
                    <span className="text-[10px] text-neutral-400 cursor-pointer">Klik zoom</span>
                  </div>
                  <div
                    onClick={() => setZoomImage({
                      url: `/api/vendor-checklist/${activeItem.checklist.id}/photo?type=before`,
                      title: 'Foto Sebelum (Before)'
                    })}
                    className="rounded overflow-hidden bg-black aspect-4/3 cursor-pointer border border-neutral-700 relative group"
                  >
                    {activeItem.checklist.image_before_file ? (
                      <img
                        src={`/api/vendor-checklist/${activeItem.checklist.id}/photo?type=before`}
                        alt="Before"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-500 font-mono text-xs">
                        Tidak ada foto
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. After */}
                <div className="space-y-1">
                  <div className="font-mono text-[11px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
                    <span>2. SESUDAH (AFTER)</span>
                    <span className="text-[10px] text-neutral-400 cursor-pointer">Klik zoom</span>
                  </div>
                  <div
                    onClick={() => setZoomImage({
                      url: `/api/vendor-checklist/${activeItem.checklist.id}/photo?type=after`,
                      title: 'Foto Sesudah (After)'
                    })}
                    className="rounded overflow-hidden bg-black aspect-4/3 cursor-pointer border border-neutral-700 relative group"
                  >
                    {activeItem.checklist.image_after_file ? (
                      <img
                        src={`/api/vendor-checklist/${activeItem.checklist.id}/photo?type=after`}
                        alt="After"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-500 font-mono text-xs">
                        Belum diunggah
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Revision (if any) */}
                {activeItem.checklist.image_revision_file && (
                  <div className="space-y-1">
                    <div className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                      <span>3. HASIL REVISI</span>
                      <span className="text-[10px] text-neutral-400 cursor-pointer">Klik zoom</span>
                    </div>
                    <div
                      onClick={() => setZoomImage({
                        url: `/api/vendor-checklist/${activeItem.checklist.id}/photo?type=revision`,
                        title: 'Foto Hasil Revisi'
                      })}
                      className="rounded overflow-hidden bg-black aspect-4/3 cursor-pointer border-2 border-rose-500 relative group"
                    >
                      <img
                        src={`/api/vendor-checklist/${activeItem.checklist.id}/photo?type=revision`}
                        alt="Revision"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SUPERVISOR ACTIONS */}
            <div
              style={{ background: isDark ? '#141416' : '#F9F9F8', border: `1px solid ${borderColor}`, borderRadius: '6px' }}
              className="p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="font-bold text-neutral-700 dark:text-neutral-300">
                  KEPUTUSAN SUPERVISOR
                </span>
                {!isSupervisor && (
                  <span className="text-neutral-400 italic">Hanya supervisor yang berwenang</span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-mono text-neutral-500 block mb-1">
                  CATATAN / INSTRUKSI REVISI (Wajib diisi jika minta revisi):
                </label>
                <textarea
                  value={reviewNoteInput}
                  onChange={(e) => setReviewNoteInput(e.target.value)}
                  placeholder="Ketik catatan perbaikan jika ruangan perlu dibersihkan ulang..."
                  rows={2}
                  disabled={!isSupervisor || reviewActionLoading}
                  style={{ background: cardBg, borderColor, color: textPrimary }}
                  className="w-full p-2.5 rounded text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {isSupervisor ? (
                <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor }}>
                  <button
                    onClick={() => handleReviewAction('rejected')}
                    disabled={reviewActionLoading}
                    style={{
                      background: 'transparent',
                      color: textSecondary,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '6px 12px',
                      cursor: 'pointer'
                    }}
                  >
                    Tolak
                  </button>

                  <button
                    onClick={() => handleReviewAction('revision')}
                    disabled={reviewActionLoading}
                    style={{
                      background: '#E11D48',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-[10px]" />
                    Minta Revisi Petugas
                  </button>

                  <button
                    onClick={() => handleReviewAction('approved')}
                    disabled={reviewActionLoading}
                    style={{
                      background: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '6px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" />
                    Setujui (Approve)
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400 text-center py-1 italic">
                  Akun Anda saat ini berstatus viewer (bukan supervisor).
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-400 text-xs">
            Belum ada data checklist untuk ruangan ini.
          </div>
        )}
      </Modal>

      {/* ── MODAL: IMAGE ZOOM LIGHTBOX ── */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomImage(null)}
        >
          <div className="max-w-4xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white pb-3 px-2 font-mono text-xs">
              <span>{zoomImage.title}</span>
              <button
                onClick={() => setZoomImage(null)}
                className="text-white hover:text-rose-400 font-bold px-2 py-1 cursor-pointer"
              >
                ✕ TUTUP
              </button>
            </div>
            <div className="relative max-h-[80vh] overflow-auto rounded bg-black border border-neutral-800 p-2">
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                className="max-h-[75vh] w-auto max-w-full rounded object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PENGATURAN ROLE SUPERVISOR (ADMIN ONLY) ── */}
      <Modal
        isOpen={rolesModalOpen}
        onClose={() => setRolesModalOpen(false)}
        title="Pengaturan Role Supervisor Checklist Vendor"
        size="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-neutral-500">
            Pilih role pengguna yang diizinkan untuk memeriksa dan menyetujui hasil kebersihan vendor:
          </p>

          <div className="max-h-64 overflow-y-auto space-y-2 border rounded p-3" style={{ borderColor }}>
            {allRoles.map(r => {
              const checked = selectedRoleIds.includes(r.role_id)
              return (
                <label
                  key={r.role_id}
                  className="flex items-center space-x-2.5 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoleIds([...selectedRoleIds, r.role_id])
                      } else {
                        setSelectedRoleIds(selectedRoleIds.filter(id => id !== r.role_id))
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-semibold" style={{ color: textPrimary }}>
                      {r.role_name}
                    </span>
                    <span className="text-[10px] text-neutral-400 ml-2 font-mono">
                      (ID: {r.role_id})
                    </span>
                  </div>
                </label>
              )
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
            <button
              onClick={() => setRolesModalOpen(false)}
              style={{
                background: 'transparent',
                color: textSecondary,
                border: `1px solid ${borderColor}`,
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '7px 14px',
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              onClick={handleSaveRoles}
              disabled={savingRoles}
              style={{
                background: textPrimary,
                color: isDark ? '#111111' : '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '7px 16px',
                cursor: 'pointer'
              }}
            >
              {savingRoles ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
