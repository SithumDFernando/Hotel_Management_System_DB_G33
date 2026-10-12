import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getRoom, getRooms } from '@/api/rooms';
import { createBooking } from '@/api/bookings';
import { getGuest } from '@/api/guests';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import GuestPicker from '@/components/GuestPicker';
import Photo from '@/components/Photo';
import { amenityIcon } from '@/components/RoomCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { roomImage } from '@/lib/media';
import {
  MAX_STAY_NIGHTS, TAX_RATE, addDays, bookingRef, calculateNights, errorMessage, formatCurrency, formatDate, todayISO,
} from '@/utils/formatters';

const PAYMENT_OPTIONS = [
  { value: 'Credit Card', icon: 'card', hint: 'Visa, Mastercard, Amex' },
  { value: 'Cash', icon: 'cash', hint: 'Pay at the front desk' },
  { value: 'Bank Transfer', icon: 'bank', hint: 'Slips / CEFT reference' },
];

function Section({ n, title, children, aside }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-serif text-xl font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-gold-200">{n}</span>
          {title}
        </h2>
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
  const dateError = !checkIn || !checkOut
    ? 'Choose check-in and check-out dates.'
    : checkIn < today
      ? 'Check-in cannot be in the past.'
      : nights < 1
        ? 'Check-out must be after check-in.'
        : nights > MAX_STAY_NIGHTS
          ? `Stays longer than ${MAX_STAY_NIGHTS} nights must be arranged with the front desk.`
          : '';

  const r = room.data;
  const subtotal = r ? r.daily_rate * nights : 0;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;
  const roomUnavailable = r && r.status === 'Maintenance';
  const guestMissing = isGuest ? !user.guest_id : !pickedGuest;
  const canSubmit = r && !roomUnavailable && !dateError && !guestMissing && !busy;

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
      toast.success('Booking confirmed');
    } catch (err) {
      if (err.response?.status === 409) {
        setConflict(errorMessage(err, 'This room is already booked for the selected dates.'));
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const altLink = (id) => `/booking/${id}?check_in=${checkIn}&check_out=${checkOut}`;

  // ── Confirmation ──────────────────────────────────────────────
  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14">
        <div className="card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon name="check" className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <h1 className="mt-4 text-3xl font-semibold">Booking confirmed</h1>
          <p className="mt-1 text-navy-500">Reference <strong className="text-navy-900">{bookingRef(done.booking_id)}</strong></p>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-navy-50 p-5 text-left text-sm">
            <div><dt className="text-[11px] uppercase tracking-wider text-navy-400">Room</dt><dd className="font-semibold">{r.room_type.type_name} {r.room_number} · {r.branch.name}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-wider text-navy-400">Guest</dt><dd className="font-semibold">{guest?.full_name}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-wider text-navy-400">Stay</dt><dd className="font-semibold">{formatDate(done.check_in_date)} → {formatDate(done.check_out_date)}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-wider text-navy-400">Estimated total</dt><dd className="font-semibold">{formatCurrency(total)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-navy-500">Your final bill is generated at check-out and includes any services used during the stay.</p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isGuest ? (
              <Button to="/my-bookings">View my bookings</Button>
            ) : (
              <Button to={user.role === 'manager' ? '/dashboard/manager' : '/dashboard/receptionist'}>Back to dashboard</Button>
            )}
            <Button variant="outline" to="/rooms">Book another room</Button>
          </div>
        </div>
      </div>
    );
  }

  if (room.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <ErrorState message={room.error.includes('404') || /not found/i.test(room.error) ? 'This room could not be found.' : room.error} onRetry={room.refetch} />
        <div className="mt-4 text-center"><Button variant="outline" to="/rooms">Back to rooms</Button></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-4 text-xs text-navy-500" aria-label="Breadcrumb">
        <Link to="/rooms" className="hover:text-gold-700">Rooms</Link> / <span>Booking</span>
      </nav>
      <h1 className="text-4xl font-semibold">Complete your booking</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Section n="1" title="Selected room" aside={<Link to={`/rooms?${new URLSearchParams({ check_in: checkIn, check_out: checkOut })}`} className="text-xs font-semibold text-gold-700 hover:underline">Change room</Link>}>
            {room.isLoading || !r ? (
              <div className="flex gap-4"><Skeleton className="h-28 w-40" /><div className="flex-1 space-y-2"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /></div></div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row">
                <Photo src={roomImage(r.room_type.type_name)} alt="" className="h-36 w-full shrink-0 rounded-xl sm:w-52" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold">{r.room_type.type_name} Room {r.room_number}</h3>
                    <Badge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-navy-500"><Icon name="mapPin" className="mr-1 inline h-3.5 w-3.5" />{r.branch.name}, {r.branch.city}</p>
                  <p className="text-sm text-navy-500"><Icon name="users" className="mr-1 inline h-3.5 w-3.5" />Up to {r.room_type.capacity} guests</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {r.amenities.map((a) => (
                      <li key={a.amenity_name} className="inline-flex items-center gap-1 rounded-lg bg-navy-50 px-2 py-1 text-[11px] font-semibold text-navy-700">
                        <Icon name={amenityIcon(a.amenity_name)} className="h-3 w-3" />{a.amenity_name}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 font-serif text-lg font-semibold">{formatCurrency(r.daily_rate)} <span className="font-sans text-xs font-normal text-navy-500">/ night</span></p>
                </div>
              </div>
            )}
            {roomUnavailable && <div className="mt-4"><InlineAlert>This room is under maintenance and cannot be booked.</InlineAlert></div>}
          </Section>

          <Section n="2" title={isGuest ? 'Guest' : 'Guest profile'}>
            {isGuest ? (
              me.isLoading ? <Skeleton className="h-12 w-full" /> : guest ? (
                <div className="rounded-xl bg-navy-50 p-4 text-sm">
                  <p className="font-semibold">{guest.full_name}</p>
                  <p className="text-xs text-navy-500">{guest.email} · {guest.phone}</p>
                </div>
              ) : <InlineAlert>We couldn’t load your guest profile. Please sign in again.</InlineAlert>
            ) : (
              <GuestPicker value={pickedGuest} onChange={setPickedGuest} />
            )}
          </Section>

          <Section n="3" title="Stay dates" aside={nights > 0 && <Badge tone="amber">{nights} night{nights > 1 ? 's' : ''}</Badge>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Check-in</span>
                <input type="date" className="input" min={today} value={checkIn}
                  onChange={(e) => { setCheckIn(e.target.value); setConflict(''); if (checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1)); }} />
              </label>
              <label className="block">
                <span className="label">Check-out</span>
                <input type="date" className="input" min={addDays(checkIn || today, 1)} value={checkOut}
                  onChange={(e) => { setCheckOut(e.target.value); setConflict(''); }} />
              </label>
            </div>
            {dateError && <p role="alert" className="mt-2 text-xs text-red-600">{dateError}</p>}
          </Section>

          <Section n="4" title="Payment method">
            <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-3">
              {PAYMENT_OPTIONS.map((o) => {
                const on = payment === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPayment(o.value)}
                    className={`rounded-xl border p-4 text-left transition ${on ? 'border-gold-600 bg-gold-50 ring-1 ring-gold-600' : 'border-navy-100 hover:border-navy-300'}`}
                  >
                    <Icon name={o.icon} className={`h-5 w-5 ${on ? 'text-gold-700' : 'text-navy-500'}`} />
                    <p className="mt-2 text-sm font-semibold">{o.value}</p>
                    <p className="text-[11px] text-navy-500">{o.hint}</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-navy-500">No payment is taken now. Partial payments are accepted at the front desk, and the bill must be settled before check-out.</p>
          </Section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="font-serif text-xl font-semibold">Booking summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-navy-500">Stay</dt><dd className="font-medium">{nights > 0 ? `${formatDate(checkIn)} → ${formatDate(checkOut)}` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-500">Rate</dt><dd className="font-medium">{r ? `${formatCurrency(r.daily_rate)} × ${Math.max(nights, 0)}` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-500">Room subtotal</dt><dd className="font-medium">{formatCurrency(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-navy-500">Tax ({TAX_RATE * 100}%)</dt><dd className="font-medium">{formatCurrency(tax)}</dd></div>
            </dl>
            <div className="mt-4 border-t border-navy-100 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">Estimated total</p>
              <p className="font-serif text-3xl font-semibold">{formatCurrency(total)}</p>
              <p className="mt-1 text-[11px] text-navy-400">Excludes services (spa, laundry, etc.). The final bill is generated at check-out.</p>
            </div>

            {conflict && (
              <div className="mt-4 space-y-3">
                <InlineAlert>
                  <p className="font-semibold">Room not available</p>
                  <p>{conflict}</p>
                </InlineAlert>
                {alternates.isLoading ? <Skeleton className="h-12 w-full" /> : alternateList.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-500">Available alternatives</p>
                    <ul className="space-y-2">
                      {alternateList.map((a) => (
                        <li key={a.room_id}>
                          <Link to={altLink(a.room_id)} onClick={() => setConflict('')} className="flex items-center justify-between rounded-xl border border-navy-100 px-3 py-2 text-sm hover:bg-navy-50">
                            <span>{a.room_type.type_name} {a.room_number}</span>
                            <span className="text-xs font-semibold text-gold-700">{formatCurrency(a.daily_rate)} →</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-navy-500">No similar rooms are free on those dates. Try different dates.</p>
                )}
              </div>
            )}
            {error && <div className="mt-4"><InlineAlert>{error}</InlineAlert></div>}

            <Button size="lg" className="mt-5 w-full" onClick={submit} loading={busy} disabled={!canSubmit}>
              Confirm booking
            </Button>
            {!canSubmit && !busy && r && (
              <p className="mt-2 text-center text-[11px] text-navy-400">
                {guestMissing ? 'Select a guest to continue.' : dateError || ''}
              </p>
            )}
            <button type="button" onClick={() => navigate(-1)} className="mt-3 w-full text-center text-xs font-semibold text-navy-500 hover:text-navy-800">
              Cancel and go back
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
