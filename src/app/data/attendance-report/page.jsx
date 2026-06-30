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
  const [dateStart, setDateStart] = useState(getMonthStart())
  const [dateEnd,   setDateEnd]   = useState(getToday())
  const [units,     setUnits]     = useState([])
  const [roles,     setRoles]     = useState([])
  const [graceMin,  setGraceMin]  = useState(0)
  const [activeTab, setActiveTab] = useState('all') // unit_id | 'all'

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

    const HDR_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    const ALT_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }
    const WHITE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    const LATE_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
    const LE_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
    const ABS_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }
    const OK_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }
    const NOCHK_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } }
    const EXC_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
    const PEND_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }
    const REJ_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }

    const hdrFont   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    const lateFont  = { color: { argb: 'FF92400E' }, bold: true }
    const leFont    = { color: { argb: 'FF991B1B' }, bold: true }
    const absFont   = { color: { argb: 'FF6B21A8' }, bold: true }
    const okFont    = { color: { argb: 'FF166534' } }
    const noChkFont = { color: { argb: 'FF9A3412' }, bold: true }
    const excFont   = { color: { argb: 'FF065F46' } }
    const pendFont  = { color: { argb: 'FF854D0E' } }
    const rejFont   = { color: { argb: 'FF991B1B' } }

    const cellBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    }
    const hdrBorder = {
      bottom: { style: 'medium', color: { argb: 'FFBFDBFE' } },
    }

    const styleRow = (row, fill, font) => {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = fill
        if (font) cell.font = font
        cell.border = cellBorder
        cell.alignment = { vertical: 'middle' }
      })
    }

    const excuseLabel = (d) => {
      if (!d.excuse && !d.excused && !d.excuse_pending) return ''
      if (d.excuse?.status === 'approved' || d.excused) return 'Disetujui'
      if (d.excuse_pending) return 'Menunggu Persetujuan'
      if (d.excuse?.status === 'rejected') return `Ditolak${d.excuse.rejected_note ? ' (' + d.excuse.rejected_note + ')' : ''}`
      return ''
    }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'School Admin'
    wb.created = new Date()

    const allUnits = ['all', ...units.filter(u => allRows.some(r => r.unit_id === u.unit_id)).map(u => u.unit_id)]

    for (const uid of allUnits) {
      const rows = uid === 'all' ? allRows : allRows.filter(r => r.unit_id === uid)
      if (!rows.length) continue
      const sheetName = uid === 'all' ? 'Semua Unit' : (units.find(u => u.unit_id === uid)?.unit_name || 'Unit')

      // ── Summary Sheet ──────────────────────────────────────────────────────
      const ws = wb.addWorksheet(sheetName.slice(0, 31))
      ws.views = [{ state: 'frozen', ySplit: 1 }]
      ws.columns = [
        { header: 'No',                 key: 'no',     width: 5  },
        { header: 'Nama',               key: 'name',   width: 30 },
        { header: 'PIN',                key: 'pin',    width: 7  },
        { header: 'Unit',               key: 'unit',   width: 18 },
        { header: 'Role',               key: 'role',   width: 22 },
        { header: 'Jadwal Masuk',       key: 'ci',     width: 13 },
        { header: 'Jadwal Keluar',      key: 'co',     width: 13 },
        { header: 'Hari Kerja',         key: 'wd',     width: 11 },
        { header: 'Terlambat (x)',      key: 'late_n', width: 13 },
        { header: 'Total Mnt Telat',    key: 'late_m', width: 14 },
        { header: 'Pulang Awal (x)',    key: 'le_n',   width: 13 },
        { header: 'Total Mnt PA',       key: 'le_m',   width: 12 },
        { header: 'Tidak Masuk (x)',    key: 'absent', width: 14 },
        { header: 'Tidak Checkout (x)', key: 'nochk',  width: 16 },
      ]
      const hdrRow1 = ws.getRow(1)
      hdrRow1.height = 32
      hdrRow1.eachCell({ includeEmpty: true }, cell => {
        cell.fill = HDR_FILL; cell.font = hdrFont; cell.border = hdrBorder
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      })

      rows.forEach((r, ri) => {
        const dr = ws.addRow({
          no: ri + 1, name: r.name, pin: r.user_pin || '',
          unit: r.unit_name, role: r.role_name,
          ci: r.expected_check_in, co: r.expected_check_out,
          wd: r.work_days_in_range,
          late_n: r.late_count || 0,   late_m: r.late_minutes_total || 0,
          le_n: r.leave_early_count || 0, le_m: r.leave_early_minutes_total || 0,
          absent: r.absent_count || 0, nochk: r.no_checkout_count || 0,
        })
        styleRow(dr, ri % 2 === 1 ? ALT_FILL : WHITE_FILL, null)
        if (r.late_count > 0)          { dr.getCell('late_n').fill = LATE_FILL; dr.getCell('late_n').font = lateFont; dr.getCell('late_m').fill = LATE_FILL; dr.getCell('late_m').font = lateFont }
        if (r.leave_early_count > 0)   { dr.getCell('le_n').fill = LE_FILL;   dr.getCell('le_n').font = leFont;   dr.getCell('le_m').fill = LE_FILL;   dr.getCell('le_m').font = leFont   }
        if (r.absent_count > 0)        { dr.getCell('absent').fill = ABS_FILL; dr.getCell('absent').font = absFont }
        if (r.no_checkout_count > 0)   { dr.getCell('nochk').fill = NOCHK_FILL; dr.getCell('nochk').font = noChkFont }
      })

      // ── Detail Sheet per unit ──────────────────────────────────────────────
      if (uid !== 'all') {
        const wsDet = wb.addWorksheet(`${sheetName.slice(0, 23)} - Detail`)
        wsDet.views = [{ state: 'frozen', ySplit: 1 }]
        wsDet.columns = [
          { header: 'Nama',              key: 'name',   width: 30 },
          { header: 'PIN',               key: 'pin',    width: 7  },
          { header: 'Tanggal',           key: 'date',   width: 13 },
          { header: 'Check-In',          key: 'ci',     width: 11 },
          { header: 'Terlambat (mnt)',   key: 'late',   width: 15 },
          { header: 'Check-Out',         key: 'co',     width: 11 },
          { header: 'Pulang Awal (mnt)', key: 'le',     width: 16 },
          { header: 'Status',            key: 'status', width: 22 },
          { header: 'Surat Keterangan',  key: 'excuse', width: 30 },
        ]
        const hdrRow2 = wsDet.getRow(1)
        hdrRow2.height = 32
        hdrRow2.eachCell({ includeEmpty: true }, cell => {
          cell.fill = HDR_FILL; cell.font = hdrFont; cell.border = hdrBorder
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        })

        let detRi = 0
        rows.forEach(r => {
          r.daily?.forEach(d => {
            const statusText = d.issues.length === 0 ? 'OK'
              : d.issues.includes('absent') ? 'Tidak Masuk'
              : d.issues.map(i => ({ late: 'Terlambat', leave_early: 'Pulang Awal', no_checkout: 'No Check-Out', no_checkin: 'No Check-In' }[i] || i)).join(', ')
            const dr = wsDet.addRow({
              name: r.name, pin: r.user_pin || '', date: d.date,
              ci: d.checkin_time || '-', late: d.late_minutes || 0,
              co: d.checkout_time || '-', le: d.leave_early_minutes || 0,
              status: statusText, excuse: excuseLabel(d),
            })
            styleRow(dr, detRi % 2 === 1 ? ALT_FILL : WHITE_FILL, null)
            // Color status cell
            const stCell = dr.getCell('status')
            if      (d.excuse?.status === 'approved' || d.excused)                       { stCell.fill = EXC_FILL;  stCell.font = excFont  }
            else if (d.excuse_pending)                                                     { stCell.fill = PEND_FILL; stCell.font = pendFont }
            else if (d.excuse?.status === 'rejected')                                     { stCell.fill = REJ_FILL;  stCell.font = rejFont  }
            else if (d.issues.length === 0)                                               { stCell.fill = OK_FILL;   stCell.font = okFont   }
            else if (d.issues.includes('absent'))                                         { stCell.fill = ABS_FILL;  stCell.font = absFont  }
            else if (d.issues.includes('late'))                                           { stCell.fill = LATE_FILL; stCell.font = lateFont }
            else if (d.issues.includes('leave_early'))                                    { stCell.fill = LE_FILL;   stCell.font = leFont   }
            else if (d.issues.includes('no_checkout') || d.issues.includes('no_checkin')) { stCell.fill = NOCHK_FILL; stCell.font = noChkFont }
            // Color excuse cell
            const exCell = dr.getCell('excuse')
            if      (d.excuse?.status === 'approved' || d.excused) { exCell.fill = EXC_FILL;  exCell.font = excFont  }
            else if (d.excuse_pending)                              { exCell.fill = PEND_FILL; exCell.font = pendFont }
            else if (d.excuse?.status === 'rejected')              { exCell.fill = REJ_FILL;  exCell.font = rejFont  }
            detRi++
          })
        })
      }
    }

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Rekap_Absensi_${report.range.start}_sd_${report.range.end}.xlsx`
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

      {/* Filter bar */}
      <div className="p-4 rounded-xl flex flex-wrap gap-3 items-end" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>Dari Tanggal</label>
          <input type="date" style={inputStyle} value={dateStart}
            onChange={e => setDateStart(e.target.value)} max={dateEnd} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>Sampai Tanggal</label>
          <input type="date" style={inputStyle} value={dateEnd}
            onChange={e => setDateEnd(e.target.value)} min={dateStart} />
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
