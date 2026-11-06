'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import BugReportModal from '@/components/BugReportModal'

export default function ThemedNavbar() {
  const { theme, isDark, toggle } = useTheme()
  const { lang, setLang, translateMenu, t } = useI18n()
  const pathname = usePathname()
  const [showBugModal, setShowBugModal] = useState(false)

  // Listen to open-bug-report events across the app
  useEffect(() => {
    const handleOpen = () => setShowBugModal(true)
    window.addEventListener('open-bug-report', handleOpen)
    return () => window.removeEventListener('open-bug-report', handleOpen)
  }, [])

  if (pathname?.startsWith('/data/athletic-day/live')) {
    return null
  }

  return (
    <>
      <div
        className="shrink-0 z-50 border-b"
        style={{ background: theme.cardBg, borderColor: theme.border }}
      >
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-end">
          <div className="flex items-center gap-3">
            {/* Quick Bug Reporting Button */}
            <button
              type="button"
              onClick={() => setShowBugModal(true)}
              className="flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md transition-all hover:opacity-85 cursor-pointer shadow-2xs active:scale-95"
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.textBody,
              }}
              title={t('feedback.bugReportingQuick') || 'Laporkan Kendala / Usulan Fitur (Akses Cepat)'}
            >
              <span style={{ fontSize: '13px' }}>🐞</span>
              <span style={{ color: theme.textSecondary, fontWeight: 500 }}>
                {t('feedback.bugReporting') || 'Bug Reporting'}
              </span>
            </button>

            {/* Divider */}
            <span style={{ width: '1px', height: '18px', background: theme.border, display: 'inline-block' }} />

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md transition-colors"
            style={{
              border: `1px solid ${theme.border}`,
              background: theme.inputBg,
              color: theme.textBody,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '14px' }}>{isDark ? '☀️' : '🌙'}</span>
            <span style={{ color: theme.textSecondary }}>{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Divider */}
          <span style={{ width: '1px', height: '18px', background: theme.border, display: 'inline-block' }} />

          {/* Language selector */}
          <span className="text-sm" style={{ color: theme.textSecondary }}>Language:</span>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            className="text-sm px-2 py-1"
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              background: theme.inputBg,
              color: theme.textBody,
              outline: 'none',
            }}
          >
            <option value="id">Indonesia</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </div>
    </div>

    {/* Global Bug & Issue Reporting Modal */}
    <BugReportModal
      isOpen={showBugModal}
      onClose={() => setShowBugModal(false)}
    />
  </>
  )
}
