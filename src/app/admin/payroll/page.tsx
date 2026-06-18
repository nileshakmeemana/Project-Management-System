'use client';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';

const fmtAmt=(v:number,c='LKR')=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(v||0);}catch{return `${c} ${(v||0).toLocaleString()}`;}};

export default function AdminPayrollPage() {
  const [employees,setEmployees]=useState<any[]>([]);
  const [payslips,setPayslips]=useState<any[]>([]);
  const [tasks,setTasks]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState<any>(null);
  const [generating,setGenerating]=useState(false);
  const [toast,setToast]=useState('');

  const showToast=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),2400);};
  useEffect(()=>{
    Promise.all([apiCall('GET','/users'),apiCall('GET','/payroll'),apiCall('GET','/tasks')]).then(([u,p,t])=>{
      setEmployees((u.users||[]).filter((u:any)=>u.role==='employee'));
      setPayslips(p.payslips||[]);setTasks(t.tasks||[]);
    }).finally(()=>setLoading(false));
  },[]);

  const generateFor=async(emp:any)=>{
    setGenerating(true);
    try{
      const now=new Date();
      const d=await apiCall('POST','/payroll/generate',{employeeId:emp._id,period:`${now.toLocaleString('default',{month:'long'})} ${now.getFullYear()}`,currency:emp.currency||'LKR',businessDetails:{name:'Designer Craft',authorized:'Nilesh Akmeemana',authPosition:'Owner / Manager'}});
      setPayslips(p=>[d.payslip,...p]);showToast(`Payslip generated for ${emp.name}!`);
    }catch(e:any){showToast(e.message);}finally{setGenerating(false);}
  };

  const empStats=employees.map(e=>{
    const empTasks=tasks.filter(t=>t.employee===e._id||(typeof t.employee==='object'&&t.employee?._id===e._id));
    const approved=empTasks.filter(t=>['Approved','Paid'].includes(t.status));
    const gross=approved.reduce((s,t)=>s+(t.approvedAmount||t.requestedAmount||0),0);
    const pending=empTasks.filter(t=>t.status==='Pending Review').length;
    return {...e,gross,approved:approved.length,pending,hours:empTasks.reduce((s,t)=>s+(t.hours||0),0)};
  });

  return (
    <div className="content">
      <div className="page-hero"><div className="page-hero-left"><h2>Payroll</h2><p>Monthly salary overview for your team</p></div></div>
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-cash"/> Total payroll/mo</div><div className="stat-value">{fmtAmt(empStats.reduce((s,e)=>s+e.gross,0))}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-users-group"/> On payroll</div><div className="stat-value">{employees.length}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clock"/> Pending tasks</div><div className="stat-value">{empStats.reduce((s,e)=>s+e.pending,0)}</div></div>
      </div>
      {loading?<div style={{padding:'3rem',textAlign:'center',color:'var(--p-text-secondary)'}}>Loading…</div>:(
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
                <td className="td-num" style={{fontWeight:600}}>{fmtAmt(e.gross,e.currency)}</td>
                <td>{e.currency}</td>
                <td><button className="btn-secondary" style={{height:'1.75rem',fontSize:'var(--p-font-size-275)'}} onClick={()=>generateFor(e)} disabled={generating}><i className="ti ti-file-text"/> Generate Payslip</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>)}
      {payslips.length>0&&(
        <div className="p-table-wrap" style={{marginTop:'var(--p-space-400)'}}>
          <div className="p-card-header" style={{padding:'var(--p-space-300) var(--p-space-400)'}}><div className="p-card-title"><i className="ti ti-history"/> <span className="sec-t">Recent Payslips</span></div></div>
          <table className="p-table">
            <thead><tr><th style={{textAlign:"left"}}>Employee</th><th style={{textAlign:"left",minWidth:120}}>Period</th><th className="td-num">Gross</th><th className="td-num">Net Pay</th><th style={{textAlign:"left"}}>Currency</th><th style={{textAlign:"left"}}>Status</th></tr></thead>
            <tbody>
              {payslips.slice(0,20).map(p=>(
                <tr key={p._id}>
                  <td style={{fontWeight:'var(--p-font-weight-medium)'}}>{p.employee?.name||'—'}</td>
                  <td className="td-muted">{p.period}</td>
                  <td className="td-num td-muted">{fmtAmt(p.grossAmount,p.currency)}</td>
                  <td className="td-num" style={{fontWeight:600}}>{fmtAmt(p.netAmount,p.currency)}</td>
                  <td>{p.currency}</td>
                  <td><span className={`badge ${p.status==='paid'?'badge-paid':p.status==='issued'?'badge-approved':'badge-draft'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
