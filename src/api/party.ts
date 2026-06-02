import PartyApi from '../api-client/order-management/src/api/PartyApi';
import { promisify } from '../lib/apiConfig';
import type { Party, OrderByPartyResponse } from '../types';

// Import shared API client (configured with auth interceptor)
import ApiClient from '../api-client/inventory/src/ApiClient';
const apiClient = ApiClient.instance;
const generatedPartyApi = new PartyApi(apiClient);

// Type conversion helpers
const convertToParty = (orderParty: any): Party => ({
    partyId: orderParty.id || 0,
    name: orderParty.name || '',
    officialAmount: orderParty.officialAmount || 0,
    offlineAmount: orderParty.offlineAmount || 0,
});

const convertToNewOrderParty = (data: { name: string; officialAmount: number; offlineAmount: number }): any => ({
    name: data.name,
    officialAmount: data.officialAmount,
    offlineAmount: data.offlineAmount,
});

const convertToOrderByPartyResponse = (response: any): OrderByPartyResponse => ({
    name: response.name || '',
    orders: (response.orders || []).map((order: any) => ({
        orderDate: order.orderDate || '',
        officialInvoiceId: order.officialInvoiceId || 0,
        offlineInvoiceId: order.offlineInvoiceId || 0,
        officialTotalAmount: order.officialTotalAmount || 0,
        offlineTotalAmount: order.offlineTotalAmount || 0,
    })),
});

// Party API
export const partyApi = {
    // Get all parties with optional search
    getAllParties: (search?: string): Promise<Party[]> =>
        promisify<any[]>(cb =>
            generatedPartyApi.getAllParties({ search }, cb)
        ).then(parties => parties.map(convertToParty)),

    // Get party by ID
    getPartyById: (id: number): Promise<Party> =>
        promisify<any>(cb =>
            generatedPartyApi.getPartyById(id, cb)
        ).then(convertToParty),

    // Create new party
    createParty: (data: { name: string; officialAmount: number; offlineAmount: number }): Promise<Party> =>
        promisify<any>(cb =>
            generatedPartyApi.createParty(convertToNewOrderParty(data), cb)
        ).then(convertToParty),

    // Update existing party
    updateParty: (id: number, data: { name: string; officialAmount: number; offlineAmount: number }): Promise<Party> =>
        promisify<any>(cb =>
            generatedPartyApi.updateParty(id, convertToNewOrderParty(data), cb)
        ).then(convertToParty),

    // Delete party
    deleteParty: (id: number): Promise<void> =>
        promisify<void>(cb => generatedPartyApi.deleteParty(id, cb)),

    // Get all orders grouped by party
    getOrdersByParty: (search?: string): Promise<OrderByPartyResponse[]> =>
        promisify<any[]>(cb =>
            generatedPartyApi.getOrderListByParty({ search }, cb)
        ).then(responses => responses.map(convertToOrderByPartyResponse)),

    // Get orders for specific party by name
    getOrdersByPartyName: (partyName: string): Promise<OrderByPartyResponse> =>
        promisify<any>(cb =>
            generatedPartyApi.getOrderByPartyName(partyName, cb)
        ).then(response => {
            if (!response || typeof response !== 'object') {
                return { name: partyName, orders: [] };
            }
            return convertToOrderByPartyResponse(response);
        }).catch(() => ({ name: partyName, orders: [] })),

    // Download PDF for specific party
    downloadPartyPdf: async (partyName: string): Promise<Blob> => {
        // Use fetch directly for PDF download to handle binary response properly
        const token = localStorage.getItem('accessToken');
        const baseUrl = apiClient.basePath || 'http://localhost:8080';

        const response = await fetch(`${baseUrl}/api/v1/order/getByParty/${encodeURIComponent(partyName)}/pdf`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to download PDF: ${response.statusText}`);
        }

        return await response.blob();
    },
};
