/**
 * Shared sidebar open/close state via a custom event.
 * Sidebar listens for 'toggle-sidebar' events.
 * Topbar dispatches them.
 * No prop drilling needed.
 */
export function openSidebar() {
  window.dispatchEvent(new CustomEvent('toggle-sidebar', { detail: { open: true } }));
}
export function closeSidebar() {
  window.dispatchEvent(new CustomEvent('toggle-sidebar', { detail: { open: false } }));
}
export function toggleSidebar() {
  window.dispatchEvent(new CustomEvent('toggle-sidebar', { detail: { open: 'toggle' } }));
}
