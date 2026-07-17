'use client';
import { NotifStore, Notification } from '@/lib/notifications';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LOGO_URL } from '@/lib/branding';

interface SearchPage { href: string; label: string; icon: string; }
interface TopbarProps {
  searchPages: SearchPage[];
}

export default function Topbar({ searchPages }: TopbarProps) {
  const router = useRouter();
  const [dateStr, setDateStr] = useState('');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef  = useRef<HTMLDivElement>(null);

  // Subscribe to notification store
  useEffect(() => {
    setNotifs(NotifStore.get());
    return NotifStore.subscribe(setNotifs);
  }, []);

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' }));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
      if (!notifRef.current?.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setSearchOpen(false); setQuery(''); }
    if (e.key === 'Enter') {
      const q = query.trim().toLowerCase();
      const match = searchPages.find(p => p.label.toLowerCase().includes(q));
      if (match) { router.push(match.href); setQuery(''); setSearchOpen(false); }
    }
  }, [query, searchPages, router]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSearchOpen(true);
  }, []);

  const filtered = query.trim()
    ? searchPages.filter(p => p.label.toLowerCase().includes(query.trim().toLowerCase()))
    : searchPages;

  const unread = notifs.filter(n => n.unread).length;
  // Show only the most recent 15 notifications
  const shownNotifs = (unreadOnly ? notifs.filter(n => n.unread) : notifs).slice(0, 15);

  const markAllRead = useCallback(() => {
    NotifStore.markAllRead();
  }, []);

  const markRead = useCallback((id: string) => {
    NotifStore.markRead(id);
  }, []);

  return (
    <header className="topbar" id="global-topbar">
      {/* Hamburger — mobile only, positioned by CSS */}
      <button className="topbar-hamburger" aria-label="Open menu" onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar', {detail:{open:'toggle'}}))} suppressHydrationWarning>
        <i className="ti ti-menu-2" />
      </button>
      {/* Logo slot (sidebar handles actual logo) */}
      <div className="topbar-logo" style={{ cursor:'default', gap:0, pointerEvents:'none' }}>
        {/* IMPORTANT: logo src must be root-absolute (start with "/") or a full https:// URL.
            A relative path breaks on nested routes like /admin/tasks after a refresh. */}
        <img src="/logo.png" alt="Designer Craft"
          style={{ height:80, width:80, objectFit:'contain', display:'block', margin:'-12px -4px' }}
          onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
      </div>

      {/* Search */}
      <div className="topbar-search" id="search-wrap" ref={searchRef}>
        <div className="topbar-search-inner">
          <span className="topbar-search-icon"><i className="ti ti-search" /></span>
          <input
            type="text" placeholder="Search" id="topbar-search-input"
            autoComplete="off" role="combobox" aria-expanded={searchOpen}
            value={query}
            onChange={handleQueryChange}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleKeyDown}
          />
          <div className="topbar-search-kbd"><kbd>⌘</kbd><kbd>K</kbd></div>
          {searchOpen && (
            <div className="search-pop open" id="search-pop" role="listbox">
              <div className="search-scroll">
                <div className="search-section">
                  <div className="search-sec-title">Jump to</div>
                  {filtered.length === 0
                    ? <div className="search-empty"><i className="ti ti-search-off" /> No results for &ldquo;{query}&rdquo;</div>
                    : filtered.map((p, idx) => (
                      <a key={p.href} className="search-row" role="option" data-idx={idx} onClick={() => { router.push(p.href); setQuery(''); setSearchOpen(false); }}>
                        <span className="search-row-icon"><i className={`ti ${p.icon}`} /></span>
                        <span className="search-row-body">
                          <span className="search-row-title">{p.label}</span>
                        </span>
                      </a>
                    ))
                  }
                </div>
                <div className="search-section footer">
                  <a className="search-row" onClick={() => { router.push(searchPages.find(p => p.href.includes('settings'))?.href || '/'); setQuery(''); setSearchOpen(false); }}>
                    <span className="search-row-icon"><i className="ti ti-settings" /></span>
                    <span className="search-row-body"><span className="search-row-title">Go to Settings</span></span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="topbar-right">
        <span className="topbar-date" id="today-date">{dateStr}</span>
        <div className="topbar-divider" />

        {/* Notifications */}
        <div className="notif-wrap" id="notif-wrap" ref={notifRef}>
          <button className="topbar-btn" title="Notifications" id="notif-btn"
            onClick={e => { e.stopPropagation(); setNotifOpen(o => !o); }}
            aria-haspopup="true" aria-expanded={notifOpen}>
            <i className="ti ti-bell" />
            {unread > 0 && <span className="topbar-notif-dot" id="notif-dot" />}
          </button>
          {notifOpen && (
            <div className="notif-pop open" id="notif-pop" role="dialog" aria-label="Notifications">
              <div className="notif-head">
                <h3>Notifications</h3>
                <div className="notif-head-acts">
                  <button className={`notif-icon-btn${unreadOnly ? ' active' : ''}`} title="Unread only" onClick={() => setUnreadOnly(u => !u)}>
                    <i className="ti ti-filter" />
                  </button>
                  <button className="notif-icon-btn" title="Mark all read" onClick={markAllRead}>
                    <i className="ti ti-checks" />
                  </button>
                </div>
              </div>
              <ul className="notif-list" id="notif-list">
                {shownNotifs.length === 0 && (
                  <li style={{ padding:'var(--p-space-400)', textAlign:'center', color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-325)' }}>No notifications</li>
                )}
                {shownNotifs.map(n => (
                  <li key={n.id} className={`notif-item${n.unread ? ' unread' : ''}`} onClick={() => markRead(n.id)}>
                    <div className="notif-item-icon"><i className={`ti ${n.icon}`} /></div>
                    <div className="notif-content">
                      <div className="notif-text" dangerouslySetInnerHTML={{ __html: n.text }} />
                      <div className="notif-sub">{(n.sub||'').split('·')[0].trim()} · {new Date(n.ts).toLocaleString('en-GB',{ day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                    </div>
                    {n.unread && <div className="notif-unread-dot" />}
                  </li>
                ))}
              </ul>
              <div className="notif-foot" id="notif-foot">
                {unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up'}
              </div>
            </div>
          )}
        </div>

        <button className="topbar-btn" title="Help"><i className="ti ti-help-circle" /></button>
      </div>
    </header>
  );
}
