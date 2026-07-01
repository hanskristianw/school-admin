'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import ExcelJS from 'exceljs'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMins(mins) {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}j ${m}m`
  return `${m} mnt`
}

function getMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function getToday() {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

const STATUS_META = {
  ok:          { label: '✓',             bg: '#dcfce7', color: '#166534' },
  late:        { label: 'Telat',         bg: '#fef3c7', color: '#92400e' },
  leave_early: { label: 'PA',            bg: '#fee2e2', color: '#991b1b' },
  absent:      { label: 'Absen',         bg: '#f3e8ff', color: '#6b21a8' },
  no_checkout: { label: 'No CO',         bg: '#ffedd5', color: '#9a3412' },
  multiple:    { label: '⚠',             bg: '#fef9c3', color: '#854d0e' },
  no_checkin:  { label: 'No CI',         bg: '#fce7f3', color: '#9d174d' },
  holiday:     { label: 'Libur',         bg: '#f0f9ff', color: '#0369a1' },
  off:         { label: '—',             bg: 'transparent', color: '#d1d5db' },
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AttendanceReportPage() {
  const { theme } = useTheme()

  // Filters
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [graceMin,  setGraceMin]  = useState(0)
  const [units,     setUnits]     = useState([])
  const [roles,     setRoles]     = useState([])
  const [activeTab, setActiveTab] = useState('all') // unit_id | 'all'

  // Derived date range from selectedMonth
  const dateStart = `${selectedMonth}-01`
  const dateEnd   = (() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    return `${selectedMonth}-${String(lastDay).padStart(2, '0')}`
  })()

  // Month label — computed at component scope so all export functions can use it
  const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const [mYear, mMonth] = selectedMonth.split('-').map(Number)
  const monthLabel = `${MONTHS_ID[mMonth - 1]} ${mYear}`

  // Data
  const [report,   setReport]   = useState(null)  // { data, dates, range }
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // UI
  const [expandedUser, setExpandedUser] = useState(null) // user_id

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMeta()
  }, [])

  const fetchMeta = async () => {
    const [{ data: uData }, { data: rData }, { data: sData }] = await Promise.all([
      supabase.from('unit').select('unit_id, unit_name').order('unit_name'),
      supabase.from('role').select('role_id, role_name').order('role_name'),
      supabase.from('settings').select('key, value').eq('key', 'attendance_notif_grace_minutes')
    ])
    setUnits(uData || [])
    setRoles(rData || [])
    if (sData?.[0]) setGraceMin(parseInt(sData[0].value || '0', 10))
  }

  // ── Fetch Report ───────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError('')
    setExpandedUser(null)
    try {
      const params = new URLSearchParams({
        start: dateStart,
        end:   dateEnd,
        grace: String(graceMin)
      })
      const res = await fetch(`/api/attendance/report?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setReport(json)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [dateStart, dateEnd, graceMin])

  // ── Derived Data ───────────────────────────────────────────────────────────
  const allRows = report?.data || []

  // Build tab list: All + each unit that has at least 1 user
  const unitTabs = [
    { id: 'all', name: `Semua (${allRows.length})` },
    ...units.filter(u => allRows.some(r => r.unit_id === u.unit_id)).map(u => ({
      id: u.unit_id,
      name: `${u.unit_name} (${allRows.filter(r => r.unit_id === u.unit_id).length})`
    }))
  ]

  const filteredRows = activeTab === 'all'
    ? allRows
    : allRows.filter(r => r.unit_id === activeTab)

  // ── Export Excel ───────────────────────────────────────────────────────────
  const exportExcel = async () => {
    if (!report?.data?.length) return

    // ── Style definitions ──────────────────────────────────────────────────
    const COL_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    const ALT_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FB' } }
    const WHITE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    const LATE_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
    const LE_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
    const ABS_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }
    const HOL_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC0C0' } }  // merah muda — Hari Libur
    const OFF_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }  // abu — Day Off
    const APPR_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
    const PEND_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }
    const REJ_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
    const HOL_FONT   = { size: 10, color: { argb: 'FF991B1B' }, bold: true }  // teks merah untuk libur
    const OFF_FONT   = { size: 10, color: { argb: 'FF9CA3AF' }, italic: true } // abu untuk day off

    const cellBorder = {
      top:    { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left:   { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right:  { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }

    // ── Helper functions ───────────────────────────────────────────────────
    const HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

    const minsToHMS = (mins) => {
      if (!mins || mins <= 0) return '00:00:00'
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`
    }

    const timeDiff = (from, to) => {
      if (!from || !to) return ''
      try {
        const parse = s => { const [h,m,sec] = s.split(':').map(Number); return h*3600 + m*60 + (sec||0) }
        const diff  = Math.max(0, parse(to) - parse(from))
        return `${String(Math.floor(diff/3600)).padStart(2,'0')}:${String(Math.floor((diff%3600)/60)).padStart(2,'0')}:${String(diff%60).padStart(2,'0')}`
      } catch { return '' }
    }

    const getKeterangan = (d) => {
      // Holiday / Day Off — langsung return nama liburnya
      if (d.status === 'holiday') return d.holiday_name || 'Hari Libur'
      if (d.status === 'dayoff' || d.status === 'off') {
        // Cek apakah ini Sabtu/Minggu
        const dow = new Date(d.date + 'T00:00:00').getDay()
        if (dow === 0) return 'Day Off (Minggu)'
        if (dow === 6) return 'Day Off (Sabtu)'
        return 'Day Off'
      }
      if (d.excuse || d.excused || d.excuse_pending) {
        const cat = d.excuse?.category_label || d.excuse?.category || ''
        const catStr = cat ? ` — ${cat}` : ''
        if (d.excuse?.status === 'approved' || d.excused) return `Disetujui${catStr}`
        if (d.excuse_pending)                             return `Permohonan Diproses${catStr}`
        if (d.excuse?.status === 'rejected')              return `Ditolak${catStr}`
      }
      if (d.issues?.length > 0) {
        const map = { absent:'Tidak Masuk', late:'Terlambat', leave_early:'Pulang Awal', no_checkin:'Tidak Check-In', no_checkout:'Tidak Check-Out' }
        const labels = d.issues.map(i => map[i] || i).filter(Boolean)
        return `${labels.join(', ')} — Belum Mengisi Form Permohonan`
      }
      return ''
    }


    const COLS = [
      { key:'nama',       width:28 },
      { key:'hari',       width:10 },
      { key:'tanggal',    width:13 },
      { key:'jamMasuk',   width:12 },
      { key:'jamKeluar',  width:12 },
      { key:'scanMasuk',  width:13 },
      { key:'scanPulang', width:13 },
      { key:'terlambat',  width:18 },
      { key:'pulangCepat',width:14 },
      { key:'jamKerja',   width:14 },
      { key:'lembur',     width: 9 },
      { key:'keterangan', width:40 },
      { key:'kehadiran',  width:14 },
    ]
    const HDRS = [
      'Nama Karyawan','Hari','Tanggal','Jam Masuk','Jam Keluar',
      'Scan Masuk','Scan Pulang','Terlambat','Pulang Cepat',
      'Jml Jam Kerja','Lembur','Keterangan','Jml Kehadiran',
    ]

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Chung Chung Christian School'
    wb.created = new Date()

    // unit sheets first, All last — exclude vendor employees
    const nonVendorRows = allRows.filter(r => !r.is_vendor)
    const unitList = units.filter(u => nonVendorRows.some(r => r.unit_id === u.unit_id))
    const sheetDefs = [
      ...unitList.map(u => ({ uid: u.unit_id, name: u.unit_name })),
      { uid: 'all', name: 'All' },
    ]

    for (const { uid, name } of sheetDefs) {
      const rows = uid === 'all' ? nonVendorRows : nonVendorRows.filter(r => r.unit_id === uid)
      if (!rows.length) continue

      const ws = wb.addWorksheet(name.slice(0, 31))
      ws.columns = COLS

      // Row 1 blank
      ws.addRow([])
      // Row 2 school name
      ws.addRow(['Chung Chung Christian School'])
      ws.mergeCells('A2:M2')
      const titleCell      = ws.getCell('A2')
      titleCell.value      = 'Chung Chung Christian School'
      titleCell.font       = { bold: true, size: 16, color: { argb: 'FF1E3A5F' } }
      titleCell.alignment  = { horizontal: 'center', vertical: 'middle' }
      ws.getRow(2).height  = 28

      // Row 3 Presensi Month Year
      ws.addRow([`Presensi ${monthLabel}`])
      ws.mergeCells('A3:M3')
      const subCell        = ws.getCell('A3')
      subCell.value        = `Presensi ${monthLabel}`
      subCell.font         = { bold: true, size: 13, color: { argb: 'FF374151' } }
      subCell.alignment    = { horizontal: 'center', vertical: 'middle' }
      ws.getRow(3).height  = 22

      // Row 4 blank
      ws.addRow([])

      // Row 5 column headers
      const hdrRow = ws.addRow(HDRS)
      hdrRow.height = 30
      hdrRow.eachCell({ includeEmpty: true }, cell => {
        cell.fill      = COL_FILL
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.border    = cellBorder
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      })
      ws.views = [{ state: 'frozen', ySplit: 5 }]

      // Data rows
      let ri = 0
      for (const r of rows) {
        const expIn  = r.expected_check_in  ? r.expected_check_in.slice(0,5)  : '07:30'
        const expOut = r.expected_check_out ? r.expected_check_out.slice(0,5) : '16:30'
        const stdMins = 9 * 60  // 09:00

        for (const d of (r.daily || [])) {
          const dateObj = new Date(d.date + 'T00:00:00')
          const hariStr = HARI_ID[dateObj.getDay()]
          const scanIn  = d.checkin_time  ? d.checkin_time.slice(0,8)  : ''
          const scanOut = d.checkout_time ? d.checkout_time.slice(0,8) : ''
          const lateMins = d.late_minutes || 0
          const leMins   = d.leave_early_minutes || 0
          const lateTxt  = lateMins > 0 ? minsToHMS(lateMins) : 'tidak terlambat'
          const leTxt    = minsToHMS(leMins)
          const jamKerjaTxt   = minsToHMS(Math.max(0, stdMins - lateMins))
          const kehadiranTxt  = timeDiff(scanIn, scanOut)
          const keterangan    = getKeterangan(d)

          const dr = ws.addRow([
            r.name, hariStr, d.date,
            expIn + ':00', expOut + ':00',
            scanIn, scanOut,
            lateTxt, leTxt, jamKerjaTxt,
            '-', keterangan, kehadiranTxt,
          ])
          dr.height = 18

          const baseFill = ri % 2 === 0 ? WHITE_FILL : ALT_FILL
          dr.eachCell({ includeEmpty: true }, cell => {
            cell.border    = cellBorder
            cell.alignment = { vertical: 'middle' }
            cell.fill      = baseFill
            cell.font      = { size: 10 }
          })

          // Row highlight by status — applied BEFORE keterangan override
          const isHolidayRow = d.status === 'holiday'
          const isDayOffRow  = d.status === 'dayoff' || d.status === 'off'
          let rowFill = null
          let rowFont = null
          const ket = keterangan
          if (isHolidayRow)                                          { rowFill = HOL_FILL; rowFont = HOL_FONT }
          else if (isDayOffRow)                                       { rowFill = OFF_FILL; rowFont = OFF_FONT }
          else if (d.issues?.includes('absent'))                      rowFill = ABS_FILL
          else if (d.issues?.includes('late'))                        rowFill = LATE_FILL
          else if (d.issues?.includes('leave_early'))                 rowFill = LE_FILL
          if (rowFill) dr.eachCell({ includeEmpty: true }, cell => { cell.fill = rowFill; if (rowFont) cell.font = rowFont })

          // Keterangan cell special colour by excuse status (only for work days)
          if (!isHolidayRow && !isDayOffRow) {
            const ketCell = dr.getCell('keterangan')
            if      (d.excuse?.status === 'approved' || d.excused) { ketCell.fill = APPR_FILL; ketCell.font = { size:10, color:{ argb:'FF065F46' } } }
            else if (d.excuse_pending)                              { ketCell.fill = PEND_FILL; ketCell.font = { size:10, color:{ argb:'FF854D0E' } } }
            else if (d.excuse?.status === 'rejected')               { ketCell.fill = REJ_FILL;  ketCell.font = { size:10, color:{ argb:'FF991B1B' } } }
          }

          // Bold terlambat when actually late
          if (lateMins > 0) dr.getCell('terlambat').font = { bold:true, size:10, color:{ argb:'FF92400E' } }

          // Center time columns
          ;['hari','tanggal','jamMasuk','jamKeluar','scanMasuk','scanPulang','terlambat','pulangCepat','jamKerja','lembur','kehadiran']
            .forEach(k => { dr.getCell(k).alignment = { horizontal:'center', vertical:'middle' } })

        ri++
        }
      }
    }

    // ── Rekap Absensi Summary Sheet (always last) ─────────────────────────────
    {
      const REKAP_HDR_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
      const REKAP_SUB_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }
      const REKAP_ALT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F7' } }
      const REKAP_WHT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      const REKAP_BORDER   = {
        top: { style:'thin', color:{argb:'FFB8CCE4'} },
        left: { style:'thin', color:{argb:'FFB8CCE4'} },
        bottom: { style:'thin', color:{argb:'FFB8CCE4'} },
        right: { style:'thin', color:{argb:'FFB8CCE4'} },
      }

      const sheetTitle = `Rekap Absensi ${monthLabel}`
      const wsRekap = wb.addWorksheet(sheetTitle.slice(0, 31))

      // Total days in the period
      const periodeStart = new Date(report.range.start + 'T00:00:00')
      const periodeEnd   = new Date(report.range.end   + 'T00:00:00')
      const daysInPeriod = Math.round((periodeEnd - periodeStart) / 86400000) + 1

      // Column widths
      wsRekap.columns = [
        { key:'no',           width: 5  },
        { key:'nama',         width: 30 },
        { key:'posisi',       width: 28 },
        { key:'workingDay',   width: 13 },
        { key:'dayOff',       width: 10 },
        { key:'daysInMonth',  width: 16 },
        { key:'late',         width: 16 },
        { key:'absent',       width: 14 },
        { key:'leaveEarly',   width: 13 },
        { key:'annualLeave',  width: 14 },
        { key:'remarks',      width: 16 },
      ]

      // ── Title rows ──────────────────────────────────────────────────────────
      wsRekap.addRow([])
      wsRekap.addRow(['Chung Chung Christian School'])
      wsRekap.mergeCells('A2:K2')
      const rTitleCell = wsRekap.getCell('A2')
      rTitleCell.value     = 'Chung Chung Christian School'
      rTitleCell.font      = { bold: true, size: 16, color: { argb: 'FF1F4E79' } }
      rTitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      wsRekap.getRow(2).height = 28

      wsRekap.addRow([sheetTitle])
      wsRekap.mergeCells('A3:K3')
      const rSubCell = wsRekap.getCell('A3')
      rSubCell.value     = sheetTitle
      rSubCell.font      = { bold: true, size: 13, color: { argb: 'FF374151' } }
      rSubCell.alignment = { horizontal: 'center', vertical: 'middle' }
      wsRekap.getRow(3).height = 22

      wsRekap.addRow([])

      // ── Merged header row 5 ─────────────────────────────────────────────────
      wsRekap.addRow(['No', "Employee's Name", 'Position', '', '', '', 'Summary', '', '', '', 'Remarks'])
      wsRekap.mergeCells('D5:F5')   // Summary label spans D-F (Working Day, Day Off, Days in Month)
      wsRekap.mergeCells('G5:J5')   // Summary spans Late, Absent, Leave Early, Annual Leave
      const hdr5 = wsRekap.getRow(5)
      hdr5.height = 24
      // merge No, Name, Position across rows 5-6 will be done via mergeCells below

      // ── Sub-header row 6 ───────────────────────────────────────────────────
      wsRekap.addRow(['', '', '', 'Working Day', 'Day Off', 'Days in a Month', 'Late (minutes)', 'Absent (Day)', 'Leave Early', 'Annual Leave', ''])
      const hdr6 = wsRekap.getRow(6)
      hdr6.height = 28

      // Merge row 5-6 for No, Name, Position, Remarks
      wsRekap.mergeCells('A5:A6')
      wsRekap.mergeCells('B5:B6')
      wsRekap.mergeCells('C5:C6')
      wsRekap.mergeCells('K5:K6')

      // Style row 5
      hdr5.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill      = REKAP_HDR_FILL
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.border    = REKAP_BORDER
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      })
      // Style row 6
      hdr6.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill      = REKAP_SUB_FILL
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.border    = REKAP_BORDER
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      })

      wsRekap.views = [{ state: 'frozen', ySplit: 6 }]

      // ── Data rows ──────────────────────────────────────────────────────────
      const sortedRows = [...allRows].sort((a, b) => {
        if (a.unit_name !== b.unit_name) return a.unit_name.localeCompare(b.unit_name)
        return a.name.localeCompare(b.name)
      })

      sortedRows.forEach((r, idx) => {
        const workDays   = r.work_days_in_range || 0
        const dayOff     = daysInPeriod - workDays
        const lateMins   = r.late_minutes_total || 0
        const leMins     = r.leave_early_minutes_total || 0
        const absentDays = r.absent_count || 0

        // Annual leave = days with approved excuse
        const annualLeave = (r.daily || []).filter(d =>
          d.excused === true || d.excuse?.status === 'approved'
        ).length

        const lateTxt = minsToHMS(lateMins)
        const leTxt   = minsToHMS(leMins)

        const dr = wsRekap.addRow([
          idx + 1,
          r.name,
          r.position || '',  // Position — dari user_position_history
          workDays,
          dayOff,
          daysInPeriod,
          lateTxt,
          absentDays,
          leTxt,
          annualLeave,
          '',               // Remarks — selalu kosong
        ])
        dr.height = 18

        const fill = idx % 2 === 0 ? REKAP_WHT_FILL : REKAP_ALT_FILL
        dr.eachCell({ includeEmpty: true }, cell => {
          cell.fill      = fill
          cell.border    = REKAP_BORDER
          cell.alignment = { vertical: 'middle' }
          cell.font      = { size: 10 }
        })

        // Center numeric and time columns
        ;['no','workingDay','dayOff','daysInMonth','late','absent','leaveEarly','annualLeave']
          .forEach(k => { dr.getCell(k).alignment = { horizontal: 'center', vertical: 'middle' } })

        // Highlight late > 0
        if (lateMins > 0) {
          dr.getCell('late').font = { bold: true, size: 10, color: { argb: 'FF92400E' } }
          dr.getCell('late').fill = LATE_FILL
        }
        // Highlight absent > 0
        if (absentDays > 0) {
          dr.getCell('absent').font = { bold: true, size: 10, color: { argb: 'FF6B21A8' } }
          dr.getCell('absent').fill = ABS_FILL
        }
        // Highlight leave early > 0
        if (leMins > 0) {
          dr.getCell('leaveEarly').fill = LE_FILL
        }
        // Annual leave badge
        if (annualLeave > 0) {
          dr.getCell('annualLeave').font = { bold: true, size: 10, color: { argb: 'FF065F46' } }
          dr.getCell('annualLeave').fill = APPR_FILL
        }
      })
    }

    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = `Presensi_${monthLabel.replace(' ', '_')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Export Vendor Excel ────────────────────────────────────────────────────
  const exportVendorExcel = async () => {
    if (!report?.data?.length) return

    // Filter hanya user dengan role is_vendor = true
    const vendorRows = (report.data || []).filter(r => r.is_vendor === true)
    if (!vendorRows.length) {
      alert('Tidak ada karyawan vendor dalam laporan ini. Pastikan sudah set is_vendor di Role Management.')
      return
    }

    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()

    const HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

    const HDR_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD46B00' } }
    const ALT_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } }
    const WHT_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    const cellBorder = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    }

    // Satu sheet "Presensi Vendor" berisi semua vendor karyawan
    const ws = wb.addWorksheet('Presensi Vendor')

    ws.columns = [
      { key: 'nama',      width: 28 },
      { key: 'hari',      width: 12 },
      { key: 'tanggal',   width: 14 },
      { key: 'scanMasuk', width: 14 },
      { key: 'scanPulang',width: 14 },
    ]

    // Title rows
    ws.addRow([])
    ws.addRow(['Chung Chung Christian School'])
    ws.mergeCells('A2:E2')
    const r2 = ws.getCell('A2')
    r2.value = 'Chung Chung Christian School'
    r2.font      = { bold: true, size: 14 }
    r2.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(2).height = 24

    ws.addRow([`Presensi ${monthLabel}`])
    ws.mergeCells('A3:E3')
    const r3 = ws.getCell('A3')
    r3.value = `Presensi ${monthLabel}`
    r3.font      = { bold: true, size: 12 }
    r3.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(3).height = 20

    ws.addRow([])

    // Header row
    const hdrRow = ws.addRow({
      nama: 'Nama', hari: 'Hari', tanggal: 'Tanggal', scanMasuk: 'Scan Masuk', scanPulang: 'Scan Pulang'
    })
    hdrRow.height = 20
    hdrRow.eachCell({ includeEmpty: true }, cell => {
      cell.fill      = HDR_FILL
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border    = cellBorder
    })
    ws.views = [{ state: 'frozen', ySplit: 5 }]

    // Kumpulkan semua baris: flatten lalu sort per tanggal, kemudian per nama
    const allVendorDays = []
    for (const user of vendorRows) {
      for (const d of (user.daily || [])) {
        allVendorDays.push({ user, d })
      }
    }
    allVendorDays.sort((a, b) => {
      if (a.user.name !== b.user.name) return a.user.name.localeCompare(b.user.name)
      return a.d.date.localeCompare(b.d.date)
    })

    allVendorDays.forEach(({ user, d }, idx) => {
      const dow  = new Date(d.date + 'T00:00:00').getDay()
      const hari = HARI_ID[dow]
      const scanMasuk  = d.checkin_time  ? d.checkin_time.slice(0, 8)  : ''
      const scanPulang = d.checkout_time ? d.checkout_time.slice(0, 8) : ''

      const dr = ws.addRow({
        nama: user.name,
        hari,
        tanggal:    d.date,
        scanMasuk,
        scanPulang,
      })
      dr.height = 18

      const fill = idx % 2 === 0 ? WHT_FILL : ALT_FILL
      dr.eachCell({ includeEmpty: true }, cell => {
        cell.fill      = fill
        cell.border    = cellBorder
        cell.font      = { size: 10 }
        cell.alignment = { vertical: 'middle' }
      })
      ;['hari','tanggal','scanMasuk','scanPulang'].forEach(k => {
        dr.getCell(k).alignment = { horizontal: 'center', vertical: 'middle' }
      })

      if (d.status === 'holiday') {
        dr.eachCell({ includeEmpty: true }, cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC0C0' } }
          cell.font = { size: 10, color: { argb: 'FF991B1B' }, bold: true }
        })
      } else if (d.status === 'dayoff' || d.status === 'off') {
        dr.eachCell({ includeEmpty: true }, cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
          cell.font = { size: 10, color: { argb: 'FF9CA3AF' }, italic: true }
        })
      }
    })

    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = `Presensi_Vendor_${monthLabel.replace(' ', '_')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const inputStyle = {
    background: theme.inputBg || theme.subtleBg,
    border: `1px solid ${theme.border}`,
    color: theme.textBody,
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 13,
  }

  const tabStyle = (id) => ({
    padding: '8px 16px',
    borderTop: 'none', borderLeft: 'none', borderRight: 'none',
    borderBottom: activeTab === id ? `2px solid ${theme.blueText || '#2563eb'}` : '2px solid transparent',
    color: activeTab === id ? (theme.blueText || '#2563eb') : theme.textSecondary,
    fontWeight: activeTab === id ? 600 : 400,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    outline: 'none',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  })

  // Summary numbers for the current tab
  const totals = filteredRows.reduce((acc, r) => ({
    late:         acc.late         + r.late_count,
    late_mins:    acc.late_mins    + r.late_minutes_total,
    leave_early:  acc.leave_early  + r.leave_early_count,
    le_mins:      acc.le_mins      + r.leave_early_minutes_total,
    absent:       acc.absent       + r.absent_count,
    no_checkout:  acc.no_checkout  + r.no_checkout_count,
  }), { late: 0, late_mins: 0, leave_early: 0, le_mins: 0, absent: 0, no_checkout: 0 })

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: theme.textBody }}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" style={{ color: theme.textPrimary }}>
            📊 Laporan Rekap Absensi
          </h1>
          <p className="text-sm mt-0.5" style={{ color: theme.textSecondary }}>
            Rekap keterlambatan, pulang awal, dan ketidakhadiran karyawan per periode
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportVendorExcel}
            disabled={!report?.data?.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: report?.data?.length ? '#ea580c' : theme.subtleBg,
              color: report?.data?.length ? '#fff' : theme.textSecondary,
              border: `1px solid ${report?.data?.length ? '#ea580c' : theme.border}`,
            }}
          >
            🏭 Export Vendor
          </button>
          <button
            onClick={exportExcel}
            disabled={!report?.data?.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: report?.data?.length ? '#16a34a' : theme.subtleBg,
              color: report?.data?.length ? '#fff' : theme.textSecondary,
              border: `1px solid ${report?.data?.length ? '#16a34a' : theme.border}`,
            }}
          >
            📥 Export Excel
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-4 rounded-xl flex flex-wrap gap-3 items-end" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>Bulan</label>
          <input
            type="month"
            style={inputStyle}
            value={selectedMonth}
            onChange={e => {
              setSelectedMonth(e.target.value)
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>Toleransi (mnt)</label>
          <input type="number" min="0" max="60" style={{ ...inputStyle, width: 72 }}
            value={graceMin} onChange={e => setGraceMin(parseInt(e.target.value, 10) || 0)} />
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: theme.blueText || '#2563eb', color: '#fff', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '⏳ Memuat...' : '🔍 Tampilkan'}
        </button>
        {report && (
          <span className="text-xs self-center" style={{ color: theme.textSecondary }}>
            {allRows.length} karyawan · {report.dates?.length} hari kerja
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
          ❌ {error}
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && (
        <div className="py-16 text-center" style={{ color: theme.textSecondary }}>
          <div style={{ fontSize: 48 }}>📊</div>
          <p className="text-sm mt-3">Pilih periode dan klik "Tampilkan" untuk melihat laporan</p>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center" style={{ color: theme.textSecondary }}>
          <div className="text-3xl mb-3" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
          <p className="text-sm">Menghitung data absensi...</p>
        </div>
      )}

      {/* Report content */}
      {report && !loading && (
        <div className="space-y-4">


          {/* Unit tabs */}
          <div style={{ borderBottom: `1px solid ${theme.border}`, overflowX: 'auto' }}>
            <div style={{ display: 'flex', minWidth: 'max-content' }}>
              {unitTabs.map(t => (
                <button key={t.id} style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: theme.textSecondary }}>
              Tidak ada data untuk unit ini
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: theme.subtleBg }}>
                      {['Nama', 'Role', 'Unit', 'Hari Kerja', '🕐 Telat (×)', 'Total Mnt', '🚪 Pulang Awal (×)', 'Total Mnt', '❌ Tidak Masuk', '⚠️ No Checkout', ''].map((h, i) => (
                        <th key={i} className="text-left px-3 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: theme.textSecondary }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, ri) => (
                      <Fragment key={row.user_id}>
                        <tr
                          key={row.user_id}
                          onClick={() => setExpandedUser(expandedUser === row.user_id ? null : row.user_id)}
                          className="cursor-pointer transition-colors"
                          style={{
                            borderTop: ri > 0 ? `1px solid ${theme.border}` : 'none',
                            background: expandedUser === row.user_id ? (theme.subtleBg) : theme.cardBg,
                          }}
                        >
                          <td className="px-3 py-3 font-medium" style={{ color: theme.textPrimary, whiteSpace: 'nowrap' }}>
                            <div className="flex items-center gap-2">
                              <span>{row.name}</span>
                              {row.user_pin && (
                                <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                                  style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                                  {row.user_pin}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs" style={{ color: theme.textSecondary }}>{row.role_name}</td>
                          <td className="px-3 py-3 text-xs" style={{ color: theme.textSecondary }}>{row.unit_name}</td>
                          <td className="px-3 py-3 text-center text-xs" style={{ color: theme.textSecondary }}>{row.work_days_in_range}</td>

                          {/* Late */}
                          <td className="px-3 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: row.late_count > 0 ? '#fef3c7' : 'transparent', color: row.late_count > 0 ? '#92400e' : theme.textSecondary }}>
                              {row.late_count > 0 ? row.late_count : '—'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-xs" style={{ color: row.late_minutes_total > 0 ? '#92400e' : theme.textSecondary }}>
                            {row.late_minutes_total > 0 ? fmtMins(row.late_minutes_total) : '—'}
                          </td>

                          {/* Leave early */}
                          <td className="px-3 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: row.leave_early_count > 0 ? '#fee2e2' : 'transparent', color: row.leave_early_count > 0 ? '#991b1b' : theme.textSecondary }}>
                              {row.leave_early_count > 0 ? row.leave_early_count : '—'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-xs" style={{ color: row.leave_early_minutes_total > 0 ? '#991b1b' : theme.textSecondary }}>
                            {row.leave_early_minutes_total > 0 ? fmtMins(row.leave_early_minutes_total) : '—'}
                          </td>

                          {/* Absent */}
                          <td className="px-3 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: row.absent_count > 0 ? '#f3e8ff' : 'transparent', color: row.absent_count > 0 ? '#6b21a8' : theme.textSecondary }}>
                              {row.absent_count > 0 ? row.absent_count : '—'}
                            </span>
                          </td>

                          {/* No checkout */}
                          <td className="px-3 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: row.no_checkout_count > 0 ? '#ffedd5' : 'transparent', color: row.no_checkout_count > 0 ? '#9a3412' : theme.textSecondary }}>
                              {row.no_checkout_count > 0 ? row.no_checkout_count : '—'}
                            </span>
                          </td>

                          {/* Expand toggle */}
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs" style={{ color: theme.textSecondary }}>
                              {expandedUser === row.user_id ? '▲' : '▼'}
                            </span>
                          </td>
                        </tr>

                        {/* ── Expanded daily breakdown ── */}
                        {expandedUser === row.user_id && row.daily?.length > 0 && (
                          <tr key={`${row.user_id}-detail`} style={{ background: theme.subtleBg }}>
                            <td colSpan={11} className="px-4 py-3">
                              <div className="text-xs font-semibold mb-2" style={{ color: theme.textSecondary }}>
                                Detail Harian — {row.name}
                                <span className="ml-2 font-normal">({row.expected_check_in} → {row.expected_check_out})</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr>
                                      {['Tanggal', 'Check-In', 'Terlambat', 'Check-Out', 'Pulang Awal', 'Status'].map(h => (
                                        <th key={h} className="text-left px-3 py-1.5 font-semibold" style={{ color: theme.textSecondary, borderBottom: `1px solid ${theme.border}` }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                     {row.daily.map((d, di) => {
                                      const hasProblem = d.issues.length > 0
                                      const excLabel = !d.excuse && !d.excused && !d.excuse_pending ? null
                                        : d.excuse?.status === 'approved' || d.excused ? { text: '✅ Disetujui', bg: '#d1fae5', color: '#065f46' }
                                        : d.excuse_pending ? { text: '⏳ Menunggu Persetujuan', bg: '#fef9c3', color: '#854d0e' }
                                        : d.excuse?.status === 'rejected' ? { text: `❌ Ditolak${d.excuse.rejected_note ? ' — ' + d.excuse.rejected_note : ''}`, bg: '#fee2e2', color: '#991b1b' }
                                        : null
                                      return (
                                        <tr key={d.date} style={{ borderTop: di > 0 ? `1px solid ${theme.border}` : 'none' }}>
                                          <td className="px-3 py-1.5 font-medium" style={{ color: theme.textPrimary }}>{d.date}</td>
                                          <td className="px-3 py-1.5" style={{ color: d.late_minutes > 0 ? '#92400e' : theme.textBody }}>
                                            {d.checkin_time || <span style={{ color: theme.textSecondary }}>—</span>}
                                          </td>
                                          <td className="px-3 py-1.5">
                                            {d.late_minutes > 0
                                              ? <span className="font-semibold" style={{ color: '#92400e' }}>+{fmtMins(d.late_minutes)}</span>
                                              : <span style={{ color: theme.textSecondary }}>—</span>}
                                          </td>
                                          <td className="px-3 py-1.5" style={{ color: d.leave_early_minutes > 0 ? '#991b1b' : theme.textBody }}>
                                            {d.checkout_time || <span style={{ color: theme.textSecondary }}>—</span>}
                                          </td>
                                          <td className="px-3 py-1.5">
                                            {d.leave_early_minutes > 0
                                              ? <span className="font-semibold" style={{ color: '#991b1b' }}>-{fmtMins(d.leave_early_minutes)}</span>
                                              : <span style={{ color: theme.textSecondary }}>—</span>}
                                          </td>
                                          <td className="px-3 py-1.5">
                                            <div className="flex flex-col gap-1">
                                              {d.issues.length === 0 ? (
                                                <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: '#dcfce7', color: '#166534' }}>✓ OK</span>
                                              ) : d.status === 'absent' ? (
                                                <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: '#f3e8ff', color: '#6b21a8' }}>❌ Tidak Masuk</span>
                                              ) : (
                                                <div className="flex flex-wrap gap-1">
                                                  {d.issues.map(issue => {
                                                    const m = STATUS_META[issue] || STATUS_META.multiple
                                                    return (
                                                      <span key={issue} className="px-1.5 py-0.5 rounded-full font-medium" style={{ background: m.bg, color: m.color }}>
                                                        {m.label}
                                                      </span>
                                                    )
                                                  })}
                                                </div>
                                              )}
                                              {excLabel && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: excLabel.bg, color: excLabel.color }}>
                                                  {excLabel.text}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                  {/* Footer totals */}
                  <tfoot>
                    <tr style={{ background: theme.subtleBg, borderTop: `2px solid ${theme.border}` }}>
                      <td colSpan={4} className="px-3 py-2 text-xs font-semibold" style={{ color: theme.textPrimary }}>
                        TOTAL ({filteredRows.length} karyawan)
                      </td>
                      <td className="px-3 py-2 text-center text-xs font-bold" style={{ color: '#92400e' }}>{totals.late || '—'}</td>
                      <td className="px-3 py-2 text-center text-xs font-bold" style={{ color: '#92400e' }}>{fmtMins(totals.late_mins)}</td>
                      <td className="px-3 py-2 text-center text-xs font-bold" style={{ color: '#991b1b' }}>{totals.leave_early || '—'}</td>
                      <td className="px-3 py-2 text-center text-xs font-bold" style={{ color: '#991b1b' }}>{fmtMins(totals.le_mins)}</td>
                      <td className="px-3 py-2 text-center text-xs font-bold" style={{ color: '#6b21a8' }}>{totals.absent || '—'}</td>
                      <td className="px-3 py-2 text-center text-xs font-bold" style={{ color: '#9a3412' }}>{totals.no_checkout || '—'}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
