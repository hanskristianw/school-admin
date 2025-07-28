'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    const kr_id = localStorage.getItem("kr_id")
    if (kr_id) {
      router.replace("/dashboard")
    } else {
      setLoading(false)
    }
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      console.log("📤 Sending login request...")
      const res = await fetch("http://localhost:8080/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()
      console.log("📥 Received response:", res.status)

      if (res.ok) {
        console.log("✅ Login successful")
        localStorage.setItem("kr_id", data.user_id)
        localStorage.setItem("user_role", data.role)
        router.push("/dashboard")
      } else {
        console.log("❌ Login failed:", data.error)
        setError(data.error || "Login gagal")
      }
    } catch (err) {
      console.error("❌ Login error:", err)
      setError("Terjadi kesalahan saat login")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <p className="p-6">Memuat...</p>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        {/* Image Container */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/login-logo.jpg"
            alt="School Logo"
            width={120}
            height={120}
            className="rounded-full shadow-sm"
            priority
          />
        </div>

        <h1 className="text-2xl font-bold mb-6 text-center">Sistem Administrasi Sekolah</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={isSubmitting}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full p-2 rounded text-white ${
              isSubmitting 
                ? 'bg-blue-300 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isSubmitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
