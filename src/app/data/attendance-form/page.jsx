'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import imageCompression from 'browser-image-compression'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClipboardList,
  faDoorOpen,
  faCalendarAlt,
  faClock,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faHourglassHalf,
  faSyncAlt,
  faSignOutAlt,
  faPaperclip,
  faTrash,
  faBuilding,
  faPen,
  faTimes,
  faSpinner,
  faCalendarCheck,
  faExclamationCircle,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons'

// ─── Constants ──────────────────────────────────────────────────────────────

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

function stripEmoji(str) {
  if (!str) return ''
  return str.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/gu, '').trim()
}

// ─── Image helpers ───────────────────────────────────────────────────────────

async function compressImage(file) {
  const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.92, alwaysKeepResolution: false }
  try { return await imageCompression(file, options) } catch { return file }
}

// ─── Excuse Modal (Submit + Edit) ────────────────────────────────────────────

function ExcuseModal({ record, excuse, userId, leaveTypes, onClose, onSuccess }) {
  const { theme, isDark: themeIsDark } = useTheme()
  const isDark = themeIsDark || theme.type === 'dark' || theme.name === 'dark' || theme.cardBg?.includes('#1') || theme.cardBg?.includes('#2')
  const { t } = useI18n()
  const isEdit = !!excuse

  const cardBg        = isDark ? '#18181B' : '#FFFFFF'
  const subtleBg      = isDark ? '#27272A' : '#F7F6F3'
  const borderColor   = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary   = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  const [category, setCategory]       = useState(excuse?.category || '')
  const [otherReason, setOtherReason] = useState(excuse?.other_reason || '')
  const [submitting, setSubmitting]   = useState(false)
  const [msg, setMsg]                 = useState('')
  const [uploadFile, setUploadFile]   = useState(null)
  const [processedFile, setProcessedFile] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [quotaInfo, setQuotaInfo]     = useState(null)
  const [quotaLoading, setQuotaLoading] = useState(false)

  const issueType = excuse?.excuse_type || record.issueType || (
    record.issues?.includes('late')
      ? 'late'
      : record.issues?.includes('leave_early')
        ? 'leave_early'
        : record.issues?.includes('absent')
          ? 'absent'
          : record.issues?.includes('no_checkin')
            ? 'no_checkin'
            : 'no_checkout'
  )

  const categories = getCategoriesForType(issueType, leaveTypes)
  const selectedCat = categories.find(c => c.value === category)
  const requireUpload = selectedCat?.requireUpload || false

  const issueLabel = {
    late:        t('attendanceForm.issueLate'),
    leave_early: t('attendanceForm.issueLeaveEarly'),
    absent:      t('attendanceForm.issueAbsent'),
    no_checkout: t('attendanceForm.issueNoCheckout'),
    no_checkin:  t('attendanceForm.issueNoCheckin'),
  }

  const ISSUE_CONFIG = {
    late:        { label: issueLabel.late,        color: isDark ? '#FCD34D' : '#92400E', bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB', icon: faClock },
    leave_early: { label: issueLabel.leave_early,  color: isDark ? '#FB923C' : '#9A3412', bg: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFEDD5', icon: faSignOutAlt },
    absent:      { label: issueLabel.absent,       color: isDark ? '#D8B4FE' : '#6B21A8', bg: isDark ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF', icon: faTimesCircle },
    no_checkout: { label: issueLabel.no_checkout,  color: isDark ? '#93C5FD' : '#1E40AF', bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', icon: faExclamationTriangle },
    no_checkin:  { label: issueLabel.no_checkin,   color: isDark ? '#F472B6' : '#9D174D', bg: isDark ? 'rgba(236, 72, 153, 0.15)' : '#FCE7F3', icon: faExclamationCircle },
  }

  const fetchQuota = async (catCode) => {
    if (!catCode) { setQuotaInfo(null); return }
    setQuotaLoading(true)
    try {
      const targetDate = record.date
      const res = await fetch(`/api/attendance/leave-quotas?user_id=${userId}&leave_type_code=${catCode}`)
      const json = await res.json()
      const records = json.data || []
      const indiv  = records.find(q => !q.is_global && q.year?.start_date <= targetDate && q.year?.end_date >= targetDate)
      const global = records.find(q =>  q.is_global && q.year?.start_date <= targetDate && q.year?.end_date >= targetDate)
      if (indiv)       setQuotaInfo({ total_days: indiv.total_days,  used_days: indiv.used_days, year_name: indiv.year?.year_name || '', is_global: false })
      else if (global) setQuotaInfo({ total_days: global.total_days, used_days: 0, year_name: global.year?.year_name || '', is_global: true })
      else             setQuotaInfo({ notFound: true })
    } catch { setQuotaInfo(null) }
    finally { setQuotaLoading(false) }
  }

  const duration = issueType === 'late' ? record.late_minutes : issueType === 'leave_early' ? record.leave_early_minutes : null
  const ic = ISSUE_CONFIG[issueType] || ISSUE_CONFIG.absent
  const isImage = (f) => f && f.type.startsWith('image/')

  const handleFileSelect = async (file) => {
    if (!file) return
    setUploadFile(file)
    setProcessedFile(null)
    if (isImage(file)) {
      setCompressing(true)
      try {
        const compressed = await compressImage(file)
        const named = new File([compressed], (file.name?.replace(/\.[^.]+$/, '') || 'attachment') + '.jpg', { type: 'image/jpeg' })
        setProcessedFile(named)
      } catch (err) {
        console.warn('Compression failed, using original file:', err)
        setProcessedFile(file)
      } finally {
        setCompressing(false)
      }
    } else {
      setProcessedFile(file)
    }
  }

  const clearFile = () => { setUploadFile(null); setProcessedFile(null) }
  const fileToUpload = processedFile || uploadFile || null

  const uploadAttachment = async () => {
    if (!fileToUpload) return excuse?.attachment_url || null
    const formData = new FormData()
    formData.append('file', fileToUpload)
    formData.append('user_id', String(userId))
    setUploading(true)
    try {
      const res  = await fetch('/api/attendance/excuses/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Upload gagal')
      return json.url
    } finally { setUploading(false) }
  }

  const handleSubmit = async () => {
    if (!category) { setMsg(t('attendanceForm.modal.errNoCategory')); return }
    if (category === 'other' && !otherReason.trim()) { setMsg(t('attendanceForm.modal.errNoOther')); return }
    if (requireUpload && !fileToUpload && !excuse?.attachment_url) { setMsg(t('attendanceForm.modal.errNoFile')); return }
    setSubmitting(true); setMsg('')
    try {
      const attachmentUrl = fileToUpload ? await uploadAttachment() : (excuse?.attachment_url || null)
      if (isEdit) {
        const res = await fetch(`/api/attendance/excuses/${excuse.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, category, other_reason: category === 'other' ? otherReason.trim() : null, attachment_url: attachmentUrl }) })
        const json = await res.json()
        if (!json.success) throw new Error(json.message)
      } else {
        const res = await fetch('/api/attendance/excuses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, excuse_type: issueType, attendance_date: record.date, late_minutes: duration || null, category, other_reason: category === 'other' ? otherReason.trim() : null, attachment_url: attachmentUrl }) })
        const json = await res.json()
        if (!json.success) throw new Error(json.message)
      }
      onSuccess()
    } catch (err) { setMsg(err.message); setSubmitting(false) }
  }

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }
  const inputStyle = { width: '100%', background: cardBg, border: `1px solid ${borderColor}`, color: textPrimary, borderRadius: '6px', padding: '9px 12px', fontSize: '13px', outline: 'none' }

  return (
    <div onClick={handleBackdrop} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div style={{ background: cardBg, borderRadius: '12px', width: '100%', maxWidth: '480px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 32px)', boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.08)' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: textPrimary, letterSpacing: '-0.01em', margin: 0 }}>
              {isEdit ? t('attendanceForm.modal.titleEdit') : t('attendanceForm.modal.titleNew')}
            </h2>
            <p style={{ fontSize: '12px', color: textSecondary, marginTop: '2px', margin: '2px 0 0 0' }}>
              {isEdit ? t('attendanceForm.modal.subtitleEdit') : t('attendanceForm.modal.subtitleNew')}
            </p>
          </div>
          <button onClick={onClose} style={{ color: textSecondary, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <FontAwesomeIcon icon={faTimes} className="text-sm" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1 }} className="space-y-4">
          {/* Record info */}
          <div style={{ background: subtleBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '12px 14px' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs px-2 py-0.5 rounded font-medium inline-flex items-center gap-1.5" style={{ background: ic.bg, color: ic.color }}>
                <FontAwesomeIcon icon={ic.icon} className="text-[10px]" />
                <span>{ic.label}</span>
              </span>
              {duration > 0 && <span className="text-xs font-semibold font-mono" style={{ color: ic.color }}>+{fmtMins(duration)}</span>}
            </div>
            <div className="text-sm font-semibold font-mono" style={{ color: textPrimary }}>{record.date}</div>
            {record.checkin_time && (
              <div className="text-xs font-mono mt-0.5" style={{ color: textSecondary }}>
                {t('attendanceForm.modal.labelCheckIn')} {record.checkin_time}
                {record.checkout_time && <span> · {t('attendanceForm.modal.labelCheckOut')} {record.checkout_time}</span>}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: textSecondary }}>
              {t('attendanceForm.modal.labelCause')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="space-y-1.5">
              {categories.map(c => {
                const isSelected = category === c.value
                return (
                  <label key={c.value} className="flex items-start gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-all"
                    style={{
                      background: isSelected ? (isDark ? '#27272A' : '#F7F6F3') : 'transparent',
                      border: `1px solid ${isSelected ? (isDark ? '#52525B' : '#111111') : borderColor}`
                    }}>
                    <input type="radio" name="category" value={c.value} checked={isSelected}
                      onChange={() => { setCategory(c.value); setUploadFile(null); setQuotaInfo(null); fetchQuota(c.value) }}
                      style={{ accentColor: isDark ? '#F4F4F5' : '#111111', marginTop: '3px', flexShrink: 0 }} />
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium" style={{ color: textPrimary }}>{c.label}</span>
                      {c.requireUpload && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-mono" style={{ background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB', color: isDark ? '#FCD34D' : '#956400' }}>
                          <FontAwesomeIcon icon={faPaperclip} className="text-[9px]" />
                          <span>{t('attendanceForm.modal.mandatory')}</span>
                        </span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Quota info */}
          {quotaInfo && !quotaInfo.notFound && (
            <div className="px-3 py-2.5 rounded-md" style={{ background: subtleBg, border: `1px solid ${borderColor}` }}>
              {quotaLoading ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: textSecondary }}>
                  <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
                  <span>{t('attendanceForm.modal.quotaLoading')}</span>
                </div>
              ) : quotaInfo ? (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs flex items-center gap-1.5" style={{ color: textSecondary }}>
                    <FontAwesomeIcon icon={faCalendarCheck} className="text-xs text-stone-500" />
                    <span>{t('attendanceForm.modal.quotaLabel')} {selectedCat?.label} · {quotaInfo.year_name}</span>
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded font-mono"
                    style={{
                      background: (quotaInfo.total_days - quotaInfo.used_days) <= 0
                        ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC')
                        : (isDark ? 'rgba(34, 197, 94, 0.15)' : '#EDF3EC'),
                      color: (quotaInfo.total_days - quotaInfo.used_days) <= 0
                        ? (isDark ? '#FCA5A5' : '#9B1C1C')
                        : (isDark ? '#86EFAC' : '#2A6335')
                    }}>
                    {t('attendanceForm.modal.quotaRemaining')} {quotaInfo.total_days - quotaInfo.used_days} / {quotaInfo.total_days} {t('attendanceForm.modal.quotaDays')}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* File upload */}
          {requireUpload && (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textSecondary }}>
                {selectedCat?.uploadLabel || t('attendanceForm.modal.labelRequired')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {isEdit && excuse?.attachment_url && !uploadFile && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-md text-xs" style={{ background: isDark ? 'rgba(34, 197, 94, 0.1)' : '#EDF3EC', border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#D1E7DD'}`, color: isDark ? '#86EFAC' : '#2A6335' }}>
                  <FontAwesomeIcon icon={faPaperclip} className="text-xs" />
                  <a href={excuse.attachment_url} target="_blank" rel="noreferrer" style={{ color: isDark ? '#86EFAC' : '#2A6335', textDecoration: 'underline', fontWeight: 600 }}>
                    {t('attendanceForm.modal.attachedFile')}
                  </a>
                  <span style={{ color: textSecondary }}>{t('attendanceForm.modal.replaceHint')}</span>
                </div>
              )}
              {compressing && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-md text-xs" style={{ background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#E1F3FE', border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'}`, color: isDark ? '#93C5FD' : '#185ADB' }}>
                  <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
                  <span>{t('attendanceForm.modal.compressing')}</span>
                </div>
              )}
              {fileToUpload && !compressing && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-md text-xs" style={{ background: isDark ? 'rgba(34, 197, 94, 0.1)' : '#EDF3EC', border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#D1E7DD'}`, color: isDark ? '#86EFAC' : '#2A6335' }}>
                  <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />
                  <span className="font-medium">{fileToUpload.name}</span>
                  <span style={{ color: textSecondary, marginLeft: 4 }} className="font-mono">({(fileToUpload.size / 1024).toFixed(0)} KB)</span>
                  {isImage(uploadFile) && <span style={{ color: isDark ? '#86EFAC' : '#2A6335', marginLeft: 2 }}>(Full Size)</span>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-md" style={{ border: `1px dashed ${borderColor}`, background: subtleBg }}>
                    <FontAwesomeIcon icon={faPaperclip} style={{ color: textSecondary }} />
                    <span className="text-xs" style={{ color: textSecondary }}>
                      {uploadFile
                        ? (isImage(uploadFile) ? t('attendanceForm.modal.fileReplaceImage') : t('attendanceForm.modal.fileReplaceDoc'))
                        : t('attendanceForm.modal.fileHint')}
                    </span>
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => handleFileSelect(e.target.files[0] || null)} />
                </label>
                {uploadFile && (
                  <button onClick={clearFile} className="text-xs px-2.5 py-2 rounded-md cursor-pointer border" style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA', color: isDark ? '#FCA5A5' : '#9B1C1C' }}>
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>
              <p className="text-xs mt-1.5" style={{ color: textSecondary }}>{t('attendanceForm.modal.fileNote')}</p>
            </div>
          )}

          {/* Other reason */}
          {category === 'other' && (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textSecondary }}>
                {t('attendanceForm.modal.labelOther')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea rows={3} value={otherReason} onChange={e => setOtherReason(e.target.value)}
                placeholder={t('attendanceForm.modal.placeholderReason')}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          )}

          {/* Error msg */}
          {msg && (
            <div className="p-2.5 rounded-md text-xs flex items-center gap-2" style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA'}`, color: isDark ? '#FCA5A5' : '#9B1C1C' }}>
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs" />
              <span>{msg}</span>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: '8px', padding: '14px 24px 18px', borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px 0', borderRadius: '6px', border: `1px solid ${borderColor}`, background: subtleBg, color: textPrimary, fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
            {t('attendanceForm.modal.btnCancel')}
          </button>
          <button onClick={handleSubmit} disabled={submitting || compressing} style={{ flex: 1, padding: '9px 0', borderRadius: '6px', border: 'none', background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF', fontSize: '12px', fontWeight: 600, cursor: (submitting || compressing) ? 'default' : 'pointer', opacity: (submitting || compressing) ? 0.6 : 1 }}>
            {compressing
              ? t('attendanceForm.modal.btnProcessing')
              : submitting
                ? (uploading ? t('attendanceForm.modal.btnUploading') : isEdit ? t('attendanceForm.modal.btnSaving') : t('attendanceForm.modal.btnSubmitting'))
                : t('attendanceForm.modal.btnSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ excuse, onClose, onSuccess }) {
  const { theme, isDark: themeIsDark } = useTheme()
  const isDark = themeIsDark || theme.type === 'dark' || theme.name === 'dark' || theme.cardBg?.includes('#1') || theme.cardBg?.includes('#2')
  const { t } = useI18n()
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState('')

  const cardBg        = isDark ? '#18181B' : '#FFFFFF'
  const subtleBg      = isDark ? '#27272A' : '#F7F6F3'
  const borderColor   = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary   = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res  = await fetch(`/api/attendance/excuses/${excuse.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      onSuccess()
    } catch (err) { setMsg(err.message); setDeleting(false) }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: cardBg, borderRadius: '12px', width: '100%', maxWidth: '380px', padding: '24px', border: `1px solid ${borderColor}`, boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.08)' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center border mx-auto mb-3" style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA', color: isDark ? '#FCA5A5' : '#9B1C1C' }}>
          <FontAwesomeIcon icon={faTrash} className="text-sm" />
        </div>
        <h2 className="text-sm font-semibold text-center mb-1" style={{ color: textPrimary }}>{t('attendanceForm.deleteModal.title')}</h2>
        <p className="text-xs text-center mb-4 leading-relaxed" style={{ color: textSecondary }}>
          {t('attendanceForm.deleteModal.body')} <strong className="font-mono text-stone-900 dark:text-stone-100">{excuse.attendance_date}</strong> {t('attendanceForm.deleteModal.bodySuffix')}
        </p>
        {msg && (
          <div className="mb-3 p-2 rounded-md text-xs flex items-center gap-1.5" style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', color: isDark ? '#FCA5A5' : '#9B1C1C' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>{msg}</span>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-md text-xs font-medium cursor-pointer border" style={{ background: subtleBg, borderColor, color: textPrimary }}>
            {t('attendanceForm.deleteModal.btnCancel')}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-md text-xs font-semibold cursor-pointer border border-transparent" style={{ background: '#dc2626', color: '#fff', opacity: deleting ? 0.7 : 1 }}>
            {deleting ? t('attendanceForm.deleteModal.btnDeleting') : t('attendanceForm.deleteModal.btnDelete')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Temporary Exit Modal (Khusus Form Izin Keluar Jam Kerja) ───────────────

function TemporaryExitModal({ userId, onClose, onSuccess }) {
  const { theme, isDark: themeIsDark } = useTheme()
  const isDark = themeIsDark || theme.type === 'dark' || theme.name === 'dark' || theme.cardBg?.includes('#1') || theme.cardBg?.includes('#2')

  const cardBg        = isDark ? '#18181B' : '#FFFFFF'
  const subtleBg      = isDark ? '#27272A' : '#F7F6F3'
  const borderColor   = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary   = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  const [step, setStep] = useState('confirm') // 'confirm' | 'not_returning' | 'form'
  const todayStr = new Date().toISOString().slice(0, 10)
  const [targetDate, setTargetDate]   = useState(todayStr)
  const [exitTime, setExitTime]       = useState('09:00')
  const [returnTime, setReturnTime]   = useState('13:00')
  const [category, setCategory]       = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [msg, setMsg]                 = useState('')
  const [uploadFile, setUploadFile]   = useState(null)
  const [processedFile, setProcessedFile] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [uploading, setUploading]     = useState(false)

  const categories = [
    { value: 'school_duty',         label: 'Official School Duty / Assignment' },
    { value: 'personal_family',     label: 'Family / Personal Matter' },
    { value: 'medical_appointment', label: 'Medical Appointment / Clinic' },
    { value: 'official_training',   label: 'External Training / Workshop' },
    { value: 'other',               label: 'Other' },
  ]

  const handleFileSelect = async (file) => {
    if (!file) return
    setUploadFile(file)
    setProcessedFile(null)
    if (file.type.startsWith('image/')) {
      setCompressing(true)
      try {
        const compressed = await compressImage(file)
        const named = new File([compressed], (file.name?.replace(/\.[^.]+$/, '') || 'attachment') + '.jpg', { type: 'image/jpeg' })
        setProcessedFile(named)
      } catch (err) {
        console.warn('Compression failed, using original file:', err)
        setProcessedFile(file)
      } finally {
        setCompressing(false)
      }
    } else {
      setProcessedFile(file)
    }
  }

  const fileToUpload = processedFile || uploadFile || null

  const uploadAttachment = async () => {
    if (!fileToUpload) return null
    const formData = new FormData()
    formData.append('file', fileToUpload)
    formData.append('user_id', String(userId))
    setUploading(true)
    try {
      const res  = await fetch('/api/attendance/excuses/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Upload failed')
      return json.url
    } finally { setUploading(false) }
  }

  const handleSubmit = async () => {
    if (!category) { setMsg('Please select a reason category'); return }
    if (category === 'other' && !otherReason.trim()) { setMsg('Please specify your reason'); return }
    setSubmitting(true); setMsg('')
    try {
      const attachmentUrl = fileToUpload ? await uploadAttachment() : null
      const res = await fetch('/api/attendance/excuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          excuse_type: 'temporary_exit',
          attendance_date: targetDate,
          exit_time: exitTime,
          return_time: returnTime,
          category,
          other_reason: category === 'other' ? otherReason.trim() : (otherReason.trim() || null),
          attachment_url: attachmentUrl
        })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      onSuccess()
    } catch (err) { setMsg(err.message); setSubmitting(false) }
  }

  const inputStyle = { width: '100%', background: cardBg, border: `1px solid ${borderColor}`, color: textPrimary, borderRadius: '6px', padding: '9px 12px', fontSize: '13px', outline: 'none' }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div style={{ background: cardBg, borderRadius: '12px', width: '100%', maxWidth: '480px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 32px)', boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.08)' }}>

        {/* ─── STEP 1: CONFIRMATION QUESTION ─── */}
        {step === 'confirm' && (
          <>
            {/* Header */}
            <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: textPrimary, letterSpacing: '-0.01em', margin: 0 }} className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faDoorOpen} className="text-stone-500 text-sm" />
                  <span>Temporary Exit Request</span>
                </h2>
                <p style={{ fontSize: '12px', color: textSecondary, marginTop: '2px', margin: '2px 0 0 0' }}>
                  Pre-submission Verification
                </p>
              </div>
              <button onClick={onClose} style={{ color: textSecondary, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', padding: '24px', flex: 1 }} className="space-y-4">
              <div className="text-center py-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 border shadow-xs"
                  style={{
                    background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                    borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BAE6FD',
                    color: isDark ? '#60A5FA' : '#0284C7'
                  }}
                >
                  <FontAwesomeIcon icon={faDoorOpen} className="text-lg" />
                </div>
                <h3 className="text-base font-semibold" style={{ color: textPrimary, letterSpacing: '-0.01em' }}>
                  Will you return to school on the requested date?
                </h3>
                <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: textSecondary }}>
                  Please confirm whether you will return to school before your shift ends on that day.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {/* Option 1: Yes */}
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 hover:scale-[1.01]"
                  style={{
                    background: subtleBg,
                    borderColor: borderColor,
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = isDark ? '#3B82F6' : '#2563EB'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = borderColor}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border"
                    style={{
                      background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#EDF3EC',
                      borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#D1E7DD',
                      color: isDark ? '#86EFAC' : '#16A34A'
                    }}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold" style={{ color: textPrimary }}>
                      Yes, I will return to school
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: textSecondary }}>
                      I am leaving temporarily and will return to finish my shift on that day.
                    </div>
                  </div>
                </button>

                {/* Option 2: No */}
                <button
                  type="button"
                  onClick={() => setStep('not_returning')}
                  className="w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 hover:scale-[1.01]"
                  style={{
                    background: subtleBg,
                    borderColor: borderColor,
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = isDark ? '#EF4444' : '#DC2626'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = borderColor}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border"
                    style={{
                      background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                      color: isDark ? '#FCA5A5' : '#DC2626'
                    }}
                  >
                    <FontAwesomeIcon icon={faTimesCircle} className="text-xs" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold" style={{ color: textPrimary }}>
                      No, I will not return
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: textSecondary }}>
                      I will not return, leaving early for the day, or will be absent.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px 18px', borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ width: '100%', padding: '9px 0', borderRadius: '6px', border: `1px solid ${borderColor}`, background: subtleBg, color: textSecondary, fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* ─── STEP 2: NOT RETURNING NOTICE ─── */}
        {step === 'not_returning' && (
          <>
            {/* Header */}
            <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: textPrimary, letterSpacing: '-0.01em', margin: 0 }} className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faDoorOpen} className="text-stone-500 text-sm" />
                  <span>Temporary Exit Request</span>
                </h2>
                <p style={{ fontSize: '12px', color: textSecondary, marginTop: '2px', margin: '2px 0 0 0' }}>
                  Submission Guidelines
                </p>
              </div>
              <button onClick={onClose} style={{ color: textSecondary, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }} className="space-y-4">
              <div
                className="p-4 rounded-xl border flex items-start gap-3.5"
                style={{
                  background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FCD34D',
                  color: isDark ? '#FCD34D' : '#92400E'
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FDE68A',
                    color: isDark ? '#FCD34D' : '#B45309'
                  }}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-sm" />
                </div>
                <div className="space-y-2 text-xs leading-relaxed">
                  <div className="font-bold text-sm tracking-tight" style={{ color: isDark ? '#FCD34D' : '#92400E' }}>
                    This Form is Strictly for Temporary Exits (With Return)
                  </div>
                  <p style={{ color: isDark ? '#FDE68A' : '#78350F' }}>
                    The <strong>Temporary Exit</strong> form is exclusively for staff who need to leave the school temporarily during working hours and <strong>will return to school</strong> before their shift ends.
                  </p>
                  <div
                    className="p-3 rounded-lg border text-[11.5px] space-y-1.5"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A'
                    }}
                  >
                    <div className="font-semibold text-xs" style={{ color: textPrimary }}>What you should do instead:</div>
                    <div className="flex items-start gap-1.5" style={{ color: textPrimary }}>
                      <span className="font-bold text-amber-600 dark:text-amber-400">•</span>
                      <span><strong>Leaving Early (Early Departure):</strong> Simply clock out on the attendance machine when leaving the school. You do not need to submit a Temporary Exit form.</span>
                    </div>
                    <div className="flex items-start gap-1.5" style={{ color: textPrimary }}>
                      <span className="font-bold text-amber-600 dark:text-amber-400">•</span>
                      <span><strong>Full-Day Absence:</strong> Please submit a standard Leave Request or Absence Excuse through the regular process, not a Temporary Exit form.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '8px', padding: '14px 24px 18px', borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                style={{ flex: 1, padding: '9px 0', borderRadius: '6px', border: `1px solid ${borderColor}`, background: subtleBg, color: textPrimary, fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{ flex: 1, padding: '9px 0', borderRadius: '6px', border: 'none', background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Understood
              </button>
            </div>
          </>
        )}

        {/* ─── STEP 3: TEMPORARY EXIT FORM ─── */}
        {step === 'form' && (
          <>
            {/* Header */}
            <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  className="text-xs flex items-center justify-center w-7 h-7 rounded border cursor-pointer transition-all mt-0.5"
                  style={{ borderColor, background: subtleBg, color: textSecondary }}
                  title="Back to verification"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                </button>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: textPrimary, letterSpacing: '-0.01em', margin: 0 }} className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faDoorOpen} className="text-stone-500 text-sm" />
                    <span>Temporary Exit Permission Form</span>
                  </h2>
                  <p style={{ fontSize: '12px', color: textSecondary, marginTop: '2px', margin: '2px 0 0 0' }}>
                    This submission will be forwarded to your Unit Principal & Approver for review.
                  </p>
                </div>
              </div>
              <button onClick={onClose} style={{ color: textSecondary, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1 }} className="space-y-4">
              {/* Important Notice Banner */}
              <div
                className="p-3 rounded-lg border text-xs flex items-start gap-2.5"
                style={{
                  background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FCD34D',
                  color: isDark ? '#FCD34D' : '#92400E'
                }}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-sm mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <span className="font-semibold block mb-0.5 text-xs">
                    Important: Not for Leave Early or Full-Day Absence
                  </span>
                  This form is strictly for <strong>temporary exits</strong> during work hours where you will <strong>return to school</strong>. If you are absent or leaving early for the day without returning, please do <strong>NOT</strong> use this form.
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: textSecondary }}>
                  Permission Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
              </div>

              {/* Jam Keluar & Jam Kembali */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border" style={{ background: subtleBg, borderColor }}>
                <div>
                  <label className="text-xs font-medium block mb-1 flex items-center gap-1.5" style={{ color: textSecondary }}>
                    <FontAwesomeIcon icon={faClock} className="text-[11px]" />
                    <span>Exit Time</span>
                  </label>
                  <input type="time" value={exitTime} onChange={e => setExitTime(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1 flex items-center gap-1.5" style={{ color: textSecondary }}>
                    <FontAwesomeIcon icon={faClock} className="text-[11px]" />
                    <span>Return Time</span>
                  </label>
                  <input type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
              </div>

              {/* Kategori Alasan */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: textSecondary }}>
                  Reason Category <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="space-y-1.5">
                  {categories.map(c => {
                    const isSelected = category === c.value
                    return (
                      <label key={c.value} className="flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-all"
                        style={{
                          background: isSelected ? (isDark ? '#27272A' : '#F7F6F3') : 'transparent',
                          border: `1px solid ${isSelected ? (isDark ? '#52525B' : '#111111') : borderColor}`
                        }}>
                        <input type="radio" name="temp_exit_category" value={c.value} checked={isSelected}
                          onChange={() => setCategory(c.value)} style={{ accentColor: isDark ? '#F4F4F5' : '#111111' }} />
                        <span className="text-xs font-medium" style={{ color: textPrimary }}>{c.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Keterangan Detail */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: textSecondary }}>
                  Additional Details / Description {category === 'other' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <textarea rows={2} value={otherReason} onChange={e => setOtherReason(e.target.value)}
                  placeholder="e.g. Official meeting at Education Department / Medical appointment"
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* Lampiran */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: textSecondary }}>
                  Attachment / Official Document (Optional)
                </label>
                {compressing && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-md text-xs" style={{ background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#E1F3FE', border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'}`, color: isDark ? '#93C5FD' : '#185ADB' }}>
                    <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
                    <span>Optimizing image (full size)...</span>
                  </div>
                )}
                {fileToUpload && !compressing && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-md text-xs" style={{ background: isDark ? 'rgba(34, 197, 94, 0.1)' : '#EDF3EC', border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#D1E7DD'}`, color: isDark ? '#86EFAC' : '#2A6335' }}>
                    <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />
                    <span className="font-medium">{fileToUpload.name}</span>
                    <span style={{ color: textSecondary, marginLeft: 4 }} className="font-mono">({(fileToUpload.size / 1024).toFixed(0)} KB)</span>
                    {uploadFile && uploadFile.type?.startsWith('image/') && <span style={{ color: isDark ? '#86EFAC' : '#2A6335', marginLeft: 2 }}>(Full Size)</span>}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ border: `1px dashed ${borderColor}`, background: subtleBg }}>
                      <FontAwesomeIcon icon={faPaperclip} style={{ color: textSecondary }} />
                      <span className="text-xs" style={{ color: textSecondary }}>
                        {uploadFile ? uploadFile.name : 'Click to select an image or PDF document'}
                      </span>
                    </div>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFileSelect(e.target.files[0] || null)} className="hidden" />
                  </label>
                  {uploadFile && (
                    <button onClick={() => { setUploadFile(null); setProcessedFile(null) }} className="text-xs px-2.5 py-2 rounded-md cursor-pointer border" style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA', color: isDark ? '#FCA5A5' : '#9B1C1C' }}>
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </div>
              </div>

              {msg && (
                <div className="p-2.5 rounded-md text-xs flex items-center gap-2" style={{ background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA'}`, color: isDark ? '#FCA5A5' : '#9B1C1C' }}>
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs" />
                  <span>{msg}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '8px', padding: '14px 24px 18px', borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '9px 0', borderRadius: '6px', border: `1px solid ${borderColor}`, background: subtleBg, color: textPrimary, fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting || compressing} style={{ flex: 1, padding: '9px 0', borderRadius: '6px', border: 'none', background: isDark ? '#F4F4F5' : '#111111', color: isDark ? '#111111' : '#FFFFFF', fontSize: '12px', fontWeight: 600, cursor: (submitting || compressing) ? 'default' : 'pointer', opacity: (submitting || compressing) ? 0.6 : 1 }}>
                {compressing ? 'Optimizing...' : submitting ? (uploading ? 'Uploading...' : 'Submitting...') : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AttendanceFormPage() {
  const { theme, isDark: themeIsDark } = useTheme()
  const isDark = themeIsDark || theme.type === 'dark' || theme.name === 'dark' || theme.cardBg?.includes('#1') || theme.cardBg?.includes('#2')
  const { t } = useI18n()
  const router = useRouter()

  const pageBg        = isDark ? '#09090B' : '#FAFAF9'
  const cardBg        = isDark ? '#18181B' : '#FFFFFF'
  const subtleBg      = isDark ? '#27272A' : '#F7F6F3'
  const borderColor   = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary   = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  const [userId, setUserId]           = useState(null)
  const [month, setMonth]             = useState(() => new Date().toISOString().slice(0, 7))
  const [issueRows, setIssueRows]     = useState([])
  const [excuseMap, setExcuseMap]     = useState({})
  const [submittedList, setSubmittedList] = useState([])
  const [loading, setLoading]         = useState(false)
  const [modalRecord, setModalRecord] = useState(null)
  const [deleteExcuse, setDeleteExcuse] = useState(null)
  const [isTempExitModalOpen, setIsTempExitModalOpen] = useState(false)
  const [successDate, setSuccessDate] = useState(null)
  const [leaveTypes, setLeaveTypes]   = useState([])
  const [isExemptRole, setIsExemptRole] = useState(false)

  // i18n-driven configs with minimalist pastel tokens & FontAwesome icons
  const STATUS_CONFIG = {
    pending:    { label: t('attendanceForm.statusPending'),   color: isDark ? '#FCD34D' : '#956400', bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB', icon: faHourglassHalf },
    approved_1: { label: t('attendanceForm.statusApproved1'), color: isDark ? '#93C5FD' : '#185ADB', bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', icon: faSyncAlt },
    approved:   { label: t('attendanceForm.statusApproved'),  color: isDark ? '#86EFAC' : '#2A6335', bg: isDark ? 'rgba(34, 197, 94, 0.15)' : '#EDF3EC', icon: faCheckCircle },
    rejected:   { label: t('attendanceForm.statusRejected'),  color: isDark ? '#FCA5A5' : '#9B1C1C', bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC', icon: faTimesCircle },
  }

  const ISSUE_CONFIG = {
    late:           { label: t('attendanceForm.issueLate'),        color: isDark ? '#FCD34D' : '#92400E', bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FBF3DB', icon: faClock },
    leave_early:    { label: t('attendanceForm.issueLeaveEarly'),  color: isDark ? '#FB923C' : '#9A3412', bg: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFEDD5', icon: faSignOutAlt },
    absent:         { label: t('attendanceForm.issueAbsent'),      color: isDark ? '#D8B4FE' : '#6B21A8', bg: isDark ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF', icon: faTimesCircle },
    no_checkout:    { label: t('attendanceForm.issueNoCheckout'),  color: isDark ? '#93C5FD' : '#1E40AF', bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', icon: faExclamationTriangle },
    no_checkin:     { label: t('attendanceForm.issueNoCheckin'),   color: isDark ? '#F472B6' : '#9D174D', bg: isDark ? 'rgba(236, 72, 153, 0.15)' : '#FCE7F3', icon: faExclamationCircle },
    temporary_exit: { label: 'Temporary Exit',                     color: isDark ? '#FCD34D' : '#B45309', bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', icon: faDoorOpen },
  }

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
      const { data: userRow } = await supabase.from('users').select('user_role_id').eq('user_id', uid).single()
      if (userRow?.user_role_id) {
        const { data: roleRow } = await supabase
          .from('role')
          .select('is_part_time_staff, is_vendor')
          .eq('role_id', userRow.user_role_id)
          .single()

        if (roleRow?.is_part_time_staff || roleRow?.is_vendor) {
          setIsExemptRole(true)
          setIssueRows([])
          setLoading(false)
          return
        }
      }

      setIsExemptRole(false)
      const start = monthStart(ym)
      const today     = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)
      const currentYM    = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      const end = ym === currentYM
        ? (yesterdayStr < monthEnd(ym) ? yesterdayStr : monthEnd(ym))
        : monthEnd(ym)

      const [reportRes, excusesRes] = await Promise.all([
        fetch(`/api/attendance/report?user_id=${uid}&start=${start}&end=${end}`),
        fetch(`/api/attendance/excuses?user_id=${uid}&start=${start}&end=${end}`),
      ])
      const reportJson  = await reportRes.json()
      const excusesJson = await excusesRes.json()

      const em = {}
      const submitted = excusesJson.success ? (excusesJson.data || []) : []
      setSubmittedList(submitted)

      for (const ex of submitted) {
        em[`${ex.attendance_date}_${ex.excuse_type}`] = ex
        if (!em[ex.attendance_date]) {
          em[ex.attendance_date] = ex
        }
      }
      setExcuseMap(em)

      const VALID_ISSUES = ['late', 'leave_early', 'absent', 'no_checkin', 'no_checkout']
      const rows = []
      if (reportJson.success) {
        for (const user of (reportJson.data || [])) {
          for (const day of (user.daily || [])) {
            if (day.status === 'holiday' || day.status === 'dayoff' || day.status === 'off') continue
            const dayIssues = (day.issues || []).filter(i => VALID_ISSUES.includes(i))
            for (const issue of dayIssues) {
              rows.push({
                ...day,
                issueType: issue,
                rowKey: `${day.date}_${issue}`,
              })
            }
          }
        }
      }
      rows.sort((a, b) => {
        const d = b.date.localeCompare(a.date)
        if (d !== 0) return d
        return a.issueType.localeCompare(b.issueType)
      })
      setIssueRows(rows)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (userId) loadData(userId, month) }, [userId, month, loadData])

  const handleModalSuccess = () => {
    const date = modalRecord?.record?.date || new Date().toISOString().slice(0, 10)
    setSuccessDate(date)
    setModalRecord(null)
    setIsTempExitModalOpen(false)
    loadData(userId, month)
    setTimeout(() => setSuccessDate(null), 3000)
  }

  const handleDeleteSuccess = () => { setDeleteExcuse(null); loadData(userId, month) }
  const noExcuseCount = issueRows.filter(r => !excuseMap[`${r.date}_${r.issueType}`]).length

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>

      {/* ── HEADER (Minimalist-UI, matching /data/user & /data/pyp) ─────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          {/* Subtle breadcrumb */}
          <div className="text-[10px] tracking-wider uppercase font-mono mb-1.5" style={{ color: textSecondary }}>
            WORKSPACE / HCM &amp; ATTENDANCE / ATTENDANCE FORM
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border shadow-xs" style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', borderColor: isDark ? '#2563EB' : '#BAE6FD', color: isDark ? '#60A5FA' : '#0284C7' }}>
              <FontAwesomeIcon icon={faClipboardList} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                {t('attendanceForm.pageTitle')}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                {t('attendanceForm.pageSubtitle')} <strong className="font-semibold text-stone-900 dark:text-stone-100">{t('attendanceForm.pageSubtitleAction')}</strong> {t('attendanceForm.pageSubtitleSuffix')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsTempExitModalOpen(true)}
            className="px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs border"
            style={{
              background: isDark ? '#F4F4F5' : '#111111',
              color: isDark ? '#111111' : '#FFFFFF',
              borderColor: isDark ? '#F4F4F5' : '#111111'
            }}
          >
            <FontAwesomeIcon icon={faDoorOpen} className="text-xs" />
            <span>Temporary Exit Request</span>
          </button>

          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 rounded text-xs font-mono border cursor-pointer outline-none"
            style={{
              background: cardBg,
              borderColor,
              color: textPrimary
            }}
          />
        </div>
      </div>

      {/* Summary banner */}
      {!loading && noExcuseCount > 0 && (
        <div className="p-3.5 rounded-lg flex items-center gap-2.5 text-xs mb-5 border transition-all"
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FBF3DB',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#F5E8B7',
            color: isDark ? '#FCD34D' : '#956400'
          }}>
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-sm shrink-0" />
          <div>
            {t('attendanceForm.summaryBanner')} <strong>{noExcuseCount} {t('attendanceForm.summaryBannerMid')}</strong> {t('attendanceForm.summaryBannerSuffix')}
          </div>
        </div>
      )}

      {/* Success banner */}
      {successDate && (
        <div className="p-3.5 rounded-lg flex items-center gap-2.5 text-xs mb-5 border transition-all"
          style={{
            background: isDark ? 'rgba(34, 197, 94, 0.12)' : '#EDF3EC',
            borderColor: isDark ? 'rgba(34, 197, 94, 0.25)' : '#D1E7DD',
            color: isDark ? '#86EFAC' : '#2A6335'
          }}>
          <FontAwesomeIcon icon={faCheckCircle} className="text-sm shrink-0" />
          <div>
            {t('attendanceForm.successBanner')} <strong className="font-mono">{successDate}</strong> {t('attendanceForm.successBannerSuffix')}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-xs flex flex-col items-center justify-center gap-3 font-mono" style={{ color: textSecondary }}>
          <FontAwesomeIcon icon={faSpinner} spin className="text-lg" style={{ color: textPrimary }} />
          <span>{stripEmoji(t('attendanceForm.loading'))}</span>
        </div>
      ) : isExemptRole ? (
        <div className="p-8 text-center rounded-xl border space-y-2 max-w-md mx-auto my-12"
          style={{
            background: cardBg,
            borderColor
          }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center border mx-auto mb-3"
            style={{
              background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#EDF3EC',
              borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#D1E7DD',
              color: isDark ? '#86EFAC' : '#2A6335'
            }}>
            <FontAwesomeIcon icon={faBuilding} className="text-base" />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
            Part-Time / Vendor Role
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>
            Your role is exempt from HCM forms.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Machine Anomaly Form Submissions Section */}
          {issueRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider font-mono flex items-center gap-2" style={{ color: textSecondary }}>
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-xs" />
                  <span>HCM Form(s) This Month ({issueRows.length})</span>
                </h2>
              </div>

              <div className="space-y-2">
                {issueRows.map(day => {
                  const excuse = excuseMap[`${day.date}_${day.issueType}`] || (day.issues?.length === 1 ? excuseMap[day.date] : null)
                  const st     = excuse ? STATUS_CONFIG[excuse.status] : null
                  const primaryIssue = day.issueType || ['late', 'leave_early', 'absent', 'no_checkout', 'no_checkin'].find(i => day.issues?.includes(i))
                  const ic = ISSUE_CONFIG[primaryIssue] || ISSUE_CONFIG.absent
                  const duration = primaryIssue === 'late' ? day.late_minutes : primaryIssue === 'leave_early' ? day.leave_early_minutes : null
                  const rejectedBy = excuse?.approver1_action === 'rejected' ? excuse.approver1_note || 'Approver 1' : excuse?.approver2_note || 'Approver 2'
                  const canEditDelete = excuse && excuse.status === 'pending'

                  return (
                    <div
                      key={day.rowKey || `${day.date}_${day.issueType}`}
                      className="p-3.5 rounded-lg border flex items-center justify-between gap-4 flex-wrap transition-all hover:shadow-2xs"
                      style={{
                        background: cardBg,
                        borderColor
                      }}
                    >
                      {/* Left: date + issue type */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-xs font-semibold font-mono min-w-[95px]" style={{ color: textPrimary }}>
                          {day.date}
                        </div>
                        <span className="text-xs px-2.5 py-0.5 rounded font-medium inline-flex items-center gap-1.5" style={{ background: ic.bg, color: ic.color }}>
                          <FontAwesomeIcon icon={ic.icon} className="text-[10px]" />
                          <span>{ic.label}</span>
                        </span>
                        {duration > 0 && (
                          <span className="text-xs font-semibold font-mono" style={{ color: ic.color }}>
                            +{fmtMins(duration)}
                          </span>
                        )}
                        {day.checkin_time && (
                          <span className="text-xs font-mono" style={{ color: textSecondary }}>
                            {day.checkin_time}{day.checkout_time && <span> – {day.checkout_time}</span>}
                          </span>
                        )}
                      </div>

                      {/* Right: status + actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {excuse ? (
                          <>
                            <span className="text-xs px-2.5 py-0.5 rounded font-medium inline-flex items-center gap-1.5" style={{ background: st.bg, color: st.color }}>
                              <FontAwesomeIcon icon={st.icon} className="text-[10px]" />
                              <span>{st.label}</span>
                            </span>
                            {excuse.status === 'rejected' && (
                              <span className="text-xs font-medium" style={{ color: isDark ? '#FCA5A5' : '#9B1C1C' }}>
                                ({rejectedBy})
                              </span>
                            )}
                            {canEditDelete && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setModalRecord({ record: { ...day, issueType: primaryIssue, issues: [primaryIssue] }, excuse })}
                                  className="px-2.5 py-1 rounded text-xs font-medium cursor-pointer border flex items-center gap-1.5 transition-all"
                                  style={{
                                    background: subtleBg,
                                    borderColor,
                                    color: textPrimary
                                  }}
                                >
                                  <FontAwesomeIcon icon={faPen} className="text-[10px]" style={{ color: textSecondary }} />
                                  <span>{stripEmoji(t('attendanceForm.btnEdit'))}</span>
                                </button>
                                <button
                                  onClick={() => setDeleteExcuse(excuse)}
                                  className="px-2.5 py-1 rounded text-xs font-medium cursor-pointer border flex items-center gap-1 transition-all"
                                  style={{
                                    background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FDEBEC',
                                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                                    color: isDark ? '#FCA5A5' : '#9B1C1C'
                                  }}
                                >
                                  <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => setModalRecord({ record: { ...day, issueType: primaryIssue, issues: [primaryIssue] } })}
                            className="px-3 py-1 rounded text-xs font-semibold cursor-pointer border transition-all"
                            style={{
                              background: isDark ? '#F4F4F5' : '#111111',
                              color: isDark ? '#111111' : '#FFFFFF',
                              borderColor: isDark ? '#F4F4F5' : '#111111'
                            }}
                          >
                            {stripEmoji(t('attendanceForm.btnSubmit'))}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty Anomaly State */}
          {issueRows.length === 0 && (
            <div className="py-20 text-center rounded-xl border space-y-2" style={{ background: cardBg, borderColor }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center border mx-auto mb-2"
                style={{
                  background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#EDF3EC',
                  borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#D1E7DD',
                  color: isDark ? '#86EFAC' : '#2A6335'
                }}>
                <FontAwesomeIcon icon={faCheckCircle} className="text-base" />
              </div>
              <p className="text-xs font-medium" style={{ color: textSecondary }}>
                {t('attendanceForm.noIssues')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {modalRecord && (
        <ExcuseModal record={modalRecord.record} excuse={modalRecord.excuse || null} userId={userId} leaveTypes={leaveTypes} onClose={() => setModalRecord(null)} onSuccess={handleModalSuccess} />
      )}
      {isTempExitModalOpen && (
        <TemporaryExitModal userId={userId} onClose={() => setIsTempExitModalOpen(false)} onSuccess={handleModalSuccess} />
      )}
      {deleteExcuse && (
        <DeleteConfirmModal excuse={deleteExcuse} onClose={() => setDeleteExcuse(null)} onSuccess={handleDeleteSuccess} />
      )}
    </div>
  )
}
