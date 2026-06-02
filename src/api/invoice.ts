import { invoicesApi as generatedInvoicesApi, promisify } from '../lib/apiConfig';
import type {
  Invoice,
  PaginatedResult,
  BillingType,
} from '../types';
import { InvoiceStatus, InvoiceFloor } from '../types';

export const invoiceApi = {
  // Get all invoices by floor with pagination
  getInvoiceList: (params: {
    floor: InvoiceFloor;
    mode: BillingType;
    page?: number;
    size?: number;
    status?: InvoiceStatus;
    search?: string;
  }): Promise<PaginatedResult<Invoice>> => {
    const { floor, mode, page, size, status, search } = params;
    return promisify<PaginatedResult<Invoice>>(cb =>
      generatedInvoicesApi.getInvoiceList(
        floor,
        mode,
        { page, size, status, search },
        cb
      )
    );
  },

  // Get invoice by ID
  getInvoiceById: (id: number): Promise<Invoice> =>
    promisify<Invoice>(cb => generatedInvoicesApi.getInvoiceById(id, cb)),

  // Delete invoice
  deleteInvoice: (id: number): Promise<void> =>
    promisify<void>(cb => generatedInvoicesApi.deleteInvoice(id, cb)),

  // Update invoice status
  updateInvoiceStatus: (id: number, invoiceStatus: InvoiceStatus): Promise<void> =>
    promisify<void>(cb => generatedInvoicesApi.updateInvoiceStatus(id, { invoiceStatus }, cb)),

  // Download invoice PDF
  downloadInvoicePdf: async (id: number): Promise<Blob> => {
    // Use direct fetch to bypass generated client issues with binary data
    const basePath = generatedInvoicesApi.apiClient.basePath;
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${basePath}/api/invoices/${id}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf',
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed with status: ${response.status}`);
    }

    return await response.blob();
  },
};
