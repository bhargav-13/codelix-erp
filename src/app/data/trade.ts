/**
 * Sample trade modules modelled on the Ishita SME ERP: purchase & sales bills (aavak / javak ledger),
 * export invoices (one entry → export invoice, commercial invoice and packing list) and client
 * management with finish price formulas. Browser-only data via demoStore.
 */
import { collection } from './demoStore';
import { iso } from './hr';
import { FINISHES, clients, items, sizeLabel } from './ishita';

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/* ---------------------------------- Bills ---------------------------------- */

export type BillKind = 'PURCHASE' | 'SALES';
export type QtyUnit = 'Kgs' | 'Gms' | 'Pc';
export const ELEMENT_TYPES = ['Wooden Peti', 'Peti', 'Bag', 'Heavy Peti'];
/** Usual weight of one element, in grams; typed over when it differs. */
export const ELEMENT_GM: Record<string, number> = { 'Wooden Peti': 2500, Peti: 1200, Bag: 75, 'Heavy Peti': 3500 };

export interface BillLine {
  item: string; size: string; qty: number; unit: QtyUnit;
  element: string; elementCount: number; elementGm: number;
  /** Scrap (metal) rate per kg — the aavak side. */
  scrap: number;
  /** Labour rate per kg — the javak side. */
  labour: number;
}
export interface Bill { id: number; kind: BillKind; billNo: string; party: string; chitthiNo: string; chitthiDate: string; date: string; time: string; lines: BillLine[]; remark?: string }

export const PURCHASE_PARTIES = ['Shree Metal Corporation', 'Jamnagar Brass Scrap Co.', 'Kailash Alloys', 'Om Metal Traders'];
export const SALES_PARTIES = ['Raj Hardware, Rajkot', 'Patel Brass Mart, Jamnagar', 'Ambika Traders, Ahmedabad', 'Sai Sanitary, Surat'];

/** Net kg of a line after the elements' tare; gms and pieces are converted with the item's piece weight when known. */
export function billLineCalc(l: BillLine) {
  const grossKg = l.unit === 'Gms' ? l.qty / 1000 : l.unit === 'Kgs' ? l.qty : 0;
  const tareKg = (l.elementCount * l.elementGm) / 1000;
  const netKg = Math.max(0, r3(grossKg - tareKg));
  const basis = l.unit === 'Pc' ? l.qty : netKg;
  const aavak = basis * l.scrap;
  const javak = basis * l.labour;
  return { grossKg, tareKg, netKg, basis, aavak, javak, total: aavak + javak };
}
export const billCalc = (b: Bill) => b.lines.map(billLineCalc).reduce(
  (t, c) => ({ netKg: t.netKg + c.netKg, aavak: t.aavak + c.aavak, javak: t.javak + c.javak, total: t.total + c.total }),
  { netKg: 0, aavak: 0, javak: 0, total: 0 });

export const bills = collection<Bill>('trade.bills', () => {
  const its = items.all();
  const mk = (id: number, kind: BillKind, ago: number, party: string, lines: Partial<BillLine>[]): Bill => ({
    id, kind, billNo: `${kind === 'PURCHASE' ? 'PU' : 'SA'}-${String(200 + id)}`, party, chitthiNo: `CH-${410 + id}`, chitthiDate: daysAgo(ago + 1), date: daysAgo(ago),
    time: `${10 + (id % 7)}:${id % 2 ? '15' : '40'}`,
    lines: lines.map((l, i) => {
      const it = its[(id + i) % its.length];
      return { item: it.name, size: sizeLabel(it.sizes[0]), qty: 0, unit: 'Kgs', element: 'Peti', elementCount: 1, elementGm: 1200, scrap: 0, labour: 0, ...l };
    }),
  });
  return [
    mk(1, 'PURCHASE', 2, PURCHASE_PARTIES[0], [{ qty: 412.5, elementCount: 6, scrap: 512, labour: 0 }, { qty: 188, element: 'Bag', elementCount: 8, elementGm: 75, scrap: 498 }]),
    mk(2, 'PURCHASE', 6, PURCHASE_PARTIES[1], [{ qty: 260.4, element: 'Heavy Peti', elementCount: 3, elementGm: 3500, scrap: 505, labour: 6 }]),
    mk(3, 'PURCHASE', 11, PURCHASE_PARTIES[2], [{ qty: 520, elementCount: 8, scrap: 509 }, { qty: 96.2, element: 'Bag', elementCount: 4, elementGm: 75, scrap: 470 }]),
    mk(4, 'PURCHASE', 19, PURCHASE_PARTIES[3], [{ qty: 305.75, element: 'Wooden Peti', elementCount: 4, elementGm: 2500, scrap: 515, labour: 4 }]),
    mk(5, 'SALES', 1, SALES_PARTIES[0], [{ qty: 145.2, elementCount: 3, scrap: 560, labour: 72 }, { qty: 62.4, element: 'Bag', elementCount: 6, elementGm: 75, scrap: 560, labour: 88 }]),
    mk(6, 'SALES', 4, SALES_PARTIES[1], [{ qty: 210.6, elementCount: 4, scrap: 555, labour: 64 }]),
    mk(7, 'SALES', 9, SALES_PARTIES[2], [{ qty: 1200, unit: 'Pc', elementCount: 0, elementGm: 0, scrap: 38, labour: 9 }]),
    mk(8, 'SALES', 15, SALES_PARTIES[3], [{ qty: 98.35, element: 'Bag', elementCount: 5, elementGm: 75, scrap: 548, labour: 70 }]),
  ];
});

/* ----------------------------- Export invoices ----------------------------- */

export type Currency = 'USD' | 'EURO';
export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: '$', EURO: '€' };
export const LUT_TEXT = 'SUPPLY MEANT FOR EXPORT UNDER BOND OR LUT WITHOUT PAYMENT OF INTEGRATED TAX (IGST), LUT ARN. NO.';
export const RODTEP_TEXT = 'WE INTEND TO CLAIM REWARDS UNDER THE "REMISSION OF DUTIES AND TAXES ON EXPORTED PRODUCT (RoDTEP)" SCHEME.';
export const INCOTERMS = ['F.O.B', 'C.I.F', 'C&F', 'EX-WORKS', 'D.A.P'];

export interface PartyBlock { name: string; address: string; country: string; contact: string }
export interface ExportItem {
  partNo: string; description: string; hsCode: string; qty: number; unit: 'pcs' | 'sets' | 'kgs'; unitPrice: number;
  qtyPerCarton: number; cartons: number; grossKg: number; netKg: number; pallets: number;
}
export interface ExportInvoice {
  id: number; invoiceNo: string; date: string; poNo: string; poDate: string;
  exporter: PartyBlock; billTo: PartyBlock; shipTo: PartyBlock;
  gstNo: string; iecCode: string; preCarriage: string; placeOfPreCarriage: string; countryOfOrigin: string; finalDestination: string;
  portOfLoading: string; portOfDischarge: string; incoterms: string; paymentTerms: string;
  currency: Currency; exchangeRate: number;
  freight: number; insurance: number; igst: boolean; igstPct: number;
  lut: boolean; arnNo: string; rodtep: boolean; rex: boolean; rexNo: string;
  bank: { beneficiary: string; bank: string; branch: string; account: string; swift: string };
  items: ExportItem[];
}

export function exportCalc(inv: ExportInvoice) {
  const value = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const cartons = inv.items.reduce((s, i) => s + i.cartons, 0);
  const pallets = inv.items.reduce((s, i) => s + i.pallets, 0);
  const grossKg = r3(inv.items.reduce((s, i) => s + i.grossKg, 0));
  const netKg = r3(inv.items.reduce((s, i) => s + i.netKg, 0));
  const pcs = inv.items.reduce((s, i) => s + i.qty, 0);
  // Commercial invoice: value plus freight / insurance, IGST worked out in rupees.
  const cif = value + inv.freight + inv.insurance;
  const inr = cif * (inv.exchangeRate || 0);
  const igstInr = inv.igst ? (inr * inv.igstPct) / 100 : 0;
  return { value, cartons, pallets, grossKg, netKg, pcs, cif, inr, igstInr, totalInr: inr + igstInr };
}

export const exporterDefaults = (): Pick<ExportInvoice, 'exporter' | 'gstNo' | 'iecCode' | 'arnNo' | 'rexNo' | 'bank'> => ({
  exporter: { name: 'ISHITA INDUSTRIES', address: 'Plot No. 32, R. S. No. 706,\nVision Industrial Park, Lalpur Road, Changa\nJamnagar, Gujarat - 361012, INDIA', country: 'India', contact: '+91 72289 81407' },
  gstNo: '24AAGFI3929N1Z1', iecCode: 'AAGFI3929N', arnNo: 'AD240325016572F', rexNo: 'INAAGFI3929N',
  bank: { beneficiary: 'ISHITA INDUSTRIES', bank: 'HDFC BANK LTD.', branch: 'Dared Branch', account: '50200028447924', swift: 'HDFCINBB' },
});

export const blankExport = (no: string): Omit<ExportInvoice, 'id'> => ({
  ...exporterDefaults(), invoiceNo: no, date: iso(new Date()), poNo: '', poDate: '',
  billTo: { name: '', address: '', country: '', contact: '' }, shipTo: { name: '', address: '', country: '', contact: '' },
  preCarriage: 'By Road', placeOfPreCarriage: 'Jamnagar', countryOfOrigin: 'India', finalDestination: '', portOfLoading: 'Nhava Sheva', portOfDischarge: '',
  incoterms: 'F.O.B', paymentTerms: '30% advance, 70% against B/L', currency: 'USD', exchangeRate: 83.2,
  freight: 0, insurance: 0, igst: false, igstPct: 18, lut: true, rodtep: true, rex: true,
  items: [{ partNo: '', description: '', hsCode: '83021090', qty: 0, unit: 'pcs', unitPrice: 0, qtyPerCarton: 0, cartons: 0, grossKg: 0, netKg: 0, pallets: 0 }],
});

const buyers: PartyBlock[] = [
  { name: 'Fastenal Company', address: '2001 Theurer Blvd\nWinona, MN 55987', country: 'USA', contact: '+1 507 454 5374' },
  { name: 'Wurth Australia Pty Ltd', address: '2 Lucca Road\nWyong NSW 2259', country: 'Australia', contact: '+61 2 4355 8888' },
  { name: 'LBK Wiesehahn GmbH', address: 'Industriestrasse 12\n58256 Ennepetal', country: 'Germany', contact: '+49 2333 9880' },
];

export const exportInvoices = collection<ExportInvoice>('trade.exportInvoices', () => buyers.map((b, i) => ({
  ...blankExport(`II/EXP/${25 + i}-26`),
  id: i + 1, date: daysAgo(4 + i * 13), poNo: `PO-${88120 + i * 7}`, poDate: daysAgo(30 + i * 13),
  billTo: b, shipTo: b, finalDestination: b.country, portOfDischarge: ['Los Angeles', 'Sydney', 'Hamburg'][i],
  currency: (i === 2 ? 'EURO' : 'USD') as Currency, exchangeRate: i === 2 ? 90.4 : 83.2, freight: i === 1 ? 420 : 0, insurance: i === 1 ? 60 : 0,
  items: [
    { partNo: `BH-3${i}`, description: 'Brass Butt Hinge 3" x 3/8" — S.S. finish', hsCode: '83021010', qty: 4800 + i * 1200, unit: 'pcs' as const, unitPrice: 0.62 + i * 0.04, qtyPerCarton: 400, cartons: 12 + i * 3, grossKg: 1580 + i * 380, netKg: 1520 + i * 360, pallets: 2 },
    { partNo: `TB-6${i}`, description: 'Brass Tower Bolt 6" — Antique finish', hsCode: '83014090', qty: 2400, unit: 'pcs' as const, unitPrice: 1.15, qtyPerCarton: 200, cartons: 12, grossKg: 262, netKg: 252, pallets: 1 },
  ],
})));

/* ------------------------- Client pricing (formulas) ------------------------ */

/** finish price = S.S. price × mult + offset. clientId null is the global default. */
export interface PricingRule { id: number; clientId: number | null; finish: string; mult: number; offset: number }
/** A client's price list row: the S.S. price per piece for one item size; other finishes follow the formulas. */
export interface ClientPrice { id: number; clientId: number; itemId: number; size: string; ssPrice: number; highlight?: boolean }

const DEFAULT_RULES: Record<string, [number, number]> = {
  'S.S.': [1, 0], 'Antq.': [1.08, 0.5], 'Side Gold': [1.12, 0.8], 'Z Black': [1.1, 0.6], 'Gr. Black': [1.1, 0.6],
  'Matt S.S.': [1.04, 0.3], 'PVD Gold': [1.45, 2.5], 'PVD Rose Gold': [1.5, 2.8], 'Rose Gold': [1.25, 1.2], 'Clear Lacqur': [1.02, 0.2],
};

export const pricingRules = collection<PricingRule>('trade.pricingRules', () => [
  ...FINISHES.map((f, i) => ({ id: i + 1, clientId: null, finish: f, mult: DEFAULT_RULES[f]?.[0] ?? 1, offset: DEFAULT_RULES[f]?.[1] ?? 0 })),
  // Patel Brass Mart gets PVD a little cheaper.
  { id: 100, clientId: 2, finish: 'PVD Gold', mult: 1.38, offset: 2 },
  { id: 101, clientId: 2, finish: 'PVD Rose Gold', mult: 1.42, offset: 2.2 },
]);

/** The rule in effect for a client and finish: the client's override, else the global default. */
export const ruleFor = (rules: PricingRule[], clientId: number | null, finish: string) =>
  rules.find(r => r.clientId === clientId && clientId !== null && r.finish === finish)
  ?? rules.find(r => r.clientId === null && r.finish === finish)
  ?? { id: 0, clientId: null, finish, mult: 1, offset: 0 };

export const finishPrice = (ss: number, rule: { mult: number; offset: number }) => Math.round((ss * rule.mult + rule.offset) * 100) / 100;

export const clientPrices = collection<ClientPrice>('trade.clientPrices', () => {
  const its = items.all();
  const cls = clients.all();
  let id = 1;
  return cls.slice(0, 4).flatMap((c, ci) => its.slice(0, 4 + (ci % 3)).flatMap(it => it.sizes.map(s => ({
    id: id++, clientId: c.id, itemId: it.id, size: sizeLabel(s),
    // Piece price from the piece weight at about ₹560/kg of finished brass, a little different per client.
    ssPrice: Math.round(s.pcsWeight * (560 + ci * 12) * 100) / 100,
    highlight: ci === 0 && it.id === 2,
  }))));
});
