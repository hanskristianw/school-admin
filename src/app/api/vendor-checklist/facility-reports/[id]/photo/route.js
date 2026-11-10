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
    const type = searchParams.get('type') || 'issue' // 'issue' | 'resolution'

    const { data: item, error } = await supabaseAdmin
      .from('room_facility_reports')
      .select('id, photo_file, resolution_photo_file, hosting_url')
      .eq('id', id)
      .maybeSingle()

    if (error || !item) {
      return NextResponse.json(
        { success: false, message: 'Data laporan fasilitas tidak ditemukan' },
        { status: 404 }
      )
    }

    const targetFile = (type === 'resolution') ? item.resolution_photo_file : item.photo_file

    if (!targetFile) {
      return NextResponse.json(
        { success: false, message: `Foto jenis "${type}" tidak ditemukan` },
        { status: 404 }
      )
    }

    // Jika targetFile sudah berupa URL publik langsung (misal Supabase Storage)
    if (targetFile.startsWith('http://') || targetFile.startsWith('https://')) {
      const directRes = await fetch(targetFile)
      if (!directRes.ok) {
        return NextResponse.json(
          { success: false, message: `Gagal mengambil gambar (${directRes.status})` },
          { status: directRes.status }
        )
      }
      const ct = directRes.headers.get('content-type') || 'image/jpeg'
      const ab = await directRes.arrayBuffer()
      return new NextResponse(Buffer.from(ab), {
        status: 200,
        headers: {
          'Content-Type': ct,
          'Cache-Control': 'private, max-age=3600'
        }
      })
    }

    const hostingUrl = item.hosting_url || 'https://ccs.sch.id/reportfacility'
    const cleanHostingUrl = hostingUrl.replace(/\/(index|report_facility)\.php$/i, '').replace(/\/$/, '')
    const candidateUrls = [
      `${cleanHostingUrl}/index.php?action=view_photo&file=${encodeURIComponent(targetFile)}&token=${encodeURIComponent(EXPECTED_SECRET)}`,
      `https://ccs.sch.id/reportfacility/index.php?action=view_photo&file=${encodeURIComponent(targetFile)}&token=${encodeURIComponent(EXPECTED_SECRET)}`,
      `https://ccs.sch.id/checklist/index.php?action=view_photo&file=${encodeURIComponent(targetFile)}&token=${encodeURIComponent(EXPECTED_SECRET)}`,
      `https://ccs.sch.id/report_facility/index.php?action=view_photo&file=${encodeURIComponent(targetFile)}&token=${encodeURIComponent(EXPECTED_SECRET)}`
    ]

    let res = null
    for (const url of [...new Set(candidateUrls)]) {
      try {
        const attempt = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'SchoolAdmin-VendorProxy/1.0' }
        })
        if (attempt.ok) {
          res = attempt
          break
        }
      } catch (e) {}
    }

    if (!res || !res.ok) {
      return NextResponse.json(
        { success: false, message: 'Gagal mengambil gambar dari hosting' },
        { status: 404 }
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
    console.error('[FacilityReport Photo Proxy] Error:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
