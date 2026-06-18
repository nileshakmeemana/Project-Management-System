'use client';
import { useState } from 'react';

const DEFAULT_FIELDS=[
  {id:1,label:'Task Title',type:'text',required:true,visible:true},
  {id:2,label:'Client Name',type:'select',required:true,visible:true},
  {id:3,label:'Task Category',type:'select',required:false,visible:true},
  {id:4,label:'Date Completed',type:'date',required:true,visible:true},
  {id:5,label:'Total Hours',type:'number',required:true,visible:true},
  {id:6,label:'Requested Amount',type:'number',required:true,visible:true},
  {id:7,label:'Payment Currency',type:'select',required:true,visible:true},
  {id:8,label:'Work Link / File Link',type:'url',required:false,visible:true},
  {id:9,label:'Description',type:'textarea',required:false,visible:true},
];

export default function FormBuilderPage() {
  const [fields,setFields]=useState(DEFAULT_FIELDS);
  const [toast,setToast]=useState('');
  const showToast=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),2400);};

  const toggle=(id:number,key:'required'|'visible')=>setFields(f=>f.map(x=>x.id===id?{...x,[key]:!x[key]}:x));
  const updateLabel=(id:number,label:string)=>setFields(f=>f.map(x=>x.id===id?{...x,label}:x));
  const move=(id:number,dir:-1|1)=>{const i=fields.findIndex(f=>f.id===id);if(i+dir<0||i+dir>=fields.length)return;const a=[...fields];[a[i],a[i+dir]]=[a[i+dir],a[i]];setFields(a);};

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Submit Form Builder</h2><p>Control what employees see in the Submit Task form</p></div>
        <div className="page-hero-right"><button className="btn-primary" onClick={()=>showToast('Form settings saved!')}><i className="ti ti-device-floppy"/> Save changes</button></div>
      </div>
      <div className="p-card">
        <div className="p-card-header"><div className="p-card-title"><i className="ti ti-forms"/> <span className="sec-t">Form Fields</span></div><div className="p-card-actions"><span style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)'}}>Drag to reorder · Toggle visible/required</span></div></div>
        <table className="p-table">
          <thead><tr><th style={{textAlign:"left"}}>Order</th><th style={{textAlign:"left"}}>Field Label</th><th style={{textAlign:"left"}}>Type</th><th style={{textAlign:"left"}}>Visible</th><th style={{textAlign:"left"}}>Required</th></tr></thead>
          <tbody>
            {fields.map((f,i)=>(
              <tr key={f.id} style={{opacity:f.visible?1:.5}}>
                <td><div style={{display:'flex',gap:4}}>
                  <button className="ia-btn" onClick={()=>move(f.id,-1)} disabled={i===0} title="Move up"><i className="ti ti-arrow-up"/></button>
                  <button className="ia-btn" onClick={()=>move(f.id,1)} disabled={i===fields.length-1} title="Move down"><i className="ti ti-arrow-down"/></button>
                </div></td>
                <td><input className="p-input" value={f.label} onChange={e=>updateLabel(f.id,e.target.value)} style={{height:'1.75rem',fontSize:'var(--p-font-size-325)'}}/></td>
                <td><span className="badge badge-draft">{f.type}</span></td>
                <td><label style={{cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  <input type="checkbox" checked={f.visible} onChange={()=>toggle(f.id,'visible')}/> {f.visible?'Visible':'Hidden'}
                </label></td>
                <td><label style={{cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  <input type="checkbox" checked={f.required} onChange={()=>toggle(f.id,'required')} disabled={!f.visible}/> {f.required?'Required':'Optional'}
                </label></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
