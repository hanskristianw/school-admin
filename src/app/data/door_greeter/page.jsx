'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays, faPlus, faTrash, faSave,
  faFileExcel, faPrint, faRotate, faWandMagicSparkles,
  faCheck, faExclamationTriangle, faCopy, faSearch, faGear, faClock,
  faBuildingColumns, faSchool, faFilter, faCheckCircle
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
  const { theme, isDark } = useTheme()

  // Dynamic Styles tied to useTheme() (100% Light & Dark Mode Compatible)
  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '6px' }
  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '6px' }
  const btnPrimaryStyle = { background: theme.textPrimary, color: isDark ? '#18171A' : '#FFFFFF', border: 'none' }
  const btnSecondaryStyle = { background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}` }

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(true)
  const [tableExists, setTableExists]   = useState(true)
  const [copiedSql, setCopiedSql]       = useState(false)
  const [years, setYears]               = useState([])
  const [selectedYearId, setSelectedYearId] = useState('')
  const [schoolUnits, setSchoolUnits]   = useState([])
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [roles, setRoles]               = useState([])
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

  // Duty Time & Reminder Settings Modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [dutySettings, setDutySettings] = useState({
    devotion: { startTime: '07:30', endTime: '08:00', reminderMins: 60 },
    greeter:  { startTime: '07:30', endTime: '08:00', reminderMins: 60 },
    break:    { startTime: '09:45', endTime: '10:15', reminderMins: 60 },
    lunch:    { startTime: '12:30', endTime: '13:00', reminderMins: 60 }
  })
  const [settingsUnit, setSettingsUnit]       = useState('global')
  const [allDbDutySettings, setAllDbDutySettings] = useState([])
  const [savingSettings, setSavingSettings]   = useState(false)

  const showNotification = (message, type = 'success') => {
    setNotif({ show: true, message, type })
    setTimeout(() => setNotif({ show: false, message: '', type: 'success' }), 4000)
  }

  const populateSettingsForUnit = (targetUnitId, rawData) => {
    const data = rawData || allDbDutySettings
    const defaultDefaults = {
      devotion: { startTime: '07:30', endTime: '08:00', reminderMins: 60 },
      greeter:  { startTime: '07:30', endTime: '08:00', reminderMins: 30 },
      break:    { startTime: '09:45', endTime: '10:15', reminderMins: 15 },
      lunch:    { startTime: '12:30', endTime: '13:00', reminderMins: 15 },
    }

    const newSt = { ...defaultDefaults }
    const suffix = targetUnitId === 'global' ? '' : `_unit_${targetUnitId}`

    // Populate from global default
    const globalData = data.filter(d => ['devotion', 'greeter', 'break', 'lunch'].includes(d.slot_key))
    globalData.forEach(item => {
      if (newSt[item.slot_key]) {
        newSt[item.slot_key] = {
          startTime: item.start_time ? String(item.start_time).slice(0, 5) : newSt[item.slot_key].startTime,
          endTime: item.end_time ? String(item.end_time).slice(0, 5) : newSt[item.slot_key].endTime,
          reminderMins: item.reminder_minutes_before ?? newSt[item.slot_key].reminderMins
        }
      }
    })

    // Override with unit-specific data if present
    if (suffix) {
      const unitData = data.filter(d => d.slot_key.endsWith(suffix))
      unitData.forEach(item => {
        const baseKey = item.slot_key.replace(suffix, '')
        if (newSt[baseKey]) {
          newSt[baseKey] = {
            startTime: item.start_time ? String(item.start_time).slice(0, 5) : newSt[baseKey].startTime,
            endTime: item.end_time ? String(item.end_time).slice(0, 5) : newSt[baseKey].endTime,
            reminderMins: item.reminder_minutes_before ?? newSt[baseKey].reminderMins
          }
        }
      })
    }

    setDutySettings(newSt)
  }

  const fetchDutySettings = async () => {
    try {
      const { data, error } = await supabase.from('duty_settings').select('*')
      if (error || !data) return
      setAllDbDutySettings(data)
      populateSettingsForUnit(settingsUnit, data)
    } catch (_) {}
  }

  const formatTimeForDb = (timeStr, fallback = null) => {
    const val = (timeStr || fallback || '').trim()
    if (!val) return null
    const parts = val.split(':')
    if (parts.length >= 2) {
      const h = parts[0].padStart(2, '0')
      const m = parts[1].padStart(2, '0')
      const s = parts[2] ? parts[2].slice(0, 2).padStart(2, '0') : '00'
      return `${h}:${m}:${s}`
    }
    return null
  }

  const handleSaveDutySettings = async () => {
    setSavingSettings(true)
    try {
      const suffix = settingsUnit === 'global' ? '' : `_unit_${settingsUnit}`

      const getUnitName = (uId) => {
        if (!uId || uId === 'global') return ''
        const found = schoolUnits.find(u => String(u.unit_id) === String(uId))
        return found ? ` (Unit ${found.unit_name})` : ` (Unit ${uId})`
      }
      const unitNameLabel = getUnitName(settingsUnit)

      const rowsToUpsert = [
        {
          slot_key: `devotion${suffix}`,
          slot_name: `Morning Devotion Leader${unitNameLabel}`,
          start_time: formatTimeForDb(dutySettings.devotion?.startTime, '07:30'),
          end_time: formatTimeForDb(dutySettings.devotion?.endTime, '08:00'),
          reminder_minutes_before: parseInt(dutySettings.devotion?.reminderMins || 60, 10)
        },
        {
          slot_key: `greeter${suffix}`,
          slot_name: `Morning Door Greeter${unitNameLabel}`,
          start_time: formatTimeForDb(dutySettings.greeter?.startTime, '07:30'),
          end_time: formatTimeForDb(dutySettings.greeter?.endTime, '08:00'),
          reminder_minutes_before: parseInt(dutySettings.greeter?.reminderMins || 30, 10)
        },
        {
          slot_key: `break${suffix}`,
          slot_name: `Break Duty${unitNameLabel}`,
          start_time: formatTimeForDb(dutySettings.break?.startTime, '09:45'),
          end_time: formatTimeForDb(dutySettings.break?.endTime, '10:15'),
          reminder_minutes_before: parseInt(dutySettings.break?.reminderMins || 15, 10)
        },
        {
          slot_key: `lunch${suffix}`,
          slot_name: `Lunch Duty${unitNameLabel}`,
          start_time: formatTimeForDb(dutySettings.lunch?.startTime, '12:30'),
          end_time: formatTimeForDb(dutySettings.lunch?.endTime, '13:00'),
          reminder_minutes_before: parseInt(dutySettings.lunch?.reminderMins || 15, 10)
        }
      ]

      const { error } = await supabase.from('duty_settings').upsert(rowsToUpsert, { onConflict: 'slot_key' })
      if (error) throw error

      showNotification('Duty time settings saved successfully!', 'success')
      await fetchDutySettings()
      setSettingsModalOpen(false)
    } catch (e) {
      showNotification('Failed to save duty settings: ' + e.message, 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  // ── 1. Fetch initial metadata (Years, School Units, Roles & Users) ───────────
  useEffect(() => {
    fetchDutySettings()
    const fetchMeta = async () => {
      try {
        setLoading(true)
        const [yRes, tRes, uRes, rRes] = await Promise.all([
          supabase.from('year').select('year_id, year_name, start_date, end_date').order('start_date', { ascending: false }),
          supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang, user_unit_id, user_role_id').eq('is_active', true).order('user_nama_depan'),
          supabase.from('unit').select('unit_id, unit_name, is_school').order('unit_name'),
          supabase.from('role').select('role_id, role_name')
        ])

        if (yRes.data && yRes.data.length > 0) {
          setYears(yRes.data)
          setSelectedYearId(String(yRes.data[0].year_id))
        }

        if (uRes.data && uRes.data.length > 0) {
          setSchoolUnits(uRes.data)
          const mypUnit = uRes.data.find(u => Number(u.unit_id) === 2)
          setSelectedUnitId(String(mypUnit ? mypUnit.unit_id : uRes.data[0].unit_id))
        }

        if (rRes.data) {
          setRoles(rRes.data)
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

  // ── User Map for quick lookup with Unit & Role Badges ─────────────────────────
  const teacherOptions = useMemo(() => {
    const unitMap = new Map((schoolUnits || []).map(u => [u.unit_id, u.unit_name]))
    const roleMap = new Map((roles || []).map(r => [r.role_id, r.role_name]))

    const list = (teachers || []).map(t => {
      const uName = unitMap.get(t.user_unit_id)
      const rName = roleMap.get(t.user_role_id)
      const isCurrentUnit = String(t.user_unit_id) === String(selectedUnitId)
      const isStudent = String(rName || '').toLowerCase() === 'student' || t.user_role_id === 3
      const nameStr = `${t.user_nama_depan || ''} ${t.user_nama_belakang || ''}`.trim()

      let infoStr = ''
      if (uName && rName) infoStr = ` (${uName} · ${rName})`
      else if (uName) infoStr = ` (${uName})`
      else if (rName) infoStr = ` (${rName})`

      return {
        id: t.user_id,
        name: `${nameStr}${infoStr}`,
        cleanName: nameStr,
        unit_id: t.user_unit_id,
        unitName: uName || '',
        role_id: t.user_role_id,
        isCurrentUnit,
        isStudent
      }
    })

    return list.sort((a, b) => {
      if (a.isCurrentUnit !== b.isCurrentUnit) {
        return a.isCurrentUnit ? -1 : 1
      }
      const uCmp = a.unitName.localeCompare(b.unitName)
      if (uCmp !== 0) return uCmp
      if (a.isStudent !== b.isStudent) {
        return a.isStudent ? 1 : -1
      }
      return a.cleanName.localeCompare(b.cleanName, undefined, { sensitivity: 'base' })
    })
  }, [teachers, schoolUnits, roles, selectedUnitId])

  // Filtered rows for active Unit Tab & UI search
  const filteredRows = useMemo(() => {
    let result = rows

    if (selectedUnitId) {
      result = result.filter(r => {
        if (r.unit_id !== undefined && r.unit_id !== null) {
          return String(r.unit_id) === String(selectedUnitId)
        }
        const defaultUnit = schoolUnits.find(u => Number(u.unit_id) === 2)?.unit_id || schoolUnits[0]?.unit_id
        return !defaultUnit || String(selectedUnitId) === String(defaultUnit)
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(r => {
        const { formatted, dayName } = formatDateLabel(r.duty_date)
        const fields = [
          formatted, dayName,
          r.teacher_to_be_prayed, r.student_to_be_prayed, r.note
        ].map(v => (v || '').toLowerCase())

        return fields.some(f => f.includes(q))
      })
    }
    return result
  }, [rows, selectedUnitId, schoolUnits, searchQuery])

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
      const unitIdNum = selectedUnitId ? parseInt(selectedUnitId, 10) : null
      const updates = rowsToSave.map(async r => {
        const { id, ...data } = r
        data.year_id = parseInt(selectedYearId, 10)
        data.unit_id = unitIdNum
        data.updated_at = new Date().toISOString()
        
        if (typeof id === 'number' && id > 0) {
          let res = await supabase.from('duty_schedules').update(data).eq('id', id)
          if (res.error && (res.error.code === '42703' || res.error.message?.includes('unit_id'))) {
            delete data.unit_id
            res = await supabase.from('duty_schedules').update(data).eq('id', id)
          }
          return res
        } else {
          let res = await supabase.from('duty_schedules').insert([data])
          if (res.error && (res.error.code === '42703' || res.error.message?.includes('unit_id'))) {
            delete data.unit_id
            res = await supabase.from('duty_schedules').insert([data])
          }
          return res
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
    const unitIdNum = selectedUnitId ? parseInt(selectedUnitId, 10) : null
    const exists = rows.some(r => r.duty_date === newDate && (!r.unit_id || r.unit_id === unitIdNum))
    if (exists) {
      showNotification(`Date ${newDate} already exists in the table.`, 'warning')
      return
    }

    try {
      const newObj = {
        year_id: yearId,
        unit_id: unitIdNum,
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

      let { data, error } = await supabase.from('duty_schedules').insert([newObj]).select()
      if (error && (error.code === '42703' || error.message?.includes('unit_id'))) {
        delete newObj.unit_id
        const retry = await supabase.from('duty_schedules').insert([newObj]).select()
        data = retry.data
        error = retry.error
      }
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
      const unitIdNum = selectedUnitId ? parseInt(selectedUnitId, 10) : null
      const datesToInsert = []
      
      let curr = new Date(genStartDate + 'T00:00:00Z')
      const end = new Date(genEndDate + 'T00:00:00Z')

      const existingDates = new Set(rows.filter(r => !r.unit_id || r.unit_id === unitIdNum).map(r => r.duty_date))

      while (curr <= end) {
        const dateStr = curr.toISOString().slice(0, 10)
        const dayOfWeek = curr.getUTCDay()

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        if (!existingDates.has(dateStr) && (!genExcludeWeekends || !isWeekend)) {
          datesToInsert.push({
            year_id: yearId,
            unit_id: unitIdNum,
            duty_date: dateStr,
          })
        }

        curr.setUTCDate(curr.getUTCDate() + 1)
      }

      if (datesToInsert.length === 0) {
        showNotification('No new dates to add (all dates in range already exist).', 'info')
      } else {
        let { error } = await supabase.from('duty_schedules').insert(datesToInsert)
        if (error && (error.code === '42703' || error.message?.includes('unit_id'))) {
          const fallbackDates = datesToInsert.map(({ unit_id, ...rest }) => rest)
          const retry = await supabase.from('duty_schedules').insert(fallbackDates)
          error = retry.error
        }
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

  const ddlSql = `-- 1. Add unit_id column
ALTER TABLE duty_schedules ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES unit(unit_id);

-- 2. Drop old single-unit unique constraint & add multi-unit unique constraint
ALTER TABLE duty_schedules DROP CONSTRAINT IF EXISTS duty_schedules_year_date_unique;
ALTER TABLE duty_schedules ADD CONSTRAINT duty_schedules_unit_year_date_unique UNIQUE (unit_id, year_id, duty_date);`

  const copyDdlSql = () => {
    navigator.clipboard.writeText(ddlSql)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2000)
  }

  // ── Render Minimalist Editorial Layout ──────────────────────────────────────
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans antialiased space-y-6" style={{ background: theme.pageBg, color: theme.textPrimary }}>

      {/* Toast Notification */}
      {notif.show && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-md border shadow-sm text-xs font-medium tracking-tight flex items-center gap-2" style={
          notif.type === 'error' ? { background: theme.redBg, color: theme.redText, borderColor: theme.redBg } :
          notif.type === 'warning' ? { background: theme.yellowBg, color: theme.yellowText, borderColor: theme.yellowBg } :
          { background: theme.greenBg, color: theme.greenText, borderColor: theme.greenBg }
        }>
          <FontAwesomeIcon icon={notif.type === 'error' ? faExclamationTriangle : faCheckCircle} />
          <span>{notif.message}</span>
        </div>
      )}

      {/* ─── Minimalist Editorial Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b" style={{ borderColor: theme.border }}>
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase mb-2" style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
            <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
            <span>School Duty Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: theme.textPrimary }}>
            Duty & Devotion Schedule
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: theme.textSecondary }}>
            Morning Devotion, Door Greeter, Break Duty, and Lunch Duty assignments.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {editedRowIds.size > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-md transition-all cursor-pointer active:scale-[0.98]"
              style={{ background: theme.greenBg, color: theme.greenText, border: `1px solid ${theme.greenBg}` }}
            >
              <FontAwesomeIcon icon={saving ? faRotate : faSave} spin={saving} />
              <span>Save Changes ({editedRowIds.size})</span>
            </button>
          )}

          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-md cursor-pointer transition-colors"
            style={btnSecondaryStyle}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" style={{ color: theme.textSecondary }} />
            <span>Add Date</span>
          </button>

          <button
            onClick={() => setSettingsModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-md cursor-pointer transition-colors"
            style={btnSecondaryStyle}
          >
            <FontAwesomeIcon icon={faGear} className="text-xs" style={{ color: theme.textSecondary }} />
            <span>Duty Settings</span>
          </button>

          <button
            onClick={() => setGenModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-md cursor-pointer transition-all active:scale-[0.98]"
            style={btnPrimaryStyle}
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />
            <span>Generate Dates</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-2.5 rounded-md cursor-pointer transition-colors"
            style={btnSecondaryStyle}
          >
            <FontAwesomeIcon icon={faFileExcel} className="text-xs" style={{ color: theme.textSecondary }} />
            <span>Export</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-2.5 rounded-md cursor-pointer transition-colors"
            style={btnSecondaryStyle}
          >
            <FontAwesomeIcon icon={faPrint} className="text-xs" style={{ color: theme.textSecondary }} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Database Missing Banner */}
      {!tableExists && (
        <div className="p-4 rounded-lg border space-y-3" style={{ background: theme.yellowBg, borderColor: theme.yellowBg, color: theme.yellowText }}>
          <div className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>duty_schedules Table Missing in Supabase Database</span>
          </div>
          <p className="text-xs opacity-90">
            Run the SQL DDL statement below inside the Supabase SQL Editor to enable duty scheduling:
          </p>
          <div className="relative p-3 rounded font-mono text-[11px] overflow-x-auto border" style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }}>
            <pre>{ddlSql}</pre>
            <button
              onClick={copyDdlSql}
              className="absolute top-2 right-2 px-2 py-1 text-[10px] font-sans font-medium rounded border cursor-pointer"
              style={btnSecondaryStyle}
            >
              <FontAwesomeIcon icon={copiedSql ? faCheck : faCopy} className="mr-1" />
              {copiedSql ? 'Copied!' : 'Copy SQL'}
            </button>
          </div>
        </div>
      )}

      {/* Unit Selector Tabs */}
      {schoolUnits.length > 0 && (
        <div className="flex items-center gap-1.5 p-1 rounded-lg border overflow-x-auto" style={{ background: theme.subtleBg, borderColor: theme.border }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-3 shrink-0" style={{ color: theme.textSecondary }}>Unit:</span>
          {schoolUnits.map(u => {
            const active = String(u.unit_id) === String(selectedUnitId)
            return (
              <button
                key={u.unit_id}
                onClick={() => setSelectedUnitId(String(u.unit_id))}
                className="px-3 py-1.5 text-xs font-medium rounded transition-all cursor-pointer whitespace-nowrap"
                style={{
                  background: active ? theme.textPrimary : 'transparent',
                  color: active ? (isDark ? '#18171A' : '#FFFFFF') : theme.textSecondary,
                  fontWeight: active ? '600' : '400'
                }}
              >
                <span>Unit {u.unit_name} Schedule</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-lg p-4 border space-y-3" style={{ background: theme.cardBg, borderColor: theme.border }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Academic Year Filter */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>
              Academic Year
            </label>
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md"
              style={selectStyle}
            >
              {years.map(y => (
                <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>
              Month Filter
            </label>
            <input
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono rounded-md"
              style={inputStyle}
            />
          </div>

          {/* Search Input */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>
              Search Teacher / Subject
            </label>
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: theme.textSecondary }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name, date, or notes..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Schedule Table Card ─── */}
      <div className="rounded-lg border overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border }}>
        {loading ? (
          <div className="text-center py-16 text-xs font-medium" style={{ color: theme.textSecondary }}>
            <FontAwesomeIcon icon={faRotate} spin className="text-base mb-2" style={{ color: theme.textPrimary }} />
            <p>Loading duty schedules...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16 px-4 text-xs" style={{ color: theme.textSecondary }}>
            <FontAwesomeIcon icon={faCalendarDays} className="text-3xl mb-3 opacity-30" />
            <p className="font-semibold text-sm" style={{ color: theme.textPrimary }}>No Duty Schedules Found</p>
            <p className="mt-1 max-w-md mx-auto">
              Use <strong>Generate Dates</strong> to create working days automatically, or <strong>Add Date</strong> to insert a day manually.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full text-xs border-collapse">
              
              {/* Header Groups */}
              <thead className="sticky top-0 z-10 font-semibold uppercase text-[10px] tracking-wider select-none border-b" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                <tr className="text-center border-b" style={{ borderColor: theme.border }}>
                  <th colSpan={2} className="py-2 px-3 border-r" style={{ borderColor: theme.border }}>Date & Day</th>
                  <th colSpan={3} className="py-2 px-3 border-r" style={{ borderColor: theme.border }}>Devotion & Prayer Subjects</th>
                  <th colSpan={2} className="py-2 px-3 border-r" style={{ borderColor: theme.border }}>Morning Door Greeter (07.30–08.00)</th>
                  <th colSpan={4} className="py-2 px-3 border-r" style={{ borderColor: theme.border }}>Break Duty (09.45–10.15)</th>
                  <th colSpan={4} className="py-2 px-3 border-r" style={{ borderColor: theme.border }}>Lunch Duty</th>
                  <th colSpan={1} className="py-2 px-2 text-right">#</th>
                </tr>

                <tr className="text-left text-[10px]">
                  <th className="py-2 px-3 w-28 border-r" style={{ borderColor: theme.border }}>Date</th>
                  <th className="py-2 px-3 w-24 border-r" style={{ borderColor: theme.border }}>Day</th>

                  <th className="py-2 px-3 min-w-[190px]">Devotion Leader</th>
                  <th className="py-2 px-3 min-w-[190px]">Teacher to Be Prayed</th>
                  <th className="py-2 px-3 min-w-[190px] border-r" style={{ borderColor: theme.border }}>Student to Be Prayed</th>

                  <th className="py-2 px-3 min-w-[180px]">1st Floor</th>
                  <th className="py-2 px-3 min-w-[180px] border-r" style={{ borderColor: theme.border }}>2nd Floor</th>

                  <th className="py-2 px-3 min-w-[180px]">Canteen</th>
                  <th className="py-2 px-3 min-w-[180px]">PE Field</th>
                  <th className="py-2 px-3 min-w-[180px]">2nd Floor</th>
                  <th className="py-2 px-3 min-w-[180px] border-r" style={{ borderColor: theme.border }}>3rd Floor</th>

                  <th className="py-2 px-3 min-w-[180px]">Canteen</th>
                  <th className="py-2 px-3 min-w-[180px]">PE Field</th>
                  <th className="py-2 px-3 min-w-[180px]">2nd Floor</th>
                  <th className="py-2 px-3 min-w-[180px] border-r" style={{ borderColor: theme.border }}>3rd Floor</th>

                  <th className="py-2 px-2 text-center w-12">#</th>
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
                      className="transition-colors duration-150"
                      style={{
                        background: isEdited ? theme.yellowBg : isWeekend ? theme.subtleBg : 'transparent',
                        borderBottom: `1px solid ${theme.border}`
                      }}
                      onMouseEnter={e => { if (!isEdited && !isWeekend) e.currentTarget.style.background = theme.subtleBg }}
                      onMouseLeave={e => { if (!isEdited && !isWeekend) e.currentTarget.style.background = 'transparent' }}
                    >
                      {/* Date */}
                      <td className="py-1.5 px-3 font-medium whitespace-nowrap font-mono text-[11px]" style={{ color: theme.textPrimary }}>
                        {formatted}
                      </td>

                      {/* Day */}
                      <td className="py-1.5 px-3 font-semibold whitespace-nowrap text-[11px]" style={{ color: isWeekend ? theme.redText : theme.textSecondary }}>
                        {dayName}
                      </td>

                      {/* Devotion Leader */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.devotion_leader_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'devotion_leader_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
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
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border"
                          style={inputStyle}
                        />
                      </td>

                      {/* Student to Be Prayed For */}
                      <td className="py-1 px-1.5">
                        <input
                          type="text"
                          value={row.student_to_be_prayed || ''}
                          onChange={e => handleCellChange(row.id, 'student_to_be_prayed', e.target.value)}
                          placeholder="Student name..."
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border"
                          style={inputStyle}
                        />
                      </td>

                      {/* Morning Greeter 1st Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.greeter_1st_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'greeter_1st_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Morning Greeter 2nd Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.greeter_2nd_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'greeter_2nd_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Break Canteen */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.break_canteen_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'break_canteen_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Break PE Field */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.break_pe_field_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'break_pe_field_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Break 2nd Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.break_2nd_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'break_2nd_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Break 3rd Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.break_3rd_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'break_3rd_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Lunch Canteen */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.lunch_canteen_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'lunch_canteen_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Lunch PE Field */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.lunch_pe_field_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'lunch_pe_field_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Lunch 2nd Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.lunch_2nd_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'lunch_2nd_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Lunch 3rd Floor */}
                      <td className="py-1 px-1.5">
                        <select
                          value={row.lunch_3rd_floor_user_id || ''}
                          onChange={e => handleCellChange(row.id, 'lunch_3rd_floor_user_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full min-w-[170px] text-xs py-1 px-2 rounded font-medium border cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">— Select User / Staff —</option>
                          {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>

                      {/* Action Delete */}
                      <td className="py-1 px-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 text-xs rounded transition-colors cursor-pointer"
                          style={{ color: theme.redText }}
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="rounded-lg max-w-md w-full p-6 border shadow-sm space-y-4 text-xs" style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }}>
            <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Add New Duty Date</h3>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: theme.textSecondary }}>Select Date</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-md font-mono"
                style={inputStyle}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: theme.border }}>
              <button
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
                style={btnSecondaryStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSingleDate}
                className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
                style={btnPrimaryStyle}
              >
                Add Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Generate Date Range */}
      {genModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="rounded-lg max-w-md w-full p-6 border shadow-sm space-y-4 text-xs" style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" style={{ color: theme.textSecondary }} />
              <h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                Auto-Generate Dates
              </h3>
            </div>
            <p className="text-xs" style={{ color: theme.textSecondary }}>
              Automatically generate new date rows for a specified date range within the selected Academic Year.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: theme.textSecondary }}>Start Date</label>
                <input
                  type="date"
                  value={genStartDate}
                  onChange={e => setGenStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-md font-mono"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: theme.textSecondary }}>End Date</label>
                <input
                  type="date"
                  value={genEndDate}
                  onChange={e => setGenEndDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-md font-mono"
                  style={inputStyle}
                />
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer pt-1" style={{ color: theme.textPrimary }}>
                <input
                  type="checkbox"
                  checked={genExcludeWeekends}
                  onChange={e => setGenExcludeWeekends(e.target.checked)}
                  className="rounded"
                />
                <span>Exclude Weekends (Saturday & Sunday)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: theme.border }}>
              <button
                onClick={() => setGenModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
                style={btnSecondaryStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDateRange}
                disabled={genLoading}
                className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                style={btnPrimaryStyle}
              >
                <FontAwesomeIcon icon={genLoading ? faRotate : faWandMagicSparkles} spin={genLoading} />
                <span>{genLoading ? 'Processing...' : 'Generate Dates'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Duty Time & Reminder Settings */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="rounded-lg max-w-lg w-full p-6 border shadow-sm space-y-4 text-xs" style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                <FontAwesomeIcon icon={faGear} className="text-xs" style={{ color: theme.textSecondary }} />
                <span>Duty Time & Google Chat Settings</span>
              </h3>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="text-xs font-semibold cursor-pointer"
                style={{ color: theme.textSecondary }}
              >
                ✕
              </button>
            </div>

            <p className="text-xs" style={{ color: theme.textSecondary }}>
              Configure operational hours and Google Chat reminder timing for each duty assignment slot per Unit.
            </p>

            {/* Target Unit Selector */}
            <div className="p-3 rounded-md border flex items-center justify-between gap-3" style={{ background: theme.subtleBg, borderColor: theme.border }}>
              <label className="text-xs font-medium whitespace-nowrap" style={{ color: theme.textPrimary }}>
                Target Unit Settings:
              </label>
              <select
                value={settingsUnit}
                onChange={e => {
                  const uVal = e.target.value
                  setSettingsUnit(uVal)
                  populateSettingsForUnit(uVal)
                }}
                className="text-xs px-3 py-1.5 rounded-md font-medium border cursor-pointer flex-1 max-w-[240px]"
                style={selectStyle}
              >
                <option value="global">Global Default (All Units)</option>
                {schoolUnits.map(u => (
                  <option key={u.unit_id} value={String(u.unit_id)}>Unit {u.unit_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {[
                { key: 'devotion', title: 'Morning Devotion Leader' },
                { key: 'greeter',  title: 'Morning Door Greeter' },
                { key: 'break',    title: 'Break Duty' },
                { key: 'lunch',    title: 'Lunch Duty' },
              ].map(slot => (
                <div key={slot.key} className="p-3 rounded-md border space-y-2.5" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                  <div className="text-xs font-medium" style={{ color: theme.textPrimary }}>
                    {slot.title}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-medium block mb-1" style={{ color: theme.textSecondary }}>Start Time</label>
                      <input
                        type="time"
                        value={dutySettings[slot.key]?.startTime || '07:30'}
                        onChange={e => setDutySettings(st => ({ ...st, [slot.key]: { ...st[slot.key], startTime: e.target.value } }))}
                        className="w-full text-xs px-2 py-1.5 rounded border font-mono"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium block mb-1" style={{ color: theme.textSecondary }}>End Time</label>
                      <input
                        type="time"
                        value={dutySettings[slot.key]?.endTime || '08:00'}
                        onChange={e => setDutySettings(st => ({ ...st, [slot.key]: { ...st[slot.key], endTime: e.target.value } }))}
                        className="w-full text-xs px-2 py-1.5 rounded border font-mono"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium block mb-1" style={{ color: theme.textSecondary }}>Chat Reminder</label>
                      <select
                        value={dutySettings[slot.key]?.reminderMins ?? 60}
                        onChange={e => setDutySettings(st => ({ ...st, [slot.key]: { ...st[slot.key], reminderMins: parseInt(e.target.value, 10) } }))}
                        className="w-full text-xs px-2 py-1.5 rounded border"
                        style={selectStyle}
                      >
                        <option value={15}>15 mins before</option>
                        <option value={30}>30 mins before</option>
                        <option value={60}>1 hour before</option>
                        <option value={120}>2 hours before</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer"
                style={btnSecondaryStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDutySettings}
                disabled={savingSettings}
                className="px-4 py-2 text-xs font-medium rounded-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                style={btnPrimaryStyle}
              >
                <FontAwesomeIcon icon={savingSettings ? faRotate : faSave} spin={savingSettings} />
                <span>{savingSettings ? 'Saving...' : 'Save Duty Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
