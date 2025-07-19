'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem("kr_id")
    if (!id) {
      router.push("/login")
    } else {
      setLoading(false)
    }
  }, [router])

  if (loading) {
    return <p className="p-6">Memuat...</p>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Selamat Datang 👋</h1>
      <p className="text-gray-600">Ini adalah halaman utama dashboard admin sekolah.</p>
    </div>
  )
}
