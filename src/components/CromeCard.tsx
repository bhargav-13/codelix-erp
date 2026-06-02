import React, { useState } from 'react';
import { format } from 'date-fns';
import type { Crome, CromeReturnRequest } from '../types';
import { SubcontractingStatus } from '../types';
import { cromeApi } from '../api/crome';
import CromeReturnModal from './CromeReturnModal';
import DeleteIcon from '../assets/delete.svg';
import ReturnIcon from '../assets/return.svg';
import './SubcontractingCard.css'; // Reusing the same styles
import '../styles/StatusDropdown.css';
import './CromeCard.css';

interface CromeCardProps {
    crome: Crome;
    onDelete: (id: number) => void;
    onRefresh: () => void;
}

const CromeCard: React.FC<CromeCardProps> = ({ crome, onDelete, onRefresh }) => {
    const [status, setStatus] = useState(crome.status);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

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

    const handleStatusChange = async (newStatus: SubcontractingStatus) => {
        try {
            setIsUpdatingStatus(true);
            await cromeApi.updateCromeStatus(crome.cromeId, newStatus);
            setStatus(newStatus);
            onRefresh();
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this crome order?')) {
            try {
                setIsDeleting(true);
                await onDelete(crome.cromeId);
            } catch (error) {
                console.error('Error deleting:', error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleReturn = async (data: CromeReturnRequest) => {
        try {
            await cromeApi.returnCrome(crome.cromeId, data);
            setIsReturnModalOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error recording return:', error);
            throw error;
        }
    };



    return (
        <div className="subcontracting-card">
            <div className="card-header">
                <div className="card-header-left">
                    <div className="card-title-group">
                        <div className="card-title-row">
                            <h3 className="card-order-id">
                                CRM-{crome.cromeId}
                            </h3>
                            <span className="card-sub-id">
                                (Linked to PBI-{crome.subcontractingId})
                            </span>
                        </div>
                        <div className="card-info-row">
                            <span className="info-label">Party:</span>
                            <span className="info-value">{crome.partyName}</span>
                        </div>
                        <div className="card-info-row">
                            <span className="info-label">Contractor:</span>
                            <span className="info-value">{crome.contractorName}</span>
                        </div>
                    </div>

                    <div className="card-actions">
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
                    <span className="card-date">Crome Date : {formatDate(crome.cromeDate)}</span>
                    {crome.cromeReturn?.returnDate && (
                        <span className="card-date">Return Date : {formatDate(crome.cromeReturn.returnDate)}</span>
                    )}
                </div>
            </div>

            <div className="card-body">
                <div className="material-section">
                    <h4 className="section-title">{crome.itemName}</h4>
                    <p className="card-contractor" style={{ textAlign: 'center', marginTop: '-8px' }}>
                        Contractor: {crome.contractorName}
                    </p>

                    <div className="crome-details-container">
                        {/* SENT Details */}
                        <div className="crome-detail-block">
                            <div className="block-header">SENT DETAILS</div>
                            <div className="detail-row">
                                <span className="detail-label">Net Stock</span>
                                <span className="detail-value">{crome.sentStock.toFixed(3)} {crome.unit}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Packaging</span>
                                <div className="detail-value">
                                    {(crome.packagings || []).reduce((s, p) => s + (p.packagingWeight * p.packagingCount), 0).toFixed(3)} {crome.unit}
                                    <span className="detail-sub-value">
                                        ({(crome.packagings || []).map(p => `${p.packagingCount} x ${p.packagingWeight} ${p.packagingType}`).join(' + ')})
                                    </span>
                                </div>
                            </div>
                            <div className="detail-row total-row">
                                <span className="detail-label">Gross Weight</span>
                                <span className="detail-value">{crome.grossWeight.toFixed(3)} {crome.unit}</span>
                            </div>
                        </div>

                        {/* RETURN Details (if exists) */}
                        {crome.cromeReturn ? (
                            <div className="crome-detail-block return-block">
                                <div
                                    className="block-header clickable-header"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    title="Click to expand/collapse return details"
                                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span>RETURN DETAILS</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal', textTransform: 'uppercase' }}>
                                            {isExpanded ? 'Collapse' : 'Expand'}
                                        </span>
                                        <span style={{ fontSize: '10px', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <>
                                        <div className="detail-row">
                                            <span className="detail-label">Gross Return</span>
                                            <span className="detail-value">{crome.cromeReturn.returnStock.toFixed(3)} {crome.unit}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Packaging</span>
                                            <div className="detail-value">
                                                {(crome.cromeReturn.packagings || []).reduce((s, p) => s + (p.packagingWeight * p.packagingCount), 0).toFixed(3)} {crome.unit}
                                                <span className="detail-sub-value">
                                                    ({(crome.cromeReturn.packagings || []).map(p => `${p.packagingCount} x ${p.packagingWeight} ${p.packagingType}`).join(' + ')})
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="detail-row total-row">
                                    <span className="detail-label">Net Return</span>
                                    <span className="detail-value">{crome.cromeReturn.netReturnStock.toFixed(3)} {crome.unit}</span>
                                </div>
                                {crome.cromeReturn.rate != null && (
                                    <div className="detail-row">
                                        <span className="detail-label">Rate</span>
                                        <span className="detail-value">₹ {crome.cromeReturn.rate}/Kg</span>
                                    </div>
                                )}
                                {crome.cromeReturn.amount != null && (
                                    <div className="detail-row">
                                        <span className="detail-label">Amount</span>
                                        <span className="detail-value">₹ {crome.cromeReturn.amount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="diff-section">
                                    <span className="diff-label">DIFFERENCE</span>
                                    <span className={`diff-value ${(crome.cromeReturn.netReturnStock - crome.sentStock) < -0.001 ? 'negative' : (crome.cromeReturn.netReturnStock - crome.sentStock) > 0.001 ? 'positive' : 'neutral'}`}>
                                        {(crome.cromeReturn.netReturnStock - crome.sentStock) > 0 ? '+' : ''}
                                        {(crome.cromeReturn.netReturnStock - crome.sentStock).toFixed(3)} {crome.unit}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="crome-detail-block" style={{ justifyContent: 'center', alignItems: 'center', background: '#f8fafc', opacity: 0.6 }}>
                                <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Pending Return</span>
                            </div>
                        )}
                    </div>

                    <div className="processes-section">
                        <span className="processes-label">Status</span>

                        <div className="process-actions">
                            <select
                                value={status}
                                onChange={(e) => handleStatusChange(e.target.value as SubcontractingStatus)}
                                className={`status-select-modern ${getStatusClass(status)}`}
                                disabled={isUpdatingStatus}
                                title="Update crome status"
                            >
                                <option value={SubcontractingStatus.IN_PROCESS}>
                                    {isUpdatingStatus ? 'Updating...' : 'In Process'}
                                </option>
                                <option value={SubcontractingStatus.COMPLETED}>Completed</option>
                                <option value={SubcontractingStatus.REJECTED}>Rejected</option>
                            </select>

                            {!crome.cromeReturn && (
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

                    {crome.remark && (
                        <div className="remark-section">
                            <span className="remark-label">Remark:</span>
                            <p className="remark-text">{crome.remark}</p>
                        </div>
                    )}

                    {crome.cromeReturn?.returnRemark && (
                        <div className="remark-section">
                            <span className="remark-label">Return Remark:</span>
                            <p className="remark-text">{crome.cromeReturn.returnRemark}</p>
                        </div>
                    )}
                </div>
            </div>

            {isReturnModalOpen && (
                <CromeReturnModal
                    cromeId={crome.cromeId}
                    itemName={crome.itemName}
                    crome={crome}
                    onClose={() => setIsReturnModalOpen(false)}
                    onSubmit={handleReturn}
                />
            )}
        </div>
    );
};

export default CromeCard;
