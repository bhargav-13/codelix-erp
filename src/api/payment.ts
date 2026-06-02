import { paymentsApi as generatedPaymentsApi, promisify } from '../lib/apiConfig';
import type {
  Payment,
  PaginatedResult,
  PaymentReceiveRequest,
  PartyLedgerResponse,
} from '../types';
import { PaymentStatus, PaymentFloor, BillingType } from '../types';

export const paymentApi = {
  // Get all payments by floor with pagination
  getPaymentList: (params: {
    floor: PaymentFloor;
    mode?: BillingType;
    page?: number;
    size?: number;
    status?: PaymentStatus;
    search?: string;
  }): Promise<PaginatedResult<Payment>> => {
    const { floor, mode, page, size, status, search } = params;
    return promisify<PaginatedResult<Payment>>(cb =>
      generatedPaymentsApi.getPaymentsByFloor(
        floor,
        { mode, page, size, status, search },
        cb
      )
    );
  },

  // Get payment by order ID and billing mode
  getPaymentByOrderAndMode: (orderId: number, mode: BillingType): Promise<Payment> =>
    promisify<Payment>(cb => generatedPaymentsApi.getPaymentByOrderAndMode(orderId, mode, cb)),

  // Get payment by ID
  getPaymentById: (id: number): Promise<Payment> =>
    promisify<Payment>(cb => generatedPaymentsApi.getPaymentById(id, cb)),

  // Delete payment
  deletePayment: (id: number): Promise<void> =>
    promisify<void>(cb => generatedPaymentsApi.deletePayment(id, cb)),

  // Update payment status
  updatePaymentStatus: (id: number, paymentStatus: PaymentStatus): Promise<Payment> =>
    promisify<Payment>(cb => generatedPaymentsApi.updatePaymentStatus(id, { paymentStatus }, cb)),

  // Receive payment (record new payment)
  receivePayment: (id: number, data: PaymentReceiveRequest): Promise<Payment> =>
    promisify<Payment>(cb => generatedPaymentsApi.receivePayment(id, data, cb)),

  // Send manual reminder
  sendReminder: (id: number): Promise<void> =>
    promisify<void>(cb => generatedPaymentsApi.sendManualReminder(id, cb)),

  // Get party ledger
  getPartyLedger: (partyId: number, startDate: string, endDate: string): Promise<PartyLedgerResponse> =>
    promisify<PartyLedgerResponse>(cb =>
      generatedPaymentsApi.getPartyLedger(partyId, startDate as any, endDate as any, cb)
    ),

  // Download party ledger PDF — use native fetch for a clean binary blob.
  // The superagent-based generated client can corrupt binary responses in browsers.
  getPartyLedgerPdf: async (partyId: number, startDate: string, endDate: string): Promise<Blob> => {
    const BASE_URL =
      (import.meta as any).env?.VITE_API_BASE_URL?.trim() || 'http://localhost:8080';
    const token = localStorage.getItem('accessToken');
    const url = `${BASE_URL}/api/v1/payments/party-ledger/${partyId}/pdf?startDate=${startDate}&endDate=${endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`PDF download failed: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  },
};
