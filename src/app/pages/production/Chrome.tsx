import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileDown, Trash2, Undo2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  chromeCalc, chromeLots, contractorName, itemName, jobCalc, jobNo, jobs, packKg, partyName, platingParties,
  type ChromeLot, type JobStatus, type Pack,
} from '../../data/production';
import { Badge, Button, Card, Confirm, Drawer, Empty, Field, PageHeader, SearchBox, Stat, Tabs, cx, fmtDate, inr, num, toast } from '../../ui';
import { n } from '../inventory/shared';
import { UNIT_LABEL, today, type Floor } from '../sales/shared';
import { Figure, JOB_STATUS, Line, PackagingEditor, money, monthStart, newPack, packSummary, qty } from './shared';
import { useSettings } from '../../settings';

/* ------------------------------ Return form ------------------------------ */

const ReturnForm: React.FC<{ lot: ChromeLot | null; onClose: () => void }> = ({ lot, onClose }) => {
  const [date, setDate] = useState(today());
  const [gross, setGross] = useState(0);
  const [packs, setPacks] = useState<Pack[]>([newPack('PETI')]);
  const [rate, setRate] = useState(0);
  const [remark, setRemark] = useState('');
  const [toStock, setToStock] = useState(true);
  const [stockItem, setStockItem] = useState('');
  const [floor, setFloor] = useState<Floor>('GROUND_FLOOR');
  const [pcs, setPcs] = useState(0);

  useEffect(() => {
    if (!lot) return;
    const job = jobs.get(lot.jobId);
    const c = job ? jobCalc(job) : null;
    setDate(today()); setGross(0); setPacks([newPack('PETI')]); setRemark(''); setToStock(true); setPcs(0);
    setStockItem(`${itemName(job?.itemId ?? 0)} (Chrome)`); setFloor('GROUND_FLOOR');
    // Cost per kg of the finished item = material + job work + plating, as Parmeshwari works it out.
    setRate(Number(((c?.price ?? 0) + (c?.jobPay ?? 0) + lot.rate).toFixed(2)));
  }, [lot]);
  if (!lot) return null;

  const net = Math.max(0, gross - packKg(packs));

  const save = () => {
    if (!(gross > 0) || net <= 0) { toast.err('Enter the gross weight received'); return; }
    if (toStock && !stockItem.trim()) { toast.err('Name the stock item'); return; }
    chromeLots.update(lot.id, {
      status: 'COMPLETED',
      back: { date, gross, packs: packs.filter(p => p.count > 0), rate, remark: remark.trim() || undefined,
        ...(toStock ? { stockItem: stockItem.trim(), stockUnit: UNIT_LABEL[floor], pcs: pcs || undefined } : {}) },
    });
    toast.ok(toStock ? 'Return recorded and added to stock' : 'Return recorded');
    onClose();
  };

  return (
    <Drawer open wide title={`Record crome return · ${partyName(lot.partyId)}`} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save return</Button></>}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="font-semibold">Return details</h3>
          <div className="rounded-lg bg-muted p-3 text-[13px]">{itemName(jobs.get(lot.jobId)?.itemId ?? 0)} · sent {qty(lot.net)} on {fmtDate(lot.date)}</div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Return date"><input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} /></Field>
            <Field label="Gross return (kg)"><input type="number" className="field" value={gross || ''} onChange={e => setGross(n(e.target.value))} /></Field>
          </div>
          <PackagingEditor rows={packs} onChange={setPacks} />
          <div className="space-y-0.5 rounded-lg bg-accent-soft px-4 py-3 text-[13px]">
            <Line label="Gross return" value={qty(gross)} />
            <Line label="Packaging deduction" value={`− ${qty(packKg(packs))}`} />
            <Line strong label="Net return" value={<span className="text-accent">{qty(net)}</span>} />
            <Line label="Difference vs sent" value={<span className={net - lot.net < 0 ? 'text-red-600' : 'text-emerald-600'}>{net - lot.net > 0 ? '+' : ''}{num(net - lot.net, 3)} kg</span>} />
          </div>
          <Field label="Remark"><input className="field" value={remark} onChange={e => setRemark(e.target.value)} /></Field>
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">Inventory details</h3>
          <label className="flex items-center gap-2"><input type="checkbox" checked={toStock} onChange={e => setToStock(e.target.checked)} /> Add to inventory</label>
          {toStock && <>
            <Field label="Item name"><input className="field" value={stockItem} onChange={e => setStockItem(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Unit">
                <select className="field" value={floor} onChange={e => setFloor(e.target.value as Floor)}>
                  {(Object.keys(UNIT_LABEL) as Floor[]).map(f => <option key={f} value={f}>{UNIT_LABEL[f]}</option>)}
                </select>
              </Field>
              <Field label="Pieces"><input type="number" className="field" value={pcs || ''} onChange={e => setPcs(n(e.target.value))} /></Field>
            </div>
          </>}
          <Field label="Price / kg (rate + job work + crome)"><input type="number" className="field" value={rate || ''} onChange={e => setRate(n(e.target.value))} /></Field>
          <div className="flex justify-between rounded-lg bg-muted px-4 py-3"><span>Value</span><b>{inr(net * rate)}</b></div>
        </div>
      </div>
    </Drawer>
  );
};

/* -------------------------------- Lot card -------------------------------- */

const LotCard: React.FC<{ lot: ChromeLot; onReturn: () => void; onDelete: () => void }> = ({ lot, onReturn, onDelete }) => {
  const [open, setOpen] = useState(false);
  const job = jobs.get(lot.jobId);
  const c = chromeCalc(lot);
  const setStatus = (s: JobStatus) => { chromeLots.update(lot.id, { status: s }); toast.ok(`Marked ${JOB_STATUS[s].label.toLowerCase()}`); };
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">CRM-{lot.id}</h3>
            <Badge tone={JOB_STATUS[lot.status].tone}>{JOB_STATUS[lot.status].label}</Badge>
          </div>
          <div className="truncate text-ink-2"><b className="text-ink">{partyName(lot.partyId)}</b> · {itemName(job?.itemId ?? 0)}</div>
          <div className="text-[12px] text-ink-3">From {contractorName(job?.contractorId ?? 0)} · {job ? jobNo(job) : '—'}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-[12px] text-ink-3">
          <span>Crome {fmtDate(lot.date)}</span>
          {lot.back && <span>Return {fmtDate(lot.back.date)}</span>}
          <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={onDelete} />
        </div>
      </div>
      <div className="grid flex-1 gap-4 p-5 sm:grid-cols-2">
        <div>
          <div className="mb-1 font-semibold">Sent details</div>
          <Line label="Net stock" value={qty(lot.net)} />
          <Line label="Packaging" value={qty(packKg(lot.packs))} />
          <div className="text-right text-[12px] text-ink-3">{packSummary(lot.packs)}</div>
          <Line strong label="Gross weight" value={qty(c.grossSent)} />
          {lot.rate > 0 && <Line label="Crome rate" value={`${money(lot.rate)} / kg`} />}
        </div>
        {lot.back ? (
          <div>
            <button type="button" onClick={() => setOpen(v => !v)} className="mb-1 flex w-full items-center justify-between font-semibold">
              Return details <ChevronDown size={14} className={cx('text-ink-3 transition-transform', open && 'rotate-180')} />
            </button>
            {open && <>
              <Line label="Gross return" value={qty(lot.back.gross)} />
              <Line label="Packaging" value={qty(packKg(lot.back.packs))} />
            </>}
            <Line label="Net return" value={qty(c.backNet)} />
            <Line label="Rate" value={`${money(lot.back.rate)} / kg`} />
            <Line strong label="Amount" value={money(c.amount)} />
            <div className={cx('mt-2 flex justify-between rounded-md px-3 py-1.5 text-[13px] font-semibold',
              c.diff < 0 ? 'bg-red-500/12 text-red-600' : c.diff > 0 ? 'bg-emerald-500/12 text-emerald-600' : 'bg-muted')}>
              <span>Difference</span><span>{c.diff > 0 ? '+' : ''}{num(c.diff, 3)} kg</span>
            </div>
            {lot.back.stockItem && <div className="mt-2 text-[12px] text-ink-3">Added to {lot.back.stockUnit}: {lot.back.stockItem}{lot.back.pcs ? ` · ${num(lot.back.pcs)} pc` : ''}</div>}
          </div>
        ) : (
          <div className="grid place-items-center rounded-lg border border-dashed border-line p-4 italic text-ink-3">Pending return</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        <span className="mr-1 text-[12px] font-medium uppercase tracking-wide text-ink-3">Status</span>
        <select className="field h-8 w-[140px]" value={lot.status} onChange={e => setStatus(e.target.value as JobStatus)}>
          {(Object.keys(JOB_STATUS) as JobStatus[]).map(s => <option key={s} value={s}>{JOB_STATUS[s].label}</option>)}
        </select>
        {!lot.back && <Button size="sm" icon={<Undo2 size={14} />} onClick={onReturn}>Return record</Button>}
        {(lot.remark || lot.back?.remark) && <span className="ml-auto truncate text-[13px] text-ink-2">{lot.back?.remark || lot.remark}</span>}
      </div>
    </Card>
  );
};

/* ---------------------------------- Page ---------------------------------- */

const Chrome: React.FC = () => {
  const { settings } = useSettings();
  const all = chromeLots.use();
  const parties = platingParties.use();
  jobs.use();
  const [tab, setTab] = useState<JobStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [party, setParty] = useState(0);
  const [returning, setReturning] = useState<ChromeLot | null>(null);
  const [deleting, setDeleting] = useState<ChromeLot | null>(null);
  const [report, setReport] = useState<{ party: number; from: string; to: string } | null>(null);

  const rows = useMemo(() => [...all].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).filter(l => {
    const job = jobs.get(l.jobId);
    return (tab === 'ALL' || l.status === tab) && (!party || l.partyId === party)
      && `CRM-${l.id} ${partyName(l.partyId)} ${contractorName(job?.contractorId ?? 0)} ${itemName(job?.itemId ?? 0)}`.toLowerCase().includes(search.toLowerCase());
  }), [all, tab, party, search]);
  const out = all.filter(l => !l.back);

  const remove = () => {
    if (!deleting) return;
    chromeLots.remove(deleting.id);
    toast.ok(deleting.back?.stockItem ? 'Chrome lot deleted and its stock taken back out' : 'Chrome lot deleted');
    setDeleting(null);
  };

  const pdf = () => {
    if (!report) return;
    const list = all.filter(l => (!report.party || l.partyId === report.party) && l.date >= report.from && l.date <= report.to);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(`${settings.companyName} — Crome report`, 12, 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`${report.party ? partyName(report.party) : 'All parties'} · ${fmtDate(report.from)} to ${fmtDate(report.to)}`, 12, 22);
    const xs = [12, 34, 80, 120, 145, 170, W - 12];
    let y = 32;
    const row = (cells: string[], bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      cells.forEach((t, i) => doc.text(t, xs[i], y, { align: i >= 3 ? 'right' : 'left' }));
      y += 6; if (y > 280) { doc.addPage(); y = 16; }
    };
    row(['Date', 'Party', 'Item', 'Sent', 'Back', 'Diff', 'Amount'], true);
    let tSent = 0, tBack = 0, tAmt = 0;
    list.forEach(l => {
      const c = chromeCalc(l);
      tSent += l.net; tBack += c.backNet; tAmt += c.amount;
      row([fmtDate(l.date), partyName(l.partyId).slice(0, 24), itemName(jobs.get(l.jobId)?.itemId ?? 0).slice(0, 20), num(l.net, 3), l.back ? num(c.backNet, 3) : '-', l.back ? num(c.diff, 3) : '-', `Rs. ${num(c.amount, 2)}`]);
    });
    row(['Total', '', '', num(tSent, 3), num(tBack, 3), num(tBack - tSent, 3), `Rs. ${num(tAmt, 2)}`], true);
    doc.save('crome-report.pdf');
    setReport(null);
  };

  return (
    <>
      <PageHeader title="Crome" subtitle="Return chunks sent from job work to plating, and what came back."
        actions={<Button variant="outline" icon={<FileDown size={16} />} onClick={() => setReport({ party: 0, from: monthStart(), to: today() })}>Crome report</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total cromes" value={all.length} />
        <Stat label="In progress" value={all.filter(l => l.status === 'IN_PROCESS').length} hint={`${num(out.reduce((s, l) => s + l.net, 0), 1)} kg at plating`} />
        <Stat label="Completed" value={all.filter(l => l.status === 'COMPLETED').length} />
        <Stat label="Returned value" value={inr(all.reduce((s, l) => s + chromeCalc(l).amount, 0))} />
      </div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Tabs value={tab} onChange={t => setTab(t as JobStatus | 'ALL')}
            tabs={[{ id: 'ALL', label: 'All' }, { id: 'IN_PROCESS', label: 'In process' }, { id: 'COMPLETED', label: 'Completed' }, { id: 'REJECTED', label: 'Rejected' }]} />
          <select className="field h-9 w-[200px]" value={party} onChange={e => setParty(Number(e.target.value))}>
            <option value={0}>All parties</option>
            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search party, contractor, item" /></div>
        </div>
      </Card>
      {!rows.length
        ? <Card><Empty title="No crome lots here" hint="Send a return chunk from Subcontracting (Job work) to plating." /></Card>
        : <div className="grid gap-4 xl:grid-cols-2">{rows.map(l => <LotCard key={l.id} lot={l} onReturn={() => setReturning(l)} onDelete={() => setDeleting(l)} />)}</div>}

      <ReturnForm lot={returning} onClose={() => setReturning(null)} />
      <Confirm open={!!deleting} title={`Delete CRM-${deleting?.id}?`}
        message={deleting?.back?.stockItem
          ? `This lot's return added ${deleting.back.stockItem} to ${deleting.back.stockUnit}; deleting takes that stock back out.`
          : `Lot sent to ${partyName(deleting?.partyId ?? 0)} on ${fmtDate(deleting?.date)} will be removed and the return chunk freed.`}
        onCancel={() => setDeleting(null)} onConfirm={remove} />
      <Drawer open={!!report} title="Crome report" onClose={() => setReport(null)}
        footer={<><Button variant="outline" onClick={() => setReport(null)}>Cancel</Button><Button icon={<FileDown size={15} />} onClick={pdf}>Download PDF</Button></>}>
        {report && (
          <div className="space-y-4">
            <Field label="Party">
              <select className="field" value={report.party} onChange={e => setReport({ ...report, party: Number(e.target.value) })}>
                <option value={0}>All parties</option>
                {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="From"><input type="date" className="field" value={report.from} onChange={e => setReport({ ...report, from: e.target.value })} /></Field>
              <Field label="To"><input type="date" className="field" value={report.to} onChange={e => setReport({ ...report, to: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3">
              <Figure label="Lots" value={all.filter(l => (!report.party || l.partyId === report.party) && l.date >= report.from && l.date <= report.to).length} />
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default Chrome;
