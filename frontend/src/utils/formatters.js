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

// Spec 11 §9 numeric formats: 14/11/2026, and "14/11–16/11" for a stay.
export function formatNumericDate(value) {
  if (!value) return '—';
  const d = String(value).length <= 10 ? parseISODate(value) : new Date(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatStayRange(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '';
  const dm = (iso) => parseISODate(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
  return `${dm(checkIn)}–${dm(checkOut)}`;
}

// "12/10/2026 09:42" (spec 11 §9: DD/MM/YYYY, 24-hour).
export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return `${formatNumericDate(d)} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const ms = parseISODate(checkOut) - parseISODate(checkIn);
  return Math.max(0, Math.round(ms / 86_400_000));
}

// Spec 11 §9.1 error messages. Shows the server's `detail` when it is a readable
// sentence, otherwise the pattern for the status. 402 is handled by the check-out
// flow (it opens the payment window), and 422 field errors by fieldErrors().
// options: a string fallback, or { fallback } — used for 400/409 without a readable detail.
const SERVER_FAILED = "The server couldn't complete this. Try again; if it keeps happening, tell the system admin.";

const isReadable = (detail) =>
  typeof detail === 'string' && detail.length > 0 && detail.length < 200
  && !/sql|asyncpg|traceback|constraint|exception|\b[0-9a-f]{8}-[0-9a-f]{4}-/i.test(detail);

export function errorMessage(err, options = {}) {
  const { fallback } = typeof options === 'string' ? { fallback: options } : options;
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;
  const readable = isReadable(detail);

  if (!err?.response) {
    return err?.code === 'ERR_NETWORK' || err?.request
      ? "Can't reach the server. Check your connection and try again."
      : SERVER_FAILED;
  }
  switch (status) {
    case 401:
      return /credential|password|email/i.test(detail || '') ? 'Email or password is incorrect.' : 'Your session has ended. Sign in again.';
    case 403:
      // "This account has no guest profile. Contact the front desk." says what to do; keep it.
      return readable && /profile|front desk/i.test(detail) ? detail : "You don't have access to this record.";
    case 404: {
      // "Booking not found" → "This booking no longer exists. Refresh the list."
      const thing = readable && /^([a-z][a-z ]{0,30}) not found\.?$/i.exec(detail)?.[1];
      if (thing) return `This ${thing.toLowerCase()} no longer exists. Refresh the list.`;
      return readable ? detail : 'This record no longer exists. Refresh the list.';
    }
    case 429:
      return 'Too many sign-in attempts. Wait a minute and try again.';
    case 422:
      // Custom rules return a sentence; schema validation returns a list (see fieldErrors).
      return readable ? detail : 'Some fields need attention. Check the highlighted fields.';
    case 503:
      // ISSUE-15: "The database is out of date. Ask the system admin to rebuild it."
      return readable ? detail : SERVER_FAILED;
    default:
      if (status >= 500) return SERVER_FAILED;
      return readable ? detail : (fallback ?? SERVER_FAILED);
  }
}

// FastAPI 422 list → { field: 'Message.' } for inline errors under each Field.
// The field is the last `loc` part (e.g. ["body", "email"] → "email").
export function fieldErrors(err) {
  const detail = err?.response?.data?.detail;
  if (err?.response?.status !== 422 || !Array.isArray(detail)) return {};
  const out = {};
  detail.forEach((d) => {
    const field = [...(d.loc || [])].reverse().find((p) => typeof p === 'string' && p !== 'body');
    if (!field || out[field]) return;
    // Plain wording for the common Pydantic messages; others pass through.
    const msg = String(d.msg || 'Check this value')
      .replace(/^Value error, /, '')
      .replace(/^String should have at (most|least) (\d+) characters?$/, 'Use at $1 $2 characters')
      .replace(/^value is not a valid email address.*$/i, 'Enter an email address like name@example.com')
      .replace(/^Field required$/, 'This field is required')
      .replace(/^Input should be a valid (number|integer|date).*$/i, 'Enter a valid $1');
    out[field] = `${msg.charAt(0).toUpperCase()}${msg.slice(1)}${/[.!?]$/.test(msg) ? '' : '.'}`;
  });
  return out;
}

// Short human-friendly reference derived from the booking UUID.
export const bookingRef = (id) => `SN-${String(id || '').slice(0, 8).toUpperCase()}`;

// Mirrors validate_new_password in backend/app/auth.py (bcrypt reads 72 bytes)
export function passwordError(pw) {
  if (pw.length < 8) return 'Use at least 8 characters';
  if (new TextEncoder().encode(pw).length > 72) return 'Use at most 72 characters';
  return '';
}

export const MAX_STAY_NIGHTS = 30; // mirrors the cap in create_booking (db/procedures/booking.sql)

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
