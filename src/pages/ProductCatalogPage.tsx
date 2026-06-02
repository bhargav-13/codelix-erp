import React, { useState, useEffect } from 'react';
import { stockItemApi } from '../api/inventory';
import type { StockItem } from '../types';
import ProductDetailModal from '../components/ProductDetailModal';
import './ProductCatalogPage.css';

const ProductCatalogPage: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await stockItemApi.getAllStockItems();
      setStockItems(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(stockItems.map(item => item.category.categoryName)))];

  // Filter items based on search and category
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.category.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category.categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';

  const normalizeImageLocation = (location?: string) => {
    if (!location) return '';
    return location.startsWith('http') ? location : `${apiBaseUrl}${location}`;
  };

  if (loading) {
    return (
      <div className="catalog-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="product-catalog">
      <div className="catalog-header">
        <div className="catalog-brand">
          <h1 className="catalog-title">Parmeshwari Brass Industries</h1>
          <p className="catalog-subtitle">Product Catalog</p>
        </div>
      </div>

      <div className="catalog-controls">
        <div className="search-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filters">
          {categories.map(category => (
            <button
              key={category}
              type="button"
              className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="catalog-stats">
        <p className="results-count">
          Showing {filteredItems.length} {filteredItems.length === 1 ? 'product' : 'products'}
        </p>
      </div>

      {filteredItems.length === 0 ? (
        <div className="no-products">
          <p>No products found</p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredItems.map((item) => (
            <div
              key={item.stockItemId}
              className="product-card"
              onClick={() => setSelectedProduct(item)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedProduct(item);
                }
              }}
            >
              <div className="product-image-container">
                {item.images && item.images.length > 0 ? (
                  <img
                    src={normalizeImageLocation(item.images[0].imageLocation)}
                    alt={item.product.productName}
                    className="product-image"
                  />
                ) : (
                  <div className="product-image-placeholder">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                      <rect width="64" height="64" rx="8" fill="#E5E5E5"/>
                      <path d="M32 28c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#999"/>
                    </svg>
                  </div>
                )}
                {item.images && item.images.length > 1 && (
                  <div className="image-count-badge">
                    +{item.images.length - 1}
                  </div>
                )}
              </div>

              <div className="product-info">
                <h3 className="product-name">{item.product.productName}</h3>
                <p className="product-category">{item.category.categoryName}</p>

                <div className="product-details">
                  <div className="detail-item">
                    <span className="detail-label">Price</span>
                    <span className="detail-value">₹{item.pricePerKg}/KG</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Available</span>
                    <span className="detail-value">{item.quantityInKg} Kg</span>
                  </div>

                  {item.quantityInPc && (
                    <div className="detail-item">
                      <span className="detail-label">Pieces</span>
                      <span className="detail-value">{item.quantityInPc.toLocaleString('en-IN')} Pc</span>
                    </div>
                  )}
                </div>

                {item.images && item.images.length > 0 && (
                  <div className="product-gallery">
                    {item.images.slice(0, 4).map((image, index) => (
                      <img
                        key={index}
                        src={normalizeImageLocation(image.imageLocation)}
                        alt={`${item.product.productName} ${index + 1}`}
                        className="gallery-thumbnail"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="catalog-footer">
        <p>&copy; 2025 Parmeshwari Brass Industries. All rights reserved.</p>
      </div>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default ProductCatalogPage;
