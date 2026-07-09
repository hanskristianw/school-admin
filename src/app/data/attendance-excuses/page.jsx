'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

// ─── Constants ──────────────────────────────────────────────────────────────

// Fallback statis jika DB belum load
const CATEGORIES_LATE_LEAVE_EARLY_STATIC = [
  { value: 'woke_up_late',    label: 'Woke Up Late' },
  { value: 'traffic_jam',     label: 'Traffic Jam / Transportation Issue' },
  { value: 'sick',            label: 'Sick / Unwell' },
  { value: 'family_personal', label: 'Family / Personal Matter' },
  { value: 'other',           label: 'Other' },
]

const CATEGORIES_NO_SCAN_STATIC = [
  { value: 'forgot_scan',          label: 'Forgot to check in/out' },
  { value: 'scanned_not_recorded', label: 'Already scanned but not recorded' },
  { value: 'other',                label: 'Other' },
]

// Konversi record dari leave_types DB ke format {value, label, requireUpload, uploadLabel}
function dbToCategory(lt) {
  return {
    value:        lt.code,
    label:        lt.name_en,
    requireUpload: lt.requires_upload || false,
    uploadLabel:  lt.upload_label || '',
    max_days:     lt.max_days || null,
  }
}

function getCategoriesForType(issueType, leaveTypes) {
  if (!leaveTypes?.length) {
    if (issueType === 'absent') return []
    if (issueType === 'no_checkin' || issueType === 'no_checkout') return CATEGORIES_NO_SCAN_STATIC
    return CATEGORIES_LATE_LEAVE_EARLY_STATIC
  }
  return leaveTypes
    .filter(lt => lt.is_active && lt.issue_types?.includes(issueType))
    .map(dbToCategory)
}


const STATUS_CONFIG = {
  pending:    { label: 'Menunggu Approver 1', color: '#92400e', bg: '#fef3c7', icon: '⏳' },
  approved_1: { label: 'Menunggu Approver 2', color: '#1e40af', bg: '#dbeafe', icon: '🔄' },
  approved:   { label: 'Disetujui',           color: '#166534', bg: '#dcfce7', icon: '✅' },
  rejected:   { label: 'Ditolak',             color: '#991b1b', bg: '#fee2e2', icon: '❌' },
}

const ISSUE_CONFIG = {
  late:        { label: 'Terlambat',      color: '#92400e', bg: '#fef3c7', icon: '🕐' },
  leave_early: { label: 'Pulang Awal',    color: '#9a3412', bg: '#ffedd5', icon: '🚪' },
  absent:      { label: 'Tidak Masuk',    color: '#6b21a8', bg: '#f3e8ff', icon: '❌' },
  no_checkout: { label: 'Tidak Check-Out',color: '#1e40af', bg: '#dbeafe', icon: '⚠️' },
  no_checkin:  { label: 'Tidak Check-In', color: '#9d174d', bg: '#fce7f3', icon: '🔴' },
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

function ExcuseModal({ record, userId, leaveTypes, onClose, onSuccess }) {
  const { theme } = useTheme()
  const [category, setCategory]       = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [msg, setMsg]                 = useState('')
  const [uploadFile, setUploadFile]   = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [quotaInfo, setQuotaInfo]     = useState(null)  // { total_days, used_days, year_name } | null
  const [quotaLoading, setQuotaLoading] = useState(false)

  const issueType = record.issues?.includes('late')
    ? 'late'
    : record.issues?.includes('leave_early')
      ? 'leave_early'
      : record.issues?.includes('absent')
        ? 'absent'
        : record.issues?.includes('no_checkin')
          ? 'no_checkin'
          : 'no_checkout'

  const categories = getCategoriesForType(issueType, leaveTypes)
  const selectedCat = categories.find(c => c.value === category)
  const requireUpload = selectedCat?.requireUpload || false

  // Fetch sisa quota ketika kategori berubah dan deduct_quota=true
  const fetchQuota = async (catCode) => {
    if (!catCode) { setQuotaInfo(null); return }
    setQuotaLoading(true)
    try {
      const targetDate = record.date
      // Fetch individual + global records sekaligus (API sudah return keduanya via OR filter)
      const res = await fetch(`/api/attendance/leave-quotas?user_id=${userId}&leave_type_code=${catCode}`)
      const json = await res.json()
      const records = json.data || []

      // Pisahkan individual vs global
      const indiv = records.find(q => !q.is_global && q.year?.start_date <= targetDate && q.year?.end_date >= targetDate)
      const global = records.find(q =>  q.is_global && q.year?.start_date <= targetDate && q.year?.end_date >= targetDate)

      if (indiv) {
        setQuotaInfo({ total_days: indiv.total_days, used_days: indiv.used_days, year_name: indiv.year?.year_name || '', is_global: false })
      } else if (global) {
        // Belum ada record individual → tampilkan jatah global (used=0 untuk karyawan ini)
        setQuotaInfo({ total_days: global.total_days, used_days: 0, year_name: global.year?.year_name || '', is_global: true })
      } else {
        setQuotaInfo({ notFound: true })
      }
    } catch { setQuotaInfo(null) }
    finally { setQuotaLoading(false) }
  }

  const duration = issueType === 'late'
    ? record.late_minutes
    : issueType === 'leave_early'
      ? record.leave_early_minutes
      : null

  const ic = ISSUE_CONFIG[issueType] || ISSUE_CONFIG.absent

  const uploadAttachment = async () => {
    if (!uploadFile) return null
    const formData = new FormData()
    formData.append('file', uploadFile)
    setUploading(true)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Upload gagal')
      return json.url
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!category) { setMsg('❌ Pilih kategori alasan'); return }
    if (category === 'other' && !otherReason.trim()) { setMsg('❌ Isi keterangan untuk Other'); return }
    if (requireUpload && !uploadFile) { setMsg('❌ Upload file wajib untuk kategori ini'); return }
    setSubmitting(true); setMsg('')
    try {
      let attachmentUrl = null
      if (uploadFile) attachmentUrl = await uploadAttachment()
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
          attachment_url:  attachmentUrl,
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
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div style={{
        background: theme.cardBg,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: `1px solid ${theme.border}`,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 32px)',
        marginTop: 'auto',
        marginBottom: 'auto',
        alignSelf: 'center',
      }}>
        {/* Header — fixed, tidak scroll */}
        <div className="flex items-start justify-between"
          style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
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

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1 }}>
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
            {categories.map(c => (
              <label key={c.value}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer"
                style={{
                  background: category === c.value
                    ? (theme.blueText ? `${theme.blueText}18` : '#eff6ff')
                    : 'transparent',
                  border: `1px solid ${category === c.value ? (theme.blueText || '#2563eb') : theme.border}`,
                }}>
                <input type="radio" name="category" value={c.value}
                  checked={category === c.value}
                  onChange={() => {
                    setCategory(c.value)
                    setUploadFile(null)
                    setQuotaInfo(null)
                    fetchQuota(c.value)
                  }}
                  style={{ accentColor: theme.blueText || '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <span className="text-sm" style={{ color: theme.textBody }}>{c.label}</span>
                  {c.requireUpload && (
                    <span className="text-xs ml-1 px-1.5 py-0.5 rounded" style={{ background: '#fef3c7', color: '#92400e' }}>📎 wajib</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Quota info */}
        {/* Quota info — tampil jika ada quota record */}
        {quotaInfo && !quotaInfo.notFound && (
          <div className="mb-3 px-3 py-2.5 rounded-lg" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}` }}>
            {quotaLoading ? (
              <span className="text-xs" style={{ color: theme.textSecondary }}>⏳ Mengecek sisa jatah...</span>
            ) : quotaInfo?.notFound ? (
              <span className="text-xs" style={{ color: '#92400e' }}>⚠️ Jatah cuti belum diset oleh admin untuk tahun ajaran ini</span>
            ) : quotaInfo ? (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: theme.textSecondary }}>
                  📋 Jatah {selectedCat.label} · {quotaInfo.year_name}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: (quotaInfo.total_days - quotaInfo.used_days) <= 0 ? '#fee2e2' : '#dcfce7',
                    color:      (quotaInfo.total_days - quotaInfo.used_days) <= 0 ? '#991b1b' : '#166534'
                  }}>
                  Sisa {quotaInfo.total_days - quotaInfo.used_days} / {quotaInfo.total_days} hari
                </span>
              </div>
            ) : (
              <span className="text-xs" style={{ color: theme.textSecondary }}>📋 Pilih kategori untuk cek sisa jatah</span>
            )}
          </div>
        )}

        {requireUpload && (
          <div className="mb-3">
            <label className="text-xs font-medium block mb-1.5" style={{ color: theme.textSecondary }}>
              {selectedCat?.uploadLabel || 'Upload Dokumen'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                  style={{ border: `1px dashed ${theme.border}`, background: theme.subtleBg }}>
                  <span className="text-lg">📎</span>
                  <span className="text-xs" style={{ color: theme.textSecondary }}>
                    {uploadFile ? uploadFile.name : 'Klik untuk pilih file (PDF, JPG, PNG)'}
                  </span>
                </div>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => setUploadFile(e.target.files[0] || null)} />
              </label>
              {uploadFile && (
                <button onClick={() => setUploadFile(null)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: '#fee2e2', color: '#991b1b' }}>✕</button>
              )}
            </div>
          </div>
        )}

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
        </div>{/* end scrollable body */}

        {/* Footer buttons — fixed, tidak scroll */}
        <div className="flex gap-2"
          style={{ padding: '12px 24px 20px', borderTop: `1px solid ${theme.border}`, flexShrink: 0 }}>
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
            {submitting ? (uploading ? 'Mengupload...' : 'Mengajukan...') : 'Submit'}
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
  const [leaveTypes, setLeaveTypes]   = useState([])  // from DB

  // Fetch leave types from DB on mount (for dynamic categories)
  useEffect(() => {
    supabase.from('leave_types').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setLeaveTypes(data) })
  }, [])

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
      // Jika bulan yang dipilih adalah bulan berjalan, gunakan kemarin sebagai akhir
      // agar hari yang belum berlalu tidak dihitung sebagai tidak masuk
      const today     = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)
      const currentYM    = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      const end = ym === currentYM
        ? (yesterdayStr < monthEnd(ym) ? yesterdayStr : monthEnd(ym))
        : monthEnd(ym)

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
            // Hari libur & day off tidak perlu surat keterangan
            if (day.status === 'holiday' || day.status === 'dayoff' || day.status === 'off') continue
            const hasIssue = day.issues?.some(i =>
              ['late', 'leave_early', 'absent', 'no_checkin', 'no_checkout'].includes(i)
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
            Catatan kehadiran yang memerlukan keterangan — klik <strong>Ajukan</strong> untuk mengisi surat keterangan
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
            const primaryIssue = ['late', 'leave_early', 'absent', 'no_checkout', 'no_checkin'].find(i =>
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
          leaveTypes={leaveTypes}
          onClose={() => setModalRecord(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}
