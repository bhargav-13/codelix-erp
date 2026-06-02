import ElectricOutwardApi from '../api-client/electric/src/api/ElectricOutwardApi';
import ElectricCreditApi from '../api-client/electric/src/api/ElectricCreditApi';
import { promisify } from '../lib/apiConfig';
import type { ElectricOutward, ElectricCredit } from '../types';
import ApiClient from '../api-client/inventory/src/ApiClient';

const BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL?.trim() || 'http://localhost:8080';

const apiClient = ApiClient.instance;
const generatedOutwardApi = new ElectricOutwardApi(apiClient);
const generatedCreditApi = new ElectricCreditApi(apiClient);

// ─── Date helpers ─────────────────────────────────────────────
const formatDateForUI = (date: string | Date): string => {
    if (!date) return '';
    let dateStr: string;
    if (date instanceof Date) {
        dateStr = date.toISOString().split('T')[0];
    } else {
        dateStr = String(date);
    }
    // YYYY-MM-DD → DD/MM/YYYY
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
};

const formatDateForAPI = (dateStr: string): string => {
    // DD/MM/YYYY → YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateStr; // already YYYY-MM-DD (from native date input)
};

// ─── Converters: ElectricOutward ──────────────────────────────
const toElectricOutward = (o: any): ElectricOutward => ({
    id: o.id,
    date: formatDateForUI(o.date),
    challanNo: o.challanNo || '',
    weight: o.weight ?? 0,
    perKgWeight: o.perKgWeight ?? 0,
    unit: o.unit ?? 0,
    unitRate: o.unitRate ?? 0,
    totalUnitAmount: o.totalUnitAmount ?? 0,
    totalWeightAmount: o.totalWeightAmount ?? 0,
    totalAmount: o.totalAmount ?? 0,
});

const toElectricOutwardRequest = (data: Omit<ElectricOutward, 'id' | 'totalUnitAmount' | 'totalWeightAmount' | 'totalAmount'>): any => ({
    date: formatDateForAPI(data.date),
    challanNo: data.challanNo,
    weight: data.weight,
    perKgWeight: data.perKgWeight,
    unit: data.unit,
    unitRate: data.unitRate,
});

// ─── Converters: ElectricCredit ───────────────────────────────
const toElectricCredit = (c: any): ElectricCredit => ({
    id: c.id,
    date: formatDateForUI(c.date),
    challanNo: c.challanNo || '',
    rate: c.rate ?? 0,
});

const toElectricCreditRequest = (data: Omit<ElectricCredit, 'id'>): any => ({
    date: formatDateForAPI(data.date),
    challanNo: data.challanNo,
    rate: data.rate,
});

// ─── PDF download helper ──────────────────────────────────────
const downloadPdfBlob = async (
    endpoint: string,
    filename: string,
    queryParams?: Record<string, string>
): Promise<void> => {
    const token = localStorage.getItem('accessToken');
    const url = new URL(`${BASE_URL}${endpoint}`);
    if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
            if (value) url.searchParams.append(key, value);
        });
    }
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!response.ok) throw new Error(`Failed to download PDF: ${response.statusText}`);
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

// ─── ElectricOutward API ──────────────────────────────────────
export const electricOutwardApi = {
    getAll: (): Promise<ElectricOutward[]> =>
        promisify<any>(cb =>
            generatedOutwardApi.searchElectricOutwards({ page: 0, size: 1000 }, cb)
        ).then(res => (res.content || []).map(toElectricOutward)),

    create: (data: Omit<ElectricOutward, 'id' | 'totalUnitAmount' | 'totalWeightAmount' | 'totalAmount'>): Promise<ElectricOutward> =>
        promisify<any>(cb =>
            generatedOutwardApi.createElectricOutward(toElectricOutwardRequest(data), cb)
        ).then(toElectricOutward),

    update: (id: number, data: Omit<ElectricOutward, 'id' | 'totalUnitAmount' | 'totalWeightAmount' | 'totalAmount'>): Promise<ElectricOutward> =>
        promisify<any>(cb =>
            generatedOutwardApi.updateElectricOutward(id, toElectricOutwardRequest(data), cb)
        ).then(toElectricOutward),

    delete: (id: number): Promise<void> =>
        promisify<void>(cb => generatedOutwardApi.deleteElectricOutward(id, cb)),

    // fromDate/toDate: YYYY-MM-DD
    downloadPdf: (fromDate?: string, toDate?: string): Promise<void> =>
        downloadPdfBlob('/api/v1/electric-outward/export/pdf', 'electric-outward-report.pdf', {
            ...(fromDate ? { fromDate } : {}),
            ...(toDate ? { toDate } : {}),
        }),
};

// ─── ElectricCredit API ───────────────────────────────────────
export const electricCreditApi = {
    getAll: (): Promise<ElectricCredit[]> =>
        promisify<any>(cb =>
            generatedCreditApi.searchElectricCredits({ page: 0, size: 1000 }, cb)
        ).then(res => (res.content || []).map(toElectricCredit)),

    create: (data: Omit<ElectricCredit, 'id'>): Promise<ElectricCredit> =>
        promisify<any>(cb =>
            generatedCreditApi.createElectricCredit(toElectricCreditRequest(data), cb)
        ).then(toElectricCredit),

    update: (id: number, data: Omit<ElectricCredit, 'id'>): Promise<ElectricCredit> =>
        promisify<any>(cb =>
            generatedCreditApi.updateElectricCredit(id, toElectricCreditRequest(data), cb)
        ).then(toElectricCredit),

    delete: (id: number): Promise<void> =>
        promisify<void>(cb => generatedCreditApi.deleteElectricCredit(id, cb)),
};

// Legacy – keeps old import working if anything still references it
export const electricApi = electricOutwardApi;
