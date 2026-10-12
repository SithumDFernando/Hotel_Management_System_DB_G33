import { Skeleton } from './States';

// Deprecated: replaced by SummaryStrip (spec 11 §6). Restyled only so nothing breaks until
// UI-07 and UI-09 move ReceptionistDashboard and BranchOverview off it; then delete this file.
// Callers still pass `icon` and `tone`; both are ignored.
export default function StatCard({ label, value, sub, loading }) {
  return (
    <div className="card p-4">
      <p className="text-[13px] text-ink-600">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-24" />
      ) : (
        <p className="mt-1 text-xl font-semibold tabular text-ink-900">{value}</p>
      )}
      {sub && <p className="mt-1 text-2xs text-ink-600">{sub}</p>}
    </div>
  );
}
