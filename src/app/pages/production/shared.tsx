import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PackagingDetail, PackagingType, SubcontractingStatus } from '../../../types';
import { Button, Field, num, type Tone } from '../../ui';

/** Standard tare per packaging piece, in kg. Drums vary, so their weight is typed in. */
export const PACKAGING_KG: Record<PackagingType, number | null> = { BAG: 0.075, FOAM: 0.15, PETI: 1.2, DRUM: null };
export const PACKAGING_LABEL: Record<PackagingType, string> = { BAG: 'Bag', FOAM: 'Foam', PETI: 'Peti (box)', DRUM: 'Drum' };

export const packagingKg = (rows: PackagingDetail[]) =>
  rows.reduce((s, r) => s + (r.packagingWeight || 0) * (r.packagingCount || 0), 0);

export const newPackaging = (type: PackagingType = 'BAG'): PackagingDetail => ({
  packagingType: type, packagingWeight: PACKAGING_KG[type] ?? 0, packagingCount: 0,
});

/** Rows of packaging used for a consignment; total tare is shown underneath. */
export const PackagingEditor: React.FC<{ rows: PackagingDetail[]; onChange: (rows: PackagingDetail[]) => void }> = ({ rows, onChange }) => {
  const set = (i: number, patch: Partial<PackagingDetail>) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_96px_96px_auto] items-end gap-2">
          <Field label={i === 0 ? 'Packaging' : ''}>
            <select className="field" value={r.packagingType}
              onChange={e => { const t = e.target.value as PackagingType; set(i, { packagingType: t, packagingWeight: PACKAGING_KG[t] ?? r.packagingWeight }); }}>
              {(Object.keys(PACKAGING_LABEL) as PackagingType[]).map(t => <option key={t} value={t}>{PACKAGING_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label={i === 0 ? 'Kg each' : ''}>
            <input className="field" type="number" disabled={PACKAGING_KG[r.packagingType] !== null} value={r.packagingWeight || ''}
              onChange={e => set(i, { packagingWeight: Number(e.target.value) || 0 })} />
          </Field>
          <Field label={i === 0 ? 'Count' : ''}>
            <input className="field" type="number" value={r.packagingCount || ''} onChange={e => set(i, { packagingCount: Number(e.target.value) || 0 })} />
          </Field>
          <Button variant="ghost" icon={<Trash2 size={15} />} disabled={rows.length === 1} onClick={() => onChange(rows.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <div className="flex items-center justify-between text-[13px]">
        <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => onChange([...rows, newPackaging()])}>Add packaging</Button>
        <span className="text-ink-2">Packaging weight <b className="text-ink">{num(packagingKg(rows), 3)} kg</b></span>
      </div>
    </div>
  );
};

export const JOB_STATUS: Record<SubcontractingStatus, { label: string; tone: Tone }> = {
  IN_PROCESS: { label: 'In process', tone: 'amber' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
};

/** Casting and forging APIs speak DD/MM/YYYY; the date inputs speak YYYY-MM-DD. */
export const toDmy = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');
export const fromDmy = (dmy: string) => (dmy && dmy.includes('/') ? dmy.split('/').reverse().join('-') : dmy);

export const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
