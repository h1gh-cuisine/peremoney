import { mapScriptFromCabinet } from './script-api';

describe('script API contract', () => {
  it('maps cached provider HTML from cabinet without making it editable', () => {
    expect(mapScriptFromCabinet({ id: 'cab', operatorScriptName: 'Продажи', operatorScript: '<style>h1{color:red}</style><h1>Шаг</h1><p>Скажите&nbsp;«привет»</p>', scriptSyncedAt: '2026-08-20T20:00:00Z' }))
      .toEqual({ projectId: 'cab', name: 'Продажи', script: 'Шаг\nСкажите «привет»', updatedAt: '2026-08-20' });
  });
  it('renders an empty safe model before the first provider sync', () => {
    expect(mapScriptFromCabinet({ id: 'cab', operatorScriptName: null, operatorScript: null, scriptSyncedAt: null }).script).toBe('');
  });
});
