import { NextResponse } from 'next/server'
import { getAgilityInterpretation } from '@/lib/agilityCalculator'
import { getSupabaseAdmin } from '@/lib/agilityServer'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const resultId = parseInt(id, 10)

    if (Number.isNaN(resultId)) {
      return NextResponse.json({ success: false, message: 'ID tidak valid' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Ambil data peserta
    const { data: resultData, error: resultError } = await supabaseAdmin
      .from('agility_results')
      .select('*')
      .eq('id', resultId)
      .single()

    if (resultError || !resultData) {
      return NextResponse.json({ success: false, message: 'Hasil Agility Check tidak ditemukan' }, { status: 404 })
    }

    // 2. Ambil seluruh jawaban peserta + master soal
    const [answersRes, questionsRes] = await Promise.all([
      supabaseAdmin
        .from('agility_answers')
        .select('*')
        .eq('result_id', resultId)
        .order('question_no', { ascending: true }),
      supabaseAdmin
        .from('agility_questions')
        .select('*')
        .order('question_no', { ascending: true })
        .order('id', { ascending: true })
    ])

    if (answersRes.error) {
      return NextResponse.json({ success: false, message: answersRes.error.message }, { status: 500 })
    }
    if (questionsRes.error) {
      return NextResponse.json({ success: false, message: questionsRes.error.message }, { status: 500 })
    }

    const questionById = new Map()
    const questionByNo = new Map()
    for (const q of questionsRes.data || []) {
      questionById.set(q.id, q)
      questionByNo.set(q.question_no, q)
    }

    // Susun rincian berdasarkan jawaban tersimpan (agar tetap akurat meski soal pernah berubah)
    const dimensionMap = new Map()
    const items = (answersRes.data || []).map(ans => {
      const q = questionById.get(ans.question_id) || questionByNo.get(ans.question_no) || {}
      const dimName = q.dimension || 'Umum'

      if (!dimensionMap.has(dimName)) {
        dimensionMap.set(dimName, { dimension: dimName, correct: 0, total: 0 })
      }
      const dEntry = dimensionMap.get(dimName)
      dEntry.total += 1
      if (ans.is_correct) dEntry.correct += 1

      return {
        answer_id: ans.id,
        question_id: ans.question_id,
        question_no: ans.question_no,
        dimension: dimName,
        question_text: q.question_text || `Soal Nomor ${ans.question_no}`,
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '',
        option_d: q.option_d || '',
        correct_answer: q.correct_answer || null,
        selected_option: ans.selected_option,
        is_correct: Boolean(ans.is_correct)
      }
    })

    const maxScore = resultData.max_score || items.length
    const totalScore = resultData.total_score ?? items.filter(i => i.is_correct).length
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    const interpretationDetail = getAgilityInterpretation(totalScore, maxScore)

    const dimensions = Array.from(dimensionMap.values()).map(d => ({
      ...d,
      percentage: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0
    }))

    return NextResponse.json({
      success: true,
      result: resultData,
      items,
      summary: {
        total_score: totalScore,
        max_score: maxScore,
        percentage,
        interpretation: resultData.interpretation || interpretationDetail.label,
        interpretation_detail: interpretationDetail,
        dimensions
      }
    })
  } catch (err) {
    console.error('Unexpected error in GET /api/data/agility-check/[id]:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const resultId = parseInt(id, 10)

    if (Number.isNaN(resultId)) {
      return NextResponse.json({ success: false, message: 'ID tidak valid' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('agility_results')
      .delete()
      .eq('id', resultId)

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Hasil Agility Check berhasil dihapus' })
  } catch (err) {
    console.error('Unexpected error in DELETE /api/data/agility-check/[id]:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
