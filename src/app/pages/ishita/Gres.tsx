import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Undo2 } from 'lucide-react';
import { VENDORS, gres, gresCalc, items, sizeLabel, type Gres as GresT, type GresLine } from '../../data/ishita';
import { iso } from '../../data/hr';
import { Badge, Button, Card, Confirm, DataTable, Drawer, Field, PageHeader, SearchBox, Stat, Tabs, fmtDate, inr, num, toast } from '../../ui';

/** Gres (grease) filling: lots of mixed items sent to a vendor, returned by weight. */
const Gres: React.FC = () => {
  const list = gres.use();
  const catalog = items.use();
  const [tab, setTab] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<GresT | 'new' | null>(null);
  const [form, setForm] = useState<Omit<GresT, 'id'>>({ vendor: '', chitthiNo: '', date: '', lines: [], returns: [] });
  const [ret, setRet] = useState<{ g: GresT; date: string; kg: number } | null>(null);
  const [deleting, setDeleting] = useState<GresT | null>(null);

  const name = (id: number) => catalog.find(i => i.id === id)?.name ?? '—';
  const rows = useMemo(() => list.map(g => ({ ...g, c: gresCalc(g) })).filter(g =>
    (tab === 'ALL' || (tab === 'COMPLETE') === g.c.complete) && `${g.vendor} ${g.chitthiNo}`.toLowerCase().includes(search.toLowerCase()),
  ), [list, tab, search]);
  const calcs = list.map(gresCalc);

  const newLine = (): GresLine => ({ itemId: catalog[0].id, size: sizeLabel(catalog[0].sizes[0]), netKg: 0, ratePerKg: 22 });
  const open = (g: GresT | 'new') => {
    setEditing(g);
    if (g === 'new') setForm({ vendor: '', chitthiNo: `G${201 + list.length}`, date: iso(new Date()), lines: [newLine()], returns: [] });
    else { const { id: _id, ...rest } = g; setForm(rest); }
  };
  const setLine = (i: number, patch: Partial<GresLine>) => setForm(f => ({ ...f, lines: f.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) }));

  const save = () => {
    if (!form.vendor || !form.lines.some(l => l.netKg > 0)) { toast.err('Vendor and at least one line with weight are required'); return; }
    const body = { ...form, lines: form.lines.filter(l => l.netKg > 0) };
    if (editing === 'new') gres.create(body);
    else if (editing) gres.update(editing.id, body);
    toast.ok('Gres chitthi saved');
    setEditing(null);
  };

  const fc = gresCalc({ id: 0, ...form });
  return (
    <>
      <PageHeader title="Gres" subtitle="Gres filling chitthis and their returns." actions={<Button icon={<Plus size={16} />} onClick={() => open('new')}>New gres</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Chitthis" value={list.length} />
        <Stat label="Pending" value={calcs.filter(c => !c.complete).length} />
        <Stat label="Weight still out" value={`${num(calcs.reduce((s, c) => s + c.pendingKg, 0), 1)} kg`} />
        <Stat label="Gres value" value={inr(calcs.reduce((s, c) => s + c.amount, 0))} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'PENDING', label: 'Pending' }, { id: 'COMPLETE', label: 'Complete' }, { id: 'ALL', label: 'All' }]} />
          <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search vendor or chitthi" /></div>
        </div>
        <DataTable
          rows={rows}
          onRowClick={open}
          columns={[
            { key: 'n', header: 'Chitthi', render: g => <><div className="font-medium">{g.chitthiNo}</div><div className="text-[12px] text-ink-3">{fmtDate(g.date)}</div></> },
            { key: 'v', header: 'Vendor', render: g => g.vendor },
            { key: 'i', header: 'Items', render: g => <span className="text-ink-2">{g.lines.map(l => name(l.itemId)).join(', ')}</span> },
            { key: 'k', header: 'Net kg', align: 'right', render: g => num(g.c.netKg, 2) },
            { key: 'r', header: 'Back', align: 'right', render: g => num(g.c.returnedKg, 2) },
            { key: 'a', header: 'Amount', align: 'right', render: g => <span className="font-semibold">{inr(g.c.amount)}</span> },
            { key: 's', header: 'Status', render: g => <Badge tone={g.c.complete ? 'green' : 'amber'}>{g.c.complete ? 'Complete' : 'Pending'}</Badge> },
            {
              key: 'x', header: '', align: 'right', render: g => (
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  {!g.c.complete && <Button size="sm" variant="outline" icon={<Undo2 size={13} />} onClick={() => setRet({ g, date: iso(new Date()), kg: g.c.pendingKg })}>Return</Button>}
                  <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(g)} />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Drawer open={editing !== null} wide title={editing === 'new' ? 'New gres chitthi' : `Gres ${form.chitthiNo}`} onClose={() => setEditing(null)}
        footer={<>
          <div className="mr-auto text-[13px] text-ink-2">{num(fc.netKg, 2)} kg · <b className="text-ink">{inr(fc.amount)}</b></div>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Vendor">
              <select className="field" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })}>
                <option value="">Select…</option>{VENDORS.map(v => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Chitthi no."><input className="field" value={form.chitthiNo} onChange={e => setForm({ ...form, chitthiNo: e.target.value })} /></Field>
            <Field label="Date"><input type="date" className="field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          </div>
          {form.lines.map((l, i) => {
            const it = catalog.find(x => x.id === l.itemId);
            return (
              <div key={i} className="grid grid-cols-[1.3fr_1fr_90px_90px_auto] items-end gap-2">
                <Field label={i === 0 ? 'Item' : ''}>
                  <select className="field" value={l.itemId} onChange={e => { const x = catalog.find(c => c.id === Number(e.target.value))!; setLine(i, { itemId: x.id, size: sizeLabel(x.sizes[0]) }); }}>
                    {catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label={i === 0 ? 'Size' : ''}>
                  <select className="field" value={l.size} onChange={e => setLine(i, { size: e.target.value })}>{it?.sizes.map(s => <option key={sizeLabel(s)}>{sizeLabel(s)}</option>)}</select>
                </Field>
                <Field label={i === 0 ? 'Net kg' : ''}><input type="number" className="field" value={l.netKg || ''} onChange={e => setLine(i, { netKg: Number(e.target.value) || 0 })} /></Field>
                <Field label={i === 0 ? '₹/kg' : ''}><input type="number" className="field" value={l.ratePerKg || ''} onChange={e => setLine(i, { ratePerKg: Number(e.target.value) || 0 })} /></Field>
                <Button variant="ghost" icon={<Trash2 size={15} />} disabled={form.lines.length === 1} onClick={() => setForm({ ...form, lines: form.lines.filter((_, k) => k !== i) })} />
              </div>
            );
          })}
          <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => setForm({ ...form, lines: [...form.lines, newLine()] })}>Add item</Button>
          {form.returns.length > 0 && (
            <div className="rounded-lg bg-muted p-3 text-[13px]">Returned: {form.returns.map(r => `${num(r.kg, 2)} kg on ${fmtDate(r.date)}`).join(' · ')}</div>
          )}
        </div>
      </Drawer>

      <Drawer open={!!ret} title={`Return · ${ret?.g.chitthiNo}`} onClose={() => setRet(null)}
        footer={<><Button variant="outline" onClick={() => setRet(null)}>Cancel</Button>
          <Button onClick={() => { if (!ret || !(ret.kg > 0)) return; gres.update(ret.g.id, { returns: [...ret.g.returns, { date: ret.date, kg: ret.kg }] }); toast.ok('Return recorded'); setRet(null); }}>Save</Button></>}>
        {ret && (
          <div className="space-y-4">
            <Field label="Date"><input type="date" className="field" value={ret.date} onChange={e => setRet({ ...ret, date: e.target.value })} /></Field>
            <Field label="Weight received (kg)"><input type="number" className="field" value={ret.kg || ''} onChange={e => setRet({ ...ret, kg: Number(e.target.value) || 0 })} /></Field>
          </div>
        )}
      </Drawer>
      <Confirm open={!!deleting} title="Delete gres chitthi?" message={`${deleting?.chitthiNo} will be removed.`}
        onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) gres.remove(deleting.id); setDeleting(null); toast.ok('Deleted'); }} />
    </>
  );
};

export default Gres;
