import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { FINISHES, items, sizeLabel, type Item, type Size } from '../../data/ishita';
import { Badge, Button, Card, Confirm, Drawer, Empty, Field, PageHeader, SearchBox, Stat, cx, inr, num, toast } from '../../ui';
import { n } from '../inventory/shared';

type Draft = Omit<Item, 'id'>;
const blank = (): Draft => ({ name: '', category: '', sizes: [{ inch: '', mm: '', dozWeight: 0, pcsWeight: 0 }], labour: Object.fromEntries(FINISHES.map(f => [f, 0])), pcsPerBox: 12, boxPerCarton: 20 });

/** Item master as on Ishita: each item's sizes with piece / dozen weight, packing, and labour per finish. */
const ItemMaster: React.FC = () => {
  const all = items.use();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const [f, setF] = useState<Draft>(blank());
  const [deleting, setDeleting] = useState<Item | null>(null);

  useEffect(() => {
    if (editing === 'new') setF(blank());
    else if (editing) { const { id: _id, ...rest } = editing; setF(JSON.parse(JSON.stringify(rest))); }
  }, [editing]);

  const cats = [...new Set(all.map(i => i.category))].sort();
  const rows = useMemo(() => all.filter(i => (!cat || i.category === cat)
    && `${i.name} ${i.category} ${i.sizes.map(sizeLabel).join(' ')}`.toLowerCase().includes(search.toLowerCase())), [all, cat, search]);
  const sizes = all.reduce((s, i) => s + i.sizes.length, 0);

  const setSize = (i: number, p: Partial<Size>) => setF(x => ({ ...x, sizes: x.sizes.map((s, k) => (k === i ? { ...s, ...p } : s)) }));
  const save = () => {
    if (!f.name.trim() || !f.category.trim()) { toast.err('Item name and category are required'); return; }
    const sz = f.sizes.filter(s => s.inch.trim() || s.mm.trim());
    if (!sz.length) { toast.err('Add at least one size'); return; }
    const data = { ...f, name: f.name.trim(), category: f.category.trim(), sizes: sz };
    if (editing === 'new') items.create(data); else if (editing) items.update(editing.id, data);
    toast.ok('Item saved');
    setEditing(null);
  };
  const toggle = (id: number) => setOpen(s => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });

  return (
    <>
      <PageHeader title="Item master" subtitle="Every item, its sizes and weights, how it is packed, and the labour for each finish."
        actions={<Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>Add item</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total items" value={all.length} />
        <Stat label="Sizes" value={sizes} />
        <Stat label="Categories" value={cats.length} />
        <Stat label="Finishes" value={FINISHES.length} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Search item, size or category" />
          <select className="field h-9 w-[180px]" value={cat} onChange={e => setCat(e.target.value)}>
            <option value="">All categories</option>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {!rows.length ? <Empty title="No items match" /> : (
          <div className="divide-y divide-line">
            {rows.map(it => (
              <div key={it.id}>
                <button type="button" onClick={() => toggle(it.id)} className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-muted/60">
                  <ChevronDown size={16} className={cx('shrink-0 text-ink-3 transition-transform', !open.has(it.id) && '-rotate-90')} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-[12px] text-ink-3">{it.sizes.map(s => s.inch).join(' · ')}</div>
                  </div>
                  <Badge>{it.category}</Badge>
                  <span className="hidden w-32 text-right text-[13px] text-ink-2 sm:block">{it.pcsPerBox} pc / box · {it.boxPerCarton} box</span>
                  <span className="w-20 text-right text-[13px] text-ink-2">{it.sizes.length} size{it.sizes.length > 1 ? 's' : ''}</span>
                </button>
                {open.has(it.id) && (
                  <div className="bg-muted/40 px-5 pb-4 pt-1">
                    <div className="overflow-x-auto">
                      <table className="text-left text-[13px]">
                        <thead><tr className="text-[11px] uppercase tracking-wide text-ink-3">
                          <th className="px-3 py-2 font-medium">Size inch</th><th className="px-3 py-2 font-medium">Size mm</th>
                          <th className="px-3 py-2 text-right font-medium">Pcs weight</th><th className="px-3 py-2 text-right font-medium">Doz. weight</th>
                          <th className="px-3 py-2 text-right font-medium">Pcs / carton</th><th className="px-3 py-2 text-right font-medium">Carton weight</th>
                        </tr></thead>
                        <tbody>
                          {it.sizes.map(s => (
                            <tr key={s.mm} className="border-t border-line">
                              <td className="px-3 py-2">{s.inch}</td><td className="px-3 py-2 font-mono text-ink-2">{s.mm}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{num(s.pcsWeight, 3)} kg</td><td className="px-3 py-2 text-right tabular-nums">{num(s.dozWeight, 3)} kg</td>
                              <td className="px-3 py-2 text-right tabular-nums">{num(it.pcsPerBox * it.boxPerCarton)}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{num(it.pcsPerBox * it.boxPerCarton * s.pcsWeight, 2)} kg</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
                      <span className="mr-1 text-ink-3">Labour / kg</span>
                      {FINISHES.map(fi => <span key={fi} className="rounded-md bg-surface px-2 py-0.5 ring-1 ring-line">{fi} <b>{inr(it.labour[fi])}</b></span>)}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(it)}>Edit item</Button>
                      <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setDeleting(it)}>Delete</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Drawer open={editing !== null} wide title={editing === 'new' ? 'Add item' : `Edit ${f.name}`} onClose={() => setEditing(null)}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save item</Button></>}>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Item name"><input className="field" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Category">
              <input className="field" list="item-cats" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} />
              <datalist id="item-cats">{cats.map(c => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Pieces per box"><input type="number" className="field" value={f.pcsPerBox || ''} onChange={e => setF({ ...f, pcsPerBox: n(e.target.value) })} /></Field>
            <Field label="Boxes per carton"><input type="number" className="field" value={f.boxPerCarton || ''} onChange={e => setF({ ...f, boxPerCarton: n(e.target.value) })} /></Field>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Sizes</h3>
              <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => setF({ ...f, sizes: [...f.sizes, { inch: '', mm: '', dozWeight: 0, pcsWeight: 0 }] })}>Add size</Button>
            </div>
            <div className="space-y-2">
              {f.sizes.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2">
                  <Field label={i === 0 ? 'Size in inch' : ''}><input className="field" value={s.inch} onChange={e => setSize(i, { inch: e.target.value })} placeholder='4"' /></Field>
                  <Field label={i === 0 ? 'Size in mm' : ''}><input className="field" value={s.mm} onChange={e => setSize(i, { mm: e.target.value })} placeholder="100mm" /></Field>
                  <Field label={i === 0 ? 'Weight / pc (kg)' : ''}><input type="number" className="field" value={s.pcsWeight || ''} onChange={e => setSize(i, { pcsWeight: n(e.target.value), dozWeight: Math.round(n(e.target.value) * 12 * 1000) / 1000 })} /></Field>
                  <Field label={i === 0 ? 'Dozen weight' : ''}><input type="number" className="field" value={s.dozWeight || ''} onChange={e => setSize(i, { dozWeight: n(e.target.value) })} /></Field>
                  <Button variant="ghost" icon={<Trash2 size={15} />} disabled={f.sizes.length === 1} onClick={() => setF({ ...f, sizes: f.sizes.filter((_, k) => k !== i) })} />
                </div>
              ))}
            </div>
            <p className="mt-1 text-[12px] text-ink-3">Dozen weight fills in from the piece weight; type over it if you weighed a dozen.</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Labour per kg by finish</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FINISHES.map(fi => (
                <Field key={fi} label={fi}><input type="number" className="field" value={f.labour[fi] || ''} onChange={e => setF({ ...f, labour: { ...f.labour, [fi]: n(e.target.value) } })} /></Field>
              ))}
            </div>
          </div>
        </div>
      </Drawer>
      <Confirm open={!!deleting} title="Delete item?" message={`${deleting?.name} and its ${deleting?.sizes.length} sizes will be removed. Existing gres and packing entries keep their copy.`}
        onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) items.remove(deleting.id); setDeleting(null); toast.ok('Item deleted'); }} />
    </>
  );
};

export default ItemMaster;
