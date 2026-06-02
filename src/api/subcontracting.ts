import { apiClient } from './client';
import type {
  Subcontracting,
  SubOrderRequest,
  SubReturnRequest,
  PaginatedResult,
  SubcontractingBySubcontractInfo,
  SubcontractingBySubcontractList,
  Contractor,
  SubItem,
} from '../types';
import { SubcontractingStatus } from '../types';

export const subcontractingApi = {
  // Get all contractors
  getContractorList: async (): Promise<Contractor[]> => {
    const response = await apiClient.get<Contractor[]>('/api/v1/contractor');
    return response.data;
  },

  // Add new contractor
  addContractor: async (name: string): Promise<Contractor> => {
    const response = await apiClient.post<Contractor>('/api/v1/contractor', { name });
    return response.data;
  },

  // Get all subitems
  getSubItemList: async (): Promise<SubItem[]> => {
    const response = await apiClient.get<SubItem[]>('/api/v1/subitem');
    return response.data;
  },

  // Add new subitem
  addSubItem: async (name: string): Promise<SubItem> => {
    const response = await apiClient.post<SubItem>('/api/v1/subitem', { name });
    return response.data;
  },

  // Create new subcontracting order
  addSubcontracting: async (data: SubOrderRequest): Promise<Subcontracting> => {
    const response = await apiClient.post<Subcontracting>('/api/v1/subcontracting', data);
    return response.data;
  },

  // Get all subcontracting orders with pagination
  getSubcontractingList: async (params: {
    page?: number;
    size?: number;
    status?: SubcontractingStatus;
    search?: string;
  }): Promise<PaginatedResult<Subcontracting>> => {
    const response = await apiClient.get<PaginatedResult<Subcontracting>>('/api/v1/subcontracting', {
      params,
    });
    return response.data;
  },

  // Get subcontracting order by ID
  getSubcontractingById: async (id: number): Promise<Subcontracting> => {
    const response = await apiClient.get<Subcontracting>(`/api/v1/subcontracting/${id}`);
    return response.data;
  },

  // Update subcontracting order
  updateSubcontracting: async (id: number, data: SubOrderRequest): Promise<Subcontracting> => {
    const response = await apiClient.put<Subcontracting>(`/api/v1/subcontracting/${id}`, data);
    return response.data;
  },

  // Delete subcontracting order
  deleteSubcontracting: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/subcontracting/${id}`);
  },

  // Return subcontracting record
  returnSubcontracting: async (id: number, data: SubReturnRequest): Promise<Subcontracting> => {
    const response = await apiClient.post<Subcontracting>(
      `/api/v1/subcontracting/${id}/return`,
      data
    );
    return response.data;
  },

  // Update subcontracting status
  updateSubcontractingStatus: async (id: number, status: SubcontractingStatus): Promise<void> => {
    await apiClient.patch(`/api/v1/subcontracting/${id}/status`, { status });
  },

  // Get all subcontractors list (for Subcontract page)
  getSubcontractingListBySubcontract: async (search?: string): Promise<SubcontractingBySubcontractInfo[]> => {
    const response = await apiClient.get<SubcontractingBySubcontractInfo[]>(
      '/api/v1/subcontracting/getBySubcontract',
      { params: search ? { search } : {} }
    );
    return response.data;
  },

  // Get subcontract details by contractor name with date range
  getSubcontractByCustomerName: async (
    contractorName: string,
    startDate: string,
    endDate: string
  ): Promise<SubcontractingBySubcontractList> => {
    const response = await apiClient.get<SubcontractingBySubcontractList>(
      `/api/v1/subcontracting/getBySubcontract/${encodeURIComponent(contractorName)}`,
      { params: { startDate, endDate } }
    );
    return response.data;
  },

  // Download subcontract PDF by contractor name
  getSubcontractByCustomerNamePdf: async (
    contractorName: string,
    startDate: string,
    endDate: string
  ): Promise<Blob> => {
    const response = await apiClient.get(
      `/api/v1/subcontracting/getBySubcontract/${encodeURIComponent(contractorName)}/pdf`,
      {
        params: { startDate, endDate },
        responseType: 'blob',
      }
    );
    return response.data;
  },
};
