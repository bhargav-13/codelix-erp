import React, { useState } from 'react';
import { stockItemApi, rawItemApi } from '../api/inventory';
import type { PurchaseResponse, RawItemRequest, StockItemRequest } from '../types';
import { PurchaseInventoryType, QuantityUnit, InventoryFloor } from '../types';
import './InventoryUpdateModal.css';

interface InventoryUpdateModalProps {
  onClose: () => void;
  onSuccess: () => void;
  purchaseResponse: PurchaseResponse;
}

const InventoryUpdateModal: React.FC<InventoryUpdateModalProps> = ({
  onClose,
  onSuccess,
  purchaseResponse,
}) => {
  const isRaw = purchaseResponse.inventoryType === PurchaseInventoryType.RAW_MATERIAL;
  const existingQty = isRaw
    ? (purchaseResponse.rawInventory?.quantityInKg || 0)
    : (purchaseResponse.stockInventory?.quantityInKg || 0);
  const totalQty = existingQty + purchaseResponse.qty;

  const calculateWeightedAvgPrice = () => {
    if (isRaw) return 0;
    const existingPrice = purchaseResponse.stockInventory?.pricePerKg || 0;
    const newRate = purchaseResponse.rate || 0;
    if (totalQty === 0) return newRate;
    return (existingQty * existingPrice + purchaseResponse.qty * newRate) / totalQty;
  };

  const [pricePerKg, setPricePerKg] = useState<number>(!isRaw ? calculateWeightedAvgPrice() : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInventoryTypeLabel = (type: PurchaseInventoryType) => {
    switch (type) {
      case PurchaseInventoryType.RAW_MATERIAL: return 'Raw Material';
      case PurchaseInventoryType.GROUND_FLOOR: return 'Ground Floor';
      case PurchaseInventoryType.FIRST_FLOOR: return 'First Floor';
      default: return type;
    }
  };

  const getAutoCalculatedPc = () => {
    const stock = purchaseResponse.stockInventory;
    if (!stock || stock.weightPerPc <= 0) return stock?.quantityInPc || 0;
    const weightInKg = stock.quantityUnit === QuantityUnit.GM
      ? stock.weightPerPc / 1000
      : stock.weightPerPc;
    return Math.floor(totalQty / weightInKg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      if (isRaw && purchaseResponse.rawInventory) {
        const raw = purchaseResponse.rawInventory;
        const updateData: RawItemRequest = {
          productId: raw.product.productId,
          quantityInKg: totalQty,
          lowStockAlert: raw.lowStockAlert,
        };
        await rawItemApi.updateRawItem(raw.rawItemId, updateData);
      } else if (!isRaw && purchaseResponse.stockInventory) {
        const stock = purchaseResponse.stockInventory;
        const unit = stock.quantityUnit || QuantityUnit.KG;

        const updateData: StockItemRequest = {
          productId: stock.product.productId,
          categoryId: stock.category.categoryId,
          quantityInKg: totalQty,
          quantityInPc: getAutoCalculatedPc(),
          weightPerPc: stock.weightPerPc,
          pricePerKg: pricePerKg,
          quantityUnit: unit,
          inventoryFloor: stock.inventoryFloor || InventoryFloor.GROUND_FLOOR,
          lowStockAlert: stock.lowStockAlert,
        };
        await stockItemApi.updateStockItem(stock.stockItemId, updateData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.body?.message || err.message || 'Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  if (!purchaseResponse.rawInventory && !purchaseResponse.stockInventory) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-stock-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Update Existing Inventory</h2>

        <div className="inventory-update-warning">
          This product already exists in inventory. Quantity will be added automatically. You can update the amount below.
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Row 1: Product + Inventory Type */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="inv-product">Product Name</label>
              <input
                id="inv-product"
                type="text"
                value={purchaseResponse.product?.productName || 'N/A'}
                className="form-input"
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-type">Inventory Type</label>
              <input
                id="inv-type"
                type="text"
                value={getInventoryTypeLabel(purchaseResponse.inventoryType)}
                className="form-input"
                disabled
              />
            </div>
          </div>

          {/* Row 2: Challan No + Rate */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="inv-challan">Challan No.</label>
              <input
                id="inv-challan"
                type="text"
                value={purchaseResponse.chNo}
                className="form-input"
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-rate">Purchase Rate (per Kg)</label>
              <input
                id="inv-rate"
                type="number"
                value={purchaseResponse.rate}
                className="form-input"
                disabled
              />
            </div>
          </div>

          {/* Row 3: Existing Qty + Purchase Qty */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="inv-existing-qty">Existing Quantity (Kg)</label>
              <input
                id="inv-existing-qty"
                type="number"
                value={existingQty}
                className="form-input"
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-new-qty">New Purchase Qty (Kg)</label>
              <input
                id="inv-new-qty"
                type="number"
                value={purchaseResponse.qty}
                className="form-input"
                disabled
              />
            </div>
          </div>

          {/* Row 4: Total Qty (auto sum) + Low Stock */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="inv-total-qty">Total Quantity (Kg) (Auto-calculated)</label>
              <input
                id="inv-total-qty"
                type="number"
                value={totalQty}
                className="form-input"
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-low-stock">Low Stock Alert</label>
              <input
                id="inv-low-stock"
                type="number"
                value={isRaw
                  ? purchaseResponse.rawInventory?.lowStockAlert || 0
                  : purchaseResponse.stockInventory?.lowStockAlert || 0
                }
                className="form-input"
                disabled
              />
            </div>
          </div>

          {/* Stock-specific frozen fields */}
          {!isRaw && purchaseResponse.stockInventory && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-category">Category</label>
                  <input
                    id="inv-category"
                    type="text"
                    value={purchaseResponse.stockInventory.category?.categoryName || 'N/A'}
                    className="form-input"
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-weight-pc">Weight per Pc</label>
                  <input
                    id="inv-weight-pc"
                    type="number"
                    value={purchaseResponse.stockInventory.weightPerPc || 0}
                    className="form-input"
                    disabled
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-qty-pc">Quantity in Pc. (Auto-calculated)</label>
                  <input
                    id="inv-qty-pc"
                    type="number"
                    value={getAutoCalculatedPc()}
                    className="form-input"
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-highlight" htmlFor="inv-price-kg">Price per Kg* (Weighted Avg)</label>
                  <input
                    id="inv-price-kg"
                    type="number"
                    value={parseFloat(pricePerKg.toFixed(2))}
                    onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
                    placeholder="Enter Price per Kg"
                    className="form-input"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                  />
                  <small className="price-hint">
                    ({existingQty} kg × ₹{purchaseResponse.stockInventory?.pricePerKg || 0} + {purchaseResponse.qty} kg × ₹{purchaseResponse.rate || 0}) / {totalQty} kg
                  </small>
                </div>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Updating...' : 'Update Inventory'}
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

export default InventoryUpdateModal;
