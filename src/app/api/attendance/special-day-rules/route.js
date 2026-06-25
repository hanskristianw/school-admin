import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/attendance/special-day-rules?start=&end=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end   = searchParams.get('end')

    let q = supabaseAdmin
      .from('special_day_rules')
      .select(`
        id, tanggal, scope_type, role_id, user_id,
        is_work_day, custom_check_in, custom_check_out, keterangan, created_at,
        role:role_id (role_name),
        user:user_id (user_nama_depan, user_nama_belakang, user_pin)
      `)
      .order('tanggal', { ascending: true })
      .order('id',      { ascending: true })

    if (start) q = q.gte('tanggal', start)
    if (end)   q = q.lte('tanggal', end)

    const { data, error } = await q
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST /api/attendance/special-day-rules
export async function POST(request) {
  try {
    const body = await request.json()
    const { tanggal, scope_type, role_id, user_id,
            is_work_day, custom_check_in, custom_check_out, keterangan } = body

    if (!tanggal)    return NextResponse.json({ success: false, message: 'tanggal wajib diisi' }, { status: 400 })
    if (!scope_type) return NextResponse.json({ success: false, message: 'scope_type wajib diisi' }, { status: 400 })

    const payload = {
      tanggal,
      scope_type,
      role_id:          scope_type === 'role' ? (role_id || null) : null,
      user_id:          scope_type === 'user' ? (user_id || null) : null,
      is_work_day:      is_work_day ?? true,
      custom_check_in:  custom_check_in  || null,
      custom_check_out: custom_check_out || null,
      keterangan:       keterangan?.trim() || null,
    }

    const { data, error } = await supabaseAdmin
      .from('special_day_rules')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// PATCH /api/attendance/special-day-rules
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, tanggal, scope_type, role_id, user_id,
            is_work_day, custom_check_in, custom_check_out, keterangan } = body

    if (!id) return NextResponse.json({ success: false, message: 'id wajib diisi' }, { status: 400 })

    const payload = {
      tanggal,
      scope_type,
      role_id:          scope_type === 'role' ? (role_id || null) : null,
      user_id:          scope_type === 'user' ? (user_id || null) : null,
      is_work_day:      is_work_day ?? true,
      custom_check_in:  custom_check_in  || null,
      custom_check_out: custom_check_out || null,
      keterangan:       keterangan?.trim() || null,
    }

    const { data, error } = await supabaseAdmin
      .from('special_day_rules')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// DELETE /api/attendance/special-day-rules?id=
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, message: 'id wajib diisi' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('special_day_rules')
      .delete()
      .eq('id', parseInt(id, 10))

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
