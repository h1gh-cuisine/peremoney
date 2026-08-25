import { useSessionStore } from '@/entities/session';
import { createApiClient } from './api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/api';

export function apiClient() {
  return createApiClient({
    baseUrl,
    getToken: () => useSessionStore.getState().token,
    onUnauthorized: () => useSessionStore.getState().logout(),
  });
}
