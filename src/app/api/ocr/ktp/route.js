import { NextResponse } from 'next/server'

/**
 * Simple in-memory rate limiter
 * Max 10 requests per IP per hour (well within Gemini free tier of 15/min)
 */
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 10 // max 10 per hour

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 })
    return true
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  entry.count++
  return true
}

// Clean up old entries every 30 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.start > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip)
    }
  }
}, 30 * 60 * 1000)

/**
 * POST /api/ocr/ktp
 * 
 * Receives a base64 image of Indonesian KTP,
 * uses Gemini Vision to extract structured data.
 * 
 * Rate limited: max 10 requests per IP per hour.
 */
export async function POST(request) {
  try {
    // Rate limit check
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan. Coba lagi dalam 1 jam.' },
        { status: 429 }
      )
    }

    const { image } = await request.json()
    
    if (!image) {
      return NextResponse.json(
        { success: false, message: 'Gambar wajib dikirim' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

    // Extract base64 data and mime type
    let base64Data = image
    let mimeType = 'image/jpeg'
    
    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (match) {
        mimeType = match[1]
        base64Data = match[2]
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const body = {
      contents: [{
        parts: [
          {
            text: `Kamu adalah sistem OCR untuk KTP Indonesia. Analisis foto KTP berikut dan extract data ke format JSON.

PENTING:
- Hanya extract field yang terlihat jelas
- Untuk field yang tidak terbaca, isi dengan string kosong ""
- Jangan mengarang data
- Return HANYA JSON, tanpa markdown, tanpa backtick, tanpa penjelasan

Format output (JSON only):
{"nik":"","nama":"","tempat_lahir":"","tanggal_lahir":"","jenis_kelamin":"","alamat":"","rt_rw":"","kel_desa":"","kecamatan":"","agama":"","pekerjaan":"","kewarganegaraan":""}`
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }]
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error('Gemini Vision API error:', err)
      return NextResponse.json(
        { success: false, message: 'Gagal memproses gambar' },
        { status: 502 }
      )
    }

    const data = await resp.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''

    // Parse JSON from response (remove any markdown wrapping if present)
    let cleaned = rawText.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let extracted
    try {
      extracted = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Failed to parse Gemini response:', rawText)
      return NextResponse.json(
        { success: false, message: 'Gagal membaca data KTP. Pastikan foto jelas dan tidak terpotong.' },
        { status: 422 }
      )
    }

    // Build full address
    let fullAddress = extracted.alamat || ''
    if (extracted.rt_rw) fullAddress += ` RT/RW ${extracted.rt_rw}`
    if (extracted.kel_desa) fullAddress += `, Kel. ${extracted.kel_desa}`
    if (extracted.kecamatan) fullAddress += `, Kec. ${extracted.kecamatan}`

    return NextResponse.json({
      success: true,
      data: {
        nik: extracted.nik || '',
        nama: extracted.nama || '',
        tempat_lahir: extracted.tempat_lahir || '',
        tanggal_lahir: extracted.tanggal_lahir || '',
        jenis_kelamin: extracted.jenis_kelamin || '',
        alamat: fullAddress.trim(),
        agama: extracted.agama || '',
        pekerjaan: extracted.pekerjaan || '',
        kewarganegaraan: extracted.kewarganegaraan || ''
      }
    })
  } catch (error) {
    console.error('KTP OCR error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
