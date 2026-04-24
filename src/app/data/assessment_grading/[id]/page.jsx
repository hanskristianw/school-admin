'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faSave, faSpinner, faCheckCircle, faFileExcel, faTrash, faDownload, faUpload } from '@fortawesome/free-solid-svg-icons'

export default function AssessmentGradingPage() {
  const params = useParams()
  const router = useRouter()
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
          topic:assessment_topic_id (
            topic_id,
            topic_year
          )
        `)
        .eq('assessment_id', assessmentId)
        .single()

      if (aError) throw new Error('Assessment not found: ' + aError.message)
      // TEMP: bypass approval check — allow grading regardless of status
      // if (assessmentData.assessment_status !== 1) {
      //   throw new Error('Assessment is not approved yet. Only approved assessments can be graded.')
      // }
      
      const topicYear = assessmentData.topic?.topic_year
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

      // Fetch user names
      const userIds = detailSiswa.map(ds => ds.detail_siswa_user_id)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang')
        .in('user_id', userIds)

      if (usersError) throw usersError

      const userMap = new Map()
      usersData.forEach(u => {
        userMap.set(u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim())
      })

      const studentList = detailSiswa
        .map(ds => ({
          detail_siswa_id: ds.detail_siswa_id,
          nama: userMap.get(ds.detail_siswa_user_id) || 'Unknown'
        }))
        .sort((a, b) => a.nama.localeCompare(b.nama))

      setStudents(studentList)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-500 mb-3" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 mb-3 text-sm"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{error}</p>
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
    <div className="min-h-screen bg-slate-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-slate-800 truncate">{assessment?.assessment_nama}</h1>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>{new Date(assessment?.assessment_tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {mypYear && <span className="text-indigo-500 font-medium">• MYP {mypYear}</span>}
                  <span>• {gradedStudents}/{totalStudents} graded</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 text-sm" />
              )}
              <button
                onClick={downloadGradeTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded transition-colors"
                title="Download Grade Template (.xlsx)"
              >
                <FontAwesomeIcon icon={faDownload} className="text-xs" />
                <span>Download Template</span>
              </button>
              <button
                onClick={() => importRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-200 hover:bg-purple-50 rounded transition-colors"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 rounded transition-colors"
                title="Export CSV"
              >
                <FontAwesomeIcon icon={faFileExcel} className="text-xs" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
              >
                <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} className="text-xs" />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Grading Table */}
      <div className="p-3">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 bg-slate-50 sticky left-0 z-10 border-b border-slate-200 min-w-[180px]">
                    Student
                  </th>
                  {criteria.map(c => (
                    <th key={c.criterion_id} className={`px-3 py-2 text-center border-b min-w-[120px] ${getCriterionColor(c.code)}`}>
                      <div className="text-white font-bold text-sm">{c.code}</div>
                      <div className="text-white/80 text-[10px] font-normal">
                        {c.name}
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-xs font-semibold bg-slate-700 text-white border-b min-w-[50px]">
                    Final
                  </th>
                  <th className="px-2 py-2 bg-slate-700 border-b w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student, index) => {
                  const studentGrades = grades[student.detail_siswa_id] || {}
                  const hasGrades = studentGrades.A !== null || studentGrades.B !== null || studentGrades.C !== null || studentGrades.D !== null
                  return (
                    <tr key={student.detail_siswa_id} className={`${hasGrades ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/30 transition-colors`}>
                      <td className={`px-3 py-1.5 text-slate-700 sticky left-0 z-10 ${hasGrades ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/30`}>
                        <span className="text-xs text-slate-400 mr-2">{index + 1}.</span>
                        <span className="font-medium text-sm">{student.nama}</span>
                      </td>
                      {criteria.map(c => (
                        <td key={c.criterion_id} className="px-1 py-1 text-center">
                          <select
                            value={studentGrades[c.code] ?? ''}
                            onChange={(e) => handleGradeChange(student.detail_siswa_id, c.code, e.target.value)}
                            className={`w-11 h-7 text-center text-sm font-semibold rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 cursor-pointer appearance-none ${getGradeColor(studentGrades[c.code])}`}
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
                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Scale:</span>
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
          <span className="text-slate-300">|</span>
          <span className="text-slate-400">Final: Sum → IB 1-7</span>
        </div>
      </div>
    </div>
  )
}
