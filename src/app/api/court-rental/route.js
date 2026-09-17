import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const date = searchParams.get('date')

    let query = supabaseAdmin
      .from('court_rentals')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (date) {
      query = query.eq('booking_date', date)
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`
      query = query.or(`booking_code.ilike.${q},renter_name.ilike.${q},renter_email.ilike.${q},renter_phone.ilike.${q}`)
    }

    const { data: bookings, error } = await query

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: false,
          tableExists: false,
          message: 'Tabel court_rentals belum dibuat di Supabase.',
          bookings: []
        })
      }
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    // Hitung summary counter
    const { data: allRows } = await supabaseAdmin
      .from('court_rentals')
      .select('status, price')

    const stats = {
      total: allRows?.length || 0,
      uploaded: allRows?.filter(r => r.status === 'payment_uploaded').length || 0,
      approved: allRows?.filter(r => r.status === 'approved').length || 0,
      rejected: allRows?.filter(r => r.status === 'rejected').length || 0,
      pending: allRows?.filter(r => r.status === 'pending_payment').length || 0,
      totalIncome: allRows?.filter(r => r.status === 'approved').reduce((acc, cur) => acc + Number(cur.price || 0), 0) || 0
    }

    return NextResponse.json({
      success: true,
      tableExists: true,
      bookings: bookings || [],
      stats
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
