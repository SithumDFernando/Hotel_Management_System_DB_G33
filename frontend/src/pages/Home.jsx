import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRooms } from '@/api/rooms';
import { getBranches } from '@/api/auth';
import useFetch from '@/hooks/useFetch';
import Photo from '@/components/Photo';
import StaySearch from '@/components/StaySearch';
import { amenityIcon } from '@/components/RoomCard';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { branchMedia, HERO_IMAGE, ROOM_TYPE_BLURB, roomImage } from '@/lib/media';
import { addDays, formatCurrency, todayISO } from '@/utils/formatters';

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState({ city: '', check_in: todayISO(), check_out: addDays(todayISO(), 2), guests: '2' });

  const branches = useFetch((s) => getBranches(s), []);
  const rooms = useFetch((s) => getRooms({}, s), []);

  const branchList = branches.data?.branches || [];

  // "From LKR x" per branch, and one highlight card per room type.
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
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <Photo src={HERO_IMAGE} className="absolute inset-0 -z-10 opacity-50">
          <div className="absolute inset-0 bg-gradient-to-b from-navy-900/70 via-navy-900/40 to-navy-900" />
        </Photo>
        <div className="mx-auto max-w-5xl px-4 pb-44 pt-24 text-center sm:px-6 sm:pt-32">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-200 backdrop-blur">
            <Icon name="star" className="h-3 w-3" /> Sri Lanka’s boutique collection
          </span>
          <h1 className="mt-6 text-5xl font-semibold leading-tight sm:text-6xl">Stay above the ordinary</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-navy-100">
            Handcrafted boutique sanctuaries across Sri Lanka’s oceanfronts, historic ramparts and misty mountain highlands.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/rooms" size="lg">Browse rooms <Icon name="arrowRight" /></Button>
            <a href="#branches" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-white/20">
              Explore our branches
            </a>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-32 max-w-6xl px-4 sm:px-6">
        <div className="card p-5 shadow-lift sm:p-6">
          <StaySearch branches={branchList} value={search} onChange={setSearch} onSubmit={submit} submitLabel="Search availability" />
        </div>
      </div>

      <section id="branches" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <p className="eyebrow">Our branches</p>
        <h2 className="mt-1 text-4xl font-semibold">Three landscapes, one standard of calm</h2>

        {branches.error ? (
          <div className="mt-8"><ErrorState message={branches.error} onRetry={branches.refetch} /></div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {branches.isLoading
              ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 rounded-2xl" />)
              : branchList.map((b) => {
                  const m = branchMedia(b.city);
                  const from = minByBranch[b.branch_id];
                  return (
                    <article key={b.branch_id} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
                      <Photo src={m.image} alt={b.name} className="h-48">
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                          {m.tag}
                        </span>
                      </Photo>
                      <div className="p-5">
                        <h3 className="text-2xl font-semibold">{b.name}</h3>
                        <p className="mt-2 text-xs text-navy-500"><Icon name="mapPin" className="mr-1 inline h-3.5 w-3.5" />{b.address}</p>
                        <p className="mt-1 text-xs text-navy-500"><Icon name="phone" className="mr-1 inline h-3.5 w-3.5" />{b.phone}</p>
                        <p className="mt-3 text-sm text-navy-600">{m.blurb}</p>
                        <div className="mt-4 flex items-center justify-between border-t border-navy-100 pt-4 text-sm">
                          <span className="text-xs text-navy-500">
                            {Number.isFinite(from) ? <>Rooms from <strong className="text-navy-900">{formatCurrency(from)}</strong></> : ' '}
                          </span>
                          <Link to={`/rooms?city=${encodeURIComponent(b.city)}`} className="inline-flex items-center gap-1 font-semibold text-gold-700 hover:underline">
                            View rooms <Icon name="arrowRight" className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
          </div>
        )}
      </section>

      {typeHighlights.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <p className="eyebrow">Room types</p>
          <h2 className="mt-1 text-4xl font-semibold">A room for every kind of stay</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {typeHighlights.map((t) => (
              <Link key={t.name} to={`/rooms?type=${encodeURIComponent(t.name)}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
                <Photo src={roomImage(t.name)} alt={t.name} className="h-36" />
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{t.name}</h3>
                  <p className="mt-0.5 text-xs text-navy-500">Up to {t.capacity} guest{t.capacity > 1 ? 's' : ''} · from {formatCurrency(t.min)}</p>
                  <p className="mt-2 text-xs text-navy-600">{ROOM_TYPE_BLURB[t.name]}</p>
                  <div className="mt-3 flex gap-1.5 text-navy-400">
                    {t.amenities.slice(0, 5).map((a) => (
                      <span key={a.amenity_name} title={a.amenity_name}><Icon name={amenityIcon(a.amenity_name)} className="h-4 w-4" /></span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-navy-900 p-8 text-white sm:flex-row sm:items-center sm:p-12">
          <div>
            <h2 className="text-3xl font-semibold">Ready for your stay?</h2>
            <p className="mt-2 max-w-lg text-navy-200">Check live availability across all three branches and book in under two minutes.</p>
          </div>
          <Button to="/rooms" size="lg">Browse rooms <Icon name="arrowRight" /></Button>
        </div>
      </section>
    </>
  );
}
