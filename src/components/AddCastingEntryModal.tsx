import React, { useState } from 'react';
import './AddProductModal.css';
import type { CastingEntry } from '../types';

interface AddCastingEntryModalProps {
    onClose: () => void;
    onSubmit: (entry: Omit<CastingEntry, 'id'>) => Promise<void>;
    initialData?: CastingEntry | null;
}

const AddCastingEntryModal: React.FC<AddCastingEntryModalProps> = ({ onClose, onSubmit, initialData }) => {
    // Convert DD/MM/YYYY to YYYY-MM-DD for the date input
    const initDate = (() => {
        if (initialData?.date) {
            const parts = initialData.date.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return new Date().toISOString().split('T')[0];
    })();

    const [date, setDate] = useState(initDate);
    const [mell, setMell] = useState<number | ''>(initialData?.mell ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!date) {
            setError('Date is required');
            return;
        }

        if (mell === '') {
            setError('Mell value is required');
            return;
        }

        try {
            setLoading(true);
            const [year, month, day] = date.split('-');
            await onSubmit({
                date: `${day}/${month}/${year}`,
                mell: Number(mell),
            });
        } catch (err: any) {
            console.error("Error saving entry:", err);
            setError('Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">{initialData ? 'Edit Casting Entry' : 'Add Casting Entry'}</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label className="form-label">Date*</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mell*</label>
                        <input
                            type="number"
                            value={mell}
                            onChange={(e) => setMell(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Enter Mell Value"
                            className="form-input"
                            required
                            step="0.001"
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

export default AddCastingEntryModal;
