import ForgingInwardApi from '../api-client/forging/src/api/ForgingInwardApi';
import ForgingOutwardApi from '../api-client/forging/src/api/ForgingOutwardApi';
import ForgingPartyApi from '../api-client/forging/src/api/PartyApi';
import ApiClient from '../api-client/inventory/src/ApiClient';
import { promisify } from '../lib/apiConfig';
import type { ForgingInward, ForgingInwardItem, ForgingOutward, ForgingParty } from '../types';

const BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL?.trim() || 'http://localhost:8080';

// Helper to download a PDF from a URL with auth
const downloadPdfBlob = async (endpoint: string, filename: string, queryParams?: Record<string, string>): Promise<void> => {
    const token = localStorage.getItem('accessToken');
    const url = new URL(`${BASE_URL}${endpoint}`);
    if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
            if (value) url.searchParams.append(key, value);
        });
    }
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
};

// Import shared API client (configured with auth interceptor)
const apiClient = ApiClient.instance;
const generatedForgingInwardApi = new ForgingInwardApi(apiClient);
const generatedForgingOutwardApi = new ForgingOutwardApi(apiClient);
const generatedForgingPartyApi = new ForgingPartyApi(apiClient);

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
        dateStr = String(date);
    }

    // Convert YYYY-MM-DD to DD/MM/YYYY
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
};

// Type conversion helpers for ForgingInward
const convertToForgingInward = (inward: any): ForgingInward => ({
    id: inward.id,
    partyId: inward.party?.partyId,
    partyName: inward.party?.partyName || inward.partyName || '',
    party: inward.party,
    challanNo: inward.challanNo || '',
    date: formatDateForUI(inward.date),
    weight: inward.weight || 0,
    weightUnit: inward.weightUnit,
    image: inward.image,
    item: inward.item ? {
        id: inward.item.id,
        inwardId: inward.item.inwardId,
        name: inward.item.name || '',
        ...(inward.item.pricePerKg != null ? { pricePerKg: inward.item.pricePerKg } : {}),
        ...(inward.item.lowStockAlert != null ? { lowStockAlert: inward.item.lowStockAlert } : {}),
        ...(inward.item.quantityInPc != null ? { quantityInPc: inward.item.quantityInPc } : {}),
        ...(inward.item.weightPerPc != null ? { weightPerPc: inward.item.weightPerPc } : {}),
    } : null,
});

const convertToForgingInwardRequest = (data: Omit<ForgingInward, 'id'>): any => ({
    partyId: data.partyId,
    challanNo: data.challanNo,
    date: formatDateForAPI(data.date),
    weight: data.weight,
    weightUnit: data.weightUnit,
    image: data.image,
});

// Type conversion helpers for ForgingOutward
const convertToForgingOutward = (outward: any): ForgingOutward => ({
    id: outward.id,
    partyId: outward.party?.partyId,
    partyName: outward.party?.partyName || outward.partyName || '',
    party: outward.party,
    challanNo: outward.challanNo || '',
    date: formatDateForUI(outward.date),
    weight: outward.weight || 0,
    weightUnit: outward.weightUnit,
    image: outward.image,
});

const convertToForgingOutwardRequest = (data: Omit<ForgingOutward, 'id'>): any => ({
    partyId: data.partyId,
    challanNo: data.challanNo,
    date: formatDateForAPI(data.date),
    weight: data.weight,
    weightUnit: data.weightUnit,
    image: data.image,
});

// Forging Inward API
export const forgingInwardApi = {
    // Get all forging inward records with optional date range
    getAll: (fromDate?: string, toDate?: string): Promise<ForgingInward[]> =>
        promisify<any>(cb =>
            generatedForgingInwardApi.searchForgingInwards({
                fromDate: fromDate ? formatDateForAPI(fromDate) : undefined,
                toDate: toDate ? formatDateForAPI(toDate) : undefined,
                page: 0,
                size: 1000, // Get all records
            }, cb)
        ).then(response => (response.content || []).map(convertToForgingInward)),

    // Create new forging inward record
    create: (data: Omit<ForgingInward, 'id'>): Promise<ForgingInward> =>
        promisify<any>(cb =>
            generatedForgingInwardApi.createForgingInward(convertToForgingInwardRequest(data), cb)
        ).then(convertToForgingInward),

    // Update existing forging inward record
    update: (id: number, data: Omit<ForgingInward, 'id'>): Promise<ForgingInward> =>
        promisify<any>(cb =>
            generatedForgingInwardApi.updateForgingInward(id, convertToForgingInwardRequest(data), cb)
        ).then(convertToForgingInward),

    // Delete forging inward record
    delete: (id: number): Promise<void> =>
        promisify<void>(cb => generatedForgingInwardApi.deleteForgingInward(id, cb)),

};

// Forging Outward API
export const forgingOutwardApi = {
    // Get all forging outward records with optional date range
    getAll: (fromDate?: string, toDate?: string): Promise<ForgingOutward[]> =>
        promisify<any>(cb =>
            generatedForgingOutwardApi.searchForgingOutwards({
                fromDate: fromDate ? formatDateForAPI(fromDate) : undefined,
                toDate: toDate ? formatDateForAPI(toDate) : undefined,
                page: 0,
                size: 1000, // Get all records
            }, cb)
        ).then(response => (response.content || []).map(convertToForgingOutward)),

    // Create new forging outward record
    create: (data: Omit<ForgingOutward, 'id'>): Promise<ForgingOutward> =>
        promisify<any>(cb =>
            generatedForgingOutwardApi.createForgingOutward(convertToForgingOutwardRequest(data), cb)
        ).then(convertToForgingOutward),

    // Update existing forging outward record
    update: (id: number, data: Omit<ForgingOutward, 'id'>): Promise<ForgingOutward> =>
        promisify<any>(cb =>
            generatedForgingOutwardApi.updateForgingOutward(id, convertToForgingOutwardRequest(data), cb)
        ).then(convertToForgingOutward),

    // Delete forging outward record
    delete: (id: number): Promise<void> =>
        promisify<void>(cb => generatedForgingOutwardApi.deleteForgingOutward(id, cb)),

};

// Helper for authenticated JSON fetch calls
const authFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...((options.headers as Record<string, string>) || {}),
        },
    });
    if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
};

// Forging Inward Items API — /api/v1/forging-inward/{inwardId}/items
export const forgingInwardItemsApi = {
    getAll: (inwardId: number): Promise<ForgingInwardItem[]> =>
        authFetch(`/api/v1/forging-inward/${inwardId}/items`).then((data: any[]) =>
            (data || []).map((item: any) => ({
                id: item.id,
                inwardId: item.inwardId,
                name: item.name || '',
            }))
        ),

    create: (inwardId: number, item: Omit<ForgingInwardItem, 'id' | 'inwardId'>): Promise<ForgingInwardItem> => {
        const body: Record<string, any> = { name: item.name };
        if (item.pricePerKg != null) body.pricePerKg = item.pricePerKg;
        if (item.lowStockAlert != null) body.lowStockAlert = item.lowStockAlert;
        if (item.quantityInPc != null) body.quantityInPc = item.quantityInPc;
        if (item.weightPerPc != null) body.weightPerPc = item.weightPerPc;
        return authFetch(`/api/v1/forging-inward/${inwardId}/items`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    },

    update: (inwardId: number, itemId: number, item: Omit<ForgingInwardItem, 'id' | 'inwardId'>): Promise<ForgingInwardItem> => {
        const body: Record<string, any> = { name: item.name };
        if (item.pricePerKg != null) body.pricePerKg = item.pricePerKg;
        if (item.lowStockAlert != null) body.lowStockAlert = item.lowStockAlert;
        if (item.quantityInPc != null) body.quantityInPc = item.quantityInPc;
        if (item.weightPerPc != null) body.weightPerPc = item.weightPerPc;
        return authFetch(`/api/v1/forging-inward/${inwardId}/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    },

    delete: (inwardId: number, itemId: number): Promise<void> =>
        authFetch(`/api/v1/forging-inward/${inwardId}/items/${itemId}`, {
            method: 'DELETE',
        }),
};

// Merged Forging PDF Report - single endpoint for both inward and outward
export const forgingReportApi = {
    downloadPdf: (partyName?: string, fromDate?: string, toDate?: string): Promise<void> =>
        downloadPdfBlob('/api/v1/forgings/pdf', 'forging-report.pdf', {
            ...(partyName ? { partyName } : {}),
            ...(fromDate ? { fromDate } : {}),
            ...(toDate ? { toDate } : {}),
        }),
};
// Party API for forging — uses /api/v1/forging-parties
export const forgingPartyApi = {
    getAll: (): Promise<ForgingParty[]> =>
        promisify<any[]>(cb => generatedForgingPartyApi.getAllParties(cb))
            .then(parties =>
                (parties || []).map((p: any) => ({
                    partyId: p.partyId,
                    partyName: p.partyName,
                }))
            ),

    createParty: (partyName: string): Promise<ForgingParty> =>
        promisify<any>(cb =>
            generatedForgingPartyApi.createParty({ partyName }, cb)
        ).then((p: any) => ({
            partyId: p.partyId,
            partyName: p.partyName,
        })),
};
