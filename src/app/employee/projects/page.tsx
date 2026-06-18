'use client';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';

const fmtAmt=(v:number,c='LKR')=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(v||0);}catch{return `${c} ${(v||0).toLocaleString()}`;}};
const STATUS_BADGE:Record<string,string>={'in-progress':'badge-pending','completed':'badge-paid','on-hold':'badge-med'};
const STATUS_LABEL:Record<string,string>={'in-progress':'In Progress','completed':'Completed','on-hold':'On Hold'};
const CLIENTS=['Second Page','Nail Toolz','Dental On Demand','ANVAYA Wellness','Amaree Collective','Port Stephens'];

export default function ProjectsPage() {
  const [projects,setProjects]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('');
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState<string|null>(null);
  const [form,setForm]=useState({name:'',clientName:'',status:'in-progress',progress:0,value:0,currency:'LKR',due:''});
  const [toast,setToast]=useState('');

  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),2400);};

  const fetchProjects=async()=>{
    try{const d=await apiCall('GET','/projects');setProjects(d.projects||[]);}
    catch{setProjects([]);}
    finally{setLoading(false);}
  };
  useEffect(()=>{fetchProjects();},[]);

  const openModal=(p?:any)=>{
    setEditId(p?._id||null);
    setForm(p?{name:p.name,clientName:p.clientName||'',status:p.status||'in-progress',progress:p.progress||0,value:p.value||0,currency:p.currency||'LKR',due:p.due?.slice(0,10)||''}:{name:'',clientName:'',status:'in-progress',progress:0,value:0,currency:'LKR',due:''});
    setModal(true);
  };
  const saveProject=async()=>{
    try{
      if(editId){await apiCall('PATCH',`/projects/${editId}`,form);}
      else{await apiCall('POST','/projects',form);}
      setModal(false);await fetchProjects();showToast(editId?'Project updated!':'Project created!');
    }catch(e:any){showToast(e.message);}
  };
  const deleteProject=async(id:string)=>{
    if(!confirm('Delete this project?'))return;
    try{await apiCall('DELETE',`/projects/${id}`);await fetchProjects();showToast('Project deleted.');}
    catch(e:any){showToast(e.message);}
  };

  const filtered=projects.filter(p=>{
    if(search&&!p.name?.toLowerCase().includes(search.toLowerCase())&&!p.clientName?.toLowerCase().includes(search.toLowerCase()))return false;
    if(filter&&p.status!==filter)return false;
    return true;
  });

  const stats={total:projects.length,active:projects.filter(p=>p.status==='in-progress').length,done:projects.filter(p=>p.status==='completed').length,value:projects.reduce((s,p)=>s+(p.value||0),0)};

  return (
    <div className="page-content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Projects</h2><p>Track project progress and delivery</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={()=>openModal()}><i className="ti ti-plus"/> New project</button></div>
      </div>
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-folder"/> Total</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-loader"/> In progress</div><div className="stat-value">{stats.active}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-check"/> Completed</div><div className="stat-value up">{stats.done}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-currency-dollar"/> Total value</div><div className="stat-value">{fmtAmt(stats.value)}</div></div>
      </div>
      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search"><span className="p-search-icon"><i className="ti ti-search"/></span><input type="text" placeholder="Search projects…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <div className="p-toolbar-end">
            <select className="btn-secondary" style={{height:'2rem',fontSize:'var(--p-font-size-325)',padding:'0 var(--p-space-300)',cursor:'pointer',boxShadow:'var(--p-shadow-button)'}} value={filter} onChange={e=>setFilter(e.target.value)}>
              <option value="">All status</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
        </div>
        {loading?<div style={{padding:'3rem',textAlign:'center',color:'var(--p-text-secondary)'}}>Loading…</div>:(
        <table className="p-table">
          <thead><tr><th style={{textAlign:"left"}}>Project</th><th style={{textAlign:"left"}}>Client</th><th style={{textAlign:"left"}}>Progress</th><th className="td-num">Value</th><th style={{textAlign:"left"}}>Due</th><th style={{textAlign:"left"}}>Status</th><th/></tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={7} style={{textAlign:'center',padding:'var(--p-space-800)',color:'var(--p-text-secondary)'}}>No projects found.</td></tr>}
            {filtered.map(p=>(
              <tr key={p._id}>
                <td style={{fontWeight:'var(--p-font-weight-medium)'}}>{p.name}</td>
                <td className="td-muted">{p.clientName||'—'}</td>
                <td style={{minWidth:140}}>
                  <div style={{display:'flex',alignItems:'center',gap:'var(--p-space-200)'}}>
                    <div style={{flex:1,height:6,background:'var(--p-border)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:3,background:'#005bd3',width:`${p.progress||0}%`}}/>
                    </div>
                    <span style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)',flexShrink:0,minWidth:28}}>{p.progress||0}%</span>
                  </div>
                </td>
                <td className="td-num td-muted">{fmtAmt(p.value,p.currency)}</td>
                <td className="td-muted">{p.due?new Date(p.due).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—'}</td>
                <td><span className={`badge ${STATUS_BADGE[p.status]||'badge-draft'}`}>{STATUS_LABEL[p.status]||p.status}</span></td>
                <td><div className="row-acts" style={{opacity:1}}>
                  <button className="ia-btn" onClick={()=>openModal(p)} title="Edit"><i className="ti ti-pencil"/></button>
                  <button className="ia-btn del" onClick={()=>deleteProject(p._id)} title="Delete"><i className="ti ti-trash"/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>)}
        <div className="p-table-footer">{filtered.length} project{filtered.length!==1?'s':''}</div>
      </div>

      {modal&&(<div className="p-modal-bg open" onClick={()=>setModal(false)}>
        <div className="p-modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
          <div className="p-modal-hd"><h3>{editId?'Edit project':'New project'}</h3><button className="p-modal-x" onClick={()=>setModal(false)}><i className="ti ti-x"/></button></div>
          <div className="p-modal-body">
            <div className="p-field"><label className="p-label">Project Name *</label><input className="p-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Website redesign"/></div>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Client</label>
                <select className="p-input" value={form.clientName} onChange={e=>setForm(f=>({...f,clientName:e.target.value}))}>
                  <option value="">Select client…</option>{CLIENTS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="p-field"><label className="p-label">Status</label>
                <select className="p-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>
            </div>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Progress ({form.progress}%)</label><input className="p-input" type="range" min={0} max={100} value={form.progress} onChange={e=>setForm(f=>({...f,progress:+e.target.value}))}/></div>
              <div className="p-field"><label className="p-label">Due Date</label><input className="p-input" type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))}/></div>
            </div>
            <div className="p-grid2">
              <div className="p-field"><label className="p-label">Value</label><input className="p-input" type="number" value={form.value} onChange={e=>setForm(f=>({...f,value:+e.target.value}))}/></div>
              <div className="p-field"><label className="p-label">Currency</label>
                <select className="p-input" value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                  <option>LKR</option><option>AUD</option><option>USD</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-modal-ft">
            <button className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveProject}><i className="ti ti-device-floppy"/> {editId?'Save changes':'Create project'}</button>
          </div>
        </div>
      </div>)}
      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
