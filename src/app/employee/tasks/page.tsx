'use client';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';

const fmtAmt = (v: number, c = 'LKR') => {
  try { return new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(v||0); }
  catch { return `${c} ${(v||0).toLocaleString()}`; }
};
const BADGE: Record<string,string> = {
  'Pending Review':'badge-pending','Approved':'badge-paid','Paid':'badge-paid',
  'Rejected':'badge-high','Changes Requested':'badge-med',
};
const CLIENTS = ['Second Page','Nail Toolz','Dental On Demand','ANVAYA Wellness','Amaree Collective','Port Stephens'];
const CATS    = ['Graphic Design','Social Media Content','Reel Editing','Website Update','SEO Setup','Admin Work','Content Writing','Product Upload','Email Marketing','Custom Task'];

export default function MyTasksPage() {
  const router = useRouter();
  const [tasks, setTasks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [search, setSearch]   = useState('');
  const [detail, setDetail]   = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [toast, setToast]     = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400); };
  const canEdit = (t: any) => ['Pending Review','Changes Requested'].includes(t.status);

  const fetchTasks = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    const d = await apiCall('GET', `/tasks?${params}`);
    setTasks(d.tasks || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [filter]);

  const saveEdit = async () => {
    try {
      await apiCall('PATCH', `/tasks/${editing._id}`, {
        title: editing.title, clientName: editing.clientName, category: editing.category,
        hours: +editing.hours, requestedAmount: +editing.requestedAmount,
        currency: editing.currency, description: editing.description, workLink: editing.workLink,
        dateCompleted: editing.dateCompleted,
      });
      setEditing(null); await fetchTasks(); showToast('Task updated!');
    } catch (err: any) { showToast(err.message); }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Archive this task?')) return;
    try { await apiCall('DELETE', `/tasks/${id}`); await fetchTasks(); showToast('Task archived.'); }
    catch (err: any) { showToast(err.message); }
  };

  const filtered = tasks.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.title?.toLowerCase().includes(q) || t.clientName?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
  });

  return (
    <div className="page-content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>My Tasks</h2><p>All submitted work — editable before approval or payment</p></div>
        <div className="page-hero-right">
          <button className="btn-primary" onClick={() => router.push('/employee/submit')}><i className="ti ti-plus" /> Add Task</button>
        </div>
      </div>

      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search">
            <span className="p-search-icon"><i className="ti ti-search" /></span>
            <input type="text" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="p-toolbar-end">
            <select className="btn-secondary" style={{ height:'2rem', fontSize:'var(--p-font-size-325)', padding:'0 var(--p-space-300)', cursor:'pointer', boxShadow:'var(--p-shadow-button)' }}
              value={filter} onChange={e => setFilter(e.target.value)} id="mt-filter">
              <option value="">All Status</option>
              {['Pending Review','Approved','Changes Requested','Rejected','Paid'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? <div style={{ padding:'3rem', textAlign:'center', color:'var(--p-text-secondary)' }}>Loading…</div> : (
          <table className="p-table">
            <thead>
              <tr>
                <th style={{textAlign:"left",minWidth:180}}>Task</th>
                <th style={{textAlign:"left",minWidth:120}}>Client</th>
                <th style={{textAlign:"left",minWidth:140}}>Category</th>
                <th className="td-num" style={{minWidth:60}}>Hours</th>
                <th className="td-num" style={{minWidth:110}}>Requested</th>
                <th className="td-num" style={{minWidth:110}}>Approved</th>
                <th style={{textAlign:"left",minWidth:90}}>Date</th>
                <th style={{textAlign:"left",minWidth:120}}>Status</th>
                <th style={{textAlign:"left",minWidth:100}}>Actions</th>
              </tr>
            </thead>
            <tbody id="mt-tbody">
              {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign:'center', padding:'var(--p-space-800)', color:'var(--p-text-secondary)' }}>No tasks found.</td></tr>}
              {filtered.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{t.title}</td>
                  <td className="td-muted">{t.clientName||'—'}</td>
                  <td>{t.category?<span className="badge badge-draft">{t.category}</span>:'—'}</td>
                  <td className="td-num td-muted">{t.hours}</td>
                  <td className="td-num td-muted">{fmtAmt(t.requestedAmount,t.currency)}</td>
                  <td className="td-num td-muted">{t.approvedAmount?fmtAmt(t.approvedAmount,t.currency):'—'}</td>
                  <td className="td-muted">{t.dateCompleted?new Date(t.dateCompleted).toLocaleDateString():'—'}</td>
                  <td><span className={`badge ${BADGE[t.status]||'badge-draft'}`}>{t.status}</span></td>
                  <td>
                    <div className="row-acts" style={{ opacity:1 }}>
                      <button className="ia-btn" onClick={() => setDetail(t)} title="View"><i className="ti ti-eye" /></button>
                      {canEdit(t) ? <>
                        <button className="ia-btn" onClick={() => setEditing({...t})} title="Edit"><i className="ti ti-pencil" /></button>
                        <button className="ia-btn del" onClick={() => deleteTask(t._id)} title="Delete"><i className="ti ti-trash" /></button>
                      </> : <span style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-disabled)', padding:'0 4px' }}>Locked</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="p-table-footer" id="mt-footer">{filtered.length} task{filtered.length!==1?'s':''}</div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="p-modal-bg open" onClick={() => setDetail(null)}>
          <div className="p-modal" style={{ maxWidth:580 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd"><h3>{detail.title}</h3><button className="p-modal-x" onClick={() => setDetail(null)}><i className="ti ti-x" /></button></div>
            <div className="p-modal-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--p-space-400)' }}>
                <div>
                  <div className="p-label" style={{ marginBottom:'var(--p-space-200)' }}>Task Details</div>
                  <p style={{ fontSize:'var(--p-font-size-325)', lineHeight:1.8, color:'var(--p-text-secondary)' }}>
                    <b style={{ color:'var(--p-text)' }}>Client:</b> {detail.clientName}<br/>
                    <b style={{ color:'var(--p-text)' }}>Category:</b> {detail.category||'—'}<br/>
                    <b style={{ color:'var(--p-text)' }}>Date:</b> {detail.dateCompleted?new Date(detail.dateCompleted).toLocaleDateString():'—'}<br/>
                    <b style={{ color:'var(--p-text)' }}>Hours:</b> {detail.hours}<br/>
                    <b style={{ color:'var(--p-text)' }}>Requested:</b> {fmtAmt(detail.requestedAmount,detail.currency)}<br/>
                    <b style={{ color:'var(--p-text)' }}>Approved:</b> {detail.approvedAmount?fmtAmt(detail.approvedAmount,detail.currency):'—'}
                  </p>
                </div>
                <div>
                  <div className="p-label" style={{ marginBottom:'var(--p-space-200)' }}>Status</div>
                  <span className={`badge ${BADGE[detail.status]||'badge-draft'}`} style={{ fontSize:'var(--p-font-size-325)', padding:'4px 10px' }}>{detail.status}</span>
                  {detail.adminNote && <div style={{ marginTop:'var(--p-space-300)' }}><div className="p-label" style={{ marginBottom:4 }}>Admin Note</div><p style={{ fontSize:'var(--p-font-size-325)', color:'var(--p-text-secondary)' }}>{detail.adminNote}</p></div>}
                </div>
              </div>
              {detail.description && <div><div className="p-label" style={{ marginBottom:'var(--p-space-200)' }}>Description</div><p style={{ fontSize:'var(--p-font-size-325)', color:'var(--p-text-secondary)' }}>{detail.description}</p></div>}
              {detail.workLink && <div><div className="p-label" style={{ marginBottom:'var(--p-space-200)' }}>Work Link</div><a href={detail.workLink} target="_blank" style={{ color:'var(--p-text-link)', fontSize:'var(--p-font-size-325)' }}>{detail.workLink}</a></div>}
            </div>
            <div className="p-modal-ft">
              <button className="btn-secondary" onClick={() => setDetail(null)}>Close</button>
              {canEdit(detail) && <button className="btn-secondary" onClick={() => { setEditing({...detail}); setDetail(null); }}><i className="ti ti-pencil" /> Edit</button>}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="p-modal-bg open" onClick={() => setEditing(null)}>
          <div className="p-modal" style={{ maxWidth:580 }} onClick={e => e.stopPropagation()}>
            <div className="p-modal-hd"><h3>Edit Task</h3><button className="p-modal-x" onClick={() => setEditing(null)}><i className="ti ti-x" /></button></div>
            <div className="p-modal-body">
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Task Title</label><input className="p-input" value={editing.title} onChange={e=>setEditing((v:any)=>({...v,title:e.target.value}))}/></div>
                <div className="p-field"><label className="p-label">Client</label>
                  <select className="p-input" value={editing.clientName} onChange={e=>setEditing((v:any)=>({...v,clientName:e.target.value}))}>
                    {CLIENTS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Category</label>
                  <select className="p-input" value={editing.category} onChange={e=>setEditing((v:any)=>({...v,category:e.target.value}))}>
                    <option value="">—</option>{CATS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="p-field"><label className="p-label">Date Completed</label><input type="date" className="p-input" value={editing.dateCompleted?.slice(0,10)||''} onChange={e=>setEditing((v:any)=>({...v,dateCompleted:e.target.value}))}/></div>
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Hours</label><input type="number" step="0.25" className="p-input" value={editing.hours} onChange={e=>setEditing((v:any)=>({...v,hours:+e.target.value}))}/></div>
                <div className="p-field"><label className="p-label">Requested Amount</label><input type="number" className="p-input" value={editing.requestedAmount} onChange={e=>setEditing((v:any)=>({...v,requestedAmount:+e.target.value}))}/></div>
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Currency</label>
                  <select className="p-input" value={editing.currency} onChange={e=>setEditing((v:any)=>({...v,currency:e.target.value}))}>
                    <option>LKR</option><option>AUD</option><option>USD</option>
                  </select>
                </div>
                <div className="p-field"><label className="p-label">Work Link</label><input type="url" className="p-input" value={editing.workLink||''} onChange={e=>setEditing((v:any)=>({...v,workLink:e.target.value}))}/></div>
              </div>
              <div className="p-field"><label className="p-label">Description</label><textarea className="p-input" rows={3} value={editing.description||''} onChange={e=>setEditing((v:any)=>({...v,description:e.target.value}))}/></div>
            </div>
            <div className="p-modal-ft">
              <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit}><i className="ti ti-device-floppy" /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast" style={{ display:'flex' }}>{toast}</div>}
    </div>
  );
}
