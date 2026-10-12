import Photo from '@/components/Photo';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { roomImage } from '@/lib/media';
import { calculateNights, formatCurrency } from '@/utils/formatters';

const AMENITY_ICON = {
  wifi: 'wifi',
  'air conditioning': 'snow',
  tv: 'tv',
  'mini-bar': 'coffee',
  balcony: 'sun',
  'king bed': 'bed',
  'pool access': 'waves',
  jacuzzi: 'waves',
};

export const amenityIcon = (name) => AMENITY_ICON[name.toLowerCase()] || 'sparkles';

// room: RoomOut from GET /api/rooms (nested). `stay` = { check_in, check_out, guests }.
export default function RoomCard({ room, stay = {} }) {
  const { room_type: type, branch } = room;
  const nights = calculateNights(stay.check_in, stay.check_out);
  const hasDates = nights > 0;
  // room.status is tonight's occupancy, not future availability: an Occupied
  // room can still be booked for other dates (checked at checkout).
  const bookable = room.status !== 'Maintenance';

  const q = new URLSearchParams();
  if (hasDates) {
    q.set('check_in', stay.check_in);
    q.set('check_out', stay.check_out);
  }
  if (stay.guests) q.set('guests', stay.guests);

  const amenities = room.amenities.slice(0, 3);
  const more = room.amenities.length - amenities.length;

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <Photo src={roomImage(type.type_name)} alt={`${type.type_name} ${room.room_number}`} className="h-52">
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-800">
          {type.type_name}
        </span>
        <div className="absolute inset-x-4 bottom-3 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gold-200">{branch.name}</p>
          <p className="text-xs text-navy-100"><Icon name="mapPin" className="mr-1 inline h-3 w-3" />{branch.city}</p>
        </div>
      </Photo>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-semibold">{type.type_name} Room {room.room_number}</h3>
        <p className="mt-1 text-xs text-navy-500">
          <Icon name="users" className="mr-1 inline h-3.5 w-3.5" />Sleeps up to {type.capacity}
        </p>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {amenities.map((a) => (
            <li key={a.amenity_name} className="inline-flex items-center gap-1 rounded-lg bg-navy-50 px-2 py-1 text-[11px] font-semibold text-navy-700">
              <Icon name={amenityIcon(a.amenity_name)} className="h-3 w-3" />
              {a.count > 1 ? `${a.count}× ` : ''}{a.amenity_name}
            </li>
          ))}
          {more > 0 && <li className="rounded-lg bg-navy-50 px-2 py-1 text-[11px] font-semibold text-navy-500">+{more} more</li>}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-navy-100 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">Standard rate</p>
            <p className="font-serif text-xl font-semibold">{formatCurrency(room.daily_rate)}</p>
            <p className="text-[11px] text-navy-500">
              {hasDates ? `${formatCurrency(room.daily_rate * nights)} for ${nights} night${nights > 1 ? 's' : ''}` : 'per night'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {hasDates && <Badge status="Available">Available for your dates</Badge>}
            <Button to={`/booking/${room.room_id}${q.size ? `?${q}` : ''}`} disabled={!bookable} aria-disabled={!bookable} className={bookable ? '' : 'pointer-events-none opacity-50'}>
              Book now <Icon name="arrowRight" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
