'use client';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';

const fmtAmt = (v: number, c = 'LKR') => {
  try { return new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(v||0); }
  catch { return `${c} ${(v||0).toLocaleString()}`; }
};

const BADGE: Record<string,string> = {
  'Pending Review':'badge-pending','Approved':'badge-paid','Paid':'badge-paid',
  'Rejected':'badge-high','Changes Requested':'badge-med',
};

const STATUS_LABEL: Record<string,string> = {
  pending:'Pending Review', approved:'Approved', rejected:'Rejected',
  'changes-requested':'Changes Requested', paid:'Paid',
};

export default function AdminSubmittedTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [empFilter, setEmpFilter] = useState('');
  const [reviewing, setReviewing] = useState<any>(null);
  const [reviewData, setReviewData] = useState({ status:'Approved', approvedAmount:0, adminNote:'' });
  const [saving, setSaving] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', STATUS_LABEL[statusFilter] || statusFilter);
      if (search) params.set('search', search);
      const data = await apiCall('GET', `/tasks?${params}`);
      setTasks(data.tasks);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, [statusFilter]);

  const stats = {
    pending:  tasks.filter(t => t.status === 'Pending Review').length,
    approved: tasks.filter(t => t.status === 'Approved').length,
    rejected: tasks.filter(t => t.status === 'Rejected').length,
    total:    tasks.length,
  };

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    if (q && !t.title.toLowerCase().includes(q) && !(t.employee?.name||'').toLowerCase().includes(q) && !(t.clientName||'').toLowerCase().includes(q)) return false;
    if (empFilter && t.employee?.name !== empFilter) return false;
    return true;
  });

  const employees = [...new Set(tasks.map(t => t.employee?.name).filter(Boolean))];

  const openReview = (task: any) => {
    setReviewing(task);
    setReviewData({ status:'Approved', approvedAmount: task.requestedAmount, adminNote:'' });
  };

  const submitReview = async () => {
    if (!reviewing) return;
    setSaving(true);
    try {
      await apiCall('PATCH', `/tasks/${reviewing._id}/review`, reviewData);
      setReviewing(null);
      fetchTasks();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Submitted Tasks</h2><p>Review and approve employee task submissions</p></div>
      </div>

      {/* Stat cards */}
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clock" /> Pending Review</div><div className="stat-value" id="st-stat-pending">{stats.pending}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check" /> Approved</div><div className="stat-value up" id="st-stat-approved">{stats.approved}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-x" /> Rejected</div><div className="stat-value" id="st-stat-rejected">{stats.rejected}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clipboard-list" /> Total</div><div className="stat-value" id="st-stat-total">{stats.total}</div></div>
      </div>

      {/* Table */}
      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search">
            <span className="p-search-icon"><i className="ti ti-search" /></span>
            <input type="text" placeholder="Search tasks, employee, client…" value={search}
              onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && fetchTasks()} />
          </div>
          <div className="p-toolbar-end">
            <select className="btn-secondary" style={{ height:'2rem', fontSize:'var(--p-font-size-325)', padding:'0 var(--p-space-300)', cursor:'pointer', boxShadow:'var(--p-shadow-button)' }}
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="changes-requested">Changes Requested</option>
              <option value="paid">Paid</option>
            </select>
            <select className="btn-secondary" style={{ height:'2rem', fontSize:'var(--p-font-size-325)', padding:'0 var(--p-space-300)', cursor:'pointer', boxShadow:'var(--p-shadow-button)' }}
              value={empFilter} onChange={e => setEmpFilter(e.target.value)}>
              <option value="">All Employees</option>
              {employees.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
        </div>

        {loading ? <div style={{ padding:'3rem', textAlign:'center', color:'var(--p-text-secondary)' }}>Loading…</div> : (
          <table className="p-table">
            <thead>
              <tr>
                <th style={{textAlign:"left",minWidth:160}}>Task</th><th style={{textAlign:"left"}}>Employee</th><th style={{textAlign:"left"}}>Client</th><th style={{textAlign:"left"}}>Category</th>
                <th className="td-num">Hours</th><th className="td-num">Requested</th>
                <th className="td-num">Approved</th><th style={{textAlign:"left"}}>Date</th><th style={{textAlign:"left"}}>Status</th><th style={{textAlign:"left"}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign:'center', padding:'3rem', color:'var(--p-text-secondary)' }}>No tasks found</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{t.title}</td>
                  <td className="td-muted">{t.employee?.name || '—'}</td>
                  <td className="td-muted">{t.clientName || '—'}</td>
                  <td>{t.category ? <span className="badge badge-draft">{t.category}</span> : '—'}</td>
                  <td className="td-num td-muted">{t.hours}h</td>
                  <td className="td-num td-muted">{fmtAmt(t.requestedAmount, t.currency)}</td>
                  <td className="td-num td-muted">{t.approvedAmount ? fmtAmt(t.approvedAmount, t.currency) : '—'}</td>
                  <td className="td-muted">{t.dateCompleted ? new Date(t.dateCompleted).toLocaleDateString() : '—'}</td>
                  <td><span className={`badge ${BADGE[t.status] || 'badge-draft'}`}>{t.status}</span></td>
                  <td>
                    <div className="row-acts" style={{ opacity:1 }}>
                      {t.status === 'Pending Review' && (
                        <button className="btn-secondary" style={{ height:'1.75rem', fontSize:'var(--p-font-size-275)' }} onClick={() => openReview(t)}>Review</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="p-table-footer">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Review Modal */}
      {reviewing && (
        <div className="p-modal-bg open" onClick={() => setReviewing(null)}>
          <div className="p-modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd">
              <h3 id="st-review-title">Review: {reviewing.title}</h3>
              <button className="p-modal-x" onClick={() => setReviewing(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="p-modal-body" id="st-review-body">
              <div className="p-grid2">
                <div><div className="p-label">Employee</div><div>{reviewing.employee?.name}</div></div>
                <div><div className="p-label">Client</div><div>{reviewing.clientName || '—'}</div></div>
              </div>
              <div className="p-grid2">
                <div><div className="p-label">Category</div><div>{reviewing.category || '—'}</div></div>
                <div><div className="p-label">Hours</div><div>{reviewing.hours}h</div></div>
              </div>
              <div className="p-grid2">
                <div><div className="p-label">Requested</div><div>{fmtAmt(reviewing.requestedAmount, reviewing.currency)}</div></div>
                <div><div className="p-label">Date</div><div>{reviewing.dateCompleted ? new Date(reviewing.dateCompleted).toLocaleDateString() : '—'}</div></div>
              </div>
              {reviewing.description && <div><div className="p-label">Description</div><p style={{ fontSize:'var(--p-font-size-325)', color:'var(--p-text-secondary)' }}>{reviewing.description}</p></div>}
              {reviewing.workLink && <div><div className="p-label">Work Link</div><a href={reviewing.workLink} target="_blank" style={{ color:'var(--p-text-link)', fontSize:'var(--p-font-size-325)' }}>{reviewing.workLink}</a></div>}
              <div>
                <label className="p-label">Decision</label>
                <select className="p-input" value={reviewData.status} onChange={e => setReviewData(d => ({ ...d, status:e.target.value }))}>
                  <option>Approved</option><option>Rejected</option><option>Changes Requested</option>
                </select>
              </div>
              <div>
                <label className="p-label">Approved Amount ({reviewing.currency})</label>
                <input className="p-input" type="number" value={reviewData.approvedAmount}
                  onChange={e => setReviewData(d => ({ ...d, approvedAmount:+e.target.value }))} />
              </div>
              <div>
                <label className="p-label">Admin Note</label>
                <textarea className="p-input" rows={3} value={reviewData.adminNote} placeholder="Notes for the employee…"
                  onChange={e => setReviewData(d => ({ ...d, adminNote:e.target.value }))} />
              </div>
            </div>
            <div className="p-modal-ft">
              <button className="btn-secondary" onClick={() => setReviewing(null)}>Cancel</button>
              <button className="btn-primary" onClick={submitReview} disabled={saving}>
                {saving ? 'Saving…' : <><i className="ti ti-check" /> Submit Review</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
