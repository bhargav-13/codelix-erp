import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ordersApi } from '../../../api/orders';
import { partyApi } from '../../../api/party';
import { productApi, stockItemApi } from '../../../api/inventory';
import type { Order, OrderProductRequest, OrderRequest, Party, Product, StockItem } from '../../../types';
import { InventoryFloor, QuantityUnit } from '../../../types';
import { Button, Drawer, Field, Spinner, inr, toast } from '../../ui';
import { UNIT_LABEL, type Floor, today } from './shared';

const emptyLine = (): OrderProductRequest => ({
  itemId: 0, productName: '', quantityUnit: 'kg', quantityKg: 0, quantityPc: 0, marketRate: 0, rateDifference: 0, totalAmount: 0,
});

const lineTotal = (l: OrderProductRequest) =>
  l.quantityUnit === 'pc'
    ? (l.quantityPc || 0) * (l.marketRate || 0)
    : (l.quantityKg || 0) * ((l.marketRate || 0) + (l.rateDifference || 0));

/** Same maths as the original order screen: billed share + 18% GST on it, cash share, transport. */
function withTotals(o: OrderRequest): OrderRequest {
  const products = o.products.map(l => ({ ...l, totalAmount: Number(lineTotal(l).toFixed(2)) }));
  const productsTotal = products.reduce((s, l) => s + l.totalAmount, 0);
  const billedPct = Math.min(Math.max(100 - (Number(o.offlineBillPercent) || 0), 0), 100);
  const officialBillAmount = (billedPct / 100) * productsTotal;
  const offlineTotal = Math.max(productsTotal - officialBillAmount, 0);
  const gst = officialBillAmount * 0.18;
  const transport = Number(o.transport) || 0;
  const r2 = (n: number) => Number(n.toFixed(2));
  return {
    ...o,
    products,
    productsTotal: r2(productsTotal),
    officialBillAmount: r2(officialBillAmount),
    offlineTotal: r2(offlineTotal),
    gst: r2(gst),
    transport,
    grandTotal: r2(offlineTotal + officialBillAmount + gst + transport),
    totalItems: products.length,
  };
}

function fromOrder(order: Order | null, floor: Floor): OrderRequest {
  if (!order) {
    const delivery = new Date(); delivery.setDate(delivery.getDate() + 7);
    return withTotals({
      partyId: 0, orderDate: today(), expectedDeliveryDate: delivery.toISOString().slice(0, 10), orderFloor: floor,
      offlineBillPercent: 0, officialBillAmount: 0, gst: 0, transport: 0, note: '', grandTotal: 0, productsTotal: 0, products: [emptyLine()],
    });
  }
  const { id: _id, orderStatus: _s, party, products, ...rest } = order;
  return withTotals({
    ...rest,
    partyId: rest.partyId || party?.id || 0,
    products: products?.length ? products.map(({ id: _pid, ...p }) => ({ ...p, quantityUnit: p.quantityUnit || (p.quantityPc ? 'pc' : 'kg') })) : [emptyLine()],
  });
}

const OrderForm: React.FC<{
  open: boolean; order: Order | null; defaultFloor: Floor; onClose: () => void; onSaved: () => void;
}> = ({ open, order, defaultFloor, onClose, onSaved }) => {
  const [form, setForm] = useState<OrderRequest>(() => fromOrder(order, defaultFloor));
  const [parties, setParties] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(fromOrder(order, defaultFloor));
    setLoading(true);
    Promise.all([partyApi.getAllParties(), productApi.getProducts(), stockItemApi.getAllStockItems()])
      .then(([p, pr, s]) => { setParties(p.sort((a, b) => a.name.localeCompare(b.name))); setProducts(pr); setStock(s); })
      .catch(() => toast.err('Could not load parties and products'))
      .finally(() => setLoading(false));
  }, [open, order, defaultFloor]);

  const set = (patch: Partial<OrderRequest>) => setForm(f => withTotals({ ...f, ...patch }));
  const setLine = (i: number, patch: Partial<OrderProductRequest>) =>
    setForm(f => withTotals({ ...f, products: f.products.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));

  // A line picks a product; orders reference the product's stock item, created on the fly if missing (as before).
  const pickProduct = async (i: number, productId: number) => {
    const product = products.find(p => p.productId === productId);
    if (!product) return;
    let item = stock.find(s => s.product.productId === productId);
    if (!item) {
      try {
        item = await stockItemApi.createStockItem({
          productId, categoryId: 1, quantityInKg: 0, quantityInPc: 0, weightPerPc: 0, pricePerKg: 0,
          quantityUnit: QuantityUnit.KG, inventoryFloor: InventoryFloor.GROUND_FLOOR, lowStockAlert: 0,
        });
        setStock(s => [...s, item!]);
      } catch {
        toast.err('This product has no stock entry yet — add it in Stock first');
        return;
      }
    }
    setLine(i, { itemId: item.stockItemId, productName: product.productName });
  };

  const productIdFor = (l: OrderProductRequest) => stock.find(s => s.stockItemId === l.itemId)?.product.productId ?? 0;
  const billedPct = 100 - (Number(form.offlineBillPercent) || 0);

  const error = useMemo(() => {
    if (!form.partyId) return 'Choose a party';
    if (!form.orderDate || !form.expectedDeliveryDate) return 'Order and delivery dates are required';
    const bad = form.products.find(l => !l.itemId || !(l.quantityUnit === 'pc' ? l.quantityPc : l.quantityKg) || !l.marketRate);
    if (bad) return 'Every line needs a product, quantity and rate';
    return null;
  }, [form]);

  const save = async () => {
    if (error) { toast.err(error); return; }
    setSaving(true);
    try {
      const payload = { ...form, note: form.note?.trim() || undefined };
      if (order) await ordersApi.updateOrder(order.id, payload);
      else await ordersApi.createOrder(payload);
      toast.ok(order ? 'Order updated' : 'Order created');
      onSaved();
    } catch {
      toast.err('Could not save the order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      wide
      title={order ? 'Edit order' : 'New order'}
      onClose={onClose}
      footer={<>
        <div className="mr-auto text-[13px] text-ink-2">Total <span className="ml-1 text-[16px] font-semibold text-ink">{inr(form.grandTotal)}</span></div>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={saving} onClick={save}>{order ? 'Save changes' : 'Create order'}</Button>
      </>}
    >
      {loading ? <Spinner /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Party" className="col-span-2">
              <select className="field" value={form.partyId} onChange={e => set({ partyId: Number(e.target.value) })}>
                <option value={0}>Select party…</option>
                {parties.map(p => <option key={p.partyId} value={p.partyId}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Unit">
              <select className="field" value={form.orderFloor} onChange={e => set({ orderFloor: e.target.value as Floor })}>
                {(Object.keys(UNIT_LABEL) as Floor[]).map(f => <option key={f} value={f}>{UNIT_LABEL[f]}</option>)}
              </select>
            </Field>
            <Field label="Billed share (%)">
              <input className="field" type="number" min={0} max={100} value={billedPct}
                onChange={e => set({ offlineBillPercent: 100 - Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
            </Field>
            <Field label="Order date"><input className="field" type="date" value={form.orderDate} onChange={e => set({ orderDate: e.target.value })} /></Field>
            <Field label="Delivery date"><input className="field" type="date" value={form.expectedDeliveryDate} onChange={e => set({ expectedDeliveryDate: e.target.value })} /></Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Items</h3>
              <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => set({ products: [...form.products, emptyLine()] })}>Add line</Button>
            </div>
            <div className="space-y-3">
              {form.products.map((l, i) => (
                <div key={i} className="rounded-lg border border-line p-3">
                  <div className="flex gap-2">
                    <select className="field flex-1" value={productIdFor(l)} onChange={e => pickProduct(i, Number(e.target.value))}>
                      <option value={0}>Select product…</option>
                      {products.map(p => <option key={p.productId} value={p.productId}>{p.productName}</option>)}
                    </select>
                    <select className="field w-[84px]" value={l.quantityUnit} onChange={e => setLine(i, e.target.value === 'pc'
                      ? { quantityUnit: 'pc', quantityKg: 0, rateDifference: 0 } : { quantityUnit: 'kg', quantityPc: 0 })}>
                      <option value="kg">kg</option><option value="pc">pc</option>
                    </select>
                    <Button variant="ghost" icon={<Trash2 size={15} />} disabled={form.products.length === 1}
                      onClick={() => set({ products: form.products.filter((_, idx) => idx !== i) })} />
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    <Field label={l.quantityUnit === 'pc' ? 'Pieces' : 'Kg'}>
                      <input className="field" type="number" value={(l.quantityUnit === 'pc' ? l.quantityPc : l.quantityKg) || ''}
                        onChange={e => setLine(i, l.quantityUnit === 'pc' ? { quantityPc: Number(e.target.value) } : { quantityKg: Number(e.target.value) })} />
                    </Field>
                    <Field label={l.quantityUnit === 'pc' ? 'Rate / pc' : 'Market rate'}>
                      <input className="field" type="number" value={l.marketRate || ''} onChange={e => setLine(i, { marketRate: Number(e.target.value) })} />
                    </Field>
                    <Field label="Rate diff.">
                      <input className="field" type="number" disabled={l.quantityUnit === 'pc'} value={l.rateDifference || ''} onChange={e => setLine(i, { rateDifference: Number(e.target.value) })} />
                    </Field>
                    <Field label="Amount"><div className="flex h-[38px] items-center font-semibold">{inr(l.totalAmount)}</div></Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Transport (₹)"><input className="field" type="number" value={form.transport || ''} onChange={e => set({ transport: Number(e.target.value) })} /></Field>
            <Field label="Note"><input className="field" value={form.note || ''} onChange={e => set({ note: e.target.value })} /></Field>
          </div>

          <div className="rounded-lg bg-muted p-4 text-[13px]">
            {[
              ['Items total', form.productsTotal],
              [`Billed (${billedPct}%)`, form.officialBillAmount],
              ['GST 18% on billed', form.gst],
              [`Cash (${100 - billedPct}%)`, form.offlineTotal || 0],
              ['Transport', form.transport || 0],
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between py-0.5"><span className="text-ink-2">{l}</span><span className="tabular-nums">{inr(v as number)}</span></div>
            ))}
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-[15px] font-semibold"><span>Grand total</span><span>{inr(form.grandTotal)}</span></div>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default OrderForm;
