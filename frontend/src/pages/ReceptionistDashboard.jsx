import { useEffect, useMemo, useState } from 'react';
import { cancelBooking, checkInBooking, checkOutBooking, listBookings } from '@/api/bookings';
import { getRooms } from '@/api/rooms';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import BillPaymentModal from '@/components/BillPaymentModal';
import { GuestFormDrawer } from '@/components/GuestPicker';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import RowMenu from '@/components/ui/RowMenu';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import SummaryStrip from '@/components/ui/SummaryStrip';
import { useToast } from '@/components/ui/Toast';
import {
  bookingRef, calculateNights, errorMessage, formatCurrency, formatNumericDate, formatStayRange, todayISO,
} from '@/utils/formatters';

const PAGE_SIZE = 10;

// perform_checkout's 402 detail is "Outstanding balance of LKR 17250.00 — pay before checkout".
// Spec 11 §9.1 wording, with the amount from the server.
const balanceDueMessage = (err) => {
  const amount = /LKR\s*([\d.,]+)/.exec(err.response?.data?.detail || '')?.[1]?.replace(/,/g, '');
  return amount
    ? `Balance due: ${formatCurrency(amount)}. Take payment before checking out.`
    : 'There is a balance due. Take payment before checking out.';
};

// Spec 11 §8: the receptionist lands on Today, a task list (departures due,
// arrivals, in-house) with one visible action per row.
export default function ReceptionistDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const today = todayISO();

  const [q, setQ] = useState('');
  const [billFor, setBillFor] = useState(null);
  const [billNotice, setBillNotice] = useState('');
  const [checkoutFor, setCheckoutFor] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [guestDrawer, setGuestDrawer] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  // Branch scoping is applied server-side from the JWT.
  const bookings = useFetch(async (signal) => {
    const [booked, inHouse] = await Promise.all([
      listBookings({ status: 'Booked' }, signal),
      listBookings({ status: 'Checked-In' }, signal),
    ]);
    return { booked: booked.bookings, inHouse: inHouse.bookings };
  }, []);
  const rooms = useFetch((s) => getRooms({ branch_id: user.branch_id, status: 'Available' }, s), [user.branch_id]);

  useEffect(() => {
    if (bookings.data) setUpdatedAt(new Date());
  }, [bookings.data]);

  const booked = bookings.data?.booked || [];
  const inHouse = bookings.data?.inHouse || [];

  const lists = useMemo(
    () => ({
      arrivals: booked.filter((b) => b.check_in_date <= today).sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)),
      inhouse: inHouse,
      departures: inHouse.filter((b) => b.check_out_date <= today),
      upcoming: booked.filter((b) => b.check_in_date > today).sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)),
    }),
    [booked, inHouse, today],
  );

  // Search filters every section at once.
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (b) =>
      !needle ||
      [b.guest.full_name, b.room.room_number, bookingRef(b.booking_id), b.room.type_name]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(needle));
    return {
      departures: lists.departures.filter(match),
      arrivals: lists.arrivals.filter(match),
      // Guests due out are listed under Departures, not twice.
      staying: lists.inhouse.filter((b) => b.check_out_date > today).filter(match),
      upcoming: lists.upcoming.filter(match),
    };
  }, [lists, q, today]);

  const refresh = () => {
    bookings.refetch();
    rooms.refetch();
  };

  const openBill = (b, notice = '') => {
    setBillNotice(notice);
    setBillFor(b);
  };

  const doCheckIn = async (b) => {
    setBusyId(b.booking_id);
    try {
      await checkInBooking(b.booking_id);
      toast.success(`Checked in: ${b.guest.full_name}, Room ${b.room.room_number}`);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const doCheckOut = async (b) => {
    setBusyId(b.booking_id);
    try {
      await checkOutBooking(b.booking_id);
      toast.success(`Checked out: ${b.guest.full_name}. Room ${b.room.room_number} is now available.`);
      setCheckoutFor(null);
      setBillFor(null);
      refresh();
    } catch (err) {
      // Unpaid charges (checkout recalculates the bill first): go straight to payment.
      if (err.response?.status === 402) {
        setCheckoutFor(null);
        openBill(b, balanceDueMessage(err));
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setBusyId(null);
    }
  };

  const doCancel = async () => {
    const b = cancelFor;
    setBusyId(b.booking_id);
    try {
      await cancelBooking(b.booking_id);
      toast.success(`Cancelled: ${b.guest.full_name}, Room ${b.room.room_number}, ${formatStayRange(b.check_in_date, b.check_out_date)}`);
      setCancelFor(null);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  // One visible action per row; the rest go in the row menu.
  const rowActions = (b, section) => {
    const busy = busyId === b.booking_id;
    const menuLabel = `More actions for ${b.guest.full_name}, Room ${b.room.room_number}`;
    if (b.status === 'Booked') {
      return {
        primary: section === 'arrivals' && b.check_out_date > today && (
          <Button size="sm" loading={busy} onClick={() => doCheckIn(b)}>Check in</Button>
        ),
        menu: <RowMenu label={menuLabel} items={[{ label: 'Cancel booking', onClick: () => setCancelFor(b) }]} />,
      };
    }
    const services = { label: 'Add service', to: `/services/${b.booking_id}` };
    const bill = { label: 'Bill and payments', onClick: () => openBill(b) };
    if (section === 'departures') {
      return {
        primary: <Button size="sm" loading={busy} onClick={() => setCheckoutFor(b)}>Check out</Button>,
        menu: <RowMenu label={menuLabel} items={[bill, services]} />,
      };
    }
    return {
      primary: <Button size="sm" variant="secondary" to={services.to}>Add service</Button>,
      menu: <RowMenu label={menuLabel} items={[bill, { label: 'Check out', onClick: () => setCheckoutFor(b) }]} />,
    };
  };

  // Same rules as perform_checkin: not before arrival, not once the stay has ended.
  const blockedReason = (b) => {
    if (b.status !== 'Booked') return null;
    if (b.check_in_date > today) return `Arrives on ${formatNumericDate(b.check_in_date)}`;
    if (b.check_out_date <= today) return 'Stay period has ended; cancel or rebook';
    return null;
  };

  const flags = (b) => (
    <>
      {b.status === 'Booked' && b.check_in_date < today && <Badge kind="problem">Overdue arrival</Badge>}
      {b.status === 'Checked-In' && b.check_out_date < today && <Badge kind="problem">Overdue checkout</Badge>}
      {b.status === 'Checked-In' && b.check_out_date === today && <Badge>Departs today</Badge>}
    </>
  );

  const loading = bookings.isLoading && !bookings.data;
  const nothingToday = !q && !lists.departures.length && !lists.arrivals.length && !lists.inhouse.length;

  const sectionProps = { loading, rowActions, blockedReason, flags, today };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Today</h1>
          <p className="mt-0.5 text-sm text-ink-600">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setGuestDrawer(true)}>Register guest</Button>
          <Button variant="secondary" to="/rooms?mode=booking">New booking</Button>
        </div>
      </header>

      <SummaryStrip
        className="mt-4"
        items={[
          { label: 'Arrivals today', value: lists.arrivals.length, loading },
          { label: 'In-house', value: lists.inhouse.length, loading },
          { label: 'Departures due', value: lists.departures.length, loading },
          { label: 'Rooms available', value: rooms.data?.length ?? '–', loading: rooms.isLoading && !rooms.data },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Guest, room or booking reference"
            aria-label="Search guest, room or booking reference"
            className="input pl-9"
          />
        </div>
        <Button variant="ghost" size="md" onClick={refresh} aria-label="Refresh lists" className="px-2.5">
          <Icon name="refresh" />
        </Button>
        {updatedAt && (
          <span className="text-2xs tabular text-ink-600">
            Updated {updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {bookings.error ? (
        <div className="mt-4"><ErrorState message={`Couldn't load today's bookings. ${bookings.error}`} onRetry={bookings.refetch} /></div>
      ) : (
        <div className="mt-6 space-y-8">
          {!loading && nothingToday ? (
            <EmptyState
              title="Nothing due today"
              message="New bookings appear here on their arrival date."
              action={<Button variant="secondary" to="/rooms?mode=booking">New booking</Button>}
            />
          ) : (
            <>
              <TaskSection id="departures" title="Departures due" rows={shown.departures} empty={q ? 'No matching departures.' : 'No departures due.'} {...sectionProps} />
              <TaskSection id="arrivals" title="Arrivals today" rows={shown.arrivals} empty={q ? 'No matching arrivals.' : 'No arrivals left today.'} {...sectionProps} />
              <TaskSection id="staying" title="Staying on" rows={shown.staying} empty={q ? 'No matching in-house guests.' : 'No in-house guests staying past today.'} {...sectionProps} />
            </>
          )}

          {!loading && lists.upcoming.length > 0 && (
            <details className="group rounded-lg border border-ink-100 bg-paper-50" open={Boolean(q) || undefined}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-4 py-3 text-sm font-medium text-ink-900">
                <span>
                  Upcoming arrivals <span className="tabular font-normal text-ink-600">· {shown.upcoming.length}</span>
                </span>
                <Icon name="chevronDown" className="h-4 w-4 text-ink-600 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-ink-100">
                <TaskSection id="upcoming" bare rows={shown.upcoming} empty="No matching upcoming arrivals." {...sectionProps} />
              </div>
            </details>
          )}
        </div>
      )}

      {billFor && (
        <BillPaymentModal
          booking={billFor}
          notice={billNotice}
          onClose={() => setBillFor(null)}
          onChanged={refresh}
          onCheckout={(b) => { setBillFor(null); setCheckoutFor(b); }}
        />
      )}

      <Modal
        open={Boolean(checkoutFor)}
        onClose={() => setCheckoutFor(null)}
        size="sm"
        title={checkoutFor ? `Check out ${checkoutFor.guest.full_name}?` : ''}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCheckoutFor(null)}>Not now</Button>
            <Button loading={busyId === checkoutFor?.booking_id} onClick={() => doCheckOut(checkoutFor)}>Check out</Button>
          </div>
        }
      >
        {checkoutFor && (
          <p className="text-sm text-ink-900">
            Room {checkoutFor.room.room_number} becomes available. The bill is recalculated first; if a balance is due, the payment window opens instead.
          </p>
        )}
      </Modal>

      <Modal
        open={Boolean(cancelFor)}
        onClose={() => setCancelFor(null)}
        size="sm"
        title="Cancel this booking?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelFor(null)}>Keep booking</Button>
            <Button variant="danger" loading={busyId === cancelFor?.booking_id} onClick={doCancel}>Cancel booking</Button>
          </div>
        }
      >
        {cancelFor && (
          <p className="text-sm text-ink-900">
            {cancelFor.guest.full_name}: Room {cancelFor.room.room_number} becomes available for{' '}
            {formatStayRange(cancelFor.check_in_date, cancelFor.check_out_date)}. This can’t be undone.
          </p>
        )}
      </Modal>

      <GuestFormDrawer open={guestDrawer} onClose={() => setGuestDrawer(false)} onCreated={() => {}} />
    </div>
  );
}

// One task list: a table from md up, stacked row cards on phones.
function TaskSection({ id, title, rows, empty, loading, bare, rowActions, blockedReason, flags }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const headingId = `${id}-heading`;

  const body = loading ? (
    <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
  ) : rows.length === 0 ? (
    <p className="px-4 py-4 text-sm text-ink-600">{empty}</p>
  ) : (
    <>
      <div className="relative hidden overflow-x-auto md:block">
        {/* Fixed columns so the stacked sections line up. */}
        <table className="w-full min-w-[720px] table-fixed" aria-labelledby={title ? headingId : undefined}>
          <colgroup>
            <col className="w-[24%]" /><col className="w-[12%]" /><col className="w-[16%]" /><col className="w-[22%]" /><col />
          </colgroup>
          <thead>
            <tr className="bg-paper-200">
              <th scope="col" className="th">Guest</th>
              <th scope="col" className="th">Room</th>
              <th scope="col" className="th">Stay</th>
              <th scope="col" className="th">Status</th>
              <th scope="col" className="th"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pageRows.map((b) => {
              const { primary, menu } = rowActions(b, id);
              const reason = blockedReason(b);
              const n = calculateNights(b.check_in_date, b.check_out_date);
              return (
                <tr key={b.booking_id} className="hover:bg-paper-100">
                  <td className="td">
                    <span className="font-medium text-ink-900">{b.guest.full_name}</span>
                    <span className="block font-mono text-2xs text-ink-600">{bookingRef(b.booking_id)}</span>
                  </td>
                  <td className="td">
                    <span className="tabular">{b.room.room_number}</span>
                    <span className="block text-2xs text-ink-600">{b.room.type_name}</span>
                  </td>
                  <td className="td whitespace-nowrap tabular">
                    {formatStayRange(b.check_in_date, b.check_out_date)}
                    <span className="block text-2xs text-ink-600">{n} night{n === 1 ? '' : 's'}</span>
                  </td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1"><Badge status={b.status} />{flags(b)}</div>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-2">
                      {reason && <span className="text-2xs text-ink-600">{reason}</span>}
                      {primary}
                      {menu}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-ink-100 md:hidden">
        {pageRows.map((b) => {
          const { primary, menu } = rowActions(b, id);
          const reason = blockedReason(b);
          return (
            <li key={b.booking_id} className="space-y-2 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm">
                  <span className="font-medium text-ink-900">{b.guest.full_name}</span>
                  <span className="text-ink-600"> · Room {b.room.room_number}{b.room.type_name ? `, ${b.room.type_name}` : ''}</span>
                </p>
                {menu}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-ink-600">
                <span className="tabular">{formatStayRange(b.check_in_date, b.check_out_date)}</span>
                <span className="font-mono">{bookingRef(b.booking_id)}</span>
                <Badge status={b.status} />
                {flags(b)}
              </div>
              {reason && <p className="text-2xs text-ink-600">{reason}</p>}
              {primary && <div className="[&>*]:w-full">{primary}</div>}
            </li>
          );
        })}
      </ul>
      {rows.length > PAGE_SIZE && (
        <div className="border-t border-ink-100">
          <Pagination page={current} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} />
        </div>
      )}
    </>
  );

  if (bare) return body;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2 text-base font-semibold text-ink-900">
        {title} <span className="tabular font-normal text-ink-600">· {loading ? '…' : rows.length}</span>
      </h2>
      <div className="overflow-hidden rounded-lg border border-ink-100 bg-paper-50">{body}</div>
    </section>
  );
}
