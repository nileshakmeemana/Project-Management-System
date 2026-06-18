'use client';
import { useState } from 'react';

const COLORS = ['#c70a24','#005bd3','#047b5d','#956f00','#8051ff','#303030'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

interface Deadline { id:number; title:string; date:string; color:string; }

const DEFAULT_DEADLINES: Deadline[] = [
  { id:1, title:'Nail Toolz banner delivery',   date:'2026-06-18', color:'#c70a24' },
  { id:2, title:'ANVAYA reels batch',            date:'2026-06-22', color:'#005bd3' },
  { id:3, title:'Second Page blog post due',     date:'2026-06-25', color:'#047b5d' },
  { id:4, title:'Port Stephens email campaign',  date:'2026-07-01', color:'#956f00' },
];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [deadlines, setDeadlines] = useState<Deadline[]>(DEFAULT_DEADLINES);
  const [dlId, setDlId]   = useState(10);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [form, setForm]   = useState({ title:'', date:'', color:COLORS[0] });

  const prev = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const next = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const openModal = (id?: number) => {
    const d = id ? deadlines.find(x=>x.id===id) : null;
    setEditId(id||null);
    setForm(d ? {title:d.title,date:d.date,color:d.color} : {title:'',date:'',color:COLORS[0]});
    setModal(true);
  };
  const saveModal = () => {
    if(!form.title||!form.date) return;
    if(editId) { setDeadlines(dl=>dl.map(d=>d.id===editId?{...d,...form}:d)); }
    else { setDeadlines(dl=>[...dl,{id:dlId,...form}]); setDlId(i=>i+1); }
    setModal(false);
  };
  const remove = (id:number) => setDeadlines(dl=>dl.filter(d=>d.id!==id));

  const first = new Date(year,month,1).getDay();
  const dim   = new Date(year,month+1,0).getDate();
  const dip   = new Date(year,month,0).getDate();
  const monthLabel = new Date(year,month,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});

  const evMap: Record<number,Deadline[]> = {};
  deadlines.forEach(d=>{
    const dd=new Date(d.date);
    if(dd.getFullYear()===year&&dd.getMonth()===month){
      const k=dd.getDate(); if(!evMap[k])evMap[k]=[]; evMap[k].push(d);
    }
  });

  const isToday=(d:number)=>d===now.getDate()&&year===now.getFullYear()&&month===now.getMonth();
  const upcoming=[...deadlines].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).filter(d=>new Date(d.date)>=new Date(now.toDateString()));
  const thisWeek=upcoming.filter(d=>{const diff=(new Date(d.date).getTime()-new Date(now.toDateString()).getTime())/864e5;return diff>=0&&diff<=7;});

  return (
    <div className="page-content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Calendar</h2><p>Track deadlines and upcoming events</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={()=>openModal()}><i className="ti ti-plus"/> Add deadline</button></div>
      </div>
      <div className="cal-page-grid">
        <div className="p-card">
          <div className="p-card-header">
            <div className="p-card-title"><i className="ti ti-calendar"/> <span className="sec-t">{monthLabel}</span></div>
            <div className="p-card-actions">
              <button className="ia-btn" onClick={prev}><i className="ti ti-chevron-left"/></button>
              <button className="ia-btn" onClick={next}><i className="ti ti-chevron-right"/></button>
            </div>
          </div>
          <div className="cal-big-grid">
            {DAYS.map(d=><div key={d} className="cal-big-hd">{d}</div>)}
            {Array.from({length:first},(_,i)=><div key={`p${i}`} className="cal-big-cell other-month"><span className="cal-day-num">{dip-first+1+i}</span></div>)}
            {Array.from({length:dim},(_,i)=>{const d=i+1;return(
              <div key={d} className={`cal-big-cell${isToday(d)?' today':''}`}>
                <span className="cal-day-num">{d}</span>
                {(evMap[d]||[]).map(e=><div key={e.id} className="cal-ev-pill" style={{background:e.color}} onClick={()=>openModal(e.id)}>{e.title}</div>)}
              </div>
            );})}
            {Array.from({length:(7-((first+dim)%7))%7},(_,i)=><div key={`n${i}`} className="cal-big-cell other-month"><span className="cal-day-num">{i+1}</span></div>)}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--p-space-400)'}}>
          <div className="p-card">
            <div className="p-card-header"><div className="p-card-title"><i className="ti ti-calendar-event"/> <span className="sec-t">Upcoming deadlines</span></div></div>
            <div style={{padding:0}}>
              {upcoming.length===0&&<div style={{padding:'var(--p-space-400)',textAlign:'center',color:'var(--p-text-secondary)'}}>No upcoming deadlines</div>}
              {upcoming.map(d=>{const diff=Math.round((new Date(d.date).getTime()-new Date(now.toDateString()).getTime())/864e5);return(
                <div key={d.id} style={{display:'flex',alignItems:'center',gap:'var(--p-space-300)',padding:'var(--p-space-300) var(--p-space-400)',borderBottom:'.0625rem solid var(--p-border-subdued)'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:d.color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:'var(--p-font-weight-medium)',fontSize:'var(--p-font-size-325)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.title}</div>
                    <div style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)'}}>{new Date(d.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                  </div>
                  <span style={{fontSize:'var(--p-font-size-275)',fontWeight:600,color:diff<=2?'var(--p-text-critical)':'var(--p-text-secondary)',flexShrink:0}}>{diff===0?'Today':diff===1?'Tomorrow':`${diff}d`}</span>
                  <button className="ia-btn" onClick={()=>openModal(d.id)}><i className="ti ti-pencil"/></button>
                  <button className="ia-btn del" onClick={()=>remove(d.id)}><i className="ti ti-trash"/></button>
                </div>
              );})}
            </div>
          </div>
          <div className="p-card">
            <div className="p-card-header"><div className="p-card-title"><i className="ti ti-clock"/> <span className="sec-t">This week</span></div></div>
            <div style={{padding:0}}>
              {thisWeek.length===0&&<div style={{padding:'var(--p-space-400)',textAlign:'center',color:'var(--p-text-secondary)'}}>Nothing due this week</div>}
              {thisWeek.map(d=><div key={d.id} style={{display:'flex',alignItems:'center',gap:'var(--p-space-300)',padding:'var(--p-space-300) var(--p-space-400)',borderBottom:'.0625rem solid var(--p-border-subdued)'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:d.color}}/>
                <span style={{flex:1}}>{d.title}</span>
                <span style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)'}}>{new Date(d.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
              </div>)}
            </div>
          </div>
        </div>
      </div>
      {modal&&(<div className="p-modal-bg open" onClick={()=>setModal(false)}>
        <div className="p-modal" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
          <div className="p-modal-hd"><h3>{editId?'Edit deadline':'Add deadline'}</h3><button className="p-modal-x" onClick={()=>setModal(false)}><i className="ti ti-x"/></button></div>
          <div className="p-modal-body">
            <div className="p-field"><label className="p-label">Title</label><input className="p-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Client delivery" autoFocus/></div>
            <div className="p-field"><label className="p-label">Date</label><input className="p-input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            <div className="p-field"><label className="p-label">Colour</label>
              <div style={{display:'flex',gap:'var(--p-space-200)',marginTop:'var(--p-space-100)'}}>
                {COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:'50%',background:c,border:form.color===c?'3px solid var(--p-text)':'2px solid transparent',cursor:'pointer'}}/>)}
              </div>
            </div>
          </div>
          <div className="p-modal-ft">
            {editId&&<button className="btn-secondary" style={{color:'var(--p-text-critical)',marginRight:'auto'}} onClick={()=>{remove(editId);setModal(false);}}>Delete</button>}
            <button className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveModal}>{editId?'Save changes':'Add deadline'}</button>
          </div>
        </div>
      </div>)}
    </div>
  );
}
