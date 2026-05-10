'use client'

import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

export default function ThemedNavbar() {
  const { theme, isDark, toggle } = useTheme()
  const { lang, setLang } = useI18n()

  return (
    <div
      className="shrink-0 z-50 border-b"
      style={{ background: theme.cardBg, borderColor: theme.border }}
    >
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-end">
        <div className="flex items-center gap-3">
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
  )
}
