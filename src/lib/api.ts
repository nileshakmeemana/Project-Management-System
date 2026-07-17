// ── API base URL ────────────────────────────────────────────────────────────
// On Vercel, frontend and API share one domain: /api/* is served by the
// Express serverless function (api/index.js) — no env var needed.
// For local dev against a separate backend, set NEXT_PUBLIC_API_URL.
const API = process.env.NEXT_PUBLIC_API_URL
  ?? (typeof window !== "undefined"
      ? `${window.location.origin}/api`   // same-origin on Vercel (auto)
      : "http://localhost:3000/api");     // SSR fallback

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dc_token');
}

export function getUser(): any {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('dc_user') || 'null'); }
  catch { return null; }
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

  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let res: Response;
  try {
    res = await fetch(API + path, opts);
  } catch (networkErr: any) {
    // Network failure (backend unreachable, wrong URL, no internet)
    throw new Error(`Cannot reach the server. Check NEXT_PUBLIC_API_URL. (${networkErr.message})`);
  }

  // If the response is not JSON (e.g. HTML 404 page from a wrong URL), handle gracefully
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(
      `Server returned non-JSON response (${res.status}). ` +
      `Make sure NEXT_PUBLIC_API_URL is set correctly in Vercel. ` +
      `Got: ${text.slice(0, 120)}`
    );
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
