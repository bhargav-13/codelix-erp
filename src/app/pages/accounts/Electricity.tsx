import React, { useState } from 'react';
import { FileDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { electricCreditApi, electricOutwardApi } from '../../../api/electric';
import type { ElectricCredit, ElectricOutward } from '../../../types';
import { Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, Spinner, Stat, Tabs, fmtDate, inr, num, toast, useAsync } from '../../ui';
import { n } from '../inventory/shared';
import { today } from '../sales/shared';
import { fromDmy } from '../production/shared';

type Outward = Omit<ElectricOutward, 'id' | 'totalUnitAmount' | 'totalWeightAmount' | 'totalAmount'>;
const blankOut = (): Outward => ({ date: today(), challanNo: '', weight: 0, perKgWeight: 0, unit: 0, unitRate: 0 });
const blankPay = (): Omit<ElectricCredit, 'id'> => ({ date: today(), challanNo: '', rate: 0 });

/**
 * Each challan records electricity used (units × unit rate) against the weight
 * processed (weight × rate per kg). The backend's "total" is power cost per kg
 * (units amount ÷ weight). Payments ("credits") are set against the weight
 * amount: balance = weight amount − payments, same as the PDF report.
 */
const Electricity: React.FC = () => {
  const q = useAsync(async () => {
    const [outs, pays] = await Promise.all([electricOutwardApi.getAll(), electricCreditApi.getAll()]);
    return {
      outs: outs.map(o => ({ ...o, date: fromDmy(o.date) })).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
      pays: pays.map(p => ({ ...p, date: fromDmy(p.date) })).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    };
  }, []);
  const [tab, setTab] = useState('bills');
  const [out, setOut] = useState<{ id?: number; f: Outward } | null>(null);
  const [pay, setPay] = useState<{ id?: number; f: Omit<ElectricCredit, 'id'> } | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'bill' | 'pay'; id: number } | null>(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const [busy, setBusy] = useState(false);

  const outs = q.data?.outs || [];
  const pays = q.data?.pays || [];
  const power = outs.reduce((s, o) => s + (o.totalUnitAmount || 0), 0);
  const charged = outs.reduce((s, o) => s + (o.totalWeightAmount || 0), 0);
  const paid = pays.reduce((s, p) => s + (p.rate || 0), 0);

  const saveOut = async () => {
    if (!out) return;
    if (!out.f.challanNo.trim()) { toast.err('Challan no. is required'); return; }
    setBusy(true);
    try {
      const body = { ...out.f, challanNo: out.f.challanNo.trim() };
      if (out.id) await electricOutwardApi.update(out.id, body);
      else await electricOutwardApi.create(body);
      toast.ok('Bill saved');
      setOut(null);
      q.reload();
    } catch {
      toast.err('Could not save the bill');
    } finally {
      setBusy(false);
    }
  };

  const savePay = async () => {
    if (!pay) return;
    if (!(pay.f.rate > 0)) { toast.err('Enter the amount paid'); return; }
    setBusy(true);
    try {
      if (pay.id) await electricCreditApi.update(pay.id, pay.f);
      else await electricCreditApi.create(pay.f);
      toast.ok('Payment saved');
      setPay(null);
      q.reload();
    } catch {
      toast.err('Could not save the payment');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      if (deleting.kind === 'bill') await electricOutwardApi.delete(deleting.id);
      else await electricCreditApi.delete(deleting.id);
      toast.ok('Deleted');
      setDeleting(null);
      q.reload();
    } catch {
      toast.err('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  const pdf = async () => {
    try {
      await electricOutwardApi.downloadPdf(range.from || undefined, range.to || undefined);
    } catch {
      toast.err('Could not download the report');
    }
  };

  const rowActions = (kind: 'bill' | 'pay', id: number, edit: () => void) => (
    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
      <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={edit} />
      <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting({ kind, id })} />
    </div>
  );

  const f = out?.f;
  const unitAmt = f ? f.unit * f.unitRate : 0;
  const weightAmt = f ? f.weight * f.perKgWeight : 0;

  return (
    <>
      <PageHeader title="Electricity" subtitle="Power bills by challan and payments made against them."
        actions={<>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'bills', label: 'Bills' }, { id: 'payments', label: 'Payments' }]} />
          <Button icon={<Plus size={16} />} onClick={() => (tab === 'bills' ? setOut({ f: blankOut() }) : setPay({ f: blankPay() }))}>
            {tab === 'bills' ? 'Add bill' : 'Add payment'}
          </Button>
        </>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Electricity cost" value={inr(power)} hint={`${num(outs.reduce((s, o) => s + (o.unit || 0), 0))} units`} />
        <Stat label="Weight amount" value={inr(charged)} hint={`${num(outs.reduce((s, o) => s + (o.weight || 0), 0), 1)} kg`} />
        <Stat label="Payments" value={inr(paid)} />
        <Stat label="Balance" value={inr(charged - paid)} hint="weight amount − payments" />
      </div>
      <Card>
        {tab === 'bills' && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-line p-4">
            <input type="date" className="field h-8 w-[150px]" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} />
            <span className="text-ink-3">–</span>
            <input type="date" className="field h-8 w-[150px]" value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} />
            <Button size="sm" variant="outline" icon={<FileDown size={14} />} onClick={pdf}>Report</Button>
          </div>
        )}
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : tab === 'bills' ? (
          <DataTable
            rows={outs}
            onRowClick={o => setOut({ id: o.id, f: { date: o.date, challanNo: o.challanNo, weight: o.weight, perKgWeight: o.perKgWeight, unit: o.unit, unitRate: o.unitRate } })}
            columns={[
              { key: 'd', header: 'Date', render: o => fmtDate(o.date) },
              { key: 'c', header: 'Challan', render: o => <span className="font-medium">{o.challanNo}</span> },
              { key: 'u', header: 'Units', align: 'right', render: o => <>{num(o.unit)}<div className="text-[12px] text-ink-3">@ ₹{num(o.unitRate, 2)}</div></> },
              { key: 'ua', header: 'Unit ₹', align: 'right', render: o => inr(o.totalUnitAmount) },
              { key: 'w', header: 'Weight', align: 'right', render: o => <>{num(o.weight, 2)} kg<div className="text-[12px] text-ink-3">@ ₹{num(o.perKgWeight, 2)}</div></> },
              { key: 'wa', header: 'Weight ₹', align: 'right', render: o => inr(o.totalWeightAmount) },
              { key: 't', header: 'Power / kg', align: 'right', render: o => <span className="font-semibold">₹{num(o.totalAmount, 2)}</span> },
              { key: 'a', header: '', align: 'right', render: o => rowActions('bill', o.id, () => setOut({ id: o.id, f: { date: o.date, challanNo: o.challanNo, weight: o.weight, perKgWeight: o.perKgWeight, unit: o.unit, unitRate: o.unitRate } })) },
            ]}
          />
        ) : (
          <DataTable
            rows={pays}
            onRowClick={p => setPay({ id: p.id, f: { date: p.date, challanNo: p.challanNo, rate: p.rate } })}
            columns={[
              { key: 'd', header: 'Date', render: p => fmtDate(p.date) },
              { key: 'c', header: 'Reference', render: p => p.challanNo || '—' },
              { key: 'r', header: 'Amount', align: 'right', render: p => <span className="font-semibold">{inr(p.rate)}</span> },
              { key: 'a', header: '', align: 'right', render: p => rowActions('pay', p.id, () => setPay({ id: p.id, f: { date: p.date, challanNo: p.challanNo, rate: p.rate } })) },
            ]}
          />
        )}
      </Card>

      <Drawer open={!!out} title={out?.id ? 'Edit bill' : 'Add bill'} onClose={() => setOut(null)}
        footer={<>
          <div className="mr-auto text-[13px] text-ink-2">Power cost <b className="ml-1 text-[16px] text-ink">₹{num(f && f.weight ? unitAmt / f.weight : 0, 2)}/kg</b></div>
          <Button variant="outline" onClick={() => setOut(null)}>Cancel</Button><Button loading={busy} onClick={saveOut}>Save</Button>
        </>}>
        {f && out && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date"><input type="date" className="field" value={f.date} onChange={e => setOut({ ...out, f: { ...f, date: e.target.value } })} /></Field>
            <Field label="Challan no."><input className="field" value={f.challanNo} onChange={e => setOut({ ...out, f: { ...f, challanNo: e.target.value } })} /></Field>
            <Field label="Units"><input type="number" className="field" value={f.unit || ''} onChange={e => setOut({ ...out, f: { ...f, unit: n(e.target.value) } })} /></Field>
            <Field label="Rate per unit (₹)"><input type="number" className="field" value={f.unitRate || ''} onChange={e => setOut({ ...out, f: { ...f, unitRate: n(e.target.value) } })} /></Field>
            <Field label="Weight (kg)"><input type="number" className="field" value={f.weight || ''} onChange={e => setOut({ ...out, f: { ...f, weight: n(e.target.value) } })} /></Field>
            <Field label="Rate per kg (₹)"><input type="number" className="field" value={f.perKgWeight || ''} onChange={e => setOut({ ...out, f: { ...f, perKgWeight: n(e.target.value) } })} /></Field>
            <div className="col-span-2 grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-[13px]">
              <div><div className="text-ink-3">Electricity cost</div><b>{inr(unitAmt)}</b></div>
              <div><div className="text-ink-3">Weight amount</div><b>{inr(weightAmt)}</b></div>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={!!pay} title={pay?.id ? 'Edit payment' : 'Add payment'} onClose={() => setPay(null)}
        footer={<><Button variant="outline" onClick={() => setPay(null)}>Cancel</Button><Button loading={busy} onClick={savePay}>Save</Button></>}>
        {pay && (
          <div className="space-y-4">
            <Field label="Date"><input type="date" className="field" value={pay.f.date} onChange={e => setPay({ ...pay, f: { ...pay.f, date: e.target.value } })} /></Field>
            <Field label="Reference / challan"><input className="field" value={pay.f.challanNo} onChange={e => setPay({ ...pay, f: { ...pay.f, challanNo: e.target.value } })} /></Field>
            <Field label="Amount paid (₹)"><input type="number" className="field" value={pay.f.rate || ''} onChange={e => setPay({ ...pay, f: { ...pay.f, rate: n(e.target.value) } })} /></Field>
          </div>
        )}
      </Drawer>

      <Confirm open={!!deleting} title="Delete entry?" message="This entry will be removed." busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Electricity;
