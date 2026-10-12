import { Skeleton } from './States';

// Spec 11 §6: one row of `label: number` pairs in text, split by hairlines — not KPI tiles.
// Two columns at phone width, one row from sm up.
// items: [{ label: 'Arrivals today', value: 3, sub?: 'Awaiting check-in', loading?, problem? }]
// problem: the value is a problem (e.g. balance due > 0) and shows in signal red.
export default function SummaryStrip({ items, loading = false, className = '' }) {
  return (
    <dl className={`grid grid-cols-2 rounded-lg border border-ink-100 bg-paper-50 sm:flex sm:divide-x sm:divide-ink-100 ${className}`}>
      {items.map((it, i) => (
        <div
          key={it.label}
          className={`min-w-0 flex-1 px-4 py-3 ${i % 2 ? 'border-l border-ink-100 sm:border-l-0' : ''} ${
            i > 1 ? 'border-t border-ink-100 sm:border-t-0' : ''
          }`}
        >
          <dt className="text-[13px] text-ink-600">{it.label}</dt>
          <dd className={`mt-0.5 text-lg font-semibold tabular ${it.problem ? 'text-signal-700' : 'text-ink-900'}`}>
            {loading || it.loading ? <Skeleton className="mt-1 h-5 w-16" /> : it.value}
          </dd>
          {it.sub && <dd className="text-2xs text-ink-600">{it.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
