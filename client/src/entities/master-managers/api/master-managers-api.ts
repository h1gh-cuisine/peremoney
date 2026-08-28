import { apiClient } from '@/shared/api';
import type { Manager } from '../model/types';

export function fetchMasterManagers() {
  return apiClient().get<Manager[]>('/master/managers');
}

export function createMasterManager(name: string) {
  return apiClient().post<Manager>('/master/managers', { name });
}

export function deleteMasterManager(name: string) {
  return apiClient().delete<{ deleted: true }>(`/master/managers/${encodeURIComponent(name)}`);
}
