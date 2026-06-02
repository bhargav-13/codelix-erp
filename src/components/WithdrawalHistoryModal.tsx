import React from 'react';
import type { JayeshScrap } from '../api/scrap';
import './WithdrawalHistoryModal.css';

interface WithdrawalHistoryModalProps {
    scrap: JayeshScrap;
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
    if (value === null || value === undefined) return '₹0';
    return `₹${value.toLocaleString('en-IN')}`;
};

const WithdrawalHistoryModal: React.FC<WithdrawalHistoryModalProps> = ({ scrap, onClose }) => {
    const withdrawals = scrap.withdrawals ?? [];
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.withdrawAmount, 0);
    const totalAmount = scrap.totalAmount ?? (scrap.netWeight * scrap.rate);
    const pendingAmount = scrap.pendingAmount ?? totalAmount;

    return (
        <div className="wh-overlay" onClick={onClose}>
            <div className="wh-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="wh-header">
                    <div>
                        <p className="wh-subtitle">Scrap Details</p>
                        <h2 className="wh-title">Challan #{scrap.challanNo}</h2>
                    </div>
                    <button type="button" className="wh-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                {/* Scrap Info */}
                <div className="wh-info-grid">
                    <div className="wh-info-item">
                        <span className="wh-info-label">Contractor</span>
                        <span className="wh-info-value">{scrap.contractor.name}</span>
                    </div>
                    <div className="wh-info-item">
                        <span className="wh-info-label">Order Date</span>
                        <span className="wh-info-value">{formatDate(scrap.orderDate)}</span>
                    </div>
                    <div className="wh-info-item">
                        <span className="wh-info-label">Item</span>
                        <span className="wh-info-value">{scrap.item}</span>
                    </div>
                    <div className="wh-info-item">
                        <span className="wh-info-label">Net Weight</span>
                        <span className="wh-info-value">{scrap.netWeight.toFixed(3)} kg</span>
                    </div>
                    <div className="wh-info-item">
                        <span className="wh-info-label">Rate</span>
                        <span className="wh-info-value">{currency(scrap.rate)}</span>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="wh-summary">
                    <div className="wh-summary-card">
                        <span className="wh-summary-label">Total Amount</span>
                        <span className="wh-summary-value">{currency(totalAmount)}</span>
                    </div>
                    <div className="wh-summary-card">
                        <span className="wh-summary-label">Total Withdrawn</span>
                        <span className="wh-summary-value">{currency(totalWithdrawn)}</span>
                    </div>
                    <div className={`wh-summary-card ${pendingAmount > 0 ? 'highlight-pending' : 'highlight-clear'}`}>
                        <span className="wh-summary-label">Pending Amount</span>
                        <span className="wh-summary-value">{currency(pendingAmount)}</span>
                    </div>
                </div>

                {/* Withdrawal History Table */}
                <div className="wh-body">
                    <span className="wh-section-title">Withdrawal History</span>
                    {withdrawals.length === 0 ? (
                        <div className="wh-empty">No withdrawals recorded yet.</div>
                    ) : (
                        <table className="wh-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {withdrawals.map((w, index) => (
                                    <tr key={w.withdrawalId}>
                                        <td>{index + 1}</td>
                                        <td>{formatDate(w.withdrawDate)}</td>
                                        <td>{currency(w.withdrawAmount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={2} className="wh-total-label">Total Withdrawn</td>
                                    <td className="wh-total-value">{currency(totalWithdrawn)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WithdrawalHistoryModal;
