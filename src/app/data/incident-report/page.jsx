'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
  faExclamationTriangle,
  faPlus,
  faSearch,
  faFilter,
  faClock,
  faCalendar,
  faUser,
  faEye,
  faEdit,
  faTrash,
  faSliders,
  faSpinner,
  faCheckCircle,
  faHourglassHalf,
  faExternalLinkAlt,
  faBuilding,
  faArrowsLeftRight,
  faFileText,
  faLayerGroup,
  faVideo,
  faFilm,
  faListCheck,
  faCamera,
  faCheckDouble,
  faTimesCircle,
  faClipboardCheck
} from '@fortawesome/free-solid-svg-icons'

export default function IncidentReportListPage() {
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
  const [students, setStudents] = useState([])
  const [roomsList, setRoomsList] = useState([])
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // CCTV Request State
  const [showCctvModal, setShowCctvModal] = useState(false)
  const [cctvSubmitting, setCctvSubmitting] = useState(false)
  const [cctvRequests, setCctvRequests] = useState([])
  const [cctvSearchQuery, setCctvSearchQuery] = useState('')
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')

  // Form Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })

  // Student Autocomplete State
  const [studentSearchText, setStudentSearchText] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const studentDropdownRef = useRef(null)

  // Current logged in user
  const [currentUser, setCurrentUser] = useState(null)

  // Initial Form Data
  const getTodayDate = () => new Date().toISOString().split('T')[0]
  const getCurrentTime = () => {
    const d = new Date()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const [formData, setFormData] = useState({
    title: '',
    place_of_incident: '',
    incident_date: getTodayDate(),
    incident_time: getCurrentTime(),
    incident_record: 'Level 1',
    description: '',
    action_taken: ''
  })

  // CCTV Form Data
  const [cctvFormData, setCctvFormData] = useState({
    cctv_date: getTodayDate(),
    start_time: '08:00',
    end_time: '10:00',
    room_name: '',
    incident_report_id: '',
    reason: ''
  })

  // Fetch initial logged in user info
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('user_data')
      if (rawUser) {
        const u = JSON.parse(rawUser)
        setCurrentUser(u)
      }
    } catch (e) {
      console.error('Error loading current user from localStorage:', e)
    }
  }, [])

  // Close student autocomplete dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(e.target)) {
        setShowStudentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch Incident Reports & Master Data
  const fetchData = async (overrideUserId = null) => {
    try {
      setLoading(true)

      // Fetch School Units
      const { data: unitsData } = await supabase
        .from('unit')
        .select('*')
        .eq('is_school', true)
        .order('unit_name')
      setUnits(unitsData || [])

      const unitMap = new Map((unitsData || []).map(u => [u.unit_id, u.unit_name]))

      // Fetch Room Master Data
      const { data: rData } = await supabase
        .from('room')
        .select('room_id, room_name, unit_id')
        .order('room_name')
      setRoomsList(rData || [])

      // Fetch Students strictly
      const { data: studentRoles } = await supabase
        .from('role')
        .select('role_id, role_name, is_student')
        .or('is_student.eq.true,role_name.eq.Student,role_name.eq.Siswa')

      const studentRoleIds = (studentRoles || []).map(r => r.role_id)

      let studentsQuery = supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_email, user_unit_id, role:user_role_id(role_id, role_name, is_student)')
        .order('user_nama_depan')

      if (studentRoleIds.length > 0) {
        studentsQuery = studentsQuery.in('user_role_id', studentRoleIds)
      }

      const { data: rawStudents } = await studentsQuery
      const formattedStudents = (rawStudents || [])
        .filter(s =>
          s.role?.is_student === true ||
          (s.role?.role_name || '').toLowerCase() === 'student' ||
          (s.role?.role_name || '').toLowerCase() === 'siswa'
        )
        .map(s => ({
          ...s,
          unit: { unit_id: s.user_unit_id, unit_name: unitMap.get(s.user_unit_id) || 'Unit' }
        }))
      setStudents(formattedStudents)

      const rawKrId = typeof window !== 'undefined' ? localStorage.getItem('kr_id') : null
      const targetUserId = overrideUserId || currentUser?.userID || currentUser?.user_id || currentUser?.id || rawKrId
      
      let reportsQuery = supabase
        .from('incident_reports')
        .select(`
          *,
          student:student_user_id(user_id, user_nama_depan, user_nama_belakang, user_unit_id),
          reporter:reporter_user_id(user_id, user_nama_depan, user_nama_belakang, user_email),
          unit:unit_id(unit_id, unit_name)
        `)
        .order('created_at', { ascending: false })

      if (targetUserId) {
        reportsQuery = reportsQuery.eq('reporter_user_id', targetUserId)
      }

      const { data: reportsData, error: repErr } = await reportsQuery
      if (repErr) throw repErr
      setReports(reportsData || [])

      // Fetch CCTV Requests for this user
      try {
        let cctvQuery = supabase
          .from('cctv_footage_requests')
          .select('*')
          .order('created_at', { ascending: false })

        if (targetUserId) {
          cctvQuery = cctvQuery.eq('requester_user_id', targetUserId)
        }

        const { data: cctvData } = await cctvQuery
        setCctvRequests(cctvData || [])
      } catch (cctvErr) {
        console.warn('CCTV requests table not created yet:', cctvErr.message)
      }

    } catch (err) {
      console.error('Error loading incident data:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to load reports.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser) {
      const uId = currentUser.userID || currentUser.user_id || currentUser.id
      fetchData(uId)
    } else {
      fetchData()
    }
  }, [currentUser])

  // Filtered Students for Autocomplete
  const filteredStudentsForSearch = useMemo(() => {
    const q = studentSearchText.trim().toLowerCase()
    if (!q) return []
    return students.filter(s => {
      const fullName = `${s.user_nama_depan || ''} ${s.user_nama_belakang || ''}`.toLowerCase()
      return fullName.includes(q)
    }).slice(0, 10)
  }, [students, studentSearchText])

  // Filtered Reports Table
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports
    const q = searchQuery.toLowerCase()
    return reports.filter(r => {
      const titleMatch = (r.title || '').toLowerCase().includes(q)
      const recordMatch = (r.incident_record || '').toLowerCase().includes(q)
      const studentName = `${r.student?.user_nama_depan || ''} ${r.student?.user_nama_belakang || ''}`.toLowerCase()
      const studentMatch = studentName.includes(q)
      const incNumMatch = (r.incident_number || '').toLowerCase().includes(q)
      return titleMatch || recordMatch || studentMatch || incNumMatch
    })
  }, [reports, searchQuery])

  // Filtered CCTV Requests Table
  const filteredCctvRequests = useMemo(() => {
    if (!cctvSearchQuery.trim()) return cctvRequests
    const q = cctvSearchQuery.toLowerCase()
    return cctvRequests.filter(r => {
      const codeMatch = (r.request_number || '').toLowerCase().includes(q)
      const roomMatch = (r.room_name || '').toLowerCase().includes(q)
      const reasonMatch = (r.reason || '').toLowerCase().includes(q)
      return codeMatch || roomMatch || reasonMatch
    })
  }, [cctvRequests, cctvSearchQuery])

  // Handle Open Create Modal
  const handleOpenCreateModal = () => {
    setSelectedStudents([])
    setStudentSearchText('')
    setShowStudentDropdown(false)
    setFormData({
      title: '',
      place_of_incident: '',
      incident_date: getTodayDate(),
      incident_time: getCurrentTime(),
      incident_record: 'Level 1',
      description: '',
      action_taken: ''
    })
    setShowCreateModal(true)
  }

  // Open CCTV Request Modal (with optional prefill from an incident)
  const handleOpenCctvModal = (prefill = null) => {
    setCctvFormData({
      cctv_date: prefill?.incident_date || getTodayDate(),
      start_time: prefill?.incident_time || '08:00',
      end_time: '10:00',
      room_name: prefill?.place_of_incident || '',
      incident_report_id: prefill?.id ? String(prefill.id) : '',
      reason: prefill?.title ? `Reviewing CCTV footage for Incident #${prefill.incident_number || prefill.id}: ${prefill.title}` : ''
    })
    setShowCctvModal(true)
  }

  // Handle Submit CCTV Request
  const handleSubmitCctvRequest = async (e) => {
    e.preventDefault()
    if (!cctvFormData.cctv_date || !cctvFormData.start_time || !cctvFormData.end_time) {
      setNotif({ isOpen: true, title: 'Validation Error', message: 'Please specify the date, start time, and end time for CCTV footage.', type: 'error' })
      return
    }
    if (!cctvFormData.room_name.trim()) {
      setNotif({ isOpen: true, title: 'Validation Error', message: 'Please specify the requested room or location.', type: 'error' })
      return
    }
    if (!cctvFormData.reason.trim()) {
      setNotif({ isOpen: true, title: 'Validation Error', message: 'Please state the reason/purpose for requesting CCTV footage.', type: 'error' })
      return
    }

    try {
      setCctvSubmitting(true)
      const targetUserId = currentUser?.userID || currentUser?.user_id || currentUser?.id

      const dCode = cctvFormData.cctv_date.replace(/-/g, '')
      const seq = String((cctvRequests.length || 0) + 1).padStart(3, '0')
      const reqNumber = `CCTV/${dCode}/${seq}`

      const payload = {
        request_number: reqNumber,
        requester_user_id: targetUserId,
        incident_report_id: cctvFormData.incident_report_id ? parseInt(cctvFormData.incident_report_id) : null,
        cctv_date: cctvFormData.cctv_date,
        start_time: cctvFormData.start_time,
        end_time: cctvFormData.end_time,
        room_name: cctvFormData.room_name.trim(),
        reason: cctvFormData.reason.trim(),
        status: 'pending'
      }

      const { error } = await supabase.from('cctv_footage_requests').insert([payload])
      if (error) throw error

      // Trigger Email & Google Chat notifications
      try {
        const requesterFullName = `${currentUser?.user_nama_depan || ''} ${currentUser?.user_nama_belakang || ''}`.trim() || currentUser?.user_email || 'Staff'
        const matchedUnit = units.find(u => String(u.unit_id) === String(currentUser?.user_unit_id))
        const matchedIncident = reports.find(r => String(r.id) === String(cctvFormData.incident_report_id))

        fetch('/api/notifications/cctv-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestNumber: reqNumber,
            requesterUserId: targetUserId,
            requesterName: requesterFullName,
            cctvDate: cctvFormData.cctv_date,
            startTime: cctvFormData.start_time,
            endTime: cctvFormData.end_time,
            roomName: cctvFormData.room_name.trim(),
            reason: cctvFormData.reason.trim(),
            unitId: currentUser?.user_unit_id || currentUser?.unit_id,
            unitName: matchedUnit?.unit_name || null,
            incidentReportId: cctvFormData.incident_report_id ? parseInt(cctvFormData.incident_report_id) : null,
            incidentNumber: matchedIncident?.incident_number || null
          })
        }).catch(err => console.error('[CCTV Notification Trigger Error]:', err))
      } catch (notifErr) {
        console.warn('Failed to dispatch CCTV notification:', notifErr)
      }

      setShowCctvModal(false)
      setNotif({ isOpen: true, title: 'Request Submitted', message: `CCTV Footage Request (${reqNumber}) submitted successfully! Notifications sent.`, type: 'success' })
      setActiveTab('cctv')
      fetchData()
    } catch (err) {
      console.error('Error submitting CCTV request:', err)
      setNotif({ isOpen: true, title: 'Submission Error', message: err.message || 'Failed to submit CCTV request.', type: 'error' })
    } finally {
      setCctvSubmitting(false)
    }
  }

  // Student Autocomplete Selection
  const handleSelectStudent = (st) => {
    if (!selectedStudents.some(s => s.user_id === st.user_id)) {
      setSelectedStudents(prev => [...prev, st])
    }
    setStudentSearchText('')
    setShowStudentDropdown(false)
  }

  const handleRemoveStudent = (userId) => {
    setSelectedStudents(prev => prev.filter(s => s.user_id !== userId))
  }

  // Form Submission for New Incident
  const handleSubmitReport = async (e) => {
    e.preventDefault()

    if (selectedStudents.length === 0) {
      setNotif({ isOpen: true, title: 'Validation Error', message: 'Please select at least one student involved.', type: 'error' })
      return
    }
    if (!formData.title.trim()) {
      setNotif({ isOpen: true, title: 'Validation Error', message: 'Please enter the incident title.', type: 'error' })
      return
    }
    if (!formData.description.trim()) {
      setNotif({ isOpen: true, title: 'Validation Error', message: 'Please provide the incident description.', type: 'error' })
      return
    }

    try {
      setSubmitting(true)
      const primaryStudent = selectedStudents[0]
      const studentUnitId = primaryStudent.user_unit_id
      const reporterUserId = currentUser?.userID || currentUser?.user_id || currentUser?.id

      if (!studentUnitId) {
        throw new Error('Selected student does not have a unit assigned.')
      }

      const { data: uData } = await supabase
        .from('unit')
        .select('unit_name')
        .eq('unit_id', studentUnitId)
        .single()

      const uCode = (uData?.unit_name || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '')
      const dCode = formData.incident_date.replace(/-/g, '').substring(2)
      const seq = String((reports.length || 0) + 1).padStart(3, '0')
      const incidentNum = `INC/${uCode}/${dCode}/${seq}`

      const allStudentNames = selectedStudents
        .map(s => `${s.user_nama_depan || ''} ${s.user_nama_belakang || ''}`.trim())
        .filter(Boolean)
        .join(', ')

      let formattedDescription = formData.description.trim()
      if (formData.place_of_incident.trim()) {
        formattedDescription = `Place of Incident: ${formData.place_of_incident.trim()}\n` + formattedDescription
      }
      if (selectedStudents.length > 1) {
        formattedDescription = `All Involved Students: ${allStudentNames}\n` + formattedDescription
      }

      const payload = {
        incident_number: incidentNum,
        title: formData.title.trim(),
        student_user_id: primaryStudent.user_id,
        reporter_user_id: reporterUserId,
        unit_id: studentUnitId,
        incident_date: formData.incident_date,
        incident_time: formData.incident_time,
        incident_record: formData.incident_record.trim() || 'Level 1',
        description: formattedDescription,
        place_of_incident: formData.place_of_incident.trim() || null,
        action_taken: formData.action_taken.trim() || null,
        status: 'waiting'
      }

      const { data: created, error: createErr } = await supabase
        .from('incident_reports')
        .insert([payload])
        .select()
        .single()

      if (createErr) throw createErr

      try {
        const studentInserts = selectedStudents.map(st => ({
          incident_id: created.id,
          student_user_id: st.user_id
        }))
        await supabase.from('incident_report_students').insert(studentInserts)
      } catch (stErr) {
        console.warn('Could not insert to incident_report_students:', stErr)
      }

      try {
        await fetch('/api/notifications/incident-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'incident_created',
            incidentId: created.id,
            studentUserIds: selectedStudents.map(s => s.user_id),
            unitId: studentUnitId,
            title: formData.title.trim(),
            studentName: allStudentNames,
            placeOfIncident: formData.place_of_incident.trim() || '-',
            incidentDate: formData.incident_date,
            incidentTime: formData.incident_time,
            reporterName: currentUser ? `${currentUser.user_nama_depan || ''} ${currentUser.user_nama_belakang || ''}`.trim() : 'Staff'
          })
        })
      } catch (notifErr) {
        console.warn('Failed to send incident notifications:', notifErr)
      }

      setNotif({
        isOpen: true,
        title: 'Success',
        message: `Incident report ${incidentNum} created successfully! Notifications sent to unit recipients.`,
        type: 'success'
      })
      setShowCreateModal(false)
      setActiveTab('incidents')
      fetchData()

    } catch (err) {
      console.error('Submit report error:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to submit report.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedReportDetail, setSelectedReportDetail] = useState(null)
  const [detailFollowups, setDetailFollowups] = useState([])
  const [loadingFollowups, setLoadingFollowups] = useState(false)

  // Open Detail Modal
  const handleOpenDetailModal = async (report) => {
    setSelectedReportDetail(report)
    setShowDetailModal(true)
    setLoadingFollowups(true)
    try {
      const { data, error } = await supabase
        .from('incident_followups')
        .select('*, user:user_id(user_id, user_nama_depan, user_nama_belakang)')
        .eq('incident_id', report.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setDetailFollowups(data || [])
    } catch (err) {
      console.error('Fetch followups error:', err)
    } finally {
      setLoadingFollowups(false)
    }
  }

  // Prompt Delete Report
  const handlePromptDelete = (e, report) => {
    e.stopPropagation()
    setReportToDelete(report)
    setShowDeleteModal(true)
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!reportToDelete) return
    try {
      setDeleting(true)
      const { error } = await supabase
        .from('incident_reports')
        .delete()
        .eq('id', reportToDelete.id)

      if (error) throw error

      setNotif({ isOpen: true, title: 'Report Deleted', message: `Incident report ${reportToDelete.incident_number || `#${reportToDelete.id}`} has been removed.`, type: 'success' })
      setShowDeleteModal(false)
      setReportToDelete(null)
      fetchData()
    } catch (err) {
      console.error('Delete report error:', err)
      setNotif({ isOpen: true, title: 'Delete Error', message: err.message || 'Failed to delete report.', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  // Helper badge color for Level
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

  // Helper badge color for status
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

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans antialiased space-y-6" style={{ background: theme.pageBg, color: theme.textPrimary }}>

      {/* ─── Minimalist Editorial Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b" style={{ borderColor: theme.border }}>
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase mb-2" style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs" />
            <span>Incident & Security Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: theme.textPrimary }}>
            Student Incident & CCTV Requests
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: theme.textSecondary }}>
            Record, track, and manage student incident cases and CCTV footage requests.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenCctvModal(null)}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-sm bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]"
          >
            <FontAwesomeIcon icon={faVideo} className="text-xs text-white" />
            <span>Submit CCTV Request</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            style={btnPrimaryStyle}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span>New Incident Report</span>
          </button>
        </div>
      </div>

      {/* ─── Incident & CCTV Main Container Card with Integrated Tabs ─── */}
      <div className="rounded-lg border overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border }}>
        
        {/* Card Header Tab Navigation */}
        <div className="border-b overflow-x-auto" style={{ borderColor: theme.border }}>
          <div className="flex items-center">
            {/* Tab 1: Incident Reports */}
            <button
              type="button"
              onClick={() => setActiveTab('incidents')}
              className={`px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'incidents'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
              }`}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <span>Incident Reports</span>
              <span className="ml-1 px-2.5 py-0.5 text-[11px] rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold">
                {reports.length}
              </span>
            </button>

            {/* Tab 2: CCTV Footage Requests */}
            <button
              type="button"
              onClick={() => setActiveTab('cctv')}
              className={`px-5 py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'cctv'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
              }`}
            >
              <FontAwesomeIcon icon={faVideo} />
              <span>CCTV Footage Requests</span>
              <span className="ml-1 px-2.5 py-0.5 text-[11px] rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-extrabold">
                {cctvRequests.length}
              </span>
            </button>
          </div>
        </div>

        {/* Card Content Body */}
        <div className="p-4">
          
          {/* TAB 1: INCIDENT REPORTS LIST */}
          {activeTab === 'incidents' && (
            <div className="space-y-4">
              {/* Search Box */}
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: theme.textSecondary }} />
                <input
                  type="text"
                  placeholder="Search reported incidents by student name, title, or code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-md text-xs focus:outline-none transition-colors"
                  style={inputStyle}
                />
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs flex items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ color: theme.textPrimary }} />
                  <span>Loading incident reports...</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="py-12 text-center text-xs" style={{ color: theme.textSecondary }}>
                  No incident reports found matching your criteria.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] px-1" style={{ color: theme.textSecondary }}>
                    <span className="font-mono">Click any row to view complete incident details</span>
                    <span className="font-mono">Filtered: {filteredReports.length}</span>
                  </div>

                  <div className="overflow-x-auto rounded-md border" style={{ borderColor: theme.border }}>
                    <table className="min-w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-left border-b font-semibold uppercase tracking-wider text-[10px]" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                          <th className="py-3 px-4">Code / Title</th>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Unit</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Incident Level</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: theme.border }}>
                        {filteredReports.map(rep => {
                          const studentName = `${rep.student?.user_nama_depan || ''} ${rep.student?.user_nama_belakang || ''}`.trim() || 'Unknown Student'
                          const unitName = rep.unit?.unit_name || '-'

                          let locationDisplay = '-'
                          let extraStudentsCount = 0
                          let casePreview = ''
                          if (rep.description) {
                            if (rep.description.includes('Place of Incident:')) {
                              const matchLoc = rep.description.match(/Place of Incident:\s*([^\n]+)/)
                              if (matchLoc && matchLoc[1]) locationDisplay = matchLoc[1].trim()
                            }
                            if (rep.description.includes('All Involved Students:')) {
                              const matchSt = rep.description.match(/All Involved Students:\s*([^\n]+)/)
                              if (matchSt && matchSt[1]) {
                                const names = matchSt[1].split(',').map(n => n.trim()).filter(Boolean)
                                if (names.length > 1) extraStudentsCount = names.length - 1
                              }
                            }
                            casePreview = rep.description
                              .replace(/Place of Incident:[^\n]+\n?/g, '')
                              .replace(/All Involved Students:[^\n]+\n?/g, '')
                              .trim()
                          }

                          return (
                            <tr
                              key={rep.id}
                              onClick={() => handleOpenDetailModal(rep)}
                              className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <td className="py-3 px-4">
                                <div className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                                  {rep.incident_number || `#${rep.id}`}
                                </div>
                                <div className="font-medium truncate max-w-xs" style={{ color: theme.textPrimary }}>
                                  {rep.title}
                                </div>
                                {casePreview && (
                                  <div className="text-[10px] truncate max-w-xs mt-0.5 opacity-70" style={{ color: theme.textSecondary }}>
                                    {casePreview}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold flex items-center gap-1.5" style={{ color: theme.textPrimary }}>
                                  <span>{studentName}</span>
                                  {extraStudentsCount > 0 && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: theme.blueBg, color: theme.blueText }}>
                                      +{extraStudentsCount}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded text-[11px]" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                                  {unitName}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-medium" style={{ color: theme.textSecondary }}>
                                {locationDisplay}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]" style={{ color: theme.textSecondary }}>
                                <div>{rep.incident_date}</div>
                                <div className="text-[10px] opacity-75">{rep.incident_time}</div>
                              </td>
                              <td className="py-3 px-4">
                                {getLevelBadge(rep.incident_record)}
                              </td>
                              <td className="py-3 px-4">{getStatusBadge(rep.status)}</td>
                              <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                                {rep.status === 'waiting' ? (
                                  <button
                                    onClick={(e) => handlePromptDelete(e, rep)}
                                    className="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                                    style={{ background: theme.redBg, color: theme.redText, border: `1px solid ${theme.redBg}` }}
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                    <span>Delete</span>
                                  </button>
                                ) : (
                                  <span className="text-xs italic opacity-40">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CCTV FOOTAGE REQUESTS LIST */}
          {activeTab === 'cctv' && (
            <div className="space-y-4">
              {/* Search Box */}
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: theme.textSecondary }} />
                <input
                  type="text"
                  placeholder="Search CCTV requests by code, room, or purpose..."
                  value={cctvSearchQuery}
                  onChange={e => setCctvSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-md text-xs focus:outline-none transition-colors"
                  style={inputStyle}
                />
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs flex items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ color: theme.textPrimary }} />
                  <span>Loading CCTV requests...</span>
                </div>
              ) : filteredCctvRequests.length === 0 ? (
                <div className="py-12 text-center text-xs space-y-2" style={{ color: theme.textSecondary }}>
                  <FontAwesomeIcon icon={faFilm} className="text-3xl opacity-40" />
                  <p className="font-medium">No CCTV footage requests found.</p>
                  <button
                    onClick={() => handleOpenCctvModal(null)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                    <span>Submit First CCTV Request</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border" style={{ borderColor: theme.border }}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b text-[11px] font-semibold uppercase tracking-wider" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                        <th className="p-3">Request Code / Date</th>
                        <th className="p-3">Time & Requested Location</th>
                        <th className="p-3">Reason / Purpose</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Reviewer Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: theme.border }}>
                      {filteredCctvRequests.map((r) => (
                        <tr key={r.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-bold text-blue-600 dark:text-blue-400 font-mono">{r.request_number || `CCTV/#${r.id}`}</div>
                            <div className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>Date: {r.cctv_date}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold" style={{ color: theme.textPrimary }}>{r.room_name}</div>
                            <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{r.start_time} - {r.end_time}</div>
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="font-medium line-clamp-2" style={{ color: theme.textPrimary }}>{r.reason}</div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {getCctvStatusBadge(r.status)}
                          </td>
                          <td className="p-3">
                            {r.reviewer_notes ? (
                              <div className="text-[11px] font-medium p-2 rounded border max-w-xs bg-slate-50 dark:bg-slate-800/60" style={{ borderColor: theme.border, color: theme.textPrimary }}>
                                {r.reviewer_notes}
                              </div>
                            ) : (
                              <span className="text-[10px] italic" style={{ color: theme.textSecondary }}>No notes yet</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL 1: CREATE NEW INCIDENT REPORT ─── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Report New Student Incident"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
          
          {/* Incident Title */}
          <div>
            <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Incident Title <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              required
              placeholder="e.g., Fighting during recess, Damaged school property..."
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              style={inputStyle}
              className="w-full text-xs"
            />
          </div>

          {/* Student Autocomplete Selection */}
          <div className="relative" ref={studentDropdownRef}>
            <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Student(s) Involved <span className="text-red-500">*</span>
            </Label>
            
            {/* Selected Chips */}
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {selectedStudents.map(st => (
                  <span
                    key={st.user_id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border shadow-2xs"
                    style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textPrimary }}
                  >
                    <span>{st.user_nama_depan} {st.user_nama_belakang}</span>
                    <span className="text-[10px] opacity-75">({st.unit?.unit_name || 'Unit'})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(st.user_id)}
                      className="ml-1 hover:text-red-500 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.textSecondary }} />
              <Input
                type="text"
                placeholder="Type student name to search..."
                value={studentSearchText}
                onChange={e => {
                  setStudentSearchText(e.target.value)
                  setShowStudentDropdown(true)
                }}
                onFocus={() => setShowStudentDropdown(true)}
                style={inputStyle}
                className="pl-9 text-xs w-full"
              />
            </div>

            {/* Dropdown Options */}
            {showStudentDropdown && filteredStudentsForSearch.length > 0 && (
              <div
                className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border shadow-lg"
                style={{ background: theme.cardBg, borderColor: theme.border }}
              >
                {filteredStudentsForSearch.map(st => (
                  <div
                    key={st.user_id}
                    onClick={() => handleSelectStudent(st)}
                    className="p-2.5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between border-b last:border-b-0 text-xs"
                    style={{ borderColor: theme.border }}
                  >
                    <div>
                      <div className="font-semibold" style={{ color: theme.textPrimary }}>
                        {st.user_nama_depan} {st.user_nama_belakang}
                      </div>
                      <div className="text-[10px]" style={{ color: theme.textSecondary }}>{st.user_email || 'No Email'}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                      {st.unit?.unit_name || 'Unit'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date, Time, Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>Date *</Label>
              <Input
                type="date"
                required
                value={formData.incident_date}
                onChange={e => setFormData(p => ({ ...p, incident_date: e.target.value }))}
                style={inputStyle}
                className="w-full text-xs"
              />
            </div>

            <div>
              <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>Time *</Label>
              <Input
                type="time"
                required
                value={formData.incident_time}
                onChange={e => setFormData(p => ({ ...p, incident_time: e.target.value }))}
                style={inputStyle}
                className="w-full text-xs"
              />
            </div>

            <div>
              <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>Behavior Level *</Label>
              <select
                value={formData.incident_record}
                onChange={e => setFormData(p => ({ ...p, incident_record: e.target.value }))}
                style={selectStyle}
                className="w-full p-2 text-xs font-medium focus:outline-none"
              >
                <option value="Level 1">Level 1 (Minor Disruptions)</option>
                <option value="Level 2">Level 2 (Moderate Misbehavior)</option>
                <option value="Level 3">Level 3 (Major Violations)</option>
                <option value="Zero Tolerance">Zero Tolerance</option>
              </select>
            </div>
          </div>

          {/* Place of Incident */}
          <div>
            <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Place of Incident / Location
            </Label>
            <Input
              type="text"
              placeholder="e.g. Science Lab 2, Outdoor Canteen, Basketball Court..."
              value={formData.place_of_incident}
              onChange={e => setFormData(p => ({ ...p, place_of_incident: e.target.value }))}
              style={inputStyle}
              className="w-full text-xs"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Chronology / Description <span className="text-red-500">*</span>
            </Label>
            <textarea
              required
              rows={4}
              placeholder="Provide detailed description of what happened..."
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full p-2.5 text-xs rounded-md border resize-y focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Initial Action Taken */}
          <div>
            <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Initial Immediate Action Taken (Optional)
            </Label>
            <Input
              type="text"
              placeholder="e.g. Separated students, Sent to nurse, Called homeroom teacher..."
              value={formData.action_taken}
              onChange={e => setFormData(p => ({ ...p, action_taken: e.target.value }))}
              style={inputStyle}
              className="w-full text-xs"
            />
          </div>

          {/* Form Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
              style={btnSecondaryStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              style={btnPrimaryStyle}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Submitting...</span>
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 2: SUBMIT CCTV REQUEST MODAL ─── */}
      <Modal
        isOpen={showCctvModal}
        onClose={() => setShowCctvModal(false)}
        title="Request CCTV Footage Review"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitCctvRequest} className="space-y-4 text-xs">
          
          {/* Target Incident Selection */}
          <div>
            <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Link to Incident Report (Optional)
            </Label>
            <select
              value={cctvFormData.incident_report_id}
              onChange={e => {
                const incId = e.target.value
                const selectedInc = reports.find(r => String(r.id) === String(incId))
                setCctvFormData(p => ({
                  ...p,
                  incident_report_id: incId,
                  cctv_date: selectedInc?.incident_date || p.cctv_date,
                  start_time: selectedInc?.incident_time || p.start_time,
                  room_name: selectedInc?.place_of_incident || p.room_name,
                  reason: selectedInc ? `Reviewing CCTV footage for Incident #${selectedInc.incident_number || selectedInc.id}: ${selectedInc.title}` : p.reason
                }))
              }}
              style={selectStyle}
              className="w-full p-2 text-xs font-medium focus:outline-none"
            >
              <option value="">-- No Linked Incident (Standalone CCTV Request) --</option>
              {reports.map(r => (
                <option key={r.id} value={r.id}>
                  {r.incident_number || `#${r.id}`} — {r.title} ({r.incident_date})
                </option>
              ))}
            </select>
          </div>

          {/* Footage Date & Time */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>Footage Date *</Label>
              <Input
                type="date"
                required
                value={cctvFormData.cctv_date}
                onChange={e => setCctvFormData(p => ({ ...p, cctv_date: e.target.value }))}
                style={inputStyle}
                className="w-full text-xs"
              />
            </div>
            <div>
              <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>Start Time *</Label>
              <Input
                type="time"
                required
                value={cctvFormData.start_time}
                onChange={e => setCctvFormData(p => ({ ...p, start_time: e.target.value }))}
                style={inputStyle}
                className="w-full text-xs"
              />
            </div>
            <div>
              <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>End Time *</Label>
              <Input
                type="time"
                required
                value={cctvFormData.end_time}
                onChange={e => setCctvFormData(p => ({ ...p, end_time: e.target.value }))}
                style={inputStyle}
                className="w-full text-xs"
              />
            </div>
          </div>

          {/* Requested Room / Location */}
          <div>
            <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Requested Room / Location *
            </Label>
            <Input
              type="text"
              required
              placeholder="e.g. Science Lab 2, Main Gate, Secondary Hallway 2F..."
              value={cctvFormData.room_name}
              onChange={e => setCctvFormData(p => ({ ...p, room_name: e.target.value }))}
              style={inputStyle}
              className="w-full text-xs"
            />
          </div>

          {/* Reason / Purpose */}
          <div>
            <Label className="block text-xs font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Reason / Purpose for Request *
            </Label>
            <textarea
              required
              rows={3}
              placeholder="Describe why CCTV footage is required for investigation..."
              value={cctvFormData.reason}
              onChange={e => setCctvFormData(p => ({ ...p, reason: e.target.value }))}
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
              disabled={cctvSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-md cursor-pointer bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {cctvSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Submitting...</span>
                </>
              ) : (
                'Submit CCTV Request'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 3: INCIDENT REPORT DETAIL VIEW ─── */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedReportDetail ? `Incident Case: ${selectedReportDetail.incident_number || `#${selectedReportDetail.id}`}` : 'Incident Details'}
        maxWidth="max-w-2xl"
      >
        {selectedReportDetail && (() => {
          const studentName = `${selectedReportDetail.student?.user_nama_depan || ''} ${selectedReportDetail.student?.user_nama_belakang || ''}`.trim() || 'Student'
          const reporterName = `${selectedReportDetail.reporter?.user_nama_depan || ''} ${selectedReportDetail.reporter?.user_nama_belakang || ''}`.trim() || 'Staff'

          return (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg border space-y-2" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: theme.border }}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {selectedReportDetail.unit?.unit_name || 'Unit'}
                    </span>
                    <h3 className="text-sm font-bold mt-0.5" style={{ color: theme.textPrimary }}>{selectedReportDetail.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getLevelBadge(selectedReportDetail.incident_record)}
                    {getStatusBadge(selectedReportDetail.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
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
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{selectedReportDetail.incident_date} {selectedReportDetail.incident_time}</p>
                  </div>
                  <div>
                    <span style={{ color: theme.textSecondary }}>Location:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{selectedReportDetail.place_of_incident || '-'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t text-[11px]" style={{ borderColor: theme.border }}>
                  <span className="font-semibold block mb-0.5" style={{ color: theme.textPrimary }}>Chronology / Description:</span>
                  <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textSecondary }}>{selectedReportDetail.description}</p>
                </div>
              </div>

              {/* Action / Solution History */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider border-b pb-1" style={{ color: theme.textPrimary, borderColor: theme.border }}>
                  Investigation & Solution Logs ({detailFollowups.length})
                </h4>

                {loadingFollowups ? (
                  <div className="py-4 text-center text-xs" style={{ color: theme.textSecondary }}>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-1 text-blue-500" />
                    <span>Loading solution history...</span>
                  </div>
                ) : detailFollowups.length === 0 ? (
                  <div className="p-4 text-center border border-dashed rounded text-xs" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                    No solution logs recorded yet. Vice Principal / Handling staff will update investigation progress.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {detailFollowups.map(f => {
                      const actor = f.user ? `${f.user.user_nama_depan || ''} ${f.user.user_nama_belakang || ''}`.trim() : 'Staff'
                      return (
                        <div key={f.id} className="p-2.5 rounded border text-xs space-y-1" style={{ background: theme.cardBg, borderColor: theme.border }}>
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-blue-600 dark:text-blue-400">{actor}</span>
                            <span className="text-[10px] font-normal" style={{ color: theme.textSecondary }}>{f.followup_date} {f.followup_time}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textPrimary }}>{f.action_details}</p>
                          {f.attachment_url && (
                            <a href={f.attachment_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline block pt-1">
                              View Proof Attachment Image
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: theme.border }}>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    handleOpenCctvModal(selectedReportDetail)
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faVideo} className="text-[10px]" />
                  <span>Request CCTV for this Case</span>
                </button>

                <button
                  onClick={() => setShowDetailModal(false)}
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

      {/* ─── MODAL 4: DELETE CONFIRMATION MODAL ─── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete Incident Report"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p style={{ color: theme.textPrimary }}>
            Are you sure you want to delete incident report <strong>{reportToDelete?.incident_number || `#${reportToDelete?.id}`}</strong>?
          </p>
          <div className="p-3 rounded border text-[11px]" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
            <strong>Title:</strong> {reportToDelete?.title}<br />
            <strong>Date:</strong> {reportToDelete?.incident_date}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
              style={btnSecondaryStyle}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Report'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Notification Toast Modal */}
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
