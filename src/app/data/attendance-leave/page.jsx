'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

// ── Constants ──────────────────────────────────────────────────────────────────
const ALL_ISSUE_TYPES = [
  { value: 'absent',      label: 'Tidak Masuk',    color: '#6b21a8', bg: '#f3e8ff' },
  { value: 'late',        label: 'Terlambat',       color: '#92400e', bg: '#fef3c7' },
  { value: 'leave_early', label: 'Pulang Awal',     color: '#9a3412', bg: '#ffedd5' },
  { value: 'no_checkin',  label: 'Tidak Check-In',  color: '#9d174d', bg: '#fce7f3' },
  { value: 'no_checkout', label: 'Tidak Check-Out', color: '#1e40af', bg: '#dbeafe' },
]

const EMPTY_TYPE_FORM = {
  code: '', name_id: '', name_en: '',
  issue_types: ['absent'], max_days: '',
  is_paid: true, requires_upload: false, upload_label: '',
  sort_order: 99, is_active: true,
}

function fullName(u) {
  if (!u) return '—'
  return [u.user_nama_depan, u.user_nama_belakang].filter(Boolean).join(' ')
}

// ── Leave Type Modal ───────────────────────────────────────────────────────────
function LeaveTypeModal({ item, onClose, onSaved, theme }) {
  const [form, setForm] = useState(item
    ? { ...item, max_days: item.max_days ?? '', issue_types: item.issue_types || ['absent'], upload_label: item.upload_label ?? '' }
    : { ...EMPTY_TYPE_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const inp = { background: theme.inputBg || theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody, borderRadius: 8, padding: '8px 12px', fontSize: 14, width: '100%' }
  const lbl = { color: theme.textSecondary, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }

  const toggle = (val) => setForm(p => ({
    ...p, issue_types: p.issue_types.includes(val)
      ? p.issue_types.filter(v => v !== val)
      : [...p.issue_types, val]
  }))

  const handleSave = async () => {
    if (!form.code.trim())    return setError('Code wajib diisi')
    if (!form.name_id.trim()) return setError('Nama (ID) wajib diisi')
    if (!form.name_en.trim()) return setError('Nama (EN) wajib diisi')
    if (!form.issue_types.length) return setError('Pilih minimal 1 tipe issue')
    setSaving(true); setError('')
    try {
      const payload = {
        code: form.code.trim(), name_id: form.name_id.trim(), name_en: form.name_en.trim(),
        issue_types: form.issue_types,
        max_days: form.max_days !== '' ? parseInt(form.max_days) : null,
        is_paid: form.is_paid,
        requires_upload: form.requires_upload,
        upload_label: form.requires_upload ? (form.upload_label.trim() || null) : null,
        sort_order: parseInt(form.sort_order) || 99, is_active: form.is_active,
      }
      let err
      if (item?.id) { ;({ error: err } = await supabase.from('leave_types').update(payload).eq('id', item.id)) }
      else          { ;({ error: err } = await supabase.from('leave_types').insert([payload])) }
      if (err) throw err
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: theme.cardBg, borderRadius: 16, width: '100%', maxWidth: 540, border: `1px solid ${theme.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 32px)' }}>
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: theme.textPrimary, margin: 0 }}>{item ? '✏️ Edit Jenis Ijin' : '➕ Tambah Jenis Ijin'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: theme.textSecondary }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Code <span style={{ color: '#ef4444' }}>*</span> <span style={{ fontWeight: 400, fontSize: 11 }}>(huruf kecil & underscore, tidak bisa diubah)</span></label>
            <input style={{ ...inp, opacity: item ? 0.6 : 1 }} value={form.code} readOnly={!!item}
              onChange={e => setForm(p => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
              placeholder="contoh: annual_leave" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Nama (Indonesia) <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inp} value={form.name_id} onChange={e => setForm(p => ({ ...p, name_id: e.target.value }))} placeholder="Cuti Tahunan" />
            </div>
            <div>
              <label style={lbl}>Nama (English) <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inp} value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Annual Leave" />
            </div>
          </div>
          <div>
            <label style={lbl}>Berlaku untuk issue <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_ISSUE_TYPES.map(it => {
                const active = form.issue_types.includes(it.value)
                return (
                  <button key={it.value} type="button" onClick={() => toggle(it.value)}
                    style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: active ? it.bg : theme.subtleBg, color: active ? it.color : theme.textSecondary, border: `1px solid ${active ? it.color + '44' : theme.border}` }}>
                    {it.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Maks. Hari per Pengajuan <span style={{ fontSize: 11, fontWeight: 400 }}>(kosong = tak terbatas)</span></label>
              <input type="number" min="1" style={inp} value={form.max_days} placeholder="contoh: 3"
                onChange={e => setForm(p => ({ ...p, max_days: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Urutan Tampil</label>
              <input type="number" min="1" style={inp} value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { key: 'requires_upload', label: '📎 Wajib Upload Dokumen' },
              { key: 'is_paid',         label: '💰 Cuti Berbayar' },
              { key: 'is_active',       label: '✅ Aktif' },
            ].map(flag => (
              <label key={flag.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.subtleBg }}>
                <input type="checkbox" checked={!!form[flag.key]} onChange={e => setForm(p => ({ ...p, [flag.key]: e.target.checked }))} style={{ accentColor: '#2563eb', width: 15, height: 15 }} />
                <span style={{ fontSize: 13, color: theme.textBody }}>{flag.label}</span>
              </label>
            ))}
          </div>
          {form.requires_upload && (
            <div>
              <label style={lbl}>Teks Panduan Upload</label>
              <input style={inp} value={form.upload_label}
                onChange={e => setForm(p => ({ ...p, upload_label: e.target.value }))}
                placeholder="contoh: Upload surat dokter (wajib)" />
            </div>
          )}
          {error && <div style={{ background: '#fef2f2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: '12px 24px 20px', borderTop: `1px solid ${theme.border}`, flexShrink: 0, display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, fontSize: 14, border: `1px solid ${theme.border}`, background: theme.subtleBg, color: theme.textSecondary, cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 10, borderRadius: 8, fontSize: 14, fontWeight: 700, background: '#2563eb', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Menyimpan...' : item ? 'Update' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Quota Inline Form ──────────────────────────────────────────────────────────
function QuotaInlineForm({ leaveTypeCode, yearId, users, onSaved, onCancel, theme, editingQuota, disableGlobal }) {
  const [isGlobal, setIsGlobal]   = useState(editingQuota ? editingQuota.is_global : false)
  const [userId,   setUserId]     = useState(editingQuota?.user_id ? String(editingQuota.user_id) : '')
  const [days,     setDays]       = useState(editingQuota ? String(editingQuota.total_days) : '')
  const [saving,   setSaving]     = useState(false)
  const [error,    setError]      = useState('')

  const inp = { background: theme.inputBg || theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody, borderRadius: 7, padding: '6px 10px', fontSize: 13, width: '100%' }

  const handleSave = async () => {
    if (!isGlobal && !userId) return setError('Pilih karyawan')
    if (!days || parseInt(days) < 1) return setError('Hari minimal 1')
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/attendance/leave-quotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:         isGlobal ? null : parseInt(userId),
          leave_type_code: leaveTypeCode,
          year_id:         parseInt(yearId),
          total_days:      parseInt(days),
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      onSaved()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: theme.subtleBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Global toggle */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: (editingQuota || disableGlobal) ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 600, color: isGlobal ? '#6d28d9' : disableGlobal ? theme.textSecondary : theme.textBody,
          whiteSpace: 'nowrap', opacity: disableGlobal && !editingQuota ? 0.45 : 1,
        }}>
          <input type="checkbox" checked={isGlobal}
            onChange={e => { setIsGlobal(e.target.checked); setUserId('') }}
            disabled={!!editingQuota || (disableGlobal && !editingQuota?.is_global)}
            style={{ accentColor: '#7c3aed', width: 14, height: 14 }} />
          🌐 Berlaku untuk semua
        </label>
        {disableGlobal && !editingQuota && (
          <span style={{ fontSize: 11, color: '#92400e', fontStyle: 'italic' }}>← tidak bisa: sudah ada karyawan individual</span>
        )}
        {/* Employee selector */}
        {!isGlobal && (
          <select value={userId} onChange={e => setUserId(e.target.value)} style={{ ...inp, flex: 1, minWidth: 180 }} disabled={!!editingQuota}>
            <option value="">— Pilih Karyawan —</option>
            {users.map(u => <option key={u.user_id} value={u.user_id}>{fullName(u)}{u.unit_name ? ` (${u.unit_name})` : ''}</option>)}
          </select>
        )}
        {/* Days */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <input type="number" min="1" value={days} onChange={e => setDays(e.target.value)}
            style={{ ...inp, width: 72 }} placeholder="Hari" />
          <span style={{ fontSize: 13, color: theme.textSecondary }}>hari</span>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '...' : 'Simpan'}
          </button>
          <button onClick={onCancel}
            style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Leave Type Card ────────────────────────────────────────────────────────────
function LeaveTypeCard({ item, yearId, users, onEdit, onToggleActive, toggling, theme }) {
  const [quotas,     setQuotas]     = useState([])
  const [loadingQ,   setLoadingQ]   = useState(false)
  const [addingQ,    setAddingQ]    = useState(false)   // show inline add form
  const [editingQ,   setEditingQ]   = useState(null)    // quota being edited

  const fetchQuotas = useCallback(async () => {
    if (!yearId) return
    setLoadingQ(true)
    try {
      const res = await fetch(`/api/attendance/leave-quotas?year_id=${yearId}&leave_type_code=${item.code}`)
      const json = await res.json()
      setQuotas(json.data || [])
    } catch { setQuotas([]) }
    finally { setLoadingQ(false) }
  }, [yearId, item.code])

  useEffect(() => { fetchQuotas() }, [fetchQuotas])

  const deleteQuota = async (q) => {
    const label = q.is_global ? '[Global]' : fullName(q.user)
    if (!confirm(`Hapus jatah ${label}?`)) return
    try {
      const res = await fetch(`/api/attendance/leave-quotas?id=${q.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) alert(json.message)
      else fetchQuotas()
    } catch (e) { alert(e.message) }
  }

  const globalQuota      = quotas.find(q => q.is_global)
  const individualQuotas  = quotas.filter(q => !q.is_global)

  // Mode: global | individual | unlimited
  const mode = globalQuota ? 'global' : individualQuotas.length > 0 ? 'individual' : 'unlimited'

  const canAddMore = !globalQuota && !addingQ // hanya bisa tambah jika tidak ada global

  const card = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '14px 16px' }

  return (
    <div style={{ ...card, opacity: item.is_active ? 1 : 0.6, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Top row: type info + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        {/* Sort + name */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 11, color: theme.textSecondary }}>#{item.sort_order}</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: theme.textPrimary }}>{item.name_id}</span>
            <span style={{ fontSize: 11, color: theme.textSecondary }}>{item.name_en}</span>
          </div>
          <code style={{ fontSize: 10, background: theme.subtleBg, padding: '1px 5px', borderRadius: 4, color: theme.textSecondary, marginTop: 2, display: 'inline-block' }}>{item.code}</code>
        </div>

        {/* Issue type badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(item.issue_types || []).map(it => {
            const cfg = ALL_ISSUE_TYPES.find(x => x.value === it)
            return cfg ? <span key={it} style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{cfg.label}</span> : null
          })}
        </div>

        {/* Flags */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          {item.max_days && <span style={{ fontSize: 11, color: theme.textSecondary, fontWeight: 600 }}>≤{item.max_days}h</span>}
          {item.requires_upload && <span title="Wajib upload">📎</span>}
          {item.is_paid && <span title="Berbayar">💰</span>}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => onToggleActive(item)} disabled={toggling === item.id}
            style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: item.is_active ? '#dcfce7' : '#fee2e2', color: item.is_active ? '#166534' : '#991b1b' }}>
            {item.is_active ? '✅ Aktif' : '🔴 Nonaktif'}
          </button>
          <button onClick={() => onEdit(item)}
            style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: theme.subtleBg, color: theme.textBody, border: `1px solid ${theme.border}` }}>
            ✏️ Edit
          </button>
        </div>
      </div>

      {/* Quota section */}
      <div style={{ borderTop: `1px dashed ${theme.border}`, paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jatah Cuti</span>
          {/* Mode badge */}
          {mode === 'global' && (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#ede9fe', color: '#6d28d9', padding: '1px 8px', borderRadius: 999 }}>🌐 Global</span>
          )}
          {mode === 'individual' && (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '1px 8px', borderRadius: 999 }}>👤 Per orang ({individualQuotas.length})</span>
          )}
          {mode === 'unlimited' && (
            <span style={{ fontSize: 11, color: theme.textSecondary, fontStyle: 'italic' }}>tidak terbatas</span>
          )}
          {/* Add button: hanya tampil jika tidak ada global quota */}
          {yearId && canAddMore && (
            <button onClick={() => { setAddingQ(true); setEditingQ(null) }}
              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              + Tambah
            </button>
          )}
          {/* Locked message jika global */}
          {mode === 'global' && (
            <span style={{ fontSize: 11, color: '#6d28d9', fontStyle: 'italic' }}>🔒 Hapus global untuk tambah per orang</span>
          )}
        </div>

        {loadingQ ? (
          <span style={{ fontSize: 12, color: theme.textSecondary }}>⏳ Memuat...</span>
        ) : mode === 'unlimited' && !addingQ ? (
          <span style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' }}>Semua karyawan dapat mengajukan, tidak ada tracking jatah.</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* Global quota row */}
            {globalQuota && (
              editingQ?.id === globalQuota.id ? (
                <QuotaInlineForm key="global-edit"
                  leaveTypeCode={item.code} yearId={yearId} users={users} theme={theme}
                  editingQuota={editingQ} disableGlobal={false}
                  onSaved={() => { setEditingQ(null); fetchQuotas() }}
                  onCancel={() => setEditingQ(null)} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: '#f5f3ff', borderRadius: 7, border: '1px solid #ddd6fe' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9' }}>🌐 Semua Karyawan</span>
                  <span style={{ fontSize: 12, color: '#6d28d9' }}>{globalQuota.total_days} hari</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button onClick={() => { setEditingQ(globalQuota); setAddingQ(false) }}
                      style={{ background: theme.subtleBg, color: theme.textBody, border: `1px solid ${theme.border}`, borderRadius: 5, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => deleteQuota(globalQuota)}
                      style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 5, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>Hapus</button>
                  </div>
                </div>
              )
            )}

            {/* Individual quota rows */}
            {individualQuotas.map(q => (
              editingQ?.id === q.id ? (
                <QuotaInlineForm key={`edit-${q.id}`}
                  leaveTypeCode={item.code} yearId={yearId} users={users} theme={theme}
                  editingQuota={editingQ} disableGlobal={individualQuotas.length > 0}
                  onSaved={() => { setEditingQ(null); fetchQuotas() }}
                  onCancel={() => setEditingQ(null)} />
              ) : (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: theme.subtleBg, borderRadius: 7, border: `1px solid ${theme.border}` }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary, flex: 1, minWidth: 120 }}>{fullName(q.user)}</span>
                  <span style={{ fontSize: 11, color: theme.textSecondary }}>{q.user?.unit?.unit_name || '—'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>{q.total_days} hari</span>
                  {q.used_days > 0 && <span style={{ fontSize: 11, color: '#92400e' }}>terpakai: {q.used_days}</span>}
                  {q.total_days - q.used_days >= 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: q.total_days - q.used_days <= 0 ? '#fee2e2' : '#dcfce7', color: q.total_days - q.used_days <= 0 ? '#991b1b' : '#166534', padding: '1px 7px', borderRadius: 999 }}>
                      sisa {q.total_days - q.used_days}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => { setEditingQ(q); setAddingQ(false) }}
                      style={{ background: theme.subtleBg, color: theme.textBody, border: `1px solid ${theme.border}`, borderRadius: 5, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => deleteQuota(q)}
                      style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 5, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>Hapus</button>
                  </div>
                </div>
              )
            ))}

            {/* Inline add form: hanya muncul jika tidak ada global */}
            {addingQ && (
              <QuotaInlineForm key="add-new"
                leaveTypeCode={item.code} yearId={yearId} users={users} theme={theme}
                editingQuota={null} disableGlobal={individualQuotas.length > 0}
                onSaved={() => { setAddingQ(false); fetchQuotas() }}
                onCancel={() => setAddingQ(false)} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AttendanceLeavePage() {
  const { theme } = useTheme()

  const isAdmin = useMemo(() => {
    try { return !!JSON.parse(localStorage.getItem('user_data') || '{}')?.isAdmin } catch { return false }
  }, [])

  const [types,       setTypes]       = useState([])
  const [loading,     setLoading]     = useState(false)
  const [typeFilter,  setTypeFilter]  = useState('all')
  const [typeModal,   setTypeModal]   = useState(null)
  const [toggling,    setToggling]    = useState(null)
  const [years,       setYears]       = useState([])
  const [users,       setUsers]       = useState([])
  const [selectedYear, setSelectedYear] = useState('')

  // Load leave types + meta
  const fetchTypes = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('leave_types').select('*').order('sort_order').order('name_id')
      setTypes(data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const load = async () => {
      const [{ data: yData }, { data: uData }, { data: unitData }] = await Promise.all([
        supabase.from('year').select('year_id, year_name, start_date, end_date').order('start_date', { ascending: false }),
        supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang, user_unit_id').eq('is_active', true).order('user_nama_depan'),
        supabase.from('unit').select('unit_id, unit_name'),
      ])
      const unitMap = Object.fromEntries((unitData || []).map(u => [u.unit_id, u.unit_name]))
      setYears(yData || [])
      setUsers((uData || []).map(u => ({ ...u, unit_name: unitMap[u.user_unit_id] || '—' })))
      if (yData?.length) setSelectedYear(String(yData[0].year_id))
    }
    load()
    fetchTypes()
  }, [fetchTypes])

  const toggleActive = async (item) => {
    setToggling(item.id)
    try {
      await supabase.from('leave_types').update({ is_active: !item.is_active }).eq('id', item.id)
      setTypes(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
    } finally { setToggling(null) }
  }

  const filteredTypes = typeFilter === 'all' ? types : types.filter(i => i.issue_types?.includes(typeFilter))
  const selectedYearObj = years.find(y => String(y.year_id) === selectedYear)

  if (!isAdmin) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, color: '#991b1b', fontSize: 14 }}>
          🔒 Akses ditolak — halaman ini hanya untuk Admin.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.textPrimary, margin: 0 }}>📋 Ijin & Cuti</h1>
          <p style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>
            Kelola jenis ijin dan jatah per tahun ajaran dalam satu tempat.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Year selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, whiteSpace: 'nowrap' }}>Tahun Ajaran:</label>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              style={{ background: theme.inputBg || theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody, borderRadius: 8, padding: '7px 12px', fontSize: 13 }}>
              {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
            </select>
          </div>
          <button onClick={() => setTypeModal('add')}
            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Tambah Jenis
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[{ value: 'all', label: '🗂 Semua' }, ...ALL_ISSUE_TYPES.map(i => ({ value: i.value, label: i.label }))].map(t => (
          <button key={t.value} onClick={() => setTypeFilter(t.value)}
            style={{ padding: '5px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: typeFilter === t.value ? '#1e40af' : theme.subtleBg, color: typeFilter === t.value ? '#fff' : theme.textSecondary, border: `1px solid ${typeFilter === t.value ? '#1e40af' : theme.border}` }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Leave type cards */}
      {loading ? (
        <div style={{ fontSize: 13, color: theme.textSecondary }}>⏳ Memuat...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredTypes.map(item => (
            <LeaveTypeCard key={item.id}
              item={item} yearId={selectedYear} users={users}
              onEdit={setTypeModal} onToggleActive={toggleActive} toggling={toggling}
              theme={theme} />
          ))}
          {filteredTypes.length === 0 && (
            <div style={{ textAlign: 'center', color: theme.textSecondary, padding: 32, fontSize: 13 }}>
              Belum ada jenis ijin. Klik "+ Tambah Jenis".
            </div>
          )}
        </div>
      )}

      <p style={{ fontSize: 12, color: theme.textSecondary }}>
        {types.filter(i => i.is_active).length} aktif · {types.filter(i => !i.is_active).length} nonaktif · {types.length} total
      </p>

      {/* Modal */}
      {typeModal && (
        <LeaveTypeModal
          item={typeModal === 'add' ? null : typeModal}
          onClose={() => setTypeModal(null)}
          onSaved={() => { setTypeModal(null); fetchTypes() }}
          theme={theme}
        />
      )}
    </div>
  )
}
