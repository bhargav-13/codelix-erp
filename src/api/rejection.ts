import {
  rejectionApi as generatedRejectionApi,
  promisify,
} from '../lib/apiConfig';
import { apiClient } from './client';
import type {
  RejectionRequest,
  RejectionResponse,
  PaginatedResultRejection,
  RejectionReturnType,
} from '../types';

export const rejectionApi = {
  createRejection: (data: RejectionRequest): Promise<RejectionResponse> =>
    promisify<RejectionResponse>(cb => generatedRejectionApi.addRejection(data, cb)),

  getRejections: (
    page: number = 0,
    size: number = 10,
    returnType?: RejectionReturnType
  ): Promise<PaginatedResultRejection> =>
    promisify<PaginatedResultRejection>(cb =>
      generatedRejectionApi.getRejectionList({ page, size, returnType }, cb)
    ),

  getRejectionById: (rejectionId: number): Promise<RejectionResponse> =>
    promisify<RejectionResponse>(cb =>
      generatedRejectionApi.getRejectionById(rejectionId, cb)
    ),

  updateRejection: (rejectionId: number, data: RejectionRequest): Promise<RejectionResponse> =>
    promisify<RejectionResponse>(cb =>
      generatedRejectionApi.updateRejection(rejectionId, data, cb)
    ),

  deleteRejection: (rejectionId: number): Promise<void> =>
    promisify<void>(cb => generatedRejectionApi.deleteRejection(rejectionId, cb)),

  exportPdf: async (opts?: {
    partyId?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<void> => {
    const params: Record<string, any> = {};
    if (opts?.partyId) params.partyId = opts.partyId;
    if (opts?.fromDate) params.fromDate = opts.fromDate;
    if (opts?.toDate) params.toDate = opts.toDate;
    const response = await apiClient.get('/api/v1/rejection/export/pdf', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rejection-report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
