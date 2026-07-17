'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';
import { useData } from '@/hooks/useData';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';
import TaskDrawer from '@/components/TaskDrawer';
import TableSkeleton from '@/components/TableSkeleton';
import { NotifStore } from '@/lib/notifications';

const BADGE: Record<string,string> = {
  'Assigned':'badge-pending','Accepted':'badge-paid','Declined':'badge-high',
  'Pending Review':'badge-pending','Approved':'badge-paid','Paid':'badge-paid',
  'Rejected':'badge-high','Changes Requested':'badge-med',
};

const PAGE_SIZE = 30;
const EMPTY_FORM = { title:'', employees:[] as string[], projects:[] as string[], clientName:'', category:'', description:'' };

export default function AdminTasksPage() {
  const router = useRouter();
  const { data: tasksData, loading, refresh: refreshTasks } = useData('/tasks?limit=500');
  const { data: usersData }  = useData('/users');
  const { data: clientsData }= useData('/clients');
  const { data: catsData }   = useData('/categories');
  const { data: projData }   = useData('/projects');

  const tasks     = tasksData?.tasks || [];
  const employees = (usersData?.users || []).filter((u: any) => u.role === 'employee');
  const clients   = clientsData?.clients || [];
  const cats      = catsData?.categories || [];
  const projList  = projData?.projects || [];

  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [period,   setPeriod]   = useState<DateRange>({ preset: 'all', label: 'All time' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page,     setPage]     = useState(1);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({ ...EMPTY_FORM });
  const [editing,  setEditing]  = useState<any>(null);   // edit popup
  const [detail,   setDetail]   = useState<any>(null);   // right-side drawer
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400); };

  // Deep link — /admin/tasks?assign=1 opens the assign modal (dashboard quick action)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('assign') === '1') setModal(true);
  }, []);
  const fetchTasks = refreshTasks;

  // Filter — period first, then search / status
  const filtered = tasks.filter(t => {
    if (period.start) {
      const d = new Date(t.dateCompleted || t.createdAt);
      if (d < period.start) return false;
      if (period.end && d > period.end) return false;
    }
    const q = search.toLowerCase();
    if (search && !(t.title||'').toLowerCase().includes(q) && !(t.employee?.name||'').toLowerCase().includes(q) && !(t.clientName||'').toLowerCase().includes(q)) return false;
    if (filter === 'assigned') return ['Assigned','Accepted','Declined'].includes(t.status);
    if (filter === 'submitted') return ['Pending Review','Approved','Paid','Rejected','Changes Requested'].includes(t.status);
    if (filter !== 'all') return t.status === filter;
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
  const allChecked  = paginated.length > 0 && paginated.every(t => selected.has(t._id));
  const someChecked = paginated.some(t => selected.has(t._id)) && !allChecked;

  // Bulk: delete only
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;
    for (const id of Array.from(selected)) { try { await apiCall('DELETE', `/tasks/${id}`); } catch {} }
    await fetchTasks(); setSelected(new Set()); showToast('Deleted');
  };

  // Assign task to 1..n employees
  const assignTask = async () => {
    if (!form.title.trim())      { showToast('Title is required'); return; }
    if (!form.employees.length)  { showToast('Select at least one employee'); return; }
    setSaving(true);
    try {
      await apiCall('POST', '/tasks', {
        title: form.title, employees: form.employees,
        clientName: form.clientName, category: form.category, description: form.description,
        projects: form.projects,
        projectNames: projList.filter((p: any) => form.projects.includes(p._id)).map((p: any) => p.name),
      });
      NotifStore.add('ti-clipboard-plus', `Task assigned: "${form.title}" (${form.employees.length} employee${form.employees.length>1?'s':''})`, 'Admin');
      await fetchTasks(); setModal(false); setForm({ ...EMPTY_FORM });
      showToast(`Task assigned to ${form.employees.length} employee(s)`);
    } catch (e: any) { showToast(e.message); }
    finally { setSaving(false); }
  };

  // Edit popup save
  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const projIds = (editing.projects || []).map((p: any) => p?._id || p);
      await apiCall('PATCH', `/tasks/${editing._id}`, {
        title: editing.title, employee: editing.employee?._id || editing.employee,
        clientName: editing.clientName, category: editing.category,
        status: editing.status, description: editing.description,
        projects: projIds,
        projectNames: projList.filter((p: any) => projIds.includes(p._id)).map((p: any) => p.name),
      });
      await fetchTasks(); setEditing(null); showToast('Task updated');
    } catch (e: any) { showToast(e.message); }
    finally { setSaving(false); }
  };

  const toggleFormEmployee = (id: string) => {
    setForm(f => ({ ...f, employees: f.employees.includes(id) ? f.employees.filter(e => e !== id) : [...f.employees, id] }));
  };
  const toggleFormProject = (id: string) => {
    setForm(f => ({ ...f, projects: f.projects.includes(id) ? f.projects.filter(p => p !== id) : [...f.projects, id] }));
  };
  const toggleEditProject = (id: string) => {
    setEditing((t: any) => {
      const cur = (t.projects || []).map((p: any) => p?._id || p);
      return { ...t, projects: cur.includes(id) ? cur.filter((p: string) => p !== id) : [...cur, id] };
    });
  };

  const stats = {
    total:    tasks.length,
    assigned: tasks.filter(t=>t.status==='Assigned').length,
    accepted: tasks.filter(t=>t.status==='Accepted').length,
    pending:  tasks.filter(t=>t.status==='Pending Review').length,
  };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Tasks</h2><p>Assign tasks to your team and track acceptance</p></div>
        <div className="page-hero-right">
          <PeriodFilter id="tasks" onChange={p => { setPeriod(p); setPage(1); }} />
          <button className="btn-primary" onClick={() => setModal(true)}><i className="ti ti-plus" /> Assign task</button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clipboard-list" /> <span className="sec-t">Total</span></div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-send" /> <span className="sec-t">Awaiting Acceptance</span></div><div className="stat-value">{stats.assigned}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check" /> <span className="sec-t">Accepted</span></div><div className="stat-value up">{stats.accepted}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clock" /> <span className="sec-t">Pending Review</span></div><div className="stat-value">{stats.pending}</div></div>
      </div>

      <div className="p-table-wrap">
        {/* Toolbar */}
        <div className="p-toolbar">
          <div className="p-search">
            <span className="p-search-icon"><i className="ti ti-search" /></span>
            <input type="text" placeholder="Search tasks…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="p-toolbar-end">
            <div className="filter-btn-group">
              {[['all','All'],['assigned','Assigned'],['submitted','Submitted']].map(([v,l]) => (
                <button key={v} className={`btn-secondary${filter===v?' active':''}`} onClick={() => { setFilter(v); setPage(1); }}>{l}</button>
              ))}
            </div>
            <select className="btn-secondary" style={{ height:'2rem', padding:'0 var(--p-space-300)', fontSize:'var(--p-font-size-325)', cursor:'pointer', boxShadow:'var(--p-shadow-button)' }}
              value={['all','assigned','submitted'].includes(filter)?'':filter} onChange={e => { setFilter(e.target.value||'all'); setPage(1); }}>
              <option value="">All status</option>
              {['Assigned','Accepted','Declined','Pending Review','Approved','Paid','Changes Requested','Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
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

        {loading ? <TableSkeleton rows={8} cols={6} /> : (
          <table className="p-table">
            <thead>
              <tr>
                <th style={{textAlign:"left", width:40, padding:'0 var(--p-space-300)' }}>
                  <input type="checkbox" checked={allChecked} ref={el => { if(el) el.indeterminate = someChecked; }} onChange={e => selectAll(e.target.checked)} style={{ cursor:'pointer' }} onClick={e=>e.stopPropagation()} />
                </th>
                <th style={{textAlign:"left"}}>Task</th>
                <th style={{textAlign:"left"}}>Employee</th>
                <th style={{textAlign:"left"}}>Client</th>
                <th style={{textAlign:"left"}}>Category</th>
                <th style={{textAlign:"left"}}>Status</th>
                <th style={{textAlign:"left", width:170}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:'var(--p-space-800)', color:'var(--p-text-secondary)' }}>No tasks found.</td></tr>}
              {paginated.map(t => (
                <tr key={t._id} className="row-click" onClick={() => setDetail(t)} style={{ background: selected.has(t._id) ? 'var(--p-surface-selected, #f5f5f5)' : undefined }}>
                  <td style={{ width:40, padding:'0 var(--p-space-300)' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(t._id)} onChange={() => toggleSelect(t._id)} style={{ cursor:'pointer' }} />
                  </td>
                  <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{t.title}</td>
                  <td className="td-muted">{t.employee?.name || '—'}</td>
                  <td className="td-muted">{t.clientName || '—'}</td>
                  <td>{t.category ? <span className="badge badge-draft">{t.category}</span> : '—'}</td>
                  <td><span className={`badge ${BADGE[t.status]||'badge-draft'}`}>{t.status}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="row-acts" style={{ opacity:1, display:'flex', gap:'var(--p-space-100)' }}>
                      <button className="btn-secondary" style={{ height:'1.75rem', fontSize:'var(--p-font-size-275)' }} onClick={() => setEditing({ ...t })}><i className="ti ti-pencil" /> Edit</button>
                      <button className="btn-secondary" style={{ height:'1.75rem', fontSize:'var(--p-font-size-275)' }} onClick={() => router.push(`/admin/submitted-tasks?task=${t._id}`)}><i className="ti ti-eye-check" /> Review</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{paginated.length} task{filtered.length!==1?'s':''}{selected.size>0&&` · ${selected.size} selected`}</div>
      </div>

      {/* Assign task modal — Task, Employee(s), Client, Category only */}
      {modal && (
        <div className="p-modal-bg open" onClick={() => setModal(false)}>
          <div className="p-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd"><h3>Assign task</h3><button className="p-modal-x" onClick={() => setModal(false)}><i className="ti ti-x" /></button></div>
            <div className="p-modal-body">
              <div className="p-field"><label className="p-label">Task *</label><input className="p-input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Task name" autoFocus /></div>
              <div className="p-field">
                <label className="p-label">Employees * <span style={{ color:'var(--p-text-secondary)', fontWeight:400 }}>(select one or many)</span></label>
                <div style={{ border:'.0625rem solid var(--p-border)', borderRadius:'var(--p-border-radius-150)', maxHeight:160, overflowY:'auto' }}>
                  {employees.length === 0 && <div style={{ padding:'var(--p-space-300)', color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-325)' }}>No employees found</div>}
                  {employees.map((e: any) => (
                    <label key={e._id} style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)', padding:'var(--p-space-200) var(--p-space-300)', cursor:'pointer', borderBottom:'.0625rem solid var(--p-border-subdued)', fontSize:'var(--p-font-size-325)' }}>
                      <input type="checkbox" checked={form.employees.includes(e._id)} onChange={() => toggleFormEmployee(e._id)} style={{ cursor:'pointer' }} />
                      <span style={{ flex:1 }}>{e.name}</span>
                      <span style={{ color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-275)' }}>{e.position||'Employee'}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="p-field">
                <label className="p-label">Projects <span style={{ color:'var(--p-text-secondary)', fontWeight:400 }}>(task belongs to 1 or many projects)</span></label>
                <div style={{ border:'.0625rem solid var(--p-border)', borderRadius:'var(--p-border-radius-150)', maxHeight:130, overflowY:'auto' }}>
                  {projList.length === 0 && <div style={{ padding:'var(--p-space-300)', color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-325)' }}>No projects yet — create one on the Projects page</div>}
                  {projList.map((p: any) => (
                    <label key={p._id} style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)', padding:'var(--p-space-200) var(--p-space-300)', cursor:'pointer', borderBottom:'.0625rem solid var(--p-border-subdued)', fontSize:'var(--p-font-size-325)' }}>
                      <input type="checkbox" checked={form.projects.includes(p._id)} onChange={() => toggleFormProject(p._id)} style={{ cursor:'pointer' }} />
                      <span style={{ flex:1 }}>{p.name}</span>
                      <span style={{ color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-275)' }}>{p.clientName||''}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Client</label>
                  <select className="p-input" value={form.clientName} onChange={e => setForm(f=>({...f,clientName:e.target.value}))}>
                    <option value="">— None —</option>
                    {clients.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="p-field"><label className="p-label">Category</label>
                  <select className="p-input" value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
                    <option value="">— None —</option>
                    {cats.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-field"><label className="p-label">Notes (optional)</label><textarea className="p-input" rows={2} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Brief for the employee…" /></div>
            </div>
            <div className="p-modal-ft">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={assignTask} disabled={saving}><i className="ti ti-send" /> {saving?'Assigning…':'Assign task'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit popup — every table column editable */}
      {editing && (
        <div className="p-modal-bg open" onClick={() => setEditing(null)}>
          <div className="p-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd"><h3>Edit task</h3><button className="p-modal-x" onClick={() => setEditing(null)}><i className="ti ti-x" /></button></div>
            <div className="p-modal-body">
              <div className="p-field"><label className="p-label">Task</label><input className="p-input" value={editing.title} onChange={e => setEditing((t:any)=>({...t,title:e.target.value}))} /></div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Employee</label>
                  <select className="p-input" value={editing.employee?._id || editing.employee || ''} onChange={e => setEditing((t:any)=>({...t,employee:e.target.value}))}>
                    {employees.map((e: any) => <option key={e._id} value={e._id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="p-field"><label className="p-label">Client</label>
                  <select className="p-input" value={editing.clientName||''} onChange={e => setEditing((t:any)=>({...t,clientName:e.target.value}))}>
                    <option value="">— None —</option>
                    {clients.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Category</label>
                  <select className="p-input" value={editing.category||''} onChange={e => setEditing((t:any)=>({...t,category:e.target.value}))}>
                    <option value="">— None —</option>
                    {cats.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="p-field"><label className="p-label">Status</label>
                  <select className="p-input" value={editing.status} onChange={e => setEditing((t:any)=>({...t,status:e.target.value}))}>
                    {['Assigned','Accepted','Declined','Pending Review','Approved','Paid','Changes Requested','Rejected'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-field">
                <label className="p-label">Projects</label>
                <div style={{ border:'.0625rem solid var(--p-border)', borderRadius:'var(--p-border-radius-150)', maxHeight:110, overflowY:'auto' }}>
                  {projList.map((p: any) => {
                    const cur = (editing.projects || []).map((x: any) => x?._id || x);
                    return (
                      <label key={p._id} style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)', padding:'var(--p-space-200) var(--p-space-300)', cursor:'pointer', borderBottom:'.0625rem solid var(--p-border-subdued)', fontSize:'var(--p-font-size-325)' }}>
                        <input type="checkbox" checked={cur.includes(p._id)} onChange={() => toggleEditProject(p._id)} style={{ cursor:'pointer' }} />
                        <span style={{ flex:1 }}>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="p-field"><label className="p-label">Notes</label><textarea className="p-input" rows={2} value={editing.description||''} onChange={e => setEditing((t:any)=>({...t,description:e.target.value}))} /></div>
            </div>
            <div className="p-modal-ft">
              <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}><i className="ti ti-device-floppy" /> {saving?'Saving…':'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Right-side detail drawer */}
      <TaskDrawer
        task={detail}
        onClose={() => setDetail(null)}
        actions={detail && <>
          <button className="btn-secondary" onClick={() => { setEditing({ ...detail }); setDetail(null); }}><i className="ti ti-pencil" /> Edit</button>
          <button className="btn-primary" onClick={() => router.push(`/admin/submitted-tasks?task=${detail._id}`)}><i className="ti ti-eye-check" /> Review</button>
        </>}
      />

      {toast && <div className="toast" style={{ display:'flex' }}>{toast}</div>}
    </div>
  );
}
