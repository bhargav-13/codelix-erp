import React, { useState, useEffect } from 'react';
import { categoryApi } from '../api/inventory';
import type { Category } from '../types';
import Loading from '../components/Loading';
import AddCategoryModal from '../components/AddCategoryModal';
import './InventoryPage.css';
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';

const CategoryPage: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await categoryApi.getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (categoryId: number) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;

        try {
            setDeletingId(categoryId);
            await categoryApi.deleteCategory(categoryId);
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Failed to delete category. It may be in use.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsAddModalOpen(true);
    };

    const handleModalClose = () => {
        setIsAddModalOpen(false);
        setEditingCategory(null);
    };

    const filteredCategories = categories.filter((category) =>
        category.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <Loading message="Loading categories..." />;
    }

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Categories</h1>
                    <p className="page-subtitle">Manage your product categories</p>
                </div>

                <div className="header-actions">
                    <button
                        type="button"
                        className="action-button primary-button"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <span className="button-icon">+</span>
                        <span className="button-text">Add Category</span>
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-label">Total Categories</span>
                    <span className="stat-value">{categories.length} Categories</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Filtered Results</span>
                    <span className="stat-value">{filteredCategories.length} Categories</span>
                </div>
            </div>

            <div className="order-filters">
                <div className="order-search">
                    <img src={SearchIcon} alt="Search" />
                    <input
                        type="text"
                        placeholder="Search by category name"
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
                            <th>Category ID</th>
                            <th>Category Name</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCategories.map((category, index) => (
                            <tr key={category.categoryId}>
                                <td>{String(index + 1).padStart(2, '0')}</td>
                                <td>{category.categoryId}</td>
                                <td>{category.categoryName}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            type="button"
                                            className="icon-button"
                                            onClick={() => handleEdit(category)}
                                            title="Edit"
                                        >
                                            <img src={EditIcon} alt="Edit" className="icon-img" />
                                        </button>
                                        <button
                                            type="button"
                                            className="icon-button"
                                            onClick={() => handleDelete(category.categoryId)}
                                            disabled={deletingId === category.categoryId}
                                            title="Delete"
                                        >
                                            {deletingId === category.categoryId ? (
                                                <span className="loading-spinner"></span>
                                            ) : (
                                                <img src={DeleteIcon} alt="Delete" className="icon-img" />
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredCategories.length === 0 && (
                            <tr>
                                <td colSpan={4} className="no-data">
                                    No categories found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && (
                <AddCategoryModal
                    onClose={handleModalClose}
                    onSuccess={fetchCategories}
                    initialData={editingCategory || undefined}
                />
            )}
        </div>
    );
};

export default CategoryPage;
