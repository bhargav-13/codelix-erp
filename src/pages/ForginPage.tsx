import React, { useState } from 'react';
import './SubcontractingPage.css';
import './InventoryPage.css';
import SearchIcon from '../assets/search.svg';
import AddForginInwardModal, { type ForginInwardEntry } from '../components/AddForginInwardModal';
import AddForginOutwardModal, { type ForginOutwardEntry } from '../components/AddForginOutwardModal';
import ForginDownloadOptionsModal from '../components/ForginDownloadOptionsModal';
import ForginReportModal from '../components/ForginReportModal';

type ForginTab = 'INWARD' | 'OUTWARD';

interface InwardEntryWithId extends ForginInwardEntry {
    id: number;
}

interface OutwardEntryWithId extends ForginOutwardEntry {
    id: number;
}

const MOCK_INWARD_ENTRIES: InwardEntryWithId[] = [
    { id: 1, date: '01/01/2026', partyName: 'Bipin Bhai', challanNo: '25', price: 239.400, weight: 0, unit: 'Kg', chhol: '' },
    { id: 2, date: '01/01/2026', partyName: 'Akshar', challanNo: '25', price: 239.400, weight: 0, unit: 'Kg', chhol: '' },
    { id: 3, date: '01/01/2026', partyName: 'Bansi', challanNo: '25', price: 239.400, weight: 0, unit: 'Kg', chhol: '' },
    { id: 4, date: '01/01/2026', partyName: 'Bipin Bhai', challanNo: '25', price: 239.400, weight: 0, unit: 'Kg', chhol: '' },
    { id: 5, date: '01/01/2026', partyName: 'Bipin Bhai', challanNo: '25', price: 239.400, weight: 0, unit: 'Kg', chhol: '' },
];

const MOCK_OUTWARD_ENTRIES: OutwardEntryWithId[] = [
    { id: 1, date: '01/01/2026', partyName: 'Client X', challanNo: '25', price: 239.400, weight: 0, unit: 'Kg', wire: 0 },
];

const ForginPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ForginTab>('INWARD');
    const [searchQuery, setSearchQuery] = useState('');
    const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
    const [isOutwardModalOpen, setIsOutwardModalOpen] = useState(false);

    // Download Flow State
    const [isDownloadOptionsOpen, setIsDownloadOptionsOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportOptions, setReportOptions] = useState<{ party: string; start: string; end: string } | null>(null);

    const [inwardEntries, setInwardEntries] = useState<InwardEntryWithId[]>(MOCK_INWARD_ENTRIES);
    const [outwardEntries, setOutwardEntries] = useState<OutwardEntryWithId[]>(MOCK_OUTWARD_ENTRIES);

    const handleTabChange = (tab: ForginTab) => {
        setActiveTab(tab);
        setSearchQuery('');
    };

    const handleAdd = () => {
        if (activeTab === 'INWARD') {
            setIsInwardModalOpen(true);
        } else {
            setIsOutwardModalOpen(true);
        }
    };

    const handleAddInwardSuccess = (entry: ForginInwardEntry) => {
        const newId = Math.max(...inwardEntries.map(e => e.id), 0) + 1;
        setInwardEntries([...inwardEntries, { id: newId, ...entry }]);
    };

    const handleAddOutwardSuccess = (entry: ForginOutwardEntry) => {
        const newId = Math.max(...outwardEntries.map(e => e.id), 0) + 1;
        setOutwardEntries([...outwardEntries, { id: newId, ...entry }]);
    };

    const filteredInwardEntries = inwardEntries.filter(entry =>
        entry.challanNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.partyName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredOutwardEntries = outwardEntries.filter(entry =>
        entry.challanNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.partyName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentEntries = activeTab === 'INWARD' ? filteredInwardEntries : filteredOutwardEntries;

    // Stats
    const stats = {
        totalOrders: 32,
        inProgress: 24,
        completed: 51,
        totalBilledAmount: 212456,
    };

    return (
        <div className="subcontracting-page">
            {/* Inward / Outward Tab Toggle */}
            <div style={{
                display: 'flex',
                width: '100%',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '24px',
                border: '1.5px solid #b4d5ef',
                background: '#fff',
            }}>
                <button
                    type="button"
                    onClick={() => handleTabChange('INWARD')}
                    style={{
                        flex: 1,
                        padding: '14px 0',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Jost', sans-serif",
                        fontSize: '16px',
                        fontWeight: activeTab === 'INWARD' ? 600 : 500,
                        color: activeTab === 'INWARD' ? '#fff' : '#17344D',
                        backgroundColor: activeTab === 'INWARD' ? '#5b9bd5' : '#fff',
                        transition: 'all 0.25s ease',
                        letterSpacing: '0.3px',
                    }}
                >
                    Inward
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('OUTWARD')}
                    style={{
                        flex: 1,
                        padding: '14px 0',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Jost', sans-serif",
                        fontSize: '16px',
                        fontWeight: activeTab === 'OUTWARD' ? 600 : 500,
                        color: activeTab === 'OUTWARD' ? '#fff' : '#17344D',
                        backgroundColor: activeTab === 'OUTWARD' ? '#5b9bd5' : '#fff',
                        transition: 'all 0.25s ease',
                        letterSpacing: '0.3px',
                    }}
                >
                    Outward
                </button>
            </div>

            {/* Page Header - Title + Add Entry */}
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Bhatti Subcontracting Management</h1>
                    <p className="page-subtitle">Track materials, processes, and billing for subcontracting work.</p>
                </div>
                <button type="button" className="add-button" onClick={handleAdd}>
                    <span className="add-icon">+</span>
                    <span className="add-text">Add Entry</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Orders</span>
                        <span className="stat-value">{stats.totalOrders}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">In Progress</span>
                        <span className="stat-value">{stats.inProgress}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Completed</span>
                        <span className="stat-value">{stats.completed}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Billed Amount</span>
                        <span className="stat-value">₹ {stats.totalBilledAmount.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            {/* Search, Download, Filter Row */}
            <div className="order-filters">
                <div className="order-search" style={{ flex: 3 }}>
                    <img src={SearchIcon} alt="Search" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            fontFamily: "'Jost', sans-serif",
                            fontSize: '14px',
                            color: '#17344d',
                            flex: 1,
                            width: '100%',
                        }}
                    />
                </div>
                <button
                    type="button"
                    className="action-button secondary-button"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => setIsDownloadOptionsOpen(true)}
                >
                    <span className="button-text">Download</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
                <button
                    type="button"
                    className="action-button secondary-button"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span className="button-text">Filter</span>
                </button>
            </div>

            {/* Data Table */}
            <div className="inventory-table-container" style={{ border: '1px solid rgba(125,153,169,0.3)', borderRadius: '12px' }}>
                <table className="inventory-table" style={{ minWidth: '600px' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'center' }}>Date</th>
                            <th style={{ textAlign: 'center' }}>Name</th>
                            <th style={{ textAlign: 'center' }}>Challan No.</th>
                            {activeTab === 'INWARD' ? (
                                <>
                                    <th style={{ textAlign: 'center' }}>Chol</th>
                                    <th style={{ textAlign: 'center' }}>Tayarmaal</th>
                                </>
                            ) : (
                                <th style={{ textAlign: 'center' }}>Wire</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {currentEntries.map((entry) => (
                            <tr key={entry.id}>
                                <td style={{ textAlign: 'center' }}>{entry.date}</td>
                                <td style={{ textAlign: 'center' }}>{entry.partyName}</td>
                                <td style={{ textAlign: 'center' }}>{entry.challanNo}</td>
                                {activeTab === 'INWARD' ? (
                                    <>
                                        <td style={{ textAlign: 'center' }}>–</td>
                                        <td style={{ textAlign: 'center' }}>{entry.price.toFixed(3)}</td>
                                    </>
                                ) : (
                                    <td style={{ textAlign: 'center' }}>{entry.weight}</td>
                                )}
                            </tr>
                        ))}
                        {currentEntries.length === 0 && (
                            <tr>
                                <td colSpan={activeTab === 'INWARD' ? 5 : 4} className="no-data">No entries found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {isInwardModalOpen && (
                <AddForginInwardModal
                    onClose={() => setIsInwardModalOpen(false)}
                    onSuccess={handleAddInwardSuccess}
                />
            )}

            {isOutwardModalOpen && (
                <AddForginOutwardModal
                    onClose={() => setIsOutwardModalOpen(false)}
                    onSuccess={handleAddOutwardSuccess}
                />
            )}

            {isDownloadOptionsOpen && (
                <ForginDownloadOptionsModal
                    onClose={() => setIsDownloadOptionsOpen(false)}
                    onNext={(partyName, startDate, endDate) => {
                        setReportOptions({ party: partyName, start: startDate, end: endDate });
                        setIsDownloadOptionsOpen(false);
                        setIsReportOpen(true);
                    }}
                />
            )}

            {isReportOpen && reportOptions && (
                <ForginReportModal
                    onClose={() => setIsReportOpen(false)}
                    partyName={reportOptions.party}
                    startDate={reportOptions.start}
                    endDate={reportOptions.end}
                    inwardData={inwardEntries.filter(e =>
                        e.partyName === reportOptions.party &&
                        e.date >= reportOptions.start &&
                        e.date <= reportOptions.end
                    )}
                    outwardData={outwardEntries.filter(e =>
                        e.partyName === reportOptions.party &&
                        e.date >= reportOptions.start &&
                        e.date <= reportOptions.end
                    )}
                />
            )}
        </div>
    );
};

export default ForginPage;
