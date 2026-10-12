import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getBooking } from '@/api/bookings';
import { addUsage, getServices, getUsage } from '@/api/services';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import BillPaymentModal from '@/components/BillPaymentModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import {
  bookingRef, calculateNights, errorMessage, formatCurrency, formatDate, todayISO,
} from '@/utils/formatters';

const categoryIcon = (c = '') => {
  const k = c.toLowerCase();
  if (k.includes('f&b') || k.includes('food')) return 'utensils';
  if (k.includes('wellness') || k.includes('spa')) return 'lotus';
  if (k.includes('house') || k.includes('laundry')) return 'shirt';
  if (k.includes('transport')) return 'car';
  if (k.includes('excursion') || k.includes('tour')) return 'sun';
  return 'sparkles';
};

function Stepper({ value, onChange, disabled, label }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-navy-100 bg-navy-50" role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} aria-label="Decrease quantity" className="p-2 text-navy-600 disabled:opacity-30">
        <Icon name="minus" className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" disabled={disabled || value >= 99} onClick={() => onChange(value + 1)} aria-label="Increase quantity" className="p-2 text-navy-600 disabled:opacity-30">
        <Icon name="plus" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function ServiceRequest() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const booking = useFetch((s) => getBooking(bookingId, s), [bookingId]);
  const catalogue = useFetch((s) => getServices(s), []);
  const usage = useFetch((s) => getUsage(bookingId, s), [bookingId]);

  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [qty, setQty] = useState({});
  const [adding, setAdding] = useState(null);
  const [folio, setFolio] = useState(false);

  const b = booking.data;
  const canOrder = b?.status === 'Checked-In';
  const dashboard = user.role === 'manager' ? '/dashboard/manager' : '/dashboard/receptionist';
  // Return to wherever we came from (keeps dashboard tabs); a direct link falls back to the dashboard.
  const hasHistory = location.key !== 'default';
  const goBack = (e) => {
    if (!hasHistory) return;
    e.preventDefault();
    navigate(-1);
  };

  const groups = catalogue.data || [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return groups
      .filter((g) => category === 'all' || g.category === category)
      .map((g) => ({ ...g, services: g.services.filter((s) => !needle || s.service_name.toLowerCase().includes(needle)) }))
      .filter((g) => g.services.length > 0);
  }, [groups, category, q]);

  const add = async (service) => {
    const quantity = qty[service.service_id] || 1;
    setAdding(service.service_id);
    try {
      await addUsage(bookingId, { service_id: service.service_id, usage_date: todayISO(), quantity });
      toast.success(`${quantity} × ${service.service_name} added to folio`);
      setQty((p) => ({ ...p, [service.service_id]: 1 }));
      usage.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(null);
    }
  };

  if (booking.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <ErrorState message={booking.error} onRetry={booking.refetch} />
        <div className="mt-4 text-center"><Button variant="secondary" to={dashboard} onClick={goBack}>Back</Button></div>
      </div>
    );
  }

  const usages = [...(usage.data?.usages || [])].sort((a, c) => c.usage_date.localeCompare(a.usage_date));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-3 text-xs text-navy-500" aria-label="Breadcrumb">
        <Link to={dashboard} className="hover:text-gold-700">Dashboard</Link> / <span>Services</span>
      </nav>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Folio additions</p>
          <h1 className="mt-1 text-4xl font-semibold">Service requests</h1>
          <p className="mt-1 text-sm text-navy-500">Post chargeable guest services to the stay’s folio.</p>
        </div>
        <Button variant="secondary" to={dashboard} onClick={goBack}><Icon name="arrowLeft" /> Back</Button>
      </header>

      {/* Booking header */}
      <section className="card mb-6 p-5">
        {booking.isLoading || !b ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold">{b.guest.full_name}</h2>
                <Badge status={b.status} />
              </div>
              <p className="mt-1 text-sm text-navy-500">
                {b.room.type_name} Room {b.room.room_number} · {b.room.branch_name} · {bookingRef(b.booking_id)}
              </p>
            </div>
            <dl className="flex gap-8 text-sm">
              <div><dt className="text-[11px] uppercase tracking-wider text-navy-400">Stay</dt><dd className="font-semibold">{formatDate(b.check_in_date)} – {formatDate(b.check_out_date)}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wider text-navy-400">Nights</dt><dd className="font-semibold">{calculateNights(b.check_in_date, b.check_out_date)}</dd></div>
            </dl>
          </div>
        )}
      </section>

      {b && !canOrder && (
        <div className="mb-6">
          <InlineAlert tone="info">
            Services can only be added while a guest is <strong>Checked-In</strong>. This booking is <strong>{b.status}</strong>
            {b.status === 'Booked' ? ' — check the guest in from the dashboard first.' : '.'}
          </InlineAlert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Catalogue */}
        <section aria-label="Service catalogue">
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Service catalogue</h2>
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services…" aria-label="Search services" className="input w-56 pl-9" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              {['all', ...groups.map((g) => g.category)].map((c) => (
                <button
                  key={c}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${category === c ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-700 hover:bg-navy-100'}`}
                >
                  {c === 'all' ? 'All offerings' : c}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-6">
              {catalogue.error ? (
                <ErrorState message={catalogue.error} onRetry={catalogue.refetch} />
              ) : catalogue.isLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : filtered.length === 0 ? (
                <EmptyState icon="search" title="No services found" message="Try another category or search term." />
              ) : (
                filtered.map((g) => (
                  <div key={g.category}>
                    <h3 className="mb-2 flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-wider text-navy-600">
                      <Icon name={categoryIcon(g.category)} className="h-4 w-4 text-gold-700" /> {g.category}
                    </h3>
                    <ul className="space-y-2">
                      {g.services.map((s) => {
                        const quantity = qty[s.service_id] || 1;
                        return (
                          <li key={s.service_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 p-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
                                <Icon name={categoryIcon(g.category)} className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{s.service_name}</p>
                                <p className="text-sm font-semibold text-gold-700">{formatCurrency(s.base_price)} <span className="text-xs font-normal text-navy-400">/ unit</span></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Stepper label={s.service_name} value={quantity} disabled={!canOrder} onChange={(v) => setQty((p) => ({ ...p, [s.service_id]: v }))} />
                              <Button variant="secondary" size="sm" disabled={!canOrder} loading={adding === s.service_id} onClick={() => add(s)} title={canOrder ? undefined : 'Guest must be checked in'}>
                                <Icon name="plus" className="h-3.5 w-3.5" /> Add · {formatCurrency(s.base_price * quantity)}
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Folio */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Services used">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">Services used</h2>
                <p className="text-xs text-navy-500">{usages.length} item{usages.length === 1 ? '' : 's'} on this folio</p>
              </div>
            </div>

            {usage.error ? (
              <div className="p-4"><ErrorState message={usage.error} onRetry={usage.refetch} /></div>
            ) : usage.isLoading ? (
              <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : usages.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-navy-500">No services posted yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-navy-50"><tr><th className="th">Date</th><th className="th">Service</th><th className="th text-right">Qty</th><th className="th text-right">Total</th></tr></thead>
                  <tbody className="divide-y divide-navy-100">
                    {usages.map((u) => (
                      <tr key={u.usage_id}>
                        <td className="px-4 py-3 text-xs text-navy-500">{formatDate(u.usage_date)}</td>
                        <td className="px-4 py-3"><span className="font-medium">{u.service_name}</span><span className="block text-xs text-navy-400">{formatCurrency(u.unit_price)} each</span></td>
                        <td className="px-4 py-3 text-right tabular-nums">{u.quantity}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(u.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-navy-100 bg-gold-50 px-5 py-4">
              <div className="flex items-end justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-800">Service charges total</span>
                <span className="font-serif text-2xl font-semibold">{formatCurrency(usage.data?.grand_total ?? 0)}</span>
              </div>
              <p className="mt-1 text-[11px] text-navy-500">Tax is applied when the final bill is generated.</p>
            </div>
            <div className="p-4">
              <Button variant="secondary" className="w-full" disabled={!b} onClick={() => setFolio(true)}>
                <Icon name="receipt" /> View complete folio &amp; bill
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {folio && b && (
        <BillPaymentModal booking={b} onClose={() => setFolio(false)} onChanged={() => { usage.refetch(); booking.refetch(); }} />
      )}
    </div>
  );
}
