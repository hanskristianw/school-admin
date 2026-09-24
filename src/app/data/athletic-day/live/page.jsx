'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTrophy,
  faExpand,
  faCompress,
  faRotateRight,
  faArrowLeft,
  faDragon,
  faShieldAlt,
  faBolt,
  faFire,
  faFlag,
  faStar,
  faPaw,
  faWater,
  faCrown
} from '@fortawesome/free-solid-svg-icons'

// Preset icon dictionary for athletic teams
const TEAM_ICONS = {
  dragon: faDragon,
  shield: faShieldAlt,
  bolt: faBolt,
  fire: faFire,
  feather: faFlag,
  star: faStar,
  paw: faPaw,
  fish: faWater,
  water: faWater,
  trophy: faTrophy,
  crown: faCrown
}

const normalizeTeamColor = (hex, teamName = '') => {
  const name = String(teamName || '').trim().toLowerCase()
  if (name === 'black' || name === 'hitam') {
    return '#000000'
  }
  if (name === 'white' || name === 'putih') {
    return '#71717A'
  }
  if (!hex) return '#3B82F6'
  const lower = String(hex).toLowerCase().trim()
  if (lower === '#ffffff' || lower === '#fff' || lower === 'white') {
    return '#71717A' // Use neutral grey so white team is clearly visible
  }
  if (lower === 'black' || lower === '#000' || lower === '#000000' || lower === '#111827' || lower === '#64748b') {
    return '#000000'
  }
  return hex
}

const isLightColor = (hex) => {
  if (!hex) return false
  const lower = hex.toLowerCase()
  if (lower === '#ffffff' || lower === '#fff' || lower === 'white') return true
  const h = hex.replace('#', '')
  if (h.length === 6) {
    const r = parseInt(h.substring(0, 2), 16)
    const g = parseInt(h.substring(2, 4), 16)
    const b = parseInt(h.substring(4, 6), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 180
  }
  return false
}

export default function AthleticDayLivePage() {
  const searchParams = useSearchParams()

  const urlEventId = searchParams.get('event_id')
  const urlYearId = searchParams.get('year_id')

  // Live Scoreboard States
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Data States
  const [years, setYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState(urlYearId ? Number(urlYearId) : null)
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState(urlEventId ? Number(urlEventId) : null)
  const [teams, setTeams] = useState([])
  const [scores, setScores] = useState([])
  const [leaderboard, setLeaderboard] = useState([])

  const containerRef = useRef(null)

  // Fullscreen Handler
  const toggleFullscreen = () => {
    const elem = containerRef.current || document.documentElement
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
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
        !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)
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
  const fetchLiveData = useCallback(async (yearId, eventId, isBackground = false) => {
    try {
      if (!isBackground) setLoading(true)
      let url = '/api/athletic-day'
      const params = new URLSearchParams()
      if (yearId) params.set('year_id', yearId)
      if (eventId) params.set('event_id', eventId)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        setYears(data.years || [])
        setSelectedYearId(data.selected_year_id)
        setEvents(data.events || [])

        const currentEvId = data.selected_event?.id || (data.events && data.events[0]?.id) || null
        setSelectedEventId(currentEvId)
        setTeams(data.teams || [])
        setScores(data.scores || [])
        setLeaderboard(data.leaderboard || [])
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Error fetching live scoreboard data:', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLiveData(selectedYearId, selectedEventId, false)
  }, [])

  // Auto-polling interval (every 3 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLiveData(selectedYearId, selectedEventId, true)
    }, 3000)
    return () => clearInterval(timer)
  }, [selectedYearId, selectedEventId, fetchLiveData])

  const activeEvent = events.find(e => Number(e.id) === Number(selectedEventId)) || events[0]
  const currentYearObj = years.find(y => y.year_id === selectedYearId)
  const maxPoints = leaderboard[0]?.total_points || 1

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-40 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href="/data/athletic-day"
            onClick={() => {
              if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {})
              }
            }}
            className="p-2 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="Kembali ke Konsol Input"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          </Link>

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-mono font-medium text-emerald-700">Live</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-mono text-slate-500">
                {currentYearObj?.year_name || '2026/2027'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 m-0">
              {activeEvent?.name || 'Athletic Day'}
            </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Event Switcher */}
          <div className="hidden md:flex items-center gap-1 p-0.5 rounded border border-slate-200 bg-slate-100">
            {events.map((ev) => {
              const isActive = Number(ev.id) === Number(selectedEventId)
              return (
                <button
                  key={ev.id}
                  onClick={() => {
                    setSelectedEventId(ev.id)
                    fetchLiveData(selectedYearId, ev.id, false)
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ev.name}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => fetchLiveData(selectedYearId, selectedEventId, false)}
            className="p-2 rounded border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh"
          >
            <FontAwesomeIcon icon={faRotateRight} className={`text-xs ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} className="text-xs" />
            <span className="hidden sm:inline">{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col justify-between space-y-6">
        {/* LEADERBOARD TABLE */}
        <div>
          {leaderboard.length === 0 ? (
            <div className="p-12 text-center rounded-lg border border-slate-200 bg-white my-8 shadow-xs">
              <p className="text-sm font-medium text-slate-700">Belum ada tim yang didaftarkan</p>
              <p className="text-xs text-slate-500 mt-1">Tambahkan tim melalui halaman input untuk memulai pencatatan skor.</p>
              <Link
                href="/data/athletic-day"
                className="inline-block mt-4 px-3 py-1.5 rounded border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Buka Halaman Input
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {leaderboard.map((team, idx) => {
                const percentage = maxPoints > 0 ? Math.round((team.total_points / maxPoints) * 100) : 0
                const teamIcon = TEAM_ICONS[team.icon] || faShieldAlt
                const teamColor = normalizeTeamColor(team.color, team.name)
                const isLight = isLightColor(teamColor)

                return (
                  <div
                    key={team.id}
                    className="p-4 sm:p-5 rounded-lg border border-slate-200 bg-white shadow-xs flex flex-col justify-between transition hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between gap-4 mb-3">
                      {/* Left: Pos, Color, Icon, Name */}
                      <div className="flex items-center gap-3.5 overflow-hidden">
                        {/* Position Indicator */}
                        <span className="w-7 text-center font-mono font-bold text-base sm:text-lg text-slate-400">
                          {idx + 1}
                        </span>

                        {/* Team Badge */}
                        <div
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-md flex items-center justify-center text-sm sm:text-base shrink-0 font-bold shadow-xs"
                          style={{
                            backgroundColor: teamColor,
                            color: isLight ? '#0F172A' : '#FFFFFF',
                            border: isLight ? '1px solid #CBD5E1' : 'none'
                          }}
                        >
                          <FontAwesomeIcon icon={teamIcon} />
                        </div>

                        {/* Team Name */}
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate m-0">
                            {team.name}
                          </h3>
                          {team.motto && (
                            <p className="text-xs text-slate-500 truncate m-0">
                              {team.motto}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Points */}
                      <div className="text-right shrink-0">
                        <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900">
                          {team.total_points}
                        </span>
                        <span className="text-xs ml-1 font-mono text-slate-400">pts</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.max(percentage, 2)}%`,
                          backgroundColor: teamColor
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RECENT SCORES STRIP ─────────────────────────────────────────── */}
        {scores.length > 0 && (
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-xs">
            <span className="text-[11px] font-mono text-slate-500 block mb-2 font-medium">
              Riwayat Skor Terbaru
            </span>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              {scores.slice(0, 8).map((sc) => {
                const scColor = normalizeTeamColor(sc.team_color, sc.team_name)
                const isLight = isLightColor(scColor)
                return (
                  <div
                    key={sc.id}
                    className="px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: scColor,
                        border: isLight ? '1px solid #94A3B8' : 'none'
                      }}
                    />
                    <span className="font-semibold text-slate-900">{sc.team_name}</span>
                    <span className="text-slate-500">{sc.activity_name}</span>
                    <span className="font-mono font-bold text-emerald-600">+{sc.points}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="px-6 py-2.5 border-t border-slate-200 text-[11px] font-mono text-slate-400 flex items-center justify-end bg-white">
        <span>{lastUpdated.toLocaleTimeString('id-ID')} WIB</span>
      </footer>
    </div>
  )
}
