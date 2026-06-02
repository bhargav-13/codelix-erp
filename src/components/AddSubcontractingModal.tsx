import React, { useState, useEffect } from 'react';
import type { SubOrderRequest, Contractor, SubItem } from '../types';
import { Unit, SubcontractingStatus } from '../types';
import { subcontractingApi } from '../api/subcontracting';
import './AddSubcontractingModal.css';

interface AddSubcontractingModalProps {
  onClose: () => void;
  onSubmit: (data: SubOrderRequest) => Promise<void>;
  initialData?: SubOrderRequest;
}

const AddSubcontractingModal: React.FC<AddSubcontractingModalProps> = ({
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<SubOrderRequest>(
    initialData ? {
      ...initialData,
      price: parseFloat(Number(initialData.price).toFixed(2)),
      jobWorkPay: parseFloat(Number(initialData.jobWorkPay).toFixed(2)),
    } : {
      contractorId: 0,
      itemId: 0,
      orderDate: new Date().toISOString().split('T')[0],
      sentStock: 0,
      jobWorkPay: 0,
      price: 0,
      unit: Unit.KG,
      remark: '',
    }
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const isEditMode = !!initialData;

  // Existing order matching state
  const [existingOrder, setExistingOrder] = useState<{ price: number; jobWorkPay: number; subcontractingId: number; sentStock: number } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // States for adding new contractor/item inline
  const [showAddContractor, setShowAddContractor] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newContractorName, setNewContractorName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [addingContractor, setAddingContractor] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoadingDropdowns(true);
        const [contractorList, subItemList] = await Promise.all([
          subcontractingApi.getContractorList(),
          subcontractingApi.getSubItemList(),
        ]);
        setContractors(contractorList);
        setSubItems(subItemList);
      } catch (err) {
        console.error('Failed to fetch dropdown data:', err);
        setError('Failed to load contractors and items');
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Check for existing IN_PROCESS order when contractor + item are both selected
  useEffect(() => {
    const checkExistingOrder = async () => {
      if (!formData.contractorId || !formData.itemId || isEditMode) {
        setExistingOrder(null);
                return;
      }

      try {
        setCheckingExisting(true);
        const result = await subcontractingApi.getSubcontractingList({
          status: SubcontractingStatus.IN_PROCESS,
          size: 100,
        });

        const match = result.data.find(
          (order) =>
            Number(order.contractor.contractorId) === Number(formData.contractorId) &&
            Number(order.item.subItemId) === Number(formData.itemId)
        );

        if (match) {
          setExistingOrder({
            price: match.price,
            jobWorkPay: match.jobWorkPay,
            subcontractingId: match.subcontractingId,
            sentStock: match.sentStock,
          });
          // No auto-fill — both price and jobWorkPay stay editable for the new batch
                  } else {
          setExistingOrder(null);
                  }
      } catch (err) {
        console.error('Failed to check existing orders:', err);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingOrder();
  }, [formData.contractorId, formData.itemId, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['sentStock', 'price', 'jobWorkPay', 'contractorId', 'itemId'];
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value,
    }));
  };

  const handleAddContractor = async () => {
    if (!newContractorName.trim()) return;

    try {
      setAddingContractor(true);
      const newContractor = await subcontractingApi.addContractor(newContractorName.trim());
      setContractors((prev) => [...prev, newContractor]);
      setFormData((prev) => ({ ...prev, contractorId: newContractor.contractorId }));
      setNewContractorName('');
      setShowAddContractor(false);
    } catch (err) {
      console.error('Failed to add contractor:', err);
      setError('Failed to add contractor');
    } finally {
      setAddingContractor(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;

    try {
      setAddingItem(true);
      const newItem = await subcontractingApi.addSubItem(newItemName.trim());
      setSubItems((prev) => [...prev, newItem]);
      setFormData((prev) => ({ ...prev, itemId: newItem.subItemId }));
      setNewItemName('');
      setShowAddItem(false);
    } catch (err) {
      console.error('Failed to add item:', err);
      setError('Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.contractorId || !formData.itemId) {
      setError('Contractor and Item are required');
      return;
    }


    try {
      setLoading(true);
      let dataToSubmit = formData;
      if (existingOrder) {
        const existingStock = existingOrder.sentStock;
        const newStock = formData.sentStock || 0;
        const totalStock = existingStock + newStock;
        const weightedPrice = totalStock > 0
          ? (existingStock * existingOrder.price + newStock * formData.price) / totalStock
          : formData.price;
        const weightedJobWork = totalStock > 0
          ? (existingStock * existingOrder.jobWorkPay + newStock * formData.jobWorkPay) / totalStock
          : formData.jobWorkPay;
        dataToSubmit = {
          ...formData,
          price: parseFloat(weightedPrice.toFixed(2)),
          jobWorkPay: parseFloat(weightedJobWork.toFixed(2)),
        };
      }
      await onSubmit(dataToSubmit);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save subcontracting order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {isEditMode ? 'Edit Subcontracting Order' : 'Add Subcontracting Order'}
        </h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="contractorId">Contractor Name:</label>
              <div className="dropdown-with-add">
                <select
                  id="contractorId"
                  name="contractorId"
                  value={formData.contractorId}
                  onChange={handleChange}
                  className="form-input"
                  required
                  disabled={loadingDropdowns || showAddContractor}
                >
                  <option value={0}>Select Contractor</option>
                  {contractors.map((contractor) => (
                    <option key={contractor.contractorId} value={contractor.contractorId}>
                      {contractor.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-new-btn"
                  onClick={() => setShowAddContractor(!showAddContractor)}
                  title="Add new contractor"
                >
                  {showAddContractor ? '×' : '+'}
                </button>
              </div>
              {showAddContractor && (
                <div className="add-new-input-group">
                  <input
                    type="text"
                    value={newContractorName}
                    onChange={(e) => setNewContractorName(e.target.value)}
                    placeholder="Enter contractor name"
                    className="form-input add-new-input"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddContractor())}
                  />
                  <button
                    type="button"
                    className="add-confirm-btn"
                    onClick={handleAddContractor}
                    disabled={addingContractor || !newContractorName.trim()}
                  >
                    {addingContractor ? '...' : 'Add'}
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="itemId">Item Name:</label>
              <div className="dropdown-with-add">
                <select
                  id="itemId"
                  name="itemId"
                  value={formData.itemId}
                  onChange={handleChange}
                  className="form-input"
                  required
                  disabled={loadingDropdowns || showAddItem}
                >
                  <option value={0}>Select Item</option>
                  {subItems.map((item) => (
                    <option key={item.subItemId} value={item.subItemId}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-new-btn"
                  onClick={() => setShowAddItem(!showAddItem)}
                  title="Add new item"
                >
                  {showAddItem ? '×' : '+'}
                </button>
              </div>
              {showAddItem && (
                <div className="add-new-input-group">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter item name"
                    className="form-input add-new-input"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                  />
                  <button
                    type="button"
                    className="add-confirm-btn"
                    onClick={handleAddItem}
                    disabled={addingItem || !newItemName.trim()}
                  >
                    {addingItem ? '...' : 'Add'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Order Date:</label>
              <input
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleChange}
                className="form-input"
                title="Order Date"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sent Stock:</label>
              <input
                type="number"
                name="sentStock"
                value={formData.sentStock}
                onChange={handleChange}
                placeholder="Enter stock quantity"
                className="form-input"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Job Work Pay:</label>
              <input
                type="number"
                name="jobWorkPay"
                value={formData.jobWorkPay}
                onChange={handleChange}
                placeholder="Enter Job Work Pay"
                className="form-input"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Price Per kg/Pc.</label>
              <div className="price-input-group">
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Enter Price"
                  className="form-input price-input"
                  step="0.01"
                  min="0"
                  required
                />
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="unit-select"
                >
                  <option value={Unit.KG}>Kg</option>
                  <option value={Unit.PC}>Pc</option>
                </select>
              </div>
            </div>
          </div>

          {checkingExisting && (
            <div className="info-message">Checking existing orders...</div>
          )}

          {existingOrder && (() => {
            const existingStock = existingOrder.sentStock;
            const newStock = formData.sentStock || 0;
            const totalStock = existingStock + newStock;
            const weightedPrice = totalStock > 0
              ? (existingStock * existingOrder.price + newStock * formData.price) / totalStock
              : formData.price;
            const weightedJobWork = totalStock > 0
              ? (existingStock * existingOrder.jobWorkPay + newStock * formData.jobWorkPay) / totalStock
              : formData.jobWorkPay;
            return (
              <div className="info-message">
                Existing order (#{existingOrder.subcontractingId}) will be merged.
                {newStock > 0 && (
                  <>
                    <br />
                    Weighted Avg Price: ({existingStock} × ₹{Number(existingOrder.price).toFixed(2)} + {newStock} × ₹{Number(formData.price).toFixed(2)}) / {totalStock} = ₹{weightedPrice.toFixed(2)}
                    <br />
                    Weighted Avg Job Work: ({existingStock} × ₹{Number(existingOrder.jobWorkPay).toFixed(2)} + {newStock} × ₹{Number(formData.jobWorkPay).toFixed(2)}) / {totalStock} = ₹{weightedJobWork.toFixed(2)}
                  </>
                )}
              </div>
            );
          })()}

          <div className="form-group">
            <label className="form-label">Remark</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              placeholder="Enter Something"
              className="form-textarea"
              rows={4}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

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

export default AddSubcontractingModal;
