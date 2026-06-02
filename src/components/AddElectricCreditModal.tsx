import React, { useState } from 'react';
import './AddProductModal.css';
import type { ElectricCredit } from '../types';

interface AddElectricCreditModalProps {
    onClose: () => void;
    onSuccess: () => void;
    onSubmit: (data: Omit<ElectricCredit, 'id'>) => Promise<void>;
    initialData?: ElectricCredit | null;
}

const AddElectricCreditModal: React.FC<AddElectricCreditModalProps> = ({
    onClose,
    onSuccess,
    onSubmit,
    initialData,
}) => {
    const [date, setDate] = useState(
        initialData?.date
            ? (() => {
                const parts = initialData.date.split('/');
                return parts.length === 3
                    ? `${parts[2]}-${parts[1]}-${parts[0]}`
                    : initialData.date;
            })()
            : ''
    );
    const [challanNo, setChallanNo] = useState(initialData?.challanNo ?? '');
    const [rate, setRate] = useState<number | ''>(initialData?.rate ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!date) { setError('Date is required'); return; }
        if (!challanNo.trim()) { setError('Challan No. is required'); return; }
        if (rate === '' || Number(rate) <= 0) { setError('Valid Rate is required'); return; }

        // Convert YYYY-MM-DD → DD/MM/YYYY for service layer
        const parts = date.split('-');
        const uiDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;

        try {
            setLoading(true);
            await onSubmit({
                date: uiDate,
                challanNo: challanNo.trim(),
                rate: Number(rate),
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error saving credit entry:', err);
            setError(err?.message || 'Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">
                    {initialData ? 'Edit Electric Credit' : 'Add Electric Credit'}
                </h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="modal-form">
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Challan No.</label>
                            <input
                                type="text"
                                value={challanNo}
                                onChange={(e) => setChallanNo(e.target.value)}
                                placeholder="e.g. CH-1001"
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Rate (₹)</label>
                        <input
                            type="number"
                            value={rate}
                            onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0.00"
                            className="form-input"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="save-button" disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" className="cancel-button" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddElectricCreditModal;
