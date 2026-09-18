import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXPECTED_SECRET = process.env.ADMISSION_SECRET_KEY || process.env.COURT_RENTAL_SECRET_KEY

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const { data: application, error } = await supabaseAdmin
      .from('student_applications')
      .select('application_id, application_number, payment_proof_file, hosting_url')
      .eq('application_id', id)
      .single()

    if (error || !application || !application.payment_proof_file) {
      return NextResponse.json(
        { success: false, message: 'Bukti transfer tidak ditemukan' },
        { status: 404 }
      )
    }

    const hostingUrl = application.hosting_url || 'https://ccs.sch.id/registrasi'
    const cleanHostingUrl = hostingUrl.replace(/\/index\.php$/i, '').replace(/\/$/, '')
    const targetUrl = `${cleanHostingUrl}/index.php?action=view_proof&file=${encodeURIComponent(application.payment_proof_file)}&token=${encodeURIComponent(EXPECTED_SECRET)}`

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'SchoolAdmin-AdmissionProxy/1.0'
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
        'Content-Disposition': `inline; filename="${application.payment_proof_file}"`
      }
    })
  } catch (err) {
    console.error('[Admission Proof Proxy] Error:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
