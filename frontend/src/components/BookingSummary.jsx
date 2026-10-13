import Badge from '@/components/ui/Badge';
import { bookingRef, calculateNights, formatCurrency, formatNumericDate } from '@/utils/formatters';

// booking: BookingListOut / BookingDetailOut from the API. `children` = action buttons.
// Shows the booked rate, not a computed total: the bill (from the database) is the total.
export default function BookingSummary({ booking, children, showGuest = false }) {
  const { room } = booking;
  const nights = calculateNights(booking.check_in_date, booking.check_out_date);
  return (
    <article className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-ink-900">
          {room.type_name ? `${room.type_name} · ` : ''}Room {room.room_number} · {room.branch_name}
        </h3>
        <Badge status={booking.status} />
      </div>
      {showGuest && <p className="mt-0.5 text-sm font-medium text-ink-900">{booking.guest.full_name}</p>}
      <p className="mt-1 text-sm tabular text-ink-600">
        {formatNumericDate(booking.check_in_date)} → {formatNumericDate(booking.check_out_date)} · {nights} night{nights === 1 ? '' : 's'} ·{' '}
        {bookingRef(booking.booking_id)}
      </p>
      <p className="mt-0.5 text-sm tabular text-ink-600">
        Rate {formatCurrency(booking.rate_at_booking)} / night
      </p>
      {children && <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-3">{children}</div>}
    </article>
  );
}
