import { apiClient } from '@/shared/api';
import type { Payment, UnitBalance } from '../model/types';

export interface ApiPayment { id: string; invoiceNo?: string; amount: string | number; unitPrice?: string | number; quantity: number; status: 'PAID' | 'PENDING'; createdAt: string; tochkaDocumentId?: string | null; }
export function mapPaymentFromApi(value: ApiPayment): Payment {
  return { id: value.id, amount: Number(value.amount), quantity: value.quantity,
    status: value.status === 'PAID' ? 'paid' : 'pending', createdAt: value.createdAt.slice(0, 10),
    ...(value.tochkaDocumentId ? { documentId: value.tochkaDocumentId } : {}),
    ...(value.invoiceNo ? { invoiceNo: value.invoiceNo } : {}),
    ...(value.unitPrice !== undefined ? { unitPrice: Number(value.unitPrice) } : {}) };
}
export function mapSummaryFromApi(value: { totalUnits: number; usedUnits: number; moneyBalance: string | number }) {
  return { unitBalance: { totalUnits: value.totalUnits, usedUnits: value.usedUnits } satisfies UnitBalance,
    moneyBalance: Number(value.moneyBalance) };
}
export async function fetchFinance(cabinetId: string) {
  const [payments, summary] = await Promise.all([
    apiClient().get<ApiPayment[]>(`/cabinets/${cabinetId}/finance/payments`),
    apiClient().get<{ totalUnits: number; usedUnits: number; moneyBalance: string | number }>(`/cabinets/${cabinetId}/finance/summary`),
  ]);
  return { payments: payments.map(mapPaymentFromApi), ...mapSummaryFromApi(summary) };
}
export async function createInvoice(cabinetId: string, quantity: number, idempotencyKey: string) {
  const result = await apiClient().post<{ payment: ApiPayment }>(`/cabinets/${cabinetId}/finance/invoices`, { quantity, idempotencyKey });
  return mapPaymentFromApi(result.payment);
}
export function createClosingAct(cabinetId: string, paymentIds: string[]) {
  return apiClient().post(`/cabinets/${cabinetId}/finance/closing-acts`, { paymentIds });
}
