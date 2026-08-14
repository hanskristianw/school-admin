'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/sidebar"
import { useTheme } from "@/lib/theme"

export default function ProfileLayout({ children }) {
  const router = useRouter()
  const { theme } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const kr_id = localStorage.getItem("kr_id")
    if (!kr_id) {
      router.replace("/login")
    }
  }, [router])

  return (
    <div className="flex h-full" style={{ background: theme.pageBg }}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
