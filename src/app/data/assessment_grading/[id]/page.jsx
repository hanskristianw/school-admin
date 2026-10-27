'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft, 
  faSave, 
  faSpinner, 
  faCheckCircle, 
  faFileExcel, 
  faTrash, 
  faDownload, 
  faUpload,
  faExternalLinkAlt,
  faRotateRight,
  faFileLines,
  faTimes,
  faEye
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@/lib/theme'
import GoogleClassroomConnector, { 
  GoogleClassroomIcon, 
  GOOGLE_CLASSROOM_SCOPES, 
  getStoredClassroomToken, 
  setStoredClassroomToken, 
  clearStoredClassroomToken,
  extractClassroomLinks 
} from '@/app/data/topic-new/components/GoogleClassroomConnector'

export default function AssessmentGradingPage() {
  const params = useParams()
  const router = useRouter()
  const { theme, isDark } = useTheme()
  const assessmentId = params.id

  // State - simplified: no strands, direct criterion grades
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [students, setStudents] = useState([])
  const [criteria, setCriteria] = useState([])
  const [grades, setGrades] = useState({}) // { [detail_siswa_id]: { grade_id, A, B, C, D, final_grade, comments } }
  const [mypYear, setMypYear] = useState(null)
  const [error, setError] = useState(null)
  const customBoundariesRef = useRef(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const importRef = useRef(null)

  const [isDraftLocked, setIsDraftLocked] = useState(false)

  // Google Classroom integration state
  const [mounted, setMounted] = useState(false)
  const [submissionsByCoursework, setSubmissionsByCoursework] = useState({})
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false)
  const [activeCourseworkId, setActiveCourseworkId] = useState('')
  const [classroomError, setClassroomError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [activePreviewDoc, setActivePreviewDoc] = useState(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (activePreviewDoc) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [activePreviewDoc])

  // Fetch all data
  useEffect(() => {
    if (assessmentId) {
      fetchData()
    }
  }, [assessmentId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch assessment details with topic
      const { data: assessmentData, error: aError } = await supabase
        .from('assessment')
        .select(`
          assessment_id,
          assessment_nama,
          assessment_tanggal,
          assessment_detail_kelas_id,
          assessment_topic_id,
          assessment_status,
          assessment_tsc,
          topic:assessment_topic_id (
            topic_id,
            topic_year,
            topic_status
          )
        `)
        .eq('assessment_id', assessmentId)
        .single()

      if (aError) throw new Error('Assessment not found: ' + aError.message)
      
      const topicYear = assessmentData.topic?.topic_year
      const isDraft = assessmentData.topic?.topic_status === 'draft'
      setIsDraftLocked(isDraft)
      setMypYear(topicYear)
      setAssessment(assessmentData)

      // 2. Fetch detail_kelas to get kelas_id and subject
      const { data: detailKelas, error: dkError } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_kelas_id, detail_kelas_subject_id')
        .eq('detail_kelas_id', assessmentData.assessment_detail_kelas_id)
        .single()

      if (dkError) throw new Error('Class not found: ' + dkError.message)

      // 2b. Fetch subject custom_grade_boundaries
      if (detailKelas.detail_kelas_subject_id) {
        const { data: subjectData } = await supabase
          .from('subject')
          .select('custom_grade_boundaries')
          .eq('subject_id', detailKelas.detail_kelas_subject_id)
          .single()
        customBoundariesRef.current = subjectData?.custom_grade_boundaries || null
      }

      // 3. Fetch students
      const { data: detailSiswa, error: dsError } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_id, detail_siswa_user_id')
        .eq('detail_siswa_kelas_id', detailKelas.detail_kelas_kelas_id)

      if (dsError) throw dsError

      // Fetch user names and emails
      const userIds = detailSiswa.map(ds => ds.detail_siswa_user_id)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_email')
        .in('user_id', userIds)

      if (usersError) throw usersError

      const userMap = new Map()
      usersData.forEach(u => {
        userMap.set(u.user_id, {
          name: `${u.user_nama_depan} ${u.user_nama_belakang}`.trim(),
          email: (u.user_email || '').toLowerCase().trim()
        })
      })

      const studentList = detailSiswa
        .map(ds => {
          const u = userMap.get(ds.detail_siswa_user_id)
          return {
            detail_siswa_id: ds.detail_siswa_id,
            user_id: ds.detail_siswa_user_id,
            nama: u?.name || 'Unknown',
            email: u?.email || ''
          }
        })
        .sort((a, b) => a.nama.localeCompare(b.nama))

      setStudents(studentList)

      // Auto-fetch classroom submissions if assessment is linked
      const cLinks = extractClassroomLinks(assessmentData.assessment_tsc)
      if (cLinks.length > 0) {
        const token = getStoredClassroomToken()
        if (token) {
          fetchClassroomSubmissions(cLinks, token)
        }
      }

      // 4. Fetch criteria for this assessment
      const { data: junctionData, error: jError } = await supabase
        .from('assessment_criteria')
        .select('criterion_id')
        .eq('assessment_id', assessmentId)

      if (jError) throw jError

      const criterionIds = junctionData.map(j => j.criterion_id)
      
      if (criterionIds.length === 0) {
        throw new Error('No criteria assigned to this assessment.')
      }

      const { data: criteriaData, error: cError } = await supabase
        .from('criteria')
        .select('criterion_id, code, name')
        .in('criterion_id', criterionIds)
        .order('code')

      if (cError) throw cError
      setCriteria(criteriaData)

      // 5. Fetch existing grades (direct criterion grades, no strands)
      const { data: existingGrades, error: gError } = await supabase
        .from('assessment_grades')
        .select('grade_id, detail_siswa_id, criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade, final_grade, comments')
        .eq('assessment_id', assessmentId)

      if (gError) throw gError

      // Build grades map
      const gradesMap = {}
      for (const student of studentList) {
        const existing = existingGrades?.find(g => g.detail_siswa_id === student.detail_siswa_id)
        if (existing) {
          gradesMap[student.detail_siswa_id] = {
            grade_id: existing.grade_id,
            A: existing.criterion_a_grade,
            B: existing.criterion_b_grade,
            C: existing.criterion_c_grade,
            D: existing.criterion_d_grade,
            final_grade: existing.final_grade,
            comments: existing.comments || ''
          }
        } else {
          gradesMap[student.detail_siswa_id] = {
            grade_id: null,
            A: null,
            B: null,
            C: null,
            D: null,
            final_grade: null,
            comments: ''
          }
        }
      }
      setGrades(gradesMap)

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Calculate final grade from criterion grades (IB MYP 1-7 scale)
  const calculateFinalGrade = (criterionGrades) => {
    const { A, B, C, D } = criterionGrades
    const values = [A, B, C, D].filter(g => g !== null && g !== undefined)
    if (values.length === 0) return null

    const total = values.reduce((a, b) => a + b, 0)

    const customBounds = customBoundariesRef.current
    const count = values.length
    const scale = count / 4
    const b = (customBounds && customBounds.length === 6)
      ? customBounds
      : [5, 9, 14, 18, 23, 27].map(v => Math.round(v * scale))
    if (total <= b[0]) return 1
    if (total <= b[1]) return 2
    if (total <= b[2]) return 3
    if (total <= b[3]) return 4
    if (total <= b[4]) return 5
    if (total <= b[5]) return 6
    return 7
  }

  // Handle criterion grade change
  const handleGradeChange = (studentId, criterionCode, value) => {
    const numValue = value === '' ? null : parseInt(value)
    
    setGrades(prev => {
      const updated = { ...prev }
      updated[studentId] = {
        ...updated[studentId],
        [criterionCode]: numValue
      }
      
      // Recalculate final grade
      updated[studentId].final_grade = calculateFinalGrade(updated[studentId])
      
      return updated
    })
  }

  // Save all grades
  const handleSave = async () => {
    if (isDraftLocked) {
      alert('Cannot save grades: The Unit Planner for this assessment is currently in DRAFT status. Please publish the Unit Planner in /data/topic-new first.')
      return
    }
    try {
      setSaving(true)
      setSaveSuccess(false)

      for (const student of students) {
        const studentGrades = grades[student.detail_siswa_id]
        if (!studentGrades) continue

        // Check if any criterion has a grade
        const hasAnyGrade = [studentGrades.A, studentGrades.B, studentGrades.C, studentGrades.D].some(g => g !== null && g !== undefined)
        if (!hasAnyGrade) continue

        const gradeRecord = {
          assessment_id: parseInt(assessmentId),
          detail_siswa_id: student.detail_siswa_id,
          criterion_a_grade: studentGrades.A,
          criterion_b_grade: studentGrades.B,
          criterion_c_grade: studentGrades.C,
          criterion_d_grade: studentGrades.D,
          final_grade: studentGrades.final_grade,
          comments: studentGrades.comments || null,
          updated_at: new Date().toISOString()
        }

        if (studentGrades.grade_id) {
          // Update existing
          await supabase
            .from('assessment_grades')
            .update(gradeRecord)
            .eq('grade_id', studentGrades.grade_id)
        } else {
          // Insert new
          const { data: inserted } = await supabase
            .from('assessment_grades')
            .insert([gradeRecord])
            .select('grade_id')
            .single()
          
          // Update local state with new grade_id
          if (inserted) {
            setGrades(prev => ({
              ...prev,
              [student.detail_siswa_id]: {
                ...prev[student.detail_siswa_id],
                grade_id: inserted.grade_id
              }
            }))
          }
        }
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

    } catch (err) {
      console.error('Error saving grades:', err)
      alert('Failed to save grades: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Clear grades for a single student
  const handleClearStudentGrades = async (student) => {
    if (!confirm(`Hapus nilai untuk ${student.nama}?`)) return
    try {
      const gradeId = grades[student.detail_siswa_id]?.grade_id
      if (gradeId) {
        const { error } = await supabase
          .from('assessment_grades')
          .delete()
          .eq('grade_id', gradeId)
        if (error) throw error
      }
      setGrades(prev => ({
        ...prev,
        [student.detail_siswa_id]: { grade_id: null, A: null, B: null, C: null, D: null, final_grade: null, comments: '' }
      }))
    } catch (err) {
      alert('Gagal menghapus nilai: ' + err.message)
    }
  }

  // Download Excel template for grade input
  const downloadGradeTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'School Admin'
      const sheet = workbook.addWorksheet('Grades')

      // Build columns dynamically based on active criteria
      const columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Student Name', key: 'nama', width: 30 },
        ...criteria.map(c => ({ header: `Criterion ${c.code} (0-8)`, key: c.code, width: 18 })),
        { header: 'detail_siswa_id (do not edit)', key: 'detail_siswa_id', width: 24 },
      ]
      sheet.columns = columns

      // Style header row
      const headerRow = sheet.getRow(1)
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF3730A3' } } }
      })
      headerRow.height = 20

      // Add student rows
      students.forEach((s, i) => {
        const g = grades[s.detail_siswa_id] || {}
        const row = sheet.addRow({
          no: i + 1,
          nama: s.nama,
          ...Object.fromEntries(criteria.map(c => [c.code, g[c.code] ?? ''])),
          detail_siswa_id: s.detail_siswa_id,
        })
        // Gray out non-editable cells
        ;['no', 'nama', 'detail_siswa_id'].forEach(key => {
          row.getCell(key).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
          row.getCell(key).font = { color: { argb: 'FF6B7280' } }
        })
        // Style criterion grade cells
        criteria.forEach(c => {
          row.getCell(c.code).alignment = { horizontal: 'center' }
        })
        row.height = 22
      })

      // Note at the bottom
      sheet.addRow([])
      const noteRow = sheet.addRow(['', '* Fill in criterion scores (0-8). Do not modify "No", "Student Name", or "detail_siswa_id" columns.'])
      noteRow.getCell(2).font = { italic: true, color: { argb: 'FF9CA3AF' } }
      const lastColLetter = String.fromCharCode(65 + columns.length - 1)
      sheet.mergeCells(`B${noteRow.number}:${lastColLetter}${noteRow.number}`)

      const assessmentName = assessment?.assessment_nama?.replace(/[^a-z0-9]/gi, '_') || 'assessment'
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `grade_template_${assessmentName}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to generate template: ' + err.message)
    }
  }

  // Import grades from Excel template
  const handleGradeImport = async (file) => {
    if (!file) return
    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      const arrayBuffer = await file.arrayBuffer()
      await workbook.xlsx.load(arrayBuffer)
      const sheet = workbook.getWorksheet(1)
      if (!sheet) throw new Error('No worksheet found in file')

      // Column positions: No(1), Name(2), ...criteria..., detail_siswa_id(last)
      const criteriaStartCol = 3
      const idCol = criteriaStartCol + criteria.length

      let updated = 0
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // skip header
        const detailSiswaId = row.getCell(idCol).value
        if (!detailSiswaId) return
        const student = students.find(s => String(s.detail_siswa_id) === String(detailSiswaId))
        if (!student) return

        const criterionUpdates = {}
        criteria.forEach((c, idx) => {
          const raw = row.getCell(criteriaStartCol + idx).value
          criterionUpdates[c.code] = raw !== null && raw !== '' ? Math.min(8, Math.max(0, parseInt(raw) || 0)) : null
        })

        setGrades(prev => {
          const existing = prev[student.detail_siswa_id] || {}
          const updated = {
            ...existing,
            ...criterionUpdates,
          }
          updated.final_grade = calculateFinalGrade(updated)
          return { ...prev, [student.detail_siswa_id]: updated }
        })
        updated++
      })

      alert(`Import successful! ${updated} student(s) loaded. Click "Save" to save.`)
    } catch (err) {
      alert('Failed to import file: ' + err.message)
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  // Export to CSV
  const handleExport = () => {
    const headers = ['Student Name', ...criteria.map(c => `Criterion ${c.code}`), 'Final Grade', 'Comments']
    const rows = students.map(student => {
      const g = grades[student.detail_siswa_id] || {}
      return [
        student.nama,
        ...criteria.map(c => g[c.code] ?? ''),
        g.final_grade ?? '',
        g.comments || ''
      ]
    })
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grades_${assessment?.assessment_nama || 'assessment'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get color for grade (0-8) - compact modern style
  const getGradeColor = (grade) => {
    if (grade === null || grade === undefined) return 'bg-slate-50 text-slate-300'
    if (grade >= 7) return 'bg-emerald-50 text-emerald-600 border-emerald-200'
    if (grade >= 5) return 'bg-blue-50 text-blue-600 border-blue-200'
    if (grade >= 3) return 'bg-amber-50 text-amber-600 border-amber-200'
    return 'bg-red-50 text-red-600 border-red-200'
  }

  // Get color for criterion header
  const getCriterionColor = (code) => {
    switch (code) {
      case 'A': return 'bg-rose-500'
      case 'B': return 'bg-orange-500'
      case 'C': return 'bg-sky-500'
      case 'D': return 'bg-violet-500'
      default: return 'bg-slate-500'
    }
  }

  // Get final grade color (1-7) - compact badge style
  const getFinalGradeColor = (grade) => {
    if (grade === null) return 'bg-slate-100 text-slate-400'
    if (grade >= 6) return 'bg-emerald-500 text-white'
    if (grade >= 4) return 'bg-sky-500 text-white'
    if (grade >= 2) return 'bg-amber-500 text-white'
    return 'bg-red-500 text-white'
  }

  // Classroom links helper
  const classroomLinks = extractClassroomLinks(assessment?.assessment_tsc)
  const currentLink = classroomLinks.find(l => l.courseworkId === activeCourseworkId) || classroomLinks[0] || null

  // Ensure activeCourseworkId defaults to first link
  useEffect(() => {
    if (classroomLinks.length > 0) {
      if (!activeCourseworkId || !classroomLinks.some(l => l.courseworkId === activeCourseworkId)) {
        setActiveCourseworkId(classroomLinks[0].courseworkId)
      }
    }
  }, [classroomLinks, activeCourseworkId])

  // Fetch submissions from Google Classroom API proxy for all linked coursework
  const fetchClassroomSubmissions = async (linksParam, tokenParam) => {
    const links = linksParam || classroomLinks
    if (!links || links.length === 0) return

    const token = tokenParam || getStoredClassroomToken()
    if (!token) return

    setLoadingSubmissions(true)
    setClassroomError('')
    try {
      const results = {}
      for (const link of links) {
        const res = await fetch(`/api/classroom/submissions?courseId=${encodeURIComponent(link.courseId)}&courseworkId=${encodeURIComponent(link.courseworkId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 401 || res.status === 403 || data.error === 'insufficient_roster_scope') {
            clearStoredClassroomToken()
            throw new Error('Google Classroom permissions need updating. Please click "Re-authorize Google Classroom" below.')
          }
          throw new Error(data.error || `Failed to fetch submissions for ${link.courseworkTitle}`)
        }
        results[link.courseworkId] = data.submissions || []
      }

      setSubmissionsByCoursework(results)
      setSubmissionsLoaded(true)
    } catch (err) {
      setClassroomError(err.message)
    } finally {
      setLoadingSubmissions(false)
    }
  }

  // Connect Google account if token is missing or permissions changed
  const handleConnectGoogle = () => {
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      setClassroomError('Google Identity Services SDK is still loading. Please try again.')
      return
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setClassroomError('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.')
      return
    }

    setIsAuthenticating(true)
    setClassroomError('')

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_CLASSROOM_SCOPES,
        callback: async (tokenResponse) => {
          setIsAuthenticating(false)
          if (tokenResponse.error) {
            setClassroomError(`Google authorization error: ${tokenResponse.error_description || tokenResponse.error}`)
            return
          }
          if (tokenResponse.access_token) {
            setStoredClassroomToken(tokenResponse.access_token)
            if (classroomLinks.length > 0) {
              fetchClassroomSubmissions(classroomLinks, tokenResponse.access_token)
            }
          }
        }
      })

      client.requestAccessToken({ prompt: 'consent' })
    } catch (err) {
      setIsAuthenticating(false)
      setClassroomError(err.message)
    }
  }

  // Handle classroom links update from connector
  const handleClassroomUpdate = async (updatedTsc) => {
    const updatedLinks = extractClassroomLinks(updatedTsc)
    setAssessment(prev => ({
      ...prev,
      assessment_tsc: updatedTsc
    }))
    const token = getStoredClassroomToken()
    if (token && updatedLinks.length > 0) {
      await fetchClassroomSubmissions(updatedLinks, token)
    }
  }

  // Shorten tab label for compact table header
  const formatTabLabel = (title) => {
    if (!title) return ''
    const critMatch = title.match(/^(?:Criterion|Crit)\s*([A-D])/i)
    if (critMatch) {
      const letter = critMatch[1].toUpperCase()
      const remainder = title.slice(critMatch[0].length).replace(/^[\s\-–—:]+/, '').trim()
      if (!remainder) return `Crit ${letter}`
      const firstWord = remainder.split(/\s+/)[0]
      const shortWord = firstWord.length > 9 ? firstWord.slice(0, 8) + '…' : firstWord
      return `Crit ${letter}: ${shortWord}`
    }
    return title.length > 13 ? title.slice(0, 12).trim() + '…' : title
  }

  // Clean string helper for name matching
  const cleanNameString = (str) => {
    if (!str) return ''
    return str
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Match Next.js student with a specific coursework submissions list
  const findStudentSubmission = (subsList, student) => {
    if (!student || !subsList || subsList.length === 0) return null

    const sEmail = (student.email || '').toLowerCase().trim()
    const sNameClean = cleanNameString(student.nama)
    const sTokens = sNameClean.split(' ').filter(w => w.length > 1)

    // 1. Email match
    if (sEmail) {
      const emailMatch = subsList.find(sub => 
        (sub.studentEmail || '').toLowerCase().trim() === sEmail
      )
      if (emailMatch) return emailMatch
    }

    // 2. Exact cleaned name match
    const exactNameMatch = subsList.find(sub => {
      const cNameClean = cleanNameString(sub.studentName)
      return cNameClean && cNameClean === sNameClean
    })
    if (exactNameMatch) return exactNameMatch

    // 3. Substring containment
    const substringMatch = subsList.find(sub => {
      const cNameClean = cleanNameString(sub.studentName)
      if (!cNameClean || !sNameClean) return false
      return sNameClean.includes(cNameClean) || cNameClean.includes(sNameClean)
    })
    if (substringMatch) return substringMatch

    // 4. Token overlap
    const tokenMatch = subsList.find(sub => {
      const cNameClean = cleanNameString(sub.studentName)
      const cTokens = cNameClean.split(' ').filter(w => w.length > 1)
      if (cTokens.length === 0 || sTokens.length === 0) return false
      const common = cTokens.filter(t => sTokens.includes(t))
      return common.length >= 2 || (cTokens.length === 1 && common.length === 1)
    })
    if (tokenMatch) return tokenMatch

    return null
  }

  const hasClassroomToken = Boolean(getStoredClassroomToken())

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.pageBg }}>
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl mb-3" style={{ color: theme.textSecondary }} />
          <p className="text-sm" style={{ color: theme.textSecondary }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-4" style={{ background: theme.pageBg }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 mb-3 text-sm"
          style={{ color: theme.textSecondary }}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          Back
        </button>
        <div className="p-4" style={{ background: theme.redBg, border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
          <p className="text-sm" style={{ color: theme.redText }}>{error}</p>
        </div>
      </div>
    )
  }

  // Calculate totals for summary
  const totalStudents = students.length
  const gradedStudents = students.filter(s => {
    const g = grades[s.detail_siswa_id]
    return g && (g.A !== null || g.B !== null || g.C !== null || g.D !== null)
  }).length

  return (
    <div className="min-h-screen" style={{ background: theme.pageBg }}>
      {/* Compact Header */}
      <div className="sticky top-0 z-30" style={{ background: theme.cardBg, borderBottom: `1px solid ${theme.border}` }}>
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-1.5 rounded transition-colors"
                style={{ color: theme.textSecondary }}
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate" style={{ color: theme.textPrimary }}>{assessment?.assessment_nama}</h1>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.textSecondary }}>
                  <span>{new Date(assessment?.assessment_tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {mypYear && <span className="font-medium" style={{ color: theme.blueText }}>• MYP {mypYear}</span>}
                  <span>• {gradedStudents}/{totalStudents} graded</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <FontAwesomeIcon icon={faCheckCircle} className="text-sm" style={{ color: theme.greenText }} />
              )}
              <button
                onClick={downloadGradeTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors"
                style={{ color: theme.blueText, border: `1px solid ${theme.border}`, background: theme.cardBg }}
                title="Download Grade Template (.xlsx)"
              >
                <FontAwesomeIcon icon={faDownload} className="text-xs" />
                <span>Download Template</span>
              </button>
              <button
                onClick={() => importRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors"
                style={{ color: theme.textBody, border: `1px solid ${theme.border}`, background: theme.cardBg }}
                title="Import from Excel"
              >
                <FontAwesomeIcon icon={faUpload} className="text-xs" />
                <span>Import Excel</span>
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleGradeImport(file)
                }}
              />
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors"
                style={{ color: theme.textBody, border: `1px solid ${theme.border}`, background: theme.cardBg }}
                title="Export CSV"
              >
                <FontAwesomeIcon icon={faFileExcel} className="text-xs" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || isDraftLocked}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                style={{ background: isDraftLocked ? '#9ca3af' : theme.textPrimary, color: theme.cardBg, cursor: (saving || isDraftLocked) ? 'not-allowed' : 'pointer' }}
              >
                <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} className="text-xs" />
                <span className="hidden sm:inline">{saving ? 'Saving...' : isDraftLocked ? 'Locked (Draft)' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Warning Banner */}
      {isDraftLocked && (
        <div style={{ margin: '12px 12px 0 12px', padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.3)', color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🔒</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Grading Locked (Draft Unit Planner)</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>The Unit Planner for this assessment is saved as a <strong>DRAFT</strong>. Please publish the Unit Planner in <strong>Unit Planners (/data/topic-new)</strong> to unlock grading.</div>
          </div>
        </div>
      )}

      {/* Google Classroom Sync Bar */}
      {classroomLinks.length > 0 && (
        <div className="px-3 pt-3">
          <div 
            className="p-3.5 rounded-[8px] flex flex-col gap-3 text-xs" 
            style={{ 
              fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif",
              background: theme.cardBg,
              border: `1px solid ${theme.border}`,
              color: theme.textPrimary
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <GoogleClassroomIcon className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs" style={{ color: theme.textPrimary }}>
                      {classroomLinks.length === 1 
                        ? classroomLinks[0].courseworkTitle 
                        : `${classroomLinks.length} Classroom Assignments Linked`
                      }
                    </span>
                    <span 
                      className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider"
                      style={{ 
                        background: theme.greenBg, 
                        color: theme.greenText, 
                        border: `1px solid ${isDark ? 'rgba(123, 175, 123, 0.25)' : '#D5E6D3'}` 
                      }}
                    >
                      Classroom Linked
                    </span>
                  </div>
                  <div className="text-[11px] font-mono mt-0.5 truncate flex items-center gap-2 flex-wrap" style={{ color: theme.textSecondary }}>
                    {classroomLinks.map((link, idx) => {
                      const subs = submissionsByCoursework[link.courseworkId] || []
                      const turnedIn = students.filter(s => {
                        const sub = findStudentSubmission(subs, s)
                        return sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED')
                      }).length
                      const isActive = link.courseworkId === currentLink?.courseworkId

                      return (
                        <button
                          key={link.courseworkId || idx}
                          type="button"
                          onClick={() => setActiveCourseworkId(link.courseworkId)}
                          className="inline-flex items-center gap-1 cursor-pointer transition-colors"
                          style={{
                            color: isActive ? theme.textPrimary : theme.textSecondary,
                            fontWeight: isActive ? 700 : 500,
                            textDecoration: isActive ? 'underline' : 'none'
                          }}
                        >
                          <span>{link.courseworkTitle}:</span>
                          <span className="font-bold" style={{ color: theme.greenText }}>{turnedIn}/{students.length}</span>
                          {idx < classroomLinks.length - 1 && <span className="ml-1 no-underline" style={{ color: theme.border }}>·</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
                <GoogleClassroomConnector
                  assessmentId={assessment?.assessment_id}
                  assessment={assessment}
                  onSuccess={handleClassroomUpdate}
                  triggerButtonOnly={true}
                  triggerLabel={`Manage Links (${classroomLinks.length})`}
                />

                {!hasClassroomToken ? (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={isAuthenticating}
                    className="px-3 py-1.5 text-xs font-mono font-semibold rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    style={{
                      background: isDark ? '#FFFFFF' : '#111111',
                      color: isDark ? '#111111' : '#FFFFFF'
                    }}
                  >
                    {isAuthenticating ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                    ) : (
                      <GoogleClassroomIcon className="w-3.5 h-3.5" />
                    )}
                    <span>Connect to Load Work</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fetchClassroomSubmissions()}
                      disabled={loadingSubmissions}
                      className="px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5"
                      style={{
                        background: theme.subtleBg,
                        border: `1px solid ${theme.border}`,
                        color: theme.textPrimary
                      }}
                      title="Refresh student submissions for all linked assignments"
                    >
                      <FontAwesomeIcon icon={faRotateRight} className={loadingSubmissions ? 'animate-spin text-xs' : 'text-xs'} />
                      <span>{loadingSubmissions ? 'Syncing...' : 'Sync All'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      disabled={isAuthenticating}
                      className="px-2 py-1 text-[11px] font-mono rounded transition-colors cursor-pointer"
                      style={{
                        background: theme.subtleBg,
                        border: `1px solid ${theme.border}`,
                        color: theme.textSecondary
                      }}
                      title="Re-authorize Google Classroom permissions"
                    >
                      <span>Re-authorize</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {classroomError && (
            <div 
              className="mt-2 p-2.5 rounded-[6px] text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              style={{
                background: theme.redBg,
                color: theme.redText,
                border: `1px solid ${isDark ? 'rgba(220,133,133,0.25)' : '#F9D7D9'}`
              }}
            >
              <span>{classroomError}</span>
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isAuthenticating}
                className="px-2.5 py-1 rounded text-xs font-sans font-semibold shrink-0 cursor-pointer self-start sm:self-auto"
                style={{
                  background: theme.redText,
                  color: isDark ? '#18171A' : '#FFFFFF'
                }}
              >
                {isAuthenticating ? 'Connecting...' : 'Re-authorize Google Classroom'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Compact Grading Table */}
      <div className="p-3">
        <div className="rounded-lg overflow-hidden" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold sticky left-0 z-10 min-w-[180px]" style={{ background: theme.subtleBg, color: theme.textSecondary, borderBottom: `1px solid ${theme.border}` }}>
                    Student
                  </th>
                  {classroomLinks.length > 0 && (
                    <th 
                      className="px-2.5 py-1.5 text-left text-xs font-semibold w-[220px] max-w-[240px]" 
                      style={{ background: theme.subtleBg, color: theme.textSecondary, borderBottom: `1px solid ${theme.border}` }}
                    >
                      <div className="flex flex-col gap-1 w-full overflow-hidden">
                        <div className="flex items-center justify-between gap-1 text-[11px] font-mono uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 font-bold truncate" style={{ color: theme.textPrimary }}>
                            <GoogleClassroomIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Classroom Work</span>
                          </span>
                          {currentLink?.alternateLink && (
                            <a
                              href={currentLink.alternateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] lowercase font-mono inline-flex items-center gap-0.5 shrink-0 hover:underline"
                              style={{ color: theme.textSecondary }}
                              title="Open current assignment in Google Classroom"
                            >
                              <span>open</span>
                              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[8px]" />
                            </a>
                          )}
                        </div>

                        {/* Interactive Tab Switcher in Header */}
                        {classroomLinks.length > 1 && (
                          <div 
                            className="flex items-center gap-1 p-0.5 rounded-[5px] w-full"
                            style={{
                              background: theme.cardBg,
                              border: `1px solid ${theme.border}`
                            }}
                          >
                            {classroomLinks.map((link) => {
                              const isActive = link.courseworkId === currentLink?.courseworkId
                              const subs = submissionsByCoursework[link.courseworkId] || []
                              const turnedIn = students.filter(s => {
                                const sub = findStudentSubmission(subs, s)
                                return sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED')
                              }).length

                              return (
                                <button
                                  key={link.courseworkId}
                                  type="button"
                                  onClick={() => setActiveCourseworkId(link.courseworkId)}
                                  className="flex-1 min-w-0 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-semibold transition-all cursor-pointer truncate text-center flex items-center justify-center gap-1"
                                  style={{
                                    background: isActive ? (isDark ? theme.subtleBg : '#FFFFFF') : 'transparent',
                                    color: isActive ? theme.textPrimary : theme.textSecondary,
                                    border: isActive ? `1px solid ${theme.border}` : '1px solid transparent',
                                    fontWeight: isActive ? 700 : 500
                                  }}
                                  title={`${link.courseworkTitle} (${turnedIn}/${students.length} turned in)`}
                                >
                                  <span className="truncate">{formatTabLabel(link.courseworkTitle)}</span>
                                  <span 
                                    className="text-[9px] px-1 py-0.1 rounded shrink-0 font-bold"
                                    style={{
                                      background: isActive ? theme.greenBg : 'transparent',
                                      color: isActive ? theme.greenText : theme.textSecondary
                                    }}
                                  >
                                    {turnedIn}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                  {criteria.map(c => (
                    <th key={c.criterion_id} className={`px-3 py-2 text-center min-w-[120px] ${getCriterionColor(c.code)}`} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <div className="text-white font-bold text-sm">{c.code}</div>
                      <div className="text-white/80 text-[10px] font-normal">{c.name}</div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-xs font-semibold min-w-[50px]" style={{ background: theme.textPrimary, color: theme.pageBg, borderBottom: `1px solid ${theme.border}` }}>
                    Final
                  </th>
                  <th className="px-2 py-2 w-8" style={{ background: theme.textPrimary, borderBottom: `1px solid ${theme.border}` }}></th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const studentGrades = grades[student.detail_siswa_id] || {}
                  const hasGrades = studentGrades.A !== null || studentGrades.B !== null || studentGrades.C !== null || studentGrades.D !== null
                  return (
                    <tr
                      key={student.detail_siswa_id}
                      style={{ borderBottom: `1px solid ${theme.border}`, background: hasGrades ? theme.cardBg : theme.subtleBg }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.blueBg}
                      onMouseLeave={e => e.currentTarget.style.background = hasGrades ? theme.cardBg : theme.subtleBg}
                    >
                      <td
                        className="px-3 py-1.5 sticky left-0 z-10"
                        style={{ background: 'inherit', borderRight: `1px solid ${theme.border}` }}
                      >
                        <span className="text-xs mr-2" style={{ color: theme.textSecondary }}>{index + 1}.</span>
                        <span className="font-medium text-sm" style={{ color: theme.textPrimary }}>{student.nama}</span>
                      </td>
                      {classroomLinks.length > 0 && (() => {
                        if (!submissionsLoaded && loadingSubmissions) {
                          return (
                            <td className="px-3 py-1.5 text-xs font-mono" style={{ color: theme.textSecondary, borderRight: `1px solid ${theme.border}` }}>
                              <span className="opacity-60 text-[11px] flex items-center gap-1">
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px]" /> Loading work...
                              </span>
                            </td>
                          )
                        }

                        if (!hasClassroomToken) {
                          return (
                            <td className="px-3 py-1.5 text-xs font-mono" style={{ color: theme.textSecondary, borderRight: `1px solid ${theme.border}` }}>
                              <button
                                type="button"
                                onClick={handleConnectGoogle}
                                className="hover:underline text-[11px] font-medium cursor-pointer"
                                style={{ color: theme.greenText }}
                              >
                                Connect to load
                              </button>
                            </td>
                          )
                        }

                        const activeLink = currentLink || classroomLinks[0]
                        const subs = submissionsByCoursework[activeLink?.courseworkId] || []
                        const sub = findStudentSubmission(subs, student)

                        if (!sub) {
                          return (
                            <td className="px-3 py-1.5 text-xs font-mono" style={{ color: theme.textSecondary, borderRight: `1px solid ${theme.border}` }}>
                              <span className="opacity-40 text-[11px]">— Not in roster</span>
                            </td>
                          )
                        }

                        const isTurnedIn = sub.state === 'TURNED_IN'
                        const isReturned = sub.state === 'RETURNED'
                        const attachments = sub.attachments || []

                        return (
                          <td className="px-2.5 py-1.5 text-xs w-[220px] max-w-[240px] truncate" style={{ borderRight: `1px solid ${theme.border}` }}>
                            <div className="flex items-center gap-1.5 flex-nowrap min-w-0 w-full overflow-hidden">
                              <span 
                                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider shrink-0"
                                style={{
                                  background: isTurnedIn ? theme.greenBg : isReturned ? theme.blueBg : theme.yellowBg,
                                  color: isTurnedIn ? theme.greenText : isReturned ? theme.blueText : theme.yellowText,
                                  border: `1px solid ${isTurnedIn ? (isDark ? 'rgba(123, 175, 123, 0.25)' : '#D5E6D3') : isReturned ? (isDark ? 'rgba(124, 184, 220, 0.25)' : '#BDE3FC') : (isDark ? 'rgba(196, 162, 74, 0.25)' : '#F5E6B3')}`
                                }}
                              >
                                {isTurnedIn ? 'Turned In' : isReturned ? 'Returned' : 'Assigned'}
                              </span>

                              {sub.late && (
                                <span 
                                  className="px-1 py-0.2 rounded text-[8px] font-mono font-bold uppercase tracking-wider shrink-0"
                                  style={{
                                    background: theme.redBg,
                                    color: theme.redText,
                                    border: `1px solid ${isDark ? 'rgba(220, 133, 133, 0.25)' : '#F9D7D9'}`
                                  }}
                                >
                                  Late
                                </span>
                              )}

                              {attachments.length > 0 ? (
                                <div className="flex items-center gap-1.5 min-w-0 truncate">
                                  {attachments.map((att, attIdx) => (
                                    <div key={attIdx} className="inline-flex items-center gap-1 min-w-0 truncate">
                                      <button
                                        type="button"
                                        onClick={() => setActivePreviewDoc({ ...att, studentName: student.nama, assignmentTitle: activeLink.courseworkTitle })}
                                        className="text-[11px] font-medium hover:underline truncate max-w-[125px] text-left cursor-pointer inline-flex items-center gap-1"
                                        style={{ color: theme.textPrimary }}
                                        title={`Preview ${att.title}`}
                                      >
                                        <FontAwesomeIcon icon={faFileLines} className="text-[10px] shrink-0" style={{ color: theme.textSecondary }} />
                                        <span className="truncate">{att.title}</span>
                                      </button>
                                      {att.alternateLink && (
                                        <a
                                          href={att.alternateLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[9px] shrink-0 cursor-pointer hover:opacity-100"
                                          style={{ color: theme.textSecondary }}
                                          title="Open in new tab"
                                        >
                                          <FontAwesomeIcon icon={faExternalLinkAlt} />
                                        </a>
                                      )}
                                      {attIdx < attachments.length - 1 && <span className="shrink-0" style={{ color: theme.border }}>·</span>}
                                    </div>
                                  ))}
                                </div>
                              ) : isTurnedIn ? (
                                <span className="text-[10px] font-mono italic shrink-0" style={{ color: theme.textSecondary }}>Submitted (no files)</span>
                              ) : (
                                <span className="text-[10px] font-mono italic shrink-0" style={{ color: theme.textSecondary }}>Not turned in</span>
                              )}
                            </div>
                          </td>
                        )
                      })()}
                      {criteria.map(c => (
                        <td key={c.criterion_id} className="px-1 py-1 text-center">
                          <select
                            value={studentGrades[c.code] ?? ''}
                            onChange={(e) => handleGradeChange(student.detail_siswa_id, c.code, e.target.value)}
                            className={`w-11 h-7 text-center text-sm font-semibold rounded border focus:outline-none cursor-pointer appearance-none ${getGradeColor(studentGrades[c.code])}`}
                          >
                            <option value="">-</option>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </td>
                      ))}
                      <td className="px-1 py-1 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-7 rounded text-sm font-bold ${getFinalGradeColor(studentGrades.final_grade)}`}>
                          {studentGrades.final_grade ?? '-'}
                        </span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        {hasGrades && (
                          <button
                            onClick={() => handleClearStudentGrades(student)}
                            className="p-1 rounded transition-colors"
                            style={{ color: theme.textSecondary }}
                            onMouseEnter={e => { e.currentTarget.style.color = theme.redText; e.currentTarget.style.background = theme.redBg }}
                            onMouseLeave={e => { e.currentTarget.style.color = theme.textSecondary; e.currentTarget.style.background = 'transparent' }}
                            title={`Hapus nilai ${student.nama}`}
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compact Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs" style={{ color: theme.textSecondary }}>
          <span className="font-medium" style={{ color: theme.textBody }}>Scale:</span>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center bg-red-100 text-red-600 font-bold">0-2</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center bg-amber-100 text-amber-600 font-bold">3-4</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center bg-blue-100 text-blue-600 font-bold">5-6</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center bg-emerald-100 text-emerald-600 font-bold">7-8</span>
          </div>
          <span style={{ color: theme.border }}>|</span>
          <span>Final: Sum → IB 1-7</span>
        </div>
      </div>
      {/* Student Work Preview Modal (React Portal to document.body) */}
      {mounted && activePreviewDoc && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setActivePreviewDoc(null)}
          className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="rounded-[8px] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150" style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, boxShadow: "0 25px 60px rgba(0, 0, 0, 0.45)" }}
            style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)' }}
          >
            {/* Header */}
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#EDF3EC] text-[#346538] border border-[#D5E6D3]">
                  STUDENT WORK
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold truncate max-w-md" style={{ color: theme.textPrimary }}>
                    {activePreviewDoc.title}
                  </h3>
                  {activePreviewDoc.studentName && (
                    <p className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>
                      Student: {activePreviewDoc.studentName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activePreviewDoc.alternateLink && (
                  <a
                    href={activePreviewDoc.alternateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors inline-flex items-center gap-1.5" style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  >
                    <span>Open in Drive / Docs</span>
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[9px]" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setActivePreviewDoc(null)}
                  className="p-1.5 rounded transition-colors cursor-pointer" style={{ color: theme.textSecondary }}
                  aria-label="Close"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-sm" />
                </button>
              </div>
            </div>

            {/* Body: Embedded Iframe Viewer */}
            <div className="flex-1 p-2 min-h-[550px] flex flex-col items-center justify-center" style={{ background: isDark ? "#121114" : "#F7F6F3" }}>
              {activePreviewDoc.previewUrl ? (
                <iframe
                  src={activePreviewDoc.previewUrl}
                  className="w-full h-[580px] rounded border border-[#EAEAEA] bg-white shadow-xs"
                  allow="autoplay"
                />
              ) : activePreviewDoc.alternateLink ? (
                <iframe
                  src={activePreviewDoc.alternateLink}
                  className="w-full h-[580px] rounded border border-[#EAEAEA] bg-white shadow-xs"
                />
              ) : (
                <div className="p-8 text-center text-xs text-[#787774] font-mono">
                  Preview is not available for this file type.
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
