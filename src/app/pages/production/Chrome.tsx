import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, Trash2, Undo2 } from 'lucide-react';
import { cromeApi } from '../../../api/crome';
import type { Crome, CromeReturnRequest, PackagingDetail, SubcontractingStatus } from '../../../types';
import {
  Badge, Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, Stat, Tabs, fmtDate, inr, num, toast, useAsync,
} from '../../ui';
import { n } from '../inventory/shared';
import { UNIT_LABEL, downloadBlob, fetchAllPages, today, type Floor } from '../sales/shared';
import { JOB_STATUS, PackagingEditor, monthStart, newPackaging, packagingKg } from './shared';

/* ------------------------------ Return form ------------------------------ */

const ReturnForm: React.FC<{ lot: Crome | null; onClose: () => void; onSaved: () => void }> = ({ lot, onClose, onSaved }) => {
  const [date, setDate] = useState(today());
  const [gross, setGross] = useState(0);
  const [packs, setPacks] = useState<PackagingDetail[]>([newPackaging('PETI')]);
  const [rate, setRate] = useState(0);
  const [remark, setRemark] = useState('');
  const [toStock, setToStock] = useState(true);
  const [itemName, setItemName] = useState('');
  const [floor, setFloor] = useState<Floor>('GROUND_FLOOR');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!lot) return;
    setDate(today()); setGross(0); setPacks([newPackaging('PETI')]); setRemark(''); setToStock(true); setItemName(lot.itemName); setFloor('GROUND_FLOOR');
    // Cost per kg of the finished item = material + job work + plating, as before.
    cromeApi.getSubcontractingCromeInfo(lot.subcontractingId)
      .then(info => setRate(Number((info.price + info.jobWorkPay + (lot.cromeAmount ?? 0)).toFixed(2))))
      .catch(() => setRate(lot.cromeAmount ?? 0));
  }, [lot]);
  if (!lot) return null;

  const net = gross - packagingKg(packs);

  const save = async () => {
    if (!(gross > 0) || net <= 0) { toast.err('Enter the gross weight received'); return; }
    if (toStock && !itemName.trim()) { toast.err('Name the stock item'); return; }
    const payload: CromeReturnRequest = {
      returnDate: date, returnStock: gross, packagings: packs.filter(p => p.packagingCount > 0), rate, returnRemark: remark.trim() || null,
      addToInventory: toStock,
      ...(toStock ? { inventoryItemName: itemName.trim(), inventoryFloor: floor, inventoryPricePerKg: rate } : {}),
    };
    setBusy(true);
    try {
      await cromeApi.returnCrome(lot.cromeId, payload);
      toast.ok(toStock ? 'Return recorded and added to stock' : 'Return recorded');
      onSaved();
    } catch {
      toast.err('Could not record the return');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open title={`Plated goods back · ${lot.partyName}`} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save return</Button></>}>
      <div className="space-y-4">
        <div className="rounded-lg bg-muted p-3 text-[13px]">{lot.itemName} · sent {num(lot.sentStock, 3)} kg on {fmtDate(lot.cromeDate)}</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date"><input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="Gross weight received (kg)"><input type="number" className="field" value={gross || ''} onChange={e => setGross(n(e.target.value))} /></Field>
        </div>
        <PackagingEditor rows={packs} onChange={setPacks} />
        <div className="flex justify-between rounded-lg bg-accent-soft px-4 py-3"><span>Net received</span><b className="text-accent">{num(Math.max(0, net), 3)} kg</b></div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cost per kg (₹)"><input type="number" className="field" value={rate || ''} onChange={e => setRate(n(e.target.value))} /></Field>
          <Field label="Value"><div className="flex h-[38px] items-center font-semibold">{inr(Math.max(0, net) * rate)}</div></Field>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={toStock} onChange={e => setToStock(e.target.checked)} /> Add to finished stock</label>
        {toStock && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Stock item name"><input className="field" value={itemName} onChange={e => setItemName(e.target.value)} /></Field>
            <Field label="Unit">
              <select className="field" value={floor} onChange={e => setFloor(e.target.value as Floor)}>
                {(Object.keys(UNIT_LABEL) as Floor[]).map(f => <option key={f} value={f}>{UNIT_LABEL[f]}</option>)}
              </select>
            </Field>
          </div>
        )}
        <Field label="Remark"><input className="field" value={remark} onChange={e => setRemark(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
};

/* ---------------------------------- Page ---------------------------------- */

const Chrome: React.FC = () => {
  const q = useAsync(() => fetchAllPages(page => cromeApi.getCromeList({ page, size: 100 }))
    .then(l => l.sort((a, b) => b.cromeDate.localeCompare(a.cromeDate) || b.cromeId - a.cromeId)), []);
  const [tab, setTab] = useState<SubcontractingStatus | 'ALL'>('IN_PROCESS');
  const [search, setSearch] = useState('');
  const [returning, setReturning] = useState<Crome | null>(null);
  const [deleting, setDeleting] = useState<Crome | null>(null);
  const [report, setReport] = useState({ party: '', from: monthStart(), to: today() });
  const [busy, setBusy] = useState(false);

  const all = q.data || [];
  const parties = useMemo(() => [...new Set(all.map(c => c.partyName))].sort(), [all]);
  const rows = useMemo(() => all.filter(c =>
    (tab === 'ALL' || c.status === tab) && `${c.partyName} ${c.contractorName} ${c.itemName}`.toLowerCase().includes(search.toLowerCase()),
  ), [all, tab, search]);
  const out = all.filter(c => c.status === 'IN_PROCESS');

  const setStatus = async (c: Crome, s: SubcontractingStatus) => {
    try {
      await cromeApi.updateCromeStatus(c.cromeId, s);
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
      await cromeApi.deleteCrome(deleting.cromeId);
      toast.ok('Chrome lot deleted');
      setDeleting(null);
      q.reload();
    } catch {
      toast.err('Could not delete the lot');
    } finally {
      setBusy(false);
    }
  };

  const pdf = async () => {
    try {
      downloadBlob(await cromeApi.getCromeReportPdf(report.party || null, report.from, report.to), 'chrome-report.pdf');
    } catch {
      toast.err('Could not download the report');
    }
  };

  return (
    <>
      <PageHeader title="Chrome plating" subtitle="Lots sent from job work to plating, and what came back." />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Lots at plating" value={out.length} hint={`${num(out.reduce((s, c) => s + c.sentStock, 0), 1)} kg`} />
        <Stat label="Returned lots" value={all.filter(c => c.cromeReturn).length} />
        <Stat label="Returned value" value={inr(all.reduce((s, c) => s + (c.cromeReturn?.amount || 0), 0))} />
        <Stat label="Plating parties" value={parties.length} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Tabs value={tab} onChange={t => setTab(t as SubcontractingStatus | 'ALL')}
            tabs={[{ id: 'IN_PROCESS', label: 'At plating' }, { id: 'COMPLETED', label: 'Completed' }, { id: 'REJECTED', label: 'Rejected' }, { id: 'ALL', label: 'All' }]} />
          <SearchBox value={search} onChange={setSearch} placeholder="Search party, contractor, item" />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select className="field h-8 w-[150px]" value={report.party} onChange={e => setReport({ ...report, party: e.target.value })}>
              <option value="">All parties</option>
              {parties.map(p => <option key={p}>{p}</option>)}
            </select>
            <input type="date" className="field h-8 w-[140px]" value={report.from} onChange={e => setReport({ ...report, from: e.target.value })} />
            <input type="date" className="field h-8 w-[140px]" value={report.to} onChange={e => setReport({ ...report, to: e.target.value })} />
            <Button size="sm" variant="outline" icon={<FileDown size={14} />} onClick={pdf}>Report</Button>
          </div>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            empty={<div className="py-12 text-center text-ink-3">No lots here. Send one from a job-work return in Subcontracting.</div>}
            columns={[
              { key: 'd', header: 'Sent', render: c => fmtDate(c.cromeDate) },
              { key: 'p', header: 'Plating party', render: c => <><div className="font-medium">{c.partyName}</div><div className="text-[12px] text-ink-3">{c.itemName} · from {c.contractorName}</div></> },
              { key: 'n', header: 'Net sent', align: 'right', render: c => `${num(c.sentStock, 3)} kg` },
              { key: 'g', header: 'Gross', align: 'right', render: c => num(c.grossWeight, 3) },
              {
                key: 'r', header: 'Returned', align: 'right', render: c => c.cromeReturn
                  ? <><div>{num(c.cromeReturn.netReturnStock, 3)} kg</div><div className="text-[12px] text-ink-3">{fmtDate(c.cromeReturn.returnDate)} · {inr(c.cromeReturn.amount)}</div></>
                  : <span className="text-ink-3">—</span>,
              },
              {
                key: 's', header: 'Status', render: c => (
                  <select className="field h-8 w-[130px]" value={c.status} onChange={e => setStatus(c, e.target.value as SubcontractingStatus)}>
                    {(Object.keys(JOB_STATUS) as SubcontractingStatus[]).map(s => <option key={s} value={s}>{JOB_STATUS[s].label}</option>)}
                  </select>
                ),
              },
              {
                key: 'a', header: '', align: 'right', render: c => (
                  <div className="flex justify-end gap-1">
                    {!c.cromeReturn && <Button size="sm" variant="outline" icon={<Undo2 size={13} />} onClick={() => setReturning(c)}>Return</Button>}
                    {c.cromeReturn && <Badge tone="green">Back</Badge>}
                    <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(c)} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
      <ReturnForm lot={returning} onClose={() => setReturning(null)} onSaved={() => { setReturning(null); q.reload(); }} />
      <Confirm open={!!deleting} title="Delete chrome lot?" message={`Lot sent to ${deleting?.partyName} on ${fmtDate(deleting?.cromeDate)} will be removed.`}
        busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Chrome;
