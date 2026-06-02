import {
  stockInventoryApi as generatedStockApi,
  rawInventoryApi as generatedRawApi,
  categoryApi as generatedCategoryApi,
  productApi as generatedProductApi,
  promisify,
} from '../lib/apiConfig';
import type {
  StockItem,
  StockItemRequest,
  StockItemStatusRequest,
  RawItem,
  RawItemRequest,
  RawItemStatusRequest,
  Product,
  ProductRequest,
  Category,
  CategoryRequest,
  PaginatedResult,
  InventoryFloor,
  InventoryStatus,
} from '../types';

// Stock Item API
export const stockItemApi = {
  // Create stock item
  createStockItem: (data: StockItemRequest): Promise<StockItem> =>
    promisify<StockItem>(cb => generatedStockApi.addStockItem(data, cb)),

  // Get all stock items with pagination by floor
  getStockItems: (
    floor: InventoryFloor,
    page: number = 0,
    size: number = 10,
    status?: InventoryStatus,
    search?: string
  ): Promise<PaginatedResult<StockItem>> =>
    promisify<PaginatedResult<StockItem>>(cb =>
      generatedStockApi.getStockItemList(
        floor,
        { page, size, status, search },
        cb
      )
    ),

  // Get all stock items without pagination
  getAllStockItems: (): Promise<StockItem[]> =>
    promisify<StockItem[]>(cb => generatedStockApi.getAllStockItemList(cb)),

  // Get stock item by ID
  getStockItemById: (stockItemId: number): Promise<StockItem> =>
    promisify<StockItem>(cb => generatedStockApi.getStockItemById(stockItemId, cb)),

  // Update stock item
  updateStockItem: (stockItemId: number, data: StockItemRequest): Promise<StockItem> =>
    promisify<StockItem>(cb => generatedStockApi.updateStockItem(stockItemId, data, cb)),

  // Delete stock item
  deleteStockItem: (stockItemId: number): Promise<void> =>
    promisify<void>(cb => generatedStockApi.deleteStockItem(stockItemId, cb)),

  // Update stock item status
  updateStockItemStatus: (
    stockItemId: number,
    data: StockItemStatusRequest
  ): Promise<StockItem> =>
    promisify<StockItem>(cb =>
      generatedStockApi.updateStockItemStatus(stockItemId, data, cb)
    ),
};

// Raw Item API
export const rawItemApi = {
  // Create raw item
  createRawItem: (data: RawItemRequest): Promise<RawItem> =>
    promisify<RawItem>(cb => generatedRawApi.addRawItem(data, cb)),

  // Get all raw items with pagination
  getRawItems: (
    page: number = 0,
    size: number = 10,
    status?: InventoryStatus,
    search?: string
  ): Promise<PaginatedResult<RawItem>> =>
    promisify<PaginatedResult<RawItem>>(cb =>
      generatedRawApi.getRawItemList({ page, size, status, search }, cb)
    ),

  // Get raw item by ID
  getRawItemById: (rawItemId: number): Promise<RawItem> =>
    promisify<RawItem>(cb => generatedRawApi.getRawItemById(rawItemId, cb)),

  // Update raw item
  updateRawItem: (rawItemId: number, data: RawItemRequest): Promise<RawItem> =>
    promisify<RawItem>(cb => generatedRawApi.updateRawItem(rawItemId, data, cb)),

  // Delete raw item
  deleteRawItem: (rawItemId: number): Promise<void> =>
    promisify<void>(cb => generatedRawApi.deleteRawItem(rawItemId, cb)),

  // Update raw item status
  updateRawItemStatus: (rawItemId: number, data: RawItemStatusRequest): Promise<RawItem> =>
    promisify<RawItem>(cb => generatedRawApi.updateRawItemStatus(rawItemId, data, cb)),
};

// Product API
export const productApi = {
  // Create product
  createProduct: (data: ProductRequest): Promise<Product> =>
    promisify<Product>(cb => generatedProductApi.addProduct(data, cb)),

  // Get all products
  getProducts: (): Promise<Product[]> =>
    promisify<Product[]>(cb => generatedProductApi.getProductList(cb)),

  // Get product by ID
  getProductById: (productId: number): Promise<Product> =>
    promisify<Product>(cb => generatedProductApi.getProductById(productId, cb)),

  // Update product
  updateProduct: (productId: number, data: ProductRequest): Promise<Product> =>
    promisify<Product>(cb => generatedProductApi.updateProduct(productId, data, cb)),

  // Delete product
  deleteProduct: (productId: number): Promise<void> =>
    promisify<void>(cb => generatedProductApi.deleteProduct(productId, cb)),
};

// Category API
export const categoryApi = {
  // Create category
  createCategory: (data: CategoryRequest): Promise<Category> =>
    promisify<Category>(cb => generatedCategoryApi.addCategory(data, cb)),

  // Get all categories
  getCategories: (): Promise<Category[]> =>
    promisify<Category[]>(cb => generatedCategoryApi.getCategoryList(cb)),

  // Get category by ID
  getCategoryById: (categoryId: number): Promise<Category> =>
    promisify<Category>(cb => generatedCategoryApi.getCategoryById(categoryId, cb)),

  // Update category
  updateCategory: (categoryId: number, data: CategoryRequest): Promise<Category> =>
    promisify<Category>(cb => generatedCategoryApi.updateCategory(categoryId, data, cb)),

  // Delete category
  deleteCategory: (categoryId: number): Promise<void> =>
    promisify<void>(cb => generatedCategoryApi.deleteCategory(categoryId, cb)),
};
