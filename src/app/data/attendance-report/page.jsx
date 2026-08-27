'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import ExcelJS from 'exceljs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileExcel,
  faBuilding,
  faDownload,
  faCheck,
  faTimes,
  faClock,
  faCalendarAlt,
  faExclamationTriangle,
  faSpinner,
  faSearch,
  faLayerGroup,
  faChevronDown,
  faChevronUp,
  faUser,
  faChartLine,
  faRotateRight,
  faCalendarCheck,
  faDoorOpen,
  faUserSlash
} from '@fortawesome/free-solid-svg-icons'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMins(mins) {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}j ${m}m`
  return `${m} mnt`
}

const STATUS_META = {
  ok:          { label: 'Tepat Waktu',   bg: '#EDF3EC', darkBg: '#1E2E1E', border: '#D5E6D3', darkBorder: '#2B422B', color: '#346538', darkColor: '#7BAF7B', icon: faCheck },
  late:        { label: 'Terlambat',     bg: '#FBF3DB', darkBg: '#2A2618', border: '#F2E3B6', darkBorder: '#3D361F', color: '#956400', darkColor: '#C4A24A', icon: faClock },
  leave_early: { label: 'Pulang Awal',   bg: '#FFEDD5', darkBg: '#331B16', border: '#FED7AA', darkBorder: '#4A241C', color: '#9A3412', darkColor: '#FB923C', icon: faDoorOpen },
  absent:      { label: 'Tidak Masuk',   bg: '#FDEBEC', darkBg: '#3A1E1E', border: '#F8C9CC', darkBorder: '#542626', color: '#9F2F2D', darkColor: '#DC8585', icon: faTimes },
  no_checkout: { label: 'Tanpa Scan Out',bg: '#FFEDD5', darkBg: '#331B16', border: '#FED7AA', darkBorder: '#4A241C', color: '#9A3412', darkColor: '#FB923C', icon: faClock },
  multiple:    { label: 'Multiple Issue',bg: '#FBF3DB', darkBg: '#2A2618', border: '#F2E3B6', darkBorder: '#3D361F', color: '#956400', darkColor: '#C4A24A', icon: faExclamationTriangle },
  no_checkin:  { label: 'Tanpa Scan In', bg: '#FDEBEC', darkBg: '#3A1E1E', border: '#F8C9CC', darkBorder: '#542626', color: '#9F2F2D', darkColor: '#DC8585', icon: faTimes },
  holiday:     { label: 'Hari Libur',    bg: '#FBF3DB', darkBg: '#2A2618', border: '#F2E3B6', darkBorder: '#3D361F', color: '#956400', darkColor: '#C4A24A', icon: faCalendarAlt },
  dayoff:      { label: 'Day Off',       bg: '#F3F4F6', darkBg: '#232228', border: '#E5E7EB', darkBorder: 'rgba(255,255,255,0.08)', color: '#4B5563', darkColor: '#8C8985', icon: faCalendarAlt },
  off:         { label: 'Day Off',       bg: '#F3F4F6', darkBg: '#232228', border: '#E5E7EB', darkBorder: 'rgba(255,255,255,0.08)', color: '#4B5563', darkColor: '#8C8985', icon: faCalendarAlt },
}

const EXCUSE_CATEGORY_MAP = {
  other: 'Lainnya',
  bereavement_core: 'Bereavement',
  bereavement_sibling: 'Bereavement',
  bereavement: 'Bereavement',
  medical_appointment: 'Janji Temu Dokter',
  school_duty: 'Tugas Sekolah',
  ib_trainer: 'Tugas IB Trainer',
  woke_up_late: 'Bangun Kesiangan',
  traffic_jam: 'Macet',
  sick: 'Sakit',
  sick_with_letter: 'Sakit Surat Dokter',
  sick_with_cert: 'Sakit Surat Dokter',
  sick_no_letter: 'Sakit Tanpa Surat',
  sick_no_cert: 'Sakit Tanpa Surat',
  family_personal: 'Urusan Keluarga',
  personal_family: 'Urusan Keluarga',
  forgot_scan: 'Lupa Absen',
  scanned_not_recorded: 'Scan Tidak Terekam',
  annual_leave: 'Cuti Tahunan',
  unpaid_leave: 'Cuti Tanpa Gaji',
  special_leave: 'Ijin Khusus',
  marriage_employee: 'Cuti Menikah',
  marriage_child: 'Cuti Menikah Anak',
  childbirth: 'Istri Melahirkan/Keguguran',
  circumcision_child: 'Khitanan Anak',
  baptism_child: 'Baptis Anak',
}

function formatExcuseDetail(excuse) {
  if (!excuse) return ''
  const rawCat = (excuse.category || '').toLowerCase()
  const otherReason = (excuse.other_reason || excuse.reason || '').trim()

  let jenis = ''
  if (excuse.excuse_type === 'temporary_exit') {
    const timeRange = (excuse.exit_time || excuse.return_time)
      ? ` (${String(excuse.exit_time || '').slice(0,5)}–${String(excuse.return_time || '').slice(0,5)})`
      : ''
    jenis = `Izin Keluar Jam Kerja${timeRange}`
  } else if (rawCat.includes('bereavement')) {
    jenis = 'Bereavement'
  } else if (rawCat === 'other' || rawCat === 'lainnya') {
    jenis = 'Lainnya'
  } else {
    jenis = EXCUSE_CATEGORY_MAP[rawCat] || excuse.category_label || excuse.category || 'Izin'
  }

  if (jenis && otherReason) {
    return `${jenis} - ${otherReason}`
  }
  return jenis || otherReason || ''
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AttendanceReportPage() {
  const { theme, isDark } = useTheme()

  // UI Theme Tokens matching /data/pyp and theme provider
  const pageBg = theme?.pageBg || (isDark ? '#18171A' : '#F7F6F3')
  const cardBg = theme?.cardBg || (isDark ? '#232228' : '#FFFFFF')
  const borderColor = theme?.border || (isDark ? 'rgba(255,255,255,0.08)' : '#EAEAEA')
  const textPrimary = theme?.textPrimary || (isDark ? '#F0EFE9' : '#111111')
  const textSecondary = theme?.textSecondary || (isDark ? '#8C8985' : '#787774')
  const inputBg = theme?.inputBg || (isDark ? '#232228' : '#FFFFFF')

  // Filters
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [graceMin, setGraceMin] = useState(0)
  const [searchName, setSearchName] = useState('')
  const [units, setUnits] = useState([])
  const [roles, setRoles] = useState([])
  const [activeTab, setActiveTab] = useState('all') // unit_id | 'all' | 'vendor'

  // Derived date range from selectedMonth
  const dateStart = `${selectedMonth}-01`
  const dateEnd = (() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    return `${selectedMonth}-${String(lastDay).padStart(2, '0')}`
  })()

  // Month label
  const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const [mYear, mMonth] = selectedMonth.split('-').map(Number)
  const monthLabel = `${MONTHS_ID[mMonth - 1]} ${mYear}`

  // Data
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // UI
  const [expandedUser, setExpandedUser] = useState(null)

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
    } finally {
      setLoading(false)
    }
  }, [dateStart, dateEnd, graceMin])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // ── Separation: Vendor vs Non-Vendor ───────────────────────────────────────
  const nonVendorRows = (report?.data || []).filter(r => !r.is_vendor)
  const vendorRows    = (report?.data || []).filter(r =>  r.is_vendor)

  // Filter by Unit Tab & Search query
  const filteredRows = useMemo(() => {
    let rows = []
    if (activeTab === 'vendor') {
      rows = vendorRows
    } else if (activeTab === 'all') {
      rows = nonVendorRows
    } else {
      rows = nonVendorRows.filter(r => String(r.unit_id) === String(activeTab))
    }

    if (!searchName.trim()) return rows
    const q = searchName.toLowerCase().trim()
    return rows.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.role_name || '').toLowerCase().includes(q) ||
      (r.unit_name || '').toLowerCase().includes(q) ||
      String(r.user_pin || '').includes(q)
    )
  }, [activeTab, nonVendorRows, vendorRows, searchName])

  // Dynamic Tabs list
  const unitTabs = useMemo(() => {
    const presentUnitIds = new Set(nonVendorRows.map(r => String(r.unit_id)))
    const tabs = [{ id: 'all', name: 'Semua Karyawan', count: nonVendorRows.length }]
    units
      .filter(u => presentUnitIds.has(String(u.unit_id)))
      .forEach(u => {
        const count = nonVendorRows.filter(r => String(r.unit_id) === String(u.unit_id)).length
        tabs.push({ id: String(u.unit_id), name: u.unit_name, count })
      })
    if (vendorRows.length > 0) {
      tabs.push({ id: 'vendor', name: 'Vendor', count: vendorRows.length })
    }
    return tabs
  }, [nonVendorRows, vendorRows, units])

  // Summary Metrics for the current filtered rows
  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => ({
      late:         acc.late         + (r.late_count || 0),
      late_mins:    acc.late_mins    + (r.late_minutes_total || 0),
      leave_early:  acc.leave_early  + (r.leave_early_count || 0),
      le_mins:      acc.le_mins      + (r.leave_early_minutes_total || 0),
      absent:       acc.absent       + (r.absent_count || 0),
      no_checkout:  acc.no_checkout  + (r.no_checkout_count || 0),
    }), { late: 0, late_mins: 0, leave_early: 0, le_mins: 0, absent: 0, no_checkout: 0 })
  }, [filteredRows])

  // ── Export Excel for Non-Vendor (Official Template) ───────────────────────
  const exportExcel = async () => {
    if (!report?.data?.length) return

    const wb = new ExcelJS.Workbook()
    wb.creator = 'School Admin System'
    wb.created = new Date()

    const COLS = [
      { key:'nama',        width:24 },
      { key:'hari',        width:10 },
      { key:'tanggal',     width:13 },
      { key:'jamMasuk',    width:13 },
      { key:'jamKeluar',   width:13 },
      { key:'scanMasuk',   width:13 },
      { key:'scanPulang',  width:13 },
      { key:'terlambat',   width:16 },
      { key:'pulangCepat', width:14 },
      { key:'jamKerja',    width:13 },
      { key:'lembur',      width:10 },
      { key:'keterangan',  width:40 },
      { key:'kehadiran',   width:13 },
    ]

    const HDRS = [
      'Nama','Hari','Tanggal',
      'Jadwal Masuk','Jadwal Pulang',
      'Scan Masuk','Scan Pulang',
      'Terlambat','Pulang Cepat',
      'Jam Kerja','Lembur','Keterangan','Kehadiran'
    ]

    const cellBorder = {
      top:    { style:'thin', color:{ argb:'FFD1D5DB' } },
      bottom: { style:'thin', color:{ argb:'FFD1D5DB' } },
      left:   { style:'thin', color:{ argb:'FFD1D5DB' } },
      right:  { style:'thin', color:{ argb:'FFD1D5DB' } },
    }

    const COL_FILL   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1E3A5F' } }
    const WHITE_FILL = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFFFFF' } }
    const ALT_FILL   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF8FAFC' } }
    const HOL_FILL   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF1F5F9' } }
    const HOL_FONT   = { color:{ argb:'FF94A3B8' }, italic:true, size:10 }
    const OFF_FILL   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF1F5F9' } }
    const OFF_FONT   = { color:{ argb:'FF94A3B8' }, italic:true, size:10 }
    const ABS_FILL   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFDF2F8' } }
    const LATE_FILL  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFFBEB' } }
    const LE_FILL    = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFF1F2' } }
    const APPR_FILL  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFD1FAE5' } }
    const PEND_FILL  = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFEF9C3' } }
    const REJ_FILL   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFEE2E2' } }

    const presentUnitIds = new Set(nonVendorRows.map(r => r.unit_id))
    const sheetDefs = [
      { uid: 'all', name: 'ALL' },
      ...units
        .filter(u => presentUnitIds.has(u.unit_id))
        .map(u => ({ uid: u.unit_id, name: u.unit_name }))
    ]

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
      if (d.status === 'holiday') return d.holiday_name || 'Hari Libur'
      if (d.status === 'dayoff' || d.status === 'off') {
        const dow = new Date(d.date + 'T00:00:00').getDay()
        if (dow === 0) return 'Day Off (Minggu)'
        if (dow === 6) return 'Day Off (Sabtu)'
        return 'Day Off'
      }
      if (d.excuse || d.excused || d.excuse_pending) {
        const detail = formatExcuseDetail(d.excuse)
        if (d.excuse?.status === 'rejected' && d.excuse?.rejected_note) {
          return detail ? `${detail} (Ditolak: ${d.excuse.rejected_note})` : `Ditolak: ${d.excuse.rejected_note}`
        }
        return detail || 'Izin'
      }
      if (d.issues?.length > 0) {
        const map = { absent:'Tidak Masuk', late:'Terlambat', leave_early:'Pulang Awal', no_checkin:'Tidak Check-In', no_checkout:'Tidak Check-Out' }
        const labels = d.issues.map(i => map[i] || i).filter(Boolean)
        return labels.join(', ') || ''
      }
      return ''
    }

    for (const { uid, name } of sheetDefs) {
      const rows = uid === 'all' ? nonVendorRows : nonVendorRows.filter(r => r.unit_id === uid)
      if (!rows.length) continue

      const ws = wb.addWorksheet(name.slice(0, 31))
      ws.columns = COLS
      let maxUnitKetLen = 40

      ws.addRow([])
      ws.addRow(['Chung Chung Christian School'])
      ws.mergeCells('A2:M2')
      const titleCell = ws.getCell('A2')
      titleCell.value = 'Chung Chung Christian School'
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' } }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getRow(2).height = 28

      ws.addRow([`Presensi ${monthLabel}`])
      ws.mergeCells('A3:M3')
      const subCell = ws.getCell('A3')
      subCell.value = `Presensi ${monthLabel}`
      subCell.font = { bold: true, size: 13, color: { argb: 'FF374151' } }
      subCell.alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getRow(3).height = 22

      ws.addRow([])

      const hdrRow = ws.addRow(HDRS)
      hdrRow.height = 30
      hdrRow.eachCell({ includeEmpty: true }, cell => {
        cell.fill = COL_FILL
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.border = cellBorder
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      })
      ws.views = [{ state: 'frozen', ySplit: 5 }]

      let ri = 0
      const userList = rows
      for (let ui = 0; ui < userList.length; ui++) {
        const r = userList[ui]
        const expIn = r.expected_check_in ? r.expected_check_in.slice(0,5) : '07:30'
        const expOut = r.expected_check_out ? r.expected_check_out.slice(0,5) : '16:30'
        const stdMins = 9 * 60

        for (const d of (r.daily || [])) {
          const dateObj = new Date(d.date + 'T00:00:00')
          const hariStr = HARI_ID[dateObj.getDay()]
          const scanIn = d.checkin_time ? d.checkin_time.slice(0,8) : ''
          const scanOut = d.checkout_time ? d.checkout_time.slice(0,8) : ''
          const lateMins = d.late_minutes || 0
          const leMins = d.leave_early_minutes || 0
          const isNonWork = d.status === 'holiday' || d.status === 'dayoff' || d.status === 'off'
          const lateTxt = isNonWork ? '00:00:00' : (lateMins > 0 ? minsToHMS(lateMins) : 'tidak terlambat')
          const leTxt = isNonWork ? '00:00:00' : minsToHMS(leMins)
          const jamKerjaTxt = isNonWork ? '00:00:00' : minsToHMS(Math.max(0, stdMins - lateMins))
          const kehadiranTxt = timeDiff(scanIn, scanOut)
          const keterangan = getKeterangan(d)

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
            cell.border = cellBorder
            cell.alignment = { vertical: 'middle' }
            cell.fill = baseFill
            cell.font = { size: 10 }
          })

          const isHolidayRow = d.status === 'holiday'
          const isDayOffRow = d.status === 'dayoff' || d.status === 'off'
          let rowFill = null
          let rowFont = null
          if (isHolidayRow) { rowFill = HOL_FILL; rowFont = HOL_FONT }
          else if (isDayOffRow) { rowFill = OFF_FILL; rowFont = OFF_FONT }
          else if (d.issues?.includes('absent')) rowFill = ABS_FILL
          else if (d.issues?.includes('late')) rowFill = LATE_FILL
          else if (d.issues?.includes('leave_early')) rowFill = LE_FILL
          if (rowFill) dr.eachCell({ includeEmpty: true }, cell => { cell.fill = rowFill; if (rowFont) cell.font = rowFont })

          if (!isHolidayRow && !isDayOffRow) {
            const ketCell = dr.getCell('keterangan')
            if (d.excuse?.status === 'approved' || d.excused) { ketCell.fill = APPR_FILL; ketCell.font = { size:10, color:{ argb:'FF065F46' } } }
            else if (d.excuse_pending) { ketCell.fill = PEND_FILL; ketCell.font = { size:10, color:{ argb:'FF854D0E' } } }
            else if (d.excuse?.status === 'rejected') { ketCell.fill = REJ_FILL; ketCell.font = { size:10, color:{ argb:'FF991B1B' } } }
          }

          if (lateMins > 0) dr.getCell('terlambat').font = { bold:true, size:10, color:{ argb:'FF92400E' } }

          ;['hari','tanggal','jamMasuk','jamKeluar','scanMasuk','scanPulang','terlambat','pulangCepat','jamKerja','lembur','kehadiran']
            .forEach(k => { dr.getCell(k).alignment = { horizontal:'center', vertical:'middle' } })

          if (keterangan && keterangan.length > maxUnitKetLen) {
            maxUnitKetLen = keterangan.length
          }

          ri++
        }

        if (ui < userList.length - 1) {
          const sep = ws.addRow([])
          sep.height = 8
          for (let col = 1; col <= COLS.length; col++) {
            sep.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9CA3AF' } }
          }
        }
      }

      ws.getColumn('keterangan').width = Math.min(90, Math.max(40, maxUnitKetLen + 4))
    }

    // ── Rekap Absensi Summary Sheet (Always Last) ───────────────────────────
    const wsRekap = wb.addWorksheet('Rekap Absensi')
    wsRekap.columns = [
      { key: 'no',          width: 5  },
      { key: 'nama',        width: 26 },
      { key: 'posisi',      width: 22 },
      { key: 'workingDay',  width: 14 },
      { key: 'dayOff',      width: 10 },
      { key: 'daysInMonth', width: 14 },
      { key: 'terlambat',   width: 13 },
      { key: 'absen',       width: 13 },
      { key: 'pulangCepat', width: 13 },
      { key: 'annualLeave', width: 13 },
      { key: 'remarks',     width: 45 },
    ]

    wsRekap.addRow([])
    wsRekap.addRow(['REKAPITULASI ABSENSI KARYAWAN'])
    wsRekap.mergeCells('A2:K2')
    const rkTitle = wsRekap.getCell('A2')
    rkTitle.value = 'REKAPITULASI ABSENSI KARYAWAN'
    rkTitle.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } }
    rkTitle.alignment = { horizontal: 'center', vertical: 'middle' }
    wsRekap.getRow(2).height = 24

    wsRekap.addRow([`Periode: ${monthLabel}`])
    wsRekap.mergeCells('A3:K3')
    const rkSub = wsRekap.getCell('A3')
    rkSub.value = `Periode: ${monthLabel}`
    rkSub.font = { italic: true, size: 11, color: { argb: 'FF374151' } }
    rkSub.alignment = { horizontal: 'center', vertical: 'middle' }
    wsRekap.getRow(3).height = 18

    wsRekap.addRow([])

    const REKAP_HDRS = [
      'No','Nama Karyawan','Posisi / Unit',
      'Working Day','Day Off','Days in Month',
      'Late (minutes)','Absent (Day)','Leave Early',
      'Annual Leave','Remarks'
    ]
    const rkHdr = wsRekap.addRow(REKAP_HDRS)
    rkHdr.height = 28
    rkHdr.eachCell({ includeEmpty: true }, cell => {
      cell.fill = COL_FILL
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 }
      cell.border = cellBorder
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    })
    wsRekap.views = [{ state: 'frozen', ySplit: 5 }]

    const [curYear, curMonth] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(curYear, curMonth, 0).getDate()

    let rkIdx = 1
    let maxRemarksLen = 40
    for (const u of nonVendorRows) {
      const isPartTime = !!u.is_part_time_staff
      const isFlexible = !!u.is_flexible_hours
      const isOnCall = !!u.is_on_call_staff

      const lateMinsTotal = (isPartTime || isFlexible || isOnCall) ? 0 : (u.late_minutes_total || 0)
      const leMinsTotal = (isPartTime || isFlexible || isOnCall) ? 0 : (u.leave_early_minutes_total || 0)
      const lateHMS = minsToHMS(lateMinsTotal)
      const leHMS = minsToHMS(leMinsTotal)

      let annualLeaveCount = 0
      const categoryMap = {}

      for (const d of (u.daily || [])) {
        const isApproved = d.excuse?.status === 'approved' || d.excused || d.excuse?.status === 'approved_1' || d.excuse_pending
        if (isApproved && d.excuse) {
          const rawCat = (d.excuse.category || '').toLowerCase()
          if (rawCat === 'annual_leave') {
            annualLeaveCount++
          } else {
            const catName = formatExcuseDetail(d.excuse) || EXCUSE_CATEGORY_MAP[rawCat] || 'Izin'
            categoryMap[catName] = (categoryMap[catName] || 0) + 1
          }
        }
      }

      const remarksList = []
      for (const [cat, count] of Object.entries(categoryMap)) {
        remarksList.push(`${cat}: ${count} hari`)
      }

      const totalAbsent = isPartTime || isOnCall ? 0 : (u.absent_count || 0)
      const excusedDays = Object.values(categoryMap).reduce((a, b) => a + b, 0)
      const unexcusedDays = Math.max(0, totalAbsent - excusedDays)
      if (unexcusedDays > 0) {
        remarksList.push(`Tanpa Keterangan: ${unexcusedDays} hari`)
      }

      const remarksText = remarksList.join(', ') || ''
      if (remarksText.length > maxRemarksLen) {
        maxRemarksLen = remarksText.length
      }

      const workingDays = isPartTime ? (u.work_days_in_range || 0) : (u.work_days_in_range || 0)
      const dayOffCount = Math.max(0, daysInMonth - workingDays)

      const rkRow = wsRekap.addRow([
        rkIdx++,
        u.name,
        u.role_name || u.unit_name || '—',
        workingDays,
        dayOffCount,
        daysInMonth,
        lateHMS,
        totalAbsent,
        leHMS,
        annualLeaveCount,
        remarksText
      ])
      rkRow.height = 18

      const baseFill = (rkIdx % 2 === 0) ? WHITE_FILL : ALT_FILL
      rkRow.eachCell({ includeEmpty: true }, cell => {
        cell.border = cellBorder
        cell.alignment = { vertical: 'middle' }
        cell.fill = baseFill
        cell.font = { size: 9.5 }
      })

      ;['no','workingDay','dayOff','daysInMonth','terlambat','absen','pulangCepat','annualLeave']
        .forEach(k => { rkRow.getCell(k).alignment = { horizontal: 'center', vertical: 'middle' } })

      if (lateMinsTotal > 0) {
        rkRow.getCell('terlambat').fill = LATE_FILL
        rkRow.getCell('terlambat').font = { bold: true, size: 9.5, color: { argb: 'FF92400E' } }
      }
      if (totalAbsent > 0) {
        rkRow.getCell('absen').fill = ABS_FILL
        rkRow.getCell('absen').font = { bold: true, size: 9.5, color: { argb: 'FF6B21A8' } }
      }
      if (annualLeaveCount > 0) {
        rkRow.getCell('annualLeave').fill = APPR_FILL
        rkRow.getCell('annualLeave').font = { bold: true, size: 9.5, color: { argb: 'FF065F46' } }
      }
    }

    wsRekap.getColumn('remarks').width = Math.min(100, Math.max(40, maxRemarksLen + 4))

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Presensi_${monthLabel.replace(/\s+/g, '_')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Export Excel for Vendor ───────────────────────────────────────────────
  const exportVendorExcel = async () => {
    if (!vendorRows.length) return

    const wb = new ExcelJS.Workbook()
    wb.creator = 'School Admin System'
    wb.created = new Date()

    const ws = wb.addWorksheet('Presensi Vendor')
    ws.columns = [
      { key: 'no',         width: 6  },
      { key: 'nama',       width: 28 },
      { key: 'hari',       width: 12 },
      { key: 'tanggal',    width: 14 },
      { key: 'scanMasuk',  width: 14 },
      { key: 'scanPulang', width: 14 },
    ]

    const cellBorder = {
      top:    { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left:   { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right:  { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }
    const COL_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } }
    const WHITE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    const ALT_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } }

    ws.addRow([])
    ws.addRow(['Chung Chung Christian School'])
    ws.mergeCells('A2:F2')
    const tCell = ws.getCell('A2')
    tCell.value = 'Chung Chung Christian School'
    tCell.font  = { bold: true, size: 15, color: { argb: 'FF9A3412' } }
    tCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(2).height = 26

    ws.addRow([`Presensi Karyawan Vendor — ${monthLabel}`])
    ws.mergeCells('A3:F3')
    const sCell = ws.getCell('A3')
    sCell.value = `Presensi Karyawan Vendor — ${monthLabel}`
    sCell.font  = { bold: true, size: 12, color: { argb: 'FF374151' } }
    sCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(3).height = 20

    ws.addRow([])

    const HDRS = ['No', 'Nama', 'Hari', 'Tanggal', 'Scan Masuk', 'Scan Pulang']
    const hRow = ws.addRow(HDRS)
    hRow.height = 28
    hRow.eachCell({ includeEmpty: true }, cell => {
      cell.fill = COL_FILL
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.border = cellBorder
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    ws.views = [{ state: 'frozen', ySplit: 5 }]

    const HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
    const allVendorDays = []
    for (const user of vendorRows) {
      const scanByDate = new Map()
      for (const d of (user.daily || [])) {
        scanByDate.set(d.date, {
          scanMasuk:  d.checkin_time  ? d.checkin_time.slice(0, 8)  : '',
          scanPulang: d.checkout_time ? d.checkout_time.slice(0, 8) : '',
        })
      }
      const [sY, sM, sD] = dateStart.split('-').map(Number)
      const [eY, eM, eD] = dateEnd.split('-').map(Number)
      const cur = new Date(sY, sM - 1, sD)
      const end = new Date(eY, eM - 1, eD)

      while (cur <= end) {
        const y = cur.getFullYear()
        const m = String(cur.getMonth() + 1).padStart(2, '0')
        const d = String(cur.getDate()).padStart(2, '0')
        const dateStr = `${y}-${m}-${d}`

        allVendorDays.push({
          user,
          dateStr,
          ...(scanByDate.get(dateStr) || { scanMasuk: '', scanPulang: '' }),
        })
        cur.setDate(cur.getDate() + 1)
      }
    }
    allVendorDays.sort((a, b) => {
      if (a.user.name !== b.user.name) return a.user.name.localeCompare(b.user.name)
      return a.dateStr.localeCompare(b.dateStr)
    })

    allVendorDays.forEach(({ user, dateStr, scanMasuk, scanPulang }, idx) => {
      const [y, m, d] = dateStr.split('-').map(Number)
      const dow  = new Date(y, m - 1, d).getDay()
      const hari = HARI_ID[dow]

      const dr = ws.addRow({
        no: idx + 1,
        nama: user.name,
        hari,
        tanggal: dateStr,
        scanMasuk,
        scanPulang,
      })
      dr.height = 18

      const baseFill = idx % 2 === 0 ? WHITE_FILL : ALT_FILL
      dr.eachCell({ includeEmpty: true }, cell => {
        cell.border    = cellBorder
        cell.alignment = { vertical: 'middle' }
        cell.fill      = baseFill
        cell.font      = { size: 10 }
      })

      ;['no','hari','tanggal','scanMasuk','scanPulang'].forEach(k => {
        dr.getCell(k).alignment = { horizontal: 'center', vertical: 'middle' }
      })
    })

    const buf  = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `Presensi_Vendor_${monthLabel.replace(/\s+/g, '_')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      
      {/* ── HEADER & BREADCRUMBS (MATCHING /data/pyp LAYOUT) ─────────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[ADMINISTRATION]</span>
            <span>/</span>
            <span>[ATTENDANCE MASTER DATA]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[MONTHLY ATTENDANCE REPORT]</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded flex items-center justify-center border"
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                borderColor: isDark ? '#2563EB' : '#BAE6FD',
                color: isDark ? '#60A5FA' : '#0284C7'
              }}
            >
              <FontAwesomeIcon icon={faChartLine} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Monthly Attendance &amp; Recap Report
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Rekapitulasi keterlambatan, kepulangan awal, izin/cuti tahunan, dan presensi fisik staf per periode.
              </p>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {vendorRows.length > 0 && (
            <button
              onClick={exportVendorExcel}
              disabled={!report?.data?.length}
              className="px-3.5 py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer flex items-center gap-2 hover:brightness-110 active:scale-95"
              style={{
                background: isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFF7ED',
                borderColor: isDark ? '#EA580C' : '#FDBA74',
                color: isDark ? '#FB923C' : '#EA580C',
                opacity: report?.data?.length ? 1 : 0.5,
                cursor: report?.data?.length ? 'pointer' : 'not-allowed'
              }}
            >
              <FontAwesomeIcon icon={faBuilding} className="text-xs" />
              <span>Export Vendor</span>
            </button>
          )}

          <button
            onClick={exportExcel}
            disabled={!report?.data?.length}
            className="px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-2 shadow-xs hover:brightness-110 active:scale-95 text-white"
            style={{
              background: '#16A34A',
              border: '1px solid #15803D',
              opacity: report?.data?.length ? 1 : 0.5,
              cursor: report?.data?.length ? 'pointer' : 'not-allowed'
            }}
          >
            <FontAwesomeIcon icon={faFileExcel} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ── FILTER CONTROL BAR (MATCHING /data/pyp) ─────────────────────────── */}
      <div
        className="p-3.5 rounded border mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ background: cardBg, borderColor, borderRadius: '8px' }}
      >
        <div className="flex items-center gap-4 flex-wrap flex-1">
          {/* Month Selector */}
          <div style={{ minWidth: '180px' }}>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              1. Periode Bulan *
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
              style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
            />
          </div>

          {/* Grace Minutes */}
          <div style={{ width: '130px' }}>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
              2. Toleransi (Mnt)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={graceMin}
              onChange={e => setGraceMin(parseInt(e.target.value, 10) || 0)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none"
              style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
            />
          </div>

          {/* Search Query */}
          <div style={{ minWidth: '220px', flex: 1 }}>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
              3. Cari Karyawan / PIN
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder="Cari nama, role, atau PIN..."
                className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: textSecondary }} />
            </div>
          </div>
        </div>

        {/* Refresh / Fetch Button */}
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchReport}
            disabled={loading}
            style={{
              background: textPrimary,
              color: isDark ? '#09090B' : '#FFFFFF',
              fontSize: '12px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={loading ? faSpinner : faRotateRight} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Memuat...' : 'Tampilkan'}</span>
          </Button>
        </div>
      </div>

      {/* ── METADATA SUMMARY BENTO CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Total Karyawan</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono" style={{ color: textPrimary }}>{nonVendorRows.length}</span>
            <span className="text-xs font-medium" style={{ color: textSecondary }}>staf internal</span>
          </div>
        </div>

        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Terlambat</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono" style={{ color: isDark ? '#FBBF24' : '#B45309' }}>{totals.late}×</span>
            <span className="text-xs font-medium" style={{ color: isDark ? '#FCD34D' : '#92400E' }}>({fmtMins(totals.late_mins)})</span>
          </div>
        </div>

        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Pulang Awal</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono" style={{ color: isDark ? '#FB923C' : '#C2410C' }}>{totals.leave_early}×</span>
            <span className="text-xs font-medium" style={{ color: isDark ? '#FDBA74' : '#9A3412' }}>({fmtMins(totals.le_mins)})</span>
          </div>
        </div>

        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Tidak Masuk (Alpa)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono" style={{ color: isDark ? '#C084FC' : '#7E22CE' }}>{totals.absent}</span>
            <span className="text-xs font-medium" style={{ color: isDark ? '#D8B4FE' : '#6B21A8' }}>hari alpa</span>
          </div>
        </div>
      </div>

      {/* ── ERROR NOTIFICATION ── */}
      {error && (
        <div
          className="p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 mb-6"
          style={{ background: '#FDEBEC', borderColor: '#F8C9CC', color: '#9F2F2D' }}
        >
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-sm" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchReport}
            className="px-2.5 py-1 rounded text-xs font-bold bg-red-700 text-white cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* ── TABS NAVIGATION (MATCHING /data/pyp HORIZONTAL TABS) ───────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '20px', gap: '24px', flexWrap: 'wrap' }}>
        {unitTabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 0',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: isActive ? textPrimary : textSecondary,
                borderBottom: isActive ? `2px solid ${textPrimary}` : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <FontAwesomeIcon icon={tab.id === 'vendor' ? faBuilding : faLayerGroup} style={{ fontSize: '13px' }} />
              <span>{tab.name}</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: isActive ? (isDark ? '#27272A' : '#EAEAEA') : (isDark ? '#1F2937' : '#F4F4F5'),
                  color: textSecondary,
                  fontWeight: 700
                }}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── MAIN TABLE VIEW ────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '64px 0', textAlign: 'center', color: textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
          <span style={{ fontSize: '13px' }}>Menghitung dan memuat data presensi bulanan...</span>
        </div>
      ) : filteredRows.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 20px',
            borderRadius: '8px',
            border: `1px dashed ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <FontAwesomeIcon icon={faUserSlash} style={{ fontSize: '28px', color: textSecondary }} />
          <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
            Tidak ada data karyawan yang ditemukan untuk tab atau filter ini.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr
                  style={{
                    background: isDark ? '#27272A' : '#FBFBFA',
                    borderBottom: `1px solid ${borderColor}`,
                    color: textSecondary
                  }}
                >
                  <th className="text-left px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Nama Karyawan</th>
                  <th className="text-left px-3 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Role</th>
                  <th className="text-left px-3 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Unit</th>
                  <th className="text-center px-3 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Hari Kerja</th>
                  <th className="text-center px-3 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Telat (×)</th>
                  <th className="text-center px-3 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Mnt Telat</th>
                  <th className="text-center px-3 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Pulang Awal (×)</th>
                  <th className="text-center px-3 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Mnt PA</th>
                  <th className="text-center px-3 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Alpa</th>
                  <th className="text-center px-3 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Tanpa Scan Out</th>
                  <th className="text-right px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: borderColor }}>
                {filteredRows.map((row, ri) => (
                  <Fragment key={row.user_id}>
                    <tr
                      onClick={() => setExpandedUser(expandedUser === row.user_id ? null : row.user_id)}
                      className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                      style={{
                        background: expandedUser === row.user_id ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent'
                      }}
                    >
                      <td className="px-3.5 py-3 font-semibold" style={{ color: textPrimary }}>
                        <div className="flex items-center gap-2">
                          <span>{row.name}</span>
                          {row.user_pin && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                              style={{
                                background: isDark ? '#1F2937' : '#F3F4F6',
                                color: textSecondary,
                                border: `1px solid ${borderColor}`
                              }}
                            >
                              PIN {row.user_pin}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-neutral-500 dark:text-neutral-400">{row.role_name}</td>
                      <td className="px-3 py-3 text-neutral-500 dark:text-neutral-400">{row.unit_name}</td>
                      <td className="px-3 py-3 text-center font-mono font-medium">{row.work_days_in_range}</td>

                      {/* Late Count */}
                      <td className="px-3 py-3 text-center">
                        {row.late_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[11px]" style={{ background: isDark ? '#2A2618' : '#FBF3DB', color: isDark ? '#C4A24A' : '#956400', border: `1px solid ${isDark ? '#3D361F' : '#F2E3B6'}` }}>
                            {row.late_count}
                          </span>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Late Minutes */}
                      <td className="px-3 py-3 text-center font-mono" style={{ color: row.late_minutes_total > 0 ? (isDark ? '#C4A24A' : '#956400') : textSecondary }}>
                        {row.late_minutes_total > 0 ? fmtMins(row.late_minutes_total) : '—'}
                      </td>

                      {/* Leave Early Count */}
                      <td className="px-3 py-3 text-center">
                        {row.leave_early_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[11px]" style={{ background: isDark ? '#331B16' : '#FFEDD5', color: isDark ? '#FB923C' : '#9A3412', border: `1px solid ${isDark ? '#4A241C' : '#FED7AA'}` }}>
                            {row.leave_early_count}
                          </span>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Leave Early Minutes */}
                      <td className="px-3 py-3 text-center font-mono" style={{ color: row.leave_early_minutes_total > 0 ? (isDark ? '#FB923C' : '#9A3412') : textSecondary }}>
                        {row.leave_early_minutes_total > 0 ? fmtMins(row.leave_early_minutes_total) : '—'}
                      </td>

                      {/* Absent */}
                      <td className="px-3 py-3 text-center">
                        {row.absent_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[11px]" style={{ background: isDark ? '#3A1E1E' : '#FDEBEC', color: isDark ? '#DC8585' : '#9F2F2D', border: `1px solid ${isDark ? '#542626' : '#F8C9CC'}` }}>
                            {row.absent_count}
                          </span>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600">—</span>
                        )}
                      </td>

                      {/* No Checkout */}
                      <td className="px-3 py-3 text-center">
                        {row.no_checkout_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[11px]" style={{ background: isDark ? '#331B16' : '#FFEDD5', color: isDark ? '#FB923C' : '#9A3412', border: `1px solid ${isDark ? '#4A241C' : '#FED7AA'}` }}>
                            {row.no_checkout_count}
                          </span>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Expand Toggle */}
                      <td className="px-3.5 py-3 text-right">
                        <FontAwesomeIcon
                          icon={expandedUser === row.user_id ? faChevronUp : faChevronDown}
                          className="text-[11px] text-neutral-400"
                        />
                      </td>
                    </tr>

                    {/* ── EXPANDED USER DAILY BREAKDOWN ── */}
                    {expandedUser === row.user_id && row.daily?.length > 0 && (
                      <tr key={`${row.user_id}-detail`}>
                        <td colSpan={11} className="p-0">
                          <div
                            className="p-4 border-t border-b"
                            style={{
                              background: isDark ? '#0B0F17' : '#FBFBFA',
                              borderColor
                            }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 text-xs font-bold" style={{ color: textPrimary }}>
                                <FontAwesomeIcon icon={faCalendarCheck} style={{ color: isDark ? '#60A5FA' : '#0284C7' }} />
                                <span>Rincian Presensi Harian — {row.name}</span>
                                <span className="font-normal font-mono text-[11px] text-neutral-400 ml-1">
                                  (Jadwal Kerja: {row.expected_check_in || '07:30'} s/d {row.expected_check_out || '16:30'})
                                </span>
                              </div>
                            </div>

                            <div className="border rounded overflow-hidden" style={{ borderColor }}>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr style={{ background: isDark ? '#1F2937' : '#F1F5F9', borderBottom: `1px solid ${borderColor}`, color: textSecondary }}>
                                    <th className="text-left px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Tanggal</th>
                                    <th className="text-center px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Scan Masuk</th>
                                    <th className="text-center px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Terlambat</th>
                                    <th className="text-center px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Scan Pulang</th>
                                    <th className="text-center px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Pulang Awal</th>
                                    <th className="text-left px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Status / Keterangan</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y" style={{ divideColor: borderColor, background: cardBg }}>
                                  {row.daily.map((d) => {
                                    const excDetail = formatExcuseDetail(d.excuse)
                                    const excLabel = !d.excuse && !d.excused && !d.excuse_pending ? null
                                      : d.excuse?.status === 'approved' || d.excused ? { text: excDetail || 'Disetujui', bg: isDark ? '#1E2E1E' : '#EDF3EC', border: isDark ? '#2B422B' : '#D5E6D3', color: isDark ? '#7BAF7B' : '#346538' }
                                      : d.excuse_pending ? { text: excDetail || 'Diproses', bg: isDark ? '#2A2618' : '#FBF3DB', border: isDark ? '#3D361F' : '#F2E3B6', color: isDark ? '#C4A24A' : '#956400' }
                                      : d.excuse?.status === 'rejected' ? { text: d.excuse.rejected_note ? `${excDetail || 'Izin'} (Ditolak: ${d.excuse.rejected_note})` : (excDetail || 'Ditolak'), bg: isDark ? '#3A1E1E' : '#FDEBEC', border: isDark ? '#542626' : '#F8C9CC', color: isDark ? '#DC8585' : '#9F2F2D' }
                                      : null

                                    return (
                                      <tr key={d.date} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                        <td className="px-3 py-2 font-medium font-mono text-[11px]" style={{ color: textPrimary }}>{d.date}</td>
                                        
                                        <td className="px-3 py-2 text-center font-mono" style={{ color: textPrimary }}>
                                          {d.checkin_time || <span className="text-neutral-400 dark:text-neutral-600">—</span>}
                                        </td>
                                        
                                        <td className="px-3 py-2 text-center font-mono">
                                          {d.late_minutes > 0 ? (
                                            <span className="font-bold" style={{ color: isDark ? '#FBBF24' : '#B45309' }}>+{fmtMins(d.late_minutes)}</span>
                                          ) : (
                                            <span className="text-neutral-400 dark:text-neutral-600">—</span>
                                          )}
                                        </td>
                                        
                                        <td className="px-3 py-2 text-center font-mono" style={{ color: textPrimary }}>
                                          {d.checkout_time || <span className="text-neutral-400 dark:text-neutral-600">—</span>}
                                        </td>
                                        
                                        <td className="px-3 py-2 text-center font-mono">
                                          {d.leave_early_minutes > 0 ? (
                                            <span className="font-bold" style={{ color: isDark ? '#FB923C' : '#C2410C' }}>-{fmtMins(d.leave_early_minutes)}</span>
                                          ) : (
                                            <span className="text-neutral-400 dark:text-neutral-600">—</span>
                                          )}
                                        </td>
                                        
                                        <td className="px-3 py-2">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {d.status === 'holiday' ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold border" style={{ background: isDark ? '#2A2618' : '#FBF3DB', borderColor: isDark ? '#3D361F' : '#F2E3B6', color: isDark ? '#C4A24A' : '#956400' }}>
                                                {d.holiday_name || 'Hari Libur'}
                                              </span>
                                            ) : d.status === 'dayoff' || d.status === 'off' ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold border" style={{ background: isDark ? '#232228' : '#F3F4F6', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB', color: isDark ? '#8C8985' : '#4B5563' }}>
                                                Day Off
                                              </span>
                                            ) : d.issues?.length === 0 ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold border" style={{ background: isDark ? '#1E2E1E' : '#EDF3EC', borderColor: isDark ? '#2B422B' : '#D5E6D3', color: isDark ? '#7BAF7B' : '#346538' }}>
                                                Tepat Waktu
                                              </span>
                                            ) : d.status === 'absent' ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold border" style={{ background: isDark ? '#3A1E1E' : '#FDEBEC', borderColor: isDark ? '#542626' : '#F8C9CC', color: isDark ? '#DC8585' : '#9F2F2D' }}>
                                                Tidak Masuk
                                              </span>
                                            ) : (
                                              <div className="flex flex-wrap gap-1">
                                                {d.issues.map(issue => {
                                                  const m = STATUS_META[issue] || STATUS_META.multiple
                                                  return (
                                                    <span key={issue} className="px-2 py-0.5 rounded text-[10px] font-semibold border" style={{ background: isDark ? m.darkBg : m.bg, borderColor: isDark ? m.darkBorder : m.border, color: isDark ? m.darkColor : m.color }}>
                                                      {m.label}
                                                    </span>
                                                  )
                                                })}
                                              </div>
                                            )}

                                            {excLabel && (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold border" style={{ background: excLabel.bg, borderColor: excLabel.border, color: excLabel.color }}>
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
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>

              {/* Footer Totals */}
              <tfoot>
                <tr
                  style={{
                    background: isDark ? '#27272A' : '#FBFBFA',
                    borderTop: `2px solid ${borderColor}`,
                    color: textPrimary
                  }}
                >
                  <td colSpan={3} className="px-3.5 py-2.5 font-bold font-mono uppercase text-[10px]">
                    TOTAL ({filteredRows.length} Karyawan)
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold">—</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-700 dark:text-amber-400">{totals.late || '—'}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-700 dark:text-amber-400">{fmtMins(totals.late_mins)}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-orange-700 dark:text-orange-400">{totals.leave_early || '—'}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-orange-700 dark:text-orange-400">{fmtMins(totals.le_mins)}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-purple-700 dark:text-purple-400">{totals.absent || '—'}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-orange-700 dark:text-orange-400">{totals.no_checkout || '—'}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
