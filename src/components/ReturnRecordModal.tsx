import React, { useState } from 'react';
import type { Subcontracting, SubReturnRequest, PackagingDetail } from '../types';
import { PackagingType, ReturnType } from '../types';
import './ReturnRecordModal.css';

interface ReturnRecordModalProps {
  subcontract: Subcontracting;
  onClose: () => void;
  onSubmit: (data: SubReturnRequest) => Promise<void>;
}

// Packaging weight values in grams
const PACKAGING_WEIGHTS: Record<PackagingType, number | null> = {
  [PackagingType.BAG]: 75, // 75 gm (0.075 KG)
  [PackagingType.FOAM]: 150, // 150 gm
  [PackagingType.PETI]: 1200, // 1200 gm
  [PackagingType.DRUM]: null, // Manual input
};

interface PackagingFormRow {
  packagingType: PackagingType;
  packagingCount: string;
  drumWeight: string; // Weight per drum element as string (grams)
}

// Internal form state
interface ReturnFormState {
  returnDate: string;
  returnStock: number; // Calculated total return
  grossReturn: string; // User input as string
  packagings: PackagingFormRow[];
  returnType: ReturnType;
  returnRemark: string;
}

const createDefaultPackaging = (): PackagingFormRow => ({
  packagingType: PackagingType.DRUM,
  packagingCount: '',
  drumWeight: '',
});

const ReturnRecordModal: React.FC<ReturnRecordModalProps> = ({ subcontract, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<ReturnFormState>({
    returnDate: new Date().toISOString().split('T')[0],
    returnStock: 0,
    grossReturn: '',
    packagings: [createDefaultPackaging()],
    returnType: ReturnType.MAAL,
    returnRemark: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // @ts-ignore - warnings will be displayed in JSX later
  const [warnings, setWarnings] = useState<string[]>([]);

  // Helper: Parse numeric string values
  const parseNum = (val: string | number): number => {
    if (typeof val === 'number') return val;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Get packaging weight for a row (in grams)
  const getRowPackagingWeight = (row: PackagingFormRow): number => {
    if (row.packagingType === PackagingType.DRUM) {
      return parseNum(row.drumWeight);
    }
    return PACKAGING_WEIGHTS[row.packagingType] || 0;
  };

  // Calculate total packaging deduction in KG across all rows
  const getTotalPackagingDeductionKg = (packagings: PackagingFormRow[]): number => {
    return packagings.reduce((sum, row) => {
      const weightGm = getRowPackagingWeight(row);
      const count = parseNum(row.packagingCount);
      return sum + (count * weightGm) / 1000;
    }, 0);
  };

  // Calculate total return: grossReturn - totalPackagingDeduction
  const calculateTotalReturn = (grossReturn: string | number, packagings: PackagingFormRow[]): number => {
    const gross = parseNum(grossReturn);
    const deduction = getTotalPackagingDeductionKg(packagings);
    return Math.max(0, gross - deduction);
  };

  // Enhanced validation with all 5 business rule categories
  const validateField = (name: string, value: any, allData = formData): string | null => {
    switch (name) {
      case 'returnDate':
        if (!value) return 'Return Date is required';
        if (subcontract.orderDate && new Date(value) < new Date(subcontract.orderDate)) {
          return 'Return date cannot be before order date';
        }
        return null;

      case 'grossReturn': {
        const valueNum = parseNum(value);
        if (!value || valueNum <= 0) return 'Gross return must be > 0';

        const sentStock = subcontract.sentStock || 0;
        const previousReturns = subcontract.subReturns || [];
        const previouslyReturnedStock = previousReturns.reduce((sum, r) => {
          if (r.netReturnStock != null) return sum + r.netReturnStock;
          const deduction = (r.packagings || []).reduce((d, p) => d + (p.packagingWeight || 0) * (p.packagingCount || 0), 0);
          return sum + (r.returnStock - deduction);
        }, 0);

        const remainingStock = sentStock - previouslyReturnedStock;
        const currentDeduction = getTotalPackagingDeductionKg(allData.packagings);
        const currentNetReturn = valueNum - currentDeduction;

        if (currentNetReturn > remainingStock + 0.001) {
          return `Net return (${currentNetReturn.toFixed(3)}) cannot exceed remaining stock (${remainingStock.toFixed(3)} Kg)`;
        }
        return null;
      }

      default:
        return null;
    }
  };

  // Validate a specific packaging row
  const validatePackagingRow = (index: number, allData = formData): string | null => {
    const row = allData.packagings[index];
    if (!row) return null;

    const count = parseNum(row.packagingCount);
    if (count < 0) return 'Count must be >= 0';

    if (row.packagingType === PackagingType.DRUM && parseNum(row.drumWeight) <= 0 && count > 0) {
      return 'Drum weight is required';
    }

    // Weight integrity check across all packaging rows
    const grossReturnNum = parseNum(allData.grossReturn);
    const totalPackagingKg = getTotalPackagingDeductionKg(allData.packagings);
    if (totalPackagingKg >= grossReturnNum && grossReturnNum > 0) {
      return 'Total packaging weight cannot exceed gross return';
    }

    return null;
  };

  const getFieldError = (name: string) => {
    if (!touched[name]) return null;
    return validateField(name, formData[name as keyof typeof formData]);
  };

  const getPackagingError = (index: number) => {
    if (!touched[`packaging_${index}`]) return null;
    return validatePackagingRow(index);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  const handlePackagingBlur = (index: number) => {
    setTouched(prev => ({ ...prev, [`packaging_${index}`]: true }));
  };

  // Handle numeric input (text with numeric-only validation)
  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;

    const updatedData = {
      ...formData,
      [name]: cleanValue,
    };

    if (name === 'grossReturn') {
      updatedData.returnStock = calculateTotalReturn(cleanValue, updatedData.packagings);
    }

    setFormData(updatedData);
    setWarnings([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setWarnings([]);
  };

  // Packaging row handlers
  const handlePackagingChange = (index: number, field: keyof PackagingFormRow, value: string) => {
    const updatedPackagings = [...formData.packagings];
    updatedPackagings[index] = { ...updatedPackagings[index], [field]: value };

    const updatedData = {
      ...formData,
      packagings: updatedPackagings,
      returnStock: calculateTotalReturn(formData.grossReturn, updatedPackagings),
    };

    setFormData(updatedData);
    setWarnings([]);
  };

  const handlePackagingTypeChange = (index: number, value: PackagingType) => {
    const updatedPackagings = [...formData.packagings];
    updatedPackagings[index] = {
      ...updatedPackagings[index],
      packagingType: value,
    };

    const updatedData = {
      ...formData,
      packagings: updatedPackagings,
      returnStock: calculateTotalReturn(formData.grossReturn, updatedPackagings),
    };

    setFormData(updatedData);
    setWarnings([]);
  };

  const addPackagingRow = () => {
    const updatedPackagings = [...formData.packagings, createDefaultPackaging()];
    setFormData(prev => ({
      ...prev,
      packagings: updatedPackagings,
      returnStock: calculateTotalReturn(prev.grossReturn, updatedPackagings),
    }));
  };

  const removePackagingRow = (index: number) => {
    if (formData.packagings.length <= 1) return;
    const updatedPackagings = formData.packagings.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      packagings: updatedPackagings,
      returnStock: calculateTotalReturn(prev.grossReturn, updatedPackagings),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarnings([]);

    if (subcontract.status === 'COMPLETED') {
      setError('Cannot add return to a completed order. Please reopen it first.');
      return;
    }

    // Mark all as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => { allTouched[key] = true; });
    formData.packagings.forEach((_, i) => { allTouched[`packaging_${i}`] = true; });
    setTouched(allTouched);

    // Validate fields
    const fieldErrors = ['returnDate', 'grossReturn']
      .map(key => validateField(key, formData[key as keyof typeof formData]))
      .filter(Boolean);
    const packagingErrors = formData.packagings
      .map((_, i) => validatePackagingRow(i))
      .filter(Boolean);

    if (fieldErrors.length > 0 || packagingErrors.length > 0) return;

    if (formData.returnStock <= 0) {
      setError('Total return must be greater than 0');
      return;
    }

    // Check warnings
    const newWarnings: string[] = [];
    if (new Date(formData.returnDate) > new Date()) {
      newWarnings.push('You are recording a return in the future.');
    }

    const grossReturnNum = parseNum(formData.grossReturn);
    const sentStock = subcontract.sentStock || 0;
    const previousReturns = subcontract.subReturns || [];
    const previouslyReturnedStock = previousReturns.reduce((sum, r) => sum + r.returnStock, 0);

    if (Math.abs((grossReturnNum + previouslyReturnedStock) - sentStock) < 0.001 && subcontract.status === 'IN_PROCESS') {
      newWarnings.push('This return completes the order. Consider marking it as "Completed".');
    }

    if (newWarnings.length > 0) {
      setWarnings(newWarnings);
    }

    // Build packagings array for submission
    const packagings: PackagingDetail[] = formData.packagings.map(row => {
      const weightGm = getRowPackagingWeight(row);
      return {
        packagingType: row.packagingType,
        packagingWeight: weightGm / 1000, // Convert grams to KG
        packagingCount: parseNum(row.packagingCount),
      };
    });

    const submitData: SubReturnRequest = {
      returnDate: formData.returnDate,
      returnStock: parseNum(formData.grossReturn),
      packagings,
      returnRemark: formData.returnRemark || null,
    };

    try {
      setLoading(true);
      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to return record');
    } finally {
      setLoading(false);
    }
  };

  // Get display text for a packaging row's weight
  const getRowWeightDisplay = (row: PackagingFormRow): string => {
    if (row.packagingType === PackagingType.DRUM) {
      return row.drumWeight ? `${row.drumWeight} gm` : 'Enter weight';
    }
    const weight = PACKAGING_WEIGHTS[row.packagingType];
    return weight !== null ? `${weight} gm` : '';
  };

  // Calculate deduction for display
  const getDeductionDisplay = (): string => {
    return getTotalPackagingDeductionKg(formData.packagings).toFixed(3);
  };

  // Get formula display for all packaging rows
  const getFormulaDisplay = (): string => {
    return formData.packagings
      .map(row => {
        const count = row.packagingCount || '0';
        const weight = getRowPackagingWeight(row);
        return `${count} x ${weight}gm`;
      })
      .join(' + ');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content return-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Add Return</h2>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Return Date:</label>
              <input
                type="date"
                name="returnDate"
                value={formData.returnDate}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input ${getFieldError('returnDate') ? 'invalid' : ''}`}
                required
              />
              {getFieldError('returnDate') && <span className="field-error-text">{getFieldError('returnDate')}</span>}
            </div>
          </div>

          <div className="form-group">
            <div className="packaging-list-header">
              <label className="form-label">Packaging Details</label>
              <button type="button" className="add-packaging-btn" onClick={addPackagingRow} title="Add packaging">
                +
              </button>
            </div>

            {formData.packagings.map((row, index) => (
              <div key={index} className="packaging-list-row">
                <div className={`return-element-row ${row.packagingType === PackagingType.DRUM ? 'has-weight' : 'no-weight'}`}>
                  <input
                    type="number"
                    value={row.packagingCount}
                    onChange={(e) => handlePackagingChange(index, 'packagingCount', e.target.value)}
                    onBlur={() => handlePackagingBlur(index)}
                    placeholder="Count"
                    title="Packaging count"
                    className="form-input element-count"
                    step="1"
                    min="0"
                  />
                  <select
                    value={row.packagingType}
                    onChange={(e) => handlePackagingTypeChange(index, e.target.value as PackagingType)}
                    className="form-input element-type"
                    title="Packaging type"
                  >
                    <option value={PackagingType.BAG}>Bag (75 gm)</option>
                    <option value={PackagingType.FOAM}>Foam (150 gm)</option>
                    <option value={PackagingType.PETI}>Peti (1200 gm)</option>
                    <option value={PackagingType.DRUM}>Drum (Manual)</option>
                  </select>
                  {row.packagingType === PackagingType.DRUM && (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.drumWeight}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, '');
                        const parts = v.split('.');
                        handlePackagingChange(index, 'drumWeight', parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : v);
                      }}
                      onBlur={() => handlePackagingBlur(index)}
                      placeholder="Weight in gm"
                      className="form-input element-weight"
                    />
                  )}
                  {formData.packagings.length > 1 && (
                    <button type="button" className="remove-packaging-btn" onClick={() => removePackagingRow(index)} title="Remove packaging">
                      -
                    </button>
                  )}
                </div>
                {getPackagingError(index) && <span className="field-error-text">{getPackagingError(index)}</span>}
                <span className="packaging-weight-hint">
                  {getRowWeightDisplay(row)}
                </span>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Return In</label>
            <select
              name="returnType"
              value={formData.returnType}
              onChange={handleChange}
              className="form-input"
              title="Return type"
              required
            >
              <option value={ReturnType.MAAL}>Return Maal</option>
              <option value={ReturnType.CHHOL}>Return Chhol</option>
              <option value={ReturnType.TAYAR_MAAL}>Tayar Maal</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Gross Return (Kg)</label>
            <input
              type="text"
              inputMode="decimal"
              name="grossReturn"
              value={formData.grossReturn}
              onChange={handleNumericInput}
              onBlur={handleBlur}
              className={`form-input ${getFieldError('grossReturn') ? 'invalid' : ''}`}
              placeholder="Enter return weight in Kg"
              required
            />
            {getFieldError('grossReturn') && <span className="field-error-text">{getFieldError('grossReturn')}</span>}
          </div>

          <div className="calculation-summary">
            <div className="calc-row">
              <span className="calc-label">Gross Return:</span>
              <span className="calc-value">{parseNum(formData.grossReturn).toFixed(3)} Kg</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Packaging Deduction:</span>
              <span className="calc-value deduction">- {getDeductionDisplay()} Kg</span>
            </div>
            <div className="calc-row calc-row-formula">
              <span className="calc-formula">({getFormulaDisplay()}) / 1000</span>
            </div>
            <div className="calc-row total-row">
              <span className="calc-label">Total Return:</span>
              <span className="calc-value total">{formData.returnStock.toFixed(3)} Kg</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remark:</label>
            <textarea
              name="returnRemark"
              value={formData.returnRemark}
              onChange={handleChange}
              placeholder="Enter remark (optional)"
              className="form-textarea"
              rows={3}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
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

export default ReturnRecordModal;
