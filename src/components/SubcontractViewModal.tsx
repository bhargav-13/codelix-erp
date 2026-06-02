import React, { useState, useEffect } from 'react';
import { subcontractingApi } from '../api/subcontracting';
import type { SubcontractingBySubcontractList } from '../types';
import Loading from './Loading';
import './SubcontractViewModal.css';

interface SubcontractViewModalProps {
  contractorName: string;
  onClose: () => void;
}

const SubcontractViewModal: React.FC<SubcontractViewModalProps> = ({
  contractorName,
  onClose,
}) => {
  const [data, setData] = useState<SubcontractingBySubcontractList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractorName, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await subcontractingApi.getSubcontractByCustomerName(
        contractorName,
        startDate,
        endDate
      );
      setData(response);
    } catch (err: any) {
      console.error('Error fetching subcontract details:', err);
      setError(err.response?.data?.message || 'Failed to load subcontract details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount === undefined || amount === null) return '-';
    return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatNumber = (num: number, suffix?: string) => {
    if (num === undefined || num === null) return '-';
    const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return suffix ? `${formatted}${suffix}` : formatted;
  };

  const formatDateRange = () => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  return (
    <div className="subcontract-view-modal-overlay" onClick={onClose}>
      <div className="subcontract-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="subcontract-view-header">
          <div className="subcontract-view-title-section">
            <h2 className="subcontract-view-title">{contractorName}</h2>
            <p className="subcontract-view-date-range">Date Range :- {formatDateRange()}</p>
          </div>
          <button type="button" className="subcontract-view-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="subcontract-view-date-filters">
          <div className="date-filter-group">
            <label>Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date-filter-group">
            <label>End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="subcontract-view-content">
          {loading ? (
            <Loading message="Loading details..." size="medium" />
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : !data || data.subcontractList.length === 0 ? (
            <div className="no-data">No records found for the selected date range.</div>
          ) : (
            <>
              <div className="subcontract-table-wrapper">
                <table className="subcontract-detail-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Market</th>
                      <th>Job Work</th>
                      <th>Item</th>
                      <th>Sent Stock</th>
                      <th>Rt. Date</th>
                      <th>Rt. Item</th>
                      <th>Rt. Stock</th>
                      <th>Element</th>
                      <th>Used</th>
                      <th>Net Wgt.</th>
                      <th>Job Pay</th>
                      <th>Rs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subcontractList.map((item, index) => (
                      <tr key={index}>
                        <td>{formatDate(item.orderDate)}</td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>{formatNumber(item.jobWorkPay)}</td>
                        <td>{item.itemName || '-'}</td>
                        <td>{formatNumber(item.sentStock, 'kg')}</td>
                        <td>{formatDate(item.returnDate)}</td>
                        <td>{item.returnItemName || '-'}</td>
                        <td>{formatNumber(item.returnStock, 'kg')}</td>
                        <td>{formatNumber(item.returnElement)} {item.packagingType || ''}</td>
                        <td className="used-cell">{formatNumber(item.usedStock, ' Kg')}</td>
                        <td className="net-weight-cell">{formatNumber(item.netWeight, ' Kg')}</td>
                        <td>{formatCurrency(item.totalJobPay)}</td>
                        <td>{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="subcontract-view-totals">
                <div className="total-item total-paid">
                  <span className="total-label">Total Paid Rs :-</span>
                  <span className="total-value">{formatCurrency(data.totalPaidRs)}/-</span>
                </div>
                <div className="totals-row">
                  <div className="total-item">
                    <span className="total-label">Total Sent Stock :-</span>
                    <span className="total-value">{formatNumber(data.totalSentStock, 'kg')}</span>
                  </div>
                  <div className="total-item">
                    <span className="total-label">Total Return Stock :-</span>
                    <span className="total-value">{formatNumber(data.totalReturnStock, 'kg')}</span>
                  </div>
                  <div className="total-item total-used">
                    <span className="total-label">Total Used :-</span>
                    <span className="total-value highlight-red">{formatNumber(data.totalUsed, 'kg')}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubcontractViewModal;
