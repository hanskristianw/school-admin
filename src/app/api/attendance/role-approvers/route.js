import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/attendance/role-approvers
// Returns all roles with their approver config
export async function GET() {
  try {
    const { data: roles, error: rErr } = await supabaseAdmin
      .from('role')
      .select('role_id, role_name')
      .order('role_name')
    if (rErr) throw rErr

    const { data: approvers, error: aErr } = await supabaseAdmin
      .from('role_approvers')
      .select(`
        role_id,
        approver1_id,
        approver2_id,
        approver1:approver1_id (user_id, user_nama_depan, user_nama_belakang),
        approver2:approver2_id (user_id, user_nama_depan, user_nama_belakang)
      `)
    if (aErr) throw aErr

    const approverMap = Object.fromEntries((approvers || []).map(a => [a.role_id, a]))

    const result = (roles || []).map(r => ({
      role_id:      r.role_id,
      role_name:    r.role_name,
      approver1:    approverMap[r.role_id]?.approver1 || null,
      approver2:    approverMap[r.role_id]?.approver2 || null,
      approver1_id: approverMap[r.role_id]?.approver1_id || null,
      approver2_id: approverMap[r.role_id]?.approver2_id || null,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST /api/attendance/role-approvers
// Upsert approver config for a role
export async function POST(request) {
  try {
    const body = await request.json()
    const { role_id, approver1_id, approver2_id } = body

    if (!role_id)      return NextResponse.json({ success: false, message: 'role_id wajib diisi' },     { status: 400 })
    if (!approver1_id) return NextResponse.json({ success: false, message: 'approver1_id wajib diisi' }, { status: 400 })
    if (!approver2_id) return NextResponse.json({ success: false, message: 'approver2_id wajib diisi' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('role_approvers')
      .upsert(
        { role_id, approver1_id, approver2_id },
        { onConflict: 'role_id' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
