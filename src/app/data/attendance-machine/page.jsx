'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFingerprint, faArrowRightToBracket, faArrowRightFromBracket,
  faCalendarDay, faUsers, faRotate, faCopy, faCheck,
  faChevronLeft, faChevronRight, faSearch, faCircleInfo
} from '@fortawesome/free-solid-svg-icons'

const STATUS_LABEL = {
  '0': { label: 'Check-in',  color: '#16a34a', bg: '#dcfce7' },
  '1': { label: 'Check-out', color: '#d97706', bg: '#fef3c7' },
}

function statusInfo(code) {
  return STATUS_LABEL[String(code)] ?? { label: code ?? '-', color: '#6b7280', bg: '#f3f4f6' }
}

const PAGE_SIZE = 25

export default function AttendanceMachinePage() {
  const { theme } = useTheme()

  // ─── State ─────────────────────────────────────────────────────────────
  const [records, setRecords]       = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [todayCount, setTodayCount] = useState(0)
  const [checkinCount, setCheckinCount]   = useState(0)
  const [checkoutCount, setCheckoutCount] = useState(0)

  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local
  const [filterDate, setFilterDate]   = useState(today)
  const [filterName, setFilterName]   = useState('')
  const [webhookUrl, setWebhookUrl]   = useState('')
  const [copied, setCopied]           = useState(false)

  // Build webhook URL client-side so it reflects current domain
  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhook/attendance`)
  }, [])

  // ─── Fetch data ─────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('attendances')
        .select(`
          id, scan_time, status_scan, created_at,
          users:user_id ( user_id, user_nama_depan, user_nama_belakang, user_pin )
        `, { count: 'exact' })
        .order('scan_time', { ascending: false })

      if (filterDate) {
        q = q
          .gte('scan_time', `${filterDate}T00:00:00+07:00`)
          .lte('scan_time', `${filterDate}T23:59:59+07:00`)
      }

      const from = (page - 1) * PAGE_SIZE
      q = q.range(from, from + PAGE_SIZE - 1)

      const { data, error, count } = await q
      if (error) throw error

      // Client-side name filter (Supabase can't filter FK columns in .select easily)
      let filtered = data || []
      if (filterName.trim()) {
        const q2 = filterName.trim().toLowerCase()
        filtered = filtered.filter(r => {
          const full = `${r.users?.user_nama_depan ?? ''} ${r.users?.user_nama_belakang ?? ''}`.toLowerCase()
          return full.includes(q2)
        })
      }

      setRecords(filtered)
      setTotal(count ?? 0)
    } catch (e) {
      console.error('[attendance-machine] fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [filterDate, filterName, page])

  // Daily summary (unfiltered by name/page — always today's date)
  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('attendances')
        .select('status_scan')
        .gte('scan_time', `${today}T00:00:00+07:00`)
        .lte('scan_time', `${today}T23:59:59+07:00`)

      if (!data) return
      setTodayCount(data.length)
      setCheckinCount(data.filter(r => String(r.status_scan) === '0').length)
      setCheckoutCount(data.filter(r => String(r.status_scan) === '1').length)
    } catch (e) {
      console.error('[attendance-machine] summary error:', e)
    }
  }, [today])

  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => { fetchSummary()  }, [fetchSummary])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [filterDate, filterName])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const fmtTime = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: theme.textBody }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: theme.textPrimary }}>
            <FontAwesomeIcon icon={faFingerprint} />
            Absensi Mesin
          </h1>
          <p className="text-sm mt-0.5" style={{ color: theme.textSecondary }}>
            Data dari mesin absensi IoT (fingerprint / wajah) via webhook
          </p>
        </div>
        <button
          onClick={() => { fetchRecords(); fetchSummary() }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md"
          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody, cursor: 'pointer' }}
        >
          <FontAwesomeIcon icon={faRotate} /> Refresh
        </button>
      </div>

      {/* Webhook URL Info */}
      <div className="rounded-lg p-4 space-y-2" style={{ background: theme.blueBg, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: theme.blueText }}>
          <FontAwesomeIcon icon={faCircleInfo} />
          URL Webhook — masukkan alamat ini ke konfigurasi program pengirim absensi
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <code
            className="flex-1 text-sm px-3 py-1.5 rounded font-mono break-all"
            style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
          >
            {webhookUrl || 'Loading...'}
          </code>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md whitespace-nowrap"
            style={{ background: copied ? theme.greenBg : theme.cardBg, border: `1px solid ${theme.border}`, color: copied ? theme.greenText : theme.blueText, cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
            {copied ? 'Tersalin!' : 'Salin'}
          </button>
        </div>
        <p className="text-xs" style={{ color: theme.blueText }}>
          Method: <strong>POST</strong> &nbsp;·&nbsp; Header: <strong>Authorization: Bearer &lt;ATTENDANCE_WEBHOOK_SECRET&gt;</strong>
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { icon: faCalendarDay, label: 'Scan Hari Ini',  value: todayCount,    color: theme.blueText,  bg: theme.blueBg  },
          { icon: faArrowRightToBracket,   label: 'Check-in Hari Ini', value: checkinCount,  color: theme.greenText, bg: theme.greenBg },
          { icon: faArrowRightFromBracket, label: 'Check-out Hari Ini',value: checkoutCount, color: theme.yellowText, bg: theme.yellowBg },
        ].map(({ icon, label, value, color, bg }) => (
          <div key={label} className="rounded-lg p-4 flex items-center gap-3" style={{ background: bg, border: `1px solid ${theme.border}` }}>
            <FontAwesomeIcon icon={icon} className="text-2xl" style={{ color }} />
            <div>
              <div className="text-xs" style={{ color }}>{label}</div>
              <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: theme.textSecondary }}>Tanggal</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-md"
            style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody }}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-xs font-medium" style={{ color: theme.textSecondary }}>Cari Nama</label>
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.textSecondary }} />
            <input
              type="text"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="Nama karyawan..."
              className="text-sm pl-7 pr-3 py-1.5 rounded-md w-full"
              style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody }}
            />
          </div>
        </div>
        {filterDate && (
          <button
            onClick={() => { setFilterDate(''); setFilterName('') }}
            className="text-xs px-3 py-1.5 rounded-md self-end"
            style={{ border: `1px solid ${theme.border}`, background: theme.subtleBg, color: theme.textSecondary, cursor: 'pointer' }}
          >
            Tampilkan Semua
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
        {loading ? (
          <div className="text-center py-12" style={{ color: theme.textSecondary }}>
            <FontAwesomeIcon icon={faRotate} spin className="text-2xl mb-2" />
            <p className="text-sm">Memuat data...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12" style={{ color: theme.textSecondary }}>
            <FontAwesomeIcon icon={faUsers} className="text-4xl mb-2 opacity-30" />
            <p className="text-sm">Belum ada data absensi{filterDate ? ` pada ${filterDate}` : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
                  {['#', 'Waktu Scan', 'Nama Karyawan', 'PIN', 'Status'].map(h => (
                    <th key={h} className="py-2.5 px-4 text-left font-semibold text-xs" style={{ color: theme.textSecondary }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((row, idx) => {
                  const si = statusInfo(row.status_scan)
                  const rowNum = (page - 1) * PAGE_SIZE + idx + 1
                  return (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td className="py-2.5 px-4 text-xs font-mono" style={{ color: theme.textSecondary }}>{rowNum}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono" style={{ color: theme.textBody }}>
                        {fmtTime(row.scan_time)}
                      </td>
                      <td className="py-2.5 px-4 font-medium" style={{ color: theme.textPrimary }}>
                        {row.users
                          ? `${row.users.user_nama_depan} ${row.users.user_nama_belakang}`
                          : <span style={{ color: theme.textSecondary }}>—</span>
                        }
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs" style={{ color: theme.textSecondary }}>
                        {row.users?.user_pin ?? '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: si.bg, color: si.color }}
                        >
                          <FontAwesomeIcon icon={row.status_scan === '1' ? faArrowRightFromBracket : faArrowRightToBracket} />
                          {si.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: theme.textSecondary }}>
            {total} record · halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-md text-sm disabled:opacity-40"
              style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-md text-sm disabled:opacity-40"
              style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
