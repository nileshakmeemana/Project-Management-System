'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';

const fmtAmt = (v: number, c = 'LKR') => { try { return new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(v||0); } catch { return `${c} ${(v||0).toLocaleString()}`; }};
const BADGE: Record<string,string> = {'Pending Review':'badge-pending','Approved':'badge-paid','Paid':'badge-paid','Rejected':'badge-high','Changes Requested':'badge-med'};
const PRIO_COLOR: Record<string,string> = { high:'#c70a24', med:'#ffb800', low:'#047b5d', normal:'#888' };

const PAGE_SIZE = 50;

export default function AdminTasksPage() {
  const [tasks,    setTasks]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [period,   setPeriod]   = useState<DateRange>({ preset: 'all', label: 'All time' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page,     setPage]     = useState(1);
  const [modal,    setModal]    = useState(false);
  const [newTask,  setNewTask]  = useState({ title: '', priority: 'med', status: 'todo' });
  const [toast,    setToast]    = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400); };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try { const d = await apiCall('GET', '/tasks'); setTasks(d.tasks || []); }
    catch { setTasks([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, []);

  // Filter
  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    if (search && !(t.title||'').toLowerCase().includes(q) && !(t.employee?.name||'').toLowerCase().includes(q) && !(t.clientName||'').toLowerCase().includes(q)) return false;
    if (filter === 'todo')    return !['Approved','Paid'].includes(t.status);
    if (filter === 'done')    return  ['Approved','Paid'].includes(t.status);
    if (filter !== 'all')     return t.status === filter;
    if (period.start) {
      const d = new Date(t.dateCompleted || t.createdAt);
      if (d < period.start!) return false;
      if (period.end && d > period.end!) return false;
    }
    return true;
  });

  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  // Select
  const toggleSelect = (id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = (checked: boolean) => {
    setSelected(checked ? new Set(paginated.map(t => t._id)) : new Set());
  };
  const allChecked = paginated.length > 0 && paginated.every(t => selected.has(t._id));
  const someChecked = paginated.some(t => selected.has(t._id)) && !allChecked;

  // Bulk actions
  const bulkApprove = async () => {
    for (const id of selected) { try { await apiCall('PATCH', `/tasks/${id}`, { status: 'Approved' }); } catch {} }
    await fetchTasks(); setSelected(new Set()); showToast(`${selected.size} task(s) approved`);
  };
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;
    for (const id of selected) { try { await apiCall('DELETE', `/tasks/${id}`); } catch {} }
    await fetchTasks(); setSelected(new Set()); showToast('Deleted');
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    try { await apiCall('POST', '/tasks', { ...newTask, requestedAmount: 0, hours: 0 }); await fetchTasks(); setModal(false); setNewTask({ title:'', priority:'med', status:'todo' }); showToast('Task added!'); }
    catch (e: any) { showToast(e.message); }
  };

  const stats = { total: tasks.length, pending: tasks.filter(t=>t.status==='Pending Review').length, approved: tasks.filter(t=>['Approved','Paid'].includes(t.status)).length, value: tasks.filter(t=>['Approved','Paid'].includes(t.status)).reduce((s,t)=>s+(t.approvedAmount||t.requestedAmount||0),0) };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>All Tasks</h2><p>Manage and review submitted work items</p></div>
        <div className="page-hero-right">
          <PeriodFilter id="tasks" onChange={p => { setPeriod(p); setPage(1); }} />
          <button className="btn-primary" onClick={() => setModal(true)}><i className="ti ti-plus" /> Add task</button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clipboard-list" /> <span className="sec-t">Total</span></div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clock" /> <span className="sec-t">Pending</span></div><div className="stat-value">{stats.pending}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check" /> <span className="sec-t">Approved</span></div><div className="stat-value up">{stats.approved}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-cash" /> <span className="sec-t">Total Value</span></div><div className="stat-value">{fmtAmt(stats.value)}</div></div>
      </div>

      <div className="p-table-wrap">
        {/* Toolbar */}
        <div className="p-toolbar">
          <div className="p-search">
            <span className="p-search-icon"><i className="ti ti-search" /></span>
            <input type="text" placeholder="Search tasks…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="p-toolbar-end">
            {/* Filter button group */}
            <div className="filter-btn-group">
              {[['all','All'],['todo','To do'],['done','Done']].map(([v,l]) => (
                <button key={v} className={`btn-secondary${filter===v?' active':''}`} onClick={() => { setFilter(v); setPage(1); }}>{l}</button>
              ))}
            </div>
            {/* Status filter */}
            <select className="btn-secondary" style={{ height:'2rem', padding:'0 var(--p-space-300)', fontSize:'var(--p-font-size-325)', cursor:'pointer', boxShadow:'var(--p-shadow-button)' }}
              value={['all','todo','done'].includes(filter)?'':filter} onChange={e => { setFilter(e.target.value||'all'); setPage(1); }}>
              <option value="">All status</option>
              {['Pending Review','Approved','Paid','Changes Requested','Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Bulk bar */}
        <BulkBar
          count={selected.size}
          visible={selected.size > 0}
          actions={[
            { label: 'Approve', icon: 'ti-check', onClick: bulkApprove },
            { label: 'Delete',  icon: 'ti-trash',  onClick: bulkDelete, danger: true },
          ]}
          onClear={() => setSelected(new Set())}
        />

        {loading ? <div style={{ padding:'3rem', textAlign:'center', color:'var(--p-text-secondary)' }}>Loading…</div> : (
          <table className="p-table">
            <thead>
              <tr>
                <th style={{textAlign:"left", width:40, padding:'0 var(--p-space-300)' }}>
                  <input type="checkbox" checked={allChecked} ref={el => { if(el) el.indeterminate = someChecked; }} onChange={e => selectAll(e.target.checked)} style={{ cursor:'pointer' }} />
                </th>
                <th style={{textAlign:"left"}}>Task</th><th style={{textAlign:"left"}}>Employee</th><th style={{textAlign:"left"}}>Client</th><th style={{textAlign:"left"}}>Category</th>
                <th className="td-num">Hours</th><th className="td-num">Requested</th><th className="td-num">Approved</th><th style={{textAlign:"left"}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && <tr><td colSpan={9} style={{ textAlign:'center', padding:'var(--p-space-800)', color:'var(--p-text-secondary)' }}>No tasks found.</td></tr>}
              {paginated.map(t => (
                <tr key={t._id} style={{ background: selected.has(t._id) ? 'var(--p-surface-selected, #f5f5f5)' : undefined }}>
                  <td style={{ width:40, padding:'0 var(--p-space-300)' }}>
                    <input type="checkbox" checked={selected.has(t._id)} onChange={() => toggleSelect(t._id)} style={{ cursor:'pointer' }} />
                  </td>
                  <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{t.title}</td>
                  <td className="td-muted">{t.employee?.name || '—'}</td>
                  <td className="td-muted">{t.clientName || '—'}</td>
                  <td>{t.category ? <span className="badge badge-draft">{t.category}</span> : '—'}</td>
                  <td className="td-num td-muted">{t.hours}h</td>
                  <td className="td-num td-muted">{fmtAmt(t.requestedAmount, t.currency)}</td>
                  <td className="td-num td-muted">{t.approvedAmount ? fmtAmt(t.approvedAmount, t.currency) : '—'}</td>
                  <td><span className={`badge ${BADGE[t.status]||'badge-draft'}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{filtered.length} task{filtered.length!==1?'s':''}{selected.size>0&&` · ${selected.size} selected`}</div>
      </div>

      {/* Add task modal */}
      {modal && (
        <div className="p-modal-bg open" onClick={() => setModal(false)}>
          <div className="p-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd"><h3>Add task</h3><button className="p-modal-x" onClick={() => setModal(false)}><i className="ti ti-x" /></button></div>
            <div className="p-modal-body">
              <div className="p-field"><label className="p-label">Title *</label><input className="p-input" value={newTask.title} onChange={e => setNewTask(t=>({...t,title:e.target.value}))} placeholder="Task name" autoFocus /></div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Priority</label>
                  <select className="p-input" value={newTask.priority} onChange={e => setNewTask(t=>({...t,priority:e.target.value}))}>
                    <option value="high">High</option><option value="med">Medium</option><option value="low">Low</option>
                  </select>
                </div>
                <div className="p-field"><label className="p-label">Status</label>
                  <select className="p-input" value={newTask.status} onChange={e => setNewTask(t=>({...t,status:e.target.value}))}>
                    <option value="todo">To do</option><option value="done">Done</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-modal-ft">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={addTask}><i className="ti ti-plus" /> Add task</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast" style={{ display:'flex' }}>{toast}</div>}
    </div>
  );
}
