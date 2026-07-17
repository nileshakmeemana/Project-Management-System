/**
 * Simple in-memory SWR-style cache for API calls.
 * - First call fetches from API and caches
 * - Subsequent navigations return cached data instantly (no spinner)
 * - Background revalidation every 30s keeps data fresh
 */
'use client';
import { useState, useEffect, useRef } from 'react';
import { apiCall } from '@/lib/api';

type CacheEntry = { data: any; ts: number };
const CACHE = new Map<string, CacheEntry>();
const LISTENERS = new Map<string, Set<(d: any) => void>>();
const TTL = 30_000; // 30 seconds

function notify(key: string, data: any) {
  CACHE.set(key, { data, ts: Date.now() });
  LISTENERS.get(key)?.forEach(fn => fn(data));
}

async function fetchAndNotify(key: string, method: string, path: string) {
  try {
    const data = await apiCall(method, path);
    notify(key, data);
  } catch {}
}

export function useData<T = any>(
  path: string | null,
  method = 'GET',
  deps: any[] = []
): { data: T | null; loading: boolean; refresh: () => void } {
  const key = path ? `${method}:${path}` : '';
  const cached = key ? CACHE.get(key) : null;

  const [data, setData] = useState<T | null>(cached?.data ?? null);
  const [loading, setLoading] = useState(!cached);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!path || !key) return;

    // Subscribe to cache updates
    if (!LISTENERS.has(key)) LISTENERS.set(key, new Set());
    const listener = (d: any) => { if (mounted.current) { setData(d); setLoading(false); } };
    LISTENERS.get(key)!.add(listener);

    const entry = CACHE.get(key);
    if (entry) {
      // Return cached immediately
      setData(entry.data);
      setLoading(false);
      // Background revalidate if stale
      if (Date.now() - entry.ts > TTL) fetchAndNotify(key, method, path);
    } else {
      // Fresh fetch
      setLoading(true);
      fetchAndNotify(key, method, path);
    }

    return () => { LISTENERS.get(key)?.delete(listener); };
  }, [key, ...deps]); // eslint-disable-line

  const refresh = () => {
    if (!key || !path) return;
    CACHE.delete(key);
    setLoading(true);
    fetchAndNotify(key, method, path);
  };

  return { data, loading, refresh };
}

// Invalidate a path so next useData call re-fetches
export function invalidate(...paths: string[]) {
  paths.forEach(p => {
    CACHE.delete(`GET:${p}`);
    CACHE.delete(`POST:${p}`);
  });
}
