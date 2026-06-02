import React from 'react';
import type { Order } from '../types';
import './OrderDetailsModal.css';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const currency = (value?: number | null) => {
  if (!value) return '₹ 0';
  return `₹ ${value.toLocaleString('en-IN')}`;
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose }) => {
  const note = order.note?.trim();
  return (
    <div className="order-details-overlay" onClick={onClose}>
      <div className="order-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="order-details-header">
          <div>
            <p className="order-details-subtitle">Order Details</p>
            <h2 className="order-details-title">{order.customerName}</h2>
            <p className="order-details-id">Order ID: PBI-{String(order.id).padStart(4, '0')}</p>
          </div>
          <button type="button" className="order-details-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="order-details-summary">
          <div className="summary-row">
            <div>
              <p className="summary-label">Contact No.</p>
              <p className="summary-value">{order.customerMobileNo || '—'}</p>
            </div>
            <div>
              <p className="summary-label">Email</p>
              <p className="summary-value">{order.customerEmail || '—'}</p>
            </div>
            <div>
              <p className="summary-label">Order Date</p>
              <p className="summary-value">{formatDate(order.orderDate)}</p>
            </div>
            <div>
              <p className="summary-label">Delivery Date</p>
              <p className="summary-value">{formatDate(order.expectedDeliveryDate)}</p>
            </div>
            <div>
              <p className="summary-label">Payment Date</p>
              <p className="summary-value">{formatDate(order.paymentDate)}</p>
            </div>
            {note && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="summary-label">Note</p>
                <p className="summary-value">{note}</p>
              </div>
            )}
          </div>
        </div>

        <div className="order-details-table-wrapper">
          <table className="order-details-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Unit</th>
                <th>Quantity</th>
                <th>Market Rate / Price/Pc</th>
                <th>Rate Diff</th>
                <th>Total Rate</th>
              </tr>
            </thead>
            <tbody>
              {order.products?.length ? (
                order.products.map((product) => {
                  const isPc = product.quantityUnit === 'pc' || (product.quantityPc && product.quantityPc > 0);
                  return (
                    <tr key={product.id || product.productName}>
                      <td>{product.productName}</td>
                      <td>{isPc ? 'Pc' : 'Kg'}</td>
                      <td>
                        {isPc
                          ? Number(product.quantityPc || 0).toLocaleString('en-IN')
                          : Number(product.quantityKg || 0).toLocaleString('en-IN')}
                      </td>
                      <td>{currency(product.marketRate)}</td>
                      <td>{isPc ? '—' : Number(product.rateDifference).toLocaleString('en-IN')}</td>
                      <td>{currency(product.totalAmount)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="order-details-empty">
                    No products available for this order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="order-amount-summary">
          <div className="amount-card">
            <p className="summary-label">Online Bill %</p>
            <p className="summary-value">{Math.round((100 - (order.offlineBillPercent ?? 0)) * 100) / 100}%</p>
          </div>
          <div className="amount-card">
            <p className="summary-label">Offline Total</p>
            <p className="summary-value">{currency(order.offlineTotal)}</p>
          </div>
          <div className="amount-card">
            <p className="summary-label">Official Bill Amount</p>
            <p className="summary-value">{currency(order.officialBillAmount)}</p>
          </div>
          <div className="amount-card">
            <p className="summary-label">GST</p>
            <p className="summary-value">{currency(order.gst)}</p>
          </div>
          {(order.transport != null && order.transport > 0) && (
            <div className="amount-card">
              <p className="summary-label">Transport</p>
              <p className="summary-value">{currency(order.transport)}</p>
            </div>
          )}
          <div className="amount-card highlight">
            <p className="summary-label">Grand Total</p>
            <p className="summary-value">{currency(order.grandTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
