/**
 * DISC Psychometric Scoring Engine
 * Yayasan Pendidikan Mayapada School (Chung Chung Christian School)
 *
 * Menerjemahkan pilihan jawaban peserta pada 24 nomor soal ke dalam:
 * 1. Skor Mentah (Raw Scores: Most, Least, Difference) untuk D, I, S, C
 * 2. Pemetaan Nomor Garis (Line Numbers 1 - 28) berdasarkan Norma Tabel
 * 3. Segmen Profil (Pola 1 - 6)
 * 4. Dua Dimensi Kepribadian Tertinggi (Top Two DISC Types)
 */

export const NORMA_TABLE = {
  MOST: {
    D: {
      20: 28, 19: 27, 18: 27, 17: 27, 16: 26, 15: 25, 14: 24, 12: 23, 11: 22, 10: 21, 9: 20,
      8: 17, 7: 15, 6: 13, 5: 11, 4: 10, 3: 9, 2: 7, 1: 2, 0: 1
    },
    I: {
      17: 28, 16: 27, 15: 27, 14: 27, 13: 27, 12: 27, 11: 27, 10: 26, 9: 25, 8: 24, 7: 23,
      6: 19, 5: 17, 4: 14, 3: 11, 2: 8, 1: 5, 0: 2
    },
    S: {
      16: 28, 12: 27, 11: 25, 10: 24, 9: 21, 8: 20, 7: 19,
      6: 16, 5: 15, 4: 13, 3: 12, 2: 8, 1: 7, 0: 4
    },
    C: {
      15: 28, 9: 27, 8: 25, 7: 23,
      6: 21, 5: 19, 4: 15, 3: 12, 2: 8, 1: 7, 0: 6
    }
  },
  LEAST: {
    D: {
      0: 28, 1: 25, 2: 21, 3: 17, 4: 16,
      5: 14, 6: 13, 7: 12, 8: 11, 9: 10, 10: 9, 11: 8, 12: 7,
      13: 5, 14: 4, 15: 3, 16: 2, 21: 1
    },
    I: {
      0: 27, 1: 25, 2: 21, 3: 17, 4: 14,
      5: 13, 6: 10, 7: 8, 8: 5, 9: 4, 10: 3, 11: 2, 19: 1
    },
    S: {
      0: 27, 1: 26, 2: 25, 3: 23, 4: 19,
      5: 16, 6: 13, 7: 12, 8: 10, 9: 8, 10: 7, 11: 4, 12: 3, 13: 2, 19: 1
    },
    C: {
      0: 27, 1: 26, 2: 25, 3: 23, 4: 20,
      5: 16, 6: 15, 7: 13, 8: 11, 9: 9, 10: 7, 11: 4, 12: 3, 13: 2, 14: 1
    }
  },
  DIFF: {
    D: {
      20: 28, 16: 27, 15: 26, 14: 25, 13: 24, 12: 23, 11: 22, 10: 21, 9: 20,
      8: 19, 7: 18, 6: 17, 3: 16, 1: 15, 0: 13, '-2': 12, '-3': 11, '-4': 10,
      '-6': 9, '-7': 8, '-8': 7, '-9': 6, '-10': 5, '-11': 4, '-13': 3, '-14': 2, '-21': 1
    },
    I: {
      17: 28, 9: 27, 8: 26, 7: 25, 6: 23, 5: 21, 4: 20,
      3: 19, 2: 18, 1: 17, 0: 16, '-1': 13, '-2': 12, '-3': 11, '-4': 10,
      '-5': 9, '-6': 8, '-7': 7, '-8': 5, '-9': 4, '-10': 3, '-19': 1
    },
    S: {
      16: 28, 11: 27, 10: 26, 9: 25, 8: 24, 7: 23, 6: 22, 5: 21, 4: 20,
      3: 19, 2: 18, 1: 17, 0: 16, '-1': 14, '-2': 13, '-3': 12, '-4': 11, '-5': 10,
      '-6': 8, '-7': 7, '-8': 6, '-9': 5, '-10': 4, '-11': 3, '-12': 2, '-19': 1
    },
    C: {
      15: 28, 7: 27, 6: 26, 5: 25, 4: 23, 3: 21, 2: 20,
      1: 19, 0: 18, '-1': 17, '-2': 15, '-3': 13, '-4': 12, '-5': 11, '-6': 10,
      '-7': 8, '-8': 7, '-9': 6, '-10': 5, '-11': 4, '-12': 3, '-15': 2
    }
  }
}

const SEGMENT_RULES = {
  MOST: {
    D: [12, 9, 7, 5, 2, 0],
    I: [7, 6, 5, 3, 2, 0],
    S: [10, 7, 5, 3, 1, 0],
    C: [7, 5, 4, 3, 1, 0]
  },
  LEAST: {
    // Inverted logic: makin kecil angkanya, makin tinggi segmennya (segmen 6)
    D: [1, 2, 4, 8, 12, 24],
    I: [1, 2, 3, 5, 7, 24],
    S: [3, 4, 5, 7, 10, 24],
    C: [3, 4, 6, 8, 10, 24]
  },
  DIFF: {
    D: [12, 8, 1, -3, -8, -25],
    I: [6, 3, 0, -3, -7, -25],
    S: [7, 3, 0, -4, -7, -25],
    C: [4, 1, -2, -5, -8, -25]
  }
}

/**
 * Mencari nomor segmen (1 - 6) berdasarkan aturan DISC
 */
export function getSegment(val, type, graph) {
  const range = SEGMENT_RULES[graph]?.[type]
  if (!range) return 1

  if (graph === 'LEAST') {
    if (val <= range[0]) return 6
    if (val <= range[1]) return 5
    if (val <= range[2]) return 4
    if (val <= range[3]) return 3
    if (val <= range[4]) return 2
    return 1
  } else {
    if (val >= range[0]) return 6
    if (val >= range[1]) return 5
    if (val >= range[2]) return 4
    if (val >= range[3]) return 3
    if (val >= range[4]) return 2
    return 1
  }
}

/**
 * Menghitung nomor garis (1 - 28) berdasarkan norma tabel DISC
 */
export function getLineNumber(graphType, discType, rawVal, db = NORMA_TABLE) {
  const graphNorm = db[graphType]?.[discType]
  if (graphNorm && graphNorm[rawVal] !== undefined) {
    return graphNorm[rawVal]
  }

  // Jika nilai berada di antara kunci norma, cari nilai kunci terdekat
  if (graphNorm) {
    const keys = Object.keys(graphNorm).map(Number).sort((a, b) => a - b)
    if (keys.length > 0) {
      if (rawVal <= keys[0]) return graphNorm[keys[0]]
      if (rawVal >= keys[keys.length - 1]) return graphNorm[keys[keys.length - 1]]
      // Cari nilai terdekat
      let closest = keys[0]
      let minDiff = Math.abs(rawVal - keys[0])
      for (const k of keys) {
        const diff = Math.abs(rawVal - k)
        if (diff < minDiff) {
          minDiff = diff
          closest = k
        }
      }
      return graphNorm[closest]
    }
  }

  // Fallback matematis jika tidak ditemukan
  if (graphType === 'LEAST') return Math.max(1, Math.min(28, 28 - rawVal))
  return Math.max(1, Math.min(28, rawVal + 5))
}

/**
 * Mencari 2 dimensi DISC tertinggi berdasarkan urutan Line Number
 */
export function getTopTwo(rawArray, graphType, db = NORMA_TABLE) {
  const listLines = {}

  for (const [type, val] of Object.entries(rawArray)) {
    listLines[type] = getLineNumber(graphType, type, val, db)
  }

  // Sort descending berdasarkan nomor garis
  const sortedKeys = Object.keys(listLines).sort((a, b) => listLines[b] - listLines[a])
  const top1 = sortedKeys[0] || 'D'
  const top2 = sortedKeys[1] || 'I'

  return {
    code: `${top1}${top2}`,
    top1,
    top2,
    line1: listLines[top1],
    line2: listLines[top2],
    detail: `${top1} (Line ${listLines[top1]}) & ${top2} (Line ${listLines[top2]})`,
    full_data: listLines
  }
}

/**
 * Fungsi kalkulasi lengkap dari raw data jawaban psikotes
 *
 * @param {Array} formattedItems - Array data soal & jawaban yang sudah digabungkan
 * Masing-masing item: { question_id, p_question_id, k_question_id, p_icon, k_icon, ... }
 */
export function calculateDiscResult(formattedItems) {
  let p1 = 0, p2 = 0, p3 = 0, p4 = 0 // D, I, S, C untuk MOST (P)
  let k1 = 0, k2 = 0, k3 = 0, k4 = 0 // D, I, S, C untuk LEAST (K)

  formattedItems.forEach(item => {
    // Hitung pilihan P (Most)
    if (item.question_id === item.p_question_id) {
      if (item.p_icon === 'Z') p1++
      else if (item.p_icon === '*') p2++
      else if (item.p_icon === '▲') p3++
      else if (item.p_icon === '<<') p4++
    }

    // Hitung pilihan K (Least)
    if (item.question_id === item.k_question_id) {
      if (item.k_icon === 'Z') k1++
      else if (item.k_icon === '*') k2++
      else if (item.k_icon === '▲') k3++
      else if (item.k_icon === '<<') k4++
    }
  })

  const l1 = p1 - k1 // D
  const l2 = p2 - k2 // I
  const l3 = p3 - k3 // S
  const l4 = p4 - k4 // C

  const pRaw = { D: p1, I: p2, S: p3, C: p4 }
  const kRaw = { D: k1, I: k2, S: k3, C: k4 }
  const lRaw = { D: l1, I: l2, S: l3, C: l4 }

  const topMost = getTopTwo(pRaw, 'MOST', NORMA_TABLE)
  const topLeast = getTopTwo(kRaw, 'LEAST', NORMA_TABLE)
  const topDiff = getTopTwo(lRaw, 'DIFF', NORMA_TABLE)

  const m_d = getSegment(p1, 'D', 'MOST')
  const m_i = getSegment(p2, 'I', 'MOST')
  const m_s = getSegment(p3, 'S', 'MOST')
  const m_c = getSegment(p4, 'C', 'MOST')

  const l_d = getSegment(k1, 'D', 'LEAST')
  const l_i = getSegment(k2, 'I', 'LEAST')
  const l_s = getSegment(k3, 'S', 'LEAST')
  const l_c = getSegment(k4, 'C', 'LEAST')

  const d_d = getSegment(l1, 'D', 'DIFF')
  const d_i = getSegment(l2, 'I', 'DIFF')
  const d_s = getSegment(l3, 'S', 'DIFF')
  const d_c = getSegment(l4, 'C', 'DIFF')

  return {
    raw: {
      most: pRaw,
      least: kRaw,
      diff: lRaw
    },
    segments: {
      most: { D: m_d, I: m_i, S: m_s, C: m_c },
      least: { D: l_d, I: l_i, S: l_s, C: l_c },
      diff: { D: d_d, I: d_i, S: d_s, C: d_c }
    },
    patterns: {
      most: `${m_d} ${m_i} ${m_s} ${m_c}`,
      least: `${l_d} ${l_i} ${l_s} ${l_c}`,
      diff: `${d_d} ${d_i} ${d_s} ${d_c}`
    },
    top_two: {
      most: topMost,
      least: topLeast,
      diff: topDiff
    }
  }
}
