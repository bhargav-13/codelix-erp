import React, { useState } from 'react';
import { purchaseApi } from '../api/purchase';
import { productApi, categoryApi } from '../api/inventory';
import type { Product, Category, PurchaseRequest, PurchaseResponse, ProductRequest, CategoryRequest, PurchaseParty } from '../types';
import { PurchaseInventoryType, QuantityUnit } from '../types';
import './AddStockItemModal.css';

interface AddPurchaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
  purchaseParties?: PurchaseParty[];
  categories: Category[];
  onAlreadyExists: (response: PurchaseResponse) => void;
  editingPurchase?: PurchaseResponse | null;
}

const defaultFormData: PurchaseRequest = {
  chNo: '',
  partyId: 0,
  productId: 0,
  qty: 0,
  rate: 0,
  amountDeposited: 0,
  inventoryType: PurchaseInventoryType.RAW_MATERIAL,
  lowStockAlert: 0,
  categoryId: undefined,
  quantityInPc: undefined,
  weightPerPc: undefined,
  quantityUnit: undefined,
};

const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({
  onClose,
  onSuccess,
  products,
  purchaseParties = [],
  categories,
  onAlreadyExists,
  editingPurchase,
}) => {
  const isEditMode = !!editingPurchase;

  const initialFormData: PurchaseRequest = editingPurchase
    ? {
        chNo: editingPurchase.chNo,
        partyId: editingPurchase.partyId,
        productId: editingPurchase.product?.productId ?? 0,
        qty: editingPurchase.qty,
        rate: editingPurchase.rate,
        amountDeposited: editingPurchase.amountDeposited,
        inventoryType: editingPurchase.inventoryType,
        lowStockAlert: editingPurchase.stockInventory?.lowStockAlert ?? editingPurchase.rawInventory?.lowStockAlert ?? 0,
        categoryId: editingPurchase.stockInventory?.category?.categoryId,
        quantityInPc: editingPurchase.stockInventory?.quantityInPc,
        weightPerPc: editingPurchase.stockInventory?.weightPerPc,
        quantityUnit: editingPurchase.stockInventory?.quantityUnit as any ?? undefined,
      }
    : { ...defaultFormData };

  const [formData, setFormData] = useState<PurchaseRequest>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [showProductInput, setShowProductInput] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const isStockType =
    formData.inventoryType === PurchaseInventoryType.GROUND_FLOOR ||
    formData.inventoryType === PurchaseInventoryType.FIRST_FLOOR;

  const calculateQuantityInPc = (quantityInKg: number, weightPerPc: number, unit: QuantityUnit): number => {
    if (unit === QuantityUnit.PCS) return quantityInKg; // qty is already in pieces
    if (weightPerPc === 0) return 0;
    const weightPerPcInKg = unit === QuantityUnit.GM ? weightPerPc / 1000 : weightPerPc;
    return Math.floor(quantityInKg / weightPerPcInKg);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'productId' && value === 'add_new') {
      setShowProductInput(true);
      return;
    }
    if (name === 'categoryId' && value === 'add_new') {
      setShowCategoryInput(true);
      return;
    }

    const numericFields = [
      'partyId', 'productId', 'qty', 'rate', 'amountDeposited',
      'lowStockAlert', 'categoryId', 'quantityInPc', 'weightPerPc',
    ];

    const parsedValue = numericFields.includes(name)
      ? parseFloat(value) || 0
      : value;

    setFormData((prev) => {
      const newData = { ...prev, [name]: parsedValue };

      // Auto-calculate quantityInPc when stock type and relevant fields change
      if (isStockType && (name === 'qty' || name === 'weightPerPc' || name === 'quantityUnit')) {
        const qtyInKg = name === 'qty' ? (parsedValue as number) : prev.qty;
        const weight = name === 'weightPerPc' ? (parsedValue as number) : (prev.weightPerPc || 0);
        const unit = name === 'quantityUnit' ? (parsedValue as QuantityUnit) : (prev.quantityUnit || QuantityUnit.KG);
        newData.quantityInPc = calculateQuantityInPc(qtyInKg, weight, unit);
      }

      return newData;
    });
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim()) {
      setError('Product name is required');
      return;
    }
    try {
      setLoading(true);
      const data: ProductRequest = { productName: newProductName.trim() };
      const newProduct = await productApi.createProduct(data);
      setLocalProducts([...localProducts, newProduct]);
      setFormData((prev) => ({ ...prev, productId: newProduct.productId }));
      setShowProductInput(false);
      setNewProductName('');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }
    try {
      setLoading(true);
      const data: CategoryRequest = { categoryName: newCategoryName.trim() };
      const newCategory = await categoryApi.createCategory(data);
      setLocalCategories([...localCategories, newCategory]);
      setFormData((prev) => ({ ...prev, categoryId: newCategory.categoryId }));
      setShowCategoryInput(false);
      setNewCategoryName('');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.chNo.trim()) {
      setError('Challan number is required');
      return;
    }
    if (!formData.partyId) {
      setError('Please select a party');
      return;
    }
    if (!formData.productId) {
      setError('Please select a product');
      return;
    }
    if (formData.qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    if (formData.rate <= 0) {
      setError('Rate must be greater than 0');
      return;
    }
    if (isStockType && !formData.categoryId) {
      setError('Category is required for stock inventory');
      return;
    }

    try {
      setLoading(true);

      const payload: PurchaseRequest = {
        chNo: formData.chNo,
        partyId: formData.partyId,
        productId: formData.productId,
        qty: formData.qty,
        rate: formData.rate,
        amountDeposited: formData.amountDeposited,
        inventoryType: formData.inventoryType,
        lowStockAlert: formData.lowStockAlert,
      };

      if (isStockType) {
        payload.categoryId = formData.categoryId;
        payload.quantityInPc = formData.quantityInPc;
        payload.weightPerPc = formData.weightPerPc;
        payload.quantityUnit = formData.quantityUnit || QuantityUnit.KG;
      }

      if (isEditMode) {
        await purchaseApi.updatePurchase(editingPurchase!.purchaseId, payload);
        onSuccess();
        onClose();
      } else {
        const response = await purchaseApi.createPurchase(payload);
        if (response.inventoryStatus === 'ALREADY_EXISTS') {
          onClose();
          onAlreadyExists(response);
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.body?.message || err.message || (isEditMode ? 'Failed to update purchase' : 'Failed to create purchase'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-stock-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEditMode ? 'Edit Purchase' : 'Add Purchase'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Row 1: Challan No + Party */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Challan No.*</label>
              <input
                type="text"
                name="chNo"
                value={formData.chNo}
                onChange={handleChange}
                placeholder="Enter challan number"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Party*</label>
              <select
                name="partyId"
                value={formData.partyId}
                onChange={handleChange}
                className="form-select"
                required
                aria-label="Party"
              >
                <option value={0}>Select</option>
                {purchaseParties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Product + Category (with + Add New) */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Product Name*</label>
              {showProductInput ? (
                <div className="inline-add-container">
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Enter new product name"
                    className="form-input"
                    autoFocus
                  />
                  <button type="button" onClick={handleAddProduct} className="save-button inline-add-button" disabled={loading}>
                    Add
                  </button>
                  <button type="button" onClick={() => { setShowProductInput(false); setNewProductName(''); }} className="cancel-button inline-add-button">
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  name="productId"
                  value={formData.productId}
                  onChange={handleChange}
                  className="form-select"
                  required
                  aria-label="Product Name"
                >
                  <option value={0}>Select</option>
                  {localProducts.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.productName}
                    </option>
                  ))}
                  <option value="add_new" className="add-new-option">+ Add New Product</option>
                </select>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Inventory Type*</label>
              <select
                name="inventoryType"
                value={formData.inventoryType}
                onChange={handleChange}
                className="form-select"
                required
                aria-label="Inventory Type"
              >
                <option value={PurchaseInventoryType.RAW_MATERIAL}>Raw Material</option>
                <option value={PurchaseInventoryType.GROUND_FLOOR}>Ground Floor</option>
                <option value={PurchaseInventoryType.FIRST_FLOOR}>First Floor</option>
              </select>
            </div>
          </div>

          {/* Row 3: Qty + Rate */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity in Kg.*</label>
              <input
                type="number"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                placeholder="eg : 2,000 kg"
                className="form-input"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rate (per Kg)*</label>
              <input
                type="number"
                name="rate"
                value={formData.rate}
                onChange={handleChange}
                placeholder="Enter rate per Kg"
                className="form-input"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          {/* Row 4: Amount Deposited + Low Stock */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount Deposited</label>
              <input
                type="number"
                name="amountDeposited"
                value={formData.amountDeposited}
                onChange={handleChange}
                placeholder="Enter amount deposited"
                className="form-input"
                step="0.01"
                min="0"
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

          {/* Stock-only fields */}
          {isStockType && (
            <>
              {/* Row 5: Category + Quantity Unit */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category*</label>
                  {showCategoryInput ? (
                    <div className="inline-add-container">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter new category name"
                        className="form-input"
                        autoFocus
                      />
                      <button type="button" onClick={handleAddCategory} className="save-button inline-add-button" disabled={loading}>
                        Add
                      </button>
                      <button type="button" onClick={() => { setShowCategoryInput(false); setNewCategoryName(''); }} className="cancel-button inline-add-button">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <select
                      name="categoryId"
                      value={formData.categoryId || 0}
                      onChange={handleChange}
                      className="form-select"
                      required
                      aria-label="Category"
                    >
                      <option value={0}>Select</option>
                      {localCategories.map((cat) => (
                        <option key={cat.categoryId} value={cat.categoryId}>
                          {cat.categoryName}
                        </option>
                      ))}
                      <option value="add_new" className="add-new-option">+ Add New Category</option>
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity Weight per pc. (Kg/Gm)</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      name="weightPerPc"
                      value={formData.weightPerPc || 0}
                      onChange={handleChange}
                      placeholder="Enter Pc. Weight"
                      className="form-input"
                      step="0.001"
                      min="0"
                    />
                    <select
                      name="quantityUnit"
                      value={formData.quantityUnit || QuantityUnit.KG}
                      onChange={handleChange}
                      className="unit-select"
                      aria-label="Quantity Unit"
                    >
                      <option value={QuantityUnit.KG}>Kg</option>
                      <option value={QuantityUnit.GM}>Gm</option>
                      <option value={QuantityUnit.PCS}>Pcs</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 6: Quantity in Pc (auto-calculated) */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity in Pc. (Auto-calculated)</label>
                  <input
                    type="number"
                    name="quantityInPc"
                    value={formData.quantityInPc || 0}
                    placeholder="Auto-calculated"
                    className="form-input"
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </>
          )}

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

export default AddPurchaseModal;
