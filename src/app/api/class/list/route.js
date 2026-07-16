import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/class/list
 * Returns kelas list. Admin: all classes. Non-admin: only classes where kelas_user_id matches.
 * Query params:
 *   user_id  - filter by wali kelas (optional for admin)
 *   year_id  - filter by academic year (optional)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const yearId = searchParams.get('year_id')

    let query = supabaseAdmin
      .from('kelas')
      .select('kelas_id, kelas_nama, kelas_year_id')
      .order('kelas_nama')

    if (userId) {
      query = query.eq('kelas_user_id', parseInt(userId))
    }
    if (yearId) {
      query = query.eq('kelas_year_id', parseInt(yearId))
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err) {
    console.error('[GET /api/class/list]', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
