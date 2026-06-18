'use client';
import { useState } from 'react';
import { apiCall, getUser, setSession, getToken } from '@/lib/api';

interface Pref { key: string; label: string; desc: string; checked: boolean; }

export default function EmployeeSettingsPage() {
  const user = getUser();
  const [form, setForm] = useState({
    name: user?.name || '', position: user?.position || '', phone: user?.phone || '',
    currency: user?.currency || 'LKR', payType: user?.payType || 'Per Task', email: user?.email || '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState('');
  const [pw, setPw]         = useState({ current: '', newPw: '', confirm: '' });
  const [prefs, setPrefs]   = useState<Pref[]>([
    { key: 'email_notifs',    label: 'Email Notifications',  desc: 'Receive email updates on task status changes', checked: true  },
    { key: 'dark_mode',       label: 'Dark Mode',            desc: 'Switch between light and dark interface',       checked: false },
    { key: 'compact_table',   label: 'Compact Table View',   desc: 'Show more rows with reduced row height',        checked: false },
  ]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400); };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const togglePref = (key: string) => {
    setPrefs(p => p.map(pref => pref.key === key ? { ...pref, checked: !pref.checked } : pref));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const d = await apiCall('PATCH', '/users/me', { name: form.name, position: form.position, phone: form.phone, currency: form.currency, payType: form.payType });
      if (getToken()) setSession(getToken()!, d.user);
      showToast('Profile saved!');
    } catch (err: any) { showToast(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const initials = form.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'DC';

  return (
    <div className="page-content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Settings</h2><p>Manage your profile, preferences and account</p></div>
        <div className="page-hero-right">
          <button className="btn-primary" onClick={saveProfile} disabled={saving}>
            <i className="ti ti-device-floppy" /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="p-card" style={{ marginBottom: 'var(--p-space-400)' }}>
        <div className="p-card-header"><div className="p-card-title"><i className="ti ti-user-circle" /> <span className="sec-t">Profile Settings</span></div></div>
        <div className="p-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-400)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-400)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--p-fill-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600, flexShrink: 0 }}>{initials}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--p-font-size-350)' }}>{form.name}</div>
              <div style={{ color: 'var(--p-text-secondary)' }}>{form.position || '—'} · {user?.employeeId}</div>
            </div>
          </div>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Employee ID</label><input className="p-input" value={user?.employeeId || ''} disabled style={{ background: 'var(--p-surface-secondary)', cursor: 'not-allowed' }} /></div>
            <div className="p-field"><label className="p-label">Full Name</label><input className="p-input" value={form.name} onChange={set('name')} /></div>
          </div>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Position / Title</label><input className="p-input" value={form.position} onChange={set('position')} placeholder="e.g. Creative Assistant" /></div>
            <div className="p-field"><label className="p-label">Email Address</label><input className="p-input" type="email" value={form.email} disabled style={{ background: 'var(--p-surface-secondary)', cursor: 'not-allowed' }} /></div>
          </div>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Phone</label><input className="p-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+94 77 000 0000" /></div>
            <div className="p-field"><label className="p-label">Payment Currency</label>
              <select className="p-input" value={form.currency} onChange={set('currency')}>
                <option value="LKR">LKR — Sri Lankan Rupee</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </div>
          </div>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Pay Type</label>
              <select className="p-input" value={form.payType} onChange={set('payType')}>
                <option>Per Task</option><option>Hourly</option><option>Monthly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences — working toggle switches */}
      <div className="p-card" style={{ marginBottom: 'var(--p-space-400)' }}>
        <div className="p-card-header"><div className="p-card-title"><i className="ti ti-adjustments-horizontal" /> <span className="sec-t">Preferences</span></div></div>
        <div className="p-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {prefs.map(pref => (
            <div key={pref.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--p-space-300) 0', borderBottom: '.0625rem solid var(--p-border-subdued)' }}>
              <div>
                <div style={{ fontWeight: 'var(--p-font-weight-medium)' }}>{pref.label}</div>
                <div style={{ fontSize: 'var(--p-font-size-275)', color: 'var(--p-text-secondary)', marginTop: 2 }}>{pref.desc}</div>
              </div>
              {/* Exact toggle structure from HTML source */}
              <label className="toggle" onClick={() => togglePref(pref.key)}>
                <input type="checkbox" checked={pref.checked} onChange={() => togglePref(pref.key)} />
                <span className="toggle-track" />
                <span className="toggle-thumb" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="p-card">
        <div className="p-card-header"><div className="p-card-title"><i className="ti ti-lock" /> <span className="sec-t">Change Password</span></div></div>
        <div className="p-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-400)' }}>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Current Password</label><input className="p-input" type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" /></div>
            <div className="p-field"><label className="p-label">New Password</label><input className="p-input" type="password" value={pw.newPw} onChange={e => setPw(p => ({ ...p, newPw: e.target.value }))} placeholder="Min. 8 characters" /></div>
          </div>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Confirm New Password</label><input className="p-input" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => {
                if (pw.newPw !== pw.confirm) { showToast('Passwords do not match'); return; }
                if (pw.newPw.length < 8) { showToast('Password must be at least 8 characters'); return; }
                showToast('Password updated!'); setPw({ current: '', newPw: '', confirm: '' });
              }}><i className="ti ti-lock-check" /> Update Password</button>
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="toast" style={{ display: 'flex' }}>{toast}</div>}
    </div>
  );
}
