// =============================================================================
// frontend/src/pages/Login.jsx
// =============================================================================
// Purpose:
//   Authentication page with email + password form. On successful login,
//   stores the JWT token via AuthContext and redirects the user to their
//   role-appropriate dashboard. Route: GET /login
//
// What to implement here:
//   - Email input and password input (with show/hide toggle for UX).
//   - "Login" submit button (show loading state while request is in flight).
//   - Error message display for invalid credentials (HTTP 401 from API).
//   - On success:
//       1. Call authApi.login(email, password) → receives { access_token, role, account_id }
//       2. Call AuthContext.login(token, { role, account_id }) to persist state.
//       3. Redirect based on role:
//            admin       → /dashboard/admin
//            manager     → /dashboard/manager
//            receptionist → /dashboard/receptionist
//            guest       → /rooms
//   - If user is already logged in, redirect away from /login immediately.
//
// UX notes:
//   - Display the SkyNest logo/brand above the form for visual identity.
//   - Use a centred card layout (not full-width form).
//   - Highlight invalid fields with a red border + helper text.
//
// API calls:
//   POST /api/auth/login   → { access_token, token_type, role, account_id }
//
// Dependencies:
//   - react              (useState)
//   - react-router-dom   (useNavigate, Navigate)
//   - ../api/auth        (login)
//   - ../hooks/useAuth   (login method from context)
// =============================================================================

// TODO: Implement Login.jsx
