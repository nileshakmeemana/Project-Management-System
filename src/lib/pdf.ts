'use client';
/**
 * PDF generation — invoice + payslip (jsPDF), matching the in-app preview template:
 * dark header band → summary strip → info grid → line-item table → total box → footer note.
 * No signature blocks. Business details come from Settings (Payslip Settings + Business Details).
 */
import { jsPDF } from 'jspdf';
import { LOGO_URL } from '@/lib/branding';
import { convert } from '@/lib/prefs';

export interface BizDetails {
  name?: string; address?: string; email?: string; phone?: string;
  note?: string; taxNo?: string; regNo?: string;
  invoicePrefix?: string; payslipPrefix?: string;
  authorized?: string; authPosition?: string;
  invoiceLogo?: string; payslipLogo?: string;   // uploaded logo data-URLs
}

const money = (v: number, c = 'LKR') =>
  `${c} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateStr = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '-';

const INK = '#303030', MUTED = '#616161', LINE = '#e3e3e3', STRIP = '#f7f7f7';
const L = 14, R = 196, W = R - L;

function loadLogo(url = LOGO_URL): Promise<{ data: string; w: number; h: number } | null> {
  return new Promise(resolve => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);   // keep transparency — no white chip behind the logo
          resolve({ data: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch { resolve(null); }
  });
}

/** Dark header band with logo, business info (left) and document title/meta (right). */
async function drawBand(doc: jsPDF, biz: BizDetails, sub: string, title: string, meta: string, logoUrl?: string) {
  const bandH = 34;
  doc.setFillColor(48, 48, 48);
  doc.rect(0, 0, 210, bandH, 'F');

  let x = L;
  const logo = await loadLogo(logoUrl || LOGO_URL);
  if (logo) {
    // Logo fills the header band height (≈64px section → 20mm), no background chip
    const h = 20; const w = Math.max(8, Math.min((logo.w / logo.h) * h, 55));
    try {
      doc.addImage(logo.data, 'PNG', L, (bandH - h) / 2, w, h);
      x = L + w + 8;
    } catch { x = L; }
  }
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(biz.name || 'Designer Craft', x, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  let ly = 18;
  if (biz.address) { doc.text(biz.address, x, ly); ly += 4; }
  const contact = [biz.email, biz.phone].filter(Boolean).join('  ·  ');
  if (contact) { doc.text(contact, x, ly); ly += 4; }
  const reg = [biz.taxNo && `Tax: ${biz.taxNo}`, biz.regNo && `Reg: ${biz.regNo}`].filter(Boolean).join('  ·  ');
  if (reg) doc.text(reg, x, ly);

  doc.setFontSize(7.5); doc.text(sub.toUpperCase(), R, 11, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(title, R, 19, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(meta, R, 25, { align: 'right' });
  return bandH;
}

/** Grey summary strip with n cells, like the preview. */
function drawStrip(doc: jsPDF, y: number, cells: [string, string][]) {
  const h = 14, cw = W / cells.length;
  doc.setFillColor(247, 247, 247);
  doc.rect(L, y, W, h, 'F');
  doc.setDrawColor(LINE);
  cells.forEach(([label, value], i) => {
    const cx = L + i * cw;
    if (i > 0) doc.line(cx, y, cx, y + h);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED);
    doc.text(label, cx + 4, y + 5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(INK);
    doc.text(value, cx + 4, y + 10.5);
  });
  doc.rect(L, y, W, h, 'S');
  return y + h + 8;
}

/** Two-column info grid, like the preview's Employee/Payment info section. */
function drawInfoGrid(doc: jsPDF, y: number, left: { title: string; lines: [string, string][] }, right: { title: string; lines: [string, string][] }) {
  const colW = W / 2;
  let maxY = y;
  [[left, L], [right, L + colW]].forEach(([sec, x0]: any) => {
    let yy = y;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(INK);
    doc.text(sec.title, x0, yy); yy += 5.5;
    sec.lines.forEach(([k, v]: [string, string]) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(INK);
      doc.text(`${k}:`, x0, yy);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(MUTED);
      doc.text(String(v ?? '-'), x0 + doc.getTextWidth(`${k}: `) + 2, yy);
      yy += 4.6;
    });
    maxY = Math.max(maxY, yy);
  });
  doc.setDrawColor(LINE); doc.line(L, maxY + 2, R, maxY + 2);
  return maxY + 9;
}

function drawTotalBox(doc: jsPDF, y: number, label: string, value: string) {
  const h = 12;
  doc.setFillColor(247, 247, 247);
  doc.setDrawColor(LINE);
  doc.roundedRect(L, y, W, h, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(INK);
  doc.text(label, L + 5, y + 7.6);
  doc.setFontSize(12.5);
  doc.text(value, R - 5, y + 7.9, { align: 'right' });
  return y + h + 8;
}

function drawNote(doc: jsPDF, y: number, biz: BizDetails) {
  if (!biz.note) return;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(MUTED);
  doc.text(doc.splitTextToSize(biz.note, 175), L, Math.min(y, 280));
}

/* ─────────── Invoice PDF ─────────── */
export async function downloadInvoicePDF(invoice: any, biz: BizDetails) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const c = invoice.currency || 'LKR';
  const rows: [string, number][] = [
    [invoice.description || invoice.projectName || 'Project work', invoice.amount || 0],
    ...(invoice.addons || []).filter((a: any) => a.description || a.amount).map((a: any) => [a.description || 'Add-on', a.amount || 0] as [string, number]),
  ];
  const total = invoice.total ?? rows.reduce((s, [, a]) => s + a, 0);

  let y = await drawBand(doc, biz, 'Tax Invoice', 'INVOICE', invoice.number || '', biz.invoiceLogo);
  y += 8;
  y = drawStrip(doc, y, [
    ['TOTAL', money(total, c)],
    ['STATUS', (invoice.status || 'draft').toUpperCase()],
    ['INVOICE DATE', dateStr(invoice.date || new Date())],
    ['DUE DATE', dateStr(invoice.dueDate)],
  ]);
  y = drawInfoGrid(doc, y,
    { title: 'Bill To', lines: [['Client', invoice.clientName || '-'], ...(invoice.projectName ? [['Project', invoice.projectName] as [string,string]] : [])] },
    { title: 'Payment Information', lines: [['Currency', c], ['Status', invoice.status || 'draft'], ...(invoice.paidAt ? [['Paid', dateStr(invoice.paidAt)] as [string,string]] : [])] }
  );

  // Line items
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(INK);
  doc.text('Line Items', L, y); y += 4;
  doc.setFillColor(247, 247, 247); doc.rect(L, y, W, 7, 'F');
  doc.setFontSize(8); doc.setTextColor(MUTED);
  doc.text('DESCRIPTION', L + 3, y + 4.8); doc.text('AMOUNT', R - 3, y + 4.8, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(INK);
  rows.forEach(([d, a]) => {
    const lines = doc.splitTextToSize(d, 140);
    doc.text(lines, L + 3, y + 5);
    doc.text(money(a, c), R - 3, y + 5, { align: 'right' });
    const rh = 3.5 + lines.length * 4.4;
    doc.setDrawColor(LINE); doc.line(L, y + rh, R, y + rh);
    y += rh;
  });
  y += 7;
  y = drawTotalBox(doc, y, 'Invoice Total', money(total, c));
  drawNote(doc, y, biz);
  doc.save(`${invoice.number || 'invoice'}.pdf`);
}

/* ─────────── Payslip PDF ─────────── */
export async function downloadPayslipPDF(payslip: any, biz: BizDetails) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const c = payslip.currency || 'LKR';
  const emp = payslip.employee || {};
  const tasks = (payslip.tasks || []).filter((t: any) => typeof t === 'object');
  // Convert each task from its own currency into the payslip currency
  const taskAmt = (t: any) => convert(t.approvedAmount || t.requestedAmount || 0, t.currency || 'LKR', c);
  const gross = payslip.grossAmount ?? tasks.reduce((s: number, t: any) => s + taskAmt(t), 0);
  const net = payslip.netAmount ?? (gross + (payslip.bonus || 0) - (payslip.deductions || 0));
  const hours = tasks.reduce((s: number, t: any) => s + (t.hours || 0), 0);

  let y = await drawBand(doc, biz, 'Employee Payslip', 'PAYSLIP', `Generated ${dateStr(payslip.createdAt || new Date())}`, biz.payslipLogo);
  y += 8;
  y = drawStrip(doc, y, [
    ['NET PAY', money(net, c)],
    ['PAY PERIOD', payslip.period || '-'],
    ['CURRENCY', c],
    ['APPROVED TASKS', String(tasks.length)],
  ]);
  y = drawInfoGrid(doc, y,
    { title: 'Employee Information', lines: [['Name', emp.name || '-'], ['ID', emp.employeeId || '-'], ['Position', emp.position || '-']] },
    { title: 'Payment Information', lines: [['Pay Date', dateStr(payslip.createdAt || new Date())], ['Total Hours', hours.toFixed(2)], ['Status', payslip.status || 'issued']] }
  );

  // Earnings table
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(INK);
  doc.text('Earnings', L, y); y += 4;
  doc.setFillColor(247, 247, 247); doc.rect(L, y, W, 7, 'F');
  doc.setFontSize(8); doc.setTextColor(MUTED);
  doc.text('DESCRIPTION', L + 3, y + 4.8);
  doc.text('HOURS', 150, y + 4.8, { align: 'right' });
  doc.text('AMOUNT', R - 3, y + 4.8, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(INK);
  if (!tasks.length) { doc.setTextColor(MUTED); doc.text('No approved tasks in this period.', L + 3, y + 5); y += 8; }
  tasks.slice(0, 16).forEach((t: any) => {
    const lines = doc.splitTextToSize(t.title || '-', 110);
    doc.setTextColor(INK);
    doc.text(lines, L + 3, y + 5);
    doc.text((t.hours || 0).toFixed(2), 150, y + 5, { align: 'right' });
    doc.text(money(taskAmt(t), c), R - 3, y + 5, { align: 'right' });
    const sub = [t.clientName, t.category].filter(Boolean).join(' · ');
    let rh = 3.5 + lines.length * 4.4;
    if (sub) { doc.setFontSize(7.5); doc.setTextColor(MUTED); doc.text(sub, L + 3, y + rh + 1.5); doc.setFontSize(9); rh += 4; }
    doc.setDrawColor(LINE); doc.line(L, y + rh, R, y + rh);
    y += rh;
  });
  if (tasks.length > 16) { doc.setFontSize(8); doc.setTextColor(MUTED); doc.text(`… and ${tasks.length - 16} more task(s)`, L + 3, y + 4); y += 7; }

  y += 3;
  const totalRows: [string, string][] = [
    ['Gross Earnings', money(gross, c)],
    ...((payslip.bonus || 0) > 0 ? [['Bonus / Adjustment', `+ ${money(payslip.bonus, c)}`] as [string,string]] : []),
    ...((payslip.deductions || 0) > 0 ? [['Deductions', `- ${money(payslip.deductions, c)}`] as [string,string]] : []),
  ];
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  totalRows.forEach(([k, v]) => {
    doc.setTextColor(INK);
    doc.text(k, 120, y + 4); doc.text(v, R - 3, y + 4, { align: 'right' });
    y += 6;
  });
  y += 3;
  y = drawTotalBox(doc, y, 'Final Net Pay', money(net, c));
  drawNote(doc, y, biz);
  doc.save(`Payslip_${(emp.name || 'employee').replace(/\s+/g, '_')}_${(payslip.period || '').replace(/\s+/g, '_')}.pdf`);
}

/** Fetch payslip/business settings once for PDF templates and previews. */
export async function getPdfBiz(apiCall: (m: string, p: string) => Promise<any>): Promise<BizDetails> {
  try {
    const d = await apiCall('GET', '/settings');
    const s = d.settings || {};
    return { ...(s.business || {}), ...(s.payslip || {}), invoiceLogo: s.invoiceLogo, payslipLogo: s.payslipLogo };
  } catch { return { name: 'Designer Craft' }; }
}
