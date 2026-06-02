import React, { useState } from 'react';
import { format } from 'date-fns';
import type { Invoice, BillingType } from '../types';
import { InvoiceStatus, BillingType as BillingTypeEnum } from '../types';
import { invoiceApi } from '../api/invoice';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import DownloadIcon from '../assets/download.svg';
import './InvoiceCard.css';
import '../styles/StatusDropdown.css';

interface InvoiceCardProps {
  invoice: Invoice;
  billingType: BillingType;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, billingType, onDelete, onRefresh }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState(invoice.invoiceStatus);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const order = invoice.order;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd-MM-yyyy');
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        setIsDeleting(true);
        await onDelete(invoice.id);
      } catch (error) {
        console.error('Error deleting:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    try {
      setIsUpdatingStatus(true);
      await invoiceApi.updateInvoiceStatus(invoice.id, newStatus);
      setStatus(newStatus);
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusClass = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.COMPLETED:
        return 'status-complete';
      case InvoiceStatus.PENDING:
        return 'status-pending';
      default:
        return '';
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const blob = await invoiceApi.downloadInvoicePdf(invoice.id);

      // Verify we got a valid blob
      if (!blob || blob.size === 0) {
        throw new Error('Received empty PDF file');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-PBI-${order.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download invoice PDF. Please try again or contact support.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className={`invoice-card ${isDownloadingPdf ? 'downloading' : ''}`}>
      {isDownloadingPdf && (
        <div className="pdf-loading-overlay">
          <span className="loading-icon"></span>
          <span>Generating PDF...</span>
        </div>
      )}
      <div className="invoice-card-header">
        <div className="invoice-card-header-left">
          <div className="invoice-card-title-row">
            <h3 className="invoice-card-id">PBI-{order.id}</h3>
            <div className="invoice-card-actions">
              <button
                type="button"
                className="icon-button download-button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                title="Download PDF"
              >
                {isDownloadingPdf ? (
                  <span className="loading-icon"></span>
                ) : (
                  <img src={DownloadIcon} alt="Download" className="icon-img" />
                )}
              </button>
              <button
                type="button"
                className="icon-button edit-button"
                onClick={() => { }}
                title="Edit"
              >
                <img src={EditIcon} alt="Edit" className="icon-img" />
              </button>
              <button
                type="button"
                className="icon-button delete-button"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Delete"
              >
                {isDeleting ? (
                  <span className="loading-icon"></span>
                ) : (
                  <img src={DeleteIcon} alt="Delete" className="icon-img" />
                )}
              </button>
            </div>
          </div>
          <p className="invoice-card-customer">Party: {order.party?.name || order.customerName || '-'}</p>
          <span className="invoice-card-date">Date : {formatDate(order.orderDate)}</span>
        </div>

        <div className="invoice-card-status">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
            className={`status-select-modern ${getStatusClass(status)}`}
            disabled={isUpdatingStatus}
            title="Update invoice status"
          >
            <option value={InvoiceStatus.PENDING}>
              {isUpdatingStatus ? 'Updating...' : 'Pending'}
            </option>
            <option value={InvoiceStatus.COMPLETED}>Completed</option>
          </select>
        </div>
      </div>

      <div className="invoice-card-divider"></div>

      <div className="invoice-card-body">
        <div className="invoice-amount-row">
          <span className="invoice-amount-label">Billed Amount:</span>
          <span className="invoice-amount-value">
            ₹{(billingType === BillingTypeEnum.OFFICIAL ? order.officialBillAmount : order.offlineTotal || 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="invoice-amount-row">
          <span className="invoice-amount-label">GST:</span>
          <span className="invoice-amount-value">
            {billingType === BillingTypeEnum.OFFICIAL ? `₹${(order.gst || 0).toLocaleString('en-IN')}` : '-'}
          </span>
        </div>
      </div>

      <div className="invoice-card-divider"></div>

      <div className="invoice-card-footer">
        <div className="invoice-amount-row">
          <span className="invoice-total-label">Total:</span>
          <span className="invoice-total-value">
            ₹{(order.grandTotal || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCard;
