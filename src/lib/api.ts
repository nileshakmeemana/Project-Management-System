// When deployed on Vercel: frontend and API are on the same domain
// /api/* is served by the Express serverless function (api/index.js)
// In local dev: set NEXT_PUBLIC_API_URL=http://localhost:5000/api if running backend separately
//               OR run `npm run dev` and the Next.js server proxies /api/* automatically

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ?? (typeof window !== 'undefined'
      ? `${window.location.origin}/api`   // same-origin on Vercel (auto)
      : 'http://localhost:3000/api');      // SSR fallback

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dc_token');
}
export function getUser(): any {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('dc_user') || 'null'); } catch { return null; }
}
export function setSession(token: string, user: any) {
  localStorage.setItem('dc_token', token);
  localStorage.setItem('dc_user', JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem('dc_token');
  localStorage.removeItem('dc_user');
}

export async function apiCall(method: string, path: string, body?: any): Promise<any> {
  const token = getToken();
  const url   = API_BASE + path;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err: any) {
    throw new Error(`Network error — cannot reach ${url}. (${err.message})`);
  }

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Expected JSON but got HTML — API URL may be wrong. Status: ${res.status}. Body: ${text.slice(0, 100)}`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
