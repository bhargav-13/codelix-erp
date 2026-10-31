import { jsPDF } from 'jspdf';
import { LUT_TEXT, RODTEP_TEXT, exportCalc, type ExportInvoice, type PartyBlock } from '../data/trade';

/**
 * The three documents one export entry produces, as on Ishita: Export Invoice, Commercial Invoice
 * and Packing List. Drawn in the browser on A4 with plain boxes so they print like the originals.
 */
export type ExportDoc = 'EXPORT' | 'COMMERCIAL' | 'PACKING';
export const DOC_TITLE: Record<ExportDoc, string> = { EXPORT: 'EXPORT INVOICE', COMMERCIAL: 'COMMERCIAL INVOICE', PACKING: 'PACKING LIST' };

const fmt = (n: number, d = 2) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const dmy = (d?: string) => (d ? d.split('-').reverse().join('.') : '');
// jsPDF's core fonts have no € or ₹ glyphs.
const cur = (c: string) => (c === 'EURO' ? 'EUR' : 'USD');

export function drawExportDoc(inv: ExportInvoice, kind: ExportDoc, doc = new jsPDF({ unit: 'mm', format: 'a4' })) {
  const c = exportCalc(inv);
  const W = doc.internal.pageSize.getWidth();
  const M = 10;
  const R = W - M;
  const box = (x: number, y: number, w: number, h: number) => doc.rect(x, y, w, h);
  const t = (s: string, x: number, y: number, o: { b?: boolean; s?: number; a?: 'left' | 'right' | 'center' } = {}) => {
    doc.setFont('helvetica', o.b ? 'bold' : 'normal'); doc.setFontSize(o.s ?? 8); doc.text(s, x, y, { align: o.a ?? 'left' });
  };
  const party = (label: string, p: PartyBlock, x: number, y: number, w: number) => {
    t(label, x + 2, y + 4, { b: true, s: 7.5 });
    t(p.name || '-', x + 2, y + 9, { b: true, s: 9 });
    const lines = doc.splitTextToSize(p.address || '', w - 4) as string[];
    lines.slice(0, 4).forEach((l, i) => t(l, x + 2, y + 13.5 + i * 3.8));
    t(`${p.country}${p.contact ? `  ·  Tel: ${p.contact}` : ''}`, x + 2, y + 30);
  };

  doc.setDrawColor('#111827'); doc.setLineWidth(0.25);
  t(DOC_TITLE[kind], W / 2, 12, { b: true, s: 14, a: 'center' });
  if (inv.lut) {
    const l = doc.splitTextToSize(`${LUT_TEXT} ${inv.arnNo}`, R - M) as string[];
    l.forEach((s, i) => t(s, W / 2, 17 + i * 3.5, { s: 7, a: 'center' }));
  }

  // Exporter / invoice details
  let y = 24;
  box(M, y, (R - M) / 2, 34); box(M + (R - M) / 2, y, (R - M) / 2, 34);
  party('EXPORTER', inv.exporter, M, y, (R - M) / 2);
  const dx = M + (R - M) / 2 + 2;
  [['Invoice No.', inv.invoiceNo], ['Date', dmy(inv.date)], ['GST No.', inv.gstNo], ['IEC Code', inv.iecCode], ['P/O No.', `${inv.poNo}${inv.poDate ? ` dt. ${dmy(inv.poDate)}` : ''}`], ['Payment', inv.paymentTerms]]
    .forEach(([k, v], i) => { t(k, dx, y + 5 + i * 5, { b: true }); t(v || '-', dx + 24, y + 5 + i * 5); });

  // Buyer / consignee (the commercial invoice uses the same parties here)
  y += 34;
  box(M, y, (R - M) / 2, 34); box(M + (R - M) / 2, y, (R - M) / 2, 34);
  party('BILL TO (BUYER)', inv.billTo, M, y, (R - M) / 2);
  party('SHIP TO (CONSIGNEE)', inv.shipTo.name ? inv.shipTo : inv.billTo, M + (R - M) / 2, y, (R - M) / 2);

  // Shipping grid
  y += 34;
  const grid = [['Pre-carriage', inv.preCarriage], ['Place of pre-carriage', inv.placeOfPreCarriage], ['Country of origin', inv.countryOfOrigin], ['Final destination', inv.finalDestination],
    ['Port of loading', inv.portOfLoading], ['Port of discharge', inv.portOfDischarge], ['Incoterms', inv.incoterms], ['Currency', `${cur(inv.currency)}${kind === 'COMMERCIAL' ? ` @ Rs. ${fmt(inv.exchangeRate)}` : ''}`]];
  const cw = (R - M) / 4;
  grid.forEach(([k, v], i) => {
    const gx = M + (i % 4) * cw; const gy = y + Math.floor(i / 4) * 10;
    box(gx, gy, cw, 10); t(k, gx + 2, gy + 3.8, { s: 6.5 }); t(v || '-', gx + 2, gy + 8, { b: true });
  });
  y += 24;

  // Items
  const packing = kind === 'PACKING';
  const cols = packing
    ? [['No.', 10], ['Part no.', 22], ['Description', 62], ['Qty', 18], ['Qty/ctn', 16], ['Cartons', 16], ['Net kg', 18], ['Gross kg', 18], ['Pallets', 10]]
    : [['No.', 10], ['Part no.', 22], ['Description', 68], ['HS code', 20], ['Qty', 20], ['Unit', 12], [`Rate ${cur(inv.currency)}`, 18], [`Amount ${cur(inv.currency)}`, 20]];
  const xs: number[] = []; let acc = M;
  cols.forEach(([, w]) => { xs.push(acc); acc += w as number; });
  const right = (i: number) => i >= (packing ? 3 : 4);
  doc.setFillColor('#f1f3f5'); doc.rect(M, y, R - M, 7, 'FD');
  cols.forEach(([h, w], i) => t(h as string, right(i) ? xs[i] + (w as number) - 1.5 : xs[i] + 1.5, y + 4.8, { b: true, s: 7, a: right(i) ? 'right' : 'left' }));
  y += 7;
  inv.items.forEach((it, idx) => {
    const desc = doc.splitTextToSize(it.description || '-', (cols[2][1] as number) - 3) as string[];
    const h = Math.max(7, desc.length * 3.6 + 3);
    const cells = packing
      ? [String(idx + 1), it.partNo, '', fmt(it.qty, 0), fmt(it.qtyPerCarton, 0), fmt(it.cartons, 0), fmt(it.netKg), fmt(it.grossKg), fmt(it.pallets, 0)]
      : [String(idx + 1), it.partNo, '', it.hsCode, fmt(it.qty, 0), it.unit, fmt(it.unitPrice, 3), fmt(it.qty * it.unitPrice)];
    box(M, y, R - M, h);
    cells.forEach((v, i) => { if (i !== 2) t(v, right(i) ? xs[i] + (cols[i][1] as number) - 1.5 : xs[i] + 1.5, y + 4.5, { a: right(i) ? 'right' : 'left' }); });
    desc.forEach((d, k) => t(d, xs[2] + 1.5, y + 4.5 + k * 3.6));
    y += h;
    if (y > 250) { doc.addPage(); y = 16; }
  });

  // Totals
  y += 2;
  const totals: [string, string][] = packing
    ? [['Total pieces', fmt(c.pcs, 0)], ['Total cartons', fmt(c.cartons, 0)], ['Total net weight', `${fmt(c.netKg)} kg`], ['Total gross weight', `${fmt(c.grossKg)} kg`], ['Wooden pallets', fmt(c.pallets, 0)]]
    : kind === 'COMMERCIAL'
      ? [[`Value (${inv.incoterms})`, `${cur(inv.currency)} ${fmt(c.value)}`], ['Freight', `${cur(inv.currency)} ${fmt(inv.freight)}`], ['Insurance', `${cur(inv.currency)} ${fmt(inv.insurance)}`],
        ['Total', `${cur(inv.currency)} ${fmt(c.cif)}`], ['In rupees', `Rs. ${fmt(c.inr)}`], ...(inv.igst ? [[`IGST ${inv.igstPct}%`, `Rs. ${fmt(c.igstInr)}`] as [string, string], ['Total with IGST', `Rs. ${fmt(c.totalInr)}`] as [string, string]] : [])]
      : [[`Total (${inv.incoterms})`, `${cur(inv.currency)} ${fmt(c.value)}`], ['Cartons / net / gross', `${fmt(c.cartons, 0)} ctn · ${fmt(c.netKg)} / ${fmt(c.grossKg)} kg`]];
  totals.forEach(([k, v], i) => { t(k, R - 70, y + 4 + i * 5); t(v, R - 1.5, y + 4 + i * 5, { b: i === totals.length - 1 || k.startsWith('Total'), a: 'right' }); });
  y += totals.length * 5 + 6;

  // Declarations, bank and signature
  const decl: string[] = [];
  if (inv.rodtep) decl.push(RODTEP_TEXT);
  if (inv.rex && kind !== 'COMMERCIAL') decl.push(`The exporter of the products covered by this document (REX No. ${inv.rexNo}) declares that, except where otherwise clearly indicated, these products are of Indian preferential origin.`);
  decl.push('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.');
  decl.forEach(d => { (doc.splitTextToSize(d, R - M) as string[]).forEach(l => { t(l, M, y, { s: 7 }); y += 3.5; }); y += 1.5; });
  if (kind === 'EXPORT') {
    y += 2; t('BANK DETAILS', M, y, { b: true }); y += 4;
    [['Beneficiary', inv.bank.beneficiary], ['Bank', `${inv.bank.bank}, ${inv.bank.branch}`], ['A/C No.', inv.bank.account], ['SWIFT', inv.bank.swift]]
      .forEach(([k, v]) => { t(k, M, y); t(v, M + 22, y, { b: true }); y += 4; });
  }
  const sy = Math.min(Math.max(y + 8, 262), 285);
  t(`For ${inv.exporter.name}`, R, sy - 14, { b: true, a: 'right' });
  doc.line(R - 55, sy, R, sy); t('Authorised signatory', R, sy + 4, { a: 'right' });
  return doc;
}

export function downloadExportDoc(inv: ExportInvoice, kind: ExportDoc) {
  drawExportDoc(inv, kind).save(`${inv.invoiceNo.replace(/[^\w-]+/g, '_')}-${kind.toLowerCase()}.pdf`);
}
