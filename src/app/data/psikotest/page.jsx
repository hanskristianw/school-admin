'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBrain,
  faSearch,
  faCalendarAlt,
  faRotateRight,
  faTrash,
  faPrint,
  faEye,
  faUser,
  faClock,
  faSpinner,
  faExclamationTriangle,
  faChartBar,
  faCheckCircle,
  faArrowUpRightFromSquare,
  faInbox,
  faLayerGroup,
  faBookOpen,
  faCheck
} from '@fortawesome/free-solid-svg-icons'
import { generatePsikotestPDF, formatIndonesianDate } from './lib/psikotestPdfGenerator'

export default function PsikotestManagementPage() {
  const { theme, isDark } = useTheme()

  // Minimalist UI styling tokens matching /data/pyp
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  // Data States
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 })
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // State for generating PDF per item (item ID being processed)
  const [generatingPdfId, setGeneratingPdfId] = useState(null)

  // State for Detail / Matrix Modal
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // State for Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Fetch list of results from API
  const fetchResults = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '15')
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (dateFilter.trim()) params.set('date', dateFilter.trim())

      const res = await fetch(`/api/data/psikotest?${params.toString()}`)
      const json = await res.json()

      if (json.success) {
        setResults(json.data || [])
        setPagination(json.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 })
      } else {
        console.error('Failed to fetch results:', json.message)
      }
    } catch (err) {
      console.error('Error fetching psikotest list:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, dateFilter])

  useEffect(() => {
    fetchResults(1)
  }, [fetchResults])

  // Handler to generate and open PDF directly (using jsPDF + autoTable exactly like /data/pyp)
  const handleGeneratePdf = async (psikoItem) => {
    try {
      setGeneratingPdfId(psikoItem.id)

      // Fetch detail jawaban & kalkulasi dari API jika belum ada
      const res = await fetch(`/api/data/psikotest/${psikoItem.id}`)
      const detailJson = await res.json()

      if (!detailJson.success) {
        alert('Gagal memuat rincian data: ' + detailJson.message)
        return
      }

      // Generate PDF menggunakan jsPDF + autoTable dan buka langsung di tab baru
      await generatePsikotestPDF({
        result: detailJson.result,
        items: detailJson.items,
        calculation: detailJson.calculation
      })
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Terjadi kesalahan saat memproses PDF: ' + err.message)
    } finally {
      setGeneratingPdfId(null)
    }
  }

  // Handler to open Quick View Modal
  const handleOpenDetailModal = async (psikoItem) => {
    try {
      setDetailLoading(true)
      setSelectedDetail({ result: psikoItem })

      const res = await fetch(`/api/data/psikotest/${psikoItem.id}`)
      const json = await res.json()

      if (json.success) {
        setSelectedDetail(json)
      } else {
        alert('Gagal memuat rincian: ' + json.message)
      }
    } catch (err) {
      alert('Gagal mengambil data.')
    } finally {
      setDetailLoading(false)
    }
  }

  // Handler to execute delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleteLoading(true)
      const res = await fetch(`/api/data/psikotest/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setDeleteTarget(null)
        fetchResults(pagination.page)
      } else {
        alert('Gagal menghapus: ' + json.message)
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menghapus data.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Helper Initials
  const getInitials = (name) => {
    if (!name) return 'PS'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      
      {/* ── 1. HEADER & BREADCRUMBS (MATCHING /data/pyp LAYOUT) ─────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[OPERATIONAL]</span>
            <span>/</span>
            <span>[RECRUITMENT]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[PSIKOTEST RESULTS]</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center border" style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', borderColor: isDark ? '#2563EB' : '#BAE6FD', color: isDark ? '#60A5FA' : '#0284C7' }}>
              <FontAwesomeIcon icon={faBrain} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Psikotest Result Management
              </h1>
            </div>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href="https://ccs.sch.id/psikotest/"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs font-mono font-semibold rounded border transition-colors flex items-center gap-1.5 cursor-pointer"
            style={{ background: cardBg, borderColor, color: textPrimary, textDecoration: 'none' }}
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            <span>Public Form</span>
          </a>

          <button
            type="button"
            onClick={() => fetchResults(pagination.page)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded transition-all flex items-center gap-1.5 cursor-pointer"
            style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', border: 'none' }}
          >
            <FontAwesomeIcon icon={faRotateRight} spin={loading} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. FILTER & SEARCH BAR (STEP 1 CARD MATCHING /data/pyp) ─────── */}
      <div className="p-3.5 rounded border mb-6" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          
          {/* 1. Candidate Name or Position */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              1. Search Candidate / Position
            </label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon
                icon={faSearch}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: textSecondary, fontSize: '11px' }}
              />
              <input
                type="text"
                placeholder="Cari nama pelamar atau posisi..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
              />
            </div>
          </div>

          {/* 2. Test Date Filter */}
          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              2. Test Date
            </label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon
                icon={faCalendarAlt}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: textSecondary, fontSize: '11px' }}
              />
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
              />
            </div>
          </div>

          {/* 3. Filter Reset & Stats */}
          <div className="flex items-end gap-2">
            {(searchQuery || dateFilter) && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setDateFilter(''); }}
                className="px-3 py-1.5 text-xs font-mono font-medium rounded border transition-colors cursor-pointer"
                style={{ background: isDark ? '#27272A' : '#F4F4F5', borderColor, color: textSecondary, borderRadius: '4px' }}
              >
                Reset
              </button>
            )}
            <span className="text-[11px] font-mono text-secondary py-1.5" style={{ color: textSecondary }}>
              Menampilkan {results.length} dari {pagination.total} peserta
            </span>
          </div>

        </div>
      </div>

      {/* ── 3. TABS NAVIGATION (MATCHING /data/pyp STYLE) ──────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '24px', flexWrap: 'wrap' }}>
        <button
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'default',
            color: textPrimary,
            borderBottom: `2px solid ${textPrimary}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FontAwesomeIcon icon={faUser} style={{ fontSize: '13px' }} />
          Peserta ({pagination.total})
        </button>
      </div>

      {/* ── 4. CANDIDATES LIST (MATCHING /data/pyp CLASS VIEW) ─────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Top Info Bar Card (Matching /data/pyp) with Public Form URL */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: textPrimary }}>
                  Daftar Hasil Psikotes Pelamar
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: textSecondary, margin: '4px 0 0 0' }}>
                Alamat URL Formulir Publik:{' '}
                <a
                  href="https://ccs.sch.id/psikotest/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-medium underline underline-offset-2"
                  style={{ color: isDark ? '#60A5FA' : '#0284C7' }}
                >
                  https://ccs.sch.id/psikotest/
                </a>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href="https://ccs.sch.id/psikotest/"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-semibold px-3 py-1.5 rounded border flex items-center gap-1.5 transition-colors cursor-pointer"
                style={{ background: isDark ? '#27272A' : '#F4F4F5', borderColor, color: isDark ? '#60A5FA' : '#0284C7', textDecoration: 'none' }}
              >
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: '11px' }} />
                <span>ccs.sch.id/psikotest</span>
              </a>
              <span className="text-xs font-mono font-medium px-2.5 py-1.5 rounded border" style={{ background: isDark ? '#27272A' : '#F4F4F5', borderColor, color: textSecondary }}>
                Total: {pagination.total} Peserta
              </span>
            </div>
          </div>
        </div>

          {/* Table Container Card (Matching /data/pyp Minimalist UI) */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', overflow: 'hidden' }}>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: isDark ? '#18181B' : '#F4F4F5', borderBottom: `2px solid ${borderColor}` }}>
                    <th style={{ padding: '10px 14px', width: '50px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: textSecondary, letterSpacing: '0.04em', fontFamily: 'monospace' }}>
                      #
                    </th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Nama Pelamar
                    </th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Posisi Yang Dilamar
                    </th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Tanggal Tes
                    </th>
                    <th style={{ padding: '10px 14px', width: '220px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', color: textSecondary }}>
                        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px', fontSize: '16px' }} />
                        Memuat data psikotes...
                      </td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', color: textSecondary }}>
                        <FontAwesomeIcon icon={faInbox} style={{ fontSize: '24px', color: textSecondary, marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                        Belum ada data pengerjaan psikotes yang tersimpan.
                      </td>
                    </tr>
                  ) : (
                    results.map((psiko, idx) => {
                      const rowNo = (pagination.page - 1) * pagination.limit + idx + 1
                      const isPrinting = generatingPdfId === psiko.id
                      const rowBg = idx % 2 === 0 ? (isDark ? '#141416' : '#FFFFFF') : (isDark ? '#18181B' : '#FAFAFA')

                      return (
                        <tr
                          key={psiko.id}
                          style={{
                            background: rowBg,
                            borderBottom: `1px solid ${borderColor}`,
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#1F1F23' : '#F9FAFB' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = rowBg }}
                        >
                          {/* Row Number */}
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: textSecondary, fontFamily: 'monospace', fontSize: '11px' }}>
                            {rowNo}
                          </td>

                          {/* Candidate Name & ID */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                                border: `1px solid ${isDark ? '#2563EB' : '#BAE6FD'}`,
                                color: isDark ? '#60A5FA' : '#0284C7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: '700',
                                flexShrink: 0
                              }}>
                                {getInitials(psiko.nama)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: textPrimary, fontSize: '13px' }}>
                                  {psiko.nama}
                                </div>
                                <div style={{ fontSize: '11px', color: textSecondary, fontFamily: 'monospace' }}>
                                  ID #{psiko.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Position Badge */}
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11.5px',
                              fontWeight: '500',
                              backgroundColor: isDark ? '#27272A' : '#F1F5F9',
                              color: textPrimary,
                              border: `1px solid ${borderColor}`
                            }}>
                              {psiko.posisi}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '12px 14px', color: textSecondary, fontSize: '12.5px', fontFamily: 'monospace' }}>
                            {formatIndonesianDate(psiko.tanggal)}
                          </td>

                          {/* Action Buttons (Matching /data/pyp style) */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                              
                              {/* Print Button (Styled like /data/pyp Print Button) */}
                              <button
                                type="button"
                                onClick={() => handleGeneratePdf(psiko)}
                                disabled={isPrinting}
                                title="Cetak Laporan PDF Resmi"
                                style={{
                                  background: cardBg,
                                  border: `1px solid ${borderColor}`,
                                  color: textPrimary,
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  fontSize: '12px',
                                  padding: '6px 12px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  cursor: isPrinting ? 'not-allowed' : 'pointer',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => { if (!isPrinting) e.currentTarget.style.borderColor = textPrimary }}
                                onMouseLeave={(e) => { if (!isPrinting) e.currentTarget.style.borderColor = borderColor }}
                              >
                                {isPrinting ? (
                                  <>
                                    <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '11px' }} />
                                    <span>Memproses...</span>
                                  </>
                                ) : (
                                  <>
                                    <FontAwesomeIcon icon={faPrint} style={{ fontSize: '11px', color: isDark ? '#60A5FA' : '#0284C7' }} />
                                    <span>Print</span>
                                  </>
                                )}
                              </button>

                              {/* View Details Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(psiko)}
                                title="Lihat Detail & Matriks DISC"
                                style={{
                                  background: cardBg,
                                  border: `1px solid ${borderColor}`,
                                  color: textSecondary,
                                  borderRadius: '6px',
                                  padding: '6px 9px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = textPrimary }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = textSecondary }}
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(psiko)}
                                title="Hapus Data Peserta"
                                style={{
                                  background: isDark ? '#3F1D1D' : '#FEE2E2',
                                  border: 'none',
                                  color: '#DC2626',
                                  borderRadius: '6px',
                                  padding: '6px 9px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>

                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Matching /data/pyp) */}
            {pagination.totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderTop: `1px solid ${borderColor}`,
                fontSize: '12.5px',
                color: textSecondary,
                background: isDark ? '#141416' : '#FAFAFA'
              }}>
                <div>
                  Halaman <span className="font-semibold text-primary">{pagination.page}</span> dari <span className="font-semibold text-primary">{pagination.totalPages}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchResults(pagination.page - 1)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: cardBg,
                      color: textPrimary,
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                      opacity: pagination.page <= 1 ? 0.5 : 1
                    }}
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchResults(pagination.page + 1)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: cardBg,
                      color: textPrimary,
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                      opacity: pagination.page >= pagination.totalPages ? 0.5 : 1
                    }}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      {/* ── 7. MODAL DETAIL / QUICK VIEW MATRIKS DISC ───────────────────── */}
      {selectedDetail && (
        <Modal
          isOpen={!!selectedDetail}
          onClose={() => setSelectedDetail(null)}
          title={`Detail Hasil Psikotes - ${selectedDetail.result?.nama || ''}`}
        >
          <div style={{ padding: '8px 0', maxHeight: '78vh', overflowY: 'auto' }}>
            {detailLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                Memuat rincian matriks DISC...
              </div>
            ) : selectedDetail.calculation ? (
              <div>
                {/* Info Peserta */}
                <div style={{
                  backgroundColor: isDark ? '#27272A' : '#F9FAFB',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '10px',
                  fontSize: '13px'
                }}>
                  <div>
                    <span style={{ color: textSecondary, display: 'block', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase' }}>Nama Pelamar</span>
                    <strong>{selectedDetail.result.nama}</strong>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, display: 'block', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase' }}>Posisi yang Dilamar</span>
                    <strong>{selectedDetail.result.posisi}</strong>
                  </div>
                  <div>
                    <span style={{ color: textSecondary, display: 'block', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase' }}>Tanggal Pengerjaan</span>
                    <strong>{formatIndonesianDate(selectedDetail.result.tanggal)}</strong>
                  </div>
                </div>

                {/* Matriks Skor DISC */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: textPrimary }}>
                    Matriks Kalkulasi DISC (Raw Scores, Pola Segmen &amp; Top 2)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: isDark ? '#27272A' : '#F1F5F9', borderBottom: `1px solid ${borderColor}` }}>
                        <th style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, textAlign: 'left' }}>Dimensi</th>
                        <th style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>Most (P)</th>
                        <th style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>Least (K)</th>
                        <th style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>Difference (Selisih)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, fontWeight: '600' }}>D (Dominance)</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>{selectedDetail.calculation.raw.most.D}</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>{selectedDetail.calculation.raw.least.D}</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center', fontWeight: '600' }}>{selectedDetail.calculation.raw.diff.D}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, fontWeight: '600' }}>I (Influence)</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>{selectedDetail.calculation.raw.most.I}</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>{selectedDetail.calculation.raw.least.I}</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center', fontWeight: '600' }}>{selectedDetail.calculation.raw.diff.I}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, fontWeight: '600' }}>S (Steadiness)</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>{selectedDetail.calculation.raw.most.S}</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>{selectedDetail.calculation.raw.least.S}</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center', fontWeight: '600' }}>{selectedDetail.calculation.raw.diff.S}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, fontWeight: '600' }}>C (Conscientiousness)</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>{selectedDetail.calculation.raw.most.C}</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>{selectedDetail.calculation.raw.least.C}</td>
                        <td style={{ padding: '7px 12px', border: `1px solid ${borderColor}`, textAlign: 'center', fontWeight: '600' }}>{selectedDetail.calculation.raw.diff.C}</td>
                      </tr>
                      <tr style={{ backgroundColor: isDark ? '#27272A' : '#F8FAFC' }}>
                        <td style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, fontWeight: '700' }}>Pola (Segmen 1-6)</td>
                        <td style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, textAlign: 'center', fontWeight: '700' }}>{selectedDetail.calculation.patterns.most}</td>
                        <td style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, textAlign: 'center', fontWeight: '700' }}>{selectedDetail.calculation.patterns.least}</td>
                        <td style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, textAlign: 'center', fontWeight: '700' }}>{selectedDetail.calculation.patterns.diff}</td>
                      </tr>
                      <tr style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }}>
                        <td style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, fontWeight: '800', color: isDark ? '#93C5FD' : '#1E40AF' }}>2 Tertinggi (Top 2)</td>
                        <td style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, textAlign: 'center', fontWeight: '800', color: '#2563EB', fontSize: '13.5px' }}>{selectedDetail.calculation.top_two.most.code}</td>
                        <td style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, textAlign: 'center', fontWeight: '800', color: '#2563EB', fontSize: '13.5px' }}>{selectedDetail.calculation.top_two.least.code}</td>
                        <td style={{ padding: '8px 12px', border: `1px solid ${borderColor}`, textAlign: 'center', fontWeight: '800', color: '#2563EB', fontSize: '13.5px' }}>{selectedDetail.calculation.top_two.diff.code}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: `1px solid ${borderColor}` }}>
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(null)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '6px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: cardBg,
                      color: textPrimary,
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    Tutup
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGeneratePdf(selectedDetail.result)}
                    style={{
                      padding: '7px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: textPrimary,
                      color: isDark ? '#09090B' : '#FFFFFF',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FontAwesomeIcon icon={faPrint} />
                    <span>Cetak PDF Laporan Lengkap</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* ── 8. MODAL KONFIRMASI HAPUS ───────────────────────────────────── */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Konfirmasi Hapus Data"
        >
          <div style={{ padding: '12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: '#DC2626' }}>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: '20px' }} />
              <div>
                <p style={{ margin: 0, fontWeight: '600', color: textPrimary, fontSize: '13.5px' }}>
                  Hapus data hasil psikotes peserta ini?
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: textSecondary }}>
                  Tindakan ini tidak dapat dibatalkan dan akan menghapus seluruh rekaman jawaban.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: isDark ? '#27272A' : '#F9FAFB',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
              border: `1px solid ${borderColor}`
            }}>
              <div><strong>Nama:</strong> {deleteTarget.nama}</div>
              <div><strong>Posisi:</strong> {deleteTarget.posisi}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: cardBg,
                  color: textPrimary,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDelete}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
