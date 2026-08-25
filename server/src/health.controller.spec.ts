import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('keeps liveness independent from external dependencies', () => {
    expect(new HealthController({} as never).health()).toEqual({ status: 'ok' });
  });
  it('reports ready only after PostgreSQL responds', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ ok: 1 }]);
    await expect(new HealthController({ $queryRaw: queryRaw } as never).ready()).resolves.toEqual({ status: 'ready', database: 'up' });
  });
  it('returns service unavailable when PostgreSQL is down', async () => {
    const controller = new HealthController({ $queryRaw: jest.fn().mockRejectedValue(new Error('down')) } as never);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
