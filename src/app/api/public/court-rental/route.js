import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXPECTED_SECRET = process.env.COURT_RENTAL_SECRET_KEY || 'ccs_court_auth_2026_x7k9p2m4'

function verifyAuth(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return Boolean(EXPECTED_SECRET && token === EXPECTED_SECRET)
}

// Helper: Dapatkan tanggal hari ini dalam zona waktu WIB (Asia/Jakarta, UTC+7) berformat YYYY-MM-DD
function getWibTodayStr() {
  const now = new Date()
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wibTime.toISOString().slice(0, 10)
}

function addDaysToDateStr(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// POST: Terima pesanan baru dari formulir cPanel PHP
export async function POST(request) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid API secret token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      booking_code,
      package_type,
      package_name,
      price,
      booking_date,
      time_slot,
      renter_name,
      renter_phone,
      renter_email,
      renter_org,
      renter_purpose,
      payment_proof_file,
      hosting_url,
      status
    } = body

    if (!booking_code || !booking_date || !time_slot || !renter_name || !renter_phone || !renter_email || !payment_proof_file) {
      return NextResponse.json(
        { success: false, message: 'Data permohonan sewa lapangan tidak lengkap (bukti transfer pembayaran wajib diunggah)' },
        { status: 400 }
      )
    }

    // Validasi tanggal sewa minimal 2 hari setelah tanggal pemesanan (H+2) berbasis WIB
    const todayWib = getWibTodayStr()
    const minAllowedDateStr = addDaysToDateStr(todayWib, 2)

    if (booking_date < minAllowedDateStr) {
      return NextResponse.json(
        { success: false, message: 'Pemesanan lapangan minimal dilakukan 2 hari setelah tanggal pemesanan (H+2). Tidak dapat memesan untuk hari ini atau besok.' },
        { status: 400 }
      )
    }

    // Cek apakah slot pada tanggal tersebut sudah dipesan (status aktif)
    const { data: existingBookings, error: checkErr } = await supabaseAdmin
      .from('court_rentals')
      .select('id, booking_code, status')
      .eq('booking_date', booking_date)
      .eq('time_slot', time_slot)
      .in('status', ['pending_payment', 'payment_uploaded', 'approved'])

    if (checkErr && checkErr.code === '42P01') {
      return NextResponse.json({
        success: false,
        message: 'Tabel court_rentals belum dibuat di Supabase. Jalankan skrip migrations/create-court-rental-tables.sql.',
        code: 'TABLE_NOT_FOUND'
      }, { status: 503 })
    }

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Maaf, sesi jam tersebut baru saja dipesan orang lain. Silakan pilih sesi jam lain.' },
        { status: 409 }
      )
    }

    // Cek blackout dates (Agenda Sekolah)
    const { data: blackouts } = await supabaseAdmin
      .from('court_blackout_dates')
      .select('*')
      .eq('date', booking_date)

    if (blackouts && blackouts.length > 0) {
      const matchedBlackout = blackouts.find(b => !b.time_slot || b.time_slot === time_slot)
      if (matchedBlackout) {
        return NextResponse.json(
          {
            success: false,
            message: `Maaf, sesi jam tersebut tidak tersedia karena digunakan untuk kegiatan sekolah (${matchedBlackout.reason || 'Agenda Sekolah'}).`
          },
          { status: 409 }
        )
      }
    }

    const newBooking = {
      booking_code: String(booking_code).trim().toUpperCase(),
      package_type: package_type || 'paket_1',
      package_name: package_name || 'Price List Persewaan Lapangan CCS',
      price: Number(price || 0),
      booking_date,
      time_slot,
      renter_name,
      renter_phone,
      renter_email,
      renter_org: renter_org || null,
      renter_purpose: renter_purpose || null,
      payment_proof_file: payment_proof_file || null,
      hosting_url: hosting_url || null,
      status: status || (payment_proof_file ? 'payment_uploaded' : 'pending_payment'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('court_rentals')
      .insert([newBooking])
      .select()
      .single()

    if (insertErr) {
      console.error('[CourtRental API] Insert error:', insertErr)
      return NextResponse.json(
        { success: false, message: `Gagal menyimpan ke Supabase: ${insertErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pesanan sewa lapangan berhasil disinkronkan ke sistem.',
      booking: inserted
    })
  } catch (err) {
    console.error('[CourtRental API] Unexpected error:', err)
    return NextResponse.json(
      { success: false, message: `Internal server error: ${err.message}` },
      { status: 500 }
    )
  }
}

// GET: Mengambil ketersediaan slot per tanggal ATAU mengecek status booking berdasarkan booking_code
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const bookingCode = searchParams.get('booking_code')

    // Mode 1: Cek status booking spesifik berdasarkan kode reservasi
    if (bookingCode && bookingCode.trim()) {
      const cleanCode = bookingCode.trim().toUpperCase()
      const { data: booking, error } = await supabaseAdmin
        .from('court_rentals')
        .select('booking_code, package_type, package_name, price, booking_date, time_slot, renter_name, renter_phone, renter_email, renter_org, renter_purpose, payment_proof_file, status, admin_notes, approved_by, approved_at, created_at, updated_at')
        .ilike('booking_code', cleanCode)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      }

      if (!booking) {
        return NextResponse.json({ success: false, found: false, message: 'Kode booking tidak ditemukan' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        found: true,
        booking
      })
    }

    // Mode 2: Cek ketersediaan slot & blackout pada tanggal tertentu
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, message: 'Parameter date (YYYY-MM-DD) atau booking_code diperlukan' },
        { status: 400 }
      )
    }

    // Ambil blackout dates untuk tanggal tersebut
    const { data: blackouts } = await supabaseAdmin
      .from('court_blackout_dates')
      .select('*')
      .eq('date', date)

    // Ambil semua bookings pada tanggal tersebut (termasuk yang rejected untuk sinkronisasi status ke SQLite cPanel)
    const { data: allBookingsOnDate } = await supabaseAdmin
      .from('court_rentals')
      .select('booking_code, time_slot, status, admin_notes')
      .eq('booking_date', date)

    const activeStatuses = ['pending_payment', 'payment_uploaded', 'approved']
    const bookedSlots = (allBookingsOnDate || [])
      .filter(b => activeStatuses.includes(b.status))
      .map(b => b.time_slot)

    return NextResponse.json({
      success: true,
      date,
      blackouts: blackouts || [],
      bookedSlots,
      bookings: allBookingsOnDate || []
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
