/**
 * Global notification store — fires real notifications when actions happen.
 * Works across components without prop drilling.
 * Persists in localStorage so they survive page refreshes.
 */

export interface Notification {
  id: string;
  icon: string;
  text: string;
  sub: string;   // e.g. "Admin · 2 mins ago"
  unread: boolean;
  ts: number;
}

const STORAGE_KEY = 'dc_notifications';
const LISTENERS = new Set<(notifs: Notification[]) => void>();

function load(): Notification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function save(notifs: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 50)));
}

function notify(listeners: Set<any>, notifs: Notification[]) {
  listeners.forEach(fn => fn(notifs));
}

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

export const NotifStore = {
  get(): Notification[] {
    if (typeof window === 'undefined') return [];
    return load();
  },

  add(icon: string, text: string, source = 'Admin'): void {
    if (typeof window === 'undefined') return;
    const notifs = load();
    const n: Notification = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      icon, text,
      sub: `${source} · Just now`,
      unread: true,
      ts: Date.now(),
    };
    const updated = [n, ...notifs].slice(0, 50);
    save(updated);
    notify(LISTENERS, updated);
  },

  markRead(id: string): void {
    if (typeof window === 'undefined') return;
    const notifs = load().map(n => n.id === id ? { ...n, unread: false } : n);
    save(notifs);
    notify(LISTENERS, notifs);
  },

  markAllRead(): void {
    if (typeof window === 'undefined') return;
    const notifs = load().map(n => ({ ...n, unread: false }));
    save(notifs);
    notify(LISTENERS, notifs);
  },

  /** Refresh relative timestamps */
  refreshTimes(notifs: Notification[]): Notification[] {
    return notifs.map(n => ({ ...n, sub: `${n.sub.split('·')[0].trim()} · ${relativeTime(n.ts)}` }));
  },

  subscribe(fn: (notifs: Notification[]) => void): () => void {
    LISTENERS.add(fn);
    return () => { LISTENERS.delete(fn); };
  },

  // Shorthand helpers for common actions
  taskSubmitted(title: string)  { NotifStore.add('ti-clipboard-list', `New task submitted: "${title}"`, 'Employee'); },
  taskApproved(title: string)   { NotifStore.add('ti-circle-check',   `Task approved: "${title}"`,      'Admin'); },
  taskRejected(title: string)   { NotifStore.add('ti-circle-x',       `Task rejected: "${title}"`,      'Admin'); },
  taskPaid(title: string)       { NotifStore.add('ti-cash',           `Payment sent for: "${title}"`,   'Admin'); },
  employeeAdded(name: string)   { NotifStore.add('ti-user-plus',      `New employee: ${name} joined`,   'Admin'); },
  payrollGenerated(name: string){ NotifStore.add('ti-receipt',        `Payroll generated for ${name}`,  'Admin'); },
  projectUpdated(name: string)  { NotifStore.add('ti-folder',         `Project updated: "${name}"`,     'Admin'); },
};
