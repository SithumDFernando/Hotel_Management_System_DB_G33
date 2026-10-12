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
import { ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import Tabs from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import {
  bookingRef, errorMessage, formatCurrency, formatNumericDate, formatStayRange, todayISO,
} from '@/utils/formatters';

// Console page: add services to an in-house guest's stay and see the running total.
export default function ServiceRequest() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const booking = useFetch((s) => getBooking(bookingId, s), [bookingId], { failMessage: "Couldn't load this booking." });
  const catalogue = useFetch((s) => getServices(s), [], { failMessage: "Couldn't load the service catalogue." });
  const usage = useFetch((s) => getUsage(bookingId, s), [bookingId], { failMessage: "Couldn't load services for this stay." });

  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [qty, setQty] = useState({});
  const [qtyError, setQtyError] = useState({});
  const [adding, setAdding] = useState(null);
  const [folio, setFolio] = useState(false);

  const b = booking.data;
  const canOrder = b?.status === 'Checked-In';
  const isManager = user.role === 'manager';
  const dashboard = isManager ? '/dashboard/manager' : '/dashboard/receptionist';
  // Return to wherever we came from; a direct link falls back to the dashboard.
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
    const raw = qty[service.service_id] ?? '1';
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      setQtyError((p) => ({ ...p, [service.service_id]: 'Enter a whole number from 1 to 99.' }));
      return;
    }
    setAdding(service.service_id);
    try {
      await addUsage(bookingId, { service_id: service.service_id, usage_date: todayISO(), quantity });
      toast.success(`Added: ${quantity} × ${service.service_name} to Room ${b.room.room_number}, ${b.guest.full_name}`);
      setQty((p) => ({ ...p, [service.service_id]: '1' }));
      usage.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(null);
    }
  };

  const back = (
    <Link to={dashboard} onClick={goBack} className="inline-flex items-center gap-1 rounded-sm text-[13px] text-ink-600 hover:text-ink-900">
      <Icon name="arrowLeft" className="h-3.5 w-3.5" /> {isManager ? 'Overview' : 'Today'}
    </Link>
  );

  if (booking.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {back}
        <div className="mt-4"><ErrorState message={booking.error} onRetry={booking.refetch} /></div>
      </div>
    );
  }

  const usages = [...(usage.data?.usages || [])].sort((a, c) => c.usage_date.localeCompare(a.usage_date));
  const tabs = [{ key: 'all', label: 'All' }, ...groups.map((g) => ({ key: g.category, label: g.category }))];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {back}
      <header className="mt-2">
        {booking.isLoading || !b ? (
          <><Skeleton className="h-6 w-72" /><Skeleton className="mt-2 h-4 w-96 max-w-full" /></>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-ink-900">Add services · {b.guest.full_name}, Room {b.room.room_number}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-600">
              <span>{b.room.type_name}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular">{formatStayRange(b.check_in_date, b.check_out_date)}</span>
              <span aria-hidden="true">·</span>
              <Badge status={b.status} />
              <span aria-hidden="true">·</span>
              <span className="font-mono text-2xs">{bookingRef(b.booking_id)}</span>
            </p>
          </>
        )}
      </header>

      {b && !canOrder && (
        <div className="mt-4">
          <InlineAlert tone="info">
            Services can only be added while the guest is checked in.
            {b.status === 'Booked' ? ' Check the guest in from Today first.' : ''}
          </InlineAlert>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="catalogue-heading" className="card min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="catalogue-heading" className="text-base font-semibold text-ink-900">Catalogue</h2>
            <div className="relative w-full sm:w-56">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services" aria-label="Search services" className="input pl-9" />
            </div>
          </div>
          {groups.length > 1 && <Tabs tabs={tabs} value={category} onChange={setCategory} className="mt-3" />}

          <div className="mt-4 space-y-6">
            {catalogue.error ? (
              <ErrorState message={catalogue.error} onRetry={catalogue.refetch} />
            ) : catalogue.isLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : filtered.length === 0 ? (
              <p className="text-sm text-ink-600">
                No services match.{' '}
                <button type="button" className="rounded-sm text-tea-700 underline" onClick={() => { setQ(''); setCategory('all'); }}>Clear search</button>
              </p>
            ) : (
              filtered.map((g) => (
                <div key={g.category}>
                  <h3 className="mb-1 text-sm font-semibold text-ink-600">{g.category}</h3>
                  <ul className="divide-y divide-ink-100 border-y border-ink-100">
                    {g.services.map((s) => {
                      const qid = `qty-${s.service_id}`;
                      const err = qtyError[s.service_id];
                      return (
                        <li key={s.service_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-900">{s.service_name}</p>
                            <p className="text-2xs tabular text-ink-600">{formatCurrency(s.base_price)} each</p>
                          </div>
                          {canOrder && (
                            <div className="flex items-start gap-2">
                              <div>
                                <label htmlFor={qid} className="sr-only">Quantity of {s.service_name}</label>
                                <input
                                  id={qid}
                                  type="number"
                                  min="1"
                                  max="99"
                                  step="1"
                                  inputMode="numeric"
                                  value={qty[s.service_id] ?? '1'}
                                  onChange={(e) => {
                                    setQty((p) => ({ ...p, [s.service_id]: e.target.value }));
                                    setQtyError((p) => ({ ...p, [s.service_id]: '' }));
                                  }}
                                  aria-invalid={Boolean(err)}
                                  aria-describedby={err ? `${qid}-error` : undefined}
                                  className={`input h-8 w-16 py-1 text-right tabular ${err ? 'border-signal-700' : ''}`}
                                />
                              </div>
                              <Button variant="secondary" size="sm" loading={adding === s.service_id} onClick={() => add(s)} aria-label={`Add ${s.service_name}`}>
                                Add
                              </Button>
                            </div>
                          )}
                          {err && <p id={`${qid}-error`} role="alert" className="w-full text-right text-[13px] text-signal-700">{err}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </section>

        <aside aria-labelledby="stay-heading" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <div className="card">
            <h2 id="stay-heading" className="border-b border-ink-100 px-4 py-3 text-base font-semibold text-ink-900">This stay</h2>
            {usage.error ? (
              <div className="p-4"><ErrorState message={usage.error} onRetry={usage.refetch} /></div>
            ) : usage.isLoading ? (
              <div className="space-y-2 p-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : usages.length === 0 ? (
              <p className="px-4 py-4 text-sm text-ink-600">No services yet for this stay.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" aria-labelledby="stay-heading">
                  <thead>
                    <tr className="bg-paper-200">
                      <th scope="col" className="th">Date</th>
                      <th scope="col" className="th">Service</th>
                      <th scope="col" className="th text-right">Qty</th>
                      <th scope="col" className="th text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {usages.map((u) => (
                      <tr key={u.usage_id}>
                        <td className="td whitespace-nowrap tabular text-ink-600">{formatNumericDate(u.usage_date).slice(0, 5)}</td>
                        <td className="td">{u.service_name}</td>
                        <td className="td text-right tabular">{u.quantity}</td>
                        <td className="td whitespace-nowrap text-right tabular">{formatCurrency(u.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mx-4 flex items-baseline justify-between gap-4 border-t border-ink-900 py-3">
              <span className="text-sm font-semibold text-ink-900">Services total</span>
              <span className="text-base font-semibold tabular text-ink-900">{formatCurrency(usage.data?.grand_total ?? 0)}</span>
            </div>
            <p className="px-4 text-2xs text-ink-600">Tax is added on the bill.</p>
            <div className="p-4">
              <Button variant="secondary" className="w-full" disabled={!b} onClick={() => setFolio(true)}>Open bill</Button>
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
