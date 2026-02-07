/**
 * WhatsApp Notification via Fonnte.com
 * 
 * API Docs: https://docs.fonnte.com/api-send-message/
 * 
 * Endpoint: POST https://api.fonnte.com/send
 * Headers:  Authorization: <FONNTE_TOKEN>
 * Body:     target, message, countryCode (default 62)
 */

const FONNTE_API_URL = 'https://api.fonnte.com/send'

/**
 * Format nomor telepon Indonesia ke format internasional
 * 08123456789 → 628123456789
 * +628123456789 → 628123456789
 * 628123456789 → 628123456789
 */
export function formatPhoneNumber(phone) {
  if (!phone) return ''
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1)
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1)
  return cleaned
}

/**
 * Kirim pesan WhatsApp via Fonnte API
 * Harus dipanggil dari server-side (API route) karena butuh token
 */
export async function sendWhatsApp(token, target, message) {
  if (!token) {
    console.warn('⚠️ FONNTE_TOKEN not set, skipping WhatsApp notification')
    return { status: false, reason: 'Token not configured' }
  }

  const formData = new FormData()
  formData.append('target', target)
  formData.append('message', message)
  formData.append('countryCode', '62')

  try {
    const res = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': token
      },
      body: formData
    })

    const result = await res.json()
    console.log('📱 WhatsApp send result:', JSON.stringify(result))
    return result
  } catch (error) {
    console.error('❌ WhatsApp send error:', error)
    return { status: false, reason: error.message }
  }
}

/**
 * Template pesan untuk notifikasi pendaftaran
 */
export const messageTemplates = {
  // Notifikasi ke orang tua setelah berhasil mendaftar
  admissionReceived: ({ parentName, studentName, applicationNumber, schoolName }) => {
    return `Yth. *${parentName}*,

Terima kasih telah mendaftarkan putra/putri Anda di *Chung Chung Christian School*.

📋 *Detail Pendaftaran:*
• Nama Siswa: *${studentName}*
• No. Pendaftaran: *${applicationNumber}*
• Sekolah Tujuan: ${schoolName}

Kami akan segera meninjau pendaftaran Anda. Informasi lebih lanjut akan disampaikan melalui WhatsApp ini.

Simpan nomor pendaftaran di atas untuk mengecek status pendaftaran Anda.

_Pesan ini dikirim otomatis oleh sistem CCS._`
  },

  // Notifikasi pendaftaran diterima
  admissionApproved: ({ parentName, studentName, applicationNumber }) => {
    return `Yth. *${parentName}*,

Selamat! 🎉 Pendaftaran putra/putri Anda telah *DITERIMA*.

📋 *Detail:*
• Nama Siswa: *${studentName}*
• No. Pendaftaran: *${applicationNumber}*

Silakan hubungi pihak sekolah untuk langkah selanjutnya.

_Pesan ini dikirim otomatis oleh sistem CCS._`
  },

  // Notifikasi pendaftaran ditolak
  admissionRejected: ({ parentName, studentName, applicationNumber }) => {
    return `Yth. *${parentName}*,

Mohon maaf, pendaftaran putra/putri Anda *belum dapat kami terima* saat ini.

📋 *Detail:*
• Nama Siswa: *${studentName}*
• No. Pendaftaran: *${applicationNumber}*

Silakan hubungi pihak sekolah untuk informasi lebih lanjut.

_Pesan ini dikirim otomatis oleh sistem CCS._`
  },

  // Notifikasi status sedang ditinjau
  admissionUnderReview: ({ parentName, studentName, applicationNumber }) => {
    return `Yth. *${parentName}*,

Pendaftaran putra/putri Anda sedang dalam proses *peninjauan*.

📋 *Detail:*
• Nama Siswa: *${studentName}*
• No. Pendaftaran: *${applicationNumber}*

Kami akan segera menginformasikan hasilnya melalui WhatsApp ini.

_Pesan ini dikirim otomatis oleh sistem CCS._`
  }
}
