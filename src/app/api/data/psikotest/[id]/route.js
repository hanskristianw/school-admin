import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDiscResult } from '@/lib/discCalculator'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const resultId = parseInt(id, 10)

    if (isNaN(resultId)) {
      return NextResponse.json({ success: false, message: 'ID tidak valid' }, { status: 400 })
    }

    // 1. Ambil data peserta
    const { data: resultData, error: resultError } = await supabaseAdmin
      .from('psychotest_results')
      .select('*')
      .eq('id', resultId)
      .single()

    if (resultError || !resultData) {
      return NextResponse.json({ success: false, message: 'Hasil psikotes tidak ditemukan' }, { status: 404 })
    }

    // 2. Ambil data jawaban peserta
    const { data: answersData, error: answersError } = await supabaseAdmin
      .from('psychotest_answers')
      .select('*')
      .eq('result_id', resultId)
      .order('group_no', { ascending: true })

    if (answersError) {
      console.error('Error fetching psychotest_answers:', answersError)
      return NextResponse.json({ success: false, message: answersError.message }, { status: 500 })
    }

    // Buat map group_no -> answer row
    const answersMap = {}
    ;(answersData || []).forEach(ans => {
      answersMap[ans.group_no] = ans
    })

    // 3. Ambil seluruh 96 master soal DISC
    const { data: questionsData, error: qError } = await supabaseAdmin
      .from('psychotest_questions')
      .select('*')
      .order('group_no', { ascending: true })
      .order('id', { ascending: true })

    if (qError) {
      console.error('Error fetching psychotest_questions:', qError)
      return NextResponse.json({ success: false, message: qError.message }, { status: 500 })
    }

    // 4. Susun daftar 96 item dengan penanda pilihan user
    const formattedItems = (questionsData || []).map(q => {
      const userAns = answersMap[q.group_no] || {}
      return {
        question_id: q.id,
        group_no: q.group_no,
        statement_text: q.statement_text,
        p_icon: q.p_icon,
        k_icon: q.k_icon,
        p_mean: q.p_mean,
        k_mean: q.k_mean,
        p_question_id: userAns.p_question_id || null,
        k_question_id: userAns.k_question_id || null,
        is_p_selected: q.id === userAns.p_question_id,
        is_k_selected: q.id === userAns.k_question_id
      }
    })

    // 5. Hitung kalkulasi psikotes DISC
    const discCalculation = calculateDiscResult(formattedItems)

    return NextResponse.json({
      success: true,
      result: resultData,
      items: formattedItems,
      calculation: discCalculation
    })
  } catch (err) {
    console.error('Unexpected error in GET /api/data/psikotest/[id]:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const resultId = parseInt(id, 10)

    if (isNaN(resultId)) {
      return NextResponse.json({ success: false, message: 'ID tidak valid' }, { status: 400 })
    }

    // Hapus dari psychotest_results (psychotest_answers akan terhapus via CASCADE)
    const { error } = await supabaseAdmin
      .from('psychotest_results')
      .delete()
      .eq('id', resultId)

    if (error) {
      console.error('Error deleting psychotest_results:', error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Hasil psikotes berhasil dihapus' })
  } catch (err) {
    console.error('Unexpected error in DELETE /api/data/psikotest/[id]:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
