import React, { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { contractorName, contractors, itemName, jobCalc, jobNo, jobs, type Job } from '../../data/production';
import { Badge, Button, Card, DataTable, PageHeader, SearchBox, Stat, fmtDate, inr, num } from '../../ui';
import { RejectionForm } from './Subcontracting';
import { money } from './shared';

/** Every job work with rejected material: the kg in effect, its rate, and what it takes off the job pay. */
const JobRejection: React.FC = () => {
  const all = jobs.use();
  const people = contractors.use();
  const [search, setSearch] = useState('');
  const [who, setWho] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<Job | null>(null);

  const rows = useMemo(() => all
    .map(j => ({ j, c: jobCalc(j) }))
    .filter(({ c }) => c.rejection > 0 || c.returnsRejection > 0)
    .filter(({ j, c }) => (!who || j.contractorId === who) && (!from || c.firstDate >= from) && (!to || c.firstDate <= to)
      && `${jobNo(j)} ${contractorName(j.contractorId)} ${itemName(j.itemId)}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.c.firstDate.localeCompare(a.c.firstDate)), [all, who, from, to, search]);

  const totalKg = rows.reduce((s, r) => s + r.c.rejection, 0);
  const totalAmt = rows.reduce((s, r) => s + r.c.rejectionAmount, 0);
  const filtered = !!(search || who || from || to);
  const fresh = editing && (all.find(j => j.id === editing.id) ?? null);

  return (
    <>
      <PageHeader title="Job work rejection" subtitle="Rejected material per job work, charged to the job worker and taken off their job pay." />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-3">
        <Stat label="Jobs with rejection" value={rows.length} hint={filtered ? 'matching the filters' : undefined} />
        <Stat label="Total rejection" value={`${num(totalKg, 3)} kg`} />
        <Stat label="Deducted from job pay" value={inr(totalAmt)} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Search contractor, item or PBI-" />
          <select className="field h-9 w-[200px]" value={who} onChange={e => setWho(Number(e.target.value))}>
            <option value={0}>All contractors</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <input type="date" className="field h-9 w-[140px]" value={from} onChange={e => setFrom(e.target.value)} title="From" />
            <input type="date" className="field h-9 w-[140px]" value={to} onChange={e => setTo(e.target.value)} title="To" />
            {filtered && <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setWho(0); setFrom(''); setTo(''); }}>Clear</Button>}
          </div>
        </div>
        <DataTable
          rows={rows}
          empty={<div className="py-12 text-center text-ink-3">No rejections{filtered ? ' match the filters' : ' yet'}.</div>}
          columns={[
            { key: 'n', header: 'Job work', render: ({ j, c }) => <><div className="font-medium">{jobNo(j)}</div><div className="text-[12px] text-ink-3">{fmtDate(c.firstDate)}</div></> },
            { key: 'c', header: 'Contractor', render: ({ j }) => <><div className="font-medium">{contractorName(j.contractorId)}</div><div className="text-[12px] text-ink-3">{itemName(j.itemId)}</div></> },
            { key: 'r', header: 'On returns', render: ({ j }) => <span className="text-ink-2">{j.returns.filter(r => r.rejection > 0).map(r => num(r.rejection, 3)).join(' + ') || '—'}</span> },
            { key: 'k', header: 'Rejection', align: 'right', render: ({ c }) => <span className="font-medium">{num(c.rejection, 3)} kg {c.rejectionManual && <Badge tone="amber">edited</Badge>}</span> },
            { key: 't', header: 'Rate', align: 'right', render: ({ c }) => <>{money(c.rejectionRate)} {c.rateManual && <Badge tone="amber">edited</Badge>}</> },
            { key: 'a', header: 'Amount', align: 'right', render: ({ c }) => <span className="font-semibold text-red-600 dark:text-red-400">{money(c.rejectionAmount)}</span> },
            { key: 'p', header: 'Net job pay', align: 'right', render: ({ c }) => money(c.netJobPay) },
            { key: 'x', header: '', align: 'right', render: ({ j }) => <Button size="sm" variant="ghost" title="Edit rejection" icon={<Pencil size={14} />} onClick={() => setEditing(j)} /> },
          ]}
        />
      </Card>
      <RejectionForm job={fresh} onClose={() => setEditing(null)} />
    </>
  );
};

export default JobRejection;
