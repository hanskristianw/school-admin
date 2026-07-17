'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/sidebar"
import AccessGuard from "@/components/AccessGuard"
import { useTheme } from "@/lib/theme"

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    const kr_id = localStorage.getItem("kr_id")
    if (!kr_id) {
      router.replace("/login")
    }
  }, [router])

  return (
    <div style={{ background: theme.pageBg, minHeight: '100%', fontFamily: "'Helvetica Neue', 'SF Pro Display', sans-serif" }}>
      <div className="flex h-full min-h-0" style={{ height: 'calc(100vh - 3rem)' }}>
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <main className="flex-1 min-h-0 transition-all duration-300 overflow-y-auto">
          <AccessGuard>
            {children}
          </AccessGuard>
        </main>
      </div>
    </div>
  )
}
