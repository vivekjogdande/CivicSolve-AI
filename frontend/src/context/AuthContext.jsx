import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../services/api';
import { useToast } from './ToastContext';

const AuthCtx = createContext(null);
const AUTHORITY = ['OFFICER', 'SENIOR_OFFICER', 'ADMIN'];

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  // Restore the session from a stored token
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  // Any API call that comes back 401 ends the session
  useEffect(() => {
    const onUnauthorized = () => { setUser(null); toast.error('Your session expired. Please log in again.'); };
    window.addEventListener('rc:unauthorized', onUnauthorized);
    return () => window.removeEventListener('rc:unauthorized', onUnauthorized);
  }, [toast]);

  const finish = (d) => { tokenStore.set(d.token); setUser(d.user); return d.user; };

  const loginCitizen = useCallback(async (email, password) => finish(await api.post('/api/auth/citizen/login', { email, password }, { auth: false })), []);
  const loginAuthority = useCallback(async (email, password) => finish(await api.post('/api/auth/authority/login', { email, password }, { auth: false })), []);
  const register = useCallback(async (form) => finish(await api.post('/api/auth/register', form, { auth: false })), []);
  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  const value = useMemo(
    () => ({
      user, setUser, loading, isAuthed: !!user, role: user ? user.role : null,
      isCitizen: !!user && user.role === 'CITIZEN',
      isAuthority: !!user && AUTHORITY.includes(user.role),
      isSenior: !!user && (user.role === 'SENIOR_OFFICER' || user.role === 'ADMIN'),
      isAdmin: !!user && user.role === 'ADMIN',
      loginCitizen, loginAuthority, register, logout,
    }),
    [user, loading, loginCitizen, loginAuthority, register, logout]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/** Where each role lands after login. */
export const homeFor = (role) => (role === 'CITIZEN' ? '/dashboard' : role === 'ADMIN' ? '/admin' : '/authority');
