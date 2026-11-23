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
