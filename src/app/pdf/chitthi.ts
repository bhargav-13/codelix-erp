import { jsPDF } from 'jspdf';
import { RETURN_KIND, contractorName, itemName, jobCalc, jobNo, packKg, returnNet, type Job } from '../data/production';

/**
 * Job-work chitthi (challan) for one subcontracting job: every lot sent, at
 * what rates, every return so far, the rejection taken off the job pay, and
 * signature blocks. Generated in the browser so it works without a backend.
 */

export const chitthiNo = (id: number) => `SC-${String(id).padStart(5, '0')}`;

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const kg = (n?: number | null, unit = 'kg') => `${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${unit}`;
// jsPDF's built-in fonts have no ₹ glyph, so amounts use "Rs."
const rs = (n?: number | null) => `Rs. ${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function downloadChitthi(job: Job, company: { name: string; tagline?: string; accent?: string }) {
  const c = jobCalc(job);
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
  doc.text(`${chitthiNo(job.id)} · ${jobNo(job)}`, W - M, 17, { align: 'right' });

  // Party + dates
  doc.setTextColor('#111827');
  let y = 33;
  const label = (t: string, x: number, yy: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor('#6b7280'); doc.text(t.toUpperCase(), x, yy); };
  const value = (t: string, x: number, yy: number, bold = true) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(10); doc.setTextColor('#111827'); doc.text(t, x, yy); };
  const page = () => { if (y > 175) { doc.addPage(); y = 20; } };

  label('Job worker', M, y); label('Item', W / 2 + 4, y);
  value(contractorName(job.contractorId), M, y + 5); value(itemName(job.itemId), W / 2 + 4, y + 5);
  y += 13;
  label('Status', M, y); label('Printed', W / 2 + 4, y);
  value(job.status === 'IN_PROCESS' ? 'In process' : job.status === 'COMPLETED' ? 'Completed' : 'Rejected', M, y + 5, false);
  value(fmtDate(new Date().toISOString()), W / 2 + 4, y + 5, false);
  y += 12;

  const row = (cells: string[], xs: number[], yy: number, opts: { bold?: boolean; fill?: string; align?: ('left' | 'right')[] } = {}) => {
    if (opts.fill) { doc.setFillColor(opts.fill); doc.rect(M, yy - 4.5, W - 2 * M, 7, 'F'); }
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor('#111827');
    cells.forEach((cell, i) => doc.text(cell, xs[i], yy, { align: opts.align?.[i] || 'left' }));
  };
  const right4: ('left' | 'right')[] = ['left', 'right', 'right', 'right'];

  // Lots sent
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('Goods sent', M, y); y += 6;
  const gx = [M + 2, W / 2 - 8, W / 2 + 22, W - M - 2];
  row(['Date', 'Quantity', 'Material', 'Job work'], gx, y, { bold: true, fill: '#f1f3f5', align: right4 }); y += 7;
  for (const s of job.sends) {
    row([fmtDate(s.date), kg(s.qty, unit), rs(s.price), rs(s.jobPay)], gx, y, { align: right4 });
    y += 6; page();
  }
  if (job.sends.length > 1) { row(['Total / avg', kg(c.sent, unit), rs(c.price), rs(c.jobPay)], gx, y, { bold: true, align: right4 }); y += 6; }
  y += 1; doc.setDrawColor('#e5e7eb'); doc.line(M, y, W - M, y); y += 8;

  // Returns
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('Returns', M, y); y += 6;
  const rx = [M + 2, W / 2 - 18, W / 2 + 6, W / 2 + 28, W - M - 2];
  const right5: ('left' | 'right')[] = ['left', 'right', 'right', 'right', 'right'];
  row(['Date', 'Gross', 'Packaging', 'Rejection', 'Net'], rx, y, { bold: true, fill: '#f1f3f5', align: right5 }); y += 7;
  if (!job.returns.length) { row(['Nothing returned yet', '', '', '', ''], rx, y); y += 6; }
  for (const r of job.returns) {
    row([`${fmtDate(r.date)} · ${RETURN_KIND[r.kind]}`, kg(r.gross), kg(packKg(r.packs)), kg(r.rejection), kg(returnNet(r))], rx, y, { align: right5 });
    y += 6; page();
  }
  y += 2; doc.line(M, y, W - M, y); y += 8;

  // Totals
  const totals: [string, string][] = [
    ['Sent', kg(c.sent, unit)],
    ['Returned (net)', kg(c.netReturned)],
    ['Used', kg(c.used)],
    ['Still with job worker', kg(c.pending, unit)],
    ['Material value', rs(c.value)],
    ['Job pay', rs(c.grossJobPay)],
  ];
  if (c.rejection > 0) totals.push([`Rejection ${kg(c.rejection)} x ${rs(c.rejectionRate)}`, `- ${rs(c.rejectionAmount)}`]);
  totals.forEach(([l, v]) => { page(); label(l, M, y); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor('#111827'); doc.text(v, W - M, y, { align: 'right' }); y += 6; });
  doc.setFillColor('#eef2ff'); doc.rect(M, y - 3, W - 2 * M, 10, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(accent);
  doc.text('Net job pay', M + 3, y + 3.5); doc.text(rs(c.netJobPay), W - M - 3, y + 3.5, { align: 'right' });
  y += 14;

  if (job.remark) {
    page();
    label('Remark', M, y); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor('#111827');
    doc.text(doc.splitTextToSize(job.remark, W - 2 * M), M, y + 5); y += 14;
  }

  // Signatures
  if (y > 185) { doc.addPage(); y = 20; }
  const sy = Math.max(y + 14, doc.internal.pageSize.getHeight() - 22);
  doc.setDrawColor('#9ca3af');
  doc.line(M, sy, M + 50, sy); doc.line(W - M - 50, sy, W - M, sy);
  label('Sent by', M, sy + 5); label("Job worker's signature", W - M - 50, sy + 5);

  doc.save(`chitthi-${chitthiNo(job.id)}.pdf`);
}
