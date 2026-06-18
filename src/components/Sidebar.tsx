'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string; label: string; icon: string; badgeId?: string; badge?: number;
}
interface NavSection {
  label?: string; items: NavItem[]; dividerBefore?: boolean;
}
interface SidebarProps {
  sections: NavSection[]; user: any; onLogout: () => void;
}

export default function Sidebar({ sections, user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [popOpen, setPopOpen] = useState(false);

  const initials = (user?.name || 'DC')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const roleLabel = user?.role === 'admin'
    ? 'Admin · Freelancer'
    : (user?.position || 'Employee');

  // Exact match only — /admin should not match /admin/tasks
  const isActive = (href: string) => pathname === href;

  const handleLogout = () => {
    if (confirm('Log out?')) {
      setPopOpen(false);
      onLogout();
    }
  };

  return (
    <aside className="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">

      {/* Nav */}
      <nav className="sidebar-nav">
        {sections.map((section, si) => (
          <div key={si}>
            {section.dividerBefore && <div className="nav-divider" />}
            {section.label && (
              <span className="nav-section-label">{section.label}</span>
            )}
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive(item.href) ? ' active' : ''}`}
              >
                <i className={`${item.icon} nav-icon`} />
                <span className="nav-label">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-badge" id={item.badgeId}>{item.badge}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
        <div className="nav-divider" />
        <Link
          href={user?.role === 'admin' ? '/admin/settings' : '/employee/settings'}
          className={`nav-item${
            isActive(user?.role === 'admin' ? '/admin/settings' : '/employee/settings')
              ? ' active' : ''
          }`}
        >
          <i className="ti ti-settings nav-icon" />
          <span className="nav-label">Settings</span>
        </Link>
      </nav>

      {/* ── Sidebar footer ── exact structure from HTML source */}
      <div className="sidebar-footer">

        {/* Logout popup — shown above user tile */}
        {popOpen && (
          <>
            {/* Invisible full-screen overlay to close popup on outside click */}
            <div
              style={{
                position: 'fixed', inset: 0, zIndex: 399,
              }}
              onClick={() => setPopOpen(false)}
            />

            {/* Popup card */}
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 4px)',
              left: 'var(--p-space-200)',
              right: 'var(--p-space-200)',
              background: 'var(--p-surface)',
              border: '.0625rem solid var(--p-border)',
              borderRadius: 'var(--p-border-radius-200)',
              boxShadow: 'var(--p-shadow-200)',
              zIndex: 400,
              padding: 'var(--p-space-100) 0',
            }}>
              {/* User info header */}
              <div style={{
                padding: 'var(--p-space-300) var(--p-space-400)',
                borderBottom: '.0625rem solid var(--p-border-subdued)',
              }}>
                <div style={{
                  fontWeight: 'var(--p-font-weight-semibold)',
                  fontSize: 'var(--p-font-size-325)',
                  color: 'var(--p-text)',
                }}>
                  {user?.name}
                </div>
                <div style={{
                  fontSize: 'var(--p-font-size-275)',
                  color: 'var(--p-text-secondary)',
                  marginTop: 2,
                }}>
                  {roleLabel}
                </div>
              </div>

              {/* Logout button */}
              <div style={{ padding: 'var(--p-space-100) 0' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--p-space-250)',
                    padding: 'var(--p-space-200) var(--p-space-400)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--p-text-critical)',
                    fontSize: 'var(--p-font-size-325)',
                    fontFamily: 'inherit',
                    fontWeight: 'var(--p-font-weight-medium)',
                    textAlign: 'left',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--p-surface-hover)')}
                  onMouseOut={e  => (e.currentTarget.style.background = 'transparent')}
                >
                  <i className="ti ti-logout" style={{ fontSize: 16, flexShrink: 0 }} />
                  Log out
                </button>
              </div>
            </div>
          </>
        )}

        {/* User tile — click to open popup */}
        <div
          className="sidebar-user"
          onClick={e => { e.stopPropagation(); setPopOpen(p => !p); }}
        >
          {/* Avatar */}
          <div className="user-avatar"
            style={{ background: 'var(--p-fill-brand)', color: '#fff', fontWeight: 600 }}>
            {initials}
          </div>

          {/* Name + role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{roleLabel}</div>
          </div>

          {/* Chevron */}
          <i className="ti ti-chevron-up"
            style={{ fontSize: 10, color: 'var(--p-icon-secondary)', flexShrink: 0 }} />
        </div>
      </div>

    </aside>
  );
}
