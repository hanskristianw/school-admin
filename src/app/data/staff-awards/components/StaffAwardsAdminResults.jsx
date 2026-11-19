'use client'

import React, { useState, useMemo } from 'react'
import {
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartIcon,
  DownloadIcon,
  RefreshIcon,
  SearchIcon,
  SpinnerIcon
} from './MinimalIcons'
import AwardIconBadge from './AwardIconBadge'
import { exportStaffAwardsExcel } from '../lib/exportStaffAwardsExcel'

function formatWibDateTime(isoStr) {
  if (!isoStr) return '-'
  try {
    return (
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(isoStr)) + ' WIB'
    )
  } catch {
    return String(isoStr)
  }
}

export default function StaffAwardsAdminResults({
  events = [],
  selectedEvent,
  onSelectEvent,
  participation,
  results = [],
  onRefresh,
  refreshing = false,
  isDark = false
}) {
  const [statusFilter, setStatusFilter] = useState('not_voted')
  const [unitFilter, setUnitFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [exporting, setExporting] = useState(false)

  const totalEligible = participation?.total_eligible || 0
  const votedCount = participation?.voted_count || 0
  const notVotedCount = participation?.not_voted_count || 0
  const turnoutPct = participation?.turnout_percentage || 0

  const allStaffRows = useMemo(() => {
    const voted = (participation?.voted_users || []).map(u => ({ ...u, has_voted: true }))
    const notVoted = (participation?.not_voted_users || []).map(u => ({
      ...u,
      has_voted: false,
      submitted_at: null
    }))
    if (statusFilter === 'not_voted') return notVoted
    if (statusFilter === 'voted') return voted
    return [...notVoted, ...voted].sort((a, b) => a.full_name.localeCompare(b.full_name, 'en'))
  }, [participation, statusFilter])

  const availableUnits = useMemo(() => {
    const set = new Set()
    ;[...(participation?.voted_users || []), ...(participation?.not_voted_users || [])].forEach(u => {
      if (u.unit_name) set.add(u.unit_name)
    })
    return Array.from(set).sort()
  }, [participation])

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return allStaffRows.filter(row => {
      if (unitFilter !== 'ALL' && row.unit_name !== unitFilter) return false
      if (!q) return true
      return (
        row.full_name.toLowerCase().includes(q) ||
        row.role_name.toLowerCase().includes(q) ||
        row.unit_name.toLowerCase().includes(q)
      )
    })
  }, [allStaffRows, unitFilter, searchQuery])

  const handleExportExcel = async () => {
    if (exporting) return
    setExporting(true)
    try {
      await exportStaffAwardsExcel({
        event: selectedEvent,
        participation,
        results
      })
    } finally {
      setExporting(false)
    }
  }

  const monoStyle = { fontFamily: "'Geist Mono', 'SF Mono', 'JetBrains Mono', ui-monospace, monospace" }
  const serifStyle = { fontFamily: "'Lyon Text', 'Newsreader', 'Playfair Display', 'Instrument Serif', Georgia, serif" }

  const borderColor = isDark ? '#2C2C29' : '#EAEAEA'
  const cardStyle = {
    backgroundColor: isDark ? '#1E1E1C' : '#FFFFFF',
    border: `1px solid ${borderColor}`
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Toolbar */}
      <div
        className="rounded-[12px] p-5 flex flex-col md:flex-row md:items-end justify-between gap-4"
        style={cardStyle}
      >
        <div>
          {events.length > 0 && (
            <div>
              <label
                className={`block text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 ${
                  isDark ? 'text-[#8C8B87]' : 'text-[#787774]'
                }`}
                style={monoStyle}
              >
                Recognition Event
              </label>
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => onSelectEvent?.(Number(e.target.value))}
                className={`px-3.5 py-2 text-sm rounded-[6px] outline-none ${
                  isDark
                    ? 'bg-[#161615] border border-[#2C2C29] text-[#F2F2EF]'
                    : 'bg-[#FBFBFA] border border-[#EAEAEA] text-[#111111]'
                }`}
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({String(ev.status || '').toUpperCase()}) — {ev.submission_count} votes
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={`px-3.5 py-2 text-xs font-semibold rounded-[6px] inline-flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer ${
              isDark
                ? 'bg-[#242421] border border-[#2C2C29] text-[#F2F2EF] hover:bg-[#2F2F2B]'
                : 'bg-white border border-[#EAEAEA] text-[#111111] hover:bg-[#F7F6F3]'
            }`}
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="px-4 py-2 text-xs font-semibold rounded-[6px] inline-flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
            style={{
              backgroundColor: isDark ? '#F2F2EF' : '#111111',
              color: isDark ? '#111111' : '#FFFFFF'
            }}
          >
            {exporting ? <SpinnerIcon className="w-3.5 h-3.5" /> : <DownloadIcon className="w-3.5 h-3.5" />}
            <span>{exporting ? 'Generating Report...' : 'Export Excel Report (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* 4 Flat Bento KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[12px] p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
              Eligible Staff
            </span>
            <span
              className="p-2 rounded-[6px]"
              style={{
                backgroundColor: isDark ? '#162530' : '#E1F3FE',
                color: isDark ? '#8CC8EE' : '#1F6C9F'
              }}
            >
              <UsersIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight" style={monoStyle}>
            {totalEligible}
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
            Active non-vendor teachers &amp; staff
          </p>
        </div>

        <div className="rounded-[12px] p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
              Ballots Submitted
            </span>
            <span
              className="p-2 rounded-[6px]"
              style={{
                backgroundColor: isDark ? '#19291B' : '#EDF3EC',
                color: isDark ? '#9BD09F' : '#346538'
              }}
            >
              <CheckCircleIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight" style={{ ...monoStyle, color: isDark ? '#9BD09F' : '#346538' }}>
            {votedCount}
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
            Locked submissions recorded
          </p>
        </div>

        <div className="rounded-[12px] p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
              Not Yet Voted
            </span>
            <span
              className="p-2 rounded-[6px]"
              style={{
                backgroundColor: isDark ? '#2C191A' : '#FDEBEC',
                color: isDark ? '#ECA3A1' : '#9F2F2D'
              }}
            >
              <ClockIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight" style={{ ...monoStyle, color: isDark ? '#ECA3A1' : '#9F2F2D' }}>
            {notVotedCount}
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
            Pending submission
          </p>
        </div>

        <div className="rounded-[12px] p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
              Participation Rate
            </span>
            <span
              className="p-2 rounded-[6px]"
              style={{
                backgroundColor: isDark ? '#2C2515' : '#FBF3DB',
                color: isDark ? '#E8C56E' : '#956400'
              }}
            >
              <ChartIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight" style={{ ...monoStyle, color: isDark ? '#E8C56E' : '#956400' }}>
            {turnoutPct}%
          </div>
          <div className={`w-full h-[3px] mt-3 overflow-hidden ${isDark ? 'bg-[#2C2C29]' : 'bg-[#EAEAEA]'}`}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(100, turnoutPct)}%`,
                backgroundColor: isDark ? '#F2F2EF' : '#111111'
              }}
            />
          </div>
        </div>
      </div>

      {/* Voter Participation Tracker */}
      <div className="rounded-[12px] overflow-hidden" style={cardStyle}>
        <div
          className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={serifStyle}>
              Voter Participation Tracker
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
              Tracks ballot submission status only. Individual nominee choices remain anonymous.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'not_voted', label: `Not Yet Voted (${notVotedCount})` },
              { key: 'voted', label: `Voted (${votedCount})` },
              { key: 'all', label: `All Staff (${totalEligible})` }
            ].map(tab => {
              const active = statusFilter === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-transform active:scale-[0.98] cursor-pointer"
                  style={
                    active
                      ? {
                          backgroundColor: isDark ? '#F2F2EF' : '#111111',
                          color: isDark ? '#111111' : '#FFFFFF',
                          border: `1px solid ${isDark ? '#F2F2EF' : '#111111'}`
                        }
                      : {
                          backgroundColor: isDark ? '#161615' : '#F7F6F3',
                          color: isDark ? '#C5C3BC' : '#2F3437',
                          border: `1px solid ${borderColor}`
                        }
                  }
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div
          className="px-6 py-3.5 flex flex-col sm:flex-row gap-3"
          style={{
            borderBottom: `1px solid ${borderColor}`,
            backgroundColor: isDark ? '#161615' : '#FBFBFA'
          }}
        >
          <div className="relative flex-1">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
              <SearchIcon className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by staff name, unit, or role..."
              className={`w-full pl-9 pr-3 py-1.5 text-sm rounded-[6px] outline-none ${
                isDark
                  ? 'bg-[#1E1E1C] border border-[#2C2C29] text-[#F2F2EF] placeholder:text-[#787774]'
                  : 'bg-white border border-[#EAEAEA] text-[#111111] placeholder:text-[#787774]'
              }`}
            />
          </div>
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className={`px-3 py-1.5 text-sm rounded-[6px] outline-none ${
              isDark
                ? 'bg-[#1E1E1C] border border-[#2C2C29] text-[#F2F2EF]'
                : 'bg-white border border-[#EAEAEA] text-[#111111]'
            }`}
          >
            <option value="ALL">All Units</option>
            {availableUnits.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead
              className={`text-[11px] uppercase tracking-[0.05em] sticky top-0 z-10 ${
                isDark ? 'bg-[#161615] text-[#8C8B87]' : 'bg-[#F7F6F3] text-[#787774]'
              }`}
              style={{ ...monoStyle, borderBottom: `1px solid ${borderColor}` }}
            >
              <tr>
                <th className="px-4 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Submitted At (WIB)</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-8 text-center text-xs ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                    No staff members match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((row, idx) => (
                  <tr
                    key={row.user_id}
                    className={isDark ? 'hover:bg-[#242421]' : 'hover:bg-[#FBFBFA]'}
                    style={{ borderBottom: `1px solid ${borderColor}` }}
                  >
                    <td className={`px-4 py-3 text-center text-xs ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`} style={monoStyle}>
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">{row.full_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-[4px] text-xs font-medium"
                        style={{
                          backgroundColor: isDark ? '#242421' : '#F3F2EE',
                          color: isDark ? '#C5C3BC' : '#575652'
                        }}
                      >
                        {row.unit_name}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                      {row.role_name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.has_voted ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.05em]"
                          style={{
                            backgroundColor: isDark ? '#19291B' : '#EDF3EC',
                            color: isDark ? '#9BD09F' : '#346538'
                          }}
                        >
                          Voted
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.05em]"
                          style={{
                            backgroundColor: isDark ? '#2C191A' : '#FDEBEC',
                            color: isDark ? '#ECA3A1' : '#9F2F2D'
                          }}
                        >
                          Not Yet Voted
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`} style={monoStyle}>
                      {row.has_voted ? formatWibDateTime(row.submitted_at) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Results & Standings */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={serifStyle}>
            Category Results &amp; Standings
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
            Official tally of nominations received per award category.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {results.map(cat => (
            <div key={cat.category_id} className="rounded-[12px] p-6 space-y-4" style={cardStyle}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  <AwardIconBadge icon={cat.icon} gradient={cat.color_gradient} size="sm" isDark={isDark} />
                  <div className="min-w-0">
                    <div
                      className={`text-[11px] font-semibold uppercase tracking-[0.06em] ${
                        isDark ? 'text-[#8C8B87]' : 'text-[#787774]'
                      }`}
                      style={monoStyle}
                    >
                      CATEGORY {String(cat.sort_order).padStart(2, '0')}
                    </div>
                    <h3 className="font-bold text-lg leading-snug mt-0.5" style={serifStyle}>
                      {cat.title}
                    </h3>
                  </div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.05em] shrink-0"
                  style={{
                    backgroundColor: isDark ? '#242421' : '#F3F2EE',
                    color: isDark ? '#C5C3BC' : '#575652',
                    ...monoStyle
                  }}
                >
                  {cat.total_votes} {cat.total_votes === 1 ? 'vote' : 'votes'}
                </span>
              </div>

              {cat.rankings.length === 0 ? (
                <div
                  className={`py-6 text-center text-xs rounded-[8px] border border-dashed ${
                    isDark ? 'border-[#2C2C29] text-[#8C8B87]' : 'border-[#EAEAEA] text-[#787774]'
                  }`}
                >
                  No votes cast in this category yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {cat.rankings.map(row => {
                    const isWinner = row.rank === 1
                    return (
                      <div
                        key={row.nominee_user_id}
                        className="p-3 rounded-[8px]"
                        style={
                          isWinner
                            ? {
                                backgroundColor: isDark ? '#2C2515' : '#FBF3DB',
                                border: `1px solid ${isDark ? '#453A1E' : '#EFE2BA'}`
                              }
                            : {
                                backgroundColor: isDark ? '#161615' : '#FBFBFA',
                                border: `1px solid ${borderColor}`
                              }
                        }
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-6 h-6 rounded-[6px] text-xs font-bold flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: isWinner
                                  ? isDark ? '#956400' : '#111111'
                                  : isDark ? '#242421' : '#F3F2EE',
                                color: isWinner ? '#FFFFFF' : isDark ? '#C5C3BC' : '#575652',
                                ...monoStyle
                              }}
                            >
                              {row.rank}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{row.full_name}</div>
                              <div className={`text-[11px] truncate ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                                {row.unit_name} • {row.role_name}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0" style={monoStyle}>
                            <div className="text-xs font-bold">
                              {row.vote_count} {row.vote_count === 1 ? 'vote' : 'votes'}
                            </div>
                            <div className={`text-[11px] ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                              {row.percentage}%
                            </div>
                          </div>
                        </div>
                        <div className={`w-full h-[3px] overflow-hidden ${isDark ? 'bg-[#2C2C29]' : 'bg-[#EAEAEA]'}`}>
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.min(100, row.percentage)}%`,
                              backgroundColor: isWinner ? (isDark ? '#E8C56E' : '#956400') : (isDark ? '#D4D4CE' : '#111111')
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
