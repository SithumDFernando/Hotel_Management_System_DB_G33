// =============================================================================
// frontend/src/routes/ProtectedRoute.jsx
// =============================================================================
// Purpose:
//   A route guard component that wraps page components to restrict access
//   based on whether the user is authenticated and has one of the required roles.
//
//   Behaviour:
//     - If authentication is still loading (session restore in progress):
//         Render a loading spinner (do NOT redirect yet — avoids flash-to-login).
//     - If the user is NOT logged in:
//         Redirect to /login, preserving the intended URL in `state` so the
//         Login page can redirect back after successful login.
//     - If the user IS logged in but their role is NOT in the `roles` array:
//         Redirect to their appropriate dashboard (role-based redirect) or show
//         a 403 Forbidden message.
//     - If the user IS logged in and has the correct role:
//         Render the child component.
//
// What to implement here:
//   import { Navigate, useLocation } from 'react-router-dom';
//   import { useAuth } from '../hooks/useAuth';
//
//   /**
//    * @param {React.ReactNode} children  - The page component to render if authorised
//    * @param {string[]}        roles     - List of roles allowed to access this route
//    *                                     (empty array = any authenticated user)
//    */
//   export default function ProtectedRoute({ children, roles = [] }) {
//     const { user, isLoading } = useAuth();
//     const location = useLocation();
//
//     if (isLoading) return <div className="loading-spinner">Loading...</div>;
//
//     if (!user) {
//       return <Navigate to="/login" state={{ from: location }} replace />;
//     }
//
//     if (roles.length > 0 && !roles.includes(user.role)) {
//       return <Navigate to="/" replace />;  // or show a 403 page
//     }
//
//     return children;
//   }
//
// Usage in App.jsx:
//   <ProtectedRoute roles={["receptionist", "manager"]}>
//     <ReceptionistDashboard />
//   </ProtectedRoute>
//
// Dependencies:
//   - react-router-dom  (Navigate, useLocation)
//   - ../hooks/useAuth  (user, isLoading)
// =============================================================================

// TODO: Implement ProtectedRoute.jsx
