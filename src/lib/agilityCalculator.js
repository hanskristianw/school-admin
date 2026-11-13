/**
 * Agility Check Scoring & HR Interpretation Engine
 * Yayasan Pendidikan Mayapada School (Chung Chung Christian School)
 *
 * Setiap jawaban yang sesuai dengan kunci memperoleh 1 poin; lainnya 0 poin.
 * Interpretasi resmi HR/Interviewer (skala standar 16 soal):
 * - 13–16 : Pilihan respons situasional kuat
 * - 9–12  : Cukup kuat
 * - 5–8   : Perlu pendalaman
 * - 0–4   : Perlu evaluasi lanjutan
 */

export const AGILITY_INTERPRETATION_BANDS = [
  {
    key: 'strong',
    minRatio: 13 / 16,
    label: 'Pilihan respons situasional kuat',
    rangeLabel16: '13–16',
    tone: 'emerald',
    description: 'Menunjukkan kecenderungan respons situasional yang konsisten adaptif, terstruktur, dan berorientasi solusi.'
  },
  {
    key: 'moderate',
    minRatio: 9 / 16,
    label: 'Cukup kuat',
    rangeLabel16: '9–12',
    tone: 'sky',
    description: 'Memiliki dasar pengambilan keputusan situasional yang memadai, namun masih terdapat beberapa area untuk digali saat wawancara.'
  },
  {
    key: 'explore',
    minRatio: 5 / 16,
    label: 'Perlu pendalaman',
    rangeLabel16: '5–8',
    tone: 'amber',
    description: 'Respons situasional masih bervariasi; disarankan pendalaman lebih lanjut melalui pertanyaan studi kasus saat interview.'
  },
  {
    key: 'evaluate',
    minRatio: 0,
    label: 'Perlu evaluasi lanjutan',
    rangeLabel16: '0–4',
    tone: 'rose',
    description: 'Memerlukan evaluasi lanjutan terkait kesiapan menghadapi situasi kerja dinamis dan pengambilan keputusan.'
  }
]

/**
 * Menentukan kategori interpretasi HR berdasarkan skor dan skor maksimum.
 * Jika maxScore === 16, menggunakan batas bulat persis sesuai panduan PDF (13-16, 9-12, 5-8, 0-4).
 */
export function getAgilityInterpretation(totalScore, maxScore = 16) {
  const score = Number(totalScore) || 0
  const max = Number(maxScore) || 0

  if (max <= 0) {
    return AGILITY_INTERPRETATION_BANDS[3]
  }

  if (max === 16) {
    if (score >= 13) return AGILITY_INTERPRETATION_BANDS[0]
    if (score >= 9) return AGILITY_INTERPRETATION_BANDS[1]
    if (score >= 5) return AGILITY_INTERPRETATION_BANDS[2]
    return AGILITY_INTERPRETATION_BANDS[3]
  }

  const ratio = score / max
  for (const band of AGILITY_INTERPRETATION_BANDS) {
    if (ratio >= band.minRatio) {
      return band
    }
  }
  return AGILITY_INTERPRETATION_BANDS[3]
}

/**
 * Menghitung skor total, rincian per dimensi, dan status benar/salah tiap soal.
 * @param {Array} questions - Array soal master ({ id, question_no, dimension, correct_answer, ... })
 * @param {Object|Array} answersInput - Map { [question_id|question_no]: 'A'..'D' } atau array { question_id, question_no, selected_option }
 */
export function calculateAgilityScore(questions = [], answersInput = {}) {
  const answerByQuestionId = new Map()
  const answerByQuestionNo = new Map()

  if (Array.isArray(answersInput)) {
    for (const row of answersInput) {
      const opt = row?.selected_option ? String(row.selected_option).trim().toUpperCase() : null
      if (row?.question_id != null) answerByQuestionId.set(Number(row.question_id), opt)
      if (row?.question_no != null) answerByQuestionNo.set(Number(row.question_no), opt)
    }
  } else if (answersInput && typeof answersInput === 'object') {
    for (const [k, v] of Object.entries(answersInput)) {
      const opt = v ? String(v).trim().toUpperCase() : null
      const numKey = Number(k)
      if (!Number.isNaN(numKey)) {
        answerByQuestionId.set(numKey, opt)
        answerByQuestionNo.set(numKey, opt)
      }
    }
  }

  const sortedQuestions = [...questions].sort(
    (a, b) => Number(a.question_no) - Number(b.question_no) || Number(a.id) - Number(b.id)
  )

  const dimensionMap = new Map()
  const gradedAnswers = []
  let totalScore = 0

  for (const q of sortedQuestions) {
    const qId = Number(q.id)
    const qNo = Number(q.question_no)
    const rawSelected = answerByQuestionId.has(qId)
      ? answerByQuestionId.get(qId)
      : answerByQuestionNo.get(qNo) ?? null
    const selectedOption = ['A', 'B', 'C', 'D'].includes(rawSelected) ? rawSelected : null
    const correctAnswer = String(q.correct_answer || '').trim().toUpperCase()
    const isCorrect = Boolean(selectedOption && correctAnswer && selectedOption === correctAnswer)

    if (isCorrect) totalScore += 1

    const dimName = (q.dimension || 'Umum').trim()
    if (!dimensionMap.has(dimName)) {
      dimensionMap.set(dimName, { dimension: dimName, correct: 0, total: 0 })
    }
    const dimEntry = dimensionMap.get(dimName)
    dimEntry.total += 1
    if (isCorrect) dimEntry.correct += 1

    gradedAnswers.push({
      question_id: q.id,
      question_no: qNo,
      dimension: dimName,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: correctAnswer,
      selected_option: selectedOption,
      is_correct: isCorrect
    })
  }

  const maxScore = sortedQuestions.length
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const interpretation = getAgilityInterpretation(totalScore, maxScore)

  const dimensions = Array.from(dimensionMap.values()).map(d => ({
    ...d,
    percentage: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0
  }))

  return {
    total_score: totalScore,
    max_score: maxScore,
    percentage,
    interpretation: interpretation.label,
    interpretation_detail: interpretation,
    dimensions,
    gradedAnswers
  }
}
