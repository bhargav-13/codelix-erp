import { jsPDF } from 'jspdf';
import type { Subcontracting } from '../../types';

/**
 * Job-work chitthi (challan) for one subcontracting job: what was sent, at
 * what rates, every return so far, and signature blocks. Generated in the
 * browser so it works for any job without a backend endpoint.
 */

export const chitthiNo = (id: number) => `SC-${String(id).padStart(5, '0')}`;

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const kg = (n?: number | null, unit = 'kg') => `${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${unit}`;
// jsPDF's built-in fonts have no ₹ glyph, so amounts use "Rs."
const rs = (n?: number | null) => `Rs. ${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function downloadChitthi(job: Subcontracting, company: { name: string; tagline?: string; accent?: string }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  const M = 10;
  const unit = job.unit === 'PC' ? 'pc' : 'kg';
  const accent = company.accent || '#4f46e5';

  // Header band
  doc.setFillColor(accent);
  doc.rect(0, 0, W, 24, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(company.name, M, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  if (company.tagline) doc.text(company.tagline, M, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('JOB WORK CHITTHI', W - M, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(chitthiNo(job.subcontractingId), W - M, 17, { align: 'right' });

  // Party + dates
  doc.setTextColor('#111827');
  let y = 33;
  const label = (t: string, x: number, yy: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor('#6b7280'); doc.text(t.toUpperCase(), x, yy); };
  const value = (t: string, x: number, yy: number, bold = true) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(10); doc.setTextColor('#111827'); doc.text(t, x, yy); };

  label('Job worker', M, y); label('Date sent', W / 2 + 4, y);
  value(job.contractor?.name || '-', M, y + 5); value(fmtDate(job.orderDate), W / 2 + 4, y + 5);
  y += 13;
  label('Status', M, y); label('Printed', W / 2 + 4, y);
  value(job.status === 'IN_PROCESS' ? 'In process' : job.status === 'COMPLETED' ? 'Completed' : 'Rejected', M, y + 5, false);
  value(fmtDate(new Date().toISOString()), W / 2 + 4, y + 5, false);
  y += 12;

  // Goods sent table
  const row = (cells: string[], xs: number[], yy: number, opts: { bold?: boolean; fill?: string; align?: ('left' | 'right')[] } = {}) => {
    if (opts.fill) { doc.setFillColor(opts.fill); doc.rect(M, yy - 4.5, W - 2 * M, 7, 'F'); }
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor('#111827');
    cells.forEach((c, i) => doc.text(c, xs[i], yy, { align: opts.align?.[i] || 'left' }));
  };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('Goods sent', M, y); y += 6;
  const gx = [M + 2, W / 2 - 8, W / 2 + 22, W - M - 2];
  row(['Item', 'Quantity', 'Material', 'Job work'], gx, y, { bold: true, fill: '#f1f3f5', align: ['left', 'right', 'right', 'right'] }); y += 7;
  row([job.item?.name || '-', kg(job.sentStock, unit), rs(job.price), rs(job.jobWorkPay)], gx, y, { align: ['left', 'right', 'right', 'right'] });
  y += 3; doc.setDrawColor('#e5e7eb'); doc.line(M, y, W - M, y); y += 8;

  // Returns table
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('Returns', M, y); y += 6;
  const rx = [M + 2, W / 2 - 14, W / 2 + 16, W - M - 2];
  row(['Date', 'Gross', 'Packaging', 'Net'], rx, y, { bold: true, fill: '#f1f3f5', align: ['left', 'right', 'right', 'right'] }); y += 7;
  const returns = job.subReturns || [];
  if (!returns.length) { row(['Nothing returned yet', '', '', ''], rx, y); y += 6; }
  for (const r of returns) {
    const pack = (r.packagings || []).reduce((s, p) => s + (p.packagingWeight || 0) * (p.packagingCount || 0), 0);
    row([fmtDate(r.returnDate), kg(r.returnStock), kg(pack), kg(r.netReturnStock ?? r.returnStock - pack)], rx, y, { align: ['left', 'right', 'right', 'right'] });
    y += 6;
    if (y > 160) { doc.addPage(); y = 20; }
  }
  y += 2; doc.line(M, y, W - M, y); y += 8;

  // Totals
  const totals: [string, string][] = [
    ['Sent', kg(job.sentStock, unit)],
    ['Returned (net)', kg(job.totalNetReturnStock)],
    ['Used', kg(job.usedStock)],
    ['Still with job worker', kg(Math.max(0, job.sentStock - (job.totalReturnStock || 0)), unit)],
  ];
  totals.forEach(([l, v]) => { label(l, M, y); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor('#111827'); doc.text(v, W - M, y, { align: 'right' }); y += 6; });
  doc.setFillColor('#eef2ff'); doc.rect(M, y - 3, W - 2 * M, 10, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(accent);
  doc.text('Amount', M + 3, y + 3.5); doc.text(rs(job.totalAmount), W - M - 3, y + 3.5, { align: 'right' });
  y += 14;

  if (job.remark) {
    label('Remark', M, y); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor('#111827');
    doc.text(doc.splitTextToSize(job.remark, W - 2 * M), M, y + 5); y += 14;
  }

  // Signatures
  const sy = Math.max(y + 14, doc.internal.pageSize.getHeight() - 22);
  doc.setDrawColor('#9ca3af');
  doc.line(M, sy, M + 50, sy); doc.line(W - M - 50, sy, W - M, sy);
  label('Sent by', M, sy + 5); label("Job worker's signature", W - M - 50, sy + 5);

  doc.save(`chitthi-${chitthiNo(job.subcontractingId)}.pdf`);
}
