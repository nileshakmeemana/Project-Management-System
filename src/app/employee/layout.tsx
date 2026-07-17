'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

const EMP_NAV = [
  { label:'Workspace', items:[
    { href:'/employee',          label:'Dashboard',     icon:'ti ti-layout-dashboard' },
  ]},
  { label:'Work', dividerBefore:true, items:[
    { href:'/employee/submit',   label:'Submit Task',    icon:'ti ti-send' },
    { href:'/employee/tasks',    label:'My Tasks',       icon:'ti ti-clipboard-list' },
    { href:'/employee/projects', label:'Projects',       icon:'ti ti-folder' },
    { href:'/employee/calendar', label:'Calendar',       icon:'ti ti-calendar-event' },
  ]},
  { label:'Finance', dividerBefore:true, items:[
    { href:'/employee/payroll',  label:'Payroll Report', icon:'ti ti-receipt' },
    { href:'/employee/revenue',  label:'Revenue',        icon:'ti ti-chart-bar' },
  ]},
];

const SEARCH_PAGES = [
  { href:'/employee',          label:'Dashboard',      icon:'ti-layout-dashboard' },
  { href:'/employee/submit',   label:'Submit Task',    icon:'ti-send' },
  { href:'/employee/tasks',    label:'My Tasks',       icon:'ti-clipboard-list' },
  { href:'/employee/projects', label:'Projects',       icon:'ti-folder' },
  { href:'/employee/calendar', label:'Calendar',       icon:'ti-calendar-event' },
  { href:'/employee/payroll',  label:'Payroll Report', icon:'ti-receipt' },
  { href:'/employee/revenue',  label:'Revenue',        icon:'ti-chart-bar' },
  { href:'/employee/settings', label:'Settings',       icon:'ti-settings' },
];

const DEFAULT_NOTIFS = [
  { id:1, icon:'ti-circle-check', text:'LinkedIn carousel — <b>Approved</b>',      sub:'Admin · 2 days ago', unread:true  },
  { id:2, icon:'ti-edit',         text:'Instagram reels — <b>Changes Requested</b>',sub:'Admin · 4 days ago', unread:true  },
  { id:3, icon:'ti-cash',         text:'SEO setup notes — <b>Paid</b>',             sub:'Admin · 5 days ago', unread:false },
];

function EmployeeLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth('employee');

  if (loading || !user) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#1a1a1a' }} />
  );

  return (
    <div style={{ display:'flex', width:'100%', minHeight:'100vh', background:'#1a1a1a' }}>
      <Sidebar sections={EMP_NAV} user={user} onLogout={logout} />
      <div className="main">
        <div className="main-inner">
          <Topbar searchPages={SEARCH_PAGES} />
          {children}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .btn-secondary,a.btn-secondary{display:inline-flex;align-items:center;gap:.25rem;background:#fff;color:#303030;border:none;border-radius:.375rem;padding:0 .75rem;height:2rem;font-size:.8125rem;font-weight:550;font-family:inherit;cursor:pointer;white-space:nowrap;line-height:1;text-decoration:none;box-shadow:0 -.0625rem 0 0 #b5b5b5 inset,0 0 0 .0625rem #0000001a inset,0 .03125rem 0 .09375rem #fff inset;}
        .btn-secondary:hover,a.btn-secondary:hover{background:#f7f7f7;}
        .btn-primary,a.btn-primary{display:inline-flex;align-items:center;gap:.25rem;background:#303030;color:#fff;border:none;border-radius:.375rem;padding:0 .75rem;height:2rem;font-size:.8125rem;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;line-height:1;text-decoration:none;}
        .btn-primary:hover,a.btn-primary:hover{background:#1a1a1a;}
        .p-card-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.75rem 1rem;border-bottom:.0625rem solid #e3e3e3;min-height:2.75rem;}
      `}</style>
      <EmployeeLayoutInner>{children}</EmployeeLayoutInner>
    </>
  );
}
