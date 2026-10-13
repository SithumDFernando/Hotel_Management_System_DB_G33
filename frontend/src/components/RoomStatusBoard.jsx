import { useMemo, useState } from 'react';
import { listBookings } from '@/api/bookings';
import { getRooms } from '@/api/rooms';
import useFetch from '@/hooks/useFetch';
import Badge from '@/components/ui/Badge';
import { ErrorState, Skeleton } from '@/components/ui/States';
import SummaryStrip from '@/components/ui/SummaryStrip';
import Tabs from '@/components/ui/Tabs';
import { formatCurrency, formatNumericDate } from '@/utils/formatters';

const STATUSES = ['Available', 'Occupied', 'Maintenance'];

// Front-desk room status for one branch: counts by type and status, then every
// room with tonight's status and, when occupied, who is in it. Built from
// GET /rooms (no dates: status is tonight's occupancy) and the in-house list,
// so no report access is needed.
export default function RoomStatusBoard({ branchId }) {
  const [filter, setFilter] = useState('all');
  const data = useFetch(
    async (signal) => {
      const [rooms, inHouse] = await Promise.all([
        getRooms({ branch_id: branchId }, signal),
        listBookings({ status: 'Checked-In' }, signal),
      ]);
      return { rooms, inHouse: inHouse.bookings };
    },
    [branchId],
    { failMessage: "Couldn't load rooms." },
  );

  const rooms = data.data?.rooms || [];
  const stayByRoom = useMemo(
    () => Object.fromEntries((data.data?.inHouse || []).map((b) => [b.room.room_id, b])),
    [data.data],
  );

  // One row per type, smallest and cheapest first (Single, Double, Deluxe, Suite).
  const byType = useMemo(() => {
    const rows = {};
    rooms.forEach((r) => {
      const t = r.room_type;
      rows[t.type_name] ??= { type: t.type_name, capacity: t.capacity, rate: Infinity, Available: 0, Occupied: 0, Maintenance: 0, total: 0 };
      rows[t.type_name][r.status] += 1;
      rows[t.type_name].total += 1;
      rows[t.type_name].rate = Math.min(rows[t.type_name].rate, Number(r.daily_rate) || Infinity);
    });
    return Object.values(rows).sort((a, b) => a.capacity - b.capacity || a.rate - b.rate || a.type.localeCompare(b.type));
  }, [rooms]);

  const count = (status) => rooms.filter((r) => r.status === status).length;
  const shown = rooms
    .filter((r) => filter === 'all' || r.status === filter)
    .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));

  if (data.error) return <ErrorState message={data.error} onRetry={data.refetch} />;
  const loading = data.isLoading && !data.data;
  const inService = rooms.length - count('Maintenance');

  return (
    <div className="space-y-8">
      <SummaryStrip
        items={[
          { label: 'Rooms', value: rooms.length, loading },
          { label: 'Available tonight', value: count('Available'), loading },
          {
            label: 'Occupied',
            value: count('Occupied'),
            sub: inService ? `${Math.round((count('Occupied') / inService) * 100)}% of rooms in service` : undefined,
            loading,
          },
          { label: 'Maintenance', value: count('Maintenance'), loading },
        ]}
      />

      <section aria-labelledby="by-type-heading">
        <h2 id="by-type-heading" className="mb-2 text-base font-semibold text-ink-900">By room type</h2>
        <div className="card relative overflow-x-auto">
          {loading ? (
            <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            <table className="w-full min-w-[520px]" aria-labelledby="by-type-heading">
              <thead>
                <tr className="bg-paper-200">
                  <th scope="col" className="th">Type</th>
                  <th scope="col" className="th text-right">Sleeps</th>
                  {STATUSES.map((s) => <th key={s} scope="col" className="th text-right">{s}</th>)}
                  <th scope="col" className="th text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {byType.map((row) => (
                  <tr key={row.type}>
                    <th scope="row" className="td text-left font-medium text-ink-900">{row.type}</th>
                    <td className="td text-right tabular">{row.capacity}</td>
                    {STATUSES.map((s) => <td key={s} className="td text-right tabular">{row[s]}</td>)}
                    <td className="td text-right font-medium tabular text-ink-900">{row.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-ink-300">
                  <th scope="row" className="td text-left font-semibold text-ink-900">All types</th>
                  <td className="td" />
                  {STATUSES.map((s) => <td key={s} className="td text-right font-semibold tabular text-ink-900">{count(s)}</td>)}
                  <td className="td text-right font-semibold tabular text-ink-900">{rooms.length}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>

      <section aria-labelledby="room-list-heading">
        <h2 id="room-list-heading" className="text-base font-semibold text-ink-900">Rooms</h2>
        <Tabs
          tabs={[
            { key: 'all', label: 'All', count: loading ? null : rooms.length },
            ...STATUSES.map((s) => ({ key: s, label: s, count: loading ? null : count(s) })),
          ]}
          value={filter}
          onChange={setFilter}
          className="mb-3 mt-1"
        />
        <div className="card relative overflow-x-auto">
          {loading ? (
            <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : shown.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ink-600">No rooms are {filter.toLowerCase()} right now.</p>
          ) : (
            <>
            {/* Phones: one row per room so status and guest stay in view. */}
            <ul className="divide-y divide-ink-100 md:hidden">
              {shown.map((r) => {
                const stay = stayByRoom[r.room_id];
                return (
                  <li key={r.room_id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 text-sm">
                      <p className="text-ink-900"><span className="font-medium tabular">{r.room_number}</span> · {r.room_type.type_name}</p>
                      <p className="text-2xs tabular text-ink-600">{formatCurrency(r.daily_rate)} / night · sleeps {r.room_type.capacity}</p>
                      {stay && (
                        <p className="mt-1 text-2xs text-ink-600">
                          <span className="text-ink-900">{stay.guest.full_name}</span>, departs {formatNumericDate(stay.check_out_date)}
                        </p>
                      )}
                    </div>
                    <Badge status={r.status} />
                  </li>
                );
              })}
            </ul>
            <table className="hidden w-full min-w-[640px] md:table" aria-labelledby="room-list-heading">
              <thead>
                <tr className="bg-paper-200">
                  <th scope="col" className="th">Room</th>
                  <th scope="col" className="th">Type</th>
                  <th scope="col" className="th text-right">Rate / night</th>
                  <th scope="col" className="th">Status</th>
                  <th scope="col" className="th">Guest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {shown.map((r) => {
                  const stay = stayByRoom[r.room_id];
                  return (
                    <tr key={r.room_id} className="hover:bg-paper-100">
                      <td className="td font-medium tabular text-ink-900">{r.room_number}</td>
                      <td className="td">{r.room_type.type_name} <span className="text-2xs text-ink-600">· sleeps {r.room_type.capacity}</span></td>
                      <td className="td whitespace-nowrap text-right tabular">{formatCurrency(r.daily_rate)}</td>
                      <td className="td"><Badge status={r.status} /></td>
                      <td className="td">
                        {stay ? (
                          <>
                            <span className="text-ink-900">{stay.guest.full_name}</span>
                            <span className="block text-2xs tabular text-ink-600">Departs {formatNumericDate(stay.check_out_date)}</span>
                          </>
                        ) : (
                          <span className="text-ink-600">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
