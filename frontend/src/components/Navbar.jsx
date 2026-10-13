import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import { homeForRole } from '@/context/AuthContext';
import { getBranches } from '@/api/auth';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

// Nav items per role (docs/specs/09_frontend_pages.md "Navbar Behavior by Role").
// Signed-out visitors get "Sign in" as a button instead of a link.
const NAV = {
  public: [
    { to: '/', label: 'Home' },
    { to: '/rooms', label: 'Rooms' },
  ],
  guest: [
    { to: '/', label: 'Home' },
    { to: '/rooms', label: 'Rooms' },
    { to: '/my-bookings', label: 'My bookings' },
  ],
  receptionist: [
    { to: '/dashboard/receptionist', label: 'Today' },
    { to: '/rooms', label: 'Rooms' },
    { to: '/rooms?mode=booking', label: 'New booking' },
  ],
  manager: [
    { to: '/dashboard/manager', label: 'Overview' },
    { to: '/dashboard/manager?tab=reports', label: 'Reports' },
  ],
  admin: [
    { to: '/dashboard/admin', label: 'Overview' },
    { to: '/dashboard/admin?tab=branches', label: 'Branches' },
    { to: '/dashboard/admin?tab=users', label: 'Accounts' },
    { to: '/dashboard/admin?tab=reports', label: 'Reports' },
  ],
};

const ROLE_LABEL = { admin: 'Administrator', manager: 'Manager', receptionist: 'Receptionist', guest: 'Guest' };

// Email + role button that opens a small menu (Profile, Sign out).
// Closes on Esc (focus returns to the button), outside click and navigation.
function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const button = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrap.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-900 hover:bg-paper-200"
      >
        <span className="max-w-[200px] truncate">{user.email}</span>
        <Icon name="chevronDown" className="h-4 w-4 text-ink-600" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-ink-100 bg-paper-50 py-1 shadow-overlay">
          <p className="truncate px-3 pb-2 pt-1.5 text-2xs text-ink-600">
            Signed in as {ROLE_LABEL[user.role]}
          </p>
          <div className="border-t border-ink-100 pt-1">
            <Link
              to="/profile"
              aria-current={pathname === '/profile' ? 'page' : undefined}
              className="block px-3 py-2 text-sm text-ink-900 hover:bg-paper-200"
            >
              Your profile
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-ink-900 hover:bg-paper-200"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const items = NAV[isAuthenticated ? user.role : 'public'];
  // Branch staff see their branch in the header (spec 11 §8). Public directory, no new API.
  const branchStaff = isAuthenticated && ['receptionist', 'manager'].includes(user.role) && user.branch_id;
  const branches = useFetch(() => getBranches(), [], { enabled: Boolean(branchStaff) });
  const branch = branchStaff ? branches.data?.branches?.find((b) => b.branch_id === user.branch_id) : null;

  // Close the mobile panel on navigation and on Esc.
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

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

  const link = (item) => {
    const active = isActive(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={`inline-flex h-14 items-center border-b-2 text-sm font-medium transition-colors duration-150 ${
          active ? 'border-tea-700 text-ink-900' : 'border-transparent text-ink-600 hover:text-ink-900'
        }`}
      >
        {item.label}
      </Link>
    );
  };

  const mobileLink = (item) => {
    const active = isActive(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={`block border-l-2 px-3 py-2.5 text-sm font-medium ${
          active ? 'border-tea-700 bg-paper-100 text-ink-900' : 'border-transparent text-ink-600 hover:text-ink-900'
        }`}
      >
        {item.label}
      </Link>
    );
  };

  const branchLabel = branch && (
    <>
      <span className="text-ink-900">{branch.city}</span> · {branch.address}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-paper-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-4 sm:px-6">
        <Link to={isAuthenticated ? homeForRole(user.role) : '/'} className="shrink-0 rounded-md">
          <Logo variant="full" size="md" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
          {items.map(link)}
        </nav>

        <div className="ml-auto hidden min-w-0 items-center gap-4 lg:flex">
          {branchLabel && (
            <p className="hidden min-w-0 truncate text-[13px] text-ink-600 xl:block" title={branch.address}>
              {branchLabel}
            </p>
          )}
          {isAuthenticated ? (
            <UserMenu user={user} onSignOut={askLogout} />
          ) : (
            <Button variant="ghost" size="sm" to="/login">Sign in</Button>
          )}
        </div>

        <button
          type="button"
          className="ml-auto rounded-md p-2 text-ink-900 hover:bg-paper-200 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <Icon name={open ? 'x' : 'menu'} className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-ink-100 bg-paper-50 py-2 lg:hidden">
          <nav aria-label="Main">{items.map(mobileLink)}</nav>
          <div className="mt-2 border-t border-ink-100 px-4 pt-3">
            {isAuthenticated ? (
              <>
                <p className="truncate text-sm text-ink-900">{user.email}</p>
                <p className="text-2xs text-ink-600">{ROLE_LABEL[user.role]}</p>
                {branchLabel && <p className="mt-1 text-2xs text-ink-600">{branchLabel}</p>}
                <div className="mt-2 flex gap-2 pb-1">
                  <Button variant="secondary" size="sm" to="/profile">Your profile</Button>
                  <Button variant="secondary" size="sm" onClick={askLogout}>Sign out</Button>
                </div>
              </>
            ) : (
              <Button variant="secondary" className="mb-1 w-full" to="/login">Sign in</Button>
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
            <Button variant="secondary" onClick={() => setConfirmLogout(false)}>Stay signed in</Button>
            <Button variant="primary" onClick={onLogout}>Sign out</Button>
          </div>
        }
      >
        <p className="text-sm text-ink-600">
          You’ll need your email and password to sign back in{user ? ` as ${user.email}` : ''}.
        </p>
      </Modal>
    </header>
  );
}
