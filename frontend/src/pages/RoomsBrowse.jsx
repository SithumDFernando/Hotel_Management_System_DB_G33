import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRooms } from '@/api/rooms';
import { getBranches } from '@/api/auth';
import useFetch from '@/hooks/useFetch';
import useAuth from '@/hooks/useAuth';
import RoomCard, { amenityIcon } from '@/components/RoomCard';
import StaySearch from '@/components/StaySearch';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton, InlineAlert } from '@/components/ui/States';
import { calculateNights, formatDate } from '@/utils/formatters';

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
    <div className="card overflow-hidden">
      <Skeleton className="h-52 rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export default function RoomsBrowse() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();

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

  const branches = useFetch((s) => getBranches(s), []);
  const rooms = useFetch(
    // Without dates this is the catalogue: room.status is tonight's occupancy, so
    // filtering on it would hide rooms that are free on other dates.
    (signal) => getRooms(datesValid ? { check_in: value.check_in, check_out: value.check_out } : {}, signal),
    [datesValid, value.check_in, value.check_out],
  );

  const branchList = branches.data?.branches || [];
  const all = useMemo(() => (rooms.data || []).filter((r) => r.status !== 'Maintenance'), [rooms.data]);

  const types = useMemo(() => [...new Set(all.map((r) => r.room_type.type_name))].sort(), [all]);
  const amenityOptions = useMemo(() => {
    const names = new Map();
    all.forEach((r) => r.amenities.forEach((a) => names.set(a.amenity_name, (names.get(a.amenity_name) || 0) + 1)));
    return [...names.keys()].sort();
  }, [all]);

  // Everything except the branch filter, so tab counts stay meaningful.
  const base = useMemo(
    () =>
      all.filter(
        (r) =>
          r.room_type.capacity >= Number(value.guests) &&
          (!value.type || r.room_type.type_name === value.type) &&
          amenitySel.every((a) => r.amenities.some((x) => x.amenity_name === a)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, value.guests, value.type, amenitySel.join('|')],
  );
  const cityCounts = base.reduce((m, r) => ({ ...m, [r.branch.city]: (m[r.branch.city] || 0) + 1 }), {});
  const visible = useMemo(
    () => base.filter((r) => !value.city || r.branch.city === value.city).sort(sorters[sort] || sorters.recommended),
    [base, value.city, sort],
  );

  const toggleAmenity = (a) => update({}, amenitySel.includes(a) ? amenitySel.filter((x) => x !== a) : [...amenitySel, a]);
  const filtersActive = value.city || value.type || amenitySel.length || value.guests !== '1' || value.check_in;
  const clearAll = () => setParams(bookingMode ? { mode: 'booking' } : {}, { replace: true });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="eyebrow">{bookingMode ? `New booking${user ? ` · ${user.email}` : ''}` : 'Boutique living across Sri Lanka'}</p>
        <h1 className="mt-1 text-4xl font-semibold sm:text-5xl">
          {bookingMode ? 'Select a room to book' : 'Explore our suites & rooms'}
        </h1>
        <p className="mt-3 max-w-2xl text-navy-500">
          Handcrafted stays across Colombo’s ocean horizon, Kandy’s misty tea country and Galle Fort’s historic ramparts.
        </p>
      </header>

      <section className="card p-5" aria-label="Search filters">
        <StaySearch
          branches={branchList}
          types={types}
          value={value}
          showType
          onChange={(v) => update(v)}
        />
        {partialDates && (
          <div className="mt-3"><InlineAlert tone="warn">Pick both check-in and check-out to see availability for your dates.</InlineAlert></div>
        )}
        {amenityOptions.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Amenities</span>
            {amenityOptions.map((a) => {
              const on = amenitySel.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleAmenity(a)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    on ? 'bg-gold-700 text-white' : 'bg-navy-50 text-navy-700 hover:bg-navy-100'
                  }`}
                >
                  <Icon name={amenityIcon(a)} className="h-3 w-3" /> {a}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            {rooms.isLoading ? 'Searching…' : `${visible.length} ${visible.length === 1 ? 'room' : 'rooms'}${datesValid ? ' available' : ''}`}
          </h2>
          <p className="text-xs text-navy-500">
            {datesValid
              ? `${formatDate(value.check_in)} – ${formatDate(value.check_out)} · ${nights} night${nights > 1 ? 's' : ''}`
              : 'Choose dates to check availability.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Filter by branch" className="flex rounded-xl bg-navy-50 p-1">
            {[{ city: '', label: 'All', n: base.length }, ...Object.keys(cityCounts).sort().map((c) => ({ city: c, label: c, n: cityCounts[c] }))].map((t) => (
              <button
                key={t.label}
                onClick={() => update({ city: t.city })}
                aria-pressed={value.city === t.city}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${value.city === t.city ? 'bg-white shadow-sm' : 'text-navy-600'}`}
              >
                {t.label} ({t.n})
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-navy-600">
            Sort
            <select className="input !w-auto !py-1.5" value={sort} onChange={(e) => update({ sort: e.target.value })}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5">
        {rooms.error ? (
          <ErrorState message={rooms.error} onRetry={rooms.refetch} />
        ) : rooms.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon="bed"
            title="No rooms match your search"
            message={datesValid ? 'Try different dates, another branch, or fewer filters.' : 'Try removing some filters.'}
            action={filtersActive ? <Button variant="outline" onClick={clearAll}>Clear all filters</Button> : null}
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
