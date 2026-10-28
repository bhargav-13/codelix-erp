import React from 'react';
import { useSearchParams } from 'react-router-dom';
import type { OrderStatus } from '../../../types';
import { Badge, Tabs, type Tone } from '../../ui';

/**
 * The backend still splits sales by floor (GROUND_FLOOR / FIRST_FLOOR).
 * The new UI shows one page per module with a Unit filter on top.
 */
export type Floor = 'GROUND_FLOOR' | 'FIRST_FLOOR';
export const FLOORS: Floor[] = ['GROUND_FLOOR', 'FIRST_FLOOR'];
export const UNIT_LABEL: Record<Floor, string> = { GROUND_FLOOR: 'Unit 1', FIRST_FLOOR: 'Unit 2' };

/** Unit filter kept in the URL (?unit=1|2) so links and refreshes keep it. */
export function useUnit(): [Floor | 'ALL', (u: Floor | 'ALL') => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('unit');
  const unit: Floor | 'ALL' = raw === '1' ? 'GROUND_FLOOR' : raw === '2' ? 'FIRST_FLOOR' : 'ALL';
  const set = (u: Floor | 'ALL') => {
    const next = new URLSearchParams(params);
    if (u === 'ALL') next.delete('unit');
    else next.set('unit', u === 'GROUND_FLOOR' ? '1' : '2');
    setParams(next, { replace: true });
  };
  return [unit, set];
}

export const floorsFor = (unit: Floor | 'ALL') => (unit === 'ALL' ? FLOORS : [unit]);

export const UnitTabs: React.FC<{ value: Floor | 'ALL'; onChange: (u: Floor | 'ALL') => void }> = ({ value, onChange }) => (
  <Tabs
    value={value}
    onChange={id => onChange(id as Floor | 'ALL')}
    tabs={[{ id: 'ALL', label: 'All units' }, { id: 'GROUND_FLOOR', label: 'Unit 1' }, { id: 'FIRST_FLOOR', label: 'Unit 2' }]}
  />
);

export const UnitBadge: React.FC<{ floor?: string }> = ({ floor }) =>
  floor ? <Badge>{UNIT_LABEL[floor as Floor] ?? floor}</Badge> : null;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The generated API clients turn date fields into Date objects although the
 * shared types say string. Convert them back to yyyy-mm-dd (local date) so
 * sorting, comparisons and <input type="date"> behave.
 */
export function normalizeDates<T>(value: T): T {
  if (value instanceof Date) {
    return (isNaN(value.getTime()) ? '' : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`) as T;
  }
  if (Array.isArray(value)) return value.map(normalizeDates) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeDates(v)])) as T;
  }
  return value;
}

/** Walks every page of a paged endpoint. */
export async function fetchAllPages<T>(load: (page: number) => Promise<{ data: T[]; totalPages: number }>): Promise<T[]> {
  const first = await load(0);
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => load(i + 1)));
  return normalizeDates([first, ...rest].flatMap(r => r.data));
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  COMPLETED: { label: 'Ready', tone: 'blue' },
  DISPATCHED: { label: 'Dispatched', tone: 'green' },
  REVOKED: { label: 'Revoked', tone: 'red' },
};

export const orderNo = (id: number) => `SO-${String(id).padStart(5, '0')}`;

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const today = () => new Date().toISOString().slice(0, 10);
