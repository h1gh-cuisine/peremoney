import { HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { AuditLogExceptionFilter } from './audit-log-exception.filter';

describe('AuditLogExceptionFilter', () => {
  function httpHost(req: unknown) {
    return { getType: () => 'http', switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }) } as never;
  }

  it('records an HttpException and still delegates to the default response formatter', () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const req = { method: 'DELETE', originalUrl: '/api/cabinets/x' };
    const host = httpHost(req);
    const superCatch = jest.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => undefined);
    const filter = new AuditLogExceptionFilter({ record } as never);
    const exception = new HttpException('Проект не найден', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(record).toHaveBeenCalledWith(req, 404, { reason: 'Проект не найден' });
    expect(superCatch).toHaveBeenCalledWith(exception, host);
    superCatch.mockRestore();
  });

  it('treats an unknown (non-HttpException) error as a 500 and still delegates', () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const req = { method: 'POST', originalUrl: '/api/x' };
    const superCatch = jest.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => undefined);
    const filter = new AuditLogExceptionFilter({ record } as never);

    filter.catch(new Error('boom'), httpHost(req));

    expect(record).toHaveBeenCalledWith(req, 500, { reason: 'Internal server error' });
    superCatch.mockRestore();
  });

  it('skips recording for non-HTTP contexts but still delegates the response', () => {
    const record = jest.fn();
    const host = { getType: () => 'rpc' } as never;
    const superCatch = jest.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => undefined);
    const filter = new AuditLogExceptionFilter({ record } as never);

    filter.catch(new Error('x'), host);

    expect(record).not.toHaveBeenCalled();
    expect(superCatch).toHaveBeenCalled();
    superCatch.mockRestore();
  });
});
