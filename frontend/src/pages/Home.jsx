import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRooms } from '@/api/rooms';
import { getBranches } from '@/api/auth';
import useFetch from '@/hooks/useFetch';
import Photo from '@/components/Photo';
import StaySearch from '@/components/StaySearch';
import Icon from '@/components/ui/Icon';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { branchMedia, OPENING_IMAGE } from '@/lib/media';
import { addDays, formatCurrency, todayISO } from '@/utils/formatters';

// Job: a visitor sees SkyNest is three real hotels (Colombo, Kandy, Galle) and checks
// availability in one step (spec 11 §7.1). The search is the page's one primary action.

const amenityText = (amenities = []) => {
  const names = amenities.map((a) => a.amenity_name);
  if (names.length <= 4) return names.join(', ');
  return `${names.slice(0, 4).join(', ')} and ${names.length - 4} more`;
};

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState({ city: '', check_in: todayISO(), check_out: addDays(todayISO(), 2), guests: '2' });

  const branches = useFetch((s) => getBranches(s), []);
  const rooms = useFetch((s) => getRooms({}, s), []);

  const branchList = branches.data?.branches || [];

  // "From LKR x" per branch, and one row per room type.
  const { minByBranch, typeHighlights } = useMemo(() => {
    const all = (rooms.data || []).filter((r) => r.status !== 'Maintenance');
    const minByBranch = {};
    const types = {};
    all.forEach((r) => {
      const id = r.branch.branch_id;
      minByBranch[id] = Math.min(minByBranch[id] ?? Infinity, r.daily_rate);
      const t = (types[r.room_type.type_name] ||= { name: r.room_type.type_name, capacity: r.room_type.capacity, min: Infinity, amenities: r.amenities });
      t.min = Math.min(t.min, r.daily_rate);
    });
    return { minByBranch, typeHighlights: Object.values(types).sort((a, b) => a.min - b.min) };
  }, [rooms.data]);

  const submit = (v) => {
    const q = new URLSearchParams();
    Object.entries(v).forEach(([k, val]) => val && !(k === 'guests' && val === '1') && q.set(k, val));
    navigate(`/rooms?${q}`);
  };

  return (
    <>
      {/* Opening: name, one plain sentence, the availability search; photo beside, never behind. */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-12 lg:pt-16">
        <div>
          <h1 className="font-display text-[36px] font-semibold leading-tight text-ink-900 sm:text-[48px]">SkyNest Hotels</h1>
          <p className="mt-3 max-w-xl text-lg text-ink-600">
            Three hotels in Colombo, Kandy and Galle. Check a date and book a room online.
          </p>
          <div className="card mt-8 p-4">
            <StaySearch branches={branchList} value={search} onChange={setSearch} onSubmit={submit} compact />
          </div>
        </div>
        <Photo src={OPENING_IMAGE.image} alt={OPENING_IMAGE.alt} aspect="4/3" eager className="rounded-lg" />
      </section>

      {/* Three branches: same layout for each; only photo and sentence differ. */}
      {!(branches.data && branchList.length === 0) && (
        <section id="branches" aria-labelledby="branches-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 id="branches-title" className="font-display text-[32px] font-semibold leading-tight">Our hotels</h2>

          {branches.error ? (
            <div className="mt-8"><ErrorState message={branches.error} onRetry={branches.refetch} /></div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {branches.isLoading
                ? [...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-lg border border-ink-100 bg-paper-50">
                      <Skeleton className="aspect-[3/2] w-full rounded-b-none rounded-t-lg" />
                      <div className="space-y-2 p-5">
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                  ))
                : branchList.map((b) => {
                    const m = branchMedia(b.city);
                    const from = minByBranch[b.branch_id];
                    return (
                      <article key={b.branch_id} className="flex flex-col rounded-lg border border-ink-100 bg-paper-50">
                        <Photo src={m.image} alt={m.alt} aspect="3/2" className="rounded-t-lg" />
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="font-display text-2xl font-semibold leading-tight">{b.city}</h3>
                          <p className="text-sm text-ink-600">{b.name}</p>
                          {m.blurb && <p className="mt-3 text-sm text-ink-900">{m.blurb}</p>}
                          <address className="mb-4 mt-3 text-sm not-italic text-ink-600">
                            <span className="block">{b.address}</span>
                            {b.phone && (
                              <a href={`tel:${b.phone.replace(/\s+/g, '')}`} className="rounded-sm hover:text-ink-900 hover:underline">
                                {b.phone}
                              </a>
                            )}
                          </address>
                          <div className="mt-auto flex flex-col items-start gap-1 border-t border-ink-100 pt-4 text-sm">
                            {Number.isFinite(from) ? (
                              <span className="text-ink-600">
                                Rooms from <strong className="font-semibold tabular text-ink-900">{formatCurrency(from)}</strong>
                              </span>
                            ) : null}
                            <Link
                              to={`/rooms?city=${encodeURIComponent(b.city)}`}
                              className="inline-flex items-center gap-1 rounded-sm font-medium text-tea-700 hover:underline"
                            >
                              See rooms in {b.city} <Icon name="arrowRight" className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
            </div>
          )}
        </section>
      )}

      {/* Room types: compact list, amenities as text. Hidden on error (branches shows it). */}
      {!rooms.error && (rooms.isLoading || typeHighlights.length > 0) && (
        <section aria-labelledby="types-title" className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6">
          <h2 id="types-title" className="font-display text-[32px] font-semibold leading-tight">Room types</h2>

          {rooms.isLoading ? (
            <div className="mt-6 space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              {/* sm and up: table */}
              <div className="mt-6 hidden overflow-hidden rounded-lg border border-ink-100 bg-paper-50 sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-paper-200">
                    <tr>
                      <th scope="col" className="th">Room type</th>
                      <th scope="col" className="th text-right">Sleeps</th>
                      <th scope="col" className="th text-right">From, per night</th>
                      <th scope="col" className="th">Amenities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {typeHighlights.map((t) => (
                      <tr key={t.name}>
                        <td className="td">
                          <Link to={`/rooms?type=${encodeURIComponent(t.name)}`} className="rounded-sm font-medium text-tea-700 hover:underline">
                            {t.name}
                          </Link>
                        </td>
                        <td className="td text-right tabular">{t.capacity}</td>
                        <td className="td text-right tabular">{formatCurrency(t.min)}</td>
                        <td className="td text-ink-600">{amenityText(t.amenities) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* phone: stacked list */}
              <ul className="mt-6 divide-y divide-ink-100 rounded-lg border border-ink-100 bg-paper-50 sm:hidden">
                {typeHighlights.map((t) => (
                  <li key={t.name} className="px-4 py-3">
                    <Link to={`/rooms?type=${encodeURIComponent(t.name)}`} className="rounded-sm font-medium text-tea-700 hover:underline">
                      {t.name}
                    </Link>
                    <dl className="mt-1 text-sm text-ink-600">
                      <div className="flex gap-1"><dt>Sleeps</dt><dd className="tabular text-ink-900">{t.capacity}</dd></div>
                      <div className="flex gap-1"><dt>From</dt><dd className="tabular text-ink-900">{formatCurrency(t.min)} per night</dd></div>
                      {t.amenities?.length > 0 && <dd className="mt-1">{amenityText(t.amenities)}</dd>}
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}
