'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser, clearSession, apiCall } from '@/lib/api';

interface ClientShellProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'employee';
}

export default function ClientShell({ children, requiredRole }: ClientShellProps) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'redirecting'>('checking');
  const [user, setUser]     = useState<any>(null);
  const router  = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    const token = getToken();
    const u     = getUser();

    if (!token || !u) {
      setStatus('redirecting');
      router.replace('/auth');
      return;
    }

    if (requiredRole && u.role !== requiredRole) {
      setStatus('redirecting');
      router.replace(u.role === 'admin' ? '/admin' : '/employee');
      return;
    }

    setUser(u);
    setStatus('ok');
  }, []);

  // While checking or redirecting — show dark blank screen, NO flash
  if (status === 'checking' || status === 'redirecting') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
      }} />
    );
  }

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}

// Simple user context so layouts can access the authenticated user
import { createContext, useContext } from 'react';
const UserContext = createContext<any>(null);
export const useShellUser = () => useContext(UserContext);

// Logout helper
export async function logout(router: any) {
  try { await apiCall('POST', '/auth/logout'); } catch {}
  clearSession();
  router.replace('/auth');
}
