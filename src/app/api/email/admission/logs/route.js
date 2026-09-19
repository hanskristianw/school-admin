import { NextResponse } from 'next/server'

const RESEND_API_URL = 'https://api.resend.com/emails'

/**
 * GET /api/email/admission/logs
 * 
 * Mengambil riwayat pengiriman email dari Resend API yang berkaitan dengan
 * modul pendaftaran siswa baru (PPDB / SPMB).
 * 
 * Query Params:
 * - email: filter penerima spesifik
 * - app_no: filter nomor registrasi (misal: REG-2026-000003)
 * - search: pencarian teks umum pada subjek atau email
 * - limit: batas jumlah record (default: 50)
 */
export async function GET(request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'RESEND_API_KEY belum dikonfigurasi di environment' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filterEmail = searchParams.get('email')?.toLowerCase().trim() || ''
    const filterAppNo = searchParams.get('app_no')?.toUpperCase().trim() || ''
    const search = searchParams.get('search')?.toLowerCase().trim() || ''
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const response = await fetch(RESEND_API_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      // Jangan cache agar selalu mendapatkan status pengiriman terkini
      cache: 'no-store'
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return NextResponse.json(
        { success: false, message: `Gagal mengambil log dari Resend: ${errText || response.statusText}` },
        { status: response.status }
      )
    }

    const resData = await response.json()
    const allEmails = resData.data || []

    // Kata kunci penanda email modul pendaftaran / admisi
    const admissionKeywords = [
      'instruksi pembayaran',
      'pendaftaran siswa baru',
      'application received',
      'application approved',
      'application rejected',
      'application update',
      'under review',
      'perjanjian cicilan',
      'ppdb',
      'spmb',
      'reg-202'
    ]

    let filtered = allEmails.filter(item => {
      const subject = (item.subject || '').toLowerCase()
      const toEmails = (item.to || []).map(e => String(e).toLowerCase())

      // 1. Cek apakah email termasuk kategori admisi
      const isAdmissionEmail = admissionKeywords.some(k => subject.includes(k)) ||
        toEmails.some(e => e === filterEmail)

      if (!isAdmissionEmail && !filterEmail && !filterAppNo) {
        return false
      }

      // 2. Filter spesifik email jika diminta
      if (filterEmail && !toEmails.includes(filterEmail)) {
        return false
      }

      // 3. Filter spesifik nomor registrasi jika diminta
      if (filterAppNo && !subject.toUpperCase().includes(filterAppNo)) {
        return false
      }

      // 4. Pencarian teks bebas
      if (search) {
        const matchesSubject = subject.includes(search)
        const matchesRecipient = toEmails.some(e => e.includes(search))
        if (!matchesSubject && !matchesRecipient) return false
      }

      return true
    })

    // Parse informasi tambahan dari subjek
    const formatted = filtered.slice(0, limit).map(item => {
      const appNoMatch = (item.subject || '').match(/REG-\d{4}-\d{6}/i)
      const appNo = appNoMatch ? appNoMatch[0].toUpperCase() : null

      let emailType = 'Lainnya'
      const subj = (item.subject || '').toLowerCase()
      if (subj.includes('instruksi pembayaran')) {
        emailType = 'Instruksi Pembayaran Formulir'
      } else if (subj.includes('pembayaran biaya formulir terverifikasi') || subj.includes('formulir terverifikasi') || subj.includes('form fee receipt')) {
        emailType = 'Konfirmasi Pembayaran Formulir Lunas'
      } else if (subj.includes('jadwal tes penempatan') || subj.includes('jadwal tes') || subj.includes('placement test')) {
        emailType = 'Jadwal Tes Penempatan & Wawancara'
      } else if (subj.includes('application approved') || subj.includes('calon siswa diterima') || subj.includes('diterima')) {
        emailType = 'Pemberitahuan Diterima (Approved)'
      } else if (subj.includes('application rejected') || subj.includes('hasil seleksi penerimaan') || subj.includes('ditolak')) {
        emailType = 'Pemberitahuan Hasil Seleksi (Ditolak)'
      } else if (subj.includes('under review')) {
        emailType = 'Pemberitahuan Sedang Ditinjau'
      } else if (subj.includes('perjanjian cicilan') || subj.includes('perjanjian pembayaran cicilan')) {
        emailType = 'Dokumen Perjanjian Cicilan Inhouse'
      } else if (subj.includes('application received')) {
        emailType = 'Konfirmasi Pendaftaran Awal'
      }

      return {
        id: item.id,
        to: item.to || [],
        from: item.from,
        subject: item.subject,
        email_type: emailType,
        application_number: appNo,
        status: item.last_event || 'sent',
        created_at: item.created_at,
        scheduled_at: item.scheduled_at
      }
    })

    return NextResponse.json({
      success: true,
      count: formatted.length,
      data: formatted
    })

  } catch (error) {
    console.error('Error fetching admission email logs:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
