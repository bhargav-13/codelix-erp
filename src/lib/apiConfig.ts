import ApiClient from '../api-client/inventory/src/ApiClient';

// User Management API
import AuthenticationApi from '../api-client/user-management/src/api/AuthenticationApi';

// Inventory API
import StockInventoryApi from '../api-client/inventory/src/api/StockInventoryApi';
import RawInventoryApi from '../api-client/inventory/src/api/RawInventoryApi';
import CategoryApi from '../api-client/inventory/src/api/CategoryApi';
import ProductApi from '../api-client/inventory/src/api/ProductApi';
import PurchaseApi from '../api-client/inventory/src/api/PurchaseApi';
import RejectionApi from '../api-client/inventory/src/api/RejectionApi';

// Order Management API
import OrdersApi from '../api-client/order-management/src/api/OrdersApi';

// Subcontracting API
import SubcontractApi from '../api-client/subcontracting/src/api/SubcontractApi';
import SubcontractingApi from '../api-client/subcontracting/src/api/SubcontractingApi';

// Invoice & Payment API
import InvoicesApi from '../api-client/invoice-payment/src/api/InvoicesApi';
import PaymentsApi from '../api-client/invoice-payment/src/api/PaymentsApi';

// Image Management API
import ImageManagementApi from '../api-client/image-management/src/api/ImageManagementApi';

const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL?.trim() || 'http://localhost:8080';

// Configure the default API client
const apiClient = ApiClient.instance;
apiClient.basePath = BASE_URL;
apiClient.enableCookies = false;

// Remove User-Agent header as browsers don't allow setting it
delete apiClient.defaultHeaders['User-Agent'];

// Add authentication interceptor
const originalCallApi = apiClient.callApi.bind(apiClient);
apiClient.callApi = function (
  path: string,
  httpMethod: string,
  pathParams: any,
  queryParams: any,
  headerParams: any,
  formParams: any,
  bodyParam: any,
  authNames: string[],
  contentTypes: string[],
  accepts: string[],
  returnType: any,
  apiBasePath?: string,
  callback?: (error: any, data: any, response: any) => void
) {
  // Add Authorization header if token exists
  const token = localStorage.getItem('accessToken');
  if (token) {
    headerParams = headerParams || {};
    headerParams['Authorization'] = `Bearer ${token}`;
  }

  // Call the original method with a modified callback to handle 401 errors
  const wrappedCallback = async (error: any, data: any, response: any) => {
    if (error && error.status === 401 && response?.req?.path !== '/api/v1/auth/refresh') {
      // Try to refresh the token
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const authApi = new AuthenticationApi();

          // Use promise wrapper for the refresh call
          const refreshData = await new Promise<any>((resolve, reject) => {
            authApi.refreshToken({ refreshToken }, (err: any, data: any) => {
              if (err) reject(err);
              else resolve(data);
            });
          });

          // Store new tokens
          localStorage.setItem('accessToken', refreshData.accessToken);
          localStorage.setItem('refreshToken', refreshData.refreshToken);

          // Retry the original request with new token
          headerParams['Authorization'] = `Bearer ${refreshData.accessToken}`;
          originalCallApi(
            path,
            httpMethod,
            pathParams,
            queryParams,
            headerParams,
            formParams,
            bodyParam,
            authNames,
            contentTypes,
            accepts,
            returnType,
            apiBasePath,
            callback
          );
          return;
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        if (callback) callback(refreshError, null, null);
        return;
      }
    }

    // Call the original callback
    if (callback) callback(error, data, response);
  };

  return originalCallApi(
    path,
    httpMethod,
    pathParams,
    queryParams,
    headerParams,
    formParams,
    bodyParam,
    authNames,
    contentTypes,
    accepts,
    returnType,
    apiBasePath,
    wrappedCallback
  );
};

// Export configured API instances
export const authApi = new AuthenticationApi(apiClient);
export const stockInventoryApi = new StockInventoryApi(apiClient);
export const rawInventoryApi = new RawInventoryApi(apiClient);
export const categoryApi = new CategoryApi(apiClient);
export const productApi = new ProductApi(apiClient);
export const ordersApi = new OrdersApi(apiClient);
export const subcontractApi = new SubcontractApi(apiClient);
export const subcontractingApi = new SubcontractingApi(apiClient);
export const invoicesApi = new InvoicesApi(apiClient);
export const paymentsApi = new PaymentsApi(apiClient);
export const imageApi = new ImageManagementApi(apiClient);
export const purchaseApiClient = new PurchaseApi(apiClient);
export const rejectionApi = new RejectionApi(apiClient);

// Helper function to convert callback-based API to Promise
export function promisify<T>(
  fn: (callback: (error: any, data: T, response: any) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((error: any, data: T, _response: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}
