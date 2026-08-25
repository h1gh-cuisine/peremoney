import { apiClient } from '@/shared/api';
import type { Lead, LeadRecording, LeadStatus } from '../model/types';

type ApiLeadStatus = 'UNPROCESSED' | 'NEGOTIATION' | 'NOT_TARGET' | 'REFUSAL' | 'BOUGHT';
const FROM_API: Record<ApiLeadStatus, LeadStatus> = { UNPROCESSED: 'not_processed', NEGOTIATION: 'negotiation', NOT_TARGET: 'not_relevant', REFUSAL: 'rejected', BOUGHT: 'purchased' };
const TO_API: Record<LeadStatus, ApiLeadStatus> = { not_processed: 'UNPROCESSED', negotiation: 'NEGOTIATION', not_relevant: 'NOT_TARGET', rejected: 'REFUSAL', purchased: 'BOUGHT' };

export interface ApiLead {
  id: string; successDate: string; comment: string | null; feedback: string; saleStatus: ApiLeadStatus;
  amount: string | number; contact: { providerAnswerId: number | null; mobileTel: string; site: string | null };
}
export interface EditableLeadFields { feedback: string; status: LeadStatus; amount: number | null; }

export function mapLeadFromApi(value: ApiLead): Lead {
  const displayId = value.contact.providerAnswerId === null
    ? value.id.replace(/\D/g, '') || '0'
    : String(value.contact.providerAnswerId);
  return { id: value.id, displayId, successDate: value.successDate.slice(0, 10), mobileTel: value.contact.mobileTel,
    name: value.comment ?? '', site: value.contact.site ?? '', recordings: [], feedback: value.feedback,
    status: FROM_API[value.saleStatus], amount: Number(value.amount) };
}
export function leadPatchToApi(fields: EditableLeadFields) {
  return { feedback: fields.feedback, saleStatus: TO_API[fields.status], amount: fields.amount ?? 0 };
}
export function mapRecordingsFromApi(values: Array<{ id?: string | number; link: string; date: string }>): LeadRecording[] {
  return values.map((value, index) => ({ id: String(value.id ?? `${value.date}-${index}`), link: value.link, date: value.date }));
}
export async function fetchLeads(cabinetId: string): Promise<Lead[]> {
  return (await apiClient().get<ApiLead[]>(`/cabinets/${cabinetId}/leads`)).map(mapLeadFromApi);
}
export async function patchLead(cabinetId: string, leadId: string, fields: EditableLeadFields) {
  await apiClient().patch(`/cabinets/${cabinetId}/leads/${leadId}`, leadPatchToApi(fields));
}
export async function fetchLeadRecordings(cabinetId: string, leadId: string) {
  const values = await apiClient().get<Array<{ link: string; date: string }>>(`/cabinets/${cabinetId}/leads/${leadId}/calls`);
  return mapRecordingsFromApi(values);
}
