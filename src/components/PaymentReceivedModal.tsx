import React, { useState } from 'react';
import { paymentApi } from '../api/payment';
import type { Payment, PaymentReceiveRequest } from '../types';
import './PaymentReceivedModal.css';

interface PaymentReceivedModalProps {
  payment: Payment;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentReceivedModal: React.FC<PaymentReceivedModalProps> = ({
  payment,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<PaymentReceiveRequest>({
    newReceivedAmount: 0,
    newReceivedDate: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;

    if (name === 'newReceivedAmount') {
      processedValue = value === '' ? 0 : parseFloat(value) || 0;
    }

    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const receivedAmount = payment.receivedAmount || 0;
    const totalAmount = payment.totalAmount || 0;
    const remainingAmount = totalAmount - receivedAmount;

    if (formData.newReceivedAmount <= 0) {
      setError('Received amount must be greater than 0');
      return;
    }

    // Use a small epsilon for float comparison
    if (formData.newReceivedAmount > (remainingAmount + 0.01)) {
      setError(`Received amount exceeds remaining due amount of ₹${remainingAmount.toLocaleString('en-IN')}`);
      return;
    }

    try {
      setLoading(true);
      await paymentApi.receivePayment(payment.id, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyValue = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '0';
    return amount.toLocaleString('en-IN');
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const remaining = (payment.totalAmount || 0) - (payment.receivedAmount || 0);

  return (
    <div className="modal-overlay payment-received-modal-overlay" onClick={onClose}>
      <div className="modal-content payment-received-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h2 className="modal-title">Record Payment</h2>
          <p className="modal-subtitle">Order #{payment.orderId} • {payment.customerName}</p>
        </div>

        {/* Payment Summary Section */}
        <div className="payment-summary-box">
          <div className="summary-item">
            <span className="summary-label">Total Amount</span>
            <span className="summary-value">₹ {formatCurrencyValue(payment.totalAmount)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Already Received</span>
            <span className="summary-value highlight-green">₹ {formatCurrencyValue(payment.receivedAmount)}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item total">
            <span className="summary-label">Remaining Balance</span>
            <span className="summary-value highlight-red">₹ {formatCurrencyValue(remaining)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">New Received Amount</label>
              <div className="input-with-icon">
                <span className="currency-prefix">₹</span>
                <input
                  type="number"
                  name="newReceivedAmount"
                  value={formData.newReceivedAmount || ''}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  max={remaining}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Date of Receipt</label>
              <input
                type="date"
                name="newReceivedDate"
                value={formData.newReceivedDate}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="last-recorded">
            Last payment recorded on: <strong>{formatDate(payment.lastReceivedDate)}</strong>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentReceivedModal;
