"use client"

import { useEffect } from 'react'
import { I18nProvider, useI18n } from '@/lib/i18n'

function LanguageSwitcherInline() {
  const { lang, setLang } = useI18n()
  useEffect(() => {
    const mountPoint = document.getElementById('global-language-switcher')
    if (!mountPoint) return
    // Render a very small inline switcher by replacing the container's content
    mountPoint.innerHTML = ''
    const select = document.createElement('select')
    select.className = 'border rounded-md px-2 py-1 text-sm'
    ;['id','en','zh'].forEach((l) => {
      const opt = document.createElement('option')
      opt.value = l
      opt.textContent = l === 'id' ? 'Indonesia' : l === 'en' ? 'English' : '中文'
      if (l === lang) opt.selected = true
      select.appendChild(opt)
    })
    select.onchange = (e) => setLang(e.target.value)
    mountPoint.appendChild(select)
  }, [lang, setLang])
  return null
}

export default function Providers({ children }) {
  return (
    <I18nProvider>
      <LanguageSwitcherInline />
      {children}
    </I18nProvider>
  )
}
