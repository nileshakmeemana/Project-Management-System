'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser, clearSession, apiCall } from '@/lib/api';

interface AuthResult {
  user: any;
  loading: boolean;
  logout: () => void;
}

export function useAuth(requiredRole?: 'admin' | 'employee'): AuthResult {
  const [user, setUser]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router  = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('dc_token') : null;
      const raw   = typeof window !== 'undefined' ? localStorage.getItem('dc_user')  : null;
      const u     = raw ? JSON.parse(raw) : null;

      if (!token || !u) {
        router.replace('/auth');
        return;
      }
      if (requiredRole && u.role !== requiredRole) {
        router.replace(u.role === 'admin' ? '/admin' : '/employee');
        return;
      }
      setUser(u);
      setLoading(false);
    } catch {
      router.replace('/auth');
    }
  }, []);

  const logout = useCallback(async () => {
    try { await apiCall('POST', '/auth/logout'); } catch {}
    clearSession();
    router.replace('/auth');
  }, []);

  // Always return a valid object — never null
  return { user, loading, logout };
}
