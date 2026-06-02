import React, { useState } from 'react';
import './AddProductModal.css';
import type { ElectricOutward } from '../types';

interface AddElectricOutwardModalProps {
    onClose: () => void;
    onSuccess: () => void;
    onSubmit: (data: Omit<ElectricOutward, 'id' | 'totalUnitAmount' | 'totalWeightAmount' | 'totalAmount'>) => Promise<void>;
    initialData?: ElectricOutward | null;
}

const AddElectricOutwardModal: React.FC<AddElectricOutwardModalProps> = ({
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
    const [weight, setWeight] = useState<number | ''>(initialData?.weight ?? '');
    const [perKgWeight, setPerKgWeight] = useState<number | ''>(initialData?.perKgWeight ?? '');
    const [unit, setUnit] = useState<number | ''>(initialData?.unit ?? '');
    const [unitRate, setUnitRate] = useState<number | ''>(initialData?.unitRate ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const num = (v: number | '') => (v === '' ? 0 : Number(v));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!date) { setError('Date is required'); return; }
        if (!challanNo.trim()) { setError('Challan No. is required'); return; }

        // Convert YYYY-MM-DD → DD/MM/YYYY for service layer
        const parts = date.split('-');
        const uiDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;

        try {
            setLoading(true);
            await onSubmit({
                date: uiDate,
                challanNo: challanNo.trim(),
                weight: num(weight),
                perKgWeight: num(perKgWeight),
                unit: num(unit),
                unitRate: num(unitRate),
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error saving outward entry:', err);
            setError(err?.message || 'Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">
                    {initialData ? 'Edit Electric Outward' : 'Add Electric Outward'}
                </h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Row 1: Date + Challan No */}
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

                    {/* Row 2: Weight + Per Kg Weight */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Weight (Kg)</label>
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="0.00"
                                className="form-input"
                                min="0"
                                step="0.001"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Per Kg Weight</label>
                            <input
                                type="number"
                                value={perKgWeight}
                                onChange={(e) => setPerKgWeight(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="0.00"
                                className="form-input"
                                min="0"
                                step="0.001"
                            />
                        </div>
                    </div>

                    {/* Row 3: Unit + Unit Rate */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Unit</label>
                            <input
                                type="number"
                                value={unit}
                                onChange={(e) => setUnit(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="0.00"
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Unit Rate (₹)</label>
                            <input
                                type="number"
                                value={unitRate}
                                onChange={(e) => setUnitRate(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="0.00"
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>
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

export default AddElectricOutwardModal;
