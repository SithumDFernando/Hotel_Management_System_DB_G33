// =============================================================================
// frontend/src/components/Layout.jsx
// =============================================================================
// Purpose:
//   Shared page shell that wraps every page in the app. Renders the <Navbar>
//   at the top and uses React Router's <Outlet> to render the active page's
//   content below it. This is the single layout component referenced in App.jsx
//   as the parent route element.
//
// What to implement here:
//   import Navbar from './Navbar';
//   import { Outlet } from 'react-router-dom';
//
//   export default function Layout() {
//     return (
//       <div className="app-shell">
//         <Navbar />
//         <main className="page-content">
//           <Outlet />   {/* Active page component renders here */}
//         </main>
//       </div>
//     );
//   }
//
// Styling notes:
//   - .app-shell  : min-height: 100vh; display: flex; flex-direction: column;
//   - .page-content : flex: 1; padding: 1.5rem 2rem; max-width: 1200px; margin: 0 auto;
//   - The Navbar has a fixed/sticky height. Add matching top padding if sticky.
//
// Props: none (layout reads auth state via useAuth() inside Navbar)
//
// Used by:
//   - App.jsx as the parent <Route element={<Layout />}> wrapper for all routes
// =============================================================================

// TODO: Implement Layout.jsx
