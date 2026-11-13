'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBolt,
  faSearch,
  faCalendarAlt,
  faRotateRight,
  faTrash,
  faPrint,
  faEye,
  faUser,
  faSpinner,
  faExclamationTriangle,
  faArrowUpRightFromSquare,
  faInbox,
  faListCheck,
  faPlus,
  faPenToSquare,
  faCheckCircle,
  faTimesCircle,
  faKey
} from '@fortawesome/free-solid-svg-icons'
import { AGILITY_INTERPRETATION_BANDS } from '@/lib/agilityCalculator'
import { generateAgilityPDF, formatIndonesianDate } from './lib/agilityPdfGenerator'

const EMPTY_QUESTION_FORM = {
  id: null,
  question_no: 1,
  dimension: 'Dimensi 1',
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  is_active: true
}

export default function AgilityCheckManagementPage() {
  const { isDark } = useTheme()

  // Design tokens matching /data/psikotest
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'
  const accentText = isDark ? '#FBBF24' : '#B45309'
  const accentBg = isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'
  const accentBorder = isDark ? '#D97706' : '#FCD34D'

  const [activeTab, setActiveTab] = useState('results') // 'results' | 'questions'
  const [tableMissing, setTableMissing] = useState(false)

  // Tab 1: Participant Results State
  const [loadingResults, setLoadingResults] = useState(true)
  const [results, setResults] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 })
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [interpretationFilter, setInterpretationFilter] = useState('')
  const [generatingPdfId, setGeneratingPdfId] = useState(null)

  // Detail Modal & Result Delete Modal
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteResultTarget, setDeleteResultTarget] = useState(null)
  const [deleteResultLoading, setDeleteResultLoading] = useState(false)

  // Tab 2: Question Bank State
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [questions, setQuestions] = useState([])
  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [questionError, setQuestionError] = useState('')
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState(null)
  const [deleteQuestionLoading, setDeleteQuestionLoading] = useState(false)

  const fetchResults = useCallback(async (page = 1) => {
    try {
      setLoadingResults(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '15')
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (dateFilter.trim()) params.set('date', dateFilter.trim())
      if (interpretationFilter.trim()) params.set('interpretation', interpretationFilter.trim())

      const res = await fetch(`/api/data/agility-check?${params.toString()}`)
      const json = await res.json()

      if (json.tableMissing) {
        setTableMissing(true)
        setResults([])
        return
      }

      if (json.success) {
        setTableMissing(false)
        setResults(json.data || [])
        setPagination(json.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 })
      }
    } catch (err) {
      console.error('Error fetching agility results:', err)
    } finally {
      setLoadingResults(false)
    }
  }, [searchQuery, dateFilter, interpretationFilter])

  const fetchQuestions = useCallback(async () => {
    try {
      setLoadingQuestions(true)
      const res = await fetch('/api/data/agility-check/questions')
      const json = await res.json()

      if (json.tableMissing) {
        setTableMissing(true)
        setQuestions([])
        return
      }

      if (json.success) {
        setTableMissing(false)
        setQuestions(json.data || [])
      }
    } catch (err) {
      console.error('Error fetching agility questions:', err)
    } finally {
      setLoadingQuestions(false)
    }
  }, [])

  useEffect(() => {
    fetchResults(1)
  }, [fetchResults])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const handleRefreshActive = () => {
    if (activeTab === 'results') {
      fetchResults(pagination.page)
    } else {
      fetchQuestions()
    }
  }

  const handleGeneratePdf = async (row) => {
    try {
      setGeneratingPdfId(row.id)
      const res = await fetch(`/api/data/agility-check/${row.id}`)
      const detailJson = await res.json()
      if (!detailJson.success) {
        alert('Gagal memuat rincian data: ' + detailJson.message)
        return
      }
      await generateAgilityPDF({
        result: detailJson.result,
        items: detailJson.items,
        summary: detailJson.summary
      })
    } catch (err) {
      console.error('Error generating Agility PDF:', err)
      alert('Terjadi kesalahan saat memproses PDF: ' + err.message)
    } finally {
      setGeneratingPdfId(null)
    }
  }

  const handleOpenDetailModal = async (row) => {
    try {
      setDetailLoading(true)
      setSelectedDetail({ result: row })
      const res = await fetch(`/api/data/agility-check/${row.id}`)
      const json = await res.json()
      if (json.success) {
        setSelectedDetail(json)
      } else {
        alert('Gagal memuat rincian: ' + json.message)
      }
    } catch {
      alert('Gagal mengambil detail jawaban.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDeleteResult = async () => {
    if (!deleteResultTarget) return
    try {
      setDeleteResultLoading(true)
      const res = await fetch(`/api/data/agility-check/${deleteResultTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setDeleteResultTarget(null)
        fetchResults(pagination.page)
      } else {
        alert('Gagal menghapus: ' + json.message)
      }
    } catch {
      alert('Terjadi kesalahan saat menghapus data peserta.')
    } finally {
      setDeleteResultLoading(false)
    }
  }

  // Question Bank CRUD handlers
  const openCreateQuestionModal = () => {
    const nextNo = questions.length > 0
      ? Math.max(...questions.map(q => Number(q.question_no) || 0)) + 1
      : 1
    setQuestionError('')
    setQuestionForm({
      ...EMPTY_QUESTION_FORM,
      question_no: nextNo,
      dimension: `Dimensi ${Math.min(4, Math.ceil(nextNo / 4))}`
    })
    setQuestionModalOpen(true)
  }

  const openEditQuestionModal = (q) => {
    setQuestionError('')
    setQuestionForm({
      id: q.id,
      question_no: q.question_no,
      dimension: q.dimension || 'Dimensi 1',
      question_text: q.question_text || '',
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_answer: q.correct_answer || 'A',
      is_active: q.is_active !== false
    })
    setQuestionModalOpen(true)
  }

  const handleSaveQuestion = async (e) => {
    e.preventDefault()
    setQuestionError('')
    try {
      setSavingQuestion(true)
      const isEdit = Boolean(questionForm.id)
      const res = await fetch('/api/data/agility-check/questions', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionForm)
      })
      const json = await res.json()
      if (!json.success) {
        setQuestionError(json.message || 'Gagal menyimpan soal.')
        return
      }
      setQuestionModalOpen(false)
      fetchQuestions()
    } catch (err) {
      setQuestionError(err.message || 'Terjadi kesalahan jaringan.')
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleToggleQuestionActive = async (q) => {
    try {
      const res = await fetch('/api/data/agility-check/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: q.id, is_active: !q.is_active })
      })
      const json = await res.json()
      if (json.success) {
        fetchQuestions()
      } else {
        alert('Gagal mengubah status soal: ' + json.message)
      }
    } catch {
      alert('Terjadi kesalahan saat mengubah status soal.')
    }
  }

  const handleDeleteQuestion = async () => {
    if (!deleteQuestionTarget) return
    try {
      setDeleteQuestionLoading(true)
      const res = await fetch(`/api/data/agility-check/questions?id=${deleteQuestionTarget.id}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (json.success) {
        setDeleteQuestionTarget(null)
        fetchQuestions()
      } else {
        alert('Gagal menghapus soal: ' + json.message)
      }
    } catch {
      alert('Terjadi kesalahan saat menghapus soal.')
    } finally {
      setDeleteQuestionLoading(false)
    }
  }

  const getInitials = (name) => {
    if (!name) return 'AG'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const getInterpretationBadgeStyle = (label) => {
    const band = AGILITY_INTERPRETATION_BANDS.find(b => b.label.toLowerCase() === String(label || '').toLowerCase())
    const tone = band?.tone || 'slate'
    const map = {
      emerald: { bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5', color: isDark ? '#34D399' : '#047857', border: isDark ? '#059669' : '#A7F3D0' },
      sky: { bg: isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF', color: isDark ? '#38BDF8' : '#0369A1', border: isDark ? '#0284C7' : '#BAE6FD' },
      amber: { bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB', color: isDark ? '#FBBF24' : '#B45309', border: isDark ? '#D97706' : '#FDE68A' },
      rose: { bg: isDark ? 'rgba(244, 63, 94, 0.15)' : '#FFF1F2', color: isDark ? '#FB7185' : '#BE123C', border: isDark ? '#E11D48' : '#FECDD3' },
      slate: { bg: isDark ? '#27272A' : '#F1F5F9', color: textSecondary, border: borderColor }
    }
    return map[tone] || map.slate
  }

  const activeQuestionsCount = questions.filter(q => q.is_active).length

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      {/* ── HEADER & BREADCRUMBS ─────────────────────────────────────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[OPERATIONAL]</span>
            <span>/</span>
            <span>[RECRUITMENT]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: accentText }}>[AGILITY CHECK]</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center border" style={{ background: accentBg, borderColor: accentBorder, color: accentText }}>
              <FontAwesomeIcon icon={faBolt} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Agility Check Management
              </h1>
            </div>
          </div>
        </div>

        {/* Action Buttons Header (Single Action Source) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href="https://ccs.sch.id/agility-check/"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs font-mono font-semibold rounded border transition-colors flex items-center gap-1.5 cursor-pointer"
            style={{ background: cardBg, borderColor, color: textPrimary, textDecoration: 'none' }}
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            <span>Public Form (Hostinger)</span>
          </a>

          {activeTab === 'questions' && (
            <button
              type="button"
              onClick={openCreateQuestionModal}
              className="px-3.5 py-1.5 text-xs font-semibold rounded transition-all flex items-center gap-1.5 cursor-pointer"
              style={{ background: isDark ? '#F59E0B' : '#D97706', color: '#FFFFFF', border: 'none' }}
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Tambah Soal</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefreshActive}
            className="px-3.5 py-1.5 text-xs font-semibold rounded transition-all flex items-center gap-1.5 cursor-pointer"
            style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', border: 'none' }}
          >
            <FontAwesomeIcon icon={faRotateRight} spin={activeTab === 'results' ? loadingResults : loadingQuestions} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── MIGRATION WARNING BANNER (IF TABLES NOT YET CREATED) ─────────── */}
      {tableMissing && (
        <div className="p-4 rounded border mb-6 flex items-start gap-3" style={{ background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB', borderColor: accentBorder }}>
          <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: accentText, marginTop: '3px' }} />
          <div style={{ fontSize: '13px' }}>
            <div style={{ fontWeight: 700, color: textPrimary, marginBottom: '4px' }}>
              Tabel Agility Check Belum Dibuat di Supabase
            </div>
            <div style={{ color: textSecondary }}>
              Jalankan file migrasi <code style={{ fontFamily: 'monospace', padding: '1px 5px', borderRadius: '4px', background: isDark ? '#27272A' : '#FEF3C7' }}>migrations/add-agility-check-tables.sql</code> di Supabase SQL Editor untuk membuat tabel dan mengisi 16 soal awal beserta kunci jawabannya.
            </div>
          </div>
        </div>
      )}

      {/* ── TABS NAVIGATION ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '24px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('results')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'results' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'results' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FontAwesomeIcon icon={faUser} style={{ fontSize: '13px' }} />
          Hasil Peserta ({pagination.total})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'questions' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'questions' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FontAwesomeIcon icon={faListCheck} style={{ fontSize: '13px' }} />
          Bank Soal &amp; Kunci Jawaban ({activeQuestionsCount}/{questions.length})
        </button>
      </div>

      {/* ── TAB 1: HASIL PESERTA ─────────────────────────────────────────── */}
      {activeTab === 'results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filter Bar */}
          <div className="p-3.5 rounded border" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: accentText }}>
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

              <div>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: accentText }}>
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

              <div>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: accentText }}>
                  3. HR Interpretation
                </label>
                <select
                  value={interpretationFilter}
                  onChange={e => setInterpretationFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
                >
                  <option value="">Semua Kategori</option>
                  {AGILITY_INTERPRETATION_BANDS.map(b => (
                    <option key={b.key} value={b.label}>{b.label} ({b.rangeLabel16})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                {(searchQuery || dateFilter || interpretationFilter) && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setDateFilter(''); setInterpretationFilter('') }}
                    className="px-3 py-1.5 text-xs font-mono font-medium rounded border transition-colors cursor-pointer"
                    style={{ background: isDark ? '#27272A' : '#F4F4F5', borderColor, color: textSecondary, borderRadius: '4px' }}
                  >
                    Reset
                  </button>
                )}
                <span className="text-[11px] font-mono py-1.5" style={{ color: textSecondary }}>
                  Menampilkan {results.length} dari {pagination.total} peserta
                </span>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: isDark ? '#18181B' : '#F4F4F5', borderBottom: `2px solid ${borderColor}` }}>
                    <th style={{ padding: '10px 14px', width: '50px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: textSecondary, fontFamily: 'monospace' }}>#</th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>Nama Pelamar</th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>Posisi</th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>Tanggal Tes</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>Skor</th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>Interpretasi HR</th>
                    <th style={{ padding: '10px 14px', width: '210px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingResults ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: textSecondary }}>
                        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                        Memuat data Agility Check...
                      </td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: textSecondary }}>
                        <FontAwesomeIcon icon={faInbox} style={{ fontSize: '24px', display: 'block', margin: '0 auto 8px' }} />
                        Belum ada data pengerjaan Agility Check yang tersimpan.
                      </td>
                    </tr>
                  ) : (
                    results.map((row, idx) => {
                      const rowNo = (pagination.page - 1) * pagination.limit + idx + 1
                      const isPrinting = generatingPdfId === row.id
                      const pct = row.max_score > 0 ? Math.round((row.total_score / row.max_score) * 100) : 0
                      const badge = getInterpretationBadgeStyle(row.interpretation)
                      const rowBg = idx % 2 === 0 ? (isDark ? '#141416' : '#FFFFFF') : (isDark ? '#18181B' : '#FAFAFA')

                      return (
                        <tr key={row.id} style={{ background: rowBg, borderBottom: `1px solid ${borderColor}` }}>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: textSecondary, fontFamily: 'monospace', fontSize: '11px' }}>{rowNo}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '6px',
                                background: accentBg, border: `1px solid ${accentBorder}`, color: accentText,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 700, flexShrink: 0
                              }}>
                                {getInitials(row.nama)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: textPrimary, fontSize: '13px' }}>{row.nama}</div>
                                <div style={{ fontSize: '11px', color: textSecondary, fontFamily: 'monospace' }}>ID #{row.id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 8px', borderRadius: '4px', fontSize: '11.5px',
                              fontWeight: 500, backgroundColor: isDark ? '#27272A' : '#F1F5F9', color: textPrimary, border: `1px solid ${borderColor}`
                            }}>
                              {row.posisi}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: textSecondary, fontSize: '12.5px', fontFamily: 'monospace' }}>
                            {formatIndonesianDate(row.tanggal)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'monospace' }}>
                            <span style={{ fontWeight: 700, color: textPrimary }}>{row.total_score}/{row.max_score}</span>
                            <span style={{ display: 'block', fontSize: '11px', color: textSecondary }}>{pct}%</span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 9px', borderRadius: '9999px', fontSize: '11.5px', fontWeight: 600,
                              backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`
                            }}>
                              {row.interpretation || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleGeneratePdf(row)}
                                disabled={isPrinting}
                                title="Cetak Laporan HR (PDF)"
                                style={{
                                  background: cardBg, border: `1px solid ${borderColor}`, color: textPrimary,
                                  borderRadius: '6px', fontWeight: 600, fontSize: '12px', padding: '6px 12px',
                                  display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: isPrinting ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <FontAwesomeIcon icon={isPrinting ? faSpinner : faPrint} spin={isPrinting} style={{ fontSize: '11px', color: accentText }} />
                                <span>{isPrinting ? 'Proses...' : 'Print'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(row)}
                                title="Lihat Rincian Jawaban & Dimensi"
                                style={{
                                  background: cardBg, border: `1px solid ${borderColor}`, color: textSecondary,
                                  borderRadius: '6px', padding: '6px 9px', fontSize: '12px', cursor: 'pointer'
                                }}
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteResultTarget(row)}
                                title="Hapus Data Peserta"
                                style={{
                                  background: isDark ? '#3F1D1D' : '#FEE2E2', border: 'none', color: '#DC2626',
                                  borderRadius: '6px', padding: '6px 9px', fontSize: '12px', cursor: 'pointer'
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

            {pagination.totalPages > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px',
                borderTop: `1px solid ${borderColor}`, fontSize: '12.5px', color: textSecondary, background: isDark ? '#141416' : '#FAFAFA'
              }}>
                <div>
                  Halaman <strong>{pagination.page}</strong> dari <strong>{pagination.totalPages}</strong>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchResults(pagination.page - 1)}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', border: `1px solid ${borderColor}`, backgroundColor: cardBg,
                      color: textPrimary, fontSize: '12px', fontWeight: 500, cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                      opacity: pagination.page <= 1 ? 0.5 : 1
                    }}
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchResults(pagination.page + 1)}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', border: `1px solid ${borderColor}`, backgroundColor: cardBg,
                      color: textPrimary, fontSize: '12px', fontWeight: 500, cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
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
      )}

      {/* ── TAB 2: BANK SOAL & KUNCI JAWABAN ─────────────────────────────── */}
      {activeTab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Rubrik Panduan HR Singkat */}
          <div className="p-4 rounded border" style={{ background: cardBg, borderColor, borderRadius: '10px' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: textPrimary }}>
                  Master Soal, Pilihan (A–D), dan Kunci Jawaban
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: textSecondary }}>
                  Setiap jawaban benar bernilai 1 poin. Soal berstatus <strong>Aktif</strong> otomatis tampil pada formulir Hostinger tanpa memaparkan kunci jawaban ke peserta.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded border" style={{ background: isDark ? '#27272A' : '#F4F4F5', borderColor, color: textSecondary }}>
                Aktif: {activeQuestionsCount} / {questions.length} Soal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {AGILITY_INTERPRETATION_BANDS.map(band => (
                <div key={band.key} className="px-3 py-2 rounded border text-xs" style={{ borderColor, background: isDark ? '#141416' : '#FAFAFA' }}>
                  <div className="font-mono font-bold" style={{ color: textPrimary }}>Skor {band.rangeLabel16}</div>
                  <div style={{ color: textSecondary }}>{band.label}</div>
                </div>
              ))}
            </div>
          </div>

          {loadingQuestions ? (
            <div className="p-12 text-center rounded border" style={{ background: cardBg, borderColor, color: textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
              Memuat bank soal Agility Check...
            </div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center rounded border" style={{ background: cardBg, borderColor, color: textSecondary }}>
              <FontAwesomeIcon icon={faInbox} style={{ fontSize: '24px', display: 'block', margin: '0 auto 8px' }} />
              Belum ada soal Agility Check. Klik tombol &ldquo;Tambah Soal&rdquo; di pojok kanan atas atau jalankan migrasi SQL.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {questions.map(q => {
                const options = [
                  { letter: 'A', text: q.option_a },
                  { letter: 'B', text: q.option_b },
                  { letter: 'C', text: q.option_c },
                  { letter: 'D', text: q.option_d }
                ]

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded border"
                    style={{
                      background: cardBg,
                      borderColor,
                      borderRadius: '10px',
                      opacity: q.is_active ? 1 : 0.65
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded border" style={{ background: accentBg, borderColor: accentBorder, color: accentText }}>
                          No. {q.question_no}
                        </span>
                        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded border" style={{ background: isDark ? '#27272A' : '#F1F5F9', borderColor, color: textPrimary }}>
                          {q.dimension || 'Dimensi 1'}
                        </span>
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded border flex items-center gap-1" style={{
                          background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                          borderColor: isDark ? '#059669' : '#A7F3D0',
                          color: isDark ? '#34D399' : '#047857'
                        }}>
                          <FontAwesomeIcon icon={faKey} style={{ fontSize: '10px' }} />
                          Kunci: {q.correct_answer}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionActive(q)}
                          className="text-xs font-mono px-2.5 py-1 rounded border cursor-pointer"
                          style={{
                            background: q.is_active ? (isDark ? '#18181B' : '#FFFFFF') : (isDark ? '#3F1D1D' : '#FEE2E2'),
                            borderColor: q.is_active ? borderColor : '#FCA5A5',
                            color: q.is_active ? textSecondary : '#DC2626'
                          }}
                          title="Klik untuk mengaktifkan/nonaktifkan soal"
                        >
                          {q.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditQuestionModal(q)}
                          className="px-2.5 py-1 text-xs font-semibold rounded border flex items-center gap-1.5 cursor-pointer"
                          style={{ background: cardBg, borderColor, color: textPrimary }}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: '11px' }} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteQuestionTarget(q)}
                          className="px-2.5 py-1 text-xs font-semibold rounded cursor-pointer"
                          style={{ background: isDark ? '#3F1D1D' : '#FEE2E2', border: 'none', color: '#DC2626' }}
                          title="Hapus soal"
                        >
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: '11px' }} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '14px', color: textPrimary, marginBottom: '10px', lineHeight: 1.5 }}>
                      {q.question_text}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {options.map(opt => {
                        const isKey = q.correct_answer === opt.letter
                        return (
                          <div
                            key={opt.letter}
                            className="px-3 py-2 rounded border text-xs flex items-start gap-2"
                            style={{
                              borderColor: isKey ? (isDark ? '#059669' : '#6EE7B7') : borderColor,
                              background: isKey ? (isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5') : (isDark ? '#141416' : '#FAFAFA'),
                              color: textPrimary
                            }}
                          >
                            <span className="font-mono font-bold" style={{ color: isKey ? (isDark ? '#34D399' : '#047857') : textSecondary }}>
                              {opt.letter}.
                            </span>
                            <span style={{ flex: 1, lineHeight: 1.4 }}>{opt.text}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL DETAIL JAWABAN PESERTA ─────────────────────────────────── */}
      {selectedDetail && (
        <Modal
          isOpen={!!selectedDetail}
          onClose={() => setSelectedDetail(null)}
          title={`Detail Agility Check - ${selectedDetail.result?.nama || ''}`}
          size="lg"
        >
          <div style={{ padding: '4px 0' }}>
            {detailLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                Memuat rincian jawaban &amp; analisis HR...
              </div>
            ) : selectedDetail.summary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Ringkasan Header Peserta */}
                <div
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded border"
                  style={{ background: isDark ? '#27272A' : '#F9FAFB', borderColor }}
                >
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Nama Pelamar</span>
                    <strong className="text-sm">{selectedDetail.result.nama}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Posisi Dilamar</span>
                    <strong className="text-sm">{selectedDetail.result.posisi}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Tanggal Tes</span>
                    <strong className="text-sm">{formatIndonesianDate(selectedDetail.result.tanggal)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase block" style={{ color: textSecondary }}>Skor &amp; Interpretasi</span>
                    <strong className="text-sm" style={{ color: accentText }}>
                      {selectedDetail.summary.total_score}/{selectedDetail.summary.max_score} ({selectedDetail.summary.percentage}%) — {selectedDetail.summary.interpretation}
                    </strong>
                  </div>
                </div>

                {/* Skor Per Dimensi */}
                {selectedDetail.summary.dimensions?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold mb-2 uppercase font-mono" style={{ color: textSecondary }}>
                      Skor per Dimensi
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {selectedDetail.summary.dimensions.map(d => (
                        <div key={d.dimension} className="p-2.5 rounded border" style={{ borderColor, background: isDark ? '#18181B' : '#FFFFFF' }}>
                          <div className="text-xs font-semibold" style={{ color: textSecondary }}>{d.dimension}</div>
                          <div className="text-base font-mono font-bold mt-0.5" style={{ color: textPrimary }}>
                            {d.correct}/{d.total} <span className="text-xs font-normal" style={{ color: textSecondary }}>({d.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabel Jawaban Per Soal */}
                <div>
                  <div className="text-xs font-bold mb-2 uppercase font-mono" style={{ color: textSecondary }}>
                    Rincian Jawaban per Nomor
                  </div>
                  <div style={{ overflowX: 'auto', border: `1px solid ${borderColor}`, borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: isDark ? '#27272A' : '#F1F5F9', borderBottom: `1px solid ${borderColor}` }}>
                          <th style={{ padding: '8px 10px', width: '48px', textAlign: 'center' }}>No</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Pertanyaan &amp; Pilihan Dipilih</th>
                          <th style={{ padding: '8px 10px', width: '76px', textAlign: 'center' }}>Jawaban</th>
                          <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center' }}>Kunci</th>
                          <th style={{ padding: '8px 10px', width: '90px', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedDetail.items || []).map(item => {
                          const selectedText = item[`option_${String(item.selected_option || '').toLowerCase()}`] || '-'
                          return (
                            <tr key={item.question_no} style={{ borderBottom: `1px solid ${borderColor}` }}>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{item.question_no}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <div className="text-[10px] font-mono uppercase mb-0.5" style={{ color: textSecondary }}>{item.dimension}</div>
                                <div style={{ fontWeight: 600, marginBottom: '4px', color: textPrimary }}>{item.question_text}</div>
                                <div style={{ fontSize: '11.5px', color: textSecondary }}>
                                  Dipilih: <strong>{item.selected_option}.</strong> {selectedText}
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{item.selected_option || '-'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{item.correct_answer || '-'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: item.is_correct ? '#16A34A' : '#DC2626' }}>
                                <FontAwesomeIcon icon={item.is_correct ? faCheckCircle : faTimesCircle} style={{ marginRight: '4px' }} />
                                {item.is_correct ? 'Benar' : 'Salah'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: `1px solid ${borderColor}` }}>
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(null)}
                    style={{
                      padding: '7px 16px', borderRadius: '6px', border: `1px solid ${borderColor}`,
                      backgroundColor: cardBg, color: textPrimary, fontSize: '12.5px', cursor: 'pointer'
                    }}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* ── MODAL TAMBAH / EDIT SOAL & KUNCI JAWABAN ─────────────────────── */}
      <Modal
        isOpen={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        title={questionForm.id ? `Edit Soal No. ${questionForm.question_no}` : 'Tambah Soal Agility Check'}
        size="lg"
      >
        <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {questionError && (
            <div className="p-3 rounded border text-xs font-medium" style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C' }}>
              {questionError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Nomor Urut Soal *</label>
              <input
                type="number"
                min={1}
                required
                value={questionForm.question_no}
                onChange={e => setQuestionForm(prev => ({ ...prev, question_no: parseInt(e.target.value, 10) || 1 }))}
                className="w-full px-3 py-2 text-sm rounded border outline-none"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Label Dimensi *</label>
              <input
                type="text"
                required
                placeholder="mis. Dimensi 1"
                value={questionForm.dimension}
                onChange={e => setQuestionForm(prev => ({ ...prev, dimension: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded border outline-none"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Kunci Jawaban *</label>
              <select
                value={questionForm.correct_answer}
                onChange={e => setQuestionForm(prev => ({ ...prev, correct_answer: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded border outline-none font-bold"
                style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary }}
              >
                <option value="A">Pilihan A</option>
                <option value="B">Pilihan B</option>
                <option value="C">Pilihan C</option>
                <option value="D">Pilihan D</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Teks Pertanyaan / Skenario *</label>
            <textarea
              rows={3}
              required
              value={questionForm.question_text}
              onChange={e => setQuestionForm(prev => ({ ...prev, question_text: e.target.value }))}
              placeholder="Tuliskan skenario situasi dan pertanyaan..."
              className="w-full px-3 py-2 text-sm rounded border outline-none"
              style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['A', 'option_a'],
              ['B', 'option_b'],
              ['C', 'option_c'],
              ['D', 'option_d']
            ].map(([letter, field]) => (
              <div key={field}>
                <label className="text-xs font-semibold block mb-1">
                  Pilihan {letter} *{' '}
                  {questionForm.correct_answer === letter && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#DCFCE7', color: '#15803D' }}>
                      KUNCI
                    </span>
                  )}
                </label>
                <textarea
                  rows={2}
                  required
                  value={questionForm[field]}
                  onChange={e => setQuestionForm(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={`Masukkan teks pilihan ${letter}...`}
                  className="w-full px-3 py-2 text-xs rounded border outline-none"
                  style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary }}
                />
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={questionForm.is_active}
              onChange={e => setQuestionForm(prev => ({ ...prev, is_active: e.target.checked }))}
            />
            <span>Aktifkan soal ini pada formulir publik Hostinger</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: `1px solid ${borderColor}` }}>
            <button
              type="button"
              onClick={() => setQuestionModalOpen(false)}
              style={{
                padding: '7px 14px', borderRadius: '6px', border: `1px solid ${borderColor}`,
                backgroundColor: cardBg, color: textPrimary, fontSize: '12.5px', cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingQuestion}
              style={{
                padding: '7px 16px', borderRadius: '6px', border: 'none',
                backgroundColor: isDark ? '#F59E0B' : '#D97706', color: '#FFFFFF',
                fontSize: '12.5px', fontWeight: 600, cursor: savingQuestion ? 'not-allowed' : 'pointer'
              }}
            >
              {savingQuestion ? 'Menyimpan...' : 'Simpan Soal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL KONFIRMASI HAPUS PESERTA ───────────────────────────────── */}
      {deleteResultTarget && (
        <Modal
          isOpen={!!deleteResultTarget}
          onClose={() => setDeleteResultTarget(null)}
          title="Konfirmasi Hapus Data Peserta"
        >
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: '#DC2626' }}>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: '20px' }} />
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: textPrimary, fontSize: '13.5px' }}>
                  Hapus hasil Agility Check peserta ini?
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: textSecondary }}>
                  Seluruh rincian jawaban peserta tersebut akan ikut terhapus permanen.
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: isDark ? '#27272A' : '#F9FAFB', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: `1px solid ${borderColor}` }}>
              <div><strong>Nama:</strong> {deleteResultTarget.nama}</div>
              <div><strong>Posisi:</strong> {deleteResultTarget.posisi}</div>
              <div><strong>Skor:</strong> {deleteResultTarget.total_score}/{deleteResultTarget.max_score}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteResultTarget(null)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${borderColor}`, backgroundColor: cardBg, color: textPrimary, fontSize: '12.5px', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteResultLoading}
                onClick={handleDeleteResult}
                style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 600, cursor: deleteResultLoading ? 'not-allowed' : 'pointer' }}
              >
                {deleteResultLoading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL KONFIRMASI HAPUS SOAL ──────────────────────────────────── */}
      {deleteQuestionTarget && (
        <Modal
          isOpen={!!deleteQuestionTarget}
          onClose={() => setDeleteQuestionTarget(null)}
          title="Konfirmasi Hapus Soal"
        >
          <div style={{ padding: '8px 0' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: textPrimary }}>
              Yakin ingin menghapus <strong>Soal No. {deleteQuestionTarget.question_no}</strong> ({deleteQuestionTarget.dimension})?
            </p>
            <div style={{ backgroundColor: isDark ? '#27272A' : '#F9FAFB', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', marginBottom: '16px', border: `1px solid ${borderColor}`, color: textSecondary }}>
              {deleteQuestionTarget.question_text}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteQuestionTarget(null)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${borderColor}`, backgroundColor: cardBg, color: textPrimary, fontSize: '12.5px', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteQuestionLoading}
                onClick={handleDeleteQuestion}
                style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 600, cursor: deleteQuestionLoading ? 'not-allowed' : 'pointer' }}
              >
                {deleteQuestionLoading ? 'Menghapus...' : 'Ya, Hapus Soal'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
