import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const BUCKET = 'osis-assets'
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

// Helper to ensure bucket exists
async function ensureBucket() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const exists = buckets?.some(b => b.name === BUCKET)
    if (!exists) {
      await supabaseAdmin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE,
        allowedMimeTypes: ALLOWED_TYPES
      })
    }
  } catch (err) {
    console.warn('[OsisUpload] Bucket check warning:', err.message)
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada file foto yang dipilih.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'Format file tidak didukung. Harap upload format JPG, PNG, atau WEBP.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Ukuran foto melebihi batas maksimal 10 MB.' },
        { status: 400 }
      )
    }

    await ensureBucket()

    const fileExt = file.name.split('.').pop().toLowerCase()
    const safeExt = fileExt || 'jpg'
    const fileName = `cand_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${safeExt}`
    const filePath = `candidates/${fileName}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('[OsisUpload] Upload failed:', uploadError)
      return NextResponse.json(
        { success: false, message: `Gagal mengunggah foto: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      bucket: BUCKET,
      path: filePath
    })
  } catch (err) {
    console.error('[OsisUpload] Error:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan pada server saat upload foto' },
      { status: 500 }
    )
  }
}
