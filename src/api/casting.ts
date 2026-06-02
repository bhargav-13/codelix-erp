import CastingApi from '../api-client/casting/src/api/CastingApi';
import CastingSaleApi from '../api-client/casting/src/api/CastingSaleApi';
import { promisify } from '../lib/apiConfig';
import type { CastingEntry, CastingSale } from '../types';

// Import shared API client (configured with auth interceptor)
import ApiClient from '../api-client/inventory/src/ApiClient';
const apiClient = ApiClient.instance;
const generatedCastingApi = new CastingApi(apiClient);
const generatedCastingSaleApi = new CastingSaleApi(apiClient);

// Date conversion utilities
const formatDateForAPI = (dateStr: string): string => {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
};

const formatDateForUI = (date: string | Date): string => {
    // Handle null/undefined
    if (!date) return '';

    // If it's a Date object, convert to YYYY-MM-DD string first
    let dateStr: string;
    if (date instanceof Date) {
        dateStr = date.toISOString().split('T')[0];
    } else if (typeof date === 'string') {
        dateStr = date;
    } else {
        // If it's an object with date properties, try to extract the date string
        dateStr = String(date);
    }

    // Convert YYYY-MM-DD to DD/MM/YYYY
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
};

// Type conversion helpers for Casting
const convertToCastingEntry = (casting: any): CastingEntry => ({
    id: casting.id,
    date: formatDateForUI(casting.date),
    mell: casting.mellWeight || 0,
});

const convertToCastingRequest = (data: Omit<CastingEntry, 'id'>): any => ({
    date: formatDateForAPI(data.date),
    mellWeight: data.mell,
});

// Type conversion helpers for CastingSale
const convertToCastingSale = (sale: any): CastingSale => ({
    id: sale.id,
    date: formatDateForUI(sale.date),
    brass: sale.brassWeight,
    kadi: sale.kadiWeight,
    kadiRate: sale.kadiRate,
    kadiAmount: sale.kadiAmount,
    lokhand: sale.lokhandWeight,
    lokhandRate: sale.lokhandRate,
    lokhandAmount: sale.lokhandAmount,
    totalAmount: sale.totalAmount,
});

const convertToCastingSaleRequest = (data: Omit<CastingSale, 'id' | 'totalAmount'>): any => ({
    date: formatDateForAPI(data.date),
    brassWeight: data.brass,
    kadiWeight: data.kadi,
    kadiRate: data.kadiRate,
    kadiAmount: data.kadiAmount,
    lokhandWeight: data.lokhand,
    lokhandRate: data.lokhandRate,
    lokhandAmount: data.lokhandAmount,
    totalAmount: (data.kadiAmount || 0) + (data.lokhandAmount || 0),
});

// Casting API
export const castingApi = {
    // Get all castings with optional date range
    getAllCastings: (fromDate?: string, toDate?: string): Promise<CastingEntry[]> =>
        promisify<any>(cb =>
            generatedCastingApi.searchCastings({
                fromDate: fromDate ? formatDateForAPI(fromDate) : undefined,
                toDate: toDate ? formatDateForAPI(toDate) : undefined,
                page: 0,
                size: 1000, // Get all records
            }, cb)
        ).then(response => (response.content || []).map(convertToCastingEntry)),

    // Create new casting entry
    createCasting: (data: Omit<CastingEntry, 'id'>): Promise<CastingEntry> =>
        promisify<any>(cb =>
            generatedCastingApi.createCasting(convertToCastingRequest(data), cb)
        ).then(convertToCastingEntry),

    // Update existing casting entry
    updateCasting: (id: number, data: Omit<CastingEntry, 'id'>): Promise<CastingEntry> =>
        promisify<any>(cb =>
            generatedCastingApi.updateCasting(id, convertToCastingRequest(data), cb)
        ).then(convertToCastingEntry),

    // Delete casting entry
    deleteCasting: (id: number): Promise<void> =>
        promisify<void>(cb => generatedCastingApi.deleteCasting(id, cb)),

    // Download casting PDF
    downloadCastingPdf: async (fromDate?: string, toDate?: string): Promise<Blob> => {
        const token = localStorage.getItem('accessToken');
        const baseUrl = apiClient.basePath || 'http://localhost:8080';

        const params = new URLSearchParams();
        if (fromDate) params.append('fromDate', formatDateForAPI(fromDate));
        if (toDate) params.append('toDate', formatDateForAPI(toDate));

        const queryString = params.toString();
        const url = `${baseUrl}/api/v1/casting/pdf${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
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

// Casting Sale API
export const castingSaleApi = {
    // Get all casting sales
    getAllCastingSales: (): Promise<CastingSale[]> =>
        promisify<any>(cb =>
            generatedCastingSaleApi.searchCastingSales({
                page: 0,
                size: 1000, // Get all records
            }, cb)
        ).then(response => (response.content || []).map(convertToCastingSale)),

    // Create new casting sale
    createCastingSale: (data: Omit<CastingSale, 'id' | 'totalAmount'>): Promise<CastingSale> =>
        promisify<any>(cb =>
            generatedCastingSaleApi.createCastingSale(convertToCastingSaleRequest(data), cb)
        ).then(convertToCastingSale),

    // Update existing casting sale
    updateCastingSale: (id: number, data: Omit<CastingSale, 'id' | 'totalAmount'>): Promise<CastingSale> =>
        promisify<any>(cb =>
            generatedCastingSaleApi.updateCastingSale(id, convertToCastingSaleRequest(data), cb)
        ).then(convertToCastingSale),

    // Delete casting sale
    deleteCastingSale: (id: number): Promise<void> =>
        promisify<void>(cb => generatedCastingSaleApi.deleteCastingSale(id, cb)),

    // Download casting sale PDF
    downloadCastingSalePdf: async (fromDate?: string, toDate?: string): Promise<Blob> => {
        const token = localStorage.getItem('accessToken');
        const baseUrl = apiClient.basePath || 'http://localhost:8080';

        const params = new URLSearchParams();
        if (fromDate) params.append('fromDate', formatDateForAPI(fromDate));
        if (toDate) params.append('toDate', formatDateForAPI(toDate));

        const queryString = params.toString();
        const url = `${baseUrl}/api/v1/casting-sale/pdf${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
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
