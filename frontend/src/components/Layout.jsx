import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import Footer from './Footer';
import Navbar from './Navbar';

const TITLES = [
  ['/rooms', 'Rooms'],
  ['/login', 'Sign in'],
  ['/register', 'Create account'],
  ['/booking', 'Book a room'],
  ['/my-bookings', 'My bookings'],
  ['/services', 'Add services'],
  ['/profile', 'Your profile'],
  ['/dashboard/receptionist', 'Today'],
  ['/dashboard/manager', 'Manager dashboard'],
  ['/dashboard/admin', 'Admin console'],
  ['/404', 'Page not found'],
];

export default function Layout() {
  const { pathname, search } = useLocation();

  // Start each page at the top on navigation and keep the tab title meaningful.
  useEffect(() => {
    window.scrollTo(0, 0);
    const match = TITLES.find(([p]) => pathname.startsWith(p));
    document.title = match ? `${match[1]} · SkyNest Hotels` : 'SkyNest Hotels';
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-paper-50 focus:px-3 focus:py-2 focus:text-sm focus:shadow-overlay"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        {/* resetKey: navigating anywhere (navbar, back) clears a crashed page */}
        <ErrorBoundary page resetKey={pathname + search}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />

    </div>
  );
}
