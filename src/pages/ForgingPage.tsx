import React, { useState, useEffect } from 'react';
import './CastingPage.css';
import '../components/AddProductModal.css';
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import AddForgingInwardModal from '../components/AddForgingInwardModal';
import AddForgingOutwardModal from '../components/AddForgingOutwardModal';
import { forgingInwardApi, forgingInwardItemsApi, forgingOutwardApi, forgingPartyApi, forgingReportApi } from '../api/forging';
import type { ForgingInward, ForgingOutward, ForgingParty } from '../types';
import Loading from '../components/Loading';

// Download Icon
const DownloadIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);

type Tab = 'inward' | 'outward';

const getCurrentYearMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const generateMonthOptions = () => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        options.push({ value, label });
    }
    return options;
};

const ForgingPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('inward');
    const [searchQuery, setSearchQuery] = useState('');
    const [inwardEntries, setInwardEntries] = useState<ForgingInward[]>([]);
    const [outwardEntries, setOutwardEntries] = useState<ForgingOutward[]>([]);
    const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
    const [isOutwardModalOpen, setIsOutwardModalOpen] = useState(false);
    const [editingInward, setEditingInward] = useState<ForgingInward | null>(null);
    const [editingOutward, setEditingOutward] = useState<ForgingOutward | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDownloadPopupOpen, setIsDownloadPopupOpen] = useState(false);
    const [downloadPartyName, setDownloadPartyName] = useState('');
    const [downloadFromDate, setDownloadFromDate] = useState('');
    const [downloadToDate, setDownloadToDate] = useState('');
    const [downloadParties, setDownloadParties] = useState<ForgingParty[]>([]);
    const [downloadPartiesLoading, setDownloadPartiesLoading] = useState(true);
    const [selectedParty, setSelectedParty] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
    const monthOptions = generateMonthOptions();

    // Fetch forging entries and parties for PDF filter dropdown
    useEffect(() => {
        fetchInwardEntries();
        fetchOutwardEntries();
        forgingPartyApi.getAll()
            .then(setDownloadParties)
            .catch(() => setDownloadParties([]))
            .finally(() => setDownloadPartiesLoading(false));
    }, []);

    const fetchInwardEntries = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await forgingInwardApi.getAll();
            setInwardEntries(data);
        } catch (err: any) {
            console.error('Error fetching forging inward entries:', err);
            setError('Failed to load forging inward entries. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchOutwardEntries = async () => {
        try {
            const data = await forgingOutwardApi.getAll();
            setOutwardEntries(data);
        } catch (err: any) {
            console.error('Error fetching forging outward entries:', err);
        }
    };

    // ── Add / Edit handlers ───────────────────────────────────
    const handleInwardSubmit = async (data: Omit<ForgingInward, 'id'>) => {
        if (editingInward) {
            await forgingInwardApi.update(editingInward.id!, data);
        } else {
            const created = await forgingInwardApi.create(data);
            // Save locally-added item after inward is created
            if (created.id && data.item && !data.item.id) {
                await forgingInwardItemsApi.create(created.id, data.item);
            }
        }
        await fetchInwardEntries();
        setIsInwardModalOpen(false);
        setEditingInward(null);
    };

    const handleOutwardSubmit = async (data: Omit<ForgingOutward, 'id'>) => {
        if (editingOutward) {
            await forgingOutwardApi.update(editingOutward.id!, data);
        } else {
            await forgingOutwardApi.create(data);
        }
        await fetchOutwardEntries();
        setIsOutwardModalOpen(false);
        setEditingOutward(null);
    };

    // ── Delete handlers ───────────────────────────────────────
    const handleDeleteInward = async (id: number) => {
        if (!window.confirm('Delete this inward entry?')) return;
        try {
            await forgingInwardApi.delete(id);
            setInwardEntries(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            alert('Failed to delete entry.');
        }
    };

    const handleDeleteOutward = async (id: number) => {
        if (!window.confirm('Delete this outward entry?')) return;
        try {
            await forgingOutwardApi.delete(id);
            setOutwardEntries(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            alert('Failed to delete entry.');
        }
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const fromDate = downloadFromDate || undefined;
            const toDate = downloadToDate || undefined;
            const partyName = downloadPartyName.trim() || undefined;
            await forgingReportApi.downloadPdf(partyName, fromDate, toDate);
            setIsDownloadPopupOpen(false);
        } catch (err: any) {
            console.error('Error downloading PDF:', err);
            alert('Failed to download PDF report. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    // Calculate totals
    const calculateTotalWeight = (entries: (ForgingInward | ForgingOutward)[]) => {
        return entries.reduce((sum, entry) => sum + entry.weight, 0);
    };

    // Filter entries based on search query and selected party
    const filterEntries = (entries: (ForgingInward | ForgingOutward)[]) => {
        let result = entries;
        if (selectedParty) {
            result = result.filter(entry => entry.partyName === selectedParty);
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(entry =>
                entry.partyName.toLowerCase().includes(query) ||
                entry.challanNo.toLowerCase().includes(query)
            );
        }
        return result;
    };

    const isSelectedMonth = (dateStr: string) => {
        const [, mm, yyyy] = dateStr.split('/');
        const [selYear, selMonth] = selectedMonth.split('-').map(Number);
        return parseInt(mm) === selMonth && parseInt(yyyy) === selYear;
    };

    const filteredInwardEntries = filterEntries(inwardEntries).filter(e => isSelectedMonth(e.date));
    const filteredOutwardEntries = filterEntries(outwardEntries).filter(e => isSelectedMonth(e.date));

    const totalInward = calculateTotalWeight(filteredInwardEntries);
    const totalOutward = calculateTotalWeight(filteredOutwardEntries);
    const netStock = totalInward - totalOutward;
    const pendingOrders = filteredInwardEntries.length + filteredOutwardEntries.length;

    if (loading) {
        return <Loading message="Loading forging data..." />;
    }

    return (
        <div className="casting-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Forging Management</h1>
                    <p className="page-subtitle">Manage Forging Inward and Outward entries</p>
                </div>
                <div className="header-actions">
                    <button
                        type="button"
                        className="action-button primary-button"
                        onClick={() => {
                            if (activeTab === 'inward') {
                                setEditingInward(null);
                                setIsInwardModalOpen(true);
                            } else {
                                setEditingOutward(null);
                                setIsOutwardModalOpen(true);
                            }
                        }}
                    >
                        <span className="button-icon">+</span>
                        <span className="button-text">Add {activeTab === 'inward' ? 'Inward' : 'Outward'}</span>
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            {/* Month selector */}
            <div className="stats-month-selector">
                <select
                    className="month-filter-select"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    title="Select month"
                >
                    {monthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Stats Grid - 2x2 */}
            <div className="sell-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '24px' }}>
                <div className="casting-stat-card">
                    <span className="stat-title">Total Inward</span>
                    <span className="stat-value">{totalInward.toFixed(2)}</span>
                </div>
                <div className="casting-stat-card">
                    <span className="stat-title">Total Outward</span>
                    <span className="stat-value">{totalOutward.toFixed(2)}</span>
                </div>
                <div className="casting-stat-card">
                    <span className="stat-title">Net Stock</span>
                    <span className="stat-value">{netStock.toFixed(2)}</span>
                </div>
                <div className="casting-stat-card">
                    <span className="stat-title">Pending Orders</span>
                    <span className="stat-value">{pendingOrders}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="casting-toggle-container">
                <button
                    className={`casting-toggle-btn ${activeTab === 'inward' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inward')}
                >
                    Inward
                </button>
                <button
                    className={`casting-toggle-btn ${activeTab === 'outward' ? 'active' : ''}`}
                    onClick={() => setActiveTab('outward')}
                >
                    Outward
                </button>
            </div>

            {/* Search and Actions */}
            <div className="order-filters">
                <div className="order-search">
                    <img src={SearchIcon} alt="Search" />
                    <input
                        type="text"
                        placeholder="Search by Challan or Party"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="order-status-filter">
                    <select
                        value={selectedParty}
                        onChange={e => setSelectedParty(e.target.value)}
                        title="Filter by party"
                    >
                        <option value="">All Parties</option>
                        {downloadParties.map(p => (
                            <option key={p.partyId} value={p.partyName}>{p.partyName}</option>
                        ))}
                    </select>
                </div>
                <button
                    className="order-status-filter"
                    onClick={() => setIsDownloadPopupOpen(true)}
                    title="Download Forging PDF Report"
                >
                    <span className="button-text">Download</span>
                    <DownloadIcon />
                </button>
            </div>

            {/* Table */}
            <div className="casting-table-container">
                <table className="casting-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Party Name</th>
                            <th>Challan No.</th>
                            <th>Weight</th>
                            <th>Unit</th>
                            {activeTab === 'inward' && <th>Items</th>}
                            <th>Price</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeTab === 'inward' ? (
                            filteredInwardEntries.length > 0 ? (
                                (filteredInwardEntries as ForgingInward[]).map((row) => (
                                    <tr key={row.id}>
                                        <td>{row.date}</td>
                                        <td>{row.partyName}</td>
                                        <td>{row.challanNo}</td>
                                        <td>{row.weight}</td>
                                        <td>{row.weightUnit}</td>
                                        <td>{row.item ? row.item.name : '-'}</td>
                                        <td>-</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="edit-btn"
                                                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                                                    onClick={() => { setEditingInward(row); setIsInwardModalOpen(true); }}
                                                    title="Edit"
                                                >
                                                    <img src={EditIcon} alt="Edit" width={15} height={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteInward(row.id!)}
                                                    title="Delete"
                                                >
                                                    <img src={DeleteIcon} alt="Delete" width={15} height={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#8E8E8E' }}>
                                        No inward entries found
                                    </td>
                                </tr>
                            )
                        ) : (
                            filteredOutwardEntries.length > 0 ? (
                                (filteredOutwardEntries as ForgingOutward[]).map((row) => (
                                    <tr key={row.id}>
                                        <td>{row.date}</td>
                                        <td>{row.partyName}</td>
                                        <td>{row.challanNo}</td>
                                        <td>{row.weight}</td>
                                        <td>{row.weightUnit}</td>
                                        <td>-</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="edit-btn"
                                                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                                                    onClick={() => { setEditingOutward(row); setIsOutwardModalOpen(true); }}
                                                    title="Edit"
                                                >
                                                    <img src={EditIcon} alt="Edit" width={15} height={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteOutward(row.id!)}
                                                    title="Delete"
                                                >
                                                    <img src={DeleteIcon} alt="Delete" width={15} height={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#8E8E8E' }}>
                                        No outward entries found
                                    </td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {isInwardModalOpen && (
                <AddForgingInwardModal
                    onClose={() => { setIsInwardModalOpen(false); setEditingInward(null); }}
                    onSubmit={handleInwardSubmit}
                    initialData={editingInward}
                    existingInwards={inwardEntries}
                />
            )}

            {isOutwardModalOpen && (
                <AddForgingOutwardModal
                    onClose={() => { setIsOutwardModalOpen(false); setEditingOutward(null); }}
                    onSubmit={handleOutwardSubmit}
                    initialData={editingOutward}
                />
            )}

            {/* Download Filter Popup */}
            {isDownloadPopupOpen && (
                <div className="modal-overlay" onClick={() => setIsDownloadPopupOpen(false)}>
                    <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">
                            Download Forging PDF
                        </h2>

                        <p className="form-label" style={{ marginBottom: '1rem', fontWeight: 400 }}>
                            All fields are optional — leave blank to download the full report.
                        </p>

                        <div className="modal-form">
                            <div className="form-group">
                                <label className="form-label">Party <span style={{ opacity: 0.5 }}>(optional)</span></label>
                                <select
                                    className="form-input"
                                    value={downloadPartyName}
                                    onChange={e => setDownloadPartyName(e.target.value)}
                                    disabled={downloadPartiesLoading}
                                    title="Select party"
                                >
                                    <option value="">
                                        {downloadPartiesLoading ? 'Loading parties...' : '— All Parties —'}
                                    </option>
                                    {downloadParties.map(p => (
                                        <option key={p.partyId} value={p.partyName}>
                                            {p.partyName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">From Date <span style={{ opacity: 0.5 }}>(optional)</span></label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={downloadFromDate}
                                    onChange={e => setDownloadFromDate(e.target.value)}
                                    title="From date"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">To Date <span style={{ opacity: 0.5 }}>(optional)</span></label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={downloadToDate}
                                    onChange={e => setDownloadToDate(e.target.value)}
                                    title="To date"
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

export default ForgingPage;
