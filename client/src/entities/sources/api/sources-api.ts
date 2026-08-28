import { apiClient } from '@/shared/api';
import type { DateRange } from '@/shared/lib/date';
import type { Source, SourceAutomationSettings, SourceType } from '../model/types';

export interface ApiSource {
  id: string; name: string; operator: string | null; newAnswer: number; success: number;
  conversion: string | number; sebes: string | number; notTargetShare: number; sales: number;
  normWork: boolean; sourceType: string | null;
}
export function mapSourceFromApi(value: ApiSource): Source {
  return { id: value.id, name: value.name, operator: value.operator ?? '', contacts: value.newAnswer,
    leads: value.success, conversion: Number(value.conversion), cost: Number(value.sebes),
    notRelevantShare: value.notTargetShare, sales: value.sales, active: value.normWork,
    sourceType: value.sourceType === 'domain' ? 'domain' : 'phone' };
}
export function buildSourcesQuery(range: DateRange) {
  return `?dateFrom=${encodeURIComponent(range.from)}&dateTo=${encodeURIComponent(range.to)}`;
}
export function automationToApi(settings: SourceAutomationSettings) {
  return { autoCleanupEnabled: settings.autoCleanupEnabled, minContactsPerLead: settings.minContactsPerLead,
    autoManagementEnabled: settings.autoManageEnabled, minConversion: settings.minConversion };
}
export async function fetchSources(cabinetId: string, range: DateRange) {
  const values: ApiSource[] = [];
  let page = 1;
  while (true) {
    const separator = buildSourcesQuery(range);
    const result = await apiClient().get<{items:ApiSource[];hasMore:boolean}>(`/cabinets/${cabinetId}/sources${separator}&page=${page}&pageSize=200`);
    values.push(...result.items);
    if (!result.hasMore) break;
    page += 1;
  }
  return values.map(mapSourceFromApi);
}
export async function toggleSource(cabinetId: string, id: string, enabled: boolean) {
  await apiClient().patch(`/cabinets/${cabinetId}/sources/${id}`, { enabled });
}
export async function addSourceValues(cabinetId: string, sources: string[], sourceType: SourceType) {
  return apiClient().post(`/cabinets/${cabinetId}/sources`, { sources, sourceType, activeDuplicateSource: false });
}
export async function saveAutomation(cabinetId: string, settings: SourceAutomationSettings) {
  await apiClient().patch(`/cabinets/${cabinetId}/sources/automation/settings`, automationToApi(settings));
}
export function normalizeTagTypes(value: unknown): string[] {
  // Контракт available_tags_types возвращает именно { types: string[] }.
  // Не принимаем произвольные items/name/label: иначе в форму попадают
  // несогласованные категории вроде VIP/«Горячий».
  const types = value && typeof value === 'object' && Array.isArray((value as { types?: unknown[] }).types)
    ? (value as { types: unknown[] }).types
    : [];
  return [...new Set(types.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))];
}
export async function fetchTagTypes(cabinetId: string) { return normalizeTagTypes(await apiClient().get<unknown>(`/cabinets/${cabinetId}/sources/meta/tag-types`)); }
