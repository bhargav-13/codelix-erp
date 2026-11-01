import React, { useMemo, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { contractors, itemName, jobCalc, jobNo, jobs, type Job, type Named } from '../../data/production';
import { Button, Card, DataTable, Drawer, Field, PageHeader, SearchBox, fmtDate, inr, num, toast } from '../../ui';
import { today } from '../sales/shared';
import { useSettings } from '../../settings';

const yearAgo = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); };

interface StmtRow { job: Job; date: string; price: number; jobPay: number; item: string; sent: number; rtDate?: string; rtGross: number; element: string; rejection: number; used: number; net: number; pay: number; value: number }

/** One row per job sent in the period, worked out as on Parmeshwari's contractor statement. */
function statement(contractorId: number, from: string, to: string, all: Job[]) {
  const rows: StmtRow[] = all
    .filter(j => j.contractorId === contractorId)
    .map(j => ({ j, c: jobCalc(j) }))
    .filter(({ c }) => c.firstDate >= from && c.firstDate <= to)
    .sort((a, b) => a.c.firstDate.localeCompare(b.c.firstDate))
    .map(({ j, c }) => {
      const packs = new Map<string, number>();
      j.returns.forEach(r => r.packs.forEach(p => packs.set(p.type, (packs.get(p.type) || 0) + p.count)));
      return {
        job: j, date: c.firstDate, price: c.price, jobPay: c.jobPay, item: itemName(j.itemId), sent: c.sent, rtDate: c.lastReturn,
        rtGross: c.grossReturned, element: [...packs].map(([t, k]) => `${k} ${t}`).join(', ') || '—', rejection: c.rejection,
        used: c.used, net: c.netReturned, pay: c.netJobPay, value: c.value,
      };
    });
  const t = rows.reduce((s, r) => ({ sent: s.sent + r.sent, back: s.back + r.net, used: s.used + r.used, pay: s.pay + r.pay, value: s.value + r.value, rej: s.rej + r.rejection }),
    { sent: 0, back: 0, used: 0, pay: 0, value: 0, rej: 0 });
  const rejAmt = rows.reduce((s, r) => s + jobCalc(r.job).rejectionAmount, 0);
  return { rows, totals: { ...t, rejAmt } };
}

/** Contractor statements: everything sent, returned and paid for one contractor over a period. */
const Subcontractors: React.FC = () => {
  const { settings } = useSettings();
  const people = contractors.use();
  const all = jobs.use();
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<Named | null>(null);
  const [from, setFrom] = useState(yearAgo());
  const [to, setTo] = useState(today());

  const list = useMemo(() => people.map(p => {
    const mine = all.filter(j => j.contractorId === p.id);
    const dates = mine.flatMap(j => [...j.sends.map(s => s.date), ...j.returns.map(r => r.date)]).sort();
    const latest = [...mine].sort((a, b) => (b.sends[0]?.date ?? '').localeCompare(a.sends[0]?.date ?? ''))[0];
    const out = mine.filter(j => j.status === 'IN_PROCESS').reduce((s, j) => s + jobCalc(j).pending, 0);
    return { p, last: dates[dates.length - 1], item: latest ? itemName(latest.itemId) : '—', jobs: mine.length, out };
  }).filter(r => r.p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.last || '').localeCompare(a.last || '')), [people, all, search]);

  const stmt = viewing ? statement(viewing.id, from, to, all) : null;

  const pdf = (who: Named) => {
    const s = statement(who.id, from, to, all);
    if (!s.rows.length) { toast.err('No jobs for this contractor in the period'); return; }
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(settings.companyName, 10, 14);
    doc.setFontSize(11); doc.text(`Subcontract statement — ${who.name}`, 10, 21);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`${fmtDate(from)} to ${fmtDate(to)}`, W - 10, 14, { align: 'right' });
    const heads = ['Date', 'Market', 'Job work', 'Item', 'Sent', 'Rt. date', 'Rt. stock', 'Element', 'Rejection', 'Used', 'Net wgt.', 'Job pay', 'Rs.'];
    const xs = [10, 32, 50, 66, 108, 128, 150, 172, 204, 224, 244, 266, W - 10];
    let y = 31;
    const row = (cells: string[], bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(8);
      cells.forEach((c, i) => doc.text(c, xs[i], y, { align: [1, 2, 4, 6, 8, 9, 10, 11, 12].includes(i) ? 'right' : 'left' }));
      y += 6; if (y > 195) { doc.addPage(); y = 16; }
    };
    // Right-aligned columns are drawn at their right edge, so shift those x positions to the column end.
    [1, 2, 4, 6, 8, 9, 10, 11].forEach(i => { xs[i] = xs[i + 1] - 3; });
    row(heads, true);
    s.rows.forEach(r => row([fmtDate(r.date), num(r.price, 2), num(r.jobPay, 2), r.item.slice(0, 22), num(r.sent, 3), r.rtDate ? fmtDate(r.rtDate) : '-',
      num(r.rtGross, 3), r.element.slice(0, 16), num(r.rejection, 3), num(r.used, 3), num(r.net, 3), num(r.pay, 2), num(r.value, 2)]));
    y += 2;
    row(['Total', '', '', '', num(s.totals.sent, 3), '', '', '', num(s.totals.rej, 3), num(s.totals.used, 3), num(s.totals.back, 3), num(s.totals.pay, 2), num(s.totals.value, 2)], true);
    y += 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(`Total paid Rs: ${num(s.totals.value, 2)}/-    Rejection deducted: ${num(s.totals.rejAmt, 2)}/-    Total job pay: ${num(s.totals.pay, 2)}/-`, 10, y);
    doc.save(`${who.name}-statement.pdf`);
  };

  return (
    <>
      <PageHeader title="Subcontractor" subtitle="Statement for each job-work contractor: sent, returned, used and job pay." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Search contractor" />
          <div className="ml-auto flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-ink-3">Statement period</span>
            <input type="date" className="field h-8 w-[140px]" value={from} onChange={e => setFrom(e.target.value)} />
            <input type="date" className="field h-8 w-[140px]" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <DataTable
          rows={list}
          onRowClick={r => setViewing(r.p)}
          columns={[
            { key: 'n', header: 'Name', render: r => <span className="font-medium">{r.p.name}</span> },
            { key: 'd', header: 'Last update', render: r => <span className="text-ink-3">{fmtDate(r.last)}</span> },
            { key: 'i', header: 'Item', render: r => r.item },
            { key: 'j', header: 'Jobs', align: 'right', render: r => r.jobs },
            { key: 'o', header: 'Still out', align: 'right', render: r => (r.out > 0 ? `${num(r.out, 2)} kg` : <span className="text-ink-3">—</span>) },
            {
              key: 'x', header: '', align: 'right', render: r => (
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="outline" icon={<Download size={13} />} onClick={() => pdf(r.p)}>PDF</Button>
                  <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={() => setViewing(r.p)}>View</Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Drawer open={!!viewing} wide title={viewing ? `Statement · ${viewing.name}` : ''} onClose={() => setViewing(null)}
        footer={viewing && <Button variant="outline" icon={<Download size={15} />} onClick={() => pdf(viewing)}>Statement PDF</Button>}>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Field label="Start date"><input type="date" className="field" value={from} onChange={e => setFrom(e.target.value)} /></Field>
          <Field label="End date"><input type="date" className="field" value={to} onChange={e => setTo(e.target.value)} /></Field>
        </div>
        {stmt && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[['Total sent stock', `${num(stmt.totals.sent, 3)} kg`], ['Total return stock', `${num(stmt.totals.back, 3)} kg`], ['Used', `${num(stmt.totals.used, 3)} kg`],
                ['Total paid', inr(stmt.totals.value)], ['Rejection deducted', inr(stmt.totals.rejAmt)], ['Total job pay', inr(stmt.totals.pay)]]
                .map(([l, v]) => <div key={l} className="rounded-lg bg-muted p-3"><div className="text-[12px] text-ink-3">{l}</div><div className="mt-1 font-semibold">{v}</div></div>)}
            </div>
            <DataTable
              rows={stmt.rows}
              pageSize={10}
              empty={<div className="py-8 text-center text-ink-3">No jobs in this period</div>}
              columns={[
                { key: 'd', header: 'Date', render: r => <><div>{fmtDate(r.date)}</div><div className="text-[12px] text-ink-3">{jobNo(r.job)}</div></> },
                { key: 'm', header: 'Market / Job', align: 'right', render: r => <><div>{num(r.price, 2)}</div><div className="text-[12px] text-ink-3">{num(r.jobPay, 2)}</div></> },
                { key: 'i', header: 'Item', render: r => r.item },
                { key: 's', header: 'Sent', align: 'right', render: r => num(r.sent, 3) },
                { key: 'r', header: 'Rt. stock', align: 'right', render: r => <>{num(r.rtGross, 3)}{r.rtDate && <div className="text-[12px] text-ink-3">{fmtDate(r.rtDate)}</div>}</> },
                { key: 'e', header: 'Element', render: r => <span className="text-ink-2">{r.element}</span> },
                { key: 'x', header: 'Rejection', align: 'right', render: r => (r.rejection ? <span className="text-red-600">{num(r.rejection, 3)}</span> : '—') },
                { key: 'u', header: 'Used', align: 'right', render: r => num(r.used, 3) },
                { key: 'n', header: 'Net wgt.', align: 'right', render: r => num(r.net, 3) },
                { key: 'j', header: 'Job pay', align: 'right', render: r => inr(r.pay) },
                { key: 't', header: 'Rs.', align: 'right', render: r => <span className="font-semibold">{inr(r.value)}</span> },
              ]}
            />
          </>
        )}
      </Drawer>
    </>
  );
};

export default Subcontractors;
