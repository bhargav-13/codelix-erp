import React, { useState, useEffect } from 'react';
import { kevinScrapApi, type KevinScrap, type KevinScrapRequest, type JayeshScrapRequest } from '../api/scrap';
import ScrapEntryModal from '../components/ScrapEntryModal';
import Pagination from '../components/Pagination';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import './KevinScrapPage.css';

interface KevinScrapStats {
    totalEntries: number;
    totalNetWeight: number;
}

const KevinScrapPage: React.FC = () => {
    const [scraps, setScraps] = useState<KevinScrap[]>([]);
    const [stats, setStats] = useState<KevinScrapStats>({
        totalEntries: 0,
        totalNetWeight: 0,
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingScrap, setEditingScrap] = useState<KevinScrap | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isDownloadPopupOpen, setIsDownloadPopupOpen] = useState(false);
    const [downloadFromDate, setDownloadFromDate] = useState('');
    const [downloadToDate, setDownloadToDate] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [itemOptions, setItemOptions] = useState<string[]>([]);
    const [selectedItem, setSelectedItem] = useState<string>('');

    useEffect(() => {
        kevinScrapApi.getScrapItems()
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
            const response = await kevinScrapApi.getScrapList({
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
            console.error('Error fetching Kevin scraps:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: KevinScrap[]) => {
        const totalNetWeight = data.reduce((sum, s) => sum + (s.netWeight || 0), 0);

        setStats({
            totalEntries: data.length,
            totalNetWeight,
        });
    };

    const handleAddScrap = async (data: KevinScrapRequest | JayeshScrapRequest) => {
        try {
            // Type assertion since we know this is Kevin's page
            const kevinData = data as KevinScrapRequest;
            if (editingScrap) {
                await kevinScrapApi.updateScrap(editingScrap.scrapId, kevinData);
            } else {
                await kevinScrapApi.addScrap(kevinData);
            }
            setIsModalOpen(false);
            setEditingScrap(null);
            fetchScraps();
        } catch (error) {
            console.error('Error saving Kevin scrap:', error);
            throw error;
        }
    };

    const handleEditScrap = (scrap: KevinScrap) => {
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
                await kevinScrapApi.deleteScrap(id);
                fetchScraps();
            } catch (error) {
                console.error('Error deleting Kevin scrap:', error);
            }
        }
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            await kevinScrapApi.downloadPdf(
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

    return (
        <div className="kevin-scrap-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Kevin Scrap Management</h1>
                    <p className="page-subtitle">Track scrap materials and processing for Kevin.</p>
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
                                <th>Actions</th>
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
                    scrapType="kevin"
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
                    } : undefined}
                />
            )}

            {isDownloadPopupOpen && (
                <div className="modal-overlay" onClick={() => setIsDownloadPopupOpen(false)}>
                    <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Download Kevin Scrap PDF</h2>
                        <p className="download-hint-text">
                            Filter by date range — leave blank to download the full report.
                        </p>
                        <div className="modal-form">
                            <div className="form-group">
                                <label className="form-label" htmlFor="kevin-from-date">From Date <span className="optional-label">(optional)</span></label>
                                <input
                                    id="kevin-from-date"
                                    type="date"
                                    className="form-input"
                                    value={downloadFromDate}
                                    onChange={e => setDownloadFromDate(e.target.value)}
                                    title="From Date"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="kevin-to-date">To Date <span className="optional-label">(optional)</span></label>
                                <input
                                    id="kevin-to-date"
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
        </div>
    );
};

export default KevinScrapPage;
