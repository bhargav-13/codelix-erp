import React, { useMemo, useState } from 'react';
import { Check, Minus, Plus, Send, ShoppingCart, Truck, X } from 'lucide-react';
import {
  FINISHES, clients, items, requests, sizeLabel, type Client, type OrderRequest, type RequestLine, type RequestStatus,
} from '../../data/ishita';
import { iso } from '../../data/hr';
import { useSettings } from '../../settings';
import { Badge, Button, Card, DataTable, Drawer, Field, PageHeader, Stat, Tabs, fmtDate, num, toast, type Tone } from '../../ui';

const STATUS: Record<RequestStatus, { label: string; tone: Tone }> = {
  PENDING_APPROVAL: { label: 'Waiting for approval', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'blue' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  DISPATCHED: { label: 'Dispatched', tone: 'green' },
};

/* ------------------------------ Admin: requests ------------------------------ */

const Requests: React.FC = () => {
  const list = requests.use();
  const cl = clients.use();
  const catalog = items.use();
  const [tab, setTab] = useState<RequestStatus | 'ALL'>('PENDING_APPROVAL');
  const [viewing, setViewing] = useState<OrderRequest | null>(null);
  const [reply, setReply] = useState('');

  const company = (id: number) => cl.find(c => c.id === id)?.company ?? '—';
  const name = (id: number) => catalog.find(i => i.id === id)?.name ?? '—';
  const pcs = (r: OrderRequest) => r.lines.reduce((s, l) => s + l.qtyPc, 0);
  const rows = list.filter(r => tab === 'ALL' || r.status === tab).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  const act = (r: OrderRequest, status: RequestStatus) => {
    requests.update(r.id, { status, reply: reply.trim() || r.reply });
    toast.ok(`${STATUS[status].label} — ${company(r.clientId)} will see it in their app`);
    setViewing(null);
  };

  return (
    <>
      <Card>
        <div className="border-b border-line p-4">
          <Tabs value={tab} onChange={t => setTab(t as RequestStatus | 'ALL')} tabs={[
            { id: 'PENDING_APPROVAL', label: `Waiting (${list.filter(r => r.status === 'PENDING_APPROVAL').length})` },
            { id: 'APPROVED', label: 'Approved' }, { id: 'DISPATCHED', label: 'Dispatched' }, { id: 'REJECTED', label: 'Rejected' }, { id: 'ALL', label: 'All' },
          ]} />
        </div>
        <DataTable
          rows={rows}
          onRowClick={r => { setViewing(r); setReply(r.reply || ''); }}
          empty={<div className="py-12 text-center text-ink-3">No requests here</div>}
          columns={[
            { key: 'n', header: 'Request', render: r => <><div className="font-medium">REQ-{String(r.id).padStart(4, '0')}</div><div className="text-[12px] text-ink-3">{fmtDate(r.date)}</div></> },
            { key: 'c', header: 'Client', render: r => company(r.clientId) },
            { key: 'i', header: 'Items', render: r => <span className="text-ink-2">{r.lines.map(l => `${name(l.itemId)} ${l.finish}`).join(', ')}</span> },
            { key: 'p', header: 'Pieces', align: 'right', render: r => num(pcs(r)) },
            { key: 's', header: 'Status', render: r => <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge> },
          ]}
        />
      </Card>
      <Drawer open={!!viewing} wide title={viewing ? `REQ-${String(viewing.id).padStart(4, '0')} · ${company(viewing.clientId)}` : ''} onClose={() => setViewing(null)}
        footer={viewing && <>
          {viewing.status === 'PENDING_APPROVAL' && <>
            <Button variant="outline" icon={<X size={15} />} onClick={() => act(viewing, 'REJECTED')}>Reject</Button>
            <Button icon={<Check size={15} />} onClick={() => act(viewing, 'APPROVED')}>Approve</Button>
          </>}
          {viewing.status === 'APPROVED' && <Button icon={<Truck size={15} />} onClick={() => act(viewing, 'DISPATCHED')}>Mark dispatched</Button>}
        </>}>
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2"><Badge tone={STATUS[viewing.status].tone}>{STATUS[viewing.status].label}</Badge><Badge>{fmtDate(viewing.date)}</Badge></div>
            <table className="text-left text-[13px]">
              <thead><tr className="border-b border-line text-ink-3"><th className="py-2">Item</th><th>Size</th><th>Finish</th><th className="text-right">Pieces</th></tr></thead>
              <tbody>{viewing.lines.map((l, i) => (
                <tr key={i} className="border-b border-line"><td className="py-2 font-medium">{name(l.itemId)}</td><td>{l.size}</td><td>{l.finish}</td><td className="text-right">{num(l.qtyPc)}</td></tr>
              ))}</tbody>
            </table>
            {viewing.note && <div className="rounded-lg bg-muted p-3"><div className="text-[12px] text-ink-3">Client's note</div>{viewing.note}</div>}
            {viewing.status !== 'DISPATCHED' && viewing.status !== 'REJECTED'
              ? <Field label="Reply to client (optional)"><input className="field" value={reply} onChange={e => setReply(e.target.value)} placeholder="e.g. Ready in 10 days" /></Field>
              : viewing.reply && <div className="rounded-lg bg-muted p-3"><div className="text-[12px] text-ink-3">Your reply</div>{viewing.reply}</div>}
          </div>
        )}
      </Drawer>
    </>
  );
};

/* ------------------------------ Admin: clients ------------------------------ */

const Clients: React.FC = () => {
  const list = clients.use();
  const reqs = requests.use();
  const [editing, setEditing] = useState<Client | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Client, 'id'>>({ company: '', contact: '', phone: '', city: '', login: '', active: true });

  const save = () => {
    if (!form.company.trim() || !form.login.trim()) { toast.err('Company and login ID are required'); return; }
    if (editing === 'new') clients.create(form);
    else if (editing) clients.update(editing.id, form);
    toast.ok(editing === 'new' ? 'Client account created' : 'Client updated');
    setEditing(null);
  };

  return (
    <>
      <Card>
        <div className="flex justify-end border-b border-line p-4">
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing('new'); setForm({ company: '', contact: '', phone: '', city: '', login: '', active: true }); }}>Add client</Button>
        </div>
        <DataTable
          rows={list}
          onRowClick={c => { setEditing(c); const { id: _id, ...rest } = c; setForm(rest); }}
          columns={[
            { key: 'c', header: 'Company', render: c => <><div className="font-medium">{c.company}</div><div className="text-[12px] text-ink-3">{c.city}</div></> },
            { key: 'p', header: 'Contact', render: c => <>{c.contact}<div className="text-[12px] text-ink-3">{c.phone}</div></> },
            { key: 'l', header: 'Login ID', render: c => <code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">{c.login}</code> },
            { key: 'r', header: 'Requests', align: 'right', render: c => reqs.filter(r => r.clientId === c.id).length },
            { key: 's', header: 'Access', render: c => <Badge tone={c.active ? 'green' : 'gray'}>{c.active ? 'Active' : 'Disabled'}</Badge> },
          ]}
        />
      </Card>
      <Drawer open={editing !== null} title={editing === 'new' ? 'Add client' : 'Edit client'} onClose={() => setEditing(null)}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        <div className="space-y-4">
          <Field label="Company"><input className="field" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact person"><input className="field" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></Field>
            <Field label="Phone"><input className="field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="City"><input className="field" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Login ID"><input className="field" value={form.login} onChange={e => setForm({ ...form, login: e.target.value.toLowerCase().replace(/\s/g, '') })} /></Field>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Can log in to the client app</label>
        </div>
      </Drawer>
    </>
  );
};

/* ----------------------------- Client app preview ----------------------------- */

const ClientApp: React.FC = () => {
  const cl = clients.use().filter(c => c.active);
  const catalog = items.use();
  const reqs = requests.use();
  const { settings } = useSettings();
  const [clientId, setClientId] = useState(cl[0]?.id ?? 0);
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState<RequestLine[]>([]);
  const [pick, setPick] = useState<Record<number, { size: string; finish: string; qty: number }>>({});
  const [note, setNote] = useState('');
  const me = cl.find(c => c.id === clientId);

  const categories = [...new Set(catalog.map(i => i.category))];
  const shown = catalog.filter(i => !category || i.category === category);
  const mine = reqs.filter(r => r.clientId === clientId).sort((a, b) => b.id - a.id);
  const choice = (id: number) => pick[id] ?? { size: sizeLabel(catalog.find(i => i.id === id)!.sizes[0]), finish: FINISHES[0], qty: 0 };

  const add = (id: number) => {
    const c = choice(id);
    const it = catalog.find(i => i.id === id)!;
    const qty = c.qty || it.pcsPerBox * it.boxPerCarton;
    setCart(l => [...l, { itemId: id, size: c.size, finish: c.finish, qtyPc: qty }]);
    toast.ok(`${it.name} added`);
  };

  const submit = () => {
    if (!cart.length) return;
    requests.create({ clientId, date: iso(new Date()), lines: cart, note: note.trim(), status: 'PENDING_APPROVAL' });
    setCart([]); setNote('');
    toast.ok('Order request sent — see it under Order requests');
  };

  if (!me) return <Card className="p-8 text-center text-ink-3">No active client accounts.</Card>;
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-accent bg-accent-soft px-4 py-3 text-[13px]">
          <span className="font-medium text-accent">Previewing the client app as</span>
          <select className="field h-8 w-[220px]" value={clientId} onChange={e => { setClientId(Number(e.target.value)); setCart([]); }}>
            {cl.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
          </select>
          <span className="text-ink-2">— this is what {me.contact} sees after logging in to {settings.companyName}.</span>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {['', ...categories].map(c => (
            <button key={c || 'all'} onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-[13px] ${category === c ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface'}`}>{c || 'All'}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {shown.map(it => {
            const c = choice(it.id);
            const setC = (p: Partial<typeof c>) => setPick(m => ({ ...m, [it.id]: { ...c, ...p } }));
            return (
              <Card key={it.id} className="p-4">
                <div className="mb-3 grid h-24 place-items-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-300 text-[28px] font-bold text-amber-800/70 dark:from-amber-900/40 dark:to-amber-700/40">
                  {it.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div className="font-semibold">{it.name}</div>
                <div className="mb-3 text-[12px] text-ink-3">{it.category} · {it.pcsPerBox} pcs/box · {it.boxPerCarton} box/carton</div>
                <div className="grid grid-cols-2 gap-2">
                  <select className="field h-8" value={c.size} onChange={e => setC({ size: e.target.value })}>{it.sizes.map(s => <option key={sizeLabel(s)}>{sizeLabel(s)}</option>)}</select>
                  <select className="field h-8" value={c.finish} onChange={e => setC({ finish: e.target.value })}>{FINISHES.map(f => <option key={f}>{f}</option>)}</select>
                  <input type="number" className="field h-8" placeholder={`${it.pcsPerBox * it.boxPerCarton} pcs`} value={c.qty || ''} onChange={e => setC({ qty: Number(e.target.value) || 0 })} />
                  <Button size="sm" icon={<ShoppingCart size={13} />} onClick={() => add(it.id)}>Add</Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      <div className="space-y-4">
        <Card title={`Order list · ${cart.length}`}>
          <div className="px-5 pb-4">
            {cart.map((l, i) => (
              <div key={i} className="flex items-center justify-between border-b border-line py-2 text-[13px] last:border-0">
                <div><div className="font-medium">{catalog.find(x => x.id === l.itemId)?.name}</div><div className="text-ink-3">{l.size} · {l.finish}</div></div>
                <div className="flex items-center gap-1">
                  <span className="tabular-nums">{num(l.qtyPc)}</span>
                  <Button size="sm" variant="ghost" icon={<Minus size={13} />} onClick={() => setCart(c => c.filter((_, k) => k !== i))} />
                </div>
              </div>
            ))}
            {!cart.length && <div className="py-6 text-center text-ink-3">Add items from the catalogue</div>}
            {cart.length > 0 && <>
              <textarea className="field mt-3" rows={2} placeholder="Note for the factory (optional)" value={note} onChange={e => setNote(e.target.value)} />
              <Button className="mt-3 w-full" icon={<Send size={15} />} onClick={submit}>Send order request</Button>
            </>}
          </div>
        </Card>
        <Card title="My orders">
          <div className="px-5 pb-4">
            {mine.map(r => (
              <div key={r.id} className="border-b border-line py-2.5 last:border-0">
                <div className="flex items-center justify-between"><span className="font-medium">REQ-{String(r.id).padStart(4, '0')}</span><Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge></div>
                <div className="text-[12px] text-ink-3">{fmtDate(r.date)} · {num(r.lines.reduce((s, l) => s + l.qtyPc, 0))} pcs</div>
                {r.reply && <div className="mt-1 text-[12px] text-ink-2">Factory: {r.reply}</div>}
              </div>
            ))}
            {!mine.length && <div className="py-6 text-center text-ink-3">No orders yet</div>}
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ---------------------------------- Page ---------------------------------- */

const ClientPortal: React.FC = () => {
  const [tab, setTab] = useState('requests');
  const reqs = requests.use();
  const cl = clients.use();
  const waiting = useMemo(() => reqs.filter(r => r.status === 'PENDING_APPROVAL').length, [reqs]);
  return (
    <>
      <PageHeader title="Client portal" subtitle="Customers browse your catalogue and send order requests; you approve them here."
        actions={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'requests', label: 'Order requests' }, { id: 'clients', label: 'Clients' }, { id: 'app', label: 'Client app' }]} />} />
      {tab !== 'app' && (
        <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat label="Waiting for approval" value={waiting} />
          <Stat label="Approved, not dispatched" value={reqs.filter(r => r.status === 'APPROVED').length} />
          <Stat label="Client accounts" value={cl.length} hint={`${cl.filter(c => c.active).length} active`} />
          <Stat label="Requests this month" value={reqs.filter(r => r.date.slice(0, 7) === iso(new Date()).slice(0, 7)).length} />
        </div>
      )}
      {tab === 'requests' ? <Requests /> : tab === 'clients' ? <Clients /> : <ClientApp />}
    </>
  );
};

export default ClientPortal;
