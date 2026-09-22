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

// Helper: Ekstraksi fallback jadwal & promo jika disimpan di format JSON [SCHEDULE_META] / [PROMO_CLAIM]
function extractScheduleMeta(app) {
  if (!app) return app
  let meta = {}
  let promoMeta = {}
  let cleanNotes = app.additional_notes || null

  if (cleanNotes && cleanNotes.includes('[PROMO_CLAIM]:')) {
    try {
      const pParts = cleanNotes.split('[PROMO_CLAIM]:')
      cleanNotes = pParts[0].trim() || null
      const rawPromo = pParts[1].split('[SCHEDULE_META]:')[0].trim()
      promoMeta = JSON.parse(rawPromo)
    } catch (e) {
      // ignore
    }
  }

  if (cleanNotes && cleanNotes.includes('[SCHEDULE_META]:')) {
    try {
      const parts = cleanNotes.split('[SCHEDULE_META]:')
      cleanNotes = parts[0].trim() || null
      meta = JSON.parse(parts[1].trim())
    } catch (e) {
      // ignore parse error
    }
  }

  return {
    ...app,
    additional_notes: cleanNotes,
    test_date: app.test_date || meta.test_date || null,
    test_session: app.test_session || meta.test_session || null,
    interview_date: app.interview_date || meta.interview_date || null,
    interview_session: app.interview_session || meta.interview_session || null,
    schedule_notes: app.schedule_notes || meta.schedule_notes || null,
    promo_code: app.promo_code || promoMeta.promo_code || null,
    promo_discount_id: app.promo_discount_id || promoMeta.promo_discount_id || null,
    promo_status: app.promo_status || promoMeta.promo_status || (promoMeta.promo_code ? 'claimed' : null),
    promo_details: app.promo_details || promoMeta.promo_details || null,
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
          *,
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

      // Jika mencari berdasarkan kode registrasi (spesifik 1 anak), limit 1.
      // Jika mencari berdasarkan email (bisa multi-anak untuk 1 orang tua), ambil hingga 10 data.
      const fetchLimit = code ? 1 : 10
      const { data: apps, error } = await query.order('application_id', { ascending: false }).limit(fetchLimit)

      if (error || !apps || apps.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Data pendaftaran tidak ditemukan. Pastikan Nomor Registrasi atau Email dan Nomor HP sesuai saat mendaftar.' },
          { status: 404 }
        )
      }

      // Jika pencarian menggunakan kode registrasi atau hanya ditemukan 1 pendaftaran
      if (code || apps.length === 1) {
        const app = extractScheduleMeta(apps[0])
        return NextResponse.json({
          success: true,
          data: {
            ...app,
            level_name: app.admission_level?.level_name || app.preferred_grade || 'Umum'
          }
        })
      }

      // Jika pencarian menggunakan email dan ditemukan lebih dari 1 calon siswa
      const formattedList = apps.map(a => {
        const app = extractScheduleMeta(a)
        return {
          application_id: app.application_id,
          application_number: app.application_number,
          student_name: app.student_name,
          student_nickname: app.student_nickname,
          level_name: app.admission_level?.level_name || app.preferred_grade || 'Umum',
          status: app.status,
          form_fee_status: app.form_fee_status,
          parent_phone: app.parent_phone,
          created_at: app.created_at
        }
      })

      return NextResponse.json({
        success: true,
        multiple: true,
        data: formattedList,
        message: `Ditemukan ${apps.length} calon siswa terdaftar dengan email ini. Silakan pilih pendaftaran yang ingin dicek.`
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
          *,
          admission_level (
            level_name
          )
        `)
        .order('application_id', { ascending: false })

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      }

      const formatted = (apps || []).map(a => {
        const item = extractScheduleMeta(a)
        return {
          ...item,
          id: item.application_id,
          level_name: item.admission_level?.level_name || item.preferred_grade || 'Umum'
        }
      })

      return NextResponse.json({ success: true, data: formatted })
    }

    // ─── CEK KODE PROMO / KUPON DISKON (REAL-TIME VALIDATION & KUOTA) ──
    if (action === 'check_promo') {
      const code = (searchParams.get('promo_code') || searchParams.get('code') || '').trim().toUpperCase()
      const levelName = (searchParams.get('level_name') || '').trim()

      if (!code) {
        return NextResponse.json({
          success: false,
          valid: false,
          message: 'Silakan masukkan kode kupon promosi.'
        }, { status: 400 })
      }

      // Cari kupon di fee_discount
      const { data: discounts, error: discountErr } = await supabaseAdmin
        .from('fee_discount')
        .select('*, unit:unit_id(unit_name), level:level_id(level_name)')
        .ilike('discount_code', code)
        .eq('is_active', true)

      if (discountErr) {
        return NextResponse.json({ success: false, message: discountErr.message }, { status: 500 })
      }

      if (!discounts || discounts.length === 0) {
        return NextResponse.json({
          success: false,
          valid: false,
          message: `Kode promo "${code}" tidak ditemukan atau sudah tidak aktif.`
        })
      }

      const today = new Date().toISOString().split('T')[0]

      // Filter yang masih berlaku tanggalnya
      const dateValidDiscounts = discounts.filter(d => {
        if (d.valid_from && d.valid_from > today) return false
        if (d.valid_until && d.valid_until < today) return false
        return true
      })

      if (dateValidDiscounts.length === 0) {
        return NextResponse.json({
          success: false,
          valid: false,
          message: `Masa berlaku kode promo "${code}" telah berakhir.`
        })
      }

      // Filter kuota pemakaian: pastikan max_usage is null atau current_usage < max_usage
      const quotaValidDiscounts = dateValidDiscounts.filter(d => {
        if (d.max_usage !== null && d.max_usage !== undefined && (d.current_usage || 0) >= d.max_usage) {
          return false
        }
        return true
      })

      if (quotaValidDiscounts.length === 0) {
        return NextResponse.json({
          success: false,
          valid: false,
          message: `Maaf, kuota penggunaan kode promo "${code}" sudah habis.`
        })
      }

      let matched = null
      if (levelName) {
        let q = levelName.toLowerCase()
        if (q.includes('sd') || q.includes('element')) q = 'Elementary'
        else if (q.includes('smp') || q.includes('junior')) q = 'Junior'
        else if (q.includes('sma') || q.includes('senior')) q = 'Senior'
        else if (q.includes('tk') || q.includes('kinder')) q = 'Kindergarten'
        else if (q.includes('kb') || q.includes('nurse')) q = 'Nursery'

        const { data: foundLvl } = await supabaseAdmin
          .from('admission_level')
          .select('level_id, unit_id')
          .ilike('level_name', `%${q}%`)
          .limit(1)

        if (foundLvl && foundLvl.length > 0) {
          const targetUnit = foundLvl[0].unit_id
          const targetLvl = foundLvl[0].level_id
          matched = quotaValidDiscounts.find(d => (d.level_id && d.level_id === targetLvl) || (d.unit_id && d.unit_id === targetUnit))
        }
      }
      if (!matched) {
        matched = quotaValidDiscounts[0]
      }
      const remainingQuota = matched.max_usage ? (matched.max_usage - (matched.current_usage || 0)) : null

      return NextResponse.json({
        success: true,
        valid: true,
        message: `Kode promo "${matched.discount_code}" valid! Anda mendapatkan potongan ${matched.discount_type === 'percentage' ? `${matched.discount_value}%` : `Rp ${Number(matched.discount_value).toLocaleString('id-ID')}`} untuk ${matched.applies_to === 'udp' ? 'DPP' : matched.applies_to === 'usek' ? 'SPP' : 'DPP & SPP'}.`,
        discount: {
          discount_id: matched.discount_id,
          discount_code: matched.discount_code,
          discount_name: matched.discount_name,
          discount_type: matched.discount_type,
          discount_value: matched.discount_value,
          applies_to: matched.applies_to,
          max_usage: matched.max_usage,
          current_usage: matched.current_usage,
          remaining_quota: remainingQuota
        }
      })
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
        hosting_url,
        promo_code
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

      // ─── VALIDASI KODE KUPON / PROMO & KUOTA PENGGUNAAN ──────────
      let resolvedPromoCode = null
      let resolvedPromoDiscountId = null
      let resolvedPromoDetails = null

      const inputPromo = (promo_code || body.discount_code || '').trim().toUpperCase()
      if (inputPromo) {
        const today = new Date().toISOString().split('T')[0]
        const { data: promoMatches } = await supabaseAdmin
          .from('fee_discount')
          .select('*, unit:unit_id(unit_name), level:level_id(level_name)')
          .ilike('discount_code', inputPromo)
          .eq('is_active', true)

        if (promoMatches && promoMatches.length > 0) {
          const matchedPromo = promoMatches.find(d => {
            if (d.unit_id && resolvedUnitId && d.unit_id !== resolvedUnitId) return false
            if (d.level_id && resolvedLevelId && d.level_id !== resolvedLevelId) return false
            if (d.valid_from && d.valid_from > today) return false
            if (d.valid_until && d.valid_until < today) return false
            if (d.max_usage !== null && d.max_usage !== undefined && (d.current_usage || 0) >= d.max_usage) return false
            return true
          })

          if (matchedPromo) {
            resolvedPromoCode = matchedPromo.discount_code
            resolvedPromoDiscountId = matchedPromo.discount_id
            resolvedPromoDetails = {
              discount_name: matchedPromo.discount_name,
              discount_type: matchedPromo.discount_type,
              discount_value: matchedPromo.discount_value,
              applies_to: matchedPromo.applies_to,
              claimed_at: new Date().toISOString()
            }
            // CATATAN: Kuota promo TIDAK DIPOTONG saat pendaftaran awal, melainkan baru resmi
            // dipotong saat pembayaran formulir diverifikasi lunas (status = 'verified') oleh admin/sistem.
          } else {
            console.warn(`[PROMO] Kupon "${inputPromo}" tidak dapat diklaim (kedaluwarsa atau kuota habis)`)
          }
        }
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
        is_form_completed: false,
        promo_code: resolvedPromoCode,
        promo_discount_id: resolvedPromoDiscountId,
        promo_status: resolvedPromoCode ? 'pending_payment' : null,
        promo_details: resolvedPromoDetails || null
      }

      let inserted = null
      let { data: insertedData, error: insertErr } = await supabaseAdmin
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
          promo_code,
          promo_discount_id,
          promo_status,
          promo_details,
          created_at
        `)
        .single()

      if (insertErr && (insertErr.message?.includes('promo_code') || insertErr.message?.includes('schema cache'))) {
        console.warn('⚠️ Kolom promo_code belum ada di schema student_applications. Menggunakan defensive fallback additional_notes...')
        const fallbackPayload = { ...insertPayload }
        delete fallbackPayload.promo_code
        delete fallbackPayload.promo_discount_id
        delete fallbackPayload.promo_status
        delete fallbackPayload.promo_details

        if (resolvedPromoCode) {
          const promoMeta = JSON.stringify({
            promo_code: resolvedPromoCode,
            promo_discount_id: resolvedPromoDiscountId,
            promo_status: 'pending_payment',
            promo_details: resolvedPromoDetails
          })
          fallbackPayload.additional_notes = `[PROMO_CLAIM]: ${promoMeta}`
        }

        const fallbackRes = await supabaseAdmin
          .from('student_applications')
          .insert([fallbackPayload])
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
            additional_notes,
            created_at
          `)
          .single()

        if (!fallbackRes.error && fallbackRes.data) {
          inserted = {
            ...fallbackRes.data,
            promo_code: resolvedPromoCode,
            promo_discount_id: resolvedPromoDiscountId,
            promo_status: resolvedPromoCode ? 'claimed' : null,
            promo_details: resolvedPromoDetails
          }
          insertErr = null
        } else {
          insertErr = fallbackRes.error
        }
      } else {
        inserted = insertedData
      }

      if (insertErr || !inserted) {
        console.error('Error inserting simple registration in Supabase:', insertErr)
        return NextResponse.json(
          { success: false, message: 'Gagal membuat pendaftaran di Supabase: ' + (insertErr?.message || 'Unknown error') },
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

      // Ambil data aplikasi saat ini untuk pengecekan promo code
      let getAppQuery = supabaseAdmin.from('student_applications').select('*')
      if (application_id) getAppQuery = getAppQuery.eq('application_id', application_id)
      else getAppQuery = getAppQuery.eq('application_number', application_number)
      const { data: existingApps } = await getAppQuery.limit(1)
      const currentApp = existingApps?.[0]

      // Kelola Kuota Promo Berdasarkan Status Pembayaran Formulir
      if (currentApp?.promo_discount_id) {
        if (status === 'verified' && currentApp.promo_status !== 'confirmed') {
          const { data: discountData } = await supabaseAdmin
            .from('fee_discount')
            .select('*')
            .eq('discount_id', currentApp.promo_discount_id)
            .single()

          if (discountData) {
            const hasQuota = discountData.max_usage === null || (discountData.current_usage || 0) < discountData.max_usage
            if (hasQuota) {
              await supabaseAdmin
                .from('fee_discount')
                .update({ current_usage: (discountData.current_usage || 0) + 1 })
                .eq('discount_id', discountData.discount_id)

              updateData.promo_status = 'confirmed'
            } else {
              updateData.promo_status = 'quota_exhausted'
            }
          }
        } else if (status === 'rejected' && currentApp.promo_status === 'confirmed') {
          const { data: discountData } = await supabaseAdmin
            .from('fee_discount')
            .select('*')
            .eq('discount_id', currentApp.promo_discount_id)
            .single()

          if (discountData) {
            await supabaseAdmin
              .from('fee_discount')
              .update({ current_usage: Math.max(0, (discountData.current_usage || 0) - 1) })
              .eq('discount_id', discountData.discount_id)

            updateData.promo_status = 'pending_payment'
          }
        }
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
        additional_notes,
        test_date,
        test_session,
        interview_date,
        interview_session,
        schedule_notes
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
        .select('form_fee_status, additional_notes')
        .eq('application_number', application_number)
        .single()

      if (!currentApp || currentApp.form_fee_status !== 'verified') {
        return NextResponse.json(
          { success: false, message: 'Formulir lengkap hanya dapat diisi setelah pembayaran formulir diverifikasi dan disetujui admin.' },
          { status: 403 }
        )
      }

      let updatePayload = {
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
        test_date: test_date || null,
        test_session: test_session || null,
        interview_date: interview_date || null,
        interview_session: interview_session || null,
        schedule_notes: schedule_notes || null,
        is_form_completed: true,
        status: 'under_review'
      }

      let { data: updated, error: updateErr } = await supabaseAdmin
        .from('student_applications')
        .update(updatePayload)
        .eq('application_number', application_number)
        .select()

      // Fallback jika kolom jadwal belum ditambahkan pada tabel database Supabase
      if (updateErr && updateErr.message && (updateErr.message.includes('column') || updateErr.message.includes('test_date'))) {
        const schedMeta = {
          test_date: test_date || null,
          test_session: test_session || null,
          interview_date: interview_date || null,
          interview_session: interview_session || null,
          schedule_notes: schedule_notes || null
        }
        delete updatePayload.test_date
        delete updatePayload.test_session
        delete updatePayload.interview_date
        delete updatePayload.interview_session
        delete updatePayload.schedule_notes

        const cleanNotes = (additional_notes || '').replace(/\[SCHEDULE_META\]:.*$/s, '').trim()
        updatePayload.additional_notes = cleanNotes 
          ? `${cleanNotes}\n[SCHEDULE_META]:${JSON.stringify(schedMeta)}` 
          : `[SCHEDULE_META]:${JSON.stringify(schedMeta)}`

        const retry = await supabaseAdmin
          .from('student_applications')
          .update(updatePayload)
          .eq('application_number', application_number)
          .select()
        updated = retry.data
        updateErr = retry.error
      }

      if (updateErr) {
        return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 })
      }

      const formattedData = Array.isArray(updated) 
        ? updated.map(extractScheduleMeta) 
        : (updated ? extractScheduleMeta(updated) : updated)

      return NextResponse.json({
        success: true,
        message: 'Formulir lengkap pendaftaran siswa & pemilihan jadwal berhasil disimpan',
        data: formattedData
      })
    }

    // ─── TAHAP 5: UPDATE JADWAL TES & WAWANCARA (RESCHEDULE OLEH USER / ADMIN) ─
    if (action === 'update_schedule') {
      const {
        application_number,
        application_id,
        test_date,
        test_session,
        interview_date,
        interview_session,
        schedule_notes
      } = body

      if (!application_number && !application_id) {
        return NextResponse.json(
          { success: false, message: 'Nomor aplikasi atau ID pendaftaran diperlukan' },
          { status: 400 }
        )
      }

      let checkQuery = supabaseAdmin
        .from('student_applications')
        .select('application_id, application_number, form_fee_status, additional_notes')
      if (application_id) {
        checkQuery = checkQuery.eq('application_id', application_id)
      } else {
        checkQuery = checkQuery.eq('application_number', application_number)
      }
      const { data: currentApp } = await checkQuery.maybeSingle()

      if (!currentApp || currentApp.form_fee_status !== 'verified') {
        return NextResponse.json(
          { success: false, message: 'Jadwal tes dan wawancara hanya dapat diatur setelah pembayaran formulir diverifikasi.' },
          { status: 403 }
        )
      }

      const updatePayload = {
        test_date: test_date || null,
        test_session: test_session || null,
        interview_date: interview_date || null,
        interview_session: interview_session || null,
        schedule_notes: schedule_notes || null
      }

      let query = supabaseAdmin.from('student_applications').update(updatePayload)
      if (application_id) {
        query = query.eq('application_id', application_id)
      } else {
        query = query.eq('application_number', application_number)
      }
      let { data: updated, error: updateErr } = await query.select()

      // Fallback jika kolom belum ada di Supabase
      if (updateErr && updateErr.message && (updateErr.message.includes('column') || updateErr.message.includes('test_date'))) {
        const schedMeta = {
          test_date: test_date || null,
          test_session: test_session || null,
          interview_date: interview_date || null,
          interview_session: interview_session || null,
          schedule_notes: schedule_notes || null
        }
        const existingNotes = (currentApp.additional_notes || '').replace(/\[SCHEDULE_META\]:.*$/s, '').trim()
        const newNotes = existingNotes 
          ? `${existingNotes}\n[SCHEDULE_META]:${JSON.stringify(schedMeta)}` 
          : `[SCHEDULE_META]:${JSON.stringify(schedMeta)}`

        let retryQ = supabaseAdmin.from('student_applications').update({ additional_notes: newNotes })
        if (application_id) {
          retryQ = retryQ.eq('application_id', application_id)
        } else {
          retryQ = retryQ.eq('application_number', application_number)
        }
        const retry = await retryQ.select()
        updated = retry.data
        updateErr = retry.error
      }

      if (updateErr) {
        return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 })
      }

      const formattedData = Array.isArray(updated) 
        ? updated.map(extractScheduleMeta) 
        : (updated ? extractScheduleMeta(updated) : updated)

      return NextResponse.json({
        success: true,
        message: 'Jadwal tes dan wawancara berhasil diperbarui',
        data: formattedData
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
