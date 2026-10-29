import React, { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Trash2, Truck, Undo2 } from 'lucide-react';
import { ordersApi } from '../../../api/orders';
import type { Order, OrderStatus } from '../../../types';
import {
  Badge, Button, Card, Confirm, DataTable, Drawer, ErrorNote, PageHeader, SearchBox, Spinner, Stat, fmtDate, inr, num, toast, useAsync,
} from '../../ui';
import DispatchForm from './DispatchForm';
import OrderForm from './OrderForm';
import { ORDER_STATUS, UnitBadge, UnitTabs, fetchAllPages, floorsFor, orderNo, useUnit, type Floor } from './shared';

type Row = Order & { floor: Floor };

const Orders: React.FC = () => {
  const [unit, setUnit] = useUnit();
  const q = useAsync(async () => {
    const perFloor = await Promise.all(floorsFor(unit).map(floor =>
      fetchAllPages(page => ordersApi.getOrderList({ floor, page, size: 100 }))
        .then(list => list.map(o => ({ ...o, floor: (o.orderFloor as Floor) || floor }))),
    ));
    return perFloor.flat().sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.id - a.id);
  }, [unit]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [form, setForm] = useState<{ order: Order | null } | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [dispatch, setDispatch] = useState<{ order: Order; mode: 'dispatch' | 'revoke' } | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const all = q.data || [];
  const rows = useMemo(() => all.filter(o =>
    (!status || o.orderStatus === status) &&
    `${o.party?.name || o.customerName || ''} ${orderNo(o.id)} ${o.note || ''}`.toLowerCase().includes(search.toLowerCase()),
  ), [all, status, search]);

  const count = (s: OrderStatus) => all.filter(o => o.orderStatus === s).length;
  const refresh = () => { q.reload(); setViewing(null); };

  const setOrderStatus = async (o: Row, s: OrderStatus) => {
    try {
      await ordersApi.updateOrderStatus(o.id, s);
      toast.ok(`Marked ${ORDER_STATUS[s].label.toLowerCase()}`);
      refresh();
    } catch {
      toast.err('Could not update the status');
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await ordersApi.deleteOrder(deleting.id);
      toast.ok('Order deleted');
      setDeleting(null);
      refresh();
    } catch {
      toast.err('Could not delete the order');
    } finally {
      setBusy(false);
    }
  };

  const actions = (o: Row) => (
    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
      <Button size="sm" variant="ghost" title="View" icon={<Eye size={14} />} onClick={() => setViewing(o)} />
      {o.orderStatus !== 'DISPATCHED' && o.orderStatus !== 'REVOKED' && (
        <Button size="sm" variant="ghost" title="Dispatch" icon={<Truck size={14} />} onClick={() => setDispatch({ order: o, mode: 'dispatch' })} />
      )}
      {o.orderStatus === 'DISPATCHED' && (
        <Button size="sm" variant="ghost" title="Revoke dispatch" icon={<Undo2 size={14} />} onClick={() => setDispatch({ order: o, mode: 'revoke' })} />
      )}
      <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={() => setForm({ order: o })} />
      <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(o)} />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Sales orders across both units."
        actions={<Button icon={<Plus size={16} />} onClick={() => setForm({ order: null })}>New order</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Orders" value={num(all.length)} hint={inr(all.reduce((s, o) => s + (o.grandTotal || 0), 0))} />
        <Stat label="Pending" value={count('PENDING')} />
        <Stat label="Ready to dispatch" value={count('COMPLETED')} />
        <Stat label="Dispatched" value={count('DISPATCHED')} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <UnitTabs value={unit} onChange={setUnit} />
          <select className="field max-w-[170px]" value={status} onChange={e => setStatus(e.target.value as OrderStatus | '')}>
            <option value="">All statuses</option>
            {(Object.keys(ORDER_STATUS) as OrderStatus[]).map(s => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
          </select>
          <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search party or order no." /></div>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            onRowClick={setViewing}
            columns={[
              { key: 'no', header: 'Order', render: o => <><div className="font-medium">{orderNo(o.id)}</div><div className="text-[12px] text-ink-3">{fmtDate(o.orderDate)}</div></> },
              { key: 'p', header: 'Party', render: o => o.party?.name || o.customerName || '—' },
              { key: 'u', header: 'Unit', render: o => <UnitBadge floor={o.floor} /> },
              { key: 'd', header: 'Delivery', render: o => fmtDate(o.expectedDeliveryDate) },
              { key: 'i', header: 'Items', align: 'right', render: o => o.products?.length || 0 },
              { key: 't', header: 'Total', align: 'right', render: o => <span className="font-semibold">{inr(o.grandTotal)}</span> },
              { key: 's', header: 'Status', render: o => <Badge tone={ORDER_STATUS[o.orderStatus]?.tone}>{ORDER_STATUS[o.orderStatus]?.label ?? o.orderStatus}</Badge> },
              { key: 'a', header: '', align: 'right', render: actions },
            ]}
          />
        )}
      </Card>

      <Drawer
        open={!!viewing}
        wide
        title={viewing ? `${orderNo(viewing.id)} · ${viewing.party?.name || viewing.customerName || ''}` : ''}
        onClose={() => setViewing(null)}
        footer={viewing && <>
          {viewing.orderStatus === 'PENDING' && <Button variant="outline" onClick={() => setOrderStatus(viewing, 'COMPLETED')}>Mark ready</Button>}
          {viewing.orderStatus === 'COMPLETED' && <Button variant="outline" onClick={() => setOrderStatus(viewing, 'PENDING')}>Back to pending</Button>}
          {viewing.orderStatus !== 'DISPATCHED' && viewing.orderStatus !== 'REVOKED' && (
            <Button icon={<Truck size={15} />} onClick={() => setDispatch({ order: viewing, mode: 'dispatch' })}>Dispatch</Button>
          )}
          {viewing.orderStatus === 'DISPATCHED' && (
            <Button variant="outline" icon={<Undo2 size={15} />} onClick={() => setDispatch({ order: viewing, mode: 'revoke' })}>Revoke dispatch</Button>
          )}
        </>}
      >
        {viewing && (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge tone={ORDER_STATUS[viewing.orderStatus]?.tone}>{ORDER_STATUS[viewing.orderStatus]?.label}</Badge>
              <UnitBadge floor={viewing.floor} />
              <Badge>Ordered {fmtDate(viewing.orderDate)}</Badge>
              <Badge>Delivery {fmtDate(viewing.expectedDeliveryDate)}</Badge>
            </div>
            <table className="mb-5 text-left">
              <thead>
                <tr className="border-b border-line text-[12px] uppercase tracking-wide text-ink-3">
                  <th className="py-2 font-medium">Item</th><th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Rate</th><th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {viewing.products?.map(p => (
                  <tr key={p.id} className="border-b border-line">
                    <td className="py-2">{p.productName}</td>
                    <td className="py-2 text-right tabular-nums">{p.quantityPc ? `${num(p.quantityPc)} pc` : `${num(p.quantityKg, 2)} kg`}</td>
                    <td className="py-2 text-right tabular-nums">{inr(p.marketRate + (p.rateDifference || 0))}</td>
                    <td className="py-2 text-right tabular-nums">{inr(p.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ml-auto max-w-xs text-[13px]">
              {[['Items total', viewing.productsTotal], ['Billed', viewing.officialBillAmount], ['GST', viewing.gst], ['Cash', viewing.offlineTotal || 0], ['Transport', viewing.transport || 0]]
                .map(([l, v]) => <div key={l as string} className="flex justify-between py-0.5"><span className="text-ink-2">{l}</span><span className="tabular-nums">{inr(v as number)}</span></div>)}
              <div className="mt-2 flex justify-between border-t border-line pt-2 text-[15px] font-semibold"><span>Grand total</span><span>{inr(viewing.grandTotal)}</span></div>
            </div>
            {viewing.note && <p className="mt-5 rounded-lg bg-muted p-3 text-ink-2">{viewing.note}</p>}
          </>
        )}
      </Drawer>

      <OrderForm
        open={!!form}
        order={form?.order ?? null}
        defaultFloor={unit === 'ALL' ? 'GROUND_FLOOR' : unit}
        onClose={() => setForm(null)}
        onSaved={() => { setForm(null); refresh(); }}
      />
      <DispatchForm order={dispatch?.order ?? null} mode={dispatch?.mode ?? 'dispatch'} onClose={() => setDispatch(null)} onDone={() => { setDispatch(null); refresh(); }} />
      <Confirm open={!!deleting} title="Delete order?" message={`${deleting ? orderNo(deleting.id) : ''} will be removed permanently.`}
        busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Orders;
