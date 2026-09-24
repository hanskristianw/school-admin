'use client'

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Sidebar from "@/components/sidebar"
import AccessGuard from "@/components/AccessGuard"
import { useTheme } from "@/lib/theme"

export default function DataLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const kr_id = localStorage.getItem("kr_id")
    if (!kr_id) {
      router.replace("/login")
    }
  }, [router])

  // Full-width edge-to-edge layout for Live Scoreboard
  if (pathname?.startsWith('/data/athletic-day/live')) {
    return (
      <AccessGuard>
        <div className="w-full h-full min-h-screen bg-[#F8FAFC] overflow-y-auto">
          {children}
        </div>
      </AccessGuard>
    )
  }

  return (
    <div style={{ background: theme.pageBg }} className="h-[calc(100vh-3rem)]">{/* 3rem = 48px header */}
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
