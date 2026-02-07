import { NextResponse } from 'next/server'
import { sendWhatsApp, formatPhoneNumber, messageTemplates } from '@/lib/whatsapp'

/**
 * POST /api/whatsapp/send
 * 
 * Kirim notifikasi WhatsApp via Fonnte
 * Body: { type, parentName, studentName, applicationNumber, schoolName, phone }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { type, parentName, studentName, applicationNumber, schoolName, phone } = body

    if (!phone || !type) {
      return NextResponse.json(
        { success: false, message: 'phone dan type wajib diisi' },
        { status: 400 }
      )
    }

    const token = process.env.FONNTE_TOKEN
    if (!token) {
      console.warn('⚠️ FONNTE_TOKEN not set in environment')
      return NextResponse.json(
        { success: false, message: 'WhatsApp notification not configured' },
        { status: 503 }
      )
    }

    // Build message from template
    const templateFn = messageTemplates[type]
    if (!templateFn) {
      return NextResponse.json(
        { success: false, message: `Template "${type}" tidak ditemukan` },
        { status: 400 }
      )
    }

    const message = templateFn({ parentName, studentName, applicationNumber, schoolName })
    const target = formatPhoneNumber(phone)

    const result = await sendWhatsApp(token, target, message)

    if (result.status) {
      return NextResponse.json({ success: true, message: 'Notifikasi WhatsApp terkirim', detail: result })
    } else {
      console.error('Fonnte API error:', result)
      return NextResponse.json(
        { success: false, message: 'Gagal mengirim WhatsApp', detail: result },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('WhatsApp API error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
