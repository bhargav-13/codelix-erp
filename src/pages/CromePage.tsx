import React, { useState, useEffect } from 'react';
import { cromeApi } from '../api/crome';
import type { Crome } from '../types';
import { SubcontractingStatus } from '../types';
import CromeCard from '../components/CromeCard';
import Pagination from '../components/Pagination';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import DownloadIcon from '../assets/download.svg';
import CromeReportModal from '../components/CromeReportModal';
import './SubcontractingPage.css'; // Reusing the same styles

const CromePage: React.FC = () => {
    const [cromes, setCromes] = useState<Crome[]>([]);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [stats, setStats] = useState({
        totalCromes: 0,
        inProgress: 0,
        completed: 0,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<SubcontractingStatus | ''>('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    useEffect(() => {
        fetchCromes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, searchQuery, statusFilter]);

    const fetchCromes = async () => {
        try {
            setLoading(true);
            const response = await cromeApi.getCromeList({
                page,
                size: 10,
                search: searchQuery || undefined,
                status: statusFilter || undefined,
            });

            setCromes(response.data);
            setTotalPages(response.totalPages);
            setTotalElements(response.totalElements);
            calculateStats(response.data);
        } catch (error) {
            console.error('Error fetching cromes:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: Crome[]) => {
        const inProgress = data.filter((c) => c.status === SubcontractingStatus.IN_PROCESS).length;
        const completed = data.filter((c) => c.status === SubcontractingStatus.COMPLETED).length;

        setStats({
            totalCromes: data.length,
            inProgress,
            completed,
        });
    };

    const handleDeleteCrome = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this crome order?')) {
            try {
                await cromeApi.deleteCrome(id);
                fetchCromes();
            } catch (error) {
                console.error('Error deleting crome:', error);
            }
        }
    };

    return (
        <div className="subcontracting-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Crome Management</h1>
                    <p className="page-subtitle">Track crome orders sent to parties for further processing.</p>
                </div>
                <div className="page-actions">
                    <button
                        className="report-btn"
                        onClick={() => setIsReportModalOpen(true)}
                    >
                        <img src={DownloadIcon} alt="Download" style={{ width: '16px', height: '16px' }} />
                        Download Report
                    </button>
                </div>
            </div>

            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Cromes</span>
                        <span className="stat-value">{stats.totalCromes}</span>
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
            </div>

            <div className="order-filters">
                <div className="order-search">
                    <img src={SearchIcon} alt="Search" />
                    <input
                        type="text"
                        placeholder="Search by party, contractor or item"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="order-status-filter">
                    <img src={FilterIcon} alt="Filter" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as SubcontractingStatus | '')}
                        title="Filter by status"
                    >
                        <option value="">All Status</option>
                        <option value={SubcontractingStatus.IN_PROCESS}>In Progress</option>
                        <option value={SubcontractingStatus.COMPLETED}>Completed</option>
                        <option value={SubcontractingStatus.REJECTED}>Rejected</option>
                    </select>
                </div>
            </div>

            <div className="subcontracts-list">
                {loading ? (
                    <Loading message="Loading crome orders..." size="large" />
                ) : cromes.length === 0 ? (
                    <div className="no-data">No crome orders found.</div>
                ) : (
                    cromes.map((crome) => (
                        <CromeCard
                            key={crome.cromeId}
                            crome={crome}
                            onDelete={handleDeleteCrome}
                            onRefresh={fetchCromes}
                        />
                    ))
                )}
            </div>

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalElements={totalElements}
                size={10}
            />

            {isReportModalOpen && (
                <CromeReportModal onClose={() => setIsReportModalOpen(false)} />
            )}
        </div>
    );
};

export default CromePage;
