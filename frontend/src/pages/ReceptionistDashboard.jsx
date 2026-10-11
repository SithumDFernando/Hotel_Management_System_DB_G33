import { useMemo, useState } from 'react';
import { cancelBooking, checkInBooking, checkOutBooking, listBookings } from '@/api/bookings';
import { getRooms } from '@/api/rooms';
import { getBranches } from '@/api/auth';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import BillPaymentModal from '@/components/BillPaymentModal';
import { GuestFormDrawer } from '@/components/GuestPicker';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import StatCard from '@/components/ui/StatCard';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import Tabs from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import {
  bookingRef, calculateNights, errorMessage, formatDate, formatShortDate, todayISO,
} from '@/utils/formatters';

const PAGE_SIZE = 10;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function ReceptionistDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const today = todayISO();

  const [tab, setTab] = useState('arrivals');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [billFor, setBillFor] = useState(null);
  const [checkoutFor, setCheckoutFor] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [guestDrawer, setGuestDrawer] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Branch scoping is applied server-side from the JWT.
  const bookings = useFetch(async (signal) => {
    const [booked, inHouse] = await Promise.all([
      listBookings({ status: 'Booked' }, signal),
      listBookings({ status: 'Checked-In' }, signal),
    ]);
    return { booked: booked.bookings, inHouse: inHouse.bookings };
  }, []);
  const rooms = useFetch((s) => getRooms({ branch_id: user.branch_id, status: 'Available' }, s), [user.branch_id]);
  const branches = useFetch((s) => getBranches(s), []);
  const branch = branches.data?.branches.find((b) => b.branch_id === user.branch_id);

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

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = lists[tab];
    if (!needle) return list;
    return list.filter((b) =>
      [b.guest.full_name, b.room.room_number, bookingRef(b.booking_id), b.room.type_name]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(needle)),
    );
  }, [lists, tab, q]);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tabs = [
    { key: 'arrivals', label: "Today's arrivals", count: lists.arrivals.length },
    { key: 'inhouse', label: 'In-house', count: lists.inhouse.length },
    { key: 'departures', label: 'Departures', count: lists.departures.length },
    { key: 'upcoming', label: 'Upcoming', count: lists.upcoming.length },
  ];

  const refresh = () => {
    bookings.refetch();
    rooms.refetch();
  };

  const doCheckIn = async (b) => {
    setBusyId(b.booking_id);
    try {
      await checkInBooking(b.booking_id);
      toast.success(`${b.guest.full_name} checked in to Room ${b.room.room_number}`);
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
      toast.success(`${b.guest.full_name} checked out. Room ${b.room.room_number} is now available.`);
      setCheckoutFor(null);
      setBillFor(null);
      refresh();
    } catch (err) {
      const status = err.response?.status;
      const msg = errorMessage(err);
      // Unpaid / ungenerated bill: take the receptionist straight to settlement.
      if (status === 402 || /bill/i.test(msg)) {
        toast.error(msg);
        setCheckoutFor(null);
        setBillFor(b);
      } else {
        toast.error(msg);
      }
    } finally {
      setBusyId(null);
    }
  };

  const doCancel = async () => {
    setBusyId(cancelFor.booking_id);
    try {
      await cancelBooking(cancelFor.booking_id);
      toast.success(`Booking ${bookingRef(cancelFor.booking_id)} cancelled`);
      setCancelFor(null);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const actions = (b) => {
    const busy = busyId === b.booking_id;
    if (b.status === 'Booked') {
      const early = b.check_in_date > today;
      return (
        <>
          <Button size="sm" loading={busy} disabled={early} title={early ? 'Check-in opens on the arrival date' : undefined} onClick={() => doCheckIn(b)}>
            Check in
          </Button>
          <Button size="sm" variant="dangerOutline" onClick={() => setCancelFor(b)}>Cancel</Button>
        </>
      );
    }
    return (
      <>
        <Button size="sm" variant="outline" to={`/services/${b.booking_id}`}>Services</Button>
        <Button size="sm" variant="outline" onClick={() => setBillFor(b)}>Bill</Button>
        <Button size="sm" variant="dark" loading={busy} onClick={() => setCheckoutFor(b)}>Check out</Button>
      </>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Front desk{branch ? ` · ${branch.name}` : ''}</p>
          <h1 className="mt-1 text-4xl font-semibold">{greeting()}</h1>
          <p className="mt-1 text-sm text-navy-500">
            <Icon name="calendar" className="mr-1 inline h-3.5 w-3.5" />
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setGuestDrawer(true)}><Icon name="user" /> Register guest</Button>
          <Button to="/rooms?mode=booking"><Icon name="plus" /> New booking</Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Arrivals today" icon="calendar" value={lists.arrivals.length} sub="Awaiting check-in" loading={bookings.isLoading} />
        <StatCard label="In-house guests" icon="users" tone="green" value={lists.inhouse.length} sub="Currently checked in" loading={bookings.isLoading} />
        <StatCard label="Departures due" icon="logout" tone="gold" value={lists.departures.length} sub="Check-out today or overdue" loading={bookings.isLoading} />
        <StatCard label="Rooms available" icon="bed" value={rooms.data?.length ?? '–'} sub="Ready to sell now" loading={rooms.isLoading} />
      </div>

      <section className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 p-4">
          <Tabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); setPage(1); }} className="max-w-full" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search guest, room or ref…" aria-label="Search bookings" className="input w-64 pl-9" />
            </div>
            <Button variant="outline" size="md" onClick={refresh} aria-label="Refresh"><Icon name="refresh" /></Button>
          </div>
        </div>

        {bookings.error ? (
          <div className="p-6"><ErrorState message={bookings.error} onRetry={bookings.refetch} /></div>
        ) : bookings.isLoading ? (
          <div className="space-y-3 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="calendar"
              title={q ? 'No matching bookings' : 'Nothing here right now'}
              message={q ? 'Try a different search term.' : tab === 'arrivals' ? 'No guests are waiting to check in.' : undefined}
              action={tab === 'arrivals' && !q ? <Button to="/rooms?mode=booking">Create a booking</Button> : null}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-navy-50">
                  <tr><th className="th">Booking</th><th className="th">Guest</th><th className="th">Room</th><th className="th">Dates</th><th className="th">Status</th><th className="th text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {pageRows.map((b) => {
                    const overdueArrival = b.status === 'Booked' && b.check_in_date < today;
                    const overdueDeparture = b.status === 'Checked-In' && b.check_out_date < today;
                    return (
                      <tr key={b.booking_id} className="hover:bg-navy-50/50">
                        <td className="td font-mono text-xs text-navy-500">{bookingRef(b.booking_id)}</td>
                        <td className="td font-semibold">{b.guest.full_name}</td>
                        <td className="td">
                          <span className="font-semibold">Room {b.room.room_number}</span>
                          <span className="block text-xs text-navy-500">{b.room.type_name}</span>
                        </td>
                        <td className="td whitespace-nowrap">
                          {formatShortDate(b.check_in_date)} → {formatDate(b.check_out_date)}
                          <span className="block text-xs text-navy-500">{calculateNights(b.check_in_date, b.check_out_date)} nights</span>
                        </td>
                        <td className="td">
                          <div className="flex flex-wrap gap-1">
                            <Badge status={b.status} />
                            {overdueArrival && <Badge tone="red">Overdue arrival</Badge>}
                            {overdueDeparture && <Badge tone="red">Overdue checkout</Badge>}
                            {!overdueDeparture && b.status === 'Checked-In' && b.check_out_date === today && <Badge tone="amber">Departs today</Badge>}
                          </div>
                        </td>
                        <td className="td"><div className="flex flex-wrap justify-end gap-1.5">{actions(b)}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-navy-100"><Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} /></div>
          </>
        )}
      </section>

      <p className="mt-4 text-xs text-navy-400">
        Need to add charges? Use <strong>Services</strong> on a checked-in guest. Bills are recalculated whenever you open them.
      </p>

      {billFor && (
        <BillPaymentModal
          booking={billFor}
          onClose={() => setBillFor(null)}
          onChanged={refresh}
          onCheckout={(b) => { setBillFor(null); setCheckoutFor(b); }}
        />
      )}

      <Modal
        open={Boolean(checkoutFor)}
        onClose={() => setCheckoutFor(null)}
        size="sm"
        title="Check out guest?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCheckoutFor(null)}>Not yet</Button>
            <Button loading={busyId === checkoutFor?.booking_id} onClick={() => doCheckOut(checkoutFor)}>Confirm check-out</Button>
          </div>
        }
      >
        {checkoutFor && (
          <div className="space-y-2 text-sm text-navy-600">
            <p><strong className="text-navy-900">{checkoutFor.guest.full_name}</strong> · Room {checkoutFor.room.room_number}</p>
            <p>The bill must be fully paid. If a balance remains, you’ll be taken to payment.</p>
          </div>
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
        {cancelFor && <p className="text-sm text-navy-600">{cancelFor.guest.full_name} · Room {cancelFor.room.room_number} · {formatDate(cancelFor.check_in_date)}. This can’t be undone.</p>}
      </Modal>

      <GuestFormDrawer open={guestDrawer} onClose={() => setGuestDrawer(false)} onCreated={() => {}} />
    </div>
  );
}
