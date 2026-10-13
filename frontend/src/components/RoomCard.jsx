import { useId } from 'react';
import Photo from '@/components/Photo';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { roomImage } from '@/lib/media';
import { calculateNights, formatCurrency } from '@/utils/formatters';

// Amenities as text (spec 11 §7.1): "Air conditioning, Wi-Fi, 2× TV".
export const amenityList = (amenities = []) =>
  amenities.map((a) => `${a.count > 1 ? `${a.count}× ` : ''}${a.amenity_name}`).join(', ');

// room: RoomOut from GET /api/rooms (nested). `stay` = { check_in, check_out, guests }.
// booked: another booking overlaps the chosen dates (front desk sees these, guests don't).
export default function RoomCard({ room, stay = {}, booked = false }) {
  const reasonId = useId();
  const { room_type: type, branch } = room;
  const nights = calculateNights(stay.check_in, stay.check_out);
  const hasDates = nights > 0;
  // room.status is tonight's occupancy, not future availability: an Occupied
  // room can still be booked for other dates (checked at checkout).
  const bookable = room.status !== 'Maintenance' && !booked;

  const q = new URLSearchParams();
  if (hasDates) {
    q.set('check_in', stay.check_in);
    q.set('check_out', stay.check_out);
  }
  if (stay.guests) q.set('guests', stay.guests);

  const title = `${type.type_name} · Room ${room.room_number}`;

  return (
    <article className="flex flex-col rounded-lg border border-ink-100 bg-paper-50">
      <Photo src={roomImage(type.type_name)} alt="" aspect="3/2" className="rounded-t-lg" />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-ink-900">{title}</h3>
          {hasDates && bookable && <Badge status="Available">Free for your dates</Badge>}
          {booked && <Badge status="Booked" />}
          {!booked && !bookable && <Badge status="Maintenance" />}
        </div>
        <p className="mt-0.5 text-sm text-ink-600">
          {branch.name} · Sleeps {type.capacity}
        </p>
        {room.amenities.length > 0 && <p className="mt-2 text-sm text-ink-600">{amenityList(room.amenities)}</p>}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-ink-100 pt-3">
          <p className="text-sm">
            <span className="font-semibold tabular text-ink-900">{formatCurrency(room.daily_rate)}</span>
            <span className="text-ink-600"> / night</span>
            {hasDates && (
              <span className="block text-2xs tabular text-ink-600">
                {formatCurrency(room.daily_rate * nights)} for {nights} night{nights > 1 ? 's' : ''}, before tax
              </span>
            )}
          </p>
          {bookable ? (
            <Button to={`/booking/${room.room_id}${q.size ? `?${q}` : ''}`} size="sm" aria-label={`Book this room: ${title}, ${branch.name}`}>
              Book this room
            </Button>
          ) : (
            <div className="text-right">
              <Button size="sm" disabled aria-describedby={reasonId}>Book this room</Button>
              <p id={reasonId} className="mt-1 text-2xs text-ink-600">{booked ? 'Booked for these dates' : 'Under maintenance'}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
