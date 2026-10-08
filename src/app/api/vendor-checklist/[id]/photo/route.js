import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXPECTED_SECRET = process.env.COURT_RENTAL_SECRET_KEY || process.env.VENDOR_CHECKLIST_SECRET_KEY || 'ccs_court_auth_2026_x7k9p2m4'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'after' // 'before' | 'after' | 'revision'

    const { data: item, error } = await supabaseAdmin
      .from('vendor_room_checklists')
      .select('id, image_before_file, image_after_file, image_revision_file, hosting_url')
      .eq('id', id)
      .maybeSingle()

    if (error || !item) {
      return NextResponse.json(
        { success: false, message: 'Data checklist tidak ditemukan' },
        { status: 404 }
      )
    }

    let targetFile = null
    if (type === 'before') targetFile = item.image_before_file
    else if (type === 'revision') targetFile = item.image_revision_file || item.image_after_file
    else targetFile = item.image_after_file

    if (!targetFile) {
      return NextResponse.json(
        { success: false, message: `Foto jenis "${type}" tidak ditemukan` },
        { status: 404 }
      )
    }

    const hostingUrl = item.hosting_url || 'https://ccs.sch.id/checklist'
    const cleanHostingUrl = hostingUrl.replace(/\/index\.php$/i, '').replace(/\/$/, '')
    const targetUrl = `${cleanHostingUrl}/index.php?action=view_photo&file=${encodeURIComponent(targetFile)}&token=${encodeURIComponent(EXPECTED_SECRET)}`

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'SchoolAdmin-VendorProxy/1.0'
      }
    })

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Gagal mengambil gambar dari hosting (${res.status})` },
        { status: res.status }
      )
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await res.arrayBuffer()

    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${targetFile}"`
      }
    })

  } catch (err) {
    console.error('[VendorChecklist Photo Proxy] Error:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
