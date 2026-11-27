import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Browser-side SHA-256 helper (returns hex string)
export async function sha256(message) {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple currency formatter (IDR locale by default)
export function formatCurrency(amount, locale = 'id-ID', currency = 'IDR') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount || 0));
  } catch {
    return String(amount ?? 0)
  }
}

export function toNumber(value, fallback = 0) {
  const n = Number(String(value || '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : fallback
}

/**
 * Fetch all rows from a Supabase/PostgREST query using chunked `.range()` pagination
 * to bypass PostgREST's 1,000-row hard cap per HTTP request.
 */
export async function fetchAllRows(queryFn, chunkSize = 1000) {
  let allRows = []
  let from = 0
  let hasMore = true
  while (hasMore) {
    const { data, error } = await queryFn(from, from + chunkSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    allRows = allRows.concat(data)
    if (data.length < chunkSize) {
      hasMore = false
    } else {
      from += chunkSize
    }
  }
  return allRows
}

export const PYP_RATING_SCORES = {
  Beginning: 1,
  Developing: 2,
  Achieving: 3,
  Exceeding: 4,
}

export const PYP_SCORE_TO_RATING = {
  1: 'Beginning',
  2: 'Developing',
  3: 'Achieving',
  4: 'Exceeding',
}

/**
 * Compute average PYP strand rating across multiple units in a semester.
 * Ignores 'N/A' or empty values and rounds half-up on the 1..4 scale.
 */
export function computeAverageStrandRating(ratings = []) {
  const scores = []
  for (const r of ratings) {
    const score = PYP_RATING_SCORES[r]
    if (score) scores.push(score)
  }
  if (scores.length === 0) return { rating: 'N/A', averageScore: null, count: 0 }
  const sum = scores.reduce((acc, s) => acc + s, 0)
  const avg = sum / scores.length
  const rounded = Math.min(4, Math.max(1, Math.round(avg)))
  return {
    rating: PYP_SCORE_TO_RATING[rounded],
    averageScore: Number(avg.toFixed(2)),
    count: scores.length,
  }
}
