'use client';
import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useData } from '@/hooks/useData';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';
import { ClientProfitChart } from '@/components/Charts';
import { StatRowSkeleton } from '@/components/TableSkeleton';
import { fmtAmt, fmtDate, usePrefs, toBase, fmtBase } from '@/lib/prefs';


const BADGE: Record<string,string> = {
  'Assigned':'badge-pending','Accepted':'badge-paid','Declined':'badge-high',
  'Pending Review':'badge-pending','Approved':'badge-paid','Paid':'badge-paid',
  'Rejected':'badge-high','Changes Requested':'badge-med',
};

export default function AdminDashboard() {
  usePrefs(); // re-render on currency / date-format changes
  // ── Cached API calls — instant on re-visit ────
  const { data: tasksData }    = useData('/tasks?limit=500');
  const { data: usersData }    = useData('/users');
  const { data: activityData } = useData('/activity?limit=30');

  const [period, setPeriod] = useState<DateRange>({ preset:'all', label:'All time' });

  const loading = !tasksData && !usersData;

  const allTasks  = tasksData?.tasks || [];
  const employees = (usersData?.users || []).filter((u: any) => u.role === 'employee');
  const allActivity = activityData?.logs || [];

  // ── Period filtering — everything below reacts to the selected range ────
  const inPeriod = useCallback((dateStr: any) => {
    if (!period.start) return true;
    const d = new Date(dateStr);
    if (isNaN(+d)) return false;
    if (d < period.start) return false;
    if (period.end && d > period.end) return false;
    return true;
  }, [period]);

  const periodTasks = useMemo(
    () => allTasks.filter((t: any) => inPeriod(t.dateCompleted || t.createdAt)),
    [allTasks, inPeriod]
  );
  const activity = useMemo(
    () => allActivity.filter((a: any) => inPeriod(a.createdAt)),
    [allActivity, inPeriod]
  );

  const pendingTasks = periodTasks.filter((t: any) => t.status === 'Pending Review').slice(0, 5);

  // The 6 most recent tasks (all tasks are admin-assigned)
  const recentAssigned = [...allTasks]
    .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);

  const stats = useMemo(() => {
    const approved = periodTasks.filter((t: any) => ['Approved','Paid'].includes(t.status));
    // Every amount converted into the viewer's preferred currency before summing
    const approvedTotal = approved.reduce((s: number, t: any) => s + toBase(t.approvedAmount || t.requestedAmount || 0, t.currency), 0);
    const clientProfit: Record<string, number> = {};
    approved.forEach((t: any) => {
      const name = t.clientName || 'Other';
      clientProfit[name] = (clientProfit[name] || 0) + toBase(t.approvedAmount || t.requestedAmount || 0, t.currency);
    });
    return {
      pending: periodTasks.filter((t: any) => t.status === 'Pending Review').length,
      approvedCount: approved.length,
      approvedTotal,
      clientProfit,
      totalHours: periodTasks.reduce((s: number, t: any) => s + (t.hours || 0), 0),
      assigned: periodTasks.filter((t: any) => ['Assigned','Accepted'].includes(t.status)).length,
    };
  }, [periodTasks]);

  if (loading) return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Dashboard</h2><p>Welcome back — here&apos;s your overview.</p></div>
      </div>
      <StatRowSkeleton />
      <div className="two-col" style={{ marginBottom:'var(--p-space-400)' }}>
        {[1,2].map(i => (
          <div key={i} className="p-card">
            <div className="p-card-header"><div className="skeleton-row" style={{width:120}} /></div>
            <div style={{ padding:'var(--p-space-400)' }}>{[1,2,3,4].map(j => <div key={j} className="skel-line" />)}</div>
          </div>
        ))}
      </div>
      <div className="bento-grid">
        {[1,2,3].map(i => (
          <div key={i} className="panel">
            <div className="skeleton-row" style={{width:100,marginBottom:12}} />
            {[1,2,3,4].map(j => <div key={j} className="skel-line" />)}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="content">
      {/* Page hero */}
      <div className="page-hero" id="dash-hero">
        <div className="page-hero-left"><h2>Dashboard</h2><p>Welcome back — here&apos;s your overview.</p></div>
        <div style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)', flexWrap:'wrap' }}>
          <PeriodFilter id="dash" onChange={setPeriod} />
        </div>
      </div>

      {/* Stat row */}
      <div className="stat-row">
        {[
          { icon:'ti-users-group', label:'Total Employees',  val: String(employees.length),                                                          sub:'Active team',       subC:'var(--p-text-success-secondary)' },
          { icon:'ti-clock',       label:'Pending Reviews',  val: String(stats.pending),                                                             sub:'Needs action',      subC:'var(--p-text-critical)' },
          { icon:'ti-circle-check',label:'Approved Amount',  val: fmtBase(stats.approvedTotal), sub:'Ready for payroll', subC:'var(--p-text-success-secondary)' },
          { icon:'ti-clock-hour-4',label:'Total Hours',      val: stats.totalHours.toFixed(1),                                                       sub:'Submitted hours',   subC:'var(--p-text-secondary)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label"><i className={`ti ${s.icon}`} /> <span className="sec-t">{s.label}</span></div>
            <div className="stat-value">{s.val}</div>
            <div style={{ fontSize:'var(--p-font-size-275)', color:s.subC, marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Pending Reviews + Client Profitability */}
      <div className="two-col" style={{ marginBottom:'var(--p-space-400)' }}>
        <div className="p-card" style={{ display:'flex', flexDirection:'column', minHeight:220 }}>
          <div className="p-card-header">
            <div className="p-card-title"><i className="ti ti-clock" /> <span className="sec-t">Pending Reviews</span></div>
            <Link href="/admin/submitted-tasks" className="btn-secondary">View All</Link>
          </div>
          {pendingTasks.length === 0
            ? <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'var(--p-space-600)', textAlign:'center', color:'var(--p-text-secondary)' }}><i className="ti ti-circle-check" style={{ fontSize:24, display:'block', marginBottom:8, color:'var(--p-icon-disabled)' }} />No pending tasks.</div>
            : pendingTasks.map((t: any) => (
              <div key={t._id} style={{ display:'flex', alignItems:'center', gap:'var(--p-space-300)', padding:'var(--p-space-300) var(--p-space-400)', borderBottom:'.0625rem solid var(--p-border-subdued)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:'var(--p-font-weight-medium)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                  <div style={{ color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-275)', marginTop:2 }}>{t.employee?.name||'—'} · {t.clientName||'—'} · {t.hours}h</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:'var(--p-font-weight-semibold)' }}>{fmtAmt(t.requestedAmount, t.currency)}</div>
                </div>
                <Link href={`/admin/submitted-tasks?task=${t._id}`} className="btn-secondary" style={{ height:'1.75rem', fontSize:'var(--p-font-size-275)', padding:'0 var(--p-space-300)' }}>Review</Link>
              </div>
            ))
          }
        </div>
        <div className="p-card">
          <div className="p-card-header">
            <div className="p-card-title"><i className="ti ti-chart-bar" /> <span className="sec-t">Client Profitability</span></div>
            <span className="badge badge-draft">{period.label}</span>
          </div>
          <div className="p-card-body" style={{ paddingBottom:0 }}>
            <div style={{ width:'100%', height:250 }}><ClientProfitChart data={stats.clientProfit} /></div>
          </div>
        </div>
      </div>

      {/* Bento grid: Tasks | Employees | Recent activity — symmetrical, fits the screen */}
      <div className="bento-grid">
        {/* Tasks — last 6 assigned + assign action */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><i className="ti ti-checks" /> <span className="sec-t">Tasks</span></div>
            <Link href="/admin/tasks?assign=1" className="panel-action"><i className="ti ti-plus" /> Assign task</Link>
          </div>
          <div className="task-list">
            {recentAssigned.length === 0 && <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'var(--p-space-400)', color:'var(--p-text-secondary)' }}>No tasks assigned yet</div>}
            {recentAssigned.map((t: any) => (
              <Link key={t._id} href={`/admin/tasks`} className="task-item" style={{ display:'flex', alignItems:'center', gap:'var(--p-space-250)', textDecoration:'none', color:'inherit', cursor:'pointer' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:'var(--p-font-weight-medium)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.employee?.name || '—'}{t.clientName ? ` · ${t.clientName}` : ''}</div>
                </div>
                <span className={`badge ${BADGE[t.status] || 'badge-draft'}`} style={{ flexShrink:0 }}>{t.status}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Employees */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><i className="ti ti-users-group" /> <span className="sec-t">Employees</span></div>
            <Link href="/admin/employees" className="panel-action"><i className="ti ti-plus" /> Add</Link>
          </div>
          <div className="bento-scroll">
            {employees.length === 0 && <div style={{ textAlign:'center', padding:'var(--p-space-400)', color:'var(--p-text-secondary)' }}>No employees yet</div>}
            {employees.slice(0,6).map((e: any)=>(
              <div key={e._id} className="inv-item">
                <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--p-fill-brand)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{e.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:'var(--p-font-weight-medium)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.name}</div>
                  <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>{e.position||'Employee'}</div>
                </div>
                <span className={`badge ${e.status==='active'?'badge-paid':'badge-draft'}`}>{e.status||'active'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><i className="ti ti-activity" /> <span className="sec-t">Recent activity</span></div>
            <span style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>{activity.length} events</span>
          </div>
          <div className="bento-scroll">
            {activity.length === 0 && <div style={{ textAlign:'center', padding:'var(--p-space-400)', color:'var(--p-text-secondary)' }}>No activity in this period</div>}
            {activity.slice(0,6).map((a: any, i: number) => (
              <div key={a._id||i} className="activity-item">
                <div className="activity-icon"><i className="ti ti-activity" /></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.action}</div>
                  <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>{a.actorName} · {fmtDate(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
