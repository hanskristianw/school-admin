'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMedal,
  faExpand,
  faCompress,
  faRotateRight,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons'

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
      <header className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4 lg:py-5 border-b border-slate-200 bg-white sticky top-0 z-40 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          <Link
            href="/data/athletic-day"
            onClick={() => {
              if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {})
              }
            }}
            className="p-2 lg:p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="Kembali ke Konsol Input"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs lg:text-sm" />
          </Link>

          <div>
            <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
              <span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] lg:text-xs font-mono font-medium text-emerald-700">Live</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] lg:text-xs font-mono text-slate-500">
                {currentYearObj?.year_name || '2026/2027'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-extrabold tracking-tight text-slate-900 m-0">
              {activeEvent?.name || 'Athletic Day'}
            </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Event Switcher */}
          <div className="hidden md:flex items-center gap-1 p-0.5 sm:p-1 rounded-lg border border-slate-200 bg-slate-100">
            {events.map((ev) => {
              const isActive = Number(ev.id) === Number(selectedEventId)
              return (
                <button
                  key={ev.id}
                  onClick={() => {
                    setSelectedEventId(ev.id)
                    fetchLiveData(selectedYearId, ev.id, false)
                  }}
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 lg:px-4 lg:py-2 rounded text-xs lg:text-sm font-medium transition cursor-pointer ${
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
            className="p-2 lg:p-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh"
          >
            <FontAwesomeIcon icon={faRotateRight} className={`text-xs lg:text-sm ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs lg:text-sm transition cursor-pointer shadow-xs"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} className="text-xs lg:text-sm" />
            <span className="hidden sm:inline">{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10 max-w-7xl 2xl:max-w-[1600px] mx-auto w-full flex flex-col justify-between space-y-6 sm:space-y-8 lg:space-y-10">
        {/* LEADERBOARD TABLE */}
        <div>
          {leaderboard.length === 0 ? (
            <div className="p-12 sm:p-16 text-center rounded-xl border border-slate-200 bg-white my-8 shadow-xs">
              <p className="text-base sm:text-lg font-medium text-slate-700">Belum ada tim yang didaftarkan</p>
              <p className="text-sm text-slate-500 mt-1">Tambahkan tim melalui halaman input untuk memulai pencatatan skor.</p>
              <Link
                href="/data/athletic-day"
                className="inline-block mt-4 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Buka Halaman Input
              </Link>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 lg:space-y-5">
              {leaderboard.map((team, idx) => {
                const percentage = maxPoints > 0 ? Math.round((team.total_points / maxPoints) * 100) : 0
                const teamColor = normalizeTeamColor(team.color, team.name)
                const isLight = isLightColor(teamColor)

                const isFirst = idx === 0
                const isSecond = idx === 1
                const isThird = idx === 2

                const cardStyle = isFirst
                  ? 'border-amber-300 bg-gradient-to-r from-amber-50/40 via-white to-white shadow-sm'
                  : isSecond
                  ? 'border-slate-300 bg-gradient-to-r from-slate-50/50 via-white to-white shadow-xs'
                  : isThird
                  ? 'border-amber-200/80 bg-gradient-to-r from-orange-50/30 via-white to-white shadow-xs'
                  : 'border-slate-200 bg-white shadow-xs'

                return (
                  <div
                    key={team.id}
                    className={`p-4 sm:p-5 lg:p-6 xl:p-7 rounded-xl lg:rounded-2xl border flex flex-col justify-between transition hover:border-slate-300 ${cardStyle}`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2 sm:mb-3">
                      {/* Left: Position, Medal, Team Color Dot, Name */}
                      <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 overflow-hidden">
                        {/* Position Indicator & Medal Icon */}
                        <div className="flex items-center gap-2 sm:gap-3 w-16 sm:w-20 lg:w-24 shrink-0">
                          <span
                            className={`w-6 sm:w-7 lg:w-8 text-center font-mono font-black text-lg sm:text-2xl lg:text-3xl ${
                              isFirst
                                ? 'text-amber-600'
                                : isSecond
                                ? 'text-slate-600'
                                : isThird
                                ? 'text-amber-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>

                          {isFirst && (
                            <span className="text-amber-500 text-xl sm:text-2xl lg:text-3xl xl:text-4xl leading-none" title="Gold Medal">
                              <FontAwesomeIcon icon={faMedal} />
                            </span>
                          )}
                          {isSecond && (
                            <span className="text-slate-400 text-xl sm:text-2xl lg:text-3xl xl:text-4xl leading-none" title="Silver Medal">
                              <FontAwesomeIcon icon={faMedal} />
                            </span>
                          )}
                          {isThird && (
                            <span className="text-amber-700 text-xl sm:text-2xl lg:text-3xl xl:text-4xl leading-none" title="Bronze Medal">
                              <FontAwesomeIcon icon={faMedal} />
                            </span>
                          )}
                        </div>

                        {/* Team Color Dot */}
                        <span
                          className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full shrink-0 shadow-xs"
                          style={{
                            backgroundColor: teamColor,
                            border: isLight ? '1px solid #CBD5E1' : 'none'
                          }}
                        />

                        {/* Team Name */}
                        <div className="overflow-hidden">
                          <h3 className="font-extrabold text-lg sm:text-2xl lg:text-3xl xl:text-4xl text-slate-900 tracking-tight truncate m-0">
                            {team.name}
                          </h3>
                          {team.motto && (
                            <p className="text-xs sm:text-sm lg:text-base text-slate-500 truncate m-0 mt-0.5 sm:mt-1">
                              {team.motto}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Points */}
                      <div className="text-right shrink-0">
                        <span className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-mono font-black text-slate-900">
                          {team.total_points}
                        </span>
                        <span className="text-xs sm:text-sm lg:text-base ml-1.5 font-mono text-slate-400 font-semibold">pts</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2.5 sm:h-3.5 lg:h-4 rounded-full overflow-hidden mt-2.5 sm:mt-3.5 lg:mt-4">
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
          <div className="p-3.5 sm:p-4 lg:p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
            <span className="text-xs sm:text-sm font-mono text-slate-500 block mb-2 sm:mb-3 font-semibold">
              Riwayat Skor Terbaru
            </span>

            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-none text-xs sm:text-sm">
              {scores.slice(0, 8).map((sc) => {
                const scColor = normalizeTeamColor(sc.team_color, sc.team_name)
                const isLight = isLightColor(scColor)
                return (
                  <div
                    key={sc.id}
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-2 sm:gap-2.5 shrink-0"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: scColor,
                        border: isLight ? '1px solid #94A3B8' : 'none'
                      }}
                    />
                    <span className="font-bold text-slate-900">{sc.team_name}</span>
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
      <footer className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4 border-t border-slate-200 text-xs sm:text-sm font-mono text-slate-400 flex items-center justify-end bg-white">
        <span>{lastUpdated.toLocaleTimeString('id-ID')} WIB</span>
      </footer>
    </div>
  )
}
