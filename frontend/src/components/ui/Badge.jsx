const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-gold-100 text-gold-800 ring-gold-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  gray: 'bg-navy-100 text-navy-600 ring-navy-200',
  navy: 'bg-navy-900 text-gold-200 ring-navy-900',
};

// Domain status -> tone, so every page colours statuses the same way.
const STATUS_TONE = {
  Booked: 'blue',
  'Checked-In': 'green',
  'Checked-Out': 'gray',
  Cancelled: 'red',
  Available: 'green',
  Occupied: 'amber',
  Maintenance: 'red',
  Paid: 'green',
  'Partially Paid': 'amber',
  Unpaid: 'red',
};

export default function Badge({ children, tone, status, className = '' }) {
  const t = TONES[tone || STATUS_TONE[status] || 'gray'];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${t} ${className}`}
    >
      {children ?? status}
    </span>
  );
}
