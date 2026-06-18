'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 50;

export default function AdminUsersPage() {
  const [admins,   setAdmins]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page,     setPage]     = useState(1);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({ name:'', email:'', password:'' });
  const [toast,    setToast]    = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  const fetchAdmins = useCallback(async () => {
    try { const d = await apiCall('GET', '/users'); setAdmins((d.users||[]).filter((u:any)=>u.role==='admin')); }
    catch { setAdmins([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAdmins(); }, []);

  const addAdmin = async () => {
    try {
      await apiCall('POST', '/auth/register', { name:form.name, email:form.email, password:form.password, role:'admin' });
      setModal(false); setForm({name:'',email:'',password:''}); await fetchAdmins(); showToast('Admin added!');
    } catch (e: any) { showToast(e.message); }
  };
  const removeAdmin = async (id: string) => {
    if (!confirm('Remove this admin?')) return;
    try { await apiCall('DELETE', `/users/${id}`); await fetchAdmins(); showToast('Admin removed.'); }
    catch (e: any) { showToast(e.message); }
  };

  const paginated = admins.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = (checked: boolean) => setSelected(checked ? new Set(paginated.map(a => a._id)) : new Set());
  const allChecked = paginated.length > 0 && paginated.every(a => selected.has(a._id));
  const someChecked = paginated.some(a => selected.has(a._id)) && !allChecked;

  const bulkRemove = async () => {
    if (!confirm(`Remove ${selected.size} admin(s)?`)) return;
    for (const id of Array.from(selected)) { try { await apiCall('DELETE', `/users/${id}`); } catch {} }
    await fetchAdmins(); setSelected(new Set()); showToast('Removed.');
  };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Admin Users</h2><p>Manage admin accounts and their roles</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={() => setModal(true)}><i className="ti ti-plus" /> Add Admin</button></div>
      </div>
      <div className="p-table-wrap">
        <BulkBar count={selected.size} visible={selected.size > 0}
          actions={[{ label:'Remove', icon:'ti-trash', onClick:bulkRemove, danger:true }]}
          onClear={() => setSelected(new Set())}
        />

        {loading ? <div style={{ padding:'3rem', textAlign:'center', color:'var(--p-text-secondary)' }}>Loading…</div> : (
        <table className="p-table">
          <thead><tr>
            <th className="cb-col"><input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked; }} onChange={e => selectAll(e.target.checked)} style={{ cursor:'pointer' }} /></th>
            <th style={{ textAlign:'left', minWidth:160 }}>Name</th>
            <th style={{ textAlign:'left', minWidth:200 }}>Email</th>
            <th style={{ textAlign:'left', minWidth:110 }}>Employee ID</th>
            <th style={{ textAlign:'left', minWidth:120 }}>Last Login</th>
            <th style={{ textAlign:'left', minWidth:60 }}></th>
          </tr></thead>
          <tbody>
            {paginated.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:'var(--p-space-800)', color:'var(--p-text-secondary)' }}>No admins found.</td></tr>}
            {paginated.map(a => (
              <tr key={a._id} style={{ background: selected.has(a._id) ? '#f0f7ff' : undefined }}>
                <td className="cb-col"><input type="checkbox" checked={selected.has(a._id)} onChange={() => toggleSelect(a._id)} style={{ cursor:'pointer' }} /></td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:'var(--p-space-250)' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--p-fill-brand)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0 }}>
                      {a.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight:'var(--p-font-weight-medium)' }}>{a.name}</span>
                  </div>
                </td>
                <td className="td-muted">{a.email}</td>
                <td className="td-muted">{a.employeeId || '—'}</td>
                <td className="td-muted">{a.lastLogin ? new Date(a.lastLogin).toLocaleDateString() : 'Never'}</td>
                <td>
                  <button className="ia-btn del" onClick={() => removeAdmin(a._id)} title="Remove"><i className="ti ti-trash" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>)}
        <Pagination page={page} total={admins.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{admins.length} admin{admins.length!==1?'s':''}{selected.size>0?` · ${selected.size} selected`:''}</div>
      </div>

      {modal && (
        <div className="p-modal-bg open" onClick={() => setModal(false)}>
          <div className="p-modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd"><h3>Add Admin</h3><button className="p-modal-x" onClick={() => setModal(false)}><i className="ti ti-x" /></button></div>
            <div className="p-modal-body">
              <div className="p-field"><label className="p-label">Full Name *</label><input className="p-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Full name" autoFocus /></div>
              <div className="p-field"><label className="p-label">Email *</label><input className="p-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="admin@example.com" /></div>
              <div className="p-field"><label className="p-label">Password *</label><input className="p-input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="Min 8 characters" /></div>
            </div>
            <div className="p-modal-ft"><button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn-primary" onClick={addAdmin}><i className="ti ti-user-plus" /> Add Admin</button></div>
          </div>
        </div>
      )}
      {toast && <div className="toast" style={{ display:'flex' }}>{toast}</div>}
    </div>
  );
}
