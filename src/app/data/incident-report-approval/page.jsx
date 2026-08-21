'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClipboardCheck,
  faSearch,
  faFilter,
  faClock,
  faBuilding,
  faEye,
  faSpinner,
  faCheckCircle,
  faHourglassHalf,
  faExclamationTriangle,
  faSliders,
  faUser,
  faCalendar,
  faPlus,
  faPaperclip,
  faImage,
  faTrash,
  faVideo,
  faFilm,
  faCheckDouble,
  faTimesCircle,
  faInfoCircle,
  faListCheck,
  faShieldAlt,
  faLocationDot,
  faArrowRight,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons'

export default function IncidentHandlingApprovalPage() {
  const router = useRouter()
  const { theme, isDark } = useTheme()
  const { t } = useI18n()

  // Main Page Tabs: 'incidents' | 'cctv'
  const [activeTab, setActiveTab] = useState('incidents')

  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [units, setUnits] = useState([])
  const [allUnits, setAllUnits] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [userRoleData, setUserRoleData] = useState(null)

  // Incident Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnitFilter, setSelectedUnitFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')

  // Notification Toast
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })

  // Solution Handling Modal State for Incidents
  const [showHandlingModal, setShowHandlingModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [followups, setFollowups] = useState([])
  const [loadingFollowups, setLoadingFollowups] = useState(false)

  // CCTV Requests State
  const [cctvRequests, setCctvRequests] = useState([])
  const [loadingCctv, setLoadingCctv] = useState(false)
  const [cctvSearchQuery, setCctvSearchQuery] = useState('')
  const [cctvUnitFilter, setCctvUnitFilter] = useState('all')
  const [cctvStatusFilter, setCctvStatusFilter] = useState('all')

  // CCTV Handling Modal State for Principal / Admin
  const [showCctvModal, setShowCctvModal] = useState(false)
  const [selectedCctv, setSelectedCctv] = useState(null)
  const [cctvForm, setCctvForm] = useState({
    status: 'approved',
    reviewer_notes: ''
  })
  const [submittingCctv, setSubmittingCctv] = useState(false)

  // Follow-up Form State
  const getTodayDate = () => new Date().toISOString().split('T')[0]
  const getCurrentTime = () => {
    const d = new Date()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const [followupForm, setFollowupForm] = useState({
    followup_date: getTodayDate(),
    followup_time: getCurrentTime(),
    location: '',
    action_details: '',
    resulting_status: 'on_progress'
  })
  const [submittingFollowup, setSubmittingFollowup] = useState(false)

  // Image Attachment States
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)

  // Delete Incident State & Permission
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState(null)
  const [deletingReport, setDeletingReport] = useState(false)

  const isAdmin = useMemo(() => {
    return Boolean(
      userRoleData?.role?.is_admin || 
      currentUser?.isAdmin || 
      currentUser?.is_admin ||
      (userRoleData?.role?.role_name || currentUser?.roleName || '').toLowerCase().includes('admin')
    )
  }, [userRoleData, currentUser])

  const isPastoralCare = useMemo(() => {
    return Boolean(
      userRoleData?.role?.is_pastoral_care ||
      userRoleData?.role?.is_counselor ||
      currentUser?.isPastoralCare ||
      currentUser?.is_pastoral_care ||
      currentUser?.isCounselor ||
      currentUser?.is_counselor ||
      (userRoleData?.role?.role_name || currentUser?.roleName || '').toLowerCase().includes('pastoral') ||
      (userRoleData?.role?.role_name || currentUser?.roleName || '').toLowerCase().includes('counselor') ||
      (userRoleData?.role?.role_name || currentUser?.roleName || '').toLowerCase().includes('bk')
    )
  }, [userRoleData, currentUser])

  const isPrincipal = useMemo(() => {
    return Boolean(
      userRoleData?.role?.is_principal || 
      currentUser?.isPrincipal || 
      currentUser?.is_principal ||
      (userRoleData?.role?.role_name || currentUser?.roleName || '').toLowerCase().includes('principal') ||
      (userRoleData?.role?.role_name || currentUser?.roleName || '').toLowerCase().includes('kepala sekolah')
    )
  }, [userRoleData, currentUser])

  const userUnitId = useMemo(() => {
    return userRoleData?.user_unit_id || currentUser?.user_unit_id || currentUser?.unitID || currentUser?.unit_id || null
  }, [userRoleData, currentUser])

  // A Principal who is not a SuperAdmin is unit-scoped to their own school unit
  const isUnitScopedPrincipal = useMemo(() => {
    return isPrincipal && !isAdmin
  }, [isPrincipal, isAdmin])

  const canDelete = useMemo(() => {
    return Boolean(
      isAdmin || 
      isPastoralCare
    )
  }, [isAdmin, isPastoralCare])

  const handlePromptDelete = (report) => {
    if (!canDelete) return
    setReportToDelete(report)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!canDelete || !reportToDelete) return
    try {
      setDeletingReport(true)

      // 1. Delete linked followups
      const { error: fErr } = await supabase
        .from('incident_followups')
        .delete()
        .eq('incident_id', reportToDelete.id)
      if (fErr) console.warn('Error deleting incident followups:', fErr)

      // 2. Clear incident_report_id on linked CCTV requests
      await supabase
        .from('cctv_footage_requests')
        .update({ incident_report_id: null })
        .eq('incident_report_id', reportToDelete.id)

      // 3. Delete incident report
      const { error: incErr } = await supabase
        .from('incident_reports')
        .delete()
        .eq('id', reportToDelete.id)

      if (incErr) throw incErr

      setNotif({
        isOpen: true,
        title: 'Successfully Deleted',
        message: `Incident report "${reportToDelete.incident_number || reportToDelete.title}" has been permanently deleted.`,
        type: 'success'
      })

      setShowDeleteModal(false)
      setReportToDelete(null)
      fetchData()
    } catch (err) {
      console.error('Failed to delete incident report:', err)
      setNotif({
        isOpen: true,
        title: 'Delete Failed',
        message: err.message || 'An error occurred while deleting the incident report.',
        type: 'error'
      })
    } finally {
      setDeletingReport(false)
    }
  }

  const isAuthorizedForCctv = useMemo(() => {
    if (!currentUser && !userRoleData) return false
    return isAdmin || isPrincipal
  }, [currentUser, userRoleData, isAdmin, isPrincipal])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setNotif({ isOpen: true, title: 'Invalid File', message: 'Attachment must be an image (PNG, JPG, WEBP)', type: 'error' })
      return
    }
    setSelectedFile(file)
    setFilePreview(URL.createObjectURL(file))
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview('')
  }

  const uploadAttachment = async () => {
    if (!selectedFile) return null
    try {
      setUploadingFile(true)
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `followup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `followups/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('incident_attachments')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('incident_attachments')
        .getPublicUrl(filePath)

      return publicUrlData?.publicUrl || null
    } catch (err) {
      console.error('Failed to upload attachment:', err)
      throw err
    } finally {
      setUploadingFile(false)
    }
  }

  // Load User Data & Permissions
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('user_data')
      const krId = typeof window !== 'undefined' ? localStorage.getItem('kr_id') : null
      if (rawUser) {
        const u = JSON.parse(rawUser)
        const parsedId = u.userID || u.user_id || u.id || (krId ? parseInt(krId, 10) : null)
        const parsedUnitId = u.unitID || u.user_unit_id || u.unit_id || null
        const normalized = {
          ...u,
          id: parsedId,
          user_id: parsedId,
          userID: parsedId,
          unit_id: parsedUnitId,
          unitID: parsedUnitId,
          user_unit_id: parsedUnitId,
          role_name: u.roleName || u.role_name || '',
          roleName: u.roleName || u.role_name || '',
          isAdmin: u.isAdmin ?? u.is_admin ?? false,
          is_admin: u.isAdmin ?? u.is_admin ?? false,
          isPrincipal: u.isPrincipal ?? u.is_principal ?? false,
          is_principal: u.isPrincipal ?? u.is_principal ?? false,
          isCounselor: u.isCounselor ?? u.is_counselor ?? false,
          is_counselor: u.isCounselor ?? u.is_counselor ?? false,
          isPastoralCare: u.isPastoralCare ?? u.is_pastoral_care ?? false,
          is_pastoral_care: u.isPastoralCare ?? u.is_pastoral_care ?? false,
          user_nama_depan: u.user_nama_depan || u.namaDepan || u.username || '',
          user_nama_belakang: u.user_nama_belakang || u.namaBelakang || '',
        }
        setCurrentUser(normalized)
      } else if (krId) {
        const parsedId = parseInt(krId, 10)
        setCurrentUser({
          id: parsedId,
          user_id: parsedId,
          userID: parsedId,
          roleName: localStorage.getItem('user_role') || '',
          role_name: localStorage.getItem('user_role') || '',
        })
      }
    } catch (e) {
      console.error('Failed to parse user_data:', e)
    }
  }, [])

  useEffect(() => {
    const uid = currentUser?.id || currentUser?.user_id || currentUser?.userID || (typeof window !== 'undefined' ? localStorage.getItem('kr_id') : null)
    if (uid) {
      supabase
        .from('users')
        .select('user_id, user_unit_id, user_role_id, role:role!user_role_id(role_id, role_name, is_admin, is_principal, is_counselor, is_pastoral_care)')
        .eq('user_id', uid)
        .single()
        .then(({ data }) => {
          if (data) setUserRoleData(data)
        })
    }
  }, [currentUser])

  // Automatically lock / set unit filter when user is a unit-scoped principal
  useEffect(() => {
    if (isUnitScopedPrincipal && userUnitId) {
      setSelectedUnitFilter(String(userUnitId))
      setCctvUnitFilter(String(userUnitId))
    }
  }, [isUnitScopedPrincipal, userUnitId])

  // Fetch Incident Reports Queue
  const fetchData = async () => {
    try {
      setLoading(true)
      const [reportsRes, unitsRes] = await Promise.all([
        supabase
          .from('incident_reports')
          .select(`
            id,
            incident_number,
            title,
            student_user_id,
            reporter_user_id,
            unit_id,
            incident_date,
            incident_time,
            incident_record,
            place_of_incident,
            description,
            action_taken,
            status,
            created_at,
            student:users!student_user_id (user_id, user_nama_depan, user_nama_belakang),
            reporter:users!reporter_user_id (user_id, user_nama_depan, user_nama_belakang),
            unit:unit!unit_id (unit_id, unit_name)
          `)
          .order('incident_date', { ascending: false })
          .order('incident_time', { ascending: false }),
        supabase
          .from('unit')
          .select('unit_id, unit_name, is_school')
          .order('unit_name')
      ])

      if (reportsRes.error) throw reportsRes.error
      if (unitsRes.error) throw unitsRes.error

      const rawUnits = unitsRes.data || []
      setReports(reportsRes.data || [])
      setAllUnits(rawUnits)
      setUnits(rawUnits.filter(u => u.is_school === true))
    } catch (err) {
      console.error('Error fetching incident approval reports:', err)
      setNotif({ isOpen: true, title: 'Fetch Error', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Fetch CCTV Footage Requests Queue
  const fetchCctvData = async () => {
    try {
      setLoadingCctv(true)
      const { data, error } = await supabase
        .from('cctv_footage_requests')
        .select(`
          id,
          request_number,
          requester_user_id,
          cctv_date,
          start_time,
          end_time,
          room_name,
          reason,
          incident_report_id,
          status,
          reviewer_notes,
          created_at,
          updated_at,
          requester:users!requester_user_id (user_id, user_nama_depan, user_nama_belakang, user_email, user_unit_id),
          incident:incident_reports!incident_report_id (id, incident_number, title, incident_date)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCctvRequests(data || [])
    } catch (err) {
      console.error('Error fetching CCTV footage requests:', err)
    } finally {
      setLoadingCctv(false)
    }
  }

  useEffect(() => {
    fetchData()
    if (isAuthorizedForCctv) {
      fetchCctvData()
    }
  }, [userRoleData, currentUser, isAuthorizedForCctv])

  // Available units for dropdown
  const availableUnits = useMemo(() => {
    if (isUnitScopedPrincipal && userUnitId) {
      const matched = units.filter(u => String(u.unit_id) === String(userUnitId))
      return matched.length > 0 ? matched : units
    }
    return units
  }, [units, isUnitScopedPrincipal, userUnitId])

  // Scoped Incident Reports (filtered strictly by unit if unit-scoped principal)
  const scopedReports = useMemo(() => {
    if (isUnitScopedPrincipal && userUnitId) {
      return reports.filter(r => String(r.unit_id) === String(userUnitId))
    }
    return reports
  }, [reports, isUnitScopedPrincipal, userUnitId])

  // Summary Metrics for Incidents
  const metrics = useMemo(() => {
    let waiting = 0
    let onProgress = 0
    let completed = 0

    scopedReports.forEach(r => {
      if (r.status === 'waiting') waiting++
      else if (r.status === 'on_progress' || r.status === 'in_progress') onProgress++
      else if (r.status === 'completed') completed++
    })

    return { total: scopedReports.length, waiting, onProgress, completed }
  }, [scopedReports])

  // Scoped CCTV Requests (filtered strictly by unit if unit-scoped principal)
  const scopedCctvRequests = useMemo(() => {
    if (isUnitScopedPrincipal && userUnitId) {
      return cctvRequests.filter(r => String(r.requester?.user_unit_id) === String(userUnitId))
    }
    return cctvRequests
  }, [cctvRequests, isUnitScopedPrincipal, userUnitId])

  // Summary Metrics for CCTV Requests
  const cctvMetrics = useMemo(() => {
    let pending = 0
    let approved = 0
    let inProgress = 0
    let completed = 0
    let rejected = 0

    scopedCctvRequests.forEach(r => {
      const st = (r.status || 'pending').toLowerCase()
      if (st === 'pending') pending++
      else if (st === 'approved') approved++
      else if (st === 'in_progress') inProgress++
      else if (st === 'completed') completed++
      else if (st === 'rejected') rejected++
    })

    return { total: scopedCctvRequests.length, pending, approved, inProgress, completed, rejected }
  }, [scopedCctvRequests])

  // Filtered Incident Reports
  const filteredReports = useMemo(() => {
    return scopedReports.filter(r => {
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'on_progress' || selectedStatusFilter === 'in_progress') {
          if (r.status !== 'on_progress' && r.status !== 'in_progress') return false
        } else if (r.status !== selectedStatusFilter) {
          return false
        }
      }
      if (!isUnitScopedPrincipal && selectedUnitFilter !== 'all' && String(r.unit_id) !== selectedUnitFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = (r.title || '').toLowerCase().includes(q)
        const recordMatch = (r.incident_record || '').toLowerCase().includes(q)
        const studentName = `${r.student?.user_nama_depan || ''} ${r.student?.user_nama_belakang || ''}`.toLowerCase()
        const reporterName = `${r.reporter?.user_nama_depan || ''} ${r.reporter?.user_nama_belakang || ''}`.toLowerCase()
        const incNumMatch = (r.incident_number || '').toLowerCase().includes(q)
        return titleMatch || recordMatch || studentName || reporterName || incNumMatch
      }
      return true
    })
  }, [scopedReports, selectedStatusFilter, selectedUnitFilter, searchQuery, isUnitScopedPrincipal])

  // Filtered CCTV Requests
  const filteredCctvRequests = useMemo(() => {
    return scopedCctvRequests.filter(r => {
      if (cctvStatusFilter !== 'all' && r.status !== cctvStatusFilter) return false
      if (!isUnitScopedPrincipal && cctvUnitFilter !== 'all' && String(r.requester?.user_unit_id) !== cctvUnitFilter) return false
      if (cctvSearchQuery.trim()) {
        const q = cctvSearchQuery.toLowerCase()
        const codeMatch = (r.request_number || '').toLowerCase().includes(q)
        const roomMatch = (r.room_name || '').toLowerCase().includes(q)
        const reasonMatch = (r.reason || '').toLowerCase().includes(q)
        const reqName = `${r.requester?.user_nama_depan || ''} ${r.requester?.user_nama_belakang || ''}`.toLowerCase()
        return codeMatch || roomMatch || reasonMatch || reqName.includes(q)
      }
      return true
    })
  }, [scopedCctvRequests, cctvStatusFilter, cctvUnitFilter, cctvSearchQuery, isUnitScopedPrincipal])

  // Minimalist Spot Pastel Status Badges
  const getLevelBadge = (level) => {
    switch (level) {
      case 'Level 1':
        return <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider bg-[#FBF3DB] text-[#956400] border border-[#F5E6B3]">Level 1</span>
      case 'Level 2':
        return <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]">Level 2</span>
      case 'Level 3':
        return <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider bg-[#FDF0E1] text-[#A25A1E] border border-[#F8DCB8]">Level 3</span>
      case 'Zero Tolerance':
        return <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider bg-[#FDEBEC] text-[#9F2F2D] border border-[#F8C9CC]">Zero Tolerance</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider" style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>{level || 'Level 1'}</span>
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider bg-[#FBF3DB] text-[#956400] border border-[#F5E6B3]"><FontAwesomeIcon icon={faClock} className="text-[9px]" /> Waiting</span>
      case 'on_progress':
      case 'in_progress':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]"><FontAwesomeIcon icon={faHourglassHalf} className="text-[9px]" /> In Progress</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]"><FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" /> Completed</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider" style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>{status}</span>
    }
  }

  const getCctvStatusBadge = (status) => {
    switch ((status || 'pending').toLowerCase()) {
      case 'pending':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider bg-[#FBF3DB] text-[#956400] border border-[#F5E6B3]"><FontAwesomeIcon icon={faClock} className="text-[9px]" /> Pending</span>
      case 'approved':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]"><FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" /> Approved</span>
      case 'in_progress':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]"><FontAwesomeIcon icon={faHourglassHalf} className="text-[9px]" /> In Progress</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]"><FontAwesomeIcon icon={faCheckDouble} className="text-[9px]" /> Completed</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider bg-[#FDEBEC] text-[#9F2F2D] border border-[#F8C9CC]"><FontAwesomeIcon icon={faTimesCircle} className="text-[9px]" /> Rejected</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider" style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>{status}</span>
    }
  }

  // Open Solution Handling Modal & Load Followups
  const handleOpenHandlingModal = async (report) => {
    setSelectedReport(report)
    setShowHandlingModal(true)
    setFollowupForm({
      followup_date: getTodayDate(),
      followup_time: getCurrentTime(),
      location: '',
      action_details: '',
      resulting_status: report.status === 'waiting' ? 'on_progress' : report.status
    })
    setSelectedFile(null)
    setFilePreview('')

    try {
      setLoadingFollowups(true)
      const { data, error } = await supabase
        .from('incident_followups')
        .select(`
          id,
          incident_id,
          user_id,
          followup_date,
          followup_time,
          location,
          action_details,
          resulting_status,
          attachment_url,
          created_at,
          user:users!user_id (user_id, user_nama_depan, user_nama_belakang)
        `)
        .eq('incident_id', report.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setFollowups(data || [])
    } catch (err) {
      console.error('Error fetching followups:', err)
    } finally {
      setLoadingFollowups(false)
    }
  }

  // Open CCTV Handling Modal
  const handleOpenCctvModal = (cctv) => {
    setSelectedCctv(cctv)
    setCctvForm({
      status: cctv.status === 'pending' ? 'approved' : cctv.status,
      reviewer_notes: cctv.reviewer_notes || ''
    })
    setShowCctvModal(true)
  }

  // Handle Save Solution / Followup Action
  const handleSubmitFollowup = async (e) => {
    e.preventDefault()
    if (!selectedReport) return

    const userId = currentUser?.userID || currentUser?.user_id || currentUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('kr_id') : null)
    if (!userId) {
      setNotif({ isOpen: true, title: 'Authentication Error', message: 'Current user session expired. Please re-login.', type: 'error' })
      return
    }

    try {
      setSubmittingFollowup(true)

      let uploadedUrl = null
      if (selectedFile) {
        uploadedUrl = await uploadAttachment()
      }

      // 1. Insert into incident_followups
      const { data: insertedFollowup, error: followupErr } = await supabase
        .from('incident_followups')
        .insert({
          incident_id: selectedReport.id,
          user_id: parseInt(userId, 10),
          followup_date: followupForm.followup_date,
          followup_time: followupForm.followup_time,
          location: followupForm.location.trim() || null,
          action_details: followupForm.action_details.trim(),
          resulting_status: followupForm.resulting_status,
          attachment_url: uploadedUrl
        })
        .select(`
          id,
          incident_id,
          user_id,
          followup_date,
          followup_time,
          location,
          action_details,
          resulting_status,
          attachment_url,
          created_at,
          user:users!user_id (user_id, user_nama_depan, user_nama_belakang)
        `)
        .single()

      if (followupErr) throw followupErr

      // 2. Update status on parent incident_reports
      const { error: updateErr } = await supabase
        .from('incident_reports')
        .update({
          status: followupForm.resulting_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id)

      if (updateErr) throw updateErr

      // 3. Dispatch Email & Google Chat Notifications
      try {
        fetch('/api/notifications/incident-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'followup_added',
            incidentId: selectedReport.id,
            followupId: insertedFollowup.id,
            actionDetails: followupForm.action_details.trim(),
            location: followupForm.location.trim() || '-',
            followupDate: followupForm.followup_date,
            followupTime: followupForm.followup_time,
            resultingStatus: followupForm.resulting_status,
            attachmentUrl: uploadedUrl,
            handlerName: currentUser ? `${currentUser.user_nama_depan || currentUser.namaDepan || currentUser.userName || currentUser.username || ''} ${currentUser.user_nama_belakang || currentUser.namaBelakang || ''}`.trim() : 'Staff/Counselor'
          })
        }).catch(err => console.error('[Incident Notification Dispatch Error]:', err))
      } catch (notifErr) {
        console.warn('Failed to dispatch followup notification:', notifErr)
      }

      setFollowups(prev => [...prev, insertedFollowup])
      setSelectedReport(prev => ({ ...prev, status: followupForm.resulting_status }))

      setFollowupForm(prev => ({
        ...prev,
        location: '',
        action_details: ''
      }))
      setSelectedFile(null)
      setFilePreview('')

      setNotif({
        isOpen: true,
        title: 'Action Recorded',
        message: `Investigation update and resulting status [${followupForm.resulting_status.toUpperCase()}] logged successfully.`,
        type: 'success'
      })

      fetchData()
    } catch (err) {
      console.error('Error submitting followup:', err)
      setNotif({ isOpen: true, title: 'Submission Error', message: err.message || 'Failed to record followup action', type: 'error' })
    } finally {
      setSubmittingFollowup(false)
    }
  }

  // Handle Save CCTV Request Review / Approval (Principal / Admin)
  const handleSaveCctvHandling = async (e) => {
    e.preventDefault()
    if (!selectedCctv) return

    try {
      setSubmittingCctv(true)
      const payload = {
        status: cctvForm.status,
        reviewer_notes: cctvForm.reviewer_notes.trim() || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('cctv_footage_requests')
        .update(payload)
        .eq('id', selectedCctv.id)

      if (error) throw error

      // Trigger Email & Google Chat notifications for status update
      try {
        fetch('/api/notifications/cctv-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'status_updated',
            requestNumber: selectedCctv.request_number || `CCTV/#${selectedCctv.id}`,
            requesterUserId: selectedCctv.requester_user_id,
            requesterName: selectedCctv.requester ? `${selectedCctv.requester.user_nama_depan || ''} ${selectedCctv.requester.user_nama_belakang || ''}`.trim() : null,
            cctvDate: selectedCctv.cctv_date,
            startTime: selectedCctv.start_time,
            endTime: selectedCctv.end_time,
            roomName: selectedCctv.room_name,
            reason: selectedCctv.reason,
            status: cctvForm.status,
            reviewerNotes: cctvForm.reviewer_notes.trim() || null
          })
        }).catch(err => console.error('[CCTV Status Update Notification Error]:', err))
      } catch (notifErr) {
        console.warn('Failed to dispatch CCTV status update notification:', notifErr)
      }

      setShowCctvModal(false)
      setNotif({ isOpen: true, title: 'Status Updated', message: `CCTV Request #${selectedCctv.request_number || selectedCctv.id} updated to ${cctvForm.status.toUpperCase()} successfully.`, type: 'success' })
      fetchCctvData()
    } catch (err) {
      console.error('Error updating CCTV request status:', err)
      setNotif({ isOpen: true, title: 'Update Failed', message: err.message || 'Failed to update CCTV request', type: 'error' })
    } finally {
      setSubmittingCctv(false)
    }
  }

  return (
    <div 
      className="min-h-screen p-4 sm:p-8 space-y-6"
      style={{
        background: theme.pageBg,
        color: theme.textPrimary,
        fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif"
      }}
    >
      {/* Editorial Document Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b" style={{ borderColor: theme.border }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: theme.textSecondary }}>
            <span>[WORKSPACE]</span>
            <span>/</span>
            <span>[PASTORAL CARE]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: theme.blueText }}>[INCIDENT & CCTV APPROVAL]</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: theme.textPrimary, letterSpacing: '-0.02em' }}>
            Incident & CCTV Approval Queue
          </h1>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary, lineHeight: '1.6' }}>
            Review disciplinary cases, record investigation logs, assign corrective solutions, and approve CCTV footage requests across units.
          </p>
        </div>

        {/* Live Segmented Tabs */}
        <div className="flex items-center p-1 rounded border gap-1 self-start md:self-auto" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <button
            onClick={() => setActiveTab('incidents')}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer"
            style={{
              background: activeTab === 'incidents' ? (isDark ? '#232228' : theme.blueBg) : 'transparent',
              color: activeTab === 'incidents' ? (isDark ? '#F0EFE9' : theme.blueText) : theme.textSecondary,
              borderRadius: '4px'
            }}
          >
            <span className="font-mono text-[10px] opacity-60">01.</span>
            <span>Incident Queue</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border }}>
              {metrics.total}
            </span>
          </button>

          {isAuthorizedForCctv && (
            <button
              onClick={() => {
                setActiveTab('cctv')
                fetchCctvData()
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: activeTab === 'cctv' ? (isDark ? '#232228' : theme.blueBg) : 'transparent',
                color: activeTab === 'cctv' ? (isDark ? '#F0EFE9' : theme.blueText) : theme.textSecondary,
                borderRadius: '4px'
              }}
            >
              <span className="font-mono text-[10px] opacity-60">02.</span>
              <span>CCTV Requests</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border }}>
                {cctvMetrics.total}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Bento Metric Cards */}
      {activeTab === 'incidents' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>// TOTAL INCIDENTS</span>
            <div className="text-2xl font-bold font-mono tracking-tight" style={{ color: theme.textPrimary }}>{metrics.total}</div>
            <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>All recorded entries</span>
          </div>

          <div className="p-4 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1 text-[#956400]">// WAITING REVIEW</span>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#956400]">{metrics.waiting}</div>
            <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>Requires initial action</span>
          </div>

          <div className="p-4 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1 text-[#1F6C9F]">// IN PROGRESS</span>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1F6C9F]">{metrics.onProgress}</div>
            <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>Active investigations</span>
          </div>

          <div className="p-4 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1 text-[#346538]">// COMPLETED</span>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#346538]">{metrics.completed}</div>
            <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>Fully resolved cases</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>TOTAL REQUESTS</span>
            <div className="text-xl font-bold font-mono" style={{ color: theme.textPrimary }}>{cctvMetrics.total}</div>
          </div>
          <div className="p-3.5 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1 text-[#956400]">PENDING</span>
            <div className="text-xl font-bold font-mono text-[#956400]">{cctvMetrics.pending}</div>
          </div>
          <div className="p-3.5 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1 text-[#1F6C9F]">APPROVED</span>
            <div className="text-xl font-bold font-mono text-[#1F6C9F]">{cctvMetrics.approved}</div>
          </div>
          <div className="p-3.5 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1 text-[#346538]">COMPLETED</span>
            <div className="text-xl font-bold font-mono text-[#346538]">{cctvMetrics.completed}</div>
          </div>
          <div className="p-3.5 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1 text-[#9F2F2D]">REJECTED</span>
            <div className="text-xl font-bold font-mono text-[#9F2F2D]">{cctvMetrics.rejected}</div>
          </div>
        </div>
      )}

      {/* Filter Bento Toolbar */}
      <div className="p-3 rounded border flex flex-col md:flex-row items-center justify-between gap-3" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
        {activeTab === 'incidents' ? (
          <>
            <div className="relative w-full md:w-80">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search incident number, student, reporter..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 text-xs font-mono rounded border outline-none transition-colors"
                style={{
                  background: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                  borderRadius: '4px'
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase" style={{ color: theme.textSecondary }}>Unit:</span>
                <select
                  value={selectedUnitFilter}
                  disabled={isUnitScopedPrincipal}
                  onChange={e => setSelectedUnitFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer"
                  style={{ 
                    background: isUnitScopedPrincipal ? theme.subtleBg : theme.inputBg, 
                    borderColor: theme.border, 
                    color: theme.textPrimary, 
                    borderRadius: '4px',
                    opacity: isUnitScopedPrincipal ? 0.9 : 1
                  }}
                >
                  {!isUnitScopedPrincipal && <option value="all">All Units</option>}
                  {availableUnits.map(u => (
                    <option key={u.unit_id} value={String(u.unit_id)}>
                      {u.unit_name} {isUnitScopedPrincipal ? '(Your Unit)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase" style={{ color: theme.textSecondary }}>Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={e => setSelectedStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="waiting">Waiting</option>
                  <option value="on_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="relative w-full md:w-80">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search CCTV code, room, requester..."
                value={cctvSearchQuery}
                onChange={e => setCctvSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 text-xs font-mono rounded border outline-none transition-colors"
                style={{
                  background: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                  borderRadius: '4px'
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase" style={{ color: theme.textSecondary }}>Unit:</span>
                <select
                  value={cctvUnitFilter}
                  disabled={isUnitScopedPrincipal}
                  onChange={e => setCctvUnitFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer"
                  style={{ 
                    background: isUnitScopedPrincipal ? theme.subtleBg : theme.inputBg, 
                    borderColor: theme.border, 
                    color: theme.textPrimary, 
                    borderRadius: '4px',
                    opacity: isUnitScopedPrincipal ? 0.9 : 1
                  }}
                >
                  {!isUnitScopedPrincipal && <option value="all">All Units</option>}
                  {availableUnits.map(u => (
                    <option key={u.unit_id} value={String(u.unit_id)}>
                      {u.unit_name} {isUnitScopedPrincipal ? '(Your Unit)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase" style={{ color: theme.textSecondary }}>Status:</span>
                <select
                  value={cctvStatusFilter}
                  onChange={e => setCctvStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Register Table */}
      <div className="rounded border overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
        {activeTab === 'incidents' ? (
          loading ? (
            <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-2" />
              <p className="text-xs font-mono">LOADING QUEUE DATA...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
              <p className="text-xs font-mono">NO INCIDENTS MATCHING CRITERIA</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                    <th className="py-3 px-4">INCIDENT # / DATE</th>
                    <th className="py-3 px-4">STUDENT & UNIT</th>
                    <th className="py-3 px-4">TITLE & VENUE</th>
                    <th className="py-3 px-4">LEVEL</th>
                    <th className="py-3 px-4">REPORTER</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.border }}>
                  {filteredReports.map(r => {
                    const studentName = r.student ? `${r.student.user_nama_depan || ''} ${r.student.user_nama_belakang || ''}`.trim() : 'N/A'
                    const reporterName = r.reporter ? `${r.reporter.user_nama_depan || ''} ${r.reporter.user_nama_belakang || ''}`.trim() : 'Staff'
                    const unitName = r.unit?.unit_name || '-'

                    return (
                      <tr key={r.id} className="transition-colors" style={{ background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold" style={{ color: theme.textPrimary }}>{r.incident_number || `#${r.id}`}</div>
                          <div className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{r.incident_date} {r.incident_time}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold" style={{ color: theme.textPrimary }}>{studentName}</div>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border, color: theme.textSecondary }}>{unitName}</span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium truncate" style={{ color: theme.textPrimary }}>{r.title}</div>
                          <div className="text-[10px] font-mono truncate" style={{ color: theme.textSecondary }}>{r.place_of_incident || 'Unspecified location'}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getLevelBadge(r.incident_record)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium" style={{ color: theme.textPrimary }}>{reporterName}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(r.status)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenHandlingModal(r)}
                              className="px-3 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer"
                              style={{
                                background: isDark ? '#232228' : theme.blueBg,
                                color: isDark ? '#F0EFE9' : theme.blueText,
                                border: `1px solid ${theme.border}`,
                                borderRadius: '4px'
                              }}
                            >
                              <FontAwesomeIcon icon={faEye} className="mr-1.5 text-[10px]" />
                              Review
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handlePromptDelete(r)}
                                className="w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer"
                                style={{
                                  background: isDark ? '#3A1E1E' : '#FDEBEC',
                                  color: isDark ? '#DC8585' : '#9F2F2D',
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '4px'
                                }}
                                title="Delete Incident Report"
                              >
                                <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          loadingCctv ? (
            <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-2" />
              <p className="text-xs font-mono">LOADING CCTV QUEUE...</p>
            </div>
          ) : filteredCctvRequests.length === 0 ? (
            <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
              <p className="text-xs font-mono">NO CCTV FOOTAGE REQUESTS FOUND</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                    <th className="py-3 px-4">CODE / DATE</th>
                    <th className="py-3 px-4">TIME & ROOM</th>
                    <th className="py-3 px-4">REQUESTER & UNIT</th>
                    <th className="py-3 px-4">REASON</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.border }}>
                  {filteredCctvRequests.map(r => {
                    const reqName = r.requester ? `${r.requester.user_nama_depan || ''} ${r.requester.user_nama_belakang || ''}`.trim() : 'Staff'
                    const unitName = allUnits.find(u => u.unit_id === r.requester?.user_unit_id)?.unit_name || '-'

                    return (
                      <tr key={r.id} className="transition-colors" style={{ background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold" style={{ color: theme.blueText }}>{r.request_number || `CCTV/#${r.id}`}</div>
                          <div className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{r.cctv_date}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold" style={{ color: theme.textPrimary }}>{r.room_name}</div>
                          <div className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{r.start_time} - {r.end_time}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold" style={{ color: theme.textPrimary }}>{reqName}</div>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border, color: theme.textSecondary }}>{unitName}</span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium truncate" style={{ color: theme.textPrimary }}>{r.reason}</div>
                          {r.incident && (
                            <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                              Ref: {r.incident.incident_number || `#${r.incident.id}`}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getCctvStatusBadge(r.status)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenCctvModal(r)}
                            className="px-3 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer"
                            style={{
                              background: theme.textPrimary,
                              color: isDark ? '#111111' : '#FFFFFF',
                              borderRadius: '4px'
                            }}
                          >
                            <FontAwesomeIcon icon={faSliders} className="mr-1.5 text-[10px]" />
                            Process
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* MODAL 1: Incident Investigation & Handling Log */}
      <Modal
        isOpen={showHandlingModal}
        onClose={() => setShowHandlingModal(false)}
        title={selectedReport ? `Incident Handling: ${selectedReport.incident_number || `#${selectedReport.id}`}` : 'Incident Handling'}
        maxWidth="max-w-4xl"
      >
        {selectedReport && (() => {
          const studentName = selectedReport.student ? `${selectedReport.student.user_nama_depan || ''} ${selectedReport.student.user_nama_belakang || ''}`.trim() : 'N/A'
          const reporterName = selectedReport.reporter ? `${selectedReport.reporter.user_nama_depan || ''} ${selectedReport.reporter.user_nama_belakang || ''}`.trim() : 'Staff'

          return (
            <div className="space-y-4 text-xs" style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}>
              {/* Overview Box */}
              <div className="p-3.5 rounded border space-y-2" style={{ background: theme.subtleBg, borderColor: theme.border, borderRadius: '6px' }}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: theme.border }}>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: theme.blueText }}>
                      {selectedReport.unit?.unit_name || 'General Unit'}
                    </span>
                    <h3 className="text-sm font-bold mt-0.5" style={{ color: theme.textPrimary }}>{selectedReport.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getLevelBadge(selectedReport.incident_record)}
                    {getStatusBadge(selectedReport.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] font-mono block" style={{ color: theme.textSecondary }}>STUDENT:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{studentName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono block" style={{ color: theme.textSecondary }}>REPORTER:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{reporterName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono block" style={{ color: theme.textSecondary }}>DATE & TIME:</span>
                    <p className="font-mono font-semibold" style={{ color: theme.textPrimary }}>{selectedReport.incident_date} {selectedReport.incident_time}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono block" style={{ color: theme.textSecondary }}>LOCATION:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{selectedReport.place_of_incident || '-'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t text-[11px]" style={{ borderColor: theme.border }}>
                  <span className="text-[10px] font-mono font-semibold block mb-0.5" style={{ color: theme.textSecondary }}>CHRONOLOGY / CASE DESCRIPTION:</span>
                  <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textPrimary }}>{selectedReport.description}</p>
                </div>
              </div>

              {/* 2-Column Bento: Left Timeline, Right Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timeline Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: theme.border }}>
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider" style={{ color: theme.textSecondary }}>
                      // INVESTIGATION TIMELINE
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                      {followups.length}
                    </span>
                  </div>

                  {loadingFollowups ? (
                    <div className="p-6 text-center" style={{ color: theme.textSecondary }}>
                      <FontAwesomeIcon icon={faSpinner} spin className="text-base mb-1" />
                      <p className="text-[10px] font-mono">LOADING TIMELINE...</p>
                    </div>
                  ) : followups.length === 0 ? (
                    <div className="p-6 text-center border border-dashed rounded" style={{ borderColor: theme.border, color: theme.textSecondary, borderRadius: '6px' }}>
                      <p className="text-xs font-mono">No actions logged yet.</p>
                      <p className="text-[10px] mt-1" style={{ color: theme.textSecondary }}>Use the form on the right to log follow-up actions and update the case status.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {followups.map(f => {
                        const actorName = f.user ? `${f.user.user_nama_depan || ''} ${f.user.user_nama_belakang || ''}`.trim() : 'Staff'
                        return (
                          <div key={f.id} className="p-3 rounded border text-xs space-y-1.5" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '6px' }}>
                            <div className="flex items-center justify-between font-semibold" style={{ color: theme.textPrimary }}>
                              <span className="text-blue-600 dark:text-blue-400">{actorName}</span>
                              <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{f.followup_date} {f.followup_time}</span>
                            </div>
                            {f.location && (
                              <div className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>
                                Venue: <span style={{ color: theme.textPrimary }}>{f.location}</span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textPrimary }}>{f.action_details}</p>
                            
                            {f.attachment_url && (
                              <div className="pt-1">
                                <a
                                  href={f.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-mono underline hover:text-blue-500"
                                  style={{ color: theme.blueText }}
                                >
                                  <FontAwesomeIcon icon={faPaperclip} className="text-[9px]" />
                                  <span>View Attachment Image</span>
                                </a>
                              </div>
                            )}

                            <div className="pt-1.5 flex items-center justify-between text-[10px] border-t mt-1" style={{ borderColor: theme.border }}>
                              <span className="font-mono text-[9px] uppercase" style={{ color: theme.textSecondary }}>Resulting Status:</span>
                              {getStatusBadge(f.resulting_status)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Form Column */}
                <div className="space-y-3">
                  <div className="border-b pb-1.5" style={{ borderColor: theme.border }}>
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider" style={{ color: theme.textSecondary }}>
                      // LOG ACTION & SOLUTION
                    </span>
                  </div>

                  <form onSubmit={handleSubmitFollowup} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Action Date *</label>
                        <input
                          type="date"
                          required
                          value={followupForm.followup_date}
                          onChange={e => setFollowupForm(p => ({ ...p, followup_date: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                          style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Action Time *</label>
                        <input
                          type="time"
                          required
                          value={followupForm.followup_time}
                          onChange={e => setFollowupForm(p => ({ ...p, followup_time: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                          style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Action Location / Venue</label>
                      <input
                        type="text"
                        placeholder="e.g. Counseling Room, Principal Office"
                        value={followupForm.location}
                        onChange={e => setFollowupForm(p => ({ ...p, location: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs rounded border outline-none"
                        style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Investigation & Action Details *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Describe investigation details, actions taken, parent meetings, student agreement, or solutions implemented..."
                        value={followupForm.action_details}
                        onChange={e => setFollowupForm(p => ({ ...p, action_details: e.target.value }))}
                        className="w-full p-2.5 text-xs rounded border outline-none resize-y"
                        style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Attach Image Evidence (Optional)</label>
                      {!selectedFile ? (
                        <label className="flex items-center gap-2 p-2 rounded border border-dashed cursor-pointer text-xs" style={{ borderColor: theme.border, background: theme.cardBg, borderRadius: '4px' }}>
                          <FontAwesomeIcon icon={faImage} className="text-gray-400" />
                          <span style={{ color: theme.textSecondary }}>Choose image (PNG, JPG, WEBP)...</span>
                          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                      ) : (
                        <div className="flex items-center justify-between p-2 rounded border text-xs" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '4px' }}>
                          <div className="flex items-center gap-2 truncate">
                            <img src={filePreview} alt="Preview" className="w-7 h-7 object-cover rounded border" />
                            <span className="font-mono text-xs truncate" style={{ color: theme.textPrimary }}>{selectedFile.name}</span>
                          </div>
                          <button type="button" onClick={handleRemoveFile} className="px-2 py-0.5 text-xs font-semibold cursor-pointer" style={{ color: theme.redText }}>
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Update Case Status *</label>
                      <select
                        value={followupForm.resulting_status}
                        onChange={e => setFollowupForm(p => ({ ...p, resulting_status: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold rounded border outline-none cursor-pointer"
                        style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                      >
                        <option value="on_progress">In Progress (Active Case)</option>
                        <option value="completed">Completed (Case Resolved)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingFollowup}
                      className="w-full py-2 text-xs font-semibold rounded transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                      style={{ background: theme.textPrimary, color: isDark ? '#111111' : '#FFFFFF', borderRadius: '4px' }}
                    >
                      {submittingFollowup ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} spin />
                          <span>Saving Action...</span>
                        </>
                      ) : (
                        'Save Action & Update Status'
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: theme.border }}>
                <div>
                  {canDelete && selectedReport && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHandlingModal(false)
                        handlePromptDelete(selectedReport)
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded border transition-all cursor-pointer inline-flex items-center gap-1.5"
                      style={{
                        background: isDark ? '#3A1E1E' : '#FDEBEC',
                        color: isDark ? '#DC8585' : '#9F2F2D',
                        borderColor: theme.border,
                        borderRadius: '4px'
                      }}
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                      <span>Delete Incident Report</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowHandlingModal(false)}
                  className="px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer"
                  style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                >
                  Close
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* MODAL 2: CCTV Request Processing */}
      <Modal
        isOpen={showCctvModal}
        onClose={() => setShowCctvModal(false)}
        title={selectedCctv ? `Process CCTV Request: ${selectedCctv.request_number || `#${selectedCctv.id}`}` : 'Process CCTV Request'}
        maxWidth="max-w-xl"
      >
        {selectedCctv && (() => {
          const reqName = selectedCctv.requester ? `${selectedCctv.requester.user_nama_depan || ''} ${selectedCctv.requester.user_nama_belakang || ''}`.trim() : 'Staff'
          const reqEmail = selectedCctv.requester?.user_email || ''
          const unitName = allUnits.find(u => u.unit_id === selectedCctv.requester?.user_unit_id)?.unit_name || '-'

          return (
            <form onSubmit={handleSaveCctvHandling} className="space-y-4 text-xs" style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}>
              <div className="p-3.5 rounded border space-y-2" style={{ background: theme.subtleBg, borderColor: theme.border, borderRadius: '6px' }}>
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: theme.border }}>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: theme.blueText }}>
                      REQUEST CODE: {selectedCctv.request_number || `#${selectedCctv.id}`}
                    </span>
                    <h4 className="text-xs font-bold mt-0.5" style={{ color: theme.textPrimary }}>
                      Room: {selectedCctv.room_name}
                    </h4>
                  </div>
                  <div>
                    {getCctvStatusBadge(selectedCctv.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] font-mono block" style={{ color: theme.textSecondary }}>REQUESTER:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{reqName} ({unitName})</p>
                    <p className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{reqEmail}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono block" style={{ color: theme.textSecondary }}>DATE & TIME:</span>
                    <p className="font-mono font-semibold" style={{ color: theme.blueText }}>{selectedCctv.cctv_date}</p>
                    <p className="font-mono font-semibold" style={{ color: theme.textPrimary }}>{selectedCctv.start_time} - {selectedCctv.end_time}</p>
                  </div>
                </div>

                {selectedCctv.incident && (
                  <div className="pt-2 border-t text-[11px]" style={{ borderColor: theme.border }}>
                    <span className="text-[10px] font-mono font-semibold block" style={{ color: theme.blueText }}>LINKED INCIDENT REPORT:</span>
                    <p className="font-mono font-medium" style={{ color: theme.textPrimary }}>
                      {selectedCctv.incident.incident_number || `#${selectedCctv.incident.id}`} — {selectedCctv.incident.title}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t text-[11px]" style={{ borderColor: theme.border }}>
                  <span className="text-[10px] font-mono font-semibold block mb-0.5" style={{ color: theme.textSecondary }}>REASON / PURPOSE:</span>
                  <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textPrimary }}>{selectedCctv.reason}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Update Approval Status *</label>
                <select
                  value={cctvForm.status}
                  onChange={e => setCctvForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded border outline-none cursor-pointer"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                >
                  <option value="approved">Approved (Principal Approved Request)</option>
                  <option value="in_progress">In Progress (Security / IT Exporting Footage)</option>
                  <option value="completed">Completed (Footage Exported & Provided)</option>
                  <option value="rejected">Rejected (Request Declined / Unavailable)</option>
                  <option value="pending">Pending (Under Review)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Reviewer Notes / Footage Link (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Enter approval notes, footage Drive link, export instructions, or rejection reason..."
                  value={cctvForm.reviewer_notes}
                  onChange={e => setCctvForm(p => ({ ...p, reviewer_notes: e.target.value }))}
                  className="w-full p-2.5 text-xs rounded border outline-none resize-y"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  onClick={() => setShowCctvModal(false)}
                  className="px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer"
                  style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCctv}
                  className="px-4 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  style={{ background: theme.textPrimary, color: isDark ? '#111111' : '#FFFFFF', borderRadius: '4px' }}
                >
                  {submittingCctv ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Status & Notes'
                  )}
                </button>
              </div>
            </form>
          )
        })()}
      </Modal>

      {/* Delete Incident Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deletingReport) {
            setShowDeleteModal(false)
            setReportToDelete(null)
          }
        }}
        title="Confirm Delete Incident Report"
      >
        <div className="space-y-4 text-xs" style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}>
          <div className="p-3.5 rounded border flex items-start gap-3" style={{ background: isDark ? '#3A1E1E' : '#FDEBEC', borderColor: theme.border, borderRadius: '6px' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-sm mt-0.5" style={{ color: isDark ? '#DC8585' : '#9F2F2D' }} />
            <div>
              <h4 className="font-bold uppercase font-mono tracking-wider" style={{ color: isDark ? '#DC8585' : '#9F2F2D' }}>
                Permanent Deletion Warning
              </h4>
              <p className="mt-1 leading-relaxed" style={{ color: theme.textPrimary }}>
                Deleted incident reports <strong>cannot be recovered</strong>. All linked follow-up history will also be permanently removed from the system.
              </p>
            </div>
          </div>

          {reportToDelete && (
            <div className="p-3 rounded border space-y-1 font-mono text-xs" style={{ background: theme.subtleBg, borderColor: theme.border, borderRadius: '6px' }}>
              <div><span style={{ color: theme.textSecondary }}>INCIDENT #:</span> <span className="font-bold ml-1">{reportToDelete.incident_number || `#${reportToDelete.id}`}</span></div>
              <div><span style={{ color: theme.textSecondary }}>TITLE:</span> <span className="font-medium ml-1">{reportToDelete.title}</span></div>
              <div><span style={{ color: theme.textSecondary }}>STUDENT:</span> <span className="ml-1">{reportToDelete.student ? `${reportToDelete.student.user_nama_depan || ''} ${reportToDelete.student.user_nama_belakang || ''}`.trim() : '-'}</span></div>
              <div><span style={{ color: theme.textSecondary }}>DATE:</span> <span className="ml-1">{reportToDelete.incident_date}</span></div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false)
                setReportToDelete(null)
              }}
              disabled={deletingReport}
              className="px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer"
              style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deletingReport}
              className="px-4 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              style={{
                background: isDark ? '#3A1E1E' : '#FDEBEC',
                color: isDark ? '#DC8585' : '#9F2F2D',
                border: `1px solid ${theme.border}`,
                borderRadius: '4px'
              }}
            >
              {deletingReport ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTrash} />
                  <span>Yes, Delete Permanently</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notif.isOpen}
        onClose={() => setNotif(p => ({ ...p, isOpen: false }))}
        title={notif.title}
        message={notif.message}
        type={notif.type}
      />
    </div>
  )
}
