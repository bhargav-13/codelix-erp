import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ordersApi } from '../api/orders';
import type { Order, OrderRequest, OrderStats, OrderStatus } from '../types';
import { OrderFloor } from '../types';
import AddOrderModal from '../components/AddOrderModal';
import OrderDetailsModal from '../components/OrderDetailsModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import DispatchOrderModal from '../components/DispatchOrderModal';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import ViewIcon from '../assets/view.svg';
import './OrderManagementPage.css';
import '../styles/StatusDropdown.css';

const initialStats: OrderStats = {
  totalOrders: 0,
  pendingOrders: 0,
  completedOrders: 0,
  totalAmount: 0,
};

const formatCurrency = (value?: number | null) => {
  if (!value) return '₹ 0';
  return `₹ ${Number(value).toLocaleString('en-IN')}`;
};

const statusChip = (status: OrderStatus) => {
  switch (status) {
    case 'COMPLETED':
      return 'status-complete';
    case 'DISPATCHED':
      return 'status-dispatched';
    case 'REVOKED':
      return 'status-revoked';
    case 'PENDING':
    default:
      return 'status-pending';
  }
};

const OrderFirstFloorPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ordersApi.getOrderList({
        floor: OrderFloor.FIRST_FLOOR,
        page: 0,
        size: 50,
        status: statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setOrders(response.data);

      const pending = response.data.filter((order) => order.orderStatus === 'PENDING').length;
      const completed = response.data.filter((order) => order.orderStatus === 'COMPLETED').length;
      const totalAmount = response.data.reduce((sum, order) => sum + (order.grandTotal || 0), 0);

      setStats({
        totalOrders: response.data.length,
        pendingOrders: pending,
        completedOrders: completed,
        totalAmount,
      });
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchOrders();
    }, 350);

    return () => clearTimeout(timeout);
  }, [fetchOrders]);

  const handleAddOrder = () => {
    setEditingOrder(null);
    setIsModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
  };

  const handleSubmitOrder = async (payload: OrderRequest) => {
    if (editingOrder) {
      await ordersApi.updateOrder(editingOrder.id, payload);
    } else {
      await ordersApi.createOrder(payload);
    }
    handleModalClose();
    fetchOrders();
  };

  const handleViewOrder = async (orderId: number) => {
    try {
      setDetailLoading(true);
      const order = await ordersApi.getOrderById(orderId);
      setDetailOrder(order);
    } catch (error) {
      console.error('Failed to fetch order details', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteOrder = (order: Order) => {
    setDeleteTarget(order);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await ordersApi.deleteOrder(deleteTarget.id);
      setDeleteTarget(null);
      fetchOrders();
    } catch (error) {
      console.error('Failed to delete order', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    try {
      setStatusUpdating(orderId);
      await ordersApi.updateOrderStatus(orderId, newStatus);
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status', error);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleDispatchOrder = (order: Order) => {
    setDispatchOrder(order);
  };

  const handleDispatchClose = () => {
    setDispatchOrder(null);
  };

  const handleDispatchSuccess = () => {
    setDispatchOrder(null);
    fetchOrders();
  };

  const handleRevokeClose = () => {
    setRevokeTarget(null);
  };

  const handleRevokeSuccess = () => {
    setRevokeTarget(null);
    fetchOrders();
  };

  const tableRows = useMemo(() => {
    if (!orders.length) return [];
    return orders.map((order) => ({
      ...order,
      orderDisplayId: `Order - ${String(order.id).padStart(5, '0')}`,
    }));
  }, [orders]);

  return (
    <div className="order-page">
      <div className="order-page-header">
        <div>
          <h1>Order Management - First Floor</h1>
          <p>Track confirmed orders and production status for first floor.</p>
        </div>
        <div className="order-header-actions">
          <button type="button" className="add-button order-add-button" onClick={handleAddOrder}>
            <span className="add-icon">+</span>
            <span className="add-text">Add Order</span>
          </button>
        </div>
      </div>

      <div className="order-stats">
        <div className="stat-card">
          <p>Total Orders</p>
          <h3>{stats.totalOrders}</h3>
        </div>
        <div className="stat-card">
          <p>Pending</p>
          <h3>{stats.pendingOrders}</h3>
        </div>
        <div className="stat-card">
          <p>Completed</p>
          <h3>{stats.completedOrders}</h3>
        </div>
        <div className="stat-card">
          <p>Total Amount</p>
          <h3>{formatCurrency(stats.totalAmount)}</h3>
        </div>
      </div>

      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search by customer or mobile"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="order-status-filter">
          <img src={FilterIcon} alt="Filter" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}>
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      <div className="order-table-container">
        {loading ? (
          <div className="order-loading">Loading orders...</div>
        ) : !tableRows.length ? (
          <div className="order-loading">No orders found.</div>
        ) : (
          <table className="order-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Order</th>
                <th>Delivery Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderDisplayId}</td>
                  <td>{order.customerName}</td>
                  <td>{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
                  <td>{order.totalItems ?? order.products?.length ?? 0}</td>
                  <td>{formatCurrency(order.grandTotal)}</td>
                  <td>
                    <select
                      className={`status-select-modern ${statusChip(order.orderStatus)}`}
                      value={order.orderStatus}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      disabled={statusUpdating === order.id || order.orderStatus === 'DISPATCHED' || order.orderStatus === 'REVOKED'}
                      title="Order status"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="DISPATCHED">Dispatched</option>
                      {order.orderStatus === 'REVOKED' && <option value="REVOKED">Revoked</option>}
                    </select>
                  </td>
                  <td>
                    {order.orderStatus === 'DISPATCHED' ? (
                      <button
                        type="button"
                        className="revoke-btn"
                        onClick={() => setRevokeTarget(order)}
                      >
                        Revoke
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="dispatch-btn"
                        onClick={() => handleDispatchOrder(order)}
                        disabled={order.orderStatus === 'REVOKED'}
                      >
                        Dispatch
                      </button>
                    )}
                  </td>
                  <td>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" title="Delete" onClick={() => handleDeleteOrder(order)}>
                        <img src={DeleteIcon} alt="Delete" />
                      </button>
                      <button type="button" title="View" onClick={() => handleViewOrder(order.id)}>
                        <img src={ViewIcon} alt="View" />
                      </button>
                      <button type="button" title="Edit" onClick={() => handleEditOrder(order)}>
                        <img src={EditIcon} alt="Edit" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <AddOrderModal
          onClose={handleModalClose}
          onSubmit={handleSubmitOrder}
          initialData={editingOrder}
          fixedFloor={OrderFloor.FIRST_FLOOR}
        />
      )}

      {detailOrder && !detailLoading && (
        <OrderDetailsModal order={detailOrder} onClose={() => setDetailOrder(null)} />
      )}

      {detailLoading && <div className="order-detail-loading">Loading order details...</div>}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Order"
          message="Once deleted, this item cannot be recovered. Please confirm to continue."
          confirmText="Delete"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          loading={deleteLoading}
        />
      )}

      {dispatchOrder && (
        <DispatchOrderModal
          order={dispatchOrder}
          onClose={handleDispatchClose}
          onSuccess={handleDispatchSuccess}
        />
      )}

      {revokeTarget && (
        <DispatchOrderModal
          order={revokeTarget}
          onClose={handleRevokeClose}
          onSuccess={handleRevokeSuccess}
          mode="revoke"
        />
      )}
    </div>
  );
};

export default OrderFirstFloorPage;
