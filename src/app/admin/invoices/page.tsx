'use client';
import { useEffect, useState } from 'react';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';
import TableSkeleton from '@/components/TableSkeleton';
import { apiCall } from '@/lib/api';
import { fmtAmt, fmtDate, usePrefs, toBase, fmtBase } from '@/lib/prefs';
import { downloadInvoicePDF, getPdfBiz, BizDetails } from '@/lib/pdf';
import { InvoicePreview } from '@/components/DocPreviews';
import { NotifStore } from '@/lib/notifications';

const STATUS_BADGE: Record<string,string> = { paid:'badge-paid', sent:'badge-pending', draft:'badge-draft', overdue:'badge-high' };
const PAGE_SIZE = 30;
const EMPTY = { project:'', clientName:'', description:'', amount:0, currency:'LKR', status:'draft', dueDate:'', addons:[] as {description:string;amount:number}[] };

export default function InvoicesPage() {
  usePrefs();
  const [invoices,  setInvoices]  = useState<any[]>([]);
  const [projects,  setProjects]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('');
  const [period,    setPeriod]    = useState<DateRange>({ preset:'all', label:'All time' });
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [page,      setPage]      = useState(1);
  const [modal,     setModal]     = useState(false);
  const [editId,    setEditId]    = useState<string|null>(null);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState('');
  const [form,      setForm]      = useState({ ...EMPTY });
  const [previewInv,setPreviewInv]= useState<any>(null);
  const [biz,       setBiz]       = useState<BizDetails>({ name:'Designer Craft' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),2400); };

  const [clients, setClients] = useState<any[]>([]);
  const fetchAll = async () => {
    try {
      const [i, p, c] = await Promise.all([
        apiCall('GET','/invoices'), apiCall('GET','/projects'),
        apiCall('GET','/clients').catch(()=>({clients:[]})),
      ]);
      setInvoices(i.invoices || []); setProjects(p.projects || []); setClients(c.clients || []);
    } catch (e: any) { showToast(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); getPdfBiz(apiCall).then(setBiz); }, []);

  const inPeriod = (inv: any) => {
    if (!period.start) return true;
    const d = new Date(inv.date);
    return d >= period.start && (!period.end || d <= period.end);
  };

  const filtered = invoices.filter(inv => {
    if (!inPeriod(inv)) return false;
    const q = search.toLowerCase();
    if (q && !(inv.clientName||'').toLowerCase().includes(q) && !(inv.number||'').toLowerCase().includes(q) && !(inv.projectName||'').toLowerCase().includes(q)) return false;
    if (filter && inv.status !== filter) return false;
    return true;
  });
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  // Sums convert each invoice from its own currency into the preferred currency
  const sumStatus = (st: string) => invoices.filter(i=>inPeriod(i)&&i.status===st).reduce((s,i)=>s+toBase(i.total||i.amount||0, i.currency),0);
  const stats = { paid: sumStatus('paid'), sent: sumStatus('sent'), overdue: sumStatus('overdue'), draft: sumStatus('draft') };

  // Selection / bulk delete
  const toggleSelect = (id: string) => setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const selectAll = (checked: boolean) => setSelected(checked ? new Set(paginated.map(i=>i._id)) : new Set());
  const allChecked  = paginated.length>0 && paginated.every(i=>selected.has(i._id));
  const someChecked = paginated.some(i=>selected.has(i._id)) && !allChecked;
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} invoice(s)?`)) return;
    for (const id of Array.from(selected)) { try { await apiCall('DELETE', `/invoices/${id}`); } catch {} }
    setSelected(new Set()); await fetchAll(); showToast('Deleted');
  };

  const openModal = (inv?: any) => {
    setEditId(inv?._id || null);
    setForm(inv ? {
      project: inv.project?._id || inv.project || '', clientName: inv.clientName||'', description: inv.description||'',
      amount: inv.amount||0, currency: inv.currency||'LKR', status: inv.status||'draft',
      dueDate: inv.dueDate?.slice(0,10)||'', addons: (inv.addons||[]).map((a:any)=>({description:a.description||'', amount:a.amount||0})),
    } : { ...EMPTY, addons: [] });
    setModal(true);
  };

  // Selecting a project prefills client + amount from the project value
  const pickProject = (id: string) => {
    const p = projects.find((x: any) => x._id === id);
    const cl = clients.find((x: any) => x.name === p?.clientName);
    setForm(f => ({ ...f, project: id,
      clientName: p?.clientName || f.clientName,
      amount: p?.value ?? f.amount,
      // Invoices are issued in the CLIENT's preferred currency (fallback: project currency)
      currency: cl?.currency || p?.currency || f.currency,
      description: f.description || (p ? `${p.name} — project delivery` : f.description),
    }));
  };

  const pickClient = (name: string) => {
    const cl = clients.find((x: any) => x.name === name);
    setForm(f => ({ ...f, clientName: name, currency: cl?.currency || f.currency }));
  };

  const total = (Number(form.amount)||0) + form.addons.reduce((s,a)=>s+(Number(a.amount)||0),0);

  const save = async () => {
    if (!form.clientName && !form.project) { showToast('Pick a project or enter a client'); return; }
    setSaving(true);
    try {
      if (editId) await apiCall('PATCH', `/invoices/${editId}`, form);
      else {
        await apiCall('POST', '/invoices', form);
        NotifStore.add('ti-file-invoice', `Invoice created for ${form.clientName || 'client'}`, 'Admin');
      }
      setModal(false); await fetchAll(); showToast(editId ? 'Invoice updated' : 'Invoice created');
    } catch (e: any) { showToast(e.message); }
    finally { setSaving(false); }
  };

  const setStatus = async (inv: any, status: string) => {
    try {
      await apiCall('PATCH', `/invoices/${inv._id}`, { status });
      if (status === 'paid') NotifStore.add('ti-cash', `Invoice ${inv.number} marked paid`, 'Admin');
      await fetchAll(); showToast(`Invoice ${status === 'paid' ? 'marked paid' : `set to ${status}`}`);
    } catch (e: any) { showToast(e.message); }
  };

  const download = async (inv: any) => {
    showToast('Preparing PDF…');
    await downloadInvoicePDF(inv, biz);
  };

  const completedProjects = projects.filter((p: any) => p.status === 'completed');

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Invoices</h2><p>Invoice completed projects and track client payments</p></div>
        <div className="page-hero-right">
          <PeriodFilter id="invoices" onChange={p => { setPeriod(p); setPage(1); }} />
          <button className="btn-primary" onClick={() => openModal()}><i className="ti ti-plus" /> New invoice</button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check" /> <span className="sec-t">Paid</span></div><div className="stat-value up">{fmtBase(stats.paid)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-send" /> <span className="sec-t">Awaiting payment</span></div><div className="stat-value">{fmtBase(stats.sent)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-alert-triangle" /> <span className="sec-t">Overdue</span></div><div className="stat-value">{fmtBase(stats.overdue)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-file" /> <span className="sec-t">Draft</span></div><div className="stat-value">{fmtBase(stats.draft)}</div></div>
      </div>

      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search">
            <span className="p-search-icon"><i className="ti ti-search" /></span>
            <input type="text" placeholder="Search invoices…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="p-toolbar-end">
            <select className="btn-secondary" style={{ height:'2rem', padding:'0 var(--p-space-300)', fontSize:'var(--p-font-size-325)', cursor:'pointer', boxShadow:'var(--p-shadow-button)' }} value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
              <option value="">All status</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <BulkBar count={selected.size} visible={selected.size > 0}
          actions={[{ label:'Delete', icon:'ti-trash', onClick: bulkDelete, danger: true }]}
          onClear={() => setSelected(new Set())} />

        {loading ? <TableSkeleton rows={6} cols={7} /> : (
        <table className="p-table">
          <thead><tr>
            <th style={{textAlign:'left',width:40,padding:'0 var(--p-space-300)'}}><input type="checkbox" checked={allChecked} ref={el=>{if(el)el.indeterminate=someChecked;}} onChange={e=>selectAll(e.target.checked)} style={{cursor:'pointer'}}/></th>
            <th style={{textAlign:'left'}}>Invoice</th><th style={{textAlign:'left'}}>Project</th><th style={{textAlign:'left'}}>Client</th>
            <th className="td-num">Total</th><th style={{textAlign:'left'}}>Date</th><th style={{textAlign:'left'}}>Due</th><th style={{textAlign:'left'}}>Status</th><th style={{textAlign:'left',width:200}}></th>
          </tr></thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={9} style={{textAlign:'center',padding:'var(--p-space-800)',color:'var(--p-text-secondary)'}}>No invoices yet. Complete a project, then create its invoice here.</td></tr>}
            {paginated.map(inv => (
              <tr key={inv._id} style={{ background: selected.has(inv._id) ? 'var(--p-surface-selected,#f5f5f5)' : undefined }}>
                <td style={{width:40,padding:'0 var(--p-space-300)'}}><input type="checkbox" checked={selected.has(inv._id)} onChange={()=>toggleSelect(inv._id)} style={{cursor:'pointer'}}/></td>
                <td style={{fontWeight:'var(--p-font-weight-medium)'}}>{inv.number}</td>
                <td className="td-muted">{inv.projectName||'—'}</td>
                <td className="td-muted">{inv.clientName||'—'}</td>
                <td className="td-num" style={{fontWeight:600}}>{fmtAmt(inv.total ?? inv.amount, inv.currency)}</td>
                <td className="td-muted">{fmtDate(inv.date)}</td>
                <td className="td-muted">{inv.dueDate?fmtDate(inv.dueDate):'—'}</td>
                <td><span className={`badge ${STATUS_BADGE[inv.status]||'badge-draft'}`}>{inv.status}</span></td>
                <td>
                  <div className="row-acts" style={{opacity:1,display:'flex',gap:'var(--p-space-100)'}}>
                    <button className="ia-btn" onClick={()=>setPreviewInv(inv)} title="Preview invoice"><i className="ti ti-eye"/></button>
                    <button className="btn-secondary" style={{height:'1.75rem',fontSize:'var(--p-font-size-275)'}} onClick={()=>download(inv)} title="Download PDF"><i className="ti ti-download"/> PDF</button>
                    <button className="ia-btn" onClick={()=>openModal(inv)} title="Edit"><i className="ti ti-pencil"/></button>
                    {inv.status!=='paid' && <button className="btn-secondary" style={{height:'1.75rem',fontSize:'var(--p-font-size-275)',color:'var(--p-text-success-secondary,#047b5d)'}} onClick={()=>setStatus(inv,'paid')} title="Client approved — mark paid"><i className="ti ti-check"/> Mark paid</button>}
                    {inv.status==='draft' && <button className="ia-btn" onClick={()=>setStatus(inv,'sent')} title="Mark sent"><i className="ti ti-send"/></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>)}
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{paginated.length} invoice{filtered.length!==1?'s':''}{selected.size>0&&` · ${selected.size} selected`}</div>
      </div>

      {/* Create / edit invoice */}
      {modal && (
        <div className="p-modal-bg open" onClick={()=>setModal(false)}>
          <div className="p-modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
            <div className="p-modal-hd"><h3>{editId?'Edit invoice':'New invoice'}</h3><button className="p-modal-x" onClick={()=>setModal(false)}><i className="ti ti-x"/></button></div>
            <div className="p-modal-body">
              <div className="p-field">
                <label className="p-label">Project <span style={{color:'var(--p-text-secondary)',fontWeight:400}}>(completed projects — prefills value & client)</span></label>
                <select className="p-input" value={form.project} onChange={e=>pickProject(e.target.value)}>
                  <option value="">— No project / manual invoice —</option>
                  {completedProjects.map((p:any)=><option key={p._id} value={p._id}>{p.name} — {p.clientName||'no client'}</option>)}
                </select>
                {completedProjects.length===0 && <span style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)'}}>No completed projects yet. Mark a project completed (all its tasks must be approved first).</span>}
              </div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Client <span style={{color:'var(--p-text-secondary)',fontWeight:400}}>(sets the invoice currency)</span></label>
                  <select className="p-input" value={form.clientName} onChange={e=>pickClient(e.target.value)}>
                    <option value="">Select client…</option>
                    {form.clientName && !clients.some((c:any)=>c.name===form.clientName) && <option>{form.clientName}</option>}
                    {clients.map((c: any) => <option key={c._id} value={c.name}>{c.name} ({c.currency||'LKR'})</option>)}
                  </select>
                </div>
                <div className="p-field"><label className="p-label">Due date</label><input className="p-input" type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/></div>
              </div>
              <div className="p-field"><label className="p-label">Description</label><input className="p-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. Website redesign — project delivery"/></div>
              <div className="p-grid2">
                <div className="p-field"><label className="p-label">Project amount</label><input className="p-input" type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:+e.target.value}))}/></div>
                <div className="p-field"><label className="p-label">Currency</label>
                  <select className="p-input" value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}><option>LKR</option><option>AUD</option><option>USD</option></select>
                </div>
              </div>

              {/* Add-on line items */}
              <div className="p-field">
                <label className="p-label">Add-ons <span style={{color:'var(--p-text-secondary)',fontWeight:400}}>(extra descriptions with prices)</span></label>
                {form.addons.map((a,i)=>(
                  <div key={i} style={{display:'flex',gap:'var(--p-space-200)',marginBottom:'var(--p-space-200)'}}>
                    <input className="p-input" style={{flex:2}} placeholder="Add-on description" value={a.description} onChange={e=>setForm(f=>({...f,addons:f.addons.map((x,j)=>j===i?{...x,description:e.target.value}:x)}))}/>
                    <input className="p-input" style={{flex:1}} type="number" placeholder="Price" value={a.amount} onChange={e=>setForm(f=>({...f,addons:f.addons.map((x,j)=>j===i?{...x,amount:+e.target.value}:x)}))}/>
                    <button className="ia-btn del" onClick={()=>setForm(f=>({...f,addons:f.addons.filter((_,j)=>j!==i)}))}><i className="ti ti-trash"/></button>
                  </div>
                ))}
                <button className="btn-secondary" style={{alignSelf:'flex-start',height:'1.75rem',fontSize:'var(--p-font-size-275)'}} onClick={()=>setForm(f=>({...f,addons:[...f.addons,{description:'',amount:0}]}))}><i className="ti ti-plus"/> Add line item</button>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'var(--p-space-300)',background:'var(--p-surface-secondary)',borderRadius:'var(--p-border-radius-200)'}}>
                <span style={{fontWeight:'var(--p-font-weight-semibold)'}}>Invoice total</span>
                <span style={{fontWeight:700,fontSize:'var(--p-font-size-400)'}}>{form.currency} {total.toLocaleString()}</span>
              </div>
              <div className="p-field"><label className="p-label">Status</label>
                <select className="p-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid (client approved)</option><option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
            <div className="p-modal-ft">
              <button className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving}><i className="ti ti-device-floppy"/> {saving?'Saving…':editId?'Save changes':'Create invoice'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Invoice preview — matches the payslip preview template style */}
      {previewInv && (
        <div className="p-modal-bg open" onClick={()=>setPreviewInv(null)}>
          <div className="p-modal" style={{maxWidth:720}} onClick={e=>e.stopPropagation()}>
            <div className="p-modal-hd">
              <h3>Invoice preview — {previewInv.number}</h3>
              <button className="p-modal-x" onClick={()=>setPreviewInv(null)}><i className="ti ti-x"/></button>
            </div>
            <div className="p-modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
              <InvoicePreview invoice={previewInv} biz={biz} />
            </div>
            <div className="p-modal-ft">
              <button className="btn-secondary" onClick={()=>setPreviewInv(null)}>Close</button>
              <button className="btn-primary" onClick={()=>download(previewInv)}><i className="ti ti-download"/> Download PDF</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
