import React, { useState, useEffect } from 'react';
import { rawItemApi, productApi } from '../api/inventory';
import type { RawItem, Product } from '../types';
import { InventoryStatus } from '../types';
import Loading from '../components/Loading';
import AddRawItemModal from '../components/AddRawItemModal';
import AddProductModal from '../components/AddProductModal';
import './InventoryPage.css';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';

const RawInventoryPage: React.FC = () => {
  const [rawItems, setRawItems] = useState<RawItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingRawItem, setEditingRawItem] = useState<RawItem | null>(null);
  const [rawSearchQuery, setRawSearchQuery] = useState('');
  const [rawStatusFilter, setRawStatusFilter] = useState<InventoryStatus | ''>('');
  const [rawDeletingId, setRawDeletingId] = useState<number | null>(null);
  const [rawEditingLoadingId, setRawEditingLoadingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [rawSearchQuery, rawStatusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rawItemsResult, productsData] = await Promise.all([
        rawItemApi.getRawItems(
          0,
          1000,
          rawStatusFilter || undefined,
          rawSearchQuery || undefined
        ),
        productApi.getProducts(),
      ]);
      const rawData = (rawItemsResult as any)?.data ?? [];
      setRawItems(rawData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching raw inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRawModalClose = () => {
    setIsRawModalOpen(false);
    setEditingRawItem(null);
  };

  const handleProductAdded = () => {
    productApi.getProducts().then(setProducts);
  };

  const handleRawDelete = async (rawItemId: number) => {
    if (!window.confirm('Are you sure you want to delete this raw item?')) return;

    try {
      setRawDeletingId(rawItemId);
      await rawItemApi.deleteRawItem(rawItemId);
      fetchData();
    } catch (error) {
      console.error('Error deleting raw item:', error);
      alert('Failed to delete raw item');
    } finally {
      setRawDeletingId(null);
    }
  };

  const handleRawEdit = async (item: RawItem) => {
    try {
      setRawEditingLoadingId(item.rawItemId);
      const fullItem = await rawItemApi.getRawItemById(item.rawItemId);
      setEditingRawItem(fullItem);
      setIsRawModalOpen(true);
    } catch (error) {
      console.error('Error loading raw item for edit:', error);
      alert('Failed to load raw item details. Please try again.');
    } finally {
      setRawEditingLoadingId(null);
    }
  };

  const formatLastUpdated = (isoDate: string) => {
    if (!isoDate) return '—';
    const updatedDate = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - updatedDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    return updatedDate.toLocaleDateString('en-IN');
  };

  const getActualStatusForRaw = (quantityInKg: number, lowStockAlert: number): InventoryStatus => {
    return quantityInKg <= lowStockAlert ? InventoryStatus.LOW_STOCK : InventoryStatus.IN_STOCK;
  };

  const totalRawItems = rawItems.length;
  const rawLowStockItems = rawItems.filter(
    (item) => item.quantityInKg <= item.lowStockAlert
  ).length;

  const filteredRawItems = rawItems.filter((item) => {
    if (!item) return false;

    const matchesSearch = item.product?.productName?.toLowerCase().includes(rawSearchQuery.toLowerCase()) || false;

    const itemStatus = getActualStatusForRaw(item.quantityInKg, item.lowStockAlert);
    const matchesStatus = !rawStatusFilter || itemStatus === rawStatusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <Loading message="Loading raw inventory..." />;
  }

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Raw Material Inventory</h1>
          <p className="page-subtitle">Manage your raw material inventory and stock levels</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="action-button secondary-button"
            onClick={() => setIsAddProductModalOpen(true)}
          >
            <span className="button-icon">+</span>
            <span className="button-text">Add Product</span>
          </button>
          <button
            type="button"
            className="action-button primary-button"
            onClick={() => setIsRawModalOpen(true)}
          >
            <span className="button-icon">+</span>
            <span className="button-text">Add Item</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Items</span>
          <span className="stat-value">{String(totalRawItems).padStart(2, '0')} Items</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Low Stock Warning</span>
          <span className="stat-value danger">
            {rawLowStockItems} items below reorder point
          </span>
        </div>
      </div>

      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search by product name"
            value={rawSearchQuery}
            onChange={(e) => setRawSearchQuery(e.target.value)}
          />
        </div>
        <div className="order-status-filter">
          <img src={FilterIcon} alt="Filter" />
          <select
            value={rawStatusFilter}
            onChange={(e) => setRawStatusFilter(e.target.value as InventoryStatus | '')}
            title="Filter by status"
          >
            <option value="">All Status</option>
            <option value={InventoryStatus.IN_STOCK}>In Stock</option>
            <option value={InventoryStatus.LOW_STOCK}>Low Stock</option>
          </select>
        </div>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Sr. No</th>
              <th>Product Name</th>
              <th>Quantity</th>
              <th>Last Update</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRawItems.map((item, index) => (
              <tr key={item.rawItemId}>
                <td>{String(index + 1).padStart(2, '0')}</td>
                <td>{item.product?.productName || 'N/A'}</td>
                <td>{item.quantityInKg} Kg</td>
                <td>{formatLastUpdated(item.lastUpdatedAt)}</td>
                <td>
                  <span
                    className={`status-badge ${getActualStatusForRaw(item.quantityInKg, item.lowStockAlert) === InventoryStatus.IN_STOCK ? 'in-stock' : 'low-stock'
                      }`}
                  >
                    {getActualStatusForRaw(item.quantityInKg, item.lowStockAlert) === InventoryStatus.IN_STOCK ? 'In Stock' : 'Low Stock'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleRawEdit(item)}
                      title="Edit"
                      disabled={rawEditingLoadingId === item.rawItemId}
                    >
                      {rawEditingLoadingId === item.rawItemId ? (
                        <span className="loading-spinner"></span>
                      ) : (
                        <img src={EditIcon} alt="Edit" className="icon-img" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleRawDelete(item.rawItemId)}
                      disabled={rawDeletingId === item.rawItemId}
                      title="Delete"
                    >
                      {rawDeletingId === item.rawItemId ? (
                        <span className="loading-spinner"></span>
                      ) : (
                        <img src={DeleteIcon} alt="Delete" className="icon-img" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRawItems.length === 0 && (
              <tr>
                <td colSpan={6} className="no-data">
                  No raw items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isRawModalOpen && (
        <AddRawItemModal
          onClose={handleRawModalClose}
          onSuccess={fetchData}
          products={products}
          initialData={editingRawItem}
        />
      )}

      {isAddProductModalOpen && (
        <AddProductModal
          onClose={() => setIsAddProductModalOpen(false)}
          onSuccess={handleProductAdded}
        />
      )}
    </div>
  );
};

export default RawInventoryPage;
