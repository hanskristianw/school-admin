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
  faCheckDouble,
  faExternalLinkAlt,
  faUsersCog,
  faSave,
  faPrint,
  faDownload,
  faFilePdf,
  faSpinner
} from '@fortawesome/free-solid-svg-icons'
import {
  DEFAULT_GENERAL_REPORT_URL,
  generateGeneralReporterPDF,
  getGeneralReportQrDataUrl
} from '@/app/data/room/lib/roomPdfGenerator'
import { GeneralReporterStickerCard } from '@/app/data/room/page'

const SQL_MIGRATION_TEXT = `-- Jalankan di Supabase SQL Editor untuk tabel relasi Many-to-Many & QR General
CREATE TABLE IF NOT EXISTS public.vendor_cleaner_rooms (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES public.room(room_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vendor_cleaner_room UNIQUE (user_id, room_id)
);

ALTER TABLE public.room_facility_reports
    ALTER COLUMN room_id DROP NOT NULL,
    ALTER COLUMN reporter_name DROP NOT NULL,
    ALTER COLUMN reporter_name SET DEFAULT 'Anonim';`

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
  const { isDark } = useTheme()

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
  const [cleanerFilter, setCleanerFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'pending_review' | 'in_progress' | 'revision' | 'approved' | 'not_started'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'

  // Main Tab Navigation: 'checklists' | 'complaints'
  const [mainTab, setMainTab] = useState('checklists')

  // Room -> Cleaners Assignment state (1 ruangan bisa 1 atau lebih cleaner)
  const [cleaners, setCleaners] = useState([])
  const [assignmentsMap, setAssignmentsMap] = useState({})
  const [roomCleanersMap, setRoomCleanersMap] = useState({})
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [savingRoomId, setSavingRoomId] = useState(null)
  const [editingRoomModal, setEditingRoomModal] = useState(null) // room item object
  const [draftRoomCleaners, setDraftRoomCleaners] = useState([]) // array of user_ids
  const [cleanerModalSearch, setCleanerModalSearch] = useState('')

  // General QR Modal state
  const [generalQrModalOpen, setGeneralQrModalOpen] = useState(false)
  const [generalQrDataUrl, setGeneralQrDataUrl] = useState('')
  const [targetReportUrl, setTargetReportUrl] = useState(DEFAULT_GENERAL_REPORT_URL)
  const [printCopies, setPrintCopies] = useState(1)
  const [copiedQrUrl, setCopiedQrUrl] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Facility Complaints state
  const [complaints, setComplaints] = useState([])
  const [complaintsLoading, setComplaintsLoading] = useState(false)
  const [complaintFilter, setComplaintFilter] = useState('all') // 'all' | 'pending' | 'in_progress' | 'resolved'
  const [complaintSearch, setComplaintSearch] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [complaintModalOpen, setComplaintModalOpen] = useState(false)
  const [complaintActionLoading, setComplaintActionLoading] = useState(false)
  const [supervisorNoteInput, setSupervisorNoteInput] = useState('')

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

  useEffect(() => {
    if (!targetReportUrl) return
    getGeneralReportQrDataUrl(targetReportUrl).then(setGeneralQrDataUrl).catch(() => {})
  }, [targetReportUrl])

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

  // Fetch Cleaner Room Assignments (Many-to-Many)
  const fetchAssignments = useCallback(async () => {
    setAssignmentsLoading(true)
    try {
      const res = await fetch('/api/vendor-checklist/assignments')
      const json = await res.json()
      if (json.success) {
        setCleaners(json.cleaners || [])
        setAssignmentsMap(json.assignments_map || {})
        setRoomCleanersMap(json.room_cleaners_map || {})
      }
    } catch (e) {
      console.warn('Error fetching cleaner assignments:', e)
    } finally {
      setAssignmentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

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

  const fetchComplaints = useCallback(async () => {
    setComplaintsLoading(true)
    try {
      const res = await fetch('/api/vendor-checklist/facility-reports?limit=200')
      const json = await res.json()
      if (json.success && Array.isArray(json.reports)) {
        setComplaints(json.reports)
      }
    } catch (e) {
      console.warn('Error fetching facility complaints:', e)
    } finally {
      setComplaintsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  const unresolvedComplaintsCount = useMemo(() => {
    return complaints.filter(c => c.status !== 'resolved').length
  }, [complaints])

  const complaintStats = useMemo(() => {
    const total = complaints.length
    let pending = 0
    let inProgress = 0
    let resolved = 0
    complaints.forEach(c => {
      if (c.status === 'pending') pending++
      else if (c.status === 'in_progress') inProgress++
      else if (c.status === 'resolved') resolved++
    })
    return { total, pending, inProgress, resolved }
  }, [complaints])

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (complaintFilter !== 'all' && c.status !== complaintFilter) return false
      if (complaintSearch.trim()) {
        const q = complaintSearch.toLowerCase()
        const roomMatch = (c.room_name || '').toLowerCase().includes(q)
        const reporterMatch = (c.reporter_name || '').toLowerCase().includes(q)
        const descMatch = (c.issue_description || '').toLowerCase().includes(q)
        const workerMatch = (c.resolved_by_name || '').toLowerCase().includes(q)
        if (!roomMatch && !reporterMatch && !descMatch && !workerMatch) return false
      }
      return true
    })
  }, [complaints, complaintFilter, complaintSearch])

  const handleUpdateComplaintStatus = async (reportId, newStatus, notes) => {
    setComplaintActionLoading(true)
    try {
      const res = await fetch('/api/vendor-checklist/facility-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reportId,
          status: newStatus,
          resolution_notes: notes !== undefined ? notes : undefined
        })
      })
      const json = await res.json()
      if (json.success) {
        setComplaintModalOpen(false)
        fetchComplaints()
      } else {
        alert(json.message || 'Gagal memperbarui status komplain')
      }
    } catch (e) {
      alert('Terjadi kesalahan koneksi')
    } finally {
      setComplaintActionLoading(false)
    }
  }

  // Open Room -> Cleaners Assignment Modal (misal Computer Lab -> atur siapa saja yang membersihkan)
  const openEditRoomCleaners = (roomItem) => {
    const currentCleaners = roomCleanersMap[roomItem.room_id] || []
    setEditingRoomModal(roomItem)
    setDraftRoomCleaners(currentCleaners.map(c => Number(c.user_id)))
    setCleanerModalSearch('')
  }

  const toggleDraftCleaner = (userId) => {
    const numId = Number(userId)
    setDraftRoomCleaners(prev =>
      prev.includes(numId) ? prev.filter(id => id !== numId) : [...prev, numId]
    )
  }

  const handleSaveRoomCleaners = async () => {
    if (!editingRoomModal) return
    setSavingRoomId(editingRoomModal.room_id)
    try {
      const res = await fetch('/api/vendor-checklist/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: editingRoomModal.room_id,
          user_ids: draftRoomCleaners
        })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Gagal menyimpan petugas ruangan')
      setEditingRoomModal(null)
      await fetchAssignments()
    } catch (err) {
      alert('Gagal menyimpan petugas ruangan: ' + err.message)
    } finally {
      setSavingRoomId(null)
    }
  }

  // 3. Combine Rooms, Assigned Cleaners, and Checklist data
  const mergedItems = useMemo(() => {
    const checklistMap = new Map()
    checklists.forEach(c => checklistMap.set(c.room_id, c))

    return rooms.map(room => {
      const check = checklistMap.get(room.room_id)
      const assignedCleaners = roomCleanersMap[room.room_id] || []
      return {
        room_id: room.room_id,
        room_name: room.room_name,
        qr_code_token: room.qr_code_token,
        is_active: room.is_active !== false,
        assigned_cleaners: assignedCleaners,
        checklist: check || null,
        status: check ? check.status : 'not_started'
      }
    })
  }, [rooms, checklists, roomCleanersMap])

  // Unassigned active rooms
  const unassignedRooms = useMemo(() => {
    return mergedItems.filter(item => item.is_active && (!item.assigned_cleaners || item.assigned_cleaners.length === 0))
  }, [mergedItems])

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

      if (cleanerFilter !== 'all') {
        if (cleanerFilter === 'unassigned') {
          if (item.assigned_cleaners && item.assigned_cleaners.length > 0) return false
        } else {
          const targetUserId = Number(cleanerFilter)
          const isAssigned = (item.assigned_cleaners || []).some(c => Number(c.user_id) === targetUserId)
          if (!isAssigned) return false
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const roomMatch = item.room_name.toLowerCase().includes(q)
        const workerMatch = item.checklist?.vendor_worker_name?.toLowerCase().includes(q)
        const assignedMatch = (item.assigned_cleaners || []).some(c => (c.full_name || '').toLowerCase().includes(q))
        if (!roomMatch && !workerMatch && !assignedMatch) return false
      }

      return true
    })
  }, [mergedItems, activeTab, cleanerFilter, searchQuery])

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
                Vendor Cleaning &amp; Facility Reporting Management
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Jadwal penugasan ruangan per cleaner (Si X → Ruangan A, B, C, D), verifikasi foto before-after, dan keluhan QR General.
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
            onClick={() => {
              fetchData(false)
              fetchAssignments()
              fetchComplaints()
            }}
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

          {/* General QR Pelapor Modal Button */}
          <button
            onClick={() => setGeneralQrModalOpen(true)}
            style={{
              background: isDark ? 'rgba(241, 97, 1, 0.15)' : '#FFF7ED',
              border: `1px solid ${isDark ? '#EA580C' : '#FDBA74'}`,
              color: isDark ? '#FB923C' : '#C2410C',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              padding: '7px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faQrcode} className="text-xs" />
            QR General Pelapor
          </button>
        </div>
      </div>

      {/* ── TOP-LEVEL NAVIGATION TABS: CHECKLIST vs KOMPLAIN FASILITAS ── */}
      <div className="flex items-center gap-2 border-b mb-6 overflow-x-auto" style={{ borderColor }}>
        <button
          onClick={() => setMainTab('checklists')}
          style={{
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            borderBottom: mainTab === 'checklists' ? `2px solid #F16101` : '2px solid transparent',
            color: mainTab === 'checklists' ? textPrimary : textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <FontAwesomeIcon icon={faBroom} className="text-xs text-orange-500" />
          <span>Checklist Kebersihan Ruangan</span>
        </button>

        <button
          onClick={() => setMainTab('complaints')}
          style={{
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            borderBottom: mainTab === 'complaints' ? `2px solid #EF4444` : '2px solid transparent',
            color: mainTab === 'complaints' ? textPrimary : textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className={unresolvedComplaintsCount > 0 ? "text-rose-500 text-xs" : "text-amber-500 text-xs"} />
          <span>Laporan &amp; Komplain Pelapor (QR General)</span>
          {unresolvedComplaintsCount > 0 && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                background: '#EF4444',
                color: '#FFFFFF',
                borderRadius: '9999px',
                padding: '1px 7px',
                lineHeight: '14px'
              }}
            >
              {unresolvedComplaintsCount}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB CONTENT 1: CHECKLIST KEBERSIHAN RUANGAN ── */}
      {mainTab === 'checklists' && (
        <div>
          {/* ── BANNER JIKA TABEL BELUM DIBUAT ── */}
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

          {/* ── BENTO METRIC CARDS ── */}
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

          {/* ── TABS NAVIGATION ── */}
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

          {/* ── SEARCH, CLEANER FILTER & VIEW MODE TOOLBAR ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
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

              <select
                value={cleanerFilter}
                onChange={(e) => setCleanerFilter(e.target.value)}
                style={{
                  background: cardBg,
                  borderColor,
                  color: textPrimary
                }}
                className="px-3 py-1.5 rounded-md text-xs border font-mono font-semibold cursor-pointer focus:outline-none"
              >
                <option value="all">Semua Jadwal Cleaner ({cleaners.length})</option>
                {cleaners.map(c => (
                  <option key={c.user_id} value={String(c.user_id)}>
                    Jadwal: {c.full_name} ({(assignmentsMap[String(c.user_id)] || []).length} Ruangan)
                  </option>
                ))}
                <option value="unassigned">Belum Ada PIC Cleaner ({unassignedRooms.length})</option>
              </select>
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
                {searchQuery || activeTab !== 'all' || cleanerFilter !== 'all'
                  ? 'Silakan ubah filter status, cleaner, atau kata kunci pencarian Anda.'
                  : 'Belum ada ruangan yang terdaftar di master ruangan.'}
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* ── TABLE VIEW ── */
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b" style={{ borderColor, background: isDark ? '#141416' : '#F9F9F8', color: textSecondary }}>
                      <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Ruangan</th>
                      <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Jadwal PIC Cleaner</th>
                      <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Dikerjakan Oleh</th>
                      <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Waktu Upload</th>
                      <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider">Bukti Foto (Before &amp; After)</th>
                      <th className="py-3 px-4 font-mono font-semibold text-[11px] uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor }}>
                    {filteredItems.map(item => {
                      return (
                        <tr key={item.room_id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition">
                          <td className="py-3.5 px-4 font-medium" style={{ color: textPrimary }}>
                            <div className="font-semibold">{item.room_name}</div>
                            <div className="font-mono text-[10px] text-neutral-400">ID #{item.room_id}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {item.assigned_cleaners && item.assigned_cleaners.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {item.assigned_cleaners.map(c => (
                                  <span
                                    key={c.user_id}
                                    onClick={() => openEditRoomCleaners(item)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer hover:opacity-80"
                                    title="Klik untuk mengubah petugas"
                                  >
                                    <FontAwesomeIcon icon={faUser} className="text-[9px]" />
                                    {c.full_name}
                                  </span>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => openEditRoomCleaners(item)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer"
                                  title="Atur siapa yang membersihkan ruangan ini"
                                >
                                  + Atur
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openEditRoomCleaners(item)}
                                className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:opacity-85 cursor-pointer"
                              >
                                + Atur Cleaner
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {renderStatusBadge(item.status)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium" style={{ color: textPrimary }}>
                            {item.checklist?.vendor_worker_name ? (
                              <span className="flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faUser} className="text-[10px] text-emerald-500" />
                                {item.checklist.vendor_worker_name}
                              </span>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-500">
                            {item.checklist?.end_time
                              ? formatWibTime(item.checklist.end_time)
                              : item.checklist?.start_time
                              ? formatWibTime(item.checklist.start_time)
                              : '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.checklist ? (
                              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                {item.checklist.image_before_file && (
                                  <button
                                    onClick={() => openInspection(item)}
                                    className="px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold hover:opacity-80 cursor-pointer"
                                    title="Lihat Foto Before"
                                  >
                                    Before
                                  </button>
                                )}
                                {item.checklist.image_after_file && (
                                  <button
                                    onClick={() => openInspection(item)}
                                    className="px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold hover:opacity-80 cursor-pointer"
                                    title="Lihat Foto After"
                                  >
                                    After
                                  </button>
                                )}
                                {item.checklist.image_revision_file && (
                                  <button
                                    onClick={() => openInspection(item)}
                                    className="px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold hover:opacity-80 cursor-pointer"
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
                              <span className="text-[11px] text-neutral-400 italic">Belum upload</span>
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
                            ID #{item.room_id}
                          </p>
                        </div>
                        {renderStatusBadge(item.status)}
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between text-neutral-500">
                          <span>Jadwal PIC:</span>
                          <button
                            type="button"
                            onClick={() => openEditRoomCleaners(item)}
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[160px] cursor-pointer text-right"
                          >
                            {item.assigned_cleaners && item.assigned_cleaners.length > 0
                              ? item.assigned_cleaners.map(c => c.full_name).join(', ')
                              : '+ Atur Cleaner'}
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-neutral-500">
                          <span>Dikerjakan:</span>
                          <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                            {item.checklist?.vendor_worker_name || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-500">
                          <span>Waktu:</span>
                          <span>
                            {item.checklist?.end_time
                              ? formatWibTime(item.checklist.end_time)
                              : item.checklist?.start_time
                              ? formatWibTime(item.checklist.start_time)
                              : '—'}
                          </span>
                        </div>
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
                          <span className="font-bold">Catatan:</span> &quot;{item.checklist.review_notes}&quot;
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
                          Belum upload foto Before &amp; After
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT 2: LAPORAN & KOMPLAIN FASILITAS RUANGAN ── */}
      {mainTab === 'complaints' && (
        <div className="space-y-6">
          {/* Bento Metric Cards for Complaints */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              onClick={() => setComplaintFilter('all')}
              style={{
                background: cardBg,
                border: `1px solid ${complaintFilter === 'all' ? '#022C46' : borderColor}`,
                borderRadius: '8px',
                padding: '14px 18px',
                cursor: 'pointer'
              }}
              className="hover:border-neutral-400 transition"
            >
              <div className="text-[11px] font-mono uppercase tracking-wider" style={{ color: textSecondary }}>
                TOTAL LAPORAN
              </div>
              <div className="text-2xl font-bold font-mono mt-1" style={{ color: textPrimary }}>
                {complaintStats.total}
              </div>
            </div>

            <div
              onClick={() => setComplaintFilter('pending')}
              style={{
                background: complaintFilter === 'pending' ? (isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF8EE') : cardBg,
                border: `1px solid ${complaintFilter === 'pending' ? '#F59E0B' : borderColor}`,
                borderRadius: '8px',
                padding: '14px 18px',
                cursor: 'pointer'
              }}
              className="hover:border-amber-400 transition"
            >
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-500">
                MENUNGGU PENANGANAN
              </div>
              <div className="text-2xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
                {complaintStats.pending}
              </div>
            </div>

            <div
              onClick={() => setComplaintFilter('in_progress')}
              style={{
                background: complaintFilter === 'in_progress' ? (isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF') : cardBg,
                border: `1px solid ${complaintFilter === 'in_progress' ? '#3B82F6' : borderColor}`,
                borderRadius: '8px',
                padding: '14px 18px',
                cursor: 'pointer'
              }}
              className="hover:border-blue-400 transition"
            >
              <div className="text-[11px] font-mono uppercase tracking-wider text-blue-500">
                SEDANG DITANGANI
              </div>
              <div className="text-2xl font-bold font-mono mt-1 text-blue-600 dark:text-blue-400">
                {complaintStats.inProgress}
              </div>
            </div>

            <div
              onClick={() => setComplaintFilter('resolved')}
              style={{
                background: complaintFilter === 'resolved' ? (isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5') : cardBg,
                border: `1px solid ${complaintFilter === 'resolved' ? '#10B981' : borderColor}`,
                borderRadius: '8px',
                padding: '14px 18px',
                cursor: 'pointer'
              }}
              className="hover:border-emerald-400 transition"
            >
              <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-500">
                SELESAI (RESOLVED)
              </div>
              <div className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                {complaintStats.resolved}
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div
            style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px' }}
            className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3"
          >
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              {[
                { id: 'all', label: 'Semua Laporan' },
                { id: 'pending', label: 'Menunggu' },
                { id: 'in_progress', label: 'Sedang Ditangani' },
                { id: 'resolved', label: 'Selesai' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setComplaintFilter(f.id)}
                  style={{
                    background: complaintFilter === f.id ? textPrimary : 'transparent',
                    color: complaintFilter === f.id ? (isDark ? '#111111' : '#FFFFFF') : textSecondary,
                    border: `1px solid ${complaintFilter === f.id ? textPrimary : borderColor}`,
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input & Refresh */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs" />
                <input
                  type="text"
                  placeholder="Cari keluhan, pelapor..."
                  value={complaintSearch}
                  onChange={(e) => setComplaintSearch(e.target.value)}
                  style={{
                    background: isDark ? '#111111' : '#F9F9F8',
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    borderRadius: '6px',
                    fontSize: '12px',
                    padding: '6px 12px 6px 30px',
                    width: '100%',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                onClick={fetchComplaints}
                disabled={complaintsLoading}
                style={{
                  background: 'transparent',
                  color: textPrimary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Muat Ulang Data Komplain"
              >
                <FontAwesomeIcon icon={faRotateRight} className={`text-xs ${complaintsLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Table / List Container */}
          <div
            style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px' }}
            className="overflow-hidden shadow-2xs"
          >
            {filteredComplaints.length === 0 ? (
              <div className="p-12 text-center">
                <FontAwesomeIcon icon={faCheckDouble} className="text-neutral-300 dark:text-neutral-700 text-3xl mb-3" />
                <div className="font-semibold text-sm" style={{ color: textPrimary }}>
                  Tidak Ada Laporan Komplain
                </div>
                <div className="text-xs mt-1" style={{ color: textSecondary }}>
                  {complaintSearch.trim() || complaintFilter !== 'all'
                    ? 'Tidak ditemukan laporan yang cocok dengan filter atau kata kunci pencarian.'
                    : 'Belum ada keluhan masuk dari QR General.'}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr style={{ background: isDark ? '#121214' : '#FAFAFA', borderBottom: `1px solid ${borderColor}` }} className="font-mono text-[11px] text-neutral-400 uppercase">
                      <th className="py-3 px-4 font-semibold">SUMBER / LOKASI</th>
                      <th className="py-3 px-4 font-semibold">KELUHAN / LAPORAN</th>
                      <th className="py-3 px-4 font-semibold">NAMA PELAPOR</th>
                      <th className="py-3 px-4 font-semibold">STATUS</th>
                      <th className="py-3 px-4 font-semibold">PENANGANAN CLEANER</th>
                      <th className="py-3 px-4 font-semibold text-center">BUKTI FOTO</th>
                      <th className="py-3 px-4 font-semibold text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {filteredComplaints.map(item => {
                      const isResolved = item.status === 'resolved'
                      const isInProgress = item.status === 'in_progress'

                      return (
                        <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold" style={{ color: textPrimary }}>{item.room_name}</div>
                            <div className="text-[10px] font-mono text-neutral-400 mt-0.5">{item.room_token || 'QR General'}</div>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-medium text-xs leading-relaxed" style={{ color: textPrimary }}>
                              {item.issue_description}
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-1">
                              ID: #{item.id} • {formatWibTime(item.created_at)}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold" style={{ color: textPrimary }}>{item.reporter_name || 'Anonim'}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            {isResolved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" />
                                Selesai
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                                Ditangani
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-[9px]" />
                                Menunggu
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {isResolved ? (
                              <div>
                                <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {item.resolved_by_name || 'Petugas Cleaning'}
                                </div>
                                {item.resolution_notes && (
                                  <div className="text-[11px] text-neutral-500 italic mt-0.5 line-clamp-1">
                                    &quot;{item.resolution_notes}&quot;
                                  </div>
                                )}
                                {item.resolved_at && (
                                  <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                                    {formatWibTime(item.resolved_at)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-400 italic">Belum ditangani</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.photo_file ? (
                                <button
                                  type="button"
                                  onClick={() => setZoomImage({
                                    url: `/api/vendor-checklist/facility-reports/${item.id}/photo?type=issue`,
                                    title: `Foto Keluhan Pelapor`
                                  })}
                                  className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 font-mono text-[10px] font-semibold transition cursor-pointer"
                                  title="Lihat Foto Kendala"
                                >
                                  Kendala
                                </button>
                              ) : (
                                <span className="text-[10px] text-neutral-400 font-mono">Tanpa Foto</span>
                              )}
                              {item.resolution_photo_file && (
                                <button
                                  type="button"
                                  onClick={() => setZoomImage({
                                    url: `/api/vendor-checklist/facility-reports/${item.id}/photo?type=resolution`,
                                    title: `Bukti Penyelesaian`
                                  })}
                                  className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold transition cursor-pointer"
                                  title="Lihat Bukti Selesai"
                                >
                                  Selesai
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedComplaint(item)
                                setSupervisorNoteInput(item.resolution_notes || '')
                                setComplaintModalOpen(true)
                              }}
                              style={{
                                background: textPrimary,
                                color: isDark ? '#111111' : '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '5px 12px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                              Detail
                            </button>
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

      {/* ── MODAL: ATUR PETUGAS CLEANER PER RUANGAN (MISAL COMPUTER LAB -> SIAPA SAJA YANG MEMBERSIHKAN) ── */}
      <Modal
        isOpen={Boolean(editingRoomModal)}
        onClose={() => setEditingRoomModal(null)}
        title={`Atur Petugas Cleaning: ${editingRoomModal?.room_name || ''}`}
        size="md"
      >
        {editingRoomModal && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b" style={{ borderColor }}>
              <p style={{ color: textSecondary }}>
                Pilih siapa yang membersihkan ruangan <strong>{editingRoomModal.room_name}</strong> (bisa 1 orang atau lebih dari 1):
              </p>
              {draftRoomCleaners.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraftRoomCleaners([])}
                  className="px-2 py-1 rounded border text-[11px] font-mono cursor-pointer hover:opacity-80 shrink-0"
                  style={{ borderColor, color: textSecondary }}
                >
                  Kosongkan
                </button>
              )}
            </div>

            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs" />
              <input
                type="text"
                value={cleanerModalSearch}
                onChange={(e) => setCleanerModalSearch(e.target.value)}
                placeholder="Cari nama petugas cleaning..."
                className="w-full pl-8 pr-3 py-1.5 rounded border text-xs outline-none"
                style={{ background: cardBg, borderColor, color: textPrimary }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
              {cleaners
                .filter(c => !cleanerModalSearch.trim() || (c.full_name || '').toLowerCase().includes(cleanerModalSearch.toLowerCase()))
                .map(c => {
                  const isChecked = draftRoomCleaners.includes(Number(c.user_id))
                  return (
                    <label
                      key={c.user_id}
                      onClick={() => toggleDraftCleaner(c.user_id)}
                      style={{
                        background: isChecked
                          ? (isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF')
                          : (isDark ? '#141416' : '#F9FAFB'),
                        borderColor: isChecked ? '#3B82F6' : borderColor,
                        color: textPrimary
                      }}
                      className="p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer transition select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-blue-600 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs truncate">{c.full_name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          ID #{c.user_id}
                        </div>
                      </div>
                    </label>
                  )
                })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor }}>
              <span className="font-mono text-xs" style={{ color: textSecondary }}>
                Terpilih: <strong style={{ color: textPrimary }}>{draftRoomCleaners.length} Petugas</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoomModal(null)}
                  style={{
                    background: 'transparent',
                    color: textSecondary,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '7px 14px',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoomCleaners}
                  disabled={savingRoomId === editingRoomModal.room_id}
                  style={{
                    background: textPrimary,
                    color: isDark ? '#111111' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '7px 16px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FontAwesomeIcon icon={faSave} />
                  <span>{savingRoomId === editingRoomModal.room_id ? 'Menyimpan...' : 'Simpan Petugas'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: GENERAL QR PELAPOR ── */}
      <Modal
        isOpen={generalQrModalOpen}
        onClose={() => setGeneralQrModalOpen(false)}
        title="QR Code General — Khusus Pelapor"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg border text-xs" style={{ background: isDark ? '#141416' : '#F8FAFC', borderColor }}>
            <div className="font-semibold mb-1.5" style={{ color: textPrimary }}>
              URL Tujuan Saat Pelapor Scan QR:
            </div>
            <input
              type="text"
              value={targetReportUrl}
              onChange={(e) => setTargetReportUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none"
              style={{ background: cardBg, borderColor, color: textPrimary }}
            />
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetReportUrl('https://ccs.sch.id/reportfacility')}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border hover:opacity-80 cursor-pointer"
                  style={{ borderColor, color: textSecondary }}
                >
                  https://ccs.sch.id/reportfacility
                </button>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px]" style={{ color: textSecondary }}>Lembar:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={printCopies}
                  onChange={(e) => setPrintCopies(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="w-14 px-2 py-1 text-xs font-mono rounded border text-center"
                  style={{ background: cardBg, borderColor, color: textPrimary }}
                />
              </div>
            </div>
          </div>

          <GeneralReporterStickerCard
            qrUrl={generalQrDataUrl}
            targetUrl={targetReportUrl}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t" style={{ borderColor }}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(targetReportUrl)
                  setCopiedQrUrl(true)
                  setTimeout(() => setCopiedQrUrl(false), 2000)
                }}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={copiedQrUrl ? faCheck : faCopy} className={copiedQrUrl ? 'text-emerald-600' : 'text-neutral-400'} />
                <span>{copiedQrUrl ? 'Tersalin' : 'Salin URL'}</span>
              </button>

              <a
                href={targetReportUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  color: isDark ? '#60A5FA' : '#0284C7',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none'
                }}
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
                <span>Buka Web CCS</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setGeneratingPdf(true)
                    await generateGeneralReporterPDF({ targetUrl: targetReportUrl, copies: printCopies, action: 'download' })
                  } finally {
                    setGeneratingPdf(false)
                  }
                }}
                disabled={generatingPdf}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={faFilePdf} style={{ color: '#DC2626' }} />
                <span>Unduh PDF</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    setGeneratingPdf(true)
                    await generateGeneralReporterPDF({ targetUrl: targetReportUrl, copies: printCopies, action: 'print' })
                  } finally {
                    setGeneratingPdf(false)
                  }
                }}
                disabled={generatingPdf}
                style={{
                  background: textPrimary,
                  color: isDark ? '#111111' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={generatingPdf ? faSpinner : faPrint} className={generatingPdf ? 'animate-spin' : ''} />
                <span>Cetak PDF ({printCopies} Lembar)</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: INSPEKSI CHECKLIST ── */}
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
                <span className="text-neutral-400 block text-[10px]">JADWAL PIC:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {activeItem.assigned_cleaners && activeItem.assigned_cleaners.length > 0
                    ? activeItem.assigned_cleaners.map(c => c.full_name).join(', ')
                    : '—'}
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
                HASIL PEMERIKSAAN FOTO KAMERA (BEFORE &amp; AFTER)
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

      {/* ── MODAL: DETAIL & INSPEKSI KOMPLAIN FASILITAS ── */}
      <Modal
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
        title={`Inspeksi Komplain: ${selectedComplaint?.room_name || ''}`}
        size="lg"
      >
        {selectedComplaint && (
          <div className="space-y-4 text-xs">
            {/* Meta Strip */}
            <div
              style={{ background: isDark ? '#141416' : '#F9F9F8', border: `1px solid ${borderColor}`, borderRadius: '6px' }}
              className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]"
            >
              <div>
                <span className="text-neutral-400 block text-[10px]">PELAPOR:</span>
                <span className="font-bold">{selectedComplaint.reporter_name || 'Anonim'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">WAKTU LAPOR:</span>
                <span>{formatWibTime(selectedComplaint.created_at)}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">STATUS:</span>
                <span className="font-bold uppercase tracking-wider">
                  {selectedComplaint.status === 'resolved' ? 'SELESAI' : selectedComplaint.status === 'in_progress' ? 'SEDANG DITANGANI' : 'MENUNGGU'}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">PETUGAS CLEANING:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedComplaint.resolved_by_name || '—'}
                </span>
              </div>
            </div>

            {/* Issue Description Box */}
            <div style={{ background: isDark ? '#141416' : '#FEF8EE', border: `1px solid ${borderColor}`, borderRadius: '6px' }} className="p-3">
              <span className="font-bold text-amber-600 font-mono text-[10px]">DESKRIPSI KELUHAN / KERUSAKAN:</span>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: textPrimary }}>
                {selectedComplaint.issue_description}
              </p>
            </div>

            {/* SIDE-BY-SIDE PHOTO COMPARISON */}
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                HASIL PEMERIKSAAN FOTO (OPSIONAL PELAPOR vs BUKTI PENYELESAIAN CLEANER)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Foto Kendala */}
                <div className="space-y-1">
                  <div className="font-mono text-[11px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
                    <span>1. FOTO KENDALA (PELAPOR)</span>
                    <span className="text-[10px] text-neutral-400">Klik zoom</span>
                  </div>
                  <div
                    onClick={() => {
                      if (selectedComplaint.photo_file) {
                        setZoomImage({
                          url: `/api/vendor-checklist/facility-reports/${selectedComplaint.id}/photo?type=issue`,
                          title: `Foto Kendala Pelapor`
                        })
                      }
                    }}
                    className="rounded overflow-hidden bg-black aspect-4/3 cursor-pointer border border-neutral-700 relative group"
                  >
                    {selectedComplaint.photo_file ? (
                      <img
                        src={`/api/vendor-checklist/facility-reports/${selectedComplaint.id}/photo?type=issue`}
                        alt="Foto Kendala"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-500 font-mono text-xs">
                        Pelapor tidak melampirkan foto
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Foto Penyelesaian */}
                <div className="space-y-1">
                  <div className="font-mono text-[11px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
                    <span>2. BUKTI PENYELESAIAN (CLEANER)</span>
                    <span className="text-[10px] text-neutral-400">Klik zoom</span>
                  </div>
                  <div
                    onClick={() => {
                      if (selectedComplaint.resolution_photo_file) {
                        setZoomImage({
                          url: `/api/vendor-checklist/facility-reports/${selectedComplaint.id}/photo?type=resolution`,
                          title: `Bukti Penyelesaian`
                        })
                      }
                    }}
                    className="rounded overflow-hidden bg-black aspect-4/3 cursor-pointer border border-neutral-700 relative group"
                  >
                    {selectedComplaint.resolution_photo_file ? (
                      <img
                        src={`/api/vendor-checklist/facility-reports/${selectedComplaint.id}/photo?type=resolution`}
                        alt="Bukti Selesai"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-500 font-mono text-xs">
                        Belum ada bukti selesai
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Resolution Notes Box */}
            {selectedComplaint.resolution_notes && (
              <div style={{ background: isDark ? '#141416' : '#ECFDF5', border: `1px solid ${borderColor}`, borderRadius: '6px' }} className="p-3">
                <span className="font-bold text-emerald-600 font-mono text-[10px]">CATATAN PENANGANAN CLEANER:</span>
                <p className="mt-0.5 text-xs text-neutral-700 dark:text-neutral-300">{selectedComplaint.resolution_notes}</p>
              </div>
            )}

            {/* Supervisor Action Box */}
            {isSupervisor && (
              <div style={{ background: isDark ? '#141416' : '#F9F9F8', border: `1px solid ${borderColor}`, borderRadius: '6px' }} className="p-3 space-y-2">
                <div className="font-bold text-[11px]" style={{ color: textPrimary }}>
                  Tindakan Supervisor:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedComplaint.status !== 'resolved' && (
                    <button
                      type="button"
                      disabled={complaintActionLoading}
                      onClick={() => handleUpdateComplaintStatus(selectedComplaint.id, 'resolved')}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />
                      Tandai Selesai (Resolve)
                    </button>
                  )}

                  {selectedComplaint.status === 'pending' && (
                    <button
                      type="button"
                      disabled={complaintActionLoading}
                      onClick={() => handleUpdateComplaintStatus(selectedComplaint.id, 'in_progress')}
                      className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faClock} className="mr-1.5" />
                      Tandai Sedang Ditangani
                    </button>
                  )}

                  {selectedComplaint.status === 'resolved' && (
                    <button
                      type="button"
                      disabled={complaintActionLoading}
                      onClick={() => handleUpdateComplaintStatus(selectedComplaint.id, 'pending')}
                      className="px-3 py-1.5 rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 text-neutral-800 dark:text-neutral-200 font-semibold text-xs transition cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faRotateRight} className="mr-1.5" />
                      Buka Kembali Komplain (Re-open)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  )
}
