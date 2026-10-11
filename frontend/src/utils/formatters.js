// Shared formatting + small helpers. Money from billing/payments/services is a
// Decimal *string* in the API, so everything funnels through Number().

const lkr = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  const n = Number(value ?? 0);
  return lkr.format(Number.isFinite(n) ? n : 0).replace('LKR', 'LKR ').replace(/\s+/g, ' ');
}

export function formatCompactCurrency(value) {
  const n = Number(value ?? 0);
  if (Math.abs(n) >= 1_000_000) return `LKR ${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `LKR ${(n / 1_000).toFixed(1)}K`;
  return `LKR ${n.toFixed(0)}`;
}

// Parse 'YYYY-MM-DD' as a local date (new Date('2026-01-01') would be UTC).
export function parseISODate(iso) {
  if (!iso) return null;
  if (iso instanceof Date) return iso;
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayISO = () => toISODate(new Date());

export function addDays(iso, days) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function formatDate(value) {
  if (!value) return '—';
  const d = String(value).length <= 10 ? parseISODate(value) : new Date(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatShortDate(value) {
  if (!value) return '—';
  const d = String(value).length <= 10 ? parseISODate(value) : new Date(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const ms = parseISODate(checkOut) - parseISODate(checkIn);
  return Math.max(0, Math.round(ms / 86_400_000));
}

// Pull a human-readable message out of an axios error. FastAPI returns
// `detail` as a string for HTTPException and as an array for 422 validation.
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => `${(d.loc || []).filter((p) => p !== 'body').join('.')}: ${d.msg}`)
      .join('; ');
  }
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.';
  return fallback;
}

// Short human-friendly reference derived from the booking UUID.
export const bookingRef = (id) => `SN-${String(id || '').slice(0, 8).toUpperCase()}`;

export const TAX_RATE = 0.15; // mirrors fn_calculate_tax default (db/functions)

export function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || '?'
  );
}

export function downloadCSV(filename, columns, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n');
  const blob = new Blob([`${head}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
