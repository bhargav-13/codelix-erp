import React, { useState, useEffect } from 'react';
import { partyApi } from '../api/party';
import type { OrderByPartyResponse } from '../types';
import Loading from './Loading';
import './SubcontractViewModal.css'; // Reuse existing styles

interface PartyOrdersModalProps {
    partyName: string;
    onClose: () => void;
}

const PartyOrdersModal: React.FC<PartyOrdersModalProps> = ({
    partyName,
    onClose,
}) => {
    const [data, setData] = useState<OrderByPartyResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [partyName]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await partyApi.getOrdersByPartyName(partyName);
            setData(response);
        } catch (err: any) {
            console.error('Error fetching party orders:', err);
            setError(err.response?.data?.message || 'Failed to load party orders');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            setError(null);
            const blob = await partyApi.downloadPartyPdf(partyName);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `party_orders_${partyName}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Error downloading PDF:', err);
            setError(err.response?.data?.message || 'Failed to download PDF');
        } finally {
            setDownloading(false);
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

    const calculateTotals = () => {
        if (!data || !data.orders) return { official: 0, offline: 0, total: 0 };

        const official = data.orders.reduce((sum, order) => sum + (order.officialTotalAmount || 0), 0);
        const offline = data.orders.reduce((sum, order) => sum + (order.offlineTotalAmount || 0), 0);

        return {
            official,
            offline,
            total: official + offline,
        };
    };

    const totals = calculateTotals();

    return (
        <div className="subcontract-view-modal-overlay" onClick={onClose}>
            <div className="subcontract-view-modal" onClick={(e) => e.stopPropagation()}>
                <div className="subcontract-view-header">
                    <div className="subcontract-view-title-section">
                        <h2 className="subcontract-view-title">{partyName}</h2>
                        <p className="subcontract-view-date-range">Party Orders</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                            type="button"
                            className="action-button primary-button"
                            onClick={handleDownloadPdf}
                            disabled={downloading || loading || !data}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                            {downloading ? 'Downloading...' : 'Download PDF'}
                        </button>
                        <button type="button" className="subcontract-view-close" onClick={onClose}>
                            ✕
                        </button>
                    </div>
                </div>

                <div className="subcontract-view-content">
                    {loading ? (
                        <Loading message="Loading orders..." size="medium" />
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : !data || data.orders.length === 0 ? (
                        <div className="no-data">No orders found for this party.</div>
                    ) : (
                        <>
                            <div className="subcontract-table-wrapper">
                                <table className="subcontract-detail-table">
                                    <thead>
                                        <tr>
                                            <th>Sr. No</th>
                                            <th>Order Date</th>
                                            <th>Official Invoice ID</th>
                                            <th>Offline Invoice ID</th>
                                            <th>Official Amount</th>
                                            <th>Offline Amount</th>
                                            <th>Total Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.orders.map((order, index) => (
                                            <tr key={index}>
                                                <td>{String(index + 1).padStart(2, '0')}</td>
                                                <td>{formatDate(order.orderDate)}</td>
                                                <td>{order.officialInvoiceId || '-'}</td>
                                                <td>{order.offlineInvoiceId || '-'}</td>
                                                <td>{formatCurrency(order.officialTotalAmount)}</td>
                                                <td>{formatCurrency(order.offlineTotalAmount)}</td>
                                                <td>{formatCurrency((order.officialTotalAmount || 0) + (order.offlineTotalAmount || 0))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="subcontract-view-totals">
                                <div className="totals-row">
                                    <div className="total-item">
                                        <span className="total-label">Total Official Amount :-</span>
                                        <span className="total-value">{formatCurrency(totals.official)}/-</span>
                                    </div>
                                    <div className="total-item">
                                        <span className="total-label">Total Offline Amount :-</span>
                                        <span className="total-value">{formatCurrency(totals.offline)}/-</span>
                                    </div>
                                    <div className="total-item total-paid">
                                        <span className="total-label">Grand Total :-</span>
                                        <span className="total-value">{formatCurrency(totals.total)}/-</span>
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

export default PartyOrdersModal;
