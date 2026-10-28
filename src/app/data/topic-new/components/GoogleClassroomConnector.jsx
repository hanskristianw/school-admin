'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/theme'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faLink, 
  faUnlink, 
  faExternalLinkAlt, 
  faSpinner, 
  faCheck, 
  faExclamationTriangle,
  faTimes,
  faRotateRight,
  faPlus,
  faTrash
} from '@fortawesome/free-solid-svg-icons'

// Clean Google Classroom SVG Primitive
export function GoogleClassroomIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="8" fill="#1E8E3E" />
      <rect x="6" y="6" width="36" height="36" rx="4" fill="#2E7D32" />
      <rect x="9" y="9" width="30" height="30" rx="3" fill="#0F9D58" stroke="#F4B400" strokeWidth="2.5" />
      <circle cx="24" cy="20" r="4" fill="#FFFFFF" />
      <path d="M17 31C17 27.5 20 26 24 26C28 26 31 27.5 31 31V32H17V31Z" fill="#FFFFFF" />
      <circle cx="16" cy="21" r="2.8" fill="#E8EAED" />
      <path d="M11 29C11 26.5 13.5 25.5 16 25.5C17.2 25.5 18.2 25.8 19 26.4C18.2 27.2 17.8 28.2 17.8 29.5V31H11V29Z" fill="#E8EAED" />
      <circle cx="32" cy="21" r="2.8" fill="#E8EAED" />
      <path d="M37 29C37 26.5 34.5 25.5 32 25.5C30.8 25.5 29.8 25.8 29 26.4C29.8 27.2 30.2 28.2 30.2 29.5V31H37V29Z" fill="#E8EAED" />
    </svg>
  )
}

// Scopes required for complete Google Classroom & Drive integration
export const GOOGLE_CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'https://www.googleapis.com/auth/drive.readonly'
].join(' ')

export const getStoredClassroomToken = () => {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('gclass_access_token') || sessionStorage.getItem('gclass_access_token')
  } catch (e) {
    return null
  }
}

export const setStoredClassroomToken = (token) => {
  if (typeof window === 'undefined' || !token) return
  try { localStorage.setItem('gclass_access_token', token) } catch (e) {}
  try { sessionStorage.setItem('gclass_access_token', token) } catch (e) {}
}

export const clearStoredClassroomToken = () => {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem('gclass_access_token') } catch (e) {}
  try { sessionStorage.removeItem('gclass_access_token') } catch (e) {}
}

// Helper to extract links array safely from assessment_tsc
export const extractClassroomLinks = (tsc) => {
  if (!tsc) return []
  if (Array.isArray(tsc._classrooms) && tsc._classrooms.length > 0) {
    return tsc._classrooms
  }
  if (tsc._classroom && typeof tsc._classroom === 'object' && tsc._classroom.courseworkId) {
    return [tsc._classroom]
  }
  return []
}

export default function GoogleClassroomConnector({
  assessmentId,
  assessment,
  wizardAssessment,
  setWizardAssessment,
  onSuccess,
  compact = true,
  isReadOnly = false,
  triggerLabel = null,
  triggerButtonOnly = false
}) {
  const themeContext = useTheme ? useTheme() : null
  const theme = themeContext?.theme || {
    cardBg: '#FFFFFF',
    border: '#EAEAEA',
    textPrimary: '#111111',
    textSecondary: '#787774',
    subtleBg: '#FAF9F7',
    inputBg: '#FFFFFF',
    greenBg: '#EDF3EC',
    greenText: '#346538',
    redBg: '#FDEBEC',
    redText: '#9F2F2D'
  }
  const isDark = Boolean(themeContext?.isDark)

  const [mounted, setMounted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState('')
  
  // Data states
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  
  const [coursework, setCoursework] = useState([])
  const [courseworkLoading, setCourseworkLoading] = useState(false)
  const [selectedCourseworkId, setSelectedCourseworkId] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Target assessment ID
  const targetId = assessmentId || assessment?.assessment_id

  // Source classroom links
  const initialLinks = extractClassroomLinks(
    assessment?.assessment_tsc || wizardAssessment?.assessment_tsc
  )

  // Local state for immediate reactive UI
  const [linkedAssignments, setLinkedAssignments] = useState(initialLinks)

  useEffect(() => {
    const updated = extractClassroomLinks(
      assessment?.assessment_tsc || wizardAssessment?.assessment_tsc
    )
    setLinkedAssignments(updated)
  }, [assessment?.assessment_tsc, wizardAssessment?.assessment_tsc])

  // Track client mounting for React Portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modalOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [modalOpen])

  // Ensure Google Identity Services script is loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google?.accounts?.oauth2) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  // Fetch courses with token
  const fetchCourses = useCallback(async (token) => {
    setCoursesLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/classroom/courses', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          clearStoredClassroomToken()
          throw new Error('Google Classroom session expired. Please re-authenticate.')
        }
        throw new Error(data.error || 'Failed to fetch active courses from Google Classroom.')
      }
      setCourses(data.courses || [])
      return data.courses || []
    } catch (err) {
      setAuthError(err.message)
      return []
    } finally {
      setCoursesLoading(false)
    }
  }, [])

  // Fetch coursework when course is selected
  const fetchCoursework = useCallback(async (token, courseId) => {
    if (!courseId) {
      setCoursework([])
      return
    }
    setCourseworkLoading(true)
    setAuthError('')
    try {
      const res = await fetch(`/api/classroom/coursework?courseId=${encodeURIComponent(courseId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          clearStoredClassroomToken()
          throw new Error('Google Classroom session expired. Please re-authenticate.')
        }
        throw new Error(data.error || 'Failed to fetch assignments for this course.')
      }
      const list = data.coursework || data.courseWork || []
      setCoursework(list)
    } catch (err) {
      setAuthError(err.message)
      setCoursework([])
    } finally {
      setCourseworkLoading(false)
    }
  }, [])

  // Open modal and load courses if token exists
  const handleOpenModal = () => {
    setModalOpen(true)
    setAuthError('')
    setStatusMessage('')

    const token = getStoredClassroomToken()
    if (token) {
      fetchCourses(token).then(loadedCourses => {
        // If we already have linked assignments, default to first course
        if (linkedAssignments.length > 0 && linkedAssignments[0]?.courseId) {
          setSelectedCourseId(linkedAssignments[0].courseId)
          fetchCoursework(token, linkedAssignments[0].courseId)
        } else if (loadedCourses && loadedCourses.length > 0) {
          setSelectedCourseId(loadedCourses[0].id)
          fetchCoursework(token, loadedCourses[0].id)
        }
      })
    }
  }

  // Google OAuth flow
  const handleConnectGoogle = () => {
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      setAuthError('Google Identity Services SDK is still loading. Please retry in a few seconds.')
      return
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setAuthError('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured in environment.')
      return
    }

    setIsAuthenticating(true)
    setAuthError('')

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_CLASSROOM_SCOPES,
        callback: async (tokenResponse) => {
          setIsAuthenticating(false)
          if (tokenResponse.error) {
            setAuthError(`Google authentication error: ${tokenResponse.error_description || tokenResponse.error}`)
            return
          }
          if (tokenResponse.access_token) {
            setStoredClassroomToken(tokenResponse.access_token)
            await fetchCourses(tokenResponse.access_token)
          }
        }
      })

      client.requestAccessToken({ prompt: 'consent' })
    } catch (err) {
      setIsAuthenticating(false)
      setAuthError(err.message)
    }
  }

  // When course dropdown changes
  const handleCourseChange = (e) => {
    const courseId = e.target.value
    setSelectedCourseId(courseId)
    setSelectedCourseworkId('')
    const token = getStoredClassroomToken()
    if (token && courseId) {
      fetchCoursework(token, courseId)
    } else {
      setCoursework([])
    }
  }

  // Persist updated links to database and state
  const persistLinks = async (newLinks) => {
    setSaving(true)
    setAuthError('')
    try {
      const currentTsc = assessment?.assessment_tsc || wizardAssessment?.assessment_tsc || {}
      const updatedTsc = {
        ...currentTsc,
        _classrooms: newLinks,
        _classroom: newLinks[0] || null
      }

      if (setWizardAssessment) {
        setWizardAssessment(prev => ({
          ...prev,
          assessment_tsc: updatedTsc
        }))
      }

      if (targetId) {
        const { error } = await supabase
          .from('assessment')
          .update({ assessment_tsc: updatedTsc })
          .eq('assessment_id', targetId)

        if (error) throw error
      }

      setLinkedAssignments(newLinks)

      if (onSuccess) {
        await onSuccess(updatedTsc)
      }

      return true
    } catch (err) {
      setAuthError(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  // Add a new coursework link
  const handleAddLink = async () => {
    if (!selectedCourseId || !selectedCourseworkId) {
      setAuthError('Please select both a course and an assignment to link.')
      return
    }

    // Check duplicate
    if (linkedAssignments.some(l => l.courseworkId === selectedCourseworkId)) {
      setAuthError('This assignment is already linked to this assessment.')
      return
    }

    const course = courses.find(c => c.id === selectedCourseId)
    const cw = coursework.find(w => w.id === selectedCourseworkId)

    if (!course || !cw) {
      setAuthError('Selected course or assignment is invalid.')
      return
    }

    const newLink = {
      id: `${course.id}_${cw.id}`,
      courseId: course.id,
      courseName: course.name,
      courseSection: course.section || null,
      courseworkId: cw.id,
      courseworkTitle: cw.title,
      alternateLink: cw.alternateLink || `https://classroom.google.com/c/${course.id}/a/${cw.id}/details`,
      maxPoints: cw.maxPoints ?? null,
      dueDate: cw.dueDate || null,
      dueTime: cw.dueTime || null,
      linkedAt: new Date().toISOString()
    }

    const nextLinks = [...linkedAssignments, newLink]
    const ok = await persistLinks(nextLinks)
    if (ok) {
      setSelectedCourseworkId('')
      setStatusMessage(`Successfully linked "${cw.title}".`)
      setTimeout(() => setStatusMessage(''), 2500)
    }
  }

  // Remove a single coursework link
  const handleRemoveLink = async (courseworkId) => {
    const targetLink = linkedAssignments.find(l => l.courseworkId === courseworkId)
    const label = targetLink?.courseworkTitle || 'this assignment'
    if (!confirm(`Are you sure you want to disconnect "${label}"?`)) return

    const nextLinks = linkedAssignments.filter(l => l.courseworkId !== courseworkId)
    const ok = await persistLinks(nextLinks)
    if (ok) {
      setStatusMessage(`Disconnected "${label}".`)
      setTimeout(() => setStatusMessage(''), 2500)
    }
  }

  // Disconnect all
  const handleDisconnectAll = async () => {
    if (!confirm('Are you sure you want to disconnect all Google Classroom assignments from this assessment?')) return

    const ok = await persistLinks([])
    if (ok) {
      setStatusMessage('All Classroom assignments disconnected.')
      setTimeout(() => {
        setModalOpen(false)
        setStatusMessage('')
      }, 700)
    }
  }

  const hasToken = Boolean(getStoredClassroomToken())
  const hasLinks = linkedAssignments.length > 0

  return (
    <div className="w-full">
      {/* ─── Compact / Inline View on Assessment Card ─── */}
      {triggerButtonOnly ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleOpenModal()
          }}
          disabled={isReadOnly}
          className="px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs" style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
          title="Manage linked Google Classroom assignments"
        >
          <GoogleClassroomIcon className="w-3.5 h-3.5" />
          <span>{triggerLabel || (hasLinks ? `Manage Classroom (${linkedAssignments.length})` : 'Link Classroom')}</span>
        </button>
      ) : hasLinks ? (
        // Connected State (1 or multiple assignments)
        <div 
          className="flex items-center justify-between p-2 rounded-[6px] border border-[#EAEAEA] text-xs transition-colors"
          style={{ backgroundColor: theme.subtleBg, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <GoogleClassroomIcon className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold truncate max-w-[180px] sm:max-w-[220px]" style={{ color: theme.textPrimary }}>
                  {linkedAssignments.length === 1 
                    ? linkedAssignments[0].courseworkTitle 
                    : `${linkedAssignments.length} Assignments Linked`
                  }
                </span>
                <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold uppercase shrink-0" style={{ background: theme.greenBg, color: theme.greenText, border: `1px solid ${isDark ? "rgba(123,175,123,0.25)" : "#D5E6D3"}` }}>
                  GC Linked
                </span>
              </div>
              <div className="text-[10px] font-mono truncate" style={{ color: theme.textSecondary }}>
                {linkedAssignments.length === 1 
                  ? linkedAssignments[0].courseName 
                  : `${linkedAssignments[0].courseworkTitle} + ${linkedAssignments.length - 1} more`
                }
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {linkedAssignments.length === 1 && linkedAssignments[0].alternateLink && (
              <a
                href={linkedAssignments[0].alternateLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1 text-[11px] font-mono font-semibold rounded border border-[#EAEAEA] bg-[#FFFFFF] hover:bg-[#F4F4F2] transition-colors inline-flex items-center gap-1 cursor-pointer"
                style={{ color: '#111111' }}
                title="Open assignment in Google Classroom"
              >
                <span>Open</span>
                <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[8px]" />
              </a>
            )}
            {!isReadOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenModal()
                }}
                className="px-2 py-1 text-[11px] font-mono font-semibold rounded border border-[#EAEAEA] bg-[#FFFFFF] hover:bg-[#F4F4F2] transition-colors cursor-pointer text-[#111111]"
                title="Manage or add linked assignments"
              >
                {linkedAssignments.length > 1 ? `Manage (${linkedAssignments.length})` : 'Manage'}
              </button>
            )}
          </div>
        </div>
      ) : (
        // Disconnected State
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleOpenModal()
          }}
          disabled={isReadOnly}
          className="w-full py-1.5 px-3 text-xs font-mono font-semibold rounded-[6px] border border-[#EAEAEA] bg-[#FFFFFF] hover:bg-[#F9F9F8] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-2xs"
          style={{ 
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`,
            color: theme.textPrimary,
            fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif"
          }}
        >
          <GoogleClassroomIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Connect Google Classroom</span>
        </button>
      )}

      {/* ─── Minimalist Modal Dialog Teleported via Portal to document.body ─── */}
      {mounted && modalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={e => { 
            e.stopPropagation()
            if (e.target === e.currentTarget) setModalOpen(false) 
          }}
          className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="rounded-[8px] border border-[#EAEAEA] w-full max-w-xl overflow-hidden flex flex-col text-left animate-in fade-in zoom-in-95 duration-150 my-auto"
            style={{ 
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.border}`,
              boxShadow: isDark ? '0 25px 60px rgba(0, 0, 0, 0.7)' : '0 20px 40px rgba(0, 0, 0, 0.2)',
              color: theme.textPrimary,
              maxHeight: '90vh'
            }}
          >
            {/* Minimalist Header */}
            <div className="px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between shrink-0" style={{ backgroundColor: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#787774] mb-0.5">
                  <span>[INTEGRATION]</span>
                  <span>/</span>
                  <span className="font-semibold text-[#111111]">[GOOGLE CLASSROOM]</span>
                </div>
                <h3 className="text-sm font-bold tracking-tight text-[#111111]">
                  Manage Linked Classroom Assignments
                </h3>
                <p className="text-[11px] text-[#787774] mt-0.5">
                  Link one or multiple Classroom coursework assignments to this assessment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#787774] hover:text-[#111111] p-1.5 rounded transition-colors cursor-pointer"
                aria-label="Close"
              >
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto" style={{ backgroundColor: theme.cardBg }}>
              {/* Context Breadcrumb */}
              {assessment?.assessment_nama && (
                <div className="p-3 rounded-[6px] border border-[#EAEAEA] text-xs" style={{ backgroundColor: theme.subtleBg, border: `1px solid ${theme.border}` }}>
                  <div className="text-[10px] font-mono uppercase text-[#787774] mb-0.5">
                    Target Assessment
                  </div>
                  <div className="font-bold text-[#111111]">
                    {assessment.assessment_nama}
                  </div>
                  {(assessment.subject_name || assessment.kelas_nama) && (
                    <div className="text-[11px] font-mono text-[#787774] mt-0.5">
                      {assessment.subject_name || 'Subject'} · {assessment.kelas_nama || 'Class'}
                    </div>
                  )}
                </div>
              )}

              {/* Unauthenticated State */}
              {!hasToken ? (
                <div className="text-center py-7 px-4 rounded-[6px] border border-dashed border-[#EAEAEA]" style={{ backgroundColor: '#FCFCFB' }}>
                  <GoogleClassroomIcon className="w-10 h-10 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#111111] mb-1">
                    Google Authorization Required
                  </h4>
                  <p className="text-xs text-[#787774] max-w-sm mx-auto mb-4 leading-relaxed">
                    Sign in with your authorized school account to load your active classes and coursework.
                  </p>

                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={isAuthenticating}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#111111] hover:bg-[#333333] active:scale-[0.98] rounded-[6px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAuthenticating ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <span>Authorize with Google</span>
                        <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Authenticated State */
                <div className="space-y-5">
                  {/* Status Bar */}
                  <div 
                    className="flex items-center justify-between text-xs px-3 py-2 rounded-[6px] border"
                    style={{ background: '#EDF3EC', borderColor: '#D5E6D3', color: '#346538' }}
                  >
                    <span className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-[#346538]"></span>
                      Google Classroom Authorized
                    </span>
                    <span className="text-[10px] font-mono text-[#346538] opacity-75">
                      {linkedAssignments.length} Linked
                    </span>
                  </div>

                  {/* Section 1: Currently Linked Assignments */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[#111111] uppercase font-mono tracking-wider">
                        Linked Assignments ({linkedAssignments.length})
                      </label>
                      {linkedAssignments.length > 1 && (
                        <button
                          type="button"
                          onClick={handleDisconnectAll}
                          disabled={saving}
                          className="text-[10px] font-mono text-[#9F2F2D] hover:underline cursor-pointer"
                        >
                          Disconnect All
                        </button>
                      )}
                    </div>

                    {linkedAssignments.length === 0 ? (
                      <div className="p-3 rounded-[6px] border border-dashed border-[#EAEAEA] text-center text-xs text-[#787774]" style={{ backgroundColor: '#FCFCFB' }}>
                        No Classroom assignments linked yet. Choose a course and assignment below, then click <strong>"Save & Link This Assignment"</strong>.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {linkedAssignments.map((item, idx) => (
                          <div 
                            key={item.courseworkId || idx}
                            className="p-3 rounded-[6px] border border-[#EAEAEA] flex items-center justify-between gap-3 text-xs"
                            style={{ backgroundColor: '#FAF9F7' }}
                          >
                            <div className="min-w-0 flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-[4px] bg-[#FFFFFF] border border-[#EAEAEA] flex items-center justify-center font-mono font-bold text-[10px] text-[#787774] shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-[#111111] truncate" title={item.courseworkTitle}>
                                  {item.courseworkTitle}
                                </div>
                                <div className="text-[10px] font-mono text-[#787774] truncate flex items-center gap-2">
                                  <span>{item.courseName}</span>
                                  {item.courseSection && <span>({item.courseSection})</span>}
                                  {item.maxPoints != null && (
                                    <>
                                      <span>·</span>
                                      <span>{item.maxPoints} pts</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.alternateLink && (
                                <a
                                  href={item.alternateLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-mono text-[#787774] hover:text-[#111111] p-1 rounded transition-colors"
                                  title="Open in Google Classroom"
                                >
                                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveLink(item.courseworkId)}
                                disabled={saving}
                                className="text-[#9F2F2D] hover:bg-[#FDEBEC] p-1 rounded transition-colors text-xs cursor-pointer"
                                title="Remove this link"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Link Another Assignment Form */}
                  <div className="pt-3 border-t border-[#EAEAEA] space-y-3">
                    <div className="text-xs font-bold text-[#111111] uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faPlus} className="text-[10px] text-[#346538]" />
                      <span>Link Another Assignment</span>
                    </div>

                    {/* Step 1: Course */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-[#111111]">
                          Select Course
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const token = getStoredClassroomToken()
                            if (token) fetchCourses(token)
                          }}
                          disabled={coursesLoading}
                          className="text-[10px] font-mono uppercase text-[#787774] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Refresh course list"
                        >
                          <FontAwesomeIcon icon={faRotateRight} className={coursesLoading ? 'animate-spin' : ''} />
                          <span>Refresh</span>
                        </button>
                      </div>

                      {coursesLoading ? (
                        <div className="p-2.5 text-xs text-[#787774] rounded-[6px] border border-[#EAEAEA] flex items-center gap-2" style={{ backgroundColor: '#FAF9F7' }}>
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[#111111]" />
                          <span>Loading active courses...</span>
                        </div>
                      ) : (
                        <select
                          value={selectedCourseId}
                          onChange={handleCourseChange}
                          className="w-full text-xs px-3 py-2 rounded-[6px] focus:outline-none cursor-pointer" style={{ backgroundColor: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">-- Choose Course --</option>
                          {courses.map(course => (
                            <option key={course.id} value={course.id}>
                              {course.name} {course.section ? `(${course.section})` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Step 2: Coursework Assignment */}
                    {selectedCourseId && (
                      <div className="animate-in fade-in duration-150">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-[#111111]">
                            Select Assignment (CourseWork)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const token = getStoredClassroomToken()
                              if (token && selectedCourseId) fetchCoursework(token, selectedCourseId)
                            }}
                            disabled={courseworkLoading}
                            className="text-[10px] font-mono uppercase text-[#787774] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
                            title="Refresh assignment list"
                          >
                            <FontAwesomeIcon icon={faRotateRight} className={courseworkLoading ? 'animate-spin' : ''} />
                            <span>Refresh</span>
                          </button>
                        </div>

                        {courseworkLoading ? (
                          <div className="p-2.5 text-xs text-[#787774] rounded-[6px] border border-[#EAEAEA] flex items-center gap-2" style={{ backgroundColor: '#FAF9F7' }}>
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[#111111]" />
                            <span>Loading assignments...</span>
                          </div>
                        ) : (
                          <select
                            value={selectedCourseworkId}
                            onChange={(e) => setSelectedCourseworkId(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-[#EAEAEA] rounded-[6px] focus:outline-none focus:border-[#111111] bg-[#FFFFFF] text-[#111111] cursor-pointer"
                          >
                            <option value="">-- Choose Assignment --</option>
                            {coursework.map(cw => {
                              const isAlreadyLinked = linkedAssignments.some(l => l.courseworkId === cw.id)
                              return (
                                <option 
                                  key={cw.id} 
                                  value={cw.id}
                                  disabled={isAlreadyLinked}
                                >
                                  {cw.title} {cw.maxPoints ? `(${cw.maxPoints} pts)` : ''} {isAlreadyLinked ? '✓ (Already Linked)' : ''}
                                </option>
                              )
                            })}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Save & Link Assignment Button */}
                    {selectedCourseworkId && (
                      <div className="pt-2 space-y-1.5">
                        <button
                          type="button"
                          onClick={handleAddLink}
                          disabled={saving}
                          className="w-full py-2.5 px-4 text-xs font-semibold rounded-[6px] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                          style={{
                            background: isDark ? '#FFFFFF' : '#111111',
                            color: isDark ? '#111111' : '#FFFFFF'
                          }}
                        >
                          <FontAwesomeIcon icon={saving ? faSpinner : faLink} className={saving ? 'animate-spin text-xs' : 'text-xs'} />
                          <span>{saving ? 'Saving & Linking...' : 'Save & Link This Assignment'}</span>
                        </button>
                        <p className="text-[11px] text-[#787774] text-center">
                          Save and link the selected Google Classroom assignment to this assessment
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {authError && (
                <div 
                  className="p-3 rounded-[6px] text-xs flex items-start gap-2"
                  style={{ background: '#FDEBEC', color: '#9F2F2D', border: '1px solid #F9D7D9' }}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-[#9F2F2D] mt-0.5 shrink-0 text-xs" />
                  <span className="flex-1 font-mono text-[11px]">{authError}</span>
                </div>
              )}

              {/* Success Notice */}
              {statusMessage && (
                <div 
                  className="p-2.5 rounded-[6px] text-xs flex items-center gap-2 font-mono"
                  style={{ background: '#EDF3EC', color: '#346538', border: '1px solid #D5E6D3' }}
                >
                  <FontAwesomeIcon icon={faCheck} className="text-[#346538] text-xs shrink-0" />
                  <span className="font-semibold">{statusMessage}</span>
                </div>
              )}
            </div>

            {/* Minimalist Footer */}
            <div className="px-6 py-3.5 border-t border-[#EAEAEA] flex items-center justify-between shrink-0" style={{ backgroundColor: '#FAFAFA' }}>
              <div className="text-[11px] font-mono text-[#787774]">
                {linkedAssignments.length} assignment{linkedAssignments.length === 1 ? '' : 's'} linked
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-mono font-semibold rounded-[6px] transition-colors cursor-pointer" style={{ background: isDark ? '#FFFFFF' : '#111111', color: isDark ? '#111111' : '#FFFFFF' }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
