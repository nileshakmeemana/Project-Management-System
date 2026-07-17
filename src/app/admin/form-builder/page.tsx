'use client';
import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import TableSkeleton from '@/components/TableSkeleton';
import { DEFAULT_FIELDS, FormField } from '@/lib/formFields';

const TYPES: FormField['type'][] = ['text','number','date','url','textarea'];

export default function FormBuilderPage() {
  const [fields,setFields]=useState<FormField[]>(DEFAULT_FIELDS);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [modal,setModal]=useState(false);
  const [newField,setNewField]=useState({label:'',type:'text' as FormField['type'],required:false});
  const [toast,setToast]=useState('');
  const showToast=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),2400);};

  useEffect(()=>{
    apiCall('GET','/settings').then(d=>{
      const saved=d.settings?.formFields;
      if(Array.isArray(saved)&&saved.length)setFields(saved);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const save=async()=>{
    setSaving(true);
    try{await apiCall('PUT','/settings',{formFields:fields});showToast('Form settings saved!');}
    catch(e:any){showToast(e.message);}finally{setSaving(false);}
  };

  const toggle=(id:string,key:'required'|'visible')=>setFields(f=>f.map(x=>x.id===id?{...x,[key]:!x[key]}:x));
  const updateLabel=(id:string,label:string)=>setFields(f=>f.map(x=>x.id===id?{...x,label}:x));
  const move=(id:string,dir:-1|1)=>{const i=fields.findIndex(f=>f.id===id);if(i+dir<0||i+dir>=fields.length)return;const a=[...fields];[a[i],a[i+dir]]=[a[i+dir],a[i]];setFields(a);};
  const removeField=(id:string)=>{if(!confirm('Remove this field?'))return;setFields(f=>f.filter(x=>x.id!==id));};

  const addField=()=>{
    if(!newField.label.trim()){showToast('Field label is required');return;}
    const key=newField.label.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||`field_${Date.now()}`;
    if(fields.some(f=>f.key===key)){showToast('A field with this name already exists');return;}
    setFields(f=>[...f,{id:`c_${Date.now()}`,key,label:newField.label.trim(),type:newField.type,required:newField.required,visible:true,custom:true}]);
    setModal(false);setNewField({label:'',type:'text',required:false});
    showToast('Field added — remember to Save changes');
  };

  return (
    <div className="content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Submit Form Builder</h2><p>Control what employees see in the Submit Work form</p></div>
        <div className="page-hero-right">
          <button className="btn-secondary" onClick={()=>setModal(true)}><i className="ti ti-plus"/> Add field</button>
          <button className="btn-primary" onClick={save} disabled={saving}><i className="ti ti-device-floppy"/> {saving?'Saving…':'Save changes'}</button>
        </div>
      </div>
      <div className="p-card">
        <div className="p-card-header"><div className="p-card-title"><i className="ti ti-forms"/> <span className="sec-t">Form Fields</span></div><div className="p-card-actions"><span style={{fontSize:'var(--p-font-size-275)',color:'var(--p-text-secondary)'}}>Reorder · Toggle visible/required · Custom fields can be removed</span></div></div>
        {loading?<TableSkeleton rows={7} cols={5}/>:(
        <table className="p-table">
          <thead><tr><th style={{textAlign:"left"}}>Order</th><th style={{textAlign:"left"}}>Field Label</th><th style={{textAlign:"left"}}>Type</th><th style={{textAlign:"left"}}>Visible</th><th style={{textAlign:"left"}}>Required</th><th/></tr></thead>
          <tbody>
            {fields.map((f,i)=>(
              <tr key={f.id} style={{opacity:f.visible?1:.5}}>
                <td><div style={{display:'flex',gap:4}}>
                  <button className="ia-btn" onClick={()=>move(f.id,-1)} disabled={i===0} title="Move up"><i className="ti ti-arrow-up"/></button>
                  <button className="ia-btn" onClick={()=>move(f.id,1)} disabled={i===fields.length-1} title="Move down"><i className="ti ti-arrow-down"/></button>
                </div></td>
                <td><div style={{display:'flex',alignItems:'center',gap:8}}>
                  <input className="p-input" value={f.label} onChange={e=>updateLabel(f.id,e.target.value)} style={{height:'1.75rem',fontSize:'var(--p-font-size-325)'}}/>
                  {f.custom&&<span className="badge badge-pending" style={{flexShrink:0}}>custom</span>}
                </div></td>
                <td><span className="badge badge-draft">{f.type}</span></td>
                <td><label style={{cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  <input type="checkbox" checked={f.visible} onChange={()=>toggle(f.id,'visible')}/> {f.visible?'Visible':'Hidden'}
                </label></td>
                <td><label style={{cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  <input type="checkbox" checked={f.required} onChange={()=>toggle(f.id,'required')} disabled={!f.visible}/> {f.required?'Required':'Optional'}
                </label></td>
                <td>{f.custom&&<button className="ia-btn del" onClick={()=>removeField(f.id)} title="Remove field"><i className="ti ti-trash"/></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>)}
      </div>

      {/* Add custom field */}
      {modal&&(<div className="p-modal-bg open" onClick={()=>setModal(false)}><div className="p-modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
        <div className="p-modal-hd"><h3>Add field</h3><button className="p-modal-x" onClick={()=>setModal(false)}><i className="ti ti-x"/></button></div>
        <div className="p-modal-body">
          <div className="p-field"><label className="p-label">Field label</label><input className="p-input" value={newField.label} onChange={e=>setNewField(f=>({...f,label:e.target.value}))} placeholder="e.g. Revision Count" autoFocus/></div>
          <div className="p-field"><label className="p-label">Type</label>
            <select className="p-input" value={newField.type} onChange={e=>setNewField(f=>({...f,type:e.target.value as any}))}>
              {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'var(--p-font-size-325)'}}>
            <input type="checkbox" checked={newField.required} onChange={e=>setNewField(f=>({...f,required:e.target.checked}))}/> Required field
          </label>
        </div>
        <div className="p-modal-ft"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn-primary" onClick={addField}><i className="ti ti-plus"/> Add field</button></div>
      </div></div>)}
      {toast&&<div className="toast" style={{display:'flex'}}>{toast}</div>}
    </div>
  );
}
