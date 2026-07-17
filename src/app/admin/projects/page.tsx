'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import { useData } from '@/hooks/useData';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';
import TableSkeleton from '@/components/TableSkeleton';
import { fmtAmt, fmtDate, usePrefs } from '@/lib/prefs';

const SB: Record<string,string> = { 'in-progress':'badge-pending', 'completed':'badge-paid', 'on-hold':'badge-med' };
const SL: Record<string,string> = { 'in-progress':'In Progress', 'completed':'Completed', 'on-hold':'On Hold' };
const PAGE_SIZE = 30;

export default function AdminProjectsPage() {
  usePrefs(); // re-render on currency / date-format changes
  const [projects,  setProjects]  = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('');
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [page,      setPage]      = useState(1);
  const [modal,     setModal]     = useState(false);
  const [editId,    setEditId]    = useState<string|null>(null);
  const [form,      setForm]      = useState({ name:'', clientName:'', employees:[] as string[], status:'in-progress', progress:0, value:0, currency:'LKR', due:'' });
  const [toast,     setToast]     = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  const [tasks, setTasks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const fetchAll = useCallback(async () => {
    const [p, u, t, c] = await Promise.all([
      apiCall('GET', '/projects'), apiCall('GET', '/users'),
      apiCall('GET', '/tasks?limit=500').catch(() => ({ tasks: [] })),
      apiCall('GET', '/clients').catch(() => ({ clients: [] })),
    ]);
    setProjects(p.projects || []); setEmployees((u.users || []).filter((u: any) => u.role === 'employee'));
    setTasks(t.tasks || []); setClients(c.clients || []); setLoading(false);
  }, []);
  const taskCount = (projectId: string) => tasks.filter((t: any) => (t.projects || []).some((x: any) => (x?._id || x) === projectId)).length;
  useEffect(() => { fetchAll(); }, []);

  const openModal = (p?: any) => {
    setEditId(p?._id || null);
    const empIds = p ? ((p.employees?.length ? p.employees : [p.employee]).filter(Boolean).map((e: any) => e?._id || e)) : [];
    setForm(p ? { name:p.name, clientName:p.clientName||'', employees:empIds, status:p.status||'in-progress', progress:p.progress||0, value:p.value||0, currency:p.currency||'LKR', due:p.due?.slice(0,10)||'' } : { name:'', clientName:'', employees:[], status:'in-progress', progress:0, value:0, currency:'LKR', due:'' });
    setModal(true);
  };
  const save = async () => {
    try {
      if (editId) await apiCall('PATCH', `/projects/${editId}`, form);
      else await apiCall('POST', '/projects', form);
      setModal(false); await fetchAll(); showToast(editId ? 'Updated!' : 'Created!');
    } catch (e: any) { showToast(e.message); }
  };
  const del = async (id: string) => {
    if (!confirm('Delete?')) return;
    try { await apiCall('DELETE', `/projects/${id}`); await fetchAll(); showToast('Deleted.'); }
    catch (e: any) { showToast(e.message); }
  };

  const filtered = projects.filter(p => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.clientName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter && p.status !== filter) return false;
    return true;
  });
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = (checked: boolean) => setSelected(checked ? new Set(paginated.map(p => p._id)) : new Set());
  const allChecked = paginated.length > 0 && paginated.every(p => selected.has(p._id));
  const someChecked = paginated.some(p => selected.has(p._id)) && !allChecked;

  const bulkSetStatus = async (status: string) => {
    for (const id of selected) { try { await apiCall('PATCH', `/projects/${id}`, { status }); } catch {} }
    await fetchAll(); setSelected(new Set()); showToast(`Updated ${selected.size} project(s)`);
  };
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} project(s)?`)) return;
    for (const id of selected) { try { await apiCall('DELETE', `/projects/${id}`); } catch {} }
    await fetchAll(); setSelected(new Set()); showToast('Deleted.');
  };

  const stats = { total:projects.length, active:projects.filter(p=>p.status==='in-progress').length, done:projects.filter(p=>p.status==='completed').length, value:projects.reduce((s,p)=>s+(p.value||0),0) };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Projects</h2><p>Track project progress and delivery</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={() => openModal()}><i className="ti ti-plus" /> New project</button></div>
      </div>
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-folder" /> <span className="sec-t">Total</span></div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-loader" /> <span className="sec-t">In progress</span></div><div className="stat-value">{stats.active}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-check" /> <span className="sec-t">Completed</span></div><div className="stat-value up">{stats.done}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-currency-dollar" /> <span className="sec-t">Total value</span></div><div className="stat-value">{fmtAmt(stats.value)}</div></div>
      </div>
      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search"><span className="p-search-icon"><i className="ti ti-search" /></span><input type="text" placeholder="Search projects…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
          <div className="p-toolbar-end">
            <select className="btn-secondary" style={{ height:'2rem', fontSize:'var(--p-font-size-325)', padding:'0 var(--p-space-300)', cursor:'pointer', boxShadow:'var(--p-shadow-button)' }} value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
              <option value="">All status</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="on-hold">On Hold</option>
            </select>
          </div>
        </div>

        <BulkBar count={selected.size} visible={selected.size > 0}
          actions={[
            { label:'Mark complete', icon:'ti-check',  onClick:() => bulkSetStatus('completed') },
            { label:'Put on hold',   icon:'ti-pause',  onClick:() => bulkSetStatus('on-hold') },
            { label:'Delete',        icon:'ti-trash',  onClick:bulkDelete, danger:true },
          ]}
          onClear={() => setSelected(new Set())}
        />

        {loading ? <TableSkeleton rows={6} cols={6} /> : (
        <table className="p-table">
          <thead><tr>
            <th className="cb-col"><input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked; }} onChange={e => selectAll(e.target.checked)} style={{ cursor:'pointer' }} /></th>
            <th style={{ textAlign:'left', minWidth:180 }}>Project</th>
            <th style={{ textAlign:'left', minWidth:120 }}>Client</th>
            <th style={{ textAlign:'left', minWidth:140 }}>Assigned To</th>
            <th style={{ textAlign:'left', minWidth:140 }}>Progress</th>
            <th className="td-num" style={{ minWidth:60 }}>Tasks</th>
            <th className="td-num" style={{ minWidth:110 }}>Value</th>
            <th style={{ textAlign:'left', minWidth:110 }}>Due</th>
            <th style={{ textAlign:'left', minWidth:110 }}>Status</th>
            <th style={{ textAlign:'left', minWidth:60 }}></th>
          </tr></thead>
          <tbody>
            {paginated.length === 0 && <tr><td colSpan={10} style={{ textAlign:'center', padding:'var(--p-space-800)', color:'var(--p-text-secondary)' }}>No projects found.</td></tr>}
            {paginated.map(p => (
              <tr key={p._id} style={{ background: selected.has(p._id) ? '#f0f7ff' : undefined }}>
                <td className="cb-col"><input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSelect(p._id)} style={{ cursor:'pointer' }} /></td>
                <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{p.name}</td>
                <td className="td-muted">{p.clientName || '—'}</td>
                <td className="td-muted">{(p.employees?.length ? p.employees.map((e: any) => e?.name) : [p.employee?.name]).filter(Boolean).join(', ') || '—'}</td>
                <td style={{ minWidth:140 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)' }}>
                    <div style={{ flex:1, height:6, background:'var(--p-border)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:3, background:'#005bd3', width:`${p.progress||0}%` }} />
                    </div>
                    <span style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)', flexShrink:0 }}>{p.progress||0}%</span>
                  </div>
                </td>
                <td className="td-num td-muted">{taskCount(p._id)}</td>
                <td className="td-num td-muted">{fmtAmt(p.value, p.currency)}</td>
                <td className="td-muted">{p.due ? new Date(p.due).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</td>
                <td><span className={`badge ${SB[p.status]||'badge-draft'}`}>{SL[p.status]||p.status}</span></td>
                <td>
                  <div className="row-acts" style={{ opacity:1 }}>
                    <button className="ia-btn" onClick={() => openModal(p)}><i className="ti ti-pencil" /></button>
                    <button className="ia-btn del" onClick={() => del(p._id)}><i className="ti ti-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>)}
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{paginated.length} project{filtered.length!==1?'s':''}{selected.size>0?` · ${selected.size} selected`:''}</div>
        </div>

      {modal && (
        <div className="p-modal-bg open" onClick={() => setModal(false)}>
          <div className="p-modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd"><h3>{editId ? 'Edit project' : 'New project'}</h3><button className="p-modal-x" onClick={() => setModal(false)}><i className="ti ti-x" /></button></div>
            <div className="p-modal-body">
              <div className="p-field"><label className="p-label">Project Name *</label><input className="p-input" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} placeholder="e.g. Website redesign" autoFocus /></div>
              <div className="p-field"><label className="p-label">Client</label>
                <select className="p-input" value={form.clientName} onChange={e => { const name=e.target.value; const cl=clients.find((x:any)=>x.name===name); setForm(f => ({...f, clientName:name, currency: cl?.currency || f.currency })); }}>
                  <option value="">Select…</option>
                  {clients.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="p-field">
                <label className="p-label">Assign Employees <span style={{ color:'var(--p-text-secondary)', fontWeight:400 }}>(1 or many)</span></label>
                <div style={{ border:'.0625rem solid var(--p-border)', borderRadius:'var(--p-border-radius-150)', maxHeight:140, overflowY:'auto' }}>
                  {employees.map((e: any) => (
                    <label key={e._id} style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)', padding:'var(--p-space-200) var(--p-space-300)', cursor:'pointer', borderBottom:'.0625rem solid var(--p-border-subdued)', fontSize:'var(--p-font-size-325)' }}>
                      <input type="checkbox" checked={form.employees.includes(e._id)}
                        onChange={() => setForm(f => ({ ...f, employees: f.employees.includes(e._id) ? f.employees.filter(x => x !== e._id) : [...f.employees, e._id] }))}
                        style={{ cursor:'pointer' }} />
                      <span style={{ flex:1 }}>{e.name}</span>
                      <span style={{ color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-275)' }}>{e.position||'Employee'}</span>
                    </label>
                  ))}
                  {employees.length===0 && <div style={{ padding:'var(--p-space-300)', color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-325)' }}>No employees found</div>}
                </div>
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Status</label>
                  <select className="p-input" value={form.status} onChange={e => setForm(f => ({...f,status:e.target.value}))}><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="on-hold">On Hold</option></select>
                </div>
                <div className="p-field"><label className="p-label">Due Date</label><input className="p-input" type="date" value={form.due} onChange={e => setForm(f => ({...f,due:e.target.value}))} /></div>
              </div>
              <div className="p-field"><label className="p-label">Progress ({form.progress}%)</label><input className="p-input" type="range" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({...f,progress:+e.target.value}))} /></div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Project Value <span style={{ color:'var(--p-text-secondary)', fontWeight:400 }}>(admin-only — hidden from employees)</span></label><input className="p-input" type="number" value={form.value} onChange={e => setForm(f => ({...f,value:+e.target.value}))} /></div>
                <div className="p-field"><label className="p-label">Currency</label>
                  <select className="p-input" value={form.currency} onChange={e => setForm(f => ({...f,currency:e.target.value}))}><option>LKR</option><option>AUD</option><option>USD</option></select>
                </div>
              </div>
            </div>
            <div className="p-modal-ft"><button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn-primary" onClick={save}><i className="ti ti-device-floppy" /> {editId ? 'Save changes' : 'Create'}</button></div>
          </div>
        </div>
      )}
      {toast && <div className="toast" style={{ display:'flex' }}>{toast}</div>}
    </div>
  );
}
