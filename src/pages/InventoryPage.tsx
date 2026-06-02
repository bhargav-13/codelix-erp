import React, { useState, useEffect } from 'react';
import { stockItemApi, productApi, categoryApi, rawItemApi } from '../api/inventory';
import type { StockItem, Product, Category, RawItem } from '../types';
import { InventoryStatus, InventoryFloor } from '../types';
import Loading from '../components/Loading';
import AddStockItemModal from '../components/AddStockItemModal';
import AddRawItemModal from '../components/AddRawItemModal';
import AddProductModal from '../components/AddProductModal';
import AddCategoryModal from '../components/AddCategoryModal';
import './InventoryPage.css';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';

const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'raw'>('stock');
  const [selectedFloor, setSelectedFloor] = useState<InventoryFloor>(InventoryFloor.GROUND_FLOOR);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [rawItems, setRawItems] = useState<RawItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [editingRawItem, setEditingRawItem] = useState<RawItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rawSearchQuery, setRawSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | ''>('');
  const [rawStatusFilter, setRawStatusFilter] = useState<InventoryStatus | ''>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingLoadingId, setEditingLoadingId] = useState<number | null>(null);
  const [rawDeletingId, setRawDeletingId] = useState<number | null>(null);
  const [rawEditingLoadingId, setRawEditingLoadingId] = useState<number | null>(null);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedFloor, statusFilter, rawStatusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockItemsResult, productsData, categoriesData, rawItemsResult] = await Promise.all([
        stockItemApi.getStockItems(
          selectedFloor,
          0,
          1000,
          statusFilter || undefined
        ),
        productApi.getProducts(),
        categoryApi.getCategories(),
        rawItemApi.getRawItems(
          0,
          1000,
          rawStatusFilter || undefined
        ),
      ]);
      const stockData = (stockItemsResult as any)?.data ?? [];
      setStockItems(stockData);
      setProducts(productsData);
      setCategories(categoriesData);
      const rawData = (rawItemsResult as any)?.data ?? [];
      setRawItems(rawData);
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

  const handleRawModalClose = () => {
    setIsRawModalOpen(false);
    setEditingRawItem(null);
  };

  const handleProductAdded = () => {
    productApi.getProducts().then(setProducts);
  };

  const handleCategoryAdded = () => {
    categoryApi.getCategories().then(setCategories);
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

  // Calculate actual status based on quantity in pieces vs low stock alert (for stock items)
  const getActualStatus = (quantityInPc: number, lowStockAlert: number): InventoryStatus => {
    return quantityInPc <= lowStockAlert ? InventoryStatus.LOW_STOCK : InventoryStatus.IN_STOCK;
  };

  // Calculate actual status based on quantity in kg vs low stock alert (for raw materials)
  const getActualStatusForRaw = (quantityInKg: number, lowStockAlert: number): InventoryStatus => {
    return quantityInKg <= lowStockAlert ? InventoryStatus.LOW_STOCK : InventoryStatus.IN_STOCK;
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
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      item.product.productName.toLowerCase().includes(searchLower) ||
      item.category.categoryName.toLowerCase().includes(searchLower);

    const itemStatus = getActualStatus(item.quantityInPc, item.lowStockAlert);
    const matchesStatus = !statusFilter || itemStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalRawItems = rawItems.length;
  const rawLowStockItems = rawItems.filter(
    (item) => item.quantityInKg <= item.lowStockAlert
  ).length;

  const filteredRawItems = rawItems.filter((item) => {
    const matchesSearch = item.product.productName.toLowerCase().includes(rawSearchQuery.toLowerCase());

    const itemStatus = getActualStatusForRaw(item.quantityInKg, item.lowStockAlert);
    const matchesStatus = !rawStatusFilter || itemStatus === rawStatusFilter;

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

  if (loading) {
    return <Loading message="Loading inventory..." />;
  }

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage your product inventory and stock levels</p>
        </div>

        <div className="header-actions">
          <select
            className="floor-select"
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value as InventoryFloor)}
            title="Select floor"
          >
            <option value={InventoryFloor.GROUND_FLOOR}>Ground Floor</option>
            <option value={InventoryFloor.FIRST_FLOOR}>First Floor</option>
          </select>
          <button
            type="button"
            className="action-button secondary-button"
            onClick={handleCopyLink}
            title="Copy public catalog link"
          >
            <span className="button-icon">🔗</span>
            <span className="button-text">{copyLinkSuccess ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
          {/* <button
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
          </button> */}
          <button
            type="button"
            className="action-button primary-button"
            onClick={() => (activeTab === 'stock' ? setIsAddModalOpen(true) : setIsRawModalOpen(true))}
          >
            <span className="button-icon">+</span>
            <span className="button-text">Add Item</span>
          </button>
        </div>
      </div>

      <div className="inventory-tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          Stock Inventory
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          Raw Material Inventory
        </button>
      </div>

      {activeTab === 'stock' && (
        <>
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
                type="text"
                placeholder="Search by product name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="order-status-filter">
              <img src={FilterIcon} alt="Filter" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InventoryStatus | '')} title="Filter by status">
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
                    <td>{item.product.productName}</td>
                    <td>{item.category.categoryName}</td>
                    <td>{item.quantityInKg} Kg</td>
                    <td>{item.quantityInPc?.toLocaleString('en-IN') || '—'}</td>
                    <td>₹{Number(item.pricePerKg).toFixed(2)}/KG</td>
                    <td>
                      <span
                        className={`status-badge ${
                          getActualStatus(item.quantityInPc, item.lowStockAlert) === InventoryStatus.IN_STOCK ? 'in-stock' : 'low-stock'
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
        </>
      )}

      {activeTab === 'raw' && (
        <>
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
                placeholder="Search raw items"
                value={rawSearchQuery}
                onChange={(e) => setRawSearchQuery(e.target.value)}
              />
            </div>
            <div className="order-status-filter">
              <img src={FilterIcon} alt="Filter" />
              <select value={rawStatusFilter} onChange={(e) => setRawStatusFilter(e.target.value as InventoryStatus | '')} title="Filter by status">
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
                    <td>{item.product.productName}</td>
                    <td>{item.quantityInKg} Kg</td>
                    <td>{formatLastUpdated(item.lastUpdatedAt)}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          getActualStatusForRaw(item.quantityInKg, item.lowStockAlert) === InventoryStatus.IN_STOCK ? 'in-stock' : 'low-stock'
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
        </>
      )}

      {isAddModalOpen && (
        <AddStockItemModal
          onClose={handleModalClose}
          onSuccess={fetchData}
          products={products}
          categories={categories}
          initialData={editingItem}
        />
      )}

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

      {isAddCategoryModalOpen && (
        <AddCategoryModal
          onClose={() => setIsAddCategoryModalOpen(false)}
          onSuccess={handleCategoryAdded}
        />
      )}
    </div>
  );
};

export default InventoryPage;
