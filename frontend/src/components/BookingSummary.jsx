import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import { bookingRef, calculateNights, formatCurrency, formatDate } from '@/utils/formatters';

// booking: BookingListOut / BookingDetailOut from the API. `children` = action buttons.
export default function BookingSummary({ booking, children, showGuest = false }) {
  const { room } = booking;
  const nights = calculateNights(booking.check_in_date, booking.check_out_date);
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">{bookingRef(booking.booking_id)}</p>
          <h3 className="text-xl font-semibold">
            {room.type_name ? `${room.type_name} ` : ''}Room {room.room_number}
          </h3>
          <p className="text-xs text-navy-500"><Icon name="mapPin" className="mr-1 inline h-3 w-3" />{room.branch_name}</p>
          {showGuest && <p className="mt-1 text-sm font-medium">{booking.guest.full_name}</p>}
        </div>
        <Badge status={booking.status} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-navy-400">Check-in</dt>
          <dd className="font-semibold">{formatDate(booking.check_in_date)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-navy-400">Check-out</dt>
          <dd className="font-semibold">{formatDate(booking.check_out_date)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-navy-400">Room total</dt>
          <dd className="font-semibold">{formatCurrency(booking.rate_at_booking * nights)}</dd>
          <dd className="text-[11px] text-navy-500">{nights} × {formatCurrency(booking.rate_at_booking)}</dd>
        </div>
      </dl>
      {children && <div className="mt-4 flex flex-wrap gap-2 border-t border-navy-100 pt-4">{children}</div>}
    </div>
  );
}
