'use client';
import { useEffect, useState } from 'react';
import { apiCall, getUser } from '@/lib/api';
import TableSkeleton, { StatRowSkeleton } from '@/components/TableSkeleton';
import { downloadPayslipPDF, getPdfBiz, BizDetails } from '@/lib/pdf';
import { PayslipPreview } from '@/components/DocPreviews';
import PeriodFilter, { DateRange } from '@/components/PeriodFilter';
import { fmtAmt, fmtDate, usePrefs, toBase, fmtBase, convert } from '@/lib/prefs';



export default function PayrollPage() {
  usePrefs(); // re-render on currency / date-format changes
  const user = getUser();
  const [tasks, setTasks]     = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig]   = useState({ currency: user?.currency||'LKR', bonus:0, deductions:0, payType: user?.payType||'Per Task' });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [period, setPeriod]   = useState<DateRange>({ preset:'all', label:'All time' });
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [biz, setBiz]         = useState<BizDetails>({ name:'Designer Craft' });

  useEffect(() => {
    Promise.all([
      apiCall('GET', '/tasks'),
      apiCall('GET', '/payroll'),
    ]).then(([t,p]) => {
      setTasks(t.tasks||[]);
      setPayslips(p.payslips||[]);
    }).finally(() => setLoading(false));
    getPdfBiz(apiCall).then(setBiz); // payslip settings + business details drive the preview & PDF
    apiCall('GET','/projects').then(d=>setProjects(d.projects||[])).catch(()=>{});
  }, []);

  const inPeriod = (t: any) => {
    if (!period.start) return true;
    const d = new Date(t.dateCompleted || t.createdAt);
    if (isNaN(+d)) return false;
    return d >= period.start && (!period.end || d <= period.end);
  };
  const selProject = projects.find((p: any) => p._id === projectId);
  const inProject = (t: any) => !projectId
    || (t.projects||[]).some((x: any) => (x?._id||x) === projectId)
    || (selProject && (t.projectNames||[]).includes(selProject.name));
  // Approved/paid tasks in the period (and project, if chosen) — ANY currency; converted below
  const approved  = tasks.filter(t => ['Approved','Paid'].includes(t.status) && inPeriod(t) && inProject(t));
    const gross = approved.reduce((s,t)=>s+convert(t.approvedAmount||t.requestedAmount||0, t.currency||'LKR', config.currency),0);
  const net       = gross + Number(config.bonus) - Number(config.deductions);
  const hours     = approved.reduce((s,t) => s+(t.hours||0),0);
  const avgRate   = hours ? gross/hours : 0;

  const generatePayslip = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const periodLabel = `${period.preset === 'all'
        ? `${now.toLocaleString('default',{month:'long'})} ${now.getFullYear()}`
        : period.label}${selProject ? ` · ${selProject.name}` : ''}`;
      const d = await apiCall('POST', '/payroll/generate', {
        period: periodLabel,
        periodStart: period.start || undefined, periodEnd: period.end || undefined,
        projectId: projectId || undefined, projectName: selProject?.name,
        currency: config.currency, bonus: config.bonus, deductions: config.deductions,
        payType: config.payType,
      });
      setPreview(d.payslip);
      setPayslips(p => [d.payslip, ...p.filter(x => x._id !== d.replaced)]);
      await downloadPayslipPDF(d.payslip, biz);
    } catch (err: any) {
      // Already generated for this period? Offer to generate again (replaces the old one).
      if (String(err.message||'').includes('already generated') && confirm(`${err.message}

Generate again and replace it?`)) {
        try {
          const now2 = new Date();
          const label2 = `${period.preset === 'all' ? `${now2.toLocaleString('default',{month:'long'})} ${now2.getFullYear()}` : period.label}${selProject ? ` · ${selProject.name}` : ''}`;
          const d2 = await apiCall('POST', '/payroll/generate', {
            period: label2, periodStart: period.start || undefined, periodEnd: period.end || undefined,
            projectId: projectId || undefined, projectName: selProject?.name,
            currency: config.currency, bonus: config.bonus, deductions: config.deductions, payType: config.payType,
            regenerate: true,
          });
          setPreview(d2.payslip);
          setPayslips(p => [d2.payslip, ...p.filter(x => x._id !== d2.replaced)]);
          await downloadPayslipPDF(d2.payslip, biz);
        } catch (e2: any) { alert(e2.message); }
      } else if (!String(err.message||'').includes('already generated')) alert(err.message);
    }
    finally { setGenerating(false); }
  };

  // Download a payslip as a proper PDF (uses the admin's Payslip Settings + site logo)
  const downloadSlip = async (slip?: any) => {
    let target = slip || preview || payslips[0];
    if (!target) { alert('Generate a payslip first.'); return; }
    if (!Array.isArray(target.tasks) || typeof target.tasks[0] === 'string') {
      try { target = (await apiCall('GET', `/payroll/${target._id}`)).payslip; } catch {}
    }
    await downloadPayslipPDF(target, await getPdfBiz(apiCall));
  };

  if (loading) return (
    <div className="page-content">
      <div className="page-hero"><div className="page-hero-left"><h2>Payroll Report</h2></div></div>
      <StatRowSkeleton />
      <div className="p-table-wrap"><TableSkeleton rows={6} cols={5} /></div>
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Payroll Report</h2><p>Payslips use approved/paid tasks only, keeping each task in its payment currency</p></div>
        <div className="page-hero-right">
          <select className="btn-secondary" style={{height:'2rem',fontSize:'var(--p-font-size-325)',padding:'0 var(--p-space-300)',cursor:'pointer',boxShadow:'var(--p-shadow-button)',maxWidth:180}}
            value={projectId} onChange={e=>setProjectId(e.target.value)} title="Generate a payslip for one project only">
            <option value="">All projects</option>
            {projects.map((p: any)=><option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <PeriodFilter id="emp-payroll" onChange={setPeriod} />
          <button className="btn-primary" onClick={()=>downloadSlip()}><i className="ti ti-download" /> Download PDF</button>
        </div>
      </div>

      {/* Calculator */}
      <div className="p-card" style={{ marginBottom:'var(--p-space-400)' }}>
        <div className="p-card-header"><div className="p-card-title"><i className="ti ti-adjustments-horizontal" /> <span className="sec-t">Payslip Calculator</span></div></div>
        <div className="p-card-body">
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Pay Type</label>
              <select className="p-input" value={config.payType} onChange={e => setConfig(c=>({...c,payType:e.target.value}))}>
                <option>Per Task</option><option>Hourly</option><option>Monthly</option>
              </select>
            </div>
            <div className="p-field"><label className="p-label">Payslip Currency</label>
              <select className="p-input" value={config.currency} onChange={e => setConfig(c=>({...c,currency:e.target.value}))}>
                <option value="LKR">LKR</option><option value="AUD">AUD</option><option value="USD">USD</option>
              </select>
              <small style={{ color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-275)', marginTop:2, display:'block' }}>Tasks stay in their own currency.</small>
            </div>
          </div>
          <div className="p-grid2">
            <div className="p-field"><label className="p-label">Bonus / Adjustment</label><input type="number" className="p-input" value={config.bonus} onChange={e=>setConfig(c=>({...c,bonus:+e.target.value}))} /></div>
            <div className="p-field"><label className="p-label">Deductions</label><input type="number" className="p-input" value={config.deductions} onChange={e=>setConfig(c=>({...c,deductions:+e.target.value}))} /></div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'var(--p-space-300)' }}>
            <button className="btn-primary" onClick={generatePayslip} disabled={generating}>
              <i className="ti ti-file-text" /> {generating?'Generating…':'Generate Payslip'}
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-row" style={{ marginBottom:'var(--p-space-400)' }}>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-currency-dollar" /> Total Requested</div><div className="stat-value">{fmtBase(tasks.reduce((s,t)=>s+toBase(t.requestedAmount||0,t.currency),0))}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check" /> Total Approved</div><div className="stat-value up">{fmtAmt(gross,config.currency)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clock" /> Pending Count</div><div className="stat-value">{tasks.filter(t=>t.status==='Pending Review').length}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-checks" /> Approved Count</div><div className="stat-value">{approved.length}</div></div>
      </div>

      {/* Payslip preview — same template used for the PDF; reflects Payslip Settings */}
      <div className="p-card">
        <div className="p-card-header">
          <div className="p-card-title"><i className="ti ti-file-text" /> <span className="sec-t">Payslip Preview</span></div>
          <div className="p-card-actions" style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)' }}>
            <span className="badge badge-draft">{period.preset==='all' ? 'Current month' : period.label}{selProject?` · ${selProject.name}`:''}</span>
            <button className="btn-secondary" onClick={()=>downloadSlip()}><i className="ti ti-download" /> Download PDF</button>
          </div>
        </div>
        <div className="p-card-body" id="payslip-preview">
          <PayslipPreview
            biz={biz}
            payslip={preview || {
              period: period.preset==='all' ? `${new Date().toLocaleString('default',{month:'long'})} ${new Date().getFullYear()}` : period.label,
              currency: config.currency, status: 'preview', createdAt: new Date(),
              employee: { name: user?.name, employeeId: user?.employeeId, position: user?.position },
              tasks: approved, grossAmount: gross, bonus: config.bonus, deductions: config.deductions, netAmount: net,
            }}
          />
        </div>
      </div>

      {/* Past payslips */}
      {payslips.length > 0 && (
        <div className="p-card" style={{ marginTop:'var(--p-space-400)' }}>
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-history" /> <span className="sec-t">Payslip History</span></div></div>
          <table className="p-table">
            <thead><tr><th style={{textAlign:"left",minWidth:120}}>Period</th><th className="td-num">Gross</th><th className="td-num">Net Pay</th><th style={{textAlign:"left"}}>Currency</th><th style={{textAlign:"left"}}>Status</th><th/></tr></thead>
            <tbody>
              {payslips.map(p=>(
                <tr key={p._id}>
                  <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{p.period}</td>
                  <td className="td-num td-muted">{fmtAmt(p.grossAmount,p.currency)}</td>
                  <td className="td-num" style={{ fontWeight:600 }}>{fmtAmt(p.netAmount,p.currency)}</td>
                  <td>{p.currency}</td>
                  <td><span className={`badge ${p.status==='paid'?'badge-paid':p.status==='issued'?'badge-pending':'badge-draft'}`}>{p.status}</span></td>
                  <td><button className="btn-secondary" style={{height:'1.75rem',fontSize:'var(--p-font-size-275)'}} onClick={()=>downloadSlip(p)}><i className="ti ti-download"/> PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
