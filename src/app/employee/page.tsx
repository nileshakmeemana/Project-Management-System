'use client';
import { EarningsOverviewChart, EarningsByStatusDonut } from '@/components/Charts';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall, getUser } from '@/lib/api';
import TableSkeleton from '@/components/TableSkeleton';
import { fmtAmt, fmtDate, usePrefs, toBase, fmtBase } from '@/lib/prefs';

const fmtTotals = (key: string, arr: any[]) => {
  // Sum every task converted from its own currency into the preferred currency
  const total = arr.reduce((s, x) => s + toBase(Number(x[key] || 0), x.currency || 'LKR'), 0);
  return arr.length ? fmtBase(total) : '—';
};
const BADGE: Record<string,string> = {
  'Pending Review':'badge-pending','Approved':'badge-paid','Paid':'badge-paid',
  'Rejected':'badge-high','Changes Requested':'badge-med',
};

export default function EmployeeDashboard() {
  usePrefs(); // re-render on currency / date-format changes
  const router = useRouter();
  const user = getUser();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = `${hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'}, ${user?.name?.split(' ')[0] || ''}! Here's your overview.`;

  useEffect(() => {
    apiCall('GET', '/tasks').then(d => setTasks(d.tasks || [])).finally(() => setLoading(false));
  }, []);

  const approved = tasks.filter(t => ['Approved','Paid'].includes(t.status));
  const pending  = tasks.filter(t => t.status === 'Pending Review');

  return (
    <div className="page-content">
      <div className="page-hero">
        <div className="page-hero-left">
          <h2>Dashboard</h2>
          <p id="dash-greeting">{greeting}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)' }}>
          <button className="btn-primary" style={{ height:'2rem', fontSize:'var(--p-font-size-325)' }} onClick={() => router.push('/employee/submit')}>
            <i className="ti ti-send" /> Submit Task
          </button>
          <button className="btn-secondary" style={{ height:'2rem', fontSize:'var(--p-font-size-325)' }} onClick={() => router.push('/employee/payroll')}>
            <i className="ti ti-receipt" /> Payslip
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label"><i className="ti ti-clock" /> Total Hours Worked</div>
          <div className="stat-value" id="d-hours">{loading ? '…' : tasks.reduce((a,b)=>a+Number(b.hours||0),0).toFixed(2)}</div>
          <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)', marginTop:2 }}>All submitted tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><i className="ti ti-currency-dollar" /> Requested Amount</div>
          <div className="stat-value" id="d-requested">{loading ? '…' : fmtTotals('requestedAmount', tasks)}</div>
          <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)', marginTop:2 }}>Before review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><i className="ti ti-circle-check" /> Approved Earnings</div>
          <div className="stat-value up" id="d-approved">{loading ? '…' : fmtTotals('approvedAmount', approved)}</div>
          <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)', marginTop:2 }}>Approved + paid tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><i className="ti ti-clipboard-list" /> Tasks Submitted</div>
          <div className="stat-value" id="d-count">{loading ? '…' : tasks.length}</div>
          <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)', marginTop:2 }}>Total submissions</div>
        </div>
      </div>

      {/* Earnings Overview chart */}
      <div className="p-card" style={{ marginBottom:'var(--p-space-400)' }}>
        <div className="p-card-header">
          <div className="p-card-title"><i className="ti ti-chart-bar" /> <span className="sec-t">Earnings Overview</span></div>
          <div className="p-card-actions"><span style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>Approved tasks by month</span></div>
        </div>
        <div className="p-card-body" style={{ padding:'0 var(--p-space-800)' }}>
          <div style={{ width:'100%', height:340 }}><EarningsOverviewChart tasks={tasks} /></div>
        </div>
      </div>

      {/* Recent Tasks + Pending Review */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'var(--p-space-400)', marginBottom:'var(--p-space-400)' }}>
        <div className="p-card">
          <div className="p-card-header">
            <div className="p-card-title"><i className="ti ti-clipboard-list" /> <span className="sec-t">Recent Tasks</span></div>
            <div className="p-card-actions">
              <button className="btn-secondary" style={{ height:'1.75rem', fontSize:'var(--p-font-size-300)' }} onClick={() => router.push('/employee/tasks')}>View All</button>
            </div>
          </div>
          <div style={{ padding:0, overflow:'hidden' }}>
            <table className="p-table">
              <thead><tr><th style={{textAlign:"left",minWidth:160}}>Task</th><th style={{textAlign:"left"}}>Client</th><th className="td-num">Hours</th><th className="td-num">Requested</th><th style={{textAlign:"left"}}>Status</th></tr></thead>
              <tbody id="d-recent-tbody">
                {loading && <tr><td colSpan={5} style={{padding:0}}><TableSkeleton rows={5} cols={5} /></td></tr>}
                {!loading && tasks.length === 0 && <tr><td colSpan={5} style={{ padding:'2rem', textAlign:'center', color:'var(--p-text-secondary)' }}>No tasks yet.</td></tr>}
                {tasks.slice(0,5).map(t => (
                  <tr key={t._id}>
                    <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{t.title}</td>
                    <td className="td-muted">{t.clientName || '—'}</td>
                    <td className="td-num td-muted">{t.hours}</td>
                    <td className="td-num td-muted">{fmtAmt(t.requestedAmount, t.currency)}</td>
                    <td><span className={`badge ${BADGE[t.status]||'badge-draft'}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-card">
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-clock" /> <span className="sec-t">Pending Review</span></div></div>
          <div id="d-pending-list" style={{ padding:0 }}>
            {pending.length === 0
              ? <div style={{ padding:'var(--p-space-600)', textAlign:'center', color:'var(--p-text-secondary)' }}>No pending tasks right now.</div>
              : pending.map(t => (
                <div key={t._id} style={{ padding:'var(--p-space-300) var(--p-space-400)', borderBottom:'.0625rem solid var(--p-border-subdued)' }}>
                  <div style={{ fontWeight:'var(--p-font-weight-medium)', fontSize:'var(--p-font-size-325)' }}>{t.title}</div>
                  <div style={{ color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-300)', marginTop:2 }}>{t.clientName} · {t.hours}h · {fmtAmt(t.requestedAmount, t.currency)}</div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
