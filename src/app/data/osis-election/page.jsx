'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheckToSlot,
  faVoteYea,
  faUsers,
  faUserTie,
  faTv,
  faPlus,
  faTrash,
  faEdit,
  faRotateRight,
  faCheck,
  faXmark,
  faExclamationTriangle,
  faCalendarAlt,
  faArrowUpRightFromSquare,
  faLock,
  faUnlock,
  faChartColumn,
  faCircleCheck,
  faSquareCheck,
  faEye,
  faUpload,
  faImage,
  faSpinner
} from '@fortawesome/free-solid-svg-icons'

// Preset colors for candidate branding
const PRESET_COLORS = [
  { name: 'Blue', hex: '#3B82F6', label: 'Biru' },
  { name: 'Red', hex: '#EF4444', label: 'Merah' },
  { name: 'Emerald', hex: '#10B981', label: 'Hijau' },
  { name: 'Amber', hex: '#F59E0B', label: 'Kuning / Emas' },
  { name: 'Purple', hex: '#8B5CF6', label: 'Ungu' },
  { name: 'Orange', hex: '#F97316', label: 'Oranye' },
  { name: 'Teal', hex: '#14B8A6', label: 'Toska' },
  { name: 'Rose', hex: '#F43F5E', label: 'Merah Muda' },
]

export default function OsisElectionManagementPage() {
  const { theme, isDark } = useTheme()

  // Theme tokens
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#141416' : '#FFFFFF'
  const subtleBg = isDark ? '#1E1E22' : '#F4F4F5'
  const borderColor = isDark ? '#27272A' : '#E4E4E7'
  const textPrimary = isDark ? '#FAFAFA' : '#18181B'
  const textSecondary = isDark ? '#A1A1AA' : '#71717A'

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [years, setYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState(null)
  const [elections, setElections] = useState([])
  const [selectedElection, setSelectedElection] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [quickCount, setQuickCount] = useState(null)
  const [defaultStudentCount, setDefaultStudentCount] = useState(0)

  // Modals state
  const [isElectionModalOpen, setIsElectionModalOpen] = useState(false)
  const [electionForm, setElectionForm] = useState({
    title: '',
    description: '',
    target_dpt: 0,
    status: 'draft'
  })

  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [candidateForm, setCandidateForm] = useState({
    candidate_number: 1,
    leader_name: '',
    vice_name: '',
    photo_url: '',
    vision: '',
    mission: '',
    slogan: '',
    color: '#3B82F6'
  })

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (message, type = 'success') => {
    setToastMsg({ message, type })
    setTimeout(() => setToastMsg(null), 3500)
  }

  // Fetch Data
  const fetchData = useCallback(async (yearId = null, electionId = null) => {
    try {
      setLoading(true)
      let url = '/api/osis-election'
      const params = new URLSearchParams()
      if (yearId) params.set('year_id', yearId)
      if (electionId) params.set('election_id', electionId)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        setYears(data.years || [])
        setSelectedYearId(data.selected_year_id)
        setElections(data.elections || [])
        setSelectedElection(data.selected_election || null)
        setCandidates(data.candidates || [])
        setQuickCount(data.quick_count || null)
        setDefaultStudentCount(data.default_student_count || 0)
      } else {
        showToast(data.message || 'Gagal memuat data', 'error')
      }
    } catch (err) {
      console.error('Error fetching OSIS election data:', err)
      showToast('Gagal terhubung ke server', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Open Election Form Modal
  const handleOpenElectionModal = (election = null) => {
    if (election) {
      setElectionForm({
        id: election.id,
        title: election.title,
        description: election.description || '',
        target_dpt: election.target_dpt || defaultStudentCount,
        status: election.status || 'draft'
      })
    } else {
      const activeYear = years.find(y => y.year_id === selectedYearId)
      const yearName = activeYear ? activeYear.year_name : '2026/2027'
      setElectionForm({
        title: `Pemilihan Ketua & Wakil Ketua OSIS ${yearName}`,
        description: `Pemilihan Umum Ketua dan Wakil Ketua OSIS Periode ${yearName}`,
        target_dpt: defaultStudentCount || 55,
        status: 'draft'
      })
    }
    setIsElectionModalOpen(true)
  }

  // Save Election
  const handleSaveElection = async (e) => {
    e.preventDefault()
    if (!electionForm.title.trim()) {
      showToast('Judul pemilihan wajib diisi', 'error')
      return
    }

    try {
      setSaving(true)
      const payload = {
        action: 'create_or_update_election',
        id: electionForm.id || undefined,
        year_id: selectedYearId,
        title: electionForm.title,
        description: electionForm.description,
        target_dpt: Number(electionForm.target_dpt) || 0,
        status: electionForm.status
      }

      const res = await fetch('/api/osis-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await res.json()

      if (result.success) {
        showToast('Data pemilihan berhasil disimpan')
        setIsElectionModalOpen(false)
        fetchData(selectedYearId, result.data?.id)
      } else {
        showToast(result.message || 'Gagal menyimpan pemilihan', 'error')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Quick Toggle Election Status (Draft / Active / Closed)
  const handleToggleStatus = async (newStatus) => {
    if (!selectedElection) return
    try {
      setSaving(true)
      const res = await fetch('/api/osis-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          election_id: selectedElection.id,
          status: newStatus
        })
      })
      const result = await res.json()
      if (result.success) {
        showToast(`Status bilik suara diubah menjadi: ${newStatus.toUpperCase()}`)
        fetchData(selectedYearId, selectedElection.id)
      } else {
        showToast(result.message, 'error')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Open Candidate Form Modal
  const handleOpenCandidateModal = (cand = null) => {
    if (cand) {
      setEditingCandidate(cand)
      setCandidateForm({
        candidate_number: cand.candidate_number || 1,
        leader_name: cand.leader_name || '',
        vice_name: cand.vice_name || '',
        photo_url: cand.photo_url || '',
        vision: cand.vision || '',
        mission: cand.mission || '',
        slogan: cand.slogan || '',
        color: cand.color || '#3B82F6'
      })
    } else {
      setEditingCandidate(null)
      const nextNum = candidates.length > 0
        ? Math.max(...candidates.map(c => c.candidate_number || 0)) + 1
        : 1
      const colorPreset = PRESET_COLORS[(nextNum - 1) % PRESET_COLORS.length]?.hex || '#3B82F6'
      setCandidateForm({
        candidate_number: nextNum,
        leader_name: '',
        vice_name: '',
        photo_url: '',
        vision: '',
        mission: '',
        slogan: '',
        color: colorPreset
      })
    }
    setIsCandidateModalOpen(true)
  }

  // Upload Candidate Photo to Supabase Storage
  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran file foto maksimal 10 MB', 'error')
      return
    }

    try {
      setUploadingPhoto(true)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/osis-election/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (data.success && data.url) {
        setCandidateForm(prev => ({ ...prev, photo_url: data.url }))
        showToast('Foto paslon berhasil diunggah')
      } else {
        showToast(data.message || 'Gagal mengunggah foto', 'error')
      }
    } catch (err) {
      console.error('Upload error:', err)
      showToast('Terjadi kesalahan saat upload foto', 'error')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  // Save Candidate
  const handleSaveCandidate = async (e) => {
    e.preventDefault()
    if (!selectedElection) {
      showToast('Buat atau pilih pemilihan terlebih dahulu', 'error')
      return
    }
    if (!candidateForm.leader_name.trim()) {
      showToast('Nama Calon Ketua wajib diisi', 'error')
      return
    }

    try {
      setSaving(true)
      const payload = {
        action: 'save_candidate',
        id: editingCandidate ? editingCandidate.id : undefined,
        election_id: selectedElection.id,
        candidate_number: Number(candidateForm.candidate_number),
        leader_name: candidateForm.leader_name,
        vice_name: candidateForm.vice_name,
        photo_url: candidateForm.photo_url,
        vision: candidateForm.vision,
        mission: candidateForm.mission,
        slogan: candidateForm.slogan,
        color: candidateForm.color
      }

      const res = await fetch('/api/osis-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await res.json()

      if (result.success) {
        showToast(editingCandidate ? 'Kandidat diperbarui' : 'Kandidat baru ditambahkan')
        setIsCandidateModalOpen(false)
        fetchData(selectedYearId, selectedElection.id)
      } else {
        showToast(result.message, 'error')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete Candidate
  const handleDeleteCandidate = async (candidateId) => {
    if (!confirm('Hapus calon ini dari daftar pemilihan?')) return

    try {
      setSaving(true)
      const res = await fetch('/api/osis-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_candidate',
          id: candidateId,
          election_id: selectedElection?.id
        })
      })
      const result = await res.json()
      if (result.success) {
        showToast('Kandidat berhasil dihapus')
        fetchData(selectedYearId, selectedElection?.id)
      } else {
        showToast(result.message, 'error')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Reset Votes
  const handleResetVotes = async () => {
    if (!selectedElection) return
    try {
      setSaving(true)
      const res = await fetch('/api/osis-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_votes',
          election_id: selectedElection.id
        })
      })
      const result = await res.json()
      if (result.success) {
        showToast('Seluruh perolehan suara berhasil di-reset')
        setIsResetModalOpen(false)
        fetchData(selectedYearId, selectedElection.id)
      } else {
        showToast(result.message, 'error')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6" style={{ background: pageBg, color: textPrimary }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-3 transition-all ${
            toastMsg.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <FontAwesomeIcon icon={toastMsg.type === 'error' ? faExclamationTriangle : faCircleCheck} />
          <span>{toastMsg.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        className="p-6 rounded-2xl border transition-all"
        style={{
          background: cardBg,
          borderColor: borderColor
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-blue-500"
                style={{ background: subtleBg }}
              >
                <FontAwesomeIcon icon={faVoteYea} className="text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Pemilihan OSIS & Live Quick Count</h1>
                <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
                  Manajemen Calon / Paslon Ketua & Wakil Ketua OSIS dan Pengawasan Perolehan Suara Real-time
                </p>
              </div>
            </div>
          </div>

          {/* Academic Year Selector & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: textSecondary }}>
                Tahun Ajaran:
              </span>
              <select
                value={selectedYearId || ''}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setSelectedYearId(val)
                  fetchData(val)
                }}
                className="text-xs font-semibold px-3 py-2 rounded-lg border focus:outline-none transition-colors"
                style={{
                  background: subtleBg,
                  borderColor: borderColor,
                  color: textPrimary
                }}
              >
                {years.map(y => (
                  <option key={y.year_id} value={y.year_id}>
                    {y.year_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchData(selectedYearId, selectedElection?.id)}
              disabled={loading}
              className="p-2 rounded-lg border hover:opacity-80 transition-opacity"
              style={{ background: subtleBg, borderColor, color: textSecondary }}
              title="Refresh Data"
            >
              <FontAwesomeIcon icon={faRotateRight} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Link to Live Quick Count */}
            {selectedElection && (
              <Link
                href={`/data/osis-election/live?election_id=${selectedElection.id}&year_id=${selectedYearId}`}
                target="_blank"
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all"
              >
                <FontAwesomeIcon icon={faTv} />
                <span>Live Quick Count</span>
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[10px] opacity-75" />
              </Link>
            )}

            {/* Link to Voting Kiosk (Bilik Suara) */}
            {selectedElection && (
              <Link
                href={`/data/osis-election/vote?election_id=${selectedElection.id}`}
                target="_blank"
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-all"
              >
                <FontAwesomeIcon icon={faCheckToSlot} />
                <span>Bilik Suara (Kiosk)</span>
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[10px] opacity-75" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Election Selector & Status Controls */}
      <div
        className="p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ background: cardBg, borderColor }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>
            Agenda Pemilihan:
          </span>
          {elections.length === 0 ? (
            <span className="text-xs italic" style={{ color: textSecondary }}>
              Belum ada agenda pemilihan di tahun ajaran ini
            </span>
          ) : (
            <select
              value={selectedElection?.id || ''}
              onChange={(e) => {
                const eid = Number(e.target.value)
                const found = elections.find(el => el.id === eid)
                setSelectedElection(found)
                fetchData(selectedYearId, eid)
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border focus:outline-none"
              style={{ background: subtleBg, borderColor, color: textPrimary }}
            >
              {elections.map(el => (
                <option key={el.id} value={el.id}>
                  {el.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => handleOpenElectionModal(null)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 flex items-center gap-1.5"
            style={{ background: subtleBg, borderColor, color: textPrimary }}
          >
            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
            <span>Buat Agenda Baru</span>
          </button>

          {selectedElection && (
            <button
              onClick={() => handleOpenElectionModal(selectedElection)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 flex items-center gap-1.5"
              style={{ background: subtleBg, borderColor, color: textSecondary }}
            >
              <FontAwesomeIcon icon={faEdit} className="text-[10px]" />
              <span>Edit Info</span>
            </button>
          )}
        </div>

        {/* Status Bilik Suara Badge & Toggle */}
        {selectedElection && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: textSecondary }}>
              Status Bilik Suara:
            </span>
            <div className="inline-flex rounded-lg p-0.5 border" style={{ background: subtleBg, borderColor }}>
              <button
                type="button"
                onClick={() => handleToggleStatus('draft')}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  selectedElection.status === 'draft'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Draft (Tutup)
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus('active')}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  selectedElection.status === 'active'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Aktif (Buka Bilik)
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus('closed')}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  selectedElection.status === 'closed'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Selesai (Kunci)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!selectedElection ? (
        <div
          className="p-12 text-center rounded-2xl border flex flex-col items-center justify-center space-y-4"
          style={{ background: cardBg, borderColor }}
        >
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-2xl">
            <FontAwesomeIcon icon={faVoteYea} />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-semibold">Belum Ada Agenda Pemilihan OSIS</h3>
            <p className="text-xs mt-1" style={{ color: textSecondary }}>
              Silakan buat agenda pemilihan untuk tahun ajaran aktif ini untuk mulai mendaftarkan pasangan calon.
            </p>
          </div>
          <button
            onClick={() => handleOpenElectionModal(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Buat Agenda Pemilihan OSIS</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Stats Overview */}
          {quickCount && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border space-y-1" style={{ background: cardBg, borderColor }}>
                <div className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: textSecondary }}>
                  Total Suara Masuk
                </div>
                <div className="text-2xl font-bold text-blue-500">{quickCount.total_votes}</div>
                <div className="text-[10px]" style={{ color: textSecondary }}>
                  Surat suara masuk ke kotak digital
                </div>
              </div>

              <div className="p-4 rounded-xl border space-y-1" style={{ background: cardBg, borderColor }}>
                <div className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: textSecondary }}>
                  Jumlah Paslon
                </div>
                <div className="text-2xl font-bold">{candidates.length}</div>
                <div className="text-[10px]" style={{ color: textSecondary }}>
                  Pasangan calon terdaftar
                </div>
              </div>
            </div>
          )}

          {/* Candidates Header & Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Daftar Calon / Pasangan Calon (Paslon)</h2>
              <p className="text-xs" style={{ color: textSecondary }}>
                Tentukan nomor urut, nama ketua, wakil, foto, dan visi-misi pasangan calon
              </p>
            </div>
            <button
              onClick={() => handleOpenCandidateModal(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Tambah Calon Baru</span>
            </button>
          </div>

          {/* Candidates Cards Grid */}
          {candidates.length === 0 ? (
            <div
              className="p-10 text-center rounded-2xl border"
              style={{ background: cardBg, borderColor }}
            >
              <p className="text-sm font-medium" style={{ color: textSecondary }}>
                Belum ada calon yang didaftarkan untuk pemilihan ini.
              </p>
              <button
                onClick={() => handleOpenCandidateModal(null)}
                className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-medium text-blue-500 border border-blue-500/30 hover:bg-blue-500/10 transition-colors"
              >
                + Tambah Paslon No. 1
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map((cand) => {
                const candResult = quickCount?.results?.find(r => r.id === cand.id)
                const voteCount = candResult?.vote_count || 0
                const votePct = candResult?.percentage || 0
                const isLeader = candResult?.is_leader

                return (
                  <div
                    key={cand.id}
                    className="rounded-2xl border overflow-hidden flex flex-col transition-all hover:shadow-lg relative"
                    style={{
                      background: cardBg,
                      borderColor: isLeader ? cand.color || '#3B82F6' : borderColor,
                      boxShadow: isLeader ? `0 0 15px ${cand.color}25` : undefined
                    }}
                  >
                    {/* Top Color Accent Strip */}
                    <div className="h-2 w-full" style={{ background: cand.color || '#3B82F6' }} />

                    <div className="p-5 flex-1 flex flex-col space-y-4">
                      {/* Number Badge & Leader Tag */}
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm"
                          style={{ background: cand.color || '#3B82F6' }}
                        >
                          #{cand.candidate_number}
                        </div>

                        {isLeader && (
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white tracking-wide uppercase shadow-sm"
                            style={{ background: cand.color || '#3B82F6' }}
                          >
                            Unggul Sementara
                          </span>
                        )}
                      </div>

                      {/* Photo & Names */}
                      <div className="flex items-center gap-4">
                        <div
                          className="w-20 h-20 rounded-xl overflow-hidden border flex-shrink-0 flex items-center justify-center"
                          style={{ background: subtleBg, borderColor }}
                        >
                          {cand.photo_url ? (
                            <img
                              src={cand.photo_url}
                              alt={cand.leader_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <FontAwesomeIcon icon={faUsers} className="text-2xl text-zinc-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">
                            Calon Ketua:
                          </div>
                          <div className="font-bold text-sm truncate" title={cand.leader_name}>
                            {cand.leader_name}
                          </div>

                          {cand.vice_name && (
                            <>
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 mt-1">
                                Calon Wakil:
                              </div>
                              <div className="font-semibold text-xs truncate" title={cand.vice_name} style={{ color: textSecondary }}>
                                {cand.vice_name}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Slogan */}
                      {cand.slogan && (
                        <div
                          className="p-2.5 rounded-lg text-xs italic border"
                          style={{ background: subtleBg, borderColor, color: textSecondary }}
                        >
                          "{cand.slogan}"
                        </div>
                      )}

                      {/* Vision & Mission preview */}
                      {(cand.vision || cand.mission) && (
                        <div className="space-y-1 text-xs">
                          {cand.vision && (
                            <div>
                              <span className="font-semibold" style={{ color: textPrimary }}>Visi: </span>
                              <span style={{ color: textSecondary }} className="line-clamp-2">
                                {cand.vision}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Live Vote Share Bar */}
                      <div className="pt-2 border-t mt-auto space-y-1.5" style={{ borderColor }}>
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span style={{ color: textSecondary }}>Perolehan Suara:</span>
                          <span className="font-bold" style={{ color: cand.color || '#3B82F6' }}>
                            {voteCount} Suara ({votePct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: subtleBg }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${votePct}%`,
                              background: cand.color || '#3B82F6'
                            }}
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor }}>
                        <button
                          onClick={() => handleOpenCandidateModal(cand)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 flex items-center gap-1.5 transition-colors"
                          style={{ background: subtleBg, borderColor, color: textPrimary }}
                        >
                          <FontAwesomeIcon icon={faEdit} className="text-[10px]" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCandidate(cand.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Danger Zone: Reset Votes */}
          <div
            className="p-5 rounded-2xl border border-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{ background: isDark ? '#1C1315' : '#FFF1F2' }}
          >
            <div>
              <h4 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>Pengaturan Ulang (Reset Suara)</span>
              </h4>
              <p className="text-xs text-rose-500/80 mt-0.5">
                Gunakan fitur ini hanya untuk gladi bersih / simulasi pemilihan. Seluruh data suara yang masuk akan dihapus menjadi 0.
              </p>
            </div>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm flex items-center gap-2 self-start md:self-auto"
            >
              <FontAwesomeIcon icon={faRotateRight} />
              <span>Reset Hasil Suara</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Election */}
      <Modal
        isOpen={isElectionModalOpen}
        onClose={() => setIsElectionModalOpen(false)}
        title={electionForm.id ? 'Edit Agenda Pemilihan OSIS' : 'Buat Agenda Pemilihan OSIS'}
      >
        <form onSubmit={handleSaveElection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
              Judul Pemilihan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={electionForm.title}
              onChange={(e) => setElectionForm({ ...electionForm, title: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border focus:outline-none"
              style={{ background: subtleBg, borderColor, color: textPrimary }}
              placeholder="Contoh: Pemilihan Ketua & Wakil Ketua OSIS 2026/2027"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
              Deskripsi Singkat
            </label>
            <textarea
              value={electionForm.description}
              onChange={(e) => setElectionForm({ ...electionForm, description: e.target.value })}
              rows={2}
              className="w-full text-xs px-3 py-2 rounded-lg border focus:outline-none"
              style={{ background: subtleBg, borderColor, color: textPrimary }}
              placeholder="Keterangan tambahan atau jadwal pemilihan..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
                Target DPT (Jumlah Pemilih)
              </label>
              <input
                type="number"
                min="0"
                value={electionForm.target_dpt}
                onChange={(e) => setElectionForm({ ...electionForm, target_dpt: Number(e.target.value) })}
                className="w-full text-xs px-3 py-2 rounded-lg border focus:outline-none"
                style={{ background: subtleBg, borderColor, color: textPrimary }}
              />
              <span className="text-[10px]" style={{ color: textSecondary }}>
                Ref: {defaultStudentCount} siswa aktif di sistem
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
                Status Bilik Suara
              </label>
              <select
                value={electionForm.status}
                onChange={(e) => setElectionForm({ ...electionForm, status: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border focus:outline-none"
                style={{ background: subtleBg, borderColor, color: textPrimary }}
              >
                <option value="draft">Draft (Tutup)</option>
                <option value="active">Active (Voting Dibuka)</option>
                <option value="closed">Closed (Selesai)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => setIsElectionModalOpen(false)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border hover:opacity-80"
              style={{ background: subtleBg, borderColor, color: textPrimary }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {saving ? 'Menyimpan...' : 'Simpan Agenda'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create/Edit Candidate */}
      <Modal
        isOpen={isCandidateModalOpen}
        onClose={() => setIsCandidateModalOpen(false)}
        title={editingCandidate ? `Edit Paslon #${editingCandidate.candidate_number}` : 'Tambah Calon Baru'}
      >
        <form onSubmit={handleSaveCandidate} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
                Nomor Urut <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={candidateForm.candidate_number}
                onChange={(e) => setCandidateForm({ ...candidateForm, candidate_number: Number(e.target.value) })}
                className="w-full text-xs px-3 py-2 rounded-lg border focus:outline-none font-bold"
                style={{ background: subtleBg, borderColor, color: textPrimary }}
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
                Warna Tema Paslon
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={candidateForm.color}
                  onChange={(e) => setCandidateForm({ ...candidateForm, color: e.target.value })}
                  className="w-8 h-8 rounded border p-0 cursor-pointer"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map(p => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setCandidateForm({ ...candidateForm, color: p.hex })}
                      className="w-5 h-5 rounded-full border transition-transform hover:scale-110"
                      style={{
                        background: p.hex,
                        borderColor: candidateForm.color === p.hex ? '#FFF' : 'transparent',
                        outline: candidateForm.color === p.hex ? `2px solid ${p.hex}` : 'none'
                      }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
                Nama Calon Ketua <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={candidateForm.leader_name}
                onChange={(e) => setCandidateForm({ ...candidateForm, leader_name: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border focus:outline-none font-medium"
                style={{ background: subtleBg, borderColor, color: textPrimary }}
                placeholder="Nama lengkap calon ketua"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
                Nama Calon Wakil Ketua
              </label>
              <input
                type="text"
                value={candidateForm.vice_name}
                onChange={(e) => setCandidateForm({ ...candidateForm, vice_name: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border focus:outline-none font-medium"
                style={{ background: subtleBg, borderColor, color: textPrimary }}
                placeholder="Nama lengkap calon wakil (opsional)"
              />
            </div>
          </div>

          {/* Upload Foto Paslon */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: textPrimary }}>
              Foto Pasangan Calon
            </label>

            <div className="flex items-start gap-4 p-3 rounded-xl border" style={{ background: subtleBg, borderColor }}>
              {/* Preview Avatar */}
              <div
                className="w-20 h-20 rounded-xl overflow-hidden border flex-shrink-0 flex items-center justify-center bg-zinc-850 relative"
                style={{ borderColor }}
              >
                {candidateForm.photo_url ? (
                  <img
                    src={candidateForm.photo_url}
                    alt="Preview Paslon"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <FontAwesomeIcon icon={faUsers} className="text-2xl text-zinc-500" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm ${uploadingPhoto ? 'opacity-60 pointer-events-none' : ''}`}>
                    <FontAwesomeIcon icon={uploadingPhoto ? faSpinner : faUpload} className={uploadingPhoto ? 'animate-spin' : ''} />
                    <span>{uploadingPhoto ? 'Mengunggah...' : 'Pilih & Upload Foto'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploadingPhoto}
                      onChange={handleUploadPhoto}
                    />
                  </label>

                  {candidateForm.photo_url && (
                    <button
                      type="button"
                      onClick={() => setCandidateForm({ ...candidateForm, photo_url: '' })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>

                <div className="text-[10px]" style={{ color: textSecondary }}>
                  Mendukung format JPG, PNG, WEBP (Maks. 10 MB). Tersimpan di Supabase Storage (<span className="font-mono text-blue-400">osis-assets</span>).
                </div>

                <input
                  type="text"
                  value={candidateForm.photo_url}
                  onChange={(e) => setCandidateForm({ ...candidateForm, photo_url: e.target.value })}
                  className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border focus:outline-none font-mono"
                  style={{ background: cardBg, borderColor, color: textPrimary }}
                  placeholder="Atau tempel URL gambar langsung (https://...)"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
              Slogan / Tagline
            </label>
            <input
              type="text"
              value={candidateForm.slogan}
              onChange={(e) => setCandidateForm({ ...candidateForm, slogan: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border focus:outline-none"
              style={{ background: subtleBg, borderColor, color: textPrimary }}
              placeholder="Contoh: Bersama Mewujudkan Aspirasi Siswa Berkarya"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
              Visi
            </label>
            <textarea
              value={candidateForm.vision}
              onChange={(e) => setCandidateForm({ ...candidateForm, vision: e.target.value })}
              rows={2}
              className="w-full text-xs px-3 py-2 rounded-lg border focus:outline-none"
              style={{ background: subtleBg, borderColor, color: textPrimary }}
              placeholder="Visi pasangan calon..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>
              Misi (Poin-poin Program Kerja)
            </label>
            <textarea
              value={candidateForm.mission}
              onChange={(e) => setCandidateForm({ ...candidateForm, mission: e.target.value })}
              rows={3}
              className="w-full text-xs px-3 py-2 rounded-lg border focus:outline-none font-mono"
              style={{ background: subtleBg, borderColor, color: textPrimary }}
              placeholder="1. Meningkatkan kegiatan ekstrakurikuler&#10;2. Menampung aspirasi siswa secara berkala..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => setIsCandidateModalOpen(false)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border hover:opacity-80"
              style={{ background: subtleBg, borderColor, color: textPrimary }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {saving ? 'Menyimpan...' : 'Simpan Calon'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirm Reset Votes */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Konfirmasi Reset Perolehan Suara"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 flex items-start gap-2.5">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5" />
            <div>
              <strong>Peringatan Serius:</strong> Tindakan ini akan menghapus semua suara ({quickCount?.total_votes || 0} suara) yang telah masuk pada agenda <strong>{selectedElection?.title}</strong>.
            </div>
          </div>
          <p className="text-xs" style={{ color: textSecondary }}>
            Apakah Anda yakin ingin mengosongkan kembali hasil perolehan suara menjadi 0? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border hover:opacity-80"
              style={{ background: subtleBg, borderColor, color: textPrimary }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleResetVotes}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
            >
              {saving ? 'Mereset...' : 'Ya, Kosongkan Suara'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
