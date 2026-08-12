'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  faArrowsLeftRight,
  faVideo,
  faFilm,
  faCheckDouble,
  faTimesCircle,
  faInfoCircle,
  faListCheck,
  faCamera
} from '@fortawesome/free-solid-svg-icons'

export default function IncidentHandlingApprovalPage() {
  const router = useRouter()
  const { theme, isDark } = useTheme()

  // Dynamic Styles tied to useTheme() (100% Light & Dark Mode Compatible)
  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '6px' }
  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '6px' }
  const btnPrimaryStyle = { background: theme.textPrimary, color: isDark ? '#18171A' : '#FFFFFF', border: 'none' }
  const btnSecondaryStyle = { background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}` }

  // Main Page Tabs: 'incidents' | 'cctv'
  const [activeTab, setActiveTab] = useState('incidents')

  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [units, setUnits] = useState([])
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

  const canDelete = useMemo(() => {
    return Boolean(
      userRoleData?.role?.is_admin || 
      userRoleData?.role?.is_pastoral_care || 
      currentUser?.is_admin || 
      currentUser?.isAdmin || 
      currentUser?.is_pastoral_care ||
      currentUser?.isPastoralCare
    )
  }, [userRoleData, currentUser])

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
    if (currentUser?.is_admin || currentUser?.is_principal || currentUser?.isAdmin || currentUser?.isPrincipal) return true
    if (userRoleData?.role?.is_admin || userRoleData?.role?.is_principal) return true
    const rName = (currentUser?.role_name || userRoleData?.role?.role_name || '').toLowerCase()
    if (rName.includes('admin') || rName.includes('principal') || rName.includes('kepala sekolah')) return true
    return false
  }, [currentUser, userRoleData])

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

  const uploadAttachmentImage = async (file) => {
    if (!file) return null
    try {
      const fileExt = file.name.split('.').pop() || 'png'
      const fileName = `incident-followups/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      
      let publicUrl = ''
      const { data: storageData, error: storageErr } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (!storageErr && storageData) {
        const { data: pubData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(fileName)
        publicUrl = pubData?.publicUrl || ''
      }

      if (!publicUrl) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('userId', String(currentUser?.user_id || currentUser?.id || 1))
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const json = await res.json()
        if (json.publicUrl) publicUrl = json.publicUrl
      }

      return publicUrl
    } catch (err) {
      console.warn('Upload attachment error:', err)
      return null
    }
  }

  // Fetch Current Logged-in User & Role Info
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_data')
      if (raw) {
        const u = JSON.parse(raw)
        setCurrentUser(u)
        const uId = u?.user_id || u?.userID || u?.id
        if (uId) {
          supabase
            .from('users')
            .select('user_id, user_unit_id, role:user_role_id(role_id, role_name, is_admin, is_principal, is_pastoral_care)')
            .eq('user_id', uId)
            .single()
            .then(({ data }) => {
              if (data) setUserRoleData(data)
            })
        }
      }
    } catch (e) {
      console.error('User data parse error:', e)
    }
  }, [])

  const canViewAll = useMemo(() => {
    return Boolean(
      userRoleData?.role?.is_admin || 
      userRoleData?.role?.is_pastoral_care || 
      currentUser?.is_admin || 
      currentUser?.isAdmin || 
      currentUser?.is_pastoral_care ||
      currentUser?.isPastoralCare
    )
  }, [userRoleData, currentUser])

  const userUnitId = useMemo(() => {
    return userRoleData?.user_unit_id || currentUser?.user_unit_id || currentUser?.unit_id || currentUser?.unitID
  }, [userRoleData, currentUser])

  // Fetch Incident Reports & Units
  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch Units
      const { data: unitsData } = await supabase
        .from('unit')
        .select('*')
        .eq('is_school', true)
        .order('unit_name')
      setUnits(unitsData || [])

      // Base query
      let query = supabase
        .from('incident_reports')
        .select(`
          *,
          student:student_user_id(user_id, user_nama_depan, user_nama_belakang),
          reporter:reporter_user_id(user_id, user_nama_depan, user_nama_belakang, user_email),
          unit:unit_id(unit_id, unit_name)
        `)
        .order('created_at', { ascending: false })

      // Direct Query Scoping: Non-admin and non-pastoral-care users only see their assigned unit
      if (!canViewAll && userUnitId) {
        query = query.eq('unit_id', userUnitId)
      }

      const { data: reportsData, error: repErr } = await query
      if (repErr) throw repErr
      setReports(reportsData || [])

    } catch (err) {
      console.error('Error fetching incident reports for handling:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to load incident reports', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Fetch CCTV Footage Requests (Resilient multi-step fetch for users and units)
  const fetchCctvData = async () => {
    try {
      setLoadingCctv(true)

      // 1. Fetch raw CCTV requests
      const { data: cctvRaw, error: cctvErr } = await supabase
        .from('cctv_footage_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (cctvErr) throw cctvErr

      if (!cctvRaw || cctvRaw.length === 0) {
        setCctvRequests([])
        return
      }

      // 2. Collect unique requester_user_ids & incident_report_ids
      const userIds = Array.from(new Set(cctvRaw.map(r => r.requester_user_id).filter(Boolean)))
      const incidentIds = Array.from(new Set(cctvRaw.map(r => r.incident_report_id).filter(Boolean)))

      // 3. Fetch users and linked incident reports in parallel
      const [usersRes, incidentsRes] = await Promise.all([
        userIds.length > 0
          ? supabase
              .from('users')
              .select('user_id, user_nama_depan, user_nama_belakang, user_email, user_unit_id')
              .in('user_id', userIds)
          : Promise.resolve({ data: [] }),
        incidentIds.length > 0
          ? supabase
              .from('incident_reports')
              .select('id, incident_number, title, incident_date, unit_id')
              .in('id', incidentIds)
          : Promise.resolve({ data: [] })
      ])

      const usersList = usersRes.data || []
      const unitIds = Array.from(new Set(usersList.map(u => u.user_unit_id).filter(Boolean)))

      // 4. Fetch units by unitIds
      const unitsRes = unitIds.length > 0
        ? await supabase.from('unit').select('unit_id, unit_name').in('unit_id', unitIds)
        : { data: [] }

      const unitsMap = new Map((unitsRes.data || []).map(u => [String(u.unit_id), u]))

      // 5. Build usersMap with unit object attached
      const usersMap = new Map(
        usersList.map(u => [
          String(u.user_id),
          {
            ...u,
            unit: u.user_unit_id ? unitsMap.get(String(u.user_unit_id)) || null : null
          }
        ])
      )

      const incidentsMap = new Map((incidentsRes.data || []).map(i => [String(i.id), i]))

      // 6. Combine and enrich CCTV requests
      let enriched = cctvRaw.map(req => ({
        ...req,
        requester: usersMap.get(String(req.requester_user_id)) || null,
        incident: incidentsMap.get(String(req.incident_report_id)) || null
      }))

      // Direct Query Scoping for CCTV: Non-admin and non-pastoral-care users only see CCTV requests for their unit
      if (!canViewAll && userUnitId) {
        enriched = enriched.filter(req => {
          const reqUnitId = req.requester?.user_unit_id || req.incident?.unit_id
          return String(reqUnitId) === String(userUnitId)
        })
      }

      setCctvRequests(enriched)
    } catch (err) {
      console.error('Error fetching CCTV requests:', err)
    } finally {
      setLoadingCctv(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchCctvData()
  }, [userRoleData, currentUser])

  // Summary Metrics for Incidents
  const metrics = useMemo(() => {
    let waiting = 0
    let onProgress = 0
    let completed = 0

    reports.forEach(r => {
      if (r.status === 'waiting') waiting++
      else if (r.status === 'on_progress') onProgress++
      else if (r.status === 'completed') completed++
    })

    return { total: reports.length, waiting, onProgress, completed }
  }, [reports])

  // Summary Metrics for CCTV Requests
  const cctvMetrics = useMemo(() => {
    let pending = 0
    let approved = 0
    let inProgress = 0
    let completed = 0
    let rejected = 0

    cctvRequests.forEach(r => {
      const st = (r.status || 'pending').toLowerCase()
      if (st === 'pending') pending++
      else if (st === 'approved') approved++
      else if (st === 'in_progress') inProgress++
      else if (st === 'completed') completed++
      else if (st === 'rejected') rejected++
    })

    return { total: cctvRequests.length, pending, approved, inProgress, completed, rejected }
  }, [cctvRequests])

  // Filtered Incident Reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (selectedStatusFilter !== 'all' && r.status !== selectedStatusFilter) return false
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
  }, [reports, selectedStatusFilter, searchQuery])

  // Filtered CCTV Requests
  const filteredCctvRequests = useMemo(() => {
    return cctvRequests.filter(r => {
      if (cctvStatusFilter !== 'all' && r.status !== cctvStatusFilter) return false
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
  }, [cctvRequests, cctvStatusFilter, cctvSearchQuery])

  // Helper badge for Behaviour Level
  const getLevelBadge = (level) => {
    switch (level) {
      case 'Level 1':
        return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider" style={{ background: theme.greenBg, color: theme.greenText }}>Level 1</span>
      case 'Level 2':
        return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider" style={{ background: theme.yellowBg, color: theme.yellowText }}>Level 2</span>
      case 'Level 3':
      case 'Zero Tolerance':
        return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider" style={{ background: theme.redBg, color: theme.redText }}>{level}</span>
      default:
        return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider" style={{ background: theme.subtleBg, color: theme.textSecondary }}>{level || 'Level 1'}</span>
    }
  }

  // Helper badge color for incident status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return <span className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider" style={{ background: theme.yellowBg, color: theme.yellowText }}><FontAwesomeIcon icon={faClock} className="text-[9px]" /> Waiting</span>
      case 'on_progress':
        return <span className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider" style={{ background: theme.blueBg, color: theme.blueText }}><FontAwesomeIcon icon={faHourglassHalf} className="text-[9px]" /> On Progress</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider" style={{ background: theme.greenBg, color: theme.greenText }}><FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" /> Completed</span>
      default:
        return <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider" style={{ background: theme.subtleBg, color: theme.textSecondary }}>{status}</span>
    }
  }

  // Helper badge for CCTV Status (Minimalist UI Wash-out Pastels)
  const getCctvStatusBadge = (status) => {
    switch ((status || 'pending').toLowerCase()) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#FBF3DB] text-[#956400] border border-[#F5E6B3]"><FontAwesomeIcon icon={faClock} className="text-[9px]" /> Pending</span>
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#E1F3FE] text-[#1F6C9F] border border-[#BDE3FC]"><FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" /> Approved</span>
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]"><FontAwesomeIcon icon={faHourglassHalf} className="text-[9px]" /> In Progress</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]"><FontAwesomeIcon icon={faCheckDouble} className="text-[9px]" /> Completed</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#FDEBEC] text-[#9F2F2D] border border-[#F8C9CC]"><FontAwesomeIcon icon={faTimesCircle} className="text-[9px]" /> Rejected</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#F7F6F3] text-[#787774] border border-[#EAEAEA]">{status}</span>
    }
  }

  // Open Incident Handling Modal
  const handleOpenHandlingModal = async (report) => {
    setSelectedReport(report)
    setShowHandlingModal(true)
    setLoadingFollowups(true)
    setSelectedFile(null)
    setFilePreview('')
    setFollowupForm({
      followup_date: getTodayDate(),
      followup_time: getCurrentTime(),
      location: '',
      action_details: '',
      resulting_status: report.status === 'waiting' ? 'on_progress' : report.status
    })

    try {
      const { data, error } = await supabase
        .from('incident_followups')
        .select('*, user:user_id(user_id, user_nama_depan, user_nama_belakang)')
        .eq('incident_id', report.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setFollowups(data || [])
    } catch (err) {
      console.error('Fetch followups error:', err)
    } finally {
      setLoadingFollowups(false)
    }
  }

  // Open CCTV Handling Modal for Principal / Admin
  const handleOpenCctvModal = (cctvReq) => {
    setSelectedCctv(cctvReq)
    setCctvForm({
      status: cctvReq.status || 'approved',
      reviewer_notes: cctvReq.reviewer_notes || ''
    })
    setShowCctvModal(true)
  }

  // Handle Submit Followup Solution for Incident
  const handleSubmitFollowup = async (e) => {
    e.preventDefault()
    if (!selectedReport || !currentUser) return

    try {
      setSubmittingFollowup(true)

      let attachmentUrl = null
      if (selectedFile) {
        setUploadingFile(true)
        attachmentUrl = await uploadAttachmentImage(selectedFile)
        setUploadingFile(false)
      }

      const payload = {
        incident_id: selectedReport.id,
        user_id: currentUser.user_id || currentUser.id || currentUser.userID,
        followup_date: followupForm.followup_date,
        followup_time: followupForm.followup_time,
        location: followupForm.location.trim() || null,
        action_details: followupForm.action_details.trim(),
        resulting_status: followupForm.resulting_status,
        attachment_url: attachmentUrl
      }

      const { data: newFol, error: insertErr } = await supabase
        .from('incident_followups')
        .insert([payload])
        .select('*, user:user_id(user_id, user_nama_depan, user_nama_belakang)')
        .single()

      if (insertErr) throw insertErr

      if (selectedReport.status !== followupForm.resulting_status) {
        const { error: updateErr } = await supabase
          .from('incident_reports')
          .update({
            status: followupForm.resulting_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedReport.id)

        if (updateErr) throw updateErr

        setSelectedReport(prev => ({ ...prev, status: followupForm.resulting_status }))
        setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: followupForm.resulting_status } : r))
      }

      setFollowups(prev => [...prev, newFol])

      // Trigger Email Notification to Pelapor (Reporter)
      fetch('/api/notifications/incident-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_followup',
          incidentId: selectedReport.id,
          followupId: newFol.id
        })
      }).catch(nErr => console.warn('Notification trigger error:', nErr))

      setFollowupForm({
        followup_date: getTodayDate(),
        followup_time: getCurrentTime(),
        location: '',
        action_details: '',
        resulting_status: followupForm.resulting_status
      })
      setSelectedFile(null)
      setFilePreview('')

      setNotif({ isOpen: true, title: 'Success', message: 'Action/Solution logged successfully!', type: 'success' })

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

      // Trigger Email & Google Chat notifications for status update (Notify Requester)
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
      setNotif({ isOpen: true, title: 'Status Updated', message: `CCTV Request #${selectedCctv.request_number || selectedCctv.id} updated to ${cctvForm.status.toUpperCase()} successfully! Notification sent to requester.`, type: 'success' })
      fetchCctvData()
    } catch (err) {
      console.error('Error updating CCTV request status:', err)
      setNotif({ isOpen: true, title: 'Update Failed', message: err.message || 'Failed to update CCTV request', type: 'error' })
    } finally {
      setSubmittingCctv(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: theme.textPrimary }}>
            <FontAwesomeIcon icon={activeTab === 'incidents' ? faClipboardCheck : faVideo} className="text-blue-600 dark:text-blue-400" />
            <span>Incident & CCTV Requests Approval</span>
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: theme.textSecondary }}>
            Review, investigate, log solutions, and approve CCTV footage requests across all school units.
          </p>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* METRICS CARDS SECTION (Dynamic based on Active Tab) */}
      {/* ============================================================================== */}
      {activeTab === 'incidents' ? (
        /* Summary Metric Cards for Incidents */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Total Cases</p>
                <p className="text-2xl font-bold mt-1" style={{ color: theme.textPrimary }}>{metrics.total}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: theme.subtleBg }}>
                <FontAwesomeIcon icon={faClipboardCheck} className="text-sm" style={{ color: theme.textSecondary }} />
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: theme.yellowText }}>Waiting Review</p>
                <p className="text-2xl font-bold mt-1" style={{ color: theme.yellowText }}>{metrics.waiting}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: theme.yellowBg }}>
                <FontAwesomeIcon icon={faClock} className="text-sm" style={{ color: theme.yellowText }} />
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: theme.blueText }}>On Progress</p>
                <p className="text-2xl font-bold mt-1" style={{ color: theme.blueText }}>{metrics.onProgress}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: theme.blueBg }}>
                <FontAwesomeIcon icon={faHourglassHalf} className="text-sm" style={{ color: theme.blueText }} />
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: theme.greenText }}>Completed</p>
                <p className="text-2xl font-bold mt-1" style={{ color: theme.greenText }}>{metrics.completed}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: theme.greenBg }}>
                <FontAwesomeIcon icon={faCheckCircle} className="text-sm" style={{ color: theme.greenText }} />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Summary Metric Cards for CCTV Requests */
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Total Requests</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: theme.textPrimary }}>{cctvMetrics.total}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">
                <FontAwesomeIcon icon={faVideo} className="text-xs" />
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pending</p>
                <p className="text-xl font-bold mt-0.5 text-amber-700 dark:text-amber-400">{cctvMetrics.pending}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 text-amber-700">
                <FontAwesomeIcon icon={faClock} className="text-xs" />
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Approved</p>
                <p className="text-xl font-bold mt-0.5 text-blue-700 dark:text-blue-400">{cctvMetrics.approved}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-700">
                <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Completed</p>
                <p className="text-xl font-bold mt-0.5 text-emerald-700 dark:text-emerald-400">{cctvMetrics.completed}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700">
                <FontAwesomeIcon icon={faCheckDouble} className="text-xs" />
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">Rejected</p>
                <p className="text-xl font-bold mt-0.5 text-rose-700 dark:text-rose-400">{cctvMetrics.rejected}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-rose-100 text-rose-700">
                <FontAwesomeIcon icon={faTimesCircle} className="text-xs" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================================== */}
      {/* SEARCH & FILTER TOOLBAR (Dynamic based on Active Tab) */}
      {/* ============================================================================== */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardContent className="p-4">
          {activeTab === 'incidents' ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.textSecondary }} />
                <Input
                  type="text"
                  placeholder="Search incident number, title, student name, reporter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={inputStyle}
                  className="pl-9 text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: theme.textSecondary }}>
                  <FontAwesomeIcon icon={faSliders} className="text-xs" />
                  <span>Status:</span>
                </div>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  style={selectStyle}
                  className="px-3 py-2 text-xs w-full sm:w-auto focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="waiting">Waiting Review</option>
                  <option value="on_progress">On Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.textSecondary }} />
                <Input
                  type="text"
                  placeholder="Search CCTV code, room location, requester name, reason..."
                  value={cctvSearchQuery}
                  onChange={(e) => setCctvSearchQuery(e.target.value)}
                  style={inputStyle}
                  className="pl-9 text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: theme.textSecondary }}>
                  <FontAwesomeIcon icon={faSliders} className="text-xs" />
                  <span>Status:</span>
                </div>
                <select
                  value={cctvStatusFilter}
                  onChange={(e) => setCctvStatusFilter(e.target.value)}
                  style={selectStyle}
                  className="px-3 py-2 text-xs w-full sm:w-auto focus:outline-none"
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
          )}
        </CardContent>
      </Card>

      {/* ============================================================================== */}
      {/* TABLE CONTAINER CARD WITH INTEGRATED TABS AT THE TOP */}
      {/* ============================================================================== */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        {/* Tab Navigation Header on Top of List Table */}
        <CardHeader className="p-0 border-b overflow-x-auto" style={{ borderColor: theme.border }}>
          <div className="flex items-center">
            {/* Tab 1: Incoming Incident Reports */}
            <button
              type="button"
              onClick={() => setActiveTab('incidents')}
              className={`px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'incidents'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
              }`}
            >
              <FontAwesomeIcon icon={faClipboardCheck} />
              <span>Incoming Incident Reports</span>
              <span className="ml-1 px-2.5 py-0.5 text-[11px] rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold">
                {metrics.total}
              </span>
            </button>

            {/* Tab 2: Incoming CCTV Requests (Strictly for is_principal and is_admin) */}
            {isAuthorizedForCctv && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('cctv')
                  fetchCctvData()
                }}
                className={`px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'cctv'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                }`}
              >
                <FontAwesomeIcon icon={faVideo} />
                <span>Incoming CCTV Requests</span>
                <span className="ml-1 px-2.5 py-0.5 text-[11px] rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-extrabold">
                  {cctvMetrics.total}
                </span>
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {/* TAB 1: INCIDENT REPORTS TABLE BODY */}
          {activeTab === 'incidents' && (
            loading ? (
              <div className="p-8 text-center" style={{ color: theme.textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl mb-2 text-blue-500" />
                <p className="text-xs font-medium">Loading incident queue...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-8 text-center" style={{ color: theme.textSecondary }}>
                <FontAwesomeIcon icon={faClipboardCheck} className="text-3xl mb-2 opacity-40" />
                <p className="text-xs font-medium">No incident reports found matching filter criteria.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-[11px] font-semibold uppercase tracking-wider" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                    <th className="p-3">Inc # / Date</th>
                    <th className="p-3">Student & Unit</th>
                    <th className="p-3">Incident Title</th>
                    <th className="p-3">Level</th>
                    <th className="p-3">Reporter</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.border }}>
                  {filteredReports.map((r) => {
                    const studentName = r.student ? `${r.student.user_nama_depan || ''} ${r.student.user_nama_belakang || ''}`.trim() : 'N/A'
                    const reporterName = r.reporter ? `${r.reporter.user_nama_depan || ''} ${r.reporter.user_nama_belakang || ''}`.trim() : 'Staff'
                    const unitName = r.unit?.unit_name || '-'

                    return (
                      <tr key={r.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold" style={{ color: theme.textPrimary }}>{r.incident_number || `#${r.id}`}</div>
                          <div className="text-[10px]" style={{ color: theme.textSecondary }}>{r.incident_date} {r.incident_time}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold" style={{ color: theme.textPrimary }}>{studentName}</div>
                          <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{unitName}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium max-w-xs truncate" style={{ color: theme.textPrimary }}>{r.title}</div>
                          <div className="text-[10px] truncate max-w-xs" style={{ color: theme.textSecondary }}>{r.place_of_incident || 'Unspecified location'}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {getLevelBadge(r.incident_record)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-medium" style={{ color: theme.textPrimary }}>{reporterName}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {getStatusBadge(r.status)}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenHandlingModal(r)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all inline-flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
                              style={{ background: theme.blueBg, color: theme.blueText, border: `1px solid ${theme.border}` }}
                              title="Review & Handle Incident"
                            >
                              <FontAwesomeIcon icon={faEye} className="text-[11px]" />
                              <span>Review</span>
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handlePromptDelete(r)}
                                className="w-8 h-8 rounded-md flex items-center justify-center cursor-pointer transition-all bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/60 shrink-0 shadow-2xs hover:shadow-xs"
                                title="Delete Incident Report"
                              >
                                <FontAwesomeIcon icon={faTrash} className="text-xs" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          )}

          {/* TAB 2: CCTV REQUESTS TABLE BODY (Principal & Admin Only) */}
          {activeTab === 'cctv' && isAuthorizedForCctv && (
            loadingCctv ? (
              <div className="p-8 text-center" style={{ color: theme.textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl mb-2 text-blue-500" />
                <p className="text-xs font-medium">Loading CCTV requests...</p>
              </div>
            ) : filteredCctvRequests.length === 0 ? (
              <div className="p-8 text-center" style={{ color: theme.textSecondary }}>
                <FontAwesomeIcon icon={faFilm} className="text-3xl mb-2 opacity-40" />
                <p className="text-xs font-medium">No CCTV footage requests found matching filter criteria.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-[11px] font-semibold uppercase tracking-wider" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                    <th className="p-3">Code / Date</th>
                    <th className="p-3">Time & Location</th>
                    <th className="p-3">Requester & Unit</th>
                    <th className="p-3">Reason / Purpose</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.border }}>
                  {filteredCctvRequests.map((r) => {
                    const reqName = r.requester ? `${r.requester.user_nama_depan || ''} ${r.requester.user_nama_belakang || ''}`.trim() : 'Staff'
                    const reqEmail = r.requester?.user_email || ''
                    const unitName = r.requester?.unit?.unit_name || '-'

                    return (
                      <tr key={r.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-blue-600 dark:text-blue-400">{r.request_number || `CCTV/#${r.id}`}</div>
                          <div className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>Req Date: {r.cctv_date}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold" style={{ color: theme.textPrimary }}>{r.room_name}</div>
                          <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{r.start_time} - {r.end_time}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold" style={{ color: theme.textPrimary }}>{reqName}</div>
                          <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{unitName}</div>
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="font-medium line-clamp-2" style={{ color: theme.textPrimary }}>{r.reason}</div>
                          {r.incident && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                              Linked: {r.incident.incident_number || `#${r.incident.id}`} — {r.incident.title}
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {getCctvStatusBadge(r.status)}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenCctvModal(r)}
                            className="px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-all inline-flex items-center gap-1 shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <FontAwesomeIcon icon={faSliders} className="text-[10px]" />
                            <span>Process / Review</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          )}
        </CardContent>
      </Card>

      {/* ============================================================================== */}
      {/* MODAL 1: INCIDENT HANDLING & SOLUTION LOG (Staff / Admin) */}
      {/* ============================================================================== */}
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
            <div className="space-y-5 text-xs">
              
              {/* Top Case Overview Box */}
              <div className="p-3.5 rounded-lg border space-y-2" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: theme.border }}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
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
                    <span style={{ color: theme.textSecondary }}>Student Involved:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{studentName}</p>
                  </div>
                  <div>
                    <span style={{ color: theme.textSecondary }}>Reporter:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{reporterName}</p>
                  </div>
                  <div>
                    <span style={{ color: theme.textSecondary }}>Date & Time:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{selectedReport.incident_date} {selectedReport.incident_time}</p>
                  </div>
                  <div>
                    <span style={{ color: theme.textSecondary }}>Location:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{selectedReport.place_of_incident || '-'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t text-[11px]" style={{ borderColor: theme.border }}>
                  <span className="font-semibold block mb-0.5" style={{ color: theme.textPrimary }}>Chronology / Description:</span>
                  <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textSecondary }}>{selectedReport.description}</p>
                </div>
              </div>

              {/* Grid: Left = Timeline History, Right = Add Action Log */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left Column: Solution & Action Timeline */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider flex items-center justify-between border-b pb-1.5" style={{ color: theme.textPrimary, borderColor: theme.border }}>
                    <span>Investigation & Solution Log</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: theme.blueBg, color: theme.blueText }}>
                      {followups.length} entries
                    </span>
                  </h4>

                  {loadingFollowups ? (
                    <div className="p-6 text-center" style={{ color: theme.textSecondary }}>
                      <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-1 text-blue-500" />
                      <p className="text-[11px]">Loading solution logs...</p>
                    </div>
                  ) : followups.length === 0 ? (
                    <div className="p-6 text-center border border-dashed rounded-lg" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                      <FontAwesomeIcon icon={faHourglassHalf} className="text-2xl mb-1 opacity-40" />
                      <p className="text-[11px] font-medium">No actions logged yet.</p>
                      <p className="text-[10px] opacity-75 mt-0.5">Use the form on the right to record actions taken by Vice Principal / Handling Staff.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {followups.map((f) => {
                        const actorName = f.user ? `${f.user.user_nama_depan || ''} ${f.user.user_nama_belakang || ''}`.trim() : 'Staff'
                        return (
                          <div key={f.id} className="p-3 rounded-lg border text-xs space-y-1.5" style={{ background: theme.cardBg, borderColor: theme.border }}>
                            <div className="flex items-center justify-between font-semibold" style={{ color: theme.textPrimary }}>
                              <span className="text-blue-600 dark:text-blue-400">{actorName}</span>
                              <span className="text-[10px] font-normal" style={{ color: theme.textSecondary }}>{f.followup_date} {f.followup_time}</span>
                            </div>
                            {f.location && (
                              <div className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>
                                Location: <span style={{ color: theme.textPrimary }}>{f.location}</span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textPrimary }}>{f.action_details}</p>
                            
                            {f.attachment_url && (
                              <div className="pt-1">
                                <a
                                  href={f.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  <FontAwesomeIcon icon={faPaperclip} className="text-[9px]" />
                                  <span>View Attachment Image</span>
                                </a>
                              </div>
                            )}

                            <div className="pt-1 flex items-center justify-between text-[10px] border-t mt-1" style={{ borderColor: theme.border }}>
                              <span style={{ color: theme.textSecondary }}>Resulting Status:</span>
                              {getStatusBadge(f.resulting_status)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Add New Action / Solution */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider border-b pb-1.5" style={{ color: theme.textPrimary, borderColor: theme.border }}>
                    Record Action / Solution
                  </h4>

                  <form onSubmit={handleSubmitFollowup} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium mb-1 block" style={{ color: theme.textPrimary }}>Action Date *</Label>
                        <Input
                          type="date"
                          required
                          value={followupForm.followup_date}
                          onChange={e => setFollowupForm(p => ({ ...p, followup_date: e.target.value }))}
                          style={inputStyle}
                          className="w-full text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1 block" style={{ color: theme.textPrimary }}>Action Time *</Label>
                        <Input
                          type="time"
                          required
                          value={followupForm.followup_time}
                          onChange={e => setFollowupForm(p => ({ ...p, followup_time: e.target.value }))}
                          style={inputStyle}
                          className="w-full text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium mb-1 block" style={{ color: theme.textPrimary }}>Action Location / Venue</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Principal Office, Counseling Room..."
                        value={followupForm.location}
                        onChange={e => setFollowupForm(p => ({ ...p, location: e.target.value }))}
                        style={inputStyle}
                        className="w-full text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium mb-1 block" style={{ color: theme.textPrimary }}>Action / Investigation Details *</Label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Describe investigation details, actions taken, parent meetings, student agreement, or solutions implemented..."
                        value={followupForm.action_details}
                        onChange={e => setFollowupForm(p => ({ ...p, action_details: e.target.value }))}
                        className="w-full p-2.5 text-xs rounded-md border resize-y focus:outline-none"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium mb-1 block" style={{ color: theme.textPrimary }}>Upload Proof Image (Optional)</Label>
                      {!selectedFile ? (
                        <label className="flex items-center gap-2 p-2 rounded-md border border-dashed cursor-pointer text-xs" style={{ borderColor: theme.border, background: theme.cardBg }}>
                          <FontAwesomeIcon icon={faImage} style={{ color: theme.textSecondary }} className="text-xs" />
                          <span style={{ color: theme.textSecondary }}>Choose image (PNG, JPG, WEBP)...</span>
                          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                      ) : (
                        <div className="flex items-center justify-between p-2 rounded-md border text-xs" style={{ background: theme.cardBg, borderColor: theme.border }}>
                          <div className="flex items-center gap-2 overflow-hidden">
                            <img src={filePreview} alt="Attachment Preview" className="w-8 h-8 object-cover rounded border" />
                            <span className="font-medium truncate" style={{ color: theme.textPrimary }}>{selectedFile.name}</span>
                          </div>
                          <button type="button" onClick={handleRemoveFile} className="px-2 py-1 text-xs font-semibold cursor-pointer" style={{ color: theme.redText }}>
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs font-medium mb-1 block" style={{ color: theme.textPrimary }}>Update Case Status *</Label>
                      <select
                        value={followupForm.resulting_status}
                        onChange={e => setFollowupForm(p => ({ ...p, resulting_status: e.target.value }))}
                        className="w-full text-xs p-2 rounded-md border font-medium"
                        style={selectStyle}
                      >
                        <option value="on_progress">On Progress (Active Case)</option>
                        <option value="completed">Completed (Case Resolved)</option>
                      </select>
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={submittingFollowup}
                        className="w-full py-2 text-xs font-medium rounded-md cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                        style={btnPrimaryStyle}
                      >
                        {submittingFollowup ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} spin />
                            <span>Saving...</span>
                          </>
                        ) : (
                          'Save Solution & Update Status'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: theme.border }}>
                <div>
                  {canDelete && selectedReport && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHandlingModal(false)
                        handlePromptDelete(selectedReport)
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      <span>Hapus Insiden Ini</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowHandlingModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
                  style={btnSecondaryStyle}
                >
                  Close
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ============================================================================== */}
      {/* MODAL 2: CCTV REQUEST APPROVAL & REVIEW MODAL (Principal / Admin) */}
      {/* ============================================================================== */}
      <Modal
        isOpen={showCctvModal}
        onClose={() => setShowCctvModal(false)}
        title={selectedCctv ? `Process CCTV Request: ${selectedCctv.request_number || `#${selectedCctv.id}`}` : 'Process CCTV Request'}
        maxWidth="max-w-xl"
      >
        {selectedCctv && (() => {
          const reqName = selectedCctv.requester ? `${selectedCctv.requester.user_nama_depan || ''} ${selectedCctv.requester.user_nama_belakang || ''}`.trim() : 'Staff'
          const reqEmail = selectedCctv.requester?.user_email || ''
          const unitName = selectedCctv.requester?.unit?.unit_name || '-'

          return (
            <form onSubmit={handleSaveCctvHandling} className="space-y-4 text-xs">
              
              {/* CCTV Overview Card */}
              <div className="p-3.5 rounded-lg border space-y-2" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: theme.border }}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Request Code: {selectedCctv.request_number || `#${selectedCctv.id}`}
                    </span>
                    <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      Location: {selectedCctv.room_name}
                    </h4>
                  </div>
                  <div>
                    {getCctvStatusBadge(selectedCctv.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span style={{ color: theme.textSecondary }}>Requester:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{reqName} ({unitName})</p>
                    <p className="text-[10px]" style={{ color: theme.textSecondary }}>{reqEmail}</p>
                  </div>
                  <div>
                    <span style={{ color: theme.textSecondary }}>Footage Date & Time:</span>
                    <p className="font-semibold text-blue-600 dark:text-blue-400">{selectedCctv.cctv_date}</p>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{selectedCctv.start_time} - {selectedCctv.end_time}</p>
                  </div>
                </div>

                {selectedCctv.incident && (
                  <div className="pt-2 border-t text-[11px]" style={{ borderColor: theme.border }}>
                    <span className="font-semibold block text-indigo-600 dark:text-indigo-400">Linked Incident Report:</span>
                    <p className="font-medium" style={{ color: theme.textPrimary }}>
                      {selectedCctv.incident.incident_number || `#${selectedCctv.incident.id}`} — {selectedCctv.incident.title} ({selectedCctv.incident.incident_date})
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t text-[11px]" style={{ borderColor: theme.border }}>
                  <span className="font-semibold block mb-0.5" style={{ color: theme.textPrimary }}>Reason / Purpose:</span>
                  <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textSecondary }}>{selectedCctv.reason}</p>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>
                  Update Approval Status <span className="text-red-500">*</span>
                </Label>
                <select
                  value={cctvForm.status}
                  onChange={e => setCctvForm(p => ({ ...p, status: e.target.value }))}
                  style={selectStyle}
                  className="w-full px-3 py-2 text-xs font-bold focus:outline-none"
                >
                  <option value="approved">Approved (Principal Approved Request)</option>
                  <option value="in_progress">In Progress (Security / IT Exporting Footage)</option>
                  <option value="completed">Completed (Footage Exported & Provided to Requester)</option>
                  <option value="rejected">Rejected (Request Declined / Camera Unavailable)</option>
                  <option value="pending">Pending (Under Review)</option>
                </select>
              </div>

              {/* Reviewer Notes / Footage Reference Link */}
              <div>
                <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>
                  Reviewer Notes / Footage Link (Optional)
                </Label>
                <textarea
                  rows={4}
                  placeholder="Enter approval notes, footage Google Drive link, export instructions, or rejection reason..."
                  value={cctvForm.reviewer_notes}
                  onChange={e => setCctvForm(p => ({ ...p, reviewer_notes: e.target.value }))}
                  className="w-full p-2.5 text-xs rounded-md border resize-y focus:outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
                <button
                  type="button"
                  onClick={() => setShowCctvModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
                  style={btnSecondaryStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCctv}
                  className="px-4 py-2 text-xs font-bold rounded-md cursor-pointer bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {submittingCctv ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheckCircle} />
                      <span>Save Status & Notes</span>
                    </>
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
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-rose-600 dark:text-rose-400 text-lg mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">Permanent Deletion Warning</h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                Deleted incident reports <strong>cannot be recovered</strong>! All linked follow-up history will also be permanently removed.
              </p>
            </div>
          </div>

          {reportToDelete && (
            <div className="p-3 rounded-lg text-xs space-y-1.5" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}` }}>
              <div><span className="font-semibold text-gray-500 dark:text-gray-400">Incident Number:</span> <span className="font-bold ml-1">{reportToDelete.incident_number || `#${reportToDelete.id}`}</span></div>
              <div><span className="font-semibold text-gray-500 dark:text-gray-400">Title:</span> <span className="font-medium ml-1">{reportToDelete.title}</span></div>
              <div><span className="font-semibold text-gray-500 dark:text-gray-400">Student:</span> <span className="ml-1">{reportToDelete.student ? `${reportToDelete.student.user_nama_depan || ''} ${reportToDelete.student.user_nama_belakang || ''}`.trim() : '-'}</span></div>
              <div><span className="font-semibold text-gray-500 dark:text-gray-400">Incident Date:</span> <span className="ml-1">{reportToDelete.incident_date}</span></div>
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
              className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer disabled:opacity-50"
              style={btnSecondaryStyle}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deletingReport}
              className="px-4 py-2 text-xs font-bold rounded-md cursor-pointer bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs"
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
