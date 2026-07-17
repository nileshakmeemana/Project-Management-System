'use client';
import { useEffect, useState, useCallback } from 'react';
import { fmtAmt, fmtDate, usePrefs } from '@/lib/prefs';

const BADGE: Record<string, string> = {
  'Assigned': 'badge-pending', 'Accepted': 'badge-paid', 'Declined': 'badge-high',
  'Pending Review': 'badge-pending', 'Approved': 'badge-paid', 'Paid': 'badge-paid',
  'Rejected': 'badge-high', 'Changes Requested': 'badge-med',
};

interface Props {
  task: any | null;
  onClose: () => void;
  /** Extra action buttons rendered under the header (e.g. Edit / Review). */
  actions?: React.ReactNode;
}

/** Right-side slide-in drawer showing full task details + status. */
export default function TaskDrawer({ task, onClose, actions }: Props) {
  usePrefs();
  const [open, setOpen] = useState(false);

  // Two-phase mount so the CSS transform transition actually animates
  useEffect(() => {
    if (task) {
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
      return () => cancelAnimationFrame(raf);
    }
    setOpen(false);
  }, [task]);

  const close = useCallback(() => {
    setOpen(false);                     // slide out…
    setTimeout(onClose, 200);           // …then unmount after the transition
  }, [onClose]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [close]);

  if (!task) return null;

  const rows: [string, string, React.ReactNode][] = [
    ['ti-user',           'Employee',  task.employee?.name || '—'],
    ['ti-briefcase',      'Client',    task.clientName || '—'],
    ['ti-tag',            'Category',  task.category || '—'],
    ['ti-clock-hour-4',   'Hours',     task.hours ? `${task.hours}h` : '—'],
    ['ti-cash',           'Requested', task.requestedAmount ? fmtAmt(task.requestedAmount, task.currency) : '—'],
    ['ti-circle-check',   'Approved',  task.approvedAmount ? fmtAmt(task.approvedAmount, task.currency) : '—'],
    ['ti-calendar-event', 'Completed', task.dateCompleted ? fmtDate(task.dateCompleted) : '—'],
    ['ti-calendar-plus',  'Created',   task.createdAt ? fmtDate(task.createdAt) : '—'],
  ];

  const projects: string[] = task.projectNames?.length
    ? task.projectNames
    : (task.projects || []).map((p: any) => p?.name).filter(Boolean);

  const customEntries = Object.entries(task.customFields || {}).filter(([, v]) => v !== '' && v != null);

  return (
    <div className={`rd-bg${open ? ' open' : ''}`} style={{ display: 'block' }} onClick={close}>
      <div className="rd-drawer" onClick={e => e.stopPropagation()}>
        {/* Clean header — no cover banner */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '.0625rem solid var(--p-border-subdued)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rd-name" style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>{task.title}</div>
              <div className="rd-sub">{task.employee?.name || '—'} · {task.clientName || 'No client'}</div>
            </div>
            <span className={`badge ${BADGE[task.status] || 'badge-draft'}`} style={{ flexShrink: 0, marginTop: 2 }}>{task.status}</span>
            <button className="rd-x" style={{ position: 'static', flexShrink: 0, background: 'var(--p-surface-secondary)' }} onClick={close} aria-label="Close"><i className="ti ti-x" /></button>
          </div>
          {actions && <div className="rd-actions" style={{ marginTop: 12 }}>{actions}</div>}
        </div>

        <div className="rd-body" style={{ paddingTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--p-space-300) var(--p-space-400)', marginBottom: 'var(--p-space-400)' }}>
            {rows.map(([icon, k, v]) => (
              <div key={k} className="rd-field">
                <div className="rd-muted k" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i className={`ti ${icon}`} style={{ fontSize: 12 }} /> {k}</div>
                <div className="v">{v}</div>
              </div>
            ))}
          </div>

          {projects.length > 0 && (
            <div style={{ marginBottom: 'var(--p-space-400)' }}>
              <div className="rd-muted" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><i className="ti ti-folder" style={{ fontSize: 12 }} /> Projects</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {projects.map((p, i) => <span key={i} className="badge badge-draft">{p}</span>)}
              </div>
            </div>
          )}

          {customEntries.length > 0 && (
            <div className="rd-card" style={{ border: '.0625rem solid var(--p-border-subdued)', borderRadius: 'var(--p-border-radius-200)', padding: 'var(--p-space-300)', marginBottom: 'var(--p-space-300)' }}>
              <div className="rd-card-title" style={{ marginBottom: 8 }}><span className="left"><i className="ti ti-forms" /> Additional details</span></div>
              {customEntries.map(([k, v]) => (
                <div key={k} className="rd-line"><div className="l"><span>{k}</span></div><div className="r" style={{ fontWeight: 450, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{String(v)}</div></div>
              ))}
            </div>
          )}

          {task.description && (
            <div className="rd-card" style={{ border: '.0625rem solid var(--p-border-subdued)', borderRadius: 'var(--p-border-radius-200)', padding: 'var(--p-space-300)', marginBottom: 'var(--p-space-300)' }}>
              <div className="rd-card-title" style={{ marginBottom: 6 }}><span className="left"><i className="ti ti-align-left" /> Description</span></div>
              <p style={{ fontSize: 'var(--p-font-size-325)', color: 'var(--p-text-secondary)', whiteSpace: 'pre-wrap' }}>{task.description}</p>
            </div>
          )}

          {task.workLink && (
            <div className="rd-line">
              <div className="l"><i className="ti ti-link" /><span>Work link</span></div>
              <div className="r"><a href={task.workLink} target="_blank" rel="noreferrer" style={{ color: 'var(--p-text-link)', textDecoration: 'none', fontSize: 'var(--p-font-size-325)' }}>Open <i className="ti ti-external-link" style={{ fontSize: 12 }} /></a></div>
            </div>
          )}

          {task.adminNote && (
            <div className="rd-card" style={{ border: '.0625rem solid var(--p-border-subdued)', borderRadius: 'var(--p-border-radius-200)', padding: 'var(--p-space-300)', marginTop: 'var(--p-space-300)' }}>
              <div className="rd-card-title" style={{ marginBottom: 6 }}><span className="left"><i className="ti ti-message" /> Admin note</span></div>
              <p style={{ fontSize: 'var(--p-font-size-325)', color: 'var(--p-text-secondary)' }}>{task.adminNote}</p>
            </div>
          )}

          <div style={{ marginTop: 'var(--p-space-400)' }}>
            {task.acceptedAt && <div className="rd-line"><div className="l"><i className="ti ti-circle-check" /><span>Accepted</span></div><div className="r">{fmtDate(task.acceptedAt)}</div></div>}
            {task.reviewedAt && <div className="rd-line"><div className="l"><i className="ti ti-eye-check" /><span>Reviewed</span></div><div className="r">{fmtDate(task.reviewedAt)}</div></div>}
            {task.paidAt && <div className="rd-line"><div className="l"><i className="ti ti-cash" /><span>Paid</span></div><div className="r">{fmtDate(task.paidAt)}</div></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
