'use client'

import { useEffect } from 'react'

export default function AdmissionLayout({ children }) {
  useEffect(() => {
    // Override body overflow when on admission page
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    
    // Find and hide the parent containers that block scrolling
    const parentContainers = document.querySelectorAll('.overflow-hidden')
    parentContainers.forEach(el => {
      el.style.overflow = 'visible'
      el.style.height = 'auto'
    })

    return () => {
      // Restore when leaving
      document.body.style.overflow = ''
      document.body.style.height = ''
      parentContainers.forEach(el => {
        el.style.overflow = ''
        el.style.height = ''
      })
    }
  }, [])

  return <>{children}</>
}
