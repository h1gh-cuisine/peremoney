import { mapScriptFromCabinet } from './script-api';

describe('script API contract', () => {
  it('maps cached provider HTML from cabinet without making it editable', () => {
    expect(mapScriptFromCabinet({ id: 'cab', operatorScriptName: 'Продажи', operatorScript: '<h1>Шаг</h1>', scriptSyncedAt: '2026-08-20T20:00:00Z' }))
      .toEqual({ projectId: 'cab', name: 'Продажи', script: '<h1>Шаг</h1>', updatedAt: '2026-08-20' });
  });
  it('renders an empty safe model before the first provider sync', () => {
    expect(mapScriptFromCabinet({ id: 'cab', operatorScriptName: null, operatorScript: null, scriptSyncedAt: null }).script).toBe('');
  });
});
