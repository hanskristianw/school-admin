import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '15', 10)
    const search = searchParams.get('search') || ''
    const date = searchParams.get('date') || ''

    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('psychotest_results')
      .select('*', { count: 'exact' })

    if (search.trim()) {
      query = query.or(`nama.ilike.%${search.trim()}%,posisi.ilike.%${search.trim()}%`)
    }

    if (date.trim()) {
      query = query.eq('tanggal', date.trim())
    }

    query = query
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching psychotest_results:', error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })
  } catch (err) {
    console.error('Unexpected error in GET /api/data/psikotest:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
