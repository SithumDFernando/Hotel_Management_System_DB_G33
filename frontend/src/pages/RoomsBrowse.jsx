import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRooms } from '@/api/rooms';
import { getBranches } from '@/api/auth';
import useFetch from '@/hooks/useFetch';
import RoomCard from '@/components/RoomCard';
import StaySearch from '@/components/StaySearch';
import Button from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton, InlineAlert } from '@/components/ui/States';
import { calculateNights, formatStayRange } from '@/utils/formatters';

// Job: a guest (or a receptionist in ?mode=booking) narrows the list to rooms free
// for their dates and picks one.

const SORTS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
  { key: 'capacity', label: 'Capacity' },
];

const sorters = {
  recommended: () => 0,
  price_asc: (a, b) => a.daily_rate - b.daily_rate,
  price_desc: (a, b) => b.daily_rate - a.daily_rate,
  capacity: (a, b) => b.room_type.capacity - a.room_type.capacity,
};

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-ink-100 bg-paper-50">
      <Skeleton className="aspect-[3/2] w-full rounded-b-none rounded-t-lg" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export default function RoomsBrowse() {
  const [params, setParams] = useSearchParams();

  // All filters live in the URL so searches are shareable and survive back/forward.
  const value = {
    city: params.get('city') || '',
    type: params.get('type') || '',
    check_in: params.get('check_in') || '',
    check_out: params.get('check_out') || '',
    guests: params.get('guests') || '1',
  };
  const amenitySel = params.getAll('amenity');
  const sort = params.get('sort') || 'recommended';
  const bookingMode = params.get('mode') === 'booking';

  const update = (patch, amenities = amenitySel) => {
    const next = new URLSearchParams();
    const { sort: nextSort = sort, ...filters } = { ...value, ...patch };
    Object.entries(filters).forEach(([k, v]) => v && !(k === 'guests' && v === '1') && next.set(k, v));
    amenities.forEach((a) => next.append('amenity', a));
    if (nextSort !== 'recommended') next.set('sort', nextSort);
    if (bookingMode) next.set('mode', 'booking');
    setParams(next, { replace: true });
  };

  const nights = calculateNights(value.check_in, value.check_out);
  const datesValid = nights > 0;
  const partialDates = Boolean(value.check_in) !== Boolean(value.check_out);
  // Both dates set but out of order (only reachable through an edited URL): no dated search.
  const datesInvalid = Boolean(value.check_in && value.check_out) && !datesValid;

  const branches = useFetch((s) => getBranches(s), []);
  const rooms = useFetch(
    // Without dates this is the catalogue: room.status is tonight's occupancy, so
    // filtering on it would hide rooms that are free on other dates.
    (signal) => getRooms(datesValid ? { check_in: value.check_in, check_out: value.check_out } : {}, signal),
    [datesValid, value.check_in, value.check_out],
    { failMessage: "Couldn't load rooms." },
  );

  const branchList = branches.data?.branches || [];
  const all = useMemo(() => (rooms.data || []).filter((r) => r.status !== 'Maintenance'), [rooms.data]);

  const types = useMemo(() => [...new Set(all.map((r) => r.room_type.type_name))].sort(), [all]);
  const amenityOptions = useMemo(() => {
    const names = new Set();
    all.forEach((r) => r.amenities.forEach((a) => names.add(a.amenity_name)));
    return [...names].sort();
  }, [all]);

  const visible = useMemo(
    () =>
      all
        .filter(
          (r) =>
            r.room_type.capacity >= Number(value.guests) &&
            (!value.type || r.room_type.type_name === value.type) &&
            (!value.city || r.branch.city === value.city) &&
            amenitySel.every((a) => r.amenities.some((x) => x.amenity_name === a)),
        )
        .sort(sorters[sort] || sorters.recommended),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, value.guests, value.type, value.city, amenitySel.join('|'), sort],
  );

  const toggleAmenity = (a) => update({}, amenitySel.includes(a) ? amenitySel.filter((x) => x !== a) : [...amenitySel, a]);
  const filtersActive = value.city || value.type || amenitySel.length || value.guests !== '1' || value.check_in;
  const clearAll = () => setParams(bookingMode ? { mode: 'booking' } : {}, { replace: true });

  // Live context line: "12 rooms free in Kandy, 14/11–16/11" or "All rooms".
  const where = value.city ? ` in ${value.city}` : '';
  const range = formatStayRange(value.check_in, value.check_out);
  const n = visible.length;
  const summary = rooms.isLoading
    ? 'Checking rooms…'
    : datesValid
      ? `${n} ${n === 1 ? 'room' : 'rooms'} free${where}, ${range} (${nights} night${nights > 1 ? 's' : ''})`
      : filtersActive
        ? `${n} ${n === 1 ? 'room' : 'rooms'}${where}. Choose dates to see which are free.`
        : `All rooms. Choose dates to see which are free.`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        {bookingMode ? (
          <h1 className="text-xl font-semibold text-ink-900">New booking: choose a room</h1>
        ) : (
          <h1 className="font-display text-[32px] font-semibold leading-tight text-ink-900">Rooms</h1>
        )}
        <p className="mt-1 text-sm text-ink-600" aria-live="polite">{summary}</p>
      </header>

      <section className="card p-4" aria-label="Search filters">
        <StaySearch
          branches={branchList}
          types={types}
          value={value}
          showType
          onChange={(v) => update(v)}
          error={datesInvalid ? 'Choose a check-out date after check-in.' : undefined}
        />
        {partialDates && (
          <div className="mt-3"><InlineAlert tone="info">Pick both check-in and check-out to see which rooms are free on your dates.</InlineAlert></div>
        )}
        {amenityOptions.length > 0 && (
          <fieldset className="mt-4 border-t border-ink-100 pt-4">
            <legend className="sr-only">Amenities</legend>
            <div className="flex flex-wrap items-center gap-2">
              <span aria-hidden="true" className="mr-1 text-[13px] font-medium text-ink-900">Amenities</span>
              {amenityOptions.map((a) => {
                const on = amenitySel.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleAmenity(a)}
                    className={`rounded-sm border px-2.5 py-1 text-[13px] transition-colors duration-150 ${
                      on ? 'border-tea-500 bg-tea-100 text-tea-900' : 'border-ink-100 bg-paper-50 text-ink-900 hover:bg-paper-200'
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-900">
          {rooms.isLoading ? 'Searching…' : `${n} ${n === 1 ? 'room' : 'rooms'}`}
        </h2>
        <label className="flex items-center gap-2 text-[13px] font-medium text-ink-900">
          Sort
          <select className="input !w-auto !py-1.5" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4">
        {rooms.error ? (
          <ErrorState message={rooms.error} onRetry={rooms.refetch} />
        ) : rooms.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title={datesValid ? `No rooms free for ${range}${where}` : `No rooms match${where ? where : ' these filters'}`}
            message={datesValid ? 'Try other dates or another branch.' : 'Remove a filter to see more rooms.'}
            action={filtersActive ? <Button variant="secondary" onClick={clearAll}>Clear filters</Button> : null}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((r) => <RoomCard key={r.room_id} room={r} stay={value} />)}
          </div>
        )}
      </div>
    </div>
  );
}
