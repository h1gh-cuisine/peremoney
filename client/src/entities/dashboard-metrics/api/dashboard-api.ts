import { apiClient } from '@/shared/api';
import type { DateRange } from '@/shared/lib/date';
import type { DashboardMetrics } from '../model/types';
type ApiDashboard = { metrics: { contacts:number; qualified:number; sold:number; conversion:number; revenue:number; cpl:number; averageCheck:number; saleCost:number };
  daily: Array<{ date:string; contacts:number; leads:number; sold:number; spent:number; cpl:number; saleCost:number }> };
export function mapDashboardFromApi(value: ApiDashboard) { return { metrics: { contactsReceived:value.metrics.contacts,
  leadsQualified:value.metrics.qualified, sold:value.metrics.sold, crToSale:value.metrics.conversion, revenue:value.metrics.revenue,
  cpl:value.metrics.cpl, avgCheck:value.metrics.averageCheck, saleCost:value.metrics.saleCost } satisfies DashboardMetrics,
  contactsLeadsSeries:value.daily.map(x=>({date:x.date,contacts:x.contacts,leads:x.leads})),
  cplSaleCostSeries:value.daily.map(x=>({date:x.date,cpl:x.cpl,saleCost:x.saleCost})) }; }
export async function fetchDashboard(cabinetId:string, range:DateRange) { return mapDashboardFromApi(await apiClient().get<ApiDashboard>(`/cabinets/${cabinetId}/dashboard?dateFrom=${range.from}&dateTo=${range.to}`)); }
