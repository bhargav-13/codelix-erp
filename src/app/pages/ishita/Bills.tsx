import React, { useEffect, useMemo, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  ELEMENT_GM, ELEMENT_TYPES, PURCHASE_PARTIES, SALES_PARTIES, billCalc, billLineCalc, bills, type Bill, type BillKind, type BillLine, type QtyUnit,
} from '../../data/trade';
import { items, sizeLabel } from '../../data/ishita';
import { Button, Card, Confirm, Drawer, Empty, Field, PageHeader, SearchBox, Stat, cx, fmtDate, inr, num, toast } from '../../ui';
import { n } from '../inventory/shared';
import { today } from '../sales/shared';
import { monthStart } from '../production/shared';
import { useSettings } from '../../settings';

const COPY: Record<BillKind, { title: string; subtitle: string; noun: string; qty: string; parties: string[]; party: string }> = {
  PURCHASE: { title: 'Purchase bills', subtitle: 'Purchase order processing from start to delivery.', noun: 'purchase bill', qty: 'Purchase kg / pc', parties: PURCHASE_PARTIES, party: 'Seller party' },
  SALES: { title: 'Sales bills', subtitle: 'Sales bills with the metal (aavak) and labour (javak) side of each line.', noun: 'sales bill', qty: 'Sales kg / pc', parties: SALES_PARTIES, party: 'Buyer party' },
};

const newLine = (): BillLine => ({ item: '', size: '', qty: 0, unit: 'Kgs', element: 'Peti', elementCount: 0, elementGm: ELEMENT_GM.Peti, scrap: 0, labour: 0 });
const kgPc = (l: BillLine, v: number) => (l.unit === 'Pc' ? `${num(l.qty)} pc` : `${num(v, 3)} kg`);

/* --------------------------------- Form --------------------------------- */

const BillForm: React.FC<{ kind: BillKind; bill: Bill | 'new' | null; onClose: () => void }> = ({ kind, bill, onClose }) => {
  const catalog = items.use();
  const all = bills.use();
  const [f, setF] = useState<Omit<Bill, 'id'> | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (bill === null) { setF(null); return; }
    if (bill === 'new') {
      const count = all.filter(b => b.kind === kind).length;
      const now = new Date();
      setF({ kind, billNo: `${kind === 'PURCHASE' ? 'PU' : 'SA'}-${201 + all.length + count}`, party: '', chitthiNo: '', chitthiDate: today(), date: today(),
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, lines: [newLine()] });
    } else {
      const { id: _id, ...rest } = bill;
      setF(rest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill, kind]);
  if (!f || bill === null) return null;

  const setLine = (i: number, patch: Partial<BillLine>) => setF({ ...f, lines: f.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) });
  const t = billCalc({ ...f, id: 0 });
  const save = () => {
    if (!f.party.trim()) { toast.err(`${COPY[kind].party} is required`); return; }
    if (!f.billNo.trim()) { toast.err('Bill number is required'); return; }
    const lines = f.lines.filter(l => l.item && l.qty > 0);
    if (!lines.length) { toast.err('Add at least one line with an item and quantity'); return; }
    if (bill === 'new') bills.create({ ...f, lines });
    else bills.update(bill.id, { ...f, lines });
    toast.ok(`${COPY[kind].noun[0].toUpperCase()}${COPY[kind].noun.slice(1)} saved`);
    onClose();
  };

  return (
    <Drawer open wide title={bill === 'new' ? `Add ${COPY[kind].noun}` : `${f.billNo} · ${f.party}`} onClose={onClose}
      footer={<>
        {bill !== 'new' && <Button variant="ghost" className="mr-auto" icon={<Trash2 size={15} />} onClick={() => setDeleting(true)}>Delete</Button>}
        <Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save bill</Button>
      </>}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label={COPY[kind].party} className="col-span-2">
            <input className="field" list={`bill-parties-${kind}`} value={f.party} onChange={e => setF({ ...f, party: e.target.value })} placeholder="Type or pick a party" />
            <datalist id={`bill-parties-${kind}`}>{[...new Set([...COPY[kind].parties, ...all.filter(b => b.kind === kind).map(b => b.party)])].map(p => <option key={p} value={p} />)}</datalist>
          </Field>
          <Field label={kind === 'PURCHASE' ? 'Purchase no.' : 'Bill no.'}><input className="field" value={f.billNo} onChange={e => setF({ ...f, billNo: e.target.value })} /></Field>
          <Field label="Party chitthi no."><input className="field" value={f.chitthiNo} onChange={e => setF({ ...f, chitthiNo: e.target.value })} /></Field>
          <Field label="Chitthi date"><input type="date" className="field" value={f.chitthiDate} onChange={e => setF({ ...f, chitthiDate: e.target.value })} /></Field>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Field label="Date"><input type="date" className="field" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Time"><input type="time" className="field" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Items ({f.lines.length})</h3>
            <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => setF({ ...f, lines: [...f.lines, newLine()] })}>Add item</Button>
          </div>
          <div className="space-y-3">
            {f.lines.map((l, i) => {
              const c = billLineCalc(l);
              const it = catalog.find(x => x.name === l.item);
              return (
                <div key={i} className="rounded-lg border border-line p-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Item">
                      <select className="field" value={l.item} onChange={e => { const x = catalog.find(c2 => c2.name === e.target.value); setLine(i, { item: e.target.value, size: x ? sizeLabel(x.sizes[0]) : '' }); }}>
                        <option value="">Select…</option>
                        {catalog.map(x => <option key={x.id}>{x.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Size">
                      <select className="field" value={l.size} onChange={e => setLine(i, { size: e.target.value })}>
                        <option value="">—</option>
                        {(it?.sizes || []).map(s => <option key={s.mm}>{sizeLabel(s)}</option>)}
                      </select>
                    </Field>
                    <Field label="Quantity">
                      <div className="flex gap-1">
                        <input type="number" className="field" value={l.qty || ''} onChange={e => setLine(i, { qty: n(e.target.value) })} />
                        <select className="field w-[72px] px-2" value={l.unit} onChange={e => setLine(i, { unit: e.target.value as QtyUnit })}>
                          <option>Kgs</option><option>Gms</option><option>Pc</option>
                        </select>
                      </div>
                    </Field>
                    <div className="flex items-end justify-end">
                      <Button variant="ghost" icon={<Trash2 size={15} />} disabled={f.lines.length === 1} onClick={() => setF({ ...f, lines: f.lines.filter((_, k) => k !== i) })} />
                    </div>
                    <Field label="Element">
                      <select className="field" value={l.element} onChange={e => setLine(i, { element: e.target.value, elementGm: ELEMENT_GM[e.target.value] ?? l.elementGm })}>
                        {ELEMENT_TYPES.map(t2 => <option key={t2}>{t2}</option>)}
                      </select>
                    </Field>
                    <Field label="Count × gm each">
                      <div className="flex gap-1">
                        <input type="number" className="field" value={l.elementCount || ''} onChange={e => setLine(i, { elementCount: n(e.target.value) })} />
                        <input type="number" className="field" value={l.elementGm || ''} onChange={e => setLine(i, { elementGm: n(e.target.value) })} />
                      </div>
                    </Field>
                    <Field label={`Scrap (₹ / ${l.unit === 'Pc' ? 'pc' : 'kg'})`}><input type="number" className="field" value={l.scrap || ''} onChange={e => setLine(i, { scrap: n(e.target.value) })} /></Field>
                    <Field label={`Labour (₹ / ${l.unit === 'Pc' ? 'pc' : 'kg'})`}><input type="number" className="field" value={l.labour || ''} onChange={e => setLine(i, { labour: n(e.target.value) })} /></Field>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-end gap-x-5 gap-y-1 text-[13px] text-ink-2">
                    {l.unit !== 'Pc' && <span>Net <b className="text-ink">{num(c.netKg, 3)} kg</b> <span className="text-ink-3">(−{num(c.tareKg, 3)} element)</span></span>}
                    <span>Aavak <b className="text-ink">{inr(c.aavak)}</b></span>
                    <span>Javak <b className="text-ink">{inr(c.javak)}</b></span>
                    <span>Total <b className="text-accent">{inr(c.total)}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-accent-soft p-4 sm:grid-cols-4">
          {[['Net weight', `${num(t.netKg, 3)} kg`], ['Aavak (metal)', inr(t.aavak)], ['Javak (labour)', inr(t.javak)], ['Bill total', inr(t.total)]].map(([k, v]) => (
            <div key={k}><div className="text-[12px] text-ink-2">{k}</div><div className="font-semibold">{v}</div></div>
          ))}
        </div>
        <Field label="Remark"><input className="field" value={f.remark || ''} onChange={e => setF({ ...f, remark: e.target.value })} /></Field>
      </div>
      <Confirm open={deleting} title="Delete bill?" message={`${f.billNo} for ${f.party} will be removed.`} onCancel={() => setDeleting(false)}
        onConfirm={() => { if (bill !== 'new') bills.remove(bill.id); setDeleting(false); toast.ok('Bill deleted'); onClose(); }} />
    </Drawer>
  );
};

/* --------------------------------- Page --------------------------------- */

const Bills: React.FC<{ kind: BillKind }> = ({ kind }) => {
  const { settings } = useSettings();
  const all = bills.use();
  const [search, setSearch] = useState('');
  const [party, setParty] = useState('');
  const [editing, setEditing] = useState<Bill | 'new' | null>(null);
  const [stmt, setStmt] = useState<{ party: string; from: string; to: string } | null>(null);
  useEffect(() => { setSearch(''); setParty(''); setEditing(null); }, [kind]);

  const mine = useMemo(() => all.filter(b => b.kind === kind).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [all, kind]);
  const parties = [...new Set(mine.map(b => b.party))].sort();
  const filtered = mine.filter(b => (!party || b.party === party)
    && `${b.party} ${b.billNo} ${b.chitthiNo} ${b.lines.map(l => `${l.item} ${l.size}`).join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const rows = filtered.flatMap(b => b.lines.map((l, i) => ({ b, l, i, c: billLineCalc(l) })));
  const tot = filtered.map(billCalc).reduce((t, c) => ({ kg: t.kg + c.netKg, a: t.a + c.aavak, j: t.j + c.javak }), { kg: 0, a: 0, j: 0 });

  const download = () => {
    if (!stmt) return;
    const list = mine.filter(b => (!stmt.party || b.party === stmt.party) && b.date >= stmt.from && b.date <= stmt.to).reverse();
    if (!list.length) { toast.err('No bills in that period'); return; }
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(settings.companyName, 10, 14);
    doc.setFontSize(11); doc.text(`${COPY[kind].title} statement${stmt.party ? ` — ${stmt.party}` : ''}`, 10, 21);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`${fmtDate(stmt.from)} to ${fmtDate(stmt.to)}`, W - 10, 14, { align: 'right' });
    const xs: [number, 'left' | 'right'][] = [[10, 'left'], [32, 'left'], [52, 'left'], [100, 'left'], [140, 'left'], [182, 'right'], [200, 'right'], [228, 'right'], [250, 'right'], [W - 10, 'right']];
    let y = 31;
    const row = (cells: string[], bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(8);
      cells.forEach((c, i) => doc.text(c, xs[i][0], y, { align: xs[i][1] }));
      y += 6; if (y > 195) { doc.addPage(); y = 16; }
    };
    row(['Date', 'Bill', 'Party', 'Item', 'Element', 'Net kg/pc', 'Scrap', 'Aavak Rs.', 'Labour', 'Javak Rs.'], true);
    let a = 0, j = 0;
    list.forEach(b => b.lines.forEach(l => {
      const c = billLineCalc(l); a += c.aavak; j += c.javak;
      row([fmtDate(b.date), b.billNo, b.party.slice(0, 26), `${l.item} ${l.size}`.slice(0, 24), `${l.elementCount} ${l.element}`, l.unit === 'Pc' ? `${l.qty} pc` : num(c.netKg, 3),
        num(l.scrap, 2), num(c.aavak, 2), num(l.labour, 2), num(c.javak, 2)]);
    }));
    y += 2; row(['Total', '', '', '', '', '', '', num(a, 2), '', num(j, 2)], true);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(`Grand total Rs. ${num(a + j, 2)}/-`, W - 10, y + 4, { align: 'right' });
    doc.save(`${kind.toLowerCase()}_statement.pdf`);
    setStmt(null);
  };

  const th = 'whitespace-nowrap px-4 py-2.5 font-medium';
  const td = 'whitespace-nowrap px-4 py-3';
  return (
    <>
      <PageHeader title={COPY[kind].title} subtitle={COPY[kind].subtitle}
        actions={<>
          <Button variant="outline" icon={<Download size={16} />} onClick={() => setStmt({ party: '', from: monthStart(), to: today() })}>Download statement</Button>
          <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>Add {COPY[kind].noun}</Button>
        </>} />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Bills" value={filtered.length} hint={`${rows.length} line items`} />
        <Stat label="Net weight" value={`${num(tot.kg, 1)} kg`} />
        <Stat label="Aavak (metal)" value={inr(tot.a)} />
        <Stat label="Javak (labour)" value={inr(tot.j)} hint={`Total ${inr(tot.a + tot.j)}`} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Search party, bill or size…" />
          <select className="field h-9 w-[220px]" value={party} onChange={e => setParty(e.target.value)}>
            <option value="">All parties</option>
            {parties.map(p => <option key={p}>{p}</option>)}
          </select>
          {(search || party) && <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setParty(''); }}>Clear filters</Button>}
        </div>
        {!rows.length ? (
          <Empty title={search || party ? 'Nothing matches' : 'No records yet'} hint={`${COPY[kind].title} you add appear here, one row per line item.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="text-left">
              <thead>
                <tr className="text-[12px] font-semibold uppercase tracking-wide">
                  <th colSpan={7} className="border-b border-line bg-accent-soft px-4 py-2 text-accent">Aavak</th>
                  <th colSpan={4} className="border-b border-l border-line bg-amber-500/10 px-4 py-2 text-amber-700 dark:text-amber-400">Javak</th>
                </tr>
                <tr className="border-b border-line text-[12px] uppercase tracking-wide text-ink-3">
                  <th className={th}>Party name</th><th className={th}>Bill</th><th className={th}>Size</th><th className={th}>Element</th>
                  <th className={cx(th, 'text-right')}>{COPY[kind].qty}</th><th className={cx(th, 'text-right')}>Price</th><th className={cx(th, 'text-right')}>Total price</th>
                  <th className={cx(th, 'border-l border-line')}>Element</th><th className={cx(th, 'text-right')}>Javak kg / pc</th><th className={cx(th, 'text-right')}>Rs.</th><th className={cx(th, 'text-right')}>Total Rs.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ b, l, i, c }) => (
                  <tr key={`${b.id}-${i}`} onClick={() => setEditing(b)} className="cursor-pointer border-b border-line last:border-0 hover:bg-muted/60">
                    <td className={td}>{i === 0 ? <><div className="font-medium">{b.party}</div><div className="text-[12px] text-ink-3">{fmtDate(b.date)} · {b.time}</div></> : <span className="text-ink-3">〃</span>}</td>
                    <td className={td}>{i === 0 ? <><div>{b.billNo}</div><div className="text-[12px] text-ink-3">Ch. {b.chitthiNo || '—'}</div></> : ''}</td>
                    <td className={td}><div>{l.item}</div><div className="font-mono text-[12px] text-ink-3">{l.size || '—'}</div></td>
                    <td className={cx(td, 'text-ink-2')}>{l.elementCount ? `${l.elementCount} ${l.element}` : '—'}</td>
                    <td className={cx(td, 'text-right tabular-nums')}>{kgPc(l, c.grossKg)}</td>
                    <td className={cx(td, 'text-right tabular-nums')}>{num(l.scrap, 2)}</td>
                    <td className={cx(td, 'text-right font-medium tabular-nums')}>{inr(c.aavak)}</td>
                    <td className={cx(td, 'border-l border-line text-ink-2')}>{l.element}</td>
                    <td className={cx(td, 'text-right tabular-nums')}>{kgPc(l, c.netKg)}</td>
                    <td className={cx(td, 'text-right tabular-nums')}>{num(l.labour, 2)}</td>
                    <td className={cx(td, 'text-right font-medium tabular-nums')}>{inr(c.javak)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <BillForm kind={kind} bill={editing} onClose={() => setEditing(null)} />
      <Drawer open={!!stmt} title={`Download ${kind === 'PURCHASE' ? 'purchase' : 'sales'} statement`} onClose={() => setStmt(null)}
        footer={<><Button variant="outline" onClick={() => setStmt(null)}>Cancel</Button><Button icon={<Download size={15} />} onClick={download}>Download PDF</Button></>}>
        {stmt && (
          <div className="space-y-4">
            <Field label="Party">
              <select className="field" value={stmt.party} onChange={e => setStmt({ ...stmt, party: e.target.value })}>
                <option value="">All parties</option>
                {parties.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="From"><input type="date" className="field" value={stmt.from} onChange={e => setStmt({ ...stmt, from: e.target.value })} /></Field>
              <Field label="To"><input type="date" className="field" value={stmt.to} onChange={e => setStmt({ ...stmt, to: e.target.value })} /></Field>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default Bills;
