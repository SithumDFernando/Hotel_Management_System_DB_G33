import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { homeForRole } from '@/context/AuthContext';
import { errorMessage } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';

// Seeded accounts (db/seed/sample_data.sql) — shown only in dev builds so the
// team can sign in with one click while demoing.
const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@skynest.lk' },
  { label: 'Manager', email: 'mgr.colombo@skynest.lk' },
  { label: 'Receptionist', email: 'rec.colombo@skynest.lk' },
  { label: 'Guest', email: 'kamal@mail.com' },
];
const DEMO_PASSWORD = 'SkyNest@2026';

// Only follow same-site relative redirects.
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null);

// Spec 11 §9.1 sign-in messages.
const loginError = (err) => {
  const status = err.response?.status;
  if (status === 401) return 'Email or password is incorrect.';
  if (status === 429) return 'Too many sign-in attempts. Wait a minute and try again.';
  return errorMessage(err);
};

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to={next || homeForRole(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const me = await login(email.trim(), password);
      navigate(next || homeForRole(me.role), { replace: true });
    } catch (err) {
      setError(loginError(err));
      setBusy(false);
    }
  };

  const invalid = error ? { 'aria-invalid': true, 'aria-describedby': 'login-error' } : {};

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-12 sm:py-16">
      <div className="text-center">
        <Logo variant="mark" size="lg" className="justify-center" />
        <h1 className="mt-4 font-display text-[32px] font-semibold leading-tight text-ink-900">Sign in to SkyNest</h1>
      </div>

      <form onSubmit={submit} className="card mt-8 space-y-4 p-6" noValidate>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            {...invalid}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="label">Password</label>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
              aria-controls="password"
              className="rounded-sm text-[13px] font-medium text-tea-700 hover:underline"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            {...invalid}
          />
          {error && (
            <p id="login-error" role="alert" className="mt-2 text-[13px] text-signal-700">{error}</p>
          )}
        </div>

        <Button type="submit" className="w-full" loading={busy} disabled={!email || !password}>
          Sign in
        </Button>

        {import.meta.env.DEV && (
          <details className="border-t border-ink-100 pt-4 text-sm">
            <summary className="cursor-pointer rounded-sm text-[13px] text-ink-600">Demo accounts (dev only)</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <Button
                  key={a.email}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(DEMO_PASSWORD);
                    setError('');
                  }}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </details>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        New guest?{' '}
        <Link to="/register" className="rounded-sm font-medium text-tea-700 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-2xs text-ink-600">Staff accounts are created by the system admin.</p>
    </div>
  );
}
