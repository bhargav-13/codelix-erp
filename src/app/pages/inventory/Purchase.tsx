import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { categoryApi, productApi, rawItemApi, stockItemApi } from '../../../api/inventory';
import { partyApi } from '../../../api/party';
import { purchaseApi } from '../../../api/purchase';
import { purchasePartyApi } from '../../../api/purchaseParty';
import type { Category, Product, PurchaseParty, PurchaseRequest, PurchaseResponse } from '../../../types';
import { InventoryFloor, PurchaseInventoryType, QuantityUnit } from '../../../types';
import {
  Badge, Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, Stat, Tabs, inr, num, toast, useAsync,
} from '../../ui';
import { fetchAllPages } from '../sales/shared';
import { SelectWithAdd, n } from './shared';

type InvType = PurchaseRequest['inventoryType'];
const INV_LABEL: Record<InvType, string> = { RAW_MATERIAL: 'Raw material', GROUND_FLOOR: 'Stock · Unit 1', FIRST_FLOOR: 'Stock · Unit 2' };
const isStock = (t: InvType) => t !== PurchaseInventoryType.RAW_MATERIAL;

const blank = (): PurchaseRequest => ({
  chNo: '', partyId: 0, productId: 0, qty: 0, rate: 0, amountDeposited: 0, inventoryType: PurchaseInventoryType.RAW_MATERIAL, lowStockAlert: 0,
});

/* ------------------------------ Purchase form ------------------------------ */

const PurchaseForm: React.FC<{ purchase: PurchaseResponse | null; open: boolean; onClose: () => void; onSaved: () => void }> = ({
  purchase, open, onClose, onSaved,
}) => {
  const [form, setForm] = useState<PurchaseRequest>(blank());
  const [suppliers, setSuppliers] = useState<PurchaseParty[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  // Set when the product was already in inventory: the backend records the purchase
  // but leaves the quantity alone, so this step adds it (as the original screen did).
  const [merge, setMerge] = useState<PurchaseResponse | null>(null);
  const [mergePrice, setMergePrice] = useState(0);

  useEffect(() => {
    if (!open) return;
    setMerge(null);
    Promise.all([purchasePartyApi.getAll(), productApi.getProducts(), categoryApi.getCategories()])
      .then(([s, p, c]) => { setSuppliers(s); setProducts(p); setCategories(c); })
      .catch(() => toast.err('Could not load suppliers and products'));
    setForm(purchase ? {
      chNo: purchase.chNo, partyId: purchase.partyId, productId: purchase.product.productId, qty: purchase.qty, rate: purchase.rate,
      amountDeposited: purchase.amountDeposited, inventoryType: purchase.inventoryType,
      lowStockAlert: purchase.rawInventory?.lowStockAlert ?? purchase.stockInventory?.lowStockAlert ?? 0,
      categoryId: purchase.stockInventory?.category?.categoryId, quantityInPc: purchase.stockInventory?.quantityInPc,
      weightPerPc: purchase.stockInventory?.weightPerPc, quantityUnit: purchase.stockInventory?.quantityUnit,
    } : blank());
  }, [open, purchase]);

  const set = (patch: Partial<PurchaseRequest>) => setForm(f => {
    const next = { ...f, ...patch };
    if (isStock(next.inventoryType)) {
      const perPc = next.quantityUnit === QuantityUnit.GM ? (next.weightPerPc || 0) / 1000 : next.weightPerPc || 0;
      next.quantityInPc = perPc > 0 ? Math.floor(next.qty / perPc) : 0;
    }
    return next;
  });

  const total = form.qty * form.rate;

  const save = async () => {
    if (!form.chNo.trim() || !form.partyId || !form.productId) { toast.err('Challan no., supplier and product are required'); return; }
    if (!(form.qty > 0) || !(form.rate > 0)) { toast.err('Enter quantity and rate'); return; }
    if (isStock(form.inventoryType) && !form.categoryId) { toast.err('Stock purchases need a category'); return; }
    const payload: PurchaseRequest = {
      chNo: form.chNo.trim(), partyId: form.partyId, productId: form.productId, qty: form.qty, rate: form.rate,
      amountDeposited: form.amountDeposited, inventoryType: form.inventoryType, lowStockAlert: form.lowStockAlert,
      ...(isStock(form.inventoryType) ? {
        categoryId: form.categoryId, quantityInPc: form.quantityInPc, weightPerPc: form.weightPerPc, quantityUnit: form.quantityUnit || QuantityUnit.KG,
      } : {}),
    };
    setBusy(true);
    try {
      if (purchase) {
        await purchaseApi.updatePurchase(purchase.purchaseId, payload);
        toast.ok('Purchase updated');
      } else {
        const res = await purchaseApi.createPurchase(payload);
        if (res.inventoryStatus === 'ALREADY_EXISTS') {
          const existing = res.stockInventory;
          const total = (existing?.quantityInKg || 0) + res.qty;
          // Weighted average of the existing and new rate.
          setMergePrice(existing && total ? ((existing.quantityInKg * existing.pricePerKg) + res.qty * res.rate) / total : res.rate);
          setMerge(res);
          return;
        }
        toast.ok('Purchase saved — new stock entry created');
      }
      onSaved();
    } catch {
      toast.err('Could not save the purchase');
    } finally {
      setBusy(false);
    }
  };

  const applyMerge = async () => {
    if (!merge) return;
    setBusy(true);
    try {
      if (merge.rawInventory) {
        const raw = merge.rawInventory;
        await rawItemApi.updateRawItem(raw.rawItemId, {
          productId: raw.product.productId, quantityInKg: raw.quantityInKg + merge.qty, lowStockAlert: raw.lowStockAlert,
        });
      } else if (merge.stockInventory) {
        const st = merge.stockInventory;
        const qty = st.quantityInKg + merge.qty;
        const perPc = st.quantityUnit === QuantityUnit.GM ? st.weightPerPc / 1000 : st.weightPerPc;
        await stockItemApi.updateStockItem(st.stockItemId, {
          productId: st.product.productId, categoryId: st.category.categoryId, quantityInKg: qty,
          quantityInPc: perPc > 0 ? Math.floor(qty / perPc) : st.quantityInPc, weightPerPc: st.weightPerPc,
          pricePerKg: Number(mergePrice.toFixed(2)), quantityUnit: st.quantityUnit || QuantityUnit.KG,
          inventoryFloor: st.inventoryFloor || InventoryFloor.GROUND_FLOOR, lowStockAlert: st.lowStockAlert,
        });
      }
      toast.ok('Purchase saved — added to existing stock');
      onSaved();
    } catch {
      toast.err('Purchase saved, but the stock could not be updated');
    } finally {
      setBusy(false);
    }
  };

  if (merge) {
    const inv = merge.rawInventory ?? merge.stockInventory;
    const before = inv?.quantityInKg || 0;
    return (
      <Drawer open={open} title="Add to existing stock" onClose={onSaved}
        footer={<><Button variant="outline" onClick={() => { toast.ok('Purchase saved — stock left unchanged'); onSaved(); }}>Skip</Button>
          <Button loading={busy} onClick={applyMerge}>Add to stock</Button></>}>
        <div className="space-y-4">
          <p className="text-ink-2">
            <b className="text-ink">{merge.product.productName}</b> is already in {INV_LABEL[merge.inventoryType].toLowerCase()}. Add this purchase to it?
          </p>
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-3 text-[13px]">
            <div><div className="text-ink-3">Now</div><div className="font-semibold">{num(before, 2)} kg</div></div>
            <div><div className="text-ink-3">Purchased</div><div className="font-semibold">+ {num(merge.qty, 2)} kg</div></div>
            <div><div className="text-ink-3">After</div><div className="font-semibold">{num(before + merge.qty, 2)} kg</div></div>
          </div>
          {merge.stockInventory && (
            <Field label="New rate per kg (₹) — weighted average">
              <input className="field" type="number" value={Number(mergePrice.toFixed(2))} onChange={e => setMergePrice(n(e.target.value))} />
            </Field>
          )}
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} wide title={purchase ? `Edit purchase · ${purchase.chNo}` : 'New purchase'} onClose={onClose}
      footer={<>
        <div className="mr-auto text-[13px] text-ink-2">Total <span className="ml-1 text-[16px] font-semibold text-ink">{inr(total)}</span></div>
        <Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button>
      </>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Challan no."><input className="field" value={form.chNo} onChange={e => set({ chNo: e.target.value })} /></Field>
        <Field label="Supplier">
          <SelectWithAdd value={form.partyId} options={suppliers} getId={s => s.id} getLabel={s => s.name}
            onChange={id => set({ partyId: id })} placeholder="Select supplier…" noun="Supplier"
            onCreate={async name => { const s = await purchasePartyApi.create({ name }); setSuppliers(l => [...l, s]); return s; }} />
        </Field>
        <Field label="Product" className="col-span-2">
          <SelectWithAdd value={form.productId} options={products} getId={p => p.productId} getLabel={p => p.productName}
            onChange={id => set({ productId: id })} placeholder="Select product…" noun="Product"
            onCreate={async name => { const p = await productApi.createProduct({ productName: name }); setProducts(l => [...l, p]); return p; }} />
        </Field>
        <Field label="Goes into" className="col-span-2">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(INV_LABEL) as InvType[]).map(t => (
              <button key={t} onClick={() => set({ inventoryType: t })}
                className={`rounded-lg border px-3 py-2 text-[13px] font-medium ${form.inventoryType === t ? 'border-accent bg-accent-soft text-accent' : 'border-line'}`}>
                {INV_LABEL[t]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Quantity (kg)"><input className="field" type="number" value={form.qty || ''} onChange={e => set({ qty: n(e.target.value) })} /></Field>
        <Field label="Rate per kg (₹)"><input className="field" type="number" value={form.rate || ''} onChange={e => set({ rate: n(e.target.value) })} /></Field>
        <Field label="Amount paid (₹)"><input className="field" type="number" value={form.amountDeposited || ''} onChange={e => set({ amountDeposited: n(e.target.value) })} /></Field>
        <Field label="Low-stock alert at (kg)"><input className="field" type="number" value={form.lowStockAlert || ''} onChange={e => set({ lowStockAlert: n(e.target.value) })} /></Field>
        {isStock(form.inventoryType) && (
          <>
            <Field label="Category">
              <SelectWithAdd value={form.categoryId || 0} options={categories} getId={c => c.categoryId} getLabel={c => c.categoryName}
                onChange={id => set({ categoryId: id })} placeholder="Select category…" noun="Category"
                onCreate={async name => { const c = await categoryApi.createCategory({ categoryName: name }); setCategories(l => [...l, c]); return c; }} />
            </Field>
            <Field label="Weight per piece">
              <div className="flex gap-2">
                <input className="field" type="number" value={form.weightPerPc || ''} onChange={e => set({ weightPerPc: n(e.target.value) })} />
                <select className="field w-[84px]" value={form.quantityUnit || QuantityUnit.KG} onChange={e => set({ quantityUnit: e.target.value as PurchaseRequest['quantityUnit'] })}>
                  <option value={QuantityUnit.KG}>kg</option><option value={QuantityUnit.GM}>g</option>
                </select>
              </div>
            </Field>
            <Field label="Pieces (calculated)"><div className="field flex items-center bg-muted">{num(form.quantityInPc)}</div></Field>
          </>
        )}
        <div className="col-span-2 grid grid-cols-3 gap-3 rounded-lg bg-muted p-3 text-[13px]">
          <div><div className="text-ink-3">Total</div><div className="font-semibold">{inr(total)}</div></div>
          <div><div className="text-ink-3">Paid</div><div className="font-semibold">{inr(form.amountDeposited)}</div></div>
          <div><div className="text-ink-3">Balance</div><div className="font-semibold">{inr(total - form.amountDeposited)}</div></div>
        </div>
      </div>
    </Drawer>
  );
};

/* ------------------------------ Suppliers tab ------------------------------ */

const Suppliers: React.FC<{ suppliers: PurchaseParty[]; purchases: PurchaseResponse[]; reload: () => void }> = ({ suppliers, purchases, reload }) => {
  const [editing, setEditing] = useState<PurchaseParty | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', officialAmount: 0, offlineAmount: 0 });
  const [deleting, setDeleting] = useState<PurchaseParty | null>(null);
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => {
    const m = new Map<number, { bought: number; paid: number }>();
    for (const p of purchases) {
      const t = m.get(p.partyId) || { bought: 0, paid: 0 };
      t.bought += p.total || 0; t.paid += p.amountDeposited || 0;
      m.set(p.partyId, t);
    }
    return m;
  }, [purchases]);

  const open = (s: PurchaseParty | 'new') => {
    setEditing(s);
    setForm(s === 'new' ? { name: '', officialAmount: 0, offlineAmount: 0 } : { name: s.name, officialAmount: s.officialAmount, offlineAmount: s.offlineAmount });
  };

  const save = async () => {
    if (!form.name.trim()) { toast.err('Name is required'); return; }
    setBusy(true);
    try {
      if (editing === 'new') await purchasePartyApi.create({ ...form, name: form.name.trim() });
      else if (editing) await purchasePartyApi.update(editing.id, { ...form, name: form.name.trim() });
      toast.ok('Supplier saved');
      setEditing(null);
      reload();
    } catch {
      toast.err('Could not save the supplier');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await purchasePartyApi.delete(deleting.id);
      toast.ok('Supplier deleted');
      setDeleting(null);
      reload();
    } catch {
      toast.err('Could not delete — the supplier has purchases');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <div className="flex justify-end border-b border-line p-4"><Button size="sm" icon={<Plus size={14} />} onClick={() => open('new')}>Add supplier</Button></div>
        <DataTable
          rows={[...suppliers].sort((a, b) => a.name.localeCompare(b.name))}
          onRowClick={open}
          columns={[
            { key: 'n', header: 'Supplier', render: s => <span className="font-medium">{s.name}</span> },
            { key: 'b', header: 'Purchased', align: 'right', render: s => inr(totals.get(s.id)?.bought) },
            { key: 'p', header: 'Paid', align: 'right', render: s => inr(totals.get(s.id)?.paid) },
            { key: 'd', header: 'Balance', align: 'right', render: s => <span className="font-semibold">{inr((totals.get(s.id)?.bought || 0) - (totals.get(s.id)?.paid || 0))}</span> },
            {
              key: 'a', header: '', align: 'right', render: s => (
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={() => open(s)} />
                  <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(s)} />
                </div>
              ),
            },
          ]}
        />
      </Card>
      <Drawer open={editing !== null} title={editing === 'new' ? 'Add supplier' : 'Edit supplier'} onClose={() => setEditing(null)}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        <div className="space-y-4">
          <Field label="Supplier name"><input className="field" autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Opening GST balance (₹)"><input className="field" type="number" value={form.officialAmount || ''} onChange={e => setForm({ ...form, officialAmount: n(e.target.value) })} /></Field>
          <Field label="Opening cash balance (₹)"><input className="field" type="number" value={form.offlineAmount || ''} onChange={e => setForm({ ...form, offlineAmount: n(e.target.value) })} /></Field>
        </div>
      </Drawer>
      <Confirm open={!!deleting} title="Delete supplier?" message={`${deleting?.name} will be removed.`} busy={busy}
        onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

/* ---------------------------------- Page ---------------------------------- */

const Purchase: React.FC = () => {
  const q = useAsync(async () => {
    const [purchases, suppliers, parties] = await Promise.all([
      fetchAllPages(page => purchaseApi.getPurchases(page, 100)),
      purchasePartyApi.getAll(),
      partyApi.getAllParties().catch(() => []),
    ]);
    return { purchases: purchases.sort((a, b) => b.purchaseId - a.purchaseId), suppliers, parties };
  }, []);
  const [tab, setTab] = useState('purchases');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [form, setForm] = useState<{ purchase: PurchaseResponse | null } | null>(null);
  const [deleting, setDeleting] = useState<PurchaseResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const purchases = q.data?.purchases || [];
  // Older purchases may point at a sales party, so fall back to that list.
  const partyName = (id: number) => q.data?.suppliers.find(s => s.id === id)?.name ?? q.data?.parties.find(p => p.partyId === id)?.name ?? `#${id}`;
  const rows = useMemo(() => purchases.filter(p =>
    (!type || p.inventoryType === type) &&
    `${p.chNo} ${p.product?.productName} ${partyName(p.partyId)}`.toLowerCase().includes(search.toLowerCase()),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [purchases, type, search, q.data]);

  const total = purchases.reduce((s, p) => s + (p.total || 0), 0);
  const paid = purchases.reduce((s, p) => s + (p.amountDeposited || 0), 0);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await purchaseApi.deletePurchase(deleting.purchaseId);
      toast.ok('Purchase deleted');
      setDeleting(null);
      q.reload();
    } catch {
      toast.err('Could not delete the purchase');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Purchase" subtitle="Material bought in — added to stock automatically."
        actions={<>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'purchases', label: 'Purchases' }, { id: 'suppliers', label: 'Suppliers' }]} />
          <Button icon={<Plus size={16} />} onClick={() => setForm({ purchase: null })}>New purchase</Button>
        </>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Purchases" value={num(purchases.length)} />
        <Stat label="Total bought" value={inr(total)} />
        <Stat label="Paid" value={inr(paid)} />
        <Stat label="To pay" value={inr(total - paid)} />
      </div>
      {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : tab === 'suppliers'
        ? <Suppliers suppliers={q.data?.suppliers || []} purchases={purchases} reload={q.reload} />
        : (
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
              <select className="field max-w-[180px]" value={type} onChange={e => setType(e.target.value)}>
                <option value="">Everything</option>
                {(Object.keys(INV_LABEL) as InvType[]).map(t => <option key={t} value={t}>{INV_LABEL[t]}</option>)}
              </select>
              <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search challan, product, supplier" /></div>
            </div>
            <DataTable
              rows={rows}
              onRowClick={p => setForm({ purchase: p })}
              columns={[
                { key: 'c', header: 'Challan', render: p => <span className="font-medium">{p.chNo}</span> },
                { key: 's', header: 'Supplier', render: p => partyName(p.partyId) },
                { key: 'p', header: 'Product', render: p => p.product?.productName },
                { key: 't', header: 'Into', render: p => <Badge tone={isStock(p.inventoryType) ? 'accent' : 'gray'}>{INV_LABEL[p.inventoryType]}</Badge> },
                { key: 'q', header: 'Qty', align: 'right', render: p => `${num(p.qty, 2)} kg` },
                { key: 'r', header: 'Rate', align: 'right', render: p => inr(p.rate) },
                { key: 'tt', header: 'Total', align: 'right', render: p => <span className="font-semibold">{inr(p.total)}</span> },
                { key: 'b', header: 'Balance', align: 'right', render: p => { const b = (p.total || 0) - (p.amountDeposited || 0); return b > 0 ? inr(b) : <Badge tone="green">Paid</Badge>; } },
                {
                  key: 'a', header: '', align: 'right', render: p => (
                    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={() => setForm({ purchase: p })} />
                      <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(p)} />
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        )}
      <PurchaseForm open={!!form} purchase={form?.purchase ?? null} onClose={() => setForm(null)} onSaved={() => { setForm(null); q.reload(); }} />
      <Confirm open={!!deleting} title="Delete purchase?" message={`Challan ${deleting?.chNo} will be removed.`} busy={busy}
        onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Purchase;
