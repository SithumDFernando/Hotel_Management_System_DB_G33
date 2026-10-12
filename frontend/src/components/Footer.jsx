import { Link } from 'react-router-dom';
import useFetch from '@/hooks/useFetch';
import { getBranches } from '@/api/auth';
import Logo from '@/components/ui/Logo';

// Public footer (spec 11 §7.1 item 5): the three branches' addresses and phones from
// GET /api/branches. While loading or on error, the city links still show.
const CITIES = ['Colombo', 'Kandy', 'Galle'];

const LINK = 'rounded-sm hover:underline focus-visible:ring-offset-ink-900';

export default function Footer() {
  const { data } = useFetch(() => getBranches(), []);
  const branches = data?.branches?.length
    ? data.branches
    : CITIES.map((city) => ({ branch_id: city, city }));

  return (
    <footer className="mt-16 bg-ink-900 text-paper-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Logo tone="inverse" size="sm" />

        <ul className="mt-8 grid gap-8 sm:grid-cols-3" aria-label="Our hotels">
          {branches.map((b) => (
            <li key={b.branch_id} className="text-sm">
              <Link to={`/rooms?city=${encodeURIComponent(b.city)}`} className={`font-medium text-paper-100 ${LINK}`}>
                {b.city}
              </Link>
              {b.address && <p className="mt-1 text-ink-300">{b.address}</p>}
              {b.phone && (
                <p className="mt-0.5 text-ink-300">
                  <a href={`tel:${b.phone.replace(/\s+/g, '')}`} className={LINK}>{b.phone}</a>
                </p>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col gap-2 border-t border-ink-600 pt-6 text-2xs text-ink-300 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/login" className={LINK}>Staff sign-in</Link>
          <p>© {new Date().getFullYear()} SkyNest Hotels</p>
        </div>
      </div>
    </footer>
  );
}
