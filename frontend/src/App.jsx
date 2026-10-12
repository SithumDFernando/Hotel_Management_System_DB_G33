// =============================================================================
// frontend/src/App.jsx
// =============================================================================
// Purpose:
//   Root application component. Defines the client-side route map using
//   React Router's <Routes> and <Route> elements. Applies the shared
//   <Layout> wrapper (Navbar + main content area) to all pages.
//
// Route map to implement (from docs/specs/09_frontend_pages.md):
//   /                           → <Home />              (Public)
//   /rooms                      → <RoomsBrowse />       (Public)
//   /login                      → <Login />             (Public)
//   /booking/:roomId            → <BookingCheckout />   (Protected: guest, receptionist, manager)
//   /services/:bookingId        → <ServiceRequest />    (Protected: receptionist, manager)
//   /dashboard/receptionist     → <ReceptionistDashboard /> (Protected: receptionist)
//   /dashboard/manager          → <ManagerDashboard />  (Protected: manager)
//   /dashboard/admin            → <AdminDashboard />    (Protected: admin)
//   *                           → Redirect to / (404 fallback)
//
// What to implement here:
//   import { Routes, Route, Navigate } from 'react-router-dom';
//   import Layout from './components/Layout';
//   import ProtectedRoute from './routes/ProtectedRoute';
//   // ... import all page components
//
//   export default function App() {
//     return (
//       <Routes>
//         <Route path="/" element={<Layout />}>
//           <Route index element={<Home />} />
//           <Route path="rooms" element={<RoomsBrowse />} />
//           <Route path="login" element={<Login />} />
//           <Route path="booking/:roomId" element={
//             <ProtectedRoute roles={["guest", "receptionist", "manager"]}>
//               <BookingCheckout />
//             </ProtectedRoute>
//           } />
//           {/* ... other protected routes */}
//           <Route path="*" element={<Navigate to="/" replace />} />
//         </Route>
//       </Routes>
//     );
//   }
//
// Dependencies:
//   - react-router-dom            (Routes, Route, Navigate)
//   - ./components/Layout         (shared page shell with Navbar)
//   - ./routes/ProtectedRoute     (role-based access guard)
//   - ./pages/*                   (all page components)
// =============================================================================

// TODO: Implement App.jsx
