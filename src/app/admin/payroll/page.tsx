'use client';
import { NotifStore } from '@/lib/notifications';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';
import TableSkeleton, { StatRowSkeleton } from '@/components/TableSkeleton';
import { downloadPayslipPDF, getPdfBiz, BizDetails } from '@/lib/pdf';
import { PayslipPreview } from '@/components/DocPreviews';
import { fmtAmt, fmtDate, usePrefs, toBase, fmtBase } from '@/lib/prefs';


export default function AdminPayrollPage() {
  usePrefs(); // re-render on currency / date-format changes
  const [employees,setEmployees]=useState<any[]>([]);
  const [payslips,setPayslips]=useState<any[]>([]);
  const [tasks,setTasks]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [period,setPeriod]=useState<DateRange>({preset:'all',label:'All time'});
  const [generating,setGenerating]=useState(false);
  const [viewSlip,setViewSlip]=useState<any>(null);
  const [projects,setProjects]=useState<any[]>([]);
  const [projectId,setProjectId]=useState('');
  const [biz,setBiz]=useState<BizDetails>({name:'Designer Craft'});
  const [toast,setToast]=useState('');

  const showToast=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),2400);};
  useEffect(()=>{
    Promise.all([apiCall('GET','/users'),apiCall('GET','/payroll'),apiCall('GET','/tasks?limit=500'),apiCall('GET','/projects').catch(()=>({projects:[]}))]).then(([u,p,t,pr])=>{
      setEmployees((u.users||[]).filter((u:any)=>u.role==='employee'));
      setPayslips(p.payslips||[]);setTasks(t.tasks||[]);setProjects(pr.projects||[]);
    }).finally(()=>setLoading(false));
    getPdfBiz(apiCall).then(setBiz);
  },[]);

  const now=new Date();
  const currentMonth=`${now.toLocaleString('default',{month:'long'})} ${now.getFullYear()}`;
  const selProject=projects.find((p:any)=>p._id===projectId);
  // Payslip period label reflects the selected time period (and project, if chosen)
  const currentPeriod=`${period.preset==='all'?currentMonth:period.label}${selProject?` · ${selProject.name}`:''}`;

  // A payslip counts as "generated" for the current pay period
  const hasPayslip=(empId:string)=>payslips.some(p=>{
    const pid=typeof p.employee==='object'?p.employee?._id:p.employee;
    return pid===empId&&p.period===currentPeriod;
  });

  const generateFor=async(emp:any,regenerate=false)=>{
    if(!regenerate&&hasPayslip(emp._id)){showToast(`Payslip already generated for ${emp.name} (${currentPeriod})`);return;}
    if(regenerate&&!confirm(`Regenerate ${emp.name}'s payslip for ${currentPeriod}? The existing one will be replaced.`))return;
    setGenerating(true);
    try{
      // Payslip is always generated in the EMPLOYEE's preferred currency (their settings),
      // for the selected time period (and project, if one is chosen)
      const d=await apiCall('POST','/payroll/generate',{
        employeeId:emp._id,period:currentPeriod,currency:emp.currency||'LKR',regenerate,
        periodStart:period.start||undefined,periodEnd:period.end||undefined,
        projectId:projectId||undefined,projectName:selProject?.name,
      });
      setPayslips(p=>[d.payslip,...p.filter(x=>x._id!==d.replaced)]);
      NotifStore.payrollGenerated(emp.name);
      showToast(`Payslip generated for ${emp.name} — downloading PDF…`);
      await downloadPayslipPDF(d.payslip, await getPdfBiz(apiCall));
    }catch(e:any){showToast(e.message);}finally{setGenerating(false);}
  };

  const openSlip=async(p:any)=>{
    let slip=p;
    if(!Array.isArray(p.tasks)||typeof p.tasks[0]==='string'){
      try{slip=(await apiCall('GET',`/payroll/${p._id}`)).payslip;}catch{}
    }
    setViewSlip(slip);
  };

  const downloadSlip=async(p:any)=>{
    showToast('Preparing PDF…');
    let slip=p;
    if(!Array.isArray(p.tasks)||typeof p.tasks[0]==='string'){
      try{slip=(await apiCall('GET',`/payroll/${p._id}`)).payslip;}catch{}
    }
    await downloadPayslipPDF(slip, await getPdfBiz(apiCall));
  };

  // Period filter — applies to task earnings and the recent payslips list
  const inPeriod=(dateStr:any)=>{
    if(!period.start)return true;
    const d=new Date(dateStr);
    if(isNaN(+d))return false;
    return d>=period.start&&(!period.end||d<=period.end);
  };
  const periodTasks=tasks.filter(t=>inPeriod(t.dateCompleted||t.createdAt));
  const periodPayslips=payslips.filter(p=>inPeriod(p.createdAt));

  const empStats=employees.map(e=>{
    const empTasks=periodTasks.filter(t=>(t.employee===e._id||(typeof t.employee==='object'&&t.employee?._id===e._id))
      && (!projectId || (t.projects||[]).some((x:any)=>(x?._id||x)===projectId) || (selProject&&(t.projectNames||[]).includes(selProject.name))));
    const approved=empTasks.filter(t=>['Approved','Paid'].includes(t.status));
    // Display value: every task converted from ITS currency into the admin's preferred currency
    const gross=approved.reduce((s,t)=>s+toBase(t.approvedAmount||t.requestedAmount||0, t.currency),0);
    const pending=empTasks.filter(t=>t.status==='Pending Review').length;
    return {...e,gross,approved:approved.length,pending,hours:empTasks.reduce((s,t)=>s+(t.hours||0),0),generated:hasPayslip(e._id),slip:payslips.find(p=>{const pid=typeof p.employee==='object'?p.employee?._id:p.employee;return pid===e._id&&p.period===currentPeriod;})};
  });

  if(loading)return(
    <div className="content">
      <div className="page-hero"><div className="page-hero-left"><h2>Payroll</h2><p>Monthly salary overview for your team</p></div></div>
      <StatRowSkeleton />
      <div className="p-table-wrap"><TableSkeleton rows={6} cols={6} /></div>
    </div>
  );

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Payroll</h2><p>Monthly salary overview for your team</p></div>
        <div className="page-hero-right">
          <select className="btn-secondary" style={{height:'2rem',fontSize:'var(--p-font-size-325)',padding:'0 var(--p-space-300)',cursor:'pointer',boxShadow:'var(--p-shadow-button)',maxWidth:180}}
            value={projectId} onChange={e=>setProjectId(e.target.value)} title="Generate payslips for one project only">
            <option value="">All projects</option>
            {projects.map((p:any)=><option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <PeriodFilter id="payroll" onChange={setPeriod} />
        </div>
      </div>
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-cash" /> <span className="sec-t">Total payroll ({period.label})</span></div><div className="stat-value">{fmtBase(empStats.reduce((s,e)=>s+e.gross,0))}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-users-group" /> <span className="sec-t">On payroll</span></div><div className="stat-value">{employees.length}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-chart-bar" /> <span className="sec-t">Avg salary</span></div><div className="stat-value">{employees.length ? fmtBase(Math.round(empStats.reduce((s,e)=>s+e.gross,0) / employees.length)) : '—'}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-receipt" /> <span className="sec-t">Payslips generated</span></div><div className="stat-value">{empStats.filter(e=>e.generated).length}<span style={{fontSize:'var(--p-font-size-300)',color:'var(--p-text-secondary)',fontWeight:450}}> / {employees.length}</span></div><div style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentPeriod}</div></div>
      </div>
      <div className="p-table-wrap">
        <table className="p-table">
          <thead><tr><th style={{textAlign:"left",minWidth:140}}>Employee</th><th style={{textAlign:"left"}}>Position</th><th style={{textAlign:"left"}}>Pay Type</th><th className="td-num">Hours</th><th className="td-num">Approved Tasks</th><th className="td-num">Gross Earnings</th><th style={{textAlign:"left"}}>Currency</th><th/></tr></thead>
          <tbody>
            {empStats.map(e=>(
              <tr key={e._id}>
                <td><div style={{display:'flex',alignItems:'center',gap:'var(--p-space-250)'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'var(--p-fill-brand)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{e.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}</div>
                  <span style={{fontWeight:'var(--p-font-weight-medium)'}}>{e.name}</span>
                </div></td>
                <td className="td-muted">{e.position||'—'}</td>
                <td className="td-muted">{e.payType||'Per Task'}</td>
                <td className="td-num td-muted">{(e.hours||0).toFixed(1)}</td>
                <td className="td-num td-muted">{e.approved}</td>
                <td className="td-num" style={{fontWeight:600}}>{fmtBase(e.gross)}</td>
                <td>{e.currency}</td>
                <td>
                  {e.generated
                    ? <div style={{display:'flex',gap:'var(--p-space-100)',alignItems:'center'}}>
                        <button className="ia-btn" title="View payslip" onClick={()=>e.slip&&openSlip(e.slip)}><i className="ti ti-eye"/></button>
                        <button className="ia-btn" title="Download PDF" onClick={()=>e.slip&&downloadSlip(e.slip)}><i className="ti ti-download"/></button>
                        <button className="btn-secondary" style={{height:'1.75rem',fontSize:'var(--p-font-size-275)'}} onClick={()=>generateFor(e,true)} disabled={generating}><i className="ti ti-refresh"/> Generate again</button>
                      </div>
                    : <button className="btn-secondary" style={{height:'1.75rem',fontSize:'var(--p-font-size-275)'}} onClick={()=>generateFor(e)} disabled={generating}><i className="ti ti-file-text"/> Generate Payslip</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {periodPayslips.length>0&&(
        <div className="p-table-wrap" style={{marginTop:'var(--p-space-400)'}}>
          <div className="p-card-header" style={{padding:'var(--p-space-300) var(--p-space-400)'}}><div className="p-card-title"><i className="ti ti-history"/> <span className="sec-t">Recent Payslips</span></div></div>
          <table className="p-table">
            <thead><tr><th style={{textAlign:"left"}}>Employee</th><th style={{textAlign:"left",minWidth:120}}>Period</th><th className="td-num">Gross</th><th className="td-num">Net Pay</th><th style={{textAlign:"left"}}>Currency</th><th style={{textAlign:"left"}}>Status</th><th/></tr></thead>
            <tbody>
              {periodPayslips.slice(0,20).map(p=>(
                <tr key={p._id}>
                  <td style={{fontWeight:'var(--p-font-weight-medium)'}}>{p.employee?.name||'—'}</td>
                  <td className="td-muted">{p.period}</td>
                  <td className="td-num td-muted">{fmtAmt(p.grossAmount,p.currency)}</td>
                  <td className="td-num" style={{fontWeight:600}}>{fmtAmt(p.netAmount,p.currency)}</td>
                  <td>{p.currency}</td>
                  <td><span className={`badge ${p.status==='paid'?'badge-paid':p.status==='issued'?'badge-pending':'badge-draft'}`}>{p.status}</span></td>
                  <td><button className="btn-secondary" style={{height:'1.75rem',fontSize:'var(--p-font-size-275)'}} onClick={()=>downloadSlip(p)}><i className="ti ti-download"/> PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Payslip preview modal — shown in the payslip's own currency */}
      {viewSlip&&(
        <div className="p-modal-bg open" onClick={()=>setViewSlip(null)}>
          <div className="p-modal" style={{maxWidth:720}} onClick={e=>e.stopPropagation()}>
            <div className="p-modal-hd"><h3>Payslip — {viewSlip.employee?.name} · {viewSlip.period}</h3><button className="p-modal-x" onClick={()=>setViewSlip(null)}><i className="ti ti-x"/></button></div>
            <div className="p-modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
              <PayslipPreview payslip={viewSlip} biz={biz} />
            </div>
            <div className="p-modal-ft">
              <button className="btn-secondary" onClick={()=>setViewSlip(null)}>Close</button>
              <button className="btn-primary" onClick={()=>downloadSlip(viewSlip)}><i className="ti ti-download"/> Download PDF</button>
            </div>
          </div>
        </div>
      )}
      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
