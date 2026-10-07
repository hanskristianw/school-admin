'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHeartPulse,
  faPlus,
  faEdit,
  faTrash,
  faSave,
  faTimes,
  faSpinner,
  faCheck,
  faFilePdf,
  faExclamationTriangle,
  faChevronLeft,
  faChevronRight,
  faInbox,
  faGraduationCap
} from '@fortawesome/free-solid-svg-icons'
import { generateStudentReportHTML } from '@/app/data/topic-new/lib/pdfGenerators'
import { generatePypClassReportPDF } from '@/app/data/pyp/lib/pypPdfGenerator'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// ─── WYSIWYG Document Table Component ─────────────────────────────────────
function DocumentTable({
  title,
  columns,
  rows,
  onAdd,
  onUpdate,
  onRequestDelete,
  addLabel = '+ Baris',
  isDark,
  tokens
}) {
  const [editId, setEditId] = useState(null)
  const [editRow, setEditRow] = useState({})
  const [newRow, setNewRow] = useState(null)
  const [saving, setSaving] = useState(false)

  const startEdit = (row) => {
    setEditId(row.id)
    setEditRow({ ...row })
  }
  const cancelEdit = () => {
    setEditId(null)
    setEditRow({})
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await onUpdate(editId, editRow)
      setEditId(null)
    } finally {
      setSaving(false)
    }
  }

  const saveNew = async () => {
    setSaving(true)
    try {
      await onAdd(newRow)
      setNewRow(null)
    } finally {
      setSaving(false)
    }
  }

  const cellInputStyle = {
    background: isDark ? '#1F2937' : '#FFFFFF',
    border: `1px solid ${isDark ? '#374151' : '#93C5FD'}`,
    color: tokens.textPrimary,
    borderRadius: '3px',
    fontSize: '11px',
    padding: '3px 6px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box'
  }

  return (
    <div
      className="border overflow-hidden"
      style={{
        borderColor: tokens.docBorder,
        borderRadius: '4px',
        background: tokens.cardBg
      }}
    >
      {/* Blue Header Banner (Official Report Header) */}
      <div
        className="px-3 py-1.5 text-center font-bold text-white text-xs tracking-wider flex items-center justify-between"
        style={{ background: '#2563EB' }}
      >
        <span className="w-12"></span>
        <span className="font-bold tracking-wider uppercase text-xs">{title}</span>
        <div className="w-12 text-right">
          {!newRow && (
            <button
              onClick={() =>
                setNewRow(columns.reduce((a, c) => ({ ...a, [c.key]: '' }), {}))
              }
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors"
              title={addLabel}
            >
              <FontAwesomeIcon icon={faPlus} className="mr-1" />
              Baris
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr
              style={{
                background: isDark ? '#1E3A8A' : '#DBEAFE',
                borderBottom: `1px solid ${tokens.docBorder}`
              }}
            >
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-2.5 py-1.5 text-left font-bold uppercase text-[10px] tracking-wider border-r last:border-r-0 whitespace-nowrap"
                  style={{
                    color: isDark ? '#93C5FD' : '#1E40AF',
                    borderColor: tokens.docBorder,
                    width: c.width || 'auto'
                  }}
                >
                  {c.label}
                </th>
              ))}
              <th
                className="px-2 py-1.5 text-center font-bold uppercase text-[10px] tracking-wider"
                style={{
                  color: isDark ? '#93C5FD' : '#1E40AF',
                  width: '65px'
                }}
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !newRow && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="py-4 text-center text-xs font-mono"
                  style={{ color: tokens.textSecondary }}
                >
                  Belum ada data. Klik &ldquo;+ Baris&rdquo; untuk menambahkan.
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const isEditing = editId === row.id
              return (
                <tr
                  key={row.id}
                  className="border-b transition-colors hover:bg-blue-50/20 dark:hover:bg-blue-950/20"
                  style={{ borderColor: tokens.docBorder }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="px-2.5 py-1.5 border-r last:border-r-0 text-xs"
                      style={{ borderColor: tokens.docBorder }}
                    >
                      {isEditing ? (
                        c.type === 'select' ? (
                          <select
                            value={editRow[c.key] || ''}
                            onChange={(e) =>
                              setEditRow((p) => ({ ...p, [c.key]: e.target.value }))
                            }
                            style={cellInputStyle}
                          >
                            <option value="">-</option>
                            {(c.options || MONTHS).map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={c.type || 'text'}
                            value={editRow[c.key] ?? ''}
                            onChange={(e) =>
                              setEditRow((p) => ({ ...p, [c.key]: e.target.value }))
                            }
                            style={cellInputStyle}
                          />
                        )
                      ) : (
                        <span style={{ color: tokens.textPrimary }}>
                          {c.type === 'date' && row[c.key]
                            ? new Date(row[c.key]).toLocaleDateString('en-GB')
                            : row[c.key] !== null && row[c.key] !== undefined && row[c.key] !== ''
                            ? String(row[c.key])
                            : '—'}
                        </span>
                      )}
                    </td>
                  ))}

                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-green-600 hover:bg-green-700"
                          title="Simpan"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-1.5 py-0.5 rounded text-[10px] border text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Batal"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => startEdit(row)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-0.5"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} className="text-[11px]" />
                        </button>
                        <button
                          onClick={() => onRequestDelete(row.id)}
                          className="text-red-500 hover:text-red-700 p-0.5"
                          title="Hapus"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}

            {/* Inline New Row Input Form */}
            {newRow && (
              <tr
                style={{
                  background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
                  borderBottom: `1px solid ${tokens.docBorder}`
                }}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className="px-2.5 py-1.5 border-r last:border-r-0"
                    style={{ borderColor: tokens.docBorder }}
                  >
                    {c.type === 'select' ? (
                      <select
                        value={newRow[c.key] || ''}
                        onChange={(e) =>
                          setNewRow((p) => ({ ...p, [c.key]: e.target.value }))
                        }
                        style={cellInputStyle}
                      >
                        <option value="">-</option>
                        {(c.options || MONTHS).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={c.type || 'text'}
                        value={newRow[c.key] || ''}
                        onChange={(e) =>
                          setNewRow((p) => ({ ...p, [c.key]: e.target.value }))
                        }
                        placeholder={c.label}
                        style={cellInputStyle}
                      />
                    )}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={saveNew}
                      disabled={saving}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-green-600 hover:bg-green-700"
                      title="Tambah"
                    >
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                    <button
                      onClick={() => setNewRow(null)}
                      className="px-1.5 py-0.5 rounded text-[10px] border text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Batal"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Health Report Page ───────────────────────────────────────────────
export default function HealthReportPage() {
  const { theme, isDark } = useTheme()

  // ─── Minimalist Design Tokens (Full Width & WYSIWYG Document) ─────
  const tokens = useMemo(() => {
    const borderColor = isDark ? '#27272A' : '#EAEAEA'
    const docBorder = isDark ? '#374151' : '#D1D5DB'
    const textPrimary = isDark ? '#F4F4F5' : '#111827'
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280'
    const cardBg = isDark ? '#18181B' : '#FFFFFF'
    const cardBgAlt = isDark ? '#27272A' : '#F9FAFB'
    const pageBg = isDark ? '#09090B' : '#F3F4F6'
    const accentColor = isDark ? '#60A5FA' : '#2563EB'
    const accentBg = isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF'
    const accentBorder = isDark ? '#1D4ED8' : '#BFDBFE'

    return {
      pageBg,
      cardBg,
      cardBgAlt,
      borderColor,
      docBorder,
      textPrimary,
      textSecondary,
      accentColor,
      accentBg,
      accentBorder,
      pastelRed: {
        bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
        text: isDark ? '#F87171' : '#B91C1C',
        border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5'
      }
    }
  }, [isDark])

  // ─── Filters & Selectors ──────────────────────────────────────────
  const [years, setYears] = useState([])
  const [units, setUnits] = useState([])
  const [kelasOptions, setKelasOptions] = useState([])
  const [students, setStudents] = useState([])
  const [selYear, setSelYear] = useState('')
  const [selSem, setSelSem] = useState('1')
  const [selKelas, setSelKelas] = useState('')
  const [selStudent, setSelStudent] = useState('')

  // Report Type: 'PYP' or 'MYP'
  const [reportType, setReportType] = useState('PYP')

  // ─── Group & Sort Classes into PYP and MYP Alphabetically ──────────
  const groupedKelas = useMemo(() => {
    const pyp = []
    const myp = []

    kelasOptions.forEach((k) => {
      const unitObj = units.find((u) => u.unit_id === k.kelas_unit_id)
      const isMyp = unitObj ? Boolean(unitObj.is_myp) : k.kelas_unit_id === 2
      if (isMyp) {
        myp.push(k)
      } else {
        pyp.push(k)
      }
    })

    const sortFn = (a, b) =>
      (a.kelas_nama || '').localeCompare(b.kelas_nama || '', undefined, {
        numeric: true,
        sensitivity: 'base'
      })

    pyp.sort(sortFn)
    myp.sort(sortFn)

    return { pyp, myp }
  }, [kelasOptions, units])

  // ─── Report Data ──────────────────────────────────────────────────
  const [healthReport, setHealthReport] = useState(null)
  const [studentInfo, setStudentInfo] = useState(null)
  const [physicalChecks, setPhysicalChecks] = useState([])
  const [growthRecords, setGrowthRecords] = useState([])
  const [immunizations, setImmunizations] = useState([])
  const [healthRecords, setHealthRecords] = useState([])

  const [reportForm, setReportForm] = useState({ allergy: '', notes: '' })
  const [editingAllergy, setEditingAllergy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [savingAllergy, setSavingAllergy] = useState(false)

  // ─── Delete Modal State ───────────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    table: '',
    id: null,
    title: '',
    setter: null
  })

  // ─── Toast Feedback ───────────────────────────────────────────────
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ─── 1. Load Academic Years & Units on Mount ──────────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      const [resYears, resUnits] = await Promise.all([
        supabase.from('year').select('year_id, year_name, start_date, end_date').order('year_name', { ascending: false }),
        supabase.from('unit').select('unit_id, unit_name, is_pyp, is_myp')
      ])

      if (resUnits.data) {
        setUnits(resUnits.data)
      }

      if (resYears.data && resYears.data.length > 0) {
        setYears(resYears.data)

        // Otomatis tentukan tahun ajaran yang sedang aktif hari ini
        const todayStr = new Date().toISOString().split('T')[0]
        const currentActiveYear = resYears.data.find((y) => {
          if (!y.start_date || !y.end_date) return false
          return todayStr >= y.start_date && todayStr <= y.end_date
        })

        const targetYear = currentActiveYear || resYears.data[0]
        setSelYear(String(targetYear.year_id))

        // Otomatis tentukan semester kalender (Juli-Desember = Sem 1, Jan-Juni = Sem 2)
        const currentMonth = new Date().getMonth() + 1
        const defaultSemester = currentMonth >= 7 ? '1' : '2'
        setSelSem(defaultSemester)
      }
    }
    fetchInitialData()
  }, [])

  // ─── 2. Load Classes when Year changes ────────────────────────────
  useEffect(() => {
    if (!selYear) {
      setKelasOptions([])
      setSelKelas('')
      return
    }
    supabase
      .from('kelas')
      .select('kelas_id, kelas_nama, kelas_unit_id')
      .eq('kelas_year_id', selYear)
      .order('kelas_nama')
      .then(({ data }) => {
        setKelasOptions(data || [])
        setSelKelas('')
      })
  }, [selYear])

  // ─── 3. Auto-Detect PYP vs MYP based on Selected Class ────────────
  useEffect(() => {
    if (!selKelas) return
    const selClassObj = kelasOptions.find((k) => String(k.kelas_id) === String(selKelas))
    if (selClassObj) {
      const unitObj = units.find((u) => u.unit_id === selClassObj.kelas_unit_id)
      if (unitObj?.is_myp || selClassObj.kelas_unit_id === 2) {
        setReportType('MYP')
      } else {
        setReportType('PYP')
      }
    }
  }, [selKelas, kelasOptions, units])

  // ─── 4. Load Students when Class changes ──────────────────────────
  useEffect(() => {
    if (!selKelas) {
      setStudents([])
      setSelStudent('')
      return
    }
    const load = async () => {
      const { data: ds } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_id, detail_siswa_user_id')
        .eq('detail_siswa_kelas_id', selKelas)
      const idMap = Object.fromEntries((ds || []).map((d) => [d.detail_siswa_user_id, d.detail_siswa_id]))
      const ids = Object.keys(idMap).map(Number).filter(Boolean)
      if (!ids.length) {
        setStudents([])
        return
      }
      const { data: us } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_tanggal_lahir')
        .in('user_id', ids)

      const sortedStudents = (us || [])
        .map((u) => ({
          user_id: u.user_id,
          detail_siswa_id: idMap[u.user_id] || null,
          nama: `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim(),
          dob: u.user_tanggal_lahir
        }))
        .sort((a, b) => a.nama.localeCompare(b.nama))

      setStudents(sortedStudents)
      if (sortedStudents.length > 0) {
        setSelStudent(String(sortedStudents[0].user_id))
      } else {
        setSelStudent('')
      }
    }
    load()
  }, [selKelas])

  // ─── 5. Load Report when selection is complete ────────────────────
  useEffect(() => {
    if (selStudent && selYear && selSem) {
      loadReport()
    } else {
      clearReport()
    }
  }, [selStudent, selYear, selSem, reportType])

  const fetchSections = async (rid) => {
    const [a, b, c, d] = await Promise.all([
      supabase.from('health_physical_check').select('*').eq('health_report_id', rid).order('id'),
      supabase.from('health_growth_development').select('*').eq('health_report_id', rid).order('id'),
      supabase.from('health_immunization').select('*').eq('health_report_id', rid).order('id'),
      supabase.from('health_record').select('*').eq('health_report_id', rid).order('id')
    ])
    setPhysicalChecks(a.data || [])
    setGrowthRecords(b.data || [])
    setImmunizations(c.data || [])
    setHealthRecords(d.data || [])
  }

  const loadReport = async () => {
    setLoading(true)
    try {
      const stu = students.find((s) => String(s.user_id) === String(selStudent))
      setStudentInfo(stu || null)

      let { data: report } = await supabase
        .from('health_report_card')
        .select('*')
        .eq('student_user_id', selStudent)
        .eq('year_id', selYear)
        .eq('semester', selSem)
        .maybeSingle()

      if (!report) {
        const { data: nr, error } = await supabase
          .from('health_report_card')
          .insert([
            {
              student_user_id: +selStudent,
              kelas_id: +selKelas,
              year_id: +selYear,
              semester: +selSem,
              report_type: reportType
            }
          ])
          .select()
          .single()
        if (error) throw error
        report = nr
      } else if (report.report_type !== reportType) {
        // Ensure report record reflects the true class curriculum
        report.report_type = reportType
        await supabase
          .from('health_report_card')
          .update({ report_type: reportType })
          .eq('id', report.id)
      }

      setHealthReport(report)
      setReportForm({ allergy: report.allergy || '', notes: report.notes || '' })
      await fetchSections(report.id)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const clearReport = () => {
    setHealthReport(null)
    setStudentInfo(null)
    setPhysicalChecks([])
    setGrowthRecords([])
    setImmunizations([])
    setHealthRecords([])
    setReportForm({ allergy: '', notes: '' })
    setEditingAllergy(false)
  }

  // ─── Save Allergy ─────────────────────────────────────────────────
  const saveAllergy = async () => {
    if (!healthReport) return
    setSavingAllergy(true)
    try {
      const { error } = await supabase
        .from('health_report_card')
        .update({
          allergy: reportForm.allergy || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', healthReport.id)
      if (error) throw error
      setHealthReport((p) => ({ ...p, allergy: reportForm.allergy }))
      setEditingAllergy(false)
      showToast('Alergi diperbarui.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSavingAllergy(false)
    }
  }

  // ─── Save Notes ───────────────────────────────────────────────────
  const saveNotes = async () => {
    if (!healthReport) return
    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from('health_report_card')
        .update({
          notes: reportForm.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', healthReport.id)
      if (error) throw error
      setHealthReport((p) => ({ ...p, notes: reportForm.notes }))
      showToast('Catatan disimpan.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSavingNotes(false)
    }
  }

  // ─── CRUD Handlers ────────────────────────────────────────────────
  const addRow = async (table, data, setter) => {
    try {
      const { data: row, error } = await supabase
        .from(table)
        .insert([{ health_report_id: healthReport.id, ...data }])
        .select()
        .single()
      if (error) throw error
      setter((p) => [...p, row])
      showToast('Data ditambahkan.')
    } catch (e) {
      showToast(e.message, 'error')
      throw e
    }
  }

  const updateRow = async (table, id, data, setter) => {
    try {
      const { error } = await supabase.from(table).update(data).eq('id', id)
      if (error) throw error
      setter((p) => p.map((r) => (r.id === id ? { ...r, ...data } : r)))
      showToast('Data diperbarui.')
    } catch (e) {
      showToast(e.message, 'error')
      throw e
    }
  }

  const confirmDelete = async () => {
    const { table, id, setter } = deleteModal
    if (!table || !id) return
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      setter((p) => p.filter((r) => r.id !== id))
      showToast('Data dihapus.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setDeleteModal({ isOpen: false, table: '', id: null, title: '', setter: null })
    }
  }

  // ─── Next / Prev Student Navigation (Toddle / ManageBac style) ────
  const currentStudentIdx = students.findIndex((s) => String(s.user_id) === String(selStudent))
  const handlePrevStudent = () => {
    if (currentStudentIdx > 0) {
      setSelStudent(String(students[currentStudentIdx - 1].user_id))
    }
  }
  const handleNextStudent = () => {
    if (currentStudentIdx < students.length - 1) {
      setSelStudent(String(students[currentStudentIdx + 1].user_id))
    }
  }

  const yearName = years.find((y) => String(y.year_id) === String(selYear))?.year_name || '—'
  const kelasName = kelasOptions.find((k) => String(k.kelas_id) === String(selKelas))?.kelas_nama || '—'

  // ─── Preview / Print PDF Report ───────────────────────────────────
  const handlePreviewReport = async () => {
    const stu = students.find((s) => String(s.user_id) === String(selStudent))
    if (!stu) {
      showToast('Siswa belum dipilih.', 'error')
      return
    }

    // ── If PYP Curriculum: direct to generatePypClassReportPDF (same as in /data/pyp) ──
    if (reportType === 'PYP') {
      try {
        setLoadingReport(true)
        await generatePypClassReportPDF({
          classId: selKelas,
          className: kelasName,
          yearId: selYear,
          yearName: yearName,
          semester: selSem,
          targetStudentId: selStudent,
          onLoading: setLoadingReport,
          onError: (err) => showToast(err?.message || String(err), 'error')
        })
      } catch (err) {
        console.error('Error generating PYP PDF in health report:', err)
        showToast(err?.message || 'Gagal menghasilkan report PDF PYP', 'error')
      } finally {
        setLoadingReport(false)
      }
      return
    }

    // ── If MYP Curriculum: direct to generateStudentReportHTML ──
    if (!stu?.detail_siswa_id) {
      showToast('ID siswa tidak ditemukan.', 'error')
      return
    }
    await generateStudentReportHTML({
      reportFilters: {
        kelas: String(selKelas),
        student: stu.detail_siswa_id,
        year: String(selYear),
        semester: String(selSem)
      },
      reportStudents: students
        .filter((s) => s.detail_siswa_id)
        .map((s) => ({
          detail_siswa_id: s.detail_siswa_id,
          nama: s.nama,
          user_id: s.user_id
        })),
      reportKelasOptions: kelasOptions,
      reportYears: years,
      setLoadingReport,
      onError: (err) => showToast(err.message, 'error')
    })
  }

  const formatDob = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const todayReportDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // ─── Define Columns based on PYP vs MYP ────────────────────────────
  const growthColumns = useMemo(() => {
    if (reportType === 'PYP') {
      return [
        { key: 'month', label: 'MONTH', type: 'select', width: '75px' },
        { key: 'weight', label: 'BB (kg)', type: 'number', width: '110px' },
        { key: 'height', label: 'TB (cm)', type: 'number', width: '110px' }
      ]
    }
    return [
      { key: 'month', label: 'MONTH', type: 'select', width: '75px' },
      { key: 'height', label: 'TB (cm)', type: 'number', width: '110px' },
      { key: 'weight', label: 'BB (kg)', type: 'number', width: '110px' }
    ]
  }, [reportType])

  const physicalColumns = useMemo(() => {
    if (reportType === 'PYP') {
      return [
        { key: 'month', label: 'MONTH', type: 'select', width: '75px' },
        { key: 'eye', label: 'MATA (Ka/Ki)' },
        { key: 'ear', label: 'TELINGA' },
        { key: 'dental', label: 'GIGI' },
        { key: 'blood_pressure', label: 'TD', width: '85px' }
      ]
    }
    return [
      { key: 'month', label: 'MONTH', type: 'select', width: '65px' },
      { key: 'eye', label: 'EYE' },
      { key: 'ear', label: 'EAR' },
      { key: 'dental', label: 'DENTAL' },
      { key: 'blood_pressure', label: 'TD', width: '75px' },
      { key: 'gda', label: 'GDA', width: '65px' },
      { key: 'hb', label: 'HB', width: '65px' },
      { key: 'color_blindness', label: 'BUTA WARNA' },
      { key: 'nails', label: 'NAILS' },
      { key: 'hair', label: 'HAIR' }
    ]
  }, [reportType])

  return (
    <div
      className="w-full px-4 md:px-6 py-5 min-h-screen"
      style={{ background: tokens.pageBg, color: tokens.textPrimary }}
    >
      {/* ── BREADCRUMB & HEADER (Full Width) ────────────────────────── */}
      <div className="mb-4">
        <div
          className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1"
          style={{ color: tokens.textSecondary }}
        >
          <span>[STUDENT DATA]</span>
          <span>/</span>
          <span>[HEALTH]</span>
          <span>/</span>
          <span className="font-semibold" style={{ color: tokens.accentColor }}>
            [{reportType} HEALTH REPORT CARD]
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center border"
              style={{
                background: tokens.accentBg,
                borderColor: tokens.accentBorder,
                color: tokens.accentColor
              }}
            >
              <FontAwesomeIcon icon={faHeartPulse} className="text-sm" />
            </div>
            <div>
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ color: tokens.textPrimary, letterSpacing: '-0.02em', margin: 0 }}
              >
                Health Report Card
              </h1>
            </div>
          </div>

          {healthReport && (
            <button
              onClick={handlePreviewReport}
              disabled={loadingReport}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-semibold text-white transition-opacity shadow-xs"
              style={{ background: '#2563EB' }}
            >
              <FontAwesomeIcon
                icon={loadingReport ? faSpinner : faFilePdf}
                spin={loadingReport}
                className="text-xs"
              />
              <span>{loadingReport ? 'Memproses...' : 'Preview / Print PDF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── TOP CONTROL TOOLBAR (AUTO-DETECT CURRICULUM FROM CLASS) ─── */}
      <div
        className="p-3 rounded border mb-6"
        style={{
          background: tokens.cardBg,
          borderColor: tokens.borderColor,
          borderRadius: '8px'
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* 1. Academic Year */}
          <div className="col-span-1 lg:col-span-3 min-w-0">
            <label
              className="text-[10px] font-mono uppercase block mb-1 font-bold"
              style={{ color: tokens.accentColor }}
            >
              1. Academic Year *
            </label>
            <select
              value={selYear}
              onChange={(e) => setSelYear(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold truncate"
              style={{
                background: isDark ? '#18181B' : '#FFFFFF',
                borderColor: tokens.borderColor,
                color: tokens.textPrimary,
                borderRadius: '4px'
              }}
            >
              <option value="">Select Academic Year</option>
              {years.map((y) => (
                <option key={y.year_id} value={y.year_id}>
                  {y.year_name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Semester Switcher */}
          <div className="col-span-1 lg:col-span-2 min-w-0">
            <label
              className="text-[10px] font-mono uppercase block mb-1 font-bold"
              style={{ color: tokens.accentColor }}
            >
              2. Semester *
            </label>
            <div
              style={{
                display: 'flex',
                borderRadius: '4px',
                border: `1px solid ${tokens.borderColor}`,
                background: isDark ? '#1F1F23' : '#F7F6F3',
                padding: '2px',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => setSelSem('1')}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: selSem === '1' ? 700 : 500,
                  borderRadius: '3px',
                  border: 'none',
                  cursor: 'pointer',
                  background: selSem === '1' ? (isDark ? '#FFFFFF' : '#18181B') : 'transparent',
                  color: selSem === '1' ? (isDark ? '#09090B' : '#FFFFFF') : tokens.textSecondary,
                  transition: 'all 0.15s ease'
                }}
              >
                Sem 1
              </button>
              <button
                type="button"
                onClick={() => setSelSem('2')}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: selSem === '2' ? 700 : 500,
                  borderRadius: '3px',
                  border: 'none',
                  cursor: 'pointer',
                  background: selSem === '2' ? (isDark ? '#FFFFFF' : '#18181B') : 'transparent',
                  color: selSem === '2' ? (isDark ? '#09090B' : '#FFFFFF') : tokens.textSecondary,
                  transition: 'all 0.15s ease'
                }}
              >
                Sem 2
              </button>
            </div>
          </div>

          {/* 3. Class Selector Grouped into PYP & MYP */}
          <div className="col-span-1 lg:col-span-3 min-w-0">
            <label
              className="text-[10px] font-mono uppercase block mb-1 font-bold"
              style={{ color: tokens.accentColor }}
            >
              3. Class ({kelasOptions.length})
            </label>
            <select
              value={selKelas}
              onChange={(e) => setSelKelas(e.target.value)}
              disabled={!selYear}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold truncate"
              style={{
                background: isDark ? '#18181B' : '#FFFFFF',
                borderColor: tokens.borderColor,
                color: tokens.textPrimary,
                borderRadius: '4px'
              }}
            >
              <option value="">Select Class</option>
              {groupedKelas.pyp.length > 0 && (
                <optgroup label="PYP">
                  {groupedKelas.pyp.map((k) => (
                    <option key={k.kelas_id} value={k.kelas_id}>
                      {k.kelas_nama}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedKelas.myp.length > 0 && (
                <optgroup label="MYP">
                  {groupedKelas.myp.map((k) => (
                    <option key={k.kelas_id} value={k.kelas_id}>
                      {k.kelas_nama}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* 4. Student Selector with Quick Switchers */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 min-w-0">
            <label
              className="text-[10px] font-mono uppercase block mb-1 font-bold"
              style={{ color: tokens.accentColor }}
            >
              4. Student ({students.length})
            </label>
            <div
              className="flex items-center rounded border overflow-hidden w-full min-w-0"
              style={{
                borderColor: tokens.borderColor,
                background: isDark ? '#18181B' : '#FFFFFF',
                borderRadius: '4px'
              }}
            >
              <button
                type="button"
                onClick={handlePrevStudent}
                disabled={currentStudentIdx <= 0}
                className="shrink-0 px-2.5 py-1.5 text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-r"
                style={{
                  background: tokens.cardBgAlt,
                  borderColor: tokens.borderColor,
                  color: tokens.textPrimary
                }}
                title="Siswa Sebelumnya"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>

              <select
                value={selStudent}
                onChange={(e) => setSelStudent(e.target.value)}
                disabled={!selKelas}
                className="flex-1 min-w-0 w-0 px-2.5 py-1.5 text-xs font-mono outline-none cursor-pointer font-bold truncate bg-transparent border-none"
                style={{
                  color: tokens.textPrimary
                }}
              >
                <option value="">Select Student</option>
                {students.map((s, idx) => (
                  <option key={s.user_id} value={s.user_id}>
                    {idx + 1}. {s.nama}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextStudent}
                disabled={currentStudentIdx >= students.length - 1 || currentStudentIdx === -1}
                className="shrink-0 px-2.5 py-1.5 text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-l"
                style={{
                  background: tokens.cardBgAlt,
                  borderColor: tokens.borderColor,
                  color: tokens.textPrimary
                }}
                title="Siswa Selanjutnya"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── LOADING STATE ───────────────────────────────────────────── */}
      {loading && (
        <div
          className="p-12 text-center rounded border"
          style={{
            background: tokens.cardBg,
            borderColor: tokens.borderColor,
            borderRadius: '8px'
          }}
        >
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            className="text-lg mb-2"
            style={{ color: tokens.accentColor }}
          />
          <div className="text-xs font-mono" style={{ color: tokens.textSecondary }}>
            Memuat lembar rapor kesehatan {reportType} siswa...
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ─────────────────────────────────────────────── */}
      {!loading && !selStudent && (
        <div
          className="p-12 text-center rounded border"
          style={{
            border: `1px dashed ${tokens.borderColor}`,
            background: tokens.cardBg,
            borderRadius: '8px'
          }}
        >
          <FontAwesomeIcon
            icon={faInbox}
            style={{ fontSize: '32px', color: tokens.textSecondary, marginBottom: '12px' }}
          />
          <p className="text-xs font-mono" style={{ color: tokens.textSecondary, margin: 0 }}>
            Pilih Kelas dan Siswa di toolbar atas untuk membuka lembar kerja Health Report Card.
          </p>
        </div>
      )}

      {/* ── WYSIWYG DOCUMENT SHEET (PYP / MYP ACCORDING TO SELECTION) ─ */}
      {healthReport && !loading && (
        <div
          className="w-full border rounded shadow-xs p-5 md:p-8 space-y-6 transition-all"
          style={{
            background: tokens.cardBg,
            borderColor: tokens.docBorder,
            borderRadius: '6px'
          }}
        >
          {/* 1. DOCUMENT HEADER */}
          <div className="text-center pb-4 border-b" style={{ borderColor: tokens.docBorder }}>
            <h2
              className="text-lg md:text-xl font-bold tracking-wider text-gray-900 dark:text-gray-100 uppercase"
              style={{ letterSpacing: '0.05em' }}
            >
              {reportType} HEALTH REPORT CARD
            </h2>
            <p className="text-xs text-gray-500 font-medium tracking-wide mt-0.5">
              Chung Chung Christian School
            </p>
          </div>

          {/* 2. STUDENT INFORMATION */}
          <div
            className="border text-xs rounded overflow-hidden"
            style={{ borderColor: tokens.docBorder }}
          >
            <div
              className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x"
              style={{ borderColor: tokens.docBorder }}
            >
              <div className="p-2.5 space-y-2">
                <div className="flex gap-2">
                  <span className="font-bold w-20 text-gray-500 uppercase text-[11px]">Name:</span>
                  <span className="font-bold uppercase text-gray-900 dark:text-gray-100">
                    {studentInfo?.nama || '—'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold w-20 text-gray-500 uppercase text-[11px]">DOB:</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {formatDob(studentInfo?.dob)}
                  </span>
                </div>
              </div>

              <div className="p-2.5 space-y-2">
                <div className="flex gap-2">
                  <span className="font-bold w-20 text-gray-500 uppercase text-[11px]">Class:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {kelasName} — {yearName} Semester {selSem}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold w-20 text-gray-500 uppercase text-[11px]">Allergy:</span>
                  {editingAllergy ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        placeholder="Contoh: Kacang, Udang, dsb..."
                        value={reportForm.allergy}
                        onChange={(e) =>
                          setReportForm((p) => ({ ...p, allergy: e.target.value }))
                        }
                        className="px-2 py-0.5 text-xs rounded border outline-none font-sans flex-1"
                        style={{
                          background: isDark ? '#1F2937' : '#FFFFFF',
                          borderColor: tokens.docBorder,
                          color: tokens.textPrimary
                        }}
                        autoFocus
                      />
                      <button
                        onClick={saveAllergy}
                        disabled={savingAllergy}
                        className="px-2 py-0.5 rounded text-[11px] font-bold text-white bg-green-600 hover:bg-green-700"
                        title="Simpan"
                      >
                        <FontAwesomeIcon icon={faCheck} />
                      </button>
                      <button
                        onClick={() => {
                          setReportForm((p) => ({ ...p, allergy: healthReport.allergy || '' }))
                          setEditingAllergy(false)
                        }}
                        className="px-2 py-0.5 rounded text-[11px] border text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Batal"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className="font-medium px-2 py-0.5 rounded text-xs"
                        style={{
                          background: healthReport.allergy ? tokens.pastelRed.bg : tokens.cardBgAlt,
                          color: healthReport.allergy ? tokens.pastelRed.text : tokens.textPrimary,
                          border: `1px solid ${healthReport.allergy ? tokens.pastelRed.border : tokens.docBorder}`
                        }}
                      >
                        {healthReport.allergy || 'None / -'}
                      </span>
                      <button
                        onClick={() => setEditingAllergy(true)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-0.5"
                        title="Ubah Alergi"
                      >
                        <FontAwesomeIcon icon={faEdit} className="text-[11px]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. PHYSICAL CHECK & GROWTH DEVELOPMENT (PYP or MYP formatted) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* PHYSICAL CHECK TABLE */}
            <DocumentTable
              title={reportType === 'PYP' ? 'PHYSICAL CHECK' : 'CLINICAL & PHYSICAL CHECK'}
              columns={physicalColumns}
              rows={physicalChecks}
              onAdd={(d) => addRow('health_physical_check', d, setPhysicalChecks)}
              onUpdate={(id, d) => updateRow('health_physical_check', id, d, setPhysicalChecks)}
              onRequestDelete={(id) =>
                setDeleteModal({
                  isOpen: true,
                  table: 'health_physical_check',
                  id,
                  title: 'Physical Check',
                  setter: setPhysicalChecks
                })
              }
              isDark={isDark}
              tokens={tokens}
            />

            {/* GROWTH DEVELOPMENT TABLE */}
            <DocumentTable
              title="GROWTH DEVELOPMENT"
              columns={growthColumns}
              rows={growthRecords}
              onAdd={(d) => addRow('health_growth_development', d, setGrowthRecords)}
              onUpdate={(id, d) => updateRow('health_growth_development', id, d, setGrowthRecords)}
              onRequestDelete={(id) =>
                setDeleteModal({
                  isOpen: true,
                  table: 'health_growth_development',
                  id,
                  title: 'Growth Development',
                  setter: setGrowthRecords
                })
              }
              isDark={isDark}
              tokens={tokens}
            />
          </div>

          {/* 4. IMMUNIZATION TABLE (Full Width) */}
          <DocumentTable
            title="IMMUNIZATION"
            columns={[
              { key: 'type', label: 'TYPE (Jenis Vaksin / Imunisasi)' },
              { key: 'date', label: 'DATE (Tanggal)', type: 'date', width: '140px' }
            ]}
            rows={immunizations}
            onAdd={(d) => addRow('health_immunization', d, setImmunizations)}
            onUpdate={(id, d) => updateRow('health_immunization', id, d, setImmunizations)}
            onRequestDelete={(id) =>
              setDeleteModal({
                isOpen: true,
                table: 'health_immunization',
                id,
                title: 'Immunization',
                setter: setImmunizations
              })
            }
            isDark={isDark}
            tokens={tokens}
          />

          {/* 5. HEALTH RECORD TABLE (Full Width) */}
          <DocumentTable
            title="HEALTH RECORD"
            columns={[
              { key: 'month', label: 'MONTH', type: 'select', width: '75px' },
              { key: 'date_day', label: 'DATE', type: 'number', width: '60px' },
              { key: 'chronology', label: 'CHRONOLOGY (Kronologi Kejadian)' },
              { key: 'treatment', label: 'TREATMENT (Tindakan / Penanganan)' }
            ]}
            rows={healthRecords}
            onAdd={(d) => addRow('health_record', d, setHealthRecords)}
            onUpdate={(id, d) => updateRow('health_record', id, d, setHealthRecords)}
            onRequestDelete={(id) =>
              setDeleteModal({
                isOpen: true,
                table: 'health_record',
                id,
                title: 'Health Record',
                setter: setHealthRecords
              })
            }
            isDark={isDark}
            tokens={tokens}
          />

          {/* 6. BOTTOM SECTION: NOTES & SIGNATURE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Left: Notes (col-span-7) */}
            <div
              className="lg:col-span-7 border rounded overflow-hidden flex flex-col"
              style={{
                borderColor: tokens.docBorder,
                background: tokens.cardBg
              }}
            >
              <div
                className="px-3 py-1.5 font-bold text-white text-xs tracking-wider flex items-center justify-between"
                style={{ background: '#2563EB' }}
              >
                <span className="uppercase text-xs font-bold">NOTES</span>
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors"
                >
                  <FontAwesomeIcon icon={savingNotes ? faSpinner : faSave} spin={savingNotes} className="mr-1" />
                  {savingNotes ? 'Menyimpan...' : 'Simpan Notes'}
                </button>
              </div>
              <div className="p-3 flex-1">
                <textarea
                  className="w-full h-full min-h-[90px] text-xs resize-none outline-none font-sans p-2 rounded border"
                  placeholder="Ketik catatan kesehatan atau observasi medis siswa untuk dicetak di rapor..."
                  value={reportForm.notes}
                  onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))}
                  style={{
                    background: isDark ? '#1F2937' : '#F9FAFB',
                    borderColor: tokens.docBorder,
                    color: tokens.textPrimary
                  }}
                />
              </div>
            </div>

            {/* Right: Signature & Date Box (col-span-5) */}
            <div
              className="lg:col-span-5 border rounded p-4 flex flex-col justify-between text-center"
              style={{
                borderColor: tokens.docBorder,
                background: tokens.cardBgAlt
              }}
            >
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Surabaya, {todayReportDate}
              </div>

              <div className="my-6">
                <div className="text-[10px] uppercase tracking-wider font-mono text-gray-400 dark:text-gray-500 mb-8">
                  [ Tanda Tangan &amp; Cap Sekolah ]
                </div>
                <div
                  className="w-48 mx-auto border-b"
                  style={{ borderColor: tokens.docBorder }}
                ></div>
              </div>

              <div className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase">
                School Nurse / Homeroom Teacher
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI HAPUS ───────────────────────────────────── */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, table: '', id: null, title: '', setter: null })}
        title="Hapus Baris Data"
        size="sm"
        containerStyle={{
          background: tokens.cardBg,
          borderColor: tokens.borderColor
        }}
        titleStyle={{ color: tokens.textPrimary }}
      >
        <div className="p-5">
          <div className="flex items-start gap-3 mb-5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
              style={{
                background: tokens.pastelRed.bg,
                color: tokens.pastelRed.text,
                border: `1px solid ${tokens.pastelRed.border}`
              }}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs" />
            </div>
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: tokens.textPrimary }}>
                Konfirmasi Hapus
              </div>
              <div className="text-xs" style={{ color: tokens.textSecondary }}>
                Hapus baris data dari {deleteModal.title}? Tindakan ini tidak dapat dibatalkan.
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-end gap-2 pt-3 border-t"
            style={{ borderColor: tokens.borderColor }}
          >
            <button
              onClick={() => setDeleteModal({ isOpen: false, table: '', id: null, title: '', setter: null })}
              className="px-3.5 py-1.5 rounded text-xs font-medium border"
              style={{
                background: 'transparent',
                borderColor: tokens.borderColor,
                color: tokens.textPrimary
              }}
            >
              Batal
            </button>
            <button
              onClick={confirmDelete}
              className="px-3.5 py-1.5 rounded text-xs font-semibold text-white transition-opacity"
              style={{ background: '#ef4444' }}
            >
              Hapus
            </button>
          </div>
        </div>
      </Modal>

      {/* ── TOAST NOTIFICATION ──────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded border shadow-lg text-xs font-mono transition-all animate-in fade-in slide-in-from-bottom-2"
          style={{
            background: tokens.cardBg,
            borderColor:
              toast.type === 'error'
                ? tokens.pastelRed.border
                : isDark
                ? '#10B981'
                : '#A7F3D0',
            color:
              toast.type === 'error'
                ? tokens.pastelRed.text
                : isDark
                ? '#34D399'
                : '#047857'
          }}
        >
          <FontAwesomeIcon
            icon={toast.type === 'error' ? faExclamationTriangle : faCheck}
            className="text-xs"
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
