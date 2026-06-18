'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';

const STATUS_BADGE: Record<string,string> = {active:'badge-paid',inactive:'badge-high',pending:'badge-pending'};
const PAGE_SIZE = 50;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('');
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [page,      setPage]      = useState(1);
  const [modal,     setModal]     = useState(false);
  const [editId,    setEditId]    = useState<string|null>(null);
  const [form,      setForm]      = useState({name:'',email:'',position:'',currency:'LKR',payType:'Per Task',status:'active',password:''});
  const [toast,     setToast]     = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),2400); };

  const fetchEmployees = useCallback(async () => {
    try { const d = await apiCall('GET','/users'); setEmployees((d.users||[]).filter((u:any)=>u.role==='employee')); }
    catch { setEmployees([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchEmployees(); }, []);

  const openModal = (e?: any) => {
    setEditId(e?._id||null);
    setForm(e ? {name:e.name,email:e.email,position:e.position||'',currency:e.currency||'LKR',payType:e.payType||'Per Task',status:e.status||'active',password:''} : {name:'',email:'',position:'',currency:'LKR',payType:'Per Task',status:'active',password:''});
    setModal(true);
  };
  const saveEmployee = async () => {
    try {
      if (editId) await apiCall('PATCH',`/users/${editId}`,{name:form.name,position:form.position,currency:form.currency,payType:form.payType,status:form.status});
      else await apiCall('POST','/auth/register',{name:form.name,email:form.email,password:form.password||'emp123',role:'employee',position:form.position});
      setModal(false); await fetchEmployees(); showToast(editId?'Employee updated!':'Employee added!');
    } catch(e:any) { showToast(e.message); }
  };
  const deleteEmployee = async (id: string) => {
    if (!confirm('Remove this employee?')) return;
    try { await apiCall('DELETE',`/users/${id}`); await fetchEmployees(); showToast('Removed.'); }
    catch(e:any) { showToast(e.message); }
  };

  const filtered = employees.filter(e => {
    if (search && !e.name?.toLowerCase().includes(search.toLowerCase()) && !e.email?.toLowerCase().includes(search.toLowerCase()) && !e.position?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter && e.status !== filter) return false;
    return true;
  });
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  // Bulk select
  const toggleSelect = (id: string) => setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const selectAll = (checked: boolean) => setSelected(checked ? new Set(paginated.map(e=>e._id)) : new Set());
  const allChecked = paginated.length>0 && paginated.every(e=>selected.has(e._id));
  const someChecked = paginated.some(e=>selected.has(e._id)) && !allChecked;

  const bulkSetStatus = async (status: string) => {
    for (const id of selected) { try { await apiCall('PATCH',`/users/${id}`,{status}); } catch {} }
    await fetchEmployees(); setSelected(new Set()); showToast(`${selected.size} employee(s) set to ${status}`);
  };
  const bulkDelete = async () => {
    if (!confirm(`Remove ${selected.size} employee(s)?`)) return;
    for (const id of selected) { try { await apiCall('DELETE',`/users/${id}`); } catch {} }
    await fetchEmployees(); setSelected(new Set()); showToast('Removed.');
  };

  const stats = { total:employees.length, active:employees.filter(e=>e.status==='active').length, pending:employees.filter(e=>e.status==='pending').length };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Employees</h2><p>Manage your team members and roles</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={()=>openModal()}><i className="ti ti-plus"/> Add employee</button></div>
      </div>
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-users-group"/> <span className="sec-t">Total</span></div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check"/> <span className="sec-t">Active</span></div><div className="stat-value up">{stats.active}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clock"/> <span className="sec-t">Pending</span></div><div className="stat-value">{stats.pending}</div></div>
      </div>
      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search"><span className="p-search-icon"><i className="ti ti-search"/></span><input type="text" placeholder="Search employees…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div>
          <div className="p-toolbar-end">
            <select className="btn-secondary" style={{height:'2rem',fontSize:'var(--p-font-size-325)',padding:'0 var(--p-space-300)',cursor:'pointer',boxShadow:'var(--p-shadow-button)'}} value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}>
              <option value="">All status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <BulkBar
          count={selected.size}
          visible={selected.size > 0}
          actions={[
            { label:'Set active',   icon:'ti-check',  onClick:()=>bulkSetStatus('active') },
            { label:'Set inactive', icon:'ti-minus',  onClick:()=>bulkSetStatus('inactive') },
            { label:'Delete',       icon:'ti-trash',  onClick:bulkDelete, danger:true },
          ]}
          onClear={() => setSelected(new Set())}
        />

        {loading ? <div style={{padding:'3rem',textAlign:'center',color:'var(--p-text-secondary)'}}>Loading…</div> : (
        <table className="p-table">
          <thead><tr>
            <th className="cb-col">
              <input type="checkbox" checked={allChecked} ref={el=>{if(el)el.indeterminate=someChecked;}} onChange={e=>selectAll(e.target.checked)} style={{cursor:'pointer'}}/>
            </th>
            <th style={{textAlign:"left"}}>Name</th><th style={{textAlign:"left"}}>Email</th><th style={{textAlign:"left"}}>Position</th><th style={{textAlign:"left"}}>Pay Type</th><th style={{textAlign:"left"}}>Currency</th><th style={{textAlign:"left"}}>Employee ID</th><th style={{textAlign:"left"}}>Status</th><th/>
          </tr></thead>
          <tbody>
            {paginated.length===0&&<tr><td colSpan={9} style={{textAlign:'center',padding:'var(--p-space-800)',color:'var(--p-text-secondary)'}}>No employees found.</td></tr>}
            {paginated.map(e=>(
              <tr key={e._id} style={{background:selected.has(e._id)?'var(--p-surface-selected,#f0f7ff)':undefined}}>
                <td className="cb-col">
                  <input type="checkbox" checked={selected.has(e._id)} onChange={()=>toggleSelect(e._id)} style={{cursor:'pointer'}}/>
                </td>
                <td><div style={{display:'flex',alignItems:'center',gap:'var(--p-space-250)'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'var(--p-fill-brand)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>
                    {e.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:'var(--p-font-weight-medium)'}}>{e.name}</div>
                    {e.position&&<div style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)'}}>{e.position}</div>}
                  </div>
                </div></td>
                <td className="td-muted">{e.email}</td>
                <td className="td-muted">{e.position||'—'}</td>
                <td className="td-muted">{e.payType||'Per Task'}</td>
                <td className="td-muted">{e.currency||'LKR'}</td>
                <td className="td-muted">{e.employeeId||'—'}</td>
                <td><span className={`badge ${STATUS_BADGE[e.status]||'badge-draft'}`}>{e.status}</span></td>
                <td><div className="row-acts" style={{opacity:1}}>
                  <button className="ia-btn" onClick={()=>openModal(e)}><i className="ti ti-pencil"/></button>
                  <button className="ia-btn del" onClick={()=>deleteEmployee(e._id)}><i className="ti ti-trash"/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>)}
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{filtered.length} employee{filtered.length!==1?'s':''}{selected.size>0?` · ${selected.size} selected`:''}</div>
      </div>

      {modal&&(<div className="p-modal-bg open" onClick={()=>setModal(false)}><div className="p-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div className="p-modal-hd"><h3>{editId?'Edit employee':'Add employee'}</h3><button className="p-modal-x" onClick={()=>setModal(false)}><i className="ti ti-x"/></button></div>
        <div className="p-modal-body">
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Full Name *</label><input className="p-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Full name" autoFocus/></div>
            {!editId&&<div className="p-field"><label className="p-label">Email *</label><input className="p-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@example.com"/></div>}
            {editId&&<div className="p-field"><label className="p-label">Status</label>
              <select className="p-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                <option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option>
              </select>
            </div>}
          </div>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Position</label><input className="p-input" value={form.position} onChange={e=>setForm(f=>({...f,position:e.target.value}))} placeholder="e.g. Designer"/></div>
            <div className="p-field"><label className="p-label">Pay Type</label>
              <select className="p-input" value={form.payType} onChange={e=>setForm(f=>({...f,payType:e.target.value}))}>
                <option>Per Task</option><option>Hourly</option><option>Monthly</option>
              </select>
            </div>
          </div>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Currency</label>
              <select className="p-input" value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                <option>LKR</option><option>AUD</option><option>USD</option>
              </select>
            </div>
            {!editId&&<div className="p-field"><label className="p-label">Password</label><input className="p-input" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Default: emp123"/></div>}
          </div>
        </div>
        <div className="p-modal-ft"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn-primary" onClick={saveEmployee}><i className="ti ti-device-floppy"/> {editId?'Save changes':'Add employee'}</button></div>
      </div></div>)}
      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
