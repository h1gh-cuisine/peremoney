import { apiClient } from '@/shared/api';
import type { ScriptData } from '../model/types';

export interface ScriptCabinet { id: string; operatorScriptName: string | null; operatorScript: string | null; scriptSyncedAt: string | null; }
export function mapScriptFromCabinet(value: ScriptCabinet): ScriptData {
  return { projectId: value.id, name: value.operatorScriptName ?? '', script: value.operatorScript ?? '', updatedAt: value.scriptSyncedAt?.slice(0, 10) ?? '' };
}
export async function fetchScript(): Promise<ScriptData> {
  return mapScriptFromCabinet(await apiClient().get<ScriptCabinet>('/cabinets/me'));
}
