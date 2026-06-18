'use client';
import BulkBar from '@/components/BulkBar';
import Pagination from '@/components/Pagination';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';

const CAT_BADGE:Record<string,string>={task:'badge-pending',payroll:'badge-paid',employee:'badge-draft',auth:'badge-draft',project:'badge-med',settings:'badge-high'};

export default function ActivityLogPage() {
  const [logs,setLogs]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('');

  const fetchLogs=async()=>{
    try{const params=new URLSearchParams();if(filter)params.set('category',filter);const d=await apiCall('GET',`/activity?${params}`);setLogs(d.logs||[]);}
    catch{setLogs([]);}finally{setLoading(false);}
  };
  useEffect(()=>{fetchLogs();},[filter]);

  const filtered=logs.filter(l=>!search||l.action?.toLowerCase().includes(search.toLowerCase())||(l.actorName||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Activity Log</h2><p>Audit trail of all admin and employee actions in the portal</p></div>
        <div className="page-hero-right"><button className="btn-secondary" onClick={()=>{const csv=logs.map(l=>`"${l.action}","${l.actorName}","${l.category}","${new Date(l.createdAt).toLocaleString()}"`).join('\n');const a=document.createElement('a');a.href='data:text/csv,'+encodeURIComponent('Action,Actor,Category,Time\n'+csv);a.download='activity-log.csv';a.click();}}><i className="ti ti-download"/> Export</button></div>
      </div>
      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search"><span className="p-search-icon"><i className="ti ti-search"/></span><input type="text" placeholder="Search activity…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <div className="p-toolbar-end">
            <select className="btn-secondary" style={{height:'2rem',fontSize:'var(--p-font-size-325)',padding:'0 var(--p-space-300)',cursor:'pointer',boxShadow:'var(--p-shadow-button)'}} value={filter} onChange={e=>setFilter(e.target.value)}>
              <option value="">All categories</option><option value="task">Task</option><option value="payroll">Payroll</option><option value="employee">Employee</option><option value="auth">Auth</option><option value="project">Project</option>
            </select>
          </div>
        </div>
        {loading?<div style={{padding:'3rem',textAlign:'center',color:'var(--p-text-secondary)'}}>Loading…</div>:(
        <table className="p-table">
          <thead><tr><th style={{textAlign:"left",minWidth:160}}>Action</th><th style={{textAlign:"left"}}>Actor</th><th style={{textAlign:"left"}}>Target</th><th style={{textAlign:"left"}}>Category</th><th style={{textAlign:"left"}}>Time</th></tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={5} style={{textAlign:'center',padding:'var(--p-space-800)',color:'var(--p-text-secondary)'}}>No activity found.</td></tr>}
            {filtered.map((l,i)=>(
              <tr key={l._id||i}>
                <td style={{fontWeight:'var(--p-font-weight-medium)'}}>{l.action}</td>
                <td className="td-muted">{l.actorName||'System'}</td>
                <td className="td-muted">{l.target||'—'}</td>
                <td><span className={`badge ${CAT_BADGE[l.category]||'badge-draft'}`}>{l.category}</span></td>
                <td className="td-muted">{l.createdAt?new Date(l.createdAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>)}
        <div className="p-table-footer">{filtered.length} log entr{filtered.length!==1?'ies':'y'}</div>
      </div>
    </div>
  );
}
