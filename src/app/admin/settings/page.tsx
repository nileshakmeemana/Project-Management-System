'use client';
import { useState } from 'react';
import { apiCall, getUser, setSession, getToken } from '@/lib/api';

export default function AdminSettingsPage() {
  const user=getUser();
  const [biz,setBiz]=useState({name:'Designer Craft',address:'Business Address, Sri Lanka',email:'hello@designercraft.local',phone:'+94 77 000 0000',authorized:'Nilesh Akmeemana',authPosition:'Owner / Manager',invoicePrefix:'INV-',payslipNote:'This payslip is issued for the pay period stated above and serves as a record of approved payment.'});
  const [profile,setProfile]=useState({name:user?.name||'',position:user?.position||'',phone:user?.phone||'',email:user?.email||''});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState('');
  const showToast=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),2400);};

  const saveProfile=async()=>{setSaving(true);try{const d=await apiCall('PATCH','/users/me',{name:profile.name,position:profile.position,phone:profile.phone});if(getToken())setSession(getToken()!,d.user);showToast('Profile saved!');}catch(e:any){showToast(e.message);}finally{setSaving(false);}};

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Settings</h2><p>Manage your profile and business details</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={saveProfile} disabled={saving}><i className="ti ti-device-floppy"/> {saving?'Saving…':'Save Changes'}</button></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--p-space-400)',alignItems:'start'}}>
        <div className="p-card">
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-user-circle"/> <span className="sec-t">Admin Profile</span></div></div>
          <div className="p-card-body" style={{display:'flex',flexDirection:'column',gap:'var(--p-space-400)'}}>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Full Name</label><input className="p-input" value={profile.name} onChange={e=>setProfile(f=>({...f,name:e.target.value}))}/></div>
              <div className="p-field"><label className="p-label">Email</label><input className="p-input" value={profile.email} disabled style={{background:'var(--p-surface-secondary)'}}/></div>
            </div>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Position</label><input className="p-input" value={profile.position} onChange={e=>setProfile(f=>({...f,position:e.target.value}))} placeholder="e.g. Owner / Manager"/></div>
              <div className="p-field"><label className="p-label">Phone</label><input className="p-input" value={profile.phone} onChange={e=>setProfile(f=>({...f,phone:e.target.value}))} placeholder="+94 77 000 0000"/></div>
            </div>
          </div>
        </div>
        <div className="p-card">
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-building"/> <span className="sec-t">Business Details</span></div></div>
          <div className="p-card-body" style={{display:'flex',flexDirection:'column',gap:'var(--p-space-400)'}}>
            <div className="p-field"><label className="p-label">Business Name</label><input className="p-input" value={biz.name} onChange={e=>setBiz(f=>({...f,name:e.target.value}))}/></div>
            <div className="p-field"><label className="p-label">Address</label><input className="p-input" value={biz.address} onChange={e=>setBiz(f=>({...f,address:e.target.value}))}/></div>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Email</label><input className="p-input" type="email" value={biz.email} onChange={e=>setBiz(f=>({...f,email:e.target.value}))}/></div>
              <div className="p-field"><label className="p-label">Phone</label><input className="p-input" value={biz.phone} onChange={e=>setBiz(f=>({...f,phone:e.target.value}))}/></div>
            </div>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Authorized By</label><input className="p-input" value={biz.authorized} onChange={e=>setBiz(f=>({...f,authorized:e.target.value}))}/></div>
              <div className="p-field"><label className="p-label">Position</label><input className="p-input" value={biz.authPosition} onChange={e=>setBiz(f=>({...f,authPosition:e.target.value}))}/></div>
            </div>
            <div className="p-field"><label className="p-label">Payslip Note</label><textarea className="p-input" rows={2} value={biz.payslipNote} onChange={e=>setBiz(f=>({...f,payslipNote:e.target.value}))}/></div>
          </div>
        </div>
      </div>
      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
