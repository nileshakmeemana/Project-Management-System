'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import { useData } from '@/hooks/useData';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';
import TableSkeleton from '@/components/TableSkeleton';
import { fmtAmt, fmtDate, usePrefs } from '@/lib/prefs';

const PAGE_SIZE = 30;

export default function ClientsPage() {
  usePrefs(); // re-render on currency / date-format changes
  const { data: clientsData, loading, refresh: refreshClients } = useData('/clients');
  const clients = clientsData?.clients || [];
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page,     setPage]     = useState(1);
  const [modal,    setModal]    = useState(false);
  const [editId,   setEditId]   = useState<string|null>(null);
  const [form,     setForm]     = useState({ name:'', email:'', contact:'', currency:'LKR', status:'active' });
  const [toast,    setToast]    = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  const fetchClients = refreshClients;

  const openModal = (c?: any) => {
    setEditId(c?._id || null);
    setForm(c ? { name:c.name, email:c.email||'', contact:c.contact||'', currency:c.currency||'LKR', status:c.status||'active' } : { name:'', email:'', contact:'', currency:'LKR', status:'active' });
    setModal(true);
  };
  const saveClient = async () => {
    try {
      if (editId) await apiCall('PATCH', `/clients/${editId}`, form);
      else await apiCall('POST', '/clients', form);
      setModal(false); await fetchClients(); showToast(editId ? 'Client updated!' : 'Client added!');
    } catch (e: any) { showToast(e.message); }
  };
  const deleteClient = async (id: string) => {
    if (!confirm('Delete this client?')) return;
    try { await apiCall('DELETE', `/clients/${id}`); await fetchClients(); showToast('Deleted.'); }
    catch (e: any) { showToast(e.message); }
  };

  const filtered = clients.filter(c => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) && !c.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter && c.status !== filter) return false;
    return true;
  });
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  // Bulk select
  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = (checked: boolean) => setSelected(checked ? new Set(paginated.map(c => c._id)) : new Set());
  const allChecked = paginated.length > 0 && paginated.every(c => selected.has(c._id));
  const someChecked = paginated.some(c => selected.has(c._id)) && !allChecked;

  const bulkSetStatus = async (status: string) => {
    for (const id of selected) { try { await apiCall('PATCH', `/clients/${id}`, { status }); } catch {} }
    await fetchClients(); setSelected(new Set()); showToast(`${selected.size} client(s) set to ${status}`);
  };
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} client(s)?`)) return;
    for (const id of selected) { try { await apiCall('DELETE', `/clients/${id}`); } catch {} }
    await fetchClients(); setSelected(new Set()); showToast('Deleted.');
  };

  const stats = { total: clients.length, active: clients.filter(c => c.status === 'active').length, inactive: clients.filter(c => c.status === 'inactive').length };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Clients</h2><p>Manage your client relationships</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={() => openModal()}><i className="ti ti-plus" /> Add client</button></div>
      </div>
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-users" /> <span className="sec-t">Total clients</span></div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check" /> <span className="sec-t">Active</span></div><div className="stat-value up">{stats.active}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-currency-dollar" /> <span className="sec-t">Total billed</span></div><div className="stat-value">{fmtAmt(clients.reduce((s: number, cl: any) => s + (cl.totalBilled || 0), 0))}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-x" /> <span className="sec-t">Inactive</span></div><div className="stat-value">{stats.inactive}</div></div>
      </div>
      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search"><span className="p-search-icon"><i className="ti ti-search" /></span><input type="text" placeholder="Search clients…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
          <div className="p-toolbar-end">
            <select className="btn-secondary" style={{ height:'2rem', fontSize:'var(--p-font-size-325)', padding:'0 var(--p-space-300)', cursor:'pointer', boxShadow:'var(--p-shadow-button)' }} value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
              <option value="">All status</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <BulkBar count={selected.size} visible={selected.size > 0}
          actions={[
            { label: 'Set active',   icon: 'ti-check', onClick: () => bulkSetStatus('active') },
            { label: 'Set inactive', icon: 'ti-minus', onClick: () => bulkSetStatus('inactive') },
            { label: 'Delete',       icon: 'ti-trash', onClick: bulkDelete, danger: true },
          ]}
          onClear={() => setSelected(new Set())}
        />

        {loading ? <TableSkeleton rows={6} cols={5} /> : (
        <table className="p-table">
          <thead><tr>
            <th className="cb-col"><input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked; }} onChange={e => selectAll(e.target.checked)} style={{ cursor:'pointer' }} /></th>
            <th style={{ textAlign:'left', minWidth:140 }}>Client</th>
            <th style={{ textAlign:'left', minWidth:180 }}>Email</th>
            <th style={{ textAlign:'left', minWidth:120 }}>Contact</th>
            <th style={{ textAlign:'left', minWidth:80 }}>Currency</th>
            <th style={{ textAlign:'left', minWidth:90 }}>Status</th>
            <th style={{ textAlign:'left', minWidth:80 }}>Actions</th>
          </tr></thead>
          <tbody>
            {paginated.length === 0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:'var(--p-space-800)', color:'var(--p-text-secondary)' }}>No clients found.</td></tr>}
            {paginated.map(c => (
              <tr key={c._id} style={{ background: selected.has(c._id) ? '#f0f7ff' : undefined }}>
                <td className="cb-col"><input type="checkbox" checked={selected.has(c._id)} onChange={() => toggleSelect(c._id)} style={{ cursor:'pointer' }} /></td>
                <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{c.name}</td>
                <td className="td-muted">{c.email || '—'}</td>
                <td className="td-muted">{c.contact || '—'}</td>
                <td className="td-muted">{c.currency}</td>
                <td><span className={`badge ${c.status === 'active' ? 'badge-paid' : 'badge-high'}`}>{c.status}</span></td>
                <td>
                  <div className="row-acts" style={{ opacity:1 }}>
                    <button className="ia-btn" onClick={() => openModal(c)} title="Edit"><i className="ti ti-pencil" /></button>
                    <button className="ia-btn del" onClick={() => deleteClient(c._id)} title="Delete"><i className="ti ti-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>)}
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{paginated.length} client{filtered.length !== 1 ? 's' : ''}{selected.size > 0 ? ` · ${selected.size} selected` : ''}</div>
        </div>

      {modal && (
        <div className="p-modal-bg open" onClick={() => setModal(false)}>
          <div className="p-modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd"><h3>{editId ? 'Edit client' : 'Add client'}</h3><button className="p-modal-x" onClick={() => setModal(false)}><i className="ti ti-x" /></button></div>
            <div className="p-modal-body">
              <div className="p-field"><label className="p-label">Client Name *</label><input className="p-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Nail Toolz" autoFocus /></div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Email</label><input className="p-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@client.com" /></div>
                <div className="p-field"><label className="p-label">Contact Person</label><input className="p-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Contact name" /></div>
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Currency</label>
                  <select className="p-input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}><option>LKR</option><option>AUD</option><option>USD</option></select>
                </div>
                <div className="p-field"><label className="p-label">Status</label>
                  <select className="p-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select>
                </div>
              </div>
            </div>
            <div className="p-modal-ft"><button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn-primary" onClick={saveClient}><i className="ti ti-device-floppy" /> {editId ? 'Save changes' : 'Add client'}</button></div>
          </div>
        </div>
      )}
      {toast && <div className="toast" style={{ display:'flex' }}>{toast}</div>}
    </div>
  );
}
