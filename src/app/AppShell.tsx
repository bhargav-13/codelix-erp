import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBlackMode } from '../contexts/BlackModeContext';
import { ALL_ITEMS, NAV } from './nav';
import { useSettings } from './settings';
import { cx, Toaster } from './ui';

export const Logo: React.FC<{ size?: number }> = ({ size = 32 }) => {
  const { settings } = useSettings();
  if (settings.logoDataUrl) {
    return <img src={settings.logoDataUrl} alt="" style={{ width: size, height: size }} className="rounded-lg object-contain" />;
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-lg bg-accent text-[13px] font-bold text-accent-fg"
    >
      {settings.companyName.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'ER'}
    </span>
  );
};

/** Ctrl+K quick jump across every module. */
const CommandSearch: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(
    () => ALL_ITEMS.filter(i => `${i.group} ${i.label}`.toLowerCase().includes(q.toLowerCase())).slice(0, 10),
    [q],
  );
  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);
  if (!open) return null;
  const go = (path: string) => { navigate(path); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/30 px-4 pt-[12vh]" onClick={onClose}>
      <div className="h-fit w-full max-w-lg overflow-hidden rounded-xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={16} className="text-ink-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setActive(0); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
              if (e.key === 'Enter' && results[active]) go(results[active].path);
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Jump to…"
            className="h-12 flex-1 bg-transparent outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.map((r, i) => (
            <button
              key={r.path}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.path)}
              className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', i === active && 'bg-muted')}
            >
              <r.icon size={16} className="text-ink-3" />
              <span className="flex-1">{r.label}</span>
              <span className="text-[12px] text-ink-3">{r.group}</span>
            </button>
          ))}
          {!results.length && <div className="px-3 py-6 text-center text-ink-3">No matches</div>}
        </div>
      </div>
    </div>
  );
};

const AppShell: React.FC = () => {
  const { settings, update } = useSettings();
  const { user, signOut } = useAuth();
  const { isBlackMode, deactivateBlackMode } = useBlackMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('app:nav-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    try { localStorage.setItem('app:nav-collapsed', collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); setCollapsed(c => !c); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Longest match wins, so /subcontracting/rejection is not taken for /subcontracting.
  const current = ALL_ITEMS.filter(i => location.pathname.startsWith(i.path)).sort((a, b) => b.path.length - a.path.length)[0];
  const logout = () => {
    if (isBlackMode) deactivateBlackMode();
    signOut();
    navigate('/login');
  };

  const sidebar = (
    <aside
      className={cx(
        'flex h-full flex-col border-r border-line bg-surface transition-[width] duration-200',
        collapsed ? 'lg:w-[68px]' : 'lg:w-[248px]',
        'w-[260px]',
      )}
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
        <Logo />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">{settings.companyName}</div>
            <div className="truncate text-[11px] text-ink-3">{settings.tagline}</div>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {NAV.map(group => (
          <div key={group.label} className="mb-3">
            {!collapsed && <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{group.label}</div>}
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={ALL_ITEMS.some(o => o.path !== item.path && o.path.startsWith(`${item.path}/`))}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => cx(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors',
                  isActive ? 'bg-accent-soft font-medium text-accent' : 'text-ink-2 hover:bg-muted hover:text-ink',
                  collapsed && 'lg:justify-center',
                )}
              >
                <item.icon size={17} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );

  return (
    <div className="app-root flex h-screen overflow-hidden">
      <div className="hidden lg:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
          <button className="rounded-md p-1.5 text-ink-2 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
          <button className="hidden rounded-md p-1.5 text-ink-2 hover:bg-muted lg:block" onClick={() => setCollapsed(c => !c)} title="Toggle sidebar (Ctrl+B)">
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="hidden truncate text-[13px] text-ink-3 sm:block">
            {current ? <>{current.group} <span className="mx-1">/</span> <span className="text-ink">{current.label}</span></> : null}
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="ml-auto flex h-9 w-full max-w-[260px] items-center gap-2 rounded-lg border border-line bg-bg px-3 text-[13px] text-ink-3"
          >
            <Search size={15} /> <span className="flex-1 text-left">Search modules</span>
            <kbd className="hidden rounded border border-line px-1.5 text-[11px] sm:inline">Ctrl K</kbd>
          </button>
          <button className="rounded-md p-1.5 text-ink-2 hover:bg-muted" onClick={() => update({ dark: !settings.dark })} title="Theme">
            {settings.dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-[12px] font-semibold uppercase">
              {(user?.email || 'O').slice(0, 1)}
            </span>
          </div>
          <button className="rounded-md p-1.5 text-ink-2 hover:bg-muted" onClick={logout} title="Sign out"><LogOut size={18} /></button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] p-4 sm:p-6"><Outlet /></div>
        </main>
      </div>
      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toaster />
    </div>
  );
};

export default AppShell;
