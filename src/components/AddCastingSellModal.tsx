import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import './AddCastingSellModal.css';
import type { CastingSale } from '../types';

interface AddCastingSellModalProps {
    onClose: () => void;
    onSubmit: (entry: Omit<CastingSale, 'id' | 'totalAmount'>) => Promise<void>;
    initialData?: CastingSale | null;
}

const AddCastingSellModal: React.FC<AddCastingSellModalProps> = ({ onClose, onSubmit, initialData }) => {
    // Convert DD/MM/YYYY to YYYY-MM-DD for the date input
    const initDate = (() => {
        if (initialData?.date) {
            const parts = initialData.date.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return new Date().toISOString().split('T')[0];
    })();

    const [date, setDate] = useState(initDate);

    // Brass State
    const [brass, setBrass] = useState<number | ''>(initialData?.brass ?? '');

    // Kadi State
    const [kadi, setKadi] = useState<number | ''>(initialData?.kadi ?? '');
    const [kadiRate, setKadiRate] = useState<number | ''>(initialData?.kadiRate ?? '');
    const [kadiAmount, setKadiAmount] = useState<number | ''>(initialData?.kadiAmount ?? '');

    // Lokhand State
    const [lokhand, setLokhand] = useState<number | ''>(initialData?.lokhand ?? '');
    const [lokhandRate, setLokhandRate] = useState<number | ''>(initialData?.lokhandRate ?? '');
    const [lokhandAmount, setLokhandAmount] = useState<number | ''>(initialData?.lokhandAmount ?? '');

    const [loading, setLoading] = useState(false);

    // Auto-calculate amounts
    useEffect(() => {
        if (kadi !== '' && kadiRate !== '') {
            setKadiAmount(Number(kadi) * Number(kadiRate));
        }
    }, [kadi, kadiRate]);

    useEffect(() => {
        if (lokhand !== '' && lokhandRate !== '') {
            setLokhandAmount(Number(lokhand) * Number(lokhandRate));
        }
    }, [lokhand, lokhandRate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            setLoading(true);
            await onSubmit({
                date: date.split('-').reverse().join('/'),
                brass: brass === '' ? null : Number(brass),
                kadi: kadi === '' ? null : Number(kadi),
                kadiRate: kadiRate === '' ? null : Number(kadiRate),
                kadiAmount: kadiAmount === '' ? null : Number(kadiAmount),
                lokhand: lokhand === '' ? null : Number(lokhand),
                lokhandRate: lokhandRate === '' ? null : Number(lokhandRate),
                lokhandAmount: lokhandAmount === '' ? null : Number(lokhandAmount),
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content medium-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">{initialData ? 'Edit Casting Sale' : 'Casting Sell Add'}</h2>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-row full-width">
                        <div className="form-group full-width">
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

                    {/* Brass Row */}
                    <div className="form-row full-width">
                        <div className="form-group full-width">
                            <label className="form-label">Brass Weight</label>
                            <input
                                type="number"
                                value={brass}
                                onChange={(e) => setBrass(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter Brass Weight"
                                className="form-input"
                                step="0.001"
                            />
                        </div>
                    </div>

                    {/* Kadi Row */}
                    <div className="form-row three-col">
                        <div className="form-group">
                            <label className="form-label">Kadi</label>
                            <input
                                type="number"
                                value={kadi}
                                onChange={(e) => setKadi(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="256kg"
                                className="form-input"
                                step="0.001"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rate</label>
                            <input
                                type="number"
                                value={kadiRate}
                                onChange={(e) => setKadiRate(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="60"
                                className="form-input"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Total Amount</label>
                            <input
                                type="number"
                                value={kadiAmount}
                                onChange={(e) => setKadiAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="₹ 37,060"
                                className="form-input bg-gray"
                                readOnly
                            />
                        </div>
                    </div>

                    {/* Lokhand Row */}
                    <div className="form-row three-col">
                        <div className="form-group">
                            <label className="form-label">Lokhand</label>
                            <input
                                type="number"
                                value={lokhand}
                                onChange={(e) => setLokhand(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="256kg"
                                className="form-input"
                                step="0.001"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rate</label>
                            <input
                                type="number"
                                value={lokhandRate}
                                onChange={(e) => setLokhandRate(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="60"
                                className="form-input"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Total Amount</label>
                            <input
                                type="number"
                                value={lokhandAmount}
                                onChange={(e) => setLokhandAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="₹ 17,612"
                                className="form-input bg-gray"
                                readOnly
                            />
                        </div>
                    </div>

                    <div className="modal-actions centered">
                        <button type="submit" className="save-button wide" disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" className="cancel-button wide" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCastingSellModal;
