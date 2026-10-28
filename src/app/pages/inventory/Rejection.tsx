import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { stockItemApi } from '../../../api/inventory';
import { purchasePartyApi } from '../../../api/purchaseParty';
import { rejectionApi } from '../../../api/rejection';
import type { PurchaseParty, RejectionRequest, RejectionResponse, StockItem } from '../../../types';
import {
  Badge, Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, Stat, Tabs, fmtDate, inr, num, toast, useAsync,
} from '../../ui';
import { UNIT_LABEL, fetchAllPages, today, type Floor } from '../sales/shared';
import { n } from './shared';

type ReturnType = RejectionRequest['returnType'];
const blank = (): RejectionRequest => ({ partyId: 0, date: today(), weight: 0, returnType: 'CASH' });

/**
 * Rejected material going back to a supplier. It is settled either in cash
 * (an amount) or in goods ("maal") taken from a stock item.
 */
const Rejection: React.FC = () => {
  const q = useAsync(async () => {
    const [rows, parties] = await Promise.all([
      fetchAllPages(page => rejectionApi.getRejections(page, 100)),
      purchasePartyApi.getAll(),
    ]);
    return { rows: rows.sort((a, b) => b.date.localeCompare(a.date) || b.rejectionId - a.rejectionId), parties };
  }, []);
  const [tab, setTab] = useState<'ALL' | ReturnType>('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RejectionResponse | 'new' | null>(null);
  const [form, setForm] = useState<RejectionRequest>(blank());
  const [stock, setStock] = useState<StockItem[]>([]);
  const [deleting, setDeleting] = useState<RejectionResponse | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pdf, setPdf] = useState({ partyId: 0, from: '', to: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing && !stock.length) stockItemApi.getAllStockItems().then(setStock).catch(() => {});
  }, [editing, stock.length]);

  const all = q.data?.rows || [];
  const parties: PurchaseParty[] = q.data?.parties || [];
  const rows = useMemo(() => all.filter(r =>
    (tab === 'ALL' || r.returnType === tab) && `${r.party?.name || ''}`.toLowerCase().includes(search.toLowerCase()),
  ), [all, tab, search]);

  const open = (r: RejectionResponse | 'new') => {
    setEditing(r);
    setForm(r === 'new' ? blank() : {
      partyId: r.party?.id || 0, date: r.date, weight: r.weight, returnType: r.returnType,
      amount: r.amount, stockItemId: r.stockItem?.stockItemId, returnQty: r.returnQty,
    });
  };

  const save = async () => {
    if (!form.partyId || !form.date || !(form.weight > 0)) { toast.err('Supplier, date and rejected weight are required'); return; }
    if (form.returnType === 'CASH' && !(Number(form.amount) > 0)) { toast.err('Enter the cash amount'); return; }
    if (form.returnType === 'MAAL' && (!form.stockItemId || !(Number(form.returnQty) > 0))) { toast.err('Choose the stock item and quantity returned'); return; }
    const payload: RejectionRequest = {
      partyId: form.partyId, date: form.date, weight: form.weight, returnType: form.returnType,
      ...(form.returnType === 'CASH' ? { amount: form.amount } : { stockItemId: form.stockItemId, returnQty: form.returnQty }),
    };
    setBusy(true);
    try {
      if (editing === 'new') await rejectionApi.createRejection(payload);
      else if (editing) await rejectionApi.updateRejection(editing.rejectionId, payload);
      toast.ok('Rejection saved');
      setEditing(null);
      q.reload();
    } catch {
      toast.err('Could not save the rejection');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await rejectionApi.deleteRejection(deleting.rejectionId);
      toast.ok('Rejection deleted');
      setDeleting(null);
      q.reload();
    } catch {
      toast.err('Could not delete the rejection');
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      await rejectionApi.exportPdf({ partyId: pdf.partyId || undefined, fromDate: pdf.from || undefined, toDate: pdf.to || undefined });
    } catch {
      toast.err('Could not export the PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader title="Rejection" subtitle="Rejected material returned to suppliers."
        actions={<Button icon={<Plus size={16} />} onClick={() => open('new')}>New rejection</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Entries" value={num(all.length)} />
        <Stat label="Rejected weight" value={`${num(all.reduce((s, r) => s + (r.weight || 0), 0), 1)} kg`} />
        <Stat label="Settled in cash" value={inr(all.reduce((s, r) => s + (r.returnType === 'CASH' ? r.amount || 0 : 0), 0))} />
        <Stat label="Settled in goods" value={`${num(all.reduce((s, r) => s + (r.returnType === 'MAAL' ? r.returnQty || 0 : 0), 0), 1)} kg`} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Tabs value={tab} onChange={t => setTab(t as 'ALL' | ReturnType)} tabs={[{ id: 'ALL', label: 'All' }, { id: 'CASH', label: 'Cash' }, { id: 'MAAL', label: 'Goods' }]} />
          <SearchBox value={search} onChange={setSearch} placeholder="Search supplier" />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select className="field h-8 w-[150px]" value={pdf.partyId} onChange={e => setPdf({ ...pdf, partyId: Number(e.target.value) })}>
              <option value={0}>All suppliers</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" className="field h-8 w-[140px]" value={pdf.from} onChange={e => setPdf({ ...pdf, from: e.target.value })} />
            <input type="date" className="field h-8 w-[140px]" value={pdf.to} onChange={e => setPdf({ ...pdf, to: e.target.value })} />
            <Button size="sm" variant="outline" icon={<FileDown size={14} />} loading={exporting} onClick={exportPdf}>PDF</Button>
          </div>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            onRowClick={open}
            columns={[
              { key: 'd', header: 'Date', render: r => fmtDate(r.date) },
              { key: 'p', header: 'Supplier', render: r => <span className="font-medium">{r.party?.name || '—'}</span> },
              { key: 'w', header: 'Rejected', align: 'right', render: r => `${num(r.weight, 2)} kg` },
              { key: 't', header: 'Settled by', render: r => <Badge tone={r.returnType === 'CASH' ? 'blue' : 'accent'}>{r.returnType === 'CASH' ? 'Cash' : 'Goods'}</Badge> },
              {
                key: 'v', header: 'Settlement', align: 'right', render: r => r.returnType === 'CASH'
                  ? inr(r.amount)
                  : `${num(r.returnQty, 2)} kg ${r.stockItem ? `· ${r.stockItem.product?.productName}` : ''}`,
              },
              {
                key: 'a', header: '', align: 'right', render: r => (
                  <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={() => open(r)} />
                    <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(r)} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Drawer open={editing !== null} title={editing === 'new' ? 'New rejection' : 'Edit rejection'} onClose={() => setEditing(null)}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        <div className="space-y-4">
          <Field label="Supplier">
            <select className="field" value={form.partyId} onChange={e => setForm({ ...form, partyId: Number(e.target.value) })}>
              <option value={0}>Select supplier…</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date"><input type="date" className="field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Rejected weight (kg)"><input type="number" className="field" value={form.weight || ''} onChange={e => setForm({ ...form, weight: n(e.target.value) })} /></Field>
          </div>
          <Field label="Settled by">
            <Tabs value={form.returnType} onChange={t => setForm({ ...form, returnType: t as ReturnType, amount: undefined, stockItemId: undefined, returnQty: undefined })}
              tabs={[{ id: 'CASH', label: 'Cash' }, { id: 'MAAL', label: 'Goods from stock' }]} />
          </Field>
          {form.returnType === 'CASH' ? (
            <Field label="Amount (₹)"><input type="number" className="field" value={form.amount || ''} onChange={e => setForm({ ...form, amount: n(e.target.value) })} /></Field>
          ) : (
            <>
              <Field label="Stock item">
                <select className="field" value={form.stockItemId || 0} onChange={e => setForm({ ...form, stockItemId: Number(e.target.value) })}>
                  <option value={0}>Select stock item…</option>
                  {stock.map(s => (
                    <option key={s.stockItemId} value={s.stockItemId}>
                      {s.product.productName} · {UNIT_LABEL[s.inventoryFloor as Floor] ?? '—'} · {num(s.quantityInKg, 2)} kg
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity returned (kg)"><input type="number" className="field" value={form.returnQty || ''} onChange={e => setForm({ ...form, returnQty: n(e.target.value) })} /></Field>
            </>
          )}
        </div>
      </Drawer>
      <Confirm open={!!deleting} title="Delete rejection?" message="This entry will be removed." busy={busy}
        onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Rejection;
