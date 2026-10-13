import { useEffect, useState } from 'react';
import { changePassword, getProfile, updateProfile } from '@/api/auth';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, fieldErrors, passwordError } from '@/utils/formatters';

const ROLE_LABEL = { admin: 'Administrator', manager: 'Manager', receptionist: 'Receptionist', guest: 'Guest' };
const GENDERS = ['Male', 'Female', 'Other'];
const EDITABLE = ['full_name', 'phone', 'date_of_birth', 'nationality', 'gender'];

const fromGuest = (g) => Object.fromEntries(EDITABLE.map((k) => [k, g?.[k] ?? '']));

function ReadOnly({ label, value, hint }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-600">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink-900">{value || '–'}</dd>
      {hint && <dd className="mt-0.5 text-2xs text-ink-600">{hint}</dd>}
    </div>
  );
}

// Guest contact details. Email (the login) and NIC/passport are changed at the front desk.
function DetailsForm({ guest, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => fromGuest(guest));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setF(fromGuest(guest)), [guest]);

  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const original = fromGuest(guest);
  // Send only changed, non-empty fields (the API rejects an empty update with 400).
  const changes = Object.fromEntries(
    EDITABLE.filter((k) => f[k].trim() !== String(original[k]).trim() && f[k].trim() !== '').map((k) => [k, f[k].trim()]),
  );
  const dirty = Object.keys(changes).length > 0;

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = {};
    if (f.full_name.trim().length < 2) v.full_name = 'Enter your full name.';
    if (f.phone.replace(/\D/g, '').length < 7) v.phone = 'Enter a phone number with at least 7 digits.';
    setErrors(v);
    if (Object.keys(v).length || !dirty) return;

    setBusy(true);
    try {
      const saved = await updateProfile(changes);
      toast.success(`Saved: personal details for ${saved.full_name}`);
      onSaved(saved);
    } catch (err) {
      const fields = fieldErrors(err);
      if (Object.keys(fields).length) setErrors(fields);
      else setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-4 sm:p-6" aria-labelledby="details-heading">
      <div>
        <h2 id="details-heading" className="text-base font-semibold text-ink-900">Personal details</h2>
        <p className="mt-1 text-[13px] text-ink-600">Used on your bookings and bills.</p>
      </div>
      {serverError && <InlineAlert>{serverError}</InlineAlert>}

      <Input label="Full name" required value={f.full_name} onChange={set('full_name')} error={errors.full_name} autoComplete="name" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Phone" type="tel" required value={f.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
        <Input label="Nationality" value={f.nationality} onChange={set('nationality')} placeholder="e.g. Sri Lankan" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Date of birth" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} />
        <Select label="Gender" value={f.gender} onChange={set('gender')}>
          <option value="">Not specified</option>
          {GENDERS.map((g) => <option key={g}>{g}</option>)}
        </Select>
      </div>

      <dl className="grid gap-4 border-t border-ink-100 pt-4 sm:grid-cols-2">
        <ReadOnly label="Email" value={guest.email} hint="Your sign-in email. Ask the front desk to change it." />
        <ReadOnly label="NIC / Passport" value={guest.nic_passport} hint="Ask the front desk to change it." />
      </dl>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={!dirty || busy} onClick={() => { setF(original); setErrors({}); }}>Discard changes</Button>
        <Button type="submit" loading={busy} disabled={!dirty}>Save details</Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const empty = { current: '', next: '', confirm: '' };
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = {};
    if (!f.current) v.current = 'Enter your current password.';
    if (passwordError(f.next)) v.next = passwordError(f.next);
    else if (f.next === f.current) v.next = 'Choose a password different from the current one.';
    if (f.confirm !== f.next) v.confirm = 'This doesn’t match the new password.';
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      await changePassword(f.current, f.next);
      setF(empty);
      toast.success('Password changed. Use the new one next time you sign in.');
    } catch (err) {
      // "Current password is incorrect." belongs under that field.
      if (err.response?.status === 400 && /current password/i.test(err.response?.data?.detail || '')) {
        setErrors({ current: errorMessage(err) });
      } else {
        const fields = fieldErrors(err);
        if (fields.new_password) setErrors({ next: fields.new_password });
        else setServerError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-4 sm:p-6" aria-labelledby="password-heading">
      <h2 id="password-heading" className="text-base font-semibold text-ink-900">Change password</h2>
      {serverError && <InlineAlert>{serverError}</InlineAlert>}
      <Input label="Current password" type="password" required value={f.current} onChange={set('current')} error={errors.current} autoComplete="current-password" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="New password" type="password" required value={f.next} onChange={set('next')} error={errors.next} hint="8 to 72 characters" autoComplete="new-password" />
        <Input label="Confirm new password" type="password" required value={f.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={busy}>Change password</Button>
      </div>
    </form>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch, setData } = useFetch((s) => getProfile(s), [], { failMessage: "Couldn't load your profile." });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-ink-900">Your profile</h1>
        <p className="mt-0.5 text-sm text-ink-600">{ROLE_LABEL[user.role]} account</p>
      </header>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <div className="space-y-6">
          <section className="card p-4 sm:p-6" aria-labelledby="account-heading">
            <h2 id="account-heading" className="text-base font-semibold text-ink-900">Account</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <ReadOnly label="Sign-in email" value={data.email} />
              <ReadOnly label="Role" value={ROLE_LABEL[data.role] || data.role} />
              {data.branch_name && <ReadOnly label="Branch" value={data.branch_name} />}
            </dl>
          </section>

          {data.role === 'guest' && (data.guest ? (
            <DetailsForm guest={data.guest} onSaved={(guest) => setData((p) => ({ ...p, guest }))} />
          ) : (
            <InlineAlert tone="info">This account has no guest profile yet. Contact the front desk to set it up.</InlineAlert>
          ))}

          <PasswordForm />
        </div>
      )}
    </div>
  );
}
