import React, { useState, useEffect } from 'react';
import { rejectionApi } from '../api/rejection';
import { purchasePartyApi } from '../api/purchaseParty';
import type { RejectionResponse, RejectionReturnType, PurchaseParty } from '../types';
import { RejectionReturnType as ReturnTypeEnum } from '../types';
import AddRejectionModal from '../components/AddRejectionModal';
import Pagination from '../components/Pagination';
import Loading from '../components/Loading';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import './RejectionPage.css';

const RejectionPage: React.FC = () => {
  const [rejections, setRejections] = useState<RejectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filterReturnType, setFilterReturnType] = useState<RejectionReturnType | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRejection, setEditingRejection] = useState<RejectionResponse | null>(null);

  // PDF export popup state
  const [isPdfPopupOpen, setIsPdfPopupOpen] = useState(false);
  const [pdfPartyId, setPdfPartyId] = useState<number | ''>('');
  const [pdfFromDate, setPdfFromDate] = useState('');
  const [pdfToDate, setPdfToDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const [parties, setParties] = useState<PurchaseParty[]>([]);

  useEffect(() => {
    purchasePartyApi.getAll().then(setParties).catch(() => {});
  }, []);

  useEffect(() => {
    fetchRejections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterReturnType]);

  const fetchRejections = async () => {
    try {
      setLoading(true);
      const res = await rejectionApi.getRejections(
        page,
        10,
        filterReturnType || undefined
      );
      setRejections(res.data);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (err) {
      console.error('Failed to fetch rejections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: any) => {
    if (editingRejection) {
      await rejectionApi.updateRejection(editingRejection.rejectionId, data);
    } else {
      await rejectionApi.createRejection(data);
    }
    setIsModalOpen(false);
    setEditingRejection(null);
    fetchRejections();
  };

  const handleEdit = (r: RejectionResponse) => {
    setEditingRejection(r);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this rejection entry?')) return;
    try {
      await rejectionApi.deleteRejection(id);
      fetchRejections();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRejection(null);
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await rejectionApi.exportPdf({
        partyId: pdfPartyId ? Number(pdfPartyId) : undefined,
        fromDate: pdfFromDate || undefined,
        toDate: pdfToDate || undefined,
      });
      setIsPdfPopupOpen(false);
      setPdfPartyId('');
      setPdfFromDate('');
      setPdfToDate('');
    } catch (err: any) {
      alert(err?.message || 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB');
  };

  return (
    <div className="rejection-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Rejection</h1>
          <p className="page-subtitle">Manage rejected item return entries.</p>
        </div>
        <button type="button" className="add-button" onClick={() => setIsModalOpen(true)}>
          <span className="add-icon">+</span>
          <span className="add-text">Add Entry</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rejection-filters">
        <div className="rejection-filter-group">
          <label className="rejection-filter-label" htmlFor="rejection-type-filter">Return Type</label>
          <select
            id="rejection-type-filter"
            className="rejection-filter-select"
            value={filterReturnType}
            onChange={e => { setFilterReturnType(e.target.value as RejectionReturnType | ''); setPage(0); }}
            title="Filter by return type"
          >
            <option value="">All Types</option>
            <option value={ReturnTypeEnum.CASH}>Cash</option>
            <option value={ReturnTypeEnum.MAAL}>Maal</option>
          </select>
        </div>

        <button
          type="button"
          className="rejection-export-btn"
          onClick={() => setIsPdfPopupOpen(true)}
          title="Export PDF"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PDF
        </button>
      </div>

      {/* Table */}
      <div className="rejection-table-container">
        {loading ? (
          <Loading message="Loading rejection entries…" size="large" />
        ) : rejections.length === 0 ? (
          <div className="no-data">No rejection entries found.</div>
        ) : (
          <table className="rejection-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Party</th>
                <th>Weight (kg)</th>
                <th>Return Type</th>
                <th>Amount / Stock Item</th>
                <th>Return Qty</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rejections.map((r, idx) => (
                <tr key={r.rejectionId}>
                  <td>{page * 10 + idx + 1}</td>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.party?.name ?? '—'}</td>
                  <td>{r.weight.toFixed(3)}</td>
                  <td>
                    <span className={`return-type-badge ${r.returnType === ReturnTypeEnum.CASH ? 'cash' : 'maal'}`}>
                      {r.returnType === ReturnTypeEnum.CASH ? 'Cash' : 'Maal'}
                    </span>
                  </td>
                  <td>
                    {r.returnType === ReturnTypeEnum.CASH
                      ? `₹ ${(r.amount ?? 0).toLocaleString('en-IN')}`
                      : r.stockItem?.product?.productName ?? '—'}
                  </td>
                  <td>
                    {r.returnType === ReturnTypeEnum.MAAL && r.returnQty != null
                      ? `${r.returnQty.toFixed(3)} kg`
                      : '—'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleEdit(r)}
                        title="Edit"
                      >
                        <img src={EditIcon} alt="Edit" className="icon-img" />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDelete(r.rejectionId)}
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <AddRejectionModal
          onClose={handleModalClose}
          onSubmit={handleAdd}
          initialData={editingRejection}
        />
      )}

      {/* Export PDF Popup */}
      {isPdfPopupOpen && (
        <div className="modal-overlay" onClick={() => setIsPdfPopupOpen(false)}>
          <div className="modal-content small-modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Export Rejection PDF</h2>
            <p className="download-hint-text">
              All filters are optional — leave blank for a full report.
            </p>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="pdf-party">
                  Party <span className="optional-label">(optional)</span>
                </label>
                <select
                  id="pdf-party"
                  className="form-input"
                  value={pdfPartyId}
                  onChange={e => setPdfPartyId(e.target.value ? Number(e.target.value) : '')}
                  title="Filter by party"
                >
                  <option value="">All Parties</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pdf-from-date">
                  From Date <span className="optional-label">(optional)</span>
                </label>
                <input
                  id="pdf-from-date"
                  type="date"
                  className="form-input"
                  value={pdfFromDate}
                  onChange={e => setPdfFromDate(e.target.value)}
                  title="From Date"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pdf-to-date">
                  To Date <span className="optional-label">(optional)</span>
                </label>
                <input
                  id="pdf-to-date"
                  type="date"
                  className="form-input"
                  value={pdfToDate}
                  onChange={e => setPdfToDate(e.target.value)}
                  title="To Date"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="save-button"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting…' : 'Export PDF'}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setIsPdfPopupOpen(false)}
                  disabled={isExporting}
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

export default RejectionPage;
