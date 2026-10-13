import { useEffect, useId, useState } from 'react';
import { createGuest, searchGuests, updateGuest } from '@/api/guests';
import { errorMessage, fieldErrors } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Field';
import { InlineAlert } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const EMPTY = { full_name: '', nic_passport: '', email: '', phone: '', nationality: '', date_of_birth: '', company_name: '' };

// Register-guest drawer, reused by the booking flow and the front-desk dashboard.
// guest (optional): edit that profile instead (PUT /guests/:id); onCreated gets the saved guest.
// onFindExisting(nic) (optional): on a 409 duplicate, offer to search for that guest instead.
export function GuestFormDrawer({ open, onClose, onCreated, onFindExisting, guest = null }) {
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [corporate, setCorporate] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      // Prefill from the profile being edited; nulls become empty inputs.
      setF(guest ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, guest[k] ?? ''])) : EMPTY);
      setCorporate(guest?.guest_type === 'Corporate');
      setErrors({});
      setServerError('');
      setDuplicate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (f.full_name.trim().length < 2) v.full_name = 'Enter the guest’s full name.';
    if (f.nic_passport.trim().length < 4) v.nic_passport = 'Enter the NIC or passport number.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) v.email = 'Enter an email address like name@example.com.';
    if (f.phone.replace(/\D/g, '').length < 7) v.phone = 'Enter a phone number with at least 7 digits.';
    if (corporate && !f.company_name.trim()) v.company_name = 'Enter the company name for a corporate guest.';
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    setServerError('');
    setDuplicate(false);
    try {
      const payload = {
        full_name: f.full_name.trim(),
        nic_passport: f.nic_passport.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        nationality: f.nationality.trim() || null,
        date_of_birth: f.date_of_birth || null,
        guest_type: corporate ? 'Corporate' : 'Individual',
        company_name: corporate ? f.company_name.trim() : null,
      };
      const saved = guest ? await updateGuest(guest.guest_id, payload) : await createGuest(payload);
      toast.success(`${guest ? 'Saved' : 'Registered'}: ${saved.full_name}`);
      onCreated(saved);
      onClose();
    } catch (err) {
      const fields = fieldErrors(err);
      setDuplicate(err.response?.status === 409);
      if (Object.keys(fields).length) setErrors(fields);
      else setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={guest ? `Edit guest · ${guest.full_name}` : 'Register new guest'}
      subtitle={guest ? 'Correct contact or ID details. Bookings and bills keep this guest.' : 'Create a guest profile for a walk-in or phone booking.'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="guest-form" loading={busy}>{guest ? 'Save changes' : 'Register guest'}</Button>
        </div>
      }
    >
      <form id="guest-form" onSubmit={submit} noValidate className="space-y-4">
        {serverError && (
          <InlineAlert>
            {serverError}
            {duplicate && !guest && ' Open the existing guest instead.'}
            {duplicate && onFindExisting && (
              <div className="mt-2">
                <Button variant="secondary" size="sm" onClick={() => { onFindExisting(f.nic_passport.trim()); onClose(); }}>
                  Find {f.nic_passport.trim()}
                </Button>
              </div>
            )}
          </InlineAlert>
        )}
        <Input label="Full name" required value={f.full_name} onChange={set('full_name')} error={errors.full_name} autoComplete="off" />
        <Input label="NIC / passport" required value={f.nic_passport} onChange={set('nic_passport')} error={errors.nic_passport} autoComplete="off" />
        <Input label="Email" type="email" required value={f.email} onChange={set('email')} error={errors.email} autoComplete="off" />
        <Input label="Phone" type="tel" required value={f.phone} onChange={set('phone')} error={errors.phone} autoComplete="off" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nationality" value={f.nationality} onChange={set('nationality')} />
          <Input label="Date of birth" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-900">
          <input type="checkbox" checked={corporate} onChange={(e) => setCorporate(e.target.checked)} className="h-4 w-4 accent-tea-700" />
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
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const id = useId();

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setFailed(false);
    const t = setTimeout(() => {
      searchGuests(q.trim(), ctrl.signal)
        .then((r) => setResults(r.slice(0, 8)))
        .catch((err) => { if (err?.code !== 'ERR_CANCELED') setFailed(true); })
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
        <div className="flex items-center gap-3 rounded-md border border-ink-100 bg-tea-100 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-tea-900">{value.full_name}</p>
            <p className="truncate text-2xs text-ink-600">{value.nic_passport} · {value.email}{value.phone ? ` · ${value.phone}` : ''}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onChange(null)}>Change</Button>
        </div>
      ) : (
        <>
          <label htmlFor={`${id}-q`} className="label">Find guest</label>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
            <input
              id={`${id}-q`}
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
              className="input pl-9"
              aria-describedby={`${id}-help`}
              aria-expanded={open && q.trim().length >= 2}
              aria-controls={`${id}-results`}
              autoComplete="off"
            />
            {open && q.trim().length >= 2 && (
              <ul id={`${id}-results`} className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-ink-100 bg-paper-50 py-1 shadow-overlay">
                {loading && <li className="px-3 py-2.5 text-[13px] text-ink-600">Searching…</li>}
                {!loading && failed && <li className="px-3 py-2.5 text-[13px] text-signal-700">Couldn’t search guests. Try again.</li>}
                {!loading && !failed && results.length === 0 && (
                  <li className="px-3 py-2.5 text-[13px] text-ink-600">No guest matches “{q.trim()}”. Register a new guest below.</li>
                )}
                {!loading && results.map((g) => (
                  <li key={g.guest_id}>
                    <button type="button" onClick={() => pick(g)} className="block w-full px-3 py-2 text-left hover:bg-paper-200 focus:bg-paper-200 focus:outline-none">
                      <span className="block truncate text-sm font-medium text-ink-900">{g.full_name}</span>
                      <span className="block truncate text-2xs text-ink-600">{g.nic_passport} · {g.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p id={`${id}-help`} className="mt-1.5 text-2xs text-ink-600">Name, NIC/passport or email</p>
          <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => setDrawer(true)}>Register new guest</Button>
        </>
      )}
      <GuestFormDrawer open={drawer} onClose={() => setDrawer(false)} onCreated={pick} onFindExisting={(nic) => { setQ(nic); setOpen(true); }} />
    </div>
  );
}
