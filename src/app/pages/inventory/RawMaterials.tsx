import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { productApi, rawItemApi } from '../../../api/inventory';
import type { Product, RawItem, RawItemRequest } from '../../../types';
import { Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, Stat, fmtDate, num, toast, useAsync } from '../../ui';
import { fetchAllPages } from '../sales/shared';
import { SelectWithAdd, StockBadge, n } from './shared';

const isLow = (r: RawItem) => r.status === 'LOW_STOCK';

const RawMaterials: React.FC = () => {
  const q = useAsync(() => fetchAllPages(page => rawItemApi.getRawItems(page, 100))
    .then(list => list.sort((a, b) => a.product.productName.localeCompare(b.product.productName))), []);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<RawItem | 'new' | null>(null);
  const [form, setForm] = useState<RawItemRequest>({ productId: 0, quantityInKg: 0, lowStockAlert: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [deleting, setDeleting] = useState<RawItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) productApi.getProducts().then(setProducts).catch(() => toast.err('Could not load products'));
  }, [editing]);

  const all = q.data || [];
  const rows = useMemo(() => all.filter(r => (!lowOnly || isLow(r)) && r.product.productName.toLowerCase().includes(search.toLowerCase())), [all, lowOnly, search]);

  const open = (r: RawItem | 'new') => {
    setEditing(r);
    setForm(r === 'new' ? { productId: 0, quantityInKg: 0, lowStockAlert: 0 } : { productId: r.product.productId, quantityInKg: r.quantityInKg, lowStockAlert: r.lowStockAlert });
  };

  const save = async () => {
    if (!form.productId) { toast.err('Choose a material'); return; }
    setBusy(true);
    try {
      if (editing === 'new') await rawItemApi.createRawItem(form);
      else if (editing) await rawItemApi.updateRawItem(editing.rawItemId, form);
      toast.ok('Raw material saved');
      setEditing(null);
      q.reload();
    } catch {
      toast.err('Could not save — this material may already exist');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await rawItemApi.deleteRawItem(deleting.rawItemId);
      toast.ok('Raw material deleted');
      setDeleting(null);
      q.reload();
    } catch {
      toast.err('Could not delete the material');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Raw materials" subtitle="Metal and inputs waiting for production."
        actions={<Button icon={<Plus size={16} />} onClick={() => open('new')}>Add material</Button>} />
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Stat label="Materials" value={num(all.length)} />
        <Stat label="Total weight" value={`${num(all.reduce((s, r) => s + (r.quantityInKg || 0), 0), 1)} kg`} />
        <Stat label="Low stock" value={all.filter(isLow).length} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Search material" />
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} /> Low stock only</label>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            onRowClick={open}
            columns={[
              { key: 'p', header: 'Material', render: r => <span className="font-medium">{r.product.productName}</span> },
              { key: 'q', header: 'In stock', align: 'right', render: r => `${num(r.quantityInKg, 2)} kg` },
              { key: 'l', header: 'Alert below', align: 'right', render: r => `${num(r.lowStockAlert)} kg` },
              { key: 's', header: 'Status', render: r => <StockBadge low={isLow(r)} /> },
              { key: 'd', header: 'Updated', render: r => <span className="text-ink-3">{fmtDate(r.lastUpdatedAt)}</span> },
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

      <Drawer open={editing !== null} title={editing === 'new' ? 'Add raw material' : 'Edit raw material'} onClose={() => setEditing(null)}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        <div className="space-y-4">
          <Field label="Material">
            <SelectWithAdd value={form.productId} options={products} getId={p => p.productId} getLabel={p => p.productName}
              onChange={id => setForm(f => ({ ...f, productId: id }))} placeholder="Select material…" noun="Product"
              onCreate={async name => { const p = await productApi.createProduct({ productName: name }); setProducts(ps => [...ps, p]); return p; }} />
          </Field>
          <Field label="Quantity (kg)"><input className="field" type="number" value={form.quantityInKg || ''} onChange={e => setForm(f => ({ ...f, quantityInKg: n(e.target.value) }))} /></Field>
          <Field label="Low-stock alert at (kg)"><input className="field" type="number" value={form.lowStockAlert || ''} onChange={e => setForm(f => ({ ...f, lowStockAlert: n(e.target.value) }))} /></Field>
        </div>
      </Drawer>
      <Confirm open={!!deleting} title="Delete raw material?" message={`${deleting?.product.productName} will be removed.`}
        busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default RawMaterials;
