import axios from 'axios';

export const TOKEN_KEY = 'skynest_token';
export const UNAUTHORIZED_EVENT = 'skynest:unauthorized';

export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const storeToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — session just won't persist */
  }
};

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 while we hold a token means it expired/was revoked: tell AuthContext.
// (A 401 from /auth/login has no token yet, so the form can show its own error.)
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && getStoredToken()) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(err);
  },
);

export default client;
