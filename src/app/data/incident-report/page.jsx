'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
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
  faTrash,
  faSliders,
  faSpinner,
  faCheckCircle,
  faHourglassHalf,
  faExternalLinkAlt,
  faBuilding,
  faVideo,
  faFilm,
  faCheckDouble,
  faTimesCircle,
  faLocationDot,
  faPaperclip,
  faImage
} from '@fortawesome/free-solid-svg-icons'

export default function IncidentReportListPage() {
  const router = useRouter()
  const { theme, isDark } = useTheme()
  const { t } = useI18n()

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
  const [cctvStatusFilter, setCctvStatusFilter] = useState('all')
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('all')

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

  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedReportDetail, setSelectedReportDetail] = useState(null)
  const [detailFollowups, setDetailFollowups] = useState([])
  const [loadingFollowups, setLoadingFollowups] = useState(false)

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

      // 1. Fetch School Units
      const { data: unitsData } = await supabase
        .from('unit')
        .select('*')
        .eq('is_school', true)
        .order('unit_name')
      setUnits(unitsData || [])
      const unitMap = new Map((unitsData || []).map(u => [u.unit_id, u.unit_name]))

      // 2. Fetch Room Master Data
      const { data: rData } = await supabase
        .from('room')
        .select('room_id, room_name, unit_id')
        .order('room_name')
      setRoomsList(rData || [])

      // 3. Fetch Students
      const { data: studentRoles } = await supabase
        .from('role')
        .select('role_id, role_name, is_student')
        .or('is_student.eq.true,role_name.eq.Student,role_name.eq.Siswa')

      const studentRoleIds = (studentRoles || []).map(r => r.role_id)

      let studentsQuery = supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_email, user_unit_id, user_role_id')
        .order('user_nama_depan')

      if (studentRoleIds.length > 0) {
        studentsQuery = studentsQuery.in('user_role_id', studentRoleIds)
      }

      const { data: rawStudents } = await studentsQuery
      const formattedStudents = (rawStudents || []).map(s => ({
        ...s,
        unit: { unit_id: s.user_unit_id, unit_name: unitMap.get(s.user_unit_id) || 'Unit' }
      }))
      setStudents(formattedStudents)

      // 4. Fetch Reports
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

      // 5. Fetch CCTV Requests for this user
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
        console.warn('CCTV requests query note:', cctvErr.message)
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

  // Summary Metrics
  const metrics = useMemo(() => {
    let waiting = 0
    let onProgress = 0
    let completed = 0

    reports.forEach(r => {
      if (r.status === 'waiting') waiting++
      else if (r.status === 'on_progress' || r.status === 'in_progress') onProgress++
      else if (r.status === 'completed') completed++
    })

    return { total: reports.length, waiting, onProgress, completed }
  }, [reports])

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
    return reports.filter(r => {
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'on_progress' || selectedStatusFilter === 'in_progress') {
          if (r.status !== 'on_progress' && r.status !== 'in_progress') return false
        } else if (r.status !== selectedStatusFilter) {
          return false
        }
      }
      if (selectedLevelFilter !== 'all' && r.incident_record !== selectedLevelFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = (r.title || '').toLowerCase().includes(q)
        const recordMatch = (r.incident_record || '').toLowerCase().includes(q)
        const studentName = `${r.student?.user_nama_depan || ''} ${r.student?.user_nama_belakang || ''}`.toLowerCase()
        const studentMatch = studentName.includes(q)
        const incNumMatch = (r.incident_number || '').toLowerCase().includes(q)
        return titleMatch || recordMatch || studentMatch || incNumMatch
      }
      return true
    })
  }, [reports, selectedStatusFilter, selectedLevelFilter, searchQuery])

  // Filtered CCTV Requests Table
  const filteredCctvRequests = useMemo(() => {
    return cctvRequests.filter(r => {
      if (cctvStatusFilter !== 'all' && r.status !== cctvStatusFilter) return false
      if (cctvSearchQuery.trim()) {
        const q = cctvSearchQuery.toLowerCase()
        const codeMatch = (r.request_number || '').toLowerCase().includes(q)
        const roomMatch = (r.room_name || '').toLowerCase().includes(q)
        const reasonMatch = (r.reason || '').toLowerCase().includes(q)
        return codeMatch || roomMatch || reasonMatch
      }
      return true
    })
  }, [cctvRequests, cctvStatusFilter, cctvSearchQuery])

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
      setNotif({ isOpen: true, title: 'Request Submitted', message: `CCTV Footage Request (${reqNumber}) submitted successfully!`, type: 'success' })
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
      const dateParts = (formData.incident_date || '').split('-')
      const dCode = dateParts.length === 3 
        ? `${dateParts[2]}${dateParts[1]}${dateParts[0].slice(2)}` 
        : formData.incident_date.replace(/-/g, '').substring(2)
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
        message: `Incident report ${incidentNum} created successfully! Notifications sent.`,
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

  // Open Detail Modal
  const handleOpenDetailModal = async (report) => {
    setSelectedReportDetail(report)
    setShowDetailModal(true)
    setLoadingFollowups(true)
    try {
      const { data, error } = await supabase
        .from('incident_followups')
        .select('*, user:users!user_id(user_id, user_nama_depan, user_nama_belakang)')
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
            <span className="font-semibold" style={{ color: theme.blueText }}>[INCIDENT REPORTS]</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: theme.textPrimary, letterSpacing: '-0.02em' }}>
            Student Incident & Security Portal
          </h1>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary, lineHeight: '1.6' }}>
            Record student disciplinary incidents, monitor resolution progress, and request CCTV footage reviews.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <button
            onClick={() => handleOpenCctvModal(null)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer"
            style={{
              background: theme.cardBg,
              borderColor: theme.border,
              color: theme.textPrimary,
              borderRadius: '4px'
            }}
          >
            <FontAwesomeIcon icon={faVideo} className="text-[10px]" />
            <span>Request CCTV</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer"
            style={{
              background: theme.textPrimary,
              color: isDark ? '#111111' : '#FFFFFF',
              borderRadius: '4px'
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
            <span>New Incident Report</span>
          </button>
        </div>
      </div>

      {/* Live Segmented Tabs */}
      <div className="flex items-center p-1 rounded border gap-1 self-start" style={{ background: theme.cardBg, borderColor: theme.border, width: 'fit-content' }}>
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
          <span>Incident Reports</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border }}>
            {reports.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cctv')}
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
            {cctvRequests.length}
          </span>
        </button>
      </div>

      {/* Bento Metric Cards (Only for Incidents Tab) */}
      {activeTab === 'incidents' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>// TOTAL SUBMISSIONS</span>
            <div className="text-2xl font-bold font-mono tracking-tight" style={{ color: theme.textPrimary }}>{metrics.total}</div>
            <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>Your recorded cases</span>
          </div>

          <div className="p-4 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1 text-[#956400]">// WAITING REVIEW</span>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#956400]">{metrics.waiting}</div>
            <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>Pending handler review</span>
          </div>

          <div className="p-4 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1 text-[#1F6C9F]">// IN PROGRESS</span>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1F6C9F]">{metrics.onProgress}</div>
            <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>Active follow-up logs</span>
          </div>

          <div className="p-4 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
            <span className="font-mono text-[10px] uppercase tracking-wider block mb-1 text-[#346538]">// COMPLETED</span>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#346538]">{metrics.completed}</div>
            <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>Case resolved</span>
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
                placeholder="Search incident number, student, title..."
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
                <span className="text-[10px] font-mono uppercase" style={{ color: theme.textSecondary }}>Level:</span>
                <select
                  value={selectedLevelFilter}
                  onChange={e => setSelectedLevelFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                >
                  <option value="all">All Levels</option>
                  <option value="Level 1">Level 1</option>
                  <option value="Level 2">Level 2</option>
                  <option value="Level 3">Level 3</option>
                  <option value="Zero Tolerance">Zero Tolerance</option>
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
                placeholder="Search CCTV code, room, reason..."
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
          </>
        )}
      </div>

      {/* Main Register Table */}
      <div className="rounded border overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
        {activeTab === 'incidents' ? (
          loading ? (
            <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-2" />
              <p className="text-xs font-mono">LOADING INCIDENT REPORTS...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
              <p className="text-xs font-mono">NO INCIDENT REPORTS RECORDED</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                    <th className="py-3 px-4">INCIDENT # / DATE</th>
                    <th className="py-3 px-4">STUDENT</th>
                    <th className="py-3 px-4">UNIT</th>
                    <th className="py-3 px-4">TITLE & VENUE</th>
                    <th className="py-3 px-4">LEVEL</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.border }}>
                  {filteredReports.map(rep => {
                    const studentName = `${rep.student?.user_nama_depan || ''} ${rep.student?.user_nama_belakang || ''}`.trim() || 'Student'
                    const unitName = rep.unit?.unit_name || '-'

                    let locationDisplay = '-'
                    let extraStudentsCount = 0
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
                    }

                    return (
                      <tr
                        key={rep.id}
                        onClick={() => handleOpenDetailModal(rep)}
                        className="transition-colors cursor-pointer"
                        style={{ background: 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold" style={{ color: theme.textPrimary }}>{rep.incident_number || `#${rep.id}`}</div>
                          <div className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{rep.incident_date} {rep.incident_time}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold flex items-center gap-1.5" style={{ color: theme.textPrimary }}>
                            <span>{studentName}</span>
                            {extraStudentsCount > 0 && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border, color: theme.blueText }}>
                                +{extraStudentsCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border, color: theme.textSecondary }}>{unitName}</span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium truncate" style={{ color: theme.textPrimary }}>{rep.title}</div>
                          <div className="text-[10px] font-mono truncate" style={{ color: theme.textSecondary }}>{locationDisplay !== '-' ? locationDisplay : (rep.place_of_incident || '-')}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getLevelBadge(rep.incident_record)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(rep.status)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenDetailModal(rep)}
                              className="px-2.5 py-1 text-xs font-semibold rounded border transition-colors cursor-pointer"
                              style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                            >
                              <FontAwesomeIcon icon={faEye} className="mr-1 text-[10px]" />
                              View
                            </button>
                            {rep.status === 'waiting' && (
                              <button
                                onClick={e => handlePromptDelete(e, rep)}
                                className="w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer"
                                style={{ background: isDark ? '#3A1E1E' : '#FDEBEC', color: isDark ? '#DC8585' : '#9F2F2D', border: `1px solid ${theme.border}`, borderRadius: '4px' }}
                                title="Delete Report"
                              >
                                <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
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
          loading ? (
            <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-2" />
              <p className="text-xs font-mono">LOADING CCTV REQUESTS...</p>
            </div>
          ) : filteredCctvRequests.length === 0 ? (
            <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
              <p className="text-xs font-mono">NO CCTV REQUESTS RECORDED</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                    <th className="py-3 px-4">REQUEST CODE / DATE</th>
                    <th className="py-3 px-4">TIME & ROOM</th>
                    <th className="py-3 px-4">REASON</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">REVIEWER NOTES</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.border }}>
                  {filteredCctvRequests.map(r => (
                    <tr key={r.id} className="transition-colors" style={{ background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold" style={{ color: theme.blueText }}>{r.request_number || `CCTV/#${r.id}`}</div>
                        <div className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{r.cctv_date}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold" style={{ color: theme.textPrimary }}>{r.room_name}</div>
                        <div className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{r.start_time} - {r.end_time}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium truncate" style={{ color: theme.textPrimary }}>{r.reason}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getCctvStatusBadge(r.status)}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {r.reviewer_notes ? (
                          <div className="text-[11px] font-mono p-1.5 rounded border" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textPrimary }}>
                            {r.reviewer_notes}
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>Pending review</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* MODAL 1: CREATE NEW INCIDENT REPORT */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Report New Student Incident"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitReport} className="space-y-3.5 text-xs" style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}>
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Incident Title *</label>
            <input
              type="text"
              required
              placeholder="e.g., Physical altercation during break, Damaged library asset..."
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs rounded border outline-none"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            />
          </div>

          {/* Student Autocomplete Selection */}
          <div className="relative" ref={studentDropdownRef}>
            <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Student(s) Involved *</label>
            
            {/* Selected Chips */}
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {selectedStudents.map(st => (
                  <span
                    key={st.user_id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] border"
                    style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textPrimary }}
                  >
                    <span>{st.user_nama_depan} {st.user_nama_belakang}</span>
                    <span className="opacity-60">({st.unit?.unit_name || 'Unit'})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(st.user_id)}
                      className="ml-1 hover:text-red-500 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              <input
                type="text"
                placeholder="Type student name to search..."
                value={studentSearchText}
                onChange={e => {
                  setStudentSearchText(e.target.value)
                  setShowStudentDropdown(true)
                }}
                onFocus={() => setShowStudentDropdown(true)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded border outline-none"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
              />
            </div>

            {/* Dropdown Options */}
            {showStudentDropdown && filteredStudentsForSearch.length > 0 && (
              <div
                className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded border shadow-xl"
                style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '4px' }}
              >
                {filteredStudentsForSearch.map(st => (
                  <div
                    key={st.user_id}
                    onClick={() => handleSelectStudent(st)}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between border-b last:border-b-0 text-xs"
                    style={{ borderColor: theme.border }}
                  >
                    <div>
                      <span className="font-semibold block" style={{ color: theme.textPrimary }}>
                        {st.user_nama_depan} {st.user_nama_belakang}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{st.user_email || 'No email'}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                      {st.unit?.unit_name || 'Unit'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Incident Date *</label>
              <input
                type="date"
                required
                value={formData.incident_date}
                onChange={e => setFormData(p => ({ ...p, incident_date: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Incident Time *</label>
              <input
                type="time"
                required
                value={formData.incident_time}
                onChange={e => setFormData(p => ({ ...p, incident_time: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Behavior Level *</label>
              <select
                value={formData.incident_record}
                onChange={e => setFormData(p => ({ ...p, incident_record: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded border outline-none cursor-pointer"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
              >
                <option value="Level 1">Level 1</option>
                <option value="Level 2">Level 2</option>
                <option value="Level 3">Level 3</option>
                <option value="Zero Tolerance">Zero Tolerance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Place / Location</label>
            <input
              type="text"
              placeholder="e.g. Science Lab 2, Canteen, Basketball Court..."
              value={formData.place_of_incident}
              onChange={e => setFormData(p => ({ ...p, place_of_incident: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs rounded border outline-none"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Chronology / Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Detail what happened leading up to and during the incident..."
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full p-2.5 text-xs rounded border outline-none resize-y"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Initial Immediate Action Taken (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Separated students, escorted to medical room, notified homeroom teacher..."
              value={formData.action_taken}
              onChange={e => setFormData(p => ({ ...p, action_taken: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs rounded border outline-none"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer"
              style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              style={{ background: theme.textPrimary, color: isDark ? '#111111' : '#FFFFFF', borderRadius: '4px' }}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Submitting...</span>
                </>
              ) : (
                'Submit Incident Report'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: SUBMIT CCTV REQUEST MODAL */}
      <Modal
        isOpen={showCctvModal}
        onClose={() => setShowCctvModal(false)}
        title="Request CCTV Footage Review"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitCctvRequest} className="space-y-3 text-xs" style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}>
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Link to Incident Report (Optional)</label>
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
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded border outline-none cursor-pointer"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            >
              <option value="">-- No Linked Incident (Standalone CCTV Request) --</option>
              {reports.map(r => (
                <option key={r.id} value={r.id}>
                  {r.incident_number || `#${r.id}`} — {r.title} ({r.incident_date})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Footage Date *</label>
              <input
                type="date"
                required
                value={cctvFormData.cctv_date}
                onChange={e => setCctvFormData(p => ({ ...p, cctv_date: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Start Time *</label>
              <input
                type="time"
                required
                value={cctvFormData.start_time}
                onChange={e => setCctvFormData(p => ({ ...p, start_time: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>End Time *</label>
              <input
                type="time"
                required
                value={cctvFormData.end_time}
                onChange={e => setCctvFormData(p => ({ ...p, end_time: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Requested Room / Camera Location *</label>
            <input
              type="text"
              required
              placeholder="e.g. Science Lab 2, Corridor 3F, Cafeteria..."
              value={cctvFormData.room_name}
              onChange={e => setCctvFormData(p => ({ ...p, room_name: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs rounded border outline-none"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase block mb-1" style={{ color: theme.textSecondary }}>Reason / Purpose *</label>
            <textarea
              required
              rows={3}
              placeholder="State the justification and context for reviewing camera footage..."
              value={cctvFormData.reason}
              onChange={e => setCctvFormData(p => ({ ...p, reason: e.target.value }))}
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
              disabled={cctvSubmitting}
              className="px-4 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              style={{ background: theme.textPrimary, color: isDark ? '#111111' : '#FFFFFF', borderRadius: '4px' }}
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

      {/* MODAL 3: INCIDENT REPORT DETAIL VIEW */}
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
            <div className="space-y-3.5 text-xs" style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}>
              <div className="p-3 rounded border space-y-2" style={{ background: theme.subtleBg, borderColor: theme.border, borderRadius: '6px' }}>
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: theme.border }}>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: theme.blueText }}>
                      {selectedReportDetail.unit?.unit_name || 'Unit'}
                    </span>
                    <h3 className="text-sm font-bold mt-0.5" style={{ color: theme.textPrimary }}>{selectedReportDetail.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getLevelBadge(selectedReportDetail.incident_record)}
                    {getStatusBadge(selectedReportDetail.status)}
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
                    <p className="font-mono font-semibold" style={{ color: theme.textPrimary }}>{selectedReportDetail.incident_date} {selectedReportDetail.incident_time}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono block" style={{ color: theme.textSecondary }}>LOCATION:</span>
                    <p className="font-semibold" style={{ color: theme.textPrimary }}>{selectedReportDetail.place_of_incident || '-'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t text-[11px]" style={{ borderColor: theme.border }}>
                  <span className="text-[10px] font-mono font-semibold block mb-0.5" style={{ color: theme.textSecondary }}>CHRONOLOGY / CASE DESCRIPTION:</span>
                  <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textPrimary }}>{selectedReportDetail.description}</p>
                </div>
              </div>

              {/* Action / Solution History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-1" style={{ borderColor: theme.border }}>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                    // INVESTIGATION & SOLUTION LOGS
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border }}>
                    {detailFollowups.length}
                  </span>
                </div>

                {loadingFollowups ? (
                  <div className="py-4 text-center text-xs" style={{ color: theme.textSecondary }}>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-1.5" />
                    <span className="font-mono text-[10px]">LOADING LOGS...</span>
                  </div>
                ) : detailFollowups.length === 0 ? (
                  <div className="p-4 text-center border border-dashed rounded text-xs" style={{ borderColor: theme.border, color: theme.textSecondary, borderRadius: '6px' }}>
                    <p className="font-mono text-[11px]">No solution logs recorded yet.</p>
                    <p className="text-[10px] mt-0.5 opacity-75">Vice Principal / Handling staff will update investigation progress.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {detailFollowups.map(f => {
                      const actor = f.user ? `${f.user.user_nama_depan || ''} ${f.user.user_nama_belakang || ''}`.trim() : 'Staff'
                      return (
                        <div key={f.id} className="p-2.5 rounded border text-xs space-y-1" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '4px' }}>
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-blue-600 dark:text-blue-400">{actor}</span>
                            <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{f.followup_date} {f.followup_time}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed" style={{ color: theme.textPrimary }}>{f.action_details}</p>
                          {f.attachment_url && (
                            <a href={f.attachment_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono underline hover:text-blue-500 block pt-1" style={{ color: theme.blueText }}>
                              View Attachment Image
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
                  className="px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
                >
                  <FontAwesomeIcon icon={faVideo} className="text-[10px]" />
                  <span>Request CCTV for Case</span>
                </button>

                <button
                  onClick={() => setShowDetailModal(false)}
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

      {/* MODAL 4: DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete Incident Report"
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5 text-xs" style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}>
          <div className="p-3.5 rounded border flex items-start gap-3" style={{ background: isDark ? '#3A1E1E' : '#FDEBEC', borderColor: theme.border, borderRadius: '6px' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-sm mt-0.5" style={{ color: isDark ? '#DC8585' : '#9F2F2D' }} />
            <div>
              <h4 className="font-bold uppercase font-mono tracking-wider" style={{ color: isDark ? '#DC8585' : '#9F2F2D' }}>
                Confirm Deletion
              </h4>
              <p className="mt-1 leading-relaxed" style={{ color: theme.textPrimary }}>
                Are you sure you want to remove report <strong>{reportToDelete?.incident_number || `#${reportToDelete?.id}`}</strong>?
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer"
              style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              style={{ background: isDark ? '#3A1E1E' : '#FDEBEC', color: isDark ? '#DC8585' : '#9F2F2D', border: `1px solid ${theme.border}`, borderRadius: '4px' }}
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
