import React, { useState } from 'react';
import './AddProductModal.css'; // Reusing existing styles

export interface ForginInwardEntry {
    date: string;
    partyName: string;
    challanNo: string;
    price: number;
    weight: number;
    unit: string;
    chhol: string;
}

interface AddForginInwardModalProps {
    onClose: () => void;
    onSuccess: (entry: ForginInwardEntry) => void;
}

const AddForginInwardModal: React.FC<AddForginInwardModalProps> = ({ onClose, onSuccess }) => {
    const [partyName, setPartyName] = useState('');
    const [challanNo, setChallanNo] = useState('');
    const [date, setDate] = useState('');
    const [weight, setWeight] = useState<number | ''>('');
    const [chhol, setChhol] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!partyName.trim()) {
            setError('Party Name is required');
            return;
        }
        if (!challanNo.trim()) {
            setError('Challan No. is required');
            return;
        }
        if (!date) {
            setError('Date is required');
            return;
        }
        if (!weight || Number(weight) <= 0) {
            setError('Valid Weight is required');
            return;
        }

        try {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));

            const newEntry: ForginInwardEntry = {
                date,
                partyName: partyName.trim(),
                challanNo: challanNo.trim(),
                price: 0,
                weight: Number(weight),
                unit: 'Kg',
                chhol,
            };

            onSuccess(newEntry);
            onClose();
        } catch (err) {
            console.error("Error saving inward entry:", err);
            setError('Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Forging Order add</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Row 1: Party Name, Challan No., Date */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Party Name</label>
                            <select
                                value={partyName}
                                onChange={(e) => setPartyName(e.target.value)}
                                className="form-input"
                                required
                            >
                                <option value="">Select Party</option>
                                <option value="Bipin Bhai">Bipin Bhai</option>
                                <option value="Akshar">Akshar</option>
                                <option value="Bansi">Bansi</option>
                                <option value="Jayesh">Jayesh</option>
                                <option value="Kevin">Kevin</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Challan No.</label>
                            <input
                                type="text"
                                value={challanNo}
                                onChange={(e) => setChallanNo(e.target.value)}
                                placeholder="25260007"
                                className="form-input"
                                required
                            />
                        </div>
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
                    </div>

                    {/* Row 2: Process (read-only), Weight, Chhol dropdown */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1.5 }}>
                            <label className="form-label">Process</label>
                            <input
                                type="text"
                                value="Inward"
                                className="form-input"
                                readOnly
                                style={{ backgroundColor: '#f0f4f8', color: '#6c757d' }}
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Weight</label>
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="120.400"
                                className="form-input"
                                min="0"
                                step="0.001"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 0.8 }}>
                            <label className="form-label">&nbsp;</label>
                            <select
                                value={chhol}
                                onChange={(e) => setChhol(e.target.value)}
                                className="form-input"
                            >
                                <option value="">Chhol</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </select>
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

export default AddForginInwardModal;
