"use client"

import React, { useEffect, useRef } from 'react'

const SlideOver = ({ isOpen, onClose, title, children, size = 'md', inline = false }) => {
  const panelRef = useRef(null)
  const closeBtnRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const prevActive = document.activeElement
    // focus the close button when opened
    setTimeout(() => closeBtnRef.current?.focus(), 50)
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      try { prevActive?.focus() } catch (e) {}
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  if (inline) {
    // Render as an inline panel (no backdrop, not fixed) so it can sit beside another modal
    return (
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Assistant panel'}
        className={`relative h-full ${sizeClasses[size]} bg-white shadow-2xl overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-50">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 pb-20">{children}</div>
      </aside>
    )
  }

  return (
    <>
      {/* Backdrop: transparent overlay to prevent interaction with main modal */}
      <div
        className="fixed inset-0 z-[60] bg-black bg-opacity-20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel: slides from right */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Slide over'}
        className={`fixed top-0 right-0 z-[70] h-full w-full ${sizeClasses[size]} bg-white shadow-2xl overflow-y-auto transform transition-transform duration-300`}
        style={{
          animation: 'slideInFromRight 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-50">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 pb-20">{children}</div>
      </aside>

      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  )
}

export default SlideOver
