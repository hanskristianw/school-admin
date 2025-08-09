"use client"

import { useEffect, useState } from "react"
import { supabase } from '@/lib/supabase'

export default function DebugProfile() {
  const [debugInfo, setDebugInfo] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runDebug = async () => {
      const id = localStorage.getItem("kr_id")
      
      console.log('=== DEBUG PROFILE ===')
      console.log('User ID from localStorage:', id)
      
      if (!id) {
        setDebugInfo({ error: 'No user ID in localStorage' })
        setLoading(false)
        return
      }

      try {
        // Test 1: Basic user query
        console.log('Testing basic user query...')
        const { data: basicUser, error: basicError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', id)
          .single()

        console.log('Basic user data:', basicUser)
        console.log('Basic error:', basicError)

        // Test 2: User with role query
        console.log('Testing user with role query...')
        const { data: userWithRole, error: roleError } = await supabase
          .from('users')
          .select(`
            *,
            role:user_role_id (
              role_name
            )
          `)
          .eq('user_id', id)
          .single()

        console.log('User with role:', userWithRole)
        console.log('Role error:', roleError)

        // Test 3: Check if columns exist
        console.log('Testing table structure...')
        const { data: columns, error: columnError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_name', 'users')

        console.log('Table columns:', columns)

        setDebugInfo({
          userId: id,
          basicUser,
          basicError,
          userWithRole,
          roleError,
          columns,
          columnError
        })

      } catch (error) {
        console.error('Debug error:', error)
        setDebugInfo({ error: error.message })
      } finally {
        setLoading(false)
      }
    }

    runDebug()
  }, [])

  if (loading) {
    return <div className="p-4">Running debug tests...</div>
  }

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h2 className="text-xl font-bold mb-4">Debug Profile Information</h2>
      <pre className="bg-white p-4 rounded overflow-auto text-sm">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  )
}
