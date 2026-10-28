import React, { useMemo, useState } from 'react';
import { BellRing, Download, IndianRupee } from 'lucide-react';
import { partyApi } from '../../../api/party';
import { paymentApi } from '../../../api/payment';
import type { Party, PartyLedgerResponse, Payment, PaymentStatus } from '../../../types';
import { BillingType } from '../../../types';
import {
  Badge, Button, Card, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, Stat, Tabs, fmtDate, inr, toast, useAsync, type Tone,
} from '../../ui';
import { UnitBadge, UnitTabs, downloadBlob, fetchAllPages, floorsFor, normalizeDates, orderNo, today, useUnit, type Floor } from './shared';

type Mode = typeof BillingType[keyof typeof BillingType];
const MODE_LABEL: Record<Mode, string> = { OFFICIAL: 'GST', OFFLINE: 'Cash' };

const DUE: Record<PaymentStatus, { label: string; tone: Tone }> = {
  OVERDUE: { label: 'Overdue', tone: 'red' },
  DUE_SOON: { label: 'Due soon', tone: 'amber' },
  UPCOMING: { label: 'Upcoming', tone: 'blue' },
};

const due = (p: Payment) => Math.max(0, (p.totalAmount || 0) - (p.receivedAmount || 0));

// Ledger range used by the original screen: everything.
const FROM = '2020-01-01';
const TO = '2099-12-31';

/* ------------------------------ By order ------------------------------ */

type PayRow = Payment & { floor: Floor; mode: Mode; party?: string };

const ByOrder: React.FC<{ partyNames: Map<number, string> }> = ({ partyNames }) => {
  const [unit, setUnit] = useUnit();
  const q = useAsync(async () => {
    // The payments endpoint ignores `mode` and returns both GST and cash rows, each tagged with its own mode.
    const jobs = floorsFor(unit).map(floor =>
      fetchAllPages(page => paymentApi.getPaymentList({ floor, page, size: 100 }))
        .then(list => list.map(p => ({ ...p, floor: (p.floor as Floor) || floor, mode: (p.mode as Mode) || BillingType.OFFICIAL }))),
    );
    const byId = new Map((await Promise.all(jobs)).flat().map(p => [p.id, p]));
    return [...byId.values()];
  }, [unit]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaymentStatus | 'OPEN' | ''>('OPEN');
  const [receiving, setReceiving] = useState<PayRow | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);

  const all: PayRow[] = useMemo(() => (q.data || []).map(p => ({
    ...p, party: p.customerName || (p.partyId ? partyNames.get(p.partyId) : undefined),
  })), [q.data, partyNames]);

  const rows = useMemo(() => all
    .filter(p => (status === 'OPEN' ? due(p) > 0 : !status || p.paymentStatus === status))
    .filter(p => `${p.party || ''} ${orderNo(p.orderId)}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [all, status, search]);

  const sumDue = (s: PaymentStatus) => all.filter(p => p.paymentStatus === s).reduce((t, p) => t + due(p), 0);

  const receive = async () => {
    if (!receiving) return;
    const value = Number(amount);
    if (!(value > 0)) { toast.err('Enter the amount received'); return; }
    if (value > due(receiving) + 0.01) { toast.err(`Only ${inr(due(receiving))} is due`); return; }
    setBusy(true);
    try {
      await paymentApi.receivePayment(receiving.id, { newReceivedAmount: value, newReceivedDate: date });
      toast.ok('Payment recorded');
      setReceiving(null);
      q.reload();
    } catch {
      toast.err('Could not record the payment');
    } finally {
      setBusy(false);
    }
  };

  const remind = async (p: PayRow) => {
    try {
      await paymentApi.sendReminder(p.id);
      toast.ok(`Reminder sent${p.party ? ` to ${p.party}` : ''}`);
      q.reload();
    } catch {
      toast.err('Could not send the reminder');
    }
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Overdue" value={inr(sumDue('OVERDUE'))} hint={`${all.filter(p => p.paymentStatus === 'OVERDUE' && due(p) > 0).length} orders`} />
        <Stat label="Due soon" value={inr(sumDue('DUE_SOON'))} />
        <Stat label="Upcoming" value={inr(sumDue('UPCOMING'))} />
        <Stat label="Received so far" value={inr(all.reduce((t, p) => t + (p.receivedAmount || 0), 0))} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <UnitTabs value={unit} onChange={setUnit} />
          <select className="field max-w-[170px]" value={status} onChange={e => setStatus(e.target.value as PaymentStatus | 'OPEN' | '')}>
            <option value="OPEN">Unpaid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DUE_SOON">Due soon</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="">All</option>
          </select>
          <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search party or order no." /></div>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            columns={[
              { key: 'p', header: 'Party', render: p => <><div className="font-medium">{p.party || '—'}</div><div className="text-[12px] text-ink-3">{orderNo(p.orderId)}</div></> },
              { key: 'u', header: 'Unit', render: p => <UnitBadge floor={p.floor} /> },
              { key: 'm', header: 'Bill', render: p => <Badge>{MODE_LABEL[p.mode]}</Badge> },
              { key: 'd', header: 'Due date', render: p => fmtDate(p.dueDate) },
              { key: 't', header: 'Amount', align: 'right', render: p => inr(p.totalAmount) },
              { key: 'r', header: 'Received', align: 'right', render: p => inr(p.receivedAmount) },
              { key: 'b', header: 'Balance', align: 'right', render: p => <span className="font-semibold">{inr(due(p))}</span> },
              { key: 's', header: 'Status', render: p => due(p) <= 0 ? <Badge tone="green">Paid</Badge> : <Badge tone={DUE[p.paymentStatus]?.tone}>{DUE[p.paymentStatus]?.label}</Badge> },
              { key: 'l', header: 'Last reminder', render: p => <span className="text-ink-3">{p.lastReminder ? fmtDate(p.lastReminder) : '—'}</span> },
              {
                key: 'a', header: '', align: 'right', render: p => due(p) > 0 ? (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" icon={<IndianRupee size={13} />} onClick={() => { setReceiving(p); setAmount(String(due(p))); setDate(today()); }}>Receive</Button>
                    <Button size="sm" variant="ghost" title="Send reminder" icon={<BellRing size={14} />} onClick={() => remind(p)} />
                  </div>
                ) : null,
              },
            ]}
          />
        )}
      </Card>

      <Drawer
        open={!!receiving}
        title="Record payment"
        onClose={() => setReceiving(null)}
        footer={<><Button variant="outline" onClick={() => setReceiving(null)}>Cancel</Button><Button loading={busy} onClick={receive}>Save</Button></>}
      >
        {receiving && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <div className="font-medium">{receiving.party || orderNo(receiving.orderId)}</div>
              <div className="text-[13px] text-ink-2">{orderNo(receiving.orderId)} · {MODE_LABEL[receiving.mode]} bill · balance {inr(due(receiving))}</div>
            </div>
            <Field label="Amount received (₹)"><input className="field" type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus /></Field>
            <Field label="Date"><input className="field" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
          </div>
        )}
      </Drawer>
    </>
  );
};

/* ------------------------------ By party ------------------------------ */

interface PartyRow { party: Party; ledger: PartyLedgerResponse | null }

// Matches the original reminders screen: ledger totals plus the party's opening balances.
const billed = (r: PartyRow) => (r.ledger?.totalOfficialAmount || 0) + r.party.officialAmount;
const cash = (r: PartyRow) => (r.ledger?.totalOfflineAmount || 0) + r.party.offlineAmount;
const outstanding = (r: PartyRow) => (r.ledger?.totalRemainingAmount || 0) + r.party.officialAmount + r.party.offlineAmount;

const ByParty: React.FC<{ parties: Party[]; reloadParties: () => void }> = ({ parties, reloadParties }) => {
  const q = useAsync(async () => Promise.all(parties.map(party =>
    paymentApi.getPartyLedger(party.partyId, FROM, TO).then(ledger => ({ party, ledger: normalizeDates(ledger) }), () => ({ party, ledger: null })),
  )), [parties]);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<PartyRow | null>(null);
  const [receiving, setReceiving] = useState<{ party: Party; mode: 'official' | 'offline' } | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => (q.data || [])
    .filter(r => r.party.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => outstanding(b) - outstanding(a)), [q.data, search]);

  // Opening-balance collection, exactly like before: it reduces the party's opening amount.
  const receiveOpening = async () => {
    if (!receiving) return;
    const { party, mode } = receiving;
    const value = Number(amount);
    const available = mode === 'official' ? party.officialAmount : party.offlineAmount;
    if (!(value > 0)) { toast.err('Enter the amount received'); return; }
    if (value > available) { toast.err(`Opening balance is only ${inr(available)}`); return; }
    setBusy(true);
    try {
      await partyApi.updateParty(party.partyId, {
        name: party.name,
        officialAmount: mode === 'official' ? available - value : party.officialAmount,
        offlineAmount: mode === 'offline' ? available - value : party.offlineAmount,
      });
      toast.ok('Payment recorded');
      setReceiving(null);
      setViewing(null);
      reloadParties();
    } catch {
      toast.err('Could not record the payment');
    } finally {
      setBusy(false);
    }
  };

  const ledgerPdf = async (p: Party) => {
    try {
      downloadBlob(await paymentApi.getPartyLedgerPdf(p.partyId, FROM, TO), `${p.name}-ledger.pdf`);
    } catch {
      toast.err('Could not download the ledger');
    }
  };

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Search party" />
          <span className="ml-auto text-[13px] text-ink-3">Party totals cover both units.</span>
        </div>
        {q.loading ? <Spinner label="Loading party ledgers…" /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            onRowClick={setViewing}
            columns={[
              { key: 'n', header: 'Party', render: r => <span className="font-medium">{r.party.name}</span> },
              { key: 'o', header: 'Orders', align: 'right', render: r => r.ledger?.orders?.length ?? '—' },
              { key: 'b', header: 'GST billed', align: 'right', render: r => inr(billed(r)) },
              { key: 'c', header: 'Cash billed', align: 'right', render: r => inr(cash(r)) },
              { key: 'r', header: 'Received', align: 'right', render: r => inr(r.ledger?.totalReceivedAmount) },
              { key: 'd', header: 'Outstanding', align: 'right', render: r => <span className={outstanding(r) > 0 ? 'font-semibold' : 'text-ink-3'}>{inr(outstanding(r))}</span> },
            ]}
          />
        )}
      </Card>

      <Drawer
        open={!!viewing && !receiving}
        wide
        title={viewing?.party.name || ''}
        onClose={() => setViewing(null)}
        footer={viewing && <Button variant="outline" icon={<Download size={15} />} onClick={() => ledgerPdf(viewing.party)}>Ledger PDF</Button>}
      >
        {viewing && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['GST billed', billed(viewing)], ['Cash billed', cash(viewing)], ['Received', viewing.ledger?.totalReceivedAmount || 0], ['Outstanding', outstanding(viewing)]].map(([l, v]) => (
                <div key={l as string} className="rounded-lg bg-muted p-3"><div className="text-[12px] text-ink-3">{l}</div><div className="mt-1 font-semibold">{inr(v as number)}</div></div>
              ))}
            </div>
            {(viewing.party.officialAmount > 0 || viewing.party.offlineAmount > 0) && (
              <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-line p-3">
                <span className="mr-auto text-[13px]">Opening balance · GST {inr(viewing.party.officialAmount)} · Cash {inr(viewing.party.offlineAmount)}</span>
                {viewing.party.officialAmount > 0 && <Button size="sm" variant="outline" onClick={() => { setReceiving({ party: viewing.party, mode: 'official' }); setAmount(''); }}>Receive GST</Button>}
                {viewing.party.offlineAmount > 0 && <Button size="sm" variant="outline" onClick={() => { setReceiving({ party: viewing.party, mode: 'offline' }); setAmount(''); }}>Receive cash</Button>}
              </div>
            )}
            <h3 className="mb-2 font-semibold">Orders</h3>
            <DataTable
              rows={viewing.ledger?.orders || []}
              pageSize={8}
              columns={[
                { key: 'o', header: 'Order', render: o => <><div className="font-medium">{orderNo(o.orderId)}</div><div className="text-[12px] text-ink-3">{fmtDate(o.orderDate)}</div></> },
                { key: 'g', header: 'GST bill', align: 'right', render: o => inr(o.paymentSummary?.official?.totalAmount ?? o.officialGrandTotal) },
                { key: 'c', header: 'Cash bill', align: 'right', render: o => inr(o.paymentSummary?.offline?.totalAmount ?? o.offlineGrandTotal) },
                { key: 'r', header: 'Received', align: 'right', render: o => inr((o.paymentSummary?.official?.receivedAmount || 0) + (o.paymentSummary?.offline?.receivedAmount || 0)) },
                { key: 'd', header: 'Due', align: 'right', render: o => <span className="font-semibold">{inr((o.paymentSummary?.official?.dueAmount || 0) + (o.paymentSummary?.offline?.dueAmount || 0))}</span> },
              ]}
            />
          </>
        )}
      </Drawer>

      <Drawer
        open={!!receiving}
        title={`Receive ${receiving?.mode === 'official' ? 'GST' : 'cash'} opening balance`}
        onClose={() => setReceiving(null)}
        footer={<><Button variant="outline" onClick={() => setReceiving(null)}>Cancel</Button><Button loading={busy} onClick={receiveOpening}>Save</Button></>}
      >
        {receiving && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <div className="font-medium">{receiving.party.name}</div>
              <div className="text-[13px] text-ink-2">Balance {inr(receiving.mode === 'official' ? receiving.party.officialAmount : receiving.party.offlineAmount)}</div>
            </div>
            <Field label="Amount received (₹)"><input className="field" type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus /></Field>
          </div>
        )}
      </Drawer>
    </>
  );
};

/* -------------------------------- Page -------------------------------- */

const Payments: React.FC = () => {
  const [view, setView] = useState('order');
  const parties = useAsync(() => partyApi.getAllParties(), []);
  const names = useMemo(() => new Map((parties.data || []).map(p => [p.partyId, p.name])), [parties.data]);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="What customers owe, and reminders for what's due."
        actions={<Tabs value={view} onChange={setView} tabs={[{ id: 'order', label: 'By order' }, { id: 'party', label: 'By party' }]} />}
      />
      {parties.error ? <ErrorNote error={parties.error} onRetry={parties.reload} /> : view === 'order'
        ? <ByOrder partyNames={names} />
        : parties.loading ? <Spinner /> : <ByParty parties={parties.data || []} reloadParties={parties.reload} />}
    </>
  );
};

export default Payments;
