'use client';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import { ClientProfitChart, EarningsOverviewChart, EarningsByStatusDonut } from '@/components/Charts';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';

const fmtAmt = (v: number, c = 'LKR') => { try { return new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(v||0); } catch { return `${c} ${(v||0).toLocaleString()}`; }};

export default function AdminRevenuePage() {
  const [tasks,   setTasks]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<DateRange>({ preset: 'all', label: 'All time' });

  useEffect(() => { apiCall('GET', '/tasks').then(d => setTasks(d.tasks || [])).finally(() => setLoading(false)); }, []);

  const filtered = tasks.filter(t => {
    if (!period.start) return true;
    const d = new Date(t.dateCompleted || t.createdAt);
    return d >= period.start! && (!period.end || d <= period.end!);
  });

  const now = new Date();
  const approved = filtered.filter(t => ['Approved','Paid'].includes(t.status));
  const mtd  = approved.filter(t => { const d=new Date(t.dateCompleted||t.createdAt); return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth(); }).reduce((s,t)=>s+(t.approvedAmount||t.requestedAmount||0),0);
  const ytd  = approved.filter(t => new Date(t.dateCompleted||t.createdAt).getFullYear()===now.getFullYear()).reduce((s,t)=>s+(t.approvedAmount||t.requestedAmount||0),0);
  const byMonth: Record<string,number> = {};
  approved.forEach(t => { const d=new Date(t.dateCompleted||t.createdAt); const k=`${d.getFullYear()}-${d.getMonth()}`; byMonth[k]=(byMonth[k]||0)+(t.approvedAmount||t.requestedAmount||0); });
  const vals = Object.values(byMonth) as number[];
  const avg  = vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : 0;
  const best = vals.length ? Math.max(...vals) : 0;

  // Client profitability
  const clientProfit: Record<string,number> = {};
  approved.forEach(t => { if(t.clientName) clientProfit[t.clientName]=(clientProfit[t.clientName]||0)+(t.approvedAmount||t.requestedAmount||0); });

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Revenue</h2><p>Financial overview and income trends</p></div>
        <PeriodFilter id="rev-admin" onChange={setPeriod} />
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-trending-up" /> <span className="sec-t">This month</span></div><div className="stat-value">{fmtAmt(mtd)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-calendar" /> <span className="sec-t">This year</span></div><div className="stat-value up">{fmtAmt(ytd)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-chart-bar" /> <span className="sec-t">Monthly avg</span></div><div className="stat-value">{fmtAmt(avg)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-trophy" /> <span className="sec-t">Best month</span></div><div className="stat-value">{fmtAmt(best)}</div></div>
      </div>

      <div className="two-col" style={{ marginBottom: 'var(--p-space-400)' }}>
        <div className="p-card">
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-chart-bar" /> <span className="sec-t">Monthly revenue</span></div><div className="p-card-actions"><span className="badge badge-draft">Live Data</span></div></div>
          <div className="p-card-body" style={{ height: 300, padding: 'var(--p-space-300) 0 0 0' }}>
            <EarningsOverviewChart tasks={filtered} />
          </div>
        </div>

        <div className="p-card">
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-chart-donut" /> <span className="sec-t">Revenue by status</span></div></div>
          <div className="p-card-body" style={{ padding: 'var(--p-space-400)' }}>
            <EarningsByStatusDonut tasks={filtered} />
          </div>
        </div>
      </div>

      <div className="p-card" style={{ marginBottom: 'var(--p-space-400)' }}>
        <div className="p-card-header"><div className="p-card-title"><i className="ti ti-chart-bar" /> <span className="sec-t">Client Profitability</span></div><div className="p-card-actions"><span className="badge badge-draft">Live Data</span></div></div>
        <div className="p-card-body" style={{ height: 280, padding: 'var(--p-space-300) 0 0 0' }}>
          <ClientProfitChart data={clientProfit} />
        </div>
      </div>

      <div className="p-card">
        <div className="p-card-header"><div className="p-card-title"><i className="ti ti-receipt" /> <span className="sec-t">Recent paid orders</span></div></div>
        <table className="p-table">
          <thead><tr>
  <th style={{textAlign:"left",minWidth:180}}>Task</th>
  <th style={{textAlign:"left",minWidth:140}}>Employee</th>
  <th style={{textAlign:"left",minWidth:120}}>Client</th>
  <th style={{textAlign:"left",minWidth:130}}>Category</th>
  <th className="td-num" style={{minWidth:110}}>Approved</th>
  <th style={{textAlign:"left",minWidth:90}}>Status</th>
</tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign:'center',padding:'2rem',color:'var(--p-text-secondary)' }}>Loading…</td></tr>}
            {!loading && approved.length===0 && <tr><td colSpan={6} style={{ textAlign:'center',padding:'2rem',color:'var(--p-text-secondary)' }}>No approved tasks yet.</td></tr>}
            {approved.map(t=>(
              <tr key={t._id}>
                <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{t.title}</td>
                <td className="td-muted">{t.employee?.name||'—'}</td>
                <td className="td-muted">{t.clientName||'—'}</td>
                <td>{t.category?<span className="badge badge-draft">{t.category}</span>:'—'}</td>
                <td className="td-num" style={{ fontWeight:600 }}>{fmtAmt(t.approvedAmount||t.requestedAmount,t.currency)}</td>
                <td><span className={`badge ${t.status==='Paid'?'badge-paid':'badge-approved'}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
