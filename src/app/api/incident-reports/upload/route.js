import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const BUCKET = 'report-assets'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const incidentId = formData.get('incidentId') || 'general'

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'File format not supported. Please upload JPG, PNG, WEBP, or PDF.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 10 MB limit.' },
        { status: 400 }
      )
    }

    const fileExt = file.name.split('.').pop().toLowerCase()
    const fileName = `followup_${incidentId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const filePath = `incidents/${fileName}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('[IncidentUpload] Upload failed:', uploadError)
      return NextResponse.json(
        { success: false, message: `Upload failed: ${uploadError.message}` },
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
    console.error('[IncidentUpload] Server exception:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error during file upload' },
      { status: 500 }
    )
  }
}
