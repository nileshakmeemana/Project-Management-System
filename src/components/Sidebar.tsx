'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem    { href: string; label: string; icon: string; badge?: number; badgeId?: string; }
interface NavSection { label?: string; items: NavItem[]; dividerBefore?: boolean; }
interface SidebarProps { sections: NavSection[]; user: any; onLogout: () => void; }

export default function Sidebar({ sections, user, onLogout }: SidebarProps) {
  const pathname  = usePathname();
  const [open,    setOpen]    = useState(false);
  const [popOpen, setPopOpen] = useState(false);

  // Listen for toggle events from Topbar hamburger
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.open === 'toggle') setOpen(o => !o);
      else if (detail.open === true)  setOpen(true);
      else setOpen(false);
    };
    window.addEventListener('toggle-sidebar', handler);
    return () => window.removeEventListener('toggle-sidebar', handler);
  }, []);

  // Auto-close on route change
  useEffect(() => { setOpen(false); setPopOpen(false); }, [pathname]);

  // Close on outside click (overlay or backdrop)
  const handleOverlayClick = useCallback(() => setOpen(false), []);

  const initials   = (user?.name || 'DC').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel  = user?.role === 'admin' ? 'Admin · Freelancer' : (user?.position || 'Employee');
  const settingsHref = user?.role === 'admin' ? '/admin/settings' : '/employee/settings';
  const isActive   = (href: string) => pathname === href;

  const handleLogout = () => {
    if (confirm('Log out?')) { setPopOpen(false); setOpen(false); onLogout(); }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="sidebar-overlay visible" onClick={handleOverlayClick} />
      )}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <nav className="sidebar-nav">
          {sections.map((section, si) => (
            <div key={si}>
              {section.dividerBefore && <div className="nav-divider" />}
              {section.label && <span className="nav-section-label">{section.label}</span>}
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`nav-item${isActive(item.href) ? ' active' : ''}`}
                >
                  <i className={`${item.icon} nav-icon`} />
                  <span className="nav-label">{item.label}</span>
                  {!!item.badge && item.badge > 0 && (
                    <span className="nav-badge" id={item.badgeId}>{item.badge}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
          <div className="nav-divider" />
          <Link
            href={settingsHref}
            prefetch={true}
            className={`nav-item${isActive(settingsHref) ? ' active' : ''}`}
          >
            <i className="ti ti-settings nav-icon" />
            <span className="nav-label">Settings</span>
          </Link>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer" style={{ position: 'relative' }}>
          {/* Logout popup */}
          {popOpen && (
            <>
              <div style={{ position:'fixed', inset:0, zIndex:399 }} onClick={() => setPopOpen(false)} />
              <div style={{
                position:'absolute', bottom:'calc(100% + 4px)',
                left:'var(--p-space-200)', right:'var(--p-space-200)',
                background:'var(--p-surface)', border:'.0625rem solid var(--p-border)',
                borderRadius:'var(--p-border-radius-200)', boxShadow:'var(--p-shadow-200)',
                zIndex:400, padding:'var(--p-space-100) 0',
              }}>
                <div style={{ padding:'var(--p-space-300) var(--p-space-400)', borderBottom:'.0625rem solid var(--p-border-subdued)' }}>
                  <div style={{ fontWeight:'var(--p-font-weight-semibold)', color:'var(--p-text)' }}>{user?.name}</div>
                  <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>{roleLabel}</div>
                </div>
                <button onClick={handleLogout}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:'var(--p-space-250)', padding:'var(--p-space-200) var(--p-space-400)', border:'none', background:'transparent', cursor:'pointer', color:'var(--p-text-critical)', fontSize:'var(--p-font-size-325)', fontFamily:'inherit', textAlign:'left' }}
                  onMouseOver={e => (e.currentTarget.style.background='var(--p-surface-hover)')}
                  onMouseOut={e  => (e.currentTarget.style.background='transparent')}
                >
                  <i className="ti ti-logout" /> Log out
                </button>
              </div>
            </>
          )}
          {/* User tile */}
          <div className="sidebar-user" style={{ cursor:'pointer' }}
            onClick={e => { e.stopPropagation(); setPopOpen(p => !p); }}>
            <div className="user-avatar">{initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{roleLabel}</div>
            </div>
            <i className="ti ti-chevron-up" style={{ fontSize:10, color:'var(--p-icon-secondary)' }} />
          </div>
        </div>
      </aside>
    </>
  );
}
