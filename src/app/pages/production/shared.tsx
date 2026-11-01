import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { packKg, type JobStatus, type Pack, type PackType } from '../../data/production';
import { Button, Field, num, type Tone } from '../../ui';

/** Standard tare per packaging piece, in kg. Drums vary, so their weight is typed in. */
export const PACKAGING_KG: Record<PackType, number | null> = { BAG: 0.075, FOAM: 0.15, PETI: 1.2, DRUM: null };
export const PACKAGING_LABEL: Record<PackType, string> = { BAG: 'Bag · 75 g', FOAM: 'Foam · 150 g', PETI: 'Peti · 1.2 kg', DRUM: 'Drum' };

export const newPack = (type: PackType = 'BAG'): Pack => ({ type, kgEach: PACKAGING_KG[type] ?? 0, count: 0 });
export const packSummary = (rows: Pack[]) => rows.filter(p => p.count > 0).map(p => `${p.count} ${p.type}`).join(', ') || '—';

/** Rows of packaging used for a consignment; total tare is shown underneath. */
export const PackagingEditor: React.FC<{ rows: Pack[]; onChange: (rows: Pack[]) => void }> = ({ rows, onChange }) => {
  const set = (i: number, patch: Partial<Pack>) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_92px_80px_auto] items-end gap-2">
          <Field label={i === 0 ? 'Packaging' : ''}>
            <select className="field" value={r.type}
              onChange={e => { const t = e.target.value as PackType; set(i, { type: t, kgEach: PACKAGING_KG[t] ?? r.kgEach }); }}>
              {(Object.keys(PACKAGING_LABEL) as PackType[]).map(t => <option key={t} value={t}>{PACKAGING_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label={i === 0 ? 'Kg each' : ''}>
            <input className="field" type="number" disabled={PACKAGING_KG[r.type] !== null} value={r.kgEach || ''}
              onChange={e => set(i, { kgEach: Number(e.target.value) || 0 })} />
          </Field>
          <Field label={i === 0 ? 'Count' : ''}>
            <input className="field" type="number" value={r.count || ''} onChange={e => set(i, { count: Number(e.target.value) || 0 })} />
          </Field>
          <Button variant="ghost" icon={<Trash2 size={15} />} disabled={rows.length === 1} onClick={() => onChange(rows.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <div className="flex items-center justify-between text-[13px]">
        <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => onChange([...rows, newPack()])}>Add packaging</Button>
        <span className="text-ink-2">Packaging weight <b className="text-ink">{num(packKg(rows), 3)} kg</b></span>
      </div>
    </div>
  );
};

export const JOB_STATUS: Record<JobStatus, { label: string; tone: Tone }> = {
  IN_PROCESS: { label: 'In process', tone: 'amber' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
};

/** A labelled figure in a card's summary strip, e.g. "Sent · 250.000 kg". */
export const Figure: React.FC<{ label: string; value: React.ReactNode; tone?: string; sub?: React.ReactNode }> = ({ label, value, tone, sub }) => (
  <div className="min-w-0">
    <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</div>
    <div className={`mt-0.5 truncate font-semibold tabular-nums ${tone || ''}`}>{value}</div>
    {sub && <div className="text-[12px] text-ink-3">{sub}</div>}
  </div>
);

/** One label / value line in a detail block. */
export const Line: React.FC<{ label: React.ReactNode; value: React.ReactNode; strong?: boolean; tone?: string }> = ({ label, value, strong, tone }) => (
  <div className={`flex items-baseline justify-between gap-3 py-1 ${strong ? 'mt-1 border-t border-line pt-2 font-semibold' : ''}`}>
    <span className={strong ? '' : 'text-ink-2'}>{label}</span>
    <span className={`tabular-nums ${tone || ''}`}>{value}</span>
  </div>
);

export const qty = (v: number, unit = 'kg') => `${num(v, 3)} ${unit.toLowerCase()}`;
export const money = (v: number) => '₹' + (v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Casting and forging APIs speak DD/MM/YYYY; the date inputs speak YYYY-MM-DD. */
export const toDmy = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');
export const fromDmy = (dmy: string) => (dmy && dmy.includes('/') ? dmy.split('/').reverse().join('-') : dmy);

export const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
