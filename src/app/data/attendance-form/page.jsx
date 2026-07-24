'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import Cropper from 'react-easy-crop'
import imageCompression from 'browser-image-compression'

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

// ─── Image helpers ───────────────────────────────────────────────────────────

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

async function getCroppedBlob(imageSrc, pixelCrop) {
  const img    = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width  = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.96))
}

async function compressImage(file) {
  const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.92, alwaysKeepResolution: false }
  try { return await imageCompression(file, options) } catch { return file }
}

// ─── Crop Modal ───────────────────────────────────────────────────────────────

function ImageCropModal({ src, onDone, onCancel }) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const [crop, setCrop]               = useState({ x: 0, y: 0 })
  const [zoom, setZoom]               = useState(1)
  const [croppedArea, setCroppedArea] = useState(null)
  const [applying, setApplying]       = useState(false)

  const handleCropComplete = useCallback((_, croppedAreaPixels) => { setCroppedArea(croppedAreaPixels) }, [])

  const handleApply = async () => {
    if (!croppedArea) return
    setApplying(true)
    try { const blob = await getCroppedBlob(src, croppedArea); onDone(blob) }
    finally { setApplying(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: 480, background: theme.cardBg, borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
        {/* Title */}
        <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary }}>{t('attendanceForm.cropModal.title')}</div>
          <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{t('attendanceForm.cropModal.subtitle')}</div>
        </div>
        {/* Crop area */}
        <div style={{ position: 'relative', width: '100%', height: 300, background: '#000' }}>
          <Cropper image={src} crop={crop} zoom={zoom} aspect={undefined} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={handleCropComplete} style={{ containerStyle: { borderRadius: 0 } }} />
        </div>
        {/* Zoom slider */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 6 }}>{t('attendanceForm.cropModal.zoom')} {zoom.toFixed(1)}×</div>
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: '100%', accentColor: '#2563eb' }} />
        </div>
        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: `1px solid ${theme.border}`, background: theme.subtleBg, color: theme.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t('attendanceForm.cropModal.btnCancel')}
          </button>
          <button onClick={handleApply} disabled={applying} style={{ flex: 2, padding: '9px 0', borderRadius: 9, border: 'none', background: applying ? '#9ca3af' : '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: applying ? 'default' : 'pointer' }}>
            {applying ? t('attendanceForm.cropModal.btnApplying') : t('attendanceForm.cropModal.btnApply')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Excuse Modal (Submit + Edit) ────────────────────────────────────────────

function ExcuseModal({ record, excuse, userId, leaveTypes, onClose, onSuccess }) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const isEdit = !!excuse

  const [category, setCategory]       = useState(excuse?.category || '')
  const [otherReason, setOtherReason] = useState(excuse?.other_reason || '')
  const [submitting, setSubmitting]   = useState(false)
  const [msg, setMsg]                 = useState('')
  const [uploadFile, setUploadFile]   = useState(null)
  const [processedFile, setProcessedFile] = useState(null)
  const [cropSrc, setCropSrc]         = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [quotaInfo, setQuotaInfo]     = useState(null)
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

  const issueLabel = {
    late:        t('attendanceForm.issueLate'),
    leave_early: t('attendanceForm.issueLeaveEarly'),
    absent:      t('attendanceForm.issueAbsent'),
    no_checkout: t('attendanceForm.issueNoCheckout'),
    no_checkin:  t('attendanceForm.issueNoCheckin'),
  }
  const ISSUE_CONFIG = {
    late:        { label: issueLabel.late,        color: '#92400e', bg: '#fef3c7', icon: '🕐' },
    leave_early: { label: issueLabel.leave_early,  color: '#9a3412', bg: '#ffedd5', icon: '🚪' },
    absent:      { label: issueLabel.absent,       color: '#6b21a8', bg: '#f3e8ff', icon: '❌' },
    no_checkout: { label: issueLabel.no_checkout,  color: '#1e40af', bg: '#dbeafe', icon: '⚠️' },
    no_checkin:  { label: issueLabel.no_checkin,   color: '#9d174d', bg: '#fce7f3', icon: '🔴' },
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

  const handleFileSelect = (file) => {
    if (!file) return
    setUploadFile(file)
    setProcessedFile(null)
    if (isImage(file)) { const url = URL.createObjectURL(file); setCropSrc(url) }
    else { setProcessedFile(file) }
  }

  const handleCropDone = async (blob) => {
    setCropSrc(null); setCompressing(true)
    try {
      const compressed = await compressImage(blob)
      const named = new File([compressed], (uploadFile?.name?.replace(/\.[^.]+$/, '') || 'attachment') + '.jpg', { type: 'image/jpeg' })
      setProcessedFile(named)
    } finally { setCompressing(false) }
  }

  const handleCropCancel = () => { setCropSrc(null); setUploadFile(null); setProcessedFile(null) }
  const clearFile = () => { setUploadFile(null); setProcessedFile(null); setCropSrc(null) }
  const fileToUpload = processedFile || (uploadFile && !isImage(uploadFile) ? uploadFile : null)

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
    if (cropSrc) { setMsg(t('attendanceForm.modal.errCropFirst')); return }
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
    } catch (err) { setMsg('❌ ' + err.message); setSubmitting(false) }
  }

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }
  const inputStyle = { width: '100%', background: theme.inputBg || theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody, borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none' }

  return (
    <>
    <div onClick={handleBackdrop} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div style={{ background: theme.cardBg, borderRadius: '16px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 32px)', marginTop: 'auto', marginBottom: 'auto', alignSelf: 'center' }}>
        {/* Header */}
        <div className="flex items-start justify-between" style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: theme.textPrimary }}>
              {isEdit ? t('attendanceForm.modal.titleEdit') : t('attendanceForm.modal.titleNew')}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>
              {isEdit ? t('attendanceForm.modal.subtitleEdit') : t('attendanceForm.modal.subtitleNew')}
            </p>
          </div>
          <button onClick={onClose} className="text-lg leading-none ml-3" style={{ color: theme.textSecondary }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1 }}>
          {/* Record info */}
          <div className="rounded-xl p-3 mb-4 space-y-1.5" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: ic.bg, color: ic.color }}>
                {ic.icon} {ic.label}
              </span>
              {duration > 0 && <span className="text-xs font-semibold" style={{ color: ic.color }}>+{fmtMins(duration)}</span>}
            </div>
            <div className="text-sm font-medium" style={{ color: theme.textPrimary }}>{record.date}</div>
            {record.checkin_time && (
              <div className="text-xs" style={{ color: theme.textSecondary }}>
                {t('attendanceForm.modal.labelCheckIn')} {record.checkin_time}
                {record.checkout_time && <span> · {t('attendanceForm.modal.labelCheckOut')} {record.checkout_time}</span>}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="mb-3">
            <label className="text-xs font-medium block mb-1.5" style={{ color: theme.textSecondary }}>
              {t('attendanceForm.modal.labelCause')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="space-y-1.5">
              {categories.map(c => (
                <label key={c.value} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer"
                  style={{ background: category === c.value ? (theme.blueText ? `${theme.blueText}18` : '#eff6ff') : 'transparent', border: `1px solid ${category === c.value ? (theme.blueText || '#2563eb') : theme.border}` }}>
                  <input type="radio" name="category" value={c.value} checked={category === c.value}
                    onChange={() => { setCategory(c.value); setUploadFile(null); setQuotaInfo(null); fetchQuota(c.value) }}
                    style={{ accentColor: theme.blueText || '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <span className="text-sm" style={{ color: theme.textBody }}>{c.label}</span>
                    {c.requireUpload && (
                      <span className="text-xs ml-1 px-1.5 py-0.5 rounded" style={{ background: '#fef3c7', color: '#92400e' }}>
                        📎 {t('attendanceForm.modal.mandatory')}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Quota info */}
          {quotaInfo && !quotaInfo.notFound && (
            <div className="mb-3 px-3 py-2.5 rounded-lg" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}` }}>
              {quotaLoading ? (
                <span className="text-xs" style={{ color: theme.textSecondary }}>{t('attendanceForm.modal.quotaLoading')}</span>
              ) : quotaInfo ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: theme.textSecondary }}>
                    📋 {t('attendanceForm.modal.quotaLabel')} {selectedCat?.label} · {quotaInfo.year_name}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: (quotaInfo.total_days - quotaInfo.used_days) <= 0 ? '#fee2e2' : '#dcfce7', color: (quotaInfo.total_days - quotaInfo.used_days) <= 0 ? '#991b1b' : '#166534' }}>
                    {t('attendanceForm.modal.quotaRemaining')} {quotaInfo.total_days - quotaInfo.used_days} / {quotaInfo.total_days} {t('attendanceForm.modal.quotaDays')}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* File upload */}
          {requireUpload && (
            <div className="mb-3">
              <label className="text-xs font-medium block mb-1.5" style={{ color: theme.textSecondary }}>
                {selectedCat?.uploadLabel || t('attendanceForm.modal.labelRequired')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {isEdit && excuse?.attachment_url && !uploadFile && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }}>
                  📎 <a href={excuse.attachment_url} target="_blank" rel="noreferrer" style={{ color: '#15803d', textDecoration: 'underline' }}>{t('attendanceForm.modal.attachedFile')}</a>
                  <span style={{ color: theme.textSecondary }}>{t('attendanceForm.modal.replaceHint')}</span>
                </div>
              )}
              {compressing && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}>
                  {t('attendanceForm.modal.compressing')}
                </div>
              )}
              {fileToUpload && !compressing && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }}>
                  ✅ {fileToUpload.name}
                  <span style={{ color: '#6b7280', marginLeft: 4 }}>({(fileToUpload.size / 1024).toFixed(0)} KB)</span>
                  {isImage(uploadFile) && <span style={{ color: '#15803d', marginLeft: 2 }}>{t('attendanceForm.modal.croppedBadge')}</span>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ border: `1px dashed ${theme.border}`, background: theme.subtleBg }}>
                    <span className="text-lg">📎</span>
                    <span className="text-xs" style={{ color: theme.textSecondary }}>
                      {uploadFile
                        ? (isImage(uploadFile) ? t('attendanceForm.modal.fileReplaceImage') : t('attendanceForm.modal.fileReplaceDoc'))
                        : t('attendanceForm.modal.fileHint')}
                    </span>
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => handleFileSelect(e.target.files[0] || null)} />
                </label>
                {uploadFile && <button onClick={clearFile} className="text-xs px-2 py-1 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>✕</button>}
              </div>
              <p className="text-xs mt-1.5" style={{ color: theme.textSecondary }}>{t('attendanceForm.modal.fileNote')}</p>
            </div>
          )}

          {/* Other reason */}
          {category === 'other' && (
            <div className="mb-3">
              <label className="text-xs font-medium block mb-1.5" style={{ color: theme.textSecondary }}>
                {t('attendanceForm.modal.labelOther')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea rows={3} value={otherReason} onChange={e => setOtherReason(e.target.value)}
                placeholder={t('attendanceForm.modal.placeholderReason')}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          )}

          {/* Error msg */}
          {msg && <div className="mb-3 p-2.5 rounded-lg text-sm" style={{ background: '#fef2f2', color: '#991b1b' }}>{msg}</div>}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-2" style={{ padding: '12px 24px 20px', borderTop: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium flex-1" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
            {t('attendanceForm.modal.btnCancel')}
          </button>
          <button onClick={handleSubmit} disabled={submitting || compressing} className="px-4 py-2.5 rounded-lg text-sm font-semibold flex-1"
            style={{ background: theme.blueText || '#2563eb', color: '#fff', opacity: (submitting || compressing) ? 0.7 : 1 }}>
            {compressing
              ? t('attendanceForm.modal.btnProcessing')
              : submitting
                ? (uploading ? t('attendanceForm.modal.btnUploading') : isEdit ? t('attendanceForm.modal.btnSaving') : t('attendanceForm.modal.btnSubmitting'))
                : t('attendanceForm.modal.btnSubmit')}
          </button>
        </div>
      </div>
    </div>

    {/* Crop modal */}
    {cropSrc && <ImageCropModal src={cropSrc} onDone={handleCropDone} onCancel={handleCropCancel} />}
    </>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ excuse, onClose, onSuccess }) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res  = await fetch(`/api/attendance/excuses/${excuse.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      onSuccess()
    } catch (err) { setMsg('❌ ' + err.message); setDeleting(false) }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: theme.cardBg, borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${theme.border}` }}>
        <div className="text-2xl mb-3 text-center">🗑️</div>
        <h2 className="text-base font-semibold text-center mb-1" style={{ color: theme.textPrimary }}>{t('attendanceForm.deleteModal.title')}</h2>
        <p className="text-sm text-center mb-4" style={{ color: theme.textSecondary }}>
          {t('attendanceForm.deleteModal.body')} <strong>{excuse.attendance_date}</strong> {t('attendanceForm.deleteModal.bodySuffix')}
        </p>
        {msg && <div className="mb-3 p-2.5 rounded-lg text-sm" style={{ background: '#fef2f2', color: '#991b1b' }}>{msg}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
            {t('attendanceForm.deleteModal.btnCancel')}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ background: '#dc2626', color: '#fff', opacity: deleting ? 0.7 : 1 }}>
            {deleting ? t('attendanceForm.deleteModal.btnDeleting') : t('attendanceForm.deleteModal.btnDelete')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AttendanceFormPage() {
  const { theme } = useTheme()
  const { t } = useI18n()
  const router = useRouter()

  const [userId, setUserId]           = useState(null)
  const [month, setMonth]             = useState(() => new Date().toISOString().slice(0, 7))
  const [issueRows, setIssueRows]     = useState([])
  const [excuseMap, setExcuseMap]     = useState({})
  const [loading, setLoading]         = useState(false)
  const [modalRecord, setModalRecord] = useState(null)
  const [deleteExcuse, setDeleteExcuse] = useState(null)
  const [successDate, setSuccessDate] = useState(null)
  const [leaveTypes, setLeaveTypes]   = useState([])
  const [isFlexibleRole, setIsFlexibleRole] = useState(false)

  // i18n-driven configs (computed inside render so they react to language changes)
  const STATUS_CONFIG = {
    pending:    { label: t('attendanceForm.statusPending'),   color: '#92400e', bg: '#fef3c7', icon: '⏳' },
    approved_1: { label: t('attendanceForm.statusApproved1'), color: '#1e40af', bg: '#dbeafe', icon: '🔄' },
    approved:   { label: t('attendanceForm.statusApproved'),  color: '#166534', bg: '#dcfce7', icon: '✅' },
    rejected:   { label: t('attendanceForm.statusRejected'),  color: '#991b1b', bg: '#fee2e2', icon: '❌' },
  }
  const ISSUE_CONFIG = {
    late:        { label: t('attendanceForm.issueLate'),        color: '#92400e', bg: '#fef3c7', icon: '🕐' },
    leave_early: { label: t('attendanceForm.issueLeaveEarly'),  color: '#9a3412', bg: '#ffedd5', icon: '🚪' },
    absent:      { label: t('attendanceForm.issueAbsent'),      color: '#6b21a8', bg: '#f3e8ff', icon: '❌' },
    no_checkout: { label: t('attendanceForm.issueNoCheckout'),  color: '#1e40af', bg: '#dbeafe', icon: '⚠️' },
    no_checkin:  { label: t('attendanceForm.issueNoCheckin'),   color: '#9d174d', bg: '#fce7f3', icon: '🔴' },
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
      // Check if logged in user's role is flexible hours, part-time staff, or vendor
      const { data: userRow } = await supabase.from('users').select('user_role_id').eq('user_id', uid).single()
      if (userRow?.user_role_id) {
        const { data: roleRow } = await supabase
          .from('role')
          .select('is_flexible_hours, is_part_time_staff, is_vendor')
          .eq('role_id', userRow.user_role_id)
          .single()

        if (roleRow?.is_flexible_hours || roleRow?.is_part_time_staff || roleRow?.is_vendor) {
          setIsFlexibleRole(true)
          setIssueRows([])
          setLoading(false)
          return
        }
      }

      setIsFlexibleRole(false)
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
      if (excusesJson.success) {
        for (const ex of (excusesJson.data || [])) em[ex.attendance_date] = ex
      }
      setExcuseMap(em)

      const rows = []
      if (reportJson.success) {
        for (const user of (reportJson.data || [])) {
          for (const day of (user.daily || [])) {
            if (day.status === 'holiday' || day.status === 'dayoff' || day.status === 'off') continue
            const hasIssue = day.issues?.some(i => ['late', 'leave_early', 'absent', 'no_checkin', 'no_checkout'].includes(i))
            if (hasIssue) rows.push(day)
          }
        }
      }
      rows.sort((a, b) => b.date.localeCompare(a.date))
      setIssueRows(rows)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (userId) loadData(userId, month) }, [userId, month, loadData])

  const handleModalSuccess = () => {
    const date = modalRecord?.record?.date
    setSuccessDate(date)
    setModalRecord(null)
    loadData(userId, month)
    setTimeout(() => setSuccessDate(null), 3000)
  }

  const handleDeleteSuccess = () => { setDeleteExcuse(null); loadData(userId, month) }
  const noExcuseCount = issueRows.filter(r => !excuseMap[r.date]).length
  const cardStyle = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '14px 16px' }

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: theme.textBody }}>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>
            📝 {t('attendanceForm.pageTitle')}
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
            {t('attendanceForm.pageSubtitle')} <strong>{t('attendanceForm.pageSubtitleAction')}</strong> {t('attendanceForm.pageSubtitleSuffix')}
          </p>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ background: theme.inputBg || theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody, borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }} />
      </div>

      {/* Summary banner */}
      {!loading && noExcuseCount > 0 && (
        <div className="p-3 rounded-xl flex items-center gap-3 text-sm"
          style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>
          ⚠️ {t('attendanceForm.summaryBanner')} <strong>{noExcuseCount} {t('attendanceForm.summaryBannerMid')}</strong> {t('attendanceForm.summaryBannerSuffix')}
        </div>
      )}

      {/* Success banner */}
      {successDate && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }}>
          ✅ {t('attendanceForm.successBanner')} <strong>{successDate}</strong> {t('attendanceForm.successBannerSuffix')}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-sm" style={{ color: theme.textSecondary }}>
          {t('attendanceForm.loading')}
        </div>
      ) : isFlexibleRole ? (
        <div className="p-6 text-center rounded-2xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-xl mx-auto">
            ⏰
          </div>
          <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
            Flexible Working Hours
          </h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-sm mx-auto">
            Your role is exempt from HCM forms.
          </p>
        </div>
      ) : issueRows.length === 0 ? (
        <div className="py-16 text-center" style={{ color: theme.textSecondary }}>
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-sm font-medium">{t('attendanceForm.noIssues')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {issueRows.map(day => {
            const excuse = excuseMap[day.date]
            const st     = excuse ? STATUS_CONFIG[excuse.status] : null
            const primaryIssue = ['late', 'leave_early', 'absent', 'no_checkout', 'no_checkin'].find(i => day.issues?.includes(i))
            const ic = ISSUE_CONFIG[primaryIssue] || ISSUE_CONFIG.absent
            const duration = primaryIssue === 'late' ? day.late_minutes : primaryIssue === 'leave_early' ? day.leave_early_minutes : null
            const rejectedBy = excuse?.approver1_action === 'rejected' ? excuse.approver1_note || 'Approver 1' : excuse?.approver2_note || 'Approver 2'
            const canEditDelete = excuse && excuse.status === 'pending'

            return (
              <div key={day.date} style={cardStyle} className="flex items-center justify-between gap-4 flex-wrap">
                {/* Left: date + issue type */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-sm font-semibold min-w-[90px]" style={{ color: theme.textPrimary }}>{day.date}</div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: ic.bg, color: ic.color }}>
                    {ic.icon} {ic.label}
                  </span>
                  {duration > 0 && <span className="text-xs font-semibold" style={{ color: ic.color }}>+{fmtMins(duration)}</span>}
                  {day.checkin_time && (
                    <span className="text-xs" style={{ color: theme.textSecondary }}>
                      {day.checkin_time}{day.checkout_time && <span> – {day.checkout_time}</span>}
                    </span>
                  )}
                </div>

                {/* Right: status + actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {excuse ? (
                    <>
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>
                        {st.icon} {st.label}
                      </span>
                      {excuse.status === 'rejected' && <span className="text-xs" style={{ color: '#991b1b' }}>({rejectedBy})</span>}
                      {canEditDelete && (
                        <>
                          <button onClick={() => setModalRecord({ record: { ...day, issues: [primaryIssue] }, excuse })}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                            {t('attendanceForm.btnEdit')}
                          </button>
                          <button onClick={() => setDeleteExcuse(excuse)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                            🗑️
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <button onClick={() => setModalRecord({ record: day })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: theme.blueText || '#2563eb', color: '#fff' }}>
                      {t('attendanceForm.btnSubmit')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {modalRecord && (
        <ExcuseModal record={modalRecord.record} excuse={modalRecord.excuse || null} userId={userId} leaveTypes={leaveTypes} onClose={() => setModalRecord(null)} onSuccess={handleModalSuccess} />
      )}
      {deleteExcuse && (
        <DeleteConfirmModal excuse={deleteExcuse} onClose={() => setDeleteExcuse(null)} onSuccess={handleDeleteSuccess} />
      )}
    </div>
  )
}
