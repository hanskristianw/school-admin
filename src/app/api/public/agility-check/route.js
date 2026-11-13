import { NextResponse } from 'next/server'
import { calculateAgilityScore } from '@/lib/agilityCalculator'
import { getSupabaseAdmin, isMissingTableError, verifyAgilityPublicAuth } from '@/lib/agilityServer'

/**
 * GET /api/public/agility-check
 * Mengirim daftar soal aktif Agility Check ke halaman PHP Hostinger TANPA kunci jawaban.
 */
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: questions, error } = await supabaseAdmin
      .from('agility_questions')
      .select('id, question_no, dimension, question_text, option_a, option_b, option_c, option_d')
      .eq('is_active', true)
      .order('question_no', { ascending: true })
      .order('id', { ascending: true })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          tableMissing: isMissingTableError(error),
          message: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: questions || [],
      total_questions: (questions || []).length
    })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

/**
 * POST /api/public/agility-check
 * Menerima submit jawaban pelamar dari PHP Hostinger, menilai terhadap kunci di server, dan menyimpan hasil.
 */
export async function POST(request) {
  try {
    if (!verifyAgilityPublicAuth(request)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid API secret token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { nama, posisi, tanggal, answers } = body || {}

    if (!nama || !String(nama).trim() || !posisi || !String(posisi).trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama dan posisi pelamar wajib diisi.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Ambil master soal aktif beserta kunci jawaban untuk penilaian server-side
    const { data: questions, error: qError } = await supabaseAdmin
      .from('agility_questions')
      .select('id, question_no, dimension, question_text, option_a, option_b, option_c, option_d, correct_answer')
      .eq('is_active', true)
      .order('question_no', { ascending: true })
      .order('id', { ascending: true })

    if (qError) {
      return NextResponse.json(
        { success: false, message: 'Gagal memuat bank soal Agility Check: ' + qError.message },
        { status: 500 }
      )
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Belum ada soal aktif Agility Check di sistem.' },
        { status: 400 }
      )
    }

    // 2. Hitung skor & interpretasi di server (bukan dari client)
    const scoring = calculateAgilityScore(questions, answers || {})

    const missingCount = scoring.gradedAnswers.filter(a => !a.selected_option).length
    if (missingCount > 0) {
      return NextResponse.json(
        { success: false, message: `Masih terdapat ${missingCount} soal yang belum dijawab.` },
        { status: 400 }
      )
    }

    const testDate = tanggal && String(tanggal).trim()
      ? String(tanggal).trim()
      : new Date().toISOString().split('T')[0]

    // 3. Simpan header hasil peserta
    const { data: resultRow, error: resError } = await supabaseAdmin
      .from('agility_results')
      .insert([
        {
          nama: String(nama).trim(),
          posisi: String(posisi).trim(),
          tanggal: testDate,
          total_score: scoring.total_score,
          max_score: scoring.max_score,
          interpretation: scoring.interpretation
        }
      ])
      .select('id')
      .single()

    if (resError || !resultRow) {
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan hasil peserta: ' + (resError?.message || 'Unknown error') },
        { status: 500 }
      )
    }

    // 4. Simpan rincian seluruh jawaban dalam 1 batch insert
    const answerRows = scoring.gradedAnswers.map(item => ({
      result_id: resultRow.id,
      question_id: item.question_id,
      question_no: item.question_no,
      selected_option: item.selected_option,
      is_correct: item.is_correct
    }))

    const { error: ansError } = await supabaseAdmin
      .from('agility_answers')
      .insert(answerRows)

    if (ansError) {
      await supabaseAdmin.from('agility_results').delete().eq('id', resultRow.id)
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan rincian jawaban: ' + ansError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Jawaban Agility Check berhasil disimpan!',
      result_id: resultRow.id
    })
  } catch (err) {
    console.error('Error in POST /api/public/agility-check:', err)
    return NextResponse.json(
      { success: false, message: 'Internal Server Error: ' + err.message },
      { status: 500 }
    )
  }
}
