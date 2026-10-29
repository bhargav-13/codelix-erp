/**
 * In-browser store for the "static" demo modules (HR, job work, plating …).
 * Each collection lives in localStorage under `demo:<name>`, is seeded on first
 * read, and can be wiped back to its seed with resetDemoData(). Nothing here
 * ever talks to the 4bitx backend — live modules go through src/api/* instead.
 */
import { useSyncExternalStore } from 'react';

const PREFIX = 'demo:';
const listeners = new Set<() => void>();
const seeds = new Map<string, () => unknown[]>();
const cache = new Map<string, unknown[]>();

const emit = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

function read<T>(name: string): T[] {
  if (cache.has(name)) return cache.get(name) as T[];
  let rows: T[] | null = null;
  try {
    const raw = localStorage.getItem(PREFIX + name);
    if (raw) rows = JSON.parse(raw);
  } catch { /* corrupted or blocked storage — fall back to seed */ }
  if (!rows) {
    rows = (seeds.get(name)?.() ?? []) as T[];
    write(name, rows, false);
  }
  cache.set(name, rows);
  return rows;
}

function write<T>(name: string, rows: T[], notify = true) {
  cache.set(name, rows);
  try { localStorage.setItem(PREFIX + name, JSON.stringify(rows)); } catch { /* quota / private mode */ }
  if (notify) emit();
}

export interface Row { id: number }

export function collection<T extends Row>(name: string, seed: () => T[]) {
  seeds.set(name, seed);
  const nextId = () => read<T>(name).reduce((m, r) => Math.max(m, r.id), 0) + 1;
  return {
    all: () => read<T>(name),
    get: (id: number) => read<T>(name).find(r => r.id === id),
    create: (data: Omit<T, 'id'>) => {
      const row = { ...data, id: nextId() } as T;
      write(name, [row, ...read<T>(name)]);
      return row;
    },
    createMany: (data: Omit<T, 'id'>[]) => {
      let id = nextId();
      const rows = data.map(d => ({ ...d, id: id++ }) as T);
      write(name, [...rows, ...read<T>(name)]);
      return rows;
    },
    update: (id: number, patch: Partial<T>) =>
      write(name, read<T>(name).map(r => (r.id === id ? { ...r, ...patch } : r))),
    remove: (id: number) => write(name, read<T>(name).filter(r => r.id !== id)),
    /** React hook — re-renders whenever any demo collection changes. */
    use: () => useSyncExternalStore(subscribe, () => read<T>(name)),
  };
}

export function resetDemoData() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PREFIX)) localStorage.removeItem(key);
  }
  cache.clear();
  emit();
}
