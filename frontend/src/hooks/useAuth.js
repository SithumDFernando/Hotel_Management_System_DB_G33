// =============================================================================
// frontend/src/hooks/useAuth.js
// =============================================================================
// Purpose:
//   A thin convenience hook that wraps `useContext(AuthContext)`. Using this
//   hook instead of calling useContext directly provides a cleaner API and
//   makes it easy to add runtime checks (e.g. throw if used outside provider).
//
// What to implement here:
//   import { useContext } from 'react';
//   import { AuthContext } from '../context/AuthContext';
//
//   /**
//    * Returns the current authentication context value.
//    * Must be called inside a component that is a descendant of <AuthProvider>.
//    *
//    * @returns {{ user, token, isLoading, login, logout }}
//    * @throws {Error} if called outside of AuthProvider
//    */
//   export function useAuth() {
//     const context = useContext(AuthContext);
//     if (!context) {
//       throw new Error('useAuth must be used within an <AuthProvider>');
//     }
//     return context;
//   }
//
// Usage example:
//   import { useAuth } from '../hooks/useAuth';
//
//   function Navbar() {
//     const { user, logout } = useAuth();
//     return <nav>{user ? <button onClick={logout}>Logout</button> : null}</nav>;
//   }
//
// Dependencies:
//   - ../context/AuthContext
// =============================================================================

// TODO: Implement useAuth.js
