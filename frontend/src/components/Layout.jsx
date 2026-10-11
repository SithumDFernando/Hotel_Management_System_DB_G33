import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

function Footer() {
  return (
    <footer className="mt-16 border-t border-navy-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="font-serif text-lg font-semibold">SkyNest Hotels</p>
          <p className="text-xs text-navy-500">Boutique stays in Colombo, Kandy &amp; Galle</p>
        </div>
        <nav className="flex gap-5 text-xs font-semibold text-navy-600" aria-label="Branches">
          <Link to="/rooms?city=Colombo" className="hover:text-gold-700">Colombo</Link>
          <Link to="/rooms?city=Kandy" className="hover:text-gold-700">Kandy</Link>
          <Link to="/rooms?city=Galle" className="hover:text-gold-700">Galle</Link>
        </nav>
        <p className="text-xs text-navy-400">© {new Date().getFullYear()} SkyNest Hospitality Group</p>
      </div>
    </footer>
  );
}

const TITLES = [
  ['/rooms', 'Rooms'],
  ['/login', 'Sign in'],
  ['/register', 'Create account'],
  ['/booking', 'Book a room'],
  ['/my-bookings', 'My bookings'],
  ['/services', 'Service requests'],
  ['/dashboard/receptionist', 'Front desk'],
  ['/dashboard/manager', 'Manager dashboard'],
  ['/dashboard/admin', 'Admin console'],
  ['/404', 'Page not found'],
];

export default function Layout() {
  const { pathname } = useLocation();
  // Start each page at the top on navigation and keep the tab title meaningful.
  useEffect(() => {
    window.scrollTo(0, 0);
    const match = TITLES.find(([p]) => pathname.startsWith(p));
    document.title = match ? `${match[1]} · SkyNest Hotels` : 'SkyNest Hotels';
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
