import React, { useState, useEffect } from 'react';
import { rawItemApi } from '../api/inventory';
import type { Product, RawItem, RawItemRequest } from '../types';
import './AddRawItemModal.css';

interface AddRawItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
  initialData?: RawItem | null;
}

const defaultFormData: RawItemRequest = {
  productId: 0,
  quantityInKg: 0,
  lowStockAlert: 0,
};

const AddRawItemModal: React.FC<AddRawItemModalProps> = ({
  onClose,
  onSuccess,
  products,
  initialData,
}) => {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState<RawItemRequest>({
    ...defaultFormData,
    productId: initialData?.product.productId || 0,
    quantityInKg: initialData?.quantityInKg || 0,
    lowStockAlert: initialData?.lowStockAlert || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) {
      setFormData(defaultFormData);
      return;
    }

    setFormData({
      productId: initialData.product.productId,
      quantityInKg: initialData.quantityInKg,
      lowStockAlert: initialData.lowStockAlert,
    });
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ['productId', 'quantityInKg', 'lowStockAlert'];
    const parsedValue = numericFields.includes(name)
      ? parseFloat(value) || 0
      : value;

    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.productId) {
      setError('Please select a product');
      return;
    }

    if (formData.quantityInKg <= 0) {
      setError('Quantity should be greater than 0');
      return;
    }

    try {
      setLoading(true);

      if (isEditMode && initialData) {
        await rawItemApi.updateRawItem(initialData.rawItemId, formData);
      } else {
        await rawItemApi.createRawItem(formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save raw item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-stock-modal add-raw-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEditMode ? 'Edit Raw Item' : 'Add Raw Item'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group full-width">
              <label className="form-label">Product Name*</label>
              <select
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value={0}>Select</option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.productName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity in Kg.</label>
              <input
                type="number"
                name="quantityInKg"
                value={formData.quantityInKg}
                onChange={handleChange}
                placeholder="e.g. 2,000 kg"
                className="form-input"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Low Stock Warning</label>
              <input
                type="number"
                name="lowStockAlert"
                value={formData.lowStockAlert}
                onChange={handleChange}
                placeholder="Select Low Stock (Kg)"
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
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

export default AddRawItemModal;
