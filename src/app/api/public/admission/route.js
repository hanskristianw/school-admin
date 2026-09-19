import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXPECTED_SECRET = process.env.ADMISSION_SECRET_KEY || process.env.COURT_RENTAL_SECRET_KEY || 'ccs_court_auth_2026_x7k9p2m4'

function verifyAuth(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return token && (token === EXPECTED_SECRET)
}

// Helper: Ambil tarif gelombang pendaftaran murni berdasarkan tanggal hari ini
async function resolveCurrentFormFee(targetDateStr = null) {
  const dateStr = targetDateStr || new Date().toISOString().split('T')[0]

  // 1. Cek gelombang yang tepat mencakup tanggal hari ini
  const { data: currentWave } = await supabaseAdmin
    .from('admission_form_fee')
    .select('*')
    .lte('effective_from', dateStr)
    .gte('effective_until', dateStr)
    .order('amount', { ascending: true })
    .limit(1)

  if (currentWave && currentWave.length > 0) {
    return currentWave[0]
  }

  // 2. Jika belum ada gelombang yang mulai (semua terjadwal di masa depan), ambil gelombang terdekat pertama
  const { data: upcomingWave } = await supabaseAdmin
    .from('admission_form_fee')
    .select('*')
    .gt('effective_from', dateStr)
    .order('effective_from', { ascending: true })
    .limit(1)

  if (upcomingWave && upcomingWave.length > 0) {
    return upcomingWave[0]
  }

  // 3. Jika semua gelombang sudah lewat di masa lalu, ambil gelombang terakhir
  const { data: pastWave } = await supabaseAdmin
    .from('admission_form_fee')
    .select('*')
    .lt('effective_until', dateStr)
    .order('effective_until', { ascending: false })
    .limit(1)

  if (pastWave && pastWave.length > 0) {
    return pastWave[0]
  }

  // 4. Default fallback jika tabel admission_form_fee belum memiliki data
  return {
    wave_name: 'Gelombang Reguler',
    amount: 250000,
    effective_from: dateStr,
    effective_until: dateStr,
    notes: 'Tarif pendaftaran reguler'
  }
}

// GET:
// 1. Ambil tarif gelombang aktif & jenjang untuk form awal
// 2. Login / Cek Status pendaftar menggunakan kombinasi Email & Nomor HP (?action=check_status&email=...&phone=...)
// 3. Ambil daftar pendaftar untuk panel admin (?action=admin_list)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // ─── LOGIN / CEK STATUS: NOMOR REGISTRASI / EMAIL & NOMOR HP ────────
    if (action === 'check_status') {
      const email = searchParams.get('email')?.toLowerCase().trim()
      const rawPhone = searchParams.get('phone')?.trim() || ''
      const code = searchParams.get('code')?.trim() || ''

      if (!email && !code) {
        return NextResponse.json(
          { success: false, message: 'Nomor Registrasi atau Email wajib diisi' },
          { status: 400 }
        )
      }

      // Bersihkan digit nomor telepon (ambil 8 digit terakhir untuk toleransi format 08.. / +628.. / 628..)
      const cleanPhoneDigits = rawPhone.replace(/[^0-9]/g, '')
      const phoneSuffix = cleanPhoneDigits.length >= 8 ? cleanPhoneDigits.slice(-8) : cleanPhoneDigits

      let query = supabaseAdmin
        .from('student_applications')
        .select(`
          application_id,
          application_number,
          access_token,
          student_name,
          student_nickname,
          student_gender,
          student_birth_date,
          student_birth_place,
          student_religion,
          student_nationality,
          student_address,
          student_domicile_address,
          student_city,
          student_province,
          student_postal_code,
          student_previous_school,
          preferred_grade,
          level_id,
          parent_name,
          parent_phone,
          parent_email,
          parent_occupation,
          parent_address,
          parent_nik,
          additional_notes,
          wave_name,
          form_fee_amount,
          form_fee_status,
          payment_proof_file,
          is_form_completed,
          status,
          created_at,
          paid_at,
          verified_at,
          admin_notes,
          admission_level (
            level_name
          )
        `)

      if (code && email) {
        query = query.or(`application_number.ilike.${code},access_token.eq.${code}`)
                     .ilike('parent_email', email)
      } else if (code) {
        query = query.or(`application_number.ilike.${code},access_token.eq.${code}`)
      } else if (email) {
        query = query.ilike('parent_email', email)
      }

      if (phoneSuffix) {
        query = query.ilike('parent_phone', `%${phoneSuffix}%`)
      }

      const { data: apps, error } = await query.order('application_id', { ascending: false }).limit(1)

      if (error || !apps || apps.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Data pendaftaran tidak ditemukan. Pastikan Nomor Registrasi / Email dan Nomor HP sesuai saat mendaftar.' },
          { status: 404 }
        )
      }

      const app = apps[0]
      return NextResponse.json({
        success: true,
        data: {
          ...app,
          level_name: app.admission_level?.level_name || app.preferred_grade || 'Umum'
        }
      })
    }

    // ─── AMBIL DAFTAR LIVE UNTUK ADMIN NEXT.JS / CPANEL ────────
    if (action === 'admin_list') {
      if (!verifyAuth(request)) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        )
      }

      const { data: apps, error } = await supabaseAdmin
        .from('student_applications')
        .select(`
          application_id,
          application_number,
          access_token,
          student_name,
          preferred_grade,
          parent_name,
          parent_phone,
          parent_email,
          wave_name,
          form_fee_amount,
          form_fee_status,
          payment_proof_file,
          is_form_completed,
          status,
          created_at,
          paid_at,
          verified_at,
          admission_level (
            level_name
          )
        `)
        .order('application_id', { ascending: false })

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      }

      const formatted = (apps || []).map(a => ({
        ...a,
        id: a.application_id,
        level_name: a.admission_level?.level_name || a.preferred_grade || 'Umum'
      }))

      return NextResponse.json({ success: true, data: formatted })
    }

    // ─── DEFAULT: AMBIL TARIF GELOMBANG AKTIF & JENJANG (DATE-DRIVEN) ───
    const today = new Date().toISOString().split('T')[0]
    const activeFee = await resolveCurrentFormFee(today)

    const { data: levels } = await supabaseAdmin
      .from('admission_level')
      .select('level_id, unit_id, level_name, level_order')
      .eq('is_active', true)
      .order('level_order', { ascending: true })

    return NextResponse.json({
      success: true,
      active_wave: activeFee,
      levels: levels || [],
      data: levels || []
    })
  } catch (err) {
    console.error('Error in GET /api/public/admission:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}

// POST:
// 1. action: 'register' (Tahap 1: Registrasi Ringkas Email + HP + Nama Siswa + Jenjang)
// 2. action: 'upload_proof' (Tahap 2: Upload Bukti Bayar)
// 3. action: 'admin_verify' (Tahap 3: Admin Approval)
// 4. action: 'complete_form' (Tahap 4: Pengisian Formulir Lengkap setelah Disetujui)
export async function POST(request) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid API secret token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    // ─── TAHAP 1: REGISTRASI RINGKAS (LEAD CAPTURE) ────────────
    if (!action || action === 'register' || action === 'register_simple') {
      const {
        parent_email,
        parent_phone,
        student_name,
        preferred_grade,
        level_name,
        level_id,
        wave_name,
        form_fee_amount,
        hosting_url
      } = body

      if (!parent_email || !parent_phone) {
        return NextResponse.json(
          { success: false, message: 'Email dan Nomor WhatsApp / HP wajib diisi' },
          { status: 400 }
        )
      }

      // Ambil tahun ajaran aktif
      let resolvedYearId = null
      const { data: latestYear } = await supabaseAdmin
        .from('year')
        .select('year_id')
        .order('year_id', { ascending: false })
        .limit(1)
      if (latestYear && latestYear.length > 0) resolvedYearId = latestYear[0].year_id

      // Selesaikan unit_id & level_id
      const resolvedGrade = (level_name || preferred_grade || '').trim()
      let resolvedUnitId = null
      let resolvedLevelId = level_id ? parseInt(level_id, 10) : null

      if (!resolvedLevelId && resolvedGrade) {
        const { data: foundLevel } = await supabaseAdmin
          .from('admission_level')
          .select('level_id, unit_id, level_name')
          .ilike('level_name', `%${resolvedGrade}%`)
          .limit(1)
        if (foundLevel && foundLevel.length > 0) {
          resolvedLevelId = foundLevel[0].level_id
          resolvedUnitId = foundLevel[0].unit_id
        }
      }

      if (!resolvedUnitId) {
        const { data: firstUnit } = await supabaseAdmin
          .from('unit')
          .select('unit_id')
          .eq('is_school', true)
          .limit(1)
        if (firstUnit && firstUnit.length > 0) resolvedUnitId = firstUnit[0].unit_id
      }

      // Selesaikan tarif formulir jika tidak dikirim dari klien
      let resolvedFeeAmount = Number(form_fee_amount) || 0
      let resolvedWaveName = wave_name
      if (!resolvedFeeAmount) {
        const resolvedFee = await resolveCurrentFormFee()
        resolvedFeeAmount = Number(resolvedFee.amount) || 250000
        resolvedWaveName = resolvedWaveName || resolvedFee.wave_name
      }

      const cleanEmail = parent_email.trim().toLowerCase()
      const cleanPhone = parent_phone.trim()
      const cleanPhoneDigits = cleanPhone.replace(/[^0-9]/g, '')
      const resolvedStudentName = student_name?.trim() || 'Calon Siswa'

      const insertPayload = {
        student_name: resolvedStudentName,
        parent_name: resolvedStudentName, // sementara
        parent_phone: cleanPhone,
        parent_email: cleanEmail,
        unit_id: resolvedUnitId,
        level_id: resolvedLevelId,
        year_id: resolvedYearId,
        preferred_grade: resolvedGrade || null,
        status: 'pending',
        form_fee_amount: resolvedFeeAmount,
        form_fee_status: 'pending_payment',
        wave_name: resolvedWaveName || null,
        hosting_url: hosting_url || null,
        is_form_completed: false
      }

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('student_applications')
        .insert([insertPayload])
        .select(`
          application_id,
          application_number,
          student_name,
          parent_phone,
          parent_email,
          preferred_grade,
          wave_name,
          form_fee_amount,
          form_fee_status,
          is_form_completed,
          created_at
        `)
        .single()

      if (insertErr) {
        console.error('Error inserting simple registration in Supabase:', insertErr)
        return NextResponse.json(
          { success: false, message: 'Gagal membuat pendaftaran di Supabase: ' + insertErr.message },
          { status: 500 }
        )
      }

      // Kirim email notifikasi tagihan & nomor rekening Bank Mayapada ke email orang tua
      try {
        if (cleanEmail && emailTemplates.admissionRegistrationPayment) {
          const { subject, html } = emailTemplates.admissionRegistrationPayment({
            parentName: resolvedStudentName,
            parentEmail: cleanEmail,
            parentPhone: cleanPhoneDigits,
            studentName: resolvedStudentName,
            applicationNumber: inserted.application_number,
            levelName: resolvedGrade || inserted.preferred_grade || '',
            feeAmount: resolvedFeeAmount,
            hostingUrl: hosting_url || 'https://ccs.sch.id/registrasi'
          })
          await sendEmail({
            to: cleanEmail,
            subject,
            html
          })
        }
      } catch (emailErr) {
        console.warn('⚠️ Gagal mengirim email konfirmasi pendaftaran:', emailErr.message)
      }

      return NextResponse.json({
        success: true,
        message: 'Pendaftaran awal berhasil dicatat di sistem sekolah',
        data: {
          ...inserted,
          level_name: resolvedGrade || inserted.preferred_grade || 'Umum'
        }
      })
    }

    // ─── TAHAP 2: UPLOAD BUKTI PEMBAYARAN FORMULIR ──────────────
    if (action === 'upload_proof') {
      const { application_number, payment_proof_file, hosting_url } = body

      if (!application_number || !payment_proof_file) {
        return NextResponse.json(
          { success: false, message: 'Nomor aplikasi dan berkas bukti pembayaran wajib disertakan' },
          { status: 400 }
        )
      }

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('student_applications')
        .update({
          payment_proof_file,
          form_fee_status: 'proof_uploaded',
          paid_at: new Date().toISOString(),
          hosting_url: hosting_url || null
        })
        .eq('application_number', application_number)
        .select()

      if (updateErr) {
        console.error('Error updating proof in Supabase:', updateErr)
        return NextResponse.json(
          { success: false, message: updateErr.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Bukti transfer berhasil diperbarui di Supabase',
        data: updated
      })
    }

    // ─── TAHAP 3: ADMIN APPROVE / TOLAK PEMBAYARAN FORMULIR ────
    if (action === 'admin_verify') {
      const { application_id, application_number, status, admin_notes } = body

      const updateData = {
        form_fee_status: status, // 'verified' | 'rejected'
        verified_at: status === 'verified' ? new Date().toISOString() : null,
        admin_notes: admin_notes || null
      }

      let query = supabaseAdmin.from('student_applications').update(updateData)
      if (application_id) {
        query = query.eq('application_id', application_id)
      } else {
        query = query.eq('application_number', application_number)
      }

      const { data: verified, error: verifyErr } = await query.select()

      if (verifyErr) {
        return NextResponse.json({ success: false, message: verifyErr.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Verifikasi pembayaran berhasil disimpan di Supabase',
        data: verified
      })
    }

    // ─── TAHAP 4: PENGISIAN FORMULIR LENGKAP SETELAH DI-APPROVE ─
    if (action === 'complete_form') {
      const {
        application_number,
        student_name,
        student_nickname,
        student_gender,
        student_birth_date,
        student_birth_place,
        student_religion,
        student_nationality,
        student_address,
        student_domicile_address,
        student_city,
        student_province,
        student_postal_code,
        student_previous_school,
        parent_name,
        parent_phone,
        parent_email,
        parent_occupation,
        parent_address,
        parent_nik,
        additional_notes
      } = body

      if (!application_number) {
        return NextResponse.json(
          { success: false, message: 'Nomor aplikasi diperlukan' },
          { status: 400 }
        )
      }

      // Pastikan status formulir sudah verified
      const { data: currentApp } = await supabaseAdmin
        .from('student_applications')
        .select('form_fee_status')
        .eq('application_number', application_number)
        .single()

      if (!currentApp || currentApp.form_fee_status !== 'verified') {
        return NextResponse.json(
          { success: false, message: 'Formulir lengkap hanya dapat diisi setelah pembayaran formulir diverifikasi dan disetujui admin.' },
          { status: 403 }
        )
      }

      const updatePayload = {
        student_name: student_name?.trim() || 'Calon Siswa',
        student_nickname: student_nickname?.trim() || null,
        student_gender: student_gender || null,
        student_birth_date: student_birth_date || null,
        student_birth_place: student_birth_place?.trim() || null,
        student_religion: student_religion || null,
        student_nationality: student_nationality || 'WNI',
        student_address: student_address?.trim() || null,
        student_domicile_address: student_domicile_address?.trim() || null,
        student_city: student_city?.trim() || null,
        student_province: student_province?.trim() || null,
        student_postal_code: student_postal_code?.trim() || null,
        student_previous_school: student_previous_school?.trim() || null,
        parent_name: parent_name?.trim() || null,
        parent_phone: parent_phone?.trim() || null,
        parent_email: parent_email?.trim()?.toLowerCase() || null,
        parent_occupation: parent_occupation?.trim() || null,
        parent_address: parent_address?.trim() || null,
        parent_nik: parent_nik?.trim() || null,
        additional_notes: additional_notes?.trim() || null,
        is_form_completed: true,
        status: 'under_review'
      }

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('student_applications')
        .update(updatePayload)
        .eq('application_number', application_number)
        .select()

      if (updateErr) {
        return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Formulir lengkap pendaftaran siswa berhasil disimpan di Supabase',
        data: updated
      })
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action specified' },
      { status: 400 }
    )
  } catch (err) {
    console.error('API Error in /api/public/admission:', err)
    return NextResponse.json(
      { success: false, message: 'Internal Server Error: ' + err.message },
      { status: 500 }
    )
  }
}
