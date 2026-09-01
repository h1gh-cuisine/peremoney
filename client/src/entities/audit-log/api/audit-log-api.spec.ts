import { apiClient } from '@/shared/api';
import { buildAuditLogQuery, fetchAuditLog } from './audit-log-api';

jest.mock('@/shared/api', () => ({ apiClient: jest.fn() }));

describe('audit log API contract', () => {
  it('builds a query string with defaults for page/pageSize and omits unset filters', () => {
    expect(buildAuditLogQuery({})).toBe('?page=1&pageSize=50');
    expect(buildAuditLogQuery({ outcome: 'denied', actorId: 'u1', page: 2, pageSize: 20 }))
      .toBe('?actorId=u1&outcome=denied&page=2&pageSize=20');
  });

  it('sends the secret as a header, never as a query param, and maps actor/cabinet from relations', async () => {
    const get = jest.fn().mockResolvedValue({
      items: [{
        id: 'a1', actorLogin: null, actorRole: null, action: 'DELETE /api/cabinets/x', method: 'DELETE', path: '/api/cabinets/x',
        statusCode: 403, outcome: 'denied', payload: { body: {} }, result: null, reason: 'Неверный секретный код',
        ip: '1.2.3.4', userAgent: 'jest', createdAt: '2026-09-01T00:00:00Z',
        actor: { login: 'master', role: 'MASTER' }, cabinet: null,
      }],
      total: 1, page: 1, pageSize: 50, hasMore: false,
    });
    (apiClient as jest.Mock).mockReturnValue({ get });

    const result = await fetchAuditLog({ outcome: 'denied' }, 'top-secret');

    expect(get).toHaveBeenCalledWith('/audit-log?outcome=denied&page=1&pageSize=50', { 'X-Audit-Secret': 'top-secret' });
    expect(result.items[0]).toEqual(expect.objectContaining({ id: 'a1', actorLogin: 'master', actorRole: 'MASTER', cabinetName: null }));
  });
});
