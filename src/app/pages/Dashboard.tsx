import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, BadgeCheck, Boxes, Factory, Handshake, IndianRupee, Package, ScanFace, ShoppingCart, Store, Truck, Users, Wallet,
} from 'lucide-react';
import {
  Area, Bar, CartesianGrid, Cell, ComposedChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { dashboardApi } from '../../api/dashboard';
import { partyApi } from '../../api/party';
import { cashflowSummaryApi } from '../../api/cashflow';
import { attendance, employees, iso } from '../data/hr';
import { leads, STAGES } from '../data/crm';
import { requests, clients } from '../data/ishita';
import { chitthiNo } from '../pdf/chitthi';
import { CountUp, LiveDot, Meter, Ring, Rise, Spark } from '../motion';
import { useSettings } from '../settings';
import { Badge, Card, ErrorNote, Tabs, cx, fmtDate, inr, num, useAsync } from '../ui';
import { normalizeDates } from './sales/shared';

const PALETTE = ['var(--accent)', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899', '#64748b'];
const short = (n: number) => (Math.abs(n) >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : Math.abs(n) >= 1e3 ? `₹${(n / 1e3).toFixed(0)}k` : `₹${Math.round(n)}`);
const tip = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 };
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

/* --------------------------------- pieces --------------------------------- */

const Kpi: React.FC<{
  label: string; value: number; format: (n: number) => string; hint?: React.ReactNode; icon: React.ReactNode; spark?: number[]; color?: string; to?: string; delay: number;
}> = ({ label, value, format, hint, icon, spark, color = 'var(--accent)', to, delay }) => {
  const body = (
    <Card className="lift relative h-full overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>{icon}</span>
      </div>
      <div className="mt-1 text-[24px] font-semibold tracking-tight tabular-nums"><CountUp value={value} format={format} /></div>
      {hint && <div className="text-[12px] text-ink-3">{hint}</div>}
      {spark && spark.length > 1 && <div className="-mx-1 mt-1"><Spark data={spark} color={color} id={label.replace(/\W/g, '')} /></div>}
    </Card>
  );
  return <Rise delay={delay} className="h-full">{to ? <Link to={to} className="block h-full">{body}</Link> : body}</Rise>;
};

const Panel: React.FC<{ title: React.ReactNode; to?: string; delay: number; className?: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title, to, delay, className, action, children,
}) => (
  <Rise delay={delay} className={className}>
    <Card className="h-full" title={title}
      action={action ?? (to && <Link to={to} className="flex items-center gap-1 text-[13px] text-accent hover:underline">Open <ArrowUpRight size={14} /></Link>)}>
      {children}
    </Card>
  </Rise>
);

const Skeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="skeleton h-24 rounded-2xl" />
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>
    <div className="grid gap-4 xl:grid-cols-3"><div className="skeleton h-80 rounded-xl xl:col-span-2" /><div className="skeleton h-80 rounded-xl" /></div>
    <div className="grid gap-4 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}</div>
  </div>
);

const Clock: React.FC = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return <span className="tabular-nums">{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>;
};

/* ---------------------------------- page ---------------------------------- */

const Dashboard: React.FC = () => {
  const { settings } = useSettings();
  const q = useAsync(async () => {
    // getFullDashboard swallows per-endpoint errors, so probe one endpoint first
    // to surface an expired session instead of a dashboard full of zeros.
    await partyApi.getAllParties();
    const raw = await dashboardApi.fetchAllData();
    const [full, cash] = await Promise.all([dashboardApi.getFullDashboard(raw), cashflowSummaryApi.get().catch(() => null)]);
    return { raw: normalizeDates(raw), full: normalizeDates(full), cash };
  }, []);
  const [range, setRange] = useState('12m');

  // Sample modules
  const emps = employees.use();
  const att = attendance.use();
  const crm = leads.use();
  const reqs = requests.use();
  const cl = clients.use();

  const today = iso(new Date());

  const live = useMemo(() => {
    if (!q.data) return null;
    const orders = q.data.raw.allOrders;
    const byDay = new Map<string, { sales: number; orders: number }>();
    const byMonth = new Map<string, { sales: number; orders: number }>();
    for (const o of orders) {
      const d = String(o.orderDate).slice(0, 10);
      const m = d.slice(0, 7);
      const a = byDay.get(d) || { sales: 0, orders: 0 }; a.sales += o.grandTotal || 0; a.orders += 1; byDay.set(d, a);
      const b = byMonth.get(m) || { sales: 0, orders: 0 }; b.sales += o.grandTotal || 0; b.orders += 1; byMonth.set(m, b);
    }
    const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); const k = iso(d); return { key: k, label: String(d.getDate()), ...(byDay.get(k) || { sales: 0, orders: 0 }) }; });
    const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 11 + i); const k = iso(d).slice(0, 7); return { key: k, label: d.toLocaleDateString('en-IN', { month: 'short' }), ...(byMonth.get(k) || { sales: 0, orders: 0 }) }; });
    const thisMonth = months[11].sales;
    const lastMonth = months[10].sales;
    const received = q.data.raw.allPayments.reduce((s, p) => s + (p.receivedAmount || 0), 0);
    return { days, months, thisMonth, lastMonth, received };
  }, [q.data]);

  const people = useMemo(() => {
    const active = emps.filter(e => e.active);
    const latest = att.reduce((m, a) => (a.date > m ? a.date : m), '');
    const day = att.filter(a => a.date === latest);
    const present = day.filter(a => a.inTime).length;
    const late = day.filter(a => a.status === 'LATE').length;
    const depts = [...new Set(active.map(e => e.department))].map(d => {
      const ids = new Set(active.filter(e => e.department === d).map(e => e.id));
      const inn = day.filter(a => ids.has(a.employeeId) && a.inTime).length;
      return { d, total: ids.size, in: inn };
    }).sort((a, b) => b.total - a.total);
    const week = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 14 + i); const k = iso(d); return att.filter(a => a.date === k && a.inTime).length; });
    return { active: active.length, present, late, latest, isToday: latest === today, depts, week, payroll: active.reduce((s, e) => s + e.monthlySalary, 0) };
  }, [emps, att, today]);

  const pipeline = useMemo(() => {
    const open = crm.filter(l => l.stage !== 'Won' && l.stage !== 'Lost');
    const stages = STAGES.filter(s => s !== 'Lost').map(s => ({ s, n: crm.filter(l => l.stage === s).length, v: crm.filter(l => l.stage === s).reduce((t, l) => t + l.value, 0) }));
    return { open: open.reduce((s, l) => s + l.value, 0), count: open.length, stages, due: open.filter(l => l.nextFollowUp && l.nextFollowUp <= today).length };
  }, [crm, today]);

  // Subcontracting (job work) still out with each job worker, from the live jobs.
  const jobwork = useMemo(() => {
    const open = (q.data?.raw.allSubcontracts || []).filter(j => j.status === 'IN_PROCESS');
    const byWorker = new Map<string, number>();
    open.forEach(j => byWorker.set(j.contractor?.name || '—', (byWorker.get(j.contractor?.name || '—') || 0) + Math.max(0, j.sentStock - (j.totalReturnStock || 0))));
    const vendors = [...byWorker.entries()].map(([name, kg]) => ({ name, kg })).sort((a, b) => b.kg - a.kg).slice(0, 5);
    return { out: vendors.reduce((s, v) => s + v.kg, 0), vendors };
  }, [q.data]);

  const feed = useMemo(() => {
    type F = { at: string; icon: React.ReactNode; text: React.ReactNode; tone: string };
    const items: F[] = [];
    if (q.data) {
      q.data.full.recentOrders.forEach(o => items.push({ at: String(o.orderDate).slice(0, 10), icon: <ShoppingCart size={14} />, tone: 'var(--accent)', text: <>New order from <b>{o.party?.name || o.customerName || 'customer'}</b> · {inr(o.grandTotal)}</> }));
      q.data.raw.allPayments.filter(p => p.lastReceivedDate).forEach(p => items.push({ at: String(p.lastReceivedDate).slice(0, 10), icon: <IndianRupee size={14} />, tone: '#10b981', text: <>Payment received · {inr(p.receivedAmount)}</> }));
    }
    att.filter(a => a.date === today && a.inTime).forEach(a => items.push({ at: today, icon: <ScanFace size={14} />, tone: '#0ea5e9', text: <><b>{emps.find(e => e.id === a.employeeId)?.name}</b> punched in at {a.inTime}</> }));
    reqs.forEach(r => items.push({ at: r.date, icon: <Store size={14} />, tone: '#f59e0b', text: <><b>{cl.find(c => c.id === r.clientId)?.company}</b> sent an order request</> }));
    crm.filter(l => l.stage === 'Won').forEach(l => items.push({ at: l.lastContact, icon: <BadgeCheck size={14} />, tone: '#10b981', text: <>Deal won · <b>{l.company}</b> {inr(l.value)}</> }));
    (q.data?.raw.allSubcontracts || []).slice(0, 8).forEach(j => items.push({ at: String(j.orderDate).slice(0, 10), icon: <Factory size={14} />, tone: '#8b5cf6', text: <>Chitthi {chitthiNo(j.subcontractingId)} sent to <b>{j.contractor?.name}</b></> }));
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 18);
  }, [q.data, att, emps, reqs, cl, crm, today]);

  if (q.loading) return <Skeleton />;
  if (q.error || !q.data || !live) return <ErrorNote error={q.error} onRetry={q.reload} />;
  const d = q.data.full;
  const k = d.keyMetrics;
  const series = range === '12m' ? live.months : live.days;
  const growth = live.lastMonth ? ((live.thisMonth - live.lastMonth) / live.lastMonth) * 100 : null;
  const dueTotal = d.paymentStatusBreakdown.reduce((s, p) => s + p.amount, 0);
  const dueSlices: { status: string; amount: number; color: string }[] = dueTotal > 0
    ? d.paymentStatusBreakdown.map(p => ({ status: p.status, amount: p.amount, color: p.color }))
    : [{ status: 'Nothing due', amount: 1, color: 'var(--muted)' }];
  const sub = d.subcontractingMetrics;
  const subTotal = sub.inProcess + sub.completed + sub.rejected;
  const waiting = reqs.filter(r => r.status === 'PENDING_APPROVAL');
  const lowStock = [...d.lowStockItems.map(i => ({ name: i.product?.productName, qty: i.quantityInKg, alert: i.lowStockAlert })),
    ...d.lowStockRawItems.map(i => ({ name: i.product?.productName, qty: i.quantityInKg, alert: i.lowStockAlert }))];
  const maxProduct = Math.max(1, ...d.topProducts.map(p => p.revenue));
  const maxCustomer = Math.max(1, ...d.topCustomers.map(c => c.totalAmount));

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Rise>
        <div className="relative overflow-hidden rounded-2xl bg-accent p-6 text-accent-fg">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-white/5" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[13px] opacity-80"><LiveDot color="#a7f3d0" /> Live · <Clock /> · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{greet()}, here's {settings.companyName} today</h1>
              <p className="mt-1 opacity-80">
                {live.thisMonth > 0 ? <>This month's sales are <b>{inr(live.thisMonth)}</b>{growth !== null && <> — {growth >= 0 ? 'up' : 'down'} {Math.abs(growth).toFixed(0)}% on last month</>}.</> : 'No sales booked yet this month.'}
                {' '}{waiting.length > 0 && <>{waiting.length} client request{waiting.length > 1 ? 's' : ''} waiting.</>}
              </p>
            </div>
            <div className="flex gap-6">
              {[['Orders', k.totalOrders, (n: number) => num(n)], ['Outstanding', k.totalOutstanding, short], ['Collected', live.received, short]].map(([l, v, f], i) => (
                <div key={i}>
                  <div className="text-[12px] opacity-75">{l as string}</div>
                  <div className="text-[22px] font-semibold tabular-nums"><CountUp value={v as number} format={f as (n: number) => string} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Rise>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi delay={60} label="Total sales" value={k.totalSales} format={short} hint={`${num(k.totalOrders)} orders`} icon={<IndianRupee size={16} />} spark={live.days.map(x => x.sales)} to="/orders" />
        <Kpi delay={110} label="Outstanding" value={k.totalOutstanding} format={short} hint={`${k.overduePayments} overdue`} icon={<AlertTriangle size={16} />} color="#ef4444" to="/payments" />
        <Kpi delay={160} label="Stock value" value={k.totalInventoryValue} format={short} hint={`${k.lowStockCount} items low`} icon={<Boxes size={16} />} color="#0ea5e9" to="/stock" />
        <Kpi delay={210} label="Pending orders" value={k.pendingOrders} format={n => num(n)} hint={`${k.completedOrders} completed`} icon={<Truck size={16} />} color="#f59e0b" spark={live.days.map(x => x.orders)} to="/orders" />
        <Kpi delay={260} label={people.isToday ? 'Present today' : 'Present'} value={people.present} format={n => `${Math.round(n)}/${people.active}`} hint={`${people.late} late`} icon={<Users size={16} />} color="#10b981" spark={people.week} to="/hr/attendance" />
        <Kpi delay={310} label="Open pipeline" value={pipeline.open} format={short} hint={`${pipeline.count} leads · ${pipeline.due} follow-ups`} icon={<Handshake size={16} />} color="#8b5cf6" to="/crm" />
      </div>

      {/* Sales + payments */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel delay={360} className="xl:col-span-2" title={<span className="flex items-center gap-2">Sales & orders {growth !== null && <Badge tone={growth >= 0 ? 'green' : 'red'}>{growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(0)}% MoM</Badge>}</span>}
          action={<Tabs value={range} onChange={setRange} tabs={[{ id: '30d', label: '30 days' }, { id: '12m', label: '12 months' }]} />}>
          <div className="h-[300px] px-2 pb-4">
            <ResponsiveContainer>
              <ComposedChart data={series} margin={{ left: 4, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="dashSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} interval={range === '30d' ? 2 : 0} />
                <YAxis yAxisId="s" tickFormatter={short} stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} width={60} />
                <YAxis yAxisId="o" orientation="right" stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={tip} formatter={(v?: number, n?: string) => (n === 'Sales' ? [inr(v), n] : [num(v), n])} />
                <Bar yAxisId="o" dataKey="orders" name="Orders" fill="#0ea5e9" opacity={0.35} radius={[4, 4, 0, 0]} animationDuration={1100} />
                <Area yAxisId="s" type="monotone" dataKey="sales" name="Sales" stroke="var(--accent)" strokeWidth={2.5} fill="url(#dashSales)" animationDuration={1400} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel delay={420} title="Money owed to you" to="/payments">
          <div className="flex flex-col items-center px-5 pb-5">
            <div className="relative h-[180px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={dueSlices}
                    dataKey="amount" nameKey="status" innerRadius={58} outerRadius={82} paddingAngle={3} animationDuration={1200} stroke="none">
                    {dueSlices.map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tip} formatter={(v?: number) => inr(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div><div className="text-[11px] text-ink-3">Due</div><div className="text-[18px] font-semibold"><CountUp value={dueTotal} format={short} /></div></div>
              </div>
            </div>
            <div className="mt-2 w-full space-y-2">
              {d.paymentStatusBreakdown.map((p, i) => (
                <div key={p.status}>
                  <div className="mb-1 flex justify-between text-[13px]"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.status} <span className="text-ink-3">· {p.count}</span></span><b className="tabular-nums">{inr(p.amount)}</b></div>
                  <Meter pct={dueTotal ? (p.amount / dueTotal) * 100 : 0} color={p.color} delay={500 + i * 120} />
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Breakdown row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel delay={480} title="Unit comparison">
          <div className="space-y-4 px-5 pb-5">
            {d.floorComparison.map((f, i) => {
              const max = Math.max(1, ...d.floorComparison.map(x => x.sales));
              return (
                <div key={f.floor}>
                  <div className="mb-1 flex justify-between text-[13px]"><span className="font-medium">{i === 0 ? 'Unit 1' : 'Unit 2'}</span><b className="tabular-nums">{inr(f.sales)}</b></div>
                  <Meter pct={(f.sales / max) * 100} color={PALETTE[i]} delay={560 + i * 150} />
                  <div className="mt-1 flex gap-3 text-[12px] text-ink-3"><span>{f.orders} orders</span><span>{f.invoices} invoices</span><span>{f.payments} payments</span></div>
                </div>
              );
            })}
            <div className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-center">
              {d.invoiceStatusBreakdown.map(s => (
                <div key={s.status} className="rounded-lg bg-muted p-2"><div className="text-[11px] text-ink-3">{s.status} invoices</div><div className="text-[18px] font-semibold"><CountUp value={s.count} format={n => num(n)} /></div></div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel delay={540} title="Stock by category" to="/stock">
          <div className="px-3 pb-4">
            {d.categoryDistribution.length ? (
              <>
                <div className="h-[170px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={d.categoryDistribution} dataKey="value" nameKey="name" outerRadius={75} innerRadius={30} paddingAngle={2} animationDuration={1300} stroke="none">
                        {d.categoryDistribution.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tip} formatter={(v?: number) => inr(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 px-2">
                  {d.categoryDistribution.slice(0, 5).map((c, i) => (
                    <div key={c.name} className="flex justify-between text-[12.5px]"><span className="flex items-center gap-2 truncate"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PALETTE[i] }} />{c.name}</span><span className="tabular-nums text-ink-2">{short(c.value)}</span></div>
                  ))}
                </div>
              </>
            ) : <div className="py-16 text-center text-ink-3">No stock yet</div>}
          </div>
        </Panel>

        <Panel delay={600} title="Top products">
          <div className="space-y-3 px-5 pb-5">
            {d.topProducts.map((p, i) => (
              <div key={p.name}>
                <div className="mb-1 flex justify-between text-[13px]"><span className="truncate pr-2 font-medium">{p.name}</span><span className="tabular-nums">{short(p.revenue)}</span></div>
                <Meter pct={(p.revenue / maxProduct) * 100} color={PALETTE[i % PALETTE.length]} delay={680 + i * 90} />
              </div>
            ))}
            {!d.topProducts.length && <div className="py-12 text-center text-ink-3">No orders yet</div>}
          </div>
        </Panel>

        <Panel delay={660} title="Top customers" to="/parties">
          <div className="space-y-3 px-5 pb-5">
            {d.topCustomers.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white" style={{ background: PALETTE[i % PALETTE.length] }}>{c.name.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-[13px]"><span className="truncate font-medium">{c.name}</span><span className="tabular-nums">{short(c.totalAmount)}</span></div>
                  <Meter pct={(c.totalAmount / maxCustomer) * 100} color={PALETTE[i % PALETTE.length]} delay={740 + i * 90} className="mt-1" />
                  <div className="mt-0.5 text-[11px] text-ink-3">{c.orders} orders</div>
                </div>
              </div>
            ))}
            {!d.topCustomers.length && <div className="py-12 text-center text-ink-3">No orders yet</div>}
          </div>
        </Panel>
      </div>

      {/* Operations row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel delay={720} title="Attendance" to="/hr/attendance">
          <div className="flex flex-col items-center px-5 pb-5">
            <Ring pct={people.active ? (people.present / people.active) * 100 : 0} size={130} stroke={12} color="#10b981">
              <div><div className="text-[24px] font-semibold"><CountUp value={people.present} format={n => num(n)} /></div><div className="text-[11px] text-ink-3">of {people.active} in</div></div>
            </Ring>
            <div className="mt-4 w-full space-y-2">
              {people.depts.slice(0, 5).map((x, i) => (
                <div key={x.d}>
                  <div className="flex justify-between text-[12px]"><span>{x.d}</span><span className="text-ink-3">{x.in}/{x.total}</span></div>
                  <Meter pct={x.total ? (x.in / x.total) * 100 : 0} color="#10b981" delay={800 + i * 80} />
                </div>
              ))}
            </div>
            <div className="mt-3 text-[12px] text-ink-3">Monthly payroll {inr(people.payroll)}</div>
          </div>
        </Panel>

        <Panel delay={780} title="Production" to="/subcontracting">
          <div className="px-5 pb-5">
            <div className="flex items-center justify-around">
              {[['In process', sub.inProcess, '#f59e0b'], ['Done', sub.completed, '#10b981'], ['Rejected', sub.rejected, '#ef4444']].map(([l, v, c]) => (
                <div key={l as string} className="flex flex-col items-center">
                  <Ring pct={subTotal ? ((v as number) / subTotal) * 100 : 0} size={72} stroke={8} color={c as string}>
                    <span className="text-[16px] font-semibold"><CountUp value={v as number} format={n => num(n)} /></span>
                  </Ring>
                  <span className="mt-1 text-[12px] text-ink-3">{l as string}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-muted p-3">
              <div className="flex justify-between text-[13px]"><span className="text-ink-2">Still with job workers</span><b><CountUp value={jobwork.out} format={n => `${num(n, 0)} kg`} /></b></div>
              <div className="mt-2 space-y-2">
                {jobwork.vendors.map((v, i) => (
                  <div key={v.name}>
                    <div className="flex justify-between text-[12px]"><span className="truncate">{v.name}</span><span className="text-ink-3">{num(v.kg, 0)} kg</span></div>
                    <Meter pct={jobwork.vendors[0].kg ? (v.kg / jobwork.vendors[0].kg) * 100 : 0} color="#8b5cf6" delay={860 + i * 80} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel delay={840} title="Sales pipeline" to="/crm">
          <div className="space-y-2 px-5 pb-5">
            {pipeline.stages.map((s, i) => {
              const max = Math.max(1, ...pipeline.stages.map(x => x.v));
              return (
                <div key={s.s} className="flex items-center gap-3">
                  <div className="w-[96px] shrink-0 text-[12px] text-ink-2">{s.s}</div>
                  <div className="flex-1">
                    <div className="grow-x flex h-7 items-center justify-end rounded-md px-2 text-[11px] font-semibold text-white"
                      style={{ width: `${Math.max(14, (s.v / max) * 100)}%`, background: PALETTE[i % PALETTE.length], animationDelay: `${900 + i * 100}ms` }}>{s.n}</div>
                  </div>
                  <div className="w-[52px] text-right text-[12px] tabular-nums">{short(s.v)}</div>
                </div>
              );
            })}
            <div className="flex justify-between border-t border-line pt-3 text-[13px]"><span className="text-ink-2">Follow-ups due</span><Badge tone={pipeline.due ? 'red' : 'green'}>{pipeline.due}</Badge></div>
          </div>
        </Panel>

        <Panel delay={900} title={<span className="flex items-center gap-2">Activity <LiveDot /></span>}>
          <div className="ticker h-[330px] overflow-hidden px-5 pb-3" style={{ maskImage: 'linear-gradient(transparent, black 8%, black 92%, transparent)' }}>
            <div className={cx(feed.length > 7 && 'ticker-track')}>
              {(feed.length > 7 ? [...feed, ...feed] : feed).map((f, i) => (
                <div key={i} className="flex gap-3 py-2">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${f.tone} 15%, transparent)`, color: f.tone }}>{f.icon}</span>
                  <div className="min-w-0 text-[13px]"><div className="leading-snug">{f.text}</div><div className="text-[11px] text-ink-3">{f.at === today ? 'Today' : fmtDate(f.at)}</div></div>
                </div>
              ))}
              {!feed.length && <div className="py-10 text-center text-ink-3">Nothing yet</div>}
            </div>
          </div>
        </Panel>
      </div>

      {/* Lists row */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel delay={960} title="Recent orders" to="/orders">
          <div className="px-5 pb-3">
            {d.recentOrders.slice(0, 6).map((o, i) => (
              <Rise key={o.id} delay={1000 + i * 60}>
                <div className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
                  <div className="min-w-0"><div className="truncate font-medium">{o.party?.name || o.customerName || 'Walk-in'}</div><div className="text-[12px] text-ink-3">{fmtDate(String(o.orderDate))} · {o.products?.length || 0} items</div></div>
                  <div className="flex items-center gap-2"><span className="tabular-nums">{inr(o.grandTotal)}</span>
                    <Badge tone={o.orderStatus === 'DISPATCHED' ? 'green' : o.orderStatus === 'COMPLETED' ? 'blue' : 'amber'}>{o.orderStatus === 'DISPATCHED' ? 'Dispatched' : o.orderStatus === 'COMPLETED' ? 'Ready' : 'Pending'}</Badge></div>
                </div>
              </Rise>
            ))}
            {!d.recentOrders.length && <div className="py-10 text-center text-ink-3"><ShoppingCart size={18} className="mx-auto mb-1" />No orders yet</div>}
          </div>
        </Panel>

        <Panel delay={1020} title="Low stock" to="/stock">
          <div className="space-y-3 px-5 pb-5">
            {lowStock.slice(0, 6).map((i, idx) => (
              <div key={idx}>
                <div className="mb-1 flex justify-between text-[13px]"><span className="truncate pr-2 font-medium">{i.name || 'Item'}</span><span className="text-ink-3">{num(i.qty, 1)} / {num(i.alert)} kg</span></div>
                <Meter pct={i.alert ? (i.qty / i.alert) * 100 : 0} color="#ef4444" delay={1060 + idx * 70} />
              </div>
            ))}
            {!lowStock.length && (
              <div className="flex flex-col items-center py-8 text-center text-ink-3"><Package size={20} className="mb-1 text-emerald-500" />Every item is above its minimum.</div>
            )}
          </div>
        </Panel>

        <Panel delay={1080} title="Today at a glance">
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            {[
              { l: 'Cash in today', v: q.data.cash?.totalIncome ?? 0, f: short, icon: <Wallet size={15} />, c: '#10b981', to: '/cashflow' },
              { l: 'Cash out today', v: q.data.cash?.totalExpense ?? 0, f: short, icon: <Wallet size={15} />, c: '#ef4444', to: '/cashflow' },
              { l: 'Client requests', v: waiting.length, f: (n: number) => num(n), icon: <Store size={15} />, c: '#f59e0b', to: '/client-portal' },
              { l: 'Jobs at job workers', v: sub.inProcess, f: (n: number) => num(n), icon: <Factory size={15} />, c: '#8b5cf6', to: '/subcontracting' },
              { l: 'Overdue invoices', v: k.overduePayments, f: (n: number) => num(n), icon: <AlertTriangle size={15} />, c: '#ef4444', to: '/payments' },
              { l: 'Pending invoices', v: k.pendingInvoices, f: (n: number) => num(n), icon: <ShoppingCart size={15} />, c: 'var(--accent)', to: '/invoices' },
            ].map(t => (
              <Link key={t.l} to={t.to} className="lift rounded-xl border border-line p-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${t.c} 15%, transparent)`, color: t.c }}>{t.icon}</span>
                <div className="mt-2 text-[18px] font-semibold tabular-nums"><CountUp value={t.v} format={t.f} /></div>
                <div className="text-[12px] text-ink-3">{t.l}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
