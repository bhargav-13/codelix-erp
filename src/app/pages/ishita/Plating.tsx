import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { subcontractingApi } from '../../../api/subcontracting';
import { gres, gresCalc, items } from '../../data/ishita';
import { Badge, Card, DataTable, Drawer, ErrorNote, PageHeader, Spinner, Stat, Tabs, fmtDate, inr, num, useAsync } from '../../ui';
import { fetchAllPages } from '../sales/shared';
import { chitthiNo } from '../../pdf/chitthi';

interface Lot { id: string; party: string; no: string; date: string; what: string; netKg: number; backKg: number; amount: number; done: boolean }
interface Vendor { name: string; lots: Lot[]; netKg: number; backKg: number; pendingKg: number; amount: number; open: number; avgDays: number | null }

/**
 * Vendor-wise analytics, as on Ishita's plating screens: live subcontracting
 * (job work) jobs from the 4bitx backend, plus the gres sample module.
 */
const Plating: React.FC = () => {
  const jobs = useAsync(() => fetchAllPages(page => subcontractingApi.getSubcontractingList({ page, size: 100 })), []);
  const fill = gres.use();
  const catalog = items.use();
  const [scope, setScope] = useState('JOB');
  const [viewing, setViewing] = useState<Vendor | null>(null);

  const name = (id: number) => catalog.find(i => i.id === id)?.name ?? '—';

  const lots: Lot[] = useMemo(() => scope === 'GRES'
    ? fill.map(g => { const c = gresCalc(g); return { id: `g${g.id}`, party: g.vendor, no: g.chitthiNo, date: g.date, what: g.lines.map(l => name(l.itemId)).join(', '), netKg: c.netKg, backKg: c.returnedKg, amount: c.amount, done: c.complete }; })
    : (jobs.data || []).map(j => ({
      id: `s${j.subcontractingId}`, party: j.contractor?.name || '—', no: chitthiNo(j.subcontractingId), date: j.orderDate, what: j.item?.name || '—',
      netKg: j.sentStock, backKg: j.totalReturnStock || 0, amount: j.totalAmount || 0, done: j.status !== 'IN_PROCESS',
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [scope, jobs.data, fill, catalog]);

  const vendors: Vendor[] = useMemo(() => {
    const m = new Map<string, Lot[]>();
    lots.forEach(l => m.set(l.party, [...(m.get(l.party) || []), l]));
    const today = Date.now();
    return [...m.entries()].map(([n, ls]) => {
      const open = ls.filter(l => !l.done);
      return {
        name: n, lots: ls.sort((a, b) => b.date.localeCompare(a.date)),
        netKg: ls.reduce((s, l) => s + l.netKg, 0), backKg: ls.reduce((s, l) => s + l.backKg, 0),
        pendingKg: ls.reduce((s, l) => s + Math.max(0, l.netKg - l.backKg), 0), amount: ls.reduce((s, l) => s + l.amount, 0),
        open: open.length,
        avgDays: open.length ? Math.round(open.reduce((s, l) => s + (today - new Date(l.date).getTime()) / 86400000, 0) / open.length) : null,
      };
    }).sort((a, b) => b.netKg - a.netKg);
  }, [lots]);

  const tot = vendors.reduce((t, v) => ({ net: t.net + v.netKg, back: t.back + v.backKg, pend: t.pend + v.pendingKg, amt: t.amt + v.amount }), { net: 0, back: 0, pend: 0, amt: 0 });

  return (
    <>
      <PageHeader title="Plating analytics" subtitle="How much each vendor or party has, what came back, and what's still out."
        actions={<Tabs value={scope} onChange={setScope} tabs={[{ id: 'JOB', label: 'Subcontracting (Job work)' }, { id: 'GRES', label: 'Gres' }]} />} />
      {scope === 'JOB' && jobs.loading ? <Spinner /> : scope === 'JOB' && jobs.error ? <ErrorNote error={jobs.error} onRetry={jobs.reload} /> : <>
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Sent" value={`${num(tot.net, 1)} kg`} hint={`${lots.length} chitthis`} />
        <Stat label="Back" value={`${num(tot.back, 1)} kg`} hint={tot.net ? `${Math.round((tot.back / tot.net) * 100)}% returned` : undefined} />
        <Stat label="Still out" value={`${num(tot.pend, 1)} kg`} />
        <Stat label="Value" value={inr(tot.amt)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <DataTable
            rows={vendors}
            onRowClick={setViewing}
            columns={[
              { key: 'n', header: scope === 'JOB' ? 'Job worker' : 'Vendor', render: v => <span className="font-medium">{v.name}</span> },
              { key: 'c', header: 'Chitthis', align: 'right', render: v => <>{v.lots.length}{v.open > 0 && <span className="ml-1 text-[12px] text-ink-3">({v.open} open)</span>}</> },
              { key: 's', header: 'Sent kg', align: 'right', render: v => num(v.netKg, 1) },
              { key: 'p', header: 'Still out', align: 'right', render: v => <span className={v.pendingKg > 0 ? 'font-semibold' : 'text-ink-3'}>{num(v.pendingKg, 1)}</span> },
              { key: 'd', header: 'Avg days out', align: 'right', render: v => (v.avgDays === null ? '—' : <Badge tone={v.avgDays > 20 ? 'red' : v.avgDays > 10 ? 'amber' : 'green'}>{v.avgDays}d</Badge>) },
              { key: 'a', header: 'Value', align: 'right', render: v => inr(v.amount) },
            ]}
          />
        </Card>
        <Card title="Sent vs back (kg)">
          <div className="h-[320px] px-2 pb-4">
            <ResponsiveContainer>
              <BarChart data={vendors.slice(0, 8).map(v => ({ name: v.name.split(' ')[0], Sent: Math.round(v.netKg), Back: Math.round(v.backKg) }))} margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 }} />
                <Bar dataKey="Sent" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Back" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      </>}

      <Drawer open={!!viewing} wide title={viewing?.name || ''} onClose={() => setViewing(null)}>
        {viewing && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['Sent', `${num(viewing.netKg, 2)} kg`], ['Back', `${num(viewing.backKg, 2)} kg`], ['Still out', `${num(viewing.pendingKg, 2)} kg`], ['Value', inr(viewing.amount)]]
                .map(([l, v]) => <div key={l} className="rounded-lg bg-muted p-3"><div className="text-[12px] text-ink-3">{l}</div><div className="mt-1 font-semibold">{v}</div></div>)}
            </div>
            <DataTable
              rows={viewing.lots}
              pageSize={10}
              columns={[
                { key: 'n', header: 'Chitthi', render: l => <><div className="font-medium">{l.no}</div><div className="text-[12px] text-ink-3">{fmtDate(l.date)}</div></> },
                { key: 'w', header: 'Goods', render: l => <span className="text-ink-2">{l.what}</span> },
                { key: 's', header: 'Sent', align: 'right', render: l => num(l.netKg, 2) },
                { key: 'b', header: 'Back', align: 'right', render: l => num(l.backKg, 2) },
                { key: 'd', header: '', render: l => <Badge tone={l.done ? 'green' : 'amber'}>{l.done ? 'Done' : 'Open'}</Badge> },
              ]}
            />
          </>
        )}
      </Drawer>
    </>
  );
};

export default Plating;
