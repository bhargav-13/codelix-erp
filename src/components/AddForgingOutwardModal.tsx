import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import type { ForgingOutward, ForgingParty, OutwardWeightUnit } from '../types';
import { forgingPartyApi } from '../api/forging';

interface AddForgingOutwardModalProps {
    onClose: () => void;
    onSubmit: (entry: Omit<ForgingOutward, 'id'>) => Promise<void>;
    initialData?: ForgingOutward | null;
}

const AddForgingOutwardModal: React.FC<AddForgingOutwardModalProps> = ({ onClose, onSubmit, initialData }) => {
    // Convert DD/MM/YYYY to YYYY-MM-DD for the date input
    const initDate = (() => {
        if (initialData?.date) {
            const parts = initialData.date.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return new Date().toISOString().split('T')[0];
    })();

    const [date, setDate] = useState(initDate);
    const [partyId, setPartyId] = useState<number | ''>(initialData?.partyId ?? initialData?.party?.partyId ?? '');
    const [challanNo, setChallanNo] = useState(initialData?.challanNo ?? '');
    const [weight, setWeight] = useState<number | ''>(initialData?.weight ?? '');
    // Outward only has WIRE as per YAML schema
    const weightUnit: OutwardWeightUnit = 'WIRE';
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Party dropdown state
    const [parties, setParties] = useState<ForgingParty[]>([]);
    const [partiesLoading, setPartiesLoading] = useState(true);

    // Add new party state
    const [showAddParty, setShowAddParty] = useState(false);
    const [newPartyName, setNewPartyName] = useState('');
    const [addingParty, setAddingParty] = useState(false);

    useEffect(() => {
        fetchParties();
    }, []);

    const fetchParties = async () => {
        try {
            setPartiesLoading(true);
            const data = await forgingPartyApi.getAll();
            setParties(data);
        } catch (err) {
            console.error('Failed to fetch parties:', err);
        } finally {
            setPartiesLoading(false);
        }
    };

    const handleAddParty = async () => {
        if (!newPartyName.trim()) return;

        try {
            setAddingParty(true);
            const newParty = await forgingPartyApi.createParty(newPartyName.trim());

            // Refresh parties list
            const data = await forgingPartyApi.getAll();
            setParties(data);

            // Select the newly created party
            setPartyId(newParty.partyId);
            setNewPartyName('');
            setShowAddParty(false);
        } catch (err) {
            console.error('Failed to add party:', err);
            setError('Failed to add party');
        } finally {
            setAddingParty(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!date || !partyId || !challanNo || weight === '') {
            setError('All fields are required');
            return;
        }

        const selectedParty = parties.find(p => p.partyId === partyId);

        try {
            setLoading(true);

            // Format date to DD/MM/YYYY
            const [year, month, day] = date.split('-');
            await onSubmit({
                partyId: Number(partyId),
                partyName: selectedParty?.partyName || '',
                challanNo,
                date: `${day}/${month}/${year}`,
                weight: Number(weight),
                weightUnit,
            });
        } catch (err: any) {
            console.error('Error saving entry:', err);
            setError('Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">{initialData ? 'Edit Forging Outward Entry' : 'Add Forging Outward Entry'}</h2>

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
                        <label className="form-label">Party*</label>
                        <div className="dropdown-with-add" style={{ display: 'flex', gap: '8px' }}>
                            <select
                                value={partyId}
                                onChange={(e) => setPartyId(e.target.value === '' ? '' : Number(e.target.value))}
                                className="form-input"
                                required
                                disabled={partiesLoading || showAddParty}
                                style={{ flex: 1 }}
                            >
                                <option value="">
                                    {partiesLoading ? 'Loading parties...' : '— Select Party —'}
                                </option>
                                {parties.map(p => (
                                    <option key={p.partyId} value={p.partyId}>
                                        {p.partyName}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="add-new-btn"
                                onClick={() => setShowAddParty(!showAddParty)}
                                title="Add new party"
                                style={{ padding: '0 12px', fontSize: '20px' }}
                            >
                                {showAddParty ? '×' : '+'}
                            </button>
                        </div>
                        {showAddParty && (
                            <div className="add-new-input-group" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <input
                                    type="text"
                                    value={newPartyName}
                                    onChange={(e) => setNewPartyName(e.target.value)}
                                    placeholder="Enter party name"
                                    className="form-input"
                                    style={{ flex: 1 }}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParty())}
                                />
                                <button
                                    type="button"
                                    className="add-confirm-btn"
                                    onClick={handleAddParty}
                                    disabled={addingParty || !newPartyName.trim()}
                                >
                                    {addingParty ? '...' : 'Add'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Challan No*</label>
                        <input
                            type="text"
                            value={challanNo}
                            onChange={(e) => setChallanNo(e.target.value)}
                            placeholder="Enter Challan Number"
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Weight*</label>
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Enter Weight"
                            className="form-input"
                            required
                            step="0.001"
                            min="0"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Weight Unit</label>
                        <input
                            type="text"
                            value="WIRE"
                            className="form-input"
                            readOnly
                            style={{ background: 'var(--input-bg, #f5f5f5)', cursor: 'not-allowed', opacity: 0.7 }}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="save-button" disabled={loading || partiesLoading || addingParty}>
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

export default AddForgingOutwardModal;
