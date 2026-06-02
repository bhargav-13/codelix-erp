import React, { useState, useEffect } from 'react';
import { invoiceApi } from '../api/invoice';
import type { Invoice, InvoiceStats } from '../types';
import { InvoiceStatus, InvoiceFloor, BillingType } from '../types';
import InvoiceCard from '../components/InvoiceCard';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import './InvoicePage.css';

interface InvoicePageProps {
  floor: InvoiceFloor;
}

const InvoicePage: React.FC<InvoicePageProps> = ({ floor }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalOfficialBill: 0,
    totalOfflineBill: 0,
    totalBilledAmount: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [page] = useState(0);
  const [selectedMode, setSelectedMode] = useState<BillingType>(BillingType.OFFICIAL);

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, statusFilter, floor, selectedMode]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceApi.getInvoiceList({
        floor,
        mode: selectedMode,
        page,
        size: 10,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });

      setInvoices(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Invoice[]) => {
    const totalOfficialBill = data.reduce((sum, inv) => sum + inv.order.officialBillAmount, 0);
    const totalOfflineBill = data.reduce((sum, inv) => sum + (inv.order.offlineTotal || 0), 0);
    const totalBilledAmount = data.reduce((sum, inv) => sum + inv.order.grandTotal, 0);

    setStats({
      totalOfficialBill,
      totalOfflineBill,
      totalBilledAmount,
    });
  };

  const handleDeleteInvoice = async (id: number) => {
    try {
      await invoiceApi.deleteInvoice(id);
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  return (
    <div className="invoice-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Billing Management</h1>
          <p className="page-subtitle">Manage and track all your billing records</p>
        </div>
        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-btn ${selectedMode === BillingType.OFFICIAL ? 'active' : ''}`}
            onClick={() => setSelectedMode(BillingType.OFFICIAL)}
          >
            Official
          </button>
          <button
            type="button"
            className={`mode-btn ${selectedMode === BillingType.OFFLINE ? 'active' : ''}`}
            onClick={() => setSelectedMode(BillingType.OFFLINE)}
          >
            Offline
          </button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Official Bill</span>
            <span className="stat-value">₹{stats.totalOfficialBill.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Offline Bill</span>
            <span className="stat-value">₹{stats.totalOfflineBill.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Billed Amount</span>
            <span className="stat-value">₹{stats.totalBilledAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search by customer or order"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="order-status-filter">
          <img src={FilterIcon} alt="Filter" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')} title="Filter by status">
            <option value="">All Status</option>
            <option value={InvoiceStatus.PENDING}>Pending</option>
            <option value={InvoiceStatus.COMPLETED}>Completed</option>
          </select>
        </div>
      </div>

      <div className="invoices-list">
        {loading ? (
          <Loading message="Loading invoices..." size="large" />
        ) : invoices.length === 0 ? (
          <div className="no-data">No invoices found.</div>
        ) : (
          <div className="invoice-cards-grid">
            {invoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                billingType={selectedMode}
                onDelete={handleDeleteInvoice}
                onRefresh={fetchInvoices}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePage;
