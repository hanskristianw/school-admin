'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays, faPlus, faTrash, faSave,
  faFileExcel, faPrint, faRotate, faWandMagicSparkles,
  faCheck, faExclamationTriangle, faCopy, faSearch
} from '@fortawesome/free-solid-svg-icons'

// List of days helper
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDateLabel(dateStr) {
  if (!dateStr) return { formatted: '', dayName: '' }
  const dt = new Date(dateStr + 'T00:00:00Z')
  if (isNaN(dt.getTime())) return { formatted: dateStr, dayName: '' }
  
  const dayName = DAY_NAMES[dt.getUTCDay()]
  const dayNum = String(dt.getUTCDate()).padStart(2, '0')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = monthNames[dt.getUTCMonth()]
  const yearNum = dt.getUTCFullYear()
  
  return {
    formatted: `${dayNum} ${monthName} ${yearNum}`,
    dayName
  }
}

export default function DutySchedulePage() {
  const { theme } = useTheme()

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(true)
  const [tableExists, setTableExists]   = useState(true)
  const [copiedSql, setCopiedSql]       = useState(false)
  const [years, setYears]               = useState([])
  const [selectedYearId, setSelectedYearId] = useState('')
  const [teachers, setTeachers]         = useState([])
  
  // Date filters
  const [filterMonth, setFilterMonth]   = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [searchQuery, setSearchQuery]   = useState('')

  // Rows state
  const [rows, setRows]                 = useState([])
  const [editedRowIds, setEditedRowIds] = useState(new Set())
  const [saving, setSaving]             = useState(false)
  const [notif, setNotif]               = useState({ show: false, message: '', type: 'success' })

  // Modal State for Generating Date Range
  const [genModalOpen, setGenModalOpen] = useState(false)
  const [genStartDate, setGenStartDate] = useState('')
  const [genEndDate, setGenEndDate]     = useState('')
  const [genExcludeWeekends, setGenExcludeWeekends] = useState(true)
  const [genLoading, setGenLoading]     = useState(false)

  // Single New Row Modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newDate, setNewDate]           = useState(new Date().toISOString().slice(0, 10))

  const showNotification = (message, type = 'success') => {
    setNotif({ show: true, message, type })
    setTimeout(() => setNotif({ show: false, message: '', type: 'success' }), 4000)
  }

  // ── 1. Fetch initial metadata (Years & Teachers) ───────────────────────────
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        setLoading(true)
        const [yRes, tRes] = await Promise.all([
          supabase.from('year').select('year_id, year_name, start_date, end_date').order('start_date', { ascending: false }),
          supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').eq('is_active', true).order('user_nama_depan')
        ])

        if (yRes.data && yRes.data.length > 0) {
          setYears(yRes.data)
          setSelectedYearId(String(yRes.data[0].year_id))
        }

        if (tRes.data) {
          setTeachers(tRes.data)
        }
      } catch (e) {
        console.error('[duty_schedules] fetch meta error:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchMeta()
  }, [])

  // ── 2. Fetch duty_schedules when selectedYearId or filterMonth changes ─────
  const fetchSchedules = useCallback(async () => {
    if (!selectedYearId) return
    setLoading(true)
    try {
      let query = supabase
        .from('duty_schedules')
        .select('*')
        .eq('year_id', parseInt(selectedYearId, 10))
        .order('duty_date', { ascending: true })

      if (filterMonth) {
        const [yStr, mStr] = filterMonth.split('-')
        const lastDay = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate()
        const startOfMonth = `${filterMonth}-01`
        const endOfMonth   = `${filterMonth}-${String(lastDay).padStart(2, '0')}`
        query = query.gte('duty_date', startOfMonth).lte('duty_date', endOfMonth)
      }

      const { data, error } = await query

      if (error) {
        const isTableMissing =
          error.code === '42P01' ||
          error.code === 'PGRST204' ||
          error.code === 'PGRST301' ||
          (error.message && error.message.toLowerCase().includes('duty_schedules'))

        if (isTableMissing) {
          setTableExists(false)
        } else {
          const errMsg = error.message || error.details || error.hint || JSON.stringify(error)
          console.error('[duty_schedules] fetch schedules error:', error)
          showNotification('Failed to load duty schedules: ' + errMsg, 'error')
        }
      } else {
        setTableExists(true)
        setRows(data || [])
        setEditedRowIds(new Set())
      }
    } catch (e) {
      const errMsg = e?.message || e?.details || e?.hint || (typeof e === 'object' ? JSON.stringify(e) : String(e))
      console.error('[duty_schedules] fetch schedules catch error:', e)
      showNotification('Failed to load duty schedules: ' + errMsg, 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedYearId, filterMonth])

  useEffect(() => {
    if (selectedYearId) {
      fetchSchedules()
    }
  }, [selectedYearId, filterMonth, fetchSchedules])

  // ── Teacher Map for quick lookup ───────────────────────────────────────────
  const teacherOptions = useMemo(() => {
    return teachers.map(t => ({
      id: t.user_id,
      name: `${t.user_nama_depan || ''} ${t.user_nama_belakang || ''}`.trim()
    }))
  }, [teachers])

  // Filtered rows for UI search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase().trim()
    return rows.filter(r => {
      const { formatted, dayName } = formatDateLabel(r.duty_date)
      const fields = [
        formatted, dayName,
        r.teacher_to_be_prayed, r.student_to_be_prayed, r.note
      ].map(v => (v || '').toLowerCase())

      return fields.some(f => f.includes(q))
    })
  }, [rows, searchQuery])

  // ── Cell Change Handler ────────────────────────────────────────────────────
  const handleCellChange = (rowId, field, value) => {
    setRows(prevRows =>
      prevRows.map(r => {
        if (r.id === rowId) {
          return { ...r, [field]: value === '' ? null : value }
        }
        return r
      })
    )
    setEditedRowIds(prev => new Set(prev).add(rowId))
  }

  // ── Save All Edited Rows ───────────────────────────────────────────────────
  const handleSaveAll = async () => {
    if (editedRowIds.size === 0) return
    setSaving(true)
    try {
      const rowsToSave = rows.filter(r => editedRowIds.has(r.id))
      const updates = rowsToSave.map(r => {
        const { id, ...data } = r
        // Ensure year_id is set
        data.year_id = parseInt(selectedYearId, 10)
        data.updated_at = new Date().toISOString()
        
        if (typeof id === 'number' && id > 0) {
          return supabase.from('duty_schedules').update(data).eq('id', id)
        } else {
          return supabase.from('duty_schedules').insert([data])
        }
      })

      const results = await Promise.all(updates)
      const err = results.find(res => res.error)
      if (err) throw err.error

      showNotification('All schedule changes saved successfully!', 'success')
      fetchSchedules()
    } catch (e) {
      console.error('[duty_schedules] save error:', e)
      showNotification('Failed to save schedule: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Single Row Delete ──────────────────────────────────────────────────────
  const handleDeleteRow = async (id) => {
    if (!confirm('Are you sure you want to delete this duty schedule row?')) return
    try {
      if (typeof id === 'number' && id > 0) {
        const { error } = await supabase.from('duty_schedules').delete().eq('id', id)
        if (error) throw error
      }
      setRows(prev => prev.filter(r => r.id !== id))
      showNotification('Schedule row deleted successfully.', 'success')
    } catch (e) {
      showNotification('Failed to delete: ' + e.message, 'error')
    }
  }

  // ── Add Single Date Entry ──────────────────────────────────────────────────
  const handleAddSingleDate = async () => {
    if (!newDate) return
    const yearId = parseInt(selectedYearId, 10)
    const exists = rows.some(r => r.duty_date === newDate)
    if (exists) {
      showNotification(`Date ${newDate} already exists in the table.`, 'warning')
      return
    }

    try {
      const newObj = {
        year_id: yearId,
        duty_date: newDate,
        devotion_leader_user_id: null,
        teacher_to_be_prayed: '',
        student_to_be_prayed: '',
        greeter_1st_floor_user_id: null,
        greeter_2nd_floor_user_id: null,
        break_canteen_user_id: null,
        break_pe_field_user_id: null,
        break_2nd_floor_user_id: null,
        break_3rd_floor_user_id: null,
        lunch_canteen_user_id: null,
        lunch_pe_field_user_id: null,
        lunch_2nd_floor_user_id: null,
        lunch_3rd_floor_user_id: null,
      }

      const { data, error } = await supabase.from('duty_schedules').insert([newObj]).select()
      if (error) throw error

      setAddModalOpen(false)
      showNotification(`Date ${newDate} added successfully!`, 'success')
      fetchSchedules()
    } catch (e) {
      showNotification('Failed to add row: ' + e.message, 'error')
    }
  }

  // ── Generate Date Range ────────────────────────────────────────────────────
  const handleGenerateDateRange = async () => {
    if (!genStartDate || !genEndDate) {
      showNotification('Please select both start date and end date', 'warning')
      return
    }
    if (genStartDate > genEndDate) {
      showNotification('Start date must be earlier than or equal to end date', 'warning')
      return
    }

    setGenLoading(true)
    try {
      const yearId = parseInt(selectedYearId, 10)
      const datesToInsert = []
      
      let curr = new Date(genStartDate + 'T00:00:00Z')
      const end = new Date(genEndDate + 'T00:00:00Z')

      const existingDates = new Set(rows.map(r => r.duty_date))

      while (curr <= end) {
        const dateStr = curr.toISOString().slice(0, 10)
        const dayOfWeek = curr.getUTCDay() // 0=Sun, 6=Sat

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        if (!existingDates.has(dateStr) && (!genExcludeWeekends || !isWeekend)) {
          datesToInsert.push({
            year_id: yearId,
            duty_date: dateStr,
          })
        }

        curr.setUTCDate(curr.getUTCDate() + 1)
      }

      if (datesToInsert.length === 0) {
        showNotification('No new dates to add (all dates in range already exist).', 'info')
      } else {
        const { error } = await supabase.from('duty_schedules').insert(datesToInsert)
        if (error) throw error

        showNotification(`Successfully added ${datesToInsert.length} new dates to the schedule!`, 'success')
        fetchSchedules()
      }
      setGenModalOpen(false)
    } catch (e) {
      showNotification('Failed to generate schedule: ' + e.message, 'error')
    } finally {
      setGenLoading(false)
    }
  }

  // ── Export to CSV / Excel ──────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (rows.length === 0) return
    const headers = [
      'Date', 'Day', 'Devotion Leader', 'Teacher to Be Prayed For', 'Student to Be Prayed For',
      'Greeter 1st Floor', 'Greeter 2nd Floor',
      'Break Canteen', 'Break PE Field', 'Break 2nd Floor', 'Break 3rd Floor',
      'Lunch Canteen', 'Lunch PE Field', 'Lunch 2nd Floor', 'Lunch 3rd Floor'
    ]

    const getTName = (id) => teacherOptions.find(t => t.id === id)?.name || ''

    const csvRows = [headers.join(',')]
    for (const r of rows) {
      const { formatted, dayName } = formatDateLabel(r.duty_date)
      const values = [
        `"${formatted}"`, `"${dayName}"`,
        `"${getTName(r.devotion_leader_user_id)}"`,
        `"${r.teacher_to_be_prayed || ''}"`,
        `"${r.student_to_be_prayed || ''}"`,
        `"${getTName(r.greeter_1st_floor_user_id)}"`,
        `"${getTName(r.greeter_2nd_floor_user_id)}"`,
        `"${getTName(r.break_canteen_user_id)}"`,
        `"${getTName(r.break_pe_field_user_id)}"`,
        `"${getTName(r.break_2nd_floor_user_id)}"`,
        `"${getTName(r.break_3rd_floor_user_id)}"`,
        `"${getTName(r.lunch_canteen_user_id)}"`,
        `"${getTName(r.lunch_pe_field_user_id)}"`,
        `"${getTName(r.lunch_2nd_floor_user_id)}"`,
        `"${getTName(r.lunch_3rd_floor_user_id)}"`
      ]
      csvRows.push(values.join(','))
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', `Duty_Schedule_${filterMonth || 'all'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const ddlSql = `CREATE TABLE IF NOT EXISTS duty_schedules (
  id SERIAL PRIMARY KEY,
  year_id INTEGER NOT NULL REFERENCES year(year_id) ON DELETE CASCADE,
  duty_date DATE NOT NULL,
  devotion_leader_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  teacher_to_be_prayed VARCHAR(255),
  student_to_be_prayed VARCHAR(255),
  greeter_1st_floor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  greeter_2nd_floor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  break_canteen_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  break_pe_field_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  break_2nd_floor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  break_3rd_floor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  lunch_canteen_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  lunch_pe_field_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  lunch_2nd_floor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  lunch_3rd_floor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT duty_schedules_year_date_unique UNIQUE (year_id, duty_date)
);`

  const copyDdlSql = () => {
    navigator.clipboard.writeText(ddlSql)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: theme.textBody }}>

      {/* Notification Toast */}
      {notif.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          notif.type === 'error' ? 'bg-red-600 text-white' :
          notif.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {notif.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: theme.textPrimary }}>
            <FontAwesomeIcon icon={faCalendarDays} className="text-emerald-500" />
            Duty & Devotion Schedule
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
            Manage Morning Devotion, Prayer Subjects, Door Greeter, Break Duty & Lunch Duty schedules
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {editedRowIds.size > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow transition-all"
            >
              <FontAwesomeIcon icon={saving ? faRotate : faSave} spin={saving} />
              Save Changes ({editedRowIds.size})
            </button>
          )}

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg font-medium"
            style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
          >
            <FontAwesomeIcon icon={faPlus} /> Add Date
          </button>

          <button
            onClick={() => setGenModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} /> Generate Dates
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg font-medium"
            style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
          >
            <FontAwesomeIcon icon={faFileExcel} className="text-emerald-600" /> Export
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg font-medium"
            style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
          >
            <FontAwesomeIcon icon={faPrint} /> Print
          </button>
        </div>
      </div>

      {/* Database Table Missing Alert */}
      {!tableExists && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-base">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 text-lg" />
            `duty_schedules` Table Not Found in Supabase Database
          </div>
          <p className="text-sm">
            The database table for duty schedules does not exist in Supabase yet. Please copy the DDL query below and run it in the <strong>Supabase SQL Editor</strong>:
          </p>
          <div className="relative bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-xs overflow-x-auto max-h-48">
            <pre>{ddlSql}</pre>
            <button
              onClick={copyDdlSql}
              className="absolute top-2 right-2 px-2.5 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-1"
            >
              <FontAwesomeIcon icon={copiedSql ? faCheck : faCopy} />
              {copiedSql ? 'Copied!' : 'Copy SQL'}
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-end p-4 rounded-xl" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}` }}>
        
        {/* Academic Year Filter */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Academic Year</label>
          <select
            value={selectedYearId}
            onChange={e => setSelectedYearId(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg font-medium"
            style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textPrimary }}
          >
            {years.map(y => (
              <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Month</label>
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg font-medium"
            style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textPrimary }}
          />
        </div>

        {/* Search Input */}
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Search Name / Prayer Subject</label>
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.textSecondary }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search teacher, student, or date..."
              className="text-sm pl-8 pr-3 py-2 rounded-lg w-full"
              style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textPrimary }}
            />
          </div>
        </div>

        <button
          onClick={fetchSchedules}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg"
          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
        >
          <FontAwesomeIcon icon={faRotate} spin={loading} /> Refresh
        </button>
      </div>

      {/* Grid Table */}
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: `1px solid ${theme.border}` }}>
        {loading ? (
          <div className="text-center py-16" style={{ color: theme.textSecondary }}>
            <FontAwesomeIcon icon={faRotate} spin className="text-3xl mb-3 text-emerald-500" />
            <p className="text-sm font-medium">Loading duty schedules...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16" style={{ color: theme.textSecondary }}>
            <FontAwesomeIcon icon={faCalendarDays} className="text-5xl mb-3 opacity-30" />
            <p className="text-base font-semibold" style={{ color: theme.textPrimary }}>No Duty Schedules Found</p>
            <p className="text-sm mt-1 max-w-md mx-auto">
              Use the <strong>Generate Dates</strong> button to create working days automatically, or <strong>Add Date</strong> to add a single day manually.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full text-xs border-collapse">
              
              {/* Header Groups */}
              <thead className="sticky top-0 z-10 text-white font-bold select-none">
                <tr className="text-center divide-x divide-white/20">
                  <th colSpan={2} className="py-2 px-3 bg-slate-800 uppercase tracking-wider text-[11px]">Date & Day</th>
                  <th colSpan={3} className="py-2 px-3 bg-blue-900 uppercase tracking-wider text-[11px]">Devotion & Prayer Subjects</th>
                  <th colSpan={2} className="py-2 px-3 bg-emerald-700 uppercase tracking-wider text-[11px]">Morning Door Greeter (07.30–08.00)</th>
                  <th colSpan={4} className="py-2 px-3 bg-amber-700 uppercase tracking-wider text-[11px]">Break Duty (09.45–10.15)</th>
                  <th colSpan={4} className="py-2 px-3 bg-indigo-800 uppercase tracking-wider text-[11px]">Lunch Duty</th>
                  <th colSpan={1} className="py-2 px-2 bg-slate-800">Actions</th>
                </tr>

                <tr className="text-left divide-x divide-white/20 text-[11px]">
                  {/* Date & Day */}
                  <th className="py-2 px-3 bg-slate-700 w-28">Date</th>
                  <th className="py-2 px-3 bg-slate-700 w-24">Day</th>

                  {/* Devotion & Prayer */}
                  <th className="py-2 px-3 bg-blue-800 min-w-[200px]">Devotion Leader</th>
                  <th className="py-2 px-3 bg-blue-800 min-w-[200px]">Teacher to Be Prayed For</th>
                  <th className="py-2 px-3 bg-blue-800 min-w-[200px]">Student to Be Prayed For</th>

                  {/* Morning Greeter */}
                  <th className="py-2 px-3 bg-emerald-600 min-w-[190px]">1st Floor</th>
                  <th className="py-2 px-3 bg-emerald-600 min-w-[190px]">2nd Floor</th>

                  {/* Break Duty */}
                  <th className="py-2 px-3 bg-amber-600 min-w-[190px]">Canteen</th>
                  <th className="py-2 px-3 bg-amber-600 min-w-[190px]">PE Field</th>
                  <th className="py-2 px-3 bg-amber-600 min-w-[190px]">2nd Floor</th>
                  <th className="py-2 px-3 bg-amber-600 min-w-[190px]">3rd Floor</th>

                  {/* Lunch Duty */}
                  <th className="py-2 px-3 bg-indigo-700 min-w-[190px]">Canteen</th>
                  <th className="py-2 px-3 bg-indigo-700 min-w-[190px]">PE Field</th>
                  <th className="py-2 px-3 bg-indigo-700 min-w-[190px]">2nd Floor</th>
                  <th className="py-2 px-3 bg-indigo-700 min-w-[190px]">3rd Floor</th>

                  {/* Actions */}
                  <th className="py-2 px-2 bg-slate-700 text-center w-12">#</th>
                </tr>
              </thead>

              {/* Rows Body */}
              <tbody className="divide-y" style={{ borderColor: theme.border }}>
                {filteredRows.map(row => {
                  const { formatted, dayName } = formatDateLabel(row.duty_date)
                  const isEdited = editedRowIds.has(row.id)
                  const isWeekend = dayName === 'Saturday' || dayName === 'Sunday'

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${isEdited ? 'bg-amber-500/10' : isWeekend ? 'opacity-60 bg-gray-500/5' : ''}`}
                      style={{ borderBottom: `1px solid ${theme.border}` }}
                    >
                      {/* Date */}
                      <td className="py-1.5 px-2.5 font-medium whitespace-nowrap font-mono text-[11px]" style={{ color: theme.textPrimary }}>
                        {formatted}
                      </td>

                      {/* Day */}
                      <td className="py-1.5 px-2.5 font-semibold whitespace-nowrap text-[11px]" style={{ color: isWeekend ? '#ef4444' : theme.textSecondary }}>
                        {dayName}
                      </td>

                      {/* Devotion Leader */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.devotion_leader_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'devotion_leader_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded font-medium border cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Teacher to Be Prayed For */}
                      <td className="py-1 px-1.5">
                        <input
                          type="text"
                          value={row.teacher_to_be_prayed || ''}
                          onChange={e => handleCellChange(row.id, 'teacher_to_be_prayed', e.target.value)}
                          placeholder="Teacher name..."
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        />
                      </td>

                      {/* Student to Be Prayed For */}
                      <td className="py-1 px-1.5">
                        <input
                          type="text"
                          value={row.student_to_be_prayed || ''}
                          onChange={e => handleCellChange(row.id, 'student_to_be_prayed', e.target.value)}
                          placeholder="Student name..."
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        />
                      </td>

                      {/* Morning Greeter 1st Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.greeter_1st_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'greeter_1st_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Morning Greeter 2nd Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.greeter_2nd_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'greeter_2nd_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Break Canteen */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.break_canteen_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'break_canteen_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Break PE Field */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.break_pe_field_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'break_pe_field_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Break 2nd Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.break_2nd_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'break_2nd_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Break 3rd Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.break_3rd_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'break_3rd_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Lunch Canteen */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.lunch_canteen_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'lunch_canteen_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Lunch PE Field */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.lunch_pe_field_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'lunch_pe_field_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Lunch 2nd Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.lunch_2nd_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'lunch_2nd_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Lunch 3rd Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.lunch_3rd_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'lunch_3rd_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[175px] text-xs py-1.5 px-2 rounded border font-medium cursor-pointer"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                        >
                          <option value="">— Select Teacher —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Action Delete */}
                      <td className="py-1 px-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="text-red-500 hover:text-red-700 p-1 transition-colors"
                          title="Delete this date row"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Single Date */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold" style={{ color: theme.textPrimary }}>Add New Date</h3>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: theme.textSecondary }}>Select Date</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textPrimary }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg"
                style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSingleDate}
                className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Generate Date Range */}
      {genModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-blue-500" />
              Auto-Generate Dates
            </h3>
            <p className="text-xs" style={{ color: theme.textSecondary }}>
              Automatically generate new date rows for a specified date range within the selected Academic Year.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: theme.textSecondary }}>Start Date</label>
                <input
                  type="date"
                  value={genStartDate}
                  onChange={e => setGenStartDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border"
                  style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textPrimary }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: theme.textSecondary }}>End Date</label>
                <input
                  type="date"
                  value={genEndDate}
                  onChange={e => setGenEndDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border"
                  style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textPrimary }}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={genExcludeWeekends}
                  onChange={e => setGenExcludeWeekends(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span style={{ color: theme.textPrimary }}>Exclude Weekends (Saturday & Sunday)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setGenModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg"
                style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDateRange}
                disabled={genLoading}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={genLoading ? faRotate : faWandMagicSparkles} spin={genLoading} />
                {genLoading ? 'Processing...' : 'Generate Dates'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
