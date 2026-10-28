import React, { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { partyApi } from '../../api/party';
import type { OrderByPartyResponse, Party } from '../../types';
import {
  Badge, Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, fmtDate, inr, toast, useAsync,
} from '../ui';

type Form = { name: string; officialAmount: string; offlineAmount: string };
const EMPTY: Form = { name: '', officialAmount: '0', offlineAmount: '0' };

/** Live module — reads and writes parties on the 4bitx backend. */
const Parties: React.FC = () => {
  const list = useAsync(() => partyApi.getAllParties(), []);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Party | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Party | null>(null);
  const [viewing, setViewing] = useState<Party | null>(null);
  const orders = useAsync<OrderByPartyResponse | null>(
    () => (viewing ? partyApi.getOrdersByPartyName(viewing.name) : Promise.resolve(null)),
    [viewing?.partyId],
  );

  const rows = useMemo(
    () => (list.data || []).filter(p => p.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)),
    [list.data, search],
  );
  const totalDue = rows.reduce((s, p) => s + p.officialAmount + p.offlineAmount, 0);

  const openForm = (p: Party | 'new') => {
    setEditing(p);
    setForm(p === 'new' ? EMPTY : { name: p.name, officialAmount: String(p.officialAmount), offlineAmount: String(p.offlineAmount) });
  };

  const save = async () => {
    if (!form.name.trim()) { toast.err('Party name is required'); return; }
    const body = { name: form.name.trim(), officialAmount: Number(form.officialAmount) || 0, offlineAmount: Number(form.offlineAmount) || 0 };
    setSaving(true);
    try {
      if (editing === 'new') await partyApi.createParty(body);
      else if (editing) await partyApi.updateParty(editing.partyId, body);
      toast.ok(editing === 'new' ? 'Party added' : 'Party updated');
      setEditing(null);
      list.reload();
    } catch {
      toast.err('Could not save the party');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await partyApi.deleteParty(deleting.partyId);
      toast.ok('Party deleted');
      setDeleting(null);
      list.reload();
    } catch {
      toast.err('Could not delete — the party may have orders');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async (p: Party) => {
    try {
      const blob = await partyApi.downloadPartyPdf(p.name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${p.name}-statement.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.err('Could not download the statement');
    }
  };

  return (
    <>
      <PageHeader
        title="Parties"
        subtitle={list.data ? `${rows.length} parties · ${inr(totalDue)} opening balance` : 'Customers and their balances'}
        actions={<Button icon={<Plus size={16} />} onClick={() => openForm('new')}>Add party</Button>}
      />
      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Search parties" />
        </div>
        {list.loading ? <Spinner /> : list.error ? <ErrorNote error={list.error} onRetry={list.reload} /> : (
          <DataTable
            rows={rows}
            onRowClick={setViewing}
            columns={[
              { key: 'name', header: 'Party', render: p => <span className="font-medium">{p.name}</span> },
              { key: 'off', header: 'Billed balance', align: 'right', render: p => inr(p.officialAmount) },
              { key: 'cash', header: 'Cash balance', align: 'right', render: p => inr(p.offlineAmount) },
              { key: 'total', header: 'Total', align: 'right', render: p => <span className="font-semibold">{inr(p.officialAmount + p.offlineAmount)}</span> },
              {
                key: 'act', header: '', align: 'right', render: p => (
                  <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => openForm(p)} />
                    <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setDeleting(p)} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Drawer
        open={editing !== null}
        title={editing === 'new' ? 'Add party' : 'Edit party'}
        onClose={() => setEditing(null)}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}
      >
        <div className="space-y-4">
          <Field label="Party name"><input className="field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Opening billed balance (₹)"><input className="field" type="number" value={form.officialAmount} onChange={e => setForm({ ...form, officialAmount: e.target.value })} /></Field>
          <Field label="Opening cash balance (₹)"><input className="field" type="number" value={form.offlineAmount} onChange={e => setForm({ ...form, offlineAmount: e.target.value })} /></Field>
        </div>
      </Drawer>

      <Drawer
        open={!!viewing}
        title={viewing?.name || ''}
        onClose={() => setViewing(null)}
        wide
        footer={viewing && <Button variant="outline" icon={<Download size={15} />} onClick={() => downloadPdf(viewing)}>Statement PDF</Button>}
      >
        {viewing && (
          <>
            <div className="mb-5 grid grid-cols-3 gap-3">
              {[['Billed', viewing.officialAmount], ['Cash', viewing.offlineAmount], ['Total', viewing.officialAmount + viewing.offlineAmount]].map(([l, v]) => (
                <div key={l as string} className="rounded-lg bg-muted p-3">
                  <div className="text-[12px] text-ink-3">{l} balance</div>
                  <div className="mt-1 font-semibold">{inr(v as number)}</div>
                </div>
              ))}
            </div>
            <h3 className="mb-2 font-semibold">Orders</h3>
            {orders.loading ? <Spinner /> : (
              <DataTable
                rows={orders.data?.orders || []}
                pageSize={8}
                columns={[
                  { key: 'd', header: 'Date', render: o => fmtDate(o.orderDate) },
                  { key: 'inv', header: 'Invoice', render: o => <Badge>#{o.officialInvoiceId || o.offlineInvoiceId || '—'}</Badge> },
                  { key: 'b', header: 'Billed', align: 'right', render: o => inr(o.officialTotalAmount) },
                  { key: 'c', header: 'Cash', align: 'right', render: o => inr(o.offlineTotalAmount) },
                ]}
              />
            )}
          </>
        )}
      </Drawer>

      <Confirm
        open={!!deleting}
        title="Delete party?"
        message={`${deleting?.name} will be removed permanently.`}
        busy={saving}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default Parties;
