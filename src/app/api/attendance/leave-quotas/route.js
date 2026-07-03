import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/attendance/leave-quotas?year_id=X&user_id=Y&leave_type_code=Z
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const yearId        = searchParams.get('year_id')
    const userId        = searchParams.get('user_id')
    const leaveTypeCode = searchParams.get('leave_type_code')

    let q = supabaseAdmin
      .from('leave_quotas')
      .select(`
        id, user_id, leave_type_code, year_id,
        total_days, used_days, created_at, updated_at,
        user:user_id (user_id, user_nama_depan, user_nama_belakang, user_unit_id, user_role_id),
        leave_type:leave_type_code (code, name_id, name_en, is_paid),
        year:year_id (year_id, year_name, start_date, end_date)
      `)
      .order('user_id', { nullsFirst: true })
      .order('leave_type_code')

    if (yearId)        q = q.eq('year_id', parseInt(yearId))
    if (leaveTypeCode) q = q.eq('leave_type_code', leaveTypeCode)

    // Jika user_id diberikan: ambil record individual user TERSEBUT + semua global
    if (userId) {
      q = q.or(`user_id.eq.${userId},user_id.is.null`)
    }

    const { data, error } = await q
    if (error) throw error

    // Fetch units and roles to enrich the response
    const [{ data: units }, { data: roles }] = await Promise.all([
      supabaseAdmin.from('unit').select('unit_id, unit_name'),
      supabaseAdmin.from('role').select('role_id, role_name'),
    ])
    const unitMap = Object.fromEntries((units || []).map(u => [u.unit_id, u.unit_name]))
    const roleMap = Object.fromEntries((roles || []).map(r => [r.role_id, r.role_name]))

    const enriched = (data || []).map(q => ({
      ...q,
      is_global: q.user_id === null,
      user: q.user_id === null ? null : q.user ? {
        ...q.user,
        unit: { unit_name: unitMap[q.user.user_unit_id] || '—' },
        role: { role_name: roleMap[q.user.user_role_id] || '—' },
      } : null
    }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST /api/attendance/leave-quotas
// Body: { user_id (null=global), leave_type_code, year_id, total_days }
export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, leave_type_code, year_id, total_days } = body

    if (!leave_type_code) return NextResponse.json({ success: false, message: 'leave_type_code wajib' }, { status: 400 })
    if (!year_id)         return NextResponse.json({ success: false, message: 'year_id wajib' }, { status: 400 })
    if (total_days === undefined || total_days === null || parseInt(total_days) < 0)
      return NextResponse.json({ success: false, message: 'total_days wajib dan >= 0' }, { status: 400 })

    const { data: lt, error: ltErr } = await supabaseAdmin
      .from('leave_types')
      .select('code')
      .eq('code', leave_type_code)
      .single()
    if (ltErr || !lt) return NextResponse.json({ success: false, message: 'Jenis ijin tidak ditemukan' }, { status: 404 })

    const uid = (user_id === null || user_id === undefined || user_id === '') ? null : parseInt(user_id)

    // Upsert — handle both global (uid=null) and individual
    let data, error
    if (uid === null) {
      // Global: cek apakah sudah ada
      const { data: existing } = await supabaseAdmin
        .from('leave_quotas')
        .select('id')
        .is('user_id', null)
        .eq('leave_type_code', leave_type_code)
        .eq('year_id', parseInt(year_id))
        .maybeSingle()

      if (existing) {
        ;({ data, error } = await supabaseAdmin
          .from('leave_quotas')
          .update({ total_days: parseInt(total_days), updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select().single())
      } else {
        ;({ data, error } = await supabaseAdmin
          .from('leave_quotas')
          .insert({ user_id: null, leave_type_code, year_id: parseInt(year_id), total_days: parseInt(total_days) })
          .select().single())
      }
    } else {
      // Individual: cek apakah sudah ada
      const { data: existing } = await supabaseAdmin
        .from('leave_quotas')
        .select('id')
        .eq('user_id',         uid)
        .eq('leave_type_code', leave_type_code)
        .eq('year_id',         parseInt(year_id))
        .maybeSingle()

      if (existing) {
        ;({ data, error } = await supabaseAdmin
          .from('leave_quotas')
          .update({ total_days: parseInt(total_days), updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select().single())
      } else {
        ;({ data, error } = await supabaseAdmin
          .from('leave_quotas')
          .insert({ user_id: uid, leave_type_code, year_id: parseInt(year_id), total_days: parseInt(total_days) })
          .select().single())
      }
    }

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// DELETE /api/attendance/leave-quotas?id=X
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, message: 'id wajib' }, { status: 400 })

    const { data: quota } = await supabaseAdmin
      .from('leave_quotas')
      .select('used_days, user_id')
      .eq('id', parseInt(id))
      .single()

    if (quota?.used_days > 0) {
      return NextResponse.json({
        success: false,
        message: `Tidak bisa hapus — sudah terpakai ${quota.used_days} hari`
      }, { status: 409 })
    }

    const { error } = await supabaseAdmin
      .from('leave_quotas')
      .delete()
      .eq('id', parseInt(id))
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
