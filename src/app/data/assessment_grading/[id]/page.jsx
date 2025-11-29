'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faSave, faSpinner, faInfoCircle, faCheckCircle, faChevronDown, faChevronRight, faTimes, faChevronLeft, faUser, faFileExcel } from '@fortawesome/free-solid-svg-icons'

export default function AssessmentGradingPage() {
  const params = useParams()
  const router = useRouter()
  const assessmentId = params.id

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [students, setStudents] = useState([])
  const [criteria, setCriteria] = useState([])
  const [strands, setStrands] = useState([])
  const [grades, setGrades] = useState({})
  const [gradingMethod, setGradingMethod] = useState('highest')
  const [error, setError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Sidebar state - which cell is selected
  const [selectedCell, setSelectedCell] = useState(null) // { studentId, strandId, studentName }
  
  // Mobile state
  const [mobileSelectedStudentIndex, setMobileSelectedStudentIndex] = useState(0)
  const [mobileExpandedStrand, setMobileExpandedStrand] = useState(null) // strand_id

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

      // 1. Fetch assessment details
      const { data: assessmentData, error: aError } = await supabase
        .from('assessment')
        .select(`
          assessment_id,
          assessment_nama,
          assessment_tanggal,
          assessment_detail_kelas_id,
          assessment_myp_year,
          assessment_status
        `)
        .eq('assessment_id', assessmentId)
        .single()

      if (aError) throw new Error('Assessment not found: ' + aError.message)
      if (assessmentData.assessment_status !== 1) {
        throw new Error('Assessment is not approved yet. Only approved assessments can be graded.')
      }
      
      setAssessment(assessmentData)

      // 2. Fetch detail_kelas to get kelas_id and subject_id
      const { data: detailKelas, error: dkError } = await supabase
        .from('detail_kelas')
        .select(`
          detail_kelas_kelas_id,
          detail_kelas_subject_id,
          subject:detail_kelas_subject_id (
            subject_id,
            subject_name,
            grading_method
          )
        `)
        .eq('detail_kelas_id', assessmentData.assessment_detail_kelas_id)
        .single()

      if (dkError) throw new Error('Class not found: ' + dkError.message)
      
      setGradingMethod(detailKelas.subject?.grading_method || 'highest')

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

      // 5. Fetch strands for MYP year and criteria
      const yearLevel = assessmentData.assessment_myp_year
      if (!yearLevel) {
        throw new Error('MYP Year Level not set for this assessment.')
      }

      const { data: strandsData, error: sError } = await supabase
        .from('strands')
        .select(`
          strand_id,
          criterion_id,
          label,
          content,
          rubrics (
            rubric_id,
            band_label,
            description,
            min_score,
            max_score
          )
        `)
        .in('criterion_id', criterionIds)
        .eq('year_level', yearLevel)
        .order('criterion_id, label')

      if (sError) throw sError
      
      // Sort strands by criterion code then label
      const criterionCodeMap = new Map(criteriaData.map(c => [c.criterion_id, c.code]))
      const sortedStrands = strandsData.sort((a, b) => {
        const codeA = criterionCodeMap.get(a.criterion_id) || ''
        const codeB = criterionCodeMap.get(b.criterion_id) || ''
        if (codeA !== codeB) return codeA.localeCompare(codeB)
        return a.label.localeCompare(b.label)
      })
      
      setStrands(sortedStrands)

      // 6. Fetch existing grades
      const { data: existingGrades, error: gError } = await supabase
        .from('assessment_grades')
        .select(`
          grade_id,
          detail_siswa_id,
          criterion_a_grade,
          criterion_b_grade,
          criterion_c_grade,
          criterion_d_grade,
          final_grade,
          comments,
          assessment_grade_strands (
            strand_id,
            strand_grade
          )
        `)
        .eq('assessment_id', assessmentId)

      if (gError) throw gError

      // Build grades map
      const gradesMap = {}
      studentList.forEach(s => {
        gradesMap[s.detail_siswa_id] = {
          strands: {},
          criterion: { A: null, B: null, C: null, D: null },
          final_grade: null,
          comments: ''
        }
      })

      existingGrades.forEach(g => {
        if (gradesMap[g.detail_siswa_id]) {
          gradesMap[g.detail_siswa_id] = {
            strands: {},
            criterion: {
              A: g.criterion_a_grade,
              B: g.criterion_b_grade,
              C: g.criterion_c_grade,
              D: g.criterion_d_grade
            },
            final_grade: g.final_grade,
            comments: g.comments || ''
          }
          // Map strand grades
          g.assessment_grade_strands?.forEach(sg => {
            gradesMap[g.detail_siswa_id].strands[sg.strand_id] = sg.strand_grade
          })
        }
      })

      setGrades(gradesMap)

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Calculate criterion grade from strand grades
  const calculateCriterionGrade = useCallback((strandGrades) => {
    const validGrades = strandGrades.filter(g => g !== null && g !== undefined)
    if (validGrades.length === 0) return null

    switch (gradingMethod) {
      case 'highest':
        return Math.max(...validGrades)
      case 'average':
        return Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length)
      case 'median':
        const sorted = [...validGrades].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      case 'mode':
        const counts = {}
        validGrades.forEach(g => counts[g] = (counts[g] || 0) + 1)
        return parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0])
      default:
        return Math.max(...validGrades)
    }
  }, [gradingMethod])

  // Calculate final grade from criterion grades (IB MYP 1-7 scale)
  const calculateFinalGrade = (criterionGrades) => {
    const validGrades = Object.values(criterionGrades).filter(g => g !== null && g !== undefined)
    if (validGrades.length === 0) return null
    
    const total = validGrades.reduce((a, b) => a + b, 0)
    
    // IB MYP conversion table
    if (total <= 5) return 1
    if (total <= 9) return 2
    if (total <= 14) return 3
    if (total <= 18) return 4
    if (total <= 23) return 5
    if (total <= 27) return 6
    return 7
  }

  // Recalculate all criterion grades and final grade for a student
  const recalculateGrades = (studentId, strandGrades) => {
    const criterionGrades = { A: null, B: null, C: null, D: null }
    
    // Group strands by criterion and calculate grade for each
    criteria.forEach(c => {
      const criterionStrands = strands.filter(s => s.criterion_id === c.criterion_id)
      const criterionStrandGrades = criterionStrands.map(s => strandGrades[s.strand_id]).filter(g => g !== null && g !== undefined)
      criterionGrades[c.code] = calculateCriterionGrade(criterionStrandGrades)
    })
    
    const finalGrade = calculateFinalGrade(criterionGrades)
    
    return { criterion: criterionGrades, final_grade: finalGrade }
  }

  // Handle strand grade change
  const handleStrandGradeChange = (studentId, strandId, value) => {
    const numValue = value === '' ? null : parseInt(value)
    
    setGrades(prev => {
      const updated = { ...prev }
      if (!updated[studentId]) {
        updated[studentId] = {
          strands: {},
          criterion: { A: null, B: null, C: null, D: null },
          final_grade: null,
          comments: ''
        }
      }
      
      // Update strand grade
      updated[studentId] = {
        ...updated[studentId],
        strands: {
          ...updated[studentId].strands,
          [strandId]: numValue
        }
      }
      
      // Recalculate criterion and final grades
      const { criterion, final_grade } = recalculateGrades(studentId, updated[studentId].strands)
      updated[studentId].criterion = criterion
      updated[studentId].final_grade = final_grade
      
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

        // Check if any strand has a grade
        const hasAnyGrade = Object.values(studentGrades.strands).some(g => g !== null && g !== undefined)
        if (!hasAnyGrade) continue

        // Check if this student has existing grade record
        const { data: existing } = await supabase
          .from('assessment_grades')
          .select('grade_id')
          .eq('assessment_id', assessmentId)
          .eq('detail_siswa_id', student.detail_siswa_id)
          .single()

        const gradeRecord = {
          assessment_id: parseInt(assessmentId),
          detail_siswa_id: student.detail_siswa_id,
          criterion_a_grade: studentGrades.criterion.A,
          criterion_b_grade: studentGrades.criterion.B,
          criterion_c_grade: studentGrades.criterion.C,
          criterion_d_grade: studentGrades.criterion.D,
          final_grade: studentGrades.final_grade,
          comments: studentGrades.comments || null,
          updated_at: new Date().toISOString()
        }

        let gradeId
        if (existing) {
          await supabase
            .from('assessment_grades')
            .update(gradeRecord)
            .eq('grade_id', existing.grade_id)
          gradeId = existing.grade_id
        } else {
          const { data: inserted } = await supabase
            .from('assessment_grades')
            .insert([gradeRecord])
            .select('grade_id')
            .single()
          gradeId = inserted?.grade_id
        }

        // Save strand grades
        if (gradeId) {
          // Delete existing strand grades
          await supabase
            .from('assessment_grade_strands')
            .delete()
            .eq('grade_id', gradeId)

          // Insert new strand grades
          const strandRecords = Object.entries(studentGrades.strands)
            .filter(([_, grade]) => grade !== null && grade !== undefined)
            .map(([strandId, grade]) => ({
              grade_id: gradeId,
              strand_id: parseInt(strandId),
              strand_grade: grade
            }))

          if (strandRecords.length > 0) {
            await supabase
              .from('assessment_grade_strands')
              .insert(strandRecords)
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

  // Get color for strand grade (0-8)
  const getGradeColor = (grade) => {
    if (grade === null || grade === undefined) return 'bg-white'
    if (grade <= 2) return 'bg-red-100'
    if (grade <= 4) return 'bg-yellow-100'
    if (grade <= 6) return 'bg-blue-100'
    return 'bg-green-100'
  }

  // Get color for criterion (header)
  const getCriterionColor = (code) => {
    switch (code) {
      case 'A': return 'bg-red-600'
      case 'B': return 'bg-orange-500'
      case 'C': return 'bg-blue-600'
      case 'D': return 'bg-purple-600'
      default: return 'bg-gray-600'
    }
  }

  const getCriterionLightColor = (code) => {
    switch (code) {
      case 'A': return 'bg-red-50 border-red-200'
      case 'B': return 'bg-orange-50 border-orange-200'
      case 'C': return 'bg-blue-50 border-blue-200'
      case 'D': return 'bg-purple-50 border-purple-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getFinalGradeColor = (grade) => {
    if (grade === null || grade === undefined) return 'bg-gray-100 text-gray-400'
    if (grade <= 2) return 'bg-red-500 text-white'
    if (grade <= 4) return 'bg-yellow-500 text-white'
    if (grade <= 5) return 'bg-blue-500 text-white'
    return 'bg-green-500 text-white'
  }

  // Group strands by criterion
  const strandsByCriterion = criteria.map(c => ({
    ...c,
    strands: strands.filter(s => s.criterion_id === c.criterion_id)
  }))

  // Get the selected strand info
  const getSelectedStrand = () => {
    if (!selectedCell) return null
    return strands.find(s => s.strand_id === selectedCell.strandId)
  }

  // Get criterion for a strand
  const getCriterionForStrand = (strandId) => {
    const strand = strands.find(s => s.strand_id === strandId)
    if (!strand) return null
    return criteria.find(c => c.criterion_id === strand.criterion_id)
  }

  // Get rubric for a specific grade
  const getRubricForGrade = (strand, grade) => {
    if (!strand?.rubrics || grade === null || grade === undefined) return null
    return strand.rubrics.find(r => grade >= r.min_score && grade <= r.max_score)
  }

  // Get color for band label
  const getBandColor = (bandLabel) => {
    if (bandLabel === '1-2') return 'bg-red-50 text-red-700 border-red-200'
    if (bandLabel === '3-4') return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    if (bandLabel === '5-6') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (bandLabel === '7-8') return 'bg-green-50 text-green-700 border-green-200'
    return 'bg-gray-50 text-gray-700 border-gray-200'
  }

  // Get available grades based on rubrics
  const getAvailableGrades = (strand) => {
    if (!strand?.rubrics || strand.rubrics.length === 0) {
      return [0, 1, 2, 3, 4, 5, 6, 7, 8]
    }
    const grades = new Set()
    strand.rubrics.forEach(r => {
      for (let i = r.min_score; i <= r.max_score; i++) {
        grades.add(i)
      }
    })
    return Array.from(grades).sort((a, b) => a - b)
  }

  // Handle cell click - open sidebar
  const handleCellClick = (studentId, strandId, studentName) => {
    setSelectedCell({ studentId, strandId, studentName })
  }

  // Close sidebar
  const closeSidebar = () => {
    setSelectedCell(null)
  }

  // Export to CSV (Excel compatible with ; separator)
  const handleExport = () => {
    // Build header row - only criterion grades
    const headers = ['No', 'Student Name']
    
    // Add criterion grade columns
    criteria.forEach(c => {
      headers.push(`Criterion ${c.code}`)
    })
    
    // Build data rows
    const rows = students.map((student, idx) => {
      const studentGrades = grades[student.detail_siswa_id] || { strands: {}, criterion: {} }
      const row = [idx + 1, student.nama]
      
      // Add criterion grades
      criteria.forEach(c => {
        const grade = studentGrades.criterion[c.code]
        row.push(grade !== null && grade !== undefined ? grade : '')
      })
      
      return row
    })
    
    // Create CSV content with ; separator
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => {
        // Escape cells that contain ; or "
        const cellStr = String(cell)
        if (cellStr.includes(';') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(';'))
    ].join('\n')
    
    // Add BOM for Excel to recognize UTF-8
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // Create download link
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    // Generate filename
    const date = new Date(assessment?.assessment_tanggal).toISOString().split('T')[0]
    const filename = `${assessment?.assessment_nama || 'assessment'}_${date}.csv`
    link.setAttribute('download', filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_'))
    
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-blue-500 mb-4" />
          <p className="text-gray-600">Loading assessment data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const selectedStrand = getSelectedStrand()
  const selectedCriterion = selectedCell ? getCriterionForStrand(selectedCell.strandId) : null
  const selectedGrade = selectedCell ? grades[selectedCell.studentId]?.strands[selectedCell.strandId] : null
  const currentRubric = selectedStrand ? getRubricForGrade(selectedStrand, selectedGrade) : null

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Fixed Header */}
      <div className={`bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm flex-shrink-0 transition-all duration-300 ${selectedCell ? 'lg:mr-80' : ''}`}>
        <div className="px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="border-l border-gray-300 pl-4 min-w-0 flex-1">
              <h1 className="text-lg font-bold text-gray-800 truncate">{assessment?.assessment_nama}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{new Date(assessment?.assessment_tanggal).toLocaleDateString()}</span>
                <span className="text-indigo-600 font-medium">MYP Year {assessment?.assessment_myp_year}</span>
                <span className="text-purple-600">• {gradingMethod}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {saveSuccess && (
                <span className="flex items-center gap-2 text-green-600 text-sm">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span className="hidden sm:inline">Saved!</span>
                </span>
              )}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                title="Export to Excel (CSV)"
              >
                <FontAwesomeIcon icon={faFileExcel} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save All'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Spreadsheet + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Spreadsheet Area - Hidden on mobile */}
        <div className={`hidden lg:block flex-1 overflow-auto transition-all duration-300 ${selectedCell ? 'mr-80' : ''}`}>
          <div className="p-4">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <FontAwesomeIcon icon={faInfoCircle} />
                <span>
                  Click on any cell to see strand details and rubric descriptors in the sidebar. 
                  Criterion grades calculated using <strong>{gradingMethod}</strong> method.
                </span>
              </div>
            </div>

            {/* Spreadsheet Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-max">
                  {/* Header Row 1 - Criteria */}
                  <thead>
                    <tr>
                      <th 
                        rowSpan={2}
                        className="sticky left-0 z-20 bg-gray-800 text-white px-4 py-3 text-left font-semibold border-r border-gray-700 min-w-[180px]"
                      >
                        Student Name
                      </th>
                      {strandsByCriterion.map(c => (
                        <th 
                          key={c.criterion_id}
                          colSpan={c.strands.length}
                          className={`px-2 py-2 text-center text-white font-semibold border-r border-gray-600 ${getCriterionColor(c.code)}`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold">Criterion {c.code}</span>
                            <span className="text-xs opacity-80 truncate max-w-[150px]" title={c.name}>{c.name}</span>
                          </div>
                        </th>
                      ))}
                      {/* Criterion Grade Columns */}
                      {criteria.map(c => (
                        <th 
                          key={`crit-${c.code}`}
                          rowSpan={2}
                          className={`px-2 py-2 text-center text-white font-semibold border-r border-gray-600 min-w-[50px] ${getCriterionColor(c.code)}`}
                        >
                          <div className="text-xs">{c.code}</div>
                        </th>
                      ))}
                    </tr>
                    {/* Header Row 2 - Strands */}
                    <tr className="bg-gray-100">
                      {strandsByCriterion.map(c => 
                        c.strands.map(strand => (
                          <th 
                            key={strand.strand_id}
                            className={`px-1 py-2 text-center text-xs font-medium border-r border-gray-300 min-w-[60px] ${getCriterionLightColor(c.code)} group relative cursor-help`}
                          >
                            <span className="text-gray-700 font-bold">{strand.label}</span>
                            {/* Tooltip with strand description */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left pointer-events-none">
                              <div className="font-bold text-purple-300 mb-1">Strand {strand.label}</div>
                              <div className="leading-relaxed">{strand.content}</div>
                              {/* Arrow */}
                              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
                            </div>
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => {
                      const studentGrades = grades[student.detail_siswa_id] || { strands: {}, criterion: {}, final_grade: null }
                      return (
                        <tr key={student.detail_siswa_id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {/* Student Name - Sticky */}
                          <td className={`sticky left-0 z-10 px-4 py-2 font-medium text-gray-800 border-r border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <span className="text-sm">{student.nama}</span>
                          </td>
                          {/* Strand Grade Inputs */}
                          {strandsByCriterion.map(c => 
                            c.strands.map(strand => {
                              const grade = studentGrades.strands[strand.strand_id]
                              const isSelected = selectedCell?.studentId === student.detail_siswa_id && selectedCell?.strandId === strand.strand_id
                              const availableGrades = getAvailableGrades(strand)
                              
                              return (
                                <td 
                                  key={strand.strand_id}
                                  onClick={() => handleCellClick(student.detail_siswa_id, strand.strand_id, student.nama)}
                                  className={`px-1 py-1 text-center border-r border-gray-200 cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'ring-2 ring-blue-500 ring-inset bg-blue-50' 
                                      : 'hover:bg-blue-50'
                                  } ${getGradeColor(grade)}`}
                                >
                                  <select
                                    value={grade ?? ''}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      handleStrandGradeChange(student.detail_siswa_id, strand.strand_id, e.target.value)
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCellClick(student.detail_siswa_id, strand.strand_id, student.nama)
                                    }}
                                    className={`w-12 px-0.5 py-1 text-center text-sm font-bold border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer ${getGradeColor(grade)}`}
                                  >
                                    <option value="">-</option>
                                    {availableGrades.map(g => (
                                      <option key={g} value={g}>{g}</option>
                                    ))}
                                  </select>
                                </td>
                              )
                            })
                          )}
                          {/* Criterion Grades (Calculated) */}
                          {criteria.map(c => (
                            <td 
                              key={`crit-${c.code}`}
                              className={`px-1 py-1 text-center border-r border-gray-200 ${getCriterionLightColor(c.code)}`}
                            >
                              <span className={`inline-flex items-center justify-center w-8 h-7 rounded text-sm font-bold ${
                                studentGrades.criterion[c.code] !== null 
                                  ? 'bg-gray-800 text-white' 
                                  : 'bg-gray-200 text-gray-400'
                              }`}>
                                {studentGrades.criterion[c.code] ?? '-'}
                              </span>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="font-medium text-gray-700">Grade Colors:</span>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-red-100 border border-red-200"></span>
                  <span className="text-gray-600">0-2</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-yellow-100 border border-yellow-200"></span>
                  <span className="text-gray-600">3-4</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-blue-100 border border-blue-200"></span>
                  <span className="text-gray-600">5-6</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-green-100 border border-green-200"></span>
                  <span className="text-gray-600">7-8</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Rubric Details (Desktop Only) */}
        <div className={`hidden lg:block fixed right-0 top-12 bottom-0 w-80 bg-white border-l border-gray-200 shadow-lg transform transition-transform duration-300 z-40 overflow-y-auto ${
          selectedCell ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {selectedCell && selectedStrand && (
            <div className="h-full flex flex-col">
              {/* Sidebar Header */}
              <div className={`p-4 border-b ${getCriterionColor(selectedCriterion?.code)} text-white`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs opacity-80">Grading for</div>
                    <div className="font-bold">{selectedCell.studentName}</div>
                  </div>
                  <button
                    onClick={closeSidebar}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              </div>

              {/* Criterion Info */}
              <div className={`px-4 py-3 ${getCriterionLightColor(selectedCriterion?.code)} border-b`}>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-white text-xs font-bold ${getCriterionColor(selectedCriterion?.code)}`}>
                    Criterion {selectedCriterion?.code}
                  </span>
                  <span className="text-sm text-gray-700">{selectedCriterion?.name}</span>
                </div>
              </div>

              {/* Strand Info */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded">
                    Strand {selectedStrand.label}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{selectedStrand.content}</p>
              </div>

              {/* Grade Selector */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Grade:</label>
                  <select
                    value={selectedGrade ?? ''}
                    onChange={(e) => handleStrandGradeChange(selectedCell.studentId, selectedCell.strandId, e.target.value)}
                    className="px-3 py-2 text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[80px] text-center"
                  >
                    <option value="">-</option>
                    {getAvailableGrades(selectedStrand).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Current Band (if grade selected) */}
              {currentRubric && (
                <div className={`p-4 border-b ${getBandColor(currentRubric.band_label)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded border border-current">
                      Current Level: {currentRubric.band_label}
                    </span>
                  </div>
                  <p className="text-sm">{currentRubric.description}</p>
                </div>
              )}

              {/* All Rubric Bands */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-3">All Achievement Levels</h4>
                  
                  {selectedStrand.rubrics && selectedStrand.rubrics.length > 0 ? (
                    <div className="space-y-2">
                      {selectedStrand.rubrics
                        .sort((a, b) => b.max_score - a.max_score)
                        .map(rubric => {
                          const isCurrentBand = currentRubric?.rubric_id === rubric.rubric_id
                          return (
                            <div 
                              key={rubric.rubric_id}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                isCurrentBand 
                                  ? 'ring-2 ring-blue-500 ' + getBandColor(rubric.band_label)
                                  : getBandColor(rubric.band_label)
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold px-2 py-0.5 rounded border border-current">
                                  {rubric.band_label}
                                </span>
                                <span className="text-xs text-gray-500">
                                  (Score: {rubric.min_score}-{rubric.max_score})
                                </span>
                                {isCurrentBand && (
                                  <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-xs leading-relaxed">{rubric.description}</p>
                            </div>
                          )
                        })
                      }
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700">
                        ⚠️ No rubrics configured for this strand. All grades 0-8 are available.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={closeSidebar}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile View - Card Based */}
        <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
          {/* Student Selector */}
          <div className="bg-white border-b border-gray-200 p-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileSelectedStudentIndex(prev => Math.max(0, prev - 1))}
                disabled={mobileSelectedStudentIndex === 0}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-gray-600" />
              </button>
              
              <div className="flex-1 relative">
                <select
                  value={mobileSelectedStudentIndex}
                  onChange={(e) => setMobileSelectedStudentIndex(parseInt(e.target.value))}
                  className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {students.map((student, idx) => (
                    <option key={student.detail_siswa_id} value={idx}>
                      {idx + 1}. {student.nama}
                    </option>
                  ))}
                </select>
                <FontAwesomeIcon 
                  icon={faChevronDown} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs" 
                />
              </div>

              <button
                onClick={() => setMobileSelectedStudentIndex(prev => Math.min(students.length - 1, prev + 1))}
                disabled={mobileSelectedStudentIndex === students.length - 1}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-gray-600" />
              </button>
            </div>
            <div className="text-center text-xs text-gray-500 mt-1">
              Student {mobileSelectedStudentIndex + 1} of {students.length}
            </div>
          </div>

          {/* Student Card Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {(() => {
              const student = students[mobileSelectedStudentIndex]
              if (!student) return null
              
              const studentGrades = grades[student.detail_siswa_id] || { strands: {}, criterion: {}, final_grade: null }
              
              return (
                <>
                  {/* Criterion Summary */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <h3 className="text-xs font-bold text-gray-600 uppercase mb-2">Criterion Grades</h3>
                    <div className="flex gap-2">
                      {criteria.map(c => (
                        <div 
                          key={c.code}
                          className={`flex-1 p-2 rounded-lg text-center ${getCriterionLightColor(c.code)}`}
                        >
                          <div className={`text-xs font-bold ${getCriterionColor(c.code).replace('bg-', 'text-')}`}>
                            {c.code}
                          </div>
                          <div className={`text-lg font-bold mt-1 ${
                            studentGrades.criterion[c.code] !== null 
                              ? 'text-gray-800' 
                              : 'text-gray-300'
                          }`}>
                            {studentGrades.criterion[c.code] ?? '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strands by Criterion */}
                  {strandsByCriterion.map(c => (
                    <div key={c.criterion_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      {/* Criterion Header */}
                      <div className={`px-3 py-2 ${getCriterionColor(c.code)} text-white`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm">Criterion {c.code}</span>
                            <span className="text-xs opacity-80 ml-2">{c.name}</span>
                          </div>
                          <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded">
                            {studentGrades.criterion[c.code] ?? '-'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Strands List */}
                      <div className="divide-y divide-gray-100">
                        {c.strands.map(strand => {
                          const grade = studentGrades.strands[strand.strand_id]
                          const availableGrades = getAvailableGrades(strand)
                          const isExpanded = mobileExpandedStrand === strand.strand_id
                          const rubricForGrade = getRubricForGrade(strand, grade)
                          
                          return (
                            <div key={strand.strand_id} className="bg-white">
                              {/* Strand Row */}
                              <div className="p-3">
                                <div className="flex items-start gap-3">
                                  {/* Strand Label & Content */}
                                  <button
                                    onClick={() => setMobileExpandedStrand(isExpanded ? null : strand.strand_id)}
                                    className="flex-1 text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                                        {strand.label}
                                      </span>
                                      <FontAwesomeIcon 
                                        icon={isExpanded ? faChevronDown : faChevronRight} 
                                        className="text-gray-400 text-xs"
                                      />
                                    </div>
                                    <p className={`text-xs text-gray-600 mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                      {strand.content}
                                    </p>
                                  </button>
                                  
                                  {/* Grade Select */}
                                  <div className="flex-shrink-0">
                                    <select
                                      value={grade ?? ''}
                                      onChange={(e) => handleStrandGradeChange(student.detail_siswa_id, strand.strand_id, e.target.value)}
                                      className={`w-14 px-2 py-2 text-center text-sm font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${getGradeColor(grade)}`}
                                    >
                                      <option value="">-</option>
                                      {availableGrades.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                
                                {/* Current Level Badge */}
                                {rubricForGrade && (
                                  <div className={`mt-2 px-2 py-1 rounded text-xs ${getBandColor(rubricForGrade.band_label)}`}>
                                    <span className="font-bold">{rubricForGrade.band_label}:</span> {rubricForGrade.description.length > 60 ? rubricForGrade.description.substring(0, 60) + '...' : rubricForGrade.description}
                                  </div>
                                )}
                              </div>
                              
                              {/* Expanded Rubric Details */}
                              {isExpanded && strand.rubrics && strand.rubrics.length > 0 && (
                                <div className="px-3 pb-3 pt-0">
                                  <div className="bg-gray-50 rounded-lg p-2 space-y-2">
                                    <div className="text-xs font-bold text-gray-600">Achievement Levels:</div>
                                    {strand.rubrics
                                      .sort((a, b) => b.max_score - a.max_score)
                                      .map(rubric => (
                                        <div 
                                          key={rubric.rubric_id}
                                          onClick={() => {
                                            // Quick select grade from rubric band
                                            const midScore = Math.ceil((rubric.min_score + rubric.max_score) / 2)
                                            handleStrandGradeChange(student.detail_siswa_id, strand.strand_id, midScore.toString())
                                          }}
                                          className={`p-2 rounded border cursor-pointer transition-all hover:ring-2 hover:ring-blue-400 ${
                                            rubricForGrade?.rubric_id === rubric.rubric_id 
                                              ? 'ring-2 ring-blue-500 ' + getBandColor(rubric.band_label)
                                              : getBandColor(rubric.band_label)
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold px-1.5 py-0.5 rounded border border-current">
                                              {rubric.band_label}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              ({rubric.min_score}-{rubric.max_score})
                                            </span>
                                            {rubricForGrade?.rubric_id === rubric.rubric_id && (
                                              <FontAwesomeIcon icon={faCheckCircle} className="text-blue-600 text-xs" />
                                            )}
                                          </div>
                                          <p className="text-xs leading-relaxed">{rubric.description}</p>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Legend */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-medium text-gray-700">Colors:</span>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-red-100 border border-red-200"></span>
                        <span className="text-gray-600">0-2</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></span>
                        <span className="text-gray-600">3-4</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></span>
                        <span className="text-gray-600">5-6</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-green-100 border border-green-200"></span>
                        <span className="text-gray-600">7-8</span>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
