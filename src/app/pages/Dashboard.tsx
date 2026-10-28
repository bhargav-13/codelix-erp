import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Boxes, IndianRupee, ShoppingCart, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dashboardApi } from '../../api/dashboard';
import { partyApi } from '../../api/party';
import { attendance, employees, iso } from '../data/hr';
import { Badge, Card, ErrorNote, PageHeader, Spinner, Stat, fmtDate, inr, num, useAsync } from '../ui';

const Dashboard: React.FC = () => {
  // getFullDashboard swallows per-endpoint errors, so probe one endpoint first
  // to surface an expired session instead of a dashboard full of zeros.
  const q = useAsync(() => partyApi.getAllParties().then(() => dashboardApi.getFullDashboard()), []);
  const emps = employees.use();
  const att = attendance.use();

  const people = useMemo(() => {
    const active = emps.filter(e => e.active).length;
    // Latest day with punches — the seed covers up to yesterday, the kiosk adds today.
    const latest = att.reduce((m, a) => (a.date > m ? a.date : m), '');
    const day = att.filter(a => a.date === latest);
    const inToday = day.filter(a => a.inTime).length;
    return { active, inToday, latest, isToday: latest === iso(new Date()) };
  }, [emps, att]);

  if (q.loading) return <Spinner label="Loading dashboard…" />;
  if (q.error || !q.data) return <ErrorNote error={q.error} onRetry={q.reload} />;
  const d = q.data;
  const k = d.keyMetrics;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total sales" value={inr(k.totalSales)} hint={`${num(k.totalOrders)} orders`} icon={<IndianRupee size={16} />} />
        <Stat label="Outstanding" value={inr(k.totalOutstanding)} hint={`${k.overduePayments} overdue`} icon={<AlertTriangle size={16} />} />
        <Stat label="Stock value" value={inr(k.totalInventoryValue)} hint={`${k.lowStockCount} items low`} icon={<Boxes size={16} />} />
        <Stat
          label={people.isToday ? 'Present today' : 'Present (last day)'}
          value={`${people.inToday} / ${people.active}`}
          hint={people.latest ? fmtDate(people.latest) : undefined}
          icon={<Users size={16} />}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Sales · last 30 days" className="xl:col-span-2">
          <div className="h-[280px] px-2 pb-4">
            {d.salesTrend.length ? (
              <ResponsiveContainer>
                <AreaChart data={d.salesTrend} margin={{ left: 8, right: 16, top: 8 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={v => new Date(v).getDate().toString()} stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={v => `₹${Math.round(v / 1000)}k`} stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} width={56} />
                  <Tooltip
                    formatter={(v?: number) => [inr(v), 'Sales']}
                    labelFormatter={l => fmtDate(String(l))}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="var(--accent)" strokeWidth={2} fill="url(#salesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-ink-3">No orders in the last 30 days</div>
            )}
          </div>
        </Card>

        <Card title="Payments due">
          <div className="space-y-3 px-5 pb-5">
            {d.paymentStatusBreakdown.map(p => (
              <div key={p.status} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} /> {p.status}</span>
                <span className="text-right">
                  <span className="font-semibold">{inr(p.amount)}</span>
                  <span className="ml-2 text-[12px] text-ink-3">{p.count}</span>
                </span>
              </div>
            ))}
            <div className="border-t border-line pt-3">
              <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-ink-3">Top customers</div>
              {d.topCustomers.map(c => (
                <div key={c.name} className="flex justify-between py-1">
                  <span className="truncate pr-2">{c.name}</span>
                  <span className="tabular-nums text-ink-2">{inr(c.totalAmount)}</span>
                </div>
              ))}
              {!d.topCustomers.length && <div className="text-ink-3">No orders yet</div>}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Recent orders" action={<Link to="/orders/ground-floor" className="flex items-center gap-1 text-[13px] text-accent">All <ArrowUpRight size={14} /></Link>}>
          <div className="px-5 pb-3">
            {d.recentOrders.slice(0, 6).map(o => (
              <div key={o.id} className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
                <div className="min-w-0">
                  <div className="truncate font-medium">{o.party?.name || o.customerName || 'Walk-in'}</div>
                  <div className="text-[12px] text-ink-3">{fmtDate(o.orderDate)} · {o.products?.length || 0} items</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{inr(o.grandTotal)}</span>
                  <Badge tone={o.orderStatus === 'COMPLETED' ? 'green' : 'amber'}>{o.orderStatus === 'COMPLETED' ? 'Completed' : 'Pending'}</Badge>
                </div>
              </div>
            ))}
            {!d.recentOrders.length && <div className="py-6 text-center text-ink-3"><ShoppingCart size={18} className="mx-auto mb-1" />No orders yet</div>}
          </div>
        </Card>

        <Card title="Low stock" action={<Link to="/inventory/ground-floor" className="flex items-center gap-1 text-[13px] text-accent">Stock <ArrowUpRight size={14} /></Link>}>
          <div className="px-5 pb-3">
            {[...d.lowStockItems.map(i => ({ name: i.product?.productName, qty: i.quantityInKg, alert: i.lowStockAlert })),
              ...d.lowStockRawItems.map(i => ({ name: i.product?.productName, qty: i.quantityInKg, alert: i.lowStockAlert }))]
              .slice(0, 6)
              .map((i, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
                  <span className="truncate pr-2 font-medium">{i.name || 'Item'}</span>
                  <span className="text-[13px] text-ink-2">{num(i.qty, 1)} kg <span className="text-ink-3">/ min {num(i.alert)}</span></span>
                </div>
              ))}
            {!d.lowStockItems.length && !d.lowStockRawItems.length && <div className="py-6 text-center text-ink-3">All items are above their minimum.</div>}
          </div>
        </Card>
      </div>
    </>
  );
};

export default Dashboard;
