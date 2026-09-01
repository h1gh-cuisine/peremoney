import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  const config = (values: Record<string, string> = {}) => ({ get: (key: string) => values[key] });

  it('never logs a successful GET (already visible in the plain HTTP log)', async () => {
    const create = jest.fn();
    const service = new AuditLogService({ auditLog: { create } } as never, config() as never);
    await service.record({ method: 'GET', originalUrl: '/api/cabinets' }, 200, { result: [1, 2] });
    expect(create).not.toHaveBeenCalled();
  });

  it('logs a successful mutation with actor, action and redacted payload/result', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = new AuditLogService({ auditLog: { create } } as never, config() as never);
    await service.record({
      method: 'PATCH', originalUrl: '/api/cabinets/cab-1?x=1', params: { id: 'cab-1' },
      body: { price: 100, clientPassword: 'p4ss' },
      user: { id: 'u1', login: 'master', role: 'MASTER', cabinetId: null },
      headers: { 'user-agent': 'jest', 'x-request-id': 'req-1' }, ip: '10.0.0.1',
    }, 200, { result: { id: 'cab-1', botToken: 'secret-token' } });

    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      actorId: 'u1', actorLogin: 'master', actorRole: 'MASTER',
      action: 'PATCH /api/cabinets/cab-1', method: 'PATCH', path: '/api/cabinets/cab-1',
      statusCode: 200, outcome: 'success', ip: '10.0.0.1', requestId: 'req-1',
    });
    expect(data.payload.body).toEqual({ price: 100, clientPassword: '[REDACTED]' });
    expect(data.result).toEqual({ id: 'cab-1', botToken: '[REDACTED]' });
  });

  it('logs a denied access attempt (401/403) even for GET, without an actor', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = new AuditLogService({ auditLog: { create } } as never, config() as never);
    await service.record({ method: 'GET', originalUrl: '/api/audit-log' }, 403, { reason: 'Неверный код доступа к журналу' });
    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({ actorId: null, outcome: 'denied', statusCode: 403, reason: 'Неверный код доступа к журналу' });
  });

  it('captures the attempted login on a failed login POST, since there is no authenticated actor yet', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = new AuditLogService({ auditLog: { create } } as never, config() as never);
    await service.record({ method: 'POST', originalUrl: '/api/auth/login', body: { login: 'someone', password: 'x' } }, 401, { reason: 'Неверный логин или пароль' });
    const data = create.mock.calls[0][0].data;
    expect(data.actorLogin).toBe('someone');
    expect(data.payload.body).toEqual({ login: 'someone', password: '[REDACTED]' });
  });

  it('never throws when the DB write itself fails', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const service = new AuditLogService({ auditLog: { create } } as never, config() as never);
    await expect(service.record({ method: 'POST', originalUrl: '/api/x' }, 200)).resolves.toBeUndefined();
  });

  describe('verifySecret', () => {
    it('fails closed when AUDIT_LOG_SECRET is not configured', () => {
      const service = new AuditLogService({} as never, config() as never);
      expect(() => service.verifySecret('anything')).toThrow(ServiceUnavailableException);
    });

    it('rejects a missing or wrong secret', () => {
      const service = new AuditLogService({} as never, config({ AUDIT_LOG_SECRET: 'right' }) as never);
      expect(() => service.verifySecret(undefined)).toThrow(ForbiddenException);
      expect(() => service.verifySecret('wrong')).toThrow(ForbiddenException);
    });

    it('accepts the correct secret', () => {
      const service = new AuditLogService({} as never, config({ AUDIT_LOG_SECRET: 'right' }) as never);
      expect(() => service.verifySecret('right')).not.toThrow();
    });
  });

  describe('list', () => {
    it('filters by the provided fields and paginates', async () => {
      const findMany = jest.fn().mockResolvedValue([{ id: 'a' }]);
      const count = jest.fn().mockResolvedValue(1);
      const service = new AuditLogService({ auditLog: { findMany, count } } as never, config() as never);
      const result = await service.list({ actorId: 'u1', outcome: 'denied', page: 2, pageSize: 10 });
      expect(findMany.mock.calls[0][0].where).toMatchObject({ actorId: 'u1', outcome: 'denied' });
      expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 10, take: 10 });
      expect(result).toEqual({ items: [{ id: 'a' }], total: 1, page: 2, pageSize: 10, hasMore: false });
    });
  });
});
