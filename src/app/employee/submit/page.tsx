'use client';
import { NotifStore } from '@/lib/notifications';
import Pagination from '@/components/Pagination';
import TableSkeleton from '@/components/TableSkeleton';
import TaskDrawer from '@/components/TaskDrawer';
import { useEffect, useMemo, useState } from 'react';
import { apiCall, getUser } from '@/lib/api';
import { fmtAmt, fmtDate, usePrefs } from '@/lib/prefs';
import { DEFAULT_FIELDS, FormField } from '@/lib/formFields';

const PAGE_SIZE = 30;

const BADGE: Record<string,string> = {
  'Assigned':'badge-pending','Accepted':'badge-paid','Declined':'badge-high',
  'Pending Review':'badge-pending','Approved':'badge-paid','Paid':'badge-paid',
  'Rejected':'badge-high','Changes Requested':'badge-med',
};

// Tasks you can currently submit work to
const SUBMITTABLE = ['Assigned','Accepted','Changes Requested'];

export default function SubmitWorkPage() {
  usePrefs();
  const user = getUser();
  const [tasks, setTasks]         = useState<any[]>([]);
  const [projects, setProjects]   = useState<any[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [toast, setToast]         = useState('');
  const [detail, setDetail]       = useState<any>(null);

  const [taskId, setTaskId]       = useState('');
  const [selProjects, setSelProjects] = useState<string[]>([]);
  const [form, setForm] = useState({ hours:'', requestedAmount:'', currency: user?.currency || 'LKR', description:'', workLink:'', dateCompleted:'' });
  const [custom, setCustom]       = useState<Record<string,string>>({});

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400); };

  const fetchAll = async () => {
    try {
      const [t, p, s] = await Promise.all([
        apiCall('GET','/tasks?limit=500'),
        apiCall('GET','/projects'),
        apiCall('GET','/settings').catch(() => ({ settings:{} })),
      ]);
      setTasks(t.tasks || []);
      setProjects(p.projects || []);
      const saved = s.settings?.formFields;
      if (Array.isArray(saved) && saved.length) setFormFields(saved);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);

  const submittable = tasks.filter(t => SUBMITTABLE.includes(t.status));
  const selectedTask = useMemo(() => tasks.find(t => t._id === taskId) || null, [tasks, taskId]);

  // Pre-select the projects the admin attached to the task
  useEffect(() => {
    if (!selectedTask) { setSelProjects([]); return; }
    setSelProjects((selectedTask.projects || []).map((p: any) => p?._id || p).filter(Boolean));
    if (selectedTask.status === 'Changes Requested') {
      setForm(f => ({ ...f,
        hours: String(selectedTask.hours || ''), requestedAmount: String(selectedTask.requestedAmount || ''),
        currency: selectedTask.currency || f.currency, description: selectedTask.description || '',
        workLink: selectedTask.workLink || '', dateCompleted: selectedTask.dateCompleted?.slice(0,10) || '',
      }));
      setCustom(selectedTask.customFields || {});
    }
  }, [selectedTask]); // eslint-disable-line

  const field = (key: string) => formFields.find(f => f.key === key) || { visible:true, required:false, label:key } as FormField;
  const customFields = formFields.filter(f => f.custom && f.visible);

  const toggleProject = (id: string) =>
    setSelProjects(sp => sp.includes(id) ? sp.filter(p => p !== id) : [...sp, id]);

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submitWork = async () => {
    if (!taskId) { showToast('Select the assigned task you are submitting work for'); return; }
    if (field('projects').visible && field('projects').required && !selProjects.length) { showToast('Select at least one project'); return; }
    for (const key of ['dateCompleted','hours','requestedAmount'] as const) {
      const f = field(key);
      if (f.visible && f.required && !form[key]) { showToast(`${f.label} is required`); return; }
    }
    for (const cf of customFields) {
      if (cf.required && !custom[cf.key]) { showToast(`${cf.label} is required`); return; }
    }
    setSubmitting(true);
    try {
      await apiCall('PATCH', `/tasks/${taskId}/submit`, {
        hours: +form.hours || 0, requestedAmount: +form.requestedAmount || 0,
        currency: form.currency, description: form.description,
        workLink: form.workLink, dateCompleted: form.dateCompleted || undefined,
        customFields: custom,
        projects: selProjects,
        projectNames: projects.filter(p => selProjects.includes(p._id)).map(p => p.name),
      });
      NotifStore.taskSubmitted(selectedTask?.title || 'Task');
      setTaskId(''); setSelProjects([]); setCustom({});
      setForm({ hours:'', requestedAmount:'', currency:user?.currency||'LKR', description:'', workLink:'', dateCompleted:'' });
      await fetchAll();
      showToast('Work submitted for review!');
    } catch (err: any) { showToast(err.message || 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  const stats = {
    assigned: tasks.filter(t=>['Assigned','Accepted'].includes(t.status)).length,
    pending:  tasks.filter(t=>t.status==='Pending Review').length,
    approved: tasks.filter(t=>t.status==='Approved').length,
    changes:  tasks.filter(t=>t.status==='Changes Requested').length,
    paid:     tasks.filter(t=>t.status==='Paid').length,
    rejected: tasks.filter(t=>t.status==='Rejected').length,
  };

  const filtered = tasks.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.title?.toLowerCase().includes(q) || t.clientName?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
  });
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const renderCustomInput = (cf: FormField) => {
    const common = { className:'p-input', value: custom[cf.key] || '', onChange: (e: any) => setCustom(c => ({ ...c, [cf.key]: e.target.value })) };
    if (cf.type === 'textarea') return <textarea rows={2} {...common} />;
    return <input type={cf.type === 'text' ? 'text' : cf.type} {...common} />;
  };

  return (
    <div className="page-content">
      <div className="page-hero">
        <div className="page-hero-left"><h2>Submit Work</h2><p>Submit completed work for tasks assigned to you</p></div>
      </div>

      {/* Stat cards */}
      <div className="stat-row">
        <div className="stat-card"><div className="stat-label"><i className="ti ti-send" /> <span className="sec-t">Assigned</span></div><div className="stat-value">{stats.assigned}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-clock" /> <span className="sec-t">Pending Review</span></div><div className="stat-value">{stats.pending}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-check" /> <span className="sec-t">Approved</span></div><div className="stat-value up">{stats.approved}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-edit" /> <span className="sec-t">Changes Req.</span></div><div className="stat-value">{stats.changes}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-cash" /> <span className="sec-t">Paid</span></div><div className="stat-value">{stats.paid}</div></div>
        <div className="stat-card"><div className="stat-label"><i className="ti ti-circle-x" /> <span className="sec-t">Rejected</span></div><div className="stat-value">{stats.rejected}</div></div>
      </div>

      {/* Submit work form */}
      <div className="p-card" style={{ marginBottom:'var(--p-space-400)' }}>
        <div className="p-card-header"><div className="p-card-title"><i className="ti ti-send" /> <span className="sec-t">Submit Work</span></div>
          <span style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>Only tasks assigned to you by the admin can receive submissions</span>
        </div>
        {loading ? <TableSkeleton rows={4} cols={4} /> : (
        <div className="p-card-body">
          <div className="p-field">
            <label className="p-label">Task <span style={{ color:'var(--p-text-critical)' }}>*</span></label>
            <select className="p-input" value={taskId} onChange={e => setTaskId(e.target.value)}>
              <option value="">Select an assigned task…</option>
              {submittable.map(t => <option key={t._id} value={t._id}>{t.title}{t.clientName?` — ${t.clientName}`:''} ({t.status})</option>)}
            </select>
            {submittable.length === 0 && <span style={{ fontSize:'var(--p-font-size-275)', color:'var(--p-text-secondary)' }}>No tasks are currently awaiting your work. New tasks appear here once the admin assigns them to you.</span>}
          </div>

          {selectedTask && (
            <>
              <div style={{ display:'flex', gap:'var(--p-space-200)', flexWrap:'wrap', padding:'var(--p-space-200) 0' }}>
                <span className="badge badge-draft"><i className="ti ti-briefcase" style={{ fontSize:11 }} /> {selectedTask.clientName || 'No client'}</span>
                {selectedTask.category && <span className="badge badge-draft"><i className="ti ti-tag" style={{ fontSize:11 }} /> {selectedTask.category}</span>}
                <span className={`badge ${BADGE[selectedTask.status]}`}>{selectedTask.status}</span>
              </div>
              {selectedTask.description && <p style={{ fontSize:'var(--p-font-size-325)', color:'var(--p-text-secondary)', marginBottom:'var(--p-space-200)' }}><i className="ti ti-info-circle" style={{ fontSize:12 }} /> Brief: {selectedTask.description}</p>}

              {field('projects').visible && (
                <div className="p-field">
                  <label className="p-label">{field('projects').label || 'Projects'} {field('projects').required && <span style={{ color:'var(--p-text-critical)' }}>*</span>} <span style={{ color:'var(--p-text-secondary)', fontWeight:400 }}>(1 or many)</span></label>
                  <div style={{ border:'.0625rem solid var(--p-border)', borderRadius:'var(--p-border-radius-150)', maxHeight:140, overflowY:'auto' }}>
                    {projects.length === 0 && <div style={{ padding:'var(--p-space-300)', color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-325)' }}>No projects yet — ask the admin to create one</div>}
                    {projects.map((p: any) => (
                      <label key={p._id} style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)', padding:'var(--p-space-200) var(--p-space-300)', cursor:'pointer', borderBottom:'.0625rem solid var(--p-border-subdued)', fontSize:'var(--p-font-size-325)' }}>
                        <input type="checkbox" checked={selProjects.includes(p._id)} onChange={() => toggleProject(p._id)} style={{ cursor:'pointer' }} />
                        <span style={{ flex:1 }}>{p.name}</span>
                        <span style={{ color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-275)' }}>{p.clientName || ''}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-grid2">
                {field('dateCompleted').visible && (
                  <div className="p-field">
                    <label className="p-label">{field('dateCompleted').label} {field('dateCompleted').required && <span style={{ color:'var(--p-text-critical)' }}>*</span>}</label>
                    <input className="p-input" type="date" value={form.dateCompleted} onChange={setF('dateCompleted')} />
                  </div>
                )}
                {field('hours').visible && (
                  <div className="p-field">
                    <label className="p-label">{field('hours').label} {field('hours').required && <span style={{ color:'var(--p-text-critical)' }}>*</span>}</label>
                    <input className="p-input" type="number" step="0.25" min="0" value={form.hours} onChange={setF('hours')} placeholder="0.00" />
                  </div>
                )}
              </div>
              <div className="p-grid2">
                {field('requestedAmount').visible && (
                  <div className="p-field">
                    <label className="p-label">{field('requestedAmount').label} {field('requestedAmount').required && <span style={{ color:'var(--p-text-critical)' }}>*</span>}</label>
                    <input className="p-input" type="number" min="0" value={form.requestedAmount} onChange={setF('requestedAmount')} placeholder="0.00" />
                  </div>
                )}
                {field('currency').visible && (
                  <div className="p-field">
                    <label className="p-label">{field('currency').label}</label>
                    <select className="p-input" value={form.currency} onChange={setF('currency')}>
                      <option value="LKR">LKR</option><option value="AUD">AUD</option><option value="USD">USD</option>
                    </select>
                  </div>
                )}
              </div>
              {field('workLink').visible && (
                <div className="p-field">
                  <label className="p-label">{field('workLink').label} {field('workLink').required ? <span style={{ color:'var(--p-text-critical)' }}>*</span> : <span>(optional)</span>}</label>
                  <input className="p-input" type="url" value={form.workLink} onChange={setF('workLink')} placeholder="Drive, Canva, website link…" />
                </div>
              )}
              {customFields.length > 0 && (
                <div className="p-grid2">
                  {customFields.map(cf => (
                    <div key={cf.id} className="p-field">
                      <label className="p-label">{cf.label} {cf.required && <span style={{ color:'var(--p-text-critical)' }}>*</span>}</label>
                      {renderCustomInput(cf)}
                    </div>
                  ))}
                </div>
              )}
              {field('description').visible && (
                <div className="p-field">
                  <label className="p-label">{field('description').label} {field('description').required && <span style={{ color:'var(--p-text-critical)' }}>*</span>}</label>
                  <textarea className="p-input" rows={3} value={form.description} onChange={setF('description')} placeholder="What was done, notes for the admin…" />
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className="btn-primary" onClick={submitWork} disabled={submitting}><i className="ti ti-send" /> {submitting ? 'Submitting…' : 'Submit for review'}</button>
              </div>
            </>
          )}
        </div>
        )}
      </div>

      {/* My submissions */}
      <div className="p-table-wrap">
        <div className="p-toolbar">
          <div className="p-search">
            <span className="p-search-icon"><i className="ti ti-search" /></span>
            <input type="text" placeholder="Search my tasks…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? <TableSkeleton rows={6} cols={6} /> : (
          <table className="p-table">
            <thead>
              <tr>
                <th style={{textAlign:"left",minWidth:180}}>Task</th><th style={{textAlign:"left"}}>Client</th>
                <th style={{textAlign:"left"}}>Projects</th>
                <th className="td-num">Hours</th><th className="td-num">Requested</th>
                <th style={{textAlign:"left"}}>Date</th><th style={{textAlign:"left"}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:'var(--p-space-800)', color:'var(--p-text-secondary)' }}>No tasks yet.</td></tr>}
              {paginated.map(t => (
                <tr key={t._id} className="row-click" onClick={() => setDetail(t)}>
                  <td style={{ fontWeight:'var(--p-font-weight-medium)' }}>{t.title}</td>
                  <td className="td-muted">{t.clientName||'—'}</td>
                  <td className="td-muted">{(t.projectNames||[]).join(', ')||'—'}</td>
                  <td className="td-num td-muted">{t.hours||0}</td>
                  <td className="td-num td-muted">{t.requestedAmount?fmtAmt(t.requestedAmount,t.currency):'—'}</td>
                  <td className="td-muted">{t.dateCompleted?fmtDate(t.dateCompleted):'—'}</td>
                  <td><span className={`badge ${BADGE[t.status]||'badge-draft'}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        <div className="p-table-footer">{paginated.length} task{filtered.length!==1?'s':''}</div>
      </div>

      <TaskDrawer task={detail} onClose={() => setDetail(null)} />
      {toast && <div className="toast" style={{ display:'flex' }}>{toast}</div>}
    </div>
  );
}
