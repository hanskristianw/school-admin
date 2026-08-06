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
  faTrash
} from '@fortawesome/free-solid-svg-icons'

export default function IncidentHandlingApprovalPage() {
  const router = useRouter()
  const { theme } = useTheme()

  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }
  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }

  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [units, setUnits] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnitFilter, setSelectedUnitFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')

  // Notification Toast
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })

  // Solution Handling Modal State
  const [showHandlingModal, setShowHandlingModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [followups, setFollowups] = useState([])
  const [loadingFollowups, setLoadingFollowups] = useState(false)

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

  // Fetch Current Logged-in User
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_data')
      if (raw) setCurrentUser(JSON.parse(raw))
    } catch (e) {
      console.error('User data parse error:', e)
    }
  }, [])

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

      // Fetch All Incident Reports (For handling staff)
      const { data: reportsData, error: repErr } = await supabase
        .from('incident_reports')
        .select(`
          *,
          student:student_user_id(user_id, user_nama_depan, user_nama_belakang),
          reporter:reporter_user_id(user_id, user_nama_depan, user_nama_belakang, user_email),
          unit:unit_id(unit_id, unit_name)
        `)
        .order('created_at', { ascending: false })

      if (repErr) throw repErr
      setReports(reportsData || [])

    } catch (err) {
      console.error('Error fetching incident reports for handling:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to load incident reports', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Summary Metrics
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

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Unit Filter
      if (selectedUnitFilter !== 'all' && String(r.unit_id) !== String(selectedUnitFilter)) {
        return false
      }
      // Status Filter
      if (selectedStatusFilter !== 'all' && r.status !== selectedStatusFilter) {
        return false
      }
      // Search Query
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
  }, [reports, selectedUnitFilter, selectedStatusFilter, searchQuery])

  // Helper badge for Behaviour Level
  const getLevelBadge = (level) => {
    switch (level) {
      case 'Level 1':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Level 1</span>
      case 'Level 2':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Level 2</span>
      case 'Level 3':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">Level 3</span>
      case 'Zero Tolerance':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Zero Tolerance</span>
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border" style={{ background: theme.subtleBg, color: theme.textSecondary, borderColor: theme.border }}>{level || 'Level 1'}</span>
    }
  }

  // Helper badge color for status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ background: theme.yellowBg, color: theme.yellowText, borderColor: theme.border }}><FontAwesomeIcon icon={faClock} className="text-[10px]" /> Waiting</span>
      case 'on_progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ background: theme.blueBg, color: theme.blueText, borderColor: theme.border }}><FontAwesomeIcon icon={faHourglassHalf} className="text-[10px]" /> On Progress</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ background: theme.greenBg, color: theme.greenText, borderColor: theme.border }}><FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" /> Completed</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs border" style={{ background: theme.subtleBg, color: theme.textSecondary, borderColor: theme.border }}>{status}</span>
    }
  }

  // Open Handling Modal
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

  // Handle Submit Followup Solution
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
        user_id: currentUser.user_id || currentUser.id,
        followup_date: followupForm.followup_date,
        followup_time: followupForm.followup_time,
        location: followupForm.location.trim() || null,
        action_details: followupForm.action_details.trim(),
        resulting_status: followupForm.resulting_status,
        attachment_url: attachmentUrl
      }

      // Insert Followup Entry
      const { data: createdFol, error: folErr } = await supabase
        .from('incident_followups')
        .insert([payload])
        .select()
        .single()

      if (folErr) throw folErr

      // Update Incident Status
      const { error: upErr } = await supabase
        .from('incident_reports')
        .update({
          status: followupForm.resulting_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id)

      if (upErr) throw upErr

      // Send Email & Google Chat Notification
      try {
        let allInvolvedStudents = `${selectedReport.student?.user_nama_depan || ''} ${selectedReport.student?.user_nama_belakang || ''}`.trim() || 'Student'
        if (selectedReport.description?.includes('👥 All Involved Students:')) {
          const matchSt = selectedReport.description.match(/👥 All Involved Students:\s*([^\n]+)/)
          if (matchSt && matchSt[1]) {
            allInvolvedStudents = matchSt[1].trim()
          }
        }

        const handlerFullName = currentUser 
          ? `${currentUser.user_nama_depan || currentUser.namaDepan || ''} ${currentUser.user_nama_belakang || currentUser.namaBelakang || ''}`.trim() 
          : 'Staff/Counselor'

        await fetch('/api/notifications/incident-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'followup_added',
            incidentId: selectedReport.id,
            followupId: createdFol?.id,
            studentName: allInvolvedStudents,
            unitId: selectedReport.unit_id,
            actionDetails: followupForm.action_details.trim(),
            resultingStatus: followupForm.resulting_status,
            location: followupForm.location.trim(),
            followupDate: followupForm.followup_date,
            handlerName: handlerFullName || 'Staff/Counselor',
            attachmentUrl: attachmentUrl
          })
        })
      } catch (notifErr) {
        console.warn('Follow-up notification trigger failed:', notifErr)
      }

      // Refresh followups list and clear form
      setFollowups(prev => [...prev, createdFol || payload])
      setSelectedFile(null)
      setFilePreview('')
      setFollowupForm(p => ({
        ...p,
        action_details: '',
        location: ''
      }))

      setNotif({ isOpen: true, title: 'Success', message: 'Solution & follow-up recorded successfully!', type: 'success' })
      fetchData()
    } catch (err) {
      console.error('Submit followup error:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to save solution', type: 'error' })
    } finally {
      setSubmittingFollowup(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
            <FontAwesomeIcon icon={faClipboardCheck} className="text-indigo-600" />
            Incident Report Handling & Solutions
          </h1>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
            Review incoming student incident reports, record follow-up solutions, and manage resolution statuses.
          </p>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-gray-400" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <div className="text-xs font-bold uppercase" style={{ color: theme.textSecondary }}>Total Reports</div>
          <div className="text-2xl font-extrabold mt-1" style={{ color: theme.textPrimary }}>{metrics.total}</div>
        </Card>
        
        <Card className="p-4 border-l-4 border-l-amber-500 border" style={{ background: theme.yellowBg, borderColor: theme.border }}>
          <div className="text-xs font-bold uppercase flex items-center justify-between" style={{ color: theme.yellowText }}>
            <span>Needs Action / Waiting</span>
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div className="text-2xl font-extrabold mt-1" style={{ color: theme.yellowText }}>{metrics.waiting}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500 border" style={{ background: theme.blueBg, borderColor: theme.border }}>
          <div className="text-xs font-bold uppercase flex items-center justify-between" style={{ color: theme.blueText }}>
            <span>On Progress</span>
            <FontAwesomeIcon icon={faHourglassHalf} />
          </div>
          <div className="text-2xl font-extrabold mt-1" style={{ color: theme.blueText }}>{metrics.onProgress}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500 border" style={{ background: theme.greenBg, borderColor: theme.border }}>
          <div className="text-xs font-bold uppercase flex items-center justify-between" style={{ color: theme.greenText }}>
            <span>Completed</span>
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="text-2xl font-extrabold mt-1" style={{ color: theme.greenText }}>{metrics.completed}</div>
        </Card>
      </div>

      {/* Filter Controls Card */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-gray-400 text-xs" />
              <Input
                type="text"
                placeholder="Search student, title, code, reporter..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 text-xs"
                style={inputStyle}
              />
            </div>

            {/* Unit Filter */}
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBuilding} className="text-gray-400 text-xs" />
              <select
                value={selectedUnitFilter}
                onChange={e => setSelectedUnitFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-md focus:outline-none border"
                style={selectStyle}
              >
                <option value="all">All Units</option>
                {units.map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faFilter} className="text-gray-400 text-xs" />
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-md focus:outline-none border font-semibold"
                style={selectStyle}
              >
                <option value="all">All Statuses</option>
                <option value="waiting">Waiting Solution (Needs Action)</option>
                <option value="on_progress">On Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardHeader className="pb-3 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold" style={{ color: theme.textPrimary }}>Incoming Incident Reports</CardTitle>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border" style={{ background: theme.subtleBg, color: theme.textSecondary, borderColor: theme.border }}>
              Filtered Total: {filteredReports.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-12 text-center text-xs flex items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin />
              <span>Loading incoming incident reports...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-xs" style={{ color: theme.textSecondary }}>
              No incident reports found for the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left border-b font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary, borderColor: theme.border }}>
                    <th className="py-3 px-3">Code / Title / Case Preview</th>
                    <th className="py-3 px-3">Student</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Incident Level</th>
                    <th className="py-3 px-3">Reported By</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.border }}>
                  {filteredReports.map(rep => {
                    const studentName = `${rep.student?.user_nama_depan || ''} ${rep.student?.user_nama_belakang || ''}`.trim() || 'Unknown Student'
                    const reporterName = `${rep.reporter?.user_nama_depan || ''} ${rep.reporter?.user_nama_belakang || ''}`.trim() || 'Staff'
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
                      <tr key={rep.id} className="transition-colors" style={{ borderColor: theme.border }}>
                        <td className="py-3 px-3">
                          <div className="font-bold" style={{ color: theme.textPrimary }}>{rep.title}</div>
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
                        <td className="py-3 px-3" style={{ color: theme.textBody }}>{reporterName}</td>
                        <td className="py-3 px-3">{getStatusBadge(rep.status)}</td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleOpenHandlingModal(rep)}
                            className={`text-xs px-2.5 py-1 flex items-center gap-1 ml-auto font-semibold ${
                              rep.status === 'waiting'
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            <FontAwesomeIcon icon={faEye} />
                            <span>{rep.status === 'waiting' ? 'Add Solution' : 'View & Update'}</span>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incident Handling & Solution Modal */}
      <Modal
        isOpen={showHandlingModal}
        onClose={() => setShowHandlingModal(false)}
        title={selectedReport ? `Incident Handling: ${selectedReport.title}` : 'Incident Handling'}
        maxWidth="max-w-4xl"
      >
        {selectedReport && (() => {
          let allStudentsText = `${selectedReport.student?.user_nama_depan || ''} ${selectedReport.student?.user_nama_belakang || ''}`.trim() || 'Student'
          let locationText = selectedReport.place_of_incident || '-'
          let cleanCaseDescription = selectedReport.description || ''

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
            const r = selectedReport.reporter
            if (r) {
              const full = `${r.user_nama_depan || ''} ${r.user_nama_belakang || ''}`.trim()
              if (full) return full
              if (r.user_email) return r.user_email.split('@')[0]
            }
            if (currentUser) {
              const cFull = `${currentUser.namaDepan || currentUser.user_nama_depan || ''} ${currentUser.namaBelakang || currentUser.user_nama_belakang || ''}`.trim()
              if (cFull) return cFull
              if (currentUser.username) return currentUser.username
            }
            return 'Staff'
          })()

          return (
            <div className="space-y-5 text-xs">
              {/* Header Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                <div>
                  <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                    {selectedReport.incident_number || `#${selectedReport.id}`}
                  </span>
                  <div className="text-xs text-gray-400">
                    Reported by <strong>{reporterDisplayName}</strong> on {selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleDateString('en-GB') : '-'}
                  </div>
                </div>
                <div>{getStatusBadge(selectedReport.status)}</div>
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
                    {selectedReport.unit?.unit_name || '-'}
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
                    <span>
                      {selectedReport.incident_date ? selectedReport.incident_date.split('-').reverse().join('/') : '-'}
                      {selectedReport.incident_time ? ` • ${selectedReport.incident_time.slice(0, 5)}` : ''}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold mb-1" style={{ color: theme.textSecondary }}>Incident Level</div>
                  <div>
                    {getLevelBadge(selectedReport.incident_record)}
                  </div>
                </div>
              </div>

              {/* Case Description & Initial Action */}
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
                    {selectedReport.action_taken || 'No initial action recorded.'}
                  </p>
                </div>
              </div>

            {/* Two Section Layout: Timeline History & Add Solution Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Left Column: Follow-up Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <FontAwesomeIcon icon={faClock} className="text-indigo-500" />
                  <span>Timeline History</span>
                </h4>

                {loadingFollowups ? (
                  <div className="py-6 text-center text-xs flex items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <span>Loading timeline...</span>
                  </div>
                ) : followups.length === 0 ? (
                  <div className="py-6 text-center text-xs border rounded-lg border-dashed" style={{ color: theme.textSecondary, borderColor: theme.border }}>
                    No follow-up actions logged yet.
                  </div>
                ) : (
                  <div className="relative pl-5 space-y-3 max-h-64 overflow-y-auto pr-1 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-500/30">
                    {followups.map((fol) => {
                      const handler = `${fol.user?.user_nama_depan || ''} ${fol.user?.user_nama_belakang || ''}`.trim() || 'Staff/Counselor'
                      const folDate = fol.followup_date ? fol.followup_date.split('-').reverse().join('/') : ''
                      return (
                        <div key={fol.id} className="relative">
                          <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-500/20" />
                          <div className="p-2.5 rounded-lg border space-y-1" style={{ background: theme.cardBgAlt, borderColor: theme.border }}>
                            <div className="flex items-center justify-between border-b pb-1" style={{ borderColor: theme.border }}>
                              <span className="font-bold" style={{ color: theme.textPrimary }}>{handler}</span>
                              <span className="text-[10px]" style={{ color: theme.textSecondary }}>{folDate} {fol.followup_time ? fol.followup_time.slice(0, 5) : ''}</span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: theme.textBody }}>{fol.action_details}</p>

                            {fol.attachment_url && (
                              <div className="mt-2 pt-1.5 border-t space-y-1" style={{ borderColor: theme.border }}>
                                <a href={fol.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                                  <FontAwesomeIcon icon={faPaperclip} className="text-[10px]" />
                                  <span>View Image Attachment</span>
                                </a>
                                <div>
                                  <a href={fol.attachment_url} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={fol.attachment_url}
                                      alt="Follow-up Attachment"
                                      className="max-h-36 rounded-md border object-cover shadow-sm hover:opacity-90 transition-opacity"
                                    />
                                  </a>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] pt-1" style={{ color: theme.textSecondary }}>
                              <span>Status: {fol.resulting_status}</span>
                              {getStatusBadge(fol.resulting_status)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Form Log New Follow-up & Solution */}
              <div className="space-y-3 p-3 rounded-lg border" style={{ background: theme.cardBgAlt, borderColor: theme.border }}>
                <h4 className="text-xs font-bold flex items-center gap-1.5" style={{ color: theme.textPrimary }}>
                  <FontAwesomeIcon icon={faPlus} className="text-indigo-500" />
                  <span>Log New Solution / Action</span>
                </h4>

                <form onSubmit={handleSubmitFollowup} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>Date *</Label>
                      <input
                        type="date"
                        required
                        value={followupForm.followup_date}
                        onChange={e => setFollowupForm(p => ({ ...p, followup_date: e.target.value }))}
                        className="w-full text-xs p-2.5 rounded-md focus:outline-none border font-medium cursor-pointer"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>Time *</Label>
                      <input
                        type="time"
                        required
                        value={followupForm.followup_time}
                        onChange={e => setFollowupForm(p => ({ ...p, followup_time: e.target.value }))}
                        className="w-full text-xs p-2.5 rounded-md focus:outline-none border font-medium cursor-pointer"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>Location</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Counseling Room / Principal Office"
                      value={followupForm.location}
                      onChange={e => setFollowupForm(p => ({ ...p, location: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>Action & Solution Details *</Label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe follow-up action taken, counseling outcome, parent contacts..."
                      value={followupForm.action_details}
                      onChange={e => setFollowupForm(p => ({ ...p, action_details: e.target.value }))}
                      className="w-full text-xs p-2 rounded-md focus:outline-none border"
                      style={inputStyle}
                    />
                  </div>

                  {/* Attachment Upload Field */}
                  <div>
                    <Label className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: theme.textPrimary }}>
                      <FontAwesomeIcon icon={faPaperclip} className="text-indigo-500" />
                      <span>Image Attachment (Optional)</span>
                    </Label>
                    
                    {!selectedFile ? (
                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" style={{ borderColor: theme.border }}>
                        <FontAwesomeIcon icon={faImage} className="text-indigo-500 text-sm" />
                        <span className="text-xs font-medium" style={{ color: theme.textSecondary }}>Choose image (PNG, JPG, WEBP)...</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-lg border" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img src={filePreview} alt="Attachment Preview" className="w-9 h-9 object-cover rounded border" />
                          <span className="text-xs font-medium truncate" style={{ color: theme.textPrimary }}>{selectedFile.name}</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 h-7 w-7 p-0">
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block" style={{ color: theme.textPrimary }}>Update Case Status *</Label>
                    <select
                      value={followupForm.resulting_status}
                      onChange={e => setFollowupForm(p => ({ ...p, resulting_status: e.target.value }))}
                      className="w-full text-xs p-2 rounded-md focus:outline-none border font-semibold"
                      style={selectStyle}
                    >
                      <option value="on_progress">On Progress (Active Case)</option>
                      <option value="completed">Completed (Case Resolved)</option>
                    </select>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="submit"
                      disabled={submittingFollowup}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2"
                    >
                      {submittingFollowup ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <FontAwesomeIcon icon={faSpinner} spin />
                          Saving...
                        </span>
                      ) : (
                        'Save Solution & Update Status'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
              <Button variant="outline" onClick={() => setShowHandlingModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )
      })()}
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
