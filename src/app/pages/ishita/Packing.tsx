import React, { useMemo, useState } from 'react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import { CUSTOMERS, FINISHES, items, packCalc, packing, sizeLabel, type PackLine, type PackingInvoice } from '../../data/ishita';
import { iso } from '../../data/hr';
import { useSettings } from '../../settings';
import { Button, Card, Confirm, DataTable, Drawer, Field, PageHeader, SearchBox, Stat, fmtDate, inr, num, toast } from '../../ui';

const sum = (inv: Pick<PackingInvoice, 'lines'>) => inv.lines.map(packCalc).reduce((t, c) => ({
  pcs: t.pcs + c.totalPc, rs: t.rs + c.totalRs, kg: t.kg + c.totalKg, loss: t.loss + c.loss,
}), { pcs: 0, rs: 0, kg: 0, loss: 0 });

/**
 * Packing invoice: what went into each carton and what it's billed at.
 * Rate/pc = dozen weight × (scrap rate + labour for the finish) ÷ 12;
 * loss = packed weight − weight the dozen-weight says it should be.
 */
const Packing: React.FC = () => {
  const list = packing.use();
  const catalog = items.use();
  const { settings } = useSettings();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PackingInvoice | 'new' | null>(null);
  const [form, setForm] = useState<Omit<PackingInvoice, 'id'>>({ invoiceNo: '', date: '', party: '', lines: [] });
  const [printing, setPrinting] = useState<PackingInvoice | null>(null);
  const [deleting, setDeleting] = useState<PackingInvoice | null>(null);

  const name = (id: number) => catalog.find(i => i.id === id)?.name ?? '—';
  const rows = useMemo(() => list
    .filter(i => `${i.invoiceNo} ${i.party}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [list, search]);
  const totals = list.map(sum);

  const lineFor = (itemId: number, finish = FINISHES[0]): PackLine => {
    const it = catalog.find(i => i.id === itemId)!;
    const sz = it.sizes[0];
    return { itemId, size: sizeLabel(sz), finish, cartonNo: '', box: 0, pc: it.pcsPerBox, scrap: 450, boxWeight: Number(((sz.dozWeight / 12) * it.pcsPerBox * 1.02).toFixed(3)), acDozWeight: sz.dozWeight, labour: it.labour[finish] };
  };

  const open = (i: PackingInvoice | 'new') => {
    setEditing(i);
    if (i === 'new') setForm({ invoiceNo: `PK-${1001 + list.length}`, date: iso(new Date()), party: '', lines: [lineFor(catalog[0].id)] });
    else { const { id: _id, ...rest } = i; setForm(rest); }
  };

  const setLine = (k: number, patch: Partial<PackLine>) => setForm(f => ({ ...f, lines: f.lines.map((l, i) => (i === k ? { ...l, ...patch } : l)) }));

  const save = () => {
    if (!form.party || !form.lines.some(l => l.box > 0)) { toast.err('Party and at least one line with boxes are required'); return; }
    if (editing === 'new') packing.create(form);
    else if (editing) packing.update(editing.id, form);
    toast.ok(`Invoice ${form.invoiceNo} saved`);
    setEditing(null);
  };

  const ft = sum(form);
  return (
    <>
      <PageHeader title="Packing invoices" subtitle="Carton-wise packing with billing rate and weight loss."
        actions={<Button icon={<Plus size={16} />} onClick={() => open('new')}>New invoice</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Invoices" value={list.length} />
        <Stat label="Pieces packed" value={num(totals.reduce((s, t) => s + t.pcs, 0))} />
        <Stat label="Billed" value={inr(totals.reduce((s, t) => s + t.rs, 0))} />
        <Stat label="Weight loss" value={`${num(totals.reduce((s, t) => s + t.loss, 0), 2)} kg`} />
      </div>
      <Card>
        <div className="border-b border-line p-4"><SearchBox value={search} onChange={setSearch} placeholder="Search invoice or party" /></div>
        <DataTable
          rows={rows}
          onRowClick={open}
          columns={[
            { key: 'n', header: 'Invoice', render: i => <><div className="font-medium">{i.invoiceNo}</div><div className="text-[12px] text-ink-3">{fmtDate(i.date)}</div></> },
            { key: 'p', header: 'Party', render: i => i.party },
            { key: 'l', header: 'Items', render: i => <span className="text-ink-2">{i.lines.map(l => `${name(l.itemId)} ${l.size}`).join(', ')}</span> },
            { key: 'pc', header: 'Pcs', align: 'right', render: i => num(sum(i).pcs) },
            { key: 'kg', header: 'Kg', align: 'right', render: i => num(sum(i).kg, 2) },
            { key: 'ls', header: 'Loss kg', align: 'right', render: i => num(sum(i).loss, 3) },
            { key: 'rs', header: 'Amount', align: 'right', render: i => <span className="font-semibold">{inr(sum(i).rs)}</span> },
            {
              key: 'a', header: '', align: 'right', render: i => (
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" title="Print" icon={<Printer size={14} />} onClick={() => setPrinting(i)} />
                  <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(i)} />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Drawer open={editing !== null} wide title={editing === 'new' ? 'New packing invoice' : form.invoiceNo} onClose={() => setEditing(null)}
        footer={<>
          <div className="mr-auto text-[13px] text-ink-2">{num(ft.pcs)} pcs · {num(ft.kg, 2)} kg · <b className="text-ink">{inr(ft.rs)}</b></div>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Invoice no."><input className="field" value={form.invoiceNo} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} /></Field>
            <Field label="Date"><input type="date" className="field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Party">
              <select className="field" value={form.party} onChange={e => setForm({ ...form, party: e.target.value })}>
                <option value="">Select…</option>{CUSTOMERS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          {form.lines.map((l, k) => {
            const it = catalog.find(i => i.id === l.itemId);
            const c = packCalc(l);
            return (
              <div key={k} className="rounded-lg border border-line p-3">
                <div className="grid grid-cols-4 gap-2">
                  <Field label="Item">
                    <select className="field" value={l.itemId} onChange={e => setLine(k, lineFor(Number(e.target.value), l.finish))}>
                      {catalog.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Size">
                    <select className="field" value={l.size} onChange={e => { const s = it?.sizes.find(x => sizeLabel(x) === e.target.value); setLine(k, { size: e.target.value, acDozWeight: s?.dozWeight ?? l.acDozWeight }); }}>
                      {it?.sizes.map(s => <option key={sizeLabel(s)}>{sizeLabel(s)}</option>)}
                    </select>
                  </Field>
                  <Field label="Finish">
                    <select className="field" value={l.finish} onChange={e => setLine(k, { finish: e.target.value, labour: it?.labour[e.target.value] ?? l.labour })}>
                      {FINISHES.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </Field>
                  <Field label="Carton no."><input className="field" value={l.cartonNo} onChange={e => setLine(k, { cartonNo: e.target.value })} /></Field>
                  <Field label="Boxes"><input type="number" className="field" value={l.box || ''} onChange={e => setLine(k, { box: Number(e.target.value) || 0 })} /></Field>
                  <Field label="Pcs / box"><input type="number" className="field" value={l.pc || ''} onChange={e => setLine(k, { pc: Number(e.target.value) || 0 })} /></Field>
                  <Field label="Box weight (kg)"><input type="number" className="field" value={l.boxWeight || ''} onChange={e => setLine(k, { boxWeight: Number(e.target.value) || 0 })} /></Field>
                  <Field label="Scrap ₹/kg"><input type="number" className="field" value={l.scrap || ''} onChange={e => setLine(k, { scrap: Number(e.target.value) || 0 })} /></Field>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-muted p-2 text-[12px] sm:grid-cols-6">
                  {[['Total pcs', num(c.totalPc)], ['Doz wt', num(l.acDozWeight, 3)], ['₹/kg', num(c.rsKg)], ['Rate/pc', `₹${num(c.ratePc, 2)}`], ['Amount', inr(c.totalRs)], ['Loss', `${num(c.loss, 3)} kg`]]
                    .map(([a, b]) => <div key={a}><div className="text-ink-3">{a}</div><b>{b}</b></div>)}
                </div>
                {form.lines.length > 1 && (
                  <div className="mt-2 text-right"><Button size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== k) })}>Remove line</Button></div>
                )}
              </div>
            );
          })}
          <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => setForm({ ...form, lines: [...form.lines, lineFor(catalog[0].id)] })}>Add line</Button>
        </div>
      </Drawer>

      <Drawer open={!!printing} wide title="Print preview" onClose={() => setPrinting(null)}
        footer={<Button icon={<Printer size={15} />} onClick={() => window.print()}>Print</Button>}>
        {printing && (
          <div className="rounded-xl border border-line p-6">
            <div className="flex justify-between border-b border-line pb-4">
              <div><div className="text-[18px] font-semibold">{settings.companyName}</div><div className="text-ink-3">Packing invoice</div></div>
              <div className="text-right"><div className="font-semibold">{printing.invoiceNo}</div><div className="text-ink-3">{fmtDate(printing.date)}</div><div>{printing.party}</div></div>
            </div>
            <table className="mt-4 text-left text-[13px]">
              <thead><tr className="border-b border-line text-ink-3"><th className="py-2">Carton</th><th>Item</th><th>Finish</th><th className="text-right">Pcs</th><th className="text-right">Rate/pc</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {printing.lines.map((l, i) => { const c = packCalc(l); return (
                  <tr key={i} className="border-b border-line"><td className="py-2">{l.cartonNo || '—'}</td><td>{name(l.itemId)} {l.size}</td><td>{l.finish}</td>
                    <td className="text-right">{num(c.totalPc)}</td><td className="text-right">₹{num(c.ratePc, 2)}</td><td className="text-right">{inr(c.totalRs)}</td></tr>
                ); })}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end gap-6 text-[14px]"><span>{num(sum(printing).pcs)} pcs</span><b>{inr(sum(printing).rs)}</b></div>
          </div>
        )}
      </Drawer>
      <Confirm open={!!deleting} title="Delete invoice?" message={`${deleting?.invoiceNo} will be removed.`}
        onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) packing.remove(deleting.id); setDeleting(null); toast.ok('Invoice deleted'); }} />
    </>
  );
};

export default Packing;
