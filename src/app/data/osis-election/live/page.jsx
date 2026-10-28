'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCrown,
  faExpand,
  faCompress,
  faCheckToSlot,
  faVoteYea,
  faUsers,
  faCheckCircle,
  faPalette,
  faShieldAlt,
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons'

const PRESET_COLORS = [
  { name: 'Blue', hex: '#3B82F6', label: 'Biru' },
  { name: 'Red', hex: '#EF4444', label: 'Merah' },
  { name: 'Emerald', hex: '#10B981', label: 'Hijau' },
  { name: 'Green', hex: '#22C55E', label: 'Hijau' },
  { name: 'Amber', hex: '#F59E0B', label: 'Kuning' },
  { name: 'Yellow', hex: '#EAB308', label: 'Kuning' },
  { name: 'Purple', hex: '#8B5CF6', label: 'Ungu' },
  { name: 'Orange', hex: '#F97316', label: 'Oranye' },
  { name: 'Teal', hex: '#14B8A6', label: 'Toska' },
  { name: 'Cyan', hex: '#06B6D4', label: 'Sian' },
  { name: 'Rose', hex: '#F43F5E', label: 'Merah Muda' },
  { name: 'Pink', hex: '#EC4899', label: 'Merah Muda' },
  { name: 'Indigo', hex: '#6366F1', label: 'Nila' },
]

function getColorName(hex) {
  if (!hex) return 'Misteri'
  const found = PRESET_COLORS.find(p => p.hex.toLowerCase() === hex.toLowerCase())
  if (found) return found.label
  return 'Warna Khusus'
}

export default function OsisElectionLiveQuickCountPage() {
  const searchParams = useSearchParams()
  const urlElectionId = searchParams.get('election_id')
  const urlYearId = searchParams.get('year_id')

  // States
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [revealed, setRevealed] = useState(false) // Default secret: only colors are shown!
  const [countdown, setCountdown] = useState(null) // 3 | 2 | 1 | null
  const countdownTimersRef = useRef([])

  // Data states
  const [years, setYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState(urlYearId ? Number(urlYearId) : null)
  const [elections, setElections] = useState([])
  const [selectedElectionId, setSelectedElectionId] = useState(urlElectionId ? Number(urlElectionId) : null)
  const [selectedElection, setSelectedElection] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [quickCount, setQuickCount] = useState(null)

  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  // Confetti Animation Engine on Reveal
  const triggerConfetti = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
      '#8B5CF6', '#F43F5E', '#FFD700', '#F97316', '#06B6D4'
    ]
    let particles = []

    const addBurst = (originX, originY, count, angleSpread, baseAngle) => {
      for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * angleSpread
        const speed = Math.random() * 22 + 10
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: Math.random() * 12 + 6,
          h: Math.random() * 8 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          tilt: Math.random() * 10,
          tiltSpeed: Math.random() * 0.08 + 0.04,
          opacity: 1,
          gravity: 0.42,
          drag: 0.96
        })
      }
    }

    // Initial cannon bursts (left, right, center)
    addBurst(canvas.width * 0.15, canvas.height * 0.95, 80, Math.PI / 2.5, -Math.PI / 2.8)
    addBurst(canvas.width * 0.85, canvas.height * 0.95, 80, Math.PI / 2.5, -Math.PI / 1.55)
    addBurst(canvas.width * 0.5, canvas.height * 0.9, 100, Math.PI / 2, -Math.PI / 2)

    // Second wave burst
    const timer1 = setTimeout(() => {
      addBurst(canvas.width * 0.3, canvas.height * 0.9, 70, Math.PI / 2.5, -Math.PI / 2.3)
      addBurst(canvas.width * 0.7, canvas.height * 0.9, 70, Math.PI / 2.5, -Math.PI / 1.7)
    }, 600)

    // Third wave burst
    const timer2 = setTimeout(() => {
      addBurst(canvas.width * 0.5, canvas.height * 0.9, 90, Math.PI / 1.8, -Math.PI / 2)
    }, 1400)

    let animationId
    const startTime = Date.now()
    const duration = 7500

    const render = () => {
      const elapsed = Date.now() - startTime
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.vx *= p.drag
        p.vy = p.vy * p.drag + p.gravity
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.tilt += p.tiltSpeed

        if (elapsed > duration - 2000) {
          p.opacity = Math.max(0, (duration - elapsed) / 2000)
        }

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.scale(Math.cos(p.tilt), 1)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })

      particles = particles.filter(p => p.y < canvas.height + 60 && p.opacity > 0)

      if (elapsed < duration && particles.length > 0) {
        animationId = requestAnimationFrame(render)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    animationId = requestAnimationFrame(render)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      cancelAnimationFrame(animationId)
    }
  }, [])

  // Dramatic 5-4-3-2-1 Countdown before Reveal
  const startCountdownReveal = () => {
    if (revealed) {
      setRevealed(false)
      setCountdown(null)
      return
    }

    // Clear any previous timers
    countdownTimersRef.current.forEach(clearTimeout)
    countdownTimersRef.current = []

    setCountdown(5)

    const t1 = setTimeout(() => {
      setCountdown(4)
    }, 1000)

    const t2 = setTimeout(() => {
      setCountdown(3)
    }, 2000)

    const t3 = setTimeout(() => {
      setCountdown(2)
    }, 3000)

    const t4 = setTimeout(() => {
      setCountdown(1)
    }, 4000)

    const t5 = setTimeout(() => {
      setCountdown(null)
      setRevealed(true)
      triggerConfetti()
    }, 5000)

    countdownTimersRef.current = [t1, t2, t3, t4, t5]
  }

  const cancelCountdown = () => {
    countdownTimersRef.current.forEach(clearTimeout)
    countdownTimersRef.current = []
    setCountdown(null)
  }

  useEffect(() => {
    return () => {
      countdownTimersRef.current.forEach(clearTimeout)
    }
  }, [])

  // Real-time clock update (WIB)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' WIB'
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Cross-browser Fullscreen handlers
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

  // Fetch Live Data
  const fetchLiveData = useCallback(async (yearId, electionId, isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)
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
        setSelectedElectionId(data.selected_election?.id || null)
        setCandidates(data.candidates || [])
        setQuickCount(data.quick_count || null)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Error fetching live quick count data:', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLiveData(selectedYearId, selectedElectionId, false)
  }, [])

  // Auto-polling interval: refresh every 3 seconds for broadcast
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLiveData(selectedYearId, selectedElectionId, true)
    }, 3000)
    return () => clearInterval(timer)
  }, [fetchLiveData, selectedYearId, selectedElectionId])

  const totalVotes = quickCount?.total_votes || 0

  // Attach vote data and rank to candidates
  const candidateStats = candidates.map(cand => {
    const res = quickCount?.results?.find(r => r.id === cand.id)
    return {
      ...cand,
      voteCount: res?.vote_count || 0,
      votePct: res?.percentage || 0
    }
  })

  // Sorted strictly by vote rank descending (1st place, 2nd place, 3rd place...)
  const rankedCandidates = [...candidateStats]
    .sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount
      return (a.candidate_number || 0) - (b.candidate_number || 0)
    })
    .map((cand, idx) => ({
      ...cand,
      rank: idx + 1,
      isWinner: idx === 0
    }))

  // Winning candidate calculation for announcement banner (highest vote)
  const winningCandidate = rankedCandidates.length > 0 ? rankedCandidates[0] : null
  const winnerName = winningCandidate
    ? `${winningCandidate.leader_name}${winningCandidate.vice_name ? ` & ${winningCandidate.vice_name}` : ''}`
    : 'Paslon Terpilih'

  // Display ordering:
  // When NOT revealed: sort neutrally by candidate_number so no one knows who is leading
  // When REVEALED: arrange in podium order with Winner (Rank 1) in the CENTER!
  const displayCandidates = (() => {
    if (!revealed) {
      return [...candidateStats].sort((a, b) => (a.candidate_number || 0) - (b.candidate_number || 0))
    }

    if (rankedCandidates.length === 3) {
      // 3 Candidates: [Rank 2 (Left), Rank 1 (Center Winner), Rank 3 (Right)]
      return [
        { ...rankedCandidates[1], podiumPos: 'left' },
        { ...rankedCandidates[0], podiumPos: 'center' },
        { ...rankedCandidates[2], podiumPos: 'right' }
      ]
    }

    if (rankedCandidates.length === 2) {
      // 2 Candidates: [Rank 1 (Winner in Center), Rank 2]
      return [
        { ...rankedCandidates[0], podiumPos: 'center' },
        { ...rankedCandidates[1], podiumPos: 'right' }
      ]
    }

    // Generic podium ordering for 4+ candidates:
    // Left: [Rank 4, Rank 2], Center: Rank 1, Right: [Rank 3, Rank 5]
    const left = []
    const right = []
    for (let i = 1; i < rankedCandidates.length; i++) {
      if (i % 2 === 1) left.unshift({ ...rankedCandidates[i], podiumPos: 'left' })
      else right.push({ ...rankedCandidates[i], podiumPos: 'right' })
    }
    return [...left, { ...rankedCandidates[0], podiumPos: 'center' }, ...right]
  })()

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white select-none overflow-x-hidden font-sans relative"
    >
      {/* Confetti Animation Canvas Overlay */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />

      {/* Embedded CSS for countdown & reveal pop animations */}
      <style jsx global>{`
        @keyframes countdownPop {
          0% { transform: scale(1.6); opacity: 0; }
          35% { transform: scale(0.9); opacity: 1; }
          65% { transform: scale(1.06); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* ─────────────────────────────────────────────────────────────
          CINEMATIC COUNTDOWN OVERLAY (5 - 4 - 3 - 2 - 1)
      ───────────────────────────────────────────────────────────── */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md animate-fade-in select-none p-4">
          <div className="text-center max-w-md w-full flex flex-col items-center">
            {/* Glowing Pulsing Countdown Circle & Number */}
            <div className="relative w-48 h-48 md:w-60 md:h-60 flex items-center justify-center my-6">
              {/* Outer pulsing ring on each tick */}
              <div
                key={`ring-${countdown}`}
                className="absolute inset-0 rounded-full border-4 border-amber-400/40 animate-ping"
              />
              <div className="absolute inset-2 rounded-full border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/20 to-amber-700/10 shadow-[0_0_60px_rgba(245,158,11,0.45)] backdrop-blur-sm" />

              {/* Number with pop-in scale animation */}
              <div
                key={countdown}
                className="relative z-10 text-8xl md:text-9xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_10px_25px_rgba(245,158,11,0.85)]"
                style={{
                  animation: 'countdownPop 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) both'
                }}
              >
                {countdown}
              </div>
            </div>

            {/* Cancel option */}
            <button
              type="button"
              onClick={cancelCountdown}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors shadow-sm cursor-pointer"
            >
              Batalkan
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          LIGHT BROADCAST HEADER WITH OFFICIAL SCHOOL LOGO
      ───────────────────────────────────────────────────────────── */}
      <header className="px-6 py-3.5 border-b border-slate-200/90 bg-white/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-4">
          {/* Official School Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/images/login-logo.png"
              alt="Chung Chung Christian School"
              className="h-10 md:h-12 w-auto object-contain"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = '/favicon.png'
              }}
            />

            <div className="hidden sm:block h-8 w-[1px] bg-slate-200" />

            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-rose-50 text-rose-600 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  LIVE QUICK COUNT
                </span>

                <span className="text-xs font-semibold text-slate-500">
                  {selectedElection?.title || 'Pemilihan OSIS'}
                </span>
              </div>

              <h1 className="text-base md:text-lg font-black tracking-tight text-slate-900 mt-0.5">
                HASIL PERHITUNGAN SUARA KETUA & WAKIL KETUA OSIS
              </h1>
            </div>
          </div>
        </div>

        {/* Right Info & Controls */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          {selectedElection && (
            <span
              className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider border shadow-xs ${
                selectedElection.status === 'active'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : selectedElection.status === 'closed'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              {selectedElection.status === 'active'
                ? 'Voting Sedang Berlangsung'
                : selectedElection.status === 'closed'
                ? 'Hasil Akhir (Selesai)'
                : 'Bilik Suara Belum Dibuka'}
            </span>
          )}

          {/* Total Votes Count Badge */}
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2 shadow-2xs">
            <FontAwesomeIcon icon={faVoteYea} className="text-blue-600" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:inline">
                Suara Masuk:
              </span>
              <span className="font-mono font-black text-sm text-slate-900">
                {totalVotes.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Current Time Clock */}
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 tracking-wider font-mono">
              {currentTime}
            </span>
            <span className="text-[10px] text-slate-500">
              Update: {lastUpdated.toLocaleTimeString('id-ID')}
            </span>
          </div>

          {/* Secret / Reveal Mode Toggle (with 5s Countdown) */}
          <button
            onClick={startCountdownReveal}
            disabled={countdown !== null}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
              countdown !== null
                ? 'bg-amber-100 border-amber-300 text-amber-900 animate-pulse cursor-wait'
                : revealed
                ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title={revealed ? 'Kembalikan ke Mode Rahasia (Warna Saja)' : 'Buka Pengumuman Pemenang (Dengan Hitung Mundur 5 Detik)'}
          >
            <FontAwesomeIcon icon={revealed ? faEyeSlash : faEye} />
            <span className="hidden sm:inline">
              {countdown !== null ? `Membuka (${countdown})...` : revealed ? 'Tutup Identitas' : 'Buka Pengumuman'}
            </span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors text-sm shadow-xs"
            title="Layar Penuh / TV Mode"
          >
            <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN BROADCAST CONTENT (CLEAN LIGHT DESIGN - FULLY RESPONSIVE)
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-2 sm:py-3 md:py-4 space-y-2.5 sm:space-y-3.5 flex flex-col justify-center">
        {/* Celebration Announcement Banner when Revealed */}
        {revealed && (
          <div className="w-full text-center py-2 sm:py-2.5 px-4 rounded-2xl md:rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border-2 border-amber-300 shadow-md backdrop-blur-md animate-fade-in space-y-0.5 transform transition-all duration-500">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Congratulations to {winnerName}!
            </h2>
            <p className="text-[11px] sm:text-xs md:text-sm font-bold text-amber-800">
              Sebagai Ketua & Wakil Ketua OSIS Terpilih
            </p>
          </div>
        )}

        {/* Candidates Live Podium Cards */}
        {candidates.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-white border border-slate-200 shadow-sm">
            <p className="text-base text-slate-500">Belum ada pasangan calon yang terdaftar pada agenda ini.</p>
          </div>
        ) : revealed ? (
          /* ─────────────────────────────────────────────────────────────
              REVEALED PODIUM PRESENTATION:
              Winner in the center, enlarged, foreground (higher z-index)
              Flanking runners-up on left & right, smaller, background layer
          ───────────────────────────────────────────────────────────── */
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:-space-x-4 lg:-space-x-6 xl:-space-x-8 w-full max-w-6xl mx-auto py-1 sm:py-2 transition-all duration-700">
            {displayCandidates.map((cand) => {
              const isWinner = cand.isWinner
              const isLeft = cand.podiumPos === 'left'

              return (
                <div
                  key={cand.id}
                  className={`rounded-2xl sm:rounded-3xl border bg-white overflow-hidden flex flex-col transition-all duration-700 relative ${
                    isWinner
                      ? 'w-full max-w-[340px] sm:max-w-[370px] md:w-[36%] lg:w-[35%] lg:max-w-[400px] xl:max-w-[420px] flex-shrink-0 z-30 shadow-2xl border-2 border-amber-400 ring-2 sm:ring-4 ring-amber-400/40 md:scale-[1.03] lg:scale-[1.05] order-1 md:order-2'
                      : isLeft
                      ? 'w-full max-w-[280px] sm:max-w-[310px] md:w-[31%] lg:w-[30%] lg:max-w-[330px] xl:max-w-[350px] flex-shrink-0 z-10 shadow-md border-slate-200/90 md:scale-[0.96] lg:scale-[0.95] opacity-95 hover:opacity-100 order-2 md:order-1'
                      : 'w-full max-w-[280px] sm:max-w-[310px] md:w-[31%] lg:w-[30%] lg:max-w-[330px] xl:max-w-[350px] flex-shrink-0 z-10 shadow-md border-slate-200/90 md:scale-[0.96] lg:scale-[0.95] opacity-95 hover:opacity-100 order-3 md:order-3'
                  }`}
                  style={{
                    borderTop: isWinner ? `6px solid ${cand.color || '#F59E0B'}` : `4px solid ${cand.color || '#3B82F6'}`,
                    boxShadow: isWinner
                      ? `0 20px 50px -10px rgba(245, 158, 11, 0.4), 0 0 25px rgba(245, 158, 11, 0.2)`
                      : undefined
                  }}
                >
                  {/* Top Bar with Rank Badge & Winner Badge */}
                  <div className="px-4 sm:px-5 pt-3 sm:pt-4 pb-1.5 flex items-center justify-between">
                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                      isWinner
                        ? 'text-amber-800 bg-amber-100 border-amber-300 ring-1 ring-amber-400/30'
                        : 'text-slate-500 bg-slate-100 border-slate-200'
                    }`}>
                      Peringkat #{cand.rank}
                    </span>

                    {isWinner && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-xs animate-pulse bg-amber-100 border border-amber-400 text-amber-900 ring-1 ring-amber-400/30">
                        <FontAwesomeIcon icon={faCrown} className="text-amber-500 text-xs" />
                        <span>Pemenang Terpilih</span>
                      </div>
                    )}
                  </div>

                  {/* Photo & Candidate Identity */}
                  <div className={`px-4 sm:px-5 pt-1 pb-2 flex flex-col items-center text-center space-y-1.5 sm:space-y-2`}>
                    <div
                      className={`w-full aspect-square ${
                        isWinner
                          ? 'max-h-[180px] sm:max-h-[210px] md:max-h-[230px] lg:max-h-[250px] xl:max-h-[280px] max-w-[240px] sm:max-w-[270px] md:max-w-[300px] rounded-2xl sm:rounded-3xl border-2 border-amber-300 shadow-md'
                          : 'max-h-[140px] sm:max-h-[165px] md:max-h-[180px] lg:max-h-[195px] xl:max-h-[210px] max-w-[190px] sm:max-w-[210px] md:max-w-[240px] rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs'
                      } overflow-hidden bg-slate-100 flex items-center justify-center relative group mx-auto`}
                      style={{
                        boxShadow: isWinner ? `0 0 25px ${cand.color || '#F59E0B'}35` : undefined
                      }}
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
                        <FontAwesomeIcon icon={faUsers} className={`${isWinner ? 'text-5xl' : 'text-4xl'} text-slate-300`} />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h2 className={`${isWinner ? 'text-lg sm:text-xl md:text-2xl' : 'text-base sm:text-lg md:text-xl'} font-black text-slate-900 tracking-tight leading-tight`}>
                        {cand.leader_name}
                      </h2>
                      {cand.vice_name && (
                        <h3 className={`${isWinner ? 'text-xs sm:text-sm md:text-base' : 'text-xs sm:text-sm'} font-bold text-slate-600 leading-tight`}>
                          & {cand.vice_name}
                        </h3>
                      )}
                    </div>

                    {cand.slogan && (
                      <p className="text-[10px] sm:text-[11px] italic text-slate-500 px-2 line-clamp-1 max-w-[280px]">
                        "{cand.slogan}"
                      </p>
                    )}
                  </div>

                  {/* Score & Bar Chart Result Display */}
                  <div className="px-4 sm:px-5 py-2.5 sm:py-3 mt-auto bg-slate-50 border-t border-slate-100 space-y-2">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Perolehan Suara
                        </div>
                        <div className={`${isWinner ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} font-black text-slate-900 font-mono leading-none mt-0.5`}>
                          {cand.voteCount.toLocaleString()}
                          <span className="text-[10px] sm:text-xs font-normal text-slate-500 ml-1 font-sans">
                            suara
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`${isWinner ? 'text-3xl sm:text-4xl md:text-5xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-black font-mono tracking-tight leading-none`}
                          style={{ color: cand.color || '#3B82F6' }}
                        >
                          {cand.votePct}%
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Progress Bar */}
                    <div className="w-full h-3 sm:h-3.5 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300/50">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-xs"
                        style={{
                          width: `${cand.votePct}%`,
                          background: `linear-gradient(90deg, ${cand.color || '#3B82F6'}, ${cand.color ? cand.color + 'DD' : '#60A5FA'})`
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
              SECRET MYSTERY COLOR DISPLAY (BEFORE REVEAL):
              Equal sizes, neutral grid by candidate number, shields
          ───────────────────────────────────────────────────────────── */
          <div className={`grid grid-cols-1 ${candidates.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3 max-w-6xl'} gap-4 sm:gap-6 lg:gap-8 w-full mx-auto py-2 transition-all duration-700`}>
            {displayCandidates.map((cand) => (
              <div
                key={cand.id}
                className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white overflow-hidden flex flex-col shadow-md hover:shadow-xl transition-all duration-500 relative"
                style={{
                  borderTop: `6px solid ${cand.color || '#3B82F6'}`
                }}
              >
                {/* Clean Top Spacer */}
                <div className="px-4 py-2 h-8 sm:h-10" />

                {/* Secret Color Display Shield */}
                <div className="px-4 pb-2 pt-1 flex flex-col items-center text-center">
                  <div className="py-2 flex items-center justify-center w-full">
                    <div
                      className="w-full aspect-square max-h-[190px] sm:max-h-[220px] md:max-h-[250px] lg:max-h-[280px] max-w-[240px] sm:max-w-[270px] md:max-w-[300px] rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl transition-transform duration-300 group-hover:scale-[1.02] relative overflow-hidden mx-auto"
                      style={{
                        background: `linear-gradient(135deg, ${cand.color || '#3B82F6'}, ${cand.color ? cand.color + 'CC' : '#2563EB'})`,
                        boxShadow: `0 14px 32px ${cand.color || '#3B82F6'}35`
                      }}
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-white/25 backdrop-blur-md flex items-center justify-center text-white text-3xl sm:text-4xl md:text-5xl shadow-inner border border-white/30">
                        <FontAwesomeIcon icon={faShieldAlt} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score & Bar Chart Result Display */}
                <div className="px-4 sm:px-5 py-2.5 sm:py-3 mt-auto bg-slate-50 border-t border-slate-100 space-y-2">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Perolehan Suara
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono leading-none mt-0.5">
                        {cand.voteCount.toLocaleString()}
                        <span className="text-[10px] sm:text-xs font-normal text-slate-500 ml-1 font-sans">
                          suara
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight leading-none"
                        style={{ color: cand.color || '#3B82F6' }}
                      >
                        {cand.votePct}%
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="w-full h-3 sm:h-3.5 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300/50">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out shadow-xs"
                      style={{
                        width: `${cand.votePct}%`,
                        background: `linear-gradient(90deg, ${cand.color || '#3B82F6'}, ${cand.color ? cand.color + 'DD' : '#60A5FA'})`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
