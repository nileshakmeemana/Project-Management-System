'use client';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import { ClientProfitChart } from '@/components/Charts';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';
import TableSkeleton, { StatRowSkeleton } from '@/components/TableSkeleton';
import { fmtAmt, fmtDate, usePrefs, toBase, fmtBase } from '@/lib/prefs';

const SB: Record<string,string> = { 'in-progress':'badge-pending', 'completed':'badge-paid', 'on-hold':'badge-med' };

/**
 * Admin revenue = revenue created by PROJECTS (project value invoiced to clients),
 * minus what we pay employees (their approved task amounts) = net profit.
 */
export default function AdminRevenuePage() {
  usePrefs();
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tasks,    setTasks]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [period,   setPeriod]   = useState<DateRange>({ preset:'all', label:'All time' });

  useEffect(() => {
    Promise.all([
      apiCall('GET','/projects'),
      apiCall('GET','/invoices').catch(()=>({invoices:[]})),
      apiCall('GET','/tasks?limit=500'),
    ]).then(([p,i,t]) => { setProjects(p.projects||[]); setInvoices(i.invoices||[]); setTasks(t.tasks||[]); })
      .finally(()=>setLoading(false));
  }, []);

  const inPeriod = (d: any) => {
    if (!period.start) return true;
    const dd = new Date(d); if (isNaN(+dd)) return false;
    return dd >= period.start && (!period.end || dd <= period.end);
  };

  // ── Everything below is computed in the viewer's preferred currency ──
  // Employee payout for a project = approved/paid task amounts of tasks ASSIGNED TO that project,
  // each converted from the task's own currency into the preferred currency.
  const payoutFor = (project: any) =>
    tasks.filter(t => ['Approved','Paid'].includes(t.status) && (
        (t.projects||[]).some((x:any)=>(x?._id||x)===project._id) ||
        (t.projectNames||[]).includes(project.name)                     // fallback: matched by name (older records)
      ))
      .reduce((s,t)=>s+toBase(t.approvedAmount||t.requestedAmount||0, t.currency),0);

  const invoiceFor = (projectId: string) => invoices.find(i => (i.project?._id||i.project)===projectId);

  const rows = projects.filter(p => inPeriod(p.createdAt)).map(p => {
    const inv = invoiceFor(p._id);
    // Revenue = invoice total (in invoice currency) or project value (in project currency), converted
    const revenue = inv ? toBase(inv.total ?? inv.amount ?? 0, inv.currency) : toBase(p.value || 0, p.currency);
    const payout = payoutFor(p);
    return { ...p, inv, revenue, payout, profit: revenue - payout };
  });

  const paidInvoices = invoices.filter(i => i.status==='paid' && inPeriod(i.paidAt || i.date));
  const stats = {
    projectValue: rows.reduce((s,r)=>s+toBase(r.value||0, r.currency),0),
    invoiced:     invoices.filter(i=>inPeriod(i.date)).reduce((s,i)=>s+toBase(i.total??i.amount??0, i.currency),0),
    collected:    paidInvoices.reduce((s,i)=>s+toBase(i.total??i.amount??0, i.currency),0),
    payouts:      rows.reduce((s,r)=>s+r.payout,0),
  };
  // Net profit = for every project whose invoice was paid: invoice revenue − employee payments
  // for tasks assigned to that project (all converted to the preferred currency).
  const netProfit = rows.filter(r=>r.inv?.status==='paid').reduce((s,r)=>s+(r.revenue - r.payout),0);

  // Client revenue chart from paid invoices (converted)
  const clientProfit: Record<string,number> = {};
  paidInvoices.forEach(i => { const k=i.clientName||'Other'; clientProfit[k]=(clientProfit[k]||0)+toBase(i.total??i.amount??0, i.currency); });

  if (loading) return (
    <div className="content">
      <div className="page-hero"><div className="page-hero-left"><h2>Revenue</h2><p>Project revenue, client payments & profit after employee payouts</p></div></div>
      <StatRowSkeleton />
      <div className="p-table-wrap"><TableSkeleton rows={6} cols={6} /></div>
    </div>
  );

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Revenue</h2><p>Project revenue, client payments & profit after employee payouts</p></div>
        <PeriodFilter id="rev-admin" onChange={setPeriod} />
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-folder-dollar" /> <span className="sec-t">Project value</span></div><div className="stat-value">{fmtBase(stats.projectValue)}</div><div style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)',marginTop:2}}>All projects in period</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-file-invoice" /> <span className="sec-t">Invoiced</span></div><div className="stat-value">{fmtBase(stats.invoiced)}</div><div style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)',marginTop:2}}>Issued to clients</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check" /> <span className="sec-t">Collected</span></div><div className="stat-value up">{fmtBase(stats.collected)}</div><div style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-success-secondary)',marginTop:2}}>Paid invoices</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-chart-line" /> <span className="sec-t">Net profit</span></div><div className="stat-value" style={{color:netProfit>=0?undefined:'var(--p-text-critical)'}}>{fmtBase(netProfit)}</div><div style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)',marginTop:2}}>Collected − employee payouts</div></div>
      </div>

      <div className="two-col" style={{ marginBottom:'var(--p-space-400)' }}>
        <div className="p-card">
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-chart-bar" /> <span className="sec-t">Revenue by client</span></div><span className="badge badge-draft">{period.label}</span></div>
          <div className="p-card-body" style={{ paddingBottom:0 }}>
            <div style={{ width:'100%', height:250 }}><ClientProfitChart data={clientProfit} /></div>
          </div>
        </div>
        <div className="p-card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-cash-banknote" /> <span className="sec-t">Employee payouts</span></div><span className="badge badge-draft">{fmtBase(stats.payouts)}</span></div>
          <div style={{ flex:1, overflowY:'auto', maxHeight:250 }}>
            {rows.filter(r=>r.payout>0).length===0 && <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'var(--p-space-600)',color:'var(--p-text-secondary)'}}>No approved task payouts yet</div>}
            {rows.filter(r=>r.payout>0).map(r=>(
              <div key={r._id} style={{display:'flex',alignItems:'center',gap:'var(--p-space-300)',padding:'var(--p-space-250) var(--p-space-400)',borderBottom:'.0625rem solid var(--p-border-subdued)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:'var(--p-font-weight-medium)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</div>
                  <div style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)'}}>{(r.employees||[]).map((e:any)=>e?.name).filter(Boolean).join(', ')||'—'}</div>
                </div>
                <span style={{fontWeight:600,flexShrink:0}}>− {fmtBase(r.payout)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project revenue table */}
      <div className="p-table-wrap">
        <div className="p-card-header" style={{padding:'var(--p-space-300) var(--p-space-400)'}}><div className="p-card-title"><i className="ti ti-report-money"/> <span className="sec-t">Revenue by project</span></div></div>
        <table className="p-table">
          <thead><tr>
            <th style={{textAlign:'left',minWidth:160}}>Project</th><th style={{textAlign:'left'}}>Client</th><th style={{textAlign:'left'}}>Status</th>
            <th style={{textAlign:'left'}}>Invoice</th>
            <th className="td-num">Project value</th><th className="td-num">Employee payout</th><th className="td-num">Profit</th>
          </tr></thead>
          <tbody>
            {rows.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:'var(--p-space-800)',color:'var(--p-text-secondary)'}}>No projects in this period.</td></tr>}
            {rows.map(r=>(
              <tr key={r._id}>
                <td style={{fontWeight:'var(--p-font-weight-medium)'}}>{r.name}</td>
                <td className="td-muted">{r.clientName||'—'}</td>
                <td><span className={`badge ${SB[r.status]||'badge-draft'}`}>{r.status}</span></td>
                <td>{r.inv ? <span className={`badge ${r.inv.status==='paid'?'badge-paid':r.inv.status==='overdue'?'badge-high':'badge-pending'}`}>{r.inv.number} · {r.inv.status}</span> : <span className="td-muted" style={{fontSize:'var(--p-font-size-275)'}}>not invoiced</span>}</td>
                <td className="td-num td-muted">{fmtAmt(r.value||0, r.currency)}</td>
                <td className="td-num td-muted">{r.payout ? `− ${fmtBase(r.payout)}` : '—'}</td>
                <td className="td-num" style={{fontWeight:600,color:r.profit>=0?'var(--p-text-success-secondary,#047b5d)':'var(--p-text-critical)'}}>{fmtBase(r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-table-footer">{rows.length} project{rows.length!==1?'s':''} · Profit = invoice total (or project value) − approved employee payouts</div>
      </div>
    </div>
  );
}
