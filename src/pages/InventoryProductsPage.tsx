import React, { useState, useEffect } from 'react';
import { productApi } from '../api/inventory';
import type { Product } from '../types';
import Loading from '../components/Loading';
import AddProductModal from '../components/AddProductModal';
import './InventoryPage.css';
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';

const InventoryProductsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await productApi.getProducts();
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (productId: number) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;

        try {
            setDeletingId(productId);
            await productApi.deleteProduct(productId);
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product. It may be in use.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsAddModalOpen(true);
    };

    const handleModalClose = () => {
        setIsAddModalOpen(false);
        setEditingProduct(null);
    };

    const filteredProducts = products.filter((product) =>
        product.productName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <Loading message="Loading products..." />;
    }

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Inventory Products</h1>
                    <p className="page-subtitle">Manage your product catalog</p>
                </div>

                <div className="header-actions">
                    <button
                        type="button"
                        className="action-button primary-button"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <span className="button-icon">+</span>
                        <span className="button-text">Add Product</span>
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-label">Total Products</span>
                    <span className="stat-value">{products.length} Products</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Filtered Results</span>
                    <span className="stat-value">{filteredProducts.length} Products</span>
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
            </div>

            <div className="inventory-table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Sr. No</th>
                            <th>Product ID</th>
                            <th>Product Name</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map((product, index) => (
                            <tr key={product.productId}>
                                <td>{String(index + 1).padStart(2, '0')}</td>
                                <td>{product.productId}</td>
                                <td>{product.productName}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            type="button"
                                            className="icon-button"
                                            onClick={() => handleEdit(product)}
                                            title="Edit"
                                        >
                                            <img src={EditIcon} alt="Edit" className="icon-img" />
                                        </button>
                                        <button
                                            type="button"
                                            className="icon-button"
                                            onClick={() => handleDelete(product.productId)}
                                            disabled={deletingId === product.productId}
                                            title="Delete"
                                        >
                                            {deletingId === product.productId ? (
                                                <span className="loading-spinner"></span>
                                            ) : (
                                                <img src={DeleteIcon} alt="Delete" className="icon-img" />
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={4} className="no-data">
                                    No products found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && (
                <AddProductModal
                    onClose={handleModalClose}
                    onSuccess={fetchProducts}
                    initialData={editingProduct || undefined}
                />
            )}
        </div>
    );
};

export default InventoryProductsPage;
