import React, { useState, useEffect, useCallback } from 'react';
import { stockItemApi, productApi, categoryApi } from '../api/inventory';
import { imageApi } from '../api/image';
import type {
  StockItemRequest,
  Product,
  Category,
  StockItem,
  ProductRequest,
  CategoryRequest,
  StockItemImage,
} from '../types';
import { QuantityUnit, InventoryFloor } from '../types';
import './AddStockItemModal.css';

interface AddStockItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
  categories: Category[];
  initialData?: StockItem | null;
  fixedFloor?: InventoryFloor;
}

const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';

const normalizeImageLocation = (location?: string) => {
  if (!location) return '';
  return location.startsWith('http') ? location : `${apiBaseUrl}${location}`;
};

const defaultFormData: StockItemRequest = {
  productId: 0,
  categoryId: 0,
  quantityInKg: 0,
  quantityInPc: 0,
  weightPerPc: 0,
  pricePerKg: 0,
  quantityUnit: QuantityUnit.KG,
  inventoryFloor: InventoryFloor.GROUND_FLOOR,
  lowStockAlert: 0,
};

const AddStockItemModal: React.FC<AddStockItemModalProps> = ({
  onClose,
  onSuccess,
  products,
  categories,
  initialData,
  fixedFloor,
}) => {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState<StockItemRequest>({
    ...defaultFormData,
    productId: initialData?.product.productId || 0,
    categoryId: initialData?.category.categoryId || 0,
    quantityInKg: initialData?.quantityInKg || 0,
    quantityInPc: initialData?.quantityInPc || 0,
    weightPerPc: initialData?.weightPerPc || 0,
    pricePerKg: initialData?.pricePerKg || 0,
    quantityUnit: initialData?.quantityUnit || QuantityUnit.KG,
    inventoryFloor: fixedFloor || initialData?.inventoryFloor || InventoryFloor.GROUND_FLOOR,
    lowStockAlert: initialData?.lowStockAlert || 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [showProductInput, setShowProductInput] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<StockItemImage[]>(initialData?.images || []);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(isEditMode);

  // New state for duplicate detection
  const [existingStockItems, setExistingStockItems] = useState<StockItem[]>([]);
  const [duplicateItem, setDuplicateItem] = useState<StockItem | null>(null);
  const [isSwitchedToEdit, setIsSwitchedToEdit] = useState(false); // Tracks if we switched from create -> edit due to duplicate

  const resetSelectedPreviews = useCallback(() => {
    setSelectedFilePreviews((prev) => {
      prev.forEach((preview) => URL.revokeObjectURL(preview));
      return [];
    });
  }, []);

  // Fetch all stock items on mount to check for duplicates
  useEffect(() => {
    const fetchExistingStock = async () => {
      try {
        const items = await stockItemApi.getAllStockItems();
        setExistingStockItems(items);
      } catch (err) {
        console.error('Failed to fetch existing stock items for duplicate check', err);
      }
    };
    fetchExistingStock();
  }, []);

  useEffect(() => {
    setLocalProducts((prev) => {
      const merged = [...products];
      if (
        formData.productId &&
        !merged.some((product) => product.productId === formData.productId)
      ) {
        const fallback =
          prev.find((product) => product.productId === formData.productId) ||
          (initialData?.product?.productId === formData.productId ? initialData.product : undefined);
        if (fallback) {
          merged.push(fallback);
        }
      }
      return merged;
    });
  }, [products, formData.productId, initialData?.product]);

  useEffect(() => {
    setLocalCategories((prev) => {
      const merged = [...categories];
      if (
        formData.categoryId &&
        !merged.some((category) => category.categoryId === formData.categoryId)
      ) {
        const fallback =
          prev.find((category) => category.categoryId === formData.categoryId) ||
          (initialData?.category?.categoryId === formData.categoryId ? initialData.category : undefined);
        if (fallback) {
          merged.push(fallback);
        }
      }
      return merged;
    });
  }, [categories, formData.categoryId, initialData?.category]);

  useEffect(() => {
    if (!initialData) {
      setFormData({
        ...defaultFormData,
        inventoryFloor: fixedFloor || InventoryFloor.GROUND_FLOOR,
      });
      setUploadedImages([]);
      setSelectedFiles([]);
      resetSelectedPreviews();
      setIsFetchingInitialData(false);
      return;
    }

    const latestImages = (initialData.images || []).map((img) => ({
      ...img,
      imageLocation: normalizeImageLocation(img.imageLocation),
    }));

    setFormData({
      productId: initialData.product.productId,
      categoryId: initialData.category.categoryId,
      quantityInKg: initialData.quantityInKg || 0,
      quantityInPc: initialData.quantityInPc || 0,
      weightPerPc: initialData.weightPerPc || 0,
      pricePerKg: initialData.pricePerKg || 0,
      quantityUnit: initialData.quantityUnit || QuantityUnit.KG,
      lowStockAlert: initialData.lowStockAlert || 0,
      inventoryFloor: fixedFloor || initialData.inventoryFloor || InventoryFloor.GROUND_FLOOR,
    });
    setUploadedImages(latestImages);
    setSelectedFiles([]);
    resetSelectedPreviews();
  }, [initialData, fixedFloor, resetSelectedPreviews]);

  useEffect(() => {
    if (selectedFiles.length === 0) {
      resetSelectedPreviews();
      return;
    }

    const previews = selectedFiles.map((file) => URL.createObjectURL(file));
    setSelectedFilePreviews((prev) => {
      prev.forEach((preview) => URL.revokeObjectURL(preview));
      return previews;
    });

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [selectedFiles, resetSelectedPreviews]);

  useEffect(() => {
    return () => {
      resetSelectedPreviews();
    };
  }, [resetSelectedPreviews]);

  useEffect(() => {
    if (!initialData?.stockItemId) {
      setIsFetchingInitialData(false);
      return;
    }

    let isMounted = true;

    const loadStockItemDetails = async () => {
      try {
        setIsFetchingInitialData(true);
        const latestData = await stockItemApi.getStockItemById(initialData.stockItemId);
        if (!isMounted) return;

        setFormData({
          productId: latestData.product.productId,
          categoryId: latestData.category.categoryId,
          quantityInKg: latestData.quantityInKg || 0,
          quantityInPc: latestData.quantityInPc || 0,
          weightPerPc: latestData.weightPerPc || 0,
          pricePerKg: latestData.pricePerKg || 0,
          quantityUnit: latestData.quantityUnit || QuantityUnit.KG,
          lowStockAlert: latestData.lowStockAlert || 0,
          inventoryFloor: fixedFloor || latestData.inventoryFloor || InventoryFloor.GROUND_FLOOR,
        });

        const normalizedImages = (latestData.images || []).map((img) => ({
          ...img,
          imageLocation: normalizeImageLocation(img.imageLocation),
        }));

        setUploadedImages(normalizedImages);
        setSelectedFiles([]);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to fetch stock item details', err);
        setError(err.response?.data?.message || 'Failed to fetch stock item details');
      } finally {
        if (isMounted) {
          setIsFetchingInitialData(false);
        }
      }
    };

    loadStockItemDetails();

    return () => {
      isMounted = false;
    };
  }, [initialData?.stockItemId, fixedFloor]);

  const calculateQuantityInPc = (quantityInKg: number, weightPerPc: number, unit: QuantityUnit): number => {
    if (weightPerPc === 0) return 0;

    // Convert weight per piece to kg if it's in grams
    const weightPerPcInKg = unit === QuantityUnit.GM ? weightPerPc / 1000 : weightPerPc;

    // Calculate pieces: total kg / weight per piece in kg
    return Math.floor(quantityInKg / weightPerPcInKg);
  };

  const switchToEditMode = (item: StockItem) => {
    setDuplicateItem(null);
    setIsSwitchedToEdit(true);

    // Populate form with existing item data
    setFormData({
      productId: item.product.productId,
      categoryId: item.category.categoryId,
      quantityInKg: item.quantityInKg || 0,
      quantityInPc: item.quantityInPc || 0,
      weightPerPc: item.weightPerPc || 0,
      pricePerKg: item.pricePerKg || 0,
      quantityUnit: item.quantityUnit || QuantityUnit.KG,
      inventoryFloor: item.inventoryFloor || InventoryFloor.GROUND_FLOOR,
      lowStockAlert: item.lowStockAlert || 0,
    });

    // Set images
    const normalizedImages = (item.images || []).map((img) => ({
      ...img,
      imageLocation: normalizeImageLocation(img.imageLocation),
    }));
    setUploadedImages(normalizedImages);

    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // console.log('=== handleChange called ===');
    // console.log('Field name:', name);
    // console.log('New value:', value);

    // Check if user selected "add new" option
    if (name === 'productId' && value === 'add_new') {
      setShowProductInput(true);
      return;
    }
    if (name === 'categoryId' && value === 'add_new') {
      setShowCategoryInput(true);
      return;
    }

    const parsedValue = ['quantityInKg', 'quantityInPc', 'weightPerPc', 'pricePerKg', 'lowStockAlert'].includes(name)
      ? parseFloat(value) || 0
      : name === 'productId' || name === 'categoryId'
        ? parseInt(value) || 0
        : value;

    // Duplicate Check Logic
    if (name === 'productId') {
      const selectedProductId = parsedValue as number;
      // Find if this product exists in existing stock items
      const conflict = existingStockItems.find(item => item.product.productId === selectedProductId);

      // Use initialData or isSwitchedToEdit to determine if we are editing.
      // If we are editing (isEditMode or isSwitchedToEdit), we only care if the conflict id is DIFFERENT from current id.
      // Current editing ID: 


      // But wait, if we switch to edit, we should probably set some ID state.
      // Let's modify handleSubmit to handle this too.

      // Simplified check: if FOUND and (it's not the one we started editing), it's a duplicate.
      // If we are adding new (no initialData), ANY match is a duplicate.
      if (conflict) {
        const isSameItem = (initialData?.stockItemId === conflict.stockItemId) || (isSwitchedToEdit && conflict.product.productId === formData.productId);
        // The second condition `isSwitchedToEdit && ...` is a bit weak because we might change product again.
        // Ideally if `isSwitchedToEdit` is true, we are currently acting as if we are editing `conflict`.
        // But if user changes product AGAIN to another one, we might find ANOTHER conflict.

        if (!isSameItem) {
          setDuplicateItem(conflict);
          setError(`This product already exists in inventory (Floor: ${conflict.inventoryFloor}).`);
        } else {
          setDuplicateItem(null);
          setError(null);
        }
      } else {
        setDuplicateItem(null);
        setError(null);
      }
    }

    // console.log('Parsed value:', parsedValue);

    setFormData((prev) => {
      const newData = { ...prev, [name]: parsedValue };

      // Auto-calculate quantity in pieces when relevant fields change
      if (name === 'quantityInKg' || name === 'weightPerPc' || name === 'quantityUnit') {
        const qtyInKg = name === 'quantityInKg' ? (parsedValue as number) : prev.quantityInKg;
        const weight = name === 'weightPerPc' ? (parsedValue as number) : prev.weightPerPc;
        const unit = name === 'quantityUnit' ? (parsedValue as QuantityUnit) : prev.quantityUnit;

        newData.quantityInPc = calculateQuantityInPc(qtyInKg, weight, unit);
      }

      // console.log('New formData after update:', newData);
      return newData;
    });
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim()) {
      setError('Product name is required');
      return;
    }

    try {
      setLoading(true);
      const data: ProductRequest = { productName: newProductName.trim() };
      const newProduct = await productApi.createProduct(data);
      setLocalProducts([...localProducts, newProduct]);
      setFormData((prev) => ({ ...prev, productId: newProduct.productId }));
      setShowProductInput(false);
      setNewProductName('');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      const data: CategoryRequest = { categoryName: newCategoryName.trim() };
      const newCategory = await categoryApi.createCategory(data);
      setLocalCategories([...localCategories, newCategory]);
      setFormData((prev) => ({ ...prev, categoryId: newCategory.categoryId }));
      setShowCategoryInput(false);
      setNewCategoryName('');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleUploadImages = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploadingImages(true);
      setError(null);

      const uploadedImagesData = await imageApi.uploadMultipleImages(selectedFiles);

      const newImages: StockItemImage[] = uploadedImagesData.data.map((img) => ({
        imageName: img.imageName,
        imageLocation: img.imageLocation,
        publicId: img.publicId,
        format: img.format,
        width: img.width,
        height: img.height,
      }));

      setUploadedImages([...uploadedImages, ...newImages]);
      setSelectedFiles([]);
      resetSelectedPreviews();

      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = uploadedImages[index];

    try {
      // If image has publicId, delete from Cloudinary
      if (imageToRemove.publicId) {
        await imageApi.deleteImage(imageToRemove.publicId);
      }

      const newImages = uploadedImages.filter((_, i) => i !== index);
      setUploadedImages(newImages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete image');
    }
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (duplicateItem && !isSwitchedToEdit) {
      setError("Cannot save: This product already exists in inventory. Please edit existing item.");
      return;
    }

    if (!formData.productId || !formData.categoryId) {
      console.log('Validation failed: missing product or category');
      setError('Please select both product and category');
      return;
    }

    try {
      setLoading(true);

      // Prepare images array with only required fields (imageName and imageLocation)
      const imagesToSubmit = uploadedImages.map((img) => ({
        imageName: img.imageName,
        imageLocation: img.imageLocation,
      }));

      // Prepare data
      // For updates: only include images if they were modified (hasNewImages = true)
      // For creates: include images if any were uploaded
      const shouldSendImages = imagesToSubmit.length > 0 ? imagesToSubmit : undefined;

      const dataToSubmit: StockItemRequest = {
        ...formData,
        images: shouldSendImages,
      };

      if (isSwitchedToEdit) {
        // Using the ID from the duplicate item we found earlier.
        // Wait, I cleared duplicateItem in switchToEditMode. 
        // I need to store the ID of the item we are editing if we switched.
        // I'll fix this by NOT clearing duplicateItem or storing ID in a state like 'editingId'.
        // Re-implementing logic below to be safer.
        // Let's rely on finding the item again or better, store `editingId`.

        const targetId = existingStockItems.find(i => i.product.productId === formData.productId)?.stockItemId;
        if (targetId) {
          await stockItemApi.updateStockItem(targetId, dataToSubmit);
          alert('Stock item updated successfully (Switched to existing item)');
        } else {
          throw new Error("Could not find original item to update");
        }
      } else if (initialData) {
        await stockItemApi.updateStockItem(initialData.stockItemId, dataToSubmit);
        alert('Stock item updated successfully');
      } else {
        await stockItemApi.createStockItem(dataToSubmit);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('=== ERROR in handleSubmit ===');
      console.error('Full error:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.message || err.message || 'Failed to save stock item');
    } finally {
      setLoading(false);
      console.log('Loading state set to false');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-stock-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEditMode || isSwitchedToEdit ? 'Edit Item' : 'Add Items'}</h2>

        {error && (
          <div className="error-message">
            {error}
            {duplicateItem && (
              <button
                type="button"
                className="save-button inline-edit-btn"
                style={{ marginLeft: '10px', padding: '4px 10px', fontSize: '0.9em' }}
                onClick={() => switchToEditMode(duplicateItem)}
              >
                Edit Existing Item
              </button>
            )}
          </div>
        )}

        {isFetchingInitialData ? (
          <div className="modal-loading-message">Loading selected stock item...</div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Product Name*</label>
                {showProductInput ? (
                  <div className="inline-add-container">
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="Enter new product name"
                      className="form-input"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      className="save-button inline-add-button"
                      disabled={loading}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductInput(false);
                        setNewProductName('');
                      }}
                      className="cancel-button inline-add-button"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleChange}
                    className="form-select"
                    required
                    aria-label="Product Name"
                  >
                    <option value={0}>Select</option>
                    {localProducts.map((product) => (
                      <option key={product.productId} value={product.productId}>
                        {product.productName}
                      </option>
                    ))}
                    <option value="add_new" className="add-new-option">
                      + Add New Product
                    </option>
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Category*</label>
                {showCategoryInput ? (
                  <div className="inline-add-container">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name"
                      className="form-input"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="save-button inline-add-button"
                      disabled={loading}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryInput(false);
                        setNewCategoryName('');
                      }}
                      className="cancel-button inline-add-button"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="form-select"
                    required
                    aria-label="Category"
                  >
                    <option value={0}>Select</option>
                    {localCategories.map((category) => (
                      <option key={category.categoryId} value={category.categoryId}>
                        {category.categoryName}
                      </option>
                    ))}
                    <option value="add_new" className="add-new-option">
                      + Add New Category
                    </option>
                  </select>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity in Kg.</label>
                <input
                  type="number"
                  name="quantityInKg"
                  value={formData.quantityInKg}
                  onChange={handleChange}
                  placeholder="eg : 2,000 kg"
                  className="form-input"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantity Weight per pc. (Kg/Gm)</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    name="weightPerPc"
                    value={formData.weightPerPc}
                    onChange={handleChange}
                    placeholder="Enter Pc. Weight"
                    className="form-input"
                    step="0.001"
                    min="0"
                  />
                  <select
                    name="quantityUnit"
                    value={formData.quantityUnit}
                    onChange={handleChange}
                    className="unit-select"
                    aria-label="Quantity Unit"
                  >
                    <option value={QuantityUnit.KG}>Kg</option>
                    <option value={QuantityUnit.GM}>Gm</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity in Pc. (Auto-calculated)</label>
                <input
                  type="number"
                  name="quantityInPc"
                  value={formData.quantityInPc}
                  placeholder="Auto-calculated"
                  className="form-input"
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Price Per Kg.</label>
                <input
                  type="number"
                  name="pricePerKg"
                  value={formData.pricePerKg}
                  onChange={handleChange}
                  placeholder="Enter Price Per Kg."
                  className="form-input"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Low Stock Warning</label>
                <input
                  type="number"
                  name="lowStockAlert"
                  value={formData.lowStockAlert}
                  onChange={handleChange}
                  placeholder="Select Low Stock (Kg)"
                  className="form-input"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inventory Floor</label>
                <select
                  name="inventoryFloor"
                  value={formData.inventoryFloor}
                  onChange={handleChange}
                  className="form-select"
                  aria-label="Inventory Floor"
                  disabled={!!fixedFloor}
                >
                  <option value={InventoryFloor.GROUND_FLOOR}>Ground Floor</option>
                  <option value={InventoryFloor.FIRST_FLOOR}>First Floor</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label className="form-label">Product Images</label>
                <div className="upload-section">
                  <input
                    type="file"
                    id="file-upload"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="file-input"
                  />
                  <label htmlFor="file-upload" className="upload-area">
                    <span className="upload-icon">📤</span>
                    <span className="upload-text">
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} file(s) selected`
                        : 'Click to upload product images'}
                    </span>
                  </label>
                  {selectedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUploadImages}
                      className="upload-button"
                      disabled={uploadingImages}
                    >
                      {uploadingImages ? 'Uploading...' : 'Upload Images'}
                    </button>
                  )}
                </div>

                {selectedFilePreviews.length > 0 && (
                  <div className="selected-image-previews">
                    <p className="preview-heading">Selected files (upload to save):</p>
                    <div className="uploaded-images">
                      {selectedFilePreviews.map((preview, index) => (
                        <div key={`preview-${index}`} className="image-preview">
                          <img src={preview} alt={`Selected file ${index + 1}`} className="preview-img" />
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedFile(index)}
                            className="remove-image-btn"
                            title="Remove selected file"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadedImages.length > 0 && (
                  <div className="uploaded-images">
                    {uploadedImages.map((image, index) => (
                      <div key={`uploaded-${index}`} className="image-preview">
                        <img src={image.imageLocation} alt={image.imageName} className="preview-img" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="remove-image-btn"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button type="submit" className="save-button" disabled={loading || (!!duplicateItem && !isSwitchedToEdit)}>
                {loading ? 'Saving...' : (isEditMode || isSwitchedToEdit) ? 'Update' : 'Save'}
              </button>
              <button type="button" className="cancel-button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddStockItemModal;
