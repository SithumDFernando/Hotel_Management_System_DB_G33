import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { getBillingSummary, getMonthlyRevenue, getOccupancy, getTopServices } from '@/api/reports';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import StatCard from '@/components/ui/StatCard';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { formatCompactCurrency, formatCurrency, todayISO } from '@/utils/formatters';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sum = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);

// Last 6 months ending at ym ('YYYY-MM'), oldest first.
function lastSixMonths(ym) {
  const [y, m] = ym.split('-').map(Number);
  return [...Array(6)].map((_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: MONTHS[d.getMonth()] };
  });
}

function OccupancyRing({ pct }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90" role="img" aria-label={`${pct}% occupied`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e3e9f1" strokeWidth="8" />
      <circle cx="36" cy="36" r={r} fill="none" stroke="#7a5c00" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />
    </svg>
  );
}

// KPIs + 6-month revenue chart + top services. branchId only matters for admins.
export default function BranchOverview({ branchId = '', ym }) {
  const { user } = useAuth();
  const today = todayISO();
  const [year, month] = ym.split('-').map(Number);

  const occ = useFetch((s) => getOccupancy({ branch_id: branchId, date: today }, s), [branchId, today]);
  const unpaid = useFetch((s) => getBillingSummary({ branch_id: branchId, unpaid_only: true }, s), [branchId]);
  const top = useFetch((s) => getTopServices({ branch_id: branchId, limit: 5 }, s), [branchId]);
  const trend = useFetch(
    async (signal) => {
      const months = lastSixMonths(ym);
      const results = await Promise.all(months.map((m) => getMonthlyRevenue({ branch_id: branchId, year: m.year, month: m.month }, signal)));
      return months.map((m, i) => ({
        label: m.label,
        month: m.month,
        year: m.year,
        room: sum(results[i], 'total_room_revenue'),
        service: sum(results[i], 'total_service_revenue'),
        gross: sum(results[i], 'total_gross_revenue'),
        collected: sum(results[i], 'total_collected'),
      }));
    },
    [ym, branchId],
  );

  // One row per (room, booking) — collapse to one status per room.
  const rooms = useMemo(() => {
    const byRoom = new Map();
    (occ.data || []).forEach((r) => {
      const cur = byRoom.get(r.room_id) || { maintenance: r.room_status === 'Maintenance', occupied: false, reserved: false };
      if (r.booking_status === 'Checked-In') cur.occupied = true;
      if (r.booking_status === 'Booked') cur.reserved = true;
      byRoom.set(r.room_id, cur);
    });
    const all = [...byRoom.values()];
    const occupied = all.filter((r) => r.occupied).length;
    return {
      total: all.length,
      occupied,
      reserved: all.filter((r) => !r.occupied && r.reserved).length,
      maintenance: all.filter((r) => r.maintenance).length,
      pct: all.length ? Math.round((occupied / all.length) * 100) : 0,
    };
  }, [occ.data]);

  const current = trend.data?.find((t) => t.month === month && t.year === year);
  const unpaidRows = unpaid.data || [];
  const topRows = top.data || [];
  const topTotal = sum(topRows, 'total_revenue');
  const chartData = trend.data || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Occupancy today</p>
          {occ.isLoading ? <Skeleton className="mt-3 h-16 w-full" /> : (
            <div className="mt-2 flex items-center justify-between">
              <p className="font-serif text-4xl font-semibold">{rooms.pct}%</p>
              <OccupancyRing pct={rooms.pct} />
            </div>
          )}
          <p className="mt-1 text-xs text-navy-500">{rooms.reserved} reserved · {rooms.maintenance} in maintenance</p>
        </div>
        <StatCard label="Rooms occupied" icon="bed" value={`${rooms.occupied} / ${rooms.total}`} sub="Checked-in right now" loading={occ.isLoading} />
        <StatCard label={`Revenue · ${MONTHS[month - 1]} ${year}`} icon="chart" tone="gold" value={formatCompactCurrency(current?.gross)} sub={`Collected ${formatCurrency(current?.collected)} · checked-out stays`} loading={trend.isLoading} />
        <StatCard label="Outstanding balances" icon="receipt" tone="red" value={formatCompactCurrency(sum(unpaidRows, 'outstanding_balance'))} sub={`${unpaidRows.length} folio${unpaidRows.length === 1 ? '' : 's'} with dues`} loading={unpaid.isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5" aria-label="Monthly revenue">
          <h3 className="font-serif text-lg font-semibold">Monthly revenue breakdown</h3>
          <p className="text-xs text-navy-500">Last 6 months · room vs services (LKR, incl. tax in gross)</p>
          {trend.error ? <div className="mt-4"><ErrorState message={trend.error} onRetry={trend.refetch} /></div> : trend.isLoading ? <Skeleton className="mt-4 h-72 w-full" /> : (
            <div className="mt-4 h-72" role="img" aria-label={`Revenue chart: ${chartData.map((d) => `${d.label} ${formatCompactCurrency(d.room + d.service)}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e9f1" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}M` : v >= 1e3 ? `${v / 1e3}K` : v)} />
                  <Tooltip formatter={(v) => formatCurrency(v)} cursor={{ fill: 'rgba(11,27,46,0.04)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="room" name="Room revenue" stackId="rev" fill="#0b1b2e" />
                  <Bar dataKey="service" name="Services" stackId="rev" fill="#d9ae45" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card p-5" aria-label="Top services">
          <h3 className="font-serif text-lg font-semibold">Top performing services</h3>
          <p className="text-xs text-navy-500">By revenue · {branchId || user.role === 'manager' ? 'this branch' : 'all branches'}</p>
          {top.error ? <div className="mt-4"><ErrorState message={top.error} onRetry={top.refetch} /></div> : top.isLoading ? <Skeleton className="mt-4 h-48 w-full" /> : topRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-navy-500">No service usage yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {topRows.map((s) => {
                const share = topTotal ? (s.total_revenue / topTotal) * 100 : 0;
                return (
                  <li key={s.service_id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.service_name}</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(s.total_revenue)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-100" role="img" aria-label={`${share.toFixed(0)}% share`}>
                      <div className="h-full rounded-full bg-gold-600" style={{ width: `${share}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-navy-500">{s.total_quantity} ordered · {share.toFixed(1)}% share</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
