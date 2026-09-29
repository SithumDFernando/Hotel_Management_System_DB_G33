// =============================================================================
// frontend/src/api/client.js
// =============================================================================
// Purpose:
//   Configures and exports a shared Axios (or fetch) HTTP client instance that
//   all API modules use to make requests to the FastAPI backend. Centralising
//   the client configuration here means:
//     - The base URL is set once (reads from VITE_API_BASE_URL env var).
//     - The Authorization header (Bearer token) is automatically attached
//       to every request via a request interceptor.
//     - 401 responses (expired/invalid token) are intercepted globally and
//       trigger an automatic logout + redirect to /login.
//
// What to implement here:
//   import axios from 'axios';
//
//   const client = axios.create({
//     baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
//     headers: { 'Content-Type': 'application/json' },
//   });
//
//   // Request interceptor: attach token from localStorage
//   client.interceptors.request.use((config) => {
//     const token = localStorage.getItem('access_token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   });
//
//   // Response interceptor: handle 401 globally (session expired)
//   client.interceptors.response.use(
//     (response) => response,
//     (error) => {
//       if (error.response?.status === 401) {
//         localStorage.removeItem('access_token');
//         window.location.href = '/login';
//       }
//       return Promise.reject(error);
//     }
//   );
//
//   export default client;
//
// Dependencies:
//   - axios (npm install axios)
//   - VITE_API_BASE_URL environment variable (see frontend/.env.example)
// =============================================================================

// TODO: Implement api/client.js
