'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileExcel,
  faSearch,
  faSpinner,
  faLayerGroup,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons'
import ExcelJS from 'exceljs'

export default function UnitGradeRecap({
  theme,
  isDark,
  reportYears = [],
  reportFilters = {},
  handleReportFilterChange,
  reportKelasOptions = [],
  supabase,
  isAdmin = false
}) {
  const [selectedUnit, setSelectedUnit] = useState(1) // Default to Unit 1
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Internal class list fallback in case parent options are loading or filtered out
  const [internalClasses, setInternalClasses] = useState([])
  const classesList = (reportKelasOptions && reportKelasOptions.length > 0) ? reportKelasOptions : internalClasses

  // Data states
  const [students, setStudents] = useState([])
  const [topics, setTopics] = useState([])
  const [assessments, setAssessments] = useState([])
  const [grades, setGrades] = useState([])

  const currentYearId = reportFilters.year
  const currentKelasId = reportFilters.kelas

  // Criteria Badge Style Helper (0-8 scale)
  const getCriteriaBadgeStyle = (score) => {
    if (score === null || score === undefined || score === '' || isNaN(score)) {
      return null
    }
    const n = Number(score)
    if (n >= 7) {
      // 7-8 Excellent (Green)
      return {
        bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
        text: isDark ? '#34D399' : '#065F46',
        border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0'
      }
    }
    if (n >= 5) {
      // 5-6 Good / Proficient (Blue)
      return {
        bg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
        text: isDark ? '#60A5FA' : '#1E40AF',
        border: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE'
      }
    }
    if (n >= 3) {
      // 3-4 Basic / Adequate (Amber/Yellow)
      return {
        bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
        text: isDark ? '#FBBF24' : '#92400E',
        border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A'
      }
    }
    // 0-2 Limited / Needs Support (Red/Rose)
    return {
      bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
      text: isDark ? '#F87171' : '#991B1B',
      border: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA'
    }
  }

  // Fallback direct fetch of MYP classes for currentYearId
  useEffect(() => {
    if (!currentYearId) {
      setInternalClasses([])
      return
    }

    let isCancelled = false
    const fetchMypClasses = async () => {
      try {
        const { data: unitsData } = await supabase
          .from('unit')
          .select('unit_id, unit_name, is_myp')

        const mypIds = new Set(
          (unitsData || [])
            .filter(u => u.is_myp || (u.unit_name && u.unit_name.toUpperCase().includes('MYP')))
            .map(u => u.unit_id)
        )

        const { data: kData, error: kErr } = await supabase
          .from('kelas')
          .select('kelas_id, kelas_nama, kelas_unit_id')
          .eq('kelas_year_id', parseInt(currentYearId, 10))
          .order('kelas_nama')

        if (kErr) throw kErr

        if (!isCancelled) {
          const sorted = (kData || [])
            .filter(k => mypIds.has(k.kelas_unit_id))
            .sort((a, b) => (a.kelas_nama || '').localeCompare(b.kelas_nama || '', undefined, { numeric: true, sensitivity: 'base' }))
          setInternalClasses(sorted)
        }
      } catch (err) {
        console.error('Error fetching MYP classes in UnitGradeRecap:', err)
      }
    }

    fetchMypClasses()
    return () => {
      isCancelled = true
    }
  }, [currentYearId, supabase])

  // Load data whenever year, kelas, or selectedUnit changes
  useEffect(() => {
    if (!currentKelasId) {
      setStudents([])
      setTopics([])
      setAssessments([])
      setGrades([])
      return
    }

    let isCancelled = false

    const fetchRecapData = async () => {
      setLoading(true)
      try {
        const parsedKelasId = parseInt(currentKelasId, 10)

        // 1. Fetch Students in this class
        const { data: detailSiswaData, error: dsErr } = await supabase
          .from('detail_siswa')
          .select('detail_siswa_id, detail_siswa_user_id, users(user_id, user_nama_depan, user_nama_belakang, user_email)')
          .eq('detail_siswa_kelas_id', parsedKelasId)

        if (dsErr) throw dsErr

        const formattedStudents = (detailSiswaData || [])
          .map(ds => ({
            id: ds.detail_siswa_id,
            userId: ds.detail_siswa_user_id,
            fullName: `${ds.users?.user_nama_depan || ''} ${ds.users?.user_nama_belakang || ''}`.trim() || 'Unknown Student',
            email: ds.users?.user_email || ''
          }))
          .sort((a, b) => a.fullName.localeCompare(b.fullName))

        // 2. Fetch Topics for this class & unit number
        const { data: topicData, error: tErr } = await supabase
          .from('topic')
          .select('topic_id, topic_nama, topic_subject_id, topic_urutan, subject(subject_id, subject_name)')
          .eq('topic_kelas_id', parsedKelasId)
          .eq('topic_urutan', selectedUnit)

        if (tErr) throw tErr

        const formattedTopics = (topicData || [])
          .map(t => ({
            topicId: t.topic_id,
            topicName: t.topic_nama || `Unit ${selectedUnit}`,
            subjectId: t.topic_subject_id,
            subjectName: t.subject?.subject_name || `Subject #${t.topic_subject_id}`
          }))
          .sort((a, b) => a.subjectName.localeCompare(b.subjectName))

        // 3. Fetch Assessments for these topics
        const topicIds = formattedTopics.map(t => t.topicId)
        let formattedAssessments = []
        let formattedGrades = []

        if (topicIds.length > 0) {
          const { data: assData, error: assErr } = await supabase
            .from('assessment')
            .select('assessment_id, assessment_nama, assessment_topic_id, assessment_tanggal')
            .in('assessment_topic_id', topicIds)

          if (assErr) throw assErr
          formattedAssessments = assData || []

          const assessmentIds = formattedAssessments.map(a => a.assessment_id)

          // 4. Fetch Grades for these assessments (chunked pagination to respect 1000 row cap)
          if (assessmentIds.length > 0) {
            let allGrades = []
            let from = 0
            const chunkSize = 1000
            let hasMore = true

            while (hasMore) {
              const { data: gChunk, error: gErr } = await supabase
                .from('assessment_grades')
                .select('grade_id, assessment_id, detail_siswa_id, criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade, final_grade, comments')
                .in('assessment_id', assessmentIds)
                .range(from, from + chunkSize - 1)

              if (gErr) throw gErr
              if (!gChunk || gChunk.length === 0) break

              allGrades = allGrades.concat(gChunk)
              if (gChunk.length < chunkSize) {
                hasMore = false
              } else {
                from += chunkSize
              }
            }

            formattedGrades = allGrades
          }
        }

        if (!isCancelled) {
          setStudents(formattedStudents)
          setTopics(formattedTopics)
          setAssessments(formattedAssessments)
          setGrades(formattedGrades)
        }
      } catch (err) {
        console.error('Error fetching recap data:', err?.message || err)
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    fetchRecapData()

    return () => {
      isCancelled = true
    }
  }, [currentKelasId, selectedUnit, supabase])

  // Map grades per student and subject (criteria A-D)
  const { matrix, subjectStats } = useMemo(() => {
    const studentGradesMap = {}
    students.forEach(st => {
      studentGradesMap[st.id] = {
        student: st,
        subjects: {}
      }
    })

    // Group assessments by topic
    const topicAssessmentMap = {}
    assessments.forEach(ass => {
      topicAssessmentMap[ass.assessment_topic_id] = topicAssessmentMap[ass.assessment_topic_id] || []
      topicAssessmentMap[ass.assessment_topic_id].push(ass)
    })

    // Index grades by assessmentId and detailSiswaId
    const gradesIndex = {}
    grades.forEach(g => {
      gradesIndex[`${g.assessment_id}_${g.detail_siswa_id}`] = g
    })

    // Populate matrix
    topics.forEach(t => {
      const tAssessments = topicAssessmentMap[t.topicId] || []
      students.forEach(st => {
        let bestGrade = null
        let bestAssessment = null

        tAssessments.forEach(ass => {
          const g = gradesIndex[`${ass.assessment_id}_${st.id}`]
          if (
            g &&
            (g.criterion_a_grade != null ||
              g.criterion_b_grade != null ||
              g.criterion_c_grade != null ||
              g.criterion_d_grade != null ||
              g.final_grade != null)
          ) {
            if (!bestGrade) {
              bestGrade = g
              bestAssessment = ass
            }
          }
        })

        if (bestGrade && studentGradesMap[st.id]) {
          studentGradesMap[st.id].subjects[t.subjectId] = {
            subjectId: t.subjectId,
            subjectName: t.subjectName,
            topicId: t.topicId,
            topicName: t.topicName,
            assessmentName: bestAssessment?.assessment_nama || '',
            critA: bestGrade.criterion_a_grade,
            critB: bestGrade.criterion_b_grade,
            critC: bestGrade.criterion_c_grade,
            critD: bestGrade.criterion_d_grade,
            comments: bestGrade.comments || ''
          }
        }
      })
    })

    // Calculate Subject Statistics (A, B, C, D averages and assessed students count)
    const statsPerSubject = {}
    topics.forEach(t => {
      const aScores = []
      const bScores = []
      const cScores = []
      const dScores = []
      let assessedCount = 0

      students.forEach(st => {
        const cell = studentGradesMap[st.id]?.subjects[t.subjectId]
        if (cell) {
          let hasAny = false
          if (cell.critA != null) { aScores.push(Number(cell.critA)); hasAny = true }
          if (cell.critB != null) { bScores.push(Number(cell.critB)); hasAny = true }
          if (cell.critC != null) { cScores.push(Number(cell.critC)); hasAny = true }
          if (cell.critD != null) { dScores.push(Number(cell.critD)); hasAny = true }
          if (hasAny) assessedCount++
        }
      })

      const calcAvg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null

      statsPerSubject[t.subjectId] = {
        subjectId: t.subjectId,
        subjectName: t.subjectName,
        gradedCount: assessedCount,
        totalStudents: students.length,
        critA_avg: calcAvg(aScores),
        critB_avg: calcAvg(bScores),
        critC_avg: calcAvg(cScores),
        critD_avg: calcAvg(dScores)
      }
    })

    return {
      matrix: Object.values(studentGradesMap),
      subjectStats: statsPerSubject
    }
  }, [students, topics, assessments, grades])

  // Filter matrix by student search query
  const filteredMatrix = useMemo(() => {
    if (!searchQuery.trim()) return matrix
    const q = searchQuery.toLowerCase()
    return matrix.filter(r => r.student.fullName.toLowerCase().includes(q))
  }, [matrix, searchQuery])

  // Current selected class name & year name
  const selectedKelasObj = classesList.find(k => k.kelas_id === parseInt(currentKelasId, 10))
  const selectedYearObj = reportYears.find(y => y.year_id === parseInt(currentYearId, 10))
  const kelasName = selectedKelasObj?.kelas_nama || 'Class'
  const yearName = selectedYearObj?.year_name || 'Academic Year'

  // Export to Excel function
  const handleExportExcel = async () => {
    if (exporting || !filteredMatrix.length || !topics.length) return
    setExporting(true)
    try {
      const wb = new ExcelJS.Workbook()
      wb.creator = 'School Admin System'
      wb.created = new Date()

      const ws = wb.addWorksheet(`Unit ${selectedUnit} Recap`)

      const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      }

      // ── Header Title Info ──
      ws.mergeCells('A1:L1')
      const titleCell = ws.getCell('A1')
      titleCell.value = `IB MYP GRADE RECAP - UNIT ${selectedUnit}`
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A5F' } }
      titleCell.alignment = { vertical: 'middle' }
      ws.getRow(1).height = 24

      ws.mergeCells('A2:L2')
      const subCell = ws.getCell('A2')
      const formattedDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      subCell.value = `Class: ${kelasName}  |  Academic Year: ${yearName}  |  Export Date: ${formattedDate}`
      subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF4B5563' } }
      ws.getRow(2).height = 18

      const startCol = 3 // Col C

      // Setup row 4 and row 5 for table header
      const row4 = ws.getRow(4)
      const row5 = ws.getRow(5)
      row4.height = 24
      row5.height = 20

      // Fixed columns: No & Student Name
      ws.getCell('A4').value = 'No'
      ws.getCell('B4').value = 'Student Name'
      ws.mergeCells('A4:A5')
      ws.mergeCells('B4:B5')

      let currentCol = startCol

      topics.forEach(t => {
        // Span 4 columns: A, B, C, D
        const endCol = currentCol + 3
        ws.mergeCells(4, currentCol, 4, endCol)
        const cell = ws.getCell(4, currentCol)
        cell.value = t.subjectName
        cell.font = { name: 'Arial', size: 10, bold: true }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }

        ws.getCell(5, currentCol).value = 'A'
        ws.getCell(5, currentCol + 1).value = 'B'
        ws.getCell(5, currentCol + 2).value = 'C'
        ws.getCell(5, currentCol + 3).value = 'D'

        currentCol = endCol + 1
      })

      const totalCols = currentCol - 1

      // Style header rows
      for (let r = 4; r <= 5; r++) {
        const row = ws.getRow(r)
        for (let c = 1; c <= totalCols; c++) {
          const cell = row.getCell(c)
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E3A5F' }
          }
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } }
          cell.border = thinBorder
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      }

      // Column widths
      ws.getColumn(1).width = 6 // No
      ws.getColumn(2).width = 30 // Student Name
      let wIdx = startCol
      topics.forEach(() => {
        ws.getColumn(wIdx++).width = 6 // A
        ws.getColumn(wIdx++).width = 6 // B
        ws.getColumn(wIdx++).width = 6 // C
        ws.getColumn(wIdx++).width = 6 // D
      })

      // ── Data Rows ──
      let dataRowIdx = 6
      filteredMatrix.forEach((rowItem, idx) => {
        const r = ws.getRow(dataRowIdx++)
        r.height = 20

        r.getCell(1).value = idx + 1
        r.getCell(2).value = rowItem.student.fullName

        let cIdx = startCol
        topics.forEach(t => {
          const cellData = rowItem.subjects[t.subjectId]
          const cVals = [
            cellData?.critA,
            cellData?.critB,
            cellData?.critC,
            cellData?.critD
          ]

          cVals.forEach(v => {
            const cell = r.getCell(cIdx++)
            cell.value = v != null ? v : '-'
            if (v != null) {
              const n = Number(v)
              if (n >= 7) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
                cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF065F46' } }
              } else if (n >= 5) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
                cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } }
              } else if (n >= 3) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
                cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF92400E' } }
              } else {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
                cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF991B1B' } }
              }
            }
          })
        })

        // Borders & Alignments
        for (let c = 1; c <= totalCols; c++) {
          const cell = r.getCell(c)
          cell.border = thinBorder
          if (c === 2) {
            cell.font = { name: 'Arial', size: 9.5 }
            cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 }
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
          }
        }
      })

      // ── Footer Statistics ──
      // Row 1: Criterion Average
      const avgRow = ws.getRow(dataRowIdx++)
      avgRow.height = 21
      avgRow.getCell(1).value = ''
      avgRow.getCell(2).value = 'Criterion Average'
      let statColIdx = startCol
      topics.forEach(t => {
        const stat = subjectStats[t.subjectId]
        avgRow.getCell(statColIdx++).value = stat?.critA_avg ? Number(stat.critA_avg) : '-'
        avgRow.getCell(statColIdx++).value = stat?.critB_avg ? Number(stat.critB_avg) : '-'
        avgRow.getCell(statColIdx++).value = stat?.critC_avg ? Number(stat.critC_avg) : '-'
        avgRow.getCell(statColIdx++).value = stat?.critD_avg ? Number(stat.critD_avg) : '-'
      })

      // Row 2: Students Assessed
      const compRow = ws.getRow(dataRowIdx++)
      compRow.height = 20
      compRow.getCell(1).value = ''
      compRow.getCell(2).value = 'Students Assessed'
      let compColIdx = startCol
      topics.forEach(t => {
        const stat = subjectStats[t.subjectId]
        const val = stat ? `${stat.gradedCount}/${stat.totalStudents}` : '-'
        ws.mergeCells(dataRowIdx - 1, compColIdx, dataRowIdx - 1, compColIdx + 3)
        compRow.getCell(compColIdx).value = val
        compColIdx += 4
      })

      // Format footer rows
      for (let r = dataRowIdx - 2; r < dataRowIdx; r++) {
        const row = ws.getRow(r)
        for (let c = 1; c <= totalCols; c++) {
          const cell = row.getCell(c)
          cell.border = thinBorder
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF111827' } }
          cell.alignment = c === 2 ? { horizontal: 'left', vertical: 'middle', indent: 0.5 } : { horizontal: 'center', vertical: 'middle' }
        }
      }

      // Legend note at bottom
      const legendRow = ws.getRow(dataRowIdx + 1)
      legendRow.height = 18
      legendRow.getCell(2).value = '* IB MYP Criteria Score Scale: 0 to 8 across Criteria A, B, C, D.'
      legendRow.getCell(2).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6B7280' } }

      // Write and download buffer
      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeKelas = kelasName.replace(/[\/\s]/g, '_')
      const safeYear = yearName.replace(/[\/\s]/g, '-')
      a.download = `IB_MYP_Unit_${selectedUnit}_Criteria_Recap_${safeKelas}_${safeYear}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating Excel recap:', err)
      alert('Failed to export Excel: ' + (err.message || 'An error occurred'))
    } finally {
      setExporting(false)
    }
  }

  // Helper to render criterion score cell with badge styling
  const renderCriterionCell = (val, isLastInSubject = false) => {
    const badgeStyle = getCriteriaBadgeStyle(val)
    return (
      <td
        className="px-1 py-1.5 text-center"
        style={{
          borderRight: isLastInSubject ? `1px solid ${theme.border}` : `1px dashed ${theme.border}`
        }}
      >
        {badgeStyle ? (
          <span
            className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded font-bold text-xs"
            style={{
              background: badgeStyle.bg,
              color: badgeStyle.text,
              border: `1px solid ${badgeStyle.border}`
            }}
          >
            {val}
          </span>
        ) : (
          <span className="opacity-30 font-mono text-xs">—</span>
        )}
      </td>
    )
  }

  // Helper to render average footer cell
  const renderAvgCell = (avgVal, isLastInSubject = false) => {
    const badgeStyle = getCriteriaBadgeStyle(avgVal)
    return (
      <td
        className="px-1 py-2 text-center font-mono text-xs font-bold"
        style={{
          borderRight: isLastInSubject ? `1px solid ${theme.border}` : `1px dashed ${theme.border}`,
          color: badgeStyle ? badgeStyle.text : theme.textSecondary
        }}
      >
        {avgVal || '—'}
      </td>
    )
  }

  // Unit Options: strictly 4 units as standard in IB MYP
  const unitOptions = [1, 2, 3, 4]

  return (
    <div className="space-y-6">
      {/* ── TOP FILTER BAR & ACTIONS ── */}
      <div
        className="p-5 rounded-lg border shadow-xs"
        style={{ background: theme.cardBg, borderColor: theme.border }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Year Filter */}
          <div>
            <label className="block text-xs font-mono font-medium uppercase tracking-wider mb-1.5" style={{ color: theme.textSecondary }}>
              Academic Year
            </label>
            <select
              value={currentYearId || ''}
              onChange={(e) => handleReportFilterChange('year', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md focus:outline-none"
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.textPrimary
              }}
            >
              <option value="">Select Academic Year</option>
              {reportYears.map(year => (
                <option key={year.year_id} value={year.year_id}>{year.year_name}</option>
              ))}
            </select>
          </div>

          {/* Kelas Filter */}
          <div>
            <label className="block text-xs font-mono font-medium uppercase tracking-wider mb-1.5" style={{ color: theme.textSecondary }}>
              Class
            </label>
            <select
              value={currentKelasId || ''}
              onChange={(e) => handleReportFilterChange('kelas', e.target.value)}
              disabled={!currentYearId}
              className="w-full px-3 py-2 text-xs rounded-md focus:outline-none"
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.textPrimary,
                opacity: !currentYearId ? 0.5 : 1
              }}
            >
              <option value="">
                {!currentYearId ? 'Select Academic Year First' : (classesList.length === 0 ? 'No Classes Found' : 'Select Class')}
              </option>
              {classesList.map(kelas => (
                <option key={kelas.kelas_id} value={kelas.kelas_id}>{kelas.kelas_nama}</option>
              ))}
            </select>
          </div>

          {/* Unit Selector Pills */}
          <div className="md:col-span-2">
            <label className="block text-xs font-mono font-medium uppercase tracking-wider mb-1.5" style={{ color: theme.textSecondary }}>
              Select Unit (Topic Sequence)
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {unitOptions.map(unitNum => {
                const isActive = selectedUnit === unitNum
                return (
                  <button
                    key={unitNum}
                    type="button"
                    onClick={() => setSelectedUnit(unitNum)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer flex items-center gap-1.5"
                    style={{
                      background: isActive
                        ? (isDark ? '#3B82F6' : '#1E3A5F')
                        : theme.subtleBg,
                      color: isActive ? '#FFFFFF' : theme.textSecondary,
                      borderColor: isActive
                        ? (isDark ? '#60A5FA' : '#1E3A5F')
                        : theme.border
                    }}
                  >
                    <FontAwesomeIcon icon={faLayerGroup} className="text-[10px]" />
                    <span>Unit {unitNum}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Second Row: Search & Export */}
        {currentKelasId && (
          <div className="mt-4 pt-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-3" style={{ borderColor: theme.border }}>
            {/* Student Search */}
            <div className="relative w-72">
              <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.textSecondary }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md focus:outline-none"
                style={{
                  border: `1px solid ${theme.border}`,
                  background: theme.inputBg,
                  color: theme.textPrimary
                }}
              />
            </div>

            {/* Export Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting || loading || !filteredMatrix.length || !topics.length}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md border transition-all flex items-center gap-2 hover:brightness-110 active:scale-95 cursor-pointer"
                style={{
                  background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                  borderColor: isDark ? '#10B981' : '#A7F3D0',
                  color: isDark ? '#34D399' : '#065F46',
                  opacity: (exporting || loading || !filteredMatrix.length || !topics.length) ? 0.5 : 1,
                  cursor: (exporting || loading || !filteredMatrix.length || !topics.length) ? 'not-allowed' : 'pointer'
                }}
                title="Export Detailed Criteria Recap to Excel (.xlsx)"
              >
                <FontAwesomeIcon icon={exporting ? faSpinner : faFileExcel} className={exporting ? 'animate-spin' : ''} />
                <span>{exporting ? 'Exporting...' : 'Export to Excel'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN MATRIX TABLE CONTAINER ── */}
      {!currentKelasId ? (
        <div className="p-12 text-center rounded-lg border" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <FontAwesomeIcon icon={faInfoCircle} className="text-2xl mb-2 opacity-40" />
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Select Academic Year and Class</h3>
          <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: theme.textSecondary }}>
            Please select an academic year and class above to view the Unit {selectedUnit} criteria matrix.
          </p>
        </div>
      ) : loading ? (
        <div className="p-16 text-center rounded-lg border" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl mb-3" style={{ color: isDark ? '#60A5FA' : '#0284C7' }} />
          <p className="text-xs font-mono" style={{ color: theme.textSecondary }}>Loading Unit {selectedUnit} criteria recap data...</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="p-12 text-center rounded-lg border" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <FontAwesomeIcon icon={faLayerGroup} className="text-2xl mb-2 opacity-40" />
          <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>No Unit Planner Found for Unit {selectedUnit}</h3>
          <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: theme.textSecondary }}>
            No topics or assessments have been created for Unit {selectedUnit} in class {kelasName}. Please select another unit sequence above or create unit topics in the Planning tab.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden shadow-xs" style={{ background: theme.cardBg, borderColor: theme.border }}>
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-xs border-collapse">
              {/* ── Table Header ── */}
              <thead className="sticky top-0 z-20" style={{ background: isDark ? '#18181B' : '#F9FAFB' }}>
                <tr className="border-b" style={{ borderColor: theme.border }}>
                  <th
                    rowSpan={2}
                    className="px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider w-12 sticky left-0 z-30"
                    style={{ background: isDark ? '#18181B' : '#F9FAFB', borderColor: theme.border, borderRight: `1px solid ${theme.border}` }}
                  >
                    No
                  </th>
                  <th
                    rowSpan={2}
                    className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider min-w-[200px] sticky left-12 z-30"
                    style={{ background: isDark ? '#18181B' : '#F9FAFB', borderColor: theme.border, borderRight: `1px solid ${theme.border}` }}
                  >
                    Student Name
                  </th>

                  {topics.map(t => (
                    <th
                      key={t.topicId}
                      colSpan={4}
                      className="px-3 py-2 text-center font-semibold border-r"
                      style={{ borderColor: theme.border, color: theme.textPrimary }}
                    >
                      <div className="truncate max-w-[200px] mx-auto text-xs" title={t.subjectName}>
                        {t.subjectName}
                      </div>
                      <div className="text-[10px] font-normal truncate max-w-[190px] mx-auto opacity-60" title={t.topicName}>
                        {t.topicName}
                      </div>
                    </th>
                  ))}
                </tr>

                {/* Sub-header for criteria A, B, C, D */}
                <tr className="border-b text-[10px] font-mono" style={{ borderColor: theme.border, background: isDark ? '#27272A' : '#F3F4F6' }}>
                  {topics.map(t => (
                    <React.Fragment key={`sub_${t.topicId}`}>
                      <th className="px-2 py-1 text-center w-9" style={{ borderRight: `1px dashed ${theme.border}`, color: theme.textSecondary }}>A</th>
                      <th className="px-2 py-1 text-center w-9" style={{ borderRight: `1px dashed ${theme.border}`, color: theme.textSecondary }}>B</th>
                      <th className="px-2 py-1 text-center w-9" style={{ borderRight: `1px dashed ${theme.border}`, color: theme.textSecondary }}>C</th>
                      <th className="px-2 py-1 text-center w-9" style={{ borderRight: `1px solid ${theme.border}`, color: theme.textSecondary }}>D</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              {/* ── Table Body ── */}
              <tbody className="divide-y" style={{ borderColor: theme.border }}>
                {filteredMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={topics.length * 4 + 2} className="py-8 text-center text-xs" style={{ color: theme.textSecondary }}>
                      No students match the search filter.
                    </td>
                  </tr>
                ) : (
                  filteredMatrix.map((rowItem, idx) => (
                    <tr
                      key={rowItem.student.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* Col 1: No */}
                      <td
                        className="px-3 py-2.5 text-center font-mono text-[11px] sticky left-0 z-10"
                        style={{ background: theme.cardBg, borderRight: `1px solid ${theme.border}`, color: theme.textSecondary }}
                      >
                        {idx + 1}
                      </td>

                      {/* Col 2: Student Name */}
                      <td
                        className="px-4 py-2.5 font-medium whitespace-nowrap sticky left-12 z-10"
                        style={{ background: theme.cardBg, borderRight: `1px solid ${theme.border}`, color: theme.textPrimary }}
                      >
                        <div className="font-semibold text-xs">{rowItem.student.fullName}</div>
                      </td>

                      {/* Subject Criteria Cells: A, B, C, D */}
                      {topics.map(t => {
                        const cellData = rowItem.subjects[t.subjectId]

                        return (
                          <React.Fragment key={`${rowItem.student.id}_${t.subjectId}`}>
                            {renderCriterionCell(cellData?.critA, false)}
                            {renderCriterionCell(cellData?.critB, false)}
                            {renderCriterionCell(cellData?.critC, false)}
                            {renderCriterionCell(cellData?.critD, true)}
                          </React.Fragment>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>

              {/* ── Table Footer Statistics ── */}
              <tfoot className="border-t-2 font-semibold" style={{ borderColor: theme.border, background: isDark ? '#1C1917' : '#F8FAFC' }}>
                {/* Row 1: Average per Criterion */}
                <tr className="border-b" style={{ borderColor: theme.border }}>
                  <td colSpan={2} className="px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider sticky left-0 z-10" style={{ background: isDark ? '#1C1917' : '#F8FAFC', borderRight: `1px solid ${theme.border}` }}>
                    Criterion Average
                  </td>
                  {topics.map(t => {
                    const stat = subjectStats[t.subjectId]
                    return (
                      <React.Fragment key={`avg_${t.topicId}`}>
                        {renderAvgCell(stat?.critA_avg, false)}
                        {renderAvgCell(stat?.critB_avg, false)}
                        {renderAvgCell(stat?.critC_avg, false)}
                        {renderAvgCell(stat?.critD_avg, true)}
                      </React.Fragment>
                    )
                  })}
                </tr>

                {/* Row 2: Students Assessed */}
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-wider sticky left-0 z-10" style={{ background: isDark ? '#1C1917' : '#F8FAFC', borderRight: `1px solid ${theme.border}`, color: theme.textSecondary }}>
                    Students Assessed
                  </td>
                  {topics.map(t => {
                    const stat = subjectStats[t.subjectId]
                    const text = stat ? `${stat.gradedCount}/${stat.totalStudents}` : '—'
                    return (
                      <td
                        key={`comp_${t.topicId}`}
                        colSpan={4}
                        className="px-2 py-1.5 text-center font-mono text-[10.5px]"
                        style={{ borderRight: `1px solid ${theme.border}`, color: theme.textSecondary }}
                      >
                        {text}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table Legend */}
          <div className="p-3 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ background: theme.subtleBg, borderColor: theme.border }}>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold" style={{ color: theme.textSecondary }}>IB MYP Criteria Scale (0–8):</span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: '#10B981' }}></span>
                <span>7–8 (Excellent)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: '#3B82F6' }}></span>
                <span>5–6 (Proficient)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }}></span>
                <span>3–4 (Basic)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }}></span>
                <span>1–2 (Limited / Needs Support)</span>
              </span>
            </div>
            <div className="italic text-[10px]" style={{ color: theme.textSecondary }}>
              * Data aggregated from saved assessment criterion scores for Unit {selectedUnit}.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
