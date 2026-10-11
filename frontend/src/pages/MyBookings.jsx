import { useEffect, useMemo, useState } from 'react';
import { cancelBooking, listBookings } from '@/api/bookings';
import { getBill, getPayments } from '@/api/billing';
import { getUsage } from '@/api/services';
import useFetch from '@/hooks/useFetch';
import BillTable from '@/components/BillTable';
import BookingSummary from '@/components/BookingSummary';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import Tabs from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { bookingRef, errorMessage, formatCurrency, formatDate } from '@/utils/formatters';

const GROUPS = {
  upcoming: (b) => b.status === 'Booked' || b.status === 'Checked-In',
  past: (b) => b.status === 'Checked-Out',
  cancelled: (b) => b.status === 'Cancelled',
};

function BillModal({ booking, onClose }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let live = true;
    Promise.allSettled([getBill(booking.booking_id), getPayments(booking.booking_id), getUsage(booking.booking_id)]).then(
      ([bill, payments, usage]) => {
        if (!live) return;
        if (bill.status === 'rejected' && bill.reason?.response?.status !== 404) {
          setState({ error: errorMessage(bill.reason) });
          return;
        }
        setState({
          bill: bill.status === 'fulfilled' ? bill.value : null,
          payments: payments.status === 'fulfilled' ? payments.value : [],
          usage: usage.status === 'fulfilled' ? usage.value : null,
        });
      },
    );
    return () => {
      live = false;
    };
  }, [booking.booking_id]);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Bill · ${bookingRef(booking.booking_id)}`}
      subtitle={`${booking.room.type_name || ''} Room ${booking.room.room_number} · ${booking.room.branch_name} · ${formatDate(booking.check_in_date)} – ${formatDate(booking.check_out_date)}`}
    >
      {state.loading ? (
        <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : state.error ? (
        <ErrorState message={state.error} />
      ) : (
        <div className="space-y-6">
          {state.bill ? (
            <BillTable bill={state.bill} payments={state.payments} />
          ) : (
            <InlineAlert tone="warn">
              Your bill hasn’t been generated yet. It is prepared by the front desk at check-out and will include your room charges, services and tax.
            </InlineAlert>
          )}
          {state.usage?.usages.length > 0 && (
            <section aria-label="Services used">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-600">Services used</h3>
              <ul className="divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100 text-sm">
                {state.usage.usages.map((u) => (
                  <li key={u.usage_id} className="flex items-center justify-between px-4 py-2.5">
                    <span>{u.service_name} <span className="text-navy-400">× {u.quantity} · {formatDate(u.usage_date)}</span></span>
                    <span className="font-semibold tabular-nums">{formatCurrency(u.line_total)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function MyBookings() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useFetch((s) => listBookings({}, s), []);
  const [tab, setTab] = useState('upcoming');
  const [billFor, setBillFor] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const bookings = data?.bookings || [];
  const grouped = useMemo(
    () => Object.fromEntries(Object.entries(GROUPS).map(([k, fn]) => [k, bookings.filter(fn)])),
    [bookings],
  );
  const tabs = [
    { key: 'upcoming', label: 'Upcoming & active', count: grouped.upcoming.length },
    { key: 'past', label: 'Past stays', count: grouped.past.length },
    { key: 'cancelled', label: 'Cancelled', count: grouped.cancelled.length },
  ];
  const shown = [...grouped[tab]].sort((a, b) =>
    tab === 'upcoming' ? a.check_in_date.localeCompare(b.check_in_date) : b.check_in_date.localeCompare(a.check_in_date),
  );

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await cancelBooking(cancelFor.booking_id);
      toast.success(`Booking ${bookingRef(cancelFor.booking_id)} cancelled`);
      setCancelFor(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your stays</p>
          <h1 className="mt-1 text-4xl font-semibold">My bookings</h1>
        </div>
        <Button to="/rooms">Book a stay <Icon name="arrowRight" /></Button>
      </header>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-5 w-fit max-w-full" />

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={tab === 'upcoming' ? 'No upcoming stays' : tab === 'past' ? 'No past stays yet' : 'No cancelled bookings'}
          message={tab === 'upcoming' ? 'Find a room and plan your next getaway.' : undefined}
          action={tab === 'upcoming' ? <Button to="/rooms">Browse rooms</Button> : null}
        />
      ) : (
        <div className="space-y-4">
          {shown.map((b) => (
            <BookingSummary key={b.booking_id} booking={b}>
              {b.status !== 'Cancelled' && (
                <Button variant="outline" size="sm" onClick={() => setBillFor(b)}>
                  <Icon name="receipt" className="h-3.5 w-3.5" /> Bill &amp; services
                </Button>
              )}
              {b.status === 'Booked' && (
                <Button variant="dangerOutline" size="sm" onClick={() => setCancelFor(b)}>Cancel booking</Button>
              )}
            </BookingSummary>
          ))}
        </div>
      )}

      {billFor && <BillModal booking={billFor} onClose={() => setBillFor(null)} />}

      <Modal
        open={Boolean(cancelFor)}
        onClose={() => setCancelFor(null)}
        size="sm"
        title="Cancel this booking?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelFor(null)}>Keep booking</Button>
            <Button variant="danger" loading={busy} onClick={confirmCancel}>Yes, cancel</Button>
          </div>
        }
      >
        {cancelFor && (
          <p className="text-sm text-navy-600">
            {cancelFor.room.type_name} Room {cancelFor.room.room_number} at {cancelFor.room.branch_name},{' '}
            {formatDate(cancelFor.check_in_date)} – {formatDate(cancelFor.check_out_date)}. This can’t be undone.
          </p>
        )}
      </Modal>
    </div>
  );
}
