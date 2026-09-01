import { of } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';

describe('AuditLogInterceptor', () => {
  function context(req: unknown, statusCode: number) {
    return {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ statusCode }) }),
    } as never;
  }

  it('records the response status and body once the handler completes', (done) => {
    const record = jest.fn().mockResolvedValue(undefined);
    const req = { method: 'POST', originalUrl: '/api/cabinets' };
    const interceptor = new AuditLogInterceptor({ record } as never);
    interceptor.intercept(context(req, 201), { handle: () => of({ id: 'new' }) }).subscribe(() => {
      expect(record).toHaveBeenCalledWith(req, 201, { result: { id: 'new' } });
      done();
    });
  });

  it('skips non-HTTP contexts (e.g. scheduled tasks) without touching the audit log', () => {
    const record = jest.fn();
    const interceptor = new AuditLogInterceptor({ record } as never);
    const result$ = interceptor.intercept({ getType: () => 'rpc' } as never, { handle: () => of('x') });
    result$.subscribe();
    expect(record).not.toHaveBeenCalled();
  });
});
