import React, { useEffect, useMemo, useState } from 'react';
import { Highlighter, Plus, Sigma, Trash2 } from 'lucide-react';
import { FINISHES, clients, items, sizeLabel, type Client } from '../../data/ishita';
import { clientPrices, finishPrice, pricingRules, ruleFor, type PricingRule } from '../../data/trade';
import { Badge, Button, Card, Drawer, Empty, PageHeader, SearchBox, cx, num, toast } from '../../ui';
import { n } from '../inventory/shared';

/* ---------------------------- Formula editor ---------------------------- */

/** finish = S.S. × multiplier + offset. clientId null edits the global defaults; a client edits only its overrides. */
const FormulaDrawer: React.FC<{ clientId: number | null | undefined; onClose: () => void }> = ({ clientId, onClose }) => {
  const rules = pricingRules.use();
  const [rows, setRows] = useState<Record<string, { mult: number; offset: number }>>({});
  const open = clientId !== undefined;
  useEffect(() => {
    if (!open) return;
    setRows(Object.fromEntries(FINISHES.map(f => { const r = ruleFor(pricingRules.all(), clientId, f); return [f, { mult: r.mult, offset: r.offset }]; })));
  }, [open, clientId]);
  if (!open) return null;
  const client = clientId ? clients.get(clientId) : null;

  const save = () => {
    FINISHES.forEach(f => {
      const v = rows[f];
      const own = rules.find(r => r.clientId === clientId && r.finish === f);
      const global = ruleFor(rules, null, f);
      // A client row that matches the global default is dropped so it keeps following the default.
      if (clientId !== null && Math.abs(v.mult - global.mult) < 1e-9 && Math.abs(v.offset - global.offset) < 1e-9) { if (own) pricingRules.remove(own.id); return; }
      if (own) pricingRules.update(own.id, v);
      else pricingRules.create({ clientId, finish: f, ...v } as Omit<PricingRule, 'id'>);
    });
    toast.ok('Formulas saved');
    onClose();
  };

  return (
    <Drawer open title="Finish price formulas" onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save formulas</Button></>}>
      <p className="mb-4 text-ink-2">
        {client ? `${client.company} — ` : ''}each finish = <span className="font-mono">S.S. × multiplier + offset</span>.
        {client ? ' Overrides apply to this client only.' : ' These are the global defaults.'}
      </p>
      <div className="grid grid-cols-[1fr_90px_90px] gap-2 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
        <span>Finish</span><span className="text-center">× Mult.</span><span className="text-center">+ Offset</span>
      </div>
      <div className="space-y-1.5">
        {FINISHES.map(f => {
          const r = rows[f] || { mult: 1, offset: 0 };
          const g = ruleFor(rules, null, f);
          const overridden = clientId !== null && (r.mult !== g.mult || r.offset !== g.offset);
          return (
            <div key={f} className="grid grid-cols-[1fr_90px_90px] items-center gap-2">
              <span className="flex items-center gap-2 text-[13px]">{f}{overridden && <Badge tone="amber">client</Badge>}</span>
              <input type="number" step="0.01" className="field h-8 text-center" disabled={f === 'S.S.'} value={r.mult} onChange={e => setRows({ ...rows, [f]: { ...r, mult: n(e.target.value) } })} />
              <input type="number" step="0.1" className="field h-8 text-center" disabled={f === 'S.S.'} value={r.offset} onChange={e => setRows({ ...rows, [f]: { ...r, offset: n(e.target.value) } })} />
            </div>
          );
        })}
      </div>
    </Drawer>
  );
};

/* ------------------------------ Add items ------------------------------ */

const AddItems: React.FC<{ client: Client | null; onClose: () => void }> = ({ client, onClose }) => {
  const catalog = items.use();
  const prices = clientPrices.use();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => setPicked(new Set()), [client]);
  if (!client) return null;
  const have = new Set(prices.filter(p => p.clientId === client.id).map(p => `${p.itemId}|${p.size}`));
  const toggle = (k: string) => setPicked(s => { const x = new Set(s); if (x.has(k)) x.delete(k); else x.add(k); return x; });
  const save = () => {
    clientPrices.createMany([...picked].map(k => {
      const [itemId, size] = k.split('|');
      const it = catalog.find(i => i.id === Number(itemId));
      const sz = it?.sizes.find(s => sizeLabel(s) === size);
      return { clientId: client.id, itemId: Number(itemId), size, ssPrice: Math.round((sz?.pcsWeight ?? 0) * 560 * 100) / 100 };
    }));
    toast.ok(`${picked.size} item size${picked.size === 1 ? '' : 's'} added — S.S. price set from the piece weight, edit it in the table`);
    onClose();
  };
  return (
    <Drawer open title={`Add items · ${client.company}`} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!picked.size} onClick={save}>Add {picked.size || ''}</Button></>}>
      <div className="space-y-4">
        {catalog.map(it => (
          <div key={it.id}>
            <div className="mb-1 font-medium">{it.name} <span className="text-[12px] text-ink-3">{it.category}</span></div>
            <div className="flex flex-wrap gap-2">
              {it.sizes.map(s => {
                const k = `${it.id}|${sizeLabel(s)}`;
                const on = picked.has(k);
                return (
                  <button key={k} type="button" disabled={have.has(k)} onClick={() => toggle(k)}
                    className={cx('rounded-md border px-2.5 py-1 text-[13px]', have.has(k) ? 'border-line text-ink-3 line-through' : on ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:bg-muted')}>
                    {sizeLabel(s)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
};

/* --------------------------------- Page --------------------------------- */

const ClientPricing: React.FC = () => {
  const list = clients.use();
  const catalog = items.use();
  const prices = clientPrices.use();
  const rules = pricingRules.use();
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState<number>(list[0]?.id ?? 0);
  const [formula, setFormula] = useState<number | null | undefined>(undefined);
  const [adding, setAdding] = useState<Client | null>(null);
  const [finishes, setFinishes] = useState<string[]>(FINISHES.slice(0, 6));

  const client = list.find(c => c.id === clientId) || null;
  const shown = list.filter(c => `${c.company} ${c.city}`.toLowerCase().includes(search.toLowerCase()));
  const rows = useMemo(() => prices.filter(p => p.clientId === clientId).map(p => {
    const it = catalog.find(i => i.id === p.itemId);
    const sz = it?.sizes.find(s => sizeLabel(s) === p.size);
    return { p, it, sz, perCarton: (it?.pcsPerBox ?? 0) * (it?.boxPerCarton ?? 0) };
  }).sort((a, b) => (a.it?.name || '').localeCompare(b.it?.name || '') || (a.sz?.pcsWeight ?? 0) - (b.sz?.pcsWeight ?? 0)), [prices, catalog, clientId]);
  const overrides = rules.filter(r => r.clientId === clientId).length;

  const th = 'whitespace-nowrap px-3 py-2.5 font-medium';
  const td = 'whitespace-nowrap px-3 py-2';
  return (
    <>
      <PageHeader title="Client management" subtitle="Each client's item list and prices; finish prices follow the S.S. price through the formulas."
        actions={<Button variant="outline" icon={<Sigma size={16} />} onClick={() => setFormula(null)}>Global formulas</Button>} />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <div className="border-b border-line p-3"><SearchBox value={search} onChange={setSearch} placeholder="Search client" /></div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {shown.map(c => {
              const count = prices.filter(p => p.clientId === c.id).length;
              return (
                <button key={c.id} type="button" onClick={() => setClientId(c.id)}
                  className={cx('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left', c.id === clientId ? 'bg-accent-soft text-accent' : 'hover:bg-muted')}>
                  <span className="min-w-0"><span className="block truncate font-medium">{c.company}</span><span className="block text-[12px] text-ink-3">{c.city}</span></span>
                  <span className="text-[12px] text-ink-3">{count}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="min-w-0">
          {!client ? <Empty title="Pick a client" /> : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
                <div className="mr-auto">
                  <h3 className="text-[16px] font-semibold">{client.company}</h3>
                  <p className="text-[13px] text-ink-3">{rows.length} item sizes · {overrides ? `${overrides} formula override${overrides > 1 ? 's' : ''}` : 'global formulas'}</p>
                </div>
                <Button variant="outline" icon={<Sigma size={15} />} onClick={() => setFormula(client.id)}>Client formulas</Button>
                <Button icon={<Plus size={15} />} onClick={() => setAdding(client)}>Add items</Button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-2.5 text-[12px]">
                <span className="mr-1 text-ink-3">Finishes shown</span>
                {FINISHES.map(f => (
                  <button key={f} type="button" onClick={() => setFinishes(s => (s.includes(f) ? s.filter(x => x !== f) : FINISHES.filter(x => s.includes(x) || x === f)))}
                    className={cx('rounded-md px-2 py-0.5', finishes.includes(f) ? 'bg-accent-soft text-accent' : 'bg-muted text-ink-2')}>{f}</button>
                ))}
              </div>
              {!rows.length ? <Empty title="No items for this client yet" action={<Button icon={<Plus size={15} />} onClick={() => setAdding(client)}>Add items</Button>} /> : (
                <div className="overflow-x-auto">
                  <table className="text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-3">
                        <th className={th}>Item</th><th className={th}>Size inch</th><th className={th}>Size mm</th>
                        <th className={cx(th, 'text-right')}>Doz. wt</th><th className={cx(th, 'text-right')}>Pcs wt</th><th className={cx(th, 'text-right')}>Box / pcs</th>
                        <th className={cx(th, 'text-right')}>Box / ctn</th><th className={cx(th, 'text-right')}>Pcs / ctn</th><th className={cx(th, 'text-right')}>Ctn wt</th>
                        {finishes.map(f => <th key={f} className={cx(th, 'text-right', f === 'S.S.' && 'text-accent')}>{f}</th>)}
                        <th className={th} />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ p, it, sz, perCarton }) => (
                        <tr key={p.id} className={cx('border-b border-line last:border-0', p.highlight && 'bg-amber-500/10')}>
                          <td className={cx(td, 'font-medium')}>{it?.name ?? '—'}</td>
                          <td className={td}>{sz?.inch ?? p.size}</td>
                          <td className={cx(td, 'font-mono text-ink-2')}>{sz?.mm ?? '—'}</td>
                          <td className={cx(td, 'text-right tabular-nums')}>{num(sz?.dozWeight, 3)}</td>
                          <td className={cx(td, 'text-right tabular-nums')}>{num(sz?.pcsWeight, 3)}</td>
                          <td className={cx(td, 'text-right tabular-nums')}>{it?.pcsPerBox ?? '—'}</td>
                          <td className={cx(td, 'text-right tabular-nums')}>{it?.boxPerCarton ?? '—'}</td>
                          <td className={cx(td, 'text-right tabular-nums')}>{num(perCarton)}</td>
                          <td className={cx(td, 'text-right tabular-nums')}>{num(perCarton * (sz?.pcsWeight ?? 0), 2)}</td>
                          {finishes.map(f => f === 'S.S.'
                            ? <td key={f} className="px-2 py-1 text-right"><input type="number" step="0.01" className="field h-8 w-[84px] text-right" defaultValue={p.ssPrice}
                                onBlur={e => { const v = n(e.target.value); if (v !== p.ssPrice) { clientPrices.update(p.id, { ssPrice: v }); toast.ok('Price saved'); } }} /></td>
                            : <td key={f} className={cx(td, 'text-right tabular-nums')}>{num(finishPrice(p.ssPrice, ruleFor(rules, clientId, f)), 2)}</td>)}
                          <td className="px-2 py-1">
                            <div className="flex">
                              <Button size="sm" variant="ghost" title="Highlight row" icon={<Highlighter size={13} />} onClick={() => clientPrices.update(p.id, { highlight: !p.highlight })} />
                              <Button size="sm" variant="ghost" title="Remove" icon={<Trash2 size={13} />} onClick={() => { clientPrices.remove(p.id); toast.ok('Removed from this client'); }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
      <FormulaDrawer clientId={formula} onClose={() => setFormula(undefined)} />
      <AddItems client={adding} onClose={() => setAdding(null)} />
    </>
  );
};

export default ClientPricing;
