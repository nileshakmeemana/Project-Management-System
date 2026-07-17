/**
 * Exchange rates — live from open.er-api.com (no key), cached 6h, static fallback.
 * All conversions route through USD. Used to build payslips/invoices in one
 * currency from tasks recorded in others.
 */
const FALLBACK = { USD: 1, LKR: 300, AUD: 1.53 };
let cache = { rates: { ...FALLBACK }, fetchedAt: 0 };

async function getRates() {
  const SIX_H = 6 * 60 * 60 * 1000;
  if (Date.now() - cache.fetchedAt < SIX_H) return cache.rates;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.rates && data.rates.LKR) {
      cache = { rates: { USD: 1, LKR: data.rates.LKR, AUD: data.rates.AUD }, fetchedAt: Date.now() };
    }
  } catch { /* keep cached/fallback */ }
  return cache.rates;
}

async function convert(amount, from = 'LKR', to = 'LKR') {
  if (!amount || from === to) return amount || 0;
  const rates = await getRates();
  const rf = rates[from] || FALLBACK[from] || 1;
  const rt = rates[to] || FALLBACK[to] || 1;
  return (amount / rf) * rt;
}

module.exports = { getRates, convert };
