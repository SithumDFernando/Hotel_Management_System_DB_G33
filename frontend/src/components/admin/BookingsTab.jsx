import { useMemo, useState } from 'react';
import { listBookings } from '@/api/bookings';
import useFetch from '@/hooks/useFetch';
import ReportTable from '@/components/ReportTable';
import Badge from '@/components/ui/Badge';
import { bookingRef, formatCurrency, formatNumericDate } from '@/utils/formatters';

const STATUSES = ['Booked', 'Checked-In', 'Checked-Out', 'Cancelled'];
const STATUS_LABEL = { 'Checked-In': 'Checked in', 'Checked-Out': 'Checked out' };
const LIMIT = 100;

// Cross-branch booking search (admin). Filters are applied server-side.
export default function BookingsTab({ branches }) {
  const [branch, setBranch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading, error, refetch } = useFetch(
    (s) => listBookings({ branch_id: branch, status, from, to, per_page: LIMIT }, s),
    [branch, status, from, to],
  );

  const rows = useMemo(
    () =>
      (data?.bookings || []).map((b) => ({
        ref: bookingRef(b.booking_id),
        guest_name: b.guest.full_name,
        room: `${b.room.type_name || ''} ${b.room.room_number}`.trim(),
        branch_name: b.room.branch_name,
        check_in_date: b.check_in_date,
        check_out_date: b.check_out_date,
        rate_at_booking: b.rate_at_booking,
        payment_option: b.payment_option,
        status: b.status,
      })),
    [data],
  );

  const columns = [
    { key: 'ref', label: 'Booking' },
    { key: 'guest_name', label: 'Guest' },
    { key: 'branch_name', label: 'Branch' },
    { key: 'room', label: 'Room' },
    { key: 'check_in_date', label: 'Check-in', format: formatNumericDate },
    { key: 'check_out_date', label: 'Check-out', format: formatNumericDate },
    { key: 'rate_at_booking', label: 'Rate / night', align: 'right', format: formatCurrency },
    { key: 'payment_option', label: 'Payment' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
  ];

  return (
    <div className="space-y-3">
      <ReportTable
        title="All bookings"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        exportName="skynest-bookings"
        emptyMessage="No bookings match these filters."
        toolbar={
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-2xs text-ink-600">Branch</span>
              <select className="input !w-auto" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value="">All branches</option>
                {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs text-ink-600">Status</span>
              <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs text-ink-600">Stay ends on or after</span>
              <input type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-2xs text-ink-600">Stay starts on or before</span>
              <input type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        }
      />
      {data && data.total > LIMIT && (
        <p className="text-2xs text-ink-600">Showing the latest {LIMIT} of {data.total} bookings. Narrow the filters to see the rest.</p>
      )}
    </div>
  );
}
