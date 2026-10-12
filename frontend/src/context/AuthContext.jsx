import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '@/api/auth';
import { getStoredToken, storeToken, UNAUTHORIZED_EVENT } from '@/api/client';

export const AuthContext = createContext(null);

// Decode the JWT payload just to read `exp` — the server remains the authority.
function isExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    return true;
  }
}

export const homeForRole = (role) =>
  ({
    admin: '/dashboard/admin',
    manager: '/dashboard/manager',
    receptionist: '/dashboard/receptionist',
    guest: '/rooms',
  })[role] || '/';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = getStoredToken();
    return t && !isExpired(t) ? t : null;
  });
  const [user, setUser] = useState(null);
  const [isLoading, setLoading] = useState(Boolean(token));

  const logout = useCallback(() => {
    storeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  // Restore session on mount.
  useEffect(() => {
    if (!token) {
      if (getStoredToken()) storeToken(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    authApi
      .getMe()
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && logout())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Axios tells us when the server rejected our token.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  // Auto-logout at token expiry.
  useEffect(() => {
    if (!token) return undefined;
    try {
      const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const ms = exp * 1000 - Date.now();
      if (ms <= 0) {
        logout();
        return undefined;
      }
      const id = setTimeout(logout, Math.min(ms, 2 ** 31 - 1));
      return () => clearTimeout(id);
    } catch {
      return undefined;
    }
  }, [token, logout]);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    storeToken(res.access_token);
    setToken(res.access_token);
    const me = await authApi.getMe();
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      getToken: () => token,
    }),
    [token, user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
