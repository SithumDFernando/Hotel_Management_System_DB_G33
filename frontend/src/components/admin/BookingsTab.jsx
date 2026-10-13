import { useMemo, useState } from 'react';
import { listBookings } from '@/api/bookings';
import useFetch from '@/hooks/useFetch';
import ReportTable from '@/components/ReportTable';
import Badge from '@/components/ui/Badge';
import { bookingRef, formatCurrency, formatDate } from '@/utils/formatters';

const STATUSES = ['Booked', 'Checked-In', 'Checked-Out', 'Cancelled'];
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
    { key: 'check_in_date', label: 'Check-in', format: formatDate },
    { key: 'check_out_date', label: 'Check-out', format: formatDate },
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
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Branch" className="input !w-auto !py-2" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
            </select>
            <select aria-label="Status" className="input !w-auto !py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <input type="date" aria-label="Stay ends on or after" title="Stay ends on or after" className="input !w-auto !py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" aria-label="Stay starts on or before" title="Stay starts on or before" className="input !w-auto !py-2" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        }
      />
      {data && data.total > LIMIT && (
        <p className="text-xs text-navy-500">Showing the latest {LIMIT} of {data.total} bookings — narrow the filters to see more.</p>
      )}
    </div>
  );
}
