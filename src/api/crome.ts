import { apiClient } from './client';
import type {
  Party,
  CromeRequest,
  CromeReturnRequest,
  Crome,
  SubcontractingCromeInfo,
  SubReturnCromeInfo,
  PaginatedResult,
} from '../types';
import { SubcontractingStatus } from '../types';

export const cromeApi = {
  // Get all parties
  getPartyList: async (): Promise<Party[]> => {
    const response = await apiClient.get<Party[]>('/api/v1/party');
    return response.data;
  },

  // Add new party
  addParty: async (name: string): Promise<Party> => {
    const response = await apiClient.post<Party>('/api/v1/party', { name });
    return response.data;
  },

  // Get subcontracting info for creating crome
  getSubcontractingCromeInfo: async (subcontractingId: number): Promise<SubcontractingCromeInfo> => {
    const response = await apiClient.get<SubcontractingCromeInfo>(
      `/api/v1/subcontracting/${subcontractingId}/crome-info`
    );
    return response.data;
  },

  // Get available crome stock for a specific subcontracting return
  getSubReturnCromeInfo: async (returnId: number): Promise<SubReturnCromeInfo> => {
    const response = await apiClient.get<SubReturnCromeInfo>(
      `/api/v1/subcontracting-return/${returnId}/available-crome`
    );
    return response.data;
  },

  // Get all cromes for a subcontracting order
  getCromesBySubcontractingId: async (subcontractingId: number): Promise<Crome[]> => {
    const response = await apiClient.get<Crome[]>(
      `/api/v1/subcontracting/${subcontractingId}/cromes`
    );
    return response.data;
  },

  // Create new crome
  addCrome: async (data: CromeRequest): Promise<Crome> => {
    const response = await apiClient.post<Crome>('/api/v1/crome', data);
    return response.data;
  },

  // Get all crome orders with pagination
  getCromeList: async (params: {
    page?: number;
    size?: number;
    status?: SubcontractingStatus;
    search?: string;
  }): Promise<PaginatedResult<Crome>> => {
    const response = await apiClient.get<PaginatedResult<Crome>>('/api/v1/crome', {
      params,
    });
    return response.data;
  },

  // Get crome by ID
  getCromeById: async (cromeId: number): Promise<Crome> => {
    const response = await apiClient.get<Crome>(`/api/v1/crome/${cromeId}`);
    return response.data;
  },

  // Update crome
  updateCrome: async (cromeId: number, data: CromeRequest): Promise<Crome> => {
    const response = await apiClient.put<Crome>(`/api/v1/crome/${cromeId}`, data);
    return response.data;
  },

  // Delete crome
  deleteCrome: async (cromeId: number): Promise<void> => {
    await apiClient.delete(`/api/v1/crome/${cromeId}`);
  },

  // Update crome status
  updateCromeStatus: async (cromeId: number, status: SubcontractingStatus): Promise<void> => {
    await apiClient.patch(`/api/v1/crome/${cromeId}/status`, { status });
  },

  // Record crome return
  returnCrome: async (cromeId: number, data: CromeReturnRequest): Promise<Crome> => {
    const response = await apiClient.post<Crome>(`/api/v1/crome/${cromeId}/return`, data);
    return response.data;
  },

  // Get crome report PDF
  getCromeReportPdf: async (partyName: string | null, startDate: string, endDate: string): Promise<Blob> => {
    const params: any = { startDate, endDate };

    // Add partyName as optional query parameter if provided
    if (partyName) {
      params.partyName = partyName;
    }

    const response = await apiClient.get('/api/v1/crome/report/pdf', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
