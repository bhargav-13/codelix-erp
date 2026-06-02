import React, { useState, useEffect, useRef } from 'react';
import { stockItemApi, productApi, categoryApi } from '../api/inventory';
import type { StockItem, Product, Category } from '../types';
import { InventoryStatus, InventoryFloor } from '../types';
import Loading from '../components/Loading';
import AddStockItemModal from '../components/AddStockItemModal';
import AddProductModal from '../components/AddProductModal';
import AddCategoryModal from '../components/AddCategoryModal';
import './InventoryPage.css';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';

const InventoryFirstFloorPage: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | ''>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingLoadingId, setEditingLoadingId] = useState<number | null>(null);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockItemsResult, productsData, categoriesData] = await Promise.all([
        stockItemApi.getStockItems(
          InventoryFloor.FIRST_FLOOR,
          0,
          1000,
          statusFilter || undefined
        ),
        productApi.getProducts(),
        categoryApi.getCategories(),
      ]);
      const stockData = (stockItemsResult as any)?.data ?? [];
      setStockItems(stockData);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (stockItemId: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      setDeletingId(stockItemId);
      await stockItemApi.deleteStockItem(stockItemId);
      fetchData();
    } catch (error) {
      console.error('Error deleting stock item:', error);
      alert('Failed to delete stock item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (item: StockItem) => {
    try {
      setEditingLoadingId(item.stockItemId);
      const fullItem = await stockItemApi.getStockItemById(item.stockItemId);
      setEditingItem(fullItem);
      setIsAddModalOpen(true);
    } catch (error) {
      console.error('Error loading stock item for edit:', error);
      alert('Failed to load stock item details. Please try again.');
    } finally {
      setEditingLoadingId(null);
    }
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  const handleProductAdded = () => {
    productApi.getProducts().then(setProducts);
  };

  const handleCategoryAdded = () => {
    categoryApi.getCategories().then(setCategories);
  };

  const getActualStatus = (quantityInPc: number, lowStockAlert: number): InventoryStatus => {
    return quantityInPc <= lowStockAlert ? InventoryStatus.LOW_STOCK : InventoryStatus.IN_STOCK;
  };

  const totalItems = stockItems.length;
  const lowStockItems = stockItems.filter(
    (item) => item.quantityInPc <= item.lowStockAlert
  ).length;
  const criticalStockItems = stockItems.filter(
    (item) => getActualStatus(item.quantityInPc, item.lowStockAlert) === InventoryStatus.LOW_STOCK
  ).length;
  const totalAmount = stockItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  const filteredItems = stockItems.filter((item) => {
    if (!item) return false;

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      item.product?.productName?.toLowerCase().includes(searchLower) ||
      item.category?.categoryName?.toLowerCase().includes(searchLower) ||
      false;

    const itemStatus = getActualStatus(item.quantityInPc, item.lowStockAlert);
    const matchesStatus = !statusFilter || itemStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCopyLink = async () => {
    try {
      const catalogUrl = `${window.location.origin}/catalog`;
      await navigator.clipboard.writeText(catalogUrl);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link to clipboard');
    }
  };

  if (loading && stockItems.length === 0) {
    return <Loading message="Loading inventory..." />;
  }

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Stock Inventory - First Floor</h1>
          <p className="page-subtitle">Manage your first floor product inventory and stock levels</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="action-button secondary-button"
            onClick={handleCopyLink}
            title="Copy public catalog link"
          >
            <span className="button-icon">🔗</span>
            <span className="button-text">{copyLinkSuccess ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
          <button
            type="button"
            className="action-button secondary-button"
            onClick={() => setIsAddCategoryModalOpen(true)}
          >
            <span className="button-icon">+</span>
            <span className="button-text">Add Category</span>
          </button>
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
            onClick={() => setIsAddModalOpen(true)}
          >
            <span className="button-icon">+</span>
            <span className="button-text">Add Item</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Items</span>
          <span className="stat-value">{totalItems} Items</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Low Stock Warning</span>
          <span className="stat-value danger">{lowStockItems} items below reorder point</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Critical Stock Alert</span>
          <span className="stat-value warning">{criticalStockItems} items need immediate attention</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Amount</span>
          <span className="stat-value">₹{Number(totalAmount.toFixed(2)).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by product name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="order-status-filter">
          <img src={FilterIcon} alt="Filter" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InventoryStatus | '')}
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
              <th>Category</th>
              <th>Quantity</th>
              <th>Pc.</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, index) => (
              <tr key={item.stockItemId}>
                <td>{String(index + 1).padStart(2, '0')}</td>
                <td>{item.product?.productName || 'N/A'}</td>
                <td>{item.category?.categoryName || 'N/A'}</td>
                <td>{item.quantityInKg} Kg</td>
                <td>{item.quantityInPc?.toLocaleString('en-IN') || '—'}</td>
                <td>₹{Number(item.pricePerKg).toFixed(2)}/KG</td>
                <td>
                  <span
                    className={`status-badge ${getActualStatus(item.quantityInPc, item.lowStockAlert) === InventoryStatus.IN_STOCK ? 'in-stock' : 'low-stock'
                      }`}
                  >
                    {getActualStatus(item.quantityInPc, item.lowStockAlert) === InventoryStatus.IN_STOCK ? 'In Stock' : 'Low Stock'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleEdit(item)}
                      title="Edit"
                      disabled={editingLoadingId === item.stockItemId}
                    >
                      {editingLoadingId === item.stockItemId ? (
                        <span className="loading-spinner"></span>
                      ) : (
                        <img src={EditIcon} alt="Edit" className="icon-img" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDelete(item.stockItemId)}
                      disabled={deletingId === item.stockItemId}
                      title="Delete"
                    >
                      {deletingId === item.stockItemId ? (
                        <span className="loading-spinner"></span>
                      ) : (
                        <img src={DeleteIcon} alt="Delete" className="icon-img" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={8} className="no-data">
                  No inventory items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="inventory-summary">
        <div className="summary-card">
          <span className="summary-label">Total Amount</span>
          <span className="summary-value">₹{Number(totalAmount.toFixed(2)).toLocaleString('en-IN')}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Items</span>
          <span className="summary-value">{totalItems} Items</span>
        </div>
      </div>

      {isAddModalOpen && (
        <AddStockItemModal
          onClose={handleModalClose}
          onSuccess={fetchData}
          products={products}
          categories={categories}
          initialData={editingItem}
          fixedFloor={InventoryFloor.FIRST_FLOOR}
        />
      )}

      {isAddProductModalOpen && (
        <AddProductModal
          onClose={() => setIsAddProductModalOpen(false)}
          onSuccess={handleProductAdded}
        />
      )}

      {isAddCategoryModalOpen && (
        <AddCategoryModal
          onClose={() => setIsAddCategoryModalOpen(false)}
          onSuccess={handleCategoryAdded}
        />
      )}
    </div>
  );
};

export default InventoryFirstFloorPage;
