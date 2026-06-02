import React, { useState, useEffect, useCallback } from 'react';
import './SubcontractingPage.css';
import './InventoryPage.css';
import '../components/AddProductModal.css';
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import AddElectricCreditModal from '../components/AddElectricCreditModal';
import AddElectricOutwardModal from '../components/AddElectricOutwardModal';
import type { ElectricOutward, ElectricCredit } from '../types';
import { electricOutwardApi, electricCreditApi } from '../api/electric';

type ElectricTab = 'OUTWARDS' | 'CREDIT';

const ElectricPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ElectricTab>('OUTWARDS');
    const [searchQuery, setSearchQuery] = useState('');

    // ── Data state ────────────────────────────────────────────
    const [outwardEntries, setOutwardEntries] = useState<ElectricOutward[]>([]);
    const [creditEntries, setCreditEntries] = useState<ElectricCredit[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Modal state ───────────────────────────────────────────
    const [isAddCreditModalOpen, setIsAddCreditModalOpen] = useState(false);
    const [isAddOutwardModalOpen, setIsAddOutwardModalOpen] = useState(false);
    const [editingOutward, setEditingOutward] = useState<ElectricOutward | null>(null);
    const [editingCredit, setEditingCredit] = useState<ElectricCredit | null>(null);

    // ── Download popup state ──────────────────────────────────
    const [isDownloadPopupOpen, setIsDownloadPopupOpen] = useState(false);
    const [downloadFromDate, setDownloadFromDate] = useState('');
    const [downloadToDate, setDownloadToDate] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    // ── Fetch data ────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'OUTWARDS') {
                const data = await electricOutwardApi.getAll();
                setOutwardEntries(data);
            } else {
                const data = await electricCreditApi.getAll();
                setCreditEntries(data);
            }
        } catch (err: any) {
            console.error('Failed to fetch electric data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Tab change ────────────────────────────────────────────
    const handleTabChange = (tab: ElectricTab) => {
        setActiveTab(tab);
        setSearchQuery('');
        setError(null);
    };

    // ── Add / Edit handlers ───────────────────────────────────
    const handleAdd = () => {
        if (activeTab === 'CREDIT') {
            setEditingCredit(null);
            setIsAddCreditModalOpen(true);
        } else {
            setEditingOutward(null);
            setIsAddOutwardModalOpen(true);
        }
    };

    const handleOutwardSubmit = async (
        data: Omit<ElectricOutward, 'id' | 'totalUnitAmount' | 'totalWeightAmount' | 'totalAmount'>
    ) => {
        if (editingOutward) {
            await electricOutwardApi.update(editingOutward.id, data);
        } else {
            await electricOutwardApi.create(data);
        }
        await fetchData();
    };

    const handleCreditSubmit = async (data: Omit<ElectricCredit, 'id'>) => {
        if (editingCredit) {
            await electricCreditApi.update(editingCredit.id, data);
        } else {
            await electricCreditApi.create(data);
        }
        await fetchData();
    };

    // ── Delete handlers ───────────────────────────────────────
    const handleDeleteOutward = async (id: number) => {
        if (!window.confirm('Delete this outward entry?')) return;
        try {
            await electricOutwardApi.delete(id);
            setOutwardEntries(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            alert('Failed to delete entry.');
        }
    };

    const handleDeleteCredit = async (id: number) => {
        if (!window.confirm('Delete this credit entry?')) return;
        try {
            await electricCreditApi.delete(id);
            setCreditEntries(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            alert('Failed to delete entry.');
        }
    };

    // ── PDF Download ──────────────────────────────────────────
    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            // Only outward has PDF export per the YAML
            await electricOutwardApi.downloadPdf(downloadFromDate || undefined, downloadToDate || undefined);
            setIsDownloadPopupOpen(false);
            setDownloadFromDate('');
            setDownloadToDate('');
        } catch (err: any) {
            alert(err?.message || 'Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    // ── Filtered views ────────────────────────────────────────
    const filteredOutward = outwardEntries.filter(e =>
        e.challanNo.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredCredit = creditEntries.filter(e =>
        e.challanNo.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const fmt = (n: number) => n?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="subcontracting-page">
            {/* Tab Toggle */}
            <div style={{
                display: 'flex', width: '100%', borderRadius: '10px',
                overflow: 'hidden', marginBottom: '24px',
                border: '1.5px solid #b4d5ef', background: '#fff',
            }}>
                {(['OUTWARDS', 'CREDIT'] as ElectricTab[]).map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => handleTabChange(tab)}
                        style={{
                            flex: 1, padding: '14px 0', border: 'none', outline: 'none',
                            cursor: 'pointer', fontFamily: "'Jost', sans-serif",
                            fontSize: '16px',
                            fontWeight: activeTab === tab ? 600 : 500,
                            color: activeTab === tab ? '#fff' : '#17344D',
                            backgroundColor: activeTab === tab ? '#5b9bd5' : '#fff',
                            transition: 'all 0.25s ease', letterSpacing: '0.3px',
                        }}
                    >
                        {tab.charAt(0) + tab.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Page Header */}
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Electric Management</h1>
                    <p className="page-subtitle">Track materials, processes, and billing for electric work.</p>
                </div>
                <button type="button" className="add-button" onClick={handleAdd}>
                    <span className="add-icon">+</span>
                    <span className="add-text">Add Entry</span>
                </button>
            </div>

            {/* Search + Download Row */}
            <div className="order-filters">
                <div className="order-search" style={{ flex: 3 }}>
                    <img src={SearchIcon} alt="Search" />
                    <input
                        type="text"
                        placeholder="Search by Challan No."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            border: 'none', background: 'transparent', outline: 'none',
                            fontFamily: "'Jost', sans-serif", fontSize: '14px',
                            color: '#17344d', flex: 1, width: '100%',
                        }}
                    />
                </div>
                {activeTab === 'OUTWARDS' && (
                    <button
                        type="button"
                        className="action-button secondary-button"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => setIsDownloadPopupOpen(true)}
                    >
                        <span className="button-text">Download</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                )}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="error-message" style={{ marginBottom: '12px' }}>
                    {error}
                </div>
            )}

            {/* Data Table */}
            <div className="inventory-table-container" style={{ border: '1px solid rgba(125,153,169,0.3)', borderRadius: '12px' }}>
                <table className="inventory-table" style={{ minWidth: '700px' }}>
                    <thead>
                        <tr>
                            {activeTab === 'OUTWARDS' ? (
                                <>
                                    <th style={{ textAlign: 'center' }}>Date</th>
                                    <th style={{ textAlign: 'center' }}>Challan No.</th>
                                    <th style={{ textAlign: 'center' }}>Weight (Kg)</th>
                                    <th style={{ textAlign: 'center' }}>Rate</th>
                                    <th style={{ textAlign: 'center' }}>Unit</th>
                                    <th style={{ textAlign: 'center' }}>Unit Rate (₹)</th>
                                    <th style={{ textAlign: 'center' }}>Unit Amt (₹)</th>
                                    <th style={{ textAlign: 'center' }}>Wt Amt (₹)</th>
                                    <th style={{ textAlign: 'center' }}>Total Amt (₹)</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </>
                            ) : (
                                <>
                                    <th style={{ textAlign: 'center' }}>Date</th>
                                    <th style={{ textAlign: 'center' }}>Challan No.</th>
                                    <th style={{ textAlign: 'center' }}>Payment (₹)</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={activeTab === 'OUTWARDS' ? 10 : 4} className="no-data">
                                    Loading...
                                </td>
                            </tr>
                        ) : activeTab === 'OUTWARDS' ? (
                            <>
                                {filteredOutward.map((entry) => (
                                    <tr key={entry.id}>
                                        <td style={{ textAlign: 'center' }}>{entry.date}</td>
                                        <td style={{ textAlign: 'center' }}>{entry.challanNo}</td>
                                        <td style={{ textAlign: 'center' }}>{fmt(entry.weight)}</td>
                                        <td style={{ textAlign: 'center' }}>{fmt(entry.perKgWeight)}</td>
                                        <td style={{ textAlign: 'center' }}>{fmt(entry.unit)}</td>
                                        <td style={{ textAlign: 'center' }}>{fmt(entry.unitRate)}</td>
                                        <td style={{ textAlign: 'center' }}>{fmt(entry.totalUnitAmount)}</td>
                                        <td style={{ textAlign: 'center' }}>{fmt(entry.totalWeightAmount)}</td>
                                        <td style={{ textAlign: 'center' }}>{fmt(entry.totalAmount)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    className="edit-btn"
                                                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                                                    onClick={() => { setEditingOutward(entry); setIsAddOutwardModalOpen(true); }}
                                                    title="Edit"
                                                >
                                                    <img src={EditIcon} alt="Edit" width={15} height={15} />
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteOutward(entry.id)}
                                                    title="Delete"
                                                >
                                                    <img src={DeleteIcon} alt="Delete" width={15} height={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredOutward.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="no-data">No entries found</td>
                                    </tr>
                                )}
                            </>
                        ) : (
                            <>
                                {filteredCredit.map((entry) => (
                                    <tr key={entry.id}>
                                        <td style={{ textAlign: 'center' }}>{entry.date}</td>
                                        <td style={{ textAlign: 'center' }}>{entry.challanNo}</td>
                                        <td style={{ textAlign: 'center' }}>{fmt(entry.rate)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    className="edit-btn"
                                                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                                                    onClick={() => { setEditingCredit(entry); setIsAddCreditModalOpen(true); }}
                                                    title="Edit"
                                                >
                                                    <img src={EditIcon} alt="Edit" width={15} height={15} />
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteCredit(entry.id)}
                                                    title="Delete"
                                                >
                                                    <img src={DeleteIcon} alt="Delete" width={15} height={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCredit.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="no-data">No entries found</td>
                                    </tr>
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {isAddOutwardModalOpen && (
                <AddElectricOutwardModal
                    onClose={() => { setIsAddOutwardModalOpen(false); setEditingOutward(null); }}
                    onSuccess={() => { }}
                    onSubmit={handleOutwardSubmit}
                    initialData={editingOutward}
                />
            )}

            {isAddCreditModalOpen && (
                <AddElectricCreditModal
                    onClose={() => { setIsAddCreditModalOpen(false); setEditingCredit(null); }}
                    onSuccess={() => { }}
                    onSubmit={handleCreditSubmit}
                    initialData={editingCredit}
                />
            )}

            {/* PDF Download Popup (Outward only) */}
            {isDownloadPopupOpen && (
                <div className="modal-overlay" onClick={() => setIsDownloadPopupOpen(false)}>
                    <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Download Outward PDF</h2>
                        <p className="form-label" style={{ marginBottom: '1rem', fontWeight: 400 }}>
                            Filter by date range — leave blank to download the full report.
                        </p>
                        <div className="modal-form">
                            <div className="form-group">
                                <label className="form-label">From Date <span style={{ opacity: 0.5 }}>(optional)</span></label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={downloadFromDate}
                                    onChange={e => setDownloadFromDate(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">To Date <span style={{ opacity: 0.5 }}>(optional)</span></label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={downloadToDate}
                                    onChange={e => setDownloadToDate(e.target.value)}
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="save-button"
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                >
                                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                                </button>
                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() => setIsDownloadPopupOpen(false)}
                                    disabled={isDownloading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ElectricPage;
