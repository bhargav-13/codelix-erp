import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { subcontractingApi } from '../../../api/subcontracting';
import { Button, Card, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, fmtDate, inr, num, toast, useAsync } from '../../ui';
import { downloadBlob, today } from '../sales/shared';

const yearAgo = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); };

/** Contractor statements: everything sent, returned and paid for one contractor over a period. */
const Subcontractors: React.FC = () => {
  const list = useAsync(() => subcontractingApi.getSubcontractingListBySubcontract(), []);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<string | null>(null);
  const [from, setFrom] = useState(yearAgo());
  const [to, setTo] = useState(today());
  const stmt = useAsync(() => (viewing ? subcontractingApi.getSubcontractByCustomerName(viewing, from, to) : Promise.resolve(null)), [viewing, from, to]);

  const rows = useMemo(() => (list.data || [])
    .filter(c => `${c.contractorName} ${c.itemName}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.lastUpdatedAt || '').localeCompare(a.lastUpdatedAt || '')), [list.data, search]);

  const pdf = async () => {
    if (!viewing) return;
    try {
      downloadBlob(await subcontractingApi.getSubcontractByCustomerNamePdf(viewing, from, to), `${viewing}-statement.pdf`);
    } catch {
      toast.err('Could not download the statement');
    }
  };

  const s = stmt.data;
  return (
    <>
      <PageHeader title="Subcontractors" subtitle="Statement for each job-work contractor." />
      <Card className="max-w-4xl">
        <div className="border-b border-line p-4"><SearchBox value={search} onChange={setSearch} placeholder="Search contractor" /></div>
        {list.loading ? <Spinner /> : list.error ? <ErrorNote error={list.error} onRetry={list.reload} /> : (
          <DataTable
            rows={rows}
            onRowClick={c => setViewing(c.contractorName)}
            columns={[
              { key: 'n', header: 'Contractor', render: c => <span className="font-medium">{c.contractorName}</span> },
              { key: 'i', header: 'Latest item', render: c => c.itemName },
              { key: 'd', header: 'Last activity', render: c => <span className="text-ink-3">{fmtDate(c.lastUpdatedAt)}</span> },
            ]}
          />
        )}
      </Card>

      <Drawer open={!!viewing} wide title={viewing || ''} onClose={() => setViewing(null)}
        footer={<Button variant="outline" icon={<Download size={15} />} onClick={pdf}>Statement PDF</Button>}>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Field label="From"><input type="date" className="field" value={from} onChange={e => setFrom(e.target.value)} /></Field>
          <Field label="To"><input type="date" className="field" value={to} onChange={e => setTo(e.target.value)} /></Field>
        </div>
        {stmt.loading ? <Spinner /> : stmt.error ? <ErrorNote error={stmt.error} onRetry={stmt.reload} /> : s && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['Sent', `${num(s.totalSentStock, 2)} kg`], ['Returned', `${num(s.totalReturnStock, 2)} kg`], ['Used', `${num(s.totalUsed, 2)} kg`], ['Paid', inr(s.totalPaidRs)]]
                .map(([l, v]) => <div key={l} className="rounded-lg bg-muted p-3"><div className="text-[12px] text-ink-3">{l}</div><div className="mt-1 font-semibold">{v}</div></div>)}
            </div>
            <DataTable
              rows={s.subcontractList || []}
              pageSize={10}
              empty={<div className="py-8 text-center text-ink-3">No jobs in this period</div>}
              columns={[
                { key: 'd', header: 'Sent', render: r => <><div>{fmtDate(r.orderDate)}</div><div className="text-[12px] text-ink-3">{r.itemName}</div></> },
                { key: 's', header: 'Qty sent', align: 'right', render: r => num(r.sentStock, 2) },
                { key: 'r', header: 'Returned', align: 'right', render: r => <>{num(r.returnStock, 2)}{r.returnDate && <div className="text-[12px] text-ink-3">{fmtDate(r.returnDate)}</div>}</> },
                { key: 'n', header: 'Net', align: 'right', render: r => num(r.netWeight, 2) },
                { key: 'j', header: 'Job pay', align: 'right', render: r => inr(r.totalJobPay) },
                { key: 't', header: 'Total', align: 'right', render: r => <span className="font-semibold">{inr(r.totalAmount)}</span> },
              ]}
            />
          </>
        )}
      </Drawer>
    </>
  );
};

export default Subcontractors;
