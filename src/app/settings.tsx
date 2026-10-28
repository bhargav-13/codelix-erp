import React, { createContext, useContext, useEffect, useState } from 'react';

/** Per-browser branding so the demo can be dressed up for each prospect. */
export interface CompanySettings {
  companyName: string;
  tagline: string;
  industry: 'forging' | 'plating' | 'manufacturing';
  accent: string;
  logoDataUrl?: string;
  dark: boolean;
}

const KEY = 'app:settings';
const DEFAULTS: CompanySettings = {
  companyName: '4bitx ERP',
  tagline: 'Manufacturing, simplified',
  industry: 'manufacturing',
  accent: '#4f46e5',
  dark: false,
};

export const ACCENTS = ['#4f46e5', '#0f766e', '#2563eb', '#c2410c', '#be123c', '#7c3aed', '#111827'];

function load(): CompanySettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

const Ctx = createContext<{ settings: CompanySettings; update: (p: Partial<CompanySettings>) => void } | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', settings.accent);
    root.classList.toggle('dark', settings.dark);
    document.title = `${settings.companyName} · ERP`;
  }, [settings]);

  const update = (p: Partial<CompanySettings>) =>
    setSettings(s => {
      const next = { ...s, ...p };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
      return next;
    });

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
};

export const useSettings = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSettings must be used within SettingsProvider');
  return c;
};
