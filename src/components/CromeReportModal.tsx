import React, { useState, useEffect } from 'react';
import { cromeApi } from '../api/crome';
import type { Party } from '../types';
import './CromeReportModal.css';

interface CromeReportModalProps {
    onClose: () => void;
}

const CromeReportModal: React.FC<CromeReportModalProps> = ({ onClose }) => {
    const [parties, setParties] = useState<Party[]>([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchParties();
    }, []);

    const fetchParties = async () => {
        try {
            const data = await cromeApi.getPartyList();
            setParties(data);
        } catch (err) {
            console.error('Failed to fetch parties', err);
            setError('Failed to load parties');
        }
    };

    const handleDownload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate) return;

        setLoading(true);
        setError(null);

        try {
            const blob = await cromeApi.getCromeReportPdf(selectedParty, startDate, endDate);

            // Create object URL and download
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            const filename = selectedParty
                ? `Crome_Report_${selectedParty}_${startDate}_${endDate}.pdf`
                : `Crome_Report_All_${startDate}_${endDate}.pdf`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            onClose();
        } catch (err) {
            console.error('Download failed', err);
            setError('Failed to download report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">Download Crome Report</h2>

                <form onSubmit={handleDownload}>
                    <div className="form-group">
                        <label className="form-label">Select Party</label>
                        <select
                            className="form-input"
                            value={selectedParty}
                            onChange={(e) => setSelectedParty(e.target.value)}
                        >
                            <option value="">All Parties</option>
                            {parties.map(party => (
                                <option key={party.partyId} value={party.name}>
                                    {party.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="date-row">
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button
                            type="submit"
                            className="save-button" // Reuse style
                            disabled={loading || !startDate || !endDate}
                        >
                            {loading ? 'Generating...' : 'Download PDF'}
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

export default CromeReportModal;
