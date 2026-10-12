import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { getBillingSummary, getMonthlyRevenue, getOccupancy, getTopServices } from '@/api/reports';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import { ErrorState, Skeleton } from '@/components/ui/States';
import SummaryStrip from '@/components/ui/SummaryStrip';
import { CHART } from '@/lib/chartTheme';
import { formatCompactCurrency, formatCurrency, todayISO } from '@/utils/formatters';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const sum = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);
const axisMoney = (v) => (v >= 1e6 ? `${v / 1e6}M` : v >= 1e3 ? `${v / 1e3}K` : v);

// Round y-axis ticks from zero: 1, 2, 2.5 or 5 × 10^n per step, about four steps.
function niceTicks(max) {
  if (!max) return [0];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((st) => st >= raw);
  return [...Array(Math.ceil(max / step) + 1)].map((_, i) => i * step);
}

// Last 6 months ending at ym ('YYYY-MM'), oldest first.
function lastSixMonths(ym) {
  const [y, m] = ym.split('-').map(Number);
  return [...Array(6)].map((_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: MONTHS[d.getMonth()] };
  });
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-ink-100 bg-paper-50 px-3 py-2 text-[13px] shadow-overlay">
      <p className="font-medium text-ink-900">{label} {row.year}</p>
      <dl className="mt-1 space-y-0.5 tabular">
        <div className="flex justify-between gap-6"><dt className="text-ink-600">Rooms</dt><dd>{formatCurrency(row.room)}</dd></div>
        <div className="flex justify-between gap-6"><dt className="text-ink-600">Services</dt><dd>{formatCurrency(row.service)}</dd></div>
        <div className="flex justify-between gap-6 border-t border-ink-100 pt-0.5 font-medium"><dt>Total</dt><dd>{formatCurrency(row.room + row.service)}</dd></div>
      </dl>
    </div>
  );
}

// Spec 11 §8: summary strip, then the revenue chart, then top services.
// branchId only matters for admins (managers are scoped server-side).
export default function BranchOverview({ branchId = '', ym }) {
  const { user } = useAuth();
  const today = todayISO();
  const [year, month] = ym.split('-').map(Number);

  const occ = useFetch((s) => getOccupancy({ branch_id: branchId, date: today }, s), [branchId, today]);
  const unpaid = useFetch((s) => getBillingSummary({ branch_id: branchId, unpaid_only: true }, s), [branchId]);
  const top = useFetch((s) => getTopServices({ branch_id: branchId, limit: 5 }, s), [branchId], { failMessage: "Couldn't load top services." });
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
    { failMessage: "Couldn't load revenue." },
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
  const owed = sum(unpaidRows, 'outstanding_balance');
  const topRows = top.data || [];
  const chartData = (trend.data || []).map((d) => ({ ...d, total: d.room + d.service }));
  const hasRevenue = chartData.some((d) => d.total > 0);
  const yTicks = niceTicks(Math.max(0, ...chartData.map((d) => d.total)));
  const scope = branchId || user.role === 'manager' ? 'this branch' : 'all branches';
  const failed = (q) => (q.error ? '–' : undefined);

  return (
    <div className="space-y-6">
      <SummaryStrip
        items={[
          {
            label: 'Rooms occupied today',
            value: failed(occ) ?? `${rooms.occupied} of ${rooms.total} (${rooms.pct}%)`,
            sub: occ.error ? "Couldn't load occupancy" : `${rooms.reserved} reserved · ${rooms.maintenance} in maintenance`,
            loading: occ.isLoading && !occ.data,
          },
          {
            label: `Revenue, ${MONTHS[month - 1]} ${year}`,
            value: failed(trend) ?? formatCurrency(current?.gross),
            sub: 'Checked-out stays, incl. tax',
            loading: trend.isLoading && !trend.data,
          },
          {
            label: `Collected, ${MONTHS[month - 1]} ${year}`,
            value: failed(trend) ?? formatCurrency(current?.collected),
            loading: trend.isLoading && !trend.data,
          },
          {
            label: 'Balance due',
            value: failed(unpaid) ?? formatCurrency(owed),
            sub: unpaid.error ? "Couldn't load bills" : `${unpaidRows.length} bill${unpaidRows.length === 1 ? '' : 's'} with a balance`,
            problem: owed > 0,
            loading: unpaid.isLoading && !unpaid.data,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card min-w-0 p-4 sm:p-5" aria-labelledby="rev-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="rev-heading" className="text-base font-semibold text-ink-900">Monthly revenue, last 6 months (LKR)</h2>
            <ul className="flex gap-4 text-[13px] text-ink-600" aria-label="Legend">
              <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART.series[0] }} aria-hidden="true" />Rooms</li>
              <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART.series[1] }} aria-hidden="true" />Services</li>
            </ul>
          </div>
          <p className="mt-0.5 text-2xs text-ink-600">Checked-out stays to {MONTH_NAMES[month - 1]} {year}, {scope}; before tax.</p>

          {trend.error ? (
            <div className="mt-4"><ErrorState message={trend.error} onRetry={trend.refetch} /></div>
          ) : trend.isLoading && !trend.data ? (
            <Skeleton className="mt-4 h-72 w-full" />
          ) : !hasRevenue ? (
            <p className="mt-4 flex h-40 items-center justify-center rounded-md border border-dashed border-ink-100 text-sm text-ink-600">
              No checked-out stays in this period yet.
            </p>
          ) : (
            <>
              <div
                className="mt-4 h-72"
                role="img"
                aria-label={`Revenue by month: ${chartData.map((d) => `${d.label} ${formatCurrency(d.total)}`).join(', ')}.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHART.grid }} tick={{ fontSize: 12, fill: CHART.axis }} />
                    <YAxis
                      domain={[0, yTicks[yTicks.length - 1]]}
                      ticks={yTicks}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                      tick={{ fontSize: 12, fill: CHART.axis }}
                      tickFormatter={axisMoney}
                      label={{ value: 'LKR', position: 'insideTopLeft', offset: 0, dy: -18, fontSize: 12, fill: CHART.axis }}
                    />
                    <Tooltip content={<RevenueTooltip />} cursor={{ fill: CHART.cursor }} />
                    <Bar dataKey="room" name="Rooms" stackId="rev" fill={CHART.series[0]} stroke={CHART.surface} strokeWidth={2} isAnimationActive={false} />
                    <Bar dataKey="service" name="Services" stackId="rev" fill={CHART.series[1]} stroke={CHART.surface} strokeWidth={2} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="total" position="top" formatter={(v) => (v > 0 ? formatCompactCurrency(v).replace('LKR ', '') : '')} style={{ fontSize: 11, fill: CHART.text }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-3 text-[13px]">
                <summary className="w-fit cursor-pointer rounded-sm text-tea-700">Show as table</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full" aria-label="Monthly revenue, last 6 months">
                    <thead>
                      <tr className="bg-paper-200">
                        <th scope="col" className="th">Month</th>
                        <th scope="col" className="th text-right">Rooms</th>
                        <th scope="col" className="th text-right">Services</th>
                        <th scope="col" className="th text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {chartData.map((d) => (
                        <tr key={`${d.year}-${d.month}`}>
                          <th scope="row" className="td text-left font-normal">{d.label} {d.year}</th>
                          <td className="td text-right tabular">{formatCurrency(d.room)}</td>
                          <td className="td text-right tabular">{formatCurrency(d.service)}</td>
                          <td className="td text-right tabular font-medium">{formatCurrency(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </section>

        <section className="card min-w-0 p-4 sm:p-5" aria-labelledby="top-heading">
          <h2 id="top-heading" className="text-base font-semibold text-ink-900">Top services by quantity</h2>
          <p className="mt-0.5 text-2xs text-ink-600">All time, {scope}.</p>
          {top.error ? (
            <div className="mt-4"><ErrorState message={top.error} onRetry={top.refetch} /></div>
          ) : top.isLoading && !top.data ? (
            <Skeleton className="mt-4 h-48 w-full" />
          ) : topRows.length === 0 ? (
            <p className="mt-4 text-sm text-ink-600">No services used yet.</p>
          ) : (
            <ol className="mt-3 divide-y divide-ink-100">
              {topRows.map((s) => (
                <li key={s.service_id} className="flex items-baseline gap-3 py-2.5 text-sm">
                  <span className="w-5 shrink-0 text-right tabular text-ink-600">{s.usage_rank}.</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink-900">{s.service_name}</span>
                    <span className="block text-2xs text-ink-600">{s.category} · {formatCurrency(s.total_revenue)}</span>
                  </span>
                  <span className="tabular font-medium text-ink-900">{s.total_quantity}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
