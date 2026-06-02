import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { dashboardApi } from "../api/dashboard";
import type { FullDashboardData } from "../api/dashboard";
import type {
  Order,
  Invoice,
  Payment,
  StockItem,
  RawItem,
  Subcontracting,
} from "../types";
import "./DashboardPage.css";

// SVG Icon Components
const IconRupee = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3c2.5 0 4.5-2 4.5-4.5S11.5 4 9 4H6" />
  </svg>
);

const IconClock = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconPackage = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconTool = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const IconFileText = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconClipboard = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const IconCheck = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconFolder = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return "₹0";
  }
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  } else if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value.toFixed(0)}`;
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color: string;
  icon: React.ReactNode;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  color,
  icon,
}) => (
  <div className="kpi-card" style={{ borderLeftColor: color }}>
    <div className="kpi-icon" style={{ backgroundColor: `${color}15`, color }}>
      {icon}
    </div>
    <div className="kpi-content">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
      {trend && trendValue && (
        <div className={`kpi-trend kpi-trend-${trend}`}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
        </div>
      )}
    </div>
  </div>
);

// Chart Card Component
interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  className = "",
}) => (
  <div className={`chart-card ${className}`}>
    <div className="chart-card-header">
      <h3 className="chart-card-title">{title}</h3>
    </div>
    <div className="chart-card-body">{children}</div>
  </div>
);

// Data Table Component
interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: {
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
  }[];
  emptyMessage?: string;
}

function DataTable<T>({
  title,
  data,
  columns,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  return (
    <div className="data-table-card">
      <div className="data-table-header">
        <h3 className="data-table-title">{title}</h3>
        <span className="data-table-count">{data.length} items</span>
      </div>
      <div className="data-table-wrapper">
        {data.length === 0 ? (
          <div className="data-table-empty">{emptyMessage}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(item)
                        : String(
                          (item as Record<string, unknown>)[col.key] ?? ""
                        )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusClass = () => {
    const statusLower = status.toLowerCase().replace(/_/g, "-");
    return `status-badge status-${statusLower}`;
  };
  return <span className={getStatusClass()}>{status.replace(/_/g, " ")}</span>;
};

// Color palette for charts
const COLORS = {
  primary: "#2563eb",
  secondary: "#7c3aed",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  purple: "#8b5cf6",
  pink: "#ec4899",
  indigo: "#6366f1",
  teal: "#14b8a6",
};

const PIE_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#8b5cf6",
];

const DashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<FullDashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "inventory" | "payments"
  >("overview");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await dashboardApi.getFullDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">!</div>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const {
    keyMetrics,
    floorComparison,
    paymentStatusBreakdown,
    salesTrend,
    categoryDistribution,
  } = dashboardData;

  return (
    <div className="dashboard-page">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-title">Business Analytics Dashboard</h1>
          <p className="dashboard-subtitle">
            Real-time insights across all operations
          </p>
        </div>
        <div className="dashboard-header-right">
          <div className="last-updated">
            Last updated:{" "}
            {new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <button
            className="refresh-btn"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab ${activeTab === "overview" ? "active" : ""
            }`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`dashboard-tab ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          Orders & Sales
        </button>
        <button
          className={`dashboard-tab ${activeTab === "inventory" ? "active" : ""
            }`}
          onClick={() => setActiveTab("inventory")}
        >
          Inventory
        </button>
        <button
          className={`dashboard-tab ${activeTab === "payments" ? "active" : ""
            }`}
          onClick={() => setActiveTab("payments")}
        >
          Payments
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* KPI Cards Row */}
          <div className="kpi-grid">
            <KPICard
              title="Total Sales"
              value={formatCurrency(keyMetrics.totalSales)}
              subtitle={`${keyMetrics.totalOrders} orders`}
              color={COLORS.primary}
              icon={<IconRupee />}
            />
            <KPICard
              title="Pending Orders"
              value={keyMetrics.pendingOrders}
              subtitle={`of ${keyMetrics.totalOrders} total`}
              color={COLORS.warning}
              icon={<IconClock />}
            />
            <KPICard
              title="Overdue Payments"
              value={keyMetrics.overduePayments}
              subtitle={
                formatCurrency(keyMetrics.totalOutstanding) + " outstanding"
              }
              color={COLORS.danger}
              icon={<IconAlertTriangle />}
            />
          </div>
          <div className="kpi-grid">
            <KPICard
              title="Inventory Value"
              value={formatCurrency(keyMetrics.totalInventoryValue)}
              subtitle={`${keyMetrics.lowStockCount} low stock alerts`}
              color={COLORS.success}
              icon={<IconPackage />}
            />
            <KPICard
              title="Active Subcontracts"
              value={keyMetrics.activeSubcontracts}
              subtitle="In progress"
              color={COLORS.purple}
              icon={<IconTool />}
            />
            <KPICard
              title="Pending Invoices"
              value={keyMetrics.pendingInvoices}
              subtitle="Awaiting completion"
              color={COLORS.info}
              icon={<IconFileText />}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="charts-row">
            <ChartCard
              title="Sales Trend (Last 30 Days)"
              className="chart-wide"
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient
                      id="salesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS.primary}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value)}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      "Sales",
                    ]}
                    labelFormatter={(label) => formatDate(String(label))}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke={COLORS.primary}
                    fill="url(#salesGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Floor Comparison">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={floorComparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrency(value)}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="floor"
                    type="category"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="sales"
                    fill={COLORS.primary}
                    name="Sales"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="charts-row">
            <ChartCard title="Payment Status">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={paymentStatusBreakdown.map((p) => ({
                      name: p.status,
                      value: p.count,
                      amount: p.amount,
                      color: p.color,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {paymentStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, entry) => [
                      `${value} (${formatCurrency(
                        (entry.payload as { amount: number }).amount
                      )})`,
                      name,
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Inventory by Category">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryDistribution.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {categoryDistribution.slice(0, 6).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top Customers">
              <div className="top-list">
                {dashboardData.topCustomers.map((customer, idx) => (
                  <div key={idx} className="top-list-item">
                    <div className="top-list-rank">{idx + 1}</div>
                    <div className="top-list-content">
                      <div className="top-list-name">{customer.name}</div>
                      <div className="top-list-meta">
                        {customer.orders} orders
                      </div>
                    </div>
                    <div className="top-list-value">
                      {formatCurrency(customer.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Data Tables Row */}
          <div className="tables-row">
            <DataTable
              title="Recent Orders"
              data={dashboardData.recentOrders}
              columns={[
                { key: "id", label: "ID" },
                { key: "customerName", label: "Customer", render: (o: Order) => o.party?.name || o.customerName || '—' },
                {
                  key: "orderDate",
                  label: "Date",
                  render: (o: Order) => formatDate(o.orderDate),
                },
                {
                  key: "grandTotal",
                  label: "Total",
                  render: (o: Order) => formatCurrency(o.grandTotal),
                },
                {
                  key: "orderStatus",
                  label: "Status",
                  render: (o: Order) => <StatusBadge status={o.orderStatus} />,
                },
              ]}
            />

            <DataTable
              title="Low Stock Alerts"
              data={dashboardData.lowStockItems.slice(0, 8)}
              columns={[
                {
                  key: "product",
                  label: "Product",
                  render: (i: StockItem) => i.product.productName,
                },
                {
                  key: "category",
                  label: "Category",
                  render: (i: StockItem) => i.category.categoryName,
                },
                {
                  key: "quantityInKg",
                  label: "Qty (Kg)",
                  render: (i: StockItem) => i.quantityInKg.toFixed(2),
                },
                { key: "lowStockAlert", label: "Alert Level" },
              ]}
              emptyMessage="No low stock items"
            />
          </div>
        </>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <>
          <div className="kpi-grid">
            <KPICard
              title="Total Orders"
              value={keyMetrics.totalOrders}
              color={COLORS.primary}
              icon={<IconClipboard />}
            />
            <KPICard
              title="Completed Orders"
              value={keyMetrics.completedOrders}
              color={COLORS.success}
              icon={<IconCheck />}
            />
            <KPICard
              title="Pending Orders"
              value={keyMetrics.pendingOrders}
              color={COLORS.warning}
              icon={<IconClock />}
            />
            <KPICard
              title="Total Revenue"
              value={formatCurrency(keyMetrics.totalSales)}
              color={COLORS.info}
              icon={<IconRupee />}
            />
          </div>

          <div className="charts-row">
            <ChartCard title="Orders & Revenue Trend" className="chart-wide">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v) => formatCurrency(v)}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "Sales" ? formatCurrency(Number(value)) : value,
                      name,
                    ]}
                    labelFormatter={(label) => formatDate(String(label))}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke={COLORS.secondary}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Order Status Distribution">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboardData.orderStatusBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Count"
                    fill={COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="amount"
                    name="Amount"
                    fill={COLORS.success}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="charts-row">
            <ChartCard title="Top Products by Revenue">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatCurrency(v)}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={COLORS.info}
                    name="Revenue"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Floor-wise Performance" className="chart-wide">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={floorComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="floor" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="orders"
                    fill={COLORS.primary}
                    name="Orders"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="invoices"
                    fill={COLORS.secondary}
                    name="Invoices"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="tables-row full-width">
            <DataTable
              title="All Recent Orders"
              data={dashboardData.recentOrders}
              columns={[
                { key: "id", label: "Order ID" },
                { key: "customerName", label: "Customer" },
                {
                  key: "orderDate",
                  label: "Order Date",
                  render: (o: Order) => formatDate(o.orderDate),
                },
                {
                  key: "expectedDeliveryDate",
                  label: "Delivery Date",
                  render: (o: Order) => formatDate(o.expectedDeliveryDate),
                },
                {
                  key: "productsTotal",
                  label: "Products Total",
                  render: (o: Order) => formatCurrency(o.productsTotal),
                },
                {
                  key: "gst",
                  label: "GST",
                  render: (o: Order) => formatCurrency(o.gst),
                },
                {
                  key: "grandTotal",
                  label: "Grand Total",
                  render: (o: Order) => formatCurrency(o.grandTotal),
                },
                {
                  key: "orderStatus",
                  label: "Status",
                  render: (o: Order) => <StatusBadge status={o.orderStatus} />,
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Inventory Tab */}
      {activeTab === "inventory" && (
        <>
          <div className="kpi-grid">
            <KPICard
              title="Total Inventory Value"
              value={formatCurrency(keyMetrics.totalInventoryValue)}
              color={COLORS.primary}
              icon={<IconPackage />}
            />
            <KPICard
              title="Low Stock Items"
              value={keyMetrics.lowStockCount}
              subtitle="Needs attention"
              color={COLORS.danger}
              icon={<IconAlertTriangle />}
            />
            <KPICard
              title="Active Subcontracts"
              value={keyMetrics.activeSubcontracts}
              color={COLORS.warning}
              icon={<IconTool />}
            />
            <KPICard
              title="Categories"
              value={categoryDistribution.length}
              color={COLORS.info}
              icon={<IconFolder />}
            />
          </div>

          <div className="charts-row">
            <ChartCard
              title="Inventory Value by Category"
              className="chart-wide"
            >
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={categoryDistribution.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(v)}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill={COLORS.primary}
                    name="Value"
                    radius={[4, 4, 0, 0]}
                  >
                    {categoryDistribution.slice(0, 10).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Subcontracting Status">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "In Process",
                        value: dashboardData.subcontractingMetrics.inProcess,
                        color: COLORS.warning,
                      },
                      {
                        name: "Completed",
                        value: dashboardData.subcontractingMetrics.completed,
                        color: COLORS.success,
                      },
                      {
                        name: "Rejected",
                        value: dashboardData.subcontractingMetrics.rejected,
                        color: COLORS.danger,
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill={COLORS.warning} />
                    <Cell fill={COLORS.success} />
                    <Cell fill={COLORS.danger} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="tables-row">
            <DataTable
              title="Low Stock Items"
              data={dashboardData.lowStockItems}
              columns={[
                {
                  key: "product",
                  label: "Product",
                  render: (i: StockItem) => i.product.productName,
                },
                {
                  key: "category",
                  label: "Category",
                  render: (i: StockItem) => i.category.categoryName,
                },
                {
                  key: "quantityInKg",
                  label: "Current Qty",
                  render: (i: StockItem) => `${i.quantityInKg.toFixed(2)} kg`,
                },
                {
                  key: "lowStockAlert",
                  label: "Alert Threshold",
                  render: (i: StockItem) => `${i.lowStockAlert} kg`,
                },
                {
                  key: "totalPrice",
                  label: "Value",
                  render: (i: StockItem) => formatCurrency(i.totalPrice),
                },
              ]}
              emptyMessage="No low stock items"
            />

            <DataTable
              title="Active Subcontracts"
              data={dashboardData.activeSubcontracts}
              columns={[
                {
                  key: "contractor",
                  label: "Contractor",
                  render: (s: Subcontracting) => s.contractor.name,
                },
                {
                  key: "item",
                  label: "Material",
                  render: (s: Subcontracting) => s.item.name,
                },
                {
                  key: "sentStock",
                  label: "Sent",
                  render: (s: Subcontracting) => `${s.sentStock} ${s.unit}`,
                },
                {
                  key: "orderDate",
                  label: "Date",
                  render: (s: Subcontracting) => formatDate(s.orderDate),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (s: Subcontracting) => (
                    <StatusBadge status={s.status} />
                  ),
                },
              ]}
              emptyMessage="No active subcontracts"
            />
          </div>

          {dashboardData.lowStockRawItems.length > 0 && (
            <div className="tables-row full-width">
              <DataTable
                title="Low Stock Raw Materials"
                data={dashboardData.lowStockRawItems}
                columns={[
                  {
                    key: "product",
                    label: "Material",
                    render: (i: RawItem) => i.product.productName,
                  },
                  {
                    key: "quantityInKg",
                    label: "Current Qty",
                    render: (i: RawItem) => `${i.quantityInKg.toFixed(2)} kg`,
                  },
                  {
                    key: "lowStockAlert",
                    label: "Alert Threshold",
                    render: (i: RawItem) => `${i.lowStockAlert} kg`,
                  },
                  {
                    key: "lastUpdatedAt",
                    label: "Last Updated",
                    render: (i: RawItem) => formatDate(i.lastUpdatedAt),
                  },
                ]}
                emptyMessage="No low stock raw materials"
              />
            </div>
          )}
        </>
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <>
          <div className="kpi-grid">
            <KPICard
              title="Total Outstanding"
              value={formatCurrency(keyMetrics.totalOutstanding)}
              color={COLORS.primary}
              icon={<IconRupee />}
            />
            <KPICard
              title="Overdue Payments"
              value={keyMetrics.overduePayments}
              subtitle="Requires immediate action"
              color={COLORS.danger}
              icon={<IconAlertTriangle />}
            />
            <KPICard
              title="Pending Invoices"
              value={keyMetrics.pendingInvoices}
              color={COLORS.warning}
              icon={<IconFileText />}
            />
            <KPICard
              title="Completed Orders"
              value={keyMetrics.completedOrders}
              color={COLORS.success}
              icon={<IconCheck />}
            />
          </div>

          <div className="charts-row">
            <ChartCard title="Payment Status Overview" className="chart-wide">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={paymentStatusBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => formatCurrency(v)}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "Amount" ? formatCurrency(Number(value)) : value,
                      name,
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    fill={COLORS.primary}
                    name="Count"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="amount"
                    fill={COLORS.secondary}
                    name="Amount"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Invoice Status">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={dashboardData.invoiceStatusBreakdown.map((inv) => ({
                      name: inv.status,
                      value: inv.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    <Cell fill={COLORS.warning} />
                    <Cell fill={COLORS.success} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-summary">
                {dashboardData.invoiceStatusBreakdown.map((inv, idx) => (
                  <div key={idx} className="summary-item">
                    <span className="summary-label">{inv.status}:</span>
                    <span className="summary-value">
                      {formatCurrency(inv.officialBill + inv.offlineBill)}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="tables-row">
            <DataTable
              title="Overdue Payments"
              data={dashboardData.overduePayments}
              columns={[
                { key: "orderId", label: "Order ID" },
                {
                  key: "customerName",
                  label: "Customer",
                  render: (p: Payment) => p.customerName || "N/A",
                },
                {
                  key: "totalAmount",
                  label: "Total",
                  render: (p: Payment) => formatCurrency(p.totalAmount || 0),
                },
                {
                  key: "receivedAmount",
                  label: "Received",
                  render: (p: Payment) => formatCurrency(p.receivedAmount || 0),
                },
                {
                  key: "outstanding",
                  label: "Outstanding",
                  render: (p: Payment) =>
                    formatCurrency(
                      (p.totalAmount || 0) - (p.receivedAmount || 0)
                    ),
                },
                {
                  key: "dueDate",
                  label: "Due Date",
                  render: (p: Payment) => formatDate(p.dueDate),
                },
                {
                  key: "paymentStatus",
                  label: "Status",
                  render: (p: Payment) => (
                    <StatusBadge status={p.paymentStatus} />
                  ),
                },
              ]}
              emptyMessage="No overdue payments"
            />

            <DataTable
              title="Recent Invoices"
              data={dashboardData.recentInvoices}
              columns={[
                { key: "id", label: "Invoice ID" },
                {
                  key: "customer",
                  label: "Customer",
                  render: (inv: Invoice) => inv.order.customerName,
                },
                {
                  key: "officialBill",
                  label: "Official Bill",
                  render: (inv: Invoice) =>
                    formatCurrency(inv.order.officialBillAmount),
                },
                {
                  key: "offlineBill",
                  label: "Offline Bill",
                  render: (inv: Invoice) =>
                    formatCurrency(inv.order.offlineTotal || 0),
                },
                {
                  key: "total",
                  label: "Total",
                  render: (inv: Invoice) =>
                    formatCurrency(inv.order.grandTotal),
                },
                {
                  key: "invoiceStatus",
                  label: "Status",
                  render: (inv: Invoice) => (
                    <StatusBadge status={inv.invoiceStatus} />
                  ),
                },
              ]}
              emptyMessage="No recent invoices"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
