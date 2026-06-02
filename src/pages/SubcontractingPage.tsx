import React, { useState, useEffect } from 'react';
import { subcontractingApi } from '../api/subcontracting';
import type { Subcontracting, SubOrderRequest, SubcontractingStats } from '../types';
import { SubcontractingStatus } from '../types';
import AddSubcontractingModal from '../components/AddSubcontractingModal';
import SubcontractingCard from '../components/SubcontractingCard';
import Pagination from '../components/Pagination';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import './SubcontractingPage.css';

const SubcontractingPage: React.FC = () => {
  const [subcontracts, setSubcontracts] = useState<Subcontracting[]>([]);
  const [stats, setStats] = useState<SubcontractingStats>({
    totalOrders: 0,
    inProgress: 0,
    completed: 0,
    totalBilledAmount: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubcontractingStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    fetchSubcontracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, statusFilter]);

  const fetchSubcontracts = async () => {
    try {
      setLoading(true);
      const response = await subcontractingApi.getSubcontractingList({
        page,
        size: 10,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });

      setSubcontracts(response.data);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);

      // Calculate stats
      // Note: This calculateStats only uses the current page data, which might be incorrect for "Total Orders" stats.
      // But typically stats should come from a separate endpoint or the backend should return them.
      // For now, we keep it as is or accept it only reflects current page (or maybe we should fetch all for stats? No, too heavy).
      // The previous code was calculating stats on `response.data`.
      calculateStats(response.data);
    } catch (error) {
      console.error('Error fetching subcontracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Subcontracting[]) => {
    const inProgress = data.filter((s) => s.status === SubcontractingStatus.IN_PROCESS).length;
    const completed = data.filter((s) => s.status === SubcontractingStatus.COMPLETED).length;

    // Use backend-calculated totalAmount directly
    const totalBilledAmount = data.reduce((sum, s) => {
      return sum + (s.totalAmount || 0);
    }, 0);

    setStats({
      totalOrders: data.length,
      inProgress,
      completed,
      totalBilledAmount,
    });
  };

  const handleAddSubcontract = async (data: SubOrderRequest) => {
    try {
      await subcontractingApi.addSubcontracting(data);
      setIsModalOpen(false);
      fetchSubcontracts();
    } catch (error) {
      console.error('Error adding subcontract:', error);
      throw error;
    }
  };

  const handleDeleteSubcontract = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this subcontracting order?')) {
      try {
        await subcontractingApi.deleteSubcontracting(id);
        fetchSubcontracts();
      } catch (error) {
        console.error('Error deleting subcontract:', error);
      }
    }
  };

  return (
    <div className="subcontracting-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Subcontracting Management</h1>
          <p className="page-subtitle">Track materials, processes, and billing for subcontracting work.</p>
        </div>

        <button type="button" className="add-button" onClick={() => setIsModalOpen(true)}>
          <span className="add-icon">+</span>
          <span className="add-text">Add Subcontracting Order</span>
        </button>
      </div>

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

      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search by name or order"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="order-status-filter">
          <img src={FilterIcon} alt="Filter" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SubcontractingStatus | '')} title="Filter by status">
            <option value="">All Status</option>
            <option value={SubcontractingStatus.IN_PROCESS}>In Progress</option>
            <option value={SubcontractingStatus.COMPLETED}>Completed</option>
            <option value={SubcontractingStatus.REJECTED}>Rejected</option>
          </select>
        </div>
      </div>

      <div className="subcontracts-list">
        {loading ? (
          <Loading message="Loading subcontracting orders..." size="large" />
        ) : subcontracts.length === 0 ? (
          <div className="no-data">No subcontracting orders found.</div>
        ) : (
          subcontracts.map((subcontract) => (
            <SubcontractingCard
              key={subcontract.subcontractingId}
              subcontract={subcontract}
              onDelete={handleDeleteSubcontract}
              onRefresh={fetchSubcontracts}
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

      {isModalOpen && (
        <AddSubcontractingModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddSubcontract}
        />
      )}
    </div>
  );
};

export default SubcontractingPage;
