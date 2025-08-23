'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/sidebar'

export default function StudentLayout({ children }) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const kr_id = localStorage.getItem('kr_id')
    if (!kr_id) router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <main className="flex-1 p-4 transition-all duration-300 overflow-y-auto">
          <div className="max-w-3xl mx-auto sm:max-w-5xl md:max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
