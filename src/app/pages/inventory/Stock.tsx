import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { categoryApi, productApi, stockItemApi } from '../../../api/inventory';
import { imageApi } from '../../../api/image';
import type { Category, Product, StockItem, StockItemImage, StockItemRequest } from '../../../types';
import { QuantityUnit } from '../../../types';
import {
  Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, Stat, inr, num, toast, useAsync,
} from '../../ui';
import { UNIT_LABEL, UnitBadge, UnitTabs, fetchAllPages, floorsFor, useUnit, type Floor } from '../sales/shared';
import { SelectWithAdd, StockBadge, n } from './shared';

type Row = StockItem & { floor: Floor };
type Form = Omit<StockItemRequest, 'inventoryFloor'> & { inventoryFloor: Floor };

const isLow = (s: StockItem) => s.status === 'LOW_STOCK';

/** Pieces from weight, same as before: floor(kg / weight-per-piece), weight in kg or g. */
const piecesFor = (kg: number, perPc: number, unit: string) => {
  const perPcKg = unit === QuantityUnit.GM ? perPc / 1000 : perPc;
  return perPcKg > 0 ? Math.floor(kg / perPcKg) : 0;
};

const blank = (floor: Floor): Form => ({
  productId: 0, categoryId: 0, quantityInKg: 0, quantityInPc: 0, weightPerPc: 0, pricePerKg: 0,
  quantityUnit: QuantityUnit.KG, inventoryFloor: floor, lowStockAlert: 0, images: [],
});

const StockForm: React.FC<{ item: Row | null; open: boolean; defaultFloor: Floor; onClose: () => void; onSaved: () => void }> = ({
  item, open, defaultFloor, onClose, onSaved,
}) => {
  const [form, setForm] = useState<Form>(blank(defaultFloor));
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([productApi.getProducts(), categoryApi.getCategories()])
      .then(([p, c]) => { setProducts(p); setCategories(c); })
      .catch(() => toast.err('Could not load products and categories'));
    setForm(item ? {
      productId: item.product.productId, categoryId: item.category?.categoryId ?? 0, quantityInKg: item.quantityInKg,
      quantityInPc: item.quantityInPc, weightPerPc: item.weightPerPc, pricePerKg: item.pricePerKg,
      quantityUnit: item.quantityUnit || QuantityUnit.KG, inventoryFloor: item.floor, lowStockAlert: item.lowStockAlert,
      images: item.images || [],
    } : blank(defaultFloor));
  }, [open, item, defaultFloor]);

  const set = (patch: Partial<Form>) => setForm(f => {
    const next = { ...f, ...patch };
    if ('quantityInKg' in patch || 'weightPerPc' in patch || 'quantityUnit' in patch) {
      next.quantityInPc = piecesFor(next.quantityInKg, next.weightPerPc, next.quantityUnit);
    }
    return next;
  });

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const res = await imageApi.uploadMultipleImages([...files]);
      set({ images: [...(form.images || []), ...res.data.map(i => ({ imageName: i.imageName, imageLocation: i.imageLocation, publicId: i.publicId }))] });
    } catch {
      toast.err('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.productId || !form.categoryId) { toast.err('Choose a product and category'); return; }
    setSaving(true);
    const payload: StockItemRequest = {
      ...form,
      images: form.images?.length ? form.images.map((i: StockItemImage) => ({ imageName: i.imageName, imageLocation: i.imageLocation })) : undefined,
    };
    try {
      if (item) await stockItemApi.updateStockItem(item.stockItemId, payload);
      else await stockItemApi.createStockItem(payload);
      toast.ok(item ? 'Stock updated' : 'Stock item added');
      onSaved();
    } catch {
      toast.err('Could not save — this product may already be in stock for that unit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} wide title={item ? `Edit · ${item.product.productName}` : 'Add stock item'} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Product" className="col-span-2">
          <SelectWithAdd value={form.productId} options={products} getId={p => p.productId} getLabel={p => p.productName}
            onChange={id => set({ productId: id })} placeholder="Select product…" noun="Product"
            onCreate={async name => { const p = await productApi.createProduct({ productName: name }); setProducts(ps => [...ps, p]); return p; }} />
        </Field>
        <Field label="Category">
          <SelectWithAdd value={form.categoryId} options={categories} getId={c => c.categoryId} getLabel={c => c.categoryName}
            onChange={id => set({ categoryId: id })} placeholder="Select category…" noun="Category"
            onCreate={async name => { const c = await categoryApi.createCategory({ categoryName: name }); setCategories(cs => [...cs, c]); return c; }} />
        </Field>
        <Field label="Unit">
          <select className="field" value={form.inventoryFloor} onChange={e => set({ inventoryFloor: e.target.value as Floor })}>
            {(Object.keys(UNIT_LABEL) as Floor[]).map(f => <option key={f} value={f}>{UNIT_LABEL[f]}</option>)}
          </select>
        </Field>
        <Field label="Quantity (kg)"><input className="field" type="number" value={form.quantityInKg || ''} onChange={e => set({ quantityInKg: n(e.target.value) })} /></Field>
        <Field label="Rate per kg (₹)"><input className="field" type="number" value={form.pricePerKg || ''} onChange={e => set({ pricePerKg: n(e.target.value) })} /></Field>
        <Field label="Weight per piece">
          <div className="flex gap-2">
            <input className="field" type="number" value={form.weightPerPc || ''} onChange={e => set({ weightPerPc: n(e.target.value) })} />
            <select className="field w-[84px]" value={form.quantityUnit} onChange={e => set({ quantityUnit: e.target.value as Form['quantityUnit'] })}>
              <option value={QuantityUnit.KG}>kg</option>
              <option value={QuantityUnit.GM}>g</option>
            </select>
          </div>
        </Field>
        <Field label="Pieces (calculated)"><div className="field flex items-center bg-muted">{num(form.quantityInPc)}</div></Field>
        <Field label="Low-stock alert at (kg)"><input className="field" type="number" value={form.lowStockAlert || ''} onChange={e => set({ lowStockAlert: n(e.target.value) })} /></Field>
        <Field label="Stock value"><div className="flex h-[38px] items-center font-semibold">{inr(form.quantityInKg * form.pricePerKg)}</div></Field>
        <Field label="Photos (shown in the catalogue)" className="col-span-2">
          <div className="flex flex-wrap gap-2">
            {form.images?.map((img, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line">
                <img src={img.imageLocation} alt="" className="h-full w-full object-cover" />
                <button className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                  onClick={() => set({ images: form.images?.filter((_, idx) => idx !== i) })}><X size={12} /></button>
              </div>
            ))}
            <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border border-dashed border-line text-ink-3 hover:bg-muted">
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => upload(e.target.files)} />
              {uploading ? <Spinner label="" /> : <ImagePlus size={20} />}
            </label>
          </div>
        </Field>
      </div>
    </Drawer>
  );
};

const Stock: React.FC = () => {
  const [unit, setUnit] = useUnit();
  const q = useAsync(async () => {
    const perFloor = await Promise.all(floorsFor(unit).map(floor =>
      fetchAllPages(page => stockItemApi.getStockItems(floor, page, 100))
        .then(list => list.map(s => ({ ...s, floor: (s.inventoryFloor as Floor) || floor }))),
    ));
    return perFloor.flat().sort((a, b) => a.product.productName.localeCompare(b.product.productName));
  }, [unit]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState<{ item: Row | null } | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const all = q.data || [];
  const categories = useMemo(() => [...new Set(all.map(s => s.category?.categoryName).filter(Boolean))].sort(), [all]);
  const rows = useMemo(() => all.filter(s =>
    (!category || s.category?.categoryName === category) && (!lowOnly || isLow(s)) &&
    s.product.productName.toLowerCase().includes(search.toLowerCase()),
  ), [all, category, lowOnly, search]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await stockItemApi.deleteStockItem(deleting.stockItemId);
      toast.ok('Stock item deleted');
      setDeleting(null);
      q.reload();
    } catch {
      toast.err('Could not delete — it may be used in orders');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Stock" subtitle="Finished goods across both units."
        actions={<Button icon={<Plus size={16} />} onClick={() => setForm({ item: null })}>Add stock</Button>} />

      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Items" value={num(all.length)} />
        <Stat label="Stock value" value={inr(all.reduce((s, i) => s + (i.totalPrice || 0), 0))} />
        <Stat label="Total weight" value={`${num(all.reduce((s, i) => s + (i.quantityInKg || 0), 0), 1)} kg`} />
        <Stat label="Low stock" value={all.filter(isLow).length} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <UnitTabs value={unit} onChange={setUnit} />
          <select className="field max-w-[180px]" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} /> Low stock only</label>
          <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search product" /></div>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            onRowClick={s => setForm({ item: s })}
            columns={[
              {
                key: 'p', header: 'Product', render: s => (
                  <div className="flex items-center gap-3">
                    {s.images?.[0]
                      ? <img src={s.images[0].imageLocation} alt="" className="h-9 w-9 rounded-md object-cover" />
                      : <span className="grid h-9 w-9 place-items-center rounded-md bg-muted text-[11px] font-semibold text-ink-3">{s.product.productName.slice(0, 2).toUpperCase()}</span>}
                    <div><div className="font-medium">{s.product.productName}</div><div className="text-[12px] text-ink-3">{s.category?.categoryName}</div></div>
                  </div>
                ),
              },
              { key: 'u', header: 'Unit', render: s => <UnitBadge floor={s.floor} /> },
              { key: 'kg', header: 'Kg', align: 'right', render: s => num(s.quantityInKg, 2) },
              { key: 'pc', header: 'Pieces', align: 'right', render: s => (s.quantityInPc ? num(s.quantityInPc) : '—') },
              { key: 'r', header: 'Rate / kg', align: 'right', render: s => inr(s.pricePerKg) },
              { key: 'v', header: 'Value', align: 'right', render: s => <span className="font-semibold">{inr(s.totalPrice)}</span> },
              { key: 's', header: 'Status', render: s => <StockBadge low={isLow(s)} /> },
              {
                key: 'a', header: '', align: 'right', render: s => (
                  <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={() => setForm({ item: s })} />
                    <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(s)} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <StockForm open={!!form} item={form?.item ?? null} defaultFloor={unit === 'ALL' ? 'GROUND_FLOOR' : unit}
        onClose={() => setForm(null)} onSaved={() => { setForm(null); q.reload(); }} />
      <Confirm open={!!deleting} title="Delete stock item?" message={`${deleting?.product.productName} (${deleting ? UNIT_LABEL[deleting.floor] : ''}) will be removed.`}
        busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Stock;
