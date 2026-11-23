import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/attendance/special-day-rules?start=&end=&page=&limit=&scope=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end   = searchParams.get('end')
    const scope = searchParams.get('scope')
    const pageParam  = searchParams.get('page')
    const limitParam = searchParams.get('limit')

    const buildBaseQuery = (options) => {
      let q = supabaseAdmin
        .from('special_day_rules')
        .select(`
          *,
          role:role_id (role_name),
          user:user_id (user_nama_depan, user_nama_belakang, user_pin)
        `, options)
        .order('tanggal', { ascending: false })
        .order('id',      { ascending: false })

      if (start) q = q.gte('tanggal', start)
      if (end)   q = q.lte('tanggal', end)
      if (scope && ['all', 'role', 'user'].includes(scope)) q = q.eq('scope_type', scope)
      return q
    }

    if (pageParam !== null || limitParam !== null) {
      const page  = Math.max(1, parseInt(pageParam || '1', 10) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20', 10) || 20))
      const from  = (page - 1) * limit
      const to    = from + limit - 1

      const { data, error, count } = await buildBaseQuery({ count: 'exact' }).range(from, to)
      if (error) throw error

      const total = count || 0
      return NextResponse.json({
        success: true,
        data: data || [],
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      })
    }

    const data = await fetchAllRows((from, to) => buildBaseQuery().range(from, to))
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST /api/attendance/special-day-rules
export async function POST(request) {
  try {
    const body = await request.json()
    const { tanggal, scope_type, role_id, user_id,
            is_work_day, is_flexible_hours, custom_check_in, custom_check_out, keterangan } = body

    if (!tanggal)    return NextResponse.json({ success: false, message: 'tanggal wajib diisi' }, { status: 400 })
    if (!scope_type) return NextResponse.json({ success: false, message: 'scope_type wajib diisi' }, { status: 400 })

    const payload = {
      tanggal,
      scope_type,
      role_id:           scope_type === 'role' ? (role_id || null) : null,
      user_id:           scope_type === 'user' ? (user_id || null) : null,
      is_work_day:       is_work_day ?? true,
      is_flexible_hours: !!is_flexible_hours,
      custom_check_in:   custom_check_in  || null,
      custom_check_out:  custom_check_out || null,
      keterangan:        keterangan?.trim() || null,
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
            is_work_day, is_flexible_hours, custom_check_in, custom_check_out, keterangan } = body

    if (!id) return NextResponse.json({ success: false, message: 'id wajib diisi' }, { status: 400 })

    const payload = {
      tanggal,
      scope_type,
      role_id:           scope_type === 'role' ? (role_id || null) : null,
      user_id:           scope_type === 'user' ? (user_id || null) : null,
      is_work_day:       is_work_day ?? true,
      is_flexible_hours: !!is_flexible_hours,
      custom_check_in:   custom_check_in  || null,
      custom_check_out:  custom_check_out || null,
      keterangan:        keterangan?.trim() || null,
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
