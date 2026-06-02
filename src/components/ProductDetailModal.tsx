import React, { useState } from 'react';
import type { StockItem } from '../types';
import './ProductDetailModal.css';

interface ProductDetailModalProps {
  product: StockItem;
  onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';

  const normalizeImageLocation = (location?: string) => {
    if (!location) return '';
    return location.startsWith('http') ? location : `${apiBaseUrl}${location}`;
  };

  const images = product.images || [];
  const hasImages = images.length > 0;

  return (
    <div className="product-detail-overlay" onClick={onClose}>
      <div className="product-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="product-detail-content">
          {/* Image Section */}
          <div className="product-detail-images">
            {hasImages ? (
              <>
                <div className="main-image-container">
                  <img
                    src={normalizeImageLocation(images[selectedImageIndex].imageLocation)}
                    alt={product.product.productName}
                    className="main-product-image"
                  />
                </div>

                {images.length > 1 && (
                  <div className="image-thumbnails">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        className={`thumbnail-btn ${index === selectedImageIndex ? 'active' : ''}`}
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <img
                          src={normalizeImageLocation(image.imageLocation)}
                          alt={`${product.product.productName} ${index + 1}`}
                          className="thumbnail-image"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-image-placeholder">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <rect width="120" height="120" rx="12" fill="#E5E5E5"/>
                  <path d="M60 52c4.42 0 8-3.58 8-8s-3.58-8-8-8-8 3.58-8 8 3.58 8 8 8zm0 4c-5.34 0-16 2.68-16 8v4h32v-4c0-5.32-10.66-8-16-8z" fill="#999"/>
                </svg>
                <p>No image available</p>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="product-detail-info">
            <div className="product-header">
              <div>
                <h2 className="product-detail-title">{product.product.productName}</h2>
                <p className="product-detail-category">{product.category.categoryName}</p>
              </div>
              <div className="product-price-badge">
                <span className="price-label">Price</span>
                <span className="price-value">₹{product.pricePerKg}/KG</span>
              </div>
            </div>

            <div className="product-specs">
              <h3 className="specs-title">Product Specifications</h3>

              <div className="spec-grid">
                <div className="spec-item">
                  <div className="spec-icon">📦</div>
                  <div className="spec-content">
                    <span className="spec-label">Available Quantity</span>
                    <span className="spec-value">{product.quantityInKg} Kg</span>
                  </div>
                </div>

                {product.quantityInPc && (
                  <div className="spec-item">
                    <div className="spec-icon">🔢</div>
                    <div className="spec-content">
                      <span className="spec-label">Available Pieces</span>
                      <span className="spec-value">{product.quantityInPc.toLocaleString('en-IN')} Pc</span>
                    </div>
                  </div>
                )}

                {product.weightPerPc && (
                  <div className="spec-item">
                    <div className="spec-icon">⚖️</div>
                    <div className="spec-content">
                      <span className="spec-label">Weight per Piece</span>
                      <span className="spec-value">
                        {product.weightPerPc} {product.quantityUnit}
                      </span>
                    </div>
                  </div>
                )}

                <div className="spec-item">
                  <div className="spec-icon">💰</div>
                  <div className="spec-content">
                    <span className="spec-label">Price per Kg</span>
                    <span className="spec-value">₹{product.pricePerKg}</span>
                  </div>
                </div>

                {product.totalPrice && (
                  <div className="spec-item">
                    <div className="spec-icon">💵</div>
                    <div className="spec-content">
                      <span className="spec-label">Total Value</span>
                      <span className="spec-value">₹{product.totalPrice.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="product-actions">
              <a
                href={`tel:+919876543210`}
                className="action-btn primary-action"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C7.82 21 2 15.18 2 8V5z"/>
                </svg>
                Call to Order
              </a>
              <a
                href={`https://wa.me/919876543210?text=Hi, I'm interested in ${encodeURIComponent(product.product.productName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="action-btn secondary-action"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            </div>

            <div className="product-note">
              <p>💡 <strong>Note:</strong> Contact us for bulk orders, custom requirements, or any queries about this product.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
