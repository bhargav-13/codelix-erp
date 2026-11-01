/**
 * Sample job work (subcontracting) and chrome plating, modelled on the current Parmeshwari ERP:
 * a job can be sent in several lots, each return carries packaging and rejection, the rejection is
 * taken off the job pay, and each return chunk can go on to chrome plating on its own.
 * Browser-only data via demoStore; the maths mirrors Parmeshwari's backend.
 */
import { collection } from './demoStore';
import { iso } from './hr';

export type JobStatus = 'IN_PROCESS' | 'COMPLETED' | 'REJECTED';
export type JobUnit = 'KG' | 'PC';
export type PackType = 'BAG' | 'FOAM' | 'PETI' | 'DRUM';
/** What came back: raw material (maal), turnings (chhol) or finished goods (tayar maal). */
export type ReturnKind = 'MAAL' | 'CHHOL' | 'TAYAR_MAAL';
/** Out-side goes to a vendor; in-side is done in our own plating shop for a party (Ishita's split). */
export type JobPlace = 'OUTSIDE' | 'INHOUSE';

export const RETURN_KIND: Record<ReturnKind, string> = { MAAL: 'Maal', CHHOL: 'Chhol', TAYAR_MAAL: 'Tayar maal' };

export interface Pack { type: PackType; kgEach: number; count: number }
export interface Named { id: number; name: string }
export interface Send { id: number; date: string; qty: number; price: number; jobPay: number; remark?: string }
export interface JobReturn { id: number; date: string; gross: number; packs: Pack[]; rejection: number; kind: ReturnKind; remark?: string }
export interface Job {
  id: number;
  contractorId: number;
  itemId: number;
  unit: JobUnit;
  place: JobPlace;
  status: JobStatus;
  sends: Send[];
  returns: JobReturn[];
  /** Set by hand on the Rejection screen; null follows the returns' total. */
  rejectionKg: number | null;
  /** Set by hand; null follows the material rate. */
  rejectionRate: number | null;
  remark?: string;
}
export interface ChromeBack { date: string; gross: number; packs: Pack[]; rate: number; remark?: string; stockItem?: string; stockUnit?: string; pcs?: number }
export interface ChromeLot {
  id: number;
  jobId: number;
  returnId: number;
  partyId: number;
  date: string;
  net: number;
  packs: Pack[];
  /** Plating charge per kg. */
  rate: number;
  status: JobStatus;
  remark?: string;
  back?: ChromeBack;
}

const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const r3 = (v: number) => Math.round(v * 1000) / 1000;
export const packKg = (p: Pack[]) => r3(p.reduce((s, x) => s + x.kgEach * x.count, 0));
export const nextId = (rows: { id: number }[]) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

export const contractors = collection<Named>('prod.contractors', () =>
  ['Ramesh Turning Works', 'Shiv Shakti CNC', 'Mahadev Machining', 'Jay Ambe Polish', 'Krishna Threading', 'Raj Hardware (in-house)', 'Patel Brass Mart (in-house)'].map((name, i) => ({ id: i + 1, name })));
export const subItems = collection<Named>('prod.items', () =>
  ['Brass Rod 12mm', 'Hex Nipple ½"', 'Ferrule 15mm', 'Elbow ¾"', 'Gas Valve Body', 'Tower Bolt Shank', 'Socket ½"'].map((name, i) => ({ id: i + 1, name })));
export const platingParties = collection<Named>('prod.platingParties', () =>
  ['Shree Chrome Plating', 'Om Electroplaters', 'Bright Finish Industries'].map((name, i) => ({ id: i + 1, name })));

const bag = (count: number): Pack => ({ type: 'BAG', kgEach: 0.075, count });
const peti = (count: number): Pack => ({ type: 'PETI', kgEach: 1.2, count });
const foam = (count: number): Pack => ({ type: 'FOAM', kgEach: 0.15, count });

type Seed = Omit<Job, 'place'> & { place?: JobPlace };
export const jobs = collection<Job>('prod.jobs', () => ([
  { id: 1, contractorId: 1, itemId: 1, unit: 'KG', status: 'COMPLETED', rejectionKg: null, rejectionRate: null, remark: 'Urgent lot for Raj Hardware',
    sends: [{ id: 1, date: day(58), qty: 250, price: 610, jobPay: 42 }],
    returns: [
      { id: 1, date: day(50), gross: 124.6, packs: [bag(8)], rejection: 1.2, kind: 'TAYAR_MAAL' },
      { id: 2, date: day(44), gross: 118.9, packs: [bag(6), peti(1)], rejection: 0.8, kind: 'TAYAR_MAAL' },
    ] },
  { id: 2, contractorId: 2, itemId: 2, unit: 'KG', status: 'IN_PROCESS', rejectionKg: null, rejectionRate: null,
    sends: [{ id: 1, date: day(30), qty: 180, price: 598, jobPay: 38 }, { id: 2, date: day(16), qty: 120, price: 612, jobPay: 40, remark: 'Second lot' }],
    returns: [
      { id: 1, date: day(22), gross: 96.4, packs: [peti(2)], rejection: 2.1, kind: 'TAYAR_MAAL' },
      { id: 2, date: day(9), gross: 88.25, packs: [bag(5)], rejection: 0, kind: 'TAYAR_MAAL', remark: 'Threads checked' },
    ] },
  { id: 3, contractorId: 3, itemId: 5, unit: 'KG', status: 'IN_PROCESS', rejectionKg: 4, rejectionRate: 560, remark: 'Rate agreed at 45/kg',
    sends: [{ id: 1, date: day(20), qty: 320, price: 605, jobPay: 45 }],
    returns: [{ id: 1, date: day(6), gross: 142.8, packs: [peti(3)], rejection: 3.4, kind: 'TAYAR_MAAL' }] },
  { id: 4, contractorId: 4, itemId: 3, unit: 'KG', status: 'IN_PROCESS', rejectionKg: null, rejectionRate: null,
    sends: [{ id: 1, date: day(12), qty: 140, price: 600, jobPay: 30 }], returns: [] },
  { id: 5, contractorId: 5, itemId: 4, unit: 'KG', status: 'IN_PROCESS', rejectionKg: null, rejectionRate: null,
    sends: [{ id: 1, date: day(9), qty: 95, price: 615, jobPay: 36 }],
    returns: [{ id: 1, date: day(3), gross: 41.5, packs: [foam(4)], rejection: 0.5, kind: 'TAYAR_MAAL' }] },
  { id: 6, contractorId: 1, itemId: 6, unit: 'KG', status: 'REJECTED', rejectionKg: null, rejectionRate: null, remark: 'Wrong grade sent back',
    sends: [{ id: 1, date: day(70), qty: 60, price: 590, jobPay: 34 }],
    returns: [{ id: 1, date: day(66), gross: 59.1, packs: [bag(3)], rejection: 0, kind: 'MAAL' }] },
  { id: 7, contractorId: 2, itemId: 7, unit: 'KG', status: 'IN_PROCESS', rejectionKg: null, rejectionRate: null,
    sends: [{ id: 1, date: day(2), qty: 210, price: 620, jobPay: 39 }], returns: [] },
  { id: 8, contractorId: 6, itemId: 6, unit: 'KG', place: 'INHOUSE', status: 'IN_PROCESS', rejectionKg: null, rejectionRate: null, remark: 'Antique finish, order #1042',
    sends: [{ id: 1, date: day(14), qty: 80, price: 600, jobPay: 55 }],
    returns: [{ id: 1, date: day(5), gross: 46.2, packs: [peti(1)], rejection: 0.6, kind: 'TAYAR_MAAL' }] },
  { id: 9, contractorId: 7, itemId: 2, unit: 'KG', place: 'INHOUSE', status: 'COMPLETED', rejectionKg: null, rejectionRate: null,
    sends: [{ id: 1, date: day(35), qty: 60, price: 595, jobPay: 50 }],
    returns: [{ id: 1, date: day(27), gross: 60.4, packs: [bag(4)], rejection: 0.4, kind: 'TAYAR_MAAL' }] },
] as Seed[]).map(j => ({ ...j, place: j.place ?? 'OUTSIDE' })));

export const chromeLots = collection<ChromeLot>('prod.chrome', () => [
  { id: 1, jobId: 1, returnId: 1, partyId: 1, date: day(48), net: 122.0, packs: [peti(2)], rate: 85, status: 'COMPLETED',
    back: { date: day(41), gross: 123.9, packs: [peti(2)], rate: 737, stockItem: 'Brass Rod 12mm (Chrome)', stockUnit: 'Unit 1', pcs: 4880 } },
  { id: 2, jobId: 1, returnId: 2, partyId: 2, date: day(42), net: 116.7, packs: [peti(2)], rate: 82, status: 'IN_PROCESS' },
  { id: 3, jobId: 2, returnId: 1, partyId: 1, date: day(20), net: 92.0, packs: [peti(2)], rate: 88, status: 'IN_PROCESS', remark: 'Mirror finish' },
]);

export const contractorName = (id: number) => contractors.get(id)?.name ?? '—';
export const itemName = (id: number) => subItems.get(id)?.name ?? '—';
export const partyName = (id: number) => platingParties.get(id)?.name ?? '—';
export const jobNo = (j: Pick<Job, 'id' | 'sends'>) => `PBI-${j.id} (${(j.sends[0]?.date ?? iso(new Date())).slice(0, 4)})`;

/** Net of one return: gross less packaging and rejection, to the gram. */
export const returnNet = (r: JobReturn) => Math.max(0, r3(r.gross - packKg(r.packs) - r.rejection));

/** Everything the screens show about a job, worked out the way Parmeshwari's backend does. */
export function jobCalc(j: Job, lots: ChromeLot[] = []) {
  const sent = r3(j.sends.reduce((s, x) => s + x.qty, 0));
  const value = j.sends.reduce((s, x) => s + x.qty * x.price, 0);
  const pay = j.sends.reduce((s, x) => s + x.qty * x.jobPay, 0);
  const price = sent ? value / sent : 0;
  const jobPay = sent ? pay / sent : 0;
  const netReturned = r3(j.returns.reduce((s, r) => s + returnNet(r), 0));
  const grossReturned = r3(j.returns.reduce((s, r) => s + r.gross, 0));
  const returnsRejection = r3(j.returns.reduce((s, r) => s + r.rejection, 0));
  const rejection = j.rejectionKg ?? returnsRejection;
  const rejectionRate = j.rejectionRate ?? price;
  const rejectionAmount = rejection * rejectionRate;
  const myLots = lots.filter(l => l.jobId === j.id);
  const lotsByReturn = new Map<number, ChromeLot[]>();
  myLots.forEach(l => lotsByReturn.set(l.returnId, [...(lotsByReturn.get(l.returnId) || []), l]));
  return {
    sent, price, jobPay, value, netReturned, grossReturned, used: r3(sent - netReturned),
    pending: Math.max(0, r3(sent - grossReturned)),
    returnsRejection, rejection, rejectionRate, rejectionAmount, rejectionManual: j.rejectionKg !== null, rateManual: j.rejectionRate !== null,
    grossJobPay: pay, netJobPay: pay - rejectionAmount,
    returnedPct: sent ? Math.min(100, (netReturned / sent) * 100) : 0,
    lotsByReturn, chromeKg: r3(myLots.reduce((s, l) => s + l.net, 0)),
    firstDate: j.sends[0]?.date ?? '', lastReturn: j.returns[j.returns.length - 1]?.date,
  };
}
export type JobCalc = ReturnType<typeof jobCalc>;

/** What a return chunk still has free to send for plating. */
export const availableForChrome = (j: Job, returnId: number, lots: ChromeLot[]) => {
  const r = j.returns.find(x => x.id === returnId);
  if (!r) return 0;
  const used = lots.filter(l => l.jobId === j.id && l.returnId === returnId).reduce((s, l) => s + l.net, 0);
  return Math.max(0, r3(returnNet(r) - used));
};

/** Plated goods back: net, value and the gain / loss against what was sent. */
export function chromeCalc(l: ChromeLot) {
  const grossSent = r3(l.net + packKg(l.packs));
  if (!l.back) return { grossSent, backNet: 0, amount: 0, diff: 0 };
  const backNet = Math.max(0, r3(l.back.gross - packKg(l.back.packs)));
  return { grossSent, backNet, amount: backNet * l.back.rate, diff: r3(backNet - l.net) };
}
