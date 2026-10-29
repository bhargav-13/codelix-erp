import React, { useEffect, useState } from 'react';
import { ordersApi } from '../../../api/orders';
import { stockItemApi } from '../../../api/inventory';
import type { DispatchItem, Order, StockItem } from '../../../types';
import { Button, Drawer, Field, Spinner, num, toast } from '../../ui';
import { UNIT_LABEL, orderNo, type Floor } from './shared';

interface Line { stockItemId: number; qty: number; byPc: boolean; name: string; ordered: number }

/**
 * Dispatch takes stock out of inventory for each order line; revoke puts it back.
 * One stock source per line (the original screen allowed splitting, rarely used).
 */
const DispatchForm: React.FC<{ order: Order | null; mode: 'dispatch' | 'revoke'; onClose: () => void; onDone: () => void }> = ({
  order, mode, onClose, onDone,
}) => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!order) return;
    setLoading(true);
    stockItemApi.getAllStockItems()
      .then(setStock)
      .catch(() => toast.err('Could not load stock'))
      .finally(() => setLoading(false));
    setLines(order.products.map(p => {
      const byPc = !!p.quantityPc && !p.quantityKg;
      const ordered = (byPc ? p.quantityPc : p.quantityKg) || 0;
      return { stockItemId: p.itemId, qty: ordered, byPc, name: p.productName, ordered };
    }));
  }, [order]);

  if (!order) return null;
  const revoke = mode === 'revoke';

  const submit = async () => {
    const items: DispatchItem[] = lines
      .filter(l => l.stockItemId && l.qty > 0)
      .map(l => (l.byPc ? { itemId: l.stockItemId, quantityPc: l.qty } : { itemId: l.stockItemId, quantityKg: l.qty }));
    if (!items.length) { toast.err('Nothing selected'); return; }
    setSaving(true);
    try {
      if (revoke) await ordersApi.revokeDispatch(order.id, { items });
      else await ordersApi.dispatchOrder(order.id, { items });
      toast.ok(revoke ? 'Dispatch revoked, stock returned' : 'Order dispatched');
      onDone();
    } catch {
      toast.err(revoke ? 'Could not revoke the dispatch' : 'Could not dispatch — check stock levels');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      title={`${revoke ? 'Revoke dispatch' : 'Dispatch'} · ${orderNo(order.id)}`}
      onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant={revoke ? 'danger' : 'primary'} loading={saving} onClick={submit}>{revoke ? 'Revoke' : 'Dispatch'}</Button></>}
    >
      {loading ? <Spinner /> : (
        <div className="space-y-4">
          <p className="text-ink-2">{revoke ? 'Stock will be added back to these items.' : 'Stock will be reduced from these items.'}</p>
          {lines.map((l, i) => {
            const options = stock.filter(s => s.product.productName === l.name || s.stockItemId === l.stockItemId);
            const pick = stock.find(s => s.stockItemId === l.stockItemId);
            const available = pick ? (l.byPc ? pick.quantityInPc : pick.quantityInKg) : 0;
            return (
              <div key={i} className="rounded-lg border border-line p-3">
                <div className="mb-2 flex justify-between">
                  <span className="font-medium">{l.name}</span>
                  <span className="text-[13px] text-ink-3">Ordered {num(l.ordered, 2)} {l.byPc ? 'pc' : 'kg'}</span>
                </div>
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <Field label="From stock">
                    <select className="field" value={l.stockItemId}
                      onChange={e => setLines(ls => ls.map((x, idx) => (idx === i ? { ...x, stockItemId: Number(e.target.value) } : x)))}>
                      {(options.length ? options : stock).map(s => (
                        <option key={s.stockItemId} value={s.stockItemId}>
                          {s.product.productName} · {UNIT_LABEL[s.inventoryFloor as Floor] ?? '—'} · {num(l.byPc ? s.quantityInPc : s.quantityInKg, 2)} {l.byPc ? 'pc' : 'kg'}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={l.byPc ? 'Pieces' : 'Kg'}>
                    <input className="field" type="number" value={l.qty}
                      onChange={e => setLines(ls => ls.map((x, idx) => (idx === i ? { ...x, qty: Number(e.target.value) } : x)))} />
                  </Field>
                </div>
                {!revoke && pick && l.qty > available && (
                  <div className="mt-2 text-[12px] text-amber-700">Only {num(available, 2)} in stock.</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
};

export default DispatchForm;
