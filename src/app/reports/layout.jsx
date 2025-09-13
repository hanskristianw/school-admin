'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import AccessGuard from '@/components/AccessGuard'

export default function ReportsLayout({ children }) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const kr_id = localStorage.getItem('kr_id')
    if (!kr_id) {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="bg-gray-100 h-[calc(100vh-3rem)]">{/* 3rem = 48px header */}
      <div className="flex h-full min-h-0">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <main className="flex-1 min-h-0 overflow-y-auto p-4 transition-all duration-300">
          <AccessGuard>
            {children}
          </AccessGuard>
        </main>
      </div>
    </div>
  )
}
