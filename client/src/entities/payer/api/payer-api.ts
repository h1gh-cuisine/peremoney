import { apiClient } from '@/shared/api';
import type { PayerDetails } from '../model/types';

export const EMPTY_PAYER: PayerDetails = { organizationName: '', inn: '', kpp: '', ogrn: '', legalAddress: '', bankName: '', bik: '', checkingAccount: '', correspondentAccount: '', phone: '', email: '' };
export function mapPayerFromApi(value: { data?: Record<string, unknown> } | null): PayerDetails {
  const data = value?.data ?? {};
  return Object.fromEntries(Object.keys(EMPTY_PAYER).map((key) => [key, typeof data[key] === 'string' ? data[key] : ''])) as unknown as PayerDetails;
}
export async function fetchPayer(cabinetId: string) {
  return mapPayerFromApi(await apiClient().get<{ data: Record<string, unknown> } | null>(`/cabinets/${cabinetId}/payer`));
}
export function savePayer(cabinetId: string, data: PayerDetails) {
  return apiClient().put(`/cabinets/${cabinetId}/payer`, { data });
}
