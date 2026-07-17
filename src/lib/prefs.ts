'use client';
/**
 * Global preference store — base currency (with live exchange-rate conversion),
 * date format, and timezone. Everything that displays money or dates goes
 * through fmtAmt / fmtDate so changing Settings updates the whole dashboard.
 *
 * Base currency resolution:
 *   - admin     → Settings → Preferences → Base Currency
 *   - employee  → their own Payment Currency (Settings page)
 */
import { useSyncExternalStore } from 'react';
import { apiCall, getUser } from '@/lib/api';

type Rates = Record<string, number>; // units per 1 USD

const FALLBACK_RATES: Rates = { USD: 1, LKR: 300, AUD: 1.53 };
const RATES_KEY = 'dc_fx_rates';
const PREFS_KEY = 'dc_prefs';

interface Prefs {
  baseCurrency: string;
  dateFormat: string;   // DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD
  timezone: string;
}

let prefs: Prefs = { baseCurrency: 'LKR', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Colombo' };
let rates: Rates = { ...FALLBACK_RATES };
let version = 0;
let loaded = false;
const listeners = new Set<() => void>();

function emit() { version++; listeners.forEach(fn => fn()); }

// Restore last-known values instantly (avoids flash of wrong currency)
if (typeof window !== 'undefined') {
  try { const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'); if (p) prefs = { ...prefs, ...p }; } catch {}
  try { const r = JSON.parse(localStorage.getItem(RATES_KEY) || 'null'); if (r?.USD) rates = { ...FALLBACK_RATES, ...r }; } catch {}
}

async function fetchRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data?.rates?.LKR) {
      rates = { USD: 1, LKR: data.rates.LKR, AUD: data.rates.AUD };
      localStorage.setItem(RATES_KEY, JSON.stringify(rates));
      emit();
    }
  } catch { /* keep cached/fallback rates */ }
}

/** (Re)load preferences — user currency for employees, app settings for admins. */
export async function reloadPrefs() {
  if (typeof window === 'undefined') return;
  const user = getUser();
  try {
    const d = await apiCall('GET', '/settings');
    const s = d.settings || {};
    prefs = {
      baseCurrency: user?.role === 'employee' ? (user.currency || s.baseCurrency || 'LKR') : (s.baseCurrency || 'LKR'),
      dateFormat: s.dateFormat || 'DD/MM/YYYY',
      timezone: s.timezone || 'Asia/Colombo',
    };
  } catch {
    if (user?.role === 'employee' && user.currency) prefs = { ...prefs, baseCurrency: user.currency };
  }
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  emit();
  fetchRates();
}

function ensureLoaded() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  reloadPrefs();
}

/** Subscribe hook — call once per component that uses fmtAmt/fmtDate so it re-renders on changes. */
export function usePrefs(): { base: string; version: number } {
  const v = useSyncExternalStore(
    (fn) => { ensureLoaded(); listeners.add(fn); return () => { listeners.delete(fn); }; },
    () => version,
    () => 0
  );
  return { base: prefs.baseCurrency, version: v };
}

export function getBaseCurrency() { return prefs.baseCurrency; }

/** Convert an amount between currencies using current exchange rates. */
export function convert(value: number, from: string, to: string): number {
  if (!value || from === to) return value || 0;
  const rf = rates[from] || FALLBACK_RATES[from] || 1;
  const rt = rates[to]   || FALLBACK_RATES[to]   || 1;
  return (value / rf) * rt;
}

/** Convert an amount from its original currency into the viewer's preferred currency. */
export const toBase = (v: number, from = 'LKR') => convert(v || 0, from, prefs.baseCurrency);

/** Format an amount that is ALREADY in the preferred currency (no conversion). */
export const fmtBase = (v: number) => {
  const base = prefs.baseCurrency;
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: base, maximumFractionDigits: 0 }).format(v || 0); }
  catch { return `${base} ${Math.round(v || 0).toLocaleString()}`; }
};

/** Format an amount in the user's base currency, converting from its original currency. */
export const fmtAmt = (v: number, from = 'LKR') => {
  const base = prefs.baseCurrency;
  const converted = convert(v || 0, from, base);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: base, maximumFractionDigits: 0 }).format(converted);
  } catch {
    return `${base} ${Math.round(converted).toLocaleString()}`;
  }
};

/** Format a date using the configured date format + timezone. */
export const fmtDate = (d: any): string => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(+date)) return '—';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: prefs.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const get = (t: string) => parts.find(p => p.type === t)?.value || '';
    const [dd, mm, yyyy] = [get('day'), get('month'), get('year')];
    switch (prefs.dateFormat) {
      case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
      case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
      default:           return `${dd}/${mm}/${yyyy}`;
    }
  } catch { return date.toLocaleDateString(); }
};
