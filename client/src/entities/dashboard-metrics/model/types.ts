export interface DashboardMetrics {
  contactsReceived: number;
  leadsQualified: number;
  sold: number;
  crToSale: number; // %
  revenue: number; // ₽
  cpl: number; // ₽
  avgCheck: number; // ₽
  saleCost: number; // ₽
}

export interface DailyContactsLeadsPoint {
  date: string; // ISO date
  contacts: number;
  leads: number;
}

export interface DailyCplSaleCostPoint {
  date: string; // ISO date
  cpl: number;
  saleCost: number;
}
