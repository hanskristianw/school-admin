'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme'

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'woke_up_late',    label: 'Woke Up Late' },
  { value: 'traffic_jam',     label: 'Traffic Jam' },
  { value: 'sick',            label: 'Sick / Unwell' },
  { value: 'education',       label: 'Education' },
  { value: 'family_personal', label: 'Family / Personal Matter' },
  { value: 'other',           label: 'Other' },
]

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))

const STATUS_CONFIG = {
  pending:    { label: 'Menunggu Approver 1', color: '#92400e', bg: '#fef3c7', icon: '⏳' },
  approved_1: { label: 'Menunggu Approver 2', color: '#1e40af', bg: '#dbeafe', icon: '🔄' },
  approved:   { label: 'Disetujui',           color: '#166534', bg: '#dcfce7', icon: '✅' },
  rejected:   { label: 'Ditolak',             color: '#991b1b', bg: '#fee2e2', icon: '❌' },
}

const ISSUE_CONFIG = {
  late:        { label: 'Terlambat',     color: '#92400e', bg: '#fef3c7', icon: '🕐' },
  leave_early: { label: 'Pulang Awal',   color: '#9a3412', bg: '#ffedd5', icon: '🚪' },
  absent:      { label: 'Tidak Masuk',   color: '#6b21a8', bg: '#f3e8ff', icon: '❌' },
  no_checkout: { label: 'Tidak Checkout',color: '#1e40af', bg: '#dbeafe', icon: '⚠️' },
}

function fmtMins(m) {
  if (!m || m <= 0) return null
  const h   = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}j ${min}m` : `${min} menit`
}

function monthStart(ym) { return `${ym}-01` }
function monthEnd(ym) {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0)
  return `${ym}-${String(last.getDate()).padStart(2, '0')}`
}

// ─── Excuse Modal ────────────────────────────────────────────────────────────

function ExcuseModal({ record, userId, onClose, onSuccess }) {
  const { theme } = useTheme()
  const [category, setCategory]       = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [msg, setMsg]                 = useState('')

  const issueType = record.issues?.includes('late')
    ? 'late'
    : record.issues?.includes('leave_early')
      ? 'leave_early'
      : 'absent'

  const duration = issueType === 'late'
    ? record.late_minutes
    : issueType === 'leave_early'
      ? record.leave_early_minutes
      : null

  const ic = ISSUE_CONFIG[issueType] || ISSUE_CONFIG.late

  const handleSubmit = async () => {
    if (!category) { setMsg('❌ Pilih kategori alasan'); return }
    if (category === 'other' && !otherReason.trim()) { setMsg('❌ Isi keterangan untuk Other'); return }
    setSubmitting(true); setMsg('')
    try {
      const res = await fetch('/api/attendance/excuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:         userId,
          excuse_type:     issueType,
          attendance_date: record.date,
          late_minutes:    duration || null,
          category,
          other_reason:    category === 'other' ? otherReason.trim() : null,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      onSuccess()
    } catch (err) {
      setMsg('❌ ' + err.message)
      setSubmitting(false)
    }
  }

  // Close on backdrop click
  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  const inputStyle = {
    width: '100%',
    background: theme.inputBg || theme.subtleBg,
    border: `1px solid ${theme.border}`,
    color: theme.textBody,
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{
        background: theme.cardBg,
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: `1px solid ${theme.border}`,
      }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: theme.textPrimary }}>
              📝 Surat Keterangan
            </h2>
            <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>
              Ajukan alasan untuk absensi berikut
            </p>
          </div>
          <button onClick={onClose}
            className="text-lg leading-none ml-3"
            style={{ color: theme.textSecondary }}>×</button>
        </div>

        {/* Record info */}
        <div className="rounded-xl p-3 mb-4 space-y-1.5"
          style={{ background: theme.subtleBg, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: ic.bg, color: ic.color }}>
              {ic.icon} {ic.label}
            </span>
            {duration > 0 && (
              <span className="text-xs font-semibold" style={{ color: ic.color }}>
                +{fmtMins(duration)}
              </span>
            )}
          </div>
          <div className="text-sm font-medium" style={{ color: theme.textPrimary }}>
            {record.date}
          </div>
          {record.checkin_time && (
            <div className="text-xs" style={{ color: theme.textSecondary }}>
              Masuk: {record.checkin_time}
              {record.checkout_time && <span> · Keluar: {record.checkout_time}</span>}
            </div>
          )}
        </div>

        {/* Category */}
        <div className="mb-3">
          <label className="text-xs font-medium block mb-1.5" style={{ color: theme.textSecondary }}>
            Penyebab <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="space-y-1.5">
            {CATEGORIES.map(c => (
              <label key={c.value}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer"
                style={{
                  background: category === c.value
                    ? (theme.blueText ? `${theme.blueText}18` : '#eff6ff')
                    : 'transparent',
                  border: `1px solid ${category === c.value ? (theme.blueText || '#2563eb') : theme.border}`,
                }}>
                <input type="radio" name="category" value={c.value}
                  checked={category === c.value}
                  onChange={() => setCategory(c.value)}
                  style={{ accentColor: theme.blueText || '#2563eb' }} />
                <span className="text-sm" style={{ color: theme.textBody }}>{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Other reason */}
        {category === 'other' && (
          <div className="mb-3">
            <label className="text-xs font-medium block mb-1.5" style={{ color: theme.textSecondary }}>
              Keterangan <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea rows={3}
              value={otherReason}
              onChange={e => setOtherReason(e.target.value)}
              placeholder="Jelaskan alasan Anda..."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        )}

        {/* Msg */}
        {msg && (
          <div className="mb-3 p-2.5 rounded-lg text-sm" style={{
            background: '#fef2f2', color: '#991b1b',
          }}>{msg}</div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium flex-1"
            style={{ background: theme.subtleBg, color: theme.textSecondary }}>
            Batal
          </button>
          <button onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold flex-1"
            style={{
              background: theme.blueText || '#2563eb',
              color: '#fff',
              opacity: submitting ? 0.7 : 1,
            }}>
            {submitting ? 'Mengajukan...' : 'Ajukan Surat Keterangan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AttendanceExcusesPage() {
  const { theme } = useTheme()
  const router = useRouter()

  const [userId, setUserId]           = useState(null)
  const [month, setMonth]             = useState(() => new Date().toISOString().slice(0, 7))
  const [issueRows, setIssueRows]     = useState([])  // days with issues
  const [excuseMap, setExcuseMap]     = useState({})  // date → excuse
  const [loading, setLoading]         = useState(false)
  const [modalRecord, setModalRecord] = useState(null)
  const [successDate, setSuccessDate] = useState(null)

  useEffect(() => {
    const id = localStorage.getItem('kr_id')
    if (!id) { router.replace('/login'); return }
    setUserId(parseInt(id, 10))
  }, [router])

  const loadData = useCallback(async (uid, ym) => {
    if (!uid) return
    setLoading(true)
    try {
      const start = monthStart(ym)
      const end   = monthEnd(ym)

      // Parallel: fetch report + existing excuses
      const [reportRes, excusesRes] = await Promise.all([
        fetch(`/api/attendance/report?user_id=${uid}&start=${start}&end=${end}`),
        fetch(`/api/attendance/excuses?user_id=${uid}&start=${start}&end=${end}`),
      ])
      const reportJson  = await reportRes.json()
      const excusesJson = await excusesRes.json()

      // Build excuse map by date
      const em = {}
      if (excusesJson.success) {
        for (const ex of (excusesJson.data || [])) {
          em[ex.attendance_date] = ex
        }
      }
      setExcuseMap(em)

      // Extract days with issues from report
      const rows = []
      if (reportJson.success) {
        for (const user of (reportJson.data || [])) {
          for (const day of (user.daily || [])) {
            const hasIssue = day.issues?.some(i =>
              ['late', 'leave_early', 'absent'].includes(i)
            )
            if (hasIssue) rows.push(day)
          }
        }
      }

      // Sort by date descending
      rows.sort((a, b) => b.date.localeCompare(a.date))
      setIssueRows(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userId) loadData(userId, month)
  }, [userId, month, loadData])

  const handleModalSuccess = () => {
    setSuccessDate(modalRecord?.date)
    setModalRecord(null)
    loadData(userId, month)
    setTimeout(() => setSuccessDate(null), 3000)
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const noExcuseCount = issueRows.filter(r => !excuseMap[r.date]).length

  // ── Styles ──────────────────────────────────────────────────────────────────
  const cardStyle = {
    background: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: '14px 16px',
  }

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: theme.textBody }}>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>
            📝 Surat Keterangan Absensi
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
            Absensi bermasalah Anda — klik <strong>Ajukan</strong> untuk mengisi surat keterangan
          </p>
        </div>

        {/* Month picker */}
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{
            background: theme.inputBg || theme.subtleBg,
            border: `1px solid ${theme.border}`,
            color: theme.textBody,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Summary banner */}
      {!loading && noExcuseCount > 0 && (
        <div className="p-3 rounded-xl flex items-center gap-3 text-sm"
          style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>
          ⚠️ Anda memiliki <strong>{noExcuseCount} absensi bermasalah</strong> yang belum ada surat keterangannya bulan ini
        </div>
      )}

      {/* Success banner */}
      {successDate && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }}>
          ✅ Surat keterangan untuk tanggal <strong>{successDate}</strong> berhasil diajukan
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-sm" style={{ color: theme.textSecondary }}>
          ⏳ Memuat data absensi...
        </div>
      ) : issueRows.length === 0 ? (
        <div className="py-16 text-center" style={{ color: theme.textSecondary }}>
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-sm font-medium">Tidak ada absensi bermasalah bulan ini!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {issueRows.map(day => {
            const excuse = excuseMap[day.date]
            const st     = excuse ? STATUS_CONFIG[excuse.status] : null

            // Determine primary issue for this day
            const primaryIssue = ['late', 'leave_early', 'absent'].find(i =>
              day.issues?.includes(i)
            )
            const ic = ISSUE_CONFIG[primaryIssue] || ISSUE_CONFIG.absent

            const duration = primaryIssue === 'late'
              ? day.late_minutes
              : primaryIssue === 'leave_early'
                ? day.leave_early_minutes
                : null

            // Rejection info
            const rejectedBy = excuse?.approver1_action === 'rejected'
              ? excuse.approver1_note || 'Approver 1'
              : excuse?.approver2_note || 'Approver 2'

            return (
              <div key={day.date} style={cardStyle}
                className="flex items-center justify-between gap-4 flex-wrap">

                {/* Left: date + issue type */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Date */}
                  <div className="text-sm font-semibold min-w-[90px]" style={{ color: theme.textPrimary }}>
                    {day.date}
                  </div>

                  {/* Issue badge */}
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: ic.bg, color: ic.color }}>
                    {ic.icon} {ic.label}
                  </span>

                  {/* Duration */}
                  {duration > 0 && (
                    <span className="text-xs font-semibold" style={{ color: ic.color }}>
                      +{fmtMins(duration)}
                    </span>
                  )}

                  {/* Checkin info */}
                  {day.checkin_time && (
                    <span className="text-xs" style={{ color: theme.textSecondary }}>
                      {day.checkin_time}
                      {day.checkout_time && <span> – {day.checkout_time}</span>}
                    </span>
                  )}
                </div>

                {/* Right: excuse status / button */}
                <div className="flex items-center gap-2">
                  {excuse ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: st.bg, color: st.color }}>
                        {st.icon} {st.label}
                      </span>
                      {excuse.status === 'rejected' && (
                        <span className="text-xs" style={{ color: '#991b1b' }}>
                          ({rejectedBy})
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setModalRecord(day)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: theme.blueText || '#2563eb', color: '#fff' }}>
                      ✏️ Ajukan
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Excuse modal */}
      {modalRecord && (
        <ExcuseModal
          record={modalRecord}
          userId={userId}
          onClose={() => setModalRecord(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}
