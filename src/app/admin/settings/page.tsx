'use client';
import { useEffect, useState } from 'react';
import { apiCall, getUser, setSession, getToken } from '@/lib/api';
import { reloadPrefs } from '@/lib/prefs';
import { fileToLogoDataUrl } from '@/lib/branding';

const CURRENCIES = ['LKR','AUD','USD'];
const DATE_FORMATS = ['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'];
const TIMEZONES = ['Asia/Colombo','Australia/Sydney','Australia/Melbourne','Australia/Brisbane','Australia/Perth','UTC','America/New_York','America/Los_Angeles','Europe/London','Asia/Singapore','Asia/Dubai','Asia/Kolkata'];
const APPROVAL_MODES = [
  { value:'email-admin', label:'Email verification + admin approval' },
  { value:'email-only',  label:'Email verification only' },
  { value:'admin-only',  label:'Admin approval only' },
];

export default function AdminSettingsPage() {
  const user=getUser();
  const [biz,setBiz]=useState({name:'Designer Craft',address:'Business Address, Sri Lanka',email:'hello@designercraft.local',phone:'+94 77 000 0000',authorized:'Nilesh Akmeemana',authPosition:'Owner / Manager',invoicePrefix:'INV-',payslipNote:'This payslip is issued for the pay period stated above and serves as a record of approved payment.'});
  const [prefs,setPrefs]=useState({baseCurrency:'LKR',dateFormat:'DD/MM/YYYY',timezone:'Asia/Colombo',approvalMode:'email-admin'});
  const [profile,setProfile]=useState({name:user?.name||'',position:user?.position||'',phone:user?.phone||'',email:user?.email||''});
  const [invoiceLogo,setInvoiceLogo]=useState<string>('');
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState('');
  const showToast=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),2400);};

  // Load persisted settings
  useEffect(()=>{
    apiCall('GET','/settings').then(d=>{
      const s=d.settings||{};
      setPrefs(p=>({...p,
        baseCurrency:s.baseCurrency||p.baseCurrency,
        dateFormat:s.dateFormat||p.dateFormat,
        timezone:s.timezone||p.timezone,
        approvalMode:s.approvalMode||p.approvalMode,
      }));
      if(s.business&&s.business.name)setBiz(b=>({...b,...s.business}));
      if(s.invoiceLogo)setInvoiceLogo(s.invoiceLogo);
    }).catch(()=>{});
  },[]);

  const pickInvoiceLogo=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; e.target.value='';
    if(!f)return;
    try{setInvoiceLogo(await fileToLogoDataUrl(f));showToast('Logo ready — click Save Changes to apply');}
    catch(err:any){showToast(err.message);}
  };

  const saveAll=async()=>{
    setSaving(true);
    try{
      const d=await apiCall('PATCH','/users/me',{name:profile.name,position:profile.position,phone:profile.phone});
      if(getToken())setSession(getToken()!,d.user);
      await apiCall('PUT','/settings',{...prefs,business:biz,invoiceLogo});
      await reloadPrefs(); // apply new currency / date format across the dashboard
      showToast('Settings saved!');
    }catch(e:any){showToast(e.message);}finally{setSaving(false);}
  };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Settings</h2><p>Manage your profile, business details and preferences</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={saveAll} disabled={saving}><i className="ti ti-device-floppy"/> {saving?'Saving…':'Save Changes'}</button></div>
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
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-adjustments"/> <span className="sec-t">Preferences</span></div></div>
          <div className="p-card-body" style={{display:'flex',flexDirection:'column',gap:'var(--p-space-400)'}}>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Base Currency</label>
                <select className="p-input" value={prefs.baseCurrency} onChange={e=>setPrefs(p=>({...p,baseCurrency:e.target.value}))}>
                  {CURRENCIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="p-field"><label className="p-label">Date Format</label>
                <select className="p-input" value={prefs.dateFormat} onChange={e=>setPrefs(p=>({...p,dateFormat:e.target.value}))}>
                  {DATE_FORMATS.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="p-field"><label className="p-label">Timezone</label>
              <select className="p-input" value={prefs.timezone} onChange={e=>setPrefs(p=>({...p,timezone:e.target.value}))}>
                {TIMEZONES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="p-field"><label className="p-label">Account Approval Mode</label>
              <select className="p-input" value={prefs.approvalMode} onChange={e=>setPrefs(p=>({...p,approvalMode:e.target.value}))}>
                {APPROVAL_MODES.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <span style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)'}}>How new employee accounts are approved before they can sign in.</span>
            </div>
          </div>
        </div>
        <div className="p-card" style={{gridColumn:'1 / -1'}}>
          <div className="p-card-header"><div className="p-card-title"><i className="ti ti-building"/> <span className="sec-t">Business Details</span></div></div>
          <div className="p-card-body" style={{display:'flex',flexDirection:'column',gap:'var(--p-space-400)'}}>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Business Name</label><input className="p-input" value={biz.name} onChange={e=>setBiz(f=>({...f,name:e.target.value}))}/></div>
              <div className="p-field"><label className="p-label">Address</label><input className="p-input" value={biz.address} onChange={e=>setBiz(f=>({...f,address:e.target.value}))}/></div>
            </div>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Email</label><input className="p-input" type="email" value={biz.email} onChange={e=>setBiz(f=>({...f,email:e.target.value}))}/></div>
              <div className="p-field"><label className="p-label">Phone</label><input className="p-input" value={biz.phone} onChange={e=>setBiz(f=>({...f,phone:e.target.value}))}/></div>
            </div>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Authorized By</label><input className="p-input" value={biz.authorized} onChange={e=>setBiz(f=>({...f,authorized:e.target.value}))}/></div>
              <div className="p-field"><label className="p-label">Position</label><input className="p-input" value={biz.authPosition} onChange={e=>setBiz(f=>({...f,authPosition:e.target.value}))}/></div>
            </div>
            <div className="p-field">
              <label className="p-label">Invoice Logo <span style={{color:'var(--p-text-secondary)',fontWeight:400}}>(shown in the invoice header & PDF)</span></label>
              <div style={{display:'flex',alignItems:'center',gap:'var(--p-space-300)'}}>
                {invoiceLogo
                  ? <img src={invoiceLogo} alt="Invoice logo" style={{height:48,width:48,objectFit:'contain',border:'.0625rem solid var(--p-border)',borderRadius:'var(--p-border-radius-150)',background:'#fff',padding:4}}/>
                  : <div style={{height:48,width:48,display:'flex',alignItems:'center',justifyContent:'center',border:'.0625rem dashed var(--p-border)',borderRadius:'var(--p-border-radius-150)',color:'var(--p-icon-disabled)'}}><i className="ti ti-photo"/></div>}
                <label className="btn-secondary" style={{cursor:'pointer'}}>
                  <i className="ti ti-upload"/> Upload logo
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={pickInvoiceLogo}/>
                </label>
                {invoiceLogo&&<button className="btn-secondary" style={{color:'var(--p-text-critical)'}} onClick={()=>setInvoiceLogo('')}><i className="ti ti-trash"/> Remove</button>}
              </div>
            </div>
            <div className="p-field"><label className="p-label">Payslip Note</label><textarea className="p-input" rows={2} value={biz.payslipNote} onChange={e=>setBiz(f=>({...f,payslipNote:e.target.value}))}/></div>
          </div>
        </div>
      </div>
      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
