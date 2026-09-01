import { apiClient } from '@/shared/api';
import type { AuditLogEntry, AuditLogFilters, AuditLogPage, AuditOutcome } from '../model/types';

interface ApiAuditLogEntry {
  id: string; actorLogin: string | null; actorRole: string | null; action: string; method: string; path: string;
  statusCode: number; outcome: string; payload: unknown; result: unknown; reason: string | null; ip: string | null;
  userAgent: string | null; createdAt: string;
  actor?: { login: string; role: string } | null;
  cabinet?: { name: string } | null;
}

interface ApiAuditLogPage {
  items: ApiAuditLogEntry[]; total: number; page: number; pageSize: number; hasMore: boolean;
}

export function mapAuditLogEntry(value: ApiAuditLogEntry): AuditLogEntry {
  return {
    id: value.id,
    actorLogin: value.actor?.login ?? value.actorLogin,
    actorRole: value.actor?.role ?? value.actorRole,
    cabinetName: value.cabinet?.name ?? null,
    action: value.action, method: value.method, path: value.path, statusCode: value.statusCode,
    outcome: value.outcome as AuditOutcome, payload: value.payload, result: value.result, reason: value.reason,
    ip: value.ip, userAgent: value.userAgent, createdAt: value.createdAt,
  };
}

export function buildAuditLogQuery(filters: AuditLogFilters) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.actorId) params.set('actorId', filters.actorId);
  if (filters.cabinetId) params.set('cabinetId', filters.cabinetId);
  if (filters.outcome) params.set('outcome', filters.outcome);
  if (filters.action) params.set('action', filters.action);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 50));
  return `?${params.toString()}`;
}

export async function fetchAuditLog(filters: AuditLogFilters, secret: string): Promise<AuditLogPage> {
  const result = await apiClient().get<ApiAuditLogPage>(`/audit-log${buildAuditLogQuery(filters)}`, { 'X-Audit-Secret': secret });
  return { ...result, items: result.items.map(mapAuditLogEntry) };
}
