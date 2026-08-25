import { useEffect, useState } from "react";
import type { DateRange } from "@/shared/lib/date";
import { useSessionStore } from '@/entities/session';
import { fetchDashboard } from '../api/dashboard-api';
import type { DailyContactsLeadsPoint, DailyCplSaleCostPoint, DashboardMetrics } from './types';

/** Серверные метрики и оба дневных ряда за выбранный период. */
export function useDashboardData(range: DateRange) {
  const cabinetId = useSessionStore((s) => s.user?.cabinetId);
  const [metrics,setMetrics]=useState<DashboardMetrics>({contactsReceived:0,leadsQualified:0,sold:0,crToSale:0,revenue:0,cpl:0,avgCheck:0,saleCost:0});
  const [contactsLeadsSeries,setContacts]=useState<DailyContactsLeadsPoint[]>([]);
  const [cplSaleCostSeries,setCosts]=useState<DailyCplSaleCostPoint[]>([]);
  useEffect(()=>{if(!cabinetId)return;let active=true;fetchDashboard(cabinetId,range).then(v=>{if(active){setMetrics(v.metrics);setContacts(v.contactsLeadsSeries);setCosts(v.cplSaleCostSeries);}});return()=>{active=false};},[cabinetId,range]);

  return { metrics, contactsLeadsSeries, cplSaleCostSeries };
}
