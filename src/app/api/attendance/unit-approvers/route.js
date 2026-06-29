import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/attendance/unit-approvers
// Returns all units with their approver config
export async function GET() {
  try {
    const { data: units, error: uErr } = await supabaseAdmin
      .from('unit')
      .select('unit_id, unit_name')
      .order('unit_name')
    if (uErr) throw uErr

    const { data: approvers, error: aErr } = await supabaseAdmin
      .from('unit_approvers')
      .select(`
        unit_id,
        approver1_id,
        approver2_id,
        approver1:approver1_id (user_id, user_nama_depan, user_nama_belakang),
        approver2:approver2_id (user_id, user_nama_depan, user_nama_belakang)
      `)
    if (aErr) throw aErr

    const approverMap = Object.fromEntries((approvers || []).map(a => [a.unit_id, a]))

    const result = (units || []).map(u => ({
      unit_id:   u.unit_id,
      unit_name: u.unit_name,
      approver1: approverMap[u.unit_id]?.approver1 || null,
      approver2: approverMap[u.unit_id]?.approver2 || null,
      approver1_id: approverMap[u.unit_id]?.approver1_id || null,
      approver2_id: approverMap[u.unit_id]?.approver2_id || null,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST /api/attendance/unit-approvers
// Upsert approver config for a unit
export async function POST(request) {
  try {
    const body = await request.json()
    const { unit_id, approver1_id, approver2_id } = body

    if (!unit_id)     return NextResponse.json({ success: false, message: 'unit_id wajib diisi' }, { status: 400 })
    if (!approver1_id) return NextResponse.json({ success: false, message: 'approver1_id wajib diisi' }, { status: 400 })
    if (!approver2_id) return NextResponse.json({ success: false, message: 'approver2_id wajib diisi' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('unit_approvers')
      .upsert(
        { unit_id, approver1_id, approver2_id },
        { onConflict: 'unit_id' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
