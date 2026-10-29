/**
 * Sample modules modelled on the Ishita SME ERP (brass hardware): job work
 * chitthis, gres filling, plating analytics, packing invoices and the client
 * portal. Browser-only data via demoStore; the maths mirrors Ishita's screens.
 */
import { collection } from './demoStore';
import { iso } from './hr';

export const FINISHES = ['S.S.', 'Antq.', 'Side Gold', 'Z Black', 'Gr. Black', 'Matt S.S.', 'PVD Gold', 'PVD Rose Gold', 'Rose Gold', 'Clear Lacqur'];

export interface Size { inch: string; mm: string; dozWeight: number; pcsWeight: number }
export interface Item {
  id: number;
  name: string;
  category: string;
  sizes: Size[];
  /** Labour / plating charge per kg for each finish. */
  labour: Record<string, number>;
  pcsPerBox: number;
  boxPerCarton: number;
}

const lab = (base: number) => Object.fromEntries(FINISHES.map((f, i) => [f, base + i * 6]));

export const items = collection<Item>('ishita.items', () => [
  { id: 1, name: 'Tower Bolt', category: 'Bolts', pcsPerBox: 12, boxPerCarton: 20, labour: lab(55),
    sizes: [{ inch: '4"', mm: '100mm', dozWeight: 0.84, pcsWeight: 0.07 }, { inch: '6"', mm: '150mm', dozWeight: 1.26, pcsWeight: 0.105 }, { inch: '8"', mm: '200mm', dozWeight: 1.68, pcsWeight: 0.14 }] },
  { id: 2, name: 'Door Handle', category: 'Handles', pcsPerBox: 6, boxPerCarton: 12, labour: lab(70),
    sizes: [{ inch: '6"', mm: '150mm', dozWeight: 2.4, pcsWeight: 0.2 }, { inch: '8"', mm: '200mm', dozWeight: 3.0, pcsWeight: 0.25 }, { inch: '10"', mm: '250mm', dozWeight: 3.5, pcsWeight: 0.292 }] },
  { id: 3, name: 'Butt Hinge', category: 'Hinges', pcsPerBox: 12, boxPerCarton: 25, labour: lab(48),
    sizes: [{ inch: '3"', mm: '75mm', dozWeight: 0.96, pcsWeight: 0.08 }, { inch: '4"', mm: '100mm', dozWeight: 1.44, pcsWeight: 0.12 }] },
  { id: 4, name: 'Cabinet Knob', category: 'Knobs', pcsPerBox: 24, boxPerCarton: 20, labour: lab(80),
    sizes: [{ inch: '1"', mm: '25mm', dozWeight: 0.36, pcsWeight: 0.03 }, { inch: '1.25"', mm: '32mm', dozWeight: 0.48, pcsWeight: 0.04 }] },
  { id: 5, name: 'Aldrop', category: 'Bolts', pcsPerBox: 6, boxPerCarton: 10, labour: lab(52),
    sizes: [{ inch: '10"', mm: '250mm', dozWeight: 4.2, pcsWeight: 0.35 }, { inch: '12"', mm: '300mm', dozWeight: 5.0, pcsWeight: 0.417 }] },
  { id: 6, name: 'Mortise Handle', category: 'Handles', pcsPerBox: 1, boxPerCarton: 10, labour: lab(90),
    sizes: [{ inch: '8"', mm: '200mm', dozWeight: 6.0, pcsWeight: 0.5 }] },
]);

export const sizeLabel = (s?: Size) => (s ? `${s.inch} (${s.mm})` : '—');

/* ------------------------------- Job work -------------------------------- */

export type JobMode = 'OUTSIDE' | 'INHOUSE' | 'MANUAL';
export const MODE_LABEL: Record<JobMode, string> = { OUTSIDE: 'Out-side', INHOUSE: 'In-side', MANUAL: 'Manual' };

export interface Return { date: string; kg: number }

export interface JobWork {
  id: number;
  mode: JobMode;
  party: string;
  chitthiNo: string;
  date: string;
  itemId: number;
  size: string;
  finish: string;
  grossKg: number;
  elementType: 'PETI' | 'DRUM';
  elementCount: number;
  elementKg: number;
  pcsWeight: number;
  ratePerKg: number;
  returns: Return[];
}

export const VENDORS = ['Shree Plating Works', 'Om Electroplaters', 'Jalaram Polish', 'Krishna PVD Coating', 'Bhavani Buffing'];
export const CUSTOMERS = ['Raj Hardware, Rajkot', 'Patel Brass Mart, Jamnagar', 'Ambika Traders, Ahmedabad', 'Sai Sanitary, Surat', 'New India Hardware, Mumbai'];

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function jobCalc(j: Pick<JobWork, 'grossKg' | 'elementCount' | 'elementKg' | 'pcsWeight' | 'ratePerKg' | 'returns'>) {
  const netKg = Math.max(0, r3(j.grossKg - j.elementCount * j.elementKg));
  const pcs = j.pcsWeight > 0 ? Math.round(netKg / j.pcsWeight) : 0;
  const amount = netKg * j.ratePerKg;
  const returnedKg = r3(j.returns.reduce((s, r) => s + r.kg, 0));
  const pendingKg = Math.max(0, r3(netKg - returnedKg));
  const status = returnedKg <= 0 ? 'PENDING' : pendingKg <= 0.001 ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED';
  return { netKg, pcs, amount, returnedKg, pendingKg, status: status as 'PENDING' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED' };
}

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

export const jobWorks = collection<JobWork>('ishita.jobworks', () => {
  const r = rng(11);
  const list = items.all();
  return Array.from({ length: 34 }, (_, i) => {
    const it = list[Math.floor(r() * list.length)];
    const sz = it.sizes[Math.floor(r() * it.sizes.length)];
    const mode: JobMode = r() < 0.6 ? 'OUTSIDE' : r() < 0.75 ? 'INHOUSE' : 'MANUAL';
    const elementCount = 2 + Math.floor(r() * 6);
    const grossKg = r3(40 + r() * 160 + elementCount);
    const net = grossKg - elementCount;
    const age = 2 + Math.floor(r() * 70);
    const roll = r();
    const returns: Return[] = roll < 0.35 ? [] : roll < 0.6
      ? [{ date: daysAgo(Math.max(0, age - 5)), kg: r3(net * (0.3 + r() * 0.4)) }]
      : [{ date: daysAgo(Math.max(0, age - 4)), kg: r3(net * 0.5) }, { date: daysAgo(Math.max(0, age - 9)), kg: r3(net * 0.5) }];
    return {
      id: i + 1, mode,
      party: mode === 'OUTSIDE' ? VENDORS[Math.floor(r() * VENDORS.length)] : CUSTOMERS[Math.floor(r() * CUSTOMERS.length)],
      chitthiNo: String(101 + i), date: daysAgo(age), itemId: it.id, size: sizeLabel(sz),
      finish: FINISHES[Math.floor(r() * FINISHES.length)], grossKg, elementType: 'PETI' as const, elementCount, elementKg: 1,
      pcsWeight: sz.pcsWeight, ratePerKg: Math.round(45 + r() * 50), returns,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
});

/* --------------------------------- GRES ---------------------------------- */

export interface GresLine { itemId: number; size: string; netKg: number; ratePerKg: number }
export interface Gres { id: number; vendor: string; chitthiNo: string; date: string; lines: GresLine[]; returns: Return[] }

export const gresCalc = (g: Gres) => {
  const netKg = r3(g.lines.reduce((s, l) => s + l.netKg, 0));
  const amount = g.lines.reduce((s, l) => s + l.netKg * l.ratePerKg, 0);
  const returnedKg = r3(g.returns.reduce((s, r) => s + r.kg, 0));
  return { netKg, amount, returnedKg, pendingKg: Math.max(0, r3(netKg - returnedKg)), complete: returnedKg >= netKg - 0.001 };
};

export const gres = collection<Gres>('ishita.gres', () => {
  const r = rng(23);
  const list = items.all();
  return Array.from({ length: 16 }, (_, i) => {
    const lines = Array.from({ length: 1 + Math.floor(r() * 3) }, () => {
      const it = list[Math.floor(r() * list.length)];
      return { itemId: it.id, size: sizeLabel(it.sizes[0]), netKg: r3(15 + r() * 60), ratePerKg: Math.round(18 + r() * 14) };
    });
    const net = lines.reduce((s, l) => s + l.netKg, 0);
    const age = 3 + Math.floor(r() * 50);
    return {
      id: i + 1, vendor: VENDORS[Math.floor(r() * VENDORS.length)], chitthiNo: `G${String(201 + i)}`, date: daysAgo(age), lines,
      returns: r() < 0.5 ? [{ date: daysAgo(Math.max(0, age - 6)), kg: r3(net * (r() < 0.5 ? 1 : 0.6)) }] : [],
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
});

/* ---------------------------- Packing invoices ---------------------------- */

export interface PackLine {
  itemId: number; size: string; finish: string; cartonNo: string;
  box: number; pc: number; scrap: number; boxWeight: number; acDozWeight: number; labour: number;
}
export interface PackingInvoice { id: number; invoiceNo: string; date: string; party: string; lines: PackLine[] }

/** Ishita's packing-sheet formulas, line by line. */
export function packCalc(l: PackLine) {
  const totalPc = l.box * l.pc;
  const rsKg = l.scrap + l.labour;
  const ratePc = (l.acDozWeight * rsKg) / 12;
  const totalRs = ratePc * totalPc;
  const totalKg = l.boxWeight * l.box;
  const asPerDozWeight = (l.acDozWeight / 12) * totalPc;
  return { totalPc, rsKg, ratePc, totalRs, totalKg, asPerDozWeight, loss: totalKg - asPerDozWeight };
}

export const packing = collection<PackingInvoice>('ishita.packing', () => {
  const r = rng(37);
  const list = items.all();
  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1, invoiceNo: `PK-${String(1001 + i)}`, date: daysAgo(1 + i * 4), party: CUSTOMERS[i % CUSTOMERS.length],
    lines: Array.from({ length: 1 + Math.floor(r() * 3) }, (_, k) => {
      const it = list[Math.floor(r() * list.length)];
      const sz = it.sizes[Math.floor(r() * it.sizes.length)];
      const finish = FINISHES[Math.floor(r() * 5)];
      const box = 5 + Math.floor(r() * 30);
      return {
        itemId: it.id, size: sizeLabel(sz), finish, cartonNo: `C${i + 1}-${k + 1}`, box, pc: it.pcsPerBox,
        scrap: 430 + Math.round(r() * 40), boxWeight: r3((sz.dozWeight / 12) * it.pcsPerBox * (1.01 + r() * 0.03)),
        acDozWeight: sz.dozWeight, labour: it.labour[finish],
      };
    }),
  }));
});

/* ------------------------------ Client portal ----------------------------- */

export interface Client { id: number; company: string; contact: string; phone: string; city: string; login: string; active: boolean }
export type RequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DISPATCHED';
export interface RequestLine { itemId: number; size: string; finish: string; qtyPc: number }
export interface OrderRequest { id: number; clientId: number; date: string; lines: RequestLine[]; note: string; status: RequestStatus; reply?: string }

export const clients = collection<Client>('ishita.clients', () => CUSTOMERS.map((c, i) => {
  const [company, city] = c.split(', ');
  return { id: i + 1, company, city, contact: ['Rakesh', 'Hitesh', 'Mehul', 'Jayesh', 'Sandeep'][i], phone: `98${String(25000000 + i * 1234567).slice(0, 8)}`, login: company.toLowerCase().split(' ')[0], active: i !== 4 };
}));

export const requests = collection<OrderRequest>('ishita.requests', () => [
  { id: 1, clientId: 1, date: daysAgo(0), status: 'PENDING_APPROVAL', note: 'Urgent for Diwali stock', lines: [{ itemId: 2, size: '8" (200mm)', finish: 'Antq.', qtyPc: 600 }, { itemId: 1, size: '6" (150mm)', finish: 'S.S.', qtyPc: 1200 }] },
  { id: 2, clientId: 3, date: daysAgo(1), status: 'PENDING_APPROVAL', note: '', lines: [{ itemId: 4, size: '1" (25mm)', finish: 'PVD Gold', qtyPc: 2400 }] },
  { id: 3, clientId: 2, date: daysAgo(3), status: 'APPROVED', note: '', reply: 'Ready in 10 days', lines: [{ itemId: 3, size: '4" (100mm)', finish: 'S.S.', qtyPc: 3000 }] },
  { id: 4, clientId: 4, date: daysAgo(6), status: 'DISPATCHED', note: '', lines: [{ itemId: 5, size: '10" (250mm)', finish: 'Z Black', qtyPc: 300 }] },
  { id: 5, clientId: 1, date: daysAgo(9), status: 'REJECTED', note: '', reply: 'Finish not available this month', lines: [{ itemId: 6, size: '8" (200mm)', finish: 'Rose Gold', qtyPc: 100 }] },
]);
