// =============================================================================
// frontend/src/components/Navbar.jsx
// =============================================================================
// Purpose:
//   Top navigation bar rendered on every page. Displays different nav items
//   depending on the authenticated user's role (or "not logged in" state).
//   Reads from AuthContext via useAuth() to determine what to show.
//
// Nav items by role (from docs/specs/09_frontend_pages.md):
//   Public (not logged in) : Home | Rooms | Login
//   guest                  : Home | Rooms | My Bookings | Logout
//   receptionist           : Dashboard | Rooms | New Booking | Logout
//   manager                : Dashboard | Reports | Logout
//   admin                  : Dashboard | Branches | Users | Reports | Logout
//
// What to implement here:
//   - SkyNest logo/brand link on the left (navigates to /).
//   - Conditional nav links based on user role (use a map or switch over role).
//   - "Logout" button: calls useAuth().logout() which clears token and redirects.
//   - Active link highlighting using NavLink's `className` prop with "active" class.
//   - Mobile-responsive hamburger menu (optional for MVP, recommended for polish).
//
// Example structure:
//   <nav className="navbar">
//     <Link to="/" className="navbar-brand">SkyNest</Link>
//     <ul className="nav-links">
//       {navItems[user?.role || 'public'].map(item => (
//         <li key={item.label}>
//           <NavLink to={item.path}>{item.label}</NavLink>
//         </li>
//       ))}
//       {user && <li><button onClick={logout}>Logout</button></li>}
//     </ul>
//   </nav>
//
// Props: none (reads auth state internally via useAuth)
//
// Dependencies:
//   - react-router-dom (Link, NavLink)
//   - ../hooks/useAuth
// =============================================================================

// TODO: Implement Navbar.jsx
