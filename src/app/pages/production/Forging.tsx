import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, FileDown, Pencil, Trash2 } from 'lucide-react';
import { forgingInwardApi, forgingInwardItemsApi, forgingOutwardApi, forgingPartyApi, forgingReportApi } from '../../../api/forging';
import type { ForgingInward, ForgingInwardItem, ForgingOutward, ForgingParty, InwardWeightUnit } from '../../../types';
import { Badge, Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, Stat, Tabs, fmtDate, num, toast, useAsync, type Tone } from '../../ui';
import { SelectWithAdd, n } from '../inventory/shared';
import { today } from '../sales/shared';
import { fromDmy } from './shared';

/*
 * Forging job work for parties: wire goes out (outward), and comes back as
 * chhol (offcuts), taiyar maal (finished), rejection, or plain kg (inward).
 * Party balance = wire − (chhol + taiyar maal + rejection), same as the PDF.
 */

const INWARD_TYPES: { id: InwardWeightUnit; label: string; tone: Tone }[] = [
  { id: 'TAIYAR MAAL', label: 'Taiyar maal', tone: 'green' },
  { id: 'CHHOL', label: 'Chhol', tone: 'blue' },
  { id: 'REJECTION', label: 'Rejection', tone: 'red' },
  { id: 'KG', label: 'Kg', tone: 'gray' },
];
const typeOf = (u: string) => INWARD_TYPES.find(t => t.id === u);

type Entry =
  | { kind: 'out'; id: number; date: string; partyId?: number; partyName: string; challanNo: string; weight: number; raw: ForgingOutward }
  | { kind: 'in'; id: number; date: string; partyId?: number; partyName: string; challanNo: string; weight: number; unit: InwardWeightUnit; raw: ForgingInward };

interface EntryForm {
  kind: 'in' | 'out';
  partyId: number;
  challanNo: string;
  date: string;
  weight: number;
  unit: InwardWeightUnit;
  withItem: boolean;
  item: ForgingInwardItem;
}

const blankItem = (): ForgingInwardItem => ({ name: '', pricePerKg: undefined, lowStockAlert: undefined, quantityInPc: undefined, weightPerPc: undefined });

const Forging: React.FC = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const q = useAsync(async () => {
    const [ins, outs, parties] = await Promise.all([
      forgingInwardApi.getAll(from || undefined, to || undefined),
      forgingOutwardApi.getAll(from || undefined, to || undefined),
      forgingPartyApi.getAll(),
    ]);
    const entries: Entry[] = [
      ...outs.map(o => ({ kind: 'out' as const, id: o.id!, date: fromDmy(o.date), partyId: o.partyId, partyName: o.partyName, challanNo: o.challanNo, weight: o.weight, raw: o })),
      ...ins.map(i => ({ kind: 'in' as const, id: i.id!, date: fromDmy(i.date), partyId: i.partyId, partyName: i.partyName, challanNo: i.challanNo, weight: i.weight, unit: i.weightUnit, raw: i })),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    return { entries, parties };
  }, [from, to]);

  const [tab, setTab] = useState('parties');
  const [party, setParty] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ editing: Entry | null; f: EntryForm } | null>(null);
  const [parties, setParties] = useState<ForgingParty[]>([]);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (q.data) setParties(q.data.parties); }, [q.data]);

  const entries = q.data?.entries || [];
  const rows = useMemo(() => entries.filter(e =>
    (!party || e.partyName === party) && `${e.partyName} ${e.challanNo}`.toLowerCase().includes(search.toLowerCase()),
  ), [entries, party, search]);

  const summary = useMemo(() => {
    const m = new Map<string, { wire: number; tm: number; chhol: number; rej: number; kg: number }>();
    for (const e of entries) {
      const s = m.get(e.partyName) || { wire: 0, tm: 0, chhol: 0, rej: 0, kg: 0 };
      if (e.kind === 'out') s.wire += e.weight;
      else if (e.unit === 'TAIYAR MAAL') s.tm += e.weight;
      else if (e.unit === 'CHHOL') s.chhol += e.weight;
      else if (e.unit === 'REJECTION') s.rej += e.weight;
      else s.kg += e.weight;
      m.set(e.partyName, s);
    }
    return [...m.entries()].map(([name, s]) => ({ name, ...s, balance: s.wire - (s.tm + s.chhol + s.rej) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);
  const total = summary.reduce((t, s) => ({ wire: t.wire + s.wire, tm: t.tm + s.tm, chhol: t.chhol + s.chhol, rej: t.rej + s.rej }), { wire: 0, tm: 0, chhol: 0, rej: 0 });

  const openNew = (kind: 'in' | 'out') => setForm({
    editing: null,
    f: { kind, partyId: 0, challanNo: '', date: today(), weight: 0, unit: 'TAIYAR MAAL', withItem: false, item: blankItem() },
  });
  const openEdit = (e: Entry) => setForm({
    editing: e,
    f: {
      kind: e.kind, partyId: e.partyId || 0, challanNo: e.challanNo, date: e.date, weight: e.weight,
      unit: e.kind === 'in' ? e.unit : 'TAIYAR MAAL',
      withItem: e.kind === 'in' && !!e.raw.item, item: (e.kind === 'in' && e.raw.item) || blankItem(),
    },
  });
  const setF = (patch: Partial<EntryForm>) => setForm(s => (s ? { ...s, f: { ...s.f, ...patch } } : s));
  const setItem = (patch: Partial<ForgingInwardItem>) => setForm(s => (s ? { ...s, f: { ...s.f, item: { ...s.f.item, ...patch } } } : s));

  const save = async () => {
    if (!form) return;
    const { f, editing } = form;
    if (!f.partyId || !f.challanNo.trim() || !(f.weight > 0)) { toast.err('Party, challan no. and weight are required'); return; }
    if (f.withItem && !f.item.name.trim()) { toast.err('Name the finished item'); return; }
    const partyName = parties.find(p => p.partyId === f.partyId)?.partyName || '';
    setBusy(true);
    try {
      if (f.kind === 'out') {
        const body = { partyId: f.partyId, partyName, challanNo: f.challanNo.trim(), date: f.date, weight: f.weight, weightUnit: 'WIRE' as const, image: editing?.raw.image };
        if (editing) await forgingOutwardApi.update(editing.id, body);
        else await forgingOutwardApi.create(body);
      } else {
        const body = { partyId: f.partyId, partyName, challanNo: f.challanNo.trim(), date: f.date, weight: f.weight, weightUnit: f.unit, image: editing?.raw.image };
        const saved = editing ? await forgingInwardApi.update(editing.id, body) : await forgingInwardApi.create(body);
        const inwardId = editing?.id ?? saved.id!;
        const existingItem = editing?.kind === 'in' ? editing.raw.item : null;
        const { id: _id, inwardId: _iw, ...item } = { ...f.item, name: f.item.name.trim() };
        if (f.withItem) {
          if (existingItem?.id) await forgingInwardItemsApi.update(inwardId, existingItem.id, item);
          else await forgingInwardItemsApi.create(inwardId, item);
        } else if (existingItem?.id) {
          await forgingInwardItemsApi.delete(inwardId, existingItem.id);
        }
      }
      toast.ok('Entry saved');
      setForm(null);
      q.reload();
    } catch {
      toast.err('Could not save the entry');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      if (deleting.kind === 'out') await forgingOutwardApi.delete(deleting.id);
      else await forgingInwardApi.delete(deleting.id);
      toast.ok('Entry deleted');
      setDeleting(null);
      q.reload();
    } catch {
      toast.err('Could not delete the entry');
    } finally {
      setBusy(false);
    }
  };

  const pdf = async () => {
    try {
      await forgingReportApi.downloadPdf(party || undefined, from || undefined, to || undefined);
    } catch {
      toast.err('Could not download the report');
    }
  };

  const f = form?.f;
  return (
    <>
      <PageHeader title="Forging" subtitle="Wire sent to forging parties and what came back."
        actions={<>
          <Button variant="outline" icon={<ArrowUpRight size={16} />} onClick={() => openNew('out')}>Wire out</Button>
          <Button icon={<ArrowDownLeft size={16} />} onClick={() => openNew('in')}>Goods in</Button>
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Wire sent" value={`${num(total.wire, 2)} kg`} />
        <Stat label="Taiyar maal back" value={`${num(total.tm, 2)} kg`} />
        <Stat label="Chhol + rejection" value={`${num(total.chhol + total.rej, 2)} kg`} />
        <Stat label="Balance with parties" value={`${num(total.wire - total.tm - total.chhol - total.rej, 2)} kg`} hint={from || to ? 'for this period' : 'all time'} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'parties', label: 'By party' }, { id: 'register', label: 'Register' }]} />
          <input type="date" className="field h-8 w-[150px]" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-ink-3">–</span>
          <input type="date" className="field h-8 w-[150px]" value={to} onChange={e => setTo(e.target.value)} />
          <select className="field h-8 w-[160px]" value={party} onChange={e => setParty(e.target.value)}>
            <option value="">All parties</option>
            {parties.map(p => <option key={p.partyId}>{p.partyName}</option>)}
          </select>
          <Button size="sm" variant="outline" className="ml-auto" icon={<FileDown size={14} />} onClick={pdf}>Report</Button>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : tab === 'parties' ? (
          <DataTable
            rows={summary.filter(s => !party || s.name === party)}
            onRowClick={s => { setParty(s.name); setTab('register'); }}
            columns={[
              { key: 'n', header: 'Party', render: s => <span className="font-medium">{s.name}</span> },
              { key: 'w', header: 'Wire out', align: 'right', render: s => num(s.wire, 2) },
              { key: 't', header: 'Taiyar maal', align: 'right', render: s => num(s.tm, 2) },
              { key: 'c', header: 'Chhol', align: 'right', render: s => num(s.chhol, 2) },
              { key: 'r', header: 'Rejection', align: 'right', render: s => num(s.rej, 2) },
              { key: 'b', header: 'Balance', align: 'right', render: s => <span className={s.balance > 0 ? 'font-semibold' : 'text-ink-3'}>{num(s.balance, 2)} kg</span> },
            ]}
          />
        ) : (
          <>
            <div className="border-b border-line px-4 py-3"><SearchBox value={search} onChange={setSearch} placeholder="Search party or challan" /></div>
            <DataTable
              rows={rows}
              onRowClick={openEdit}
              columns={[
                { key: 'd', header: 'Date', render: e => fmtDate(e.date) },
                { key: 'p', header: 'Party', render: e => <span className="font-medium">{e.partyName}</span> },
                { key: 'c', header: 'Challan', render: e => e.challanNo },
                {
                  key: 't', header: 'Type', render: e => e.kind === 'out'
                    ? <Badge tone="accent">Wire out</Badge>
                    : <Badge tone={typeOf(e.unit)?.tone}>{typeOf(e.unit)?.label ?? e.unit}</Badge>,
                },
                { key: 'w', header: 'Weight', align: 'right', render: e => <span className="font-semibold">{num(e.weight, 2)} kg</span> },
                { key: 'i', header: 'Item', render: e => (e.kind === 'in' && e.raw.item ? e.raw.item.name : '') },
                {
                  key: 'a', header: '', align: 'right', render: e => (
                    <div className="flex justify-end gap-1" onClick={ev => ev.stopPropagation()}>
                      <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={() => openEdit(e)} />
                      <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(e)} />
                    </div>
                  ),
                },
              ]}
            />
          </>
        )}
      </Card>

      <Drawer open={!!form} title={`${form?.editing ? 'Edit' : 'New'} ${f?.kind === 'out' ? 'wire out' : 'goods in'}`} onClose={() => setForm(null)}
        footer={<><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {f && (
          <div className="space-y-4">
            <Field label="Party">
              <SelectWithAdd value={f.partyId} options={parties} getId={p => p.partyId} getLabel={p => p.partyName}
                onChange={id => setF({ partyId: id })} placeholder="Select party…" noun="Party"
                onCreate={async name => { const p = await forgingPartyApi.createParty(name); setParties(l => [...l, p]); return p; }} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Challan no."><input className="field" value={f.challanNo} onChange={e => setF({ challanNo: e.target.value })} /></Field>
              <Field label="Date"><input type="date" className="field" value={f.date} onChange={e => setF({ date: e.target.value })} /></Field>
            </div>
            {f.kind === 'in' && (
              <Field label="What came back">
                <div className="grid grid-cols-4 gap-2">
                  {INWARD_TYPES.map(t => (
                    <button key={t.id} onClick={() => setF({ unit: t.id })}
                      className={`rounded-lg border px-2 py-2 text-[13px] font-medium ${f.unit === t.id ? 'border-accent bg-accent-soft text-accent' : 'border-line'}`}>{t.label}</button>
                  ))}
                </div>
              </Field>
            )}
            <Field label="Weight (kg)"><input type="number" className="field" value={f.weight || ''} onChange={e => setF({ weight: n(e.target.value) })} /></Field>
            {f.kind === 'in' && (
              <>
                <label className="flex items-center gap-2"><input type="checkbox" checked={f.withItem} onChange={e => setF({ withItem: e.target.checked })} /> Record as a finished item</label>
                {f.withItem && (
                  <div className="grid grid-cols-2 gap-4 rounded-lg border border-line p-3">
                    <Field label="Item name" className="col-span-2"><input className="field" value={f.item.name} onChange={e => setItem({ name: e.target.value })} /></Field>
                    <Field label="Rate per kg (₹)"><input type="number" className="field" value={f.item.pricePerKg ?? ''} onChange={e => setItem({ pricePerKg: n(e.target.value) })} /></Field>
                    <Field label="Low-stock alert (kg)"><input type="number" className="field" value={f.item.lowStockAlert ?? ''} onChange={e => setItem({ lowStockAlert: n(e.target.value) })} /></Field>
                    <Field label="Weight per piece (kg)"><input type="number" className="field" value={f.item.weightPerPc ?? ''} onChange={e => setItem({ weightPerPc: n(e.target.value) })} /></Field>
                    <Field label="Pieces"><input type="number" className="field" value={f.item.quantityInPc ?? ''} onChange={e => setItem({ quantityInPc: n(e.target.value) })} /></Field>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Drawer>
      <Confirm open={!!deleting} title="Delete entry?" message={`Challan ${deleting?.challanNo} (${deleting?.partyName}) will be removed.`}
        busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Forging;
