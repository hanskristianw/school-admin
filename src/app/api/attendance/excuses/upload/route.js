import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
const ALLOWED_EXTS  = ['jpg', 'jpeg', 'png', 'pdf']
const MAX_SIZE      = 5 * 1024 * 1024 // 5 MB
const BUCKET        = 'attachments'  // dedicated bucket for document attachments

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file     = formData.get('file')
    const userId   = formData.get('user_id') // optional, used for path prefix

    if (!file) {
      return NextResponse.json({ success: false, message: 'File tidak ditemukan' }, { status: 400 })
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Tipe file tidak didukung. Gunakan PDF, JPG, atau PNG.' },
        { status: 400 }
      )
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Ukuran file maksimal 5 MB.' },
        { status: 400 }
      )
    }

    const ext      = file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json(
        { success: false, message: 'Ekstensi file tidak diizinkan.' },
        { status: 400 }
      )
    }

    const prefix   = userId ? `excuses/${userId}` : 'excuses/anon'
    const fileName = `${prefix}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('[ExcuseUpload] Supabase error:', uploadError)
      return NextResponse.json(
        { success: false, message: `Upload gagal: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(fileName)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err) {
    console.error('[ExcuseUpload] Error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
