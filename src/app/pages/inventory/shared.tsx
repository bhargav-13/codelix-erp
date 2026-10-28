import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Badge, Button, toast } from '../../ui';

/** A <select> with an inline "+ New" that creates the option on the server and selects it. */
export function SelectWithAdd<T>({
  value, options, getId, getLabel, onChange, onCreate, placeholder, noun,
}: {
  value: number;
  options: T[];
  getId: (o: T) => number;
  getLabel: (o: T) => string;
  onChange: (id: number) => void;
  onCreate: (name: string) => Promise<T>;
  placeholder: string;
  noun: string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const created = await onCreate(name.trim());
      onChange(getId(created));
      toast.ok(`${noun} added`);
      setAdding(false);
      setName('');
    } catch {
      toast.err(`Could not add the ${noun.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  };

  if (adding) {
    return (
      <div className="flex gap-2">
        <input className="field" autoFocus value={name} placeholder={`New ${noun.toLowerCase()} name`}
          onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create(); } }} />
        <Button variant="outline" icon={<Check size={15} />} loading={busy} onClick={create} />
        <Button variant="ghost" icon={<X size={15} />} onClick={() => setAdding(false)} />
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <select className="field" value={value} onChange={e => onChange(Number(e.target.value))}>
        <option value={0}>{placeholder}</option>
        {options.map(o => <option key={getId(o)} value={getId(o)}>{getLabel(o)}</option>)}
      </select>
      <Button variant="outline" title={`New ${noun.toLowerCase()}`} icon={<Plus size={15} />} onClick={() => setAdding(true)} />
    </div>
  );
}

export const StockBadge: React.FC<{ low: boolean }> = ({ low }) =>
  low ? <Badge tone="red">Low stock</Badge> : <Badge tone="green">In stock</Badge>;

export const n = (v: string | number | undefined) => (v === '' || v === undefined ? 0 : Number(v) || 0);
