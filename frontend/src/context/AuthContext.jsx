// =============================================================================
// frontend/src/context/AuthContext.jsx
// =============================================================================
// Purpose:
//   React Context that provides authentication state (current user, JWT token,
//   and role) to the entire component tree. Components anywhere in the app
//   can call `useContext(AuthContext)` (or the `useAuth` hook) to access the
//   current user without prop-drilling.
//
// What to implement here:
//
//   State managed:
//     - user: { account_id, email, role } | null
//     - token: string | null  (the raw JWT stored in localStorage)
//     - isLoading: boolean    (true while restoring session from localStorage)
//
//   Context value to expose:
//     { user, token, isLoading, login, logout }
//
//   Functions:
//     login(token, userInfo):
//       - Saves token to localStorage ('access_token').
//       - Saves user info to state.
//       - Typically called from the Login page after a successful POST /auth/login.
//
//     logout():
//       - Removes 'access_token' from localStorage.
//       - Clears user and token state.
//       - Navigates to /login.
//
//   Session restore (useEffect on mount):
//     - On first render, check if localStorage has 'access_token'.
//     - If yes, call getMe() from api/auth.js to verify and restore the session.
//     - If getMe() fails (token expired), call logout().
//     - While restoring, set isLoading = true so ProtectedRoute doesn't flash
//       the login page before the session is confirmed.
//
// Usage example in a component:
//   import { useContext } from 'react';
//   import { AuthContext } from '../context/AuthContext';
//   const { user, logout } = useContext(AuthContext);
//
// Or via the useAuth hook (see hooks/useAuth.js).
//
// Dependencies:
//   - react              (createContext, useState, useEffect, useContext)
//   - react-router-dom   (useNavigate — for redirect on logout)
//   - ../api/auth        (getMe — for session restore)
// =============================================================================

// TODO: Implement AuthContext.jsx
