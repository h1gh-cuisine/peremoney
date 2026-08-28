import { apiClient } from '@/shared/api';
import type { ClientStat } from '../lib/clientStats';
import type { ManagerStat } from '../lib/managerStats';
import { getPeriodRange, type MasterPeriod } from '../lib/period';
import type { MasterPayment, MasterPaymentStatus } from '../model/types';

export interface ApiMasterPayment { id: string; cabinetId: string; legalEntity: string | null; amount: string | number; status: 'PAID' | 'PENDING'; invoiceCreationStatus?: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'UNCERTAIN'; createdAt: string; cabinet: { name: string; managerName: string | null }; }
export function mapMasterPayment(value: ApiMasterPayment): MasterPayment { return { id: value.id, projectId: value.cabinetId,
  projectName: value.cabinet.name, legalEntity: value.legalEntity ?? '', amount: Number(value.amount),
  managerId: value.cabinet.managerName ?? 'Без менеджера', status: value.status === 'PAID' ? 'paid' : 'pending',
  invoiceCreationStatus: (value.invoiceCreationStatus ?? 'SUCCEEDED').toLowerCase() as MasterPayment['invoiceCreationStatus'],
  createdAt: value.createdAt.slice(0, 10) }; }
export function mapMasterDashboard(value: { managers: Array<{ managerName: string; activeProjects: number; paymentsCount: number; paymentsSum: number; retention: number; bonus: number }>; clients: Array<{ cabinetId: string; name: string; paymentsSum: number }> }) {
  return { managers: value.managers.map((x): ManagerStat => ({ managerId: x.managerName, managerName: x.managerName,
    activeProjectsAtSnapshot: x.activeProjects, paymentsCount: x.paymentsCount, paymentsSum: x.paymentsSum, retention: x.retention, bonus: x.bonus })),
  clients: value.clients.map((x): ClientStat => ({ projectId: x.cabinetId, projectName: x.name, totalAmount: x.paymentsSum })) };
}
export async function fetchMasterPayments() { return (await apiClient().get<ApiMasterPayment[]>('/master/payments')).map(mapMasterPayment); }
export async function setMasterPaymentStatus(id: string, status: MasterPaymentStatus) { await apiClient().patch(`/master/payments/${id}`, { status: status.toUpperCase() }); }
export async function deleteMasterPayment(id: string) { await apiClient().delete(`/master/payments/${id}`); }
export async function fetchMasterDashboard(period: MasterPeriod) { const range = getPeriodRange(period);
  return mapMasterDashboard(await apiClient().get<Parameters<typeof mapMasterDashboard>[0]>(`/master/dashboard?dateFrom=${range.from}&dateTo=${range.to}`)); }
