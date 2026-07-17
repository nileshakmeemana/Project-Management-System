'use client';
import { LOGO_URL } from '@/lib/branding';
import { convert } from '@/lib/prefs';
/**
 * Document previews — invoice + payslip, styled like the payslip preview template:
 * dark header band → summary strip → info grid → line-item tables → total box → footer note.
 * No signature blocks. Business details come from Settings (payslip settings + business details).
 */

export interface Biz {
  name?: string; address?: string; email?: string; phone?: string;
  note?: string; taxNo?: string; regNo?: string;
  invoicePrefix?: string; payslipPrefix?: string;
  invoiceLogo?: string; payslipLogo?: string;   // uploaded logo data-URLs
}

const money = (v: number, c = 'LKR') =>
  `${c} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dstr = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const band: React.CSSProperties = { background: 'var(--p-fill-brand)', color: '#fff', padding: 'var(--p-space-500)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--p-space-400)' };
const cellL: React.CSSProperties = { fontSize: 'var(--p-font-size-275)', color: 'var(--p-text-secondary)' };
const cellV: React.CSSProperties = { fontWeight: 600, fontSize: 'var(--p-font-size-350)' };

function Band({ biz, title, sub, meta, logo }: { biz: Biz; title: string; sub: string; meta: string; logo?: string }) {
  return (
    <div style={band}>
      <div style={{ display: 'flex', gap: 'var(--p-space-300)', alignItems: 'flex-start' }}>
        <img src={logo || LOGO_URL} alt="" style={{ height: 64, width: 'auto', objectFit: 'contain' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--p-font-size-350)' }}>{biz.name || 'Designer Craft'}</div>
          {biz.address && <div style={{ fontSize: 'var(--p-font-size-300)', opacity: .8, marginTop: 4 }}>{biz.address}</div>}
          <div style={{ fontSize: 'var(--p-font-size-300)', opacity: .8 }}>{[biz.email, biz.phone].filter(Boolean).join(' · ')}</div>
          {(biz.taxNo || biz.regNo) && <div style={{ fontSize: 'var(--p-font-size-275)', opacity: .7 }}>{[biz.taxNo && `Tax: ${biz.taxNo}`, biz.regNo && `Reg: ${biz.regNo}`].filter(Boolean).join(' · ')}</div>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 'var(--p-font-size-275)', opacity: .7, textTransform: 'uppercase', letterSpacing: '.08em' }}>{sub}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 'var(--p-font-size-300)', opacity: .8 }}>{meta}</div>
      </div>
    </div>
  );
}

function Strip({ cells }: { cells: [string, React.ReactNode][] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length},1fr)`, background: 'var(--p-surface-secondary)', borderBottom: '.0625rem solid var(--p-border)' }}>
      {cells.map(([l, v]) => (
        <div key={l} style={{ padding: 'var(--p-space-300) var(--p-space-400)', borderRight: '.0625rem solid var(--p-border)' }}>
          <div style={cellL}>{l}</div>
          <div style={cellV}>{v}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Invoice preview ─────────── */
export function InvoicePreview({ invoice, biz }: { invoice: any; biz: Biz }) {
  const c = invoice.currency || 'LKR';
  const rows: [string, number][] = [
    [invoice.description || invoice.projectName || 'Project work', invoice.amount || 0],
    ...(invoice.addons || []).filter((a: any) => a.description || a.amount).map((a: any) => [a.description || 'Add-on', a.amount || 0] as [string, number]),
  ];
  const total = invoice.total ?? rows.reduce((s, [, a]) => s + a, 0);
  return (
    <div style={{ border: '.0625rem solid var(--p-border)', borderRadius: 'var(--p-border-radius-200)', overflow: 'hidden', background: 'var(--p-surface)' }}>
      <Band biz={biz} title="INVOICE" sub="Tax Invoice" meta={invoice.number || ''} logo={biz.invoiceLogo} />
      <Strip cells={[
        ['Total', money(total, c)],
        ['Status', <span key="s" style={{ textTransform: 'capitalize' }}>{invoice.status || 'draft'}</span>],
        ['Invoice date', dstr(invoice.date || new Date())],
        ['Due date', dstr(invoice.dueDate)],
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '.0625rem solid var(--p-border)' }}>
        <div style={{ padding: 'var(--p-space-400)', borderRight: '.0625rem solid var(--p-border)' }}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--p-space-200)' }}>Bill To</div>
          <p style={{ fontSize: 'var(--p-font-size-325)', lineHeight: 1.8, color: 'var(--p-text-secondary)' }}>
            <b style={{ color: 'var(--p-text)' }}>{invoice.clientName || '—'}</b>
            {invoice.projectName && <><br />Project: {invoice.projectName}</>}
          </p>
        </div>
        <div style={{ padding: 'var(--p-space-400)' }}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--p-space-200)' }}>Payment Information</div>
          <p style={{ fontSize: 'var(--p-font-size-325)', lineHeight: 1.8, color: 'var(--p-text-secondary)' }}>
            <b style={{ color: 'var(--p-text)' }}>Currency:</b> {c}<br />
            <b style={{ color: 'var(--p-text)' }}>Status:</b> <span style={{ textTransform: 'capitalize' }}>{invoice.status || 'draft'}</span>
            {invoice.paidAt && <><br /><b style={{ color: 'var(--p-text)' }}>Paid:</b> {dstr(invoice.paidAt)}</>}
          </p>
        </div>
      </div>
      <div style={{ padding: 'var(--p-space-400)' }}>
        <div style={{ fontWeight: 600, marginBottom: 'var(--p-space-300)' }}>Line Items</div>
        <table className="p-table" style={{ marginBottom: 'var(--p-space-400)' }}>
          <thead><tr><th style={{ textAlign: 'left', minWidth: 180 }}>Description</th><th className="td-num">Amount</th></tr></thead>
          <tbody>
            {rows.map(([d, a], i) => <tr key={i}><td>{d}</td><td className="td-num">{money(a, c)}</td></tr>)}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--p-surface-secondary)', border: '.0625rem solid var(--p-border)', borderRadius: 'var(--p-border-radius-200)', padding: 'var(--p-space-400)', marginBottom: 'var(--p-space-400)' }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--p-font-size-350)' }}>Invoice Total</span>
          <strong style={{ fontSize: '1.25rem', fontWeight: 700 }}>{money(total, c)}</strong>
        </div>
        {biz.note && <p style={{ fontSize: 'var(--p-font-size-275)', color: 'var(--p-text-secondary)', fontStyle: 'italic' }}>{biz.note}</p>}
      </div>
    </div>
  );
}

/* ─────────── Payslip preview ─────────── */
export function PayslipPreview({ payslip, biz }: { payslip: any; biz: Biz }) {
  const c = payslip.currency || 'LKR';
  const emp = payslip.employee || {};
  const tasks = (payslip.tasks || []).filter((t: any) => typeof t === 'object');
  // Tasks may be recorded in different currencies — convert each into the payslip currency
  const taskAmt = (t: any) => convert(t.approvedAmount || t.requestedAmount || 0, t.currency || 'LKR', c);
  const gross = payslip.grossAmount ?? tasks.reduce((s: number, t: any) => s + taskAmt(t), 0);
  const net = payslip.netAmount ?? (gross + (payslip.bonus || 0) - (payslip.deductions || 0));
  const hours = tasks.reduce((s: number, t: any) => s + (t.hours || 0), 0);
  return (
    <div style={{ border: '.0625rem solid var(--p-border)', borderRadius: 'var(--p-border-radius-200)', overflow: 'hidden', background: 'var(--p-surface)' }}>
      <Band biz={biz} title="PAYSLIP" sub="Employee Payslip" meta={`Generated ${dstr(payslip.createdAt || new Date())}`} logo={biz.payslipLogo} />
      <Strip cells={[
        ['Net Pay', money(net, c)],
        ['Pay Period', payslip.period || '—'],
        ['Currency', c],
        ['Approved Tasks', tasks.length],
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '.0625rem solid var(--p-border)' }}>
        <div style={{ padding: 'var(--p-space-400)', borderRight: '.0625rem solid var(--p-border)' }}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--p-space-200)' }}>Employee Information</div>
          <p style={{ fontSize: 'var(--p-font-size-325)', lineHeight: 1.8, color: 'var(--p-text-secondary)' }}>
            <b style={{ color: 'var(--p-text)' }}>Name:</b> {emp.name || '—'}<br />
            <b style={{ color: 'var(--p-text)' }}>ID:</b> {emp.employeeId || '—'}<br />
            <b style={{ color: 'var(--p-text)' }}>Position:</b> {emp.position || '—'}
          </p>
        </div>
        <div style={{ padding: 'var(--p-space-400)' }}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--p-space-200)' }}>Payment Information</div>
          <p style={{ fontSize: 'var(--p-font-size-325)', lineHeight: 1.8, color: 'var(--p-text-secondary)' }}>
            <b style={{ color: 'var(--p-text)' }}>Pay Date:</b> {dstr(payslip.createdAt || new Date())}<br />
            <b style={{ color: 'var(--p-text)' }}>Total Hours:</b> {hours.toFixed(2)}<br />
            <b style={{ color: 'var(--p-text)' }}>Status:</b> <span style={{ textTransform: 'capitalize' }}>{payslip.status || 'preview'}</span>
          </p>
        </div>
      </div>
      <div style={{ padding: 'var(--p-space-400)' }}>
        <div style={{ fontWeight: 600, marginBottom: 'var(--p-space-300)' }}>Earnings</div>
        <table className="p-table" style={{ marginBottom: 'var(--p-space-400)' }}>
          <thead><tr><th style={{ textAlign: 'left', minWidth: 180 }}>Description</th><th className="td-num">Hours</th><th className="td-num">Amount</th></tr></thead>
          <tbody>
            {tasks.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--p-text-secondary)' }}>No approved tasks in this period.</td></tr>}
            {tasks.map((t: any) => (
              <tr key={t._id}>
                <td>{t.title}{(t.clientName || t.category) && <><br /><small style={{ color: 'var(--p-text-secondary)' }}>{[t.clientName, t.category].filter(Boolean).join(' · ')}</small></>}</td>
                <td className="td-num">{(t.hours || 0).toFixed(2)}</td>
                <td className="td-num">{money(taskAmt(t), c)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 600, borderTop: '.0625rem solid var(--p-border)' }}><td>Gross Earnings</td><td /><td className="td-num">{money(gross, c)}</td></tr>
            {(payslip.bonus || 0) > 0 && <tr><td>Bonus / Adjustment</td><td /><td className="td-num">{money(payslip.bonus, c)}</td></tr>}
            {(payslip.deductions || 0) > 0 && <tr><td>Deductions</td><td /><td className="td-num">− {money(payslip.deductions, c)}</td></tr>}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--p-surface-secondary)', border: '.0625rem solid var(--p-border)', borderRadius: 'var(--p-border-radius-200)', padding: 'var(--p-space-400)', marginBottom: 'var(--p-space-400)' }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--p-font-size-350)' }}>Final Net Pay</span>
          <strong style={{ fontSize: '1.25rem', fontWeight: 700 }}>{money(net, c)}</strong>
        </div>
        {biz.note && <p style={{ fontSize: 'var(--p-font-size-275)', color: 'var(--p-text-secondary)', fontStyle: 'italic' }}>{biz.note}</p>}
      </div>
    </div>
  );
}
