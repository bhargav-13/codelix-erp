import ApiClient from '../api-client/inventory/src/ApiClient';
import { promisify } from '../lib/apiConfig';
import type { PurchaseParty, PurchasePartyRequest } from '../types';

const apiClient = ApiClient.instance;

function callApi<T>(path: string, method: string, body?: any): Promise<T> {
  return promisify<T>(cb =>
    apiClient.callApi(
      path, method,
      {}, {}, {}, {},
      body ?? null,
      ['oauth2'],
      body ? ['application/json'] : [],
      ['application/json'],
      Object,
      null,
      cb
    )
  ) as Promise<T>;
}

const toParty = (p: any): PurchaseParty => ({
  id: p.id,
  name: p.name,
  officialAmount: p.officialAmount ?? 0,
  offlineAmount: p.offlineAmount ?? 0,
});

export const purchasePartyApi = {
  getAll: (search?: string): Promise<PurchaseParty[]> =>
    promisify<any>(cb =>
      apiClient.callApi(
        '/api/v1/purchase/parties', 'GET',
        {}, search ? { search } : {}, {}, {},
        null,
        ['oauth2'], [], ['application/json'],
        Object,
        null,
        cb
      )
    ).then((data: any) => (Array.isArray(data) ? data : []).map(toParty)),

  create: (data: PurchasePartyRequest): Promise<PurchaseParty> =>
    callApi<any>('/api/v1/purchase/parties', 'POST', data).then(toParty),

  update: (id: number, data: PurchasePartyRequest): Promise<PurchaseParty> =>
    callApi<any>(`/api/v1/purchase/parties/${id}`, 'PUT', data).then(toParty),

  delete: (id: number): Promise<void> =>
    promisify<void>(cb =>
      apiClient.callApi(
        `/api/v1/purchase/parties/${id}`, 'DELETE',
        {}, {}, {}, {}, null,
        ['oauth2'], [], [],
        null, null, cb
      )
    ),
};
