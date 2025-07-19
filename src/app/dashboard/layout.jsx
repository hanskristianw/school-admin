'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootLayout({ children }) {
  const router = useRouter()

  useEffect(() => {
    const kr_id = localStorage.getItem("kr_id")
    const currentPath = window.location.pathname

    // Biarkan user akses /login tanpa login
    if (!kr_id && currentPath !== "/login") {
      router.replace("/login")
    }
  }, [])

  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
