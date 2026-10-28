import type { LucideIcon } from 'lucide-react';
import {
  Banknote, Boxes, CalendarCheck, ClipboardList, Factory, Flame, Gauge, Handshake, LayoutDashboard, Layers, Package,
  Receipt, ScanFace, Settings, ShoppingCart, Trash2, Truck, Undo2, Users, Wallet, Zap, BellRing, Hammer, Sparkles, Clock,
} from 'lucide-react';

/**
 * Where a module's data comes from.
 *  live — the existing 4bitx backend (api.4bitx.com) through src/api/*
 *  demo — browser-only sample data (src/app/data/*), no backend needed
 * Only shown on the Settings → Data sources screen, never in the sidebar.
 */
export type Source = 'live' | 'demo';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  source: Source;
  /** Still the pre-rebuild page; rebuilt in the new UI in a later phase. */
  legacy?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, source: 'live' }],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Parties', path: '/parties', icon: Handshake, source: 'live' },
      { label: 'CRM', path: '/crm', icon: Gauge, source: 'live', legacy: true },
      { label: 'Orders', path: '/orders', icon: ShoppingCart, source: 'live' },
      { label: 'Invoices', path: '/invoices', icon: Receipt, source: 'live' },
      { label: 'Payments', path: '/payments', icon: BellRing, source: 'live' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock', path: '/stock', icon: Boxes, source: 'live' },
      { label: 'Raw materials', path: '/raw-materials', icon: Layers, source: 'live' },
      { label: 'Products', path: '/products', icon: Package, source: 'live' },
      { label: 'Categories', path: '/categories', icon: ClipboardList, source: 'live' },
      { label: 'Purchase', path: '/purchase', icon: Truck, source: 'live' },
      { label: 'Rejection', path: '/rejection', icon: Undo2, source: 'live' },
    ],
  },
  {
    label: 'Production',
    items: [
      { label: 'Subcontracting', path: '/subcontracting', icon: Factory, source: 'live', legacy: true },
      { label: 'Subcontractors', path: '/subcontractor', icon: Users, source: 'live', legacy: true },
      { label: 'Chrome plating', path: '/crome', icon: Sparkles, source: 'live', legacy: true },
      { label: 'Casting', path: '/casting', icon: Flame, source: 'live', legacy: true },
      { label: 'Forging', path: '/forging', icon: Hammer, source: 'live', legacy: true },
      { label: 'Scrap · A', path: '/scrap/kevin', icon: Trash2, source: 'live', legacy: true },
      { label: 'Scrap · B', path: '/scrap/jayesh', icon: Trash2, source: 'live', legacy: true },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Employees', path: '/hr/employees', icon: Users, source: 'demo' },
      { label: 'Attendance', path: '/hr/attendance', icon: CalendarCheck, source: 'demo' },
      { label: 'Face kiosk', path: '/hr/kiosk', icon: ScanFace, source: 'demo' },
      { label: 'Leave', path: '/hr/leave', icon: Clock, source: 'demo' },
      { label: 'Payroll', path: '/hr/payroll', icon: Banknote, source: 'demo' },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { label: 'Cashflow', path: '/cashflow', icon: Wallet, source: 'live', legacy: true },
      { label: 'Electricity', path: '/electric', icon: Zap, source: 'live', legacy: true },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', path: '/settings', icon: Settings, source: 'demo' }],
  },
];

export const ALL_ITEMS = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.label })));
