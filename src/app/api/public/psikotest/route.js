import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXPECTED_SECRET = process.env.PSYCHOTEST_SECRET_KEY || process.env.COURT_RENTAL_SECRET_KEY || 'ccs_court_auth_2026_x7k9p2m4'

function verifyAuth(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return token && (token === EXPECTED_SECRET)
}

// GET: Ambil daftar master pertanyaan DISC (bisa digunakan oleh cPanel)
export async function GET(request) {
  try {
    const { data: questions, error } = await supabaseAdmin
      .from('psychotest_questions')
      .select('*')
      .order('group_no', { ascending: true })
      .order('id', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    // Kelompokkan per group_no (1-24)
    const grouped = {}
    questions.forEach(q => {
      const g = q.group_no
      if (!grouped[g]) grouped[g] = []
      grouped[g].push({
        id: q.id,
        text: q.statement_text,
        p_icon: q.p_icon,
        k_icon: q.k_icon,
        p_mean: q.p_mean,
        k_mean: q.k_mean
      })
    })

    return NextResponse.json({
      success: true,
      data: grouped,
      total_questions: questions.length
    })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST: Terima submit pengerjaan tes psikotes dari cPanel PHP
export async function POST(request) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid API secret token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { nama, posisi, tanggal, p, k } = body

    if (!nama || !posisi) {
      return NextResponse.json(
        { success: false, message: 'Nama dan posisi pelamar wajib diisi.' },
        { status: 400 }
      )
    }

    // 1. Simpan data peserta ke psychotest_results
    const testDate = tanggal || new Date().toISOString().split('T')[0]
    const { data: resultData, error: resultError } = await supabaseAdmin
      .from('psychotest_results')
      .insert([
        {
          nama: String(nama).trim(),
          posisi: String(posisi).trim(),
          tanggal: testDate
        }
      ])
      .select('id')
      .single()

    if (resultError) {
      console.error('Error inserting psychotest_results:', resultError)
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan data peserta: ' + resultError.message },
        { status: 500 }
      )
    }

    const resultId = resultData.id

    // 2. Ambil referensi id pertanyaan per grup
    const { data: questions, error: qError } = await supabaseAdmin
      .from('psychotest_questions')
      .select('id, group_no')
      .order('group_no', { ascending: true })
      .order('id', { ascending: true })

    if (qError) {
      console.error('Error fetching questions for mapping:', qError)
      return NextResponse.json(
        { success: false, message: 'Gagal memuat daftar soal: ' + qError.message },
        { status: 500 }
      )
    }

    const groupQuestionIds = {}
    questions.forEach(q => {
      if (!groupQuestionIds[q.group_no]) {
        groupQuestionIds[q.group_no] = []
      }
      groupQuestionIds[q.group_no].push(q.id)
    })

    // 3. Susun jawaban peserta untuk psychotest_answers
    const answerRows = []
    const pChoices = p || {}
    const kChoices = k || {}

    for (let groupNo = 1; groupNo <= 24; groupNo++) {
      const qIds = groupQuestionIds[groupNo] || []
      const pIdx = pChoices[groupNo] !== undefined && pChoices[groupNo] !== null && pChoices[groupNo] !== ''
        ? Number(pChoices[groupNo])
        : null
      const kIdx = kChoices[groupNo] !== undefined && kChoices[groupNo] !== null && kChoices[groupNo] !== ''
        ? Number(kChoices[groupNo])
        : null

      const pQuestionId = (pIdx !== null && qIds[pIdx] !== undefined) ? qIds[pIdx] : null
      const kQuestionId = (kIdx !== null && qIds[kIdx] !== undefined) ? qIds[kIdx] : null

      answerRows.push({
        result_id: resultId,
        group_no: groupNo,
        p_question_id: pQuestionId,
        k_question_id: kQuestionId
      })
    }

    const { error: answersError } = await supabaseAdmin
      .from('psychotest_answers')
      .insert(answerRows)

    if (answersError) {
      console.error('Error inserting psychotest_answers:', answersError)
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan rincian jawaban: ' + answersError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Hasil psikotes berhasil disimpan!',
      result_id: resultId
    })
  } catch (err) {
    console.error('API Psikotest unexpected error:', err)
    return NextResponse.json(
      { success: false, message: 'Internal Server Error: ' + err.message },
      { status: 500 }
    )
  }
}
