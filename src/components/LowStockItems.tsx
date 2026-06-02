import React from 'react';
import './LowStockItems.css';
import type { StockItem } from '../types';

interface LowStockItemsProps {
  items: StockItem[];
}

const LowStockItems: React.FC<LowStockItemsProps> = ({ items }) => {
  return (
    <div className="low-stock-items-container">
      <h2>Low Stock Items</h2>
      <ul className="low-stock-items-list">
        {items.map((item) => (
          <li key={item.stockItemId} className="low-stock-item">
            <span className="item-name">{item.product.productName}</span>
            <span className="item-quantity">{item.quantityInKg} kg</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LowStockItems;
