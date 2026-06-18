'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 50;

export default function CategoriesPage() {
  const [cats,     setCats]     = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page,     setPage]     = useState(1);
  const [modal,    setModal]    = useState(false);
  const [editId,   setEditId]   = useState<string|null>(null);
  const [form,     setForm]     = useState({ name:'', desc:'', status:'active' });
  const [toast,    setToast]    = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  const fetchCats = useCallback(async () => {
    try { const d = await apiCall('GET', '/categories'); setCats(d.categories || []); }
    catch { setCats([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchCats(); }, []);

  const openModal = (c?: any) => {
    setEditId(c?._id || null);
    setForm(c ? { name:c.name, desc:c.desc||'', status:c.status||'active' } : { name:'', desc:'', status:'active' });
    setModal(true);
  };
  const save = async () => {
    try {
      if (editId) await apiCall('PATCH', `/categories/${editId}`, form);
      else await apiCall('POST', '/categories', form);
      setModal(false); await fetchCats(); showToast(editId ? 'Updated!' : 'Created!');
    } catch (e: any) { showToast(e.message); }
  };
  const del = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try { await apiCall('DELETE', `/categories/${id}`); await fetchCats(); showToast('Deleted.'); }
    catch (e: any) { showToast(e.message); }
  };

  const filtered = cats.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || (c.desc||'').toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = (checked: boolean) => setSelected(checked ? new Set(paginated.map(c => c._id)) : new Set());
  const allChecked = paginated.length > 0 && paginated.every(c => selected.has(c._id));
  const someChecked = paginated.some(c => selected.has(c._id)) && !allChecked;

  const bulkSetStatus = async (status: string) => {
    for (const id of Array.from(selected)) { try { await apiCall('PATCH', `/categories/${id}`, { status }); } catch {} }
    await fetchCats(); setSelected(new Set()); showToast(`Updated ${selected.size} categor${selected.size===1?'y':'ies'}`);
  };
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} categor${selected.size===1?'y':'ies'}?`)) return;
    for (const id of Array.from(selected)) { try { await apiCall('DELETE', `/categories/${id}`); } catch {} }
    await fetchCats(); setSelected(new Set()); showToast('Deleted.');
  };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Task Categories</h2><p>Manage categories used for employee task submissions</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={() => openModal()}><i className="ti ti-plus" /> Add Category</button></div>
      </div>
      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search"><span className="p-search-icon"><i className="ti ti-search" /></span><input type="text" placeholder="Search categories…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        </div>

        <BulkBar count={selected.size} visible={selected.size > 0}
          actions={[
            { label:'Set active',   icon:'ti-check', onClick:() => bulkSetStatus('active') },
            { label:'Set inactive', icon:'ti-minus', onClick:() => bulkSetStatus('inactive') },
            { label:'Delete',       icon:'ti-trash', onClick:bulkDelete, danger:true },
          ]}
          onClear={() => setSelected(new Set())}
        />

        {loading ? <div style={{ padding:'3rem', textAlign:'center', color:'var(--p-text-secondary)' }}>Loading…</div> : (
        <table className="p-table" style={{ tableLayout:'auto', width:'100%' }}>
          <thead><tr>
            <th className="cb-col"><input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked; }} onChange={e => selectAll(e.target.checked)} style={{ cursor:'pointer' }} /></th>
            <th style={{ textAlign:'left', minWidth:180 }}>Category Name</th>
            <th style={{ textAlign:'left', minWidth:200 }}>Description</th>
            <th style={{ textAlign:'left', minWidth:100 }}>Status</th>
            <th style={{ textAlign:'right', minWidth:80 }}>Actions</th>
          </tr></thead>
          <tbody>
            {paginated.length === 0 && <tr><td colSpan={5} style={{ textAlign:'center', padding:'var(--p-space-800)', color:'var(--p-text-secondary)' }}>No categories found.</td></tr>}
            {paginated.map(c => (
              <tr key={c._id} style={{ background: selected.has(c._id) ? '#f0f7ff' : undefined }}>
                <td className="cb-col"><input type="checkbox" checked={selected.has(c._id)} onChange={() => toggleSelect(c._id)} style={{ cursor:'pointer' }} /></td>
                <td style={{ fontWeight:'var(--p-font-weight-medium)', minWidth:180 }}>{c.name}</td>
                <td style={{ color:'var(--p-text-secondary)', minWidth:200 }}>{c.desc || '—'}</td>
                <td style={{ minWidth:100 }}><span className={`badge ${c.status==='active'?'badge-paid':'badge-high'}`}>{c.status}</span></td>
                <td style={{ minWidth:80, textAlign:'right' }}>
                  <div className="row-acts" style={{ opacity:1, justifyContent:'flex-end' }}>
                    <button className="ia-btn" onClick={() => openModal(c)} title="Edit"><i className="ti ti-pencil" /></button>
                    <button className="ia-btn del" onClick={() => del(c._id)} title="Delete"><i className="ti ti-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>)}
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{filtered.length} categor{filtered.length!==1?'ies':'y'}{selected.size>0?` · ${selected.size} selected`:''}</div>
      </div>

      {modal && (
        <div className="p-modal-bg open" onClick={() => setModal(false)}>
          <div className="p-modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd"><h3>{editId ? 'Edit category' : 'Add category'}</h3><button className="p-modal-x" onClick={() => setModal(false)}><i className="ti ti-x" /></button></div>
            <div className="p-modal-body">
              <div className="p-field"><label className="p-label">Name *</label><input className="p-input" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} placeholder="e.g. Graphic Design" autoFocus /></div>
              <div className="p-field"><label className="p-label">Description</label><input className="p-input" value={form.desc} onChange={e => setForm(f => ({...f,desc:e.target.value}))} placeholder="Brief description" /></div>
              <div className="p-field"><label className="p-label">Status</label>
                <select className="p-input" value={form.status} onChange={e => setForm(f => ({...f,status:e.target.value}))}><option value="active">Active</option><option value="inactive">Inactive</option></select>
              </div>
            </div>
            <div className="p-modal-ft"><button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn-primary" onClick={save}><i className="ti ti-device-floppy" /> {editId ? 'Save changes' : 'Add category'}</button></div>
          </div>
        </div>
      )}
      {toast && <div className="toast" style={{ display:'flex' }}>{toast}</div>}
    </div>
  );
}
