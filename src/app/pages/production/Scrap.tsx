import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, IndianRupee, Pencil, Plus, Trash2 } from 'lucide-react';
import { jayeshScrapApi, kevinScrapApi, type JayeshScrap, type KevinScrap } from '../../../api/scrap';
import { Badge, Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, SearchBox, Spinner, Stat, Tabs, fmtDate, inr, num, toast, useAsync } from '../../ui';
import { SelectWithAdd, n } from '../inventory/shared';
import { fetchAllPages, today } from '../sales/shared';

/*
 * Two scrap books kept by the backend under separate endpoints. Book A records
 * weights only; Book B also carries a rate, an amount and withdrawals against it.
 */
type Book = 'A' | 'B';
type Row = KevinScrap | JayeshScrap;
const api = (b: Book) => (b === 'A' ? kevinScrapApi : jayeshScrapApi);
const isB = (r: Row): r is JayeshScrap => 'rate' in r;

interface Form {
  scrapContractorId: number; challanNo: string; orderDate: string; item: string;
  elementValue: number; totalWeight: number; outWeight: number; rate: number;
}
const blank = (): Form => ({ scrapContractorId: 0, challanNo: '', orderDate: today(), item: '', elementValue: 0, totalWeight: 0, outWeight: 0, rate: 0 });

const Scrap: React.FC = () => {
  const [book, setBook] = useState<Book>('A');
  const q = useAsync(async () => {
    const [rows, contractors, items] = await Promise.all([
      fetchAllPages(page => api(book).getScrapList({ page, size: 100 })),
      api(book).getContractorList(),
      api(book).getScrapItems().catch(() => [] as string[]),
    ]);
    return { rows: (rows as Row[]).sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.scrapId - a.scrapId), contractors, items };
  }, [book]);

  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ editing: Row | null; f: Form } | null>(null);
  const [contractors, setContractors] = useState<{ scrapContractorId: number; name: string }[]>([]);
  const [withdraw, setWithdraw] = useState<{ row: JayeshScrap; amount: number; date: string } | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (q.data) setContractors(q.data.contractors); }, [q.data]);

  const all = q.data?.rows || [];
  const rows = useMemo(() => all.filter(r => `${r.contractor?.name} ${r.challanNo} ${r.item}`.toLowerCase().includes(search.toLowerCase())), [all, search]);
  const bRows = all.filter(isB);

  const f = form?.f;
  const setF = (patch: Partial<Form>) => setForm(s => (s ? { ...s, f: { ...s.f, ...patch } } : s));
  const net = f ? Number((f.totalWeight - f.outWeight).toFixed(3)) : 0;

  const openEdit = (r: Row) => setForm({
    editing: r,
    f: {
      scrapContractorId: r.contractor?.scrapContractorId || 0, challanNo: r.challanNo, orderDate: r.orderDate, item: r.item,
      elementValue: r.elementValue, totalWeight: r.totalWeight, outWeight: r.outWeight, rate: isB(r) ? r.rate : 0,
    },
  });

  const save = async () => {
    if (!form || !f) return;
    if (!f.scrapContractorId || !f.challanNo.trim() || !f.item.trim() || !(f.totalWeight > 0)) { toast.err('Contractor, challan, item and total weight are required'); return; }
    const base = {
      scrapContractorId: f.scrapContractorId, challanNo: f.challanNo.trim(), orderDate: f.orderDate, item: f.item.trim(),
      elementValue: f.elementValue, elementType: 'BAG' as const, totalWeight: f.totalWeight, outWeight: f.outWeight, netWeight: net,
    };
    setBusy(true);
    try {
      if (book === 'A') {
        if (form.editing) await kevinScrapApi.updateScrap(form.editing.scrapId, base);
        else await kevinScrapApi.addScrap(base);
      } else {
        const body = { ...base, rate: f.rate };
        if (form.editing) await jayeshScrapApi.updateScrap(form.editing.scrapId, body);
        else await jayeshScrapApi.addScrap(body);
      }
      toast.ok('Scrap entry saved');
      setForm(null);
      q.reload();
    } catch {
      toast.err('Could not save the entry');
    } finally {
      setBusy(false);
    }
  };

  const saveWithdraw = async () => {
    if (!withdraw) return;
    if (!(withdraw.amount > 0) || withdraw.amount > withdraw.row.pendingAmount + 0.01) { toast.err(`Enter up to ${inr(withdraw.row.pendingAmount)}`); return; }
    setBusy(true);
    try {
      await jayeshScrapApi.withdrawScrap(withdraw.row.scrapId, { withdrawAmount: withdraw.amount, withdrawDate: withdraw.date });
      toast.ok('Withdrawal recorded');
      setWithdraw(null);
      q.reload();
    } catch {
      toast.err('Could not record the withdrawal');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(book).deleteScrap(deleting.scrapId);
      toast.ok('Entry deleted');
      setDeleting(null);
      q.reload();
    } catch {
      toast.err('Could not delete the entry');
    } finally {
      setBusy(false);
    }
  };

  const pdf = async () => {
    try {
      await api(book).downloadPdf(range.from || undefined, range.to || undefined);
    } catch {
      toast.err('Could not export the PDF');
    }
  };

  return (
    <>
      <PageHeader title="Scrap" subtitle="Scrap sent out, by weight — Book B also tracks money owed."
        actions={<>
          <Tabs value={book} onChange={b => { setBook(b as Book); setSearch(''); }} tabs={[{ id: 'A', label: 'Book A' }, { id: 'B', label: 'Book B' }]} />
          <Button icon={<Plus size={16} />} onClick={() => setForm({ editing: null, f: blank() })}>Add scrap</Button>
        </>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Entries" value={all.length} />
        <Stat label="Net weight" value={`${num(all.reduce((s, r) => s + (r.netWeight || 0), 0), 2)} kg`} />
        {book === 'B' ? <>
          <Stat label="Total value" value={inr(bRows.reduce((s, r) => s + (r.totalAmount || 0), 0))} />
          <Stat label="Pending" value={inr(bRows.reduce((s, r) => s + (r.pendingAmount || 0), 0))} />
        </> : <Stat label="Bags" value={num(all.reduce((s, r) => s + (r.elementValue || 0), 0))} />}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Search contractor, challan, item" />
          <div className="ml-auto flex items-center gap-2">
            <input type="date" className="field h-8 w-[140px]" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} />
            <input type="date" className="field h-8 w-[140px]" value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} />
            <Button size="sm" variant="outline" icon={<FileDown size={14} />} onClick={pdf}>PDF</Button>
          </div>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
          <DataTable
            rows={rows}
            onRowClick={openEdit}
            columns={[
              { key: 'd', header: 'Date', render: r => fmtDate(r.orderDate) },
              { key: 'c', header: 'Contractor', render: r => <><div className="font-medium">{r.contractor?.name}</div><div className="text-[12px] text-ink-3">Challan {r.challanNo}</div></> },
              { key: 'i', header: 'Item', render: r => r.item },
              { key: 'b', header: 'Bags', align: 'right', render: r => num(r.elementValue) },
              { key: 't', header: 'Total', align: 'right', render: r => num(r.totalWeight, 2) },
              { key: 'o', header: 'Less', align: 'right', render: r => num(r.outWeight, 2) },
              { key: 'n', header: 'Net', align: 'right', render: r => <span className="font-semibold">{num(r.netWeight, 2)} kg</span> },
              ...(book === 'B' ? [
                { key: 'r', header: 'Rate', align: 'right' as const, render: (r: Row) => (isB(r) ? inr(r.rate) : '') },
                { key: 'a', header: 'Amount', align: 'right' as const, render: (r: Row) => (isB(r) ? inr(r.totalAmount) : '') },
                {
                  key: 'p', header: 'Pending', align: 'right' as const, render: (r: Row) => (isB(r)
                    ? (r.pendingAmount > 0 ? <span className="font-semibold">{inr(r.pendingAmount)}</span> : <Badge tone="green">Settled</Badge>) : ''),
                },
              ] : []),
              {
                key: 'x', header: '', align: 'right', render: r => (
                  <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    {isB(r) && r.pendingAmount > 0 && (
                      <Button size="sm" variant="outline" icon={<IndianRupee size={13} />} onClick={() => setWithdraw({ row: r, amount: r.pendingAmount, date: today() })}>Withdraw</Button>
                    )}
                    <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={() => openEdit(r)} />
                    <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(r)} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Drawer open={!!form} title={`${form?.editing ? 'Edit' : 'Add'} scrap · Book ${book}`} onClose={() => setForm(null)}
        footer={<><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {f && (
          <div className="space-y-4">
            <Field label="Contractor">
              <SelectWithAdd value={f.scrapContractorId} options={contractors} getId={c => c.scrapContractorId} getLabel={c => c.name}
                onChange={id => setF({ scrapContractorId: id })} placeholder="Select contractor…" noun="Contractor"
                onCreate={async name => { const c = await api(book).addContractor(name); setContractors(l => [...l, c]); return c; }} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Challan no."><input className="field" value={f.challanNo} onChange={e => setF({ challanNo: e.target.value })} /></Field>
              <Field label="Date"><input type="date" className="field" value={f.orderDate} onChange={e => setF({ orderDate: e.target.value })} /></Field>
              <Field label="Item">
                <input className="field" list="scrap-items" value={f.item} onChange={e => setF({ item: e.target.value })} />
                <datalist id="scrap-items">{(q.data?.items || []).map(i => <option key={i} value={i} />)}</datalist>
              </Field>
              <Field label="Bags"><input type="number" className="field" value={f.elementValue || ''} onChange={e => setF({ elementValue: n(e.target.value) })} /></Field>
              <Field label="Total weight (kg)"><input type="number" className="field" value={f.totalWeight || ''} onChange={e => setF({ totalWeight: n(e.target.value) })} /></Field>
              <Field label="Less weight (kg)"><input type="number" className="field" value={f.outWeight || ''} onChange={e => setF({ outWeight: n(e.target.value) })} /></Field>
              {book === 'B' && <Field label="Rate (₹/kg)"><input type="number" className="field" value={f.rate || ''} onChange={e => setF({ rate: n(e.target.value) })} /></Field>}
            </div>
            <div className="flex justify-between rounded-lg bg-accent-soft px-4 py-3">
              <span>Net weight {book === 'B' && <span className="text-ink-2">· amount {inr(net * f.rate)}</span>}</span>
              <b className="text-accent">{num(net, 3)} kg</b>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={!!withdraw} title="Record withdrawal" onClose={() => setWithdraw(null)}
        footer={<><Button variant="outline" onClick={() => setWithdraw(null)}>Cancel</Button><Button loading={busy} onClick={saveWithdraw}>Save</Button></>}>
        {withdraw && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-[13px]">
              {withdraw.row.contractor?.name} · challan {withdraw.row.challanNo} · pending <b>{inr(withdraw.row.pendingAmount)}</b>
            </div>
            <Field label="Amount (₹)"><input type="number" className="field" value={withdraw.amount || ''} onChange={e => setWithdraw({ ...withdraw, amount: n(e.target.value) })} /></Field>
            <Field label="Date"><input type="date" className="field" value={withdraw.date} onChange={e => setWithdraw({ ...withdraw, date: e.target.value })} /></Field>
            {!!withdraw.row.withdrawals?.length && (
              <div>
                <div className="mb-1 text-[12px] font-medium uppercase tracking-wide text-ink-3">Earlier withdrawals</div>
                {withdraw.row.withdrawals.map(w => (
                  <div key={w.withdrawalId} className="flex justify-between border-b border-line py-1.5 text-[13px] last:border-0">
                    <span>{fmtDate(w.withdrawDate)}</span><span>{inr(w.withdrawAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Confirm open={!!deleting} title="Delete scrap entry?" message={`Challan ${deleting?.challanNo} will be removed.`} busy={busy}
        onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Scrap;
