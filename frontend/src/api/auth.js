// =============================================================================
// frontend/src/api/auth.js
// =============================================================================
// Purpose:
//   API functions for authentication. Called by the Login page and
//   AuthContext to handle login and session management.
//
// Functions to implement:
//
//   /**
//    * Sends login credentials to the backend and returns the JWT token + role.
//    * @param {string} email
//    * @param {string} password
//    * @returns {{ access_token: string, token_type: string, role: string, account_id: string }}
//    */
//   export async function login(email, password) {
//     const response = await client.post('/auth/login', { email, password });
//     return response.data;
//   }
//
//   /**
//    * Fetches the currently authenticated user's profile.
//    * Useful for restoring session on page refresh.
//    * @returns {{ account_id: string, email: string, role: string }}
//    */
//   export async function getMe() {
//     const response = await client.get('/auth/me');
//     return response.data;
//   }
//
// API contract (POST /api/auth/login):
//   Body:    { email, password }
//   Returns: { access_token, token_type: "bearer", role, account_id }
//
// Dependencies:
//   - ./client  (shared Axios instance)
// =============================================================================

// TODO: Implement api/auth.js
