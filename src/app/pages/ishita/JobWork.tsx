import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import {
  CUSTOMERS, FINISHES, MODE_LABEL, VENDORS, items, jobCalc, jobWorks, sizeLabel, type JobMode, type JobWork as Job,
} from '../../data/ishita';
import { iso } from '../../data/hr';
import { Badge, Button, Card, Confirm, DataTable, Drawer, Field, PageHeader, SearchBox, Stat, Tabs, fmtDate, inr, num, toast, type Tone } from '../../ui';

const STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  PARTIALLY_RETURNED: { label: 'Partly back', tone: 'blue' },
  FULLY_RETURNED: { label: 'Fully back', tone: 'green' },
};

const blank = (mode: JobMode): Omit<Job, 'id'> => {
  const it = items.all()[0];
  return {
    mode, party: '', chitthiNo: String(101 + jobWorks.all().length), date: iso(new Date()), itemId: it.id, size: sizeLabel(it.sizes[0]),
    finish: FINISHES[0], grossKg: 0, elementType: 'PETI', elementCount: 0, elementKg: 1, pcsWeight: it.sizes[0].pcsWeight, ratePerKg: 60, returns: [],
  };
};

const JobWork: React.FC = () => {
  const list = jobWorks.use();
  const catalog = items.use();
  const [mode, setMode] = useState<JobMode | 'ALL'>('ALL');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Job | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Job, 'id'>>(blank('OUTSIDE'));
  const [ret, setRet] = useState<{ job: Job; date: string; kg: number } | null>(null);
  const [deleting, setDeleting] = useState<Job | null>(null);

  const itemName = (id: number) => catalog.find(i => i.id === id)?.name ?? '—';
  const rows = useMemo(() => list.map(j => ({ ...j, c: jobCalc(j) })).filter(j =>
    (mode === 'ALL' || j.mode === mode) && (!status || j.c.status === status) &&
    `${j.party} ${j.chitthiNo} ${itemName(j.itemId)} ${j.finish}`.toLowerCase().includes(search.toLowerCase()),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [list, mode, status, search, catalog]);
  const calcs = list.map(jobCalc);

  const item = catalog.find(i => i.id === form.itemId);
  const c = jobCalc(form);
  const set = (patch: Partial<Omit<Job, 'id'>>) => setForm(f => ({ ...f, ...patch }));

  const open = (j: Job | 'new') => {
    setEditing(j);
    if (j === 'new') setForm(blank(mode === 'ALL' ? 'OUTSIDE' : mode));
    else { const { id: _id, ...rest } = j; setForm(rest); }
  };

  const save = () => {
    if (!form.party.trim() || !(form.grossKg > 0)) { toast.err('Party and gross weight are required'); return; }
    if (c.netKg <= 0) { toast.err('Packaging weight is more than the gross weight'); return; }
    if (editing === 'new') jobWorks.create(form);
    else if (editing) jobWorks.update(editing.id, form);
    toast.ok(editing === 'new' ? `Chitthi ${form.chitthiNo} created` : 'Chitthi updated');
    setEditing(null);
  };

  const saveReturn = () => {
    if (!ret || !(ret.kg > 0)) { toast.err('Enter the weight received'); return; }
    jobWorks.update(ret.job.id, { returns: [...ret.job.returns, { date: ret.date, kg: ret.kg }] });
    toast.ok('Return recorded');
    setRet(null);
  };

  return (
    <>
      <PageHeader title="Job work" subtitle="Chitthis for goods sent for plating and finishing, and what came back."
        actions={<Button icon={<Plus size={16} />} onClick={() => open('new')}>New chitthi</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Chitthis" value={list.length} />
        <Stat label="Pending" value={calcs.filter(x => x.status === 'PENDING').length} />
        <Stat label="Weight still out" value={`${num(calcs.reduce((s, x) => s + x.pendingKg, 0), 1)} kg`} />
        <Stat label="Job work value" value={inr(calcs.reduce((s, x) => s + x.amount, 0))} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Tabs value={mode} onChange={m => setMode(m as JobMode | 'ALL')}
            tabs={[{ id: 'ALL', label: 'All' }, { id: 'OUTSIDE', label: 'Out-side' }, { id: 'INHOUSE', label: 'In-side' }, { id: 'MANUAL', label: 'Manual' }]} />
          <select className="field max-w-[160px]" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search party, chitthi, item" /></div>
        </div>
        <DataTable
          rows={rows}
          onRowClick={open}
          columns={[
            { key: 'n', header: 'Chitthi', render: j => <><div className="font-medium">#{j.chitthiNo}</div><div className="text-[12px] text-ink-3">{fmtDate(j.date)}</div></> },
            { key: 'p', header: 'Party', render: j => <><div>{j.party}</div><div className="text-[12px] text-ink-3">{MODE_LABEL[j.mode]}</div></> },
            { key: 'i', header: 'Item', render: j => <><div>{itemName(j.itemId)} {j.size}</div><div className="text-[12px] text-ink-3">{j.finish}</div></> },
            { key: 'k', header: 'Net kg', align: 'right', render: j => num(j.c.netKg, 2) },
            { key: 'pc', header: 'Pcs', align: 'right', render: j => num(j.c.pcs) },
            { key: 'r', header: 'Back', align: 'right', render: j => num(j.c.returnedKg, 2) },
            { key: 'a', header: 'Amount', align: 'right', render: j => <span className="font-semibold">{inr(j.c.amount)}</span> },
            { key: 's', header: 'Status', render: j => <Badge tone={STATUS[j.c.status].tone}>{STATUS[j.c.status].label}</Badge> },
            {
              key: 'x', header: '', align: 'right', render: j => (
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  {j.c.status !== 'FULLY_RETURNED' && <Button size="sm" variant="outline" icon={<Undo2 size={13} />} onClick={() => setRet({ job: j, date: iso(new Date()), kg: j.c.pendingKg })}>Return</Button>}
                  <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={() => open(j)} />
                  <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(j)} />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Drawer open={editing !== null} wide title={editing === 'new' ? 'New job work chitthi' : `Chitthi #${form.chitthiNo}`} onClose={() => setEditing(null)}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {(['OUTSIDE', 'INHOUSE', 'MANUAL'] as JobMode[]).map(m => (
              <button key={m} onClick={() => set({ mode: m, party: '' })}
                className={`rounded-lg border px-3 py-2 text-left ${form.mode === m ? 'border-accent bg-accent-soft' : 'border-line'}`}>
                <div className="text-[13px] font-semibold">{MODE_LABEL[m]}</div>
                <div className="text-[12px] text-ink-3">{m === 'OUTSIDE' ? 'Sent to a vendor' : m === 'INHOUSE' ? 'For a customer order' : 'Enter it yourself'}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label={form.mode === 'OUTSIDE' ? 'Vendor' : 'Party'} className="col-span-3">
              {form.mode === 'MANUAL'
                ? <input className="field" value={form.party} onChange={e => set({ party: e.target.value })} />
                : (
                  <select className="field" value={form.party} onChange={e => set({ party: e.target.value })}>
                    <option value="">Select…</option>
                    {(form.mode === 'OUTSIDE' ? VENDORS : CUSTOMERS).map(p => <option key={p}>{p}</option>)}
                  </select>
                )}
            </Field>
            <Field label="Chitthi no."><input className="field" value={form.chitthiNo} onChange={e => set({ chitthiNo: e.target.value })} /></Field>
            <Field label="Date"><input type="date" className="field" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
            <Field label="Finish">
              <select className="field" value={form.finish} onChange={e => set({ finish: e.target.value })}>{FINISHES.map(f => <option key={f}>{f}</option>)}</select>
            </Field>
            <Field label="Item">
              <select className="field" value={form.itemId} onChange={e => {
                const it = catalog.find(i => i.id === Number(e.target.value))!;
                set({ itemId: it.id, size: sizeLabel(it.sizes[0]), pcsWeight: it.sizes[0].pcsWeight });
              }}>{catalog.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
            </Field>
            <Field label="Size">
              <select className="field" value={form.size} onChange={e => {
                const sz = item?.sizes.find(s => sizeLabel(s) === e.target.value);
                set({ size: e.target.value, pcsWeight: sz?.pcsWeight ?? form.pcsWeight });
              }}>{item?.sizes.map(s => <option key={sizeLabel(s)}>{sizeLabel(s)}</option>)}</select>
            </Field>
            <Field label="1 pc weight (kg)"><input type="number" className="field" value={form.pcsWeight || ''} onChange={e => set({ pcsWeight: Number(e.target.value) || 0 })} /></Field>
            <Field label="Gross kg (weighed)"><input type="number" className="field" value={form.grossKg || ''} onChange={e => set({ grossKg: Number(e.target.value) || 0 })} /></Field>
            <Field label="Peti / drum count">
              <div className="flex gap-2">
                <input type="number" className="field" value={form.elementCount || ''} onChange={e => set({ elementCount: Number(e.target.value) || 0 })} />
                <select className="field w-[90px]" value={form.elementType} onChange={e => set({ elementType: e.target.value as Job['elementType'] })}>
                  <option value="PETI">Peti</option><option value="DRUM">Drum</option>
                </select>
              </div>
            </Field>
            <Field label="Weight of one (kg)"><input type="number" className="field" value={form.elementKg || ''} onChange={e => set({ elementKg: Number(e.target.value) || 0 })} /></Field>
            <Field label="Rate per kg (₹)"><input type="number" className="field" value={form.ratePerKg || ''} onChange={e => set({ ratePerKg: Number(e.target.value) || 0 })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-accent-soft p-4 sm:grid-cols-4">
            {[['Net kg', num(c.netKg, 3)], ['Total pcs', num(c.pcs)], ['Boxes', item ? num(c.pcs / item.pcsPerBox, 1) : '—'], ['Amount', inr(c.amount)]].map(([l, v]) => (
              <div key={l}><div className="text-[12px] text-ink-2">{l}</div><div className="text-[17px] font-semibold text-accent">{v}</div></div>
            ))}
          </div>
          {editing !== 'new' && form.returns.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Returns</h3>
              {form.returns.map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b border-line py-2 last:border-0">
                  <span>{fmtDate(r.date)}</span>
                  <span className="flex items-center gap-2"><b>{num(r.kg, 3)} kg</b>
                    <Button size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={() => set({ returns: form.returns.filter((_, k) => k !== i) })} /></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>

      <Drawer open={!!ret} title={`Return · chitthi #${ret?.job.chitthiNo}`} onClose={() => setRet(null)}
        footer={<><Button variant="outline" onClick={() => setRet(null)}>Cancel</Button><Button onClick={saveReturn}>Save</Button></>}>
        {ret && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-[13px]">{ret.job.party} · {itemName(ret.job.itemId)} {ret.job.size} · {num(jobCalc(ret.job).pendingKg, 3)} kg still out</div>
            <Field label="Date"><input type="date" className="field" value={ret.date} onChange={e => setRet({ ...ret, date: e.target.value })} /></Field>
            <Field label="Weight received (kg)"><input type="number" className="field" value={ret.kg || ''} onChange={e => setRet({ ...ret, kg: Number(e.target.value) || 0 })} /></Field>
          </div>
        )}
      </Drawer>
      <Confirm open={!!deleting} title="Delete chitthi?" message={`Chitthi #${deleting?.chitthiNo} will be removed.`}
        onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) jobWorks.remove(deleting.id); setDeleting(null); toast.ok('Chitthi deleted'); }} />
    </>
  );
};

export default JobWork;
