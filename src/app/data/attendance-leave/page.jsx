'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faEdit,
  faTrash,
  faCheck,
  faTimes,
  faGlobe,
  faUser,
  faPaperclip,
  faCoins,
  faCalendarAlt,
  faExclamationTriangle,
  faSpinner,
  faLock,
  faSearch,
  faLayerGroup,
  faClock,
  faFileAlt,
  faInfoCircle,
  faSave
} from '@fortawesome/free-solid-svg-icons'

// ── Issue Type Definitions matching /data/pyp pastel tokens ──────────────────────
const ALL_ISSUE_TYPES = [
  { value: 'absent',      label: 'Tidak Masuk',    color: '#6B21A8', bg: '#F3E8FF', border: '#E9D5FF' },
  { value: 'late',        label: 'Terlambat',       color: '#956400', bg: '#FBF3DB', border: '#F2E3B6' },
  { value: 'leave_early', label: 'Pulang Awal',     color: '#9A3412', bg: '#FFEDD5', border: '#FED7AA' },
  { value: 'no_checkin',  label: 'Tidak Check-In',  color: '#9F2F2D', bg: '#FDEBEC', border: '#F8C9CC' },
  { value: 'no_checkout', label: 'Tidak Check-Out', color: '#1F6C9F', bg: '#E1F3FE', border: '#BAE6FD' },
]

const EMPTY_TYPE_FORM = {
  code: '',
  name_id: '',
  name_en: '',
  issue_types: ['absent'],
  max_days: '',
  is_paid: true,
  requires_upload: false,
  upload_label: '',
  sort_order: 99,
  is_active: true,
}

function fullName(u) {
  if (!u) return '—'
  return [u.user_nama_depan, u.user_nama_belakang].filter(Boolean).join(' ')
}

// ── Quota Inline Form (Matching /data/pyp input & button styles) ──────────────────
function QuotaInlineForm({ leaveTypeCode, yearId, users, onSaved, onCancel, theme, editingQuota, disableGlobal, isDark, borderColor, textPrimary, textSecondary, cardBg }) {
  const [isGlobal, setIsGlobal] = useState(editingQuota ? editingQuota.is_global : false)
  const [userId,   setUserId]   = useState(editingQuota?.user_id ? String(editingQuota.user_id) : '')
  const [days,     setDays]     = useState(editingQuota ? String(editingQuota.total_days) : '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const inputStyle = {
    background: isDark ? '#18181B' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '12px',
    outline: 'none',
  }

  const handleSave = async () => {
    if (!isGlobal && !userId) return setError('Pilih karyawan terlebih dahulu.')
    if (!days || parseInt(days, 10) < 1) return setError('Jumlah hari minimal 1.')

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/attendance/leave-quotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:         isGlobal ? null : parseInt(userId, 10),
          leave_type_code: leaveTypeCode,
          year_id:         parseInt(yearId, 10),
          total_days:      parseInt(days, 10),
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      onSaved()
    } catch (e) {
      setError(e.message || 'Gagal menyimpan alokasi kuota.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background: isDark ? '#27272A' : '#FBFBFA',
        border: `1px solid ${borderColor}`,
        borderRadius: '6px',
        padding: '10px 12px',
        margin: '6px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      {error && (
        <div
          style={{
            background: '#FDEBEC',
            borderColor: '#F8C9CC',
            color: '#9F2F2D',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: '11px' }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '12px' }}>
        {/* Global scope toggle */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            cursor: editingQuota || disableGlobal ? 'not-allowed' : 'pointer',
            opacity: editingQuota || disableGlobal ? 0.5 : 1,
            color: isGlobal ? '#6B21A8' : textSecondary
          }}
        >
          <input
            type="checkbox"
            checked={isGlobal}
            onChange={e => { setIsGlobal(e.target.checked); setUserId('') }}
            disabled={!!editingQuota || (disableGlobal && !editingQuota?.is_global)}
            style={{ accentColor: '#6B21A8', width: '13px', height: '13px' }}
          />
          <FontAwesomeIcon icon={faGlobe} style={{ fontSize: '11px' }} />
          <span>Semua Karyawan (Global)</span>
        </label>

        {disableGlobal && !editingQuota && (
          <span style={{ fontSize: '11px', color: '#B45309', fontStyle: 'italic' }}>
            (Sudah ada kuota perorangan)
          </span>
        )}

        {/* User selector */}
        {!isGlobal && (
          <select
            value={userId}
            onChange={e => setUserId(e.target.value)}
            disabled={!!editingQuota}
            style={{ ...inputStyle, minWidth: '200px', flex: 1 }}
          >
            <option value="">— Pilih Karyawan —</option>
            {users.map(u => (
              <option key={u.user_id} value={u.user_id}>
                {fullName(u)}{u.unit_name ? ` (${u.unit_name})` : ''}
              </option>
            ))}
          </select>
        )}

        {/* Days count */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="number"
            min="1"
            value={days}
            onChange={e => setDays(e.target.value)}
            style={{ ...inputStyle, width: '65px' }}
            placeholder="Hari"
          />
          <span style={{ fontSize: '12px', color: textSecondary }}>hari</span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              border: `1px solid ${borderColor}`,
              background: isDark ? '#18181B' : '#FFFFFF',
              color: textSecondary,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '5px 12px',
              borderRadius: '4px',
              background: textPrimary,
              color: isDark ? '#09090B' : '#FFFFFF',
              fontSize: '11px',
              fontWeight: 600,
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {saving && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px]" />}
            <span>{saving ? '...' : 'Simpan'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Leave Type Card (Matching /data/pyp card aesthetics) ─────────────────────────
function LeaveTypeCard({ item, index, yearId, users, onEdit, onToggleActive, toggling, theme, isDark, borderColor, textPrimary, textSecondary, cardBg, pageBg }) {
  const [quotas, setQuotas] = useState([])
  const [loadingQ, setLoadingQ] = useState(false)
  const [addingQ, setAddingQ] = useState(false)
  const [editingQ, setEditingQ] = useState(null)
  const [searchMember, setSearchMember] = useState('')

  const fetchQuotas = useCallback(async () => {
    if (!yearId) return
    setLoadingQ(true)
    try {
      const res = await fetch(`/api/attendance/leave-quotas?year_id=${yearId}&leave_type_code=${item.code}`)
      const json = await res.json()
      setQuotas(json.data || [])
    } catch {
      setQuotas([])
    } finally {
      setLoadingQ(false)
    }
  }, [yearId, item.code])

  useEffect(() => {
    fetchQuotas()
  }, [fetchQuotas])

  const deleteQuota = async (q) => {
    const label = q.is_global ? 'Global (Semua Karyawan)' : fullName(q.user)
    if (!confirm(`Hapus alokasi jatah cuti untuk ${label}?`)) return
    try {
      const res = await fetch(`/api/attendance/leave-quotas?id=${q.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) alert(json.message)
      else fetchQuotas()
    } catch (e) {
      alert(e.message)
    }
  }

  const globalQuota = quotas.find(q => q.is_global)
  const individualQuotas = quotas.filter(q => !q.is_global)

  // Mode: global | individual | unlimited
  const mode = globalQuota ? 'global' : individualQuotas.length > 0 ? 'individual' : 'unlimited'
  const canAddMore = !globalQuota && !addingQ

  const filteredIndividuals = individualQuotas.filter(q => {
    if (!searchMember.trim()) return true
    const qName = fullName(q.user).toLowerCase()
    const qUnit = (q.user?.unit?.unit_name || '').toLowerCase()
    const term = searchMember.toLowerCase()
    return qName.includes(term) || qUnit.includes(term)
  })

  return (
    <div
      style={{
        background: isDark ? '#18181B' : '#FFFFFF',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        opacity: item.is_active ? 1 : 0.65,
        transition: 'all 0.15s ease'
      }}
    >
      {/* ── Top Header Row: Index, Code, Badges & Actions ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Index Badge */}
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: isDark ? '#27272A' : '#EAEAEA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: textSecondary,
                flexShrink: 0
              }}
            >
              {index + 1}
            </span>

            {/* Code Badge */}
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '4px',
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                color: isDark ? '#60A5FA' : '#1F6C9F',
                fontFamily: 'monospace'
              }}
            >
              {item.code}
            </span>

            {/* Paid Badge */}
            {item.is_paid && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#EDF3EC',
                  border: '1px solid #D5E6D3',
                  color: '#346538',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Cuti Berbayar"
              >
                <FontAwesomeIcon icon={faCoins} style={{ fontSize: '10px' }} />
                <span>Berbayar</span>
              </span>
            )}

            {/* Doc Upload Badge */}
            {item.requires_upload && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#E1F3FE',
                  border: '1px solid #BAE6FD',
                  color: '#1F6C9F',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={item.upload_label || 'Wajib melampirkan dokumen'}
              >
                <FontAwesomeIcon icon={faPaperclip} style={{ fontSize: '10px' }} />
                <span>Wajib Dokumen</span>
              </span>
            )}

            {/* Max Days Badge */}
            {item.max_days && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#FBF3DB',
                  border: '1px solid #F2E3B6',
                  color: '#956400'
                }}
              >
                Maks. {item.max_days} Hari
              </span>
            )}
          </div>

          {/* Name Titles */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: textPrimary, margin: 0, letterSpacing: '-0.01em' }}>
              {item.name_id}
            </h3>
            <span style={{ fontSize: '12px', color: textSecondary, fontWeight: 500 }}>
              ({item.name_en})
            </span>
          </div>
        </div>

        {/* Right Actions: Active Toggle & Edit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => onToggleActive(item)}
            disabled={toggling === item.id}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: item.is_active ? '#EDF3EC' : '#FDEBEC',
              color: item.is_active ? '#346538' : '#9F2F2D',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FontAwesomeIcon icon={item.is_active ? faCheck : faTimes} style={{ fontSize: '10px' }} />
            <span>{item.is_active ? 'Aktif' : 'Nonaktif'}</span>
          </button>

          <button
            onClick={() => onEdit(item)}
            style={{
              padding: '5px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: isDark ? '#27272A' : '#FFFFFF',
              color: textPrimary,
              border: `1px solid ${borderColor}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faEdit} style={{ fontSize: '11px', color: textSecondary }} />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* ── Applicable Issue Types Badges ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: textSecondary, fontWeight: 600, marginRight: '4px' }}>
          Berlaku untuk:
        </span>
        {(item.issue_types || []).map(it => {
          const cfg = ALL_ISSUE_TYPES.find(x => x.value === it)
          return cfg ? (
            <span
              key={it}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                color: cfg.color
              }}
            >
              {cfg.label}
            </span>
          ) : null
        })}
      </div>

      {/* ── Quota & Staff Allocation Section ── */}
      <div
        style={{
          borderTop: `1px solid ${borderColor}`,
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              Jatah Cuti
            </span>

            {/* Mode Badge */}
            {mode === 'global' && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#EDE9FE',
                  border: '1px solid #DDD6FE',
                  color: '#6D28D9',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FontAwesomeIcon icon={faGlobe} style={{ fontSize: '9px' }} />
                <span>Global ({globalQuota.total_days} Hari)</span>
              </span>
            )}
            {mode === 'individual' && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#E1F3FE',
                  border: '1px solid #BAE6FD',
                  color: '#1F6C9F',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FontAwesomeIcon icon={faUser} style={{ fontSize: '9px' }} />
                <span>Per Orang ({individualQuotas.length} Karyawan)</span>
              </span>
            )}
            {mode === 'unlimited' && (
              <span style={{ fontSize: '11px', color: textSecondary, fontStyle: 'italic' }}>
                (Tidak terbatas / tanpa kuota)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Search filter for long employee lists */}
            {mode === 'individual' && individualQuotas.length > 4 && (
              <input
                type="text"
                placeholder="Cari staf..."
                value={searchMember}
                onChange={e => setSearchMember(e.target.value)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: `1px solid ${borderColor}`,
                  background: isDark ? '#27272A' : '#FFFFFF',
                  color: textPrimary,
                  width: '120px',
                  outline: 'none'
                }}
              />
            )}

            {/* Add Quota Button */}
            {yearId && canAddMore && (
              <button
                onClick={() => { setAddingQ(true); setEditingQ(null) }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isDark ? '#27272A' : '#FFFFFF',
                  color: textPrimary,
                  border: `1px solid ${borderColor}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: '9px' }} />
                <span>Tambah Jatah</span>
              </button>
            )}

            {mode === 'global' && (
              <span style={{ fontSize: '11px', color: '#7C3AED', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <FontAwesomeIcon icon={faLock} style={{ fontSize: '9px' }} />
                <span>Hapus global untuk mode perorangan</span>
              </span>
            )}
          </div>
        </div>

        {/* Quota Content Display */}
        {loadingQ ? (
          <div style={{ fontSize: '12px', color: textSecondary, padding: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
            <span>Memuat data jatah cuti...</span>
          </div>
        ) : mode === 'unlimited' && !addingQ ? (
          <p style={{ fontSize: '12px', color: textSecondary, margin: 0, padding: '2px 0' }}>
            Semua staf dapat mengajukan jenis ijin ini tanpa batasan jatah tahunan.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Global quota banner */}
            {globalQuota && (
              editingQ?.id === globalQuota.id ? (
                <QuotaInlineForm
                  key="global-edit"
                  leaveTypeCode={item.code}
                  yearId={yearId}
                  users={users}
                  theme={theme}
                  editingQuota={editingQ}
                  disableGlobal={false}
                  isDark={isDark}
                  borderColor={borderColor}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  cardBg={cardBg}
                  onSaved={() => { setEditingQ(null); fetchQuotas() }}
                  onCancel={() => setEditingQ(null)}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #DDD6FE',
                    background: isDark ? 'rgba(109, 40, 217, 0.15)' : '#F5F3FF',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FontAwesomeIcon icon={faGlobe} style={{ color: '#7C3AED' }} />
                    <span style={{ fontWeight: 700, color: isDark ? '#DDD6FE' : '#5B21B6' }}>
                      Seluruh Karyawan / Staf
                    </span>
                    <span style={{ color: isDark ? '#C4B5FD' : '#6D28D9' }}>
                      — Alokasi: <strong>{globalQuota.total_days} hari</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => { setEditingQ(globalQuota); setAddingQ(false) }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${borderColor}`,
                        background: isDark ? '#18181B' : '#FFFFFF',
                        color: textPrimary,
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteQuota(globalQuota)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #F8C9CC',
                        background: '#FDEBEC',
                        color: '#9F2F2D',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Individual Quota Table */}
            {individualQuotas.length > 0 && (
              <div
                style={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  overflow: 'hidden',
                  background: isDark ? '#18181B' : '#FFFFFF'
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '5fr 3fr 2fr 2fr',
                    padding: '6px 12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: textSecondary,
                    borderBottom: `1px solid ${borderColor}`,
                    background: isDark ? '#27272A' : '#FBFBFA'
                  }}
                >
                  <div>Karyawan</div>
                  <div style={{ textAlign: 'center' }}>Unit</div>
                  <div style={{ textAlign: 'center' }}>Alokasi</div>
                  <div style={{ textAlign: 'right' }}>Aksi</div>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {filteredIndividuals.map(q => (
                    editingQ?.id === q.id ? (
                      <div key={`edit-${q.id}`} style={{ padding: '8px' }}>
                        <QuotaInlineForm
                          leaveTypeCode={item.code}
                          yearId={yearId}
                          users={users}
                          theme={theme}
                          editingQuota={editingQ}
                          disableGlobal={individualQuotas.length > 0}
                          isDark={isDark}
                          borderColor={borderColor}
                          textPrimary={textPrimary}
                          textSecondary={textSecondary}
                          cardBg={cardBg}
                          onSaved={() => { setEditingQ(null); fetchQuotas() }}
                          onCancel={() => setEditingQ(null)}
                        />
                      </div>
                    ) : (
                      <div
                        key={q.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '5fr 3fr 2fr 2fr',
                          alignItems: 'center',
                          padding: '7px 12px',
                          fontSize: '12px',
                          borderBottom: `1px solid ${borderColor}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, paddingRight: '8px' }}>
                          <FontAwesomeIcon icon={faUser} style={{ fontSize: '10px', color: textSecondary, flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {fullName(q.user)}
                          </span>
                        </div>

                        <div style={{ textAlign: 'center', fontSize: '11px', color: textSecondary }}>
                          {q.user?.unit?.unit_name || '—'}
                        </div>

                        <div style={{ textAlign: 'center', fontWeight: 700, color: textPrimary }}>
                          {q.total_days} hr
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => { setEditingQ(q); setAddingQ(false) }}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: `1px solid ${borderColor}`,
                              background: isDark ? '#27272A' : '#FFFFFF',
                              color: textSecondary,
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteQuota(q)}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #F8C9CC',
                              background: '#FDEBEC',
                              color: '#9F2F2D',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    )
                  ))}
                  {filteredIndividuals.length === 0 && (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: textSecondary, fontStyle: 'italic' }}>
                      Tidak ada karyawan yang cocok dengan pencarian.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inline add form */}
            {addingQ && (
              <QuotaInlineForm
                key="add-new"
                leaveTypeCode={item.code}
                yearId={yearId}
                users={users}
                theme={theme}
                editingQuota={null}
                disableGlobal={individualQuotas.length > 0}
                isDark={isDark}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                cardBg={cardBg}
                onSaved={() => { setAddingQ(false); fetchQuotas() }}
                onCancel={() => setAddingQ(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page (Matching /data/pyp design system & layout) ─────────────────────────
export default function AttendanceLeavePage() {
  const { theme, isDark } = useTheme()

  // UI Theme Tokens matching /data/pyp
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  const isAdmin = useMemo(() => {
    try {
      return !!JSON.parse(localStorage.getItem('user_data') || '{}')?.isAdmin
    } catch {
      return false
    }
  }, [])

  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeModal, setTypeModal] = useState(null)
  const [toggling, setToggling] = useState(null)
  const [years, setYears] = useState([])
  const [users, setUsers] = useState([])
  const [selectedYear, setSelectedYear] = useState('')
  const [savingModal, setSavingModal] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalForm, setModalForm] = useState({ ...EMPTY_TYPE_FORM })
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })

  // Load leave types
  const fetchTypes = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('leave_types')
        .select('*')
        .order('sort_order')
        .order('name_id')
      setTypes(data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const [{ data: yData }, { data: uData }, { data: unitData }] = await Promise.all([
        supabase
          .from('year')
          .select('year_id, year_name, start_date, end_date')
          .order('start_date', { ascending: false }),
        supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang, user_unit_id')
          .eq('is_active', true)
          .order('user_nama_depan'),
        supabase
          .from('unit')
          .select('unit_id, unit_name'),
      ])
      const unitMap = Object.fromEntries((unitData || []).map(u => [u.unit_id, u.unit_name]))
      setYears(yData || [])
      setUsers((uData || []).map(u => ({ ...u, unit_name: unitMap[u.user_unit_id] || '—' })))

      // Automatically select currently active academic year (start_date <= today <= end_date)
      const todayStr = new Date().toISOString().split('T')[0]
      const currentActiveYear = (yData || []).find(y => {
        if (!y.start_date || !y.end_date) return false
        return todayStr >= y.start_date && todayStr <= y.end_date
      })
      const targetYear = currentActiveYear || (yData || [])[0]
      if (targetYear) {
        setSelectedYear(String(targetYear.year_id))
      }
    }
    load()
    fetchTypes()
  }, [fetchTypes])

  const toggleActive = async (item) => {
    setToggling(item.id)
    try {
      await supabase
        .from('leave_types')
        .update({ is_active: !item.is_active })
        .eq('id', item.id)
      setTypes(prev => prev.map(i => (i.id === item.id ? { ...i, is_active: !i.is_active } : i)))
    } finally {
      setToggling(null)
    }
  }

  // Open Add/Edit Modal
  const handleOpenModal = (item = null) => {
    if (item) {
      setModalForm({
        ...item,
        max_days: item.max_days ?? '',
        issue_types: item.issue_types || ['absent'],
        upload_label: item.upload_label ?? '',
      })
      setTypeModal(item)
    } else {
      setModalForm({ ...EMPTY_TYPE_FORM })
      setTypeModal('add')
    }
    setModalError('')
  }

  const handleSaveModal = async () => {
    if (!modalForm.code.trim()) return setModalError('Kode jenis ijin wajib diisi.')
    if (!modalForm.name_id.trim()) return setModalError('Nama (Indonesia) wajib diisi.')
    if (!modalForm.name_en.trim()) return setModalError('Nama (English) wajib diisi.')
    if (!modalForm.issue_types.length) return setModalError('Pilih minimal 1 tipe issue.')

    setSavingModal(true)
    setModalError('')
    try {
      const payload = {
        code: modalForm.code.trim(),
        name_id: modalForm.name_id.trim(),
        name_en: modalForm.name_en.trim(),
        issue_types: modalForm.issue_types,
        max_days: modalForm.max_days !== '' ? parseInt(modalForm.max_days, 10) : null,
        is_paid: modalForm.is_paid,
        requires_upload: modalForm.requires_upload,
        upload_label: modalForm.requires_upload ? (modalForm.upload_label.trim() || null) : null,
        sort_order: parseInt(modalForm.sort_order, 10) || 99,
        is_active: modalForm.is_active,
      }

      let err
      if (typeModal && typeModal !== 'add' && typeModal.id) {
        ;({ error: err } = await supabase.from('leave_types').update(payload).eq('id', typeModal.id))
      } else {
        ;({ error: err } = await supabase.from('leave_types').insert([payload]))
      }

      if (err) throw err

      setTypeModal(null)
      fetchTypes()
      setNotif({
        isOpen: true,
        title: 'Berhasil',
        message: typeModal !== 'add' ? 'Data jenis ijin berhasil diperbarui.' : 'Jenis ijin baru berhasil ditambahkan.',
        type: 'success'
      })
    } catch (e) {
      setModalError(e.message || 'Gagal menyimpan jenis ijin.')
    } finally {
      setSavingModal(false)
    }
  }

  // Filter and search
  const filteredTypes = useMemo(() => {
    return types.filter(i => {
      const matchesType = typeFilter === 'all' || i.issue_types?.includes(typeFilter)
      if (!matchesType) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        i.code?.toLowerCase().includes(q) ||
        i.name_id?.toLowerCase().includes(q) ||
        i.name_en?.toLowerCase().includes(q)
      )
    })
  }, [types, typeFilter, searchQuery])

  const selectedYearObj = years.find(y => String(y.year_id) === selectedYear)

  if (!isAdmin) {
    return (
      <div style={{ background: pageBg, minHeight: '100vh', padding: '32px' }}>
        <div
          style={{
            background: '#FDEBEC',
            border: '1px solid #F8C9CC',
            borderRadius: '8px',
            padding: '20px',
            color: '#9F2F2D',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <FontAwesomeIcon icon={faLock} />
          <span>Akses ditolak — halaman konfigurasi jatah cuti hanya dapat diakses oleh Administrator.</span>
        </div>
      </div>
    )
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
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[LEAVE &amp; QUOTA CONFIG]</span>
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
              <FontAwesomeIcon icon={faCalendarAlt} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Leave Types &amp; Quota Configuration
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Kelola jenis ijin, persyaratan lampiran surat, dan alokasi jatah cuti tahunan staf per tahun ajaran.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACADEMIC YEAR & SEARCH FILTER BAR (MATCHING /data/pyp) ──────────── */}
      <div
        className="p-3.5 rounded border mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ background: cardBg, borderColor, borderRadius: '8px' }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          {/* Academic Year */}
          <div style={{ minWidth: '220px' }}>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              1. Academic Year *
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
              style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
            >
              <option value="">Select Academic Year</option>
              {years.map(y => (
                <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
              ))}
            </select>
          </div>

          {/* Search Query */}
          <div style={{ minWidth: '260px' }}>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
              2. Search Type / Code
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari kode atau nama jenis ijin..."
                className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: textSecondary }} />
            </div>
          </div>
        </div>

        {/* Add Leave Type Button */}
        <div>
          <Button
            onClick={() => handleOpenModal()}
            style={{
              background: textPrimary,
              color: isDark ? '#09090B' : '#FFFFFF',
              fontSize: '12px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-1.5" /> Tambah Jenis Ijin
          </Button>
        </div>
      </div>

      {/* ── TABS NAVIGATION (MATCHING /data/pyp HORIZONTAL TABS) ───────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '24px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Semua Kategori', icon: faLayerGroup, count: types.length },
          { key: 'absent', label: 'Tidak Masuk', icon: faCalendarAlt, count: types.filter(t => t.issue_types?.includes('absent')).length },
          { key: 'late', label: 'Terlambat', icon: faClock, count: types.filter(t => t.issue_types?.includes('late')).length },
          { key: 'leave_early', label: 'Pulang Awal', icon: faClock, count: types.filter(t => t.issue_types?.includes('leave_early')).length },
          { key: 'no_checkin', label: 'Tidak Check-In', icon: faTimes, count: types.filter(t => t.issue_types?.includes('no_checkin')).length },
          { key: 'no_checkout', label: 'Tidak Check-Out', icon: faTimes, count: types.filter(t => t.issue_types?.includes('no_checkout')).length },
        ].map(tab => {
          const isActive = typeFilter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
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
              <FontAwesomeIcon icon={tab.icon} style={{ fontSize: '13px' }} />
              <span>{tab.label}</span>
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

      {/* ── LEAVE TYPE CARDS LIST ─────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '64px 0', textAlign: 'center', color: textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
          <span style={{ fontSize: '13px' }}>Memuat data konfigurasi jenis ijin...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredTypes.map((item, idx) => (
            <LeaveTypeCard
              key={item.id}
              item={item}
              index={idx}
              yearId={selectedYear}
              users={users}
              onEdit={handleOpenModal}
              onToggleActive={toggleActive}
              toggling={toggling}
              theme={theme}
              isDark={isDark}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              cardBg={cardBg}
              pageBg={pageBg}
            />
          ))}

          {filteredTypes.length === 0 && (
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
                gap: '10px'
              }}
            >
              <FontAwesomeIcon icon={faFileAlt} style={{ fontSize: '28px', color: textSecondary }} />
              <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
                {searchQuery || typeFilter !== 'all'
                  ? 'Tidak ada jenis ijin yang cocok dengan kriteria pencarian atau filter.'
                  : 'Belum ada jenis ijin yang terdaftar.'}
              </p>
              {!searchQuery && typeFilter === 'all' && (
                <Button
                  onClick={() => handleOpenModal()}
                  style={{
                    background: textPrimary,
                    color: isDark ? '#09090B' : '#FFFFFF',
                    fontSize: '12px',
                    marginTop: '8px'
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-1.5" /> Tambah Jenis Ijin
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT LEAVE TYPE (USING @/components/ui/modal) ─── */}
      {typeModal && (
        <Modal
          isOpen={!!typeModal}
          onClose={() => setTypeModal(null)}
          disableBackdropClose={true}
          title={typeModal !== 'add' ? `Edit Jenis Ijin: ${typeModal.name_id}` : 'Tambah Jenis Ijin Baru'}
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {modalError && (
              <div
                style={{
                  background: '#FDEBEC',
                  border: '1px solid #F8C9CC',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#9F2F2D',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{modalError}</span>
              </div>
            )}

            {/* System Code */}
            <div>
              <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
                Kode Sistem * <span style={{ fontWeight: 400 }}>(Hanya huruf kecil, angka, dan underscore)</span>
              </label>
              <input
                type="text"
                readOnly={typeModal !== 'add'}
                value={modalForm.code}
                onChange={e => setModalForm(p => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                placeholder="contoh: annual_leave / duty_school"
                className="w-full px-3 py-2 text-xs font-mono rounded border outline-none"
                style={{
                  background: isDark ? '#18181B' : '#FFFFFF',
                  borderColor,
                  color: textPrimary,
                  opacity: typeModal !== 'add' ? 0.65 : 1
                }}
              />
            </div>

            {/* Indonesian & English Names */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
                  Nama (Indonesia) *
                </label>
                <input
                  type="text"
                  value={modalForm.name_id}
                  onChange={e => setModalForm(p => ({ ...p, name_id: e.target.value }))}
                  placeholder="Cuti Tahunan"
                  className="w-full px-3 py-2 text-xs rounded border outline-none"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary }}
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
                  Nama (English) *
                </label>
                <input
                  type="text"
                  value={modalForm.name_en}
                  onChange={e => setModalForm(p => ({ ...p, name_en: e.target.value }))}
                  placeholder="Annual Leave"
                  className="w-full px-3 py-2 text-xs rounded border outline-none"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary }}
                />
              </div>
            </div>

            {/* Applicable Issue Types */}
            <div>
              <label className="text-[10px] font-mono uppercase block mb-1.5 font-bold" style={{ color: textSecondary }}>
                Berlaku Untuk Tipe Issue *
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ALL_ISSUE_TYPES.map(it => {
                  const active = modalForm.issue_types.includes(it.value)
                  return (
                    <button
                      key={it.value}
                      type="button"
                      onClick={() => {
                        setModalForm(prev => ({
                          ...prev,
                          issue_types: prev.issue_types.includes(it.value)
                            ? prev.issue_types.filter(v => v !== it.value)
                            : [...prev.issue_types, it.value]
                        }))
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: active ? it.bg : (isDark ? '#27272A' : '#FBFBFA'),
                        color: active ? it.color : textSecondary,
                        border: `1px solid ${active ? it.border : borderColor}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {active && <FontAwesomeIcon icon={faCheck} style={{ fontSize: '9px' }} />}
                      <span>{it.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Max Days & Sort Order */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
                  Maks. Hari per Pengajuan
                </label>
                <input
                  type="number"
                  min="1"
                  value={modalForm.max_days}
                  onChange={e => setModalForm(p => ({ ...p, max_days: e.target.value }))}
                  placeholder="Kosongkan jika tak terbatas"
                  className="w-full px-3 py-2 text-xs rounded border outline-none"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary }}
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
                  Urutan Tampil (Sort Order)
                </label>
                <input
                  type="number"
                  min="1"
                  value={modalForm.sort_order}
                  onChange={e => setModalForm(p => ({ ...p, sort_order: e.target.value }))}
                  placeholder="99"
                  className="w-full px-3 py-2 text-xs rounded border outline-none"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary }}
                />
              </div>
            </div>

            {/* Checkboxes: Document, Paid, Active */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {[
                { key: 'requires_upload', label: 'Wajib Dokumen', icon: faPaperclip },
                { key: 'is_paid',         label: 'Cuti Berbayar', icon: faCoins },
                { key: 'is_active',       label: 'Status Aktif',  icon: faCheck },
              ].map(flag => (
                <label
                  key={flag.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${borderColor}`,
                    background: modalForm[flag.key] ? (isDark ? '#27272A' : '#FBFBFA') : (isDark ? '#18181B' : '#FFFFFF'),
                    fontSize: '12px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!modalForm[flag.key]}
                    onChange={e => setModalForm(p => ({ ...p, [flag.key]: e.target.checked }))}
                    style={{ accentColor: '#111827', width: '14px', height: '14px' }}
                  />
                  <FontAwesomeIcon icon={flag.icon} style={{ fontSize: '11px', color: textSecondary }} />
                  <span style={{ fontWeight: 600, color: textPrimary }}>{flag.label}</span>
                </label>
              ))}
            </div>

            {/* Upload guide label */}
            {modalForm.requires_upload && (
              <div>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
                  Petunjuk Lampiran Dokumen
                </label>
                <input
                  type="text"
                  value={modalForm.upload_label}
                  onChange={e => setModalForm(p => ({ ...p, upload_label: e.target.value }))}
                  placeholder="contoh: Lampirkan surat keterangan dokter resmi"
                  className="w-full px-3 py-2 text-xs rounded border outline-none"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary }}
                />
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px', paddingTop: '14px', borderTop: `1px solid ${borderColor}` }}>
              <Button
                variant="outline"
                onClick={() => setTypeModal(null)}
                style={{ fontSize: '12px' }}
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveModal}
                disabled={savingModal}
                style={{
                  background: textPrimary,
                  color: isDark ? '#09090B' : '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                {savingModal && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1.5" />}
                <span>{savingModal ? 'Menyimpan...' : typeModal !== 'add' ? 'Simpan Perubahan' : 'Tambah Jenis Ijin'}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── NOTIFICATION MODAL (MATCHING /data/pyp) ───────────────────────── */}
      <NotificationModal
        isOpen={notif.isOpen}
        onClose={() => setNotif(prev => ({ ...prev, isOpen: false }))}
        title={notif.title}
        message={notif.message}
        type={notif.type}
      />
    </div>
  )
}
