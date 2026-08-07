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
  faArrowsLeftRight
} from '@fortawesome/free-solid-svg-icons'

export default function IncidentReportListPage() {
  const router = useRouter()
  const { theme } = useTheme()

  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }
  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }

  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [units, setUnits] = useState([])
  const [students, setStudents] = useState([])
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnitFilter, setSelectedUnitFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')

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

  // Load User Data & Initial Data
  useEffect(() => {
    let uId = null
    try {
      const raw = localStorage.getItem('user_data')
      if (raw) {
        const u = JSON.parse(raw)
        setCurrentUser(u)
        uId = u?.user_id || u?.id || null
      }
    } catch (e) {
      console.error('Failed to parse user_data:', e)
    }
    fetchData(uId)
  }, [])

  // Fetch Reports, Units, Students
  const fetchData = async (overrideUserId = null) => {
    try {
      setLoading(true)
      
      // Fetch Units
      const { data: unitsData } = await supabase
        .from('unit')
        .select('*')
        .eq('is_school', true)
        .order('unit_name')
      setUnits(unitsData || [])

      const unitMap = new Map((unitsData || []).map(u => [u.unit_id, u.unit_name]))

      // Fetch Students (role with is_student = true or role_name contains Student/Siswa)
      const { data: studentRoles } = await supabase
        .from('role')
        .select('role_id')
        .or('is_student.eq.true,role_name.ilike.%student%,role_name.ilike.%siswa%')

      const studentRoleIds = (studentRoles || []).map(r => r.role_id)

      let studentsQuery = supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_email, user_unit_id')
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

    } catch (err) {
      console.error('Error loading incident data:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to load incident reports', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Handle click outside autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(e.target)) {
        setShowStudentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtered Students for Autocomplete
  const matchingStudents = useMemo(() => {
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
      incident_record: '',
      description: '',
      action_taken: ''
    })
    setShowCreateModal(true)
  }

  // Generate Incident Number: INC/{UNIT}/{DDMMYY}/{SEQ} (e.g. INC/PYP/050826/001)
  const generateIncidentNumber = async (studentUnitId, incidentDate) => {
    const matchedUnit = units.find(u => String(u.unit_id) === String(studentUnitId))
    const unitCode = (matchedUnit?.unit_name || 'GEN').toUpperCase().replace(/\s+/g, '')

    let dateCode = ''
    if (incidentDate && incidentDate.includes('-')) {
      const parts = incidentDate.split('-') // [YYYY, MM, DD]
      if (parts.length === 3) {
        const yy = parts[0].slice(2)
        const mm = parts[1]
        const dd = parts[2]
        dateCode = `${dd}${mm}${yy}`
      }
    }
    if (!dateCode) {
      const d = new Date()
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yy = String(d.getFullYear()).slice(2)
      dateCode = `${dd}${mm}${yy}`
    }

    const { count } = await supabase
      .from('incident_reports')
      .select('id', { count: 'exact', head: true })
      .eq('incident_date', incidentDate)

    const nextSeq = String((count || 0) + 1).padStart(3, '0')
    return `INC/${unitCode}/${dateCode}/${nextSeq}`
  }

  // Handle Submit Form
  const handleSubmitReport = async (e) => {
    e.preventDefault()
    if (selectedStudents.length === 0) {
      setNotif({ isOpen: true, title: 'Validation', message: 'Please add at least one involved student.', type: 'warning' })
      return
    }
    if (!formData.title.trim()) {
      setNotif({ isOpen: true, title: 'Validation', message: 'Incident title is required.', type: 'warning' })
      return
    }
    if (!formData.description.trim()) {
      setNotif({ isOpen: true, title: 'Validation', message: 'Case description is required.', type: 'warning' })
      return
    }

    try {
      setSubmitting(true)
      const primaryStudent = selectedStudents[0]
      const studentUnitId = primaryStudent.user_unit_id || (units.length > 0 ? units[0].unit_id : null)
      const incidentNum = await generateIncidentNumber(studentUnitId, formData.incident_date)
      const rawKrId = typeof window !== 'undefined' ? localStorage.getItem('kr_id') : null
      const reporterUserId = (currentUser?.userID || currentUser?.user_id || currentUser?.id || rawKrId) 
        ? parseInt(currentUser?.userID || currentUser?.user_id || currentUser?.id || rawKrId) 
        : null

      const allStudentNames = selectedStudents
        .map(s => `${s.user_nama_depan || ''} ${s.user_nama_belakang || ''}`.trim())
        .filter(Boolean)
        .join(', ')

      let formattedDescription = formData.description.trim()
      if (formData.place_of_incident.trim()) {
        formattedDescription = `📍 Place of Incident: ${formData.place_of_incident.trim()}\n` + formattedDescription
      }
      if (selectedStudents.length > 1) {
        formattedDescription = `👥 All Involved Students: ${allStudentNames}\n` + formattedDescription
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

      // Insert junction records for all involved students
      try {
        const studentInserts = selectedStudents.map(st => ({
          incident_id: created.id,
          student_user_id: st.user_id
        }))
        await supabase.from('incident_report_students').insert(studentInserts)
      } catch (stErr) {
        console.warn('Could not insert to incident_report_students:', stErr)
      }

      // Trigger Email & Google Chat Notification
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
      console.error('Error loading detail followups:', err)
    } finally {
      setLoadingFollowups(false)
    }
  }

  // Handle Prompt Delete (Only for reports with status 'waiting')
  const handlePromptDelete = (e, report) => {
    e.stopPropagation() // Prevent triggering detail modal
    setReportToDelete(report)
    setShowDeleteModal(true)
  }

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!reportToDelete) return
    try {
      setDeleting(true)
      const { error } = await supabase
        .from('incident_reports')
        .delete()
        .eq('id', reportToDelete.id)

      if (error) throw error

      setNotif({ isOpen: true, title: 'Success', message: 'Incident report deleted successfully.', type: 'success' })
      setShowDeleteModal(false)
      setReportToDelete(null)
      fetchData()
    } catch (err) {
      console.error('Delete incident error:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to delete report.', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  // Helper badge for Behaviour Level
  const getLevelBadge = (level) => {
    switch (level) {
      case 'Level 1':
        return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Level 1</span>
      case 'Level 2':
        return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Level 2</span>
      case 'Level 3':
        return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">Level 3</span>
      case 'Zero Tolerance':
        return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Zero Tolerance</span>
      default:
        return <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-bold border" style={{ background: theme.subtleBg, color: theme.textSecondary, borderColor: theme.border }}>{level || 'Level 1'}</span>
    }
  }

  // Helper badge color for status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return <span className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ background: theme.yellowBg, color: theme.yellowText, borderColor: theme.border }}><FontAwesomeIcon icon={faClock} className="text-[10px]" /> Waiting</span>
      case 'on_progress':
        return <span className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ background: theme.blueBg, color: theme.blueText, borderColor: theme.border }}><FontAwesomeIcon icon={faHourglassHalf} className="text-[10px]" /> On Progress</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ background: theme.greenBg, color: theme.greenText, borderColor: theme.border }}><FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" /> Completed</span>
      default:
        return <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs border" style={{ background: theme.subtleBg, color: theme.textSecondary, borderColor: theme.border }}>{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500" />
            Student Incident Reports
          </h1>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
            Record, and track student incident cases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>New Incident Report</span>
          </Button>
        </div>
      </div>

      {/* Incident Reports Table */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardHeader className="pb-4 border-b space-y-3" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold" style={{ color: theme.textPrimary }}>Incident Reports List</CardTitle>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border" style={{ background: theme.subtleBg, color: theme.textSecondary, borderColor: theme.border }}>
              Total: {filteredReports.length}
            </span>
          </div>

          {/* Search Box right under title */}
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-gray-400 text-xs" />
            <Input
              type="text"
              placeholder="Search your reported incidents by student name, title, or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 text-xs w-full"
              style={inputStyle}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-12 text-center text-xs flex items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin />
              <span>Loading incident reports...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-xs" style={{ color: theme.textSecondary }}>
              No incident reports found matching your criteria.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] px-1" style={{ color: theme.textSecondary }}>
                <div className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                  <FontAwesomeIcon icon={faArrowsLeftRight} className="animate-pulse" />
                  <span>Scroll table horizontally to view all columns</span>
                </div>
                <span className="text-[10px] italic" style={{ color: theme.textSecondary }}>💡 Click any row to view incident details</span>
              </div>

              <div className="overflow-x-auto rounded-lg border [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-indigo-400/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-indigo-600" style={{ borderColor: theme.border }}>
                <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left border-b font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary, borderColor: theme.border }}>
                    <th className="py-3 px-3">Code / Title / Case Preview</th>
                    <th className="py-3 px-3">Student</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Incident Level</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
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
                      if (rep.description.includes('📍 Place of Incident:')) {
                        const matchLoc = rep.description.match(/📍 Place of Incident:\s*([^\n]+)/)
                        if (matchLoc && matchLoc[1]) locationDisplay = matchLoc[1].trim()
                      }
                      if (rep.description.includes('👥 All Involved Students:')) {
                        const matchSt = rep.description.match(/👥 All Involved Students:\s*([^\n]+)/)
                        if (matchSt && matchSt[1]) {
                          const names = matchSt[1].split(',').map(n => n.trim()).filter(Boolean)
                          if (names.length > 1) extraStudentsCount = names.length - 1
                        }
                      }
                      casePreview = rep.description
                        .replace(/📍 Place of Incident:[^\n]+\n?/, '')
                        .replace(/👥 All Involved Students:[^\n]+\n?/, '')
                        .trim()
                      if (casePreview.length > 55) casePreview = casePreview.substring(0, 55) + '...'
                    }

                    return (
                      <tr
                        key={rep.id}
                        onClick={() => handleOpenDetailModal(rep)}
                        className="cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                        style={{ borderColor: theme.border }}
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold hover:underline" style={{ color: theme.textPrimary }}>{rep.title}</div>
                          <div className="text-[10px]" style={{ color: theme.textSecondary }}>{rep.incident_number || `#${rep.id}`}</div>
                          {casePreview && (
                            <div className="text-[11px] text-gray-500 italic mt-0.5 line-clamp-1">
                              "{casePreview}"
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <span>{studentName}</span>
                            {extraStudentsCount > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800" title="Multiple students involved">
                                +{extraStudentsCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded font-medium border" style={{ background: theme.subtleBg, color: theme.textBody, borderColor: theme.border }}>
                            {unitName}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium" style={{ color: theme.textBody }}>
                          {locationDisplay}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap" style={{ color: theme.textBody }}>
                          <div>{rep.incident_date}</div>
                          <div className="text-[10px]" style={{ color: theme.textSecondary }}>{rep.incident_time}</div>
                        </td>
                        <td className="py-3 px-3">
                          {getLevelBadge(rep.incident_record)}
                        </td>
                        <td className="py-3 px-3">{getStatusBadge(rep.status)}</td>
                        <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                          {rep.status === 'waiting' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handlePromptDelete(e, rep)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900 text-xs px-2.5 py-1 flex items-center gap-1 ml-auto font-semibold"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                              <span>Delete</span>
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
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
        </CardContent>
      </Card>

      {/* Modal Form New Incident Report */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Student Incident Report"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
          {/* Incident Title */}
          <div>
            <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>
              Incident Title <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              required
              placeholder="Short summary title (e.g. Disrupted class during Math period)"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {/* Student Autocomplete Input & Selected Badges */}
          <div className="relative" ref={studentDropdownRef}>
            <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>
              Involved Students (Type to Autocomplete & Add) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Start typing student name to add..."
                value={studentSearchText}
                onChange={e => {
                  setStudentSearchText(e.target.value)
                  setShowStudentDropdown(true)
                }}
                onFocus={() => {
                  if (studentSearchText.trim()) setShowStudentDropdown(true)
                }}
                style={inputStyle}
              />
            </div>

            {/* Selected Students Pills */}
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedStudents.map(st => (
                  <span
                    key={st.user_id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  >
                    <FontAwesomeIcon icon={faUser} className="text-[10px]" />
                    <span>{`${st.user_nama_depan || ''} ${st.user_nama_belakang || ''}`.trim()} ({st.unit?.unit_name || 'Unit'})</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudents(prev => prev.filter(s => s.user_id !== st.user_id))}
                      className="hover:text-red-500 font-bold ml-1 text-xs"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Autocomplete Dropdown List */}
            {showStudentDropdown && studentSearchText.trim().length > 0 && (
              <div
                className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md shadow-lg border"
                style={{ background: theme.cardBg, borderColor: theme.border }}
              >
                {matchingStudents.length === 0 ? (
                  <div className="p-3 text-gray-400 italic text-center">No student found matching "{studentSearchText}"</div>
                ) : (
                  matchingStudents.map(st => {
                    const stName = `${st.user_nama_depan || ''} ${st.user_nama_belakang || ''}`.trim()
                    const isAlreadyAdded = selectedStudents.some(s => s.user_id === st.user_id)
                    return (
                      <div
                        key={st.user_id}
                        onClick={() => {
                          if (!isAlreadyAdded) {
                            setSelectedStudents(prev => [...prev, st])
                          }
                          setStudentSearchText('')
                          setShowStudentDropdown(false)
                        }}
                        className={`p-2.5 cursor-pointer flex items-center justify-between border-b last:border-b-0 transition-colors ${
                          isAlreadyAdded ? 'opacity-50 bg-gray-50 dark:bg-gray-800' : 'hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                        }`}
                        style={{ borderColor: theme.border }}
                      >
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faUser} className="text-indigo-500 text-xs" />
                          <span className="font-semibold" style={{ color: theme.textBody }}>
                            {stName} {isAlreadyAdded && '(Added)'}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                          {st.unit?.unit_name || 'Unit'}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Place of Incident */}
          <div>
            <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>
              Place of Incident
            </Label>
            <Input
              type="text"
              placeholder="e.g. School Canteen / Basketball Court / Classroom 4B"
              value={formData.place_of_incident}
              onChange={e => setFormData(p => ({ ...p, place_of_incident: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>
                Incident Date <span className="text-red-500">*</span>
              </Label>
              <input
                type="date"
                required
                value={formData.incident_date}
                onChange={e => setFormData(p => ({ ...p, incident_date: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-md focus:outline-none border font-medium cursor-pointer"
                style={inputStyle}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>
                Time of Incident <span className="text-red-500">*</span>
              </Label>
              <input
                type="time"
                required
                value={formData.incident_time}
                onChange={e => setFormData(p => ({ ...p, incident_time: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-md focus:outline-none border font-medium cursor-pointer"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Incident Level */}
          <div>
            <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>
              Incident Level <span className="text-red-500">*</span>
            </Label>
            <select
              required
              value={formData.incident_record}
              onChange={e => setFormData(p => ({ ...p, incident_record: e.target.value }))}
              className="w-full text-xs p-2.5 rounded-md focus:outline-none border font-semibold"
              style={selectStyle}
            >
              <option value="Level 1">Level 1</option>
              <option value="Level 2">Level 2</option>
              <option value="Level 3">Level 3</option>
              <option value="Zero Tolerance">Zero Tolerance</option>
            </select>
          </div>

          {/* Describe the Case */}
          <div>
            <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>
              Describe the Case <span className="text-red-500">*</span>
            </Label>
            <textarea
              required
              rows={4}
              placeholder="Describe in detail what happened during the incident..."
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full text-xs p-2.5 rounded-md focus:outline-none border"
              style={inputStyle}
            />
          </div>

          {/* Things Have Been Done by Teacher */}
          <div>
            <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>
              Things Have Been Done by Teacher
            </Label>
            <textarea
              rows={3}
              placeholder="Describe initial actions taken by teacher or staff in response..."
              value={formData.action_taken}
              onChange={e => setFormData(p => ({ ...p, action_taken: e.target.value }))}
              className="w-full text-xs p-2.5 rounded-md focus:outline-none border"
              style={inputStyle}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Submitting...
                </span>
              ) : (
                'Submit Incident Report'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Incident Detail & Timeline Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedReportDetail ? `Incident Details: ${selectedReportDetail.title}` : 'Incident Details'}
        maxWidth="max-w-3xl"
      >
        {selectedReportDetail && (() => {
          let allStudentsText = `${selectedReportDetail.student?.user_nama_depan || ''} ${selectedReportDetail.student?.user_nama_belakang || ''}`.trim() || 'Student'
          let locationText = selectedReportDetail.place_of_incident || '-'
          let cleanCaseDescription = selectedReportDetail.description || ''

          if (cleanCaseDescription.includes('👥 All Involved Students:')) {
            const matchSt = cleanCaseDescription.match(/👥 All Involved Students:\s*([^\n]+)/)
            if (matchSt && matchSt[1]) {
              allStudentsText = matchSt[1].trim()
            }
            cleanCaseDescription = cleanCaseDescription.replace(/👥 All Involved Students:[^\n]+\n?/, '')
          }
          if (cleanCaseDescription.includes('📍 Place of Incident:')) {
            const matchLoc = cleanCaseDescription.match(/📍 Place of Incident:\s*([^\n]+)/)
            if (matchLoc && matchLoc[1]) {
              locationText = matchLoc[1].trim()
            }
            cleanCaseDescription = cleanCaseDescription.replace(/📍 Place of Incident:[^\n]+\n?/, '')
          }
          cleanCaseDescription = cleanCaseDescription.trim()

          const reporterDisplayName = (() => {
            const r = selectedReportDetail.reporter
            if (r) {
              const full = `${r.user_nama_depan || ''} ${r.user_nama_belakang || ''}`.trim()
              if (full) return full
              if (r.user_email) return r.user_email.split('@')[0]
            }
            if (currentUser) {
              const fullCurr = `${currentUser.user_nama_depan || ''} ${currentUser.user_nama_belakang || ''}`.trim()
              if (fullCurr) return fullCurr
            }
            return 'Staff'
          })()

          return (
            <div className="space-y-5 text-xs">
              {/* Header Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                <div>
                  <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                    {selectedReportDetail.incident_number || `#${selectedReportDetail.id}`}
                  </span>
                  <div className="text-xs text-gray-400">
                    Reported by <strong>{reporterDisplayName}</strong> on {selectedReportDetail.created_at ? new Date(selectedReportDetail.created_at).toLocaleDateString('en-GB') : '-'}
                  </div>
                </div>
                <div>{getStatusBadge(selectedReportDetail.status)}</div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 rounded-lg border" style={{ background: theme.cardBgAlt, borderColor: theme.border }}>
                <div className="sm:col-span-2">
                  <div className="text-[10px] uppercase font-bold" style={{ color: theme.textSecondary }}>Involved Student(s)</div>
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-xs mt-0.5 flex items-start gap-1">
                    <FontAwesomeIcon icon={faUser} className="text-[10px] text-indigo-500 mt-0.5" />
                    <span>{allStudentsText}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold" style={{ color: theme.textSecondary }}>School Unit</div>
                  <div className="font-semibold text-xs mt-0.5 flex items-center gap-1" style={{ color: theme.textPrimary }}>
                    <FontAwesomeIcon icon={faBuilding} className="text-[10px] text-indigo-500" />
                    {selectedReportDetail.unit?.unit_name || '-'}
                  </div>
                  {locationText !== '-' && (
                    <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1">
                      📍 {locationText}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold" style={{ color: theme.textSecondary }}>Date & Time</div>
                  <div className="font-semibold text-xs mt-0.5 flex items-center gap-1" style={{ color: theme.textPrimary }}>
                    <FontAwesomeIcon icon={faCalendar} className="text-[10px] text-indigo-500" />
                    {selectedReportDetail.incident_date} ({selectedReportDetail.incident_time})
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold mb-1" style={{ color: theme.textSecondary }}>Incident Level</div>
                  <div>
                    {getLevelBadge(selectedReportDetail.incident_record)}
                  </div>
                </div>
              </div>

              {/* Description & Initial Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                  <div className="font-bold text-xs mb-1 text-red-600 dark:text-red-400">Describe the Case</div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: theme.textBody }}>
                    {cleanCaseDescription || 'No case description provided.'}
                  </p>
                </div>

                <div className="p-3 rounded-lg border" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                  <div className="font-bold text-xs mb-1 text-blue-600 dark:text-blue-400">Things Done by Teacher (Initial Action)</div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: theme.textBody }}>
                    {selectedReportDetail.action_taken || 'No initial action recorded.'}
                  </p>
                </div>
              </div>

            {/* Follow-up Timeline */}
            <div className="pt-2">
              <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                <FontAwesomeIcon icon={faClock} className="text-indigo-500" />
                <span>Follow-up & Resolution Timeline</span>
              </h4>

              {loadingFollowups ? (
                <div className="py-6 text-center text-xs flex items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Loading timeline...</span>
                </div>
              ) : detailFollowups.length === 0 ? (
                <div className="py-6 text-center text-xs border rounded-lg border-dashed" style={{ color: theme.textSecondary, borderColor: theme.border }}>
                  No data available for this report.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-500/30">
                  {detailFollowups.map((fol) => {
                    const handler = `${fol.user?.user_nama_depan || ''} ${fol.user?.user_nama_belakang || ''}`.trim() || 'Staff/Counselor'
                    return (
                      <div key={fol.id} className="relative">
                        <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-indigo-500/20" />
                        <div className="p-3 rounded-lg border space-y-1.5" style={{ background: theme.cardBgAlt, borderColor: theme.border }}>
                          <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: theme.border }}>
                            <div className="font-bold" style={{ color: theme.textPrimary }}>{handler}</div>
                            <div className="text-[10px]" style={{ color: theme.textSecondary }}>{fol.followup_date} at {fol.followup_time}</div>
                          </div>
                          <div className="text-xs leading-relaxed" style={{ color: theme.textBody }}>{fol.action_details}</div>
                          <div className="flex items-center justify-between text-[10px]" style={{ color: theme.textSecondary }}>
                            <span>Resulting Status:</span>
                            {getStatusBadge(fol.resulting_status)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )
      })()}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete Incident Report"
        maxWidth="max-w-md"
      >
        {reportToDelete && (
          <div className="space-y-4 text-xs">
            <p style={{ color: theme.textPrimary }}>
              Are you sure you want to delete incident report <strong>"{reportToDelete.title}"</strong> ({reportToDelete.incident_number || `#${reportToDelete.id}`})?
            </p>
            <p className="text-red-500 font-medium">
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
                {deleting ? (
                  <span className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Deleting...
                  </span>
                ) : (
                  'Yes, Delete'
                )}
              </Button>
            </div>
          </div>
        )}
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
