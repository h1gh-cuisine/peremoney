import { apiClient } from '@/shared/api';
import type { ScriptData } from '../model/types';

export interface ScriptCabinet { id: string; operatorScriptName: string | null; operatorScript: string | null; scriptSyncedAt: string | null; }
export function scriptToPlainText(value: string | null) {
  if (!value) return '';
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', laquo: '«', raquo: '»', hellip: '…' };
  return value.replace(/<(script|style|head|svg|canvas)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<img\b[^>]*>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/\s*(p|div|h[1-6]|li|tr|section|article|blockquote)\s*>/gi, '\n')
    .replace(/<\/\s*(td|th)\s*>/gi, '\t').replace(/<[^>]+>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code.startsWith('#x')) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      if (code.startsWith('#')) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      return entities[code.toLowerCase()] ?? entity;
    }).replace(/\r/g, '').split('\n').map((line) => line.replace(/[\t ]+/g, ' ').trim()).join('\n').replace(/\n+\s*•/g, '\n•')
    .replace(/\n{3,}/g, '\n\n').trim();
}
export function mapScriptFromCabinet(value: ScriptCabinet): ScriptData {
  return { projectId: value.id, name: value.operatorScriptName ?? '', script: scriptToPlainText(value.operatorScript), updatedAt: value.scriptSyncedAt?.slice(0, 10) ?? '' };
}
export async function fetchScript(): Promise<ScriptData> {
  return mapScriptFromCabinet(await apiClient().get<ScriptCabinet>('/cabinets/me'));
}
