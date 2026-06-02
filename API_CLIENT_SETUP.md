# API Client Generation Setup

This project uses OpenAPI Generator CLI to automatically generate TypeScript API clients from OpenAPI/Swagger specifications.

## Generated Files

API clients are generated in `src/api/generated/` and include:

- **user-management** - Authentication and user management APIs
- **image-management** - Image upload and management APIs
- **inventory** - Category, Product, Raw and Stock inventory APIs
- **invoice-payment** - Invoice and payment management APIs
- **order-management** - Order management APIs
- **subcontracting** - Subcontracting APIs

## How to Regenerate Clients

Whenever you update the API contracts in `api_contracts/*.yaml`, regenerate the clients:

### On Unix/Mac/Linux:
```bash
npm run generate:api
```

### On Windows (PowerShell):
```powershell
.\generate-api-clients.ps1
```

### On Windows (Git Bash):
```bash
bash generate-api-clients.sh
```

## Usage Examples

### Basic Setup

All API clients are exported from `src/api/index.ts`:

```typescript
import {
  authApi,
  userManagementApi,
  stockInventoryApi,
  ordersApi
} from './api';
```

### Authentication

```typescript
import { authApi } from './api';
import type { SignInRequest } from './api';

const signIn = async (username: string, password: string) => {
  const request: SignInRequest = { username, password };
  const response = await authApi.signIn(request);

  // Save tokens
  localStorage.setItem('accessToken', response.data.accessToken);
  localStorage.setItem('refreshToken', response.data.refreshToken);

  return response.data;
};
```

### Fetching Data

```typescript
import { stockInventoryApi } from './api';

const fetchStockItems = async () => {
  try {
    const response = await stockInventoryApi.getAllStockItems(1, 10, 'AVAILABLE');
    console.log(response.data);
  } catch (error) {
    console.error('Error fetching stock items:', error);
  }
};
```

### Creating Resources

```typescript
import { ordersApi } from './api';
import type { OrderRequest } from './api';

const createOrder = async (orderData: OrderRequest) => {
  try {
    const response = await ordersApi.createOrder(orderData);
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};
```

## Configuration

### Base URL

Set the API base URL using environment variable:

```env
VITE_API_BASE_URL=https://parmeshwari-erp.onrender.com
```

Default: `http://localhost:8080`

### Authentication

The API configuration in `src/api/config.ts` automatically includes the access token from localStorage in all requests.

## Type Safety

All API clients are fully typed with TypeScript. Import types from the generated models:

```typescript
import type {
  User,
  StockItem,
  Order,
  OrderRequest,
  InventoryStatus
} from './api';
```

## Benefits

1. **Type Safety** - Full TypeScript support with autocomplete
2. **No Manual Updates** - Regenerate clients when API changes
3. **Consistent API Calls** - Same pattern across all endpoints
4. **Automatic Token Management** - Auth tokens automatically included
5. **Error Handling** - Typed error responses

## More Examples

See `src/api/examples.ts` for more usage examples.
