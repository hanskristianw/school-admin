'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to the main attendance form page
export default function CreateExcusePage() {
  const router = useRouter()
  useEffect(() => { router.replace('/data/attendance-form') }, [router])
  return null
}
