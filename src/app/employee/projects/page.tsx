'use client';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import { useData } from '@/hooks/useData';
import TableSkeleton from '@/components/TableSkeleton';
import { fmtAmt, fmtDate, usePrefs } from '@/lib/prefs';

const STATUS_BADGE:Record<string,string>={'in-progress':'badge-pending','completed':'badge-paid','on-hold':'badge-med'};
const STATUS_LABEL:Record<string,string>={'in-progress':'In Progress','completed':'Completed','on-hold':'On Hold'};

export default function ProjectsPage() {
  usePrefs(); // re-render on currency / date-format changes
  const [projects,setProjects]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('');
  const [toast,setToast]=useState('');

  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),2400);};

  const fetchProjects=async()=>{
    try{const d=await apiCall('GET','/projects');setProjects(d.projects||[]);}
    catch{setProjects([]);}
    finally{setLoading(false);}
  };
  useEffect(()=>{fetchProjects();},[]);

  const filtered = projects.filter(p => {
    if (filter && p.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.clientName?.toLowerCase().includes(q);
  });

  const stats={total:projects.length,active:projects.filter(p=>p.status==='in-progress').length,done:projects.filter(p=>p.status==='completed').length,value:projects.reduce((s,p)=>s+(p.value||0),0)};

  return (
    <div className="page-content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Projects</h2><p>Track project progress and delivery</p></div>
        <div className="page-hero-right"><span className="badge badge-draft" style={{alignSelf:'center'}}>Projects are managed by the admin</span></div>
      </div>
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-folder"/> Total</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-loader"/> In progress</div><div className="stat-value">{stats.active}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-check"/> Completed</div><div className="stat-value up">{stats.done}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clock"/> On hold</div><div className="stat-value">{projects.filter(p=>p.status==='on-hold').length}</div></div>
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
        {loading ? <TableSkeleton rows={6} cols={5} /> : (
        <table className="p-table">
          <thead><tr><th style={{textAlign:"left"}}>Project</th><th style={{textAlign:"left"}}>Client</th><th style={{textAlign:"left"}}>Progress</th><th style={{textAlign:"left"}}>Due</th><th style={{textAlign:"left"}}>Status</th><th/></tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={6} style={{textAlign:'center',padding:'var(--p-space-800)',color:'var(--p-text-secondary)'}}>No projects found.</td></tr>}
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
                <td className="td-muted">{p.due?new Date(p.due).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—'}</td>
                <td><span className={`badge ${STATUS_BADGE[p.status]||'badge-draft'}`}>{STATUS_LABEL[p.status]||p.status}</span></td>
                <td><div className="row-acts" style={{opacity:1}}>

                </div></td>
              </tr>
            ))}
          </tbody>
        </table>)}
        <div className="p-table-footer">{filtered.length} project{filtered.length!==1?'s':''}</div>
      </div>

      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
