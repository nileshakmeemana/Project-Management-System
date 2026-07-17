'use client';
import { NotifStore } from '@/lib/notifications';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';
import TaskDrawer from '@/components/TaskDrawer';
import TableSkeleton from '@/components/TableSkeleton';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import { fmtAmt, fmtDate, usePrefs } from '@/lib/prefs';

const PAGE_SIZE = 30;


const BADGE: Record<string,string> = {
  'Assigned':'badge-pending','Accepted':'badge-paid','Declined':'badge-high',
  'Pending Review':'badge-pending','Approved':'badge-paid','Paid':'badge-paid',
  'Rejected':'badge-high','Changes Requested':'badge-med',
};

const STATUS_LABEL: Record<string,string> = {
  pending:'Pending Review', approved:'Approved', rejected:'Rejected',
  'changes-requested':'Changes Requested', paid:'Paid',
};

export default function AdminSubmittedTasksPage() {
  usePrefs(); // re-render on currency / date-format changes
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [empFilter, setEmpFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [reviewing, setReviewing] = useState<any>(null);
  const [reviewData, setReviewData] = useState({ status:'Approved', approvedAmount:0, adminNote:'' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '500');
      if (statusFilter) params.set('status', STATUS_LABEL[statusFilter] || statusFilter);
      if (search) params.set('search', search);
      const data = await apiCall('GET', `/tasks?${params}`);
      setTasks(data.tasks);
      return data.tasks;
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, [statusFilter]); // eslint-disable-line

  // Deep link — /admin/submitted-tasks?task=<id> opens that task (review if reviewable, else detail drawer)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('task');
    if (!id) return;
    (async () => {
      try {
        const { task } = await apiCall('GET', `/tasks/${id}`);
        if (!task) return;
        if (['Pending Review','Changes Requested'].includes(task.status)) openReview(task);
        else setDetail(task);
      } catch {}
    })();
  }, []); // eslint-disable-line

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
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const employees = Array.from(new Set(tasks.map(t => t.employee?.name).filter(Boolean))) as string[];

  // Select / bulk delete only
  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = (checked: boolean) => setSelected(checked ? new Set(paginated.map(t => t._id)) : new Set());
  const allChecked  = paginated.length > 0 && paginated.every(t => selected.has(t._id));
  const someChecked = paginated.some(t => selected.has(t._id)) && !allChecked;

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;
    for (const id of Array.from(selected)) { try { await apiCall('DELETE', `/tasks/${id}`); } catch {} }
    setSelected(new Set()); showToast('Deleted'); fetchTasks();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiCall('PATCH', `/tasks/${editing._id}`, {
        title: editing.title, clientName: editing.clientName, category: editing.category,
        hours: +editing.hours || 0, requestedAmount: +editing.requestedAmount || 0,
        approvedAmount: +editing.approvedAmount || 0, currency: editing.currency,
        status: editing.status, dateCompleted: editing.dateCompleted || undefined,
        workLink: editing.workLink, description: editing.description,
      });
      setEditing(null); showToast('Task updated'); fetchTasks();
    } catch (err: any) { showToast(err.message); }
    finally { setSaving(false); }
  };

  const openReview = (task: any) => {
    setDetail(null);
    setReviewing(task);
    setReviewData({ status: ['Approved','Paid','Rejected','Changes Requested'].includes(task.status) ? task.status : 'Approved', approvedAmount: task.approvedAmount || task.requestedAmount || 0, adminNote: task.adminNote || '' });
  };

  const submitReview = async () => {
    if (!reviewing) return;
    setSaving(true);
    try {
      await apiCall('PATCH', `/tasks/${reviewing._id}/review`, reviewData);
      if (reviewData.status === 'Approved')      NotifStore.taskApproved(reviewing.title);
      else if (reviewData.status === 'Paid')     NotifStore.taskPaid(reviewing.title);
      else if (reviewData.status === 'Rejected') NotifStore.taskRejected(reviewing.title);
      else NotifStore.add('ti-edit', `Changes requested: "${reviewing.title}"`, 'Admin');
      setReviewing(null);
      showToast('Review submitted');
      fetchTasks();
    } catch (err: any) { showToast(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Submitted Tasks</h2><p>Review and approve employee task submissions</p></div>
      </div>

      {/* Stat cards */}
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clock" /> <span className="sec-t">Pending Review</span></div><div className="stat-value" id="st-stat-pending">{stats.pending}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check" /> <span className="sec-t">Approved</span></div><div className="stat-value up" id="st-stat-approved">{stats.approved}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-x" /> <span className="sec-t">Rejected</span></div><div className="stat-value" id="st-stat-rejected">{stats.rejected}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clipboard-list" /> <span className="sec-t">Total</span></div><div className="stat-value" id="st-stat-total">{stats.total}</div></div>
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

        {/* Bulk bar — delete only */}
        <BulkBar
          count={selected.size}
          visible={selected.size > 0}
          actions={[{ label: 'Delete', icon: 'ti-trash', onClick: bulkDelete, danger: true }]}
          onClear={() => setSelected(new Set())}
        />

        {loading ? <TableSkeleton rows={8} cols={7} /> : (
          <table className="p-table freeze-first">
            <thead>
              <tr>
                <th style={{textAlign:"left", width:40, padding:'0 var(--p-space-300)' }}>
                  <input type="checkbox" checked={allChecked} ref={el => { if(el) el.indeterminate = someChecked; }} onChange={e => selectAll(e.target.checked)} style={{ cursor:'pointer' }} />
                </th>
                <th style={{textAlign:"left",minWidth:160}}>Task</th><th style={{textAlign:"left"}}>Employee</th><th style={{textAlign:"left"}}>Client</th><th style={{textAlign:"left"}}>Category</th>
                <th className="td-num">Hours</th><th className="td-num">Requested</th>
                <th className="td-num">Approved</th><th style={{textAlign:"left"}}>Date</th><th style={{textAlign:"left"}}>Status</th><th style={{textAlign:"left"}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign:'center', padding:'3rem', color:'var(--p-text-secondary)' }}>No tasks found</td></tr>
              )}
              {paginated.map(t => (
                <tr key={t._id} className="row-click" onClick={() => setDetail(t)} style={{ background: selected.has(t._id) ? 'var(--p-surface-selected, #f5f5f5)' : undefined }}>
                  <td style={{ width:40, padding:'0 var(--p-space-300)' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(t._id)} onChange={() => toggleSelect(t._id)} style={{ cursor:'pointer' }} />
                  </td>
                  <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{t.title}</td>
                  <td className="td-muted">{t.employee?.name || '—'}</td>
                  <td className="td-muted">{t.clientName || '—'}</td>
                  <td>{t.category ? <span className="badge badge-draft">{t.category}</span> : '—'}</td>
                  <td className="td-num td-muted">{t.hours}h</td>
                  <td className="td-num td-muted">{fmtAmt(t.requestedAmount, t.currency)}</td>
                  <td className="td-num td-muted">{t.approvedAmount ? fmtAmt(t.approvedAmount, t.currency) : '—'}</td>
                  <td className="td-muted">{t.dateCompleted ? fmtDate(t.dateCompleted) : '—'}</td>
                  <td><span className={`badge ${BADGE[t.status] || 'badge-draft'}`}>{t.status}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="row-acts" style={{ opacity:1 }}>
                      <button className="btn-secondary" style={{ height:'1.75rem', fontSize:'var(--p-font-size-275)' }} onClick={() => openReview(t)}><i className="ti ti-eye-check" /> Review</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{paginated.length} task{filtered.length !== 1 ? 's' : ''}{selected.size>0&&` · ${selected.size} selected`}</div>
      </div>

      {/* Right-side detail drawer */}
      <TaskDrawer
        task={detail}
        onClose={() => setDetail(null)}
        actions={detail && <>
          <button className="btn-secondary" onClick={() => { setEditing({ ...detail }); setDetail(null); }}><i className="ti ti-pencil" /> Edit</button>
          <button className="btn-primary" onClick={() => openReview(detail)}><i className="ti ti-eye-check" /> Review</button>
        </>}
      />

      {/* Edit Modal — every column editable */}
      {editing && (
        <div className="p-modal-bg open" onClick={() => setEditing(null)}>
          <div className="p-modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd"><h3>Edit: {editing.title}</h3><button className="p-modal-x" onClick={() => setEditing(null)}><i className="ti ti-x" /></button></div>
            <div className="p-modal-body">
              <div className="p-field"><label className="p-label">Task</label><input className="p-input" value={editing.title} onChange={e => setEditing((t:any)=>({...t,title:e.target.value}))} /></div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Client</label><input className="p-input" value={editing.clientName||''} onChange={e => setEditing((t:any)=>({...t,clientName:e.target.value}))} /></div>
                <div className="p-field"><label className="p-label">Category</label><input className="p-input" value={editing.category||''} onChange={e => setEditing((t:any)=>({...t,category:e.target.value}))} /></div>
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Hours</label><input className="p-input" type="number" step="0.25" value={editing.hours||0} onChange={e => setEditing((t:any)=>({...t,hours:e.target.value}))} /></div>
                <div className="p-field"><label className="p-label">Date Completed</label><input className="p-input" type="date" value={editing.dateCompleted?.slice(0,10)||''} onChange={e => setEditing((t:any)=>({...t,dateCompleted:e.target.value}))} /></div>
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Requested Amount</label><input className="p-input" type="number" value={editing.requestedAmount||0} onChange={e => setEditing((t:any)=>({...t,requestedAmount:e.target.value}))} /></div>
                <div className="p-field"><label className="p-label">Approved Amount</label><input className="p-input" type="number" value={editing.approvedAmount||0} onChange={e => setEditing((t:any)=>({...t,approvedAmount:e.target.value}))} /></div>
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Currency</label>
                  <select className="p-input" value={editing.currency||'LKR'} onChange={e => setEditing((t:any)=>({...t,currency:e.target.value}))}>
                    <option>LKR</option><option>AUD</option><option>USD</option>
                  </select>
                </div>
                <div className="p-field"><label className="p-label">Status</label>
                  <select className="p-input" value={editing.status} onChange={e => setEditing((t:any)=>({...t,status:e.target.value}))}>
                    {['Assigned','Accepted','Declined','Pending Review','Approved','Paid','Changes Requested','Rejected'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-field"><label className="p-label">Work Link</label><input className="p-input" type="url" value={editing.workLink||''} onChange={e => setEditing((t:any)=>({...t,workLink:e.target.value}))} /></div>
              <div className="p-field"><label className="p-label">Description</label><textarea className="p-input" rows={2} value={editing.description||''} onChange={e => setEditing((t:any)=>({...t,description:e.target.value}))} /></div>
            </div>
            <div className="p-modal-ft">
              <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}><i className="ti ti-device-floppy" /> {saving?'Saving…':'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

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
                <div><div className="p-label">Date</div><div>{reviewing.dateCompleted ? fmtDate(reviewing.dateCompleted) : '—'}</div></div>
              </div>
              {reviewing.description && <div><div className="p-label">Description</div><p style={{ fontSize:'var(--p-font-size-325)', color:'var(--p-text-secondary)' }}>{reviewing.description}</p></div>}
              {reviewing.workLink && <div><div className="p-label">Work Link</div><a href={reviewing.workLink} target="_blank" style={{ color:'var(--p-text-link)', fontSize:'var(--p-font-size-325)' }}>{reviewing.workLink}</a></div>}
              <div>
                <label className="p-label">Decision</label>
                <select className="p-input" value={reviewData.status} onChange={e => setReviewData(d => ({ ...d, status:e.target.value }))}>
                  <option>Approved</option><option value="Paid">Paid (mark as paid)</option><option>Rejected</option><option>Changes Requested</option>
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
      {toast && <div className="toast" style={{ display:'flex' }}>{toast}</div>}
    </div>
  );
}
