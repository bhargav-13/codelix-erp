import React, { useState, useEffect } from 'react';
import type { Party, CromeRequest, SubcontractingCromeInfo, SubReturnCromeInfo, PackagingDetail } from '../types';
import { PackagingType } from '../types';
import { cromeApi } from '../api/crome';
import './AddSubcontractingModal.css';
import './CromeModal.css';

// Packaging weights in KG
const PACKAGING_WEIGHTS_KG: Record<PackagingType, number | null> = {
  [PackagingType.BAG]: 0.075,
  [PackagingType.FOAM]: 0.150,
  [PackagingType.PETI]: 1.200,
  [PackagingType.DRUM]: null,
};

interface PackagingFormRow {
  packagingType: PackagingType;
  packagingWeight: string; // KG
  packagingCount: string;
}

interface CromeModalProps {
  subcontractingId: number;
  subcontractingReturnId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const createDefaultPackaging = (): PackagingFormRow => ({
  packagingType: PackagingType.PETI,
  packagingWeight: '1.2',
  packagingCount: '',
});

const CromeModal: React.FC<CromeModalProps> = ({ subcontractingId, subcontractingReturnId, onClose, onSuccess }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [cromeInfo, setCromeInfo] = useState<SubcontractingCromeInfo | null>(null);
  const [returnCromeInfo, setReturnCromeInfo] = useState<SubReturnCromeInfo | null>(null);
  const [formData, setFormData] = useState<{
    partyId: string;
    cromeDate: string;
    sentStock: string;
    packagings: PackagingFormRow[];
    cromeAmount: string;
    remark: string;
  }>({
    partyId: '',
    cromeDate: new Date().toISOString().split('T')[0],
    sentStock: '',
    packagings: [createDefaultPackaging()],
    cromeAmount: '',
    remark: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddParty, setShowAddParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [addingParty, setAddingParty] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [partiesData, infoData, returnInfo] = await Promise.all([
          cromeApi.getPartyList(),
          cromeApi.getSubcontractingCromeInfo(subcontractingId),
          cromeApi.getSubReturnCromeInfo(subcontractingReturnId),
        ]);
        setParties(partiesData);
        setCromeInfo(infoData);
        setReturnCromeInfo(returnInfo);

        setFormData(prev => ({
          ...prev,
          sentStock: (returnInfo.availableStockForCrome || 0).toString(),
          ...(infoData.returnPackagingType ? {
            packagings: [{
              packagingType: infoData.returnPackagingType,
              packagingWeight: infoData.returnPackagingWeight?.toString() || '',
              packagingCount: infoData.returnPackagingCount?.toString() || '',
            }],
          } : {}),
        }));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [subcontractingId, subcontractingReturnId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  // Packaging row handlers
  const handlePackagingChange = (index: number, field: keyof PackagingFormRow, value: string) => {
    const updated = [...formData.packagings];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, packagings: updated }));
  };

  const handlePackagingTypeChange = (index: number, value: PackagingType) => {
    const updated = [...formData.packagings];
    const weight = PACKAGING_WEIGHTS_KG[value];
    updated[index] = {
      ...updated[index],
      packagingType: value,
      packagingWeight: weight !== null ? weight.toString() : updated[index].packagingWeight,
    };
    setFormData(prev => ({ ...prev, packagings: updated }));
  };

  const addPackagingRow = () => {
    setFormData(prev => ({
      ...prev,
      packagings: [...prev.packagings, createDefaultPackaging()],
    }));
  };

  const removePackagingRow = (index: number) => {
    if (formData.packagings.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      packagings: prev.packagings.filter((_, i) => i !== index),
    }));
  };

  const validateField = (name: string, value: any): string | null => {
    switch (name) {
      case 'partyId': return !value ? 'Select a party' : null;
      case 'cromeDate': return !value ? 'Date is required' : null;
      case 'sentStock':
        if (!value || parseFloat(value) <= 0) return 'Sent stock required';
        if (returnCromeInfo && parseFloat(value) > returnCromeInfo.availableStockForCrome) return 'Exceeds available stock';
        return null;
      default: return null;
    }
  };

  const validatePackagingRow = (row: PackagingFormRow): string | null => {
    if (!row.packagingWeight || parseFloat(row.packagingWeight) <= 0) return 'Weight required';
    if (!row.packagingCount || parseInt(row.packagingCount) <= 0) return 'Count required';
    return null;
  };

  const getFieldError = (name: string) => {
    if (!touched[name]) return null;
    return validateField(name, formData[name as keyof typeof formData]);
  };

  const handleAddParty = async () => {
    if (!newPartyName.trim()) return;

    try {
      setAddingParty(true);
      const newParty = await cromeApi.addParty(newPartyName.trim());
      setParties((prev) => [...prev, newParty]);
      setFormData((prev) => ({ ...prev, partyId: String(newParty.partyId) }));
      setNewPartyName('');
      setShowAddParty(false);
    } catch (err) {
      console.error('Error adding party:', err);
      setError('Failed to add party');
    } finally {
      setAddingParty(false);
    }
  };

  // Calculate total packaging weight across all rows
  const getTotalPackagingWeightKg = (): number => {
    return formData.packagings.reduce((sum, row) => {
      return sum + ((parseFloat(row.packagingWeight) || 0) * (parseInt(row.packagingCount) || 0));
    }, 0);
  };

  // Calculate gross weight
  const calculateGrossWeight = (): number => {
    const sentStock = parseFloat(formData.sentStock) || 0;
    return sentStock + getTotalPackagingWeightKg();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Mark all touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => { allTouched[key] = true; });
    formData.packagings.forEach((_, i) => { allTouched[`packaging_${i}`] = true; });
    setTouched(allTouched);

    const fieldErrors = ['partyId', 'cromeDate', 'sentStock']
      .map(key => validateField(key, formData[key as keyof typeof formData]))
      .filter(Boolean);
    const packagingErrors = formData.packagings.map(row => validatePackagingRow(row)).filter(Boolean);

    if (fieldErrors.length > 0 || packagingErrors.length > 0) return;

    const packagings: PackagingDetail[] = formData.packagings.map(row => ({
      packagingType: row.packagingType,
      packagingWeight: parseFloat(row.packagingWeight),
      packagingCount: parseInt(row.packagingCount),
    }));

    const submitData: CromeRequest = {
      subcontractingReturnId: subcontractingReturnId,
      partyId: parseInt(formData.partyId, 10),
      cromeDate: formData.cromeDate,
      sentStock: parseFloat(formData.sentStock),
      packagings,
      cromeAmount: formData.cromeAmount ? parseFloat(formData.cromeAmount) : null,
      remark: formData.remark || null,
    };

    try {
      setLoading(true);
      await cromeApi.addCrome(submitData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create crome');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content crome-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Send to Crome</h2>
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content crome-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Send to Crome</h2>

        {cromeInfo && (
          <div className="crome-info-section">
            <div className="info-row">
              <span className="info-label">Contractor:</span>
              <span className="info-value">{cromeInfo.contractorName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Item:</span>
              <span className="info-value">{cromeInfo.itemName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Available Stock:</span>
              <span className="info-value available-stock">
                {(returnCromeInfo?.availableStockForCrome ?? 0).toFixed(3)} {cromeInfo.unit}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          <div className="form-group">
            <label className="form-label">Party:</label>
            <div className="dropdown-with-add">
              <select
                name="partyId"
                value={formData.partyId}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input ${getFieldError('partyId') ? 'invalid' : ''}`}
                title="Select Party"
                required
              >
                <option value="">Select Party</option>
                {parties.map((party) => (
                  <option key={party.partyId} value={party.partyId}>
                    {party.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="add-new-btn"
                onClick={() => setShowAddParty(!showAddParty)}
                title="Add new party"
              >
                +
              </button>
            </div>
            {getFieldError('partyId') && <span className="field-error-text">{getFieldError('partyId')}</span>}

            {showAddParty && (
              <div className="add-new-input-group">
                <input
                  type="text"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Enter party name"
                  className="form-input add-new-input"
                />
                <button
                  type="button"
                  className="add-confirm-btn"
                  onClick={handleAddParty}
                  disabled={addingParty || !newPartyName.trim()}
                >
                  {addingParty ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Crome Date:</label>
              <input
                type="date"
                name="cromeDate"
                value={formData.cromeDate}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input ${getFieldError('cromeDate') ? 'invalid' : ''}`}
                title="Crome Date"
                required
              />
              {getFieldError('cromeDate') && <span className="field-error-text">{getFieldError('cromeDate')}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Sent Stock ({cromeInfo?.unit || 'KG'}):</label>
              <input
                type="number"
                name="sentStock"
                value={formData.sentStock}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter net stock"
                className={`form-input ${getFieldError('sentStock') ? 'invalid' : ''}`}
                step="0.001"
                min="0"
                max={returnCromeInfo?.availableStockForCrome}
                required
              />
              {getFieldError('sentStock') && <span className="field-error-text">{getFieldError('sentStock')}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Crome Amount (Rs.):</label>
            <input
              type="number"
              name="cromeAmount"
              value={formData.cromeAmount}
              onChange={handleChange}
              placeholder="Enter amount (optional)"
              className="form-input"
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <div className="packaging-list-header">
              <label className="form-label">Packaging:</label>
              <button type="button" className="add-packaging-btn" onClick={addPackagingRow} title="Add packaging">
                +
              </button>
            </div>

            {formData.packagings.map((row, index) => {
              const rowError = touched[`packaging_${index}`] ? validatePackagingRow(row) : null;
              return (
                <div key={index} className="packaging-list-row">
                  <div className="packaging-row">
                    <select
                      value={row.packagingType}
                      onChange={(e) => handlePackagingTypeChange(index, e.target.value as PackagingType)}
                      className="form-input packaging-type"
                      title="Packaging type"
                      required
                    >
                      <option value={PackagingType.BAG}>Bag</option>
                      <option value={PackagingType.FOAM}>Foam</option>
                      <option value={PackagingType.PETI}>Peti</option>
                      <option value={PackagingType.DRUM}>Drum</option>
                    </select>
                    <input
                      type="number"
                      value={row.packagingWeight}
                      onChange={(e) => handlePackagingChange(index, 'packagingWeight', e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, [`packaging_${index}`]: true }))}
                      placeholder="Weight (KG)"
                      title="Packaging weight"
                      className={`form-input packaging-weight ${rowError ? 'invalid' : ''}`}
                      step="0.001"
                      min="0"
                      required
                      disabled={row.packagingType !== PackagingType.DRUM}
                    />
                    <input
                      type="number"
                      value={row.packagingCount}
                      onChange={(e) => handlePackagingChange(index, 'packagingCount', e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, [`packaging_${index}`]: true }))}
                      placeholder="Count"
                      title="Packaging count"
                      className={`form-input packaging-count ${rowError ? 'invalid' : ''}`}
                      step="1"
                      min="1"
                      required
                    />
                    {formData.packagings.length > 1 && (
                      <button type="button" className="remove-packaging-btn" onClick={() => removePackagingRow(index)} title="Remove packaging">
                        -
                      </button>
                    )}
                  </div>
                  {rowError && <span className="field-error-text">{rowError}</span>}
                </div>
              );
            })}
          </div>

          <div className="calculation-summary">
            <div className="calc-row">
              <span className="calc-label">Net Stock:</span>
              <span className="calc-value">{(parseFloat(formData.sentStock) || 0).toFixed(3)} {cromeInfo?.unit || 'KG'}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Packaging Weight:</span>
              <span className="calc-value">+ {getTotalPackagingWeightKg().toFixed(3)} {cromeInfo?.unit || 'KG'}</span>
            </div>
            <div className="calc-row calc-row-formula">
              <span className="calc-formula">
                {formData.packagings.map((row) => {
                  const c = row.packagingCount || '0';
                  const w = row.packagingWeight || '0';
                  return `${c} x ${w}`;
                }).join(' + ')} KG
              </span>
            </div>
            <div className="calc-row total-row">
              <span className="calc-label">Gross Weight:</span>
              <span className="calc-value total">{calculateGrossWeight().toFixed(3)} {cromeInfo?.unit || 'KG'}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remark:</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              placeholder="Enter remark (optional)"
              className="form-textarea"
              rows={2}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Sending...' : 'Send to Crome'}
            </button>
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CromeModal;
