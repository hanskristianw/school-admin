'use client'

import { useState, useEffect, useCallback } from 'react'
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

const EMPTY_FORM = {
  code: '', name_id: '', name_en: '',
  issue_types: ['absent'], max_days: '',
  requires_upload: false, upload_label: '',
  deduct_quota: false, is_paid: true,
  sort_order: 99, is_active: true,
}

// ── Leave Type Form Modal ──────────────────────────────────────────────────────
function LeaveTypeModal({ item, onClose, onSaved }) {
  const { theme } = useTheme()
  const [form, setForm]     = useState(item ? { ...item, max_days: item.max_days ?? '', issue_types: item.issue_types || ['absent'] } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const inputStyle = { background: theme.inputBg || theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody, borderRadius: '8px', padding: '8px 12px', fontSize: '14px', width: '100%' }
  const labelStyle = { color: theme.textSecondary, fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }

  const toggleIssueType = (val) =>
    setForm(p => ({ ...p, issue_types: p.issue_types.includes(val) ? p.issue_types.filter(v => v !== val) : [...p.issue_types, val] }))

  const handleSave = async () => {
    if (!form.code.trim())    return setError('Code wajib diisi')
    if (!form.name_id.trim()) return setError('Nama (ID) wajib diisi')
    if (!form.name_en.trim()) return setError('Nama (EN) wajib diisi')
    if (form.issue_types.length === 0) return setError('Pilih minimal 1 tipe issue')
    setSaving(true); setError('')
    try {
      const payload = {
        code: form.code.trim(), name_id: form.name_id.trim(), name_en: form.name_en.trim(),
        issue_types: form.issue_types,
        max_days:    form.max_days !== '' ? parseInt(form.max_days, 10) : null,
        requires_upload: form.requires_upload,
        upload_label: form.requires_upload ? (form.upload_label.trim() || null) : null,
        deduct_quota: form.deduct_quota, is_paid: form.is_paid,
        sort_order:  parseInt(form.sort_order, 10) || 99, is_active: form.is_active,
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
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div style={{ background: theme.cardBg, borderRadius: '16px', width: '100%', maxWidth: '560px', border: `1px solid ${theme.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 32px)', marginTop: 'auto', marginBottom: 'auto', alignSelf: 'center' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: theme.textPrimary }}>{item ? '✏️ Edit Tipe Cuti' : '➕ Tambah Tipe Cuti'}</h2>
            <p style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>Data disimpan di tabel leave_types (database)</p>
          </div>
          <button onClick={onClose} style={{ color: theme.textSecondary, fontSize: '20px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div>
            <label style={labelStyle}>Code <span style={{ color: '#ef4444' }}>*</span> <span style={{ fontWeight: 400, fontSize: '11px' }}>(huruf kecil & underscore, tidak bisa diubah setelah dibuat)</span></label>
            <input style={{ ...inputStyle, opacity: item ? 0.6 : 1 }} value={form.code} readOnly={!!item}
              onChange={e => setForm(p => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))} placeholder="contoh: annual_leave" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Nama (Indonesia) <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inputStyle} value={form.name_id} onChange={e => setForm(p => ({ ...p, name_id: e.target.value }))} placeholder="Cuti Tahunan" />
            </div>
            <div>
              <label style={labelStyle}>Nama (English) <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inputStyle} value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Annual Leave" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Berlaku untuk issue <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ALL_ISSUE_TYPES.map(it => {
                const active = form.issue_types.includes(it.value)
                return (
                  <button key={it.value} type="button" onClick={() => toggleIssueType(it.value)}
                    style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: active ? it.bg : theme.subtleBg, color: active ? it.color : theme.textSecondary, border: `1px solid ${active ? it.color + '44' : theme.border}` }}>
                    {it.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Maks. Hari (kosong = tak terbatas)</label>
              <input type="number" min="1" style={inputStyle} value={form.max_days} placeholder="contoh: 3"
                onChange={e => setForm(p => ({ ...p, max_days: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Urutan Tampil</label>
              <input type="number" min="1" style={inputStyle} value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { key: 'requires_upload', label: '📎 Wajib Upload Dokumen' },
              { key: 'deduct_quota',   label: '📉 Potong Jatah Cuti' },
              { key: 'is_paid',        label: '💰 Cuti Berbayar' },
              { key: 'is_active',      label: '✅ Aktif' },
            ].map(flag => (
              <label key={flag.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.subtleBg }}>
                <input type="checkbox" checked={!!form[flag.key]} onChange={e => setForm(p => ({ ...p, [flag.key]: e.target.checked }))} style={{ accentColor: '#2563eb', width: '15px', height: '15px' }} />
                <span style={{ fontSize: '13px', color: theme.textBody }}>{flag.label}</span>
              </label>
            ))}
          </div>

          {form.requires_upload && (
            <div>
              <label style={labelStyle}>Teks Panduan Upload</label>
              <input style={inputStyle} value={form.upload_label}
                onChange={e => setForm(p => ({ ...p, upload_label: e.target.value }))}
                placeholder="contoh: Upload surat dokter (wajib)" />
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', color: '#991b1b', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px 20px', borderTop: `1px solid ${theme.border}`, flexShrink: 0, display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '14px', border: `1px solid ${theme.border}`, background: theme.subtleBg, color: theme.textSecondary, cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, background: '#2563eb', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Menyimpan...' : item ? 'Update' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function LeaveTypesPage() {
  const { theme }                 = useTheme()
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [filterTab, setFilterTab] = useState('all')
  const [modal, setModal]         = useState(null)   // null | 'add' | {item obj}
  const [toggling, setToggling]   = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('leave_types').select('*').order('sort_order').order('code')
      if (error) throw error
      setItems(data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const toggleActive = async (item) => {
    setToggling(item.id)
    try {
      await supabase.from('leave_types').update({ is_active: !item.is_active }).eq('id', item.id)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
    } finally { setToggling(null) }
  }

  const filtered = filterTab === 'all' ? items : items.filter(i => i.issue_types?.includes(filterTab))

  const cardBg = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '14px 16px' }

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: theme.textBody }}>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>📋 Jenis Cuti & Ijin</h1>
          <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
            Kelola semua jenis alasan cuti/ijin. Data dinamis — disimpan di database.
          </p>
        </div>
        <button onClick={() => setModal('add')}
          style={{ background: '#2563eb', color: '#fff', borderRadius: '8px', padding: '9px 18px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          ➕ Tambah Jenis
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[{ value: 'all', label: '🗂 Semua' }, ...ALL_ISSUE_TYPES.map(i => ({ value: i.value, label: i.label }))].map(tab => (
          <button key={tab.value} onClick={() => setFilterTab(tab.value)}
            style={{ padding: '5px 13px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: filterTab === tab.value ? '#1e40af' : theme.subtleBg, color: filterTab === tab.value ? '#fff' : theme.textSecondary, border: `1px solid ${filterTab === tab.value ? '#1e40af' : theme.border}` }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: theme.textSecondary, padding: '8px 12px', background: theme.subtleBg, borderRadius: '8px' }}>
        <span>📎 = Wajib upload dokumen</span>
        <span>📉 = Memotong kuota cuti</span>
        <span>💰 = Cuti berbayar</span>
        <span>🔢 = Maks. hari cuti</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-sm" style={{ color: theme.textSecondary }}>⏳ Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center" style={{ color: theme.textSecondary }}>
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">Tidak ada jenis cuti ditemukan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} style={{ ...cardBg, display: 'flex', alignItems: 'flex-start', gap: '12px', opacity: item.is_active ? 1 : 0.55, flexWrap: 'wrap' }}>

              {/* Sort order */}
              <div style={{ fontSize: '11px', color: theme.textSecondary, minWidth: '28px', paddingTop: '2px', textAlign: 'center' }}>#{item.sort_order}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: theme.textPrimary }}>{item.name_id}</div>
                <div style={{ fontSize: '11px', color: theme.textSecondary }}>{item.name_en}</div>
                <code style={{ fontSize: '10px', background: theme.subtleBg, padding: '1px 5px', borderRadius: '4px', color: theme.textSecondary, marginTop: '3px', display: 'inline-block' }}>{item.code}</code>
              </div>

              {/* Issue type badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'flex-start', minWidth: '120px' }}>
                {(item.issue_types || []).map(it => {
                  const cfg = ALL_ISSUE_TYPES.find(x => x.value === it)
                  return cfg ? <span key={it} style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 600 }}>{cfg.label}</span> : null
                })}
              </div>

              {/* Flags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', minWidth: '80px' }}>
                <span title={`Maks. ${item.max_days ?? '∞'} hari`} style={{ fontSize: '11px', color: theme.textSecondary, fontWeight: 600 }}>
                  {item.max_days ? `≤${item.max_days}h` : '∞'}
                </span>
                {item.requires_upload && <span title="Wajib upload">📎</span>}
                {item.deduct_quota    && <span title="Potong kuota">📉</span>}
                {item.is_paid         && <span title="Berbayar">💰</span>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => toggleActive(item)} disabled={toggling === item.id}
                  style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', background: item.is_active ? '#dcfce7' : '#fee2e2', color: item.is_active ? '#166534' : '#991b1b' }}>
                  {item.is_active ? '✅ Aktif' : '🔴 Nonaktif'}
                </button>
                <button onClick={() => setModal(item)}
                  style={{ padding: '5px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: theme.subtleBg, color: theme.textBody, border: `1px solid ${theme.border}` }}>
                  ✏️ Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <p style={{ fontSize: '12px', color: theme.textSecondary }}>
        {items.filter(i => i.is_active).length} aktif · {items.filter(i => !i.is_active).length} nonaktif · {items.length} total
      </p>

      {/* Modal */}
      {modal && (
        <LeaveTypeModal
          item={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchItems() }}
        />
      )}
    </div>
  )
}
