'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import supabase from '@/lib/supabase'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBuilding,
  faQrcode,
  faPrint,
  faDownload,
  faBroom,
  faExternalLinkAlt,
  faPlus,
  faSearch,
  faEdit,
  faTrash,
  faCheck,
  faCopy,
  faRotateRight,
  faSpinner,
  faFilePdf
} from '@fortawesome/free-solid-svg-icons'
import {
  DEFAULT_GENERAL_REPORT_URL,
  generateGeneralReporterPDF,
  getGeneralReportQrDataUrl
} from './lib/roomPdfGenerator'

// Reusable General Reporter Door Sticker Card Component (CCS 3-color ribbon & styling)
export function GeneralReporterStickerCard({ qrUrl, targetUrl = DEFAULT_GENERAL_REPORT_URL }) {
  return (
    <div className="door-sticker-card p-6 bg-white border-2 border-[#022c46] rounded-2xl text-center mx-auto w-full max-w-sm shadow-xs">
      {/* Pita 3 Warna Khas CCS */}
      <div className="flex h-1.5 w-full mb-3 rounded-full overflow-hidden">
        <div className="flex-1 bg-[#2da397]" />
        <div className="flex-1 bg-[#f16101]" />
        <div className="flex-1 bg-[#7c4bc0]" />
      </div>

      {/* Header Sekolah */}
      <div className="border-b-2 border-[#022c46] pb-2.5 mb-3">
        <h2 className="text-xs font-black tracking-widest uppercase text-[#022c46]">
          CHUNG CHUNG CHRISTIAN SCHOOL
        </h2>
        <p className="text-[10px] font-bold tracking-wider text-[#f16101] uppercase mt-0.5">
          Portal Pelaporan Keluhan &amp; Fasilitas
        </p>
      </div>

      {/* Judul Umum */}
      <div className="py-2 mb-2">
        <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">
          QR Code Umum (General)
        </span>
        <h1 className="text-lg font-black text-[#0b4877] mt-0.5 tracking-tight">
          LAPOR KELUHAN &amp; KEBERSIHAN
        </h1>
      </div>

      {/* QR Code Container */}
      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 inline-block mb-3">
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="QR Code General Pelapor"
            className="w-44 h-44 mx-auto rounded"
          />
        ) : (
          <div className="w-44 h-44 flex items-center justify-center text-xs text-gray-400">
            Membuat QR...
          </div>
        )}
      </div>

      {/* Instruction Footer */}
      <div className="pt-2 border-t border-gray-200 text-center">
        <p className="text-[11px] font-bold text-[#022c46]">
          Pindai (Scan) QR untuk Melaporkan Keluhan / Fasilitas
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          Foto Kondisi &amp; Deskripsi Wajib • Nama Pelapor Opsional (Bisa Anonim)
        </p>
        <p className="text-[9px] font-mono text-gray-400 mt-1 break-all">
          {targetUrl}
        </p>
      </div>
    </div>
  )
}

export default function RoomMasterPage() {
  const router = useRouter()
  const { isDark } = useTheme()

  const [checked, setChecked] = useState(false)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | inactive

  // Form state
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [editing, setEditing] = useState(null)
  const nameRef = useRef(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // General QR Sticker Modal states
  const [isGeneralQrModalOpen, setIsGeneralQrModalOpen] = useState(false)
  const [generalQrUrl, setGeneralQrUrl] = useState('')
  const [targetReportUrl, setTargetReportUrl] = useState(DEFAULT_GENERAL_REPORT_URL)
  const [printCopies, setPrintCopies] = useState(1)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Minimalist tokens identical to /data/pyp & /data/court-rental
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  useEffect(() => {
    const kr_id = typeof window !== 'undefined' ? localStorage.getItem('kr_id') : null
    if (!kr_id) {
      router.replace('/login')
      return
    }
    setChecked(true)
  }, [router])

  const generateToken = () => {
    return 'rm_' + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8)
  }

  const loadRooms = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('room')
        .select('*')
        .order('room_name')
      if (error) throw error
      setRooms(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (checked) {
      loadRooms()
      getGeneralReportQrDataUrl(targetReportUrl).then(setGeneralQrUrl).catch(() => {})
    }
  }, [checked])

  useEffect(() => {
    if (!targetReportUrl) return
    getGeneralReportQrDataUrl(targetReportUrl).then(setGeneralQrUrl).catch(() => {})
  }, [targetReportUrl])

  const resetForm = () => {
    setName('')
    setIsActive(true)
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setIsModalOpen(true)
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  const openEdit = (r) => {
    setEditing(r)
    setName(r.room_name)
    setIsActive(r.is_active !== false)
    setIsModalOpen(true)
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      setLoading(true)
      setError('')
      if (editing && editing.room_id) {
        const { error } = await supabase
          .from('room')
          .update({
            room_name: name.trim(),
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('room_id', editing.room_id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('room')
          .insert([{
            room_name: name.trim(),
            is_active: isActive,
            qr_code_token: generateToken()
          }])
        if (error) throw error
      }
      resetForm()
      setIsModalOpen(false)
      await loadRooms()
    } catch (e) {
      setError(e.message.includes('unique') ? 'Nama ruangan sudah ada.' : e.message)
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async (r) => {
    if (!confirm(`Hapus ruangan "${r.room_name}"?`)) return
    try {
      setLoading(true)
      setError('')
      const { error } = await supabase
        .from('room')
        .delete()
        .eq('room_id', r.room_id)
      if (error) throw error
      if (editing?.room_id === r.room_id) resetForm()
      await loadRooms()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrintGeneralPdf = async () => {
    try {
      setGeneratingPdf(true)
      await generateGeneralReporterPDF({
        targetUrl: targetReportUrl,
        copies: printCopies,
        action: 'print'
      })
    } catch (err) {
      alert('Gagal menghasilkan PDF: ' + err.message)
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDownloadGeneralPdf = async () => {
    try {
      setGeneratingPdf(true)
      await generateGeneralReporterPDF({
        targetUrl: targetReportUrl,
        copies: printCopies,
        action: 'download'
      })
    } catch (err) {
      alert('Gagal mengunduh PDF: ' + err.message)
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDownloadPng = () => {
    if (!generalQrUrl) return
    const link = document.createElement('a')
    link.download = `QR_General_Pelapor_CCS.png`
    link.href = generalQrUrl
    link.click()
  }

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      if (statusFilter === 'active' && r.is_active === false) return false
      if (statusFilter === 'inactive' && r.is_active !== false) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (r.room_name || '').toLowerCase().includes(q)
        if (!matchName) return false
      }
      return true
    })
  }, [rooms, statusFilter, searchQuery])

  const activeCount = useMemo(() => rooms.filter(r => r.is_active !== false).length, [rooms])
  const inactiveCount = useMemo(() => rooms.filter(r => r.is_active === false).length, [rooms])

  if (!checked) return null

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8"
      style={{
        background: pageBg,
        color: textPrimary,
        fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* ── HEADER & BREADCRUMBS ── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[MASTER]</span>
            <span>/</span>
            <span>[FACILITY MANAGEMENT]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[ROOMS]</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded flex items-center justify-center border shrink-0"
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                borderColor: isDark ? '#2563EB' : '#BAE6FD',
                color: isDark ? '#60A5FA' : '#0284C7'
              }}
            >
              <FontAwesomeIcon icon={faBuilding} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Room Master &amp; QR General Pelapor
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Master daftar ruangan sekolah dan cetak 1 QR Code General khusus untuk pelaporan keluhan fasilitas.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsGeneralQrModalOpen(true)}
            style={{
              background: isDark ? 'rgba(241, 97, 1, 0.15)' : '#FFF7ED',
              border: `1px solid ${isDark ? '#EA580C' : '#FDBA74'}`,
              color: isDark ? '#FB923C' : '#C2410C',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faQrcode} style={{ fontSize: '12px' }} />
            <span>Cetak QR General Pelapor</span>
          </button>

          <button
            onClick={openCreate}
            style={{
              background: textPrimary,
              color: isDark ? '#111111' : '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: '11px' }} />
            <span>Tambah Ruangan</span>
          </button>
        </div>
      </div>

      {/* ── BENTO METRIC STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px 20px' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold" style={{ color: textSecondary }}>
            TOTAL ROOMS
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5" style={{ color: textPrimary }}>
            {rooms.length}
          </div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px 20px' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold flex items-center justify-between">
            <span style={{ color: isDark ? '#4ADE80' : '#166534' }}>ACTIVE ROOMS</span>
            <span className="w-2 h-2 rounded-full" style={{ background: isDark ? '#4ADE80' : '#166534' }} />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight mt-1.5" style={{ color: isDark ? '#4ADE80' : '#166534' }}>
            {activeCount}
          </div>
        </div>

        <div
          onClick={() => setIsGeneralQrModalOpen(true)}
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '16px 20px',
            cursor: 'pointer'
          }}
          className="hover:border-orange-400 transition"
        >
          <div className="text-[10px] font-mono tracking-wider uppercase font-semibold flex items-center justify-between">
            <span style={{ color: isDark ? '#FB923C' : '#EA580C' }}>QR CODE PELAPOR (GENERAL)</span>
            <FontAwesomeIcon icon={faQrcode} style={{ color: isDark ? '#FB923C' : '#EA580C' }} />
          </div>
          <div className="text-sm font-bold mt-2 flex items-center justify-between" style={{ color: textPrimary }}>
            <span>1 QR Untuk Semua Area</span>
            <span className="text-xs font-mono underline" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              Lihat &amp; Cetak →
            </span>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS BAR ── */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
              style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
            >
              <option value="all">ALL STATUS ({rooms.length})</option>
              <option value="active">ACTIVE ({activeCount})</option>
              <option value="inactive">INACTIVE ({inactiveCount})</option>
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-xs" style={{ color: textSecondary }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama ruangan..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded border outline-none font-medium"
              style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', fontSize: '11px' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── UTILITARIAN ROOMS TABLE ── */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b" style={{ background: isDark ? '#141417' : '#F9F9F8', borderColor }}>
                <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider" style={{ color: textSecondary, width: '48px' }}>#</th>
                <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider" style={{ color: textSecondary }}>Nama Ruangan</th>
                <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider text-center" style={{ color: textSecondary, width: '120px' }}>Status</th>
                <th className="px-4 py-3 font-mono font-semibold text-[10px] uppercase tracking-wider text-right" style={{ color: textSecondary, width: '180px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor }}>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12" style={{ color: textSecondary }}>
                    <FontAwesomeIcon icon={faRotateRight} className="text-base animate-spin mx-auto mb-2" />
                    <div>Memuat data...</div>
                  </td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12" style={{ color: textSecondary }}>
                    <div>Tidak ada ruangan ditemukan.</div>
                  </td>
                </tr>
              ) : (
                filteredRooms.map((r, idx) => (
                  <tr key={r.room_id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-neutral-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: textPrimary }}>
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faBuilding} className="text-neutral-400 text-xs" />
                        <span>{r.room_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.is_active !== false ? (
                        <span
                          style={{
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
                            color: isDark ? '#4ADE80' : '#166534',
                            border: `1px solid ${isDark ? '#16A34A' : '#BBF7D0'}`
                          }}
                        >
                          ACTIVE
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isDark ? '#27272A' : '#F3F4F6',
                            color: textSecondary,
                            border: `1px solid ${borderColor}`
                          }}
                        >
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(r)}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${borderColor}`,
                            color: textPrimary,
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FontAwesomeIcon icon={faEdit} style={{ fontSize: '10px', color: textSecondary }} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => onDelete(r)}
                          style={{
                            background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                            color: isDark ? '#F87171' : '#DC2626',
                            border: `1px solid ${isDark ? '#B91C1C' : '#FECACA'}`,
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: '10px' }} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: CREATE / EDIT RUANGAN ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editing ? 'Edit Ruangan' : 'Tambah Ruangan'}
        size="sm"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: textPrimary }}>
              Nama Ruangan *
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: PHE Field, Lab Komputer"
              required
              className="w-full px-3 py-2 text-xs rounded border outline-none font-medium"
              style={{ background: isDark ? '#27272A' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '6px' }}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded cursor-pointer"
            />
            <label htmlFor="isActiveCheck" className="text-xs cursor-pointer font-medium" style={{ color: textPrimary }}>
              Status Aktif
            </label>
          </div>

          {error && (
            <div className="p-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              style={{
                background: 'transparent',
                border: `1px solid ${borderColor}`,
                color: textPrimary,
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: textPrimary,
                color: isDark ? '#111111' : '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {editing ? 'Simpan Perubahan' : 'Buat Ruangan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: GENERAL REPORTER QR STICKER (PURE PDF PREVIEW & PRINT) ── */}
      <Modal
        isOpen={isGeneralQrModalOpen}
        onClose={() => setIsGeneralQrModalOpen(false)}
        title="Label QR Code General — Khusus Pelapor"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg border text-xs" style={{ background: isDark ? '#141416' : '#F8FAFC', borderColor }}>
            <div className="font-semibold mb-1.5" style={{ color: textPrimary }}>
              Pengaturan URL Tujuan QR Code Pelapor:
            </div>
            <input
              type="text"
              value={targetReportUrl}
              onChange={(e) => setTargetReportUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none"
              style={{ background: cardBg, borderColor, color: textPrimary }}
            />
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetReportUrl('https://ccs.sch.id/reportfacility')}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border hover:opacity-80 cursor-pointer"
                  style={{ borderColor, color: textSecondary }}
                >
                  https://ccs.sch.id/reportfacility
                </button>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px]" style={{ color: textSecondary }}>Jumlah Lembar:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={printCopies}
                  onChange={(e) => setPrintCopies(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="w-14 px-2 py-1 text-xs font-mono rounded border text-center"
                  style={{ background: cardBg, borderColor, color: textPrimary }}
                />
              </div>
            </div>
          </div>

          <GeneralReporterStickerCard
            qrUrl={generalQrUrl}
            targetUrl={targetReportUrl}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t" style={{ borderColor }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(targetReportUrl)
                  setCopiedUrl(true)
                  setTimeout(() => setCopiedUrl(false), 2000)
                }}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={copiedUrl ? faCheck : faCopy} className={copiedUrl ? 'text-emerald-600' : 'text-neutral-400'} />
                <span>{copiedUrl ? 'URL Tersalin' : 'Salin URL'}</span>
              </button>

              <a
                href={targetReportUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  color: isDark ? '#60A5FA' : '#0284C7',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none'
                }}
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
                <span>Buka Web CCS</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPng}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={faDownload} />
                <span>PNG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadGeneralPdf}
                disabled={generatingPdf}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={faFilePdf} style={{ color: '#DC2626' }} />
                <span>Unduh PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrintGeneralPdf}
                disabled={generatingPdf}
                style={{
                  background: textPrimary,
                  color: isDark ? '#111111' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={generatingPdf ? faSpinner : faPrint} className={generatingPdf ? 'animate-spin' : ''} />
                <span>Cetak PDF ({printCopies} Lembar)</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
