import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Inbox, Loader2, Search, X } from 'lucide-react';

export { clsx as cx };

export const inr = (n: number | undefined | null) =>
  '₹' + Math.round(n || 0).toLocaleString('en-IN');

export const num = (n: number | undefined | null, digits = 0) =>
  (n || 0).toLocaleString('en-IN', { maximumFractionDigits: digits });

export const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  loading?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', icon, loading, className, children, disabled, ...rest
}) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={clsx(
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-[38px] px-4',
      variant === 'primary' && 'bg-accent text-accent-fg hover:brightness-110',
      variant === 'outline' && 'border border-line bg-surface hover:bg-muted',
      variant === 'ghost' && 'hover:bg-muted text-ink-2',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
      className,
    )}
  >
    {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
    {children}
  </button>
);

export const Card: React.FC<{ className?: string; children: React.ReactNode; title?: React.ReactNode; action?: React.ReactNode }> = ({
  className, children, title, action,
}) => (
  <div className={clsx('rounded-xl border border-line bg-surface', className)}>
    {title && (
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {action}
      </div>
    )}
    {children}
  </div>
);

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode; badge?: React.ReactNode }> = ({
  title, subtitle, actions, badge,
}) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {badge}
      </div>
      {subtitle && <p className="mt-1 text-ink-2">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const tones = {
  gray: 'bg-muted text-ink-2',
  green: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  red: 'bg-red-500/12 text-red-600 dark:text-red-400',
  blue: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
  accent: 'bg-accent-soft text-accent',
};
export type Tone = keyof typeof tones;

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone = 'gray', children }) => (
  <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium', tones[tone])}>
    {children}
  </span>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode }> = ({
  label, value, hint, icon,
}) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <span className="text-[13px] text-ink-2">{label}</span>
      {icon && <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">{icon}</span>}
    </div>
    <div className="mt-2 text-[24px] font-semibold tracking-tight">{value}</div>
    {hint && <div className="mt-1 text-[12px] text-ink-3">{hint}</div>}
  </Card>
);

export const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <label className={clsx('block', className)}>
    <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
    {children}
  </label>
);

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({
  value, onChange, placeholder = 'Search…',
}) => (
  <div className="relative w-full max-w-xs">
    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
    <input className="field pl-9" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-ink-3">
    <Loader2 size={18} className="animate-spin" /> {label}
  </div>
);

export const Empty: React.FC<{ title: string; hint?: string; action?: React.ReactNode }> = ({ title, hint, action }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
    <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-ink-3"><Inbox size={20} /></span>
    <div className="font-medium">{title}</div>
    {hint && <div className="text-ink-3">{hint}</div>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const ErrorNote: React.FC<{ error: unknown; onRetry?: () => void }> = ({ error, onRetry }) => {
  const status = (error as { status?: number; response?: { status?: number } })?.status
    ?? (error as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403) {
    const signIn = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    };
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="font-medium">Your session has expired</div>
        <div className="text-ink-3">Sign in again to see live data.</div>
        <Button size="sm" onClick={signIn}>Sign in</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <div className="font-medium text-red-600">Couldn't load data</div>
      <div className="max-w-md text-ink-3">{status ? `The server returned an error (${status}).` : 'The server did not respond. Check your connection.'}</div>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
};

/** Slide-in panel used for every add / edit form. */
export const Drawer: React.FC<{
  open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}> = ({ open, title, onClose, children, footer, wide }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={clsx('relative flex h-full w-full flex-col bg-surface shadow-2xl', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-3 hover:bg-muted"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

export const Confirm: React.FC<{
  open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void; busy?: boolean;
}> = ({ open, title, message, onCancel, onConfirm, busy }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-surface p-5 shadow-2xl">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <p className="mt-2 text-ink-2">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>Delete</Button>
        </div>
      </div>
    </div>
  );
};

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/** Client-side paged table. Every list screen uses this. */
export function DataTable<T>({
  rows, columns, pageSize = 12, onRowClick, empty,
}: {
  rows: T[]; columns: Column<T>[]; pageSize?: number; onRowClick?: (row: T) => void; empty?: React.ReactNode;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => { if (page >= pages) setPage(0); }, [pages, page]);
  const slice = useMemo(() => rows.slice(page * pageSize, page * pageSize + pageSize), [rows, page, pageSize]);

  if (!rows.length) return <>{empty ?? <Empty title="Nothing here yet" />}</>;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="text-left">
          <thead>
            <tr className="border-b border-line text-[12px] uppercase tracking-wide text-ink-3">
              {columns.map(c => (
                <th key={c.key} className={clsx('whitespace-nowrap px-5 py-3 font-medium', c.align === 'right' && 'text-right')}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={clsx('border-b border-line last:border-0', onRowClick && 'cursor-pointer hover:bg-muted/60')}
              >
                {columns.map(c => (
                  <td key={c.key} className={clsx('whitespace-nowrap px-5 py-3', c.align === 'right' && 'text-right tabular-nums', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px] text-ink-2">
          <span>{page * pageSize + 1}–{Math.min(rows.length, (page + 1) * pageSize)} of {rows.length}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft size={14} />} />
            <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} icon={<ChevronRight size={14} />} />
          </div>
        </div>
      )}
    </div>
  );
}

export const Tabs: React.FC<{ tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void }> = ({
  tabs, value, onChange,
}) => (
  <div className="inline-flex rounded-lg bg-muted p-1">
    {tabs.map(t => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={clsx('rounded-md px-3 py-1.5 text-[13px] font-medium', value === t.id ? 'bg-surface shadow-sm' : 'text-ink-2')}
      >
        {t.label}
      </button>
    ))}
  </div>
);

/** Tiny async loader: `const q = useAsync(() => api.list(), [deps])`. */
export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState(s => ({ ...s, loading: true, error: undefined }));
    fn().then(
      data => alive && setState({ data, loading: false }),
      error => alive && setState({ error, loading: false }),
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick(t => t + 1) };
}

let toastListener: ((msg: string, tone: 'ok' | 'err') => void) | null = null;
export const toast = {
  ok: (m: string) => toastListener?.(m, 'ok'),
  err: (m: string) => toastListener?.(m, 'err'),
};

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<{ id: number; msg: string; tone: 'ok' | 'err' }[]>([]);
  useEffect(() => {
    toastListener = (msg, tone) => {
      const id = Date.now() + Math.random();
      setItems(list => [...list, { id, msg, tone }]);
      setTimeout(() => setItems(list => list.filter(t => t.id !== id)), 3200);
    };
    return () => { toastListener = null; };
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {items.map(t => (
        <div
          key={t.id}
          className={clsx('rounded-lg px-4 py-2.5 text-[13px] font-medium text-white shadow-lg', t.tone === 'ok' ? 'bg-gray-900' : 'bg-red-600')}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
};
