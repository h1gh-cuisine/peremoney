import { apiClient } from '@/shared/api';
import type { MasterProject, RenewalStatus } from '../model/types';
import type { ProjectType } from '@/shared/lib/projectType';
import type { DateRange } from '@/shared/lib/date';

type ApiProject = { id: string; name: string; managerName: string | null; type: 'VDL'|'PACKAGE'|'NUMBERS'; sphere: string | null;
  price: string|number; moneyBalance: string|number; renewalStatus: 'RENEWED'|'NOT_RENEWED'; isActive: boolean; hidden: boolean; createdAt: string;
  contactsExported: number; leadsExported: number; sales: number; expenses: number | null; leadCost: number | null; targetLeadCost: number | null;
  ltv: number; paymentsCount: number; avgCheck: number; clientLogin: string; employeeLogin: string };
const TYPES: Record<ApiProject['type'], ProjectType> = { VDL: 'quals', PACKAGE: 'package', NUMBERS: 'numbers' };
export function mapMasterProject(value: ApiProject): MasterProject { return { id: value.id, name: value.name,
  managerId: value.managerName ?? 'Без менеджера', type: TYPES[value.type], region: value.name.split('/')[0] ?? '', sphere: value.sphere ?? '',
  contactsExported: value.contactsExported, leadsExported: value.leadsExported, sales: value.sales,
  expenses: value.expenses == null ? null : Number(value.expenses),
  leadCost: value.leadCost == null ? null : Number(value.leadCost),
  targetLeadCost: value.targetLeadCost == null ? null : Number(value.targetLeadCost),
  price: Number(value.price), moneyBalance: Number(value.moneyBalance),
  renewalStatus: value.renewalStatus === 'RENEWED' ? 'renewed' : 'not_renewed', ltv: value.ltv,
  paymentsCount: value.paymentsCount, avgCheck: value.avgCheck, clientLogin: value.clientLogin, clientPassword: '',
  employeeLogin: value.employeeLogin, employeePassword: '', active: value.isActive, hidden: value.hidden, createdAt: value.createdAt.slice(0,10) }; }
export async function fetchMasterProjects(range?: DateRange) {
  const query = range ? `?dateFrom=${encodeURIComponent(range.from)}&dateTo=${encodeURIComponent(range.to)}` : '';
  return (await apiClient().get<ApiProject[]>(`/cabinets${query}`)).map(mapMasterProject);
}
export interface ProviderRegion { id: number; name: string }
export async function fetchProviderRegions() {
  return apiClient().get<ProviderRegion[]>('/cabinets/provider/regions');
}
export async function createMasterProject(input: { clientName: string; type: ProjectType; region: string; regionId: number; regionIds?: number[]; sphere: string; managerId: string; managerName: string; price: number; employeeLogin: string; clientLogin: string; idempotencyKey: string }) {
  const types: Record<ProjectType, ApiProject['type']> = { quals: 'VDL', package: 'PACKAGE', numbers: 'NUMBERS' };
  const result = await apiClient().post<{ cabinet: ApiProject; credentials: null | { client: { login: string; password: string }; employee: { login: string; password: string } }; replayed?: boolean }>('/cabinets', {
    name: input.clientName, type: types[input.type], region: input.region, regionId: input.regionId, regionIds: input.regionIds, sphere: input.sphere,
    managerName: input.managerName, price: input.price, employeeLogin: input.employeeLogin,
    clientLogin: input.clientLogin, idempotencyKey: input.idempotencyKey,
  });
  const project = mapMasterProject({ ...result.cabinet, contactsExported: 0, leadsExported: 0, sales: 0,
    expenses: null, leadCost: null, targetLeadCost: null, ltv: 0,
    paymentsCount: 0, avgCheck: 0, clientLogin: input.clientLogin, employeeLogin: input.employeeLogin });
  return { ...project, clientPassword: result.credentials?.client.password ?? '', employeePassword: result.credentials?.employee.password ?? '' };
}
export async function patchMasterProject(id: string, patch: { price?: number; renewalStatus?: RenewalStatus; isActive?: boolean; hidden?: boolean; clientPassword?: string }) {
  await apiClient().patch(`/cabinets/${id}/master-project`, { ...patch,
    renewalStatus: patch.renewalStatus === undefined ? undefined : patch.renewalStatus === 'renewed' ? 'RENEWED' : 'NOT_RENEWED' });
}
export async function patchMasterBalance(id: string, moneyBalance: number) {
  return apiClient().patch<{ moneyBalance: string | number }>(`/cabinets/${id}/master-balance`, { moneyBalance });
}
export async function deleteMasterProject(id: string) {
  return apiClient().delete<{ deleted: boolean }>(`/cabinets/${id}`);
}
export async function linkProviderProject(input: { providerProjectId: number; price: number; managerId: string }) {
  const result = await apiClient().post<{ cabinet: Record<string, unknown>; credentials: { client: { login: string; password: string }; employee: { login: string; password: string } } }>('/cabinets/link-provider',
    { providerProjectId: input.providerProjectId, price: input.price, managerName: input.managerId });
  const cabinet = result.cabinet as Omit<ApiProject, 'contactsExported'|'leadsExported'|'sales'|'expenses'|'leadCost'|'targetLeadCost'|'ltv'|'paymentsCount'|'avgCheck'|'clientLogin'|'employeeLogin'>;
  return { ...mapMasterProject({ ...cabinet, contactsExported: 0, leadsExported: 0, sales: 0,
    expenses: null, leadCost: null, targetLeadCost: null, ltv: 0, paymentsCount: 0, avgCheck: 0,
    clientLogin: result.credentials.client.login, employeeLogin: result.credentials.employee.login }),
    clientPassword: result.credentials.client.password, employeePassword: result.credentials.employee.password };
}
