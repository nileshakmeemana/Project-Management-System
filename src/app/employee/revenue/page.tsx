'use client';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import { useData } from '@/hooks/useData';
import { EarningsOverviewChart, EarningsByStatusDonut } from '@/components/Charts';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';
import TableSkeleton from '@/components/TableSkeleton';
import { fmtAmt, fmtDate, usePrefs, toBase, fmtBase } from '@/lib/prefs';


export default function RevenuePage() {
  usePrefs(); // re-render on currency / date-format changes
  const [tasks,   setTasks]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<DateRange>({ preset: 'all', label: 'All time' });

  useEffect(() => {
    apiCall('GET', '/tasks').then(d => setTasks(d.tasks || [])).finally(() => setLoading(false));
  }, []);

  // Filter by period
  const filtered = tasks.filter(t => {
    if (period.preset === 'all' || !period.start) return true;
    const d = new Date(t.dateCompleted || t.createdAt);
    return d >= period.start! && (!period.end || d <= period.end!);
  });

  const now = new Date();
  const approved = filtered.filter(t => ['Approved', 'Paid'].includes(t.status));
  const amt = (t: any) => toBase(t.approvedAmount||t.requestedAmount||0, t.currency); // convert each task's own currency
  const mtd  = approved.filter(t => { const d=new Date(t.dateCompleted||t.createdAt); return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth(); }).reduce((s,t) => s+amt(t), 0);
  const ytd  = approved.filter(t => new Date(t.dateCompleted||t.createdAt).getFullYear()===now.getFullYear()).reduce((s,t) => s+amt(t), 0);
  const byMonth: Record<string,number> = {};
  approved.forEach(t => { const d=new Date(t.dateCompleted||t.createdAt); const k=`${d.getFullYear()}-${d.getMonth()}`; byMonth[k]=(byMonth[k]||0)+amt(t); });
  const vals  = Object.values(byMonth) as number[];
  const avg   = vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : 0;
  const best  = vals.length ? Math.max(...vals) : 0;

  return (
    <div className="page-content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Revenue</h2><p>Financial overview and income trends from your approved tasks</p></div>
        <PeriodFilter id="rev-emp" onChange={setPeriod} />
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-trending-up" /> <span className="sec-t">This month</span></div><div className="stat-value">{loading ? '…' : fmtBase(mtd)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-calendar" /> <span className="sec-t">This year</span></div><div className="stat-value up">{loading ? '…' : fmtBase(ytd)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-chart-bar" /> <span className="sec-t">Monthly avg</span></div><div className="stat-value">{loading ? '…' : fmtBase(avg)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-trophy" /> <span className="sec-t">Best month</span></div><div className="stat-value">{loading ? '…' : fmtBase(best)}</div></div>
      </div>

      <div className="two-col" style={{ marginBottom: 'var(--p-space-400)' }}>
        <div className="p-card">
          <div className="p-card-header">
            <div className="p-card-title"><i className="ti ti-chart-bar" /> <span className="sec-t">Monthly Earnings</span></div>
            <div className="p-card-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-200)', fontSize: 'var(--p-font-size-275)' }}>
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'#005bd3',display:'inline-block' }}/> Approved</span>
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'#91d0ff',display:'inline-block' }}/> Pending</span>
            </div>
          </div>
          <div className="p-card-body" style={{ height: 280, padding: 'var(--p-space-300) 0 0 0' }}>
            <EarningsOverviewChart tasks={filtered} />
          </div>
        </div>

        {/* Earnings by Status — centered */}
        <div className="p-card">
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-chart-donut" /> <span className="sec-t">Earnings by Status</span></div></div>
          <div className="p-card-body" style={{ padding: 'var(--p-space-400)' }}>
            <EarningsByStatusDonut tasks={filtered} />
          </div>
        </div>
      </div>

      {/* Approved tasks table */}
      <div className="p-card">
        <div className="p-card-header"><div className="p-card-title"><i className="ti ti-circle-check" /> <span className="sec-t">Approved & Paid Tasks</span></div></div>
        <table className="p-table">
          <thead><tr><th style={{textAlign:"left"}}>Task</th><th style={{textAlign:"left"}}>Client</th><th style={{textAlign:"left"}}>Category</th><th style={{textAlign:"left"}}>Date</th><th className="td-num">Hours</th><th className="td-num">Approved</th><th style={{textAlign:"left"}}>Status</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{padding:0}}><TableSkeleton rows={5} cols={7} /></td></tr>}
            {!loading && approved.length === 0 && <tr><td colSpan={7} style={{ textAlign:'center',padding:'2rem',color:'var(--p-text-secondary)' }}>No approved tasks yet.</td></tr>}
            {approved.map(t => (
              <tr key={t._id}>
                <td style={{ fontWeight: 'var(--p-font-weight-medium)' }}>{t.title}</td>
                <td className="td-muted">{t.clientName || '—'}</td>
                <td>{t.category ? <span className="badge badge-draft">{t.category}</span> : '—'}</td>
                <td className="td-muted">{t.dateCompleted ? fmtDate(t.dateCompleted) : '—'}</td>
                <td className="td-num td-muted">{t.hours}h</td>
                <td className="td-num" style={{ fontWeight: 600 }}>{fmtAmt(t.approvedAmount || t.requestedAmount, t.currency)}</td>
                <td><span className={`badge ${t.status==='Paid'?'badge-paid':'badge-approved'}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
