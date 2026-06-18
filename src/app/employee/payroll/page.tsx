'use client';
import { useEffect, useState } from 'react';
import { apiCall, getUser } from '@/lib/api';

const BUSINESS = { name:'Designer Craft', address:'Business Address, Sri Lanka', email:'hello@designercraft.local', phone:'+94 77 000 0000', authorized:'Nilesh Akmeemana', authPosition:'Owner / Manager', note:'This payslip is issued for the pay period stated above and serves as a record of approved payment.' };

const fmtAmt = (v: number, c = 'LKR') => {
  try { return new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:2}).format(v||0); }
  catch { return `${c} ${(v||0).toFixed(2)}`; }
};

export default function PayrollPage() {
  const user = getUser();
  const [tasks, setTasks]     = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig]   = useState({ currency: user?.currency||'LKR', bonus:0, deductions:0, payType: user?.payType||'Per Task' });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      apiCall('GET', '/tasks'),
      apiCall('GET', '/payroll'),
    ]).then(([t,p]) => {
      setTasks(t.tasks||[]);
      setPayslips(p.payslips||[]);
    }).finally(() => setLoading(false));
  }, []);

  const approved  = tasks.filter(t => ['Approved','Paid'].includes(t.status) && t.currency === config.currency);
  const gross     = approved.reduce((s,t) => s+(t.approvedAmount||t.requestedAmount||0),0);
  const net       = gross + Number(config.bonus) - Number(config.deductions);
  const hours     = approved.reduce((s,t) => s+(t.hours||0),0);
  const avgRate   = hours ? gross/hours : 0;

  const generatePayslip = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const period = `${now.toLocaleString('default',{month:'long'})} ${now.getFullYear()}`;
      const d = await apiCall('POST', '/payroll/generate', {
        period, currency: config.currency, bonus: config.bonus, deductions: config.deductions,
        payType: config.payType, businessDetails: BUSINESS,
      });
      setPreview(d.payslip);
      setPayslips(p => [d.payslip, ...p]);
    } catch (err: any) { alert(err.message); }
    finally { setGenerating(false); }
  };

  const printPayslip = () => {
    const content = document.getElementById('payslip-preview')?.innerHTML || '';
    const w = window.open('','_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Payslip — ${user?.name}</title><style>body{font-family:Inter,sans-serif;padding:24px;background:#fff;color:#303030}table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #e3e3e3}.td-num{text-align:right}</style></head><body>${content}<script>window.print()<\/script></body></html>`);
    w.document.close();
  };

  if (loading) return <div style={{ padding:'4rem', textAlign:'center', color:'var(--p-text-secondary)' }}>Loading…</div>;

  return (
    <div className="page-content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Payroll Report</h2><p>Payslips use approved/paid tasks only, keeping each task in its payment currency</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={printPayslip}><i className="ti ti-printer" /> Print / PDF</button></div>
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
        <div className="stat-card"><div className="stat-label"><i className="ti ti-currency-dollar" /> Total Requested</div><div className="stat-value">{fmtAmt(tasks.reduce((s,t)=>s+(t.requestedAmount||0),0),config.currency)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check" /> Total Approved</div><div className="stat-value up">{fmtAmt(gross,config.currency)}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clock" /> Pending Count</div><div className="stat-value">{tasks.filter(t=>t.status==='Pending Review').length}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-checks" /> Approved Count</div><div className="stat-value">{approved.length}</div></div>
      </div>

      {/* Payslip preview */}
      <div className="p-card">
        <div className="p-card-header">
          <div className="p-card-title"><i className="ti ti-file-text" /> <span className="sec-t">Payslip Preview</span></div>
          <div className="p-card-actions"><button className="btn-secondary" onClick={printPayslip}><i className="ti ti-printer" /> Print</button></div>
        </div>
        <div className="p-card-body" id="payslip-preview">
          <div style={{ border:'.0625rem solid var(--p-border)', borderRadius:'var(--p-border-radius-200)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ background:'var(--p-fill-brand)', color:'#fff', padding:'var(--p-space-500)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontWeight:600, fontSize:'var(--p-font-size-350)' }}>{BUSINESS.name}</div>
                <div style={{ fontSize:'var(--p-font-size-300)', opacity:.8, marginTop:4 }}>{BUSINESS.address}</div>
                <div style={{ fontSize:'var(--p-font-size-300)', opacity:.8 }}>{BUSINESS.email} · {BUSINESS.phone}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'var(--p-font-size-275)', opacity:.7, textTransform:'uppercase', letterSpacing:'.08em' }}>Employee Payslip</div>
                <div style={{ fontSize:'1.25rem', fontWeight:600 }}>PAYSLIP</div>
                <div style={{ fontSize:'var(--p-font-size-300)', opacity:.8 }}>Generated {new Date().toLocaleDateString('en-LK')}</div>
              </div>
            </div>
            {/* Summary strip */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', background:'var(--p-surface-secondary)', borderBottom:'.0625rem solid var(--p-border)' }}>
              {[['Net Pay',fmtAmt(net,config.currency)],['Pay Type',config.payType],['Currency',config.currency],['Approved Tasks',approved.length]].map(([l,v])=>(
                <div key={String(l)} style={{ padding:'var(--p-space-300) var(--p-space-400)', borderRight:'.0625rem solid var(--p-border)' }}>
                  <div style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>{l}</div>
                  <div style={{ fontWeight:600, fontSize:'var(--p-font-size-350)' }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Employee info */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', borderBottom:'.0625rem solid var(--p-border)' }}>
              <div style={{ padding:'var(--p-space-400)', borderRight:'.0625rem solid var(--p-border)' }}>
                <div style={{ fontWeight:600, marginBottom:'var(--p-space-200)' }}>Employee Information</div>
                <p style={{ fontSize:'var(--p-font-size-325)', lineHeight:1.8, color:'var(--p-text-secondary)' }}>
                  <b style={{ color:'var(--p-text)' }}>Name:</b> {user?.name}<br/>
                  <b style={{ color:'var(--p-text)' }}>ID:</b> {user?.employeeId}<br/>
                  <b style={{ color:'var(--p-text)' }}>Position:</b> {user?.position||'—'}<br/>
                  <b style={{ color:'var(--p-text)' }}>Email:</b> {user?.email}
                </p>
              </div>
              <div style={{ padding:'var(--p-space-400)' }}>
                <div style={{ fontWeight:600, marginBottom:'var(--p-space-200)' }}>Payment Information</div>
                <p style={{ fontSize:'var(--p-font-size-325)', lineHeight:1.8, color:'var(--p-text-secondary)' }}>
                  <b style={{ color:'var(--p-text)' }}>Pay Date:</b> {new Date().toLocaleDateString('en-LK')}<br/>
                  <b style={{ color:'var(--p-text)' }}>Total Hours:</b> {hours.toFixed(2)}<br/>
                  <b style={{ color:'var(--p-text)' }}>Avg Rate:</b> {fmtAmt(avgRate,config.currency)} / hr<br/>
                  <b style={{ color:'var(--p-text)' }}>Pay Type:</b> {config.payType}
                </p>
              </div>
            </div>
            {/* Earnings table */}
            <div style={{ padding:'var(--p-space-400)' }}>
              <div style={{ fontWeight:600, marginBottom:'var(--p-space-300)' }}>Earnings</div>
              <table className="p-table" style={{ marginBottom:'var(--p-space-400)' }}>
                <thead><tr><th style={{textAlign:"left",minWidth:180}}>Description</th><th className="td-num">Units</th><th className="td-num">Rate</th><th className="td-num">Amount</th></tr></thead>
                <tbody>
                  {approved.length===0 && <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--p-text-secondary)' }}>No approved tasks for {config.currency} in this period.</td></tr>}
                  {approved.map(t => (
                    <tr key={t._id}>
                      <td>{t.title}<br/><small style={{ color:'var(--p-text-secondary)' }}>{t.clientName} · {t.category}</small></td>
                      <td className="td-num">{(t.hours||0).toFixed(2)} hrs</td>
                      <td className="td-num">{t.hours?fmtAmt((t.approvedAmount||t.requestedAmount)/t.hours,config.currency):'—'}</td>
                      <td className="td-num">{fmtAmt(t.approvedAmount||t.requestedAmount,config.currency)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight:600, borderTop:'.0625rem solid var(--p-border)' }}><td>Gross Earnings</td><td/><td/><td className="td-num">{fmtAmt(gross,config.currency)}</td></tr>
                  {config.bonus > 0 && <tr><td>Bonus / Adjustment</td><td/><td/><td className="td-num">{fmtAmt(config.bonus,config.currency)}</td></tr>}
                </tbody>
              </table>
              <div style={{ fontWeight:600, marginBottom:'var(--p-space-300)' }}>Deductions</div>
              <table className="p-table" style={{ marginBottom:'var(--p-space-400)' }}>
                <tbody>
                  <tr><td>{config.deductions>0?'Deductions':'None'}</td><td className="td-num">{fmtAmt(config.deductions,config.currency)}</td></tr>
                  <tr style={{ fontWeight:600 }}><td>Total Deductions</td><td className="td-num">{fmtAmt(config.deductions,config.currency)}</td></tr>
                </tbody>
              </table>
              {/* Net pay */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--p-surface-secondary)', border:'.0625rem solid var(--p-border)', borderRadius:'var(--p-border-radius-200)', padding:'var(--p-space-400)', marginBottom:'var(--p-space-400)' }}>
                <span style={{ fontWeight:600, fontSize:'var(--p-font-size-350)' }}>Final Net Pay</span>
                <strong style={{ fontSize:'1.25rem', fontWeight:700 }}>{fmtAmt(net,config.currency)}</strong>
              </div>
              {/* Signatures */}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:'var(--p-space-800)', marginBottom:'var(--p-space-400)' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ borderTop:'.0625rem solid var(--p-border-strong)', paddingTop:'var(--p-space-200)', fontSize:'var(--p-font-size-325)' }}>
                    <b>{BUSINESS.authorized}</b><br/><small style={{ color:'var(--p-text-secondary)' }}>{BUSINESS.authPosition}</small>
                  </div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ borderTop:'.0625rem solid var(--p-border-strong)', paddingTop:'var(--p-space-200)', fontSize:'var(--p-font-size-325)', color:'var(--p-text-secondary)' }}>Employee Signature</div>
                </div>
              </div>
              <p style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)', fontStyle:'italic' }}>{BUSINESS.note}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Past payslips */}
      {payslips.length > 0 && (
        <div className="p-card" style={{ marginTop:'var(--p-space-400)' }}>
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-history" /> <span className="sec-t">Payslip History</span></div></div>
          <table className="p-table">
            <thead><tr><th style={{textAlign:"left",minWidth:120}}>Period</th><th className="td-num">Gross</th><th className="td-num">Net Pay</th><th style={{textAlign:"left"}}>Currency</th><th style={{textAlign:"left"}}>Status</th></tr></thead>
            <tbody>
              {payslips.map(p=>(
                <tr key={p._id}>
                  <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{p.period}</td>
                  <td className="td-num td-muted">{fmtAmt(p.grossAmount,p.currency)}</td>
                  <td className="td-num" style={{ fontWeight:600 }}>{fmtAmt(p.netAmount,p.currency)}</td>
                  <td>{p.currency}</td>
                  <td><span className={`badge ${p.status==='paid'?'badge-paid':p.status==='issued'?'badge-approved':'badge-draft'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
