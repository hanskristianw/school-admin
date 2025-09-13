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
