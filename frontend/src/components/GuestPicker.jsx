import { useEffect, useState } from 'react';
import { createGuest, searchGuests } from '@/api/guests';
import { errorMessage, initials } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Field';
import { InlineAlert } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const EMPTY = { full_name: '', nic_passport: '', email: '', phone: '', nationality: '', date_of_birth: '', company_name: '' };

// Register-guest drawer, reused by the booking flow and the front-desk dashboard.
export function GuestFormDrawer({ open, onClose, onCreated }) {
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [corporate, setCorporate] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setF(EMPTY);
      setCorporate(false);
      setErrors({});
      setServerError('');
    }
  }, [open]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (f.full_name.trim().length < 2) v.full_name = 'Required';
    if (f.nic_passport.trim().length < 4) v.nic_passport = 'Required';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) v.email = 'Valid email required';
    if (f.phone.replace(/\D/g, '').length < 7) v.phone = 'Valid phone required';
    if (corporate && !f.company_name.trim()) v.company_name = 'Required for corporate guests';
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    setServerError('');
    try {
      const guest = await createGuest({
        full_name: f.full_name.trim(),
        nic_passport: f.nic_passport.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        nationality: f.nationality.trim() || null,
        date_of_birth: f.date_of_birth || null,
        guest_type: corporate ? 'Corporate' : 'Individual',
        company_name: corporate ? f.company_name.trim() : null,
      });
      toast.success(`${guest.full_name} registered`);
      onCreated(guest);
      onClose();
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Register new guest"
      subtitle="Create a guest profile for walk-in or phone reservations."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="guest-form" loading={busy}>Register guest</Button>
        </div>
      }
    >
      <form id="guest-form" onSubmit={submit} noValidate className="space-y-4">
        {serverError && <InlineAlert>{serverError}</InlineAlert>}
        <Input label="Full name" required value={f.full_name} onChange={set('full_name')} error={errors.full_name} />
        <Input label="NIC / Passport" required value={f.nic_passport} onChange={set('nic_passport')} error={errors.nic_passport} />
        <Input label="Email" type="email" required value={f.email} onChange={set('email')} error={errors.email} />
        <Input label="Phone" type="tel" required value={f.phone} onChange={set('phone')} error={errors.phone} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nationality" value={f.nationality} onChange={set('nationality')} />
          <Input label="Date of birth" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={corporate} onChange={(e) => setCorporate(e.target.checked)} className="h-4 w-4 accent-gold-700" />
          Corporate guest
        </label>
        {corporate && <Input label="Company name" required value={f.company_name} onChange={set('company_name')} error={errors.company_name} />}
      </form>
    </Drawer>
  );
}

// Search-as-you-type guest selector for staff. value: guest | null.
export default function GuestPicker({ value, onChange }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      searchGuests(q.trim(), ctrl.signal)
        .then((r) => setResults(r.slice(0, 8)))
        .catch(() => {})
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const pick = (g) => {
    onChange(g);
    setQ('');
    setOpen(false);
  };

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-gold-200">{initials(value.full_name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{value.full_name}</p>
            <p className="truncate text-xs text-navy-500">{value.nic_passport} · {value.email} · {value.phone}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onChange(null)}>Change</Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search guest by name, NIC / passport or email…"
              className="input pl-9"
              aria-label="Search guests"
            />
            {open && q.trim().length >= 2 && (
              <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-navy-100 bg-white py-1 shadow-lift">
                {loading && <li className="px-4 py-3 text-xs text-navy-500">Searching…</li>}
                {!loading && results.length === 0 && <li className="px-4 py-3 text-xs text-navy-500">No guests found.</li>}
                {results.map((g) => (
                  <li key={g.guest_id}>
                    <button type="button" onClick={() => pick(g)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-navy-50">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-[11px] font-bold">{initials(g.full_name)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{g.full_name}</span>
                        <span className="block truncate text-xs text-navy-500">{g.nic_passport} · {g.email}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" onClick={() => setDrawer(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold-700 hover:underline">
            <Icon name="plus" className="h-3.5 w-3.5" /> Register a new guest
          </button>
        </>
      )}
      <GuestFormDrawer open={drawer} onClose={() => setDrawer(false)} onCreated={pick} />
    </div>
  );
}
