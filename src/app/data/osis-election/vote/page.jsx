'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheckToSlot,
  faCheckCircle,
  faLock,
  faUnlock,
  faUsers,
  faCheck,
  faArrowLeft,
  faExpand,
  faCompress,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons'
import Modal from '@/components/ui/modal'

export default function OsisVotingKioskPage() {
  const searchParams = useSearchParams()
  const electionIdParam = searchParams.get('election_id')

  // Data state
  const [loading, setLoading] = useState(true)
  const [election, setElection] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [errorMessage, setErrorMessage] = useState(null)

  // Kiosk Flow States: 'ready' | 'submitting' | 'thankyou' | 'locked'
  const [kioskState, setKioskState] = useState('ready')

  // Selected candidate for voting modal
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  // Fullscreen state & container
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  // Cross-browser Fullscreen handler
  const toggleFullscreen = () => {
    const elem = containerRef.current || document.documentElement
    const isFs = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    )

    if (!isFs) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen()
        setIsFullscreen(true)
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen()
        setIsFullscreen(true)
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen()
        setIsFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
        setIsFullscreen(false)
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
        setIsFullscreen(false)
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        )
      )
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    document.addEventListener('webkitfullscreenchange', handleFsChange)
    document.addEventListener('mozfullscreenchange', handleFsChange)
    document.addEventListener('MSFullscreenChange', handleFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      document.removeEventListener('webkitfullscreenchange', handleFsChange)
      document.removeEventListener('mozfullscreenchange', handleFsChange)
      document.removeEventListener('MSFullscreenChange', handleFsChange)
    }
  }, [])

  // Fetch election & candidate data
  const fetchKioskData = useCallback(async () => {
    try {
      setLoading(true)
      let url = '/api/osis-election'
      if (electionIdParam) url += `?election_id=${electionIdParam}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        if (!data.selected_election) {
          setErrorMessage('Agenda pemilihan tidak ditemukan atau belum aktif.')
        } else {
          setElection(data.selected_election)
          setCandidates(data.candidates || [])
          setErrorMessage(null)
        }
      } else {
        setErrorMessage(data.message || 'Gagal memuat data bilik suara')
      }
    } catch (err) {
      console.error('Error fetching kiosk data:', err)
      setErrorMessage('Terjadi kendala jaringan saat menghubungkan ke bilik suara.')
    } finally {
      setLoading(false)
    }
  }, [electionIdParam])

  useEffect(() => {
    fetchKioskData()
  }, [fetchKioskData])

  // Handle open confirm modal
  const handleSelectToVote = (cand) => {
    setSelectedCandidate(cand)
    setIsConfirmModalOpen(true)
  }

  // Cast Vote (True Secret Ballot - 100% Anonymous)
  const handleConfirmVote = async () => {
    if (!selectedCandidate || !election) return

    try {
      setKioskState('submitting')
      setIsConfirmModalOpen(false)

      const res = await fetch('/api/osis-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cast_vote',
          election_id: election.id,
          candidate_id: selectedCandidate.id
        })
      })
      const result = await res.json()

      if (result.success) {
        // Vote registered anonymously!
        setKioskState('thankyou')

        // Automatically transition to locked state after 3.5 seconds
        setTimeout(() => {
          setKioskState('locked')
        }, 3500)
      } else {
        alert(result.message || 'Gagal mengirimkan suara. Silakan panggil petugas.')
        setKioskState('ready')
      }
    } catch (err) {
      console.error('Error casting vote:', err)
      alert('Terjadi kendala saat mengirimkan suara. Silakan hubungi petugas.')
      setKioskState('ready')
    }
  }

  // Reset by TPS Officer
  const handleOfficerReset = () => {
    setSelectedCandidate(null)
    setKioskState('ready')
  }

  // ─────────────────────────────────────────────────────────────
  // LOADING STATE (LIGHT THEME)
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center space-y-4">
        <FontAwesomeIcon icon={faCheckToSlot} className="text-4xl text-blue-600 animate-pulse" />
        <p className="text-sm font-semibold text-slate-600">Menyiapkan Bilik Suara...</p>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // ERROR / NOT FOUND STATE (LIGHT THEME)
  // ─────────────────────────────────────────────────────────────
  if (errorMessage || !election) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 text-2xl">
          <FontAwesomeIcon icon={faLock} />
        </div>
        <h2 className="text-xl font-bold">Bilik Suara Belum Tersedia</h2>
        <p className="text-sm text-slate-600 max-w-md">{errorMessage || 'Pemilihan belum dibuka atau tidak ditemukan.'}</p>
        <Link
          href="/data/osis-election"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 transition-colors flex items-center gap-2 shadow-xs"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Kembali ke Panel Pengawas</span>
        </Link>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // CLOSED STATE (LIGHT THEME)
  // ─────────────────────────────────────────────────────────────
  if (election.status !== 'active') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-3xl">
          <FontAwesomeIcon icon={faLock} />
        </div>
        <h2 className="text-2xl font-bold">Bilik Suara Sedang Ditutup</h2>
        <p className="text-sm text-slate-600 max-w-md">
          Agenda pemilihan <strong>{election.title}</strong> saat ini dalam status{' '}
          <span className="font-semibold text-amber-700 uppercase">{election.status}</span>.
          Petugas dapat membuka bilik suara melalui panel admin.
        </p>
        <Link
          href="/data/osis-election"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 transition-colors flex items-center gap-2 shadow-xs"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Buka Panel Pengawas</span>
        </Link>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between select-none relative overflow-x-hidden font-sans"
    >
      {/* ─────────────────────────────────────────────────────────────
          LIGHT TOP BAR WITH OFFICIAL SCHOOL LOGO
      ───────────────────────────────────────────────────────────── */}
      <header className="px-6 py-3.5 border-b border-slate-200/90 bg-white/95 backdrop-blur-md flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <img
            src="/images/login-logo.png"
            alt="Chung Chung Christian School"
            className="h-9 md:h-11 w-auto object-contain"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = '/favicon.png'
            }}
          />

          <div className="hidden sm:block h-7 w-[1px] bg-slate-200" />

          <div>
            <h1 className="text-sm md:text-base font-bold tracking-tight text-slate-900 uppercase">
              {election.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors text-xs flex items-center gap-1.5 shadow-xs"
            title="Layar Penuh"
          >
            <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
            <span className="hidden md:inline">{isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN KIOSK VIEW: READY STATE (LIGHT THEME SURAT SUARA)
      ───────────────────────────────────────────────────────────── */}
      {kioskState === 'ready' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 lg:p-10 flex flex-col justify-center">
          {/* Candidates Grid */}
          <div className={`grid grid-cols-1 ${candidates.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : candidates.length >= 3 ? 'md:grid-cols-3' : 'max-w-md mx-auto'} gap-6 lg:gap-8 w-full`}>
            {candidates.map((cand) => (
              <div
                key={cand.id}
                className="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group relative"
              >
                {/* Candidate Photo */}
                <div className="px-6 pt-6 pb-2 flex flex-col items-center">
                  <div className="w-full aspect-square max-w-[320px] md:max-w-[360px] rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200/80 flex items-center justify-center shadow-inner group-hover:scale-[1.01] transition-transform duration-300">
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
                      <FontAwesomeIcon icon={faUsers} className="text-5xl text-slate-300" />
                    )}
                  </div>
                </div>

                {/* Candidate Names & Slogan */}
                <div className="p-6 pt-4 flex-1 flex flex-col text-center space-y-2.5">
                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Calon Ketua
                    </div>
                    <div className="text-xl md:text-2xl font-black text-slate-900">
                      {cand.leader_name}
                    </div>

                    {cand.vice_name && (
                      <div className="mt-1.5">
                        <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                          Calon Wakil Ketua
                        </div>
                        <div className="text-base md:text-lg font-bold text-slate-700">
                          {cand.vice_name}
                        </div>
                      </div>
                    )}
                  </div>

                  {cand.slogan && (
                    <p className="text-xs md:text-sm italic text-slate-500 pt-1 line-clamp-2">
                      "{cand.slogan}"
                    </p>
                  )}

                  {/* COBLOS BUTTON (Touch/Click Target) */}
                  <div className="pt-5 mt-auto">
                    <button
                      onClick={() => handleSelectToVote(cand)}
                      className="w-full py-4 px-5 rounded-2xl font-bold text-base text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faCheckToSlot} className="text-lg" />
                      <span>Coblos Paslon {cand.candidate_number}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STATE: SUBMITTING / PROSES MEMASUKKAN SUARA (LIGHT THEME)
      ───────────────────────────────────────────────────────────── */}
      {kioskState === 'submitting' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-2xl animate-pulse">
            <FontAwesomeIcon icon={faCheckToSlot} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Menyimpan pilihan...</h2>
        </main>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STATE: THANK YOU SCREEN (SUARA DITERIMA - LIGHT THEME)
      ───────────────────────────────────────────────────────────── */}
      {kioskState === 'thankyou' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 text-3xl shadow-lg shadow-emerald-500/10">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Terima Kasih
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Suara Anda telah tersimpan.
            </p>
          </div>
        </main>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STATE: LOCKED / MENUNGGU PETUGAS TPS RESET (LIGHT THEME)
      ───────────────────────────────────────────────────────────── */}
      {kioskState === 'locked' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 text-2xl">
            <FontAwesomeIcon icon={faLock} />
          </div>

          <div className="space-y-1 max-w-md">
            <h2 className="text-lg font-bold text-slate-800">
              Bilik Selesai Digunakan
            </h2>
          </div>

          {/* Action Box for TPS Officer */}
          <div className="max-w-xs w-full pt-2">
            <button
              onClick={handleOfficerReset}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <FontAwesomeIcon icon={faUnlock} />
              <span>Buka untuk Pemilih Berikutnya</span>
            </button>
          </div>
        </main>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: KONFIRMASI COBLOS (LIGHT THEME)
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Konfirmasi Pilihan"
      >
        {selectedCandidate && (
          <div className="space-y-5 text-center">
            {/* Candidate summary */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center space-y-3">
              {selectedCandidate.photo_url && (
                <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xs">
                  <img
                    src={selectedCandidate.photo_url}
                    alt={selectedCandidate.leader_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <div className="text-base font-extrabold text-slate-900">
                  {selectedCandidate.leader_name}
                </div>
                {selectedCandidate.vice_name && (
                  <div className="text-xs font-semibold text-slate-600">
                    & {selectedCandidate.vice_name}
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm font-medium text-slate-800">
              Pilih <strong>Paslon No. {selectedCandidate.candidate_number}</strong>?
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmVote}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faCheck} />
                <span>Konfirmasi</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
