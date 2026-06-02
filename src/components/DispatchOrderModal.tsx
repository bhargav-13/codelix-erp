import React, { useEffect, useState } from 'react';
import type { Order, StockItem, DispatchRequest, DispatchItem } from '../types';
import { stockItemApi } from '../api/inventory';
import { ordersApi } from '../api/orders';
import './DispatchOrderModal.css';

interface DispatchOrderModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'dispatch' | 'revoke';
}

interface DispatchItemState {
  itemId: number;
  productName: string;
  orderQuantity: number;
  selectedQuantities: { [stockItemId: number]: number };
  selectedItems: { [stockItemId: number]: boolean };
  isDropdownOpen: boolean;
}

const DispatchOrderModal: React.FC<DispatchOrderModalProps> = ({ order, onClose, onSuccess, mode = 'dispatch' }) => {
  const isRevoke = mode === 'revoke';
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockItemsLoading, setStockItemsLoading] = useState(false);
  const [dispatchItems, setDispatchItems] = useState<DispatchItemState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStockItems = async () => {
      try {
        setStockItemsLoading(true);
        const items = await stockItemApi.getAllStockItems();
        setStockItems(items);
      } catch (err) {
        console.error('Failed to fetch stock items', err);
      } finally {
        setStockItemsLoading(false);
      }
    };
    fetchStockItems();
  }, []);

  useEffect(() => {
    if (order.products && order.products.length > 0 && stockItems.length > 0) {
      const initialItems: DispatchItemState[] = order.products.map((product) => {
        const initialSelectedQuantities: { [key: number]: number } = {};
        const initialSelectedItems: { [key: number]: boolean } = {};

        stockItems.forEach((item) => {
          // Initialize with the quantity from the order product (KG or PC)
          const defaultQty = product.quantityKg || product.quantityPc || 0;
          initialSelectedQuantities[item.stockItemId] = defaultQty;
          // In revoke mode, auto-select matching stock items
          const isMatch = isRevoke && item.stockItemId === product.itemId;
          initialSelectedItems[item.stockItemId] = isMatch;
        });

        return {
          itemId: product.itemId,
          productName: product.productName,
          orderQuantity: product.quantityKg || product.quantityPc || 0,
          selectedQuantities: initialSelectedQuantities,
          selectedItems: initialSelectedItems,
          isDropdownOpen: true,
        };
      });
      setDispatchItems(initialItems);
    }
  }, [order.products, stockItems]);

  const handleQuantityChange = (itemIndex: number, stockItemId: number, delta: number) => {
    setDispatchItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const currentQty = item.selectedQuantities[stockItemId] || 0;
        const newQty = Math.max(0, currentQty + delta);
        return {
          ...item,
          selectedQuantities: {
            ...item.selectedQuantities,
            [stockItemId]: newQty,
          },
        };
      })
    );
  };

  const handleCheckboxChange = (itemIndex: number, stockItemId: number) => {
    setDispatchItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        return {
          ...item,
          selectedItems: {
            ...item.selectedItems,
            [stockItemId]: !item.selectedItems[stockItemId],
          },
        };
      })
    );
  };

  const toggleDropdown = (itemIndex: number) => {
    setDispatchItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        return {
          ...item,
          isDropdownOpen: !item.isDropdownOpen,
        };
      })
    );
  };

  const handleSubmit = async () => {
    const dispatchRequestItems: DispatchItem[] = [];

    dispatchItems.forEach((item, itemIndex) => {
      // Get the corresponding order product to determine quantity type
      const orderProduct = order.products[itemIndex];

      Object.entries(item.selectedItems).forEach(([stockItemIdStr, isSelected]) => {
        if (isSelected) {
          const stockItemId = Number(stockItemIdStr);
          const quantity = item.selectedQuantities[stockItemId] || 0;
          if (quantity > 0) {
            const dispatchItem: DispatchItem = {
              itemId: stockItemId,
            };

            // Auto-detect quantity type from order product
            if (orderProduct.quantityKg && orderProduct.quantityKg > 0) {
              dispatchItem.quantityKg = quantity;
            }
            if (orderProduct.quantityPc && orderProduct.quantityPc > 0) {
              dispatchItem.quantityPc = quantity;
            }

            dispatchRequestItems.push(dispatchItem);
          }
        }
      });
    });

    if (dispatchRequestItems.length === 0) {
      setError(`Please select at least one item to ${isRevoke ? 'revoke' : 'dispatch'}.`);
      return;
    }

    const payload: DispatchRequest = {
      items: dispatchRequestItems,
    };

    try {
      setIsSaving(true);
      setError(null);
      if (isRevoke) {
        await ordersApi.revokeDispatch(order.id, payload);
      } else {
        await ordersApi.dispatchOrder(order.id, payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${isRevoke ? 'revoke' : 'dispatch'} order. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dispatch-modal-overlay" onClick={onClose}>
      <div className="dispatch-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dispatch-modal-header">
          <h2 className="dispatch-modal-title">{isRevoke ? 'Revoke Dispatch' : 'Dispatch Order'}</h2>
          <button type="button" className="dispatch-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="dispatch-modal-body">
          {stockItemsLoading ? (
            <div className="dispatch-loading">Loading stock items...</div>
          ) : (
            <>
              {dispatchItems.map((item, index) => {
                const orderProduct = order.products[index];
                const hasKg = orderProduct?.quantityKg && orderProduct.quantityKg > 0;
                const hasPc = orderProduct?.quantityPc && orderProduct.quantityPc > 0;
                const unitLabel = hasKg && hasPc ? 'KG + PC' : hasKg ? 'KG' : hasPc ? 'PC' : '';

                return (
                  <div className="dispatch-item-row" key={`dispatch-item-${index}`}>
                    <div className="dispatch-item-field">
                      <label>Item {index + 1} {unitLabel && `(${unitLabel})`}</label>
                      <div className="dispatch-item-input-box">
                        <span>{item.productName}</span>
                      </div>
                    </div>
                    <div className="dispatch-item-field">
                      <label>Used Items</label>
                      <div className="dispatch-items-list">
                        <div
                          className={`dispatch-items-header ${!item.isDropdownOpen ? 'collapsed' : ''}`}
                          onClick={() => toggleDropdown(index)}
                        >
                          <span>Select</span>
                          <span className={`dropdown-icon ${!item.isDropdownOpen ? 'collapsed' : ''}`}>&#9662;</span>
                        </div>
                        {item.isDropdownOpen && stockItems.map((stockItem, stockIndex) => (
                          <div
                            className={`dispatch-items-row ${stockIndex === 0 ? 'first-row' : ''} ${stockIndex === stockItems.length - 1 ? 'last-row' : ''}`}
                            key={stockItem.stockItemId}
                          >
                            <span className="item-name">{stockItem.product.productName}</span>
                            <div className="item-controls">
                              <button
                                type="button"
                                className="qty-control-btn"
                                onClick={() => handleQuantityChange(index, stockItem.stockItemId, -1)}
                              >
                                &minus;
                              </button>
                              <span className="qty-display">
                                {item.selectedQuantities[stockItem.stockItemId] || 0}
                              </span>
                              <button
                                type="button"
                                className="qty-control-btn"
                                onClick={() => handleQuantityChange(index, stockItem.stockItemId, 1)}
                              >
                                +
                              </button>
                              <label className="checkbox-container">
                                <input
                                  type="checkbox"
                                  checked={item.selectedItems[stockItem.stockItemId] || false}
                                  onChange={() => handleCheckboxChange(index, stockItem.stockItemId)}
                                  title="Select item for dispatch"
                                />
                                <span className="checkmark"></span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {error && <div className="dispatch-modal-error">{error}</div>}
        </div>

        <div className="dispatch-modal-actions">
          <button
            type="button"
            className="dispatch-save-btn"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (isRevoke ? 'Revoking...' : 'Saving...') : (isRevoke ? 'Revoke' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispatchOrderModal;
