import { NextResponse } from 'next/server'
import {
  supabaseAdmin,
  fetchAllCourtRentals,
  getCourtRentalSettings,
  enrichBookingWithApproval
} from '@/lib/courtRentalApproval'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const date = searchParams.get('date')

    let allRows = []
    try {
      allRows = await fetchAllCourtRentals((from, to) =>
        supabaseAdmin
          .from('court_rentals')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to)
      )
    } catch (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: false,
          tableExists: false,
          message: 'Tabel court_rentals belum dibuat di Supabase.',
          bookings: []
        })
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    const { approvalFlow, approvalStates } = await getCourtRentalSettings()
    const enrichedAll = allRows.map(row => enrichBookingWithApproval(row, approvalStates))

    const stats = {
      total: enrichedAll.length,
      uploaded: enrichedAll.filter(r => r.status === 'payment_uploaded').length,
      awaitingStep1: enrichedAll.filter(
        r => (r.status === 'payment_uploaded' || r.status === 'pending_payment') && r.approval_stage === 'awaiting_approver_1'
      ).length,
      awaitingStep2: enrichedAll.filter(
        r => r.status === 'payment_uploaded' && r.approval_stage === 'awaiting_approver_2'
      ).length,
      approved: enrichedAll.filter(r => r.status === 'approved').length,
      rejected: enrichedAll.filter(r => r.status === 'rejected').length,
      pending: enrichedAll.filter(r => r.status === 'pending_payment').length,
      totalIncome: enrichedAll
        .filter(r => r.status === 'approved')
        .reduce((acc, cur) => acc + Number(cur.price || 0), 0)
    }

    let filtered = enrichedAll
    if (status && status !== 'all') {
      if (status === 'awaiting_approver_1' || status === 'awaiting_approver_2') {
        filtered = filtered.filter(
          r => r.approval_stage === status && r.status !== 'approved' && r.status !== 'rejected'
        )
      } else {
        filtered = filtered.filter(r => r.status === status)
      }
    }

    if (date) {
      filtered = filtered.filter(r => r.booking_date === date)
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      filtered = filtered.filter(r =>
        [r.booking_code, r.renter_name, r.renter_email, r.renter_phone, r.renter_org]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q))
      )
    }

    return NextResponse.json({
      success: true,
      tableExists: true,
      bookings: filtered,
      stats,
      approvalFlow
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
