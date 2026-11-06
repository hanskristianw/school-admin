import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const BUCKET = 'attachments'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const userId = formData.get('user_id')

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada file gambar yang dipilih.' },
        { status: 400 }
      )
    }

    const rawExt = file.name ? file.name.split('.').pop().toLowerCase() : ''
    const isImage = (file.type && (ALLOWED_TYPES.includes(file.type) || file.type.startsWith('image/'))) || ALLOWED_EXTS.includes(rawExt)

    if (!isImage) {
      return NextResponse.json(
        { success: false, message: 'Format file tidak didukung. Harap upload gambar (PNG, JPG, WEBP, atau GIF).' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Ukuran file gambar melebihi batas maksimal 10 MB.' },
        { status: 400 }
      )
    }

    const ext = ALLOWED_EXTS.includes(rawExt) ? rawExt : 'png'
    const prefix = userId ? `feedback/user_${userId}` : 'feedback/general'
    const fileName = `${prefix}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const contentType = file.type && file.type.startsWith('image/') ? file.type : `image/${ext === 'jpg' ? 'jpeg' : ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('[FeedbackUpload] Supabase Storage upload error:', uploadError)
      return NextResponse.json(
        { success: false, message: 'Gagal mengunggah file ke Supabase Storage: ' + uploadError.message },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(fileName)

    const finalUrl = publicUrlData?.publicUrl

    return NextResponse.json({
      success: true,
      url: finalUrl,
      publicUrl: finalUrl,
      fileName: file.name,
      filePath: fileName
    })
  } catch (err) {
    console.error('[FeedbackUpload] Exception:', err)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server saat mengunggah file: ' + (err.message || '') },
      { status: 500 }
    )
  }
}
