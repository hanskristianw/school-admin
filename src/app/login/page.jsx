'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { customAuth } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

export default function Login() {
  const router = useRouter()
  const { t } = useI18n()
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
      console.log("📤 Logging in with Supabase...")
      
      // Menggunakan Supabase langsung tanpa Go API
      const result = await customAuth.login(username, password)
      
      console.log("📥 Login result:", result)

      if (result.success) {
        console.log("✅ Login successful with Supabase")
        // Simpan data user ke localStorage
        localStorage.setItem("kr_id", result.user.userID)
        localStorage.setItem("user_role", result.user.roleName)
        localStorage.setItem("user_data", JSON.stringify(result.user))
        router.push("/dashboard")
      } else {
        console.log("❌ Login failed:", result.message)
        setError(result.message || t('login.failed'))
      }
    } catch (err) {
      console.error("❌ Login error:", err)
      setError(t('login.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <p className="p-6">{t('login.loading')}</p>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/login-logo.jpg"
                alt="School Logo"
                width={96}
                height={96}
                className="rounded-full shadow-sm"
                priority
              />
            </div>
            <CardTitle className="text-xl">{t('login.title')}</CardTitle>
            <p className="text-sm text-gray-500">{t('login.subtitle')}</p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">{t('login.username')}</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? t('login.processing') : t('login.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
