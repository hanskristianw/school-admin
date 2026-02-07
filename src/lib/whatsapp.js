/**
 * WhatsApp Notification via Fonnte.com
 * 
 * API Docs: https://docs.fonnte.com/api-send-message/
 * 
 * Endpoint: POST https://api.fonnte.com/send
 * Headers:  Authorization: <FONNTE_TOKEN>
 * Body:     target, message, countryCode (default 62)
 * 
 * Anti-spam measures:
 * - Random delay (2-5 seconds) before sending
 * - Message variation (random greetings, closings, timestamps)
 */

const FONNTE_API_URL = 'https://api.fonnte.com/send'

/** Random delay helper (ms) */
function delay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Pick random element from array */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Format current timestamp for message uniqueness */
function timestamp() {
  return new Date().toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

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
 * Includes random 2-5 second delay to reduce spam detection
 * Harus dipanggil dari server-side (API route) karena butuh token
 */
export async function sendWhatsApp(token, target, message) {
  if (!token) {
    console.warn('⚠️ FONNTE_TOKEN not set, skipping WhatsApp notification')
    return { status: false, reason: 'Token not configured' }
  }

  // Random delay 2-5 seconds to appear more natural
  await delay(2000, 5000)

  try {
    const res = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        target: target,
        message: message,
        countryCode: '62'
      }).toString()
    })

    const result = await res.json()
    console.log('📱 WhatsApp send result:', JSON.stringify(result))
    return result
  } catch (error) {
    console.error('❌ WhatsApp send error:', error)
    return { status: false, reason: error.message }
  }
}

// ---------- Message variation pools ----------

const greetings = [
  'Yth.',
  'Kepada Yth.',
  'Halo,',
  'Salam,',
  'Dear',
]

const closingsGeneral = [
  'Terima kasih atas kepercayaan Anda.',
  'Terima kasih telah memilih CCS.',
  'Salam hangat dari kami.',
  'Hormat kami, Tim Admisi CCS.',
]

/**
 * Template pesan untuk notifikasi pendaftaran
 * Setiap template memiliki variasi untuk menghindari pesan identik
 */
export const messageTemplates = {
  // Notifikasi ke orang tua setelah berhasil mendaftar
  admissionReceived: ({ parentName, studentName, applicationNumber, schoolName }) => {
    const g = pick(greetings)
    const c = pick(closingsGeneral)
    const ts = timestamp()

    return `${g} *${parentName}*,

Terima kasih telah mendaftarkan putra/putri Anda di *Chung Chung Christian School*.

📋 *Detail Pendaftaran:*
• Nama Siswa: *${studentName}*
• No. Pendaftaran: *${applicationNumber}*
• Sekolah Tujuan: ${schoolName}
• Waktu Daftar: ${ts}

Kami akan segera meninjau pendaftaran Anda. Informasi lebih lanjut akan disampaikan melalui WhatsApp ini.

Simpan nomor pendaftaran di atas untuk mengecek status pendaftaran Anda.

${c}`
  },

  // Notifikasi pendaftaran diterima
  admissionApproved: ({ parentName, studentName, applicationNumber }) => {
    const g = pick(greetings)
    const c = pick(closingsGeneral)
    const ts = timestamp()

    return `${g} *${parentName}*,

Selamat! 🎉 Pendaftaran putra/putri Anda telah *DITERIMA*.

📋 *Detail:*
• Nama Siswa: *${studentName}*
• No. Pendaftaran: *${applicationNumber}*
• Diproses pada: ${ts}

Silakan hubungi pihak sekolah untuk langkah selanjutnya.

${c}`
  },

  // Notifikasi pendaftaran ditolak
  admissionRejected: ({ parentName, studentName, applicationNumber }) => {
    const g = pick(greetings)
    const c = pick(closingsGeneral)
    const ts = timestamp()

    return `${g} *${parentName}*,

Mohon maaf, pendaftaran putra/putri Anda *belum dapat kami terima* saat ini.

📋 *Detail:*
• Nama Siswa: *${studentName}*
• No. Pendaftaran: *${applicationNumber}*
• Diproses pada: ${ts}

Silakan hubungi pihak sekolah untuk informasi lebih lanjut.

${c}`
  },

  // Notifikasi status sedang ditinjau
  admissionUnderReview: ({ parentName, studentName, applicationNumber }) => {
    const g = pick(greetings)
    const c = pick(closingsGeneral)
    const ts = timestamp()

    return `${g} *${parentName}*,

Pendaftaran putra/putri Anda sedang dalam proses *peninjauan*.

📋 *Detail:*
• Nama Siswa: *${studentName}*
• No. Pendaftaran: *${applicationNumber}*
• Diperbarui pada: ${ts}

Kami akan segera menginformasikan hasilnya melalui WhatsApp ini.

${c}`
  }
}
