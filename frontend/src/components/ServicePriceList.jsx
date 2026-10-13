import { useMemo, useState } from 'react';
import { getServices } from '@/api/services';
import useFetch from '@/hooks/useFetch';
import Icon from '@/components/ui/Icon';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { formatCurrency } from '@/utils/formatters';

// Read-only list of active services and prices (GET /services), grouped by category.
// The catalogue is the same at every branch. Staff add services from a booking
// (ServiceRequest); this list is for quoting prices and telling guests what exists.
// searchable: show a filter box (front desk); guests get the plain list.
export default function ServicePriceList({ searchable = false }) {
  const { data, isLoading, error, refetch } = useFetch((s) => getServices(s), [], { failMessage: "Couldn't load the service list." });
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data || [])
      .map((g) => ({
        ...g,
        services: g.services.filter((s) => !needle || `${s.service_name} ${g.category}`.toLowerCase().includes(needle)),
      }))
      .filter((g) => g.services.length);
  }, [data, q]);

  return (
    <div>
      {searchable && (
        <div className="relative mb-4 w-full sm:w-80">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Service or category" aria-label="Search services" className="input pl-9" />
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-ink-600">
          {q ? (
            <>
              No services match “{q.trim()}”.{' '}
              <button type="button" className="rounded-sm text-tea-700 underline" onClick={() => setQ('')}>Clear search</button>
            </>
          ) : (
            'No services are offered at the moment.'
          )}
        </p>
      ) : (
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          {groups.map((g) => (
            <section key={g.category} aria-label={g.category}>
              <h3 className="mb-1 text-sm font-semibold text-ink-600">{g.category}</h3>
              <ul className="divide-y divide-ink-100 border-y border-ink-100">
                {g.services.map((s) => (
                  <li key={s.service_id} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                    <span className="text-ink-900">{s.service_name}</span>
                    <span className="whitespace-nowrap tabular text-ink-900">{formatCurrency(s.base_price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
