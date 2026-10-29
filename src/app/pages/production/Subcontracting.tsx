import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, Pencil, Plus, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { subcontractingApi } from '../../../api/subcontracting';
import { cromeApi } from '../../../api/crome';
import type {
  Contractor, CromeRequest, PackagingDetail, Party, SubItem, SubOrderRequest, SubReturn, Subcontracting as Job, SubcontractingStatus,
} from '../../../types';
import {
  Badge, Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, Stat, Tabs, fmtDate, inr, num, toast, useAsync,
} from '../../ui';
import { SelectWithAdd, n } from '../inventory/shared';
import { fetchAllPages, today } from '../sales/shared';
import { JOB_STATUS, PackagingEditor, newPackaging, packagingKg } from './shared';
import { chitthiNo, downloadChitthi } from '../../pdf/chitthi';
import { useSettings } from '../../settings';

const netOf = (r: SubReturn) => r.netReturnStock ?? r.returnStock - packagingKg(r.packagings || []);

/* ------------------------------- Job form -------------------------------- */

const blankJob = (): SubOrderRequest => ({ contractorId: 0, itemId: 0, orderDate: today(), sentStock: 0, jobWorkPay: 0, price: 0, unit: 'KG', remark: '' });

const JobForm: React.FC<{ job: Job | null; open: boolean; jobs: Job[]; onClose: () => void; onSaved: () => void }> = ({ job, open, jobs, onClose, onSaved }) => {
  const [form, setForm] = useState<SubOrderRequest>(blankJob());
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [items, setItems] = useState<SubItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([subcontractingApi.getContractorList(), subcontractingApi.getSubItemList()])
      .then(([c, i]) => { setContractors(c); setItems(i); })
      .catch(() => toast.err('Could not load contractors and items'));
    setForm(job ? {
      contractorId: job.contractor.contractorId, itemId: job.item.subItemId, orderDate: job.orderDate, sentStock: job.sentStock,
      jobWorkPay: job.jobWorkPay, price: job.price, unit: job.unit, remark: job.remark || '',
    } : blankJob());
  }, [open, job]);

  // A new batch for a contractor + item that is still in process is added to that job, with rates averaged by weight.
  const existing = !job && form.contractorId && form.itemId
    ? jobs.find(j => j.status === 'IN_PROCESS' && j.contractor.contractorId === form.contractorId && j.item.subItemId === form.itemId)
    : undefined;

  const save = async () => {
    if (!form.contractorId || !form.itemId || !(form.sentStock > 0)) { toast.err('Contractor, item and quantity sent are required'); return; }
    let payload = { ...form, remark: form.remark?.trim() || undefined };
    if (existing) {
      const total = existing.sentStock + form.sentStock;
      payload = {
        ...payload,
        price: Number(((existing.sentStock * existing.price + form.sentStock * form.price) / total).toFixed(2)),
        jobWorkPay: Number(((existing.sentStock * existing.jobWorkPay + form.sentStock * form.jobWorkPay) / total).toFixed(2)),
      };
    }
    setBusy(true);
    try {
      if (job) await subcontractingApi.updateSubcontracting(job.subcontractingId, payload);
      else await subcontractingApi.addSubcontracting(payload);
      toast.ok(job ? 'Job updated' : existing ? 'Added to the running job' : 'Job created — download its chitthi from the list');
      onSaved();
    } catch {
      toast.err('Could not save the job');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} title={job ? 'Edit job' : 'Send for job work'} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Contractor">
          <SelectWithAdd value={form.contractorId} options={contractors} getId={c => c.contractorId} getLabel={c => c.name}
            onChange={id => setForm(f => ({ ...f, contractorId: id }))} placeholder="Select contractor…" noun="Contractor"
            onCreate={async name => { const c = await subcontractingApi.addContractor(name); setContractors(l => [...l, c]); return c; }} />
        </Field>
        <Field label="Item">
          <SelectWithAdd value={form.itemId} options={items} getId={i => i.subItemId} getLabel={i => i.name}
            onChange={id => setForm(f => ({ ...f, itemId: id }))} placeholder="Select item…" noun="Item"
            onCreate={async name => { const i = await subcontractingApi.addSubItem(name); setItems(l => [...l, i]); return i; }} />
        </Field>
        {existing && (
          <div className="rounded-lg bg-accent-soft p-3 text-[13px] text-accent">
            This contractor already has {num(existing.sentStock, 2)} {existing.unit.toLowerCase()} of this item in process. The new quantity is added to that job and the rates are averaged.
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date sent"><input type="date" className="field" value={form.orderDate} onChange={e => setForm({ ...form, orderDate: e.target.value })} /></Field>
          <Field label="Quantity sent">
            <div className="flex gap-2">
              <input type="number" className="field" value={form.sentStock || ''} onChange={e => setForm({ ...form, sentStock: n(e.target.value) })} />
              <select className="field w-[80px]" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value as SubOrderRequest['unit'] })}>
                <option value="KG">kg</option><option value="PC">pc</option>
              </select>
            </div>
          </Field>
          <Field label="Material rate (₹)"><input type="number" className="field" value={form.price || ''} onChange={e => setForm({ ...form, price: n(e.target.value) })} /></Field>
          <Field label="Job work rate (₹)"><input type="number" className="field" value={form.jobWorkPay || ''} onChange={e => setForm({ ...form, jobWorkPay: n(e.target.value) })} /></Field>
        </div>
        <Field label="Remark"><textarea className="field" rows={2} value={form.remark || ''} onChange={e => setForm({ ...form, remark: e.target.value })} /></Field>
      </div>
    </Drawer>
  );
};

/* ------------------------------ Return form ------------------------------ */

const ReturnForm: React.FC<{ job: Job | null; onClose: () => void; onSaved: () => void }> = ({ job, onClose, onSaved }) => {
  const [date, setDate] = useState(today());
  const [gross, setGross] = useState(0);
  const [packs, setPacks] = useState<PackagingDetail[]>([newPackaging()]);
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (job) { setDate(today()); setGross(0); setPacks([newPackaging()]); setRemark(''); } }, [job]);
  if (!job) return null;

  const tare = packagingKg(packs);
  const net = gross - tare;
  const returnedSoFar = (job.subReturns || []).reduce((s, r) => s + r.returnStock, 0);

  const save = async () => {
    if (!(gross > 0) || net <= 0) { toast.err('Enter the gross weight received (more than the packaging)'); return; }
    setBusy(true);
    try {
      await subcontractingApi.returnSubcontracting(job.subcontractingId, {
        returnDate: date, returnStock: gross, packagings: packs.filter(p => p.packagingCount > 0), returnRemark: remark.trim() || null,
      });
      toast.ok('Return recorded');
      if (Math.abs(returnedSoFar + gross - job.sentStock) < 0.001) toast.ok('Everything sent is back — you can mark the job completed');
      onSaved();
    } catch {
      toast.err('Could not record the return');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open title={`Record return · ${job.contractor.name}`} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save return</Button></>}>
      <div className="space-y-4">
        <div className="rounded-lg bg-muted p-3 text-[13px]">
          {job.item.name} · sent {num(job.sentStock, 2)} {job.unit.toLowerCase()} · returned so far {num(returnedSoFar, 2)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date"><input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="Gross weight received (kg)"><input type="number" className="field" value={gross || ''} onChange={e => setGross(n(e.target.value))} /></Field>
        </div>
        <PackagingEditor rows={packs} onChange={setPacks} />
        <div className="flex justify-between rounded-lg bg-accent-soft px-4 py-3"><span>Net received</span><b className="text-accent">{num(Math.max(0, net), 3)} kg</b></div>
        <Field label="Remark"><input className="field" value={remark} onChange={e => setRemark(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
};

/* ---------------------------- Send to chrome ---------------------------- */

export const ChromeForm: React.FC<{ target: { job: Job; ret: SubReturn } | null; onClose: () => void; onSaved: () => void }> = ({ target, onClose, onSaved }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [form, setForm] = useState({ partyId: 0, date: today(), sent: 0, amount: 0, remark: '' });
  const [packs, setPacks] = useState<PackagingDetail[]>([newPackaging('PETI')]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setAvailable(null);
    Promise.all([cromeApi.getPartyList(), cromeApi.getSubReturnCromeInfo(target.ret.returnId!)])
      .then(([p, info]) => { setParties(p); setAvailable(info.availableStockForCrome); setForm(f => ({ ...f, sent: info.availableStockForCrome })); })
      .catch(() => toast.err('Could not load chrome details'));
    setForm({ partyId: 0, date: today(), sent: 0, amount: 0, remark: '' });
    setPacks([newPackaging('PETI')]);
  }, [target]);
  if (!target) return null;

  const save = async () => {
    if (!form.partyId || !(form.sent > 0)) { toast.err('Choose the plating party and quantity'); return; }
    if (available !== null && form.sent > available + 0.001) { toast.err(`Only ${num(available, 3)} kg is available`); return; }
    const payload: CromeRequest = {
      subcontractingReturnId: target.ret.returnId!, partyId: form.partyId, cromeDate: form.date, sentStock: form.sent,
      packagings: packs.filter(p => p.packagingCount > 0), cromeAmount: form.amount || null, remark: form.remark.trim() || null,
    };
    setBusy(true);
    try {
      await cromeApi.addCrome(payload);
      toast.ok('Sent for chrome plating');
      onSaved();
    } catch {
      toast.err('Could not send for plating');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open title="Send for chrome plating" onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Send</Button></>}>
      <div className="space-y-4">
        <div className="rounded-lg bg-muted p-3 text-[13px]">
          {target.job.item.name} from {target.job.contractor.name}, returned {fmtDate(target.ret.returnDate)} ·
          available {available === null ? '…' : `${num(available, 3)} kg`}
        </div>
        <Field label="Plating party">
          <SelectWithAdd value={form.partyId} options={parties} getId={p => p.partyId} getLabel={p => p.name}
            onChange={id => setForm({ ...form, partyId: id })} placeholder="Select party…" noun="Party"
            onCreate={async name => { const p = await cromeApi.addParty(name); setParties(l => [...l, p]); return p; }} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date"><input type="date" className="field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Net quantity (kg)"><input type="number" className="field" value={form.sent || ''} onChange={e => setForm({ ...form, sent: n(e.target.value) })} /></Field>
        </div>
        <PackagingEditor rows={packs} onChange={setPacks} />
        <div className="flex justify-between rounded-lg bg-accent-soft px-4 py-3"><span>Gross weight sent</span><b className="text-accent">{num(form.sent + packagingKg(packs), 3)} kg</b></div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plating rate (₹/kg)"><input type="number" className="field" value={form.amount || ''} onChange={e => setForm({ ...form, amount: n(e.target.value) })} /></Field>
          <Field label="Remark"><input className="field" value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} /></Field>
        </div>
      </div>
    </Drawer>
  );
};

/* ---------------------------------- Page ---------------------------------- */

const Subcontracting: React.FC = () => {
  const { settings } = useSettings();
  const chitthi = (j: Job) => {
    try { downloadChitthi(j, { name: settings.companyName, tagline: settings.tagline, accent: settings.accent }); }
    catch { toast.err('Could not create the chitthi'); }
  };
  const q = useAsync(() => fetchAllPages(page => subcontractingApi.getSubcontractingList({ page, size: 100 }))
    .then(l => l.sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.subcontractingId - a.subcontractingId)), []);
  const [tab, setTab] = useState<SubcontractingStatus | 'ALL'>('IN_PROCESS');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ job: Job | null } | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [returning, setReturning] = useState<Job | null>(null);
  const [chrome, setChrome] = useState<{ job: Job; ret: SubReturn } | null>(null);
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  const all = q.data || [];
  const viewing = all.find(j => j.subcontractingId === viewingId) || null;
  const rows = useMemo(() => all.filter(j =>
    (tab === 'ALL' || j.status === tab) && `${j.contractor.name} ${j.item.name}`.toLowerCase().includes(search.toLowerCase()),
  ), [all, tab, search]);
  const open = all.filter(j => j.status === 'IN_PROCESS');

  const setStatus = async (j: Job, s: SubcontractingStatus) => {
    try {
      await subcontractingApi.updateSubcontractingStatus(j.subcontractingId, s);
      toast.ok(`Marked ${JOB_STATUS[s].label.toLowerCase()}`);
      q.reload();
    } catch {
      toast.err('Could not update the status');
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await subcontractingApi.deleteSubcontracting(deleting.subcontractingId);
      toast.ok('Job deleted');
      setDeleting(null);
      setViewingId(null);
      q.reload();
    } catch {
      toast.err('Could not delete — the job may have returns or chrome entries');
    } finally {
      setBusy(false);
    }
  };

  const done = () => { setForm(null); setReturning(null); setChrome(null); q.reload(); };

  return (
    <>
      <PageHeader title="Subcontracting (Job work)" subtitle="Material sent out for job work, what came back, and the chitthi for each job."
        actions={<Button icon={<Plus size={16} />} onClick={() => setForm({ job: null })}>Send for job work</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Jobs in process" value={open.length} />
        <Stat label="Out with contractors" value={`${num(open.reduce((s, j) => s + j.sentStock - (j.totalReturnStock || 0), 0), 1)} kg`} />
        <Stat label="Completed" value={all.filter(j => j.status === 'COMPLETED').length} />
        <Stat label="Job work value" value={inr(all.reduce((s, j) => s + (j.totalAmount || 0), 0))} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Tabs value={tab} onChange={t => setTab(t as SubcontractingStatus | 'ALL')}
            tabs={[{ id: 'IN_PROCESS', label: 'In process' }, { id: 'COMPLETED', label: 'Completed' }, { id: 'REJECTED', label: 'Rejected' }, { id: 'ALL', label: 'All' }]} />
          <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search contractor or item" /></div>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            onRowClick={j => setViewingId(j.subcontractingId)}
            columns={[
              { key: 'n', header: 'Chitthi', render: j => <span className="font-medium">{chitthiNo(j.subcontractingId)}</span> },
              { key: 'c', header: 'Job worker', render: j => <><div className="font-medium">{j.contractor.name}</div><div className="text-[12px] text-ink-3">{j.item.name}</div></> },
              { key: 'd', header: 'Sent on', render: j => fmtDate(j.orderDate) },
              { key: 's', header: 'Sent', align: 'right', render: j => `${num(j.sentStock, 2)} ${j.unit.toLowerCase()}` },
              { key: 'r', header: 'Returned (net)', align: 'right', render: j => num(j.totalNetReturnStock, 2) },
              { key: 'u', header: 'Used', align: 'right', render: j => num(j.usedStock, 2) },
              { key: 'a', header: 'Amount', align: 'right', render: j => <span className="font-semibold">{inr(j.totalAmount)}</span> },
              { key: 'st', header: 'Status', render: j => <Badge tone={JOB_STATUS[j.status].tone}>{JOB_STATUS[j.status].label}</Badge> },
              {
                key: 'x', header: '', align: 'right', render: j => (
                  <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    {j.status === 'IN_PROCESS' && <Button size="sm" variant="outline" icon={<Undo2 size={13} />} onClick={() => setReturning(j)}>Return</Button>}
                    <Button size="sm" variant="ghost" title="Download chitthi" icon={<FileDown size={14} />} onClick={() => chitthi(j)} />
                    <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={() => setForm({ job: j })} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Drawer open={!!viewing && !returning && !chrome && !form} wide title={viewing ? `${chitthiNo(viewing.subcontractingId)} · ${viewing.contractor.name} · ${viewing.item.name}` : ''} onClose={() => setViewingId(null)}
        footer={viewing && <>
          <Button variant="ghost" icon={<Trash2 size={15} />} className="mr-auto" onClick={() => setDeleting(viewing)}>Delete</Button>
          <Button variant="outline" icon={<FileDown size={15} />} onClick={() => chitthi(viewing)}>Chitthi PDF</Button>
          <select className="field h-9 w-[150px]" value={viewing.status} onChange={e => setStatus(viewing, e.target.value as SubcontractingStatus)}>
            {(Object.keys(JOB_STATUS) as SubcontractingStatus[]).map(s => <option key={s} value={s}>{JOB_STATUS[s].label}</option>)}
          </select>
          {viewing.status === 'IN_PROCESS' && <Button icon={<Undo2 size={15} />} onClick={() => setReturning(viewing)}>Record return</Button>}
        </>}>
        {viewing && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Sent', `${num(viewing.sentStock, 2)} ${viewing.unit.toLowerCase()}`],
                ['Returned (net)', num(viewing.totalNetReturnStock, 3)],
                ['Used', num(viewing.usedStock, 3)],
                ['Amount', inr(viewing.totalAmount)],
              ].map(([l, v]) => <div key={l} className="rounded-lg bg-muted p-3"><div className="text-[12px] text-ink-3">{l}</div><div className="mt-1 font-semibold">{v}</div></div>)}
            </div>
            <div className="mb-5 flex flex-wrap gap-2 text-[13px]">
              <Badge>Sent {fmtDate(viewing.orderDate)}</Badge>
              <Badge>Material ₹{num(viewing.price, 2)}</Badge>
              <Badge>Job work ₹{num(viewing.jobWorkPay, 2)}</Badge>
              {!!viewing.cromeCount && <Badge tone="accent">{viewing.cromeCount} chrome lot{viewing.cromeCount > 1 ? 's' : ''}</Badge>}
            </div>
            <h3 className="mb-2 font-semibold">Returns</h3>
            <DataTable
              rows={viewing.subReturns || []}
              pageSize={8}
              empty={<div className="py-8 text-center text-ink-3">Nothing returned yet</div>}
              columns={[
                { key: 'd', header: 'Date', render: r => fmtDate(r.returnDate) },
                { key: 'g', header: 'Gross', align: 'right', render: r => `${num(r.returnStock, 3)} kg` },
                { key: 'p', header: 'Packaging', align: 'right', render: r => num(packagingKg(r.packagings || []), 3) },
                { key: 'n', header: 'Net', align: 'right', render: r => <span className="font-semibold">{num(netOf(r), 3)}</span> },
                {
                  key: 'c', header: '', align: 'right', render: r => r.returnId
                    ? <Button size="sm" variant="outline" icon={<Sparkles size={13} />} onClick={() => setChrome({ job: viewing, ret: r })}>Send to chrome</Button>
                    : null,
                },
              ]}
            />
            {viewing.remark && <p className="mt-4 rounded-lg bg-muted p-3 text-ink-2">{viewing.remark}</p>}
          </>
        )}
      </Drawer>

      <JobForm open={!!form} job={form?.job ?? null} jobs={all} onClose={() => setForm(null)} onSaved={done} />
      <ReturnForm job={returning} onClose={() => setReturning(null)} onSaved={done} />
      <ChromeForm target={chrome} onClose={() => setChrome(null)} onSaved={done} />
      <Confirm open={!!deleting} title="Delete job?" message={`${deleting?.contractor.name} · ${deleting?.item.name} will be removed.`}
        busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Subcontracting;
