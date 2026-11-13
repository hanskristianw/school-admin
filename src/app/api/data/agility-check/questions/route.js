import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isMissingTableError } from '@/lib/agilityServer'

const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D'])

function validateQuestionPayload(body) {
  const question_no = parseInt(body?.question_no, 10)
  const dimension = String(body?.dimension || 'Dimensi 1').trim()
  const question_text = String(body?.question_text || '').trim()
  const option_a = String(body?.option_a || '').trim()
  const option_b = String(body?.option_b || '').trim()
  const option_c = String(body?.option_c || '').trim()
  const option_d = String(body?.option_d || '').trim()
  const correct_answer = String(body?.correct_answer || '').trim().toUpperCase()
  const is_active = body?.is_active !== undefined ? Boolean(body.is_active) : true

  if (Number.isNaN(question_no) || question_no < 1) {
    return { error: 'Nomor soal harus berupa angka >= 1.' }
  }
  if (!question_text) {
    return { error: 'Teks pertanyaan wajib diisi.' }
  }
  if (!option_a || !option_b || !option_c || !option_d) {
    return { error: 'Pilihan A, B, C, dan D semuanya wajib diisi.' }
  }
  if (!VALID_OPTIONS.has(correct_answer)) {
    return { error: 'Kunci jawaban harus salah satu dari A, B, C, atau D.' }
  }

  return {
    payload: {
      question_no,
      dimension: dimension || 'Dimensi 1',
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      is_active
    }
  }
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('agility_questions')
      .select('*')
      .order('question_no', { ascending: true })
      .order('id', { ascending: true })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          tableMissing: isMissingTableError(error),
          message: error.message
        },
        { status: isMissingTableError(error) ? 200 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { payload, error: valError } = validateQuestionPayload(body)
    if (valError) {
      return NextResponse.json({ success: false, message: valError }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('agility_questions')
      .insert([payload])
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const id = parseInt(body?.id, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, message: 'ID soal tidak valid.' }, { status: 400 })
    }

    // Izinkan toggle is_active cepat bila hanya mengirim { id, is_active }
    const isToggleOnly =
      body.question_text === undefined &&
      body.is_active !== undefined &&
      body.correct_answer === undefined

    const supabaseAdmin = getSupabaseAdmin()

    if (isToggleOnly) {
      const { data, error } = await supabaseAdmin
        .from('agility_questions')
        .update({ is_active: Boolean(body.is_active), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, data })
    }

    const { payload, error: valError } = validateQuestionPayload(body)
    if (valError) {
      return NextResponse.json({ success: false, message: valError }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('agility_questions')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    let idParam = searchParams.get('id')
    if (!idParam) {
      try {
        const body = await request.json()
        idParam = body?.id
      } catch {}
    }

    const id = parseInt(idParam, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, message: 'ID soal tidak valid.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('agility_questions')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Soal Agility Check berhasil dihapus.' })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
