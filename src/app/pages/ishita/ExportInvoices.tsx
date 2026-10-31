import React, { useMemo, useState } from 'react';
import { ArrowLeft, FileDown, Plus, Trash2 } from 'lucide-react';
import {
  CURRENCY_SYMBOL, INCOTERMS, LUT_TEXT, RODTEP_TEXT, blankExport, exportCalc, exportInvoices,
  type Currency, type ExportInvoice, type ExportItem, type PartyBlock,
} from '../../data/trade';
import { DOC_TITLE, downloadExportDoc, type ExportDoc } from '../../pdf/exportDocs';
import { Badge, Button, Card, Confirm, DataTable, Field, PageHeader, SearchBox, Stat, Tabs, fmtDate, inr, num, toast } from '../../ui';
import { n } from '../inventory/shared';

type Draft = Omit<ExportInvoice, 'id'> & { id?: number };
const DOCS: ExportDoc[] = ['EXPORT', 'COMMERCIAL', 'PACKING'];
const money = (c: Currency, v: number) => `${CURRENCY_SYMBOL[c]}${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const blankItem = (): ExportItem => ({ partNo: '', description: '', hsCode: '83021090', qty: 0, unit: 'pcs', unitPrice: 0, qtyPerCarton: 0, cartons: 0, grossKg: 0, netKg: 0, pallets: 0 });

const Section: React.FC<{ title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, hint, action, children }) => (
  <Card>
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
      <div><h3 className="font-semibold">{title}</h3>{hint && <p className="text-[12px] text-ink-3">{hint}</p>}</div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </Card>
);

const PartyFields: React.FC<{ value: PartyBlock; onChange: (p: PartyBlock) => void }> = ({ value, onChange }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Name"><input className="field" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} /></Field>
    <Field label="Country"><input className="field" value={value.country} onChange={e => onChange({ ...value, country: e.target.value })} /></Field>
    <Field label="Address" className="sm:col-span-2"><textarea className="field" rows={3} value={value.address} onChange={e => onChange({ ...value, address: e.target.value })} /></Field>
    <Field label="Contact no."><input className="field" value={value.contact} onChange={e => onChange({ ...value, contact: e.target.value })} /></Field>
  </div>
);

/* -------------------------------- Editor -------------------------------- */

const Editor: React.FC<{ initial: Draft; onDone: () => void }> = ({ initial, onDone }) => {
  const [f, setF] = useState<Draft>(initial);
  const [sameShip, setSameShip] = useState(!initial.shipTo.name || initial.shipTo.name === initial.billTo.name);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF(x => ({ ...x, [k]: v }));
  const setItem = (i: number, p: Partial<ExportItem>) => setF(x => ({ ...x, items: x.items.map((it, k) => (k === i ? { ...it, ...p } : it)) }));
  const full: ExportInvoice = { ...f, id: f.id ?? 0, shipTo: sameShip ? f.billTo : f.shipTo };
  const c = exportCalc(full);

  const save = (download?: boolean) => {
    if (!f.invoiceNo.trim() || !f.billTo.name.trim()) { toast.err('Invoice number and buyer are required'); return; }
    const items = f.items.filter(i => i.description.trim() && i.qty > 0);
    if (!items.length) { toast.err('Add at least one item with a description and quantity'); return; }
    const row = { ...full, items };
    const { id: _id, ...data } = row;
    let saved: ExportInvoice;
    if (f.id) { exportInvoices.update(f.id, data); saved = { ...row, id: f.id }; }
    else saved = exportInvoices.create(data);
    if (download) DOCS.forEach(d => downloadExportDoc(saved, d));
    toast.ok(download ? 'Saved — export invoice, commercial invoice and packing list downloaded' : 'Invoice saved');
    onDone();
  };

  return (
    <>
      <PageHeader title={f.id ? `Edit ${f.invoiceNo}` : 'Create export invoice'} subtitle="One entry makes the Export Invoice, Commercial Invoice and Packing List."
        actions={<>
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onDone}>Back</Button>
          <Button variant="outline" onClick={() => save(false)}>Save</Button>
          <Button icon={<FileDown size={16} />} onClick={() => save(true)}>Save & download 3 PDFs</Button>
        </>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section title="LUT" hint="Supply under bond / LUT — printed on all 3 documents.">
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={f.lut} onChange={e => set('lut', e.target.checked)} /><span className="text-[13px] text-ink-2">{LUT_TEXT}</span></label>
            {f.lut && <Field label="ARN no." className="mt-3 max-w-xs"><input className="field" value={f.arnNo} onChange={e => set('arnNo', e.target.value)} /></Field>}
          </Section>
          <Section title="Exporter"><PartyFields value={f.exporter} onChange={p => set('exporter', p)} /></Section>
          <Section title="Importer — Bill To" hint="Export invoice, commercial invoice and packing list."><PartyFields value={f.billTo} onChange={p => set('billTo', p)} /></Section>
          <Section title="Importer — Ship To" action={<label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={sameShip} onChange={e => setSameShip(e.target.checked)} /> Same as bill to</label>}>
            {sameShip ? <p className="text-ink-3">Goods ship to {f.billTo.name || 'the buyer'}.</p> : <PartyFields value={f.shipTo} onChange={p => set('shipTo', p)} />}
          </Section>
          <Section title="Invoice details">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Invoice no."><input className="field" value={f.invoiceNo} onChange={e => set('invoiceNo', e.target.value)} /></Field>
              <Field label="Invoice date"><input type="date" className="field" value={f.date} onChange={e => set('date', e.target.value)} /></Field>
              <Field label="GST no."><input className="field" value={f.gstNo} onChange={e => set('gstNo', e.target.value)} /></Field>
              <Field label="IEC code"><input className="field" value={f.iecCode} onChange={e => set('iecCode', e.target.value)} /></Field>
              <Field label="P/O no."><input className="field" value={f.poNo} onChange={e => set('poNo', e.target.value)} /></Field>
              <Field label="P/O date"><input type="date" className="field" value={f.poDate} onChange={e => set('poDate', e.target.value)} /></Field>
              <Field label="Incoterms">
                <select className="field" value={f.incoterms} onChange={e => set('incoterms', e.target.value)}>{INCOTERMS.map(i => <option key={i}>{i}</option>)}</select>
              </Field>
              <Field label="Payment terms" className="sm:col-span-2"><input className="field" value={f.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} /></Field>
              <Field label="Pre-carriage"><input className="field" value={f.preCarriage} onChange={e => set('preCarriage', e.target.value)} /></Field>
              <Field label="Place of pre-carriage"><input className="field" value={f.placeOfPreCarriage} onChange={e => set('placeOfPreCarriage', e.target.value)} /></Field>
              <Field label="Country of origin"><input className="field" value={f.countryOfOrigin} onChange={e => set('countryOfOrigin', e.target.value)} /></Field>
              <Field label="Country of final destination"><input className="field" value={f.finalDestination} onChange={e => set('finalDestination', e.target.value)} /></Field>
              <Field label="Port of loading"><input className="field" value={f.portOfLoading} onChange={e => set('portOfLoading', e.target.value)} /></Field>
              <Field label="Port of discharge"><input className="field" value={f.portOfDischarge} onChange={e => set('portOfDischarge', e.target.value)} /></Field>
            </div>
          </Section>
          <Section title="Currency">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Invoice currency (export & commercial)">
                <Tabs value={f.currency} onChange={v => set('currency', v as Currency)} tabs={[{ id: 'USD', label: 'USD $' }, { id: 'EURO', label: 'EURO €' }]} />
              </Field>
              <Field label="Exchange rate (₹ per unit)"><input type="number" className="field" value={f.exchangeRate || ''} onChange={e => set('exchangeRate', n(e.target.value))} /></Field>
            </div>
          </Section>
          <Section title={`Items (${f.items.length})`} action={<Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => set('items', [...f.items, blankItem()])}>Add item</Button>}>
            <div className="space-y-3">
              {f.items.map((it, i) => (
                <div key={i} className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge>Item {i + 1}</Badge>
                    <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} disabled={f.items.length === 1} onClick={() => set('items', f.items.filter((_, k) => k !== i))} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Field label="Part no."><input className="field" value={it.partNo} onChange={e => setItem(i, { partNo: e.target.value })} /></Field>
                    <Field label="Description" className="sm:col-span-2"><input className="field" value={it.description} onChange={e => setItem(i, { description: e.target.value })} /></Field>
                    <Field label="HS code"><input className="field" value={it.hsCode} onChange={e => setItem(i, { hsCode: e.target.value })} /></Field>
                    <Field label="Total quantity">
                      <div className="flex gap-1">
                        <input type="number" className="field" value={it.qty || ''} onChange={e => setItem(i, { qty: n(e.target.value) })} />
                        <select className="field w-[74px] px-2" value={it.unit} onChange={e => setItem(i, { unit: e.target.value as ExportItem['unit'] })}><option>pcs</option><option>sets</option><option>kgs</option></select>
                      </div>
                    </Field>
                    <Field label={`Unit price (${CURRENCY_SYMBOL[f.currency]})`}><input type="number" className="field" value={it.unitPrice || ''} onChange={e => setItem(i, { unitPrice: n(e.target.value) })} /></Field>
                    <Field label="Qty / carton"><input type="number" className="field" value={it.qtyPerCarton || ''} onChange={e => setItem(i, { qtyPerCarton: n(e.target.value), cartons: n(e.target.value) ? Math.ceil(it.qty / n(e.target.value)) : it.cartons })} /></Field>
                    <Field label="No. of cartons"><input type="number" className="field" value={it.cartons || ''} onChange={e => setItem(i, { cartons: n(e.target.value) })} /></Field>
                    <Field label="Net weight (kg)"><input type="number" className="field" value={it.netKg || ''} onChange={e => setItem(i, { netKg: n(e.target.value) })} /></Field>
                    <Field label="Gross weight (kg)"><input type="number" className="field" value={it.grossKg || ''} onChange={e => setItem(i, { grossKg: n(e.target.value) })} /></Field>
                    <Field label="Wooden pallets"><input type="number" className="field" value={it.pallets || ''} onChange={e => setItem(i, { pallets: n(e.target.value) })} /></Field>
                    <div className="flex items-end justify-end pb-2 font-semibold">{money(f.currency, it.qty * it.unitPrice)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Commercial invoice — extra charges & IGST">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={`Freight (${CURRENCY_SYMBOL[f.currency]})`}><input type="number" className="field" value={f.freight || ''} onChange={e => set('freight', n(e.target.value))} /></Field>
              <Field label={`Insurance (${CURRENCY_SYMBOL[f.currency]})`}><input type="number" className="field" value={f.insurance || ''} onChange={e => set('insurance', n(e.target.value))} /></Field>
              <Field label="IGST %">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={f.igst} onChange={e => set('igst', e.target.checked)} />
                  <input type="number" className="field" disabled={!f.igst} value={f.igstPct || ''} onChange={e => set('igstPct', n(e.target.value))} />
                </div>
              </Field>
            </div>
          </Section>
          <Section title="Declarations">
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={f.rodtep} onChange={e => set('rodtep', e.target.checked)} /><span className="text-[13px] text-ink-2">RoDTEP (all 3 documents) — {RODTEP_TEXT}</span></label>
            <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={f.rex} onChange={e => set('rex', e.target.checked)} /><span className="text-[13px] text-ink-2">REX declaration (export invoice & packing list)</span></label>
            {f.rex && <Field label="REX no." className="mt-3 max-w-xs"><input className="field" value={f.rexNo} onChange={e => set('rexNo', e.target.value)} /></Field>}
          </Section>
          <Section title="Bank details — export invoice">
            <div className="grid gap-3 sm:grid-cols-3">
              {([['beneficiary', 'Beneficiary name'], ['bank', 'Beneficiary bank'], ['branch', 'Branch'], ['account', 'A/C no.'], ['swift', 'SWIFT code']] as const).map(([k, l]) => (
                <Field key={k} label={l}><input className="field" value={f.bank[k]} onChange={e => set('bank', { ...f.bank, [k]: e.target.value })} /></Field>
              ))}
            </div>
          </Section>
        </div>
        <div>
          <Card className="sticky top-4 p-5">
            <h3 className="mb-3 font-semibold">Summary</h3>
            {[['Items', f.items.length], ['Pieces', num(c.pcs)], ['Cartons', num(c.cartons)], ['Net / gross', `${num(c.netKg, 1)} / ${num(c.grossKg, 1)} kg`], ['Pallets', num(c.pallets)]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between py-1 text-[13px]"><span className="text-ink-2">{k}</span><span className="font-medium">{v}</span></div>
            ))}
            <div className="my-3 border-t border-line" />
            <div className="flex justify-between py-1"><span className="text-ink-2">Invoice value</span><b>{money(f.currency, c.value)}</b></div>
            <div className="flex justify-between py-1 text-[13px]"><span className="text-ink-2">+ freight & insurance</span><span>{money(f.currency, f.freight + f.insurance)}</span></div>
            <div className="flex justify-between py-1 text-[13px]"><span className="text-ink-2">In rupees</span><span>{inr(c.inr)}</span></div>
            {f.igst && <div className="flex justify-between py-1 text-[13px]"><span className="text-ink-2">IGST {f.igstPct}%</span><span>{inr(c.igstInr)}</span></div>}
            <div className="mt-2 flex justify-between rounded-lg bg-accent-soft px-3 py-2 font-semibold text-accent"><span>Commercial total</span><span>{inr(c.totalInr)}</span></div>
            <div className="mt-4 space-y-2">
              {DOCS.map(d => <Button key={d} variant="outline" className="w-full" icon={<FileDown size={15} />} onClick={() => downloadExportDoc(full, d)}>Preview {DOC_TITLE[d].toLowerCase()}</Button>)}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

/* --------------------------------- Page --------------------------------- */

const ExportInvoices: React.FC = () => {
  const all = exportInvoices.use();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<ExportInvoice | null>(null);
  const rows = useMemo(() => [...all].sort((a, b) => b.date.localeCompare(a.date))
    .filter(i => `${i.invoiceNo} ${i.billTo.name} ${i.billTo.country} ${i.poNo}`.toLowerCase().includes(search.toLowerCase())), [all, search]);

  if (editing) return <Editor initial={editing} onDone={() => setEditing(null)} />;

  const usd = all.filter(i => i.currency === 'USD').reduce((s, i) => s + exportCalc(i).value, 0);
  const eur = all.filter(i => i.currency === 'EURO').reduce((s, i) => s + exportCalc(i).value, 0);
  const nextNo = () => {
    const y = new Date().getFullYear() % 100;
    return `II/EXP/${all.length + 25}-${y + 1}`;
  };
  return (
    <>
      <PageHeader title="Export invoices" subtitle="Export, commercial and packing-list invoices — one entry makes all three."
        actions={<Button icon={<Plus size={16} />} onClick={() => setEditing(blankExport(nextNo()))}>Create invoice</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Invoices" value={all.length} />
        <Stat label="USD value" value={money('USD', usd)} />
        <Stat label="EURO value" value={money('EURO', eur)} />
        <Stat label="In rupees" value={inr(all.reduce((s, i) => s + exportCalc(i).inr, 0))} hint="at each invoice's exchange rate" />
      </div>
      <Card>
        <div className="border-b border-line p-4"><SearchBox value={search} onChange={setSearch} placeholder="Search invoice, buyer, country, P/O" /></div>
        <DataTable
          rows={rows}
          onRowClick={i => setEditing(i)}
          empty={<div className="py-12 text-center text-ink-3">No invoices yet. Create one to get all three documents.</div>}
          columns={[
            { key: 'n', header: 'Invoice', render: i => <><div className="font-medium">{i.invoiceNo}</div><div className="text-[12px] text-ink-3">{fmtDate(i.date)}</div></> },
            { key: 'b', header: 'Buyer', render: i => <><div className="font-medium">{i.billTo.name}</div><div className="text-[12px] text-ink-3">{i.billTo.country} · {i.portOfDischarge || '—'}</div></> },
            { key: 'p', header: 'P/O', render: i => i.poNo || '—' },
            { key: 't', header: 'Terms', render: i => <Badge>{i.incoterms}</Badge> },
            { key: 'c', header: 'Cartons', align: 'right', render: i => num(exportCalc(i).cartons) },
            { key: 'v', header: 'Value', align: 'right', render: i => <span className="font-semibold">{money(i.currency, exportCalc(i).value)}</span> },
            {
              key: 'd', header: 'PDF', align: 'right', render: i => (
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  {DOCS.map(d => <Button key={d} size="sm" variant="outline" title={DOC_TITLE[d]} onClick={() => downloadExportDoc(i, d)}>{d === 'EXPORT' ? 'Export' : d === 'COMMERCIAL' ? 'Commercial' : 'Packing'}</Button>)}
                  <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(i)} />
                </div>
              ),
            },
          ]}
        />
      </Card>
      <Confirm open={!!deleting} title="Delete this invoice?" message={`${deleting?.invoiceNo} for ${deleting?.billTo.name} will be removed.`}
        onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) exportInvoices.remove(deleting.id); setDeleting(null); toast.ok('Invoice deleted'); }} />
    </>
  );
};

export default ExportInvoices;
