import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { homeForRole } from '@/context/AuthContext';
import { errorMessage } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { InlineAlert } from '@/components/ui/States';
import { HERO_IMAGE } from '@/lib/media';

// Seeded accounts (db/seed/sample_data.sql) — shown only in dev builds so the
// team can sign in with one click while demoing.
const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@skynest.lk' },
  { label: 'Manager', email: 'mgr.colombo@skynest.lk' },
  { label: 'Reception', email: 'rec.colombo@skynest.lk' },
  { label: 'Guest', email: 'kamal@mail.com' },
];
const DEMO_PASSWORD = 'SkyNest@2026';

// Only follow same-site relative redirects.
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null);

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
      setError(err.response?.status === 401 ? 'Invalid email or password.' : errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-navy-900 lg:block">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-navy-800/30" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <span className="mb-6 h-px w-14 bg-gold-400" />
          <h2 className="max-w-md text-4xl font-semibold leading-tight">“Your sky-high stay, effortlessly managed.”</h2>
          <p className="mt-4 max-w-sm text-sm text-navy-200">
            Centralised reservations, billing and guest services across Colombo, Kandy and Galle.
          </p>
        </div>
      </aside>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <div className="mb-6 text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-gold-700">
                <Icon name="building" className="h-6 w-6" />
              </span>
              <h1 className="text-3xl font-semibold">Welcome back</h1>
              <p className="mt-1 text-sm text-navy-500">Sign in to your SkyNest account</p>
            </div>

            <form onSubmit={submit} className="space-y-4" noValidate>
              {error && <InlineAlert>{error}</InlineAlert>}

              <div>
                <label htmlFor="email" className="label">Email address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-navy-400 hover:text-navy-700"
                  >
                    <Icon name={show ? 'eyeOff' : 'eye'} />
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email || !password}>
                Sign in <Icon name="arrowRight" />
              </Button>
            </form>

            {import.meta.env.DEV && (
              <div className="mt-6 border-t border-navy-100 pt-5">
                <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                  Demo accounts (dev only)
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => {
                        setEmail(a.email);
                        setPassword(DEMO_PASSWORD);
                        setError('');
                      }}
                      className="rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700 hover:bg-gold-100"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-navy-500">
            New guest?{' '}
            <Link to="/register" className="font-semibold text-gold-700 underline-offset-2 hover:underline">
              Create an account
            </Link>
            <span className="mx-2">·</span>
            Staff accounts are issued by your branch manager.
          </p>
        </div>
      </section>
    </div>
  );
}
