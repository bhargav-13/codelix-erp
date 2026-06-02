import { ordersApi } from './orders';
import { invoiceApi } from './invoice';
import { paymentApi } from './payment';
import { stockItemApi, rawItemApi } from './inventory';
import { subcontractingApi } from './subcontracting';
import {
  OrderFloor,
  InvoiceFloor,
  PaymentFloor,
  InvoiceStatus,
  PaymentStatus,
  InventoryStatus,
  SubcontractingStatus,
  BillingType,
} from '../types';
import type {
  Order,
  Subcontracting,
  Invoice,
  Payment,
  StockItem,
  RawItem,
} from '../types';

async function fetchAll<T>(fetchFunction: (page: number) => Promise<{ data: T[], totalPages: number }>): Promise<T[]> {
  let allItems: T[] = [];
  let currentPage = 0;
  let totalPages = 1;

  while (currentPage < totalPages) {
    const result = await fetchFunction(currentPage);
    allItems = allItems.concat(result.data);
    totalPages = result.totalPages;
    currentPage++;
  }

  return allItems;
}

// Dashboard Types
export interface KeyMetrics {
  totalSales: number;
  totalOrders: number;
  pendingInvoices: number;
  overduePayments: number;
  completedOrders: number;
  pendingOrders: number;
  totalInventoryValue: number;
  lowStockCount: number;
  activeSubcontracts: number;
  totalOutstanding: number;
}

export interface FloorMetrics {
  floor: string;
  orders: number;
  sales: number;
  invoices: number;
  payments: number;
}

export interface OrderStatusData {
  status: string;
  count: number;
  amount: number;
}

export interface PaymentStatusData {
  status: string;
  count: number;
  amount: number;
  color: string;
}

export interface InvoiceStatusData {
  status: string;
  count: number;
  officialBill: number;
  offlineBill: number;
}

export interface SubcontractingMetrics {
  inProcess: number;
  completed: number;
  rejected: number;
  totalSentStock: number;
  totalAmount: number;
}

export interface TopCustomer {
  name: string;
  orders: number;
  totalAmount: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface DailyTrend {
  date: string;
  sales: number;
  orders: number;
}

export interface MonthlyTrend {
  month: string;
  sales: number;
  orders: number;
  invoices: number;
}

export interface FullDashboardData {
  keyMetrics: KeyMetrics;
  floorComparison: FloorMetrics[];
  orderStatusBreakdown: OrderStatusData[];
  paymentStatusBreakdown: PaymentStatusData[];
  invoiceStatusBreakdown: InvoiceStatusData[];
  subcontractingMetrics: SubcontractingMetrics;
  recentOrders: Order[];
  recentInvoices: Invoice[];
  overduePayments: Payment[];
  lowStockItems: StockItem[];
  lowStockRawItems: RawItem[];
  activeSubcontracts: Subcontracting[];
  salesTrend: DailyTrend[];
  categoryDistribution: { name: string; value: number }[];
  topCustomers: TopCustomer[];
  topProducts: TopProduct[];
}

export const dashboardApi = {
  // Fetch all data for both floors and both billing modes
  fetchAllData: async () => {
    // Use safe fetch — returns [] on error so one failing endpoint doesn't break the whole dashboard
    const safeArray = <T>(p: Promise<T[]>): Promise<T[]> => p.catch(() => [] as T[]);

    const [
      groundFloorOrders,
      firstFloorOrders,
      groundFloorInvoicesOfficial,
      groundFloorInvoicesOffline,
      firstFloorInvoicesOfficial,
      firstFloorInvoicesOffline,
      groundFloorPaymentsOfficial,
      groundFloorPaymentsOffline,
      firstFloorPaymentsOfficial,
      firstFloorPaymentsOffline,
      allStockItems,
      allRawItems,
      allSubcontracts,
    ] = await Promise.all([
      safeArray(fetchAll<Order>(page => ordersApi.getOrderList({ floor: OrderFloor.GROUND_FLOOR, page, size: 100 }))),
      safeArray(fetchAll<Order>(page => ordersApi.getOrderList({ floor: OrderFloor.FIRST_FLOOR, page, size: 100 }))),
      safeArray(fetchAll<Invoice>(page => invoiceApi.getInvoiceList({ floor: InvoiceFloor.GROUND_FLOOR, mode: BillingType.OFFICIAL, page, size: 100 }))),
      safeArray(fetchAll<Invoice>(page => invoiceApi.getInvoiceList({ floor: InvoiceFloor.GROUND_FLOOR, mode: BillingType.OFFLINE, page, size: 100 }))),
      safeArray(fetchAll<Invoice>(page => invoiceApi.getInvoiceList({ floor: InvoiceFloor.FIRST_FLOOR, mode: BillingType.OFFICIAL, page, size: 100 }))),
      safeArray(fetchAll<Invoice>(page => invoiceApi.getInvoiceList({ floor: InvoiceFloor.FIRST_FLOOR, mode: BillingType.OFFLINE, page, size: 100 }))),
      safeArray(fetchAll<Payment>(page => paymentApi.getPaymentList({ floor: PaymentFloor.GROUND_FLOOR, mode: BillingType.OFFICIAL, page, size: 100 }))),
      safeArray(fetchAll<Payment>(page => paymentApi.getPaymentList({ floor: PaymentFloor.GROUND_FLOOR, mode: BillingType.OFFLINE, page, size: 100 }))),
      safeArray(fetchAll<Payment>(page => paymentApi.getPaymentList({ floor: PaymentFloor.FIRST_FLOOR, mode: BillingType.OFFICIAL, page, size: 100 }))),
      safeArray(fetchAll<Payment>(page => paymentApi.getPaymentList({ floor: PaymentFloor.FIRST_FLOOR, mode: BillingType.OFFLINE, page, size: 100 }))),
      stockItemApi.getAllStockItems().catch(() => [] as StockItem[]),
      rawItemApi.getRawItems(0, 1000).then(res => res.data).catch(() => [] as RawItem[]),
      safeArray(fetchAll<Subcontracting>(page => subcontractingApi.getSubcontractingList({ page, size: 100 }))),
    ]);

    const groundFloorInvoices = [...groundFloorInvoicesOfficial, ...groundFloorInvoicesOffline];
    const firstFloorInvoices = [...firstFloorInvoicesOfficial, ...firstFloorInvoicesOffline];
    const groundFloorPayments = [...groundFloorPaymentsOfficial, ...groundFloorPaymentsOffline];
    const firstFloorPayments = [...firstFloorPaymentsOfficial, ...firstFloorPaymentsOffline];

    return {
      groundFloorOrders,
      firstFloorOrders,
      allOrders: [...groundFloorOrders, ...firstFloorOrders],
      groundFloorInvoices,
      firstFloorInvoices,
      allInvoices: [...groundFloorInvoices, ...firstFloorInvoices],
      groundFloorPayments,
      firstFloorPayments,
      allPayments: [...groundFloorPayments, ...firstFloorPayments],
      allStockItems,
      allRawItems,
      allSubcontracts,
    };
  },

  getFullDashboard: async (): Promise<FullDashboardData> => {
    const data = await dashboardApi.fetchAllData();
    const {
      groundFloorOrders,
      firstFloorOrders,
      allOrders,
      groundFloorInvoices,
      firstFloorInvoices,
      allInvoices,
      groundFloorPayments,
      firstFloorPayments,
      allPayments,
      allStockItems,
      allRawItems,
      allSubcontracts,
    } = data;

    // Key Metrics
    const totalSales = allOrders.reduce((sum, order) => sum + order.grandTotal, 0);
    const totalOrders = allOrders.length;
    const completedOrders = allOrders.filter(o => o.orderStatus === 'COMPLETED').length;
    const pendingOrders = allOrders.filter(o => o.orderStatus === 'PENDING').length;
    const pendingInvoices = allInvoices.filter(inv => inv.invoiceStatus === InvoiceStatus.PENDING).length;
    const overduePayments = allPayments.filter(p => p.paymentStatus === PaymentStatus.OVERDUE).length;
    const totalInventoryValue = allStockItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const lowStockCount = allStockItems.filter(item => item.status === InventoryStatus.LOW_STOCK).length +
      allRawItems.filter(item => item.status === InventoryStatus.LOW_STOCK).length;
    const activeSubcontracts = allSubcontracts.filter(s => s.status === SubcontractingStatus.IN_PROCESS).length;
    const totalOutstanding = allPayments.reduce((sum, p) => {
      const outstanding = (p.totalAmount || 0) - (p.receivedAmount || 0);
      return sum + Math.max(0, outstanding);
    }, 0);

    const keyMetrics: KeyMetrics = {
      totalSales,
      totalOrders,
      pendingInvoices,
      overduePayments,
      completedOrders,
      pendingOrders,
      totalInventoryValue,
      lowStockCount,
      activeSubcontracts,
      totalOutstanding,
    };

    // Floor Comparison
    const floorComparison: FloorMetrics[] = [
      {
        floor: 'Ground Floor',
        orders: groundFloorOrders.length,
        sales: groundFloorOrders.reduce((sum, o) => sum + o.grandTotal, 0),
        invoices: groundFloorInvoices.length,
        payments: groundFloorPayments.length,
      },
      {
        floor: 'First Floor',
        orders: firstFloorOrders.length,
        sales: firstFloorOrders.reduce((sum, o) => sum + o.grandTotal, 0),
        invoices: firstFloorInvoices.length,
        payments: firstFloorPayments.length,
      },
    ];

    // Order Status Breakdown
    const orderStatusBreakdown: OrderStatusData[] = [
      {
        status: 'Completed',
        count: completedOrders,
        amount: allOrders.filter(o => o.orderStatus === 'COMPLETED').reduce((sum, o) => sum + o.grandTotal, 0),
      },
      {
        status: 'Pending',
        count: pendingOrders,
        amount: allOrders.filter(o => o.orderStatus === 'PENDING').reduce((sum, o) => sum + o.grandTotal, 0),
      },
    ];

    // Payment Status Breakdown
    const overduePaymentsList = allPayments.filter(p => p.paymentStatus === PaymentStatus.OVERDUE);
    const dueSoonPayments = allPayments.filter(p => p.paymentStatus === PaymentStatus.DUE_SOON);
    const upcomingPayments = allPayments.filter(p => p.paymentStatus === PaymentStatus.UPCOMING);

    const paymentStatusBreakdown: PaymentStatusData[] = [
      {
        status: 'Overdue',
        count: overduePaymentsList.length,
        amount: overduePaymentsList.reduce((sum, p) => sum + ((p.totalAmount || 0) - (p.receivedAmount || 0)), 0),
        color: '#ef4444',
      },
      {
        status: 'Due Soon',
        count: dueSoonPayments.length,
        amount: dueSoonPayments.reduce((sum, p) => sum + ((p.totalAmount || 0) - (p.receivedAmount || 0)), 0),
        color: '#f59e0b',
      },
      {
        status: 'Upcoming',
        count: upcomingPayments.length,
        amount: upcomingPayments.reduce((sum, p) => sum + ((p.totalAmount || 0) - (p.receivedAmount || 0)), 0),
        color: '#22c55e',
      },
    ];

    // Invoice Status Breakdown
    const pendingInvoicesList = allInvoices.filter(inv => inv.invoiceStatus === InvoiceStatus.PENDING);
    const completedInvoices = allInvoices.filter(inv => inv.invoiceStatus === InvoiceStatus.COMPLETED);

    const invoiceStatusBreakdown: InvoiceStatusData[] = [
      {
        status: 'Pending',
        count: pendingInvoicesList.length,
        officialBill: pendingInvoicesList.reduce((sum, inv) => sum + inv.order.officialBillAmount, 0),
        offlineBill: pendingInvoicesList.reduce((sum, inv) => sum + (inv.order.offlineTotal || 0), 0),
      },
      {
        status: 'Completed',
        count: completedInvoices.length,
        officialBill: completedInvoices.reduce((sum, inv) => sum + inv.order.officialBillAmount, 0),
        offlineBill: completedInvoices.reduce((sum, inv) => sum + (inv.order.offlineTotal || 0), 0),
      },
    ];

    // Subcontracting Metrics
    const subcontractingMetrics: SubcontractingMetrics = {
      inProcess: allSubcontracts.filter(s => s.status === SubcontractingStatus.IN_PROCESS).length,
      completed: allSubcontracts.filter(s => s.status === SubcontractingStatus.COMPLETED).length,
      rejected: allSubcontracts.filter(s => s.status === SubcontractingStatus.REJECTED).length,
      totalSentStock: allSubcontracts.reduce((sum, s) => sum + s.sentStock, 0),
      totalAmount: allSubcontracts.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    };

    // Recent Orders (last 10)
    const recentOrders = [...allOrders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 10);

    // Recent Invoices (last 10)
    const recentInvoices = [...allInvoices]
      .sort((a, b) => new Date(b.order.orderDate).getTime() - new Date(a.order.orderDate).getTime())
      .slice(0, 10);

    // Overdue Payments
    const overduePaymentDetails = overduePaymentsList.slice(0, 10);

    // Low Stock Items
    const lowStockItems = allStockItems.filter(item => item.status === InventoryStatus.LOW_STOCK);
    const lowStockRawItems = allRawItems.filter(item => item.status === InventoryStatus.LOW_STOCK);

    // Active Subcontracts
    const activeSubcontractsList = allSubcontracts
      .filter(s => s.status === SubcontractingStatus.IN_PROCESS)
      .slice(0, 10);

    // Sales Trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesByDate: { [date: string]: { sales: number; orders: number } } = {};
    for (const order of allOrders) {
      const orderDate = new Date(order.orderDate);
      if (orderDate >= thirtyDaysAgo) {
        const dateString = order.orderDate;
        if (!salesByDate[dateString]) {
          salesByDate[dateString] = { sales: 0, orders: 0 };
        }
        salesByDate[dateString].sales += order.grandTotal;
        salesByDate[dateString].orders += 1;
      }
    }

    const salesTrend: DailyTrend[] = Object.entries(salesByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Category Distribution
    const categoryData = allStockItems.reduce((acc, item) => {
      const categoryName = item.category.categoryName;
      acc[categoryName] = (acc[categoryName] || 0) + item.totalPrice;
      return acc;
    }, {} as { [key: string]: number });

    const categoryDistribution = Object.entries(categoryData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Top Customers
    const customerData: { [name: string]: { orders: number; totalAmount: number } } = {};
    for (const order of allOrders) {
      const customerName = order.party?.name || order.customerName || 'Unknown';
      if (!customerData[customerName]) {
        customerData[customerName] = { orders: 0, totalAmount: 0 };
      }
      customerData[customerName].orders += 1;
      customerData[customerName].totalAmount += order.grandTotal;
    }

    const topCustomers: TopCustomer[] = Object.entries(customerData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // Top Products
    const productData: { [name: string]: { quantity: number; revenue: number } } = {};
    for (const order of allOrders) {
      if (!order.products) continue;
      for (const product of order.products) {
        if (!productData[product.productName]) {
          productData[product.productName] = { quantity: 0, revenue: 0 };
        }
        productData[product.productName].quantity += (product.quantityKg || 0) + (product.quantityPc || 0);
        productData[product.productName].revenue += product.totalAmount;
      }
    }

    const topProducts: TopProduct[] = Object.entries(productData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      keyMetrics,
      floorComparison,
      orderStatusBreakdown,
      paymentStatusBreakdown,
      invoiceStatusBreakdown,
      subcontractingMetrics,
      recentOrders,
      recentInvoices,
      overduePayments: overduePaymentDetails,
      lowStockItems,
      lowStockRawItems,
      activeSubcontracts: activeSubcontractsList,
      salesTrend,
      categoryDistribution,
      topCustomers,
      topProducts,
    };
  },

  getKeyMetrics: async () => {
    const groundFloorOrders = await fetchAll<Order>(page => ordersApi.getOrderList({ floor: OrderFloor.GROUND_FLOOR, page, size: 100 }));
    const firstFloorOrders = await fetchAll<Order>(page => ordersApi.getOrderList({ floor: OrderFloor.FIRST_FLOOR, page, size: 100 }));
    const allOrders = [...groundFloorOrders, ...firstFloorOrders];

    const safeArray = <T>(p: Promise<T[]>): Promise<T[]> => p.catch(() => [] as T[]);
    const [
      groundFloorInvoicesOfficial,
      groundFloorInvoicesOffline,
      firstFloorInvoicesOfficial,
      firstFloorInvoicesOffline,
    ] = await Promise.all([
      safeArray(fetchAll<Invoice>(page => invoiceApi.getInvoiceList({ floor: InvoiceFloor.GROUND_FLOOR, mode: BillingType.OFFICIAL, page, size: 100 }))),
      safeArray(fetchAll<Invoice>(page => invoiceApi.getInvoiceList({ floor: InvoiceFloor.GROUND_FLOOR, mode: BillingType.OFFLINE, page, size: 100 }))),
      safeArray(fetchAll<Invoice>(page => invoiceApi.getInvoiceList({ floor: InvoiceFloor.FIRST_FLOOR, mode: BillingType.OFFICIAL, page, size: 100 }))),
      safeArray(fetchAll<Invoice>(page => invoiceApi.getInvoiceList({ floor: InvoiceFloor.FIRST_FLOOR, mode: BillingType.OFFLINE, page, size: 100 }))),
    ]);
    const allInvoices = [...groundFloorInvoicesOfficial, ...groundFloorInvoicesOffline, ...firstFloorInvoicesOfficial, ...firstFloorInvoicesOffline];

    const [
      groundFloorPaymentsOfficial,
      groundFloorPaymentsOffline,
      firstFloorPaymentsOfficial,
      firstFloorPaymentsOffline,
    ] = await Promise.all([
      safeArray(fetchAll<Payment>(page => paymentApi.getPaymentList({ floor: PaymentFloor.GROUND_FLOOR, mode: BillingType.OFFICIAL, page, size: 100 }))),
      safeArray(fetchAll<Payment>(page => paymentApi.getPaymentList({ floor: PaymentFloor.GROUND_FLOOR, mode: BillingType.OFFLINE, page, size: 100 }))),
      safeArray(fetchAll<Payment>(page => paymentApi.getPaymentList({ floor: PaymentFloor.FIRST_FLOOR, mode: BillingType.OFFICIAL, page, size: 100 }))),
      safeArray(fetchAll<Payment>(page => paymentApi.getPaymentList({ floor: PaymentFloor.FIRST_FLOOR, mode: BillingType.OFFLINE, page, size: 100 }))),
    ]);
    const allPayments = [...groundFloorPaymentsOfficial, ...groundFloorPaymentsOffline, ...firstFloorPaymentsOfficial, ...firstFloorPaymentsOffline];

    const totalSales = allOrders.reduce((sum, order) => sum + order.grandTotal, 0);
    const totalOrders = allOrders.length;
    const pendingInvoices = allInvoices.filter(invoice => invoice.invoiceStatus === InvoiceStatus.PENDING).length;
    const overduePayments = allPayments.filter(payment => payment.paymentStatus === PaymentStatus.OVERDUE).length;

    return {
      totalSales,
      totalOrders,
      pendingInvoices,
      overduePayments,
    };
  },

  getRecentOrders: async (): Promise<Order[]> => {
    const groundFloorOrders = await ordersApi.getOrderList({ floor: OrderFloor.GROUND_FLOOR, page: 0, size: 5 });
    const firstFloorOrders = await ordersApi.getOrderList({ floor: OrderFloor.FIRST_FLOOR, page: 0, size: 5 });

    const allOrders = [...groundFloorOrders.data, ...firstFloorOrders.data];

    return allOrders
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5);
  },

  getSalesTrendData: async (): Promise<{ date: string; sales: number }[]> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const groundFloorOrders = await fetchAll<Order>(page => ordersApi.getOrderList({ floor: OrderFloor.GROUND_FLOOR, page, size: 100 }));
    const firstFloorOrders = await fetchAll<Order>(page => ordersApi.getOrderList({ floor: OrderFloor.FIRST_FLOOR, page, size: 100 }));
    const allOrders = [...groundFloorOrders, ...firstFloorOrders];

    const salesByDate: { [date: string]: number } = {};

    for (const order of allOrders) {
      const orderDate = new Date(order.orderDate);
      if (orderDate >= thirtyDaysAgo) {
        const dateString = order.orderDate;
        salesByDate[dateString] = (salesByDate[dateString] || 0) + order.grandTotal;
      }
    }

    return Object.entries(salesByDate)
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  getInventorySummary: async () => {
    const allStockItems = await stockItemApi.getAllStockItems();

    const categoryData = allStockItems.reduce((acc, item) => {
      const categoryName = item.category.categoryName;
      acc[categoryName] = (acc[categoryName] || 0) + item.quantityInKg;
      return acc;
    }, {} as { [key: string]: number });

    const lowStockItems = allStockItems.filter(item => item.status === InventoryStatus.LOW_STOCK);

    return {
      categoryData: Object.entries(categoryData).map(([name, value]) => ({ name, value })),
      lowStockItems,
    };
  },

  getRecentSubcontracting: async (): Promise<Subcontracting[]> => {
    const response = await subcontractingApi.getSubcontractingList({
      page: 0,
      size: 5,
      status: SubcontractingStatus.IN_PROCESS,
    });
    return response.data;
  },
};