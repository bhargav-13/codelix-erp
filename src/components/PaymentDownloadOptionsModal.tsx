import React, { useState } from 'react';
import './AddProductModal.css'; // Reusing existing modal styles

interface PaymentDownloadOptionsModalProps {
    onClose: () => void;
    onNext: (partyName: string, startDate: string, endDate: string) => void;
}

const PaymentDownloadOptionsModal: React.FC<PaymentDownloadOptionsModalProps> = ({ onClose, onNext }) => {
    const [partyName, setPartyName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!partyName) {
            setError('Please select a Party Name');
            return;
        }
        if (!startDate) {
            setError('Please select a Start Date');
            return;
        }
        if (!endDate) {
            setError('Please select an End Date');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('Start Date cannot be after End Date');
            return;
        }

        onNext(partyName, startDate, endDate);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Download Report</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleNext} className="modal-form">
                    {/* Party Name */}
                    <div className="form-group">
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

                    {/* Date Range */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="save-button">
                            Next
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

export default PaymentDownloadOptionsModal;
