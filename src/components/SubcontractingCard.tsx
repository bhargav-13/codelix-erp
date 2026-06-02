import React, { useState } from 'react';
import { format } from 'date-fns';
import type { Subcontracting, SubReturnRequest, SubOrderRequest } from '../types';
import { SubcontractingStatus } from '../types';
import { subcontractingApi } from '../api/subcontracting';
import ReturnRecordModal from './ReturnRecordModal';
import AddSubcontractingModal from './AddSubcontractingModal';
import CromeModal from './CromeModal';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import ReturnIcon from '../assets/return.svg';
import './SubcontractingCard.css';
import '../styles/StatusDropdown.css';

interface SubcontractingCardProps {
  subcontract: Subcontracting;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

const SubcontractingCard: React.FC<SubcontractingCardProps> = ({ subcontract, onDelete, onRefresh }) => {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cromeReturnId, setCromeReturnId] = useState<number | null>(null);
  const [status, setStatus] = useState(subcontract.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate Sent, Return, and Used values
  const subReturns = subcontract.subReturns || [];

  // Calculate Total Net Return
  // Use backend totalNetReturnStock OR sum of netReturnStock from items OR calculate
  const totalNetReturn = subcontract.totalNetReturnStock ?? subReturns.reduce((sum, r) => {
    if (r.netReturnStock != null) return sum + r.netReturnStock;
    const deduction = (r.packagings || []).reduce((d, p) => d + (p.packagingWeight || 0) * (p.packagingCount || 0), 0);
    return sum + (r.returnStock - deduction);
  }, 0);

  // Round to 3 decimal places
  const totalNetReturnRounded = Math.round(totalNetReturn * 1000) / 1000;

  // Used Stock = Sent - Total Net Return
  // User requested to force frontend calculation to ensure match with displayed Net Return
  const usedStock = Math.round((subcontract.sentStock - totalNetReturnRounded) * 1000) / 1000;

  const totalAmount = subcontract.totalAmount || 0;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd-MM-yyyy');
  };

  const getStatusClass = (status: SubcontractingStatus) => {
    switch (status) {
      case SubcontractingStatus.COMPLETED:
        return 'status-completed';
      case SubcontractingStatus.IN_PROCESS:
        return 'status-in-process';
      case SubcontractingStatus.REJECTED:
        return 'status-rejected';
      default:
        return '';
    }
  };


  const handleReturnRecord = async (data: SubReturnRequest) => {
    try {
      await subcontractingApi.returnSubcontracting(subcontract.subcontractingId, data);
      setIsReturnModalOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error returning record:', error);
      throw error;
    }
  };

  const handleStatusChange = async (newStatus: SubcontractingStatus) => {
    try {
      setIsUpdatingStatus(true);
      await subcontractingApi.updateSubcontractingStatus(subcontract.subcontractingId, newStatus);
      setStatus(newStatus);
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this subcontracting order?')) {
      try {
        setIsDeleting(true);
        await onDelete(subcontract.subcontractingId);
      } catch (error) {
        console.error('Error deleting:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEdit = async (data: SubOrderRequest) => {
    try {
      await subcontractingApi.updateSubcontracting(subcontract.subcontractingId, data);
      setIsEditModalOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating subcontract:', error);
      throw error;
    }
  };

  // Prepare initial data for edit modal
  const initialEditData: SubOrderRequest = {
    contractorId: subcontract.contractor.contractorId,
    itemId: subcontract.item.subItemId,
    orderDate: subcontract.orderDate,
    sentStock: subcontract.sentStock,
    jobWorkPay: subcontract.jobWorkPay,
    price: subcontract.price,
    unit: subcontract.unit,
    remark: subcontract.remark || '',
  };

  return (
    <div className="subcontracting-card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-title-group">
            <h3 className="card-order-id">
              PBI-{subcontract.subcontractingId} ({new Date(subcontract.orderDate).getFullYear()})
            </h3>
            <p className="card-contractor">{subcontract.contractor.name}</p>
          </div>

          <div className="card-actions">
            <button
              type="button"
              className="icon-button edit-button"
              onClick={() => setIsEditModalOpen(true)}
              title="Edit"
            >
              <img src={EditIcon} alt="Edit" className="icon-img" />
            </button>
            <button
              type="button"
              className="icon-button delete-button"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete"
            >
              {isDeleting ? (
                <span className="loading-icon"></span>
              ) : (
                <img src={DeleteIcon} alt="Delete" className="icon-img" />
              )}
            </button>
          </div>
        </div>

        <div className="card-dates">
          <span className="card-date">Order Date : {formatDate(subcontract.orderDate)}</span>
          {subReturns.length > 0 && (
            <span className="card-date">Last Return : {formatDate(subReturns[subReturns.length - 1].returnDate)}</span>
          )}
        </div>
      </div>

      <div className="card-body">
        <div className="material-section">
          <h4 className="section-title">{subcontract.item.name}</h4>

          <div className="crome-details-container">
            {/* SENT Details */}
            <div className="crome-detail-block">
              <div className="block-header">SENT DETAILS</div>
              <div className="detail-row">
                <span className="detail-label">Sent Stock</span>
                <span className="detail-value">{subcontract.sentStock.toFixed(3)} {subcontract.unit}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Total Pieces</span>
                <span className="detail-value">{(subcontract.sentStock * 25).toLocaleString('en-IN')} Pc</span>
              </div>
              <div className="detail-row total-row total-value-row">
                <span className="detail-label">Total Value</span>
                <div className="detail-value">
                  ₹{totalAmount.toLocaleString('en-IN')}
                  <span className="detail-sub-value">
                    (₹{subcontract.price}/unit + ₹{subcontract.jobWorkPay}/job)
                  </span>
                </div>
              </div>
            </div>

            {/* RETURN Details (List) */}
            {subReturns.length > 0 ? (
              <div className="crome-detail-block return-block">
                <div
                  className="block-header clickable-header"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title="Click to expand/collapse return details"
                >
                  <span>RETURN DETAILS ({subReturns.length})</span>
                  <div className="expand-toggle">
                    <span className="expand-label">
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </span>
                    <span className={`expand-chevron ${isExpanded ? 'expanded' : ''}`}>▼</span>
                  </div>
                </div>

                {isExpanded && subReturns.map((ret, index) => {
                  const retDeduction = (ret.packagings || []).reduce((d, p) => d + (p.packagingWeight || 0) * (p.packagingCount || 0), 0);
                  const retNet = ret.netReturnStock ?? (ret.returnStock - retDeduction);
                  const pkgDisplay = (ret.packagings || []).map(p => `${p.packagingCount} ${p.packagingType}`).join(', ') || '-';
                  return (
                    <div key={index} className={`return-item-summary ${index < subReturns.length - 1 ? 'with-divider' : ''}`}>
                      <div className="detail-row return-date-row">
                        <span className="detail-label return-date-label">{formatDate(ret.returnDate)}</span>
                        <span className="detail-value">{ret.returnStock.toFixed(3)} {subcontract.unit} (Gr)</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Pkg: {pkgDisplay}</span>
                        <span className="detail-value">Net: {retNet.toFixed(3)}</span>
                      </div>
                      <div className="return-crome-action">
                        <button
                          type="button"
                          className="crome-button return-crome-btn"
                          onClick={() => setCromeReturnId(ret.returnId!)}
                          title="Send to Crome"
                        >
                          <span>Send to Crome</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="detail-row total-row">
                  <span className="detail-label">Total Net Return</span>
                  <span className="detail-value">{totalNetReturnRounded.toFixed(3)} {subcontract.unit}</span>
                </div>
                <div className="diff-section">
                  <span className="diff-label">USED STOCK</span>
                  <span className="diff-value neutral">
                    {usedStock.toFixed(3)} {subcontract.unit}
                  </span>
                </div>
              </div>
            ) : (
              <div className="crome-detail-block pending-block">
                <span className="pending-text">Pending Return</span>
              </div>
            )}
          </div>

          <div className="processes-section">
            <span className="processes-label">Processes</span>

            <div className="process-actions">
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as SubcontractingStatus)}
                className={`status-select-modern ${getStatusClass(status)}`}
                disabled={isUpdatingStatus}
                title="Update order status"
              >
                <option value={SubcontractingStatus.IN_PROCESS}>
                  {isUpdatingStatus ? 'Updating...' : 'In Process'}
                </option>
                <option value={SubcontractingStatus.COMPLETED}>Completed</option>
                <option value={SubcontractingStatus.REJECTED}>Rejected</option>
              </select>

              {subcontract.status === SubcontractingStatus.IN_PROCESS && (
                <button
                  type="button"
                  className="return-record-button"
                  onClick={() => setIsReturnModalOpen(true)}
                >
                  <img src={ReturnIcon} alt="Return" className="return-icon" />
                  <span>Return Record</span>
                </button>
              )}

            </div>
          </div>

          {subcontract.remark && (
            <div className="remark-section">
              <span className="remark-label">Remark:</span>
              <p className="remark-text">{subcontract.remark}</p>
            </div>
          )}
        </div>
      </div>

      {isReturnModalOpen && (
        <ReturnRecordModal
          subcontract={subcontract}
          onClose={() => setIsReturnModalOpen(false)}
          onSubmit={handleReturnRecord}
        />
      )}

      {isEditModalOpen && (
        <AddSubcontractingModal
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEdit}
          initialData={initialEditData}
        />
      )}

      {cromeReturnId !== null && (
        <CromeModal
          subcontractingId={subcontract.subcontractingId}
          subcontractingReturnId={cromeReturnId}
          onClose={() => setCromeReturnId(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};

export default SubcontractingCard;
