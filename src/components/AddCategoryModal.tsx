import React, { useState, useEffect } from 'react';
import { categoryApi } from '../api/inventory';
import type { CategoryRequest, Category } from '../types';
import './AddProductModal.css';

interface AddCategoryModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Category;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ onClose, onSuccess, initialData }) => {
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCategoryName(initialData.categoryName);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      const data: CategoryRequest = { categoryName: categoryName.trim() };

      if (initialData) {
        await categoryApi.updateCategory(initialData.categoryId, data);
      } else {
        await categoryApi.createCategory(data);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${initialData ? 'update' : 'create'} category`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{initialData ? 'Edit Category' : 'Add New Category'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Category Name*</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Enter Category Name"
              className="form-input"
              required
              autoFocus
            />
          </div>

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

export default AddCategoryModal;