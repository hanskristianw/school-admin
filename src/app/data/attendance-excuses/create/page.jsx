'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Halaman ini sudah tidak digunakan.
// Form pengajuan sekarang menggunakan modal di /data/attendance-excuses
export default function CreateExcusePage() {
  const router = useRouter()
  useEffect(() => { router.replace('/data/attendance-excuses') }, [router])
  return null
}
