export type AuditOutcome = "success" | "denied" | "error";

export interface AuditLogEntry {
  id: string;
  actorLogin: string | null;
  actorRole: string | null;
  cabinetName: string | null;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  outcome: AuditOutcome;
  payload: unknown;
  result: unknown;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  dateFrom?: string;
  dateTo?: string;
  actorId?: string;
  cabinetId?: string;
  outcome?: AuditOutcome;
  action?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
