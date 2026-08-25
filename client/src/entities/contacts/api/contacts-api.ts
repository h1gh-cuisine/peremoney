import { apiClient } from '@/shared/api';
import type { Contact, ContactStatus } from '../model/types';

export interface ApiContact { id: string; date: string; status: string; mobileTel: string; site: string | null; mobileOperator: string | null; }

export function mapContactFromApi(value: ApiContact): Contact {
  return { id: value.id, date: value.date.slice(0, 10), status: value.status as ContactStatus,
    mobileTel: value.mobileTel, site: value.site ?? '', mobileOperator: value.mobileOperator ?? '' };
}

export async function fetchContacts(cabinetId: string): Promise<Contact[]> {
  const values = await apiClient().get<ApiContact[]>(`/cabinets/${cabinetId}/contacts`);
  return values.map(mapContactFromApi);
}
