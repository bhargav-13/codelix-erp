import React, { useState, useEffect } from 'react';
import { subcontractingApi } from '../api/subcontracting';
import type { SubcontractingBySubcontractInfo } from '../types';
import SubcontractViewModal from '../components/SubcontractViewModal';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import DownloadIcon from '../assets/download.svg';
import ViewIcon from '../assets/view.svg';
import './SubcontractPage.css';

const SubcontractPage: React.FC = () => {
  const [subcontractors, setSubcontractors] = useState<SubcontractingBySubcontractInfo[]>([]);
  const [filteredSubcontractors, setFilteredSubcontractors] = useState<SubcontractingBySubcontractInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'item'>('name');
  const [loading, setLoading] = useState(true);
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [downloadingContractor, setDownloadingContractor] = useState<string | null>(null);

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  useEffect(() => {
    filterSubcontractors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchBy, subcontractors]);

  const fetchSubcontractors = async () => {
    try {
      setLoading(true);
      const response = await subcontractingApi.getSubcontractingListBySubcontract();
      setSubcontractors(response);
      setFilteredSubcontractors(response);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSubcontractors = () => {
    if (!searchQuery) {
      setFilteredSubcontractors(subcontractors);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = subcontractors.filter((contractor) => {
      if (searchBy === 'name') {
        return contractor.contractorName.toLowerCase().includes(query);
      }
      return contractor.itemName.toLowerCase().includes(query);
    });
    setFilteredSubcontractors(filtered);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleView = (contractorName: string) => {
    setSelectedContractor(contractorName);
    setIsViewModalOpen(true);
  };

  const handleDownload = async (contractorName: string) => {
    try {
      setDownloadingContractor(contractorName);
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const blob = await subcontractingApi.getSubcontractByCustomerNamePdf(
        contractorName,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${contractorName}_subcontract_${formatDate(today.toISOString())}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setDownloadingContractor(null);
    }
  };

  return (
    <div className="subcontract-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Subcontractors</h1>
          <p className="page-subtitle">Manage Subcontractors Data</p>
        </div>
      </div>

      <div className="subcontract-filters">
        <div className="subcontract-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="subcontract-search-by">
          <select
            value={searchBy}
            onChange={(e) => setSearchBy(e.target.value as 'name' | 'item')}
            title="Search by"
          >
            <option value="name">Names</option>
            <option value="item">Items</option>
          </select>
        </div>
      </div>

      <div className="subcontract-table-container">
        {loading ? (
          <Loading message="Loading subcontractors..." size="large" />
        ) : filteredSubcontractors.length === 0 ? (
          <div className="no-data">No subcontractors found.</div>
        ) : (
          <table className="subcontract-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Last Update</th>
                <th>Item</th>
                <th>Download</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubcontractors.map((contractor, index) => (
                <tr key={`${contractor.contractorName}-${index}`}>
                  <td>{contractor.contractorName}</td>
                  <td>{formatDate(contractor.lastUpdatedAt)}</td>
                  <td>{contractor.itemName}</td>
                  <td>
                    <button
                      type="button"
                      className={`action-button download-button ${downloadingContractor === contractor.contractorName ? 'downloading' : ''}`}
                      onClick={() => handleDownload(contractor.contractorName)}
                      title="Download PDF"
                      disabled={downloadingContractor === contractor.contractorName}
                    >
                      {downloadingContractor === contractor.contractorName ? (
                        <>
                          <span className="download-spinner"></span>
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <img src={DownloadIcon} alt="Download" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="action-button view-button"
                      onClick={() => handleView(contractor.contractorName)}
                      title="View Details"
                    >
                      <img src={ViewIcon} alt="View" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isViewModalOpen && selectedContractor && (
        <SubcontractViewModal
          contractorName={selectedContractor}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedContractor(null);
          }}
        />
      )}
    </div>
  );
};

export default SubcontractPage;
