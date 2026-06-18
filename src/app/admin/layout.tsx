'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ClientOnly from '@/components/ClientOnly';

const ADMIN_NAV = [
  { label:'Workspace', items:[
    { href:'/admin',                  label:'Dashboard',        icon:'ti ti-layout-dashboard' },
    { href:'/admin/tasks',            label:'Tasks',            icon:'ti ti-checks' },
    { href:'/admin/calendar',         label:'Calendar',         icon:'ti ti-calendar-event' },
  ]},
  { label:'Finance', dividerBefore:true, items:[
    { href:'/admin/revenue',          label:'Revenue',          icon:'ti ti-chart-bar' },
    { href:'/admin/invoices',         label:'Invoices',         icon:'ti ti-file-invoice' },
    { href:'/admin/payroll',          label:'Payroll',          icon:'ti ti-cash' },
  ]},
  { label:'Resources', dividerBefore:true, items:[
    { href:'/admin/employees',        label:'Employees',        icon:'ti ti-users-group' },
    { href:'/admin/clients',          label:'Clients',          icon:'ti ti-users' },
    { href:'/admin/projects',         label:'Projects',         icon:'ti ti-folder' },
  ]},
  { label:'Admin', dividerBefore:true, items:[
    { href:'/admin/submitted-tasks',  label:'Submitted Tasks',  icon:'ti ti-clipboard-list' },
    { href:'/admin/categories',       label:'Task Categories',  icon:'ti ti-tag' },
    { href:'/admin/form-builder',     label:'Form Builder',     icon:'ti ti-forms' },
    { href:'/admin/payslip-settings', label:'Payslip Settings', icon:'ti ti-file-text' },
    { href:'/admin/admin-users',      label:'Admin Users',      icon:'ti ti-shield-half' },
    { href:'/admin/activity-log',     label:'Activity Log',     icon:'ti ti-history' },
  ]},
];

const SEARCH_PAGES = [
  { href:'/admin',                 label:'Dashboard',        icon:'ti-layout-dashboard' },
  { href:'/admin/tasks',           label:'Tasks',            icon:'ti-checks' },
  { href:'/admin/calendar',        label:'Calendar',         icon:'ti-calendar-event' },
  { href:'/admin/revenue',         label:'Revenue',          icon:'ti-chart-bar' },
  { href:'/admin/payroll',         label:'Payroll',          icon:'ti-cash' },
  { href:'/admin/employees',       label:'Employees',        icon:'ti-users-group' },
  { href:'/admin/clients',         label:'Clients',          icon:'ti-users' },
  { href:'/admin/projects',        label:'Projects',         icon:'ti-folder' },
  { href:'/admin/submitted-tasks', label:'Submitted Tasks',  icon:'ti-clipboard-list' },
  { href:'/admin/categories',      label:'Task Categories',  icon:'ti-tag' },
  { href:'/admin/activity-log',    label:'Activity Log',     icon:'ti-history' },
  { href:'/admin/settings',        label:'Settings',         icon:'ti-settings' },
];

const DEFAULT_NOTIFS = [
  { id:1, icon:'ti-user-plus',     text:'New employee <b>Sara Kim</b> joined',   sub:'Admin · 2 days ago', unread:true  },
  { id:2, icon:'ti-clipboard-list',text:'5 tasks awaiting review',                sub:'Admin · 3 days ago', unread:true  },
  { id:3, icon:'ti-cash',          text:'Payroll run for June completed',          sub:'Admin · 1 week ago', unread:false },
  { id:4, icon:'ti-circle-check',  text:'SEO Setup task <b>Approved</b>',         sub:'Admin · 1 week ago', unread:false },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth('admin');
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);

  if (loading || !user) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#1a1a1a' }} />
  );

  return (
    <div style={{ display:'flex', width:'100%', minHeight:'100vh', background:'#1a1a1a' }}>
      <Sidebar sections={ADMIN_NAV} user={user} onLogout={logout} />
      <div className="main">
        <div className="main-inner">
          <Topbar searchPages={SEARCH_PAGES} notifs={notifs} onNotifsUpdate={setNotifs} />
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </ClientOnly>
  );
}
