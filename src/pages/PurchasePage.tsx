import React, { useState, useEffect } from 'react';
import { purchaseApi } from '../api/purchase';
import { productApi, categoryApi } from '../api/inventory';
import { partyApi } from '../api/party';
import { purchasePartyApi } from '../api/purchaseParty';
import type { PurchaseResponse, Product, Party, Category, PurchaseParty } from '../types';
import { PurchaseInventoryType } from '../types';
import Loading from '../components/Loading';
import AddPurchaseModal from '../components/AddPurchaseModal';
import InventoryUpdateModal from '../components/InventoryUpdateModal';
import './InventoryPage.css';
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';

const PurchasePage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseResponse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [purchaseParties, setPurchaseParties] = useState<PurchaseParty[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [alreadyExistsResponse, setAlreadyExistsResponse] = useState<PurchaseResponse | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, [searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchasesResult, productsData, partiesData, purchasePartiesData, categoriesData] = await Promise.all([
        purchaseApi.getPurchases(0, 1000, searchQuery || undefined),
        productApi.getProducts(),
        partyApi.getAllParties(),
        purchasePartyApi.getAll(),
        categoryApi.getCategories(),
      ]);
      const data = (purchasesResult as any)?.data ?? [];
      setPurchases(data);
      setProducts(productsData);
      setParties(partiesData);
      setPurchaseParties(purchasePartiesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching purchase data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAlreadyExists = (response: PurchaseResponse) => {
    setAlreadyExistsResponse(response);
  };

  const handleEditClick = (purchase: PurchaseResponse) => {
    setEditingPurchase(purchase);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (purchaseId: number) => {
    setDeleteConfirmId(purchaseId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId === null) return;
    try {
      setIsDeleting(true);
      await purchaseApi.deletePurchase(deleteConfirmId);
      setDeleteConfirmId(null);
      showToast('Purchase deleted successfully.', 'success');
      fetchData();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      showToast('Failed to delete purchase.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getInventoryTypeLabel = (type: PurchaseInventoryType) => {
    switch (type) {
      case PurchaseInventoryType.RAW_MATERIAL:
        return 'Raw Material';
      case PurchaseInventoryType.GROUND_FLOOR:
        return 'Ground Floor';
      case PurchaseInventoryType.FIRST_FLOOR:
        return 'First Floor';
      default:
        return type;
    }
  };

  const getPartyName = (partyId: number) => {
    const salesParty = parties.find((p) => p.partyId === partyId);
    if (salesParty) return salesParty.name;
    const purchaseParty = purchaseParties.find((p) => p.id === partyId);
    return purchaseParty?.name || `Party #${partyId}`;
  };

  const totalPurchases = purchases.length;
  const totalAmount = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalDeposited = purchases.reduce((sum, p) => sum + (p.amountDeposited || 0), 0);
  const totalPending = totalAmount - totalDeposited;

  if (loading) {
    return <Loading message="Loading purchases..." />;
  }

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Purchase Management</h1>
          <p className="page-subtitle">Manage purchases and inventory entries</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="action-button primary-button"
            onClick={() => setIsModalOpen(true)}
          >
            <span className="button-icon">+</span>
            <span className="button-text">Add Purchase</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Purchases</span>
          <span className="stat-value">{String(totalPurchases).padStart(2, '0')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Amount</span>
          <span className="stat-value">{totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Amount Deposited</span>
          <span className="stat-value">{totalDeposited.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Amount</span>
          <span className="stat-value danger">{totalPending.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search by product name or challan no."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Sr. No</th>
              <th>Challan No.</th>
              <th>Party ID</th>
              <th>Party</th>
              <th>Product</th>
              <th>Qty (Kg)</th>
              <th>Rate</th>
              <th>Total</th>
              <th>Deposited</th>
              <th>Inventory Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase, index) => (
              <tr key={purchase.purchaseId}>
                <td>{String(index + 1).padStart(2, '0')}</td>
                <td>{purchase.chNo}</td>
                <td>{purchase.partyId}</td>
                <td>{getPartyName(purchase.partyId)}</td>
                <td>{purchase.product?.productName || 'N/A'}</td>
                <td>{purchase.qty}</td>
                <td>{purchase.rate}</td>
                <td>{purchase.total?.toLocaleString('en-IN') || '—'}</td>
                <td>{purchase.amountDeposited?.toLocaleString('en-IN') || '—'}</td>
                <td>
                  <span className={`status-badge ${purchase.inventoryType === PurchaseInventoryType.RAW_MATERIAL ? 'in-stock' : 'low-stock'}`}>
                    {getInventoryTypeLabel(purchase.inventoryType)}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleEditClick(purchase)}
                      title="Edit"
                    >
                      <img src={EditIcon} alt="Edit" className="icon-img" />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDeleteClick(purchase.purchaseId)}
                      title="Delete"
                    >
                      <img src={DeleteIcon} alt="Delete" className="icon-img" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={11} className="no-data">
                  No purchases found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <AddPurchaseModal
          onClose={() => { setIsModalOpen(false); setEditingPurchase(null); }}
          onSuccess={() => { showToast(editingPurchase ? 'Purchase updated successfully.' : 'Purchase created successfully.', 'success'); fetchData(); }}
          products={products}
          purchaseParties={purchaseParties}
          categories={categories}
          onAlreadyExists={handleAlreadyExists}
          editingPurchase={editingPurchase}
        />
      )}

      {alreadyExistsResponse && (
        <InventoryUpdateModal
          onClose={() => setAlreadyExistsResponse(null)}
          onSuccess={fetchData}
          purchaseResponse={alreadyExistsResponse}
        />
      )}

      {deleteConfirmId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Delete Purchase</h2>
            <p className="delete-confirm-text">
              Are you sure you want to delete this purchase? Inventory will be adjusted.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="save-button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default PurchasePage;
