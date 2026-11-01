import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileDown, Pencil, Plus, Sparkles, Trash2, Undo2 } from 'lucide-react';
import {
  RETURN_KIND, availableForChrome, chromeLots, contractorName, contractors, itemName, jobCalc, jobNo, jobs, nextId, packKg, platingParties,
  returnNet, subItems, type Job, type JobPlace, type JobReturn, type JobStatus, type JobUnit, type Pack, type ReturnKind, type Send,
} from '../../data/production';
import { Badge, Button, Card, Drawer, Empty, Field, PageHeader, SearchBox, Stat, Tabs, cx, fmtDate, inr, num, toast } from '../../ui';
import { SelectWithAdd, n } from '../inventory/shared';
import { today } from '../sales/shared';
import { Figure, JOB_STATUS, Line, PackagingEditor, money, newPack, packSummary, qty } from './shared';
import { chitthiNo, downloadChitthi } from '../../pdf/chitthi';
import { useSettings } from '../../settings';

const PAGE = 8;

/* ------------------------------- Job form -------------------------------- */

interface JobDraft { contractorId: number; itemId: number; date: string; qty: number; price: number; jobPay: number; unit: JobUnit; place: JobPlace; remark: string }
const blankJob = (): JobDraft => ({ contractorId: 0, itemId: 0, date: today(), qty: 0, price: 0, jobPay: 0, unit: 'KG', place: 'OUTSIDE', remark: '' });

/**
 * Add / edit a job. A new lot for a contractor + item that is already in process is added to that job
 * as another sent lot (Parmeshwari averages the rates by weight), instead of opening a second job.
 */
const JobForm: React.FC<{ job: Job | null; open: boolean; onClose: () => void }> = ({ job, open, onClose }) => {
  const people = contractors.use();
  const items = subItems.use();
  const all = jobs.use();
  const [f, setF] = useState<JobDraft>(blankJob());

  useEffect(() => {
    if (!open) return;
    if (job) {
      const c = jobCalc(job);
      setF({ contractorId: job.contractorId, itemId: job.itemId, date: c.firstDate, qty: c.sent, price: +c.price.toFixed(2), jobPay: +c.jobPay.toFixed(2), unit: job.unit, place: job.place, remark: job.remark || '' });
    } else setF(blankJob());
  }, [open, job]);

  const existing = !job && f.contractorId && f.itemId
    ? all.find(j => j.status === 'IN_PROCESS' && j.contractorId === f.contractorId && j.itemId === f.itemId)
    : undefined;
  const ex = existing ? jobCalc(existing) : null;

  const save = () => {
    if (!f.contractorId || !f.itemId || !(f.qty > 0)) { toast.err('Contractor, item and quantity sent are required'); return; }
    if (!(f.price > 0)) { toast.err('Enter the material rate'); return; }
    const remark = f.remark.trim() || undefined;
    if (job) {
      // Editing a single-lot job rewrites that lot; with several lots the header fields change and each lot is edited on its own.
      const sends = job.sends.length === 1 ? [{ ...job.sends[0], date: f.date, qty: f.qty, price: f.price, jobPay: f.jobPay }] : job.sends;
      jobs.update(job.id, { contractorId: f.contractorId, itemId: f.itemId, unit: f.unit, place: f.place, remark, sends });
      toast.ok('Job work updated');
    } else if (existing) {
      jobs.update(existing.id, { sends: [...existing.sends, { id: nextId(existing.sends), date: f.date, qty: f.qty, price: f.price, jobPay: f.jobPay, remark }] });
      toast.ok(`Lot added to ${jobNo(existing)}`);
    } else {
      jobs.create({ contractorId: f.contractorId, itemId: f.itemId, unit: f.unit, place: f.place, status: 'IN_PROCESS', rejectionKg: null, rejectionRate: null, remark,
        sends: [{ id: 1, date: f.date, qty: f.qty, price: f.price, jobPay: f.jobPay }], returns: [] });
      toast.ok('Job work created — download its chitthi from the card');
    }
    onClose();
  };

  const avg = (a: number, b: number) => (ex ? (ex.sent * a + f.qty * b) / (ex.sent + f.qty || 1) : b);
  const multi = !!job && job.sends.length > 1;

  return (
    <Drawer open={open} title={job ? `Edit ${jobNo(job)}` : 'Add job work'} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{existing ? 'Add lot' : 'Save'}</Button></>}>
      <div className="space-y-4">
        <Field label="Job work type">
          <Tabs value={f.place} onChange={p => setF({ ...f, place: p as JobPlace })}
            tabs={[{ id: 'OUTSIDE', label: 'Out-side · sent to a vendor' }, { id: 'INHOUSE', label: 'In-side · own plating shop' }]} />
        </Field>
        <Field label={f.place === 'INHOUSE' ? 'Party' : 'Contractor'}>
          <SelectWithAdd value={f.contractorId} options={people} getId={c => c.id} getLabel={c => c.name}
            onChange={id => setF(x => ({ ...x, contractorId: id }))} placeholder="Select contractor…" noun="Contractor"
            onCreate={async name => contractors.create({ name })} />
        </Field>
        <Field label="Item">
          <SelectWithAdd value={f.itemId} options={items} getId={i => i.id} getLabel={i => i.name}
            onChange={id => setF(x => ({ ...x, itemId: id }))} placeholder="Select item…" noun="Item"
            onCreate={async name => subItems.create({ name })} />
        </Field>
        {existing && ex && (
          <div className="rounded-lg bg-accent-soft p-3 text-[13px] text-accent">
            {jobNo(existing)} already has {qty(ex.sent, existing.unit)} of this item in process at {money(ex.price)} / {money(ex.jobPay)}.
            This is saved as another sent lot on that job; its rates become {money(avg(ex.price, f.price))} / {money(avg(ex.jobPay, f.jobPay))}.
          </div>
        )}
        {multi && <div className="rounded-lg bg-muted p-3 text-[13px] text-ink-2">This job has {job!.sends.length} sent lots. Edit quantities and rates on each lot from the card.</div>}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date sent"><input type="date" className="field" disabled={multi} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Quantity sent">
            <div className="flex gap-2">
              <input type="number" className="field" disabled={multi} value={f.qty || ''} onChange={e => setF({ ...f, qty: n(e.target.value) })} />
              <select className="field w-[76px]" value={f.unit} onChange={e => setF({ ...f, unit: e.target.value as JobUnit })}>
                <option value="KG">kg</option><option value="PC">pc</option>
              </select>
            </div>
          </Field>
          <Field label="Material rate (₹ / kg)"><input type="number" className="field" disabled={multi} value={f.price || ''} onChange={e => setF({ ...f, price: n(e.target.value) })} /></Field>
          <Field label="Job work rate (₹ / kg)"><input type="number" className="field" disabled={multi} value={f.jobPay || ''} onChange={e => setF({ ...f, jobPay: n(e.target.value) })} /></Field>
        </div>
        {f.qty > 0 && !multi && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-[13px]">
            <div><div className="text-ink-3">Material value</div><b>{inr(f.qty * f.price)}</b></div>
            <div><div className="text-ink-3">Job pay</div><b>{inr(f.qty * f.jobPay)}</b></div>
          </div>
        )}
        <Field label="Remark"><textarea className="field" rows={2} value={f.remark} onChange={e => setF({ ...f, remark: e.target.value })} /></Field>
      </div>
    </Drawer>
  );
};

/* ---------------------------- Edit one sent lot --------------------------- */

const SendForm: React.FC<{ target: { job: Job; send: Send } | null; onClose: () => void }> = ({ target, onClose }) => {
  const [s, setS] = useState<Send | null>(null);
  useEffect(() => setS(target ? { ...target.send } : null), [target]);
  if (!target || !s) return null;
  const save = () => {
    if (!(s.qty > 0)) { toast.err('Quantity must be more than 0'); return; }
    jobs.update(target.job.id, { sends: target.job.sends.map(x => (x.id === s.id ? { ...s, remark: s.remark?.trim() || undefined } : x)) });
    toast.ok('Sent lot updated');
    onClose();
  };
  return (
    <Drawer open title={`Sent lot · ${fmtDate(target.send.date)}`} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date sent"><input type="date" className="field" value={s.date} onChange={e => setS({ ...s, date: e.target.value })} /></Field>
        <Field label={`Quantity (${target.job.unit.toLowerCase()})`}><input type="number" className="field" value={s.qty || ''} onChange={e => setS({ ...s, qty: n(e.target.value) })} /></Field>
        <Field label="Material rate (₹)"><input type="number" className="field" value={s.price || ''} onChange={e => setS({ ...s, price: n(e.target.value) })} /></Field>
        <Field label="Job work rate (₹)"><input type="number" className="field" value={s.jobPay || ''} onChange={e => setS({ ...s, jobPay: n(e.target.value) })} /></Field>
        <Field label="Remark" className="col-span-2"><input className="field" value={s.remark || ''} onChange={e => setS({ ...s, remark: e.target.value })} /></Field>
      </div>
    </Drawer>
  );
};

/* ------------------------------ Return form ------------------------------ */

const ReturnForm: React.FC<{ target: { job: Job; ret: JobReturn | null } | null; onClose: () => void }> = ({ target, onClose }) => {
  const [date, setDate] = useState(today());
  const [gross, setGross] = useState(0);
  const [packs, setPacks] = useState<Pack[]>([newPack()]);
  const [rejection, setRejection] = useState(0);
  const [kind, setKind] = useState<ReturnKind>('TAYAR_MAAL');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (!target) return;
    const r = target.ret;
    setDate(r?.date ?? today()); setGross(r?.gross ?? 0); setPacks(r?.packs.length ? r.packs : [newPack()]);
    setRejection(r?.rejection ?? 0); setKind(r?.kind ?? 'TAYAR_MAAL'); setRemark(r?.remark ?? '');
  }, [target]);
  if (!target) return null;
  const { job, ret } = target;
  const c = jobCalc(job);
  const tare = packKg(packs);
  const net = Math.max(0, gross - tare - rejection);
  const others = job.returns.filter(r => r.id !== ret?.id).reduce((s, r) => s + returnNet(r), 0);
  const over = others + net - c.sent;

  const save = () => {
    if (!(gross > 0)) { toast.err('Enter the gross weight received'); return; }
    if (date < c.firstDate) { toast.err('Return date cannot be before the order date'); return; }
    if (tare + rejection >= gross) { toast.err('Packaging + rejection cannot be more than the gross weight'); return; }
    const row: JobReturn = { id: ret?.id ?? nextId(job.returns), date, gross, packs: packs.filter(p => p.count > 0), rejection, kind, remark: remark.trim() || undefined };
    const returns = ret ? job.returns.map(r => (r.id === ret.id ? row : r)) : [...job.returns, row].sort((a, b) => a.date.localeCompare(b.date));
    jobs.update(job.id, { returns });
    toast.ok(ret ? 'Return updated' : 'Return recorded');
    if (!ret && Math.abs(others + net - c.sent) < 0.5) toast.ok('Everything sent is back — you can mark the job completed');
    onClose();
  };

  return (
    <Drawer open title={`${ret ? 'Edit return' : 'Return record'} · ${jobNo(job)}`} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{ret ? 'Save' : 'Save return'}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-[13px]">
          <Figure label="Sent" value={qty(c.sent, job.unit)} />
          <Figure label="Back so far" value={qty(others)} />
          <Figure label="Still out" value={qty(Math.max(0, c.sent - others))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Return date"><input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="What came back">
            <select className="field" value={kind} onChange={e => setKind(e.target.value as ReturnKind)}>
              {(Object.keys(RETURN_KIND) as ReturnKind[]).map(k => <option key={k} value={k}>{RETURN_KIND[k]}</option>)}
            </select>
          </Field>
          <Field label="Gross return (kg)"><input type="number" className="field" value={gross || ''} onChange={e => setGross(n(e.target.value))} /></Field>
          <Field label="Rejection (kg)"><input type="number" className="field" value={rejection || ''} onChange={e => setRejection(n(e.target.value))} /></Field>
        </div>
        <PackagingEditor rows={packs} onChange={setPacks} />
        <div className="space-y-0.5 rounded-lg bg-accent-soft px-4 py-3 text-[13px]">
          <Line label="Gross return" value={qty(gross)} />
          <Line label="Packaging" value={`− ${qty(tare)}`} />
          <Line label="Rejection" value={`− ${qty(rejection)}`} />
          <Line strong label="Net return" value={<span className="text-accent">{qty(net)}</span>} />
        </div>
        {over > 0.001 && <div className="rounded-lg bg-amber-500/15 p-3 text-[13px] text-amber-700 dark:text-amber-400">Net returns would be {qty(over)} more than was sent. Check the weight.</div>}
        <Field label="Remark"><input className="field" value={remark} onChange={e => setRemark(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
};

/* ---------------------------- Rejection form ---------------------------- */

/** Set the rejected kg and its rate by hand. Matching the default puts the job back on its returns' total / material rate. */
export const RejectionForm: React.FC<{ job: Job | null; onClose: () => void }> = ({ job, onClose }) => {
  const [kg, setKg] = useState(0);
  const [rate, setRate] = useState(0);
  useEffect(() => { if (job) { const c = jobCalc(job); setKg(c.rejection); setRate(+c.rejectionRate.toFixed(2)); } }, [job]);
  if (!job) return null;
  const c = jobCalc(job);
  const save = () => {
    if (kg < 0 || rate < 0) { toast.err('Rejection and rate cannot be negative'); return; }
    jobs.update(job.id, {
      rejectionKg: Math.abs(kg - c.returnsRejection) < 0.0005 ? null : kg,
      rejectionRate: Math.abs(rate - c.price) < 0.005 ? null : rate,
    });
    toast.ok('Rejection saved');
    onClose();
  };
  return (
    <Drawer open title={`Rejection · ${jobNo(job)}`} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <p className="text-ink-2">Rejected material is charged to the job worker at this rate and taken off their job pay.</p>
        <Field label="Rejection (kg)">
          <div className="flex gap-2">
            <input type="number" className="field" value={kg || ''} onChange={e => setKg(n(e.target.value))} />
            <Button variant="outline" onClick={() => setKg(c.returnsRejection)} title="Use the returns' total">Returns: {num(c.returnsRejection, 3)}</Button>
          </div>
        </Field>
        <Field label="Rate per kg (₹)">
          <div className="flex gap-2">
            <input type="number" className="field" value={rate || ''} onChange={e => setRate(n(e.target.value))} />
            <Button variant="outline" onClick={() => setRate(+c.price.toFixed(2))} title="Use the material rate">Market: {num(c.price, 2)}</Button>
          </div>
        </Field>
        <div className="space-y-0.5 rounded-lg bg-muted px-4 py-3 text-[13px]">
          <Line label="Job pay" value={money(c.grossJobPay)} />
          <Line label={`Rejection ${num(kg, 3)} kg × ${money(rate)}`} value={<span className="text-red-600">− {money(kg * rate)}</span>} />
          <Line strong label="Net job pay" value={money(c.grossJobPay - kg * rate)} />
        </div>
      </div>
    </Drawer>
  );
};

/* ---------------------------- Send to chrome ---------------------------- */

const ChromeForm: React.FC<{ target: { job: Job; ret: JobReturn } | null; onClose: () => void }> = ({ target, onClose }) => {
  const parties = platingParties.use();
  const lots = chromeLots.use();
  const [f, setF] = useState({ partyId: 0, date: today(), net: 0, rate: 0, remark: '' });
  const [packs, setPacks] = useState<Pack[]>([newPack('PETI')]);
  const available = target ? availableForChrome(target.job, target.ret.id, lots) : 0;

  useEffect(() => {
    if (!target) return;
    setF({ partyId: 0, date: today(), net: availableForChrome(target.job, target.ret.id, chromeLots.all()), rate: 0, remark: '' });
    setPacks([newPack('PETI')]);
  }, [target]);
  if (!target) return null;

  const save = () => {
    if (!f.partyId || !(f.net > 0)) { toast.err('Choose the plating party and quantity'); return; }
    // Weighed to the gram, so half a gram over the available stock still counts as the full lot.
    if (f.net > available + 0.0005) { toast.err(`Only ${num(available, 3)} kg is available`); return; }
    chromeLots.create({ jobId: target.job.id, returnId: target.ret.id, partyId: f.partyId, date: f.date, net: f.net, packs: packs.filter(p => p.count > 0),
      rate: f.rate, status: 'IN_PROCESS', remark: f.remark.trim() || undefined });
    toast.ok('Sent for chrome plating');
    onClose();
  };

  return (
    <Drawer open title="Send to chrome" onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Send</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-[13px]">
          <Figure label="Contractor" value={contractorName(target.job.contractorId)} />
          <Figure label="Item" value={itemName(target.job.itemId)} />
          <Figure label="Available" value={qty(available)} tone="text-accent" sub={`Return of ${fmtDate(target.ret.date)}`} />
        </div>
        <Field label="Plating party">
          <SelectWithAdd value={f.partyId} options={parties} getId={p => p.id} getLabel={p => p.name}
            onChange={id => setF({ ...f, partyId: id })} placeholder="Select party…" noun="Party"
            onCreate={async name => platingParties.create({ name })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Chrome date"><input type="date" className="field" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Net stock (kg)"><input type="number" className="field" value={f.net || ''} onChange={e => setF({ ...f, net: n(e.target.value) })} /></Field>
        </div>
        <PackagingEditor rows={packs} onChange={setPacks} />
        <div className="space-y-0.5 rounded-lg bg-accent-soft px-4 py-3 text-[13px]">
          <Line label="Net stock" value={qty(f.net)} />
          <Line label="Packaging" value={`+ ${qty(packKg(packs))}`} />
          <Line strong label="Gross weight" value={<span className="text-accent">{qty(f.net + packKg(packs))}</span>} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Crome amount (₹ / kg)"><input type="number" className="field" value={f.rate || ''} onChange={e => setF({ ...f, rate: n(e.target.value) })} /></Field>
          <Field label="Remark"><input className="field" value={f.remark} onChange={e => setF({ ...f, remark: e.target.value })} /></Field>
        </div>
      </div>
    </Drawer>
  );
};

/* ----------------------------- Delete impact ----------------------------- */

/** Shows what deleting a job takes with it; a job whose plated goods went back into stock can't be deleted. */
const DeleteJob: React.FC<{ job: Job | null; onClose: () => void }> = ({ job, onClose }) => {
  const lots = chromeLots.use();
  if (!job) return null;
  const mine = lots.filter(l => l.jobId === job.id);
  const inStock = mine.filter(l => l.back?.stockItem);
  const confirm = () => {
    mine.forEach(l => chromeLots.remove(l.id));
    jobs.remove(job.id);
    toast.ok(`${jobNo(job)} deleted`);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-surface p-5 shadow-2xl">
        <h2 className="text-[16px] font-semibold">Delete job work {jobNo(job)}?</h2>
        <p className="mt-2 text-ink-2">{contractorName(job.contractorId)} · {itemName(job.itemId)}, with {job.sends.length} sent lot{job.sends.length > 1 ? 's' : ''} and {job.returns.length} return{job.returns.length === 1 ? '' : 's'}.</p>
        {mine.length > 0 && (
          <div className="mt-3 rounded-lg bg-muted p-3 text-[13px]">
            <div className="font-medium">Also removes {mine.length} chrome lot{mine.length > 1 ? 's' : ''}</div>
            {mine.map(l => <div key={l.id} className="text-ink-2">{fmtDate(l.date)} · {qty(l.net)}{l.back ? ' · returned' : ''}</div>)}
          </div>
        )}
        {inStock.length > 0 && (
          <div className="mt-3 rounded-lg bg-red-500/12 p-3 text-[13px] text-red-600 dark:text-red-400">
            Can't delete: {inStock.length} plated lot{inStock.length > 1 ? 's were' : ' was'} added to stock ({inStock.map(l => l.back!.stockItem).join(', ')}). Delete that chrome return first.
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={inStock.length > 0} onClick={confirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------- Job card -------------------------------- */

const Collapse: React.FC<{ title: string; open: boolean; onToggle: () => void }> = ({ title, open, onToggle }) => (
  <button type="button" onClick={onToggle} className="flex w-full items-center justify-between py-1 text-left font-semibold">
    <span>{title}</span>
    <span className="flex items-center gap-1 text-[12px] font-normal text-ink-3">{open ? 'Collapse' : 'Expand'}<ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} /></span>
  </button>
);

const JobCard: React.FC<{
  job: Job;
  onEdit: () => void; onDelete: () => void; onChitthi: () => void; onReturn: (r: JobReturn | null) => void;
  onSend: (s: Send) => void; onRejection: () => void; onChrome: (r: JobReturn) => void;
}> = ({ job, onEdit, onDelete, onChitthi, onReturn, onSend, onRejection, onChrome }) => {
  const lots = chromeLots.use();
  const c = jobCalc(job, lots);
  const [showSends, setShowSends] = useState(false);
  const [showReturns, setShowReturns] = useState(false);
  const u = job.unit;
  const chunksInChrome = job.returns.filter(r => c.lotsByReturn.has(r.id)).length;

  const setStatus = (s: JobStatus) => { jobs.update(job.id, { status: s }); toast.ok(`Marked ${JOB_STATUS[s].label.toLowerCase()}`); };
  const removeSend = (s: Send) => {
    if (job.sends.length === 1) { toast.err('A job needs at least one sent lot — delete the job instead'); return; }
    if (!window.confirm(`Delete the lot of ${qty(s.qty, u)} sent on ${fmtDate(s.date)}?`)) return;
    jobs.update(job.id, { sends: job.sends.filter(x => x.id !== s.id) });
    toast.ok('Sent lot deleted');
  };
  const removeReturn = (r: JobReturn) => {
    if (!window.confirm(`Delete the return of ${qty(r.gross)} on ${fmtDate(r.date)}?`)) return;
    jobs.update(job.id, { returns: job.returns.filter(x => x.id !== r.id) });
    toast.ok('Return deleted');
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold">{jobNo(job)}</h3>
            <Badge tone={JOB_STATUS[job.status].tone}>{JOB_STATUS[job.status].label}</Badge>
            {job.sends.length > 1 && <Badge tone="blue">{job.sends.length} lots</Badge>}
            {job.place === 'INHOUSE' && <Badge tone="accent">In-side</Badge>}
          </div>
          <div className="mt-0.5 text-ink-2"><b className="text-ink">{contractorName(job.contractorId)}</b> · {itemName(job.itemId)}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-[12px] text-ink-3">
            <div>Order date {fmtDate(c.firstDate)}</div>
            {c.lastReturn && <div>Last return {fmtDate(c.lastReturn)}</div>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" title={`Chitthi ${chitthiNo(job.id)}`} icon={<FileDown size={15} />} onClick={onChitthi} />
            <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={15} />} onClick={onEdit} />
            <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={15} />} onClick={onDelete} />
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 bg-muted/50 px-5 py-3 sm:grid-cols-4">
        <Figure label="Sent" value={qty(c.sent, u)} />
        <Figure label="Net returned" value={qty(c.netReturned, u)} tone="text-emerald-600 dark:text-emerald-400" />
        <Figure label="Used stock" value={qty(c.used, u)} />
        <Figure label="In chrome" value={<span className="text-violet-600 dark:text-violet-400">{chunksInChrome}/{job.returns.length} chunks</span>} sub={c.chromeKg > 0 ? qty(c.chromeKg) : undefined} />
      </div>
      <div className="h-1 bg-muted" title={`${c.returnedPct.toFixed(1)}% returned`}>
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${c.returnedPct}%` }} />
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        {/* Sent details */}
        <div className="rounded-lg border border-line p-4">
          {job.sends.length > 1
            ? <Collapse title={`Sent details (${job.sends.length})`} open={showSends} onToggle={() => setShowSends(v => !v)} />
            : <div className="py-1 font-semibold">Sent details</div>}
          {showSends && job.sends.length > 1 && (
            <div className="my-2 divide-y divide-line rounded-md bg-muted/60">
              {job.sends.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between"><span className="font-medium">{fmtDate(s.date)}</span><span className="tabular-nums">{qty(s.qty, u)}</span></div>
                    <div className="flex justify-between text-ink-3"><span>Rate {money(s.price)} · Job {money(s.jobPay)}</span><span>{money(s.qty * s.price)}</span></div>
                    {s.remark && <div className="text-ink-3">{s.remark}</div>}
                  </div>
                  <Button size="sm" variant="ghost" title="Edit lot" icon={<Pencil size={13} />} onClick={() => onSend(s)} />
                  <Button size="sm" variant="ghost" title="Delete lot" icon={<Trash2 size={13} />} onClick={() => removeSend(s)} />
                </div>
              ))}
            </div>
          )}
          <Line label="Sent stock" value={qty(c.sent, u)} />
          <Line label={job.sends.length > 1 ? 'Avg rate' : 'Rate'} value={`${money(c.price)} / ${u.toLowerCase()}`} />
          <Line label={job.sends.length > 1 ? 'Avg job work' : 'Job work'} value={`${money(c.jobPay)} / ${u.toLowerCase()}`} />
          <Line strong label="Total value" value={money(c.value)} />
          <Line label="Job pay" value={money(c.grossJobPay)} />
          {c.rejection > 0 && <>
            <Line label={<>Rejection {num(c.rejection, 3)} kg × {money(c.rejectionRate)} {(c.rejectionManual || c.rateManual) && <Badge tone="amber">edited</Badge>}</>}
              value={<span className="text-red-600 dark:text-red-400">− {money(c.rejectionAmount)}</span>} />
            <Line strong label="Net job pay" value={money(c.netJobPay)} />
          </>}
        </div>

        {/* Return details */}
        {job.returns.length ? (
          <div className="rounded-lg border border-line p-4">
            <Collapse title={`Return details (${job.returns.length})`} open={showReturns} onToggle={() => setShowReturns(v => !v)} />
            {showReturns && (
              <div className="my-2 divide-y divide-line rounded-md bg-muted/60">
                {job.returns.map(r => {
                  const rl = c.lotsByReturn.get(r.id);
                  const back = !!rl && rl.every(l => l.back);
                  return (
                    <div key={r.id} className="px-3 py-2 text-[13px]">
                      <div className="flex justify-between">
                        <span className="font-medium">{fmtDate(r.date)} <span className="font-normal text-ink-3">· {RETURN_KIND[r.kind]}</span></span>
                        <span className="tabular-nums">{qty(r.gross)} <span className="text-ink-3">(gr)</span></span>
                      </div>
                      <div className="flex justify-between text-ink-3">
                        <span>Pkg {packSummary(r.packs)}{r.rejection > 0 && <> · Rej {num(r.rejection, 3)}</>}</span>
                        <span className="font-medium text-ink">Net {num(returnNet(r), 3)}</span>
                      </div>
                      {r.remark && <div className="text-ink-3">{r.remark}</div>}
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        {rl
                          ? <Badge tone={back ? 'green' : 'accent'}>{back ? 'Chrome returned' : 'In chrome'} · {qty(rl.reduce((s, l) => s + l.net, 0))}</Badge>
                          : <Button size="sm" variant="outline" icon={<Sparkles size={13} />} onClick={() => onChrome(r)}>Send to chrome</Button>}
                        <div className="flex">
                          <Button size="sm" variant="ghost" title="Edit return" icon={<Pencil size={13} />} onClick={() => onReturn(r)} />
                          {!rl && <Button size="sm" variant="ghost" title="Delete return" icon={<Trash2 size={13} />} onClick={() => removeReturn(r)} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Line label="Gross returned" value={qty(c.grossReturned)} />
            <Line label="Rejection on returns" value={qty(c.returnsRejection)} />
            <Line label="Still with job worker" value={qty(c.pending, u)} />
            <Line strong label="Total net return" value={qty(c.netReturned, u)} />
          </div>
        ) : (
          <div className="grid place-items-center rounded-lg border border-dashed border-line p-6 text-ink-3">Pending return</div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        <span className="mr-1 text-[12px] font-medium uppercase tracking-wide text-ink-3">Processes</span>
        <select className="field h-8 w-[140px]" value={job.status} onChange={e => setStatus(e.target.value as JobStatus)}>
          {(Object.keys(JOB_STATUS) as JobStatus[]).map(s => <option key={s} value={s}>{JOB_STATUS[s].label}</option>)}
        </select>
        <Button size="sm" icon={<Undo2 size={14} />} onClick={() => onReturn(null)}>Return record</Button>
        <Button size="sm" variant="outline" onClick={onRejection}>Rejection{c.rejection > 0 ? ` · ${num(c.rejection, 3)} kg` : ''}</Button>
        {job.remark && <span className="ml-auto max-w-md truncate text-[13px] text-ink-2" title={job.remark}><b>Remark:</b> {job.remark}</span>}
      </div>
    </Card>
  );
};

/* ---------------------------------- Page ---------------------------------- */

const Subcontracting: React.FC = () => {
  const { settings } = useSettings();
  const all = jobs.use();
  const lots = chromeLots.use();
  const people = contractors.use();
  subItems.use();
  const [tab, setTab] = useState<JobStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [who, setWho] = useState(0);
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<{ job: Job | null } | null>(null);
  const [sendEdit, setSendEdit] = useState<{ job: Job; send: Send } | null>(null);
  const [ret, setRet] = useState<{ job: Job; ret: JobReturn | null } | null>(null);
  const [rejecting, setRejecting] = useState<Job | null>(null);
  const [chrome, setChrome] = useState<{ job: Job; ret: JobReturn } | null>(null);
  const [deleting, setDeleting] = useState<Job | null>(null);

  const sorted = useMemo(() => [...all].sort((a, b) => (b.sends[0]?.date ?? '').localeCompare(a.sends[0]?.date ?? '') || b.id - a.id), [all]);
  const rows = useMemo(() => sorted.filter(j =>
    (tab === 'ALL' || j.status === tab) && (!who || j.contractorId === who)
    && `${jobNo(j)} ${contractorName(j.contractorId)} ${itemName(j.itemId)}`.toLowerCase().includes(search.toLowerCase()),
  ), [sorted, tab, who, search]);
  useEffect(() => setPage(0), [tab, who, search]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const slice = rows.slice(page * PAGE, page * PAGE + PAGE);

  const calcs = all.map(j => jobCalc(j, lots));
  const open = all.filter(j => j.status === 'IN_PROCESS');
  const outKg = all.reduce((s, j, i) => s + (j.status === 'IN_PROCESS' ? calcs[i].pending : 0), 0);

  // Keep open drawers showing the latest copy of the job after each save.
  const fresh = (j: Job) => all.find(x => x.id === j.id) ?? j;
  const retTarget = useMemo(() => ret && { job: fresh(ret.job), ret: ret.ret }, [ret, all]); // eslint-disable-line react-hooks/exhaustive-deps
  const chromeTarget = useMemo(() => chrome && { job: fresh(chrome.job), ret: chrome.ret }, [chrome, all]); // eslint-disable-line react-hooks/exhaustive-deps
  const formJob = useMemo(() => (form?.job ? fresh(form.job) : null), [form, all]); // eslint-disable-line react-hooks/exhaustive-deps
  const rejectJob = useMemo(() => rejecting && fresh(rejecting), [rejecting, all]); // eslint-disable-line react-hooks/exhaustive-deps
  const chitthi = (j: Job) => {
    try { downloadChitthi(j, { name: settings.companyName, tagline: settings.tagline, accent: settings.accent }); }
    catch { toast.err('Could not create the chitthi'); }
  };

  return (
    <>
      <PageHeader title="Subcontracting (Job work)" subtitle="Track materials, processes, and billing for subcontracting work."
        actions={<Button icon={<Plus size={16} />} onClick={() => setForm({ job: null })}>Add job work</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total orders" value={all.length} hint={`${open.length} in process`} />
        <Stat label="Out with contractors" value={`${num(outKg, 1)} kg`} hint="sent, not yet back" />
        <Stat label="Completed" value={all.filter(j => j.status === 'COMPLETED').length} />
        <Stat label="Total billed amount" value={inr(calcs.reduce((s, c) => s + c.value, 0))} hint={`Net job pay ${inr(calcs.reduce((s, c) => s + c.netJobPay, 0))}`} />
      </div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Tabs value={tab} onChange={t => setTab(t as JobStatus | 'ALL')}
            tabs={[{ id: 'ALL', label: 'All' }, { id: 'IN_PROCESS', label: 'In process' }, { id: 'COMPLETED', label: 'Completed' }, { id: 'REJECTED', label: 'Rejected' }]} />
          <select className="field h-9 w-[200px]" value={who} onChange={e => setWho(Number(e.target.value))}>
            <option value={0}>All contractors</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search by name or order" /></div>
        </div>
      </Card>

      {!rows.length ? (
        <Card><Empty title="No subcontracting orders found" hint="Change the filters or add a job work." action={<Button icon={<Plus size={15} />} onClick={() => setForm({ job: null })}>Add job work</Button>} /></Card>
      ) : (
        <div className="space-y-4">
          {slice.map(j => (
            <JobCard key={j.id} job={j}
              onEdit={() => setForm({ job: j })} onDelete={() => setDeleting(j)} onChitthi={() => chitthi(j)}
              onReturn={r => setRet({ job: j, ret: r })} onSend={s => setSendEdit({ job: j, send: s })}
              onRejection={() => setRejecting(j)} onChrome={r => setChrome({ job: j, ret: r })} />
          ))}
          {pages > 1 && (
            <div className="flex items-center justify-between text-[13px] text-ink-2">
              <span>{page * PAGE + 1}–{Math.min(rows.length, (page + 1) * PAGE)} of {rows.length} orders</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <JobForm open={!!form} job={formJob} onClose={() => setForm(null)} />
      <SendForm target={sendEdit} onClose={() => setSendEdit(null)} />
      <ReturnForm target={retTarget} onClose={() => setRet(null)} />
      <RejectionForm job={rejectJob} onClose={() => setRejecting(null)} />
      <ChromeForm target={chromeTarget} onClose={() => setChrome(null)} />
      <DeleteJob job={deleting} onClose={() => setDeleting(null)} />
    </>
  );
};

export default Subcontracting;
