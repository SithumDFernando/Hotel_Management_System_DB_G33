import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getRoom, getRooms } from '@/api/rooms';
import { createBooking } from '@/api/bookings';
import { getGuest } from '@/api/guests';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import { homeForRole } from '@/context/AuthContext';
import GuestPicker from '@/components/GuestPicker';
import Photo from '@/components/Photo';
import { amenityList } from '@/components/RoomCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { roomImage } from '@/lib/media';
import {
  MAX_STAY_NIGHTS, addDays, bookingRef, calculateNights, errorMessage, formatCurrency, formatNumericDate, formatStayRange, todayISO,
} from '@/utils/formatters';

// Job: a guest (or staff for a guest) confirms one room, dates and payment method and sees
// a labelled estimate. The database decides the final price (spec 11 §1.4, spec 09 §4).

// Values are sent to the API exactly as written.
const PAYMENT_OPTIONS = ['Cash', 'Credit Card', 'Bank Transfer'];

function Section({ title, aside, children }) {
  return (
    <section className="px-5 py-5 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function BookingCheckout() {
  const { roomId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isGuest = user.role === 'guest';

  const [checkIn, setCheckIn] = useState(params.get('check_in') || todayISO());
  const [checkOut, setCheckOut] = useState(params.get('check_out') || addDays(params.get('check_in') || todayISO(), 1));
  const [pickedGuest, setPickedGuest] = useState(null);
  const [payment, setPayment] = useState('Credit Card');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const room = useFetch((s) => getRoom(roomId, s), [roomId]);
  const me = useFetch((s) => getGuest(user.guest_id, s), [user.guest_id], { enabled: isGuest && Boolean(user.guest_id) });
  const guest = isGuest ? me.data : pickedGuest;

  const nights = calculateNights(checkIn, checkOut);
  const today = todayISO();
  // Mirrors the checks in create_booking (db/procedures/booking.sql).
  const dateError = !checkIn || !checkOut
    ? 'Choose check-in and check-out dates.'
    : checkIn < today
      ? 'Check-in can’t be in the past. Choose today or a later date.'
      : nights < 1
        ? 'Choose a check-out date after check-in.'
        : nights > MAX_STAY_NIGHTS
          ? `Stays are limited to ${MAX_STAY_NIGHTS} nights. For a longer stay, contact the front desk.`
          : '';

  const r = room.data;
  // The only browser arithmetic allowed: a labelled rate × nights estimate. Tax and
  // services are added by the database on the bill.
  const estimate = r && nights > 0 ? r.daily_rate * nights : 0;
  const roomUnavailable = r && r.status === 'Maintenance';
  const guestMissing = isGuest ? !user.guest_id : !pickedGuest;
  const canSubmit = r && !roomUnavailable && !dateError && !guestMissing && !busy;
  const blockedReason = roomUnavailable
    ? 'This room is under maintenance. Choose another room.'
    : guestMissing
      ? (isGuest ? 'Your guest profile is missing. Contact the front desk.' : 'Choose a guest to continue.')
      : dateError;

  // Suggest alternates only after the API reports an overlap.
  const alternates = useFetch(
    (s) => getRooms({ branch_id: r.branch.branch_id, room_type: r.room_type.type_name, check_in: checkIn, check_out: checkOut }, s),
    [conflict, checkIn, checkOut, r?.room_id],
    { enabled: Boolean(conflict && r) },
  );
  const alternateList = useMemo(
    () => (alternates.data || []).filter((x) => x.room_id !== roomId && x.status !== 'Maintenance').slice(0, 3),
    [alternates.data, roomId],
  );

  const roomTitle = r ? `${r.room_type.type_name} · Room ${r.room_number}` : '';

  const submit = async () => {
    setBusy(true);
    setError('');
    setConflict('');
    try {
      const booking = await createBooking({
        guest_id: isGuest ? user.guest_id : pickedGuest.guest_id,
        room_id: roomId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        payment_option: payment,
      });
      setDone(booking);
      toast.success(`Booked: ${r.room_type.type_name} ${r.room_number}, ${formatStayRange(booking.check_in_date, booking.check_out_date)}`);
    } catch (err) {
      if (err.response?.status === 409) {
        setConflict(errorMessage(err, 'This room is already booked for those dates.'));
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const altLink = (id) => `/booking/${id}?check_in=${checkIn}&check_out=${checkOut}`;
  const roomsLink = `/rooms?${new URLSearchParams({ check_in: checkIn, check_out: checkOut, ...(isGuest ? {} : { mode: 'booking' }) })}`;

  // ── Confirmation ──────────────────────────────────────────────
  if (done) {
    const n = calculateNights(done.check_in_date, done.check_out_date);
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <h1 className={isGuest ? 'font-display text-[32px] font-semibold leading-tight' : 'text-xl font-semibold'}>
          Booked: {roomTitle}, {r.branch.name}
        </h1>
        <p className="mt-2 text-sm tabular text-ink-600">
          {formatNumericDate(done.check_in_date)} → {formatNumericDate(done.check_out_date)} · {n} night{n === 1 ? '' : 's'} · Booking{' '}
          <span className="font-medium text-ink-900">{bookingRef(done.booking_id)}</span>
        </p>
        {guest?.full_name && <p className="mt-1 text-sm text-ink-600">Guest: {guest.full_name}</p>}
        <p className="mt-4 text-sm text-ink-600">The hotel calculates the final bill, including tax and any services used, when the guest checks out.</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {isGuest ? (
            <Button to="/my-bookings">View my bookings</Button>
          ) : (
            <Button to={homeForRole(user.role)}>{user.role === 'receptionist' ? 'Back to Today' : 'Back to dashboard'}</Button>
          )}
          <Button variant="ghost" to={isGuest ? '/rooms' : '/rooms?mode=booking'}>Book another room</Button>
        </div>
      </div>
    );
  }

  if (room.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <ErrorState message={room.error.includes('404') || /not found/i.test(room.error) ? 'This room no longer exists. Go back to the room list.' : room.error} onRetry={room.refetch} />
        <div className="mt-4 text-center"><Button variant="secondary" to="/rooms">Back to rooms</Button></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-3 text-[13px] text-ink-600" aria-label="Breadcrumb">
        <Link to={roomsLink} className="rounded-sm hover:text-ink-900 hover:underline">Rooms</Link> / <span>Booking</span>
      </nav>
      {r ? (
        <h1 className={isGuest ? 'font-display text-[32px] font-semibold leading-tight' : 'text-xl font-semibold'}>
          Book {roomTitle}, {r.branch.name}
        </h1>
      ) : (
        <Skeleton className="h-9 w-2/3" />
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-paper-50">
          <Section title="Room" aside={<Link to={roomsLink} className="rounded-sm text-[13px] font-medium text-tea-700 hover:underline">Change room</Link>}>
            {room.isLoading || !r ? (
              <div className="flex gap-4"><Skeleton className="h-28 w-40" /><div className="flex-1 space-y-2"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /></div></div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row">
                <Photo src={roomImage(r.room_type.type_name)} alt="" aspect="3/2" className="w-full shrink-0 rounded-md sm:w-48" />
                <div className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-ink-900">{roomTitle}</p>
                    {roomUnavailable && <Badge status="Maintenance" />}
                  </div>
                  <p className="mt-0.5 text-ink-600">{r.branch.name}, {r.branch.city} · Sleeps {r.room_type.capacity}</p>
                  {r.amenities.length > 0 && <p className="mt-2 text-ink-600">{amenityList(r.amenities)}</p>}
                  <p className="mt-2">
                    <span className="font-semibold tabular text-ink-900">{formatCurrency(r.daily_rate)}</span>
                    <span className="text-ink-600"> / night</span>
                  </p>
                </div>
              </div>
            )}
            {roomUnavailable && <div className="mt-4"><InlineAlert>This room is under maintenance and can’t be booked. Choose another room.</InlineAlert></div>}
          </Section>

          <Section title="Guest">
            {isGuest ? (
              me.isLoading ? <Skeleton className="h-12 w-full" /> : guest ? (
                <div className="text-sm">
                  <p className="font-medium text-ink-900">{guest.full_name}</p>
                  <p className="text-ink-600">{guest.email} · {guest.phone}</p>
                </div>
              ) : <InlineAlert>Your guest profile couldn’t be loaded. Sign out and sign in again; if it still fails, contact the front desk.</InlineAlert>
            ) : (
              <GuestPicker value={pickedGuest} onChange={setPickedGuest} />
            )}
          </Section>

          <Section title="Dates">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Check-in</span>
                <input type="date" className="input" min={today} value={checkIn}
                  aria-invalid={dateError ? true : undefined} aria-describedby={dateError ? 'date-error' : undefined}
                  onChange={(e) => { setCheckIn(e.target.value); setConflict(''); if (checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1)); }} />
              </label>
              <label className="block">
                <span className="label">Check-out</span>
                <input type="date" className="input" min={addDays(checkIn || today, 1)} value={checkOut}
                  aria-invalid={dateError ? true : undefined} aria-describedby={dateError ? 'date-error' : undefined}
                  onChange={(e) => { setCheckOut(e.target.value); setConflict(''); }} />
              </label>
            </div>
            {dateError ? (
              <p id="date-error" role="alert" className="mt-2 text-[13px] text-signal-700">{dateError}</p>
            ) : (
              <p className="mt-2 text-sm tabular text-ink-600">{nights} night{nights > 1 ? 's' : ''}</p>
            )}
          </Section>

          <Section title="Payment method">
            <fieldset>
              <legend className="sr-only">Payment method</legend>
              <div className="divide-y divide-ink-100 overflow-hidden rounded-md border border-ink-100">
                {PAYMENT_OPTIONS.map((o) => {
                  const on = payment === o;
                  return (
                    <label
                      key={o}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${on ? 'bg-tea-100 text-tea-900' : 'text-ink-900 hover:bg-paper-200'}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={o}
                        checked={on}
                        onChange={() => setPayment(o)}
                        className="h-4 w-4 accent-tea-700"
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="mt-3 text-sm text-ink-600">No payment is taken now. Pay at the front desk during the stay; the bill must be settled before check-out.</p>
          </Section>
        </div>

        {/* Summary: below the form on phones, sticky beside it on desktop. */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-ink-100 bg-paper-50 p-5">
            <h2 className="text-base font-semibold text-ink-900">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {r && <div className="flex justify-between gap-3"><dt className="text-ink-600">Room</dt><dd className="text-right font-medium">{roomTitle}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-ink-600">Dates</dt><dd className="text-right font-medium tabular">{nights > 0 ? `${formatNumericDate(checkIn)} → ${formatNumericDate(checkOut)}` : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-600">Rate</dt><dd className="text-right font-medium tabular">{r && nights > 0 ? `${formatCurrency(r.daily_rate)} × ${nights}` : '—'}</dd></div>
            </dl>
            <div className="mt-3 border-t border-ink-100 pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink-900">Estimate</span>
                <span className="text-lg font-semibold tabular text-ink-900">{formatCurrency(estimate)}</span>
              </div>
              <p className="mt-1 text-2xs text-ink-600">Before tax and services. The hotel calculates the final bill at check-out.</p>
            </div>

            {conflict && (
              <div className="mt-4 space-y-3">
                <InlineAlert>
                  {conflict.replace(/\.?\s*$/, '.')} Choose other dates or another room.
                </InlineAlert>
                {alternates.isLoading ? <Skeleton className="h-12 w-full" /> : alternateList.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium text-ink-900">Free on these dates</p>
                    <ul className="divide-y divide-ink-100 rounded-md border border-ink-100">
                      {alternateList.map((a) => (
                        <li key={a.room_id}>
                          <Link to={altLink(a.room_id)} onClick={() => setConflict('')} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-paper-200">
                            <span>{a.room_type.type_name} · Room {a.room_number}</span>
                            <span className="tabular text-tea-700">{formatCurrency(a.daily_rate)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-ink-600">
                    No similar rooms are free on those dates.{' '}
                    <Link to={roomsLink} className="rounded-sm font-medium text-tea-700 hover:underline">See all rooms for these dates</Link>
                  </p>
                )}
              </div>
            )}
            {error && <div className="mt-4"><InlineAlert>{error}</InlineAlert></div>}

            <Button className="mt-5 w-full" onClick={submit} loading={busy} disabled={!canSubmit} aria-describedby={!canSubmit && blockedReason ? 'book-blocked' : undefined}>
              Book this room
            </Button>
            {!canSubmit && !busy && r && blockedReason && (
              <p id="book-blocked" className="mt-2 text-center text-2xs text-ink-600">{blockedReason}</p>
            )}
            <button type="button" onClick={() => navigate(-1)} className="mt-3 w-full rounded-sm text-center text-[13px] text-ink-600 hover:text-ink-900 hover:underline">
              Go back
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
