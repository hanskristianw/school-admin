/**
 * Shared constants, pastel palette definitions, icon options,
 * and formatting helpers for Teachers & Staff Recognition (Staff Awards).
 */

export const AWARD_TONE_PRESETS = [
  {
    value: 'amber',
    label: 'Warm Amber',
    bg: '#FBF3DB',
    text: '#956400',
    border: '#EFE2BA',
    darkBg: '#2C2515',
    darkText: '#E8C56E',
    darkBorder: '#453A1E'
  },
  {
    value: 'rose',
    label: 'Soft Rose',
    bg: '#FDEBEC',
    text: '#9F2F2D',
    border: '#F5D0D2',
    darkBg: '#2C191A',
    darkText: '#ECA3A1',
    darkBorder: '#4A2627'
  },
  {
    value: 'green',
    label: 'Sage Green',
    bg: '#EDF3EC',
    text: '#346538',
    border: '#D4E4D2',
    darkBg: '#19291B',
    darkText: '#9BD09F',
    darkBorder: '#29422C'
  },
  {
    value: 'blue',
    label: 'Powder Blue',
    bg: '#E1F3FE',
    text: '#1F6C9F',
    border: '#C7E5F8',
    darkBg: '#162530',
    darkText: '#8CC8EE',
    darkBorder: '#243C4F'
  },
  {
    value: 'stone',
    label: 'Warm Stone',
    bg: '#F3F2EE',
    text: '#575652',
    border: '#E4E2DC',
    darkBg: '#242421',
    darkText: '#C5C3BC',
    darkBorder: '#383833'
  }
]

const TONE_MAP = new Map(AWARD_TONE_PRESETS.map(p => [p.value, p]))

/**
 * Resolves either a new pastel tone key ('amber', 'rose', 'green', 'blue', 'stone')
 * or a legacy gradient descriptor into an ultra-flat Minimalist UI pastel palette.
 * @param {string} colorKey
 * @returns {object}
 */
export function resolveAwardTone(colorKey) {
  const key = String(colorKey || '').trim().toLowerCase()
  if (TONE_MAP.has(key)) return TONE_MAP.get(key)

  if (key.includes('pink') || key.includes('rose') || key.includes('red')) {
    return TONE_MAP.get('rose')
  }
  if (key.includes('emerald') || key.includes('teal') || key.includes('green')) {
    return TONE_MAP.get('green')
  }
  if (key.includes('blue') || key.includes('indigo') || key.includes('cyan') || key.includes('violet') || key.includes('purple')) {
    return TONE_MAP.get('blue')
  }
  if (key.includes('slate') || key.includes('zinc') || key.includes('stone') || key.includes('gray')) {
    return TONE_MAP.get('stone')
  }
  return TONE_MAP.get('amber')
}

export const DEFAULT_AWARD_CATEGORIES = [
  {
    sort_order: 1,
    title: 'The Resilience Award',
    description:
      'For someone who demonstrates perseverance, adaptability, and a positive attitude when facing challenges.',
    icon: 'award',
    color_gradient: 'amber'
  },
  {
    sort_order: 2,
    title: 'The Parent Champion Award',
    description:
      'For the teacher or staff member who builds strong, supportive, and constructive partnerships with parents through effective communication, active listening, empathy, and a shared commitment to student growth and well-being.',
    icon: 'sparkles',
    color_gradient: 'rose'
  },
  {
    sort_order: 3,
    title: 'The Sunshine Award',
    description:
      'For a teacher or staff member who radiates positivity, warmth, and uplifting energy to everyone around them.',
    icon: 'sun',
    color_gradient: 'amber'
  },
  {
    sort_order: 4,
    title: 'The Problem-Solver Award',
    description:
      'For the person who can quickly find solutions to challenges—big or small—with calmness and clarity.',
    icon: 'lightbulb',
    color_gradient: 'green'
  },
  {
    sort_order: 5,
    title: 'The Above & Beyond Award',
    description:
      'For an individual who consistently goes the extra mile and offers exceptional dedication in their work.',
    icon: 'rocket',
    color_gradient: 'blue'
  },
  {
    sort_order: 6,
    title: 'The Most Compassionate Staff Award',
    description:
      'For someone who shows extraordinary kindness, empathy, and care toward students, colleagues, and the school community.',
    icon: 'heart',
    color_gradient: 'rose'
  },
  {
    sort_order: 7,
    title: 'The Creative Spark Award',
    description:
      'For a teacher or staff member who brings fresh ideas, imagination, and innovation to their work and projects.',
    icon: 'star',
    color_gradient: 'blue'
  },
  {
    sort_order: 8,
    title: 'The Team Player Award',
    description:
      'For the colleague who collaborates joyfully, supports others, and strengthens our sense of teamwork.',
    icon: 'users',
    color_gradient: 'green'
  },
  {
    sort_order: 9,
    title: 'The Silent Hero Award',
    description:
      'For the humble individual who works faithfully behind the scenes and makes a significant impact without seeking recognition.',
    icon: 'eye',
    color_gradient: 'stone'
  },
  {
    sort_order: 10,
    title: 'The Student Champion Award',
    description:
      'For the teacher or staff member who goes above and beyond to support student growth, well-being, and success.',
    icon: 'trophy',
    color_gradient: 'amber'
  }
]

export const AWARD_ICON_OPTIONS = [
  { value: 'award', label: 'Award Ribbon' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'sun', label: 'Sunshine' },
  { value: 'lightbulb', label: 'Lightbulb' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'heart', label: 'Heart' },
  { value: 'star', label: 'Star' },
  { value: 'users', label: 'Team' },
  { value: 'eye', label: 'Silent Hero' },
  { value: 'trophy', label: 'Trophy' }
]

/**
 * Combines first and last names cleanly, ignoring standalone '.' or '-' placeholders.
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
export function formatStaffFullName(firstName, lastName) {
  const cleanPart = (val) => {
    const trimmed = String(val || '').trim()
    if (!trimmed || trimmed === '.' || trimmed === '-') return ''
    return trimmed
  }
  const first = cleanPart(firstName)
  const last = cleanPart(lastName)
  return [first, last].filter(Boolean).join(' ')
}
