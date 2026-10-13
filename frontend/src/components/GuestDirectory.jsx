import { useEffect, useState } from 'react';
import { getGuest, searchGuests } from '@/api/guests';
import useFetch from '@/hooks/useFetch';
import { GuestFormDrawer } from '@/components/GuestPicker';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { bookingRef, formatNumericDate, formatStayRange } from '@/utils/formatters';

const PAGE_SIZE = 15;

// Front-desk guest directory: search (GET /guests?search=), open a profile with
// booking history (GET /guests/:id), correct details (PUT /guests/:id).
// Guest profiles are shared by all branches, so the list is not branch-scoped.
export default function GuestDirectory({ registerSignal = 0 }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null);

  // Debounce typing so each keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const list = useFetch((s) => searchGuests(term, s), [term, registerSignal], { failMessage: "Couldn't load guests." });
  const guests = list.data || [];
  const pageRows = guests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const loading = list.isLoading && !list.data;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, NIC/passport or email"
            aria-label="Search guests by name, NIC/passport or email"
            className="input pl-9"
          />
        </div>
        {!loading && !list.error && (
          <span className="text-[13px] tabular text-ink-600">{guests.length} {guests.length === 1 ? 'guest' : 'guests'}</span>
        )}
      </div>

      <div className="mt-4">
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.refetch} />
        ) : loading ? (
          <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : guests.length === 0 ? (
          <EmptyState
            title={term ? `No guest matches “${term}”` : 'No guests yet'}
            message={term ? 'Check the spelling, or register the guest with Register guest.' : 'Guests appear here once registered or after they sign up online.'}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px]" aria-label="Guests">
                <thead>
                  <tr className="bg-paper-200">
                    <th scope="col" className="th">Guest</th>
                    <th scope="col" className="th">NIC / passport</th>
                    <th scope="col" className="th">Email</th>
                    <th scope="col" className="th">Phone</th>
                    <th scope="col" className="th"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {pageRows.map((g) => (
                    <tr key={g.guest_id} className="hover:bg-paper-100">
                      <td className="td">
                        <span className="font-medium text-ink-900">{g.full_name}</span>
                        {g.guest_type === 'Corporate' && <span className="block text-2xs text-ink-600">Corporate · {g.company_name}</span>}
                      </td>
                      <td className="td font-mono text-[13px]">{g.nic_passport}</td>
                      <td className="td">{g.email}</td>
                      <td className="td whitespace-nowrap tabular">{g.phone}</td>
                      <td className="td text-right">
                        <Button size="sm" variant="secondary" onClick={() => setOpenId(g.guest_id)} aria-label={`Open profile: ${g.full_name}`}>
                          Open profile
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-ink-100 md:hidden">
              {pageRows.map((g) => (
                <li key={g.guest_id}>
                  <button type="button" onClick={() => setOpenId(g.guest_id)} className="block w-full px-4 py-3 text-left hover:bg-paper-100">
                    <span className="block text-sm font-medium text-ink-900">{g.full_name}</span>
                    <span className="block truncate text-2xs text-ink-600">{g.nic_passport} · {g.phone}</span>
                    <span className="block truncate text-2xs text-ink-600">{g.email}</span>
                  </button>
                </li>
              ))}
            </ul>
            {guests.length > PAGE_SIZE && (
              <div className="border-t border-ink-100">
                <Pagination page={page} pageSize={PAGE_SIZE} total={guests.length} onChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>

      <GuestProfileDrawer
        guestId={editing ? null : openId}
        onClose={() => setOpenId(null)}
        onEdit={setEditing}
      />
      <GuestFormDrawer
        open={Boolean(editing)}
        guest={editing}
        onClose={() => setEditing(null)}
        onCreated={() => list.refetch()}
      />
    </div>
  );
}

// Profile + booking history. Closed while the edit drawer is open (one overlay at a time),
// and it reloads when it reopens, so saved changes show straight away.
function GuestProfileDrawer({ guestId, onClose, onEdit }) {
  const detail = useFetch((s) => getGuest(guestId, s), [guestId], { enabled: Boolean(guestId), failMessage: "Couldn't load this guest." });
  // Wait for the reload after an edit rather than showing the old details.
  const g = detail.data?.guest_id === guestId && !detail.isLoading ? detail.data : null;

  const facts = g
    ? [
        ['NIC / passport', g.nic_passport],
        ['Email', g.email],
        ['Phone', g.phone],
        ['Date of birth', g.date_of_birth ? formatNumericDate(g.date_of_birth) : null],
        ['Nationality', g.nationality],
        ['Guest type', g.guest_type],
        ['Company', g.company_name],
        ['Company reg. no.', g.company_reg_number],
        ['Billing contact', g.billing_contact_name],
      ].filter(([, v]) => v)
    : [];

  return (
    <Drawer
      open={Boolean(guestId)}
      onClose={onClose}
      title={g ? g.full_name : 'Guest profile'}
      subtitle={g ? `${g.guest_type} guest` : undefined}
      footer={
        g && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="secondary" onClick={() => onEdit(g)}>Edit details</Button>
          </div>
        )
      }
    >
      {detail.error ? (
        <ErrorState message={detail.error} onRetry={detail.refetch} />
      ) : !g ? (
        <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : (
        <div className="space-y-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-600">{k}</dt>
                <dd className="min-w-0 break-words text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="guest-history-heading">
            <h3 id="guest-history-heading" className="mb-2 text-sm font-semibold text-ink-900">
              Bookings <span className="tabular font-normal text-ink-600">· {g.bookings.length}</span>
            </h3>
            {g.bookings.length === 0 ? (
              <p className="text-sm text-ink-600">No bookings yet.</p>
            ) : (
              <ul className="divide-y divide-ink-100 rounded-md border border-ink-100">
                {g.bookings.map((b) => (
                  <li key={b.booking_id} className="space-y-1 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-ink-900">
                        Room <span className="tabular">{b.room_number}</span>
                        {b.branch_name && <span className="text-ink-600"> · {b.branch_name}</span>}
                      </p>
                      <Badge status={b.status} />
                    </div>
                    <p className="flex flex-wrap gap-x-2 text-2xs text-ink-600">
                      <span className="tabular">{formatStayRange(b.check_in_date, b.check_out_date)}</span>
                      <span className="font-mono">{bookingRef(b.booking_id)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
