import React, { useState } from 'react';
import { FileDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { castingApi, castingSaleApi } from '../../../api/casting';
import type { CastingEntry, CastingSale } from '../../../types';
import { Button, Card, Confirm, DataTable, Drawer, ErrorNote, Field, PageHeader, Spinner, Stat, Tabs, fmtDate, inr, num, toast, useAsync } from '../../ui';
import { n } from '../inventory/shared';
import { downloadBlob, today } from '../sales/shared';
import { fromDmy } from './shared';

type Sale = Omit<CastingSale, 'id' | 'totalAmount'>;
const blankSale = (): Sale => ({ date: today(), brass: 0, kadi: 0, kadiRate: 0, kadiAmount: 0, lokhand: 0, lokhandRate: 0, lokhandAmount: 0 });

/**
 * Casting: "mell" (melt) coming in, and the by-products sold — brass,
 * kadi and lokhand (iron), the last two at a rate per kg.
 */
const Casting: React.FC = () => {
  const [tab, setTab] = useState('in');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // The casting APIs return DD/MM/YYYY; keep ISO inside the page.
  const q = useAsync(async () => {
    const [entries, sales] = await Promise.all([castingApi.getAllCastings(from || undefined, to || undefined), castingSaleApi.getAllCastingSales()]);
    const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
    return {
      entries: entries.map(e => ({ ...e, date: fromDmy(e.date) })).sort((a, b) => b.date.localeCompare(a.date)),
      sales: sales.map(s => ({ ...s, date: fromDmy(s.date) })).filter(s => inRange(s.date)).sort((a, b) => b.date.localeCompare(a.date)),
    };
  }, [from, to]);

  const [mell, setMell] = useState<{ entry: CastingEntry | null; date: string; mell: number } | null>(null);
  const [sale, setSale] = useState<{ sale: CastingSale | null; form: Sale } | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'in' | 'sale'; id: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const entries = q.data?.entries || [];
  const sales = q.data?.sales || [];
  const sum = <T,>(l: T[], f: (x: T) => number | null | undefined) => l.reduce((s, x) => s + (f(x) || 0), 0);

  const saveMell = async () => {
    if (!mell || !(mell.mell > 0)) { toast.err('Enter the mell weight'); return; }
    setBusy(true);
    try {
      const body = { date: mell.date, mell: mell.mell };
      if (mell.entry?.id) await castingApi.updateCasting(mell.entry.id, body);
      else await castingApi.createCasting(body);
      toast.ok('Entry saved');
      setMell(null);
      q.reload();
    } catch {
      toast.err('Could not save the entry');
    } finally {
      setBusy(false);
    }
  };

  const setSaleField = (patch: Partial<Sale>) => setSale(s => {
    if (!s) return s;
    const f = { ...s.form, ...patch };
    f.kadiAmount = Number(((f.kadi || 0) * (f.kadiRate || 0)).toFixed(2));
    f.lokhandAmount = Number(((f.lokhand || 0) * (f.lokhandRate || 0)).toFixed(2));
    return { ...s, form: f };
  });

  const saveSale = async () => {
    if (!sale) return;
    setBusy(true);
    try {
      if (sale.sale?.id) await castingSaleApi.updateCastingSale(sale.sale.id, sale.form);
      else await castingSaleApi.createCastingSale(sale.form);
      toast.ok('Sale saved');
      setSale(null);
      q.reload();
    } catch {
      toast.err('Could not save the sale');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      if (deleting.kind === 'in') await castingApi.deleteCasting(deleting.id);
      else await castingSaleApi.deleteCastingSale(deleting.id);
      toast.ok('Deleted');
      setDeleting(null);
      q.reload();
    } catch {
      toast.err('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  const pdf = async () => {
    try {
      const blob = tab === 'in'
        ? await castingApi.downloadCastingPdf(from || undefined, to || undefined)
        : await castingSaleApi.downloadCastingSalePdf(from || undefined, to || undefined);
      downloadBlob(blob, tab === 'in' ? 'casting-mell.pdf' : 'casting-sales.pdf');
    } catch {
      toast.err('Could not download the PDF');
    }
  };

  const actions = (kind: 'in' | 'sale', id: number | undefined, edit: () => void) => (
    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
      <Button size="sm" variant="ghost" title="Edit" icon={<Pencil size={14} />} onClick={edit} />
      <Button size="sm" variant="ghost" title="Delete" icon={<Trash2 size={14} />} onClick={() => id && setDeleting({ kind, id })} />
    </div>
  );

  return (
    <>
      <PageHeader title="Casting" subtitle="Mell received and by-products sold."
        actions={<>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'in', label: 'Mell in' }, { id: 'sale', label: 'Sales' }]} />
          <Button icon={<Plus size={16} />} onClick={() => (tab === 'in' ? setMell({ entry: null, date: today(), mell: 0 }) : setSale({ sale: null, form: blankSale() }))}>
            {tab === 'in' ? 'Add mell' : 'Add sale'}
          </Button>
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {tab === 'in' ? <>
          <Stat label="Entries" value={entries.length} />
          <Stat label="Total mell" value={`${num(sum(entries, e => e.mell), 3)} kg`} />
        </> : <>
          <Stat label="Brass" value={`${num(sum(sales, s => s.brass), 3)} kg`} />
          <Stat label="Kadi" value={`${num(sum(sales, s => s.kadi), 3)} kg`} hint={inr(sum(sales, s => s.kadiAmount))} />
          <Stat label="Lokhand (iron)" value={`${num(sum(sales, s => s.lokhand), 3)} kg`} hint={inr(sum(sales, s => s.lokhandAmount))} />
          <Stat label="Sales value" value={inr(sum(sales, s => (s.kadiAmount || 0) + (s.lokhandAmount || 0)))} />
        </>}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <span className="text-[13px] text-ink-2">Period</span>
          <input type="date" className="field h-8 w-[150px]" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-ink-3">–</span>
          <input type="date" className="field h-8 w-[150px]" value={to} onChange={e => setTo(e.target.value)} />
          {(from || to) && <Button size="sm" variant="ghost" onClick={() => { setFrom(''); setTo(''); }}>Clear</Button>}
          <Button size="sm" variant="outline" className="ml-auto" icon={<FileDown size={14} />} onClick={pdf}>PDF</Button>
        </div>
        {q.loading ? <Spinner /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : tab === 'in' ? (
          <DataTable
            rows={entries}
            onRowClick={e => setMell({ entry: e, date: e.date, mell: e.mell })}
            columns={[
              { key: 'd', header: 'Date', render: e => fmtDate(e.date) },
              { key: 'm', header: 'Mell', align: 'right', render: e => <span className="font-semibold">{num(e.mell, 3)} kg</span> },
              { key: 'a', header: '', align: 'right', render: e => actions('in', e.id, () => setMell({ entry: e, date: e.date, mell: e.mell })) },
            ]}
          />
        ) : (
          <DataTable
            rows={sales}
            onRowClick={s => setSale({ sale: s, form: { ...s } })}
            columns={[
              { key: 'd', header: 'Date', render: s => fmtDate(s.date) },
              { key: 'b', header: 'Brass', align: 'right', render: s => num(s.brass, 3) },
              { key: 'k', header: 'Kadi', align: 'right', render: s => <>{num(s.kadi, 3)}<div className="text-[12px] text-ink-3">@ ₹{num(s.kadiRate, 2)}</div></> },
              { key: 'ka', header: 'Kadi ₹', align: 'right', render: s => inr(s.kadiAmount) },
              { key: 'l', header: 'Lokhand', align: 'right', render: s => <>{num(s.lokhand, 3)}<div className="text-[12px] text-ink-3">@ ₹{num(s.lokhandRate, 2)}</div></> },
              { key: 'la', header: 'Lokhand ₹', align: 'right', render: s => inr(s.lokhandAmount) },
              { key: 't', header: 'Total', align: 'right', render: s => <span className="font-semibold">{inr((s.kadiAmount || 0) + (s.lokhandAmount || 0))}</span> },
              { key: 'a', header: '', align: 'right', render: s => actions('sale', s.id, () => setSale({ sale: s, form: { ...s } })) },
            ]}
          />
        )}
      </Card>

      <Drawer open={!!mell} title={mell?.entry ? 'Edit mell entry' : 'Add mell'} onClose={() => setMell(null)}
        footer={<><Button variant="outline" onClick={() => setMell(null)}>Cancel</Button><Button loading={busy} onClick={saveMell}>Save</Button></>}>
        {mell && (
          <div className="space-y-4">
            <Field label="Date"><input type="date" className="field" value={mell.date} onChange={e => setMell({ ...mell, date: e.target.value })} /></Field>
            <Field label="Mell weight (kg)"><input type="number" className="field" autoFocus value={mell.mell || ''} onChange={e => setMell({ ...mell, mell: n(e.target.value) })} /></Field>
          </div>
        )}
      </Drawer>

      <Drawer open={!!sale} title={sale?.sale ? 'Edit sale' : 'Add sale'} onClose={() => setSale(null)}
        footer={<>
          <div className="mr-auto text-[13px] text-ink-2">Total <b className="ml-1 text-[16px] text-ink">{inr((sale?.form.kadiAmount || 0) + (sale?.form.lokhandAmount || 0))}</b></div>
          <Button variant="outline" onClick={() => setSale(null)}>Cancel</Button><Button loading={busy} onClick={saveSale}>Save</Button>
        </>}>
        {sale && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date"><input type="date" className="field" value={sale.form.date} onChange={e => setSaleField({ date: e.target.value })} /></Field>
            <Field label="Brass (kg)"><input type="number" className="field" value={sale.form.brass || ''} onChange={e => setSaleField({ brass: n(e.target.value) })} /></Field>
            <Field label="Kadi (kg)"><input type="number" className="field" value={sale.form.kadi || ''} onChange={e => setSaleField({ kadi: n(e.target.value) })} /></Field>
            <Field label="Kadi rate (₹/kg)"><input type="number" className="field" value={sale.form.kadiRate || ''} onChange={e => setSaleField({ kadiRate: n(e.target.value) })} /></Field>
            <Field label="Lokhand (kg)"><input type="number" className="field" value={sale.form.lokhand || ''} onChange={e => setSaleField({ lokhand: n(e.target.value) })} /></Field>
            <Field label="Lokhand rate (₹/kg)"><input type="number" className="field" value={sale.form.lokhandRate || ''} onChange={e => setSaleField({ lokhandRate: n(e.target.value) })} /></Field>
            <div className="col-span-2 grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-[13px]">
              <div><div className="text-ink-3">Kadi amount</div><b>{inr(sale.form.kadiAmount)}</b></div>
              <div><div className="text-ink-3">Lokhand amount</div><b>{inr(sale.form.lokhandAmount)}</b></div>
            </div>
          </div>
        )}
      </Drawer>

      <Confirm open={!!deleting} title="Delete entry?" message="This entry will be removed." busy={busy} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
};

export default Casting;
