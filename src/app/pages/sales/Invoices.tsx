import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, RotateCcw, Trash2 } from 'lucide-react';
import { invoiceApi } from '../../../api/invoice';
import type { Invoice, InvoiceStatus } from '../../../types';
import { BillingType } from '../../../types';
import { Badge, Button, Card, Confirm, DataTable, ErrorNote, PageHeader, SearchBox, Spinner, Stat, Tabs, fmtDate, inr, num, toast, useAsync } from '../../ui';
import { UnitBadge, UnitTabs, downloadBlob, fetchAllPages, floorsFor, orderNo, useUnit, type Floor } from './shared';

type Mode = typeof BillingType[keyof typeof BillingType];
type Row = Invoice & { floor: Floor };

/** Amount on this invoice: billed invoices carry GST, cash invoices don't. */
const amountOf = (inv: Invoice, mode: Mode) =>
  mode === BillingType.OFFICIAL ? (inv.order.officialBillAmount || 0) + (inv.order.gst || 0) : inv.order.offlineTotal || 0;

const Invoices: React.FC = () => {
  const [unit, setUnit] = useUnit();
  const [mode, setMode] = useState<Mode>(BillingType.OFFICIAL);
  const q = useAsync(async () => {
    const perFloor = await Promise.all(floorsFor(unit).map(floor =>
      fetchAllPages(page => invoiceApi.getInvoiceList({ floor, mode, page, size: 100 }))
        .then(list => list.map(i => ({ ...i, floor: (i.floorEnum as Floor) || floor }))),
    ));
    return perFloor.flat().sort((a, b) => (b.order?.orderDate || '').localeCompare(a.order?.orderDate || '') || b.id - a.id);
  }, [unit, mode]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const all = q.data || [];
  const rows = useMemo(() => all.filter(i =>
    (!status || i.invoiceStatus === status) &&
    `${i.order?.party?.name || i.order?.customerName || ''} INV-${i.id} ${orderNo(i.order?.id || 0)}`.toLowerCase().includes(search.toLowerCase()),
  ), [all, status, search]);

  const total = all.reduce((s, i) => s + amountOf(i, mode), 0);
  const pending = all.filter(i => i.invoiceStatus === 'PENDING');

  const toggleStatus = async (inv: Row) => {
    const next: InvoiceStatus = inv.invoiceStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';
    setBusy(inv.id);
    try {
      await invoiceApi.updateInvoiceStatus(inv.id, next);
      toast.ok(next === 'COMPLETED' ? 'Invoice marked completed' : 'Invoice reopened');
      q.reload();
    } catch {
      toast.err('Could not update the invoice');
    } finally {
      setBusy(null);
    }
  };

  const pdf = async (inv: Row) => {
    setBusy(inv.id);
    try {
      downloadBlob(await invoiceApi.downloadInvoicePdf(inv.id), `invoice-${inv.id}.pdf`);
    } catch {
      toast.err('Could not download the PDF');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(deleting.id);
    try {
      await invoiceApi.deleteInvoice(deleting.id);
      toast.ok('Invoice deleted');
      setDeleting(null);
      q.reload();
    } catch {
      toast.err('Could not delete the invoice');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Created automatically from orders."
        actions={<Tabs value={mode} onChange={m => setMode(m as Mode)} tabs={[{ id: BillingType.OFFICIAL, label: 'GST bills' }, { id: BillingType.OFFLINE, label: 'Cash bills' }]} />}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Invoices" value={num(all.length)} />
        <Stat label="Billed value" value={inr(total)} hint={mode === BillingType.OFFICIAL ? 'Including GST' : 'Without GST'} />
        <Stat label="Pending" value={pending.length} hint={inr(pending.reduce((s, i) => s + amountOf(i, mode), 0))} />
        <Stat label="Completed" value={all.length - pending.length} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <UnitTabs value={unit} onChange={setUnit} />
          <select className="field max-w-[160px]" value={status} onChange={e => setStatus(e.target.value as InvoiceStatus | '')}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search party or number" /></div>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            columns={[
              { key: 'n', header: 'Invoice', render: i => <><div className="font-medium">INV-{String(i.id).padStart(5, '0')}</div><div className="text-[12px] text-ink-3">{orderNo(i.order?.id || 0)}</div></> },
              { key: 'p', header: 'Party', render: i => i.order?.party?.name || i.order?.customerName || '—' },
              { key: 'd', header: 'Date', render: i => fmtDate(i.order?.orderDate) },
              { key: 'u', header: 'Unit', render: i => <UnitBadge floor={i.floor} /> },
              ...(mode === BillingType.OFFICIAL ? [
                { key: 'b', header: 'Taxable', align: 'right' as const, render: (i: Row) => inr(i.order?.officialBillAmount) },
                { key: 'g', header: 'GST', align: 'right' as const, render: (i: Row) => inr(i.order?.gst) },
              ] : []),
              { key: 't', header: 'Amount', align: 'right', render: i => <span className="font-semibold">{inr(amountOf(i, mode))}</span> },
              { key: 's', header: 'Status', render: i => <Badge tone={i.invoiceStatus === 'COMPLETED' ? 'green' : 'amber'}>{i.invoiceStatus === 'COMPLETED' ? 'Completed' : 'Pending'}</Badge> },
              {
                key: 'a', header: '', align: 'right', render: i => (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" title={i.invoiceStatus === 'PENDING' ? 'Mark completed' : 'Reopen'} disabled={busy === i.id}
                      icon={i.invoiceStatus === 'PENDING' ? <CheckCircle2 size={14} /> : <RotateCcw size={14} />} onClick={() => toggleStatus(i)} />
                    <Button size="sm" variant="ghost" title="Download PDF" disabled={busy === i.id} icon={<Download size={14} />} onClick={() => pdf(i)} />
                    <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(i)} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Confirm open={!!deleting} title="Delete invoice?" message={`INV-${deleting?.id} will be removed permanently.`}
        busy={busy === deleting?.id} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Invoices;
