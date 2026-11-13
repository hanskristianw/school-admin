/**
 * Helpers for resolving IB MYP objective strands, semester, and MYP year rules.
 *
 * IB MYP publishes standard objective benchmarks for Year 1, Year 3, and Year 5.
 * Units stored with intermediate MYP years (e.g. MYP 2 or MYP 4) or subjects
 * with a single year level in the `strands` table (e.g. Year 1 only) would get
 * zero rows when queried strictly with `.eq('year_level', topicYear)`.
 *
 * School Unit -> Semester & MYP Year mapping:
 * - Unit 1 & 2 => Semester 1
 * - Unit 3 & 4 => Semester 2
 * - Grade 7 (Unit 1-4) => MYP 1
 * - Grade 8 (Unit 1-2) => MYP 1, (Unit 3-4) => MYP 3
 * - Grade 9 (Unit 1-2) => MYP 3, (Unit 3-4) => MYP 5
 * - Grade 10 (all units) => MYP 5
 */

export function deriveSemesterFromUnit(unitNumber) {
  const u = Number(unitNumber)
  if (u === 1 || u === 2) return '1'
  if (u === 3 || u === 4) return '2'
  return ''
}

export function deriveMypYearFromGradeAndUnit(kelasName, unitNumber) {
  const kname = String(kelasName || '')
  const match = kname.match(/\b(10|7|8|9)\b/) || kname.match(/(10|7|8|9)/)
  if (!match) return ''
  const grade = Number(match[1])
  const u = Number(unitNumber)

  if (grade === 7) return '1'
  if (grade === 10) return '5'
  if (grade === 8) {
    if (u === 1 || u === 2) return '1'
    if (u === 3 || u === 4) return '3'
    return ''
  }
  if (grade === 9) {
    if (u === 1 || u === 2) return '3'
    if (u === 3 || u === 4) return '5'
    return ''
  }
  return ''
}

const YEAR_FALLBACK_ORDER = {
  1: [1, 3, 5],
  2: [3, 1, 5],
  3: [3, 1, 5],
  4: [5, 3, 1],
  5: [5, 3, 1],
}

const ROMAN_ORDER = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
}

function compareStrandLabel(a, b) {
  const la = String(a?.label || '').trim().toLowerCase()
  const lb = String(b?.label || '').trim().toLowerCase()
  const ra = ROMAN_ORDER[la]
  const rb = ROMAN_ORDER[lb]
  if (ra !== undefined && rb !== undefined) return ra - rb
  return la.localeCompare(lb)
}

/**
 * Given all candidate `strands` rows for the requested criteria, picks a single
 * consistent `year_level` per criterion using `targetYear` with MYP fallback.
 *
 * @param {Array} allStrands
 * @param {Array} criteriaIds
 * @param {number|string} targetYear
 * @returns {Array}
 */
export function resolveStrandsForCriteria(allStrands = [], criteriaIds = [], targetYear) {
  if (!Array.isArray(criteriaIds) || criteriaIds.length === 0) return []

  const numericYear = Number(targetYear) || 1
  const priority = YEAR_FALLBACK_ORDER[numericYear] || [numericYear, 3, 1, 5]
  const result = []

  for (const cid of criteriaIds) {
    const criterionStrands = (allStrands || []).filter(
      s => String(s.criterion_id) === String(cid)
    )
    if (criterionStrands.length === 0) continue

    let matched = []
    for (const candidateYear of priority) {
      matched = criterionStrands.filter(s => Number(s.year_level) === candidateYear)
      if (matched.length > 0) break
    }

    if (matched.length === 0) {
      // Pick only one available year_level rather than mixing multiple years together
      const fallbackYear = criterionStrands[0].year_level
      matched = criterionStrands.filter(s => s.year_level === fallbackYear)
    }

    matched.sort(compareStrandLabel)
    result.push(...matched)
  }

  return result
}
