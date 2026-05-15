'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import NotificationModal from '@/components/ui/notification-modal'
import { generateStudentReportHTML } from '@/app/data/topic-new/lib/pdfGenerators'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function SectionHeader({ title, color = '#1e40af' }) {
  return (
    <div className="px-4 py-2 text-center font-bold text-white text-sm tracking-wider mb-3" style={{ background: color }}>
      {title}
    </div>
  )
}

function InlineTable({ columns, rows, onAdd, onUpdate, onDelete, addLabel = '+ Add Row', theme }) {
  const [editId, setEditId] = useState(null)
  const [editRow, setEditRow] = useState({})
  const [newRow, setNewRow] = useState(null)
  const [saving, setSaving] = useState(false)

  const startEdit = (row) => { setEditId(row.id); setEditRow({ ...row }) }
  const cancelEdit = () => { setEditId(null); setEditRow({}) }

  const saveEdit = async () => {
    setSaving(true)
    try { await onUpdate(editId, editRow); setEditId(null) }
    catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const saveNew = async () => {
    setSaving(true)
    try { await onAdd(newRow); setNewRow(null) }
    catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this row?')) return
    try { await onDelete(id) } catch (e) { alert(e.message) }
  }

  const tdClass = 'border px-2 py-1 text-sm'

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ borderColor: theme.border }}>
        <thead>
          <tr style={{ background: theme.subtleBg }}>
            {columns.map(c => (
              <th key={c.key} className="border px-2 py-1 text-left font-semibold text-xs" style={{ borderColor: theme.border, color: theme.textSecondary }}>{c.label}</th>
            ))}
            <th className="border px-2 py-1 text-xs" style={{ borderColor: theme.border, color: theme.textSecondary }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} style={{ borderColor: theme.border, background: theme.cardBg }}>
              {columns.map(c => (
                <td key={c.key} className={tdClass} style={{ borderColor: theme.border }}>
                  {editId === row.id ? (
                    c.type === 'select' ? (
                      <select value={editRow[c.key] || ''} onChange={e => setEditRow(p => ({ ...p, [c.key]: e.target.value }))}
                        className="border rounded px-1 py-0.5 text-xs w-full" style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textBody }}>
                        <option value="">-</option>
                        {(c.options || MONTHS).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <Input type={c.type || 'text'} value={editRow[c.key] || ''} onChange={e => setEditRow(p => ({ ...p, [c.key]: e.target.value }))}
                        className="text-xs py-0.5 h-7" style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textBody }} />
                    )
                  ) : (
                    <span style={{ color: theme.textBody }}>{c.type === 'date' && row[c.key] ? new Date(row[c.key]).toLocaleDateString('en-GB') : (row[c.key] ?? '-')}</span>
                  )}
                </td>
              ))}
              <td className={tdClass} style={{ borderColor: theme.border }}>
                {editId === row.id ? (
                  <div className="flex gap-1">
                    <button onClick={saveEdit} disabled={saving} className="px-2 py-0.5 text-xs rounded text-white" style={{ background: '#16a34a' }}>Save</button>
                    <button onClick={cancelEdit} className="px-2 py-0.5 text-xs rounded" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody }}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(row)} className="px-2 py-0.5 text-xs rounded" style={{ background: '#dbeafe', color: '#1e40af' }}>Edit</button>
                    <button onClick={() => handleDelete(row.id)} className="px-2 py-0.5 text-xs rounded" style={{ background: '#fee2e2', color: '#dc2626' }}>Del</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {newRow && (
            <tr style={{ background: theme.subtleBg, borderColor: theme.border }}>
              {columns.map(c => (
                <td key={c.key} className={tdClass} style={{ borderColor: theme.border }}>
                  {c.type === 'select' ? (
                    <select value={newRow[c.key] || ''} onChange={e => setNewRow(p => ({ ...p, [c.key]: e.target.value }))}
                      className="border rounded px-1 py-0.5 text-xs w-full" style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textBody }}>
                      <option value="">-</option>
                      {(c.options || MONTHS).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input type={c.type || 'text'} value={newRow[c.key] || ''} onChange={e => setNewRow(p => ({ ...p, [c.key]: e.target.value }))}
                      className="text-xs py-0.5 h-7" style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textBody }} />
                  )}
                </td>
              ))}
              <td className={tdClass} style={{ borderColor: theme.border }}>
                <div className="flex gap-1">
                  <button onClick={saveNew} disabled={saving} className="px-2 py-0.5 text-xs rounded text-white" style={{ background: '#16a34a' }}>Add</button>
                  <button onClick={() => setNewRow(null)} className="px-2 py-0.5 text-xs rounded" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody }}>Cancel</button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {!newRow && (
        <button onClick={() => setNewRow(columns.reduce((a, c) => ({ ...a, [c.key]: '' }), {}))}
          className="mt-2 px-3 py-1 text-xs rounded" style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }}>
          {addLabel}
        </button>
      )}
    </div>
  )
}

export default function HealthReportPage() {
  const { theme } = useTheme()

  const [years, setYears] = useState([])
  const [kelasOptions, setKelasOptions] = useState([])
  const [students, setStudents] = useState([])
  const [selYear, setSelYear] = useState('')
  const [selSem, setSelSem] = useState('')
  const [selKelas, setSelKelas] = useState('')
  const [selStudent, setSelStudent] = useState('')

  const [healthReport, setHealthReport] = useState(null)
  const [studentInfo, setStudentInfo] = useState(null)
  const [physicalChecks, setPhysicalChecks] = useState([])
  const [growthRecords, setGrowthRecords] = useState([])
  const [immunizations, setImmunizations] = useState([])
  const [healthRecords, setHealthRecords] = useState([])

  const [reportForm, setReportForm] = useState({ allergy: '', notes: '' })
  const [editingInfo, setEditingInfo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })

  const showNotif = (title, message, type = 'success') => setNotif({ isOpen: true, title, message, type })

  // Fetch years on mount
  useEffect(() => {
    supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false })
      .then(({ data }) => setYears(data || []))
  }, [])

  // Fetch kelas when year changes
  useEffect(() => {
    if (!selYear) { setKelasOptions([]); setSelKelas(''); return }
    supabase.from('kelas').select('kelas_id, kelas_nama').eq('kelas_year_id', selYear).order('kelas_nama')
      .then(({ data }) => { setKelasOptions(data || []); setSelKelas('') })
  }, [selYear])

  // Fetch students when kelas changes
  useEffect(() => {
    if (!selKelas) { setStudents([]); setSelStudent(''); return }
    const load = async () => {
      const { data: ds } = await supabase.from('detail_siswa').select('detail_siswa_id, detail_siswa_user_id').eq('detail_siswa_kelas_id', selKelas)
      const idMap = Object.fromEntries((ds || []).map(d => [d.detail_siswa_user_id, d.detail_siswa_id]))
      const ids = Object.keys(idMap).map(Number).filter(Boolean)
      if (!ids.length) { setStudents([]); return }
      const { data: us } = await supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang, user_tanggal_lahir').in('user_id', ids)
      setStudents((us || []).map(u => ({
        user_id: u.user_id,
        detail_siswa_id: idMap[u.user_id] || null,
        nama: `${u.user_nama_depan} ${u.user_nama_belakang}`.trim(),
        dob: u.user_tanggal_lahir,
      })).sort((a, b) => a.nama.localeCompare(b.nama)))
      setSelStudent('')
    }
    load()
  }, [selKelas])

  // Load report when student selected
  useEffect(() => {
    if (selStudent && selYear && selSem) { loadReport() }
    else { clearReport() }
  }, [selStudent, selYear, selSem])

  const fetchSections = async (rid) => {
    const [a, b, c, d] = await Promise.all([
      supabase.from('health_physical_check').select('*').eq('health_report_id', rid).order('id'),
      supabase.from('health_growth_development').select('*').eq('health_report_id', rid).order('id'),
      supabase.from('health_immunization').select('*').eq('health_report_id', rid).order('id'),
      supabase.from('health_record').select('*').eq('health_report_id', rid).order('id'),
    ])
    setPhysicalChecks(a.data || [])
    setGrowthRecords(b.data || [])
    setImmunizations(c.data || [])
    setHealthRecords(d.data || [])
  }

  const loadReport = async () => {
    setLoading(true)
    try {
      const stu = students.find(s => String(s.user_id) === String(selStudent))
      setStudentInfo(stu || null)

      let { data: report } = await supabase.from('health_report_card').select('*')
        .eq('student_user_id', selStudent).eq('year_id', selYear).eq('semester', selSem).maybeSingle()

      if (!report) {
        const { data: nr, error } = await supabase.from('health_report_card')
          .insert([{ student_user_id: +selStudent, kelas_id: +selKelas, year_id: +selYear, semester: +selSem }])
          .select().single()
        if (error) throw error
        report = nr
      }

      setHealthReport(report)
      setReportForm({ allergy: report.allergy || '', notes: report.notes || '' })
      await fetchSections(report.id)
    } catch (e) { showNotif('Error', e.message, 'error') }
    finally { setLoading(false) }
  }

  const clearReport = () => {
    setHealthReport(null); setStudentInfo(null)
    setPhysicalChecks([]); setGrowthRecords([]); setImmunizations([]); setHealthRecords([])
    setReportForm({ allergy: '', notes: '' }); setEditingInfo(false)
  }

  const saveInfo = async () => {
    setSaving(true)
    try {
      // Save allergy + notes to health_report_card
      const { error } = await supabase.from('health_report_card').update({
        allergy: reportForm.allergy || null,
        notes: reportForm.notes || null,
        updated_at: new Date().toISOString()
      }).eq('id', healthReport.id)
      if (error) throw error

      setHealthReport(p => ({ ...p, allergy: reportForm.allergy, notes: reportForm.notes }))
      setEditingInfo(false)
      showNotif('Saved', 'Student info updated.')
    } catch (e) { showNotif('Error', e.message, 'error') }
    finally { setSaving(false) }
  }

  // Generic CRUD helpers
  const addRow = async (table, data, setter) => {
    const { data: row, error } = await supabase.from(table).insert([{ health_report_id: healthReport.id, ...data }]).select().single()
    if (error) throw error
    setter(p => [...p, row])
  }
  const updateRow = async (table, id, data, setter) => {
    const { error } = await supabase.from(table).update(data).eq('id', id)
    if (error) throw error
    setter(p => p.map(r => r.id === id ? { ...r, ...data } : r))
  }
  const deleteRow = async (table, id, setter) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    setter(p => p.filter(r => r.id !== id))
  }

  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody, borderRadius: 6, padding: '6px 10px', fontSize: 14, width: '100%' }

  const yearName = years.find(y => String(y.year_id) === String(selYear))?.year_name || '-'
  const kelasName = kelasOptions.find(k => String(k.kelas_id) === String(selKelas))?.kelas_nama || '-'

  const formatDob = (iso) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: theme.textPrimary }}>Health Report Card</h1>

      {/* Selector */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label style={{ color: theme.textBody }} className="text-xs mb-1 block">Academic Year</Label>
              <select style={selectStyle} value={selYear} onChange={e => setSelYear(e.target.value)}>
                <option value="">Select Year</option>
                {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
              </select>
            </div>
            <div>
              <Label style={{ color: theme.textBody }} className="text-xs mb-1 block">Semester</Label>
              <select style={selectStyle} value={selSem} onChange={e => setSelSem(e.target.value)}>
                <option value="">Select Semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
            <div>
              <Label style={{ color: theme.textBody }} className="text-xs mb-1 block">Class</Label>
              <select style={selectStyle} value={selKelas} onChange={e => setSelKelas(e.target.value)} disabled={!selYear}>
                <option value="">Select Class</option>
                {kelasOptions.map(k => <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>)}
              </select>
            </div>
            <div>
              <Label style={{ color: theme.textBody }} className="text-xs mb-1 block">Student</Label>
              <select style={selectStyle} value={selStudent} onChange={e => setSelStudent(e.target.value)} disabled={!selKelas || !selSem}>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.user_id} value={s.user_id}>{s.nama}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && <div className="text-center py-8 text-sm" style={{ color: theme.textSecondary }}>Loading...</div>}

      {healthReport && !loading && (
        <>
          {/* Student Info */}
          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle style={{ color: theme.textPrimary }}>Student Information</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={async () => {
                      const stu = students.find(s => String(s.user_id) === String(selStudent))
                      if (!stu?.detail_siswa_id) return alert('detail_siswa_id not found')
                      await generateStudentReportHTML({
                        reportFilters: {
                          kelas: String(selKelas),
                          student: stu.detail_siswa_id,
                          year: String(selYear),
                          semester: String(selSem),
                        },
                        reportStudents: students.filter(s => s.detail_siswa_id).map(s => ({
                          detail_siswa_id: s.detail_siswa_id,
                          nama: s.nama,
                          user_id: s.user_id,
                        })),
                        reportKelasOptions: kelasOptions,
                        reportYears: years,
                        setLoadingReport,
                        onError: (err) => alert('Error: ' + err.message),
                      })
                    }}
                    disabled={loadingReport}
                    className="text-xs px-3 py-1"
                    style={{ background: '#7c3aed', color: 'white' }}
                  >
                    {loadingReport ? 'Generating...' : 'Preview Report'}
                  </Button>
                  {!editingInfo
                    ? <Button onClick={() => setEditingInfo(true)} className="text-xs px-3 py-1" style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }}>Edit</Button>
                  : <div className="flex gap-2">
                      <Button onClick={saveInfo} disabled={saving} className="text-xs px-3 py-1" style={{ background: '#16a34a', color: 'white' }}>{saving ? 'Saving...' : 'Save'}</Button>
                      <Button onClick={() => { setReportForm({ allergy: healthReport.allergy || '', notes: healthReport.notes || '' }); setEditingInfo(false) }} className="text-xs px-3 py-1" style={{ background: theme.subtleBg, color: theme.textBody, border: `1px solid ${theme.border}` }}>Cancel</Button>
                    </div>
                  }
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Name', value: studentInfo?.nama || '-', editable: false },
                  { label: 'Date of Birth', value: formatDob(studentInfo?.dob), editable: false },
                  { label: 'Class', value: `${kelasName} — ${yearName} Sem ${selSem}`, editable: false },
                ].map(f => (
                  <div key={f.label} className="flex gap-2 text-sm">
                    <span className="font-semibold w-28 shrink-0" style={{ color: theme.textSecondary }}>{f.label}:</span>
                    <span style={{ color: theme.textBody }}>{f.value}</span>
                  </div>
                ))}
                <div className="flex gap-2 text-sm items-center">
                  <span className="font-semibold w-28 shrink-0" style={{ color: theme.textSecondary }}>Allergy:</span>
                  {editingInfo
                    ? <Input value={reportForm.allergy} onChange={e => setReportForm(p => ({ ...p, allergy: e.target.value }))} className="text-sm h-7" style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textBody }} />
                    : <span style={{ color: theme.textBody }}>{healthReport.allergy || '-'}</span>}
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Two-column: Physical Check + Growth Development */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
              <CardContent className="pt-4">
                <SectionHeader title="PHYSICAL CHECK" />
                <InlineTable
                  theme={theme}
                  columns={[
                    { key: 'month', label: 'Month', type: 'select' },
                    { key: 'ear', label: 'Ear' },
                    { key: 'hair', label: 'Hair' },
                    { key: 'nails', label: 'Nails' },
                  ]}
                  rows={physicalChecks}
                  onAdd={d => addRow('health_physical_check', d, setPhysicalChecks)}
                  onUpdate={(id, d) => updateRow('health_physical_check', id, d, setPhysicalChecks)}
                  onDelete={id => deleteRow('health_physical_check', id, setPhysicalChecks)}
                />
              </CardContent>
            </Card>

            <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
              <CardContent className="pt-4">
                <SectionHeader title="GROWTH DEVELOPMENT" />
                <InlineTable
                  theme={theme}
                  columns={[
                    { key: 'month', label: 'Month', type: 'select' },
                    { key: 'height', label: 'Height (cm)', type: 'number' },
                    { key: 'weight', label: 'Weight (kg)', type: 'number' },
                  ]}
                  rows={growthRecords}
                  onAdd={d => addRow('health_growth_development', d, setGrowthRecords)}
                  onUpdate={(id, d) => updateRow('health_growth_development', id, d, setGrowthRecords)}
                  onDelete={id => deleteRow('health_growth_development', id, setGrowthRecords)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Immunization */}
          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="pt-4">
              <SectionHeader title="IMMUNIZATION" />
              <InlineTable
                theme={theme}
                columns={[
                  { key: 'type', label: 'Type' },
                  { key: 'date', label: 'Date', type: 'date' },
                ]}
                rows={immunizations}
                onAdd={d => addRow('health_immunization', d, setImmunizations)}
                onUpdate={(id, d) => updateRow('health_immunization', id, d, setImmunizations)}
                onDelete={id => deleteRow('health_immunization', id, setImmunizations)}
              />
            </CardContent>
          </Card>

          {/* Health Record */}
          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="pt-4">
              <SectionHeader title="HEALTH RECORD" />
              <InlineTable
                theme={theme}
                columns={[
                  { key: 'month', label: 'Month', type: 'select' },
                  { key: 'date_day', label: 'Date', type: 'number' },
                  { key: 'chronology', label: 'Chronology' },
                  { key: 'treatment', label: 'Treatment' },
                ]}
                rows={healthRecords}
                onAdd={d => addRow('health_record', d, setHealthRecords)}
                onUpdate={(id, d) => updateRow('health_record', id, d, setHealthRecords)}
                onDelete={id => deleteRow('health_record', id, setHealthRecords)}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="pt-4">
              <SectionHeader title="NOTES" />
              <textarea
                className="w-full rounded border p-3 text-sm resize-none"
                rows={4}
                placeholder="Enter notes here..."
                value={reportForm.notes}
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textBody }}
                onChange={e => setReportForm(p => ({ ...p, notes: e.target.value }))}
              />
              <div className="flex justify-end mt-2">
                <Button onClick={saveInfo} disabled={saving} className="text-sm px-4 py-2 text-white" style={{ background: '#16a34a' }}>
                  {saving ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!healthReport && !loading && selStudent && (
        <div className="text-center py-8 text-sm" style={{ color: theme.textSecondary }}>No report found. Select a student to begin.</div>
      )}

      {!selStudent && !loading && (
        <div className="text-center py-12 text-sm" style={{ color: theme.textSecondary }}>
          Select Academic Year, Semester, Class, and Student to view or create a Health Report Card.
        </div>
      )}

      <NotificationModal isOpen={notif.isOpen} onClose={() => setNotif(p => ({ ...p, isOpen: false }))} title={notif.title} message={notif.message} type={notif.type} />
    </div>
  )
}
