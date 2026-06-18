'use client';
import { useEffect, useState } from 'react';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';

const fmtAmt = (v: number, c = 'LKR') => { try { return new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(v||0); } catch { return `${c} ${(v||0).toLocaleString()}`; }};

const STATUS_BADGE: Record<string,string> = { paid:'badge-paid', sent:'badge-pending', draft:'badge-draft', overdue:'badge-high' };

interface Invoice {
  _id: string; number: string; client: string; description: string;
  amount: number; currency: string; status: 'paid'|'sent'|'draft'|'overdue';
  date: string; dueDate: string;
}

// Seed some demo invoices if none exist
const DEMO: Invoice[] = [
  { _id:'1', number:'INV-001', client:'Second Page',      description:'Social media content package', amount:36000, currency:'LKR', status:'paid',    date:'2026-06-01', dueDate:'2026-06-15' },
  { _id:'2', number:'INV-002', client:'Nail Toolz',        description:'Website banner refresh',       amount:18500, currency:'LKR', status:'paid',    date:'2026-06-03', dueDate:'2026-06-17' },
  { _id:'3', number:'INV-003', client:'Port Stephens',     description:'Email campaign',               amount:16000, currency:'LKR', status:'sent',    date:'2026-06-10', dueDate:'2026-06-24' },
  { _id:'4', number:'INV-004', client:'Amaree Collective', description:'Graphic design batch',         amount:14000, currency:'LKR', status:'sent',    date:'2026-06-12', dueDate:'2026-06-26' },
  { _id:'5', number:'INV-005', client:'Dental On Demand',  description:'SEO setup and blog posts',     amount:9000,  currency:'LKR', status:'overdue', date:'2026-05-20', dueDate:'2026-06-03' },
  { _id:'6', number:'INV-006', client:'ANVAYA Wellness',   description:'Instagram reels batch',        amount:20000, currency:'LKR', status:'draft',   date:'2026-06-15', dueDate:'2026-06-29' },
];

const PAGE_SIZE = 50;

export default function InvoicesPage() {
  const [invoices,  setInvoices]  = useState<Invoice[]>(DEMO);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('');
  const [period,    setPeriod]    = useState<DateRange>({ preset:'all', label:'All time' });
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [page,      setPage]      = useState(1);
  const [modal,     setModal]     = useState(false);
  const [toast,     setToast]     = useState('');
  const [form,      setForm]      = useState({ client:'', description:'', amount:0, currency:'LKR', status:'draft' as const, dueDate:'' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),2400); };

  const filtered = invoices.filter(inv => {
    if (search && !inv.client.toLowerCase().includes(search.toLowerCase()) && !inv.number.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter && inv.status !== filter) return false;
    return true;
  });
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const stats = {
    paid:    invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount,0),
    sent:    invoices.filter(i=>i.status==='sent').reduce((s,i)=>s+i.amount,0),
    overdue: invoices.filter(i=>i.status==='overdue').reduce((s,i)=>s+i.amount,0),
    draft:   invoices.filter(i=>i.status==='draft').reduce((s,i)=>s+i.amount,0),
  };

  const toggleSelect = (id: string) => setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const selectAll = (checked: boolean) => setSelected(checked ? new Set(paginated.map(i=>i._id)) : new Set());
  const allChecked = paginated.length>0 && paginated.every(i=>selected.has(i._id));
  const someChecked = paginated.some(i=>selected.has(i._id)) && !allChecked;

  const addInvoice = () => {
    if(!form.client||!form.amount) return;
    const n: Invoice = { _id:Date.now().toString(), number:`INV-${String(invoices.length+1).padStart(3,'0')}`, client:form.client, description:form.description, amount:form.amount, currency:form.currency, status:form.status as any, date:new Date().toISOString().slice(0,10), dueDate:form.dueDate };
    setInvoices(iv=>[n,...iv]); setModal(false); setForm({client:'',description:'',amount:0,currency:'LKR',status:'draft',dueDate:''}); showToast('Invoice created!');
  };

  const markPaid = () => {
    setInvoices(iv=>iv.map(i=>selected.has(i._id)?{...i,status:'paid' as const}:i));
    setSelected(new Set()); showToast(`${selected.size} invoice(s) marked paid`);
  };
  const deleteSelected = () => {
    if(!confirm(`Delete ${selected.size} invoice(s)?`))return;
    setInvoices(iv=>iv.filter(i=>!selected.has(i._id)));
    setSelected(new Set()); showToast('Deleted');
  };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Invoices</h2><p>Create and track your invoices</p></div>
        <div className="page-hero-right">
          <PeriodFilter id="invoices" onChange={setPeriod} />
          <button className="btn-primary" onClick={()=>setModal(true)}><i className="ti ti-plus" /> New invoice</button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-check" /> <span className="sec-t">Paid</span></div><div className="stat-value up">{fmtAmt(stats.paid)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-send" /> <span className="sec-t">Sent</span></div><div className="stat-value">{fmtAmt(stats.sent)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-alert-circle" /> <span className="sec-t">Overdue</span></div><div className="stat-value" style={{color:'var(--p-text-critical)'}}>{fmtAmt(stats.overdue)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-file-text" /> <span className="sec-t">Draft</span></div><div className="stat-value">{fmtAmt(stats.draft)}</div></div>
      </div>

      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search"><span className="p-search-icon"><i className="ti ti-search"/></span><input type="text" placeholder="Search invoices…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div>
          <div className="p-toolbar-end">
            <select className="btn-secondary" style={{height:'2rem',padding:'0 var(--p-space-300)',fontSize:'var(--p-font-size-325)',cursor:'pointer',boxShadow:'var(--p-shadow-button)'}} value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}>
              <option value="">All status</option><option value="paid">Paid</option><option value="sent">Sent</option><option value="overdue">Overdue</option><option value="draft">Draft</option>
            </select>
            <button className="btn-secondary" onClick={()=>{const csv=filtered.map(i=>`"${i.number}","${i.client}","${i.description}",${i.amount},"${i.status}","${i.date}"`).join('\n');const a=document.createElement('a');a.href='data:text/csv,'+encodeURIComponent('Number,Client,Description,Amount,Status,Date\n'+csv);a.download='invoices.csv';a.click();}}><i className="ti ti-download"/> Export</button>
          </div>
        </div>

        <BulkBar count={selected.size} visible={selected.size>0} actions={[{label:'Mark paid',icon:'ti-check',onClick:markPaid},{label:'Delete',icon:'ti-trash',onClick:deleteSelected,danger:true}]} onClear={()=>setSelected(new Set())} />

        <table className="p-table">
          <thead><tr>
            <th className="cb-col">
              <input type="checkbox" checked={allChecked} ref={el=>{if(el)el.indeterminate=someChecked;}} onChange={e=>selectAll(e.target.checked)} style={{cursor:'pointer'}}/>
            </th>
            <th style={{textAlign:"left"}}>Invoice #</th><th style={{textAlign:"left"}}>Client</th><th style={{textAlign:"left"}}>Description</th><th className="td-num">Amount</th><th style={{textAlign:"left"}}>Date</th><th style={{textAlign:"left"}}>Due Date</th><th style={{textAlign:"left"}}>Status</th>
          </tr></thead>
          <tbody>
            {paginated.length===0&&<tr><td colSpan={8} style={{textAlign:'center',padding:'var(--p-space-800)',color:'var(--p-text-secondary)'}}>No invoices found.</td></tr>}
            {paginated.map(inv=>(
              <tr key={inv._id} style={{background:selected.has(inv._id)?'var(--p-surface-selected,#f5f5f5)':undefined}}>
                <td className="cb-col"><input type="checkbox" checked={selected.has(inv._id)} onChange={()=>toggleSelect(inv._id)} style={{cursor:'pointer'}}/></td>
                <td style={{fontWeight:'var(--p-font-weight-medium)',color:'var(--p-text-link)'}}>{inv.number}</td>
                <td className="td-muted">{inv.client}</td>
                <td className="td-muted">{inv.description}</td>
                <td className="td-num" style={{fontWeight:600}}>{fmtAmt(inv.amount,inv.currency)}</td>
                <td className="td-muted">{new Date(inv.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
                <td className="td-muted">{new Date(inv.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
                <td><span className={`badge ${STATUS_BADGE[inv.status]||'badge-draft'}`}>{inv.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{filtered.length} invoice{filtered.length!==1?'s':''}</div>
      </div>

      {modal&&(<div className="p-modal-bg open" onClick={()=>setModal(false)}><div className="p-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div className="p-modal-hd"><h3>New invoice</h3><button className="p-modal-x" onClick={()=>setModal(false)}><i className="ti ti-x"/></button></div>
        <div className="p-modal-body">
          <div className="p-field"><label className="p-label">Client *</label><input className="p-input" value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} placeholder="Client name" autoFocus/></div>
          <div className="p-field"><label className="p-label">Description</label><input className="p-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What this invoice is for"/></div>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Amount *</label><input className="p-input" type="number" value={form.amount||''} onChange={e=>setForm(f=>({...f,amount:+e.target.value}))}/></div>
            <div className="p-field"><label className="p-label">Currency</label><select className="p-input" value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}><option>LKR</option><option>AUD</option><option>USD</option></select></div>
          </div>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Status</label><select className="p-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as any}))}><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option></select></div>
            <div className="p-field"><label className="p-label">Due Date</label><input className="p-input" type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/></div>
          </div>
        </div>
        <div className="p-modal-ft"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn-primary" onClick={addInvoice}><i className="ti ti-plus"/> Create invoice</button></div>
      </div></div>)}

      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
