import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  cashflowAllTotalsApi, cashflowExpenseApi, cashflowIncomeApi, cashflowPartyApi, cashflowPaymentTypeApi, cashflowSummaryApi,
} from '../../../api/cashflow';
import { isOwner } from '../../../lib/auth';
import type { CashflowEntry, CashflowEntryRequest, CashflowParty, CashflowPaymentType } from '../../../types';
import { Badge, Button, Card, Confirm, Drawer, ErrorNote, Field, PageHeader, Spinner, Stat, fmtDate, inr, toast, useAsync } from '../../ui';
import { SelectWithAdd, n } from '../inventory/shared';
import { today } from '../sales/shared';

type Kind = 'income' | 'expense';
const api = (k: Kind) => (k === 'income' ? cashflowIncomeApi : cashflowExpenseApi);

const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Daily cash book. Each day has money in and money out; closing a day carries
 * its balance forward to the next day and locks it (owners can still edit).
 */
const Cashflow: React.FC = () => {
  const [date, setDate] = useState(today());
  const day = useAsync(() => cashflowSummaryApi.get(date), [date]);
  const totals = useAsync(() => cashflowAllTotalsApi.get(), []);
  const [parties, setParties] = useState<CashflowParty[]>([]);
  const [types, setTypes] = useState<CashflowPaymentType[]>([]);
  const [form, setForm] = useState<{ kind: Kind; entry: CashflowEntry | null; body: CashflowEntryRequest } | null>(null);
  const [deleting, setDeleting] = useState<{ kind: Kind; entry: CashflowEntry } | null>(null);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    cashflowPartyApi.getAll().then(setParties).catch(() => {});
    cashflowPaymentTypeApi.getAll().then(setTypes).catch(() => {});
  }, []);

  const s = day.data;
  const closed = s?.dayClosed ?? false;
  const canEdit = !closed || isOwner();
  const reload = () => { day.reload(); totals.reload(); };

  const open = (kind: Kind, entry: CashflowEntry | null) => setForm({
    kind, entry,
    body: entry
      ? { date: entry.date, amount: entry.amount, partyId: entry.party?.id, paymentTypeId: entry.paymentType?.id, note: entry.note || '' }
      : { date, amount: 0, note: '' },
  });

  const save = async () => {
    if (!form) return;
    if (!(form.body.amount > 0)) { toast.err('Enter an amount'); return; }
    setBusy(true);
    try {
      const body = { ...form.body, note: form.body.note?.trim() || undefined };
      if (form.entry) await api(form.kind).update(form.entry.id, body);
      else await api(form.kind).create(body);
      toast.ok(form.kind === 'income' ? 'Money in recorded' : 'Money out recorded');
      setForm(null);
      reload();
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
      await api(deleting.kind).delete(deleting.entry.id);
      toast.ok('Entry deleted');
      setDeleting(null);
      reload();
    } catch {
      toast.err('Could not delete the entry');
    } finally {
      setBusy(false);
    }
  };

  const closeDay = async () => {
    setBusy(true);
    try {
      const r = await cashflowSummaryApi.closeDay(date);
      toast.ok(`Day closed — ${inr(r.carryForwardAmount)} carried to ${fmtDate(r.nextDate)}`);
      setClosing(false);
      reload();
    } catch {
      toast.err('Could not close the day');
    } finally {
      setBusy(false);
    }
  };

  const list = (kind: Kind, entries: CashflowEntry[]) => (
    <Card
      title={<span className="flex items-center gap-2">{kind === 'income' ? 'Money in' : 'Money out'}
        <span className="text-[13px] font-normal text-ink-3">{inr(entries.filter(e => !e.carryForward).reduce((t, e) => t + e.amount, 0))}</span></span>}
      action={canEdit && <Button size="sm" variant="outline" icon={kind === 'income' ? <Plus size={14} /> : <Minus size={14} />} onClick={() => open(kind, null)}>Add</Button>}
    >
      <div className="px-5 pb-3">
        {entries.map(e => (
          <div key={e.id} className="group flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
            <div className="min-w-0">
              <div className="truncate font-medium">{e.carryForward ? 'Carried forward' : e.party?.name || e.note || '—'}</div>
              <div className="truncate text-[12px] text-ink-3">{[e.paymentType?.name, e.party && e.note].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`font-semibold tabular-nums ${kind === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>{kind === 'income' ? '+' : '−'}{inr(e.amount)}</span>
              {canEdit && !e.carryForward && (
                <span className="flex opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="ghost" icon={<Pencil size={13} />} onClick={() => open(kind, e)} />
                  <Button size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={() => setDeleting({ kind, entry: e })} />
                </span>
              )}
            </div>
          </div>
        ))}
        {!entries.length && <div className="py-8 text-center text-ink-3">Nothing recorded</div>}
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader title="Cashflow" subtitle="Daily cash book."
        actions={<>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" icon={<ChevronLeft size={14} />} onClick={() => setDate(d => shift(d, -1))} />
            <input type="date" className="field h-8 w-[150px]" value={date} onChange={e => setDate(e.target.value)} />
            <Button size="sm" variant="outline" icon={<ChevronRight size={14} />} onClick={() => setDate(d => shift(d, 1))} />
            {date !== today() && <Button size="sm" variant="ghost" onClick={() => setDate(today())}>Today</Button>}
          </div>
          {s && !closed && <Button variant="outline" icon={<Lock size={15} />} onClick={() => setClosing(true)}>Close day</Button>}
        </>} />

      {day.loading ? <Spinner /> : day.error ? <ErrorNote error={day.error} onRetry={day.reload} /> : s && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Stat label="Money in" value={inr(s.totalIncome)} />
            <Stat label="Money out" value={inr(s.totalExpense)} />
            <Stat label="Day balance" value={inr(s.netBalance)} hint={closed ? 'Day closed' : 'Open'} />
            <Stat label="All-time balance" value={totals.data ? inr(totals.data.netBalance) : '…'} hint={totals.data ? `${totals.data.entryDates.length} open day(s)` : undefined} />
          </div>
          {closed && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-ink-2">
              <Lock size={15} /> This day is closed{s.carryForwardAmount ? ` — ${inr(s.carryForwardAmount)} carried forward` : ''}.{canEdit ? ' You can still edit it as owner.' : ''}
            </div>
          )}
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
            {list('income', s.incomes || [])}
            {list('expense', s.expenses || [])}
            <div className="space-y-4">
              <Card title="By payment type">
                <div className="px-5 pb-4">
                  {(s.paymentTypeSummary || []).map(p => (
                    <div key={p.paymentTypeId} className="flex justify-between border-b border-line py-2 last:border-0">
                      <span>{p.paymentTypeName}</span>
                      <span className={`font-semibold tabular-nums ${p.netBalance < 0 ? 'text-red-600' : ''}`}>{inr(p.netBalance)}</span>
                    </div>
                  ))}
                  {!s.paymentTypeSummary?.length && <div className="py-4 text-center text-ink-3">No entries</div>}
                </div>
              </Card>
              {!!totals.data?.entryDates.length && (
                <Card title="Days not closed">
                  <div className="flex flex-wrap gap-2 px-5 pb-4">
                    {totals.data.entryDates.slice(0, 12).map(d => (
                      <button key={d.date} onClick={() => setDate(d.date)}><Badge tone={d.date === date ? 'accent' : 'amber'}>{fmtDate(d.date)}</Badge></button>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      <Drawer open={!!form} title={`${form?.entry ? 'Edit' : 'Add'} ${form?.kind === 'income' ? 'money in' : 'money out'}`} onClose={() => setForm(null)}
        footer={<><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date"><input type="date" className="field" value={form.body.date} onChange={e => setForm({ ...form, body: { ...form.body, date: e.target.value } })} /></Field>
              <Field label="Amount (₹)"><input type="number" className="field" autoFocus value={form.body.amount || ''} onChange={e => setForm({ ...form, body: { ...form.body, amount: n(e.target.value) } })} /></Field>
            </div>
            <Field label="Party">
              <SelectWithAdd value={form.body.partyId || 0} options={parties} getId={p => p.id} getLabel={p => p.name}
                onChange={id => setForm({ ...form, body: { ...form.body, partyId: id || undefined } })} placeholder="No party" noun="Party"
                onCreate={async name => { const p = await cashflowPartyApi.create(name); setParties(l => [...l, p]); return p; }} />
            </Field>
            <Field label="Paid via">
              <SelectWithAdd value={form.body.paymentTypeId || 0} options={types} getId={t => t.id} getLabel={t => t.name}
                onChange={id => setForm({ ...form, body: { ...form.body, paymentTypeId: id || undefined } })} placeholder="Select…" noun="Payment type"
                onCreate={async name => { const t = await cashflowPaymentTypeApi.create(name); setTypes(l => [...l, t]); return t; }} />
            </Field>
            <Field label="Note"><input className="field" value={form.body.note || ''} onChange={e => setForm({ ...form, body: { ...form.body, note: e.target.value } })} /></Field>
          </div>
        )}
      </Drawer>

      <Confirm open={!!deleting} title="Delete entry?" message={`${inr(deleting?.entry.amount)} will be removed from ${fmtDate(deleting?.entry.date)}.`}
        busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />

      <Drawer open={closing} title={`Close ${fmtDate(date)}?`} onClose={() => setClosing(false)}
        footer={<><Button variant="outline" onClick={() => setClosing(false)}>Cancel</Button><Button loading={busy} onClick={closeDay}>Close day</Button></>}>
        <p className="text-ink-2">The day's balance of <b className="text-ink">{inr(s?.netBalance)}</b> is carried forward to the next day, and the day is locked for everyone except the owner.</p>
      </Drawer>
    </>
  );
};

export default Cashflow;
