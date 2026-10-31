import type { LucideIcon } from 'lucide-react';
import {
  Banknote, Boxes, Building2, Droplets, PackageCheck, Store, CalendarCheck, ClipboardList, Factory, FileText, Flame, Gauge, Globe, Handshake, Home, LayoutDashboard,
  Layers, Package, Receipt, ScanFace, Settings, ShoppingCart, Tags, Trash2, Truck, Undo2, Users, Wallet, Warehouse, Zap, BellRing, Hammer, Sparkles, Clock, Ban,
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
      { label: 'CRM', path: '/crm', icon: Gauge, source: 'demo' },
      { label: 'Orders', path: '/orders', icon: ShoppingCart, source: 'live' },
      { label: 'Invoices', path: '/invoices', icon: Receipt, source: 'live' },
      { label: 'Export invoices', path: '/export-invoices', icon: Globe, source: 'demo' },
      { label: 'Payments', path: '/payments', icon: BellRing, source: 'live' },
      { label: 'Purchase bills', path: '/bills/purchase', icon: FileText, source: 'demo' },
      { label: 'Sales bills', path: '/bills/sales', icon: FileText, source: 'demo' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock', path: '/stock', icon: Boxes, source: 'live' },
      { label: 'Raw materials', path: '/raw-materials', icon: Layers, source: 'live' },
      { label: 'Products', path: '/products', icon: Package, source: 'live' },
      { label: 'Item master', path: '/item-master', icon: Tags, source: 'demo' },
      { label: 'Categories', path: '/categories', icon: ClipboardList, source: 'live' },
      { label: 'Purchase', path: '/purchase', icon: Truck, source: 'live' },
      { label: 'Rejection', path: '/rejection', icon: Undo2, source: 'live' },
    ],
  },
  {
    label: 'Production',
    items: [
      { label: 'Subcontracting (Job work)', path: '/subcontracting', icon: Factory, source: 'demo' },
      { label: 'Subcontractor', path: '/subcontractor', icon: Users, source: 'demo' },
      { label: 'Crome', path: '/crome', icon: Sparkles, source: 'demo' },
      { label: 'Job work rejection', path: '/subcontracting/rejection', icon: Ban, source: 'demo' },
      { label: 'Casting', path: '/casting', icon: Flame, source: 'live' },
      { label: 'Forging', path: '/forging', icon: Hammer, source: 'live' },
      { label: 'Scrap', path: '/scrap', icon: Trash2, source: 'live' },
      { label: 'Gres', path: '/gres', icon: Droplets, source: 'demo' },
      { label: 'In-house plating', path: '/in-house-plating', icon: Home, source: 'demo' },
      { label: 'Outside job work', path: '/outside-job-work', icon: Building2, source: 'demo' },
      { label: 'Outside gres', path: '/outside-gres', icon: Warehouse, source: 'demo' },
      { label: 'Packing invoices', path: '/packing', icon: PackageCheck, source: 'demo' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Client management', path: '/client-management', icon: Handshake, source: 'demo' },
      { label: 'Client portal', path: '/client-portal', icon: Store, source: 'demo' },
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
      { label: 'Cashflow', path: '/cashflow', icon: Wallet, source: 'live' },
      { label: 'Electricity', path: '/electric', icon: Zap, source: 'live' },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', path: '/settings', icon: Settings, source: 'demo' }],
  },
];

export const ALL_ITEMS = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g.label })));
