'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import Link from 'next/link';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';
import { ClientProfitChart, MonthlyEarningsChart } from '@/components/Charts';
import TaskAddRow from '@/components/TaskAddRow';
import DeadlineAddRow from '@/components/DeadlineAddRow';

const fmtAmt = (v: number, c = 'LKR') => {
  try { return new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(v||0); }
  catch { return `${c} ${(v||0).toLocaleString()}`; }
};

type TaskItem    = { id:number; text:string; priority:'high'|'med'|'low'; done:boolean; };
type DeadlineItem = { id:number; text:string; date:string; };
const PRIO_COLOR: Record<string,string> = { high:'#c70a24', med:'#ffb800', low:'#047b5d' };

export default function AdminDashboard() {
  const [data,         setData]         = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [period,       setPeriod]       = useState<DateRange>({ preset:'all', label:'All time' });
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [employees,    setEmployees]    = useState<any[]>([]);
  const [activity,     setActivity]     = useState<any[]>([]);
  const [tasks,        setTasks]        = useState<TaskItem[]>([
    { id:1, text:'Review submitted tasks', priority:'high', done:false },
    { id:2, text:'Generate June payroll',  priority:'med',  done:false },
    { id:3, text:'Update payslip settings',priority:'low',  done:false },
  ]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([
    { id:1, text:'Nail Toolz delivery',    date:'2026-06-18' },
    { id:2, text:'ANVAYA reels batch',     date:'2026-06-22' },
    { id:3, text:'Port Stephens campaign', date:'2026-07-01' },
  ]);

  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  useEffect(() => {
    Promise.all([
      apiCall('GET', '/dashboard/admin'),
      apiCall('GET', '/tasks?status=Pending%20Review&limit=5'),
      apiCall('GET', '/users'),
      apiCall('GET', '/activity?limit=8'),
    ]).then(([d, t, u, a]) => {
      setData(d);
      setPendingTasks(t.tasks || []);
      setEmployees((u.users || []).filter((u: any) => u.role === 'employee'));
      setActivity(a.logs || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleTask = useCallback((id: number) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, []);
  const clearDone = useCallback(() => setTasks(ts => ts.filter(t => !t.done)), []);

  // Mini calendar
  const calFirst = new Date(calYear, calMonth, 1).getDay();
  const calDim   = new Date(calYear, calMonth + 1, 0).getDate();
  const calDip   = new Date(calYear, calMonth, 0).getDate();
  const calLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month:'long', year:'numeric' });
  const eventDays = new Set(
    deadlines.map(d => {
      const dd = new Date(d.date);
      return (dd.getFullYear() === calYear && dd.getMonth() === calMonth) ? dd.getDate() : null;
    }).filter(Boolean)
  );

  const stats              = data?.stats || {};
  const monthlyData        = data?.monthlyData || [];
  const clientProfit       = data?.clientProfit || {};
  const approvedByCurrency = stats.approvedByCurrency || {};
  const revenueMTD         = (Object.values(approvedByCurrency)[0] as number) || 0;
  const tasksDone          = tasks.filter(t => t.done).length;

  if (loading) return (
    <div style={{ padding:'4rem', textAlign:'center', color:'var(--p-text-secondary)' }}>Loading…</div>
  );

  return (
    <div className="content">

      {/* Page hero */}
      <div className="page-hero" id="dash-hero">
        <div className="page-hero-left">
          <h2>Dashboard</h2>
          <p>Welcome back, Admin — here&apos;s your overview.</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)' }}>
          <PeriodFilter id="dash" onChange={setPeriod} />
        </div>
      </div>

      {/* Stat row */}
      <div className="stat-row">
        {[
          { icon:'ti-users-group', label:'Total Employees',  id:'adm-stat-emp',      val: String(stats.totalEmployees ?? 0),                                                                sub:'Active + pending',   subColor:'var(--p-text-success-secondary)' },
          { icon:'ti-clock',       label:'Pending Reviews',  id:'adm-stat-pending',  val: String(stats.pendingTasks ?? 0),                                                                  sub:'Needs admin action', subColor:'var(--p-text-critical)' },
          { icon:'ti-circle-check',label:'Approved Amount',  id:'adm-stat-approved', val: Object.entries(approvedByCurrency).map(([c,v]:any)=>fmtAmt(v,c)).join(' + ')||'—', up: true,   sub:'Ready for payroll',  subColor:'var(--p-text-success-secondary)' },
          { icon:'ti-clock-hour-4',label:'Total Hours',      id:'adm-stat-hours',    val: (stats.totalHours ?? 0).toFixed(1),                                                               sub:'Submitted hours',    subColor:'var(--p-text-secondary)' },
        ].map(s => (
          <div key={s.id} className="stat-card">
            <div className="stat-label"><i className={`ti ${s.icon}`} /> <span className="sec-t">{s.label}</span></div>
            <div className={`stat-value${s.up ? ' up' : ''}`} id={s.id}>{s.val}</div>
            <div style={{ fontSize:'var(--p-font-size-275)', color:s.subColor, marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Metrics row */}
      <div className="metrics">
        {[
          { label:'Revenue (MTD)',   id:'m-revenue',  val: fmtAmt(revenueMTD),           spark:'2,18 10,16 18,16 26,13 34,10 44,7 54,4',   color:'#13ACF0' },
          { label:'Active projects', id:'m-projects', val: String(employees.length),      spark:'2,14 10,15 18,13 28,14 36,12 46,13 54,11',  color:'#13ACF0' },
          { label:'Tasks done',      id:'m-tasks',    val: `${tasksDone}/${tasks.length}`,spark:'2,18 10,18 20,18 28,14 36,12 44,8 54,4',   color:'#13ACF0' },
          { label:'Overallocated',   id:'m-emp',      val: '0',                           spark:'2,13 10,14 20,12 28,14 36,13 44,14 54,13', color:'#8a8a8a' },
        ].map(m => (
          <div key={m.id} className="metric-card">
            <div className="metric-label">
              <span className="metric-label-text">{m.label}</span>
              <span className="metric-label-action"><i className="ti ti-pencil" /></span>
            </div>
            <div className="metric-body">
              <div className="metric-body-left">
                <span className="metric-value" id={m.id}>{m.val}</span>
              </div>
              <div className="metric-sparkline">
                <svg viewBox="0 0 56 20" style={{ width:56, height:20 }} xmlns="http://www.w3.org/2000/svg">
                  <polyline points={m.spark} fill="none" stroke={m.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Reviews + Client Profitability */}
      <div className="two-col" style={{ marginBottom:'var(--p-space-400)' }}>
        <div className="p-card">
          <div className="p-card-header">
            <div className="p-card-title"><i className="ti ti-clock" /> <span className="sec-t">Pending Reviews</span></div>
            <div className="p-card-actions">
              <Link href="/admin/submitted-tasks" className="btn-secondary" style={{ height:'1.75rem', fontSize:'var(--p-font-size-300)' }}>View All</Link>
            </div>
          </div>
          <div id="adm-pending-list" style={{ padding:0, minHeight:80 }}>
            {pendingTasks.length === 0
              ? <div style={{ padding:'var(--p-space-600)', textAlign:'center', color:'var(--p-text-secondary)' }}>
                  <i className="ti ti-circle-check" style={{ fontSize:24, display:'block', marginBottom:8, color:'var(--p-icon-disabled)' }} />
                  No pending tasks right now.
                </div>
              : pendingTasks.map((t: any) => (
                <div key={t._id} style={{ display:'flex', alignItems:'center', gap:'var(--p-space-300)', padding:'var(--p-space-300) var(--p-space-400)', borderBottom:'.0625rem solid var(--p-border-subdued)' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:'var(--p-font-weight-medium)', fontSize:'var(--p-font-size-325)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                    <div style={{ color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-275)', marginTop:2 }}>{t.employee?.name || '—'} · {t.clientName || '—'} · {t.hours}h</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, marginRight:'var(--p-space-200)' }}>
                    <div style={{ fontSize:'var(--p-font-size-325)', fontWeight:'var(--p-font-weight-semibold)' }}>{fmtAmt(t.requestedAmount, t.currency)}</div>
                  </div>
                  <Link href="/admin/submitted-tasks" className="btn-secondary" style={{ height:'1.75rem', fontSize:'var(--p-font-size-275)', flexShrink:0, padding:'0 var(--p-space-300)' }}>Review</Link>
                </div>
              ))
            }
          </div>
        </div>

        <div className="p-card">
          <div className="p-card-header">
            <div className="p-card-title"><i className="ti ti-chart-bar" /> <span className="sec-t">Client Profitability</span></div>
            <div className="p-card-actions"><span className="badge badge-draft">Live Data</span></div>
          </div>
          <div className="p-card-body" style={{ paddingBottom:0 }}>
            <div style={{ width:'100%', height:250 }}>
              <ClientProfitChart data={clientProfit} />
            </div>
          </div>
        </div>
      </div>

      {/* grid-main: Tasks | Calendar+Activity | Orders+Employees */}
      <div className="grid-main">

        {/* Tasks panel */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><i className="ti ti-checks" /> <span className="sec-t">Tasks</span></div>
            <div style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)' }}>
              <span style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>{tasks.filter(t => !t.done).length} remaining</span>
              <button className="panel-action" onClick={clearDone}><i className="ti ti-trash" /> Clear done</button>
            </div>
          </div>

          <TaskAddRow onAdd={(text, prio) => setTasks(ts => [...ts, { id:Date.now(), text, priority:prio, done:false }])} />

          <div className="task-list">
            {tasks.length === 0 && (
              <div style={{ textAlign:'center', padding:'var(--p-space-400)', color:'var(--p-text-secondary)' }}>No tasks</div>
            )}
            {tasks.map(t => (
              <div key={t.id} className={`task-item${t.done ? ' done' : ''}`} onClick={() => toggleTask(t.id)} style={{ cursor:'pointer' }}>
                <div className="task-prio" style={{ background:PRIO_COLOR[t.priority] }} />
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} onClick={e => e.stopPropagation()} style={{ flexShrink:0 }} />
                <span style={{ flex:1, fontSize:'var(--p-font-size-325)' }}>{t.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Mini Calendar + Activity */}
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--p-space-400)' }}>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-calendar" /> <span className="sec-t">Calendar</span></div>
              <div style={{ display:'flex', gap:'var(--p-space-100)' }}>
                <button className="ia-btn" onClick={() => { if (calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}><i className="ti ti-chevron-left" /></button>
                <button className="ia-btn" onClick={() => { if (calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}><i className="ti ti-chevron-right" /></button>
              </div>
            </div>
            <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)', marginBottom:'var(--p-space-200)' }}>{calLabel}</div>
            <div className="cal-grid">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} style={{ textAlign:'center', fontSize:'var(--p-font-size-275)', fontWeight:600, color:'var(--p-text-secondary)', padding:'2px 0' }}>{d}</div>
              ))}
              {Array.from({length:calFirst}, (_, i) => (
                <div key={`p${i}`} className="cal-cell other-month">{calDip - calFirst + 1 + i}</div>
              ))}
              {Array.from({length:calDim}, (_, i) => {
                const d = i + 1;
                const isToday = d === now.getDate() && calYear === now.getFullYear() && calMonth === now.getMonth();
                const hasEv   = eventDays.has(d);
                return (
                  <div key={d} className={`cal-cell${isToday ? ' today' : ''}${hasEv ? ' has-event' : ''}`} style={{ position:'relative' }}>
                    {d}
                    {hasEv && !isToday && (
                      <span style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background:'var(--p-fill-brand)', display:'block' }} />
                    )}
                  </div>
                );
              })}
              {Array.from({length:(7 - ((calFirst + calDim) % 7)) % 7}, (_, i) => (
                <div key={`n${i}`} className="cal-cell other-month">{i + 1}</div>
              ))}
            </div>
            <div style={{ height:'.0625rem', background:'var(--p-border-subdued)', margin:'var(--p-space-300) 0' }} />
            <div className="deadline-list">
              {deadlines.slice(0, 3).map(d => (
                <div key={d.id} className="deadline-item">
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--p-fill-brand)', flexShrink:0 }} />
                  <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.text}</span>
                  <span style={{ color:'var(--p-text-secondary)', flexShrink:0 }}>{new Date(d.date).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</span>
                </div>
              ))}
            </div>
            <DeadlineAddRow onAdd={(text, date) => setDeadlines(ds => [...ds, { id:Date.now(), text, date }])} />
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-activity" /> <span className="sec-t">Recent activity</span></div>
              <span style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>{activity.length} events</span>
            </div>
            <div className="activity-list">
              {activity.length === 0 && (
                <div style={{ textAlign:'center', padding:'var(--p-space-300)', color:'var(--p-text-secondary)' }}>No activity yet</div>
              )}
              {activity.slice(0, 5).map((a: any, i: number) => (
                <div key={a._id || i} className="activity-item">
                  <div className="activity-icon"><i className="ti ti-activity" /></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'var(--p-font-size-325)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.action}</div>
                    <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>{a.actorName} · {new Date(a.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Orders + Employees */}
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--p-space-400)' }}>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-receipt" /> <span className="sec-t">Orders</span></div>
              <Link href="/admin/revenue" className="panel-action"><i className="ti ti-arrow-right" /> View all</Link>
            </div>
                        <div className="order-list">
              {Object.entries(clientProfit).sort((a: any, b: any) => b[1] - a[1]).slice(0, 4).map(([client, val]: any) => (
                <div key={client} className="order-item">
                  <div style={{ width:28, height:28, borderRadius:'var(--p-border-radius-150)', background:'var(--p-surface-secondary)', border:'.0625rem solid var(--p-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0, color:'var(--p-text-secondary)' }}>
                    {client.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ flex:1, fontWeight:'var(--p-font-weight-medium)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{client}</span>
                  <span style={{ fontWeight:'var(--p-font-weight-semibold)', flexShrink:0 }}>{fmtAmt(val)}</span>
                </div>
              ))}
              {Object.keys(clientProfit).length === 0 && (
                <div style={{ textAlign:'center', padding:'var(--p-space-300)', color:'var(--p-text-secondary)' }}>No data yet</div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-users-group" /> <span className="sec-t">Employees</span></div>
              <Link href="/admin/employees" className="panel-action"><i className="ti ti-plus" /> Add</Link>
            </div>
            <div className="inv-list">
              {employees.slice(0, 5).map((e: any) => (
                <div key={e._id} className="inv-item">
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--p-fill-brand)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {e.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:'var(--p-font-weight-medium)', fontSize:'var(--p-font-size-325)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.name}</div>
                    <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>{e.position || 'Employee'}</div>
                  </div>
                  <span className={`badge ${e.status === 'active' ? 'badge-paid' : 'badge-draft'}`}>{e.status || 'active'}</span>
                </div>
              ))}
              {employees.length === 0 && (
                <div style={{ textAlign:'center', padding:'var(--p-space-300)', color:'var(--p-text-secondary)' }}>No employees yet</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
