import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { homeForRole } from '@/context/AuthContext';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

// Nav items per role (docs/specs/09_frontend_pages.md "Navbar Behavior by Role").
const NAV = {
  public: [
    { to: '/', label: 'Home' },
    { to: '/rooms', label: 'Rooms' },
    { to: '/login', label: 'Login' },
  ],
  guest: [
    { to: '/', label: 'Home' },
    { to: '/rooms', label: 'Rooms' },
    { to: '/my-bookings', label: 'My Bookings' },
  ],
  receptionist: [
    { to: '/dashboard/receptionist', label: 'Dashboard' },
    { to: '/rooms', label: 'Rooms' },
    { to: '/rooms?mode=booking', label: 'New Booking' },
  ],
  manager: [
    { to: '/dashboard/manager', label: 'Dashboard' },
    { to: '/dashboard/manager?tab=reports', label: 'Reports' },
  ],
  admin: [
    { to: '/dashboard/admin', label: 'Dashboard' },
    { to: '/dashboard/admin?tab=branches', label: 'Branches' },
    { to: '/dashboard/admin?tab=users', label: 'Users' },
    { to: '/dashboard/admin?tab=reports', label: 'Reports' },
  ],
};

const ROLE_LABEL = { admin: 'Administrator', manager: 'Manager', receptionist: 'Receptionist', guest: 'Guest' };

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const items = NAV[isAuthenticated ? user.role : 'public'];
  const staff = isAuthenticated && user.role !== 'guest';

  // Items may carry a query (?tab=); an item is active when path and query match.
  const isActive = (to) => {
    const [path, query] = to.split('?');
    if (location.pathname !== path) return false;
    const current = new URLSearchParams(location.search);
    if (query) return [...new URLSearchParams(query)].every(([k, v]) => current.get(k) === v);
    // A plain link (no query) is active only when no tab/mode is selected.
    return !current.has('tab') && !current.has('mode');
  };

  // Ask first: signing out drops any unsaved work on the current page.
  const askLogout = () => {
    setOpen(false);
    setConfirmLogout(true);
  };

  const onLogout = () => {
    const email = user?.email;
    setConfirmLogout(false);
    logout();
    navigate('/');
    toast.success(email ? `Signed out: ${email}` : 'Signed out');
  };

  const link = (item, mobile) => (
    <Link
      key={item.to}
      to={item.to}
      onClick={() => setOpen(false)}
      aria-current={isActive(item.to) ? 'page' : undefined}
      className={
        mobile
          ? `block rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive(item.to) ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-50'}`
          : `rounded-lg px-4 py-2 text-sm font-semibold transition ${isActive(item.to) ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-50'}`
      }
    >
      {item.label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to={isAuthenticated ? homeForRole(user.role) : '/'} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
            <Icon name="building" className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg font-semibold">SkyNest</span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-gold-700">
              {staff ? 'Staff Portal' : 'Hospitality · Sri Lanka'}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {items.filter((i) => isAuthenticated || i.to !== '/login').map((i) => link(i))}
          {!isAuthenticated && link({ to: '/login', label: 'Login' })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                title="Your profile"
                aria-current={location.pathname === '/profile' ? 'page' : undefined}
                className="rounded-lg px-2 py-1 text-right leading-tight hover:bg-navy-50"
              >
                <p className="max-w-[180px] truncate text-xs font-semibold">{user.email}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gold-700">{ROLE_LABEL[user.role]} · Profile</p>
              </Link>
              <Button variant="outline" size="sm" onClick={askLogout}>
                <Icon name="logout" className="h-3.5 w-3.5" /> Sign out
              </Button>
            </>
          ) : (
            <Button to="/rooms">Book a Stay</Button>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-navy-700 hover:bg-navy-50 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <Icon name={open ? 'x' : 'menu'} className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="border-t border-navy-100 bg-white px-4 py-3 lg:hidden">
          <nav className="space-y-1" aria-label="Mobile">{items.map((i) => link(i, true))}</nav>
          <div className="mt-3 border-t border-navy-100 pt-3">
            {isAuthenticated ? (
              <>
                <p className="px-3 text-xs text-navy-500">
                  {user.email} · {ROLE_LABEL[user.role]}
                </p>
                <div className="mt-2">{link({ to: '/profile', label: 'Profile' }, true)}</div>
                <Button variant="outline" className="mt-2 w-full" onClick={askLogout}>
                  <Icon name="logout" /> Sign out
                </Button>
              </>
            ) : (
              <Button to="/rooms" className="w-full" onClick={() => setOpen(false)}>
                Book a Stay
              </Button>
            )}
          </div>
        </div>
      )}

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        size="sm"
        title="Sign out of SkyNest?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmLogout(false)}>Stay signed in</Button>
            <Button variant="dark" onClick={onLogout}>Sign out</Button>
          </div>
        }
      >
        <p className="text-sm text-navy-600">
          You’ll need your email and password to sign back in{user ? ` as ${user.email}` : ''}.
        </p>
      </Modal>
    </header>
  );
}
