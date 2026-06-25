'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import * as XLSX from 'xlsx'

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
  const exportExcel = () => {
    if (!report?.data?.length) return

    const wb = XLSX.utils.book_new()
    const allUnits = ['all', ...units.filter(u => allRows.some(r => r.unit_id === u.unit_id)).map(u => u.unit_id)]

    allUnits.forEach(uid => {
      const rows = uid === 'all' ? allRows : allRows.filter(r => r.unit_id === uid)
      if (!rows.length) return
      const sheetName = uid === 'all' ? 'Semua Unit' : (units.find(u => u.unit_id === uid)?.unit_name || 'Unit')

      // Summary sheet
      const summaryData = [
        ['Nama', 'Unit', 'Role', 'Jadwal Masuk', 'Jadwal Keluar',
         'Hari Kerja', 'Terlambat (×)', 'Total Mnt Telat', 'Pulang Awal (×)', 'Total Mnt PA',
         'Tidak Masuk (×)', 'Tidak Checkout (×)'],
        ...rows.map(r => [
          r.name, r.unit_name, r.role_name, r.expected_check_in, r.expected_check_out,
          r.work_days_in_range,
          r.late_count, r.late_minutes_total,
          r.leave_early_count, r.leave_early_minutes_total,
          r.absent_count, r.no_checkout_count
        ])
      ]
      const ws = XLSX.utils.aoa_to_sheet(summaryData)

      // Auto column width
      ws['!cols'] = summaryData[0].map((_, i) => ({
        wch: Math.max(...summaryData.map(row => String(row[i] ?? '').length), 10)
      }))

      // Style header row
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = XLSX.utils.encode_cell({ r: 0, c })
        if (!ws[cell]) continue
        ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DBEAFE' } } }
      }

      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

      // Detail sheet per unit (daily breakdown)
      if (uid !== 'all') {
        const detailRows = [['Nama', 'Tanggal', 'Check-In', 'Terlambat (mnt)', 'Check-Out', 'Pulang Awal (mnt)', 'Status']]
        rows.forEach(r => {
          r.daily?.forEach(d => {
            detailRows.push([
              r.name, d.date,
              d.checkin_time || '—', d.late_minutes || 0,
              d.checkout_time || '—', d.leave_early_minutes || 0,
              d.issues.length === 0 ? 'OK' : d.issues.join(', ')
            ])
          })
        })
        const wsDet = XLSX.utils.aoa_to_sheet(detailRows)
        wsDet['!cols'] = detailRows[0].map((_, i) => ({
          wch: Math.max(...detailRows.map(row => String(row[i] ?? '').length), 10)
        }))
        XLSX.utils.book_append_sheet(wb, wsDet, `${sheetName.slice(0, 25)} - Detail`)
      }
    })

    const fileName = `Rekap_Absensi_${report.range.start}_sd_${report.range.end}.xlsx`
    XLSX.writeFile(wb, fileName)
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
                            {row.name}
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
