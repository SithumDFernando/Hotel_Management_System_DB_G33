import { useEffect, useMemo, useState } from 'react';
import { cancelBooking, listBookings } from '@/api/bookings';
import { getBill, getPayments } from '@/api/billing';
import { getUsage } from '@/api/services';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import BillTable from '@/components/BillTable';
import BookingSummary from '@/components/BookingSummary';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import Tabs from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { bookingRef, errorMessage, formatCurrency, formatNumericDate, formatStayRange } from '@/utils/formatters';

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
      title={`Bill · ${booking.room.type_name ? `${booking.room.type_name} ` : ''}Room ${booking.room.room_number}, ${formatStayRange(booking.check_in_date, booking.check_out_date)}`}
      subtitle={`${booking.room.branch_name} · Booking ${bookingRef(booking.booking_id)}`}
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
            <InlineAlert tone="info">
              No bill yet. The front desk prepares it at check-out, with room charges, services and tax.
            </InlineAlert>
          )}
          {state.usage?.usages.length > 0 && (
            <section aria-label="Services used">
              <h3 className="mb-2 text-sm font-semibold text-ink-900">Services used</h3>
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-md border border-ink-100 text-sm">
                {state.usage.usages.map((u) => (
                  <li key={u.usage_id} className="flex items-center justify-between px-4 py-2.5">
                    <span>{u.service_name} <span className="text-ink-600">× {u.quantity} · {formatNumericDate(u.usage_date)}</span></span>
                    <span className="font-medium tabular">{formatCurrency(u.line_total)}</span>
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
  const { user } = useAuth();
  // A guest login with no guest profile can't have bookings (the API answers 403)
  const noProfile = !user.guest_id;
  const { data, isLoading, error, refetch } = useFetch((s) => listBookings({}, s), [], { enabled: !noProfile });
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
    { key: 'upcoming', label: 'Upcoming', count: grouped.upcoming.length },
    { key: 'past', label: 'Past', count: grouped.past.length },
    { key: 'cancelled', label: 'Cancelled', count: grouped.cancelled.length },
  ];
  const shown = [...grouped[tab]].sort((a, b) =>
    tab === 'upcoming' ? a.check_in_date.localeCompare(b.check_in_date) : b.check_in_date.localeCompare(a.check_in_date),
  );

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await cancelBooking(cancelFor.booking_id);
      toast.success(`Cancelled: ${cancelFor.room.type_name ? `${cancelFor.room.type_name} ` : ''}Room ${cancelFor.room.room_number}, ${formatStayRange(cancelFor.check_in_date, cancelFor.check_out_date)}`);
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
        <h1 className="font-display text-[32px] font-semibold leading-tight text-ink-900">My bookings</h1>
        <Button variant="secondary" to="/rooms">Book a room</Button>
      </header>

      <Tabs tabs={tabs} value={tab} onChange={setTab} idBase="my-bookings" className="mb-5" />

      {noProfile ? (
        <EmptyState
          title="No guest profile linked"
          message="Your account isn’t linked to a guest profile yet, so there are no bookings to show. Contact the front desk to set it up."
        />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState
          title={tab === 'upcoming' ? 'No upcoming stays' : tab === 'past' ? 'No past stays yet' : 'No cancelled bookings'}
          message={
            tab === 'upcoming'
              ? 'Check availability to book a room.'
              : tab === 'past'
                ? 'Stays appear here after check-out.'
                : 'Bookings you cancel appear here.'
          }
          action={tab === 'upcoming' ? <Button to="/rooms">Check availability</Button> : null}
        />
      ) : (
        <div role="tabpanel" id={`my-bookings-panel-${tab}`} aria-labelledby={`my-bookings-tab-${tab}`} className="space-y-4">
          {shown.map((b) => (
            <BookingSummary key={b.booking_id} booking={b}>
              {b.status !== 'Cancelled' && (
                <Button variant="secondary" size="sm" onClick={() => setBillFor(b)}>View bill</Button>
              )}
              {b.status === 'Booked' && (
                <Button variant="secondary" size="sm" onClick={() => setCancelFor(b)}>Cancel booking</Button>
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
            <Button variant="danger" loading={busy} onClick={confirmCancel}>Cancel booking</Button>
          </div>
        }
      >
        {cancelFor && (
          <p className="text-sm text-ink-900">
            Room {cancelFor.room.room_number} at {cancelFor.room.branch_name} becomes available for{' '}
            {formatStayRange(cancelFor.check_in_date, cancelFor.check_out_date)}. This can’t be undone.
          </p>
        )}
      </Modal>
    </div>
  );
}
