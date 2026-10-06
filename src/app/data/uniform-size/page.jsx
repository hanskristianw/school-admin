'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faRulerCombined, faPlus, faSearch, faEdit, faTrash,
  faSpinner, faCheck, faTimes, faCheckCircle,
  faExclamationTriangle, faLayerGroup, faInbox, faBan
} from '@fortawesome/free-solid-svg-icons'

export default function UniformSizePage() {
  const { theme, isDark } = useTheme()

  // ─── Minimalist UI Design Tokens (matching /data/pyp) ───────────
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const cardBgAlt = isDark ? '#27272A' : '#F4F4F5'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  // Muted pastels
  const pastelGreen = {
    bg: isDark ? 'rgba(52, 211, 153, 0.12)' : '#EDF3EC',
    text: isDark ? '#34d399' : '#346538',
    border: isDark ? 'rgba(52, 211, 153, 0.25)' : '#C3E6CB'
  }
  const pastelBlue = {
    bg: isDark ? 'rgba(96, 165, 250, 0.12)' : '#E1F3FE',
    text: isDark ? '#60a5fa' : '#1F6C9F',
    border: isDark ? 'rgba(96, 165, 250, 0.25)' : '#BAE6FD'
  }
  const pastelYellow = {
    bg: isDark ? 'rgba(251, 191, 36, 0.12)' : '#FBF3DB',
    text: isDark ? '#fbbf24' : '#956400',
    border: isDark ? 'rgba(251, 191, 36, 0.25)' : '#FCE9A6'
  }
  const pastelRed = {
    bg: isDark ? 'rgba(248, 113, 113, 0.12)' : '#FDEBEC',
    text: isDark ? '#f87171' : '#9F2F2D',
    border: isDark ? 'rgba(248, 113, 113, 0.25)' : '#F8B4B4'
  }

  const inputStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px',
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  }

  const btnPrimary = {
    background: textPrimary,
    color: isDark ? '#09090B' : '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    padding: '8px 16px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease'
  }

  const btnSecondary = {
    background: 'transparent',
    color: textPrimary,
    border: `1px solid ${borderColor}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    padding: '8px 14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease'
  }

  // ─── States ──────────────────────────────────────────────────────
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ size_name: '', display_order: 0, is_active: true })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'active' | 'inactive'
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── Load Data ───────────────────────────────────────────────────
  const loadSizes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('uniform_size')
        .select('*')
        .order('display_order')
      if (error) throw error
      setRows(data || [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSizes()
  }, [])

  // ─── Filtered Data ───────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let result = rows

    if (activeTab === 'active') {
      result = result.filter(r => r.is_active)
    } else if (activeTab === 'inactive') {
      result = result.filter(r => !r.is_active)
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      result = result.filter(r => (r.size_name || '').toLowerCase().includes(q))
    }

    return result
  }, [rows, searchTerm, activeTab])

  // ─── Actions ─────────────────────────────────────────────────────
  const onAdd = () => {
    setEditing(null)
    setForm({ size_name: '', display_order: rows.length + 1, is_active: true })
    setError('')
    setShowModal(true)
  }

  const onEdit = (r) => {
    setEditing(r)
    setForm({ size_name: r.size_name, display_order: r.display_order ?? 0, is_active: !!r.is_active })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setForm({ size_name: '', display_order: 0, is_active: true })
    setError('')
  }

  const onSubmit = async () => {
    const payload = {
      size_name: (form.size_name || '').trim(),
      display_order: Number(form.display_order || 0),
      is_active: !!form.is_active,
    }
    if (!payload.size_name) {
      setError('Nama ukuran wajib diisi.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase
          .from('uniform_size')
          .update(payload)
          .eq('size_id', editing.size_id)
        if (error) throw error
        showToast('Ukuran seragam berhasil diperbarui.', 'success')
      } else {
        const { error } = await supabase
          .from('uniform_size')
          .insert([payload])
        if (error) throw error
        showToast('Ukuran seragam baru berhasil ditambahkan.', 'success')
      }

      closeModal()
      await loadSizes()
    } catch (e) {
      setError(e.message)
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (r) => {
    if (!window.confirm(`Hapus ukuran "${r.size_name}"?`)) return
    try {
      const { error } = await supabase
        .from('uniform_size')
        .delete()
        .eq('size_id', r.size_id)
      if (error) throw error

      setRows(prev => prev.filter(x => x.size_id !== r.size_id))
      showToast('Ukuran seragam berhasil dihapus.', 'success')
    } catch (e) {
      const msg = e?.message?.includes('violates foreign key')
        ? 'Ukuran seragam sedang digunakan pada item seragam dan tidak dapat dihapus.'
        : (e.message || 'Gagal menghapus ukuran.')
      showToast(msg, 'error')
    }
  }

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      
      {/* ── TOAST NOTIFICATION ──────────────────────────────────────── */}
      {toast && (
        <div 
          className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded text-xs font-mono flex items-center gap-2 border animate-in fade-in slide-in-from-top-2"
          style={{
            background: toast.type === 'error' ? pastelRed.bg : pastelGreen.bg,
            borderColor: toast.type === 'error' ? pastelRed.border : pastelGreen.border,
            color: toast.type === 'error' ? pastelRed.text : pastelGreen.text,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
          }}
        >
          <FontAwesomeIcon icon={toast.type === 'error' ? faExclamationTriangle : faCheckCircle} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER & BREADCRUMBS (MATCHING /DATA/PYP STYLE) ─────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[INVENTORY]</span>
            <span>/</span>
            <span>[UNIFORM MASTER]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[SIZES]</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center border" style={{ background: pastelBlue.bg, borderColor: pastelBlue.border, color: pastelBlue.text }}>
              <FontAwesomeIcon icon={faRulerCombined} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Master Ukuran Seragam
              </h1>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            onClick={onAdd}
            style={btnPrimary}
          >
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: '11px' }} />
            <span>Tambah Ukuran</span>
          </button>
        </div>
      </div>

      {/* ── TABS NAVIGATION (MATCHING /DATA/PYP STYLE) ────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '24px', flexWrap: 'wrap' }}>
        
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'all' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'all' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'all' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faLayerGroup} style={{ fontSize: '13px' }} />
          <span>Semua Ukuran</span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary }}>
            {rows.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'active' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'active' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'active' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '13px' }} />
          <span>Aktif</span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: pastelGreen.bg, color: pastelGreen.text }}>
            {rows.filter(r => r.is_active).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inactive')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'inactive' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'inactive' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'inactive' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faBan} style={{ fontSize: '13px' }} />
          <span>Tidak Aktif</span>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary }}>
            {rows.filter(r => !r.is_active).length}
          </span>
        </button>

      </div>

      {/* ── SEARCH & SUMMARY BAR ─────────────────────────────────────── */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '16px 20px', marginBottom: '20px' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <FontAwesomeIcon
              icon={faSearch}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: textSecondary, fontSize: '11px', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Cari ukuran seragam..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '28px', paddingRight: searchTerm ? '28px' : '10px', fontSize: '12px', height: '34px' }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', fontSize: '11px' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ fontSize: '12px', color: textSecondary, fontFamily: 'monospace' }}>
            Menampilkan <strong>{filteredRows.length}</strong> dari <strong>{rows.length}</strong> ukuran
          </div>

        </div>
      </div>

      {/* ── DATA TABLE CARD ──────────────────────────────────────────── */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: textSecondary }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '20px', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px' }}>Memuat data ukuran...</div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: textSecondary }}>
            <FontAwesomeIcon icon={faInbox} style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '13px' }}>
              {rows.length === 0 ? 'Belum ada data ukuran seragam.' : 'Tidak ada ukuran yang sesuai kriteria pencarian.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${borderColor}`, background: isDark ? '#141416' : '#F9F9F8' }}>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Nama Ukuran
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Urutan
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => (
                  <tr 
                    key={r.size_id}
                    style={{ 
                      borderBottom: idx !== filteredRows.length - 1 ? `1px solid ${borderColor}` : 'none',
                      transition: 'background 0.12s ease'
                    }}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                  >
                    {/* Name */}
                    <td style={{ padding: '12px 18px' }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 600, color: textPrimary }}>
                          {r.size_name}
                        </span>
                        <span style={{ fontSize: '10px', color: textSecondary, fontFamily: 'monospace', padding: '1px 5px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5' }}>
                          #{r.size_id}
                        </span>
                      </div>
                    </td>

                    {/* Order */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textPrimary, fontFamily: 'monospace' }}>
                        {r.display_order ?? 0}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      {r.is_active ? (
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: pastelGreen.bg, color: pastelGreen.text }}>
                          Aktif
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', background: isDark ? '#27272A' : '#F4F4F5', color: textSecondary }}>
                          Tidak Aktif
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEdit(r)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '4px',
                            border: `1px solid ${borderColor}`,
                            background: 'transparent',
                            color: textPrimary,
                            cursor: 'pointer',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Edit ukuran"
                        >
                          <FontAwesomeIcon icon={faEdit} style={{ fontSize: '11px' }} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => onDelete(r)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '4px',
                            border: `1px solid ${pastelRed.border}`,
                            background: pastelRed.bg,
                            color: pastelRed.text,
                            cursor: 'pointer',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Hapus ukuran"
                        >
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: '10px' }} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ─────────────────────────────────────────── */}
      <Modal 
        isOpen={showModal} 
        onClose={closeModal} 
        title={editing ? `Edit Ukuran #${editing.size_id}` : 'Tambah Ukuran Seragam'}
        size="sm"
        containerStyle={{ background: cardBg, borderColor }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: '6px' }}>
              Nama Ukuran <span style={{ color: pastelRed.text }}>*</span>
            </label>
            <input 
              type="text"
              value={form.size_name} 
              onChange={e => setForm({ ...form, size_name: e.target.value })} 
              placeholder="e.g. S, M, L, XL, 30, 32"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: '6px' }}>
              Urutan Tampilan
            </label>
            <input 
              type="number" 
              value={form.display_order} 
              onChange={e => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} 
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: '6px' }}>
              Status
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: `1px solid ${form.is_active ? textPrimary : borderColor}`,
                background: form.is_active ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                fontSize: '12px',
                fontWeight: form.is_active ? 600 : 400,
                color: textPrimary,
                userSelect: 'none',
                transition: 'all 0.12s ease'
              }}
            >
              <input 
                type="checkbox" 
                checked={form.is_active} 
                onChange={e => setForm({ ...form, is_active: e.target.checked })} 
                style={{ accentColor: textPrimary, width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <span>Ukuran Aktif</span>
            </label>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', background: pastelRed.bg, border: `1px solid ${pastelRed.border}`, color: pastelRed.text, fontSize: '12px' }}>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={closeModal}
              style={btnSecondary}
            >
              Batal
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={saving || !form.size_name.trim()}
              style={{
                ...btnPrimary,
                opacity: saving || !form.size_name.trim() ? 0.6 : 1,
                cursor: saving || !form.size_name.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? (
                <><FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...</>
              ) : (
                <><FontAwesomeIcon icon={faCheck} /> Simpan</>
              )}
            </button>
          </div>

        </div>
      </Modal>

    </div>
  )
}
