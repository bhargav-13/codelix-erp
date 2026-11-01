import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Inbox, Loader2, Search, X } from 'lucide-react';

export { clsx as cx };

export const inr = (n: number | undefined | null) => {
  const v = Math.round(n || 0);
  return (v < 0 ? '−₹' : '₹') + Math.abs(v).toLocaleString('en-IN');
};

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
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[color,background-color,border-color,filter,transform] duration-150 active:scale-[.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
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
  <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium transition-colors duration-200', tones[tone])}>
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

const EXIT_MS = 200;
/** True while a <Presence> is playing the exit of the overlay inside it. */
const Closing = createContext(false);

/**
 * Keeps the last non-null `value` rendered for the exit animation. Forms that
 * render nothing once their target is cleared wrap in this so their drawer can
 * slide out instead of vanishing.
 */
export function Presence<T>({ value, children }: { value: T | null | undefined; children: (v: T) => React.ReactNode }) {
  const [kept, setKept] = useState(value);
  if (value != null && value !== kept) setKept(value);
  useEffect(() => {
    if (value != null || kept == null) return;
    const t = setTimeout(() => setKept(null), EXIT_MS);
    return () => clearTimeout(t);
  }, [value, kept]);
  if (kept == null) return null;
  return <Closing.Provider value={value == null}>{children(kept)}</Closing.Provider>;
}

/**
 * Where overlays render: the app root, outside the page, so an animated
 * (transformed) ancestor can never become their containing block.
 */
const overlayRoot = () => document.querySelector('.app-root') ?? document.body;

/** Mount state for an overlay: stays mounted for EXIT_MS after it closes. */
function useOverlay(open: boolean) {
  const closing = useContext(Closing);
  const visible = open && !closing;
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (visible || !mounted) return;
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [visible, mounted]);
  return { visible, mounted };
}

/** `value` as of the last render where `keep` was true. */
function useHeld<T>(value: T, keep: boolean): T {
  const ref = useRef(value);
  /* eslint-disable react-hooks/refs -- holding the last open render's content is the point */
  if (keep) ref.current = value;
  return ref.current;
  /* eslint-enable react-hooks/refs */
}

/** Slide-in panel used for every add / edit form. */
export const Drawer: React.FC<{
  open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}> = ({ open, title, onClose, children, footer, wide }) => {
  const { visible, mounted } = useOverlay(open);
  // While sliding out, keep showing what was there: the caller may already have cleared the record.
  const shown = useHeld({ title, children, footer }, visible);
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className={clsx('fixed inset-0 z-50 flex justify-end', !visible && 'pointer-events-none')}>
      <div className={clsx('absolute inset-0 bg-black/30', visible ? 'fade-in' : 'fade-out')} onClick={onClose} />
      <div className={clsx('relative flex h-full w-full flex-col bg-surface shadow-2xl', wide ? 'max-w-2xl' : 'max-w-md', visible ? 'drawer-in' : 'drawer-out')}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[16px] font-semibold">{shown.title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-3 transition-colors hover:bg-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{shown.children}</div>
        {shown.footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{shown.footer}</div>}
      </div>
    </div>,
    overlayRoot(),
  );
};

/** Centred dialog box with a dimmed backdrop. */
export const Modal: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode; className?: string }> = ({
  open, onClose, children, className,
}) => {
  const { visible, mounted } = useOverlay(open);
  const shown = useHeld(children, visible);
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className={clsx('fixed inset-0 z-50 grid place-items-center p-4', !visible && 'pointer-events-none')}>
      <div className={clsx('absolute inset-0 bg-black/30', visible ? 'fade-in' : 'fade-out')} onClick={onClose} />
      <div className={clsx('relative w-full rounded-xl bg-surface p-5 shadow-2xl', className ?? 'max-w-sm', visible ? 'pop-in' : 'pop-out')}>{shown}</div>
    </div>,
    overlayRoot(),
  );
};

export const Confirm: React.FC<{
  open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void; busy?: boolean;
}> = ({ open, title, message, onCancel, onConfirm, busy }) => (
  <Modal open={open} onClose={onCancel}>
    <h2 className="text-[16px] font-semibold">{title}</h2>
    <p className="mt-2 text-ink-2">{message}</p>
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button variant="danger" onClick={onConfirm} loading={busy}>Delete</Button>
    </div>
  </Modal>
);

/** Height-animated show / hide for expandable sections. */
export const Reveal: React.FC<{ open: boolean; children: React.ReactNode; className?: string }> = ({ open, children, className }) => (
  <div className={clsx('grid transition-[grid-template-rows,opacity] duration-300 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')} aria-hidden={!open}>
    <div className={clsx('min-h-0 overflow-hidden', className)}>{children}</div>
  </div>
);

/* ---------------------------------- Select --------------------------------- */

/** Dot colour for an option or trigger given `data-tone`. */
const TONE_DOT: Record<Tone, string> = {
  gray: 'bg-ink-3', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-sky-500', accent: 'bg-accent',
};
const SEARCH_FROM = 8;

type Opt = { value: string; label: React.ReactNode; text: string; disabled?: boolean; tone?: Tone; hint?: string };
const textOf = (n: React.ReactNode): string =>
  typeof n === 'string' || typeof n === 'number' ? String(n)
    : Array.isArray(n) ? n.map(textOf).join('')
      : React.isValidElement<{ children?: React.ReactNode }>(n) ? textOf(n.props.children) : '';

type OptionProps = { value?: string | number; children?: React.ReactNode; disabled?: boolean; 'data-tone'?: Tone; 'data-hint'?: string };
const optionsOf = (children: React.ReactNode): Opt[] =>
  React.Children.toArray(children).flatMap(c => {
    if (!React.isValidElement<OptionProps>(c)) return [];
    if (c.type === React.Fragment) return optionsOf(c.props.children);
    const text = textOf(c.props.children);
    return [{ value: String(c.props.value ?? text), label: c.props.children, text, disabled: c.props.disabled, tone: c.props['data-tone'], hint: c.props['data-hint'] }];
  });

/** Bolds the part of `text` that matches the search. */
const Match: React.FC<{ text: string; q: string }> = ({ text, q }) => {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded-sm bg-accent-soft font-semibold text-accent">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
};

/**
 * Styled replacement for a native <select>. Takes the same <option> children,
 * and calls onChange with a `{ target: { value } }` shape so existing handlers work as-is.
 * Options may carry `data-tone` (a coloured dot) and `data-hint` (a second line);
 * lists of SEARCH_FROM or more options get a search box.
 */
export const Select: React.FC<{
  value?: string | number; onChange: (e: { target: { value: string } }) => void; children: React.ReactNode;
  className?: string; disabled?: boolean; title?: string; placeholder?: string;
}> = ({ value, onChange, children, className, disabled, title, placeholder = 'Select…' }) => {
  const opts = useMemo(() => optionsOf(children), [children]);
  const cur = value == null ? '' : String(value);
  const selected = opts.find(o => o.value === cur);
  const searchable = opts.length >= SEARCH_FROM;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean; max: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const shown = useMemo(() => (q ? opts.filter(o => o.text.toLowerCase().includes(q.toLowerCase())) : opts), [opts, q]);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 8;
    const up = below < 260 && r.top > below;
    const width = Math.max(r.width, searchable ? 240 : 0);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setPos({ left, top: up ? r.top - 6 : r.bottom + 6, width, up, max: Math.min(340, (up ? r.top : below) - 12) });
  }, [searchable]);

  const show = () => {
    if (disabled) return;
    place();
    setQ('');
    setActive(Math.max(0, opts.findIndex(o => o.value === cur)));
    setOpen(true);
  };
  const close = (focus = true) => { setOpen(false); if (focus) btn.current?.focus(); };
  const pick = (o: Opt) => {
    if (o.disabled) return;
    if (o.value !== cur) onChange({ target: { value: o.value } });
    close();
  };

  useEffect(() => {
    if (!open) return;
    if (searchable) input.current?.focus();
    const away = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) close(false);
    };
    const onScroll = (e: Event) => { if (!menu.current?.contains(e.target as Node)) close(false); };
    const onResize = () => close(false);
    document.addEventListener('mousedown', away);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', away);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    // Scroll only the list: scrollIntoView would also nudge the page, which closes the menu.
    const m = list.current;
    const el = open ? m?.querySelector<HTMLElement>('[data-i="' + active + '"]') : null;
    if (!m || !el) return;
    if (el.offsetTop < m.scrollTop) m.scrollTop = el.offsetTop - 6;
    else if (el.offsetTop + el.offsetHeight > m.scrollTop + m.clientHeight) m.scrollTop = el.offsetTop + el.offsetHeight - m.clientHeight + 6;
  }, [open, active]);

  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < shown.length; i += dir) if (!shown[i].disabled) return i;
    return from;
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => step(a, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => step(a, -1)); }
    else if (e.key === 'Home' && !searchable) { e.preventDefault(); setActive(step(-1, 1)); }
    else if (e.key === 'End' && !searchable) { e.preventDefault(); setActive(step(shown.length, -1)); }
    else if (e.key === 'Enter' || (e.key === ' ' && !searchable)) { e.preventDefault(); if (shown[active]) pick(shown[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close(false);
    else if (e.key.length === 1 && !searchable) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase(), at: now };
      const i = shown.findIndex(o => !o.disabled && o.text.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <>
      <button ref={btn} type="button" title={title} disabled={disabled} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => (open ? close() : show())} onKeyDown={onKey}
        className={clsx('field group flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60',
          open && 'field-open', className)}>
        {selected?.tone && <span className={clsx('h-2 w-2 shrink-0 rounded-full ring-[3px] ring-current/10', TONE_DOT[selected.tone])} />}
        <span className={clsx('min-w-0 flex-1 truncate', !selected && 'text-ink-3')}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={15} className={clsx('shrink-0 text-ink-3 transition-[transform,color] duration-200 group-hover:text-ink-2', open && 'rotate-180 text-accent!')} />
      </button>
      {open && pos && createPortal(
        <div ref={menu} onKeyDown={onKey}
          className={clsx('fixed z-[70] flex flex-col overflow-hidden rounded-xl border border-line bg-surface text-[13px] text-ink',
            'shadow-[0_18px_50px_-12px_rgb(15_23_42/.28),0_2px_6px_-2px_rgb(15_23_42/.08)]', pos.up ? 'menu-up' : 'menu-down')}
          style={{ left: pos.left, top: pos.up ? undefined : pos.top, bottom: pos.up ? window.innerHeight - pos.top : undefined, minWidth: pos.width, maxWidth: Math.max(pos.width, 340), maxHeight: pos.max }}>
          {searchable && (
            <div className="relative border-b border-line p-1.5">
              <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
              <input ref={input} value={q} onChange={e => { setQ(e.target.value); setActive(0); }} placeholder={'Search ' + opts.length + ' options…'}
                className="h-8 w-full rounded-lg bg-muted pl-8 pr-2 text-[13px] outline-none transition-shadow placeholder:text-ink-3 focus:shadow-[0_0_0_2px_var(--accent-soft)]" />
            </div>
          )}
          <div ref={list} role="listbox" className="relative min-h-0 flex-1 overflow-y-auto p-1.5">
            {shown.length ? shown.map((o, i) => {
              const on = o.value === cur;
              return (
                <div key={o.value + i} data-i={i} role="option" aria-selected={on} aria-disabled={o.disabled}
                  onMouseEnter={() => !o.disabled && setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(o)}
                  className={clsx('relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-100',
                    o.disabled && 'cursor-not-allowed opacity-40',
                    on ? 'bg-accent-soft text-accent' : i === active && !o.disabled ? 'bg-muted' : '')}>
                  {o.tone && <span className={clsx('h-2 w-2 shrink-0 rounded-full', TONE_DOT[o.tone])} />}
                  <span className="min-w-0 flex-1">
                    <span className={clsx('block truncate', on && 'font-semibold')}>{q && typeof o.label === 'string' ? <Match text={o.label} q={q} /> : o.label}</span>
                    {o.hint && <span className={clsx('block truncate text-[12px]', on ? 'text-accent/75' : 'text-ink-3')}>{o.hint}</span>}
                  </span>
                  <span className={clsx('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition-[opacity,transform] duration-150',
                    on ? 'scale-100 opacity-100' : 'scale-50 opacity-0')}><Check size={11} strokeWidth={3} /></span>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center gap-1 px-3 py-6 text-center text-ink-3">
                <Search size={16} />
                <span>{q ? 'Nothing matches “' + q + '”' : 'No options'}</span>
              </div>
            )}
          </div>
          {searchable && (
            <div className="flex items-center justify-between border-t border-line bg-muted/50 px-3 py-1.5 text-[11px] text-ink-3">
              <span>{q ? shown.length + ' of ' + opts.length : opts.length + ' options'}</span>
              <span className="hidden sm:inline"><kbd className="font-sans">↑↓</kbd> move · <kbd className="font-sans">Enter</kbd> pick · <kbd className="font-sans">Esc</kbd> close</span>
            </div>
          )}
        </div>,
        overlayRoot(),
      )}
    </>
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
        <table key={page} className="fade-in text-left">
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
                className={clsx('border-b border-line transition-colors duration-150 last:border-0', onRowClick ? 'cursor-pointer hover:bg-muted/60' : 'hover:bg-muted/30')}
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
}) => {
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`);
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [value, tabs.length]);
  return (
    <div ref={wrap} className="relative inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-1">
      {pill && <span className="absolute top-1 bottom-1 rounded-md bg-surface shadow-sm transition-all duration-300 ease-out" style={{ left: pill.left, width: pill.width }} />}
      {tabs.map(t => (
        <button
          key={t.id}
          data-tab={t.id}
          onClick={() => onChange(t.id)}
          className={clsx('relative whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-200', value === t.id ? 'text-ink' : 'text-ink-2 hover:text-ink')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

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
  const [items, setItems] = useState<{ id: number; msg: string; tone: 'ok' | 'err'; leaving?: boolean }[]>([]);
  useEffect(() => {
    toastListener = (msg, tone) => {
      const id = Date.now() + Math.random();
      setItems(list => [...list, { id, msg, tone }]);
      setTimeout(() => setItems(list => list.map(t => (t.id === id ? { ...t, leaving: true } : t))), 3000);
      setTimeout(() => setItems(list => list.filter(t => t.id !== id)), 3000 + EXIT_MS);
    };
    return () => { toastListener = null; };
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2">
      {items.map(t => (
        <div
          key={t.id}
          className={clsx('flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium text-white shadow-lg',
            t.tone === 'ok' ? 'bg-gray-900' : 'bg-red-600', t.leaving ? 'toast-out' : 'toast-in')}
        >
          {t.tone === 'ok' ? <Check size={15} className="text-emerald-400" /> : <X size={15} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
};
