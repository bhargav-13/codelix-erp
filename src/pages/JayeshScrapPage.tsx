import React, { useState, useEffect } from 'react';
import { jayeshScrapApi, type JayeshScrap, type JayeshScrapRequest, type KevinScrapRequest } from '../api/scrap';
import ScrapEntryModal from '../components/ScrapEntryModal';
import WithdrawalHistoryModal from '../components/WithdrawalHistoryModal';
import Pagination from '../components/Pagination';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import ViewIcon from '../assets/view.svg';
import './JayeshScrapPage.css';

interface JayeshScrapStats {
    totalEntries: number;
    totalNetWeight: number;
    totalAmount: number;
}

const JayeshScrapPage: React.FC = () => {
    const [scraps, setScraps] = useState<JayeshScrap[]>([]);
    const [stats, setStats] = useState<JayeshScrapStats>({
        totalEntries: 0,
        totalNetWeight: 0,
        totalAmount: 0,
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingScrap, setEditingScrap] = useState<JayeshScrap | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isDownloadPopupOpen, setIsDownloadPopupOpen] = useState(false);
    const [downloadFromDate, setDownloadFromDate] = useState('');
    const [downloadToDate, setDownloadToDate] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawScrap, setWithdrawScrap] = useState<JayeshScrap | null>(null);
    const [withdrawAmountInput, setWithdrawAmountInput] = useState('');
    const [withdrawDateInput, setWithdrawDateInput] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [viewHistoryScrap, setViewHistoryScrap] = useState<JayeshScrap | null>(null);
    const [itemOptions, setItemOptions] = useState<string[]>([]);
    const [selectedItem, setSelectedItem] = useState<string>('');

    useEffect(() => {
        jayeshScrapApi.getScrapItems()
            .then(setItemOptions)
            .catch((err) => console.error('Failed to fetch scrap items:', err));
    }, []);

    useEffect(() => {
        fetchScraps();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, searchQuery, selectedItem]);

    const fetchScraps = async () => {
        try {
            setLoading(true);
            const response = await jayeshScrapApi.getScrapList({
                page,
                size: 10,
                search: selectedItem || searchQuery || undefined,
            });

            setScraps(response.data);
            setTotalPages(response.totalPages);
            setTotalElements(response.totalElements);

            // Calculate stats
            calculateStats(response.data);
        } catch (error) {
            console.error('Error fetching Jayesh scraps:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: JayeshScrap[]) => {
        const totalNetWeight = data.reduce((sum, s) => sum + (s.netWeight || 0), 0);
        const totalAmount = data.reduce((sum, s) => sum + (s.netWeight * s.rate || 0), 0);

        setStats({
            totalEntries: data.length,
            totalNetWeight,
            totalAmount,
        });
    };

    const handleAddScrap = async (data: KevinScrapRequest | JayeshScrapRequest) => {
        try {
            // Type guard to ensure we have JayeshScrapRequest
            const jayeshData = data as JayeshScrapRequest;
            if (editingScrap) {
                await jayeshScrapApi.updateScrap(editingScrap.scrapId, jayeshData);
            } else {
                await jayeshScrapApi.addScrap(jayeshData);
            }
            setIsModalOpen(false);
            setEditingScrap(null);
            fetchScraps();
        } catch (error) {
            console.error('Error saving Jayesh scrap:', error);
            throw error;
        }
    };

    const handleEditScrap = (scrap: JayeshScrap) => {
        setEditingScrap(scrap);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingScrap(null);
    };

    const handleDeleteScrap = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this scrap entry?')) {
            try {
                await jayeshScrapApi.deleteScrap(id);
                fetchScraps();
            } catch (error) {
                console.error('Error deleting Jayesh scrap:', error);
            }
        }
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            await jayeshScrapApi.downloadPdf(
                downloadFromDate || undefined,
                downloadToDate || undefined
            );
            setIsDownloadPopupOpen(false);
            setDownloadFromDate('');
            setDownloadToDate('');
        } catch (err: any) {
            alert(err?.message || 'Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleWithdrawOpen = (scrap: JayeshScrap) => {
        setWithdrawScrap(scrap);
        setWithdrawAmountInput('');
        setWithdrawDateInput(new Date().toISOString().split('T')[0]);
        setIsWithdrawModalOpen(true);
    };

    const handleWithdrawSubmit = async () => {
        if (!withdrawScrap) return;
        const amount = parseFloat(withdrawAmountInput);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid withdrawal amount.');
            return;
        }
        if (!withdrawDateInput) {
            alert('Please select a withdrawal date.');
            return;
        }
        const pending = withdrawScrap.pendingAmount ?? withdrawScrap.totalAmount ?? (withdrawScrap.netWeight * withdrawScrap.rate);
        if (amount > pending) {
            alert('Withdrawal amount cannot exceed pending amount.');
            return;
        }
        try {
            setIsWithdrawing(true);
            const updated = await jayeshScrapApi.withdrawScrap(withdrawScrap.scrapId, {
                withdrawAmount: amount,
                withdrawDate: withdrawDateInput,
            });
            setScraps(prev => prev.map(s => s.scrapId === updated.scrapId ? updated : s));
            setIsWithdrawModalOpen(false);
            setWithdrawScrap(null);
        } catch (error) {
            console.error('Error withdrawing scrap:', error);
            alert('Failed to process withdrawal.');
        } finally {
            setIsWithdrawing(false);
        }
    };

    return (
        <div className="jayesh-scrap-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Jayesh Scrap Management</h1>
                    <p className="page-subtitle">Track scrap materials and processing for Jayesh.</p>
                </div>

                <button type="button" className="add-button" onClick={() => setIsModalOpen(true)}>
                    <span className="add-icon">+</span>
                    <span className="add-text">Add Scrap Entry</span>
                </button>
            </div>

            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Entries</span>
                        <span className="stat-value">{totalElements}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Net Weight</span>
                        <span className="stat-value">{stats.totalNetWeight.toFixed(3)} kg</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Amount</span>
                        <span className="stat-value">₹ {stats.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            <div className="order-filters">
                <div className="order-search">
                    <img src={SearchIcon} alt="Search" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                    />
                </div>
                <select
                    className="item-filter-select"
                    value={selectedItem}
                    onChange={(e) => { setSelectedItem(e.target.value); setPage(0); }}
                    aria-label="Filter by item"
                    title="Filter by item"
                >
                    <option value="">All Items</option>
                    {itemOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                    ))}
                </select>
                <button
                    type="button"
                    className="order-status-filter"
                    onClick={() => setIsDownloadPopupOpen(true)}
                    title="Download PDF Report"
                >
                    <span>Download</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
            </div>

            <div className="scrap-table-container">
                {loading ? (
                    <Loading message="Loading scrap entries..." size="large" />
                ) : scraps.length === 0 ? (
                    <div className="no-data">No scrap entries found.</div>
                ) : (
                    <table className="scrap-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Challan No.</th>
                                <th>Name</th>
                                <th>Item</th>
                                <th>Bag</th>
                                <th>Weight</th>
                                <th>Out Weight</th>
                                <th>Net Weight</th>
                                <th>Rate</th>
                                <th>Amount</th>
                                <th>Withdrawn</th>
                                <th>Pending</th>
                                <th></th>
                                <th className="actions-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scraps.map((scrap) => (
                                <tr key={scrap.scrapId}>
                                    <td>{new Date(scrap.orderDate).toLocaleDateString('en-GB')}</td>
                                    <td>{scrap.challanNo}</td>
                                    <td>{scrap.contractor.name}</td>
                                    <td>{scrap.item}</td>
                                    <td>{scrap.elementValue}</td>
                                    <td>{scrap.totalWeight.toFixed(3)}kg</td>
                                    <td>{scrap.outWeight.toFixed(3)}kg</td>
                                    <td>{scrap.netWeight.toFixed(3)}kg</td>
                                    <td>₹{scrap.rate.toFixed(2)}</td>
                                    <td>₹{(scrap.totalAmount ?? scrap.netWeight * scrap.rate).toLocaleString('en-IN')}</td>
                                    <td>₹{((scrap.withdrawals ?? []).reduce((sum, w) => sum + w.withdrawAmount, 0)).toLocaleString('en-IN')}</td>
                                    <td>
                                        <span className={`pending-amount ${(scrap.pendingAmount ?? scrap.totalAmount ?? (scrap.netWeight * scrap.rate)) > 0 ? 'has-pending' : 'no-pending'}`}>
                                            ₹{(scrap.pendingAmount ?? scrap.totalAmount ?? (scrap.netWeight * scrap.rate)).toLocaleString('en-IN')}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                type="button"
                                                className="view-history-btn"
                                                onClick={() => setViewHistoryScrap(scrap)}
                                                title="View Details"
                                            >
                                                <img src={ViewIcon} alt="View" className="icon-img" />
                                            </button>
                                            <button
                                                type="button"
                                                className="withdraw-button"
                                                onClick={() => handleWithdrawOpen(scrap)}
                                                title="Withdraw"
                                                disabled={(scrap.pendingAmount ?? scrap.totalAmount ?? (scrap.netWeight * scrap.rate)) <= 0}
                                            >
                                                Withdraw
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                type="button"
                                                className="icon-button"
                                                onClick={() => handleEditScrap(scrap)}
                                                title="Edit"
                                            >
                                                <img src={EditIcon} alt="Edit" className="icon-img" />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-button"
                                                onClick={() => handleDeleteScrap(scrap.scrapId)}
                                                title="Delete"
                                            >
                                                <img src={DeleteIcon} alt="Delete" className="icon-img" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalElements={totalElements}
                size={10}
            />

            {isModalOpen && (
                <ScrapEntryModal
                    onClose={handleModalClose}
                    onSubmit={handleAddScrap}
                    scrapType="jayesh"
                    initialData={editingScrap ? {
                        scrapContractorId: editingScrap.contractor.scrapContractorId,
                        challanNo: editingScrap.challanNo,
                        orderDate: editingScrap.orderDate,
                        item: editingScrap.item,
                        elementValue: editingScrap.elementValue,
                        elementType: editingScrap.elementType,
                        totalWeight: editingScrap.totalWeight,
                        outWeight: editingScrap.outWeight,
                        netWeight: editingScrap.netWeight,
                        rate: editingScrap.rate,
                    } : undefined}
                />
            )}

            {isDownloadPopupOpen && (
                <div className="modal-overlay" onClick={() => setIsDownloadPopupOpen(false)}>
                    <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Download Jayesh Scrap PDF</h2>
                        <p className="download-hint-text">
                            Filter by date range — leave blank to download the full report.
                        </p>
                        <div className="modal-form">
                            <div className="form-group">
                                <label className="form-label" htmlFor="jayesh-from-date">From Date <span className="optional-label">(optional)</span></label>
                                <input
                                    id="jayesh-from-date"
                                    type="date"
                                    className="form-input"
                                    value={downloadFromDate}
                                    onChange={e => setDownloadFromDate(e.target.value)}
                                    title="From Date"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="jayesh-to-date">To Date <span className="optional-label">(optional)</span></label>
                                <input
                                    id="jayesh-to-date"
                                    type="date"
                                    className="form-input"
                                    value={downloadToDate}
                                    onChange={e => setDownloadToDate(e.target.value)}
                                    title="To Date"
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
            {isWithdrawModalOpen && withdrawScrap && (
                <div className="modal-overlay" onClick={() => setIsWithdrawModalOpen(false)}>
                    <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Withdraw Amount</h2>
                        <div className="withdraw-info">
                            <div className="withdraw-info-row">
                                <span className="withdraw-info-label">Challan No.</span>
                                <span className="withdraw-info-value">{withdrawScrap.challanNo}</span>
                            </div>
                            <div className="withdraw-info-row">
                                <span className="withdraw-info-label">Total Amount</span>
                                <span className="withdraw-info-value">₹{(withdrawScrap.totalAmount ?? withdrawScrap.netWeight * withdrawScrap.rate).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="withdraw-info-row">
                                <span className="withdraw-info-label">Already Withdrawn</span>
                                <span className="withdraw-info-value">₹{((withdrawScrap.withdrawals ?? []).reduce((sum, w) => sum + w.withdrawAmount, 0)).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="withdraw-info-row">
                                <span className="withdraw-info-label">Pending Amount</span>
                                <span className="withdraw-info-value pending-highlight">₹{(withdrawScrap.pendingAmount ?? withdrawScrap.totalAmount ?? (withdrawScrap.netWeight * withdrawScrap.rate)).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                        <div className="modal-form">
                            <div className="form-group">
                                <label className="form-label">Withdrawal Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={withdrawDateInput}
                                    onChange={(e) => setWithdrawDateInput(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Withdrawal Amount</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="Enter amount to withdraw"
                                    value={withdrawAmountInput}
                                    onChange={(e) => setWithdrawAmountInput(e.target.value)}
                                    min="0"
                                    max={withdrawScrap.pendingAmount ?? withdrawScrap.totalAmount ?? (withdrawScrap.netWeight * withdrawScrap.rate)}
                                    step="0.01"
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="save-button"
                                    onClick={handleWithdrawSubmit}
                                    disabled={isWithdrawing}
                                >
                                    {isWithdrawing ? 'Processing...' : 'Withdraw'}
                                </button>
                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() => setIsWithdrawModalOpen(false)}
                                    disabled={isWithdrawing}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {viewHistoryScrap && (
                <WithdrawalHistoryModal
                    scrap={viewHistoryScrap}
                    onClose={() => setViewHistoryScrap(null)}
                />
            )}
        </div>
    );
};

export default JayeshScrapPage;
