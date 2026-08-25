import { apiClient } from '@/shared/api';
import type { SectionVisibility } from '@/entities/access';
import type { ProjectStatus, SchedulePreset } from '../model/types';
import type { ProjectType } from '@/shared/lib/projectType';

type ApiSchedule = 'WEEKDAYS' | 'WEEKENDS' | 'EVERYDAY';
type ApiProjectType = 'VDL' | 'PACKAGE' | 'NUMBERS';
const PROJECT_TYPES: Record<ApiProjectType, ProjectType> = { VDL: 'quals', PACKAGE: 'package', NUMBERS: 'numbers' };
const SUPPORTED_MESSENGERS = new Set(['telegram', 'max', 'email']);

export function mapCabinetSettings(value: { isActive: boolean; schedulePreset: ApiSchedule; type: ApiProjectType;
  timezoneOffset?: number; uploadsEnabled?: boolean; callsEnabled?: boolean; scheduleDays?: number[]; crmIntegration?: string; messengerIntegrations?: string[] }) {
  return { status: (value.isActive ? 'active' : 'paused') as ProjectStatus,
    schedulePreset: value.schedulePreset.toLowerCase() as SchedulePreset, projectType: PROJECT_TYPES[value.type],
    timezoneOffset: value.timezoneOffset ?? 3, uploadsEnabled: value.uploadsEnabled ?? true,
    callsEnabled: value.callsEnabled ?? true, scheduleDays: value.scheduleDays ?? [1, 2, 3, 4, 5, 6, 7], crmIntegration: value.crmIntegration ?? '',
    messengerIntegrations: (value.messengerIntegrations ?? []).filter((name) => SUPPORTED_MESSENGERS.has(name)) };
}
export function scheduleToApi(schedulePreset: SchedulePreset) { return { schedulePreset: schedulePreset.toUpperCase() as ApiSchedule }; }
export function visibilityToApi(value: SectionVisibility) { return { contacts: value.contacts, sources: value.sources, script: value.script, finance: value.finance, settings: value.settings }; }
export async function fetchCabinetSettings() {
  const value = await apiClient().get<{ id: string; isActive: boolean; schedulePreset: ApiSchedule; type: ApiProjectType;
    timezoneOffset: number; uploadsEnabled: boolean; callsEnabled: boolean; scheduleDays: number[]; crmIntegration: string; messengerIntegrations: string[] }>('/cabinets/me');
  return { cabinetId: value.id, ...mapCabinetSettings(value) };
}
export async function saveCabinetSettings(cabinetId: string, settings: import('../model/types').ProjectSettings, visibility: SectionVisibility) {
  await apiClient().patch(`/cabinets/${cabinetId}/settings`, {
    isActive: settings.status === 'active', timezoneOffset: settings.timezoneOffset,
    uploadsEnabled: settings.uploadsEnabled, callsEnabled: settings.callsEnabled, scheduleDays: settings.scheduleDays,
    ...scheduleToApi(settings.schedulePreset), crmIntegration: settings.crmIntegration,
    messengerIntegrations: settings.messengerIntegrations, ...visibilityToApi(visibility),
  });
}

export async function fetchProviderIntegration(cabinetId: string, name: string) {
  return apiClient().get<{ configured: boolean; details: Record<string, unknown> }>(
    `/cabinets/${cabinetId}/provider/integrations/${name}`,
  );
}
