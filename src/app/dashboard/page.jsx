"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const redirectToDashboard = async () => {
      const id = localStorage.getItem("kr_id")
      const roleData = localStorage.getItem("user_data")

      if (!id || !roleData) {
        localStorage.clear()
        router.replace("/login")
        return
      }

      try {
        const userData = JSON.parse(roleData)
        const userId = parseInt(id, 10)

        // Fetch user's role (or highest priority role if multiple)
        const { data: userRoles, error: userErr } = await supabase
          .from('users')
          .select('user_role_id')
          .eq('user_id', userId)
          .single()

        if (userErr) throw userErr

        const roleId = userRoles?.user_role_id

        if (!roleId) {
          console.error('No role assigned to user')
          router.replace("/login")
          return
        }

        // Fetch role with dashboard_type information
        // Note: If system supports multiple roles in future, query should use:
        // ORDER BY role_priority DESC LIMIT 1 to get highest priority role
        const { data: roleInfo, error: roleErr } = await supabase
          .from('role')
          .select('dashboard_type_id, role_priority, dashboard_type(default_route)')
          .eq('role_id', roleId)
          .single()

        if (roleErr) throw roleErr

        // Get default route from dashboard_type (required, no fallback needed)
        const defaultRoute = roleInfo?.dashboard_type?.default_route

        if (!defaultRoute) {
          console.error('No dashboard type configured for this role')
          router.replace("/login")
          return
        }

        // Redirect to the configured dashboard type route
        router.replace(defaultRoute)
      } catch (e) {
        console.error('Dashboard redirect error:', e)
        router.replace("/login")
      }
    }

    redirectToDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return null
}
