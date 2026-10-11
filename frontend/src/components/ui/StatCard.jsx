import Icon from './Icon';
import { Skeleton } from './States';

export default function StatCard({ label, value, sub, icon, loading, tone = 'navy' }) {
  const tones = {
    navy: 'bg-navy-50 text-navy-700',
    gold: 'bg-gold-100 text-gold-800',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">{label}</p>
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon name={icon} className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p className="mt-2 font-serif text-3xl font-semibold">{value}</p>
      )}
      {sub && <p className="mt-1 text-xs text-navy-500">{sub}</p>}
    </div>
  );
}
