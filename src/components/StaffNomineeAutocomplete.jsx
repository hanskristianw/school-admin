'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  SearchIcon,
  CloseIcon,
  CheckIcon,
  LockIcon,
  UserBlockedIcon
} from '@/app/data/staff-awards/components/MinimalIcons'

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Editorial Minimalist Autocomplete selector for Staff Awards nominations.
 * Enforces self-exclusion and shows cross-category locks inline.
 */
export default function StaffNomineeAutocomplete({
  nominees = [],
  value = null,
  onChange,
  currentUserId,
  usedNomineeMap = new Map(),
  disabled = false,
  placeholder = 'Search colleague by name, unit, or role...',
  isDark = false
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selectedStaff = useMemo(
    () => nominees.find(n => Number(n.user_id) === Number(value)) || null,
    [nominees, value]
  )

  const currentUserRecord = useMemo(
    () => nominees.find(n => Number(n.user_id) === Number(currentUserId)) || null,
    [nominees, currentUserId]
  )

  const matchesSelfQuery = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !currentUserRecord) return false
    return (
      currentUserRecord.full_name.toLowerCase().includes(q) ||
      currentUserRecord.role_name.toLowerCase().includes(q) ||
      currentUserRecord.unit_name.toLowerCase().includes(q)
    )
  }, [query, currentUserRecord])

  const filteredNominees = useMemo(() => {
    const q = query.trim().toLowerCase()
    return nominees.filter(n => {
      if (Number(n.user_id) === Number(currentUserId)) return false
      if (!q) return true
      return (
        n.full_name.toLowerCase().includes(q) ||
        n.unit_name.toLowerCase().includes(q) ||
        n.role_name.toLowerCase().includes(q)
      )
    })
  }, [nominees, currentUserId, query])

  const selectableIndices = useMemo(() => {
    const indices = []
    filteredNominees.forEach((n, idx) => {
      if (!usedNomineeMap.has(Number(n.user_id))) {
        indices.push(idx)
      }
    })
    return indices
  }, [filteredNominees, usedNomineeMap])

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (selectableIndices.length > 0) {
      setHighlightIndex(selectableIndices[0])
    } else {
      setHighlightIndex(-1)
    }
  }, [query, isOpen, selectableIndices])

  const handleSelect = (staff) => {
    if (disabled) return
    if (Number(staff.user_id) === Number(currentUserId)) return
    if (usedNomineeMap.has(Number(staff.user_id))) return
    onChange?.(staff.user_id)
    setQuery('')
    setIsOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    if (disabled) return
    onChange?.(null)
    setQuery('')
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true)
      return
    }
    if (!isOpen) return

    if (e.key === 'Escape') {
      e.stopPropagation()
      setIsOpen(false)
      return
    }
    if (e.key === 'ArrowDown' && selectableIndices.length > 0) {
      e.preventDefault()
      const currentPos = selectableIndices.indexOf(highlightIndex)
      const nextPos = currentPos === -1 || currentPos >= selectableIndices.length - 1 ? 0 : currentPos + 1
      setHighlightIndex(selectableIndices[nextPos])
    } else if (e.key === 'ArrowUp' && selectableIndices.length > 0) {
      e.preventDefault()
      const currentPos = selectableIndices.indexOf(highlightIndex)
      const prevPos = currentPos <= 0 ? selectableIndices.length - 1 : currentPos - 1
      setHighlightIndex(selectableIndices[prevPos])
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filteredNominees[highlightIndex]
      if (target && !usedNomineeMap.has(Number(target.user_id))) {
        handleSelect(target)
      }
    }
  }

  const monoStyle = { fontFamily: "'Geist Mono', 'SF Mono', 'JetBrains Mono', ui-monospace, monospace" }

  if (selectedStaff) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[8px] transition-colors"
        style={{
          backgroundColor: isDark ? '#19291B' : '#EDF3EC',
          border: `1px solid ${isDark ? '#29422C' : '#C8DEC5'}`
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-9 w-9 rounded-[6px] text-xs font-bold flex items-center justify-center shrink-0"
            style={{
              backgroundColor: isDark ? '#29422C' : '#D9EAD7',
              color: isDark ? '#9BD09F' : '#346538',
              ...monoStyle
            }}
          >
            {getInitials(selectedStaff.full_name)}
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-semibold truncate ${isDark ? 'text-[#F2F2EF]' : 'text-[#111111]'}`}>
              {selectedStaff.full_name}
            </div>
            <div className={`text-xs truncate ${isDark ? 'text-[#A0A09B]' : 'text-[#575652]'}`}>
              {selectedStaff.unit_name} • {selectedStaff.role_name}
            </div>
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            title="Clear selection"
            aria-label="Clear selection"
            className={`px-2.5 py-1.5 rounded-[6px] text-xs font-medium inline-flex items-center gap-1 transition-colors shrink-0 cursor-pointer ${
              isDark
                ? 'bg-[#242421] text-[#D4D4CE] hover:bg-[#32322E]'
                : 'bg-white text-[#2F3437] border border-[#D4E4D2] hover:bg-[#F7F6F3]'
            }`}
          >
            <CloseIcon className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
          <SearchIcon className="w-4 h-4" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onFocus={() => !disabled && setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-[6px] outline-none transition-colors ${
            isDark
              ? 'bg-[#161615] border border-[#2C2C29] text-[#F2F2EF] placeholder:text-[#787774] focus:border-[#D4D4CE]'
              : 'bg-[#FBFBFA] border border-[#EAEAEA] text-[#111111] placeholder:text-[#787774] focus:bg-white focus:border-[#111111]'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
      </div>

      {isOpen && !disabled && (
        <div
          className="absolute left-0 right-0 mt-1.5 z-30 rounded-[8px] overflow-hidden"
          style={{
            backgroundColor: isDark ? '#1E1E1C' : '#FFFFFF',
            border: `1px solid ${isDark ? '#2C2C29' : '#EAEAEA'}`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          {matchesSelfQuery && (
            <div
              className="px-3.5 py-2 text-xs flex items-center gap-2"
              style={{
                backgroundColor: isDark ? '#2C2515' : '#FBF3DB',
                color: isDark ? '#E8C56E' : '#956400',
                borderBottom: `1px solid ${isDark ? '#2C2C29' : '#EAEAEA'}`
              }}
            >
              <UserBlockedIcon className="w-3.5 h-3.5 shrink-0" />
              <span>You cannot nominate yourself.</span>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto">
            {filteredNominees.length === 0 ? (
              <div className={`px-3.5 py-5 text-xs text-center ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                No matching colleague found for &ldquo;{query}&rdquo;.
              </div>
            ) : (
              filteredNominees.map((staff, idx) => {
                const usedInfo = usedNomineeMap.get(Number(staff.user_id))
                const isUsedElsewhere = Boolean(usedInfo)
                const isHighlighted = idx === highlightIndex && !isUsedElsewhere

                return (
                  <button
                    key={staff.user_id}
                    type="button"
                    disabled={isUsedElsewhere}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelect(staff)
                    }}
                    onMouseEnter={() => !isUsedElsewhere && setHighlightIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors border-b last:border-b-0 ${
                      isDark ? 'border-[#2C2C29]' : 'border-[#EAEAEA]'
                    } ${
                      isUsedElsewhere
                        ? 'opacity-45 cursor-not-allowed'
                        : isHighlighted
                          ? isDark
                            ? 'bg-[#2A2A27] cursor-pointer'
                            : 'bg-[#F7F6F3] cursor-pointer'
                          : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-7 w-7 rounded-[6px] text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-[#2C2C29] text-[#D4D4CE]' : 'bg-[#F3F2EE] text-[#2F3437]'
                        }`}
                        style={monoStyle}
                      >
                        {getInitials(staff.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium truncate ${isDark ? 'text-[#F2F2EF]' : 'text-[#111111]'}`}>
                          {staff.full_name}
                        </div>
                        <div className={`text-[11px] truncate ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                          {staff.unit_name} • {staff.role_name}
                        </div>
                      </div>
                    </div>

                    {isUsedElsewhere ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.05em] shrink-0"
                        style={{
                          backgroundColor: isDark ? '#242421' : '#F3F2EE',
                          color: isDark ? '#9E9D97' : '#575652',
                          ...monoStyle
                        }}
                      >
                        <LockIcon className="w-2.5 h-2.5" />
                        ASSIGNED TO #{usedInfo.number}
                      </span>
                    ) : isHighlighted ? (
                      <span className={isDark ? 'text-[#F2F2EF]' : 'text-[#111111]'}>
                        <CheckIcon className="w-4 h-4 shrink-0" />
                      </span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>

          <div
            className={`px-3 py-1.5 text-[11px] flex flex-wrap items-center gap-3 ${
              isDark ? 'bg-[#161615] text-[#8C8B87] border-t border-[#2C2C29]' : 'bg-[#F7F6F3] text-[#787774] border-t border-[#EAEAEA]'
            }`}
          >
            <span className="inline-flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 text-[10px] rounded-[4px] border ${isDark ? 'bg-[#242421] border-[#383833]' : 'bg-white border-[#EAEAEA]'}`} style={monoStyle}>↑</kbd>
              <kbd className={`px-1.5 py-0.5 text-[10px] rounded-[4px] border ${isDark ? 'bg-[#242421] border-[#383833]' : 'bg-white border-[#EAEAEA]'}`} style={monoStyle}>↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 text-[10px] rounded-[4px] border ${isDark ? 'bg-[#242421] border-[#383833]' : 'bg-white border-[#EAEAEA]'}`} style={monoStyle}>Enter</kbd>
              <span>Select</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 text-[10px] rounded-[4px] border ${isDark ? 'bg-[#242421] border-[#383833]' : 'bg-white border-[#EAEAEA]'}`} style={monoStyle}>Esc</kbd>
              <span>Close</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
