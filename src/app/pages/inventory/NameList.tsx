import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { categoryApi, productApi, stockItemApi } from '../../../api/inventory';
import { Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, toast, useAsync } from '../../ui';

interface Item { id: number; name: string }

interface Config {
  title: string;
  subtitle: string;
  noun: string;
  list: () => Promise<Item[]>;
  create: (name: string) => Promise<unknown>;
  update: (id: number, name: string) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  /** How many stock items use each id, for the "In stock" column. */
  usage: () => Promise<Map<number, number>>;
}

/** One screen shape for simple name masters (products, categories). */
const NameList: React.FC<{ config: Config }> = ({ config }) => {
  const q = useAsync(async () => {
    const [items, usage] = await Promise.all([config.list(), config.usage().catch(() => new Map<number, number>())]);
    return { items: items.sort((a, b) => a.name.localeCompare(b.name)), usage };
  }, [config]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => (q.data?.items || []).filter(i => i.name.toLowerCase().includes(search.toLowerCase())), [q.data, search]);

  const save = async () => {
    if (!name.trim()) { toast.err('Name is required'); return; }
    setBusy(true);
    try {
      if (editing === 'new') await config.create(name.trim());
      else if (editing) await config.update(editing.id, name.trim());
      toast.ok(`${config.noun} saved`);
      setEditing(null);
      q.reload();
    } catch {
      toast.err(`Could not save the ${config.noun.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await config.remove(deleting.id);
      toast.ok(`${config.noun} deleted`);
      setDeleting(null);
      q.reload();
    } catch {
      toast.err(`Could not delete — the ${config.noun.toLowerCase()} is in use`);
    } finally {
      setBusy(false);
    }
  };

  const open = (i: Item | 'new') => { setEditing(i); setName(i === 'new' ? '' : i.name); };

  return (
    <>
      <PageHeader title={config.title} subtitle={q.data ? `${q.data.items.length} ${config.subtitle}` : config.subtitle}
        actions={<Button icon={<Plus size={16} />} onClick={() => open('new')}>Add {config.noun.toLowerCase()}</Button>} />
      <Card className="max-w-3xl">
        <div className="border-b border-line p-4"><SearchBox value={search} onChange={setSearch} /></div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            pageSize={20}
            onRowClick={open}
            columns={[
              { key: 'n', header: 'Name', render: i => <span className="font-medium">{i.name}</span> },
              { key: 'u', header: 'Stock items', align: 'right', render: i => q.data?.usage.get(i.id) ?? 0 },
              {
                key: 'a', header: '', align: 'right', render: i => (
                  <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" title="Rename" icon={<Pencil size={14} />} onClick={() => open(i)} />
                    <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(i)} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
      <Drawer open={editing !== null} title={editing === 'new' ? `Add ${config.noun.toLowerCase()}` : `Rename ${config.noun.toLowerCase()}`}
        onClose={() => setEditing(null)}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        <Field label="Name"><input className="field" autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} /></Field>
      </Drawer>
      <Confirm open={!!deleting} title={`Delete ${config.noun.toLowerCase()}?`} message={`${deleting?.name} will be removed.`}
        busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

const countBy = (ids: number[]) => ids.reduce((m, id) => m.set(id, (m.get(id) || 0) + 1), new Map<number, number>());

const PRODUCTS: Config = {
  title: 'Products', subtitle: 'products', noun: 'Product',
  list: () => productApi.getProducts().then(ps => ps.map(p => ({ id: p.productId, name: p.productName }))),
  create: name => productApi.createProduct({ productName: name }),
  update: (id, name) => productApi.updateProduct(id, { productName: name }),
  remove: id => productApi.deleteProduct(id),
  usage: () => stockItemApi.getAllStockItems().then(s => countBy(s.map(i => i.product.productId))),
};

const CATEGORIES: Config = {
  title: 'Categories', subtitle: 'categories', noun: 'Category',
  list: () => categoryApi.getCategories().then(cs => cs.map(c => ({ id: c.categoryId, name: c.categoryName }))),
  create: name => categoryApi.createCategory({ categoryName: name }),
  update: (id, name) => categoryApi.updateCategory(id, { categoryName: name }),
  remove: id => categoryApi.deleteCategory(id),
  usage: () => stockItemApi.getAllStockItems().then(s => countBy(s.map(i => i.category?.categoryId))),
};

export const Products: React.FC = () => <NameList config={PRODUCTS} />;
export const Categories: React.FC = () => <NameList config={CATEGORIES} />;
