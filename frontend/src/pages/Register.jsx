import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { homeForRole } from '@/context/AuthContext';
import { signup } from '@/api/auth';
import { errorMessage, passwordError } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import { InlineAlert } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const EMPTY = { full_name: '', nic_passport: '', email: '', phone: '', password: '', confirm: '', nationality: '' };

function validate(f) {
  const e = {};
  if (f.full_name.trim().length < 2) e.full_name = 'Enter your full name';
  if (f.nic_passport.trim().length < 4) e.nic_passport = 'Enter a valid NIC or passport number';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address';
  if (f.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a valid phone number';
  if (passwordError(f.password)) e.password = passwordError(f.password);
  if (f.confirm !== f.password) e.confirm = 'Passwords do not match';
  return e;
}

export default function Register() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const next = params.get('next');

  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated && !busy) return <Navigate to={homeForRole(user.role)} replace />;

  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = validate(f);
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      await signup({
        full_name: f.full_name.trim(),
        nic_passport: f.nic_passport.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        password: f.password,
        nationality: f.nationality.trim() || null,
      });
      await login(f.email.trim(), f.password);
      toast.success('Welcome to SkyNest! Your account is ready.');
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/rooms', { replace: true });
    } catch (err) {
      setServerError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-6 text-center">
        <p className="eyebrow">Guest account</p>
        <h1 className="mt-1 text-4xl font-semibold">Create your account</h1>
        <p className="mt-2 text-sm text-navy-500">Book rooms, track your stays and view your bills in one place.</p>
      </div>

      <form onSubmit={submit} noValidate className="card space-y-4 p-6 sm:p-8">
        {serverError && <InlineAlert>{serverError}</InlineAlert>}

        <Input label="Full name" required value={f.full_name} onChange={set('full_name')} error={errors.full_name} autoComplete="name" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="NIC / Passport" required value={f.nic_passport} onChange={set('nic_passport')} error={errors.nic_passport} />
          <Input label="Nationality" value={f.nationality} onChange={set('nationality')} placeholder="e.g. Sri Lankan" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" required value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          <Input label="Phone" type="tel" required value={f.phone} onChange={set('phone')} error={errors.phone} placeholder="+94 77 123 4567" autoComplete="tel" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Password" type="password" required value={f.password} onChange={set('password')} error={errors.password} hint="8 to 72 characters" autoComplete="new-password" />
          <Input label="Confirm password" type="password" required value={f.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
        </div>

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account <Icon name="arrowRight" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-navy-500">
        Already have an account?{' '}
        <Link to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="font-semibold text-gold-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
