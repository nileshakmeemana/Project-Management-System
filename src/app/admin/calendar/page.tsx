'use client';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import { NotifStore } from '@/lib/notifications';
import TableSkeleton from '@/components/TableSkeleton';

const COLORS=['#c70a24','#005bd3','#047b5d','#956f00','#8051ff','#303030'];
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const EMPTY={title:'',date:'',color:COLORS[1],employees:[] as string[]};

export default function AdminCalendarPage() {
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [deadlines,setDeadlines]=useState<any[]>([]);
  const [employees,setEmployees]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState<string|null>(null);
  const [form,setForm]=useState({...EMPTY});
  const [toast,setToast]=useState('');
  const showToast=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),2400);};

  const fetchAll=async()=>{
    try{
      const [d,u]=await Promise.all([apiCall('GET','/deadlines'),apiCall('GET','/users')]);
      setDeadlines(d.deadlines||[]);
      setEmployees((u.users||[]).filter((x:any)=>x.role==='employee'));
    }catch(e:any){showToast(e.message);}finally{setLoading(false);}
  };
  useEffect(()=>{fetchAll();},[]);

  const prev=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const next=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};

  const openModal=(dl?:any)=>{
    setEditId(dl?._id||null);
    setForm(dl?{title:dl.title,date:dl.date?.slice(0,10)||'',color:dl.color||COLORS[1],employees:(dl.employees||[]).map((e:any)=>e._id||e)}:{...EMPTY});
    setModal(true);
  };

  const toggleEmp=(id:string)=>setForm(f=>({...f,employees:f.employees.includes(id)?f.employees.filter(e=>e!==id):[...f.employees,id]}));

  const saveModal=async()=>{
    if(!form.title||!form.date){showToast('Title and date are required');return;}
    if(!form.employees.length){showToast('Select at least one employee');return;}
    setSaving(true);
    try{
      if(editId)await apiCall('PATCH',`/deadlines/${editId}`,form);
      else{
        await apiCall('POST','/deadlines',form);
        NotifStore.add('ti-calendar-event',`New deadline: "${form.title}" (${form.date})`,'Admin');
      }
      setModal(false);await fetchAll();showToast(editId?'Deadline updated':'Deadline added');
    }catch(e:any){showToast(e.message);}finally{setSaving(false);}
  };

  const remove=async(id:string)=>{
    if(!confirm('Delete this deadline?'))return;
    try{await apiCall('DELETE',`/deadlines/${id}`);await fetchAll();showToast('Deleted');}
    catch(e:any){showToast(e.message);}
  };

  const first=new Date(year,month,1).getDay();
  const dim=new Date(year,month+1,0).getDate();
  const dip=new Date(year,month,0).getDate();
  const evMap:Record<number,any[]>={};
  deadlines.forEach(d=>{const dd=new Date(d.date);if(dd.getFullYear()===year&&dd.getMonth()===month){const k=dd.getDate();(evMap[k]=evMap[k]||[]).push(d);}});
  const isToday=(d:number)=>d===now.getDate()&&year===now.getFullYear()&&month===now.getMonth();
  const upcoming=[...deadlines].sort((a,b)=>+new Date(a.date)-+new Date(b.date)).filter(d=>new Date(d.date)>=new Date(now.toDateString()));
  const names=(d:any)=>(d.employees?.length?d.employees.map((e:any)=>e.name):[d.employee?.name]).filter(Boolean).join(', ')||'—';

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Calendar</h2><p>Team deadlines and delivery schedule</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={()=>openModal()}><i className="ti ti-plus"/> Add deadline</button></div>
      </div>
      {loading?<div className="p-card"><TableSkeleton rows={6} cols={5}/></div>:(
      <div className="cal-page-grid">
        <div className="p-card">
          <div className="p-card-header">
            <div className="p-card-title"><i className="ti ti-calendar"/> <span className="sec-t">{new Date(year,month,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span></div>
            <div className="p-card-actions"><button className="ia-btn" onClick={prev}><i className="ti ti-chevron-left"/></button><button className="ia-btn" onClick={next}><i className="ti ti-chevron-right"/></button></div>
          </div>
          <div className="cal-big-grid">
            {DAYS.map(d=><div key={d} className="cal-big-hd">{d}</div>)}
            {Array.from({length:first},(_,i)=><div key={`p${i}`} className="cal-big-cell other-month"><span className="cal-day-num">{dip-first+1+i}</span></div>)}
            {Array.from({length:dim},(_,i)=>{const d=i+1;return(<div key={d} className={`cal-big-cell${isToday(d)?' today':''}`}><span className="cal-day-num">{d}</span>{(evMap[d]||[]).map(e=><div key={e._id} className="cal-ev-pill" style={{background:e.color}} title={`${e.title} — ${names(e)}`} onClick={()=>openModal(e)}>{e.title}</div>)}</div>);})}
            {Array.from({length:(7-((first+dim)%7))%7},(_,i)=><div key={`n${i}`} className="cal-big-cell other-month"><span className="cal-day-num">{i+1}</span></div>)}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--p-space-400)'}}>
          <div className="p-card">
            <div className="p-card-header"><div className="p-card-title"><i className="ti ti-calendar-event"/> <span className="sec-t">Upcoming</span></div></div>
            <div style={{padding:0}}>
              {upcoming.length===0&&<div style={{padding:'var(--p-space-400)',textAlign:'center',color:'var(--p-text-secondary)'}}>No upcoming deadlines</div>}
              {upcoming.map(d=>{const diff=Math.round((+new Date(d.date)-+new Date(now.toDateString()))/864e5);return(
                <div key={d._id} style={{display:'flex',alignItems:'center',gap:'var(--p-space-300)',padding:'var(--p-space-300) var(--p-space-400)',borderBottom:'.0625rem solid var(--p-border-subdued)'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:d.color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:'var(--p-font-weight-medium)',fontSize:'var(--p-font-size-325)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.title}</div>
                    <div style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{names(d)} · {new Date(d.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                  </div>
                  <span style={{fontSize:'var(--p-font-size-275)',fontWeight:600,color:diff<=2?'var(--p-text-critical)':'var(--p-text-secondary)',flexShrink:0}}>{diff===0?'Today':diff===1?'Tomorrow':`${diff}d`}</span>
                  <button className="ia-btn" onClick={()=>openModal(d)}><i className="ti ti-pencil"/></button>
                  <button className="ia-btn del" onClick={()=>remove(d._id)}><i className="ti ti-trash"/></button>
                </div>
              );})}
            </div>
          </div>
        </div>
      </div>)}
      {modal&&(<div className="p-modal-bg open" onClick={()=>setModal(false)}><div className="p-modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
        <div className="p-modal-hd"><h3>{editId?'Edit deadline':'Add deadline'}</h3><button className="p-modal-x" onClick={()=>setModal(false)}><i className="ti ti-x"/></button></div>
        <div className="p-modal-body">
          <div className="p-field"><label className="p-label">Title</label><input className="p-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Client delivery" autoFocus/></div>
          <div className="p-field"><label className="p-label">Date</label><input className="p-input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
          <div className="p-field">
            <label className="p-label">Employees <span style={{color:'var(--p-text-secondary)',fontWeight:400}}>(select one or many — only they will see it)</span></label>
            <div style={{border:'.0625rem solid var(--p-border)',borderRadius:'var(--p-border-radius-150)',maxHeight:150,overflowY:'auto'}}>
              {employees.map((e:any)=>(
                <label key={e._id} style={{display:'flex',alignItems:'center',gap:'var(--p-space-200)',padding:'var(--p-space-200) var(--p-space-300)',cursor:'pointer',borderBottom:'.0625rem solid var(--p-border-subdued)',fontSize:'var(--p-font-size-325)'}}>
                  <input type="checkbox" checked={form.employees.includes(e._id)} onChange={()=>toggleEmp(e._id)} style={{cursor:'pointer'}}/>
                  <span style={{flex:1}}>{e.name}</span>
                  <span style={{color:'var(--p-text-secondary)',fontSize:'var(--p-font-size-275)'}}>{e.position||'Employee'}</span>
                </label>
              ))}
              {employees.length===0&&<div style={{padding:'var(--p-space-300)',color:'var(--p-text-secondary)',fontSize:'var(--p-font-size-325)'}}>No employees found</div>}
            </div>
          </div>
          <div className="p-field"><label className="p-label">Colour</label><div style={{display:'flex',gap:'var(--p-space-200)',marginTop:'var(--p-space-100)'}}>{COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:'50%',background:c,border:form.color===c?'3px solid var(--p-text)':'2px solid transparent',cursor:'pointer'}}/>)}</div></div>
        </div>
        <div className="p-modal-ft">{editId&&<button className="btn-secondary" style={{color:'var(--p-text-critical)',marginRight:'auto'}} onClick={()=>{remove(editId);setModal(false);}}>Delete</button>}<button className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn-primary" onClick={saveModal} disabled={saving}>{saving?'Saving…':editId?'Save changes':'Add deadline'}</button></div>
      </div></div>)}
      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
