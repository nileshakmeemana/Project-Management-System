'use client';
import { useState } from 'react';

export default function PayslipSettingsPage() {
  const [biz,setBiz]=useState({name:'Designer Craft',address:'Business Address, Sri Lanka',email:'hello@designercraft.local',phone:'+94 77 000 0000',authorized:'Nilesh Akmeemana',authPosition:'Owner / Manager',note:'This payslip is issued for the pay period stated above and serves as a record of approved payment.',invoicePrefix:'INV-',payslipPrefix:'PAY-',taxNo:'',regNo:''});
  const [toast,setToast]=useState('');
  const showToast=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),2400);};

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Payslip Settings</h2><p>Configure business details and payslip generation preferences</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={()=>showToast('Settings saved!')}><i className="ti ti-device-floppy"/> Save Settings</button></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--p-space-400)',alignItems:'start'}}>
        <div className="p-card">
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-building"/> <span className="sec-t">Business Details</span></div></div>
          <div className="p-card-body" style={{display:'flex',flexDirection:'column',gap:'var(--p-space-400)'}}>
            <div className="p-field"><label className="p-label">Business name</label><input className="p-input" value={biz.name} onChange={e=>setBiz(f=>({...f,name:e.target.value}))}/></div>
            <div className="p-field"><label className="p-label">Address</label><input className="p-input" value={biz.address} onChange={e=>setBiz(f=>({...f,address:e.target.value}))}/></div>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Email</label><input className="p-input" type="email" value={biz.email} onChange={e=>setBiz(f=>({...f,email:e.target.value}))}/></div>
              <div className="p-field"><label className="p-label">Phone</label><input className="p-input" value={biz.phone} onChange={e=>setBiz(f=>({...f,phone:e.target.value}))}/></div>
            </div>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Tax / VAT No.</label><input className="p-input" value={biz.taxNo} onChange={e=>setBiz(f=>({...f,taxNo:e.target.value}))} placeholder="Optional"/></div>
              <div className="p-field"><label className="p-label">Reg. No.</label><input className="p-input" value={biz.regNo} onChange={e=>setBiz(f=>({...f,regNo:e.target.value}))} placeholder="Optional"/></div>
            </div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--p-space-400)'}}>
          <div className="p-card">
            <div className="p-card-header"><div className="p-card-title"><i className="ti ti-signature"/> <span className="sec-t">Authorized Signatory</span></div></div>
            <div className="p-card-body" style={{display:'flex',flexDirection:'column',gap:'var(--p-space-400)'}}>
              <div className="p-field"><label className="p-label">Authorized by</label><input className="p-input" value={biz.authorized} onChange={e=>setBiz(f=>({...f,authorized:e.target.value}))}/></div>
              <div className="p-field"><label className="p-label">Position / Title</label><input className="p-input" value={biz.authPosition} onChange={e=>setBiz(f=>({...f,authPosition:e.target.value}))}/></div>
            </div>
          </div>
          <div className="p-card">
            <div className="p-card-header"><div className="p-card-title"><i className="ti ti-adjustments-horizontal"/> <span className="sec-t">Numbering</span></div></div>
            <div className="p-card-body" style={{display:'flex',flexDirection:'column',gap:'var(--p-space-400)'}}>
              <div className="p-field"><label className="p-label">Invoice prefix</label><input className="p-input" value={biz.invoicePrefix} onChange={e=>setBiz(f=>({...f,invoicePrefix:e.target.value}))} placeholder="INV-"/></div>
              <div className="p-field"><label className="p-label">Payslip prefix</label><input className="p-input" value={biz.payslipPrefix} onChange={e=>setBiz(f=>({...f,payslipPrefix:e.target.value}))} placeholder="PAY-"/></div>
            </div>
          </div>
        </div>
        <div className="p-card" style={{gridColumn:'span 2'}}>
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-note"/> <span className="sec-t">Footer Note</span></div></div>
          <div className="p-card-body">
            <div className="p-field"><textarea className="p-input" rows={3} value={biz.note} onChange={e=>setBiz(f=>({...f,note:e.target.value}))}/></div>
          </div>
        </div>
      </div>
      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
