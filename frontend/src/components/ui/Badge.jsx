import { formatCurrency } from '@/utils/formatters';

// Status chips from docs/specs/11_design_system.md §5: the word carries the status,
// colour only supports it. Red appears only for problems (balance due, kind="problem").
const STATUS = {
  // room
  Available: { label: 'Available', cls: 'bg-tea-100 text-tea-900' },
  Occupied: { label: 'Occupied', cls: 'bg-paper-200 text-ink-900' },
  Maintenance: { label: 'Maintenance', cls: 'hatch bg-paper-200 text-ink-600' },
  // booking
  Booked: { label: 'Booked', cls: 'border border-ink-300 bg-paper-50 text-ink-900' },
  'Checked-In': { label: 'Checked in', cls: 'bg-tea-700 text-white' },
  'Checked-Out': { label: 'Checked out', cls: 'bg-paper-200 text-ink-600' },
  Cancelled: { label: 'Cancelled', cls: 'border border-dashed border-ink-300 text-ink-600' },
  // bill
  Paid: { label: 'Paid', cls: 'bg-tea-100 text-tea-900' },
};

const KIND = {
  neutral: 'bg-paper-200 text-ink-900',
  problem: 'bg-signal-100 text-signal-700',
};

const BASE = 'inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-2xs font-medium';

// <Badge status="Checked-In" />                  → "Checked in"
// <Badge balance={12400} />                      → "Balance due LKR 12,400.00", or "Paid" when 0
// <Badge>Departs today</Badge>                   → neutral chip
// <Badge kind="problem">Overdue checkout</Badge>  → signal chip, problems only
export default function Badge({ status, balance, kind = 'neutral', children, className = '' }) {
  if (balance !== undefined && balance !== null) {
    const due = Number(balance) > 0;
    return (
      <span className={`${BASE} ${due ? KIND.problem : STATUS.Paid.cls} tabular ${className}`}>
        {due ? `Balance due ${formatCurrency(balance)}` : 'Paid'}
      </span>
    );
  }
  const s = status ? STATUS[status] : null;
  return (
    <span className={`${BASE} ${s ? s.cls : KIND[kind] || KIND.neutral} ${className}`}>
      {children ?? s?.label ?? status}
    </span>
  );
}
