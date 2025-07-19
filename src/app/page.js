'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const userId = localStorage.getItem("kr_id")
    if (!userId) {
      router.push("/login")
    } else {
      router.push("/dashboard") // Bisa diubah nanti sesuai role
    }
  }, [])

  return null // Atau tampilkan <Loading /> kalau mau lebih keren
}
