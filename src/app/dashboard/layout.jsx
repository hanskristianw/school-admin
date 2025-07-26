'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/sidebar" // pastikan path-nya benar

export default function DashboardLayout({ children }) {
  const router = useRouter()

  useEffect(() => {
    const kr_id = localStorage.getItem("kr_id")
    const currentPath = window.location.pathname

    if (!kr_id && currentPath !== "/login") {
      router.replace("/login")
    }
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 bg-gray-100">
        {children}
      </main>
    </div>
  )
}
